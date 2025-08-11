import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../database/connection.js';
import { generateTokens, verifyRefreshToken, authenticateToken } from '../middleware/auth.js';
import { asyncHandler, ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  }),
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password, firstName, lastName } = value;

  await transaction(async (client) => {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, created_at
    `, [email.toLowerCase(), passwordHash, firstName || null, lastName || null]);

    const user = userResult.rows[0];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await client.query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `, [
      user.id,
      refreshTokenHash,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    ]);

    // Log successful registration
    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.expiresIn
        }
      }
    });
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { email, password } = value;

  await transaction(async (client) => {
    // Find user
    const userResult = await client.query(`
      SELECT id, email, password_hash, first_name, last_name, is_active
      FROM users 
      WHERE email = $1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await client.query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `, [
      user.id,
      refreshTokenHash,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    ]);

    // Update last login
    await client.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log successful login
    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.expiresIn
        }
      }
    });
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = refreshTokenSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { refreshToken } = value;

  await transaction(async (client) => {
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if refresh token exists and is not revoked
    const tokenResult = await client.query(`
      SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, u.email, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.user_id = $1 AND rt.expires_at > CURRENT_TIMESTAMP AND rt.revoked = false
    `, [decoded.userId]);

    if (tokenResult.rows.length === 0) {
      throw new UnauthorizedError('Refresh token not found or expired');
    }

    const tokenData = tokenResult.rows[0];

    if (!tokenData.is_active) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Verify the refresh token hash
    const isValidToken = await bcrypt.compare(refreshToken, await client.query(
      'SELECT token_hash FROM refresh_tokens WHERE id = $1',
      [tokenData.id]
    ).then(result => result.rows[0]?.token_hash));

    if (!isValidToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    // Revoke old refresh token
    await client.query(
      'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
      [tokenData.id]
    );

    // Store new refresh token hash
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await client.query(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `, [
      decoded.userId,
      newRefreshTokenHash,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    ]);

    logger.info('Token refreshed successfully', {
      userId: decoded.userId,
      email: tokenData.email,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.jwt.expiresIn
        }
      }
    });
  });
}));

// Logout (revoke refresh token)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND token_hash = $2',
      [req.user.id, await bcrypt.hash(refreshToken, 10)]
    );
  }

  // Optionally revoke all refresh tokens for this user
  // await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.id]);

  logger.info('User logged out', {
    userId: req.user.id,
    email: req.user.email,
    ip: req.ip
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const userResult = await query(`
    SELECT id, email, first_name, last_name, last_login, created_at
    FROM users 
    WHERE id = $1
  `, [req.user.id]);

  const user = userResult.rows[0];

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    }
  });
}));

export default router;
