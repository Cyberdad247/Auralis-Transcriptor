import request from 'supertest';
import app from '../src/server.js';

describe('Health Check Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'auralis-transcriptor-backend');
      expect(response.body).toHaveProperty('checks');
    });

    it('should include database check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks.database).toHaveProperty('status');
    });

    it('should include memory check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.memory).toHaveProperty('status', 'healthy');
      expect(response.body.checks.memory).toHaveProperty('usage');
    });

    it('should include queue check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('queue');
      expect(response.body.checks.queue).toHaveProperty('status');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});
