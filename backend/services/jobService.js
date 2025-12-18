const Job = require('../models/Job');
const crypto = require('crypto');
const logger = require('../utils/logger');

class JobService {
    // Generate unique hash for deduplication
    generateJobHash(job) {
        const normalized = `${job.title}|${job.company}|${job.location}`.toLowerCase();
        return crypto.createHash('md5').update(normalized).digest('hex');
    }
    
    // Generate unique jobId
    generateJobId(job) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${job.platform.toLowerCase()}-${timestamp}-${random}`;
    }
    
    async saveJobs(jobs) {
        const results = {
            newJobs: 0,
            duplicates: 0,
            errors: 0,
            saved: []
        };
        
        for (const job of jobs) {
            try {
                // Generate hash for deduplication
                const jobHash = this.generateJobHash(job);
                
                // Check if job already exists
                const existingJob = await Job.findOne({ 
                    $or: [
                        { jobHash },
                        { 'source.url': job.url }
                    ]
                });
                
                if (existingJob) {
                    results.duplicates++;
                    logger.debug(`Duplicate job found: ${job.title} at ${job.company}`);
                    continue;
                }
                
                // Create new job document
                const newJob = new Job({
                    jobId: this.generateJobId(job),
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description || '',
                    salary: job.salary ? this.parseSalary(job.salary) : undefined,
                    source: {
                        platform: job.platform,
                        url: job.url,
                        scrapedAt: job.scrapedAt || new Date()
                    },
                    jobHash,
                    status: 'scraped',
                    quality: {
                        hasDescription: !!job.description,
                        hasSalary: !!job.salary,
                        matchScore: 0,
                        priorityScore: this.calculatePriorityScore(job)
                    }
                });
                
                await newJob.save();
                results.newJobs++;
                results.saved.push(newJob);
                
                logger.debug(`✅ Saved: ${job.title} at ${job.company}`);
                
            } catch (error) {
                results.errors++;
                logger.error(`Error saving job: ${job.title}`, error.message);
            }
        }
        
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
    
    calculatePriorityScore(job) {
        let score = 50; // Base score
        
        // Higher priority for certain keywords
        const highPriorityKeywords = ['senior', 'lead', 'remote', 'soc', 'security analyst'];
        const lowPriorityKeywords = ['graduate', 'junior', 'intern'];
        
        const titleLower = job.title.toLowerCase();
        
        highPriorityKeywords.forEach(keyword => {
            if (titleLower.includes(keyword)) score += 10;
        });
        
        lowPriorityKeywords.forEach(keyword => {
            if (titleLower.includes(keyword)) score -= 10;
        });
        
        // Bonus for salary info
        if (job.salary) score += 5;
        
        // Bonus for description
        if (job.description && job.description.length > 100) score += 5;
        
        return Math.max(0, Math.min(100, score));
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
    
    async markStaleJobs(daysOld = 7) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        
        const result = await Job.updateMany(
            { 
                'source.scrapedAt': { $lt: cutoffDate },
                status: { $nin: ['applied', 'user_approved'] }
            },
            { 
                $set: { status: 'expired' }
            }
        );
        
        logger.info(`🗑️  Marked ${result.modifiedCount} jobs as expired`);
        return result.modifiedCount;
    }
}

module.exports = new JobService();