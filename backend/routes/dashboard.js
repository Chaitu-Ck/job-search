const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const applicationService = require('../services/applicationService');

// Get all jobs with filters
router.get('/jobs', async (req, res) => {
  try {
    const { status, platform, search, limit = 100 } = req.query;
    
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (platform && platform !== 'all') query.platform = platform;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    const jobs = await Job.find(query)
      .sort({ scrapedAt: -1 })
      .limit(parseInt(limit));
    
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get job statistics
router.get('/jobs/stats', async (req, res) => {
  try {
    const stats = await Job.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPlatform: [{ $group: { _id: '$platform', count: { $sum: 1 } } }]
        }
      }
    ]);
    
    const result = {
      total: stats[0].total[0]?.count || 0,
      pending: stats[0].byStatus.find(s => s._id === 'pending')?.count || 0,
      ready: stats[0].byStatus.find(s => s._id === 'ready_to_apply')?.count || 0,
      applied: stats[0].byStatus.find(s => s._id === 'applied')?.count || 0,
      platforms: stats[0].byPlatform
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Prepare application (CV + Email generation)
router.post('/applications/prepare/:jobId', async (req, res) => {
  try {
    const result = await applicationService.processJobWithEmail(req.params.jobId);
    res.json({
      success: true,
      message: 'Application prepared successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Apply to job
router.post('/applications/apply/:jobId', async (req, res) => {
  try {
    const result = await applicationService.applyWithEmail(req.params.jobId);
    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update job (for editing email/resume)
router.patch('/jobs/:jobId', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.jobId,
      { $set: req.body },
      { new: true }
    );
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get resume preview
router.get('/resumes/:jobId/preview', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || !job.optimizedCV) {
      return res.status(404).send('Resume not found');
    }
    res.sendFile(job.optimizedCV);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;