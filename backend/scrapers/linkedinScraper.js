const puppeteer = require('puppeteer');
const crypto = require('crypto');
const Job = require('../models/Job');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class LinkedInScraper {
  constructor() {
    this.baseURL = 'https://www.linkedin.com/jobs/search/';
    this.rateLimiter = new RateLimiter(3, 120000);
    this.browser = null;
  }

  async initBrowser() {
    if (this.browser) return this.browser;

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    return this.browser;
  }

  async scrapeJobs(keywords = 'cybersecurity', location = 'United Kingdom', limit = 20) {
    let page = null;
    const jobs = [];

    try {
      await this.rateLimiter.wait('linkedin');
      
      const browser = await this.initBrowser();
      page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const searchURL = `${this.baseURL}?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&f_TPR=r86400&position=1&pageNum=0`;
      
      logger.info(`🚀 LinkedIn scraping: ${searchURL}`);
      
      await page.goto(searchURL, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForTimeout(3000);

      const jobsData = await page.evaluate((lim) => {
        const cards = document.querySelectorAll('.base-card, .job-search-card');
        const results = [];

        for (let i = 0; i < Math.min(cards.length, lim); i++) {
          const card = cards[i];
          try {
            const titleEl = card.querySelector('.base-search-card__title, h3');
            const companyEl = card.querySelector('.base-search-card__subtitle, h4');
            const locationEl = card.querySelector('.job-search-card__location, .job-card-container__metadata-item');
            const linkEl = card.querySelector('a.base-card__full-link');
            const timeEl = card.querySelector('time');

            if (!titleEl || !companyEl || !linkEl) continue;

            results.push({
              title: titleEl.textContent.trim(),
              company: companyEl.textContent.trim(),
              location: locationEl?.textContent.trim() || 'United Kingdom',
              url: linkEl.href,
              postedDate: timeEl?.getAttribute('datetime') || new Date().toISOString()
            });
          } catch (err) {
            console.error('Error parsing job card:', err);
          }
        }

        return results;
      }, limit);

      if (jobsData.length === 0) {
        logger.warn('No LinkedIn jobs found');
        return { success: true, jobsScraped: 0, platform: 'LinkedIn' };
      }

      for (const jobData of jobsData) {
        jobs.push({
          jobId: `linkedin_${crypto.randomBytes(8).toString('hex')}`,
          title: jobData.title,
          company: jobData.company,
          location: jobData.location,
          description: `${jobData.title} position at ${jobData.company}. This role offers exciting opportunities for professional growth.`,
          source: {
            platform: 'LinkedIn',
            url: jobData.url,
            scrapedAt: new Date()
          },
          postedDate: new Date(jobData.postedDate),
          status: 'scraped',
          jobHash: crypto.createHash('md5').update(`${jobData.company}-${jobData.title}`).digest('hex')
        });
      }

      await this.saveJobs(jobs);
      logger.info(`✅ LinkedIn: ${jobs.length} jobs processed`);
      
      return { success: true, jobsScraped: jobs.length, platform: 'LinkedIn' };

    } catch (error) {
      logger.error('LinkedIn scraper error:', error.message);
      return { success: false, error: error.message, platform: 'LinkedIn' };
    } finally {
      if (page) await page.close();
    }
  }

  async saveJobs(jobs) {
    let savedCount = 0;
    for (const jobData of jobs) {
      try {
        const existing = await Job.findOne({ 'source.url': jobData.source.url });
        if (!existing) {
          await Job.create(jobData);
          savedCount++;
        }
      } catch (err) {
        if (err.code !== 11000) {
          logger.error(`Failed to save LinkedIn job: ${err.message}`);
        }
      }
    }
    logger.info(`💾 LinkedIn: Saved ${savedCount}/${jobs.length} new jobs`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new LinkedInScraper();