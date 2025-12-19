const cron = require('node-cron');
const Job = require('../models/Job');
const atsService = require('../services/atsService');
const logger = require('../utils/logger');

class ATSProcessor {
  constructor() {
    this.isProcessing = false;
    this.task = null;
  }

  start() {
    this.task = cron.schedule('*/30 * * * *', async () => {
      await this.processUnanalyzedJobs();
    }, {
      scheduled: true,
      timezone: 'Europe/London'
    });

    logger.info('✅ ATS Processor started (runs every 30 minutes)');
    
    setTimeout(() => this.processUnanalyzedJobs(), 5000);
  }

  async processUnanalyzedJobs() {
    if (this.isProcessing) {
      logger.info('ATS processing already running, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      const jobs = await Job.find({
        status: 'scraped',
        'aiGenerated.resume.atsScore': { $exists: false }
      }).limit(20);

      if (jobs.length === 0) {
        logger.info('No jobs need ATS analysis');
        return;
      }

      logger.info(`📊 Processing ATS scores for ${jobs.length} jobs`);

      for (const job of jobs) {
        try {
          const analysis = await atsService.calculateATSScore(job);

          await Job.findByIdAndUpdate(job._id, {
            'aiGenerated.resume.atsScore': analysis.atsScore,
            'aiGenerated.matchedSkills': analysis.matchedSkills,
            'aiGenerated.missingSkills': analysis.missingSkills,
            'aiGenerated.resume.keywordsMatched': analysis.matchedSkills,
            status: analysis.atsScore >= 70 ? 'ready_for_review' : 'scraped',
            lastProcessedAt: new Date()
          });

          logger.info(`✅ Job ${job._id}: ATS Score ${analysis.atsScore}%`);

          await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
          logger.error(`Failed to process job ${job._id}:`, error.message);
        }
      }

      logger.info(`✅ ATS processing complete: ${jobs.length} jobs analyzed`);

    } catch (error) {
      logger.error('ATS processor error:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('ATS Processor stopped');
    }
  }
}

module.exports = new ATSProcessor();