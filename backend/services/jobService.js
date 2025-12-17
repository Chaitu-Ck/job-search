const Job = require('../models/Job');
const crypto = require('crypto');
const logger = require('../utils/logger');

class JobService {
  async bulkInsertJobs(jobs) {
    let inserted = 0;
    let duplicates = 0;
    
    for (const jobData of jobs) {
      try {
        // Generate hash for deduplication
        const jobHash = crypto
          .createHash('md5')
          .update(`${jobData.url}-${jobData.company}-${jobData.title}`)
          .digest('hex');
        
        // Check if exists
        const existing = await Job.findOne({ jobHash });
        
        if (existing) {
          duplicates++;
          continue;
        }
        
        // Create new job
        await Job.create({
          jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: jobData.title,
          company: jobData.company,
          location: jobData.location || 'Not specified',
          description: jobData.description || 'No description available',
          source: {
            platform: jobData.platform,
            url: jobData.url,
            scrapedAt: new Date()
          },
          postedDate: jobData.postedDate ? new Date(jobData.postedDate) : new Date(),
          jobHash: jobHash,
          status: jobData.status || 'scraped'
        });
        
        inserted++;
        
      } catch (error) {
        logger.error(`Failed to insert job ${jobData.title}:`, error);
      }
    }
    
    return { inserted, duplicates };
  }

  async markStaleJobs(daysOld = 7) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await Job.updateMany(
      { 
        scrapedAt: { $lt: cutoffDate },
        status: { $ne: 'applied' }
      },
      { 
        $set: { status: 'expired' }
      }
    );
    
    logger.info(`Marked ${result.modifiedCount} jobs as expired`);
    return result.modifiedCount;
  }
}

module.exports = new JobService();