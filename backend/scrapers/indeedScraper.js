const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const SmartRateLimiter = require('../utils/rateLimiter');

class IndeedScraper {
  constructor() {
    this.baseURL = 'https://uk.indeed.com';
    this.rateLimiter = new SmartRateLimiter(8);
  }

  async scrapeJobs(keywords, location = 'United Kingdom') {
    const jobs = [];
    const maxPages = 5;
    
    for (let page = 0; page < maxPages; page++) {
      await this.rateLimiter.throttle();
      
      try {
        const start = page * 10;
        const searchURL = `${this.baseURL}/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&start=${start}`;
        
        logger.info(`🔍 Scraping Indeed page ${page} for "${keywords}"`);
        
        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        $('.job_seen_beacon').each((i, element) => {
          const title = $(element).find('h2.jobTitle').text().trim();
          const company = $(element).find('.companyName').text().trim();
          const location = $(element).find('.companyLocation').text().trim();
          const jobKey = $(element).find('a').attr('data-jk');
          const url = jobKey ? `${this.baseURL}/viewjob?jk=${jobKey}` : null;
          const summary = $(element).find('.job-snippet').text().trim();
          
          if (title && url) {
            jobs.push({
              title,
              company,
              location,
              url,
              description: summary,
              platform: 'Indeed',
              scrapedAt: new Date()
            });
          }
        });
        
        if ($('.job_seen_beacon').length === 0) break;
        
      } catch (error) {
        logger.error(`Error scraping Indeed page ${page}:`, error);
        break;
      }
    }
    
    logger.info(`✅ Scraped ${jobs.length} jobs from Indeed for "${keywords}"`);
    return jobs;
  }
}

module.exports = new IndeedScraper();