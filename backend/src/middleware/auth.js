import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { logger } from '../config/logger.js';
import { query } from '../database/connection.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'UNAUTHORIZED'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if user still exists and is active
    const userResult = await query(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      isActive: user.is_active
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTHENTICATION_ERROR'
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Try to verify the token, but don't fail if it's invalid
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const userResult = await query(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      req.user = {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        isActive: userResult.rows[0].is_active
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    req.user = null;
    next();
  }
};

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};
