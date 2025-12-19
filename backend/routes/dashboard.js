const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const logger = require('../utils/logger');
const { body, query, param, validationResult } = require('express-validator');
const cvGenerationService = require('../services/cvGenerationService');
const emailGenerationService = require('../services/emailGenerationService');
const atsService = require('../services/atsService');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Existing routes...
router.get('/jobs', [
  query('status').optional().isIn(['scraped', 'validated', 'ready_for_review', 'applied', 'failed']),
  query('platform').optional().isIn(['LinkedIn', 'Indeed', 'Reed', 'StudentCircus']),
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
      pagination: { total, limit, skip, hasMore: skip + limit < total },
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
    next(err);
  }
});

// Generate CV and Email for a job
router.post('/jobs/:id/generate', async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    logger.info(`Generating CV and email for job ${job._id}`);

    // Generate CV
    const cvResult = await cvGenerationService.generateTailoredCV(job);
    
    // Generate Email
    const emailResult = await emailGenerationService.generateEmail(job, cvResult.content);

    // Calculate ATS score if not already done
    let atsScore = job.aiGenerated?.resume?.atsScore;
    if (!atsScore) {
      const atsResult = await atsService.calculateATSScore(job);
      atsScore = atsResult.atsScore;
      job.aiGenerated = job.aiGenerated || {};
      job.aiGenerated.matchedSkills = atsResult.matchedSkills;
      job.aiGenerated.missingSkills = atsResult.missingSkills;
    }

    // Update job
    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.resume = {
      content: cvResult.content,
      generatedAt: cvResult.generatedAt,
      wordCount: cvResult.wordCount,
      atsScore: atsScore
    };
    job.aiGenerated.email = emailResult;
    job.status = 'ready_for_review';
    job.lastProcessedAt = new Date();

    await job.save();

    logger.info(`Generated CV and email for ${job.title}`);

    res.json({
      success: true,
      message: 'CV and email generated successfully',
      data: {
        cv: cvResult,
        email: emailResult,
        atsScore
      }
    });

  } catch (err) {
    logger.error('Generate endpoint error:', err);
    next(err);
  }
});

// Regenerate CV with feedback
router.post('/jobs/:id/regenerate-cv', [
  body('feedback').isString().notEmpty(),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const currentCV = job.aiGenerated?.resume?.content || '';
    const cvResult = await cvGenerationService.regenerateCV(job, req.body.feedback, currentCV);

    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.resume = {
      ...job.aiGenerated.resume,
      content: cvResult.content,
      generatedAt: cvResult.generatedAt,
      wordCount: cvResult.wordCount
    };

    await job.save();

    res.json({
      success: true,
      message: 'CV regenerated successfully',
      cv: cvResult
    });

  } catch (err) {
    next(err);
  }
});

// Regenerate Email with feedback
router.post('/jobs/:id/regenerate-email', [
  body('feedback').isString().notEmpty(),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const currentEmail = job.aiGenerated?.email || {};
    const emailResult = await emailGenerationService.regenerateEmail(job, req.body.feedback, currentEmail);

    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.email = emailResult;

    await job.save();

    res.json({
      success: true,
      message: 'Email regenerated successfully',
      email: emailResult
    });

  } catch (err) {
    next(err);
  }
});

// Update CV manually
router.patch('/jobs/:id/cv', [
  body('content').isString().notEmpty(),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.resume = {
      ...job.aiGenerated.resume,
      content: req.body.content,
      generatedAt: new Date(),
      wordCount: req.body.content.split(/\s+/).length
    };
    job.userActions = job.userActions || {};
    job.userActions.resumeEdited = true;

    await job.save();

    res.json({ success: true, message: 'CV updated successfully' });

  } catch (err) {
    next(err);
  }
});

// Update Email manually
router.patch('/jobs/:id/email', [
  body('subject').isString().notEmpty(),
  body('body').isString().notEmpty(),
  handleValidationErrors,
], async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.email = {
      subject: req.body.subject,
      body: req.body.body,
      generatedAt: new Date(),
      wordCount: req.body.body.split(/\s+/).length
    };
    job.userActions = job.userActions || {};
    job.userActions.emailEdited = true;

    await job.save();

    res.json({ success: true, message: 'Email updated successfully' });

  } catch (err) {
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
        ...(status === 'applied' && { 'userActions.appliedAt': new Date() }),
      },
      { new: true, runValidators: true }
    );

    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [total, byStatus, byPlatform] = await Promise.all([
      Job.countDocuments(),
      Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: '$source.platform', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        byPlatform: Object.fromEntries(byPlatform.map(p => [p._id, p.count])),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Delete single job
router.delete('/jobs/:id', async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    logger.info(`Job ${job._id} deleted`);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

// Clear all data - DANGER ZONE
router.delete('/jobs', async (req, res, next) => {
  try {
    const result = await Job.deleteMany({});
    logger.warn(`ALL JOBS DELETED: ${result.deletedCount} jobs removed`);
    res.json({ 
      success: true, 
      message: `Database cleared: ${result.deletedCount} jobs deleted`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
});

// AI optimize CV endpoint
router.post('/jobs/:id/optimize-cv', async (req, res) => {
  try {
    const { currentContent } = req.body;
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const aiService = require('../services/aiService');
    const optimized = await aiService.optimizeResume(currentContent, job);
    
    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.resume = {
      content: optimized.content,
      atsScore: optimized.atsScore,
      optimizedAt: new Date()
    };
    
    await job.save();
    
    res.json({
      success: true,
      optimizedContent: optimized.content,
      atsScore: optimized.atsScore
    });
  } catch (error) {
    logger.error('AI optimize CV error:', error);
    res.status(500).json({ error: 'Failed to optimize CV' });
  }
});

// AI optimize email endpoint
router.post('/jobs/:id/optimize-email', async (req, res) => {
  try {
    const { currentContent } = req.body;
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const aiService = require('../services/aiService');
    const optimized = await aiService.optimizeEmail(currentContent, job);
    
    job.aiGenerated = job.aiGenerated || {};
    job.aiGenerated.email = {
      subject: optimized.subject,
      body: optimized.body,
      optimizedAt: new Date()
    };
    
    await job.save();
    
    res.json({
      success: true,
      subject: optimized.subject,
      body: optimized.body
    });
  } catch (error) {
    logger.error('AI optimize email error:', error);
    res.status(500).json({ error: 'Failed to optimize email' });
  }
});

module.exports = router;