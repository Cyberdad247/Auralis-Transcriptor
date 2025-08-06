import request from 'supertest';
import app from './server.js'; // Assuming your express app is exported from server.js

describe('Auth Routes', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
  });

  it('should not register a user with existing email', async () => {
    // Register the user first
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'password123',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toEqual(409);
    expect(res.body).toHaveProperty('message', 'User with that email already exists');
  });

  it('should login a user', async () => {
    // Register the user first
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'login@example.com',
        password: 'password123',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should not login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });
});


