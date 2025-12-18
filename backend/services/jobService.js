const Job = require('../models/Job');
const crypto = require('crypto');
const logger = require('../utils/logger');

class JobService {
  /**
   * Generate unique hash for deduplication
   * Uses title + company + location (normalized)
   */
  generateJobHash(title, company, location) {
    const normalized = `${title}_${company}_${location}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }
  
  /**
   * Generate unique jobId
   */
  generateJobId(job) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${job.platform.toLowerCase()}-${timestamp}-${random}`;
  }
  
  /**
   * Save jobs with intelligent deduplication and freshness tracking
   */
  async saveJobs(jobs) {
    const results = {
      newJobs: 0,
      updated: 0,
      duplicates: 0,
      errors: 0
    };
    
    for (const jobData of jobs) {
      try {
        // Generate hash for deduplication
        const jobHash = this.generateJobHash(
          jobData.title,
          jobData.company,
          jobData.location
        );
        
        // Check if job already exists
        const existingJob = await Job.findOne({
          $or: [
            { jobHash },
            { 'source.url': jobData.source?.url },
            { jobId: jobData.jobId }
          ]
        });
        
        if (existingJob) {
          // Check if this is a FRESH re-post (company reposted the job)
          const daysSinceLastScrape = existingJob.source?.scrapedAt ? 
            (Date.now() - existingJob.source.scrapedAt) / (1000 * 60 * 60 * 24) 
            : 999;
          
          const isRepost = daysSinceLastScrape > 30; // Consider repost if > 30 days old
          
          if (isRepost) {
            // This is a fresh reposting - update the job with new data
            existingJob.source.scrapedAt = new Date();
            existingJob.postedDate = jobData.postedDate || new Date();
            existingJob.status = 'scraped'; // Reset to scraped
            existingJob.description = jobData.description || existingJob.description;
            
            await existingJob.save();
            results.updated++;
            logger.debug(`♻️ Updated reposted job: ${jobData.title} at ${jobData.company}`);
          } else {
            // Genuine duplicate from recent scrape
            results.duplicates++;
            logger.debug(`⏭️ Skipping duplicate: ${jobData.title} at ${jobData.company}`);
          }
          continue;
        }
        
        // Create new job entry
        const newJob = new Job({
          jobId: jobData.jobId || `${jobData.source?.platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: jobData.title,
          company: jobData.company,
          location: jobData.location,
          jobType: jobData.jobType || 'Not specified',
          description: jobData.description || '',
          source: {
            platform: jobData.source?.platform || 'Unknown',
            url: jobData.source?.url,
            scrapedAt: jobData.source?.scrapedAt || new Date()
          },
          postedDate: jobData.postedDate || new Date(),
          status: jobData.status || 'scraped',
          jobHash,
          quality: {
            hasDescription: (jobData.description?.length || 0) > 50,
            hasSalary: Boolean(jobData.salary),
            hasRequirements: Boolean(jobData.requirements?.length),
            isGraduateRole: jobData.quality?.isGraduateRole || false,
            matchScore: jobData.quality?.matchScore || 50,
            priorityScore: this.calculatePriorityScore(jobData)
          }
        });
        
        await newJob.save();
        results.newJobs++;
        logger.debug(`✅ Saved new job: ${jobData.title} at ${jobData.company}`);
        
      } catch (error) {
        results.errors++;
        logger.error(`Error saving job: ${error.message}`, {
          title: jobData.title,
          company: jobData.company
        });
      }
    }
    
    logger.info(`💾 Job save results: ${results.newJobs} new, ${results.updated} updated, ${results.duplicates} duplicates, ${results.errors} errors`);
    return results;
  }
    
    async bulkInsertJobs(jobs) {
        return await this.saveJobs(jobs);
    }
    
    parseSalary(salaryString) {
        if (!salaryString) return null;
        
        // Extract numbers from salary string
        const numbers = salaryString.match(/[\d,]+/g);
        if (!numbers) return null;
        
        const amounts = numbers.map(n => parseInt(n.replace(/,/g, '')));
        
        return {
            min: Math.min(...amounts),
            max: Math.max(...amounts),
            currency: 'GBP',
            period: salaryString.toLowerCase().includes('hour') ? 'per hour' : 'per annum'
        };
    }
    
  /**
   * Calculate priority score for job processing
   * Higher score = process first
   */
  calculatePriorityScore(jobData) {
    let score = 50; // Base score
    
    // Boost for recent postings
    if (jobData.postedDate) {
      const hoursOld = (Date.now() - jobData.postedDate) / (1000 * 60 * 60);
      if (hoursOld < 24) score += 30;
      else if (hoursOld < 72) score += 20;
      else if (hoursOld < 168) score += 10;
    }
    
    // Boost for graduate roles
    if (jobData.quality?.isGraduateRole) score += 15;
    
    // Boost for remote/hybrid
    if (jobData.jobType === 'Remote') score += 10;
    if (jobData.jobType === 'Hybrid') score += 5;
    
    // Boost for good description
    if ((jobData.description?.length || 0) > 200) score += 5;
    
    // Boost for visa sponsorship
    if (jobData.metadata?.visaSponsorship) score += 10;
    
    return Math.min(score, 100); // Cap at 100
  }
    
    async getJobs(filters = {}) {
        const query = {};
        
        if (filters.status) query.status = filters.status;
        if (filters.platform) query['source.platform'] = filters.platform;
        if (filters.minScore) query['quality.matchScore'] = { $gte: filters.minScore };
        
        return await Job.find(query)
            .sort({ 'quality.priorityScore': -1, 'source.scrapedAt': -1 })
            .limit(filters.limit || 100);
    }
    
    async getJobById(jobId) {
        return await Job.findOne({ jobId });
    }
    
    async updateJobStatus(jobId, status) {
        return await Job.findOneAndUpdate(
            { jobId },
            { status, lastProcessedAt: new Date() },
            { new: true }
        );
    }
    
  /**
   * Mark jobs as stale if not updated recently
   */
  async markStaleJobs(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Job.updateMany(
      {
        'source.scrapedAt': { $lt: cutoffDate },
        status: { $in: ['scraped', 'validated', 'keywords_extracted'] }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    logger.info(`🗑️ Marked ${result.modifiedCount} jobs as expired (older than ${daysOld} days)`);
    return result.modifiedCount;
  }
  
  /**
   * Get fresh jobs for processing
   */
  async getFreshJobs(limit = 50) {
    return await Job.find({
      status: 'scraped',
      'quality.priorityScore': { $gte: 60 }
    })
    .sort({ 'quality.priorityScore': -1, 'source.scrapedAt': -1 })
    .limit(limit);
  }
}

module.exports = new JobService();