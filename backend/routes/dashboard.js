const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const logger = require('../utils/logger');
const { body, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

router.get('/jobs', [
  query('status').optional().isIn(['scraped', 'validated', 'keywords_extracted', 'resume_pending', 'resume_generated', 'email_pending', 'email_generated', 'ready_for_review', 'user_approved', 'user_rejected', 'applying', 'applied', 'failed', 'expired']),
  query('platform').optional().isIn(['LinkedIn', 'Indeed', 'Reed', 'CWJobs', 'CyberSecurityJobs', 'GovUK', 'TotalJobs', 'StudentCircus', 'CompanyCareerPage']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('skip').optional().isInt({ min: 0 }).toInt(),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const { status, platform, search, limit = 50, skip = 0 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (platform) query['source.platform'] = platform;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ 'source.scrapedAt': -1 })
        .limit(limit)
        .skip(skip)
        .select('-errors -__v')
        .lean(),
      Job.countDocuments(query),
    ]);

    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true, job });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID' });
    }
    next(err);
  }
});

router.patch('/jobs/:id/status', [
  body('status').isIn(['user_approved', 'user_rejected', 'applying', 'applied']),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        'userActions.reviewedAt': new Date(),
        ...(status === 'user_approved' && { 'userActions.approvedAt': new Date() }),
        ...(status === 'user_rejected' && { 'userActions.rejectedAt': new Date() }),
      },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    logger.info(`Job ${job._id} status updated to ${status}`);
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [
      total,
      byStatus,
      byPlatform,
      recentJobs,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Job.aggregate([
        { $group: { _id: '$source.platform', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Job.find()
        .sort({ 'source.scrapedAt': -1 })
        .limit(5)
        .select('title company source.platform source.scrapedAt')
        .lean(),
    ]);

    const stats = {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      byPlatform: Object.fromEntries(byPlatform.map(p => [p._id, p.count])),
      recentJobs,
    };

    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

router.delete('/jobs/:id', async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    logger.info(`Job ${job._id} deleted`);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;