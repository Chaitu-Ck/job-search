const cron = require('node-cron');
const logger = require('../utils/logger');

const linkedinScraper = require('../scrapers/linkedinScraper');
const indeedScraper = require('../scrapers/indeedScraper');
const reedScraper = require('../scrapers/reedScraper');
const studentcircusScraper = require('../scrapers/studentcircusScraper');
const atsProcessor = require('./atsProcessor');

class ContinuousScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
    this.scrapers = [
      { name: 'Reed', scraper: reedScraper, schedule: '0 */4 * * *', enabled: true },
      { name: 'LinkedIn', scraper: linkedinScraper, schedule: '0 */6 * * *', enabled: true },
      { name: 'Indeed', scraper: indeedScraper, schedule: '0 */8 * * *', enabled: true },
      { name: 'StudentCircus', scraper: studentcircusScraper, schedule: '0 */12 * * *', enabled: true }
    ];
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
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info('🚀 Starting continuous scheduler');
    this.isRunning = true;

    for (const { name, scraper, schedule, enabled } of this.scrapers) {
      if (!enabled) {
        logger.info(`⏭️ ${name} scraper disabled`);
        continue;
      }

      const task = cron.schedule(schedule, async () => {
        await this.runScraper(name, scraper);
      }, {
        scheduled: true,
        timezone: 'Europe/London'
      });

      this.tasks.push({ name, task });
      logger.info(`✅ ${name} scheduled: ${schedule}`);
    }

    atsProcessor.start();

    setTimeout(() => this.runInitialScrape(), 3000);
  }

  async runInitialScrape() {
    logger.info('🔄 Running initial scrape');

    for (const { name, scraper, enabled } of this.scrapers) {
      if (!enabled) continue;
      
      await this.runScraper(name, scraper);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    setTimeout(() => atsProcessor.processUnanalyzedJobs(), 10000);
  }

  async runScraper(name, scraper) {
    const startTime = Date.now();
    logger.info(`▶️ Starting ${name} scraper`);

    try {
      const result = await scraper.scrapeJobs();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(`✅ ${name} completed`, {
        success: result.success,
        jobsScraped: result.jobsScraped || 0,
        duration: `${duration}s`
      });

      return result;

    } catch (error) {
      logger.error(`❌ ${name} failed:`, error.message);
      return { success: false, error: error.message, platform: name };
    }
  }

  stopScheduler() {
    if (!this.isRunning) return;

    logger.info('🛑 Stopping scheduler');

    for (const { name, task } of this.tasks) {
      task.stop();
      logger.info(`Stopped ${name}`);
    }

    atsProcessor.stop();

    this.tasks = [];
    this.isRunning = false;
  }

  async cleanup() {
    this.stopScheduler();

    for (const { name, scraper } of this.scrapers) {
      if (scraper.cleanup) {
        await scraper.cleanup();
        logger.info(`Cleaned up ${name}`);
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      scrapers: this.scrapers.map(s => ({
        name: s.name,
        schedule: s.schedule,
        enabled: s.enabled
      })),
      tasksCount: this.tasks.length
    };
  }
}

module.exports = new ContinuousScheduler();