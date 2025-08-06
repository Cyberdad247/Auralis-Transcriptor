import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';
import { database } from '../../src/database/connection.js';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clear test database before each test
    if (database.users) {
      await database.users.clear();
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (database.users) {
      await database.users.clear();
    }
  });

  describe('POST /auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('username', userData.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return 400 for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    test('should return 400 for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    test('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      // Register user first time
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register same email again
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      await request(app)
        .post('/auth/register')
        .send(userData);
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', loginData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should return 400 for missing email', async () => {
      const loginData = {
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      await request(app)
        .post('/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.token;
    });

    test('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return 401 without token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });
  });

  describe('POST /auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      await request(app)
        .post('/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.token;
    });

    test('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    test('should return 401 without token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});

