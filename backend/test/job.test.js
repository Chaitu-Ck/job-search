const mongoose = require('mongoose');
const Job = require('../models/Job');

describe('Job Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/job-automation-test');
    // Ensure indexes are created
    await Job.init();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Job.deleteMany({});
  });

  describe('Job Creation', () => {
    it('should create a valid job', async () => {
      const jobData = {
        jobId: 'test-123',
        title: 'Software Engineer',
        company: 'Test Corp',
        location: 'London, UK',
        description: 'Test description',
        source: {
          platform: 'LinkedIn',
          url: 'https://example.com/job/123',
        },
      };

      const job = await Job.create(jobData);
      expect(job.title).toBe('Software Engineer');
      expect(job.company).toBe('Test Corp');
      expect(job.status).toBe('scraped');
    });

    it('should fail without required fields', async () => {
      const jobData = {
        title: 'Software Engineer',
      };

      await expect(Job.create(jobData)).rejects.toThrow();
    });

    it('should prevent duplicate URLs', async () => {
      const jobData = {
        jobId: 'test-123',
        title: 'Software Engineer',
        company: 'Test Corp',
        location: 'London, UK',
        description: 'Test description',
        source: {
          platform: 'LinkedIn',
          url: 'https://example.com/job/123',
        },
      };

      await Job.create(jobData);
      // Try to create another job with the same URL
      const duplicateJob = { ...jobData, jobId: 'test-124' };
      await expect(Job.create(duplicateJob)).rejects.toThrow(/duplicate key/);
    });
  });

  describe('Job Queries', () => {
    beforeEach(async () => {
      await Job.create([
        {
          jobId: 'test-1',
          title: 'Frontend Developer',
          company: 'Company A',
          location: 'London',
          description: 'Frontend role',
          source: { platform: 'LinkedIn', url: 'https://example.com/1' },
          status: 'scraped',
        },
        {
          jobId: 'test-2',
          title: 'Backend Developer',
          company: 'Company B',
          location: 'Manchester',
          description: 'Backend role',
          source: { platform: 'Indeed', url: 'https://example.com/2' },
          status: 'ready_for_review',
        },
      ]);
    });

    it('should find jobs by status', async () => {
      const jobs = await Job.find({ status: 'scraped' });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Frontend Developer');
    });

    it('should find jobs by platform', async () => {
      const jobs = await Job.find({ 'source.platform': 'Indeed' });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Backend Developer');
    });
  });
});