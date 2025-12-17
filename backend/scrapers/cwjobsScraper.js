const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const SmartRateLimiter = require('../utils/rateLimiter');

class CWJobsScraper {
  constructor() {
    this.baseURL = 'https://www.cwjobs.co.uk';
    this.rateLimiter = new SmartRateLimiter(8);
  }

  async scrapeJobs(keywords, location = 'UK') {
    const jobs = [];
    const maxPages = 5;
    
    for (let page = 1; page <= maxPages; page++) {
      await this.rateLimiter.throttle();
      
      try {
        const searchURL = `${this.baseURL}/jobs/${encodeURIComponent(keywords)}?location=${encodeURIComponent(location)}&page=${page}`;
        
        logger.info(`🔍 Scraping CWJobs page ${page} for "${keywords}"`);
        
        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        $('.job-result, .job, article[data-job-id]').each((i, element) => {
          const title = $(element).find('.job-title, h2 a').first().text().trim();
          const company = $(element).find('.company, .recruiter-name').first().text().trim();
          const location = $(element).find('.location').first().text().trim();
          const url = $(element).find('a').first().attr('href');
          const salary = $(element).find('.salary').first().text().trim();
          const description = $(element).find('.job-description, .summary').first().text().trim();
          
          if (title && url) {
            jobs.push({
              title,
              company,
              location,
              url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
              salary,
              description,
              platform: 'CWJobs',
              scrapedAt: new Date()
            });
          }
        });
        
        if ($('.job-result, .job, article[data-job-id]').length === 0) break;
        
      } catch (error) {
        logger.error(`Error scraping CWJobs page ${page}:`, error);
        break;
      }
    }
    
    logger.info(`✅ Scraped ${jobs.length} jobs from CWJobs for "${keywords}"`);
    return jobs;
  }
}

module.exports = new CWJobsScraper();