const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const dashboardRoutes = require('../routes/dashboard');
const Job = require('../models/Job');

const app = express();
app.use(express.json());
app.use('/api', dashboardRoutes);

describe('API Endpoints', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/job-automation-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Job.deleteMany({});
  });

  describe('GET /api/jobs', () => {
    it('should return empty array when no jobs', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual([]);
    });

    it('should return jobs list', async () => {
      await Job.create({
        jobId: 'test-1',
        title: 'Test Job',
        company: 'Test Company',
        location: 'London',
        description: 'Test description',
        source: { platform: 'LinkedIn', url: 'https://example.com/1' },
      });

      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].title).toBe('Test Job');
    });

    it('should filter jobs by status', async () => {
      await Job.create([
        {
          jobId: 'test-1',
          title: 'Job 1',
          company: 'Company A',
          location: 'London',
          description: 'Description 1',
          source: { platform: 'LinkedIn', url: 'https://example.com/1' },
          status: 'scraped',
        },
        {
          jobId: 'test-2',
          title: 'Job 2',
          company: 'Company B',
          location: 'Manchester',
          description: 'Description 2',
          source: { platform: 'Indeed', url: 'https://example.com/2' },
          status: 'ready_for_review',
        },
      ]);

      const res = await request(app).get('/api/jobs?status=scraped');
      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].status).toBe('scraped');
    });
  });

  describe('GET /api/stats', () => {
    it('should return statistics', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body.stats).toHaveProperty('total');
      expect(res.body.stats).toHaveProperty('byStatus');
      expect(res.body.stats).toHaveProperty('byPlatform');
    });
  });
});