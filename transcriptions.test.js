import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import multer from 'multer';
import transcriptionRoutes from '../../src/routes/transcriptions.js';
import { database } from '../../src/database/connection.js';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());
app.use('/transcriptions', transcriptionRoutes);

describe('Transcription Routes', () => {
  let authToken;
  let testUserId;

  beforeEach(async () => {
    // Clear test database
    if (database.users) {
      await database.users.clear();
    }
    if (database.transcripts) {
      await database.transcripts.clear();
    }

    // Create and login a test user
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    };

    const registerResponse = await request(app)
      .post('/auth/register')
      .send(userData);

    testUserId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up test files and database
    if (database.users) {
      await database.users.clear();
    }
    if (database.transcripts) {
      await database.transcripts.clear();
    }
  });

  describe('POST /transcriptions/upload', () => {
    test('should upload and process audio file successfully', async () => {
      // Create a mock audio file buffer
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      
      const response = await request(app)
        .post('/transcriptions/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', mockAudioBuffer, 'test-audio.mp3')
        .expect(201);

      expect(response.body).toHaveProperty('message', 'File uploaded successfully');
      expect(response.body).toHaveProperty('transcriptId');
      expect(response.body).toHaveProperty('status', 'processing');
    });

    test('should return 401 without authentication', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      
      const response = await request(app)
        .post('/transcriptions/upload')
        .attach('audio', mockAudioBuffer, 'test-audio.mp3')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 without file', async () => {
      const response = await request(app)
        .post('/transcriptions/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file');
    });

    test('should return 400 for unsupported file type', async () => {
      const mockTextBuffer = Buffer.from('This is not an audio file');
      
      const response = await request(app)
        .post('/transcriptions/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', mockTextBuffer, 'test-file.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('file type');
    });
  });

  describe('GET /transcriptions', () => {
    beforeEach(async () => {
      // Create some test transcripts
      const testTranscripts = [
        {
          id: 'transcript-1',
          userId: testUserId,
          filename: 'audio1.mp3',
          text: 'First transcription',
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 'transcript-2',
          userId: testUserId,
          filename: 'audio2.mp3',
          text: 'Second transcription',
          status: 'completed',
          createdAt: new Date().toISOString()
        }
      ];

      if (database.transcripts) {
        for (const transcript of testTranscripts) {
          await database.transcripts.create(transcript);
        }
      }
    });

    test('should return user transcriptions', async () => {
      const response = await request(app)
        .get('/transcriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transcripts');
      expect(Array.isArray(response.body.transcripts)).toBe(true);
      expect(response.body.transcripts).toHaveLength(2);
      expect(response.body.transcripts[0]).toHaveProperty('filename');
      expect(response.body.transcripts[0]).toHaveProperty('text');
      expect(response.body.transcripts[0]).toHaveProperty('status');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/transcriptions')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/transcriptions?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transcripts');
      expect(response.body.transcripts).toHaveLength(1);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
    });
  });

  describe('GET /transcriptions/:id', () => {
    let testTranscriptId;

    beforeEach(async () => {
      // Create a test transcript
      const testTranscript = {
        id: 'transcript-1',
        userId: testUserId,
        filename: 'audio1.mp3',
        text: 'Test transcription content',
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      if (database.transcripts) {
        await database.transcripts.create(testTranscript);
        testTranscriptId = testTranscript.id;
      }
    });

    test('should return specific transcript', async () => {
      const response = await request(app)
        .get(`/transcriptions/${testTranscriptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transcript');
      expect(response.body.transcript).toHaveProperty('id', testTranscriptId);
      expect(response.body.transcript).toHaveProperty('filename', 'audio1.mp3');
      expect(response.body.transcript).toHaveProperty('text', 'Test transcription content');
    });

    test('should return 404 for non-existent transcript', async () => {
      const response = await request(app)
        .get('/transcriptions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/transcriptions/${testTranscriptId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 403 for transcript belonging to another user', async () => {
      // Create another user's transcript
      const otherTranscript = {
        id: 'other-transcript',
        userId: 'other-user-id',
        filename: 'other-audio.mp3',
        text: 'Other user transcription',
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      if (database.transcripts) {
        await database.transcripts.create(otherTranscript);
      }

      const response = await request(app)
        .get('/transcriptions/other-transcript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('access');
    });
  });

  describe('DELETE /transcriptions/:id', () => {
    let testTranscriptId;

    beforeEach(async () => {
      // Create a test transcript
      const testTranscript = {
        id: 'transcript-1',
        userId: testUserId,
        filename: 'audio1.mp3',
        text: 'Test transcription content',
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      if (database.transcripts) {
        await database.transcripts.create(testTranscript);
        testTranscriptId = testTranscript.id;
      }
    });

    test('should delete transcript successfully', async () => {
      const response = await request(app)
        .delete(`/transcriptions/${testTranscriptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Transcript deleted successfully');
    });

    test('should return 404 for non-existent transcript', async () => {
      const response = await request(app)
        .delete('/transcriptions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/transcriptions/${testTranscriptId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 403 for transcript belonging to another user', async () => {
      // Create another user's transcript
      const otherTranscript = {
        id: 'other-transcript',
        userId: 'other-user-id',
        filename: 'other-audio.mp3',
        text: 'Other user transcription',
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      if (database.transcripts) {
        await database.transcripts.create(otherTranscript);
      }

      const response = await request(app)
        .delete('/transcriptions/other-transcript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('access');
    });
  });

  describe('GET /transcriptions/:id/status', () => {
    let testTranscriptId;

    beforeEach(async () => {
      // Create a test transcript
      const testTranscript = {
        id: 'transcript-1',
        userId: testUserId,
        filename: 'audio1.mp3',
        text: null,
        status: 'processing',
        createdAt: new Date().toISOString()
      };

      if (database.transcripts) {
        await database.transcripts.create(testTranscript);
        testTranscriptId = testTranscript.id;
      }
    });

    test('should return transcript status', async () => {
      const response = await request(app)
        .get(`/transcriptions/${testTranscriptId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'processing');
      expect(response.body).toHaveProperty('id', testTranscriptId);
    });

    test('should return 404 for non-existent transcript', async () => {
      const response = await request(app)
        .get('/transcriptions/non-existent-id/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/transcriptions/${testTranscriptId}/status`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});

