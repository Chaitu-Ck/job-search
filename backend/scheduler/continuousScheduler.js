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
const studentcircusScraper = require('../scrapers/studentcircusScraper'); // NEW

const jobService = require('../services/jobService');
const metrics = require('../utils/metrics');

class ContinuousScheduler {
    constructor() {
        this.isRunning = false;
        this.keywords = process.env.SEARCH_KEYWORDS?.split(',') || SEARCH_KEYWORDS;
        this.location = process.env.SEARCH_LOCATION || 'United Kingdom';
        
        // Maximum age for jobs (in days) - only scrape fresh jobs
        this.maxJobAge = parseInt(process.env.MAX_JOB_AGE_DAYS) || 7;
        
        this.scrapers = [
            { 
                name: 'StudentCircus', 
                scraper: studentcircusScraper, 
                enabled: process.env.ENABLE_STUDENTCIRCUS !== 'false',
                priority: 1, // Highest priority - graduate-focused
                maxPages: 5
            },
            { 
                name: 'Indeed', 
                scraper: indeedScraper, 
                enabled: process.env.ENABLE_INDEED !== 'false',
                priority: 2,
                maxPages: 5
            },
            { 
                name: 'Reed', 
                scraper: reedScraper, 
                enabled: process.env.ENABLE_REED !== 'false',
                priority: 3,
                maxPages: 5
            },
            { 
                name: 'CWJobs', 
                scraper: cwjobsScraper, 
                enabled: process.env.ENABLE_CWJOBS !== 'false',
                priority: 4,
                maxPages: 3
            },
            { 
                name: 'TotalJobs', 
                scraper: totaljobsScraper, 
                enabled: process.env.ENABLE_TOTALJOBS !== 'false',
                priority: 5,
                maxPages: 3
            },
            { 
                name: 'LinkedIn', 
                scraper: linkedinScraper, 
                enabled: process.env.ENABLE_LINKEDIN === 'true',
                priority: 6,
                maxPages: 3
            },
            { 
                name: 'Company Pages', 
                scraper: companyPagesScraper, 
                enabled: true,
                priority: 7
            }
        ];
        
        // Sort by priority
        this.scrapers.sort((a, b) => a.priority - b.priority);
    }
    
    async runScrapingJob() {
        if (this.isRunning) {
            logger.warn('⚠️ Scraping job already running. Skipping this cycle.');
            return;
        }
        
        this.isRunning = true;
        logger.info('🚀 ========== STARTING SCRAPING JOB ==========');
        logger.info(`📅 Only fetching jobs posted within last ${this.maxJobAge} days`);
        
        const startTime = Date.now();
        let totalJobs = 0;
        const results = {};
        
        try {
            for (const keyword of this.keywords) {
                logger.info(`\n📋 Scraping for keyword: "${keyword}"`);
                
                for (const { name, scraper, enabled, maxPages } of this.scrapers) {
                    if (!enabled) {
                        logger.info(`⏭️ Skipping ${name} (disabled)`);
                        continue;
                    }
                    
                    try {
                        logger.info(`\n🔍 Running ${name} scraper...`);
                        
                        let jobs;
                        
                        // StudentCircus has different signature with maxAge parameter
                        if (name === 'StudentCircus') {
                            jobs = await scraper.scrapeJobs(
                                keyword, 
                                this.location, 
                                this.maxJobAge, // Pass max age for freshness filtering
                                maxPages || 5
                            );
                        } else if (name === 'Company Pages') {
                            // Company pages scraper uses different method
                            jobs = await scraper.scrapeAllCompanies([keyword]);
                        } else {
                            // Standard scrapers
                            jobs = await scraper.scrapeJobs(keyword, this.location);
                        }
                        
                        if (jobs && jobs.length > 0) {
                            // Debug logging to see what jobs are being passed
                            logger.debug(`Passing ${jobs.length} jobs to jobService.saveJobs`);
                            if (jobs.length > 0) {
                                logger.debug(`First job sample: ${JSON.stringify(jobs[0], null, 2)}`);
                            }
                            
                            // Save jobs to database
                            const saved = await jobService.saveJobs(jobs);
                            
                            results[`${name}_${keyword}`] = {
                                found: jobs.length,
                                saved: saved.newJobs,
                                updated: saved.updated,
                                duplicates: saved.duplicates
                            };
                            
                            totalJobs += saved.newJobs;
                            
                            logger.info(`✅ ${name}: Found ${jobs.length} jobs, saved ${saved.newJobs} new, updated ${saved.updated}, ${saved.duplicates} duplicates`);
                        } else {
                            logger.warn(`⚠️ ${name}: No jobs found for "${keyword}"`);
                            results[`${name}_${keyword}`] = { found: 0, saved: 0, updated: 0, duplicates: 0 };
                        }
                        
                        // Delay between different scrapers
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                    } catch (error) {
                        logger.error(`❌ ${name} scraper failed for "${keyword}":`, error.message);
                        results[`${name}_${keyword}`] = { error: error.message };
                    }
                }
                
                // Delay between keywords
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
            // Mark old jobs as stale
            await jobService.markStaleJobs(this.maxJobAge);
            
        } catch (error) {
            logger.error('❌ Critical error in scraping job:', error);
        } finally {
            this.isRunning = false;
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            logger.info('\n========== SCRAPING JOB COMPLETE ==========');
            logger.info(`⏱️ Duration: ${duration}s`);
            logger.info(`📊 Total new jobs saved: ${totalJobs}`);
            logger.info(`📈 Results summary:`, JSON.stringify(results, null, 2));
            logger.info('============================================\n');
        }
    }
    
    startScheduler() {
        logger.info('🕐 Starting continuous job scheduler...');
        logger.info(`📋 Keywords: ${this.keywords.join(', ')}`);
        logger.info(`📍 Location: ${this.location}`);
        logger.info(`📅 Max job age: ${this.maxJobAge} days`);
        logger.info(`🔄 Schedule: Every 6 hours`);
        
        // Run immediately on startup
        setTimeout(() => {
            logger.info('▶️ Running initial scraping job...');
            this.runScrapingJob();
        }, 5000); // 5 second delay after server start
        
        // Schedule to run every 6 hours
        cron.schedule('0 */6 * * *', () => {
            logger.info('⏰ Scheduled scraping job triggered');
            this.runScrapingJob();
        });
        
        // Also run daily cleanup at 3 AM
        cron.schedule('0 3 * * *', async () => {
            logger.info('🧹 Running daily cleanup job');
            await jobService.markStaleJobs(this.maxJobAge);
        });
        
        logger.info('✅ Continuous scheduler started successfully!');
        logger.info('💡 Next scrape run: In 6 hours');
        logger.info('💡 Daily cleanup: 3 AM');
    }

  async runScrapingCycle() {
    // Alias for backward compatibility
    return await this.runScrapingJob();
  }

  async scrapeLinkedIn() {
    // Use top 10 keywords for LinkedIn
    const topKeywords = this.keywords.slice(0, 10);
    const jobs = await linkedinScraper.scrapeMultipleSearches(topKeywords, this.location);
    
    const result = await jobService.saveJobs(
      jobs.map(job => ({ ...job, platform: 'LinkedIn', status: 'pending' }))
    );
    
    return result.newJobs;
  }

  async scrapeReed() {
    const reedJobs = [];
    // Use top 8 keywords for Reed
    const keywords = this.keywords.slice(0, 8);
    
    for (const keyword of keywords) {
      const jobs = await reedScraper.scrapeJobs(keyword, this.location);
      reedJobs.push(...jobs);
    }
    
    const result = await jobService.saveJobs(
      reedJobs.map(job => ({ ...job, status: 'pending' }))
    );
    
    return result.newJobs;
  }

  async scrapeIndeed() {
    const indeedJobs = [];
    // Use top 8 keywords for Indeed
    const keywords = this.keywords.slice(0, 8);
    
    for (const keyword of keywords) {
      const jobs = await indeedScraper.scrapeJobs(keyword, this.location);
      indeedJobs.push(...jobs);
    }
    
    const result = await jobService.saveJobs(
      indeedJobs.map(job => ({ ...job, status: 'pending' }))
    );
    
    return result.newJobs;
  }

  async scrapeCWJobs() {
    const cwJobs = [];
    // Use top 5 keywords for CWJobs (IT/Tech specialist)
    const keywords = this.keywords.slice(0, 5);
    
    for (const keyword of keywords) {
      const jobs = await cwjobsScraper.scrapeJobs(keyword, this.location);
      cwJobs.push(...jobs);
    }
    
    const result = await jobService.saveJobs(
      cwJobs.map(job => ({ ...job, status: 'pending' }))
    );
    
    return result.newJobs;
  }

  async scrapeTotalJobs() {
    const totalJobs = [];
    // Use top 5 keywords for TotalJobs
    const keywords = this.keywords.slice(0, 5);
    
    for (const keyword of keywords) {
      const jobs = await totaljobsScraper.scrapeJobs(keyword, this.location);
      totalJobs.push(...jobs);
    }
    
    const result = await jobService.saveJobs(
      totalJobs.map(job => ({ ...job, status: 'pending' }))
    );
    
    return result.newJobs;
  }

  async scrapeCompanyPages() {
    // Use top 5 keywords for company pages
    const keywords = this.keywords.slice(0, 5);
    const jobs = await companyPagesScraper.scrapeAllCompanies(keywords);
    
    const result = await jobService.saveJobs(
      jobs.map(job => ({ ...job, platform: 'Company Career Page', status: 'pending' }))
    );
    
    return result.newJobs;
  }

  async cleanupOldJobs() {
    logger.info('🧹 Running daily job cleanup');
    await jobService.markStaleJobs(7); // Mark jobs older than 7 days as stale
  }
}

module.exports = new ContinuousScheduler();