const cron = require('node-cron');
const logger = require('../utils/logger');
const { SEARCH_KEYWORDS } = require('../config/companySources');

// Import all scrapers
const linkedinScraper = require('../scrapers/linkedinScraper');
const reedScraper = require('../scrapers/reedScraper');
const indeedScraper = require('../scrapers/indeedScraper');
const cwjobsScraper = require('../scrapers/cwjobsScraper');
const totaljobsScraper = require('../scrapers/totaljobsScraper');
const companyPagesScraper = require('../scrapers/companyPagesScraper');

const jobService = require('../services/jobService');
const metrics = require('../utils/metrics');

class ContinuousScheduler {
  constructor() {
    this.isRunning = false;
    this.searchKeywords = SEARCH_KEYWORDS; // Use expanded keywords from config
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
        this.scrapeCWJobs(),
        this.scrapeTotalJobs(),
        this.scrapeCompanyPages()
      ]);
      
      // Process results
      let totalJobs = 0;
      const platforms = ['LinkedIn', 'Reed', 'Indeed', 'CWJobs', 'TotalJobs', 'Company Pages'];
      
      results.forEach((result, index) => {
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
    // Use top 10 keywords for LinkedIn
    const topKeywords = this.searchKeywords.slice(0, 10);
    const jobs = await linkedinScraper.scrapeMultipleSearches(topKeywords, this.location);
    
    const result = await jobService.bulkInsertJobs(
      jobs.map(job => ({ ...job, platform: 'LinkedIn', status: 'pending' }))
    );
    
    return result.inserted;
  }

  async scrapeReed() {
    const reedJobs = [];
    // Use top 8 keywords for Reed
    const keywords = this.searchKeywords.slice(0, 8);
    
    for (const keyword of keywords) {
      const jobs = await reedScraper.scrapeJobs(keyword, this.location);
      reedJobs.push(...jobs);
    }
    
    const result = await jobService.bulkInsertJobs(
      reedJobs.map(job => ({ ...job, platform: 'Reed', status: 'pending' }))
    );
    
    return result.inserted;
  }

  async scrapeIndeed() {
    const indeedJobs = [];
    // Use top 8 keywords for Indeed
    const keywords = this.searchKeywords.slice(0, 8);
    
    for (const keyword of keywords) {
      const jobs = await indeedScraper.scrapeJobs(keyword, this.location);
      indeedJobs.push(...jobs);
    }
    
    const result = await jobService.bulkInsertJobs(
      indeedJobs.map(job => ({ ...job, platform: 'Indeed', status: 'pending' }))
    );
    
    return result.inserted;
  }

  async scrapeCWJobs() {
    const cwJobs = [];
    // Use top 5 keywords for CWJobs (IT/Tech specialist)
    const keywords = this.searchKeywords.slice(0, 5);
    
    for (const keyword of keywords) {
      const jobs = await cwjobsScraper.scrapeJobs(keyword, this.location);
      cwJobs.push(...jobs);
    }
    
    const result = await jobService.bulkInsertJobs(
      cwJobs.map(job => ({ ...job, platform: 'CWJobs', status: 'pending' }))
    );
    
    return result.inserted;
  }

  async scrapeTotalJobs() {
    const totalJobs = [];
    // Use top 5 keywords for TotalJobs
    const keywords = this.searchKeywords.slice(0, 5);
    
    for (const keyword of keywords) {
      const jobs = await totaljobsScraper.scrapeJobs(keyword, this.location);
      totalJobs.push(...jobs);
    }
    
    const result = await jobService.bulkInsertJobs(
      totalJobs.map(job => ({ ...job, platform: 'TotalJobs', status: 'pending' }))
    );
    
    return result.inserted;
  }

  async scrapeCompanyPages() {
    // Use top 5 keywords for company pages
    const keywords = this.searchKeywords.slice(0, 5);
    const jobs = await companyPagesScraper.scrapeAllCompanies(keywords);
    
    const result = await jobService.bulkInsertJobs(
      jobs.map(job => ({ ...job, platform: 'Company Career Page', status: 'pending' }))
    );
    
    return result.inserted;
  }

  async cleanupOldJobs() {
    logger.info('🧹 Running daily job cleanup');
    await jobService.markStaleJobs(7); // Mark jobs older than 7 days as stale
  }
}

module.exports = new ContinuousScheduler();