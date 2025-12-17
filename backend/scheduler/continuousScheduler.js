const cron = require('node-cron');
const logger = require('../utils/logger');
const linkedinScraper = require('../scrapers/linkedinScraper');
const reedScraper = require('../scrapers/reedScraper');
const indeedScraper = require('../scrapers/indeedScraper');
const jobService = require('../services/jobService');
const metrics = require('../utils/metrics');

class ContinuousScheduler {
  constructor() {
    this.isRunning = false;
    this.searchKeywords = [
      'SOC Analyst',
      'Security Analyst',
      'Junior Penetration Tester',
      'Linux Administrator',
      'Cybersecurity Analyst',
      'Cyber Security Engineer',
      'Information Security Analyst',
      'Network Security Engineer'
    ];
    this.location = 'United Kingdom';
  }

  // Run every 6 hours: 0 */6 * * *
  startScheduler() {
    logger.info('🚀 Starting 24/7 Continuous Job Scheduler');
    
    // Run immediately on startup
    this.runScrapingCycle();
    
    // Schedule for every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      logger.info('⏰ Scheduled scraping cycle triggered');
      await this.runScrapingCycle();
    });
    
    // Daily cleanup at 3 AM
    cron.schedule('0 3 * * *', async () => {
      await this.cleanupOldJobs();
    });
  }

  async runScrapingCycle() {
    if (this.isRunning) {
      logger.warn('⚠️ Scraping cycle already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('🔍 Starting multi-platform job scraping cycle');
      
      // Scrape from all platforms concurrently
      const results = await Promise.allSettled([
        this.scrapeLinkedIn(),
        this.scrapeReed(),
        this.scrapeIndeed(),
        this.scrapeCompanyPages()
      ]);
      
      // Process results
      let totalJobs = 0;
      results.forEach((result, index) => {
        const platforms = ['LinkedIn', 'Reed', 'Indeed', 'Company Pages'];
        if (result.status === 'fulfilled') {
          totalJobs += result.value;
          logger.info(`✅ ${platforms[index]}: ${result.value} jobs scraped`);
        } else {
          logger.error(`❌ ${platforms[index]} failed:`, result.reason);
        }
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ Scraping cycle complete: ${totalJobs} total jobs in ${duration}s`);
      
      metrics.recordJobProcessed(Date.now() - startTime);
      
    } catch (error) {
      logger.error('❌ Scraping cycle failed:', error);
      metrics.recordJobFailed();
    } finally {
      this.isRunning = false;
    }
  }

  async scrapeLinkedIn() {
    const jobs = await linkedinScraper.scrapeMultipleSearches(
      this.searchKeywords,
      this.location
    );
    
    const result = await jobService.bulkInsertJobs(
      jobs.map(job => ({
        ...job,
        platform: 'LinkedIn',
        status: 'pending'
      }))
    );
    
    return result.inserted;
  }

  async scrapeReed() {
    const reedJobs = [];
    
    for (const keyword of this.searchKeywords) {
      const jobs = await reedScraper.scrapeJobs(keyword, this.location);
      reedJobs.push(...jobs);
    }
    
    const result = await jobService.bulkInsertJobs(
      reedJobs.map(job => ({
        ...job,
        platform: 'Reed',
        status: 'pending'
      }))
    );
    
    return result.inserted;
  }

  async scrapeIndeed() {
    const indeedJobs = [];
    
    for (const keyword of this.searchKeywords) {
      const jobs = await indeedScraper.scrapeJobs(keyword, this.location);
      indeedJobs.push(...jobs);
    }
    
    const result = await jobService.bulkInsertJobs(
      indeedJobs.map(job => ({
        ...job,
        platform: 'Indeed',
        status: 'pending'
      }))
    );
    
    return result.inserted;
  }

  async scrapeCompanyPages() {
    // List of UK cybersecurity companies with direct career pages
    const companies = [
      { name: 'BAE Systems', url: 'https://www.baesystems.com/careers' },
      { name: 'GCHQ', url: 'https://www.gchq-careers.co.uk/' },
      { name: 'NCC Group', url: 'https://www.nccgroup.com/careers/' },
      // Add more companies
    ];
    
    // Implement company page scraper
    return 0; // Placeholder
  }

  async cleanupOldJobs() {
    logger.info('🧹 Running daily job cleanup');
    await jobService.markStaleJobs(7); // Mark jobs older than 7 days as stale
  }
}

module.exports = new ContinuousScheduler();