const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const SmartRateLimiter = require('../utils/rateLimiter');

class TotalJobsScraper {
  constructor() {
    this.baseURL = 'https://www.totaljobs.com';
    this.rateLimiter = new SmartRateLimiter(8);
  }

  async scrapeJobs(keywords, location = 'UK') {
    const jobs = [];
    const maxPages = 5;
    
    for (let page = 1; page <= maxPages; page++) {
      await this.rateLimiter.throttle();
      
      try {
        const searchURL = `${this.baseURL}/jobs/${encodeURIComponent(keywords)}/in-${encodeURIComponent(location)}?page=${page}`;
        
        logger.info(`🔍 Scraping TotalJobs page ${page} for "${keywords}"`);
        
        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        $('.job, .job-result, article').each((i, element) => {
          const title = $(element).find('.job-title, h2').first().text().trim();
          const company = $(element).find('.company').first().text().trim();
          const location = $(element).find('.location').first().text().trim();
          const url = $(element).find('a').first().attr('href');
          const salary = $(element).find('.salary').first().text().trim();
          
          if (title && url) {
            jobs.push({
              title,
              company,
              location,
              url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
              salary,
              platform: 'TotalJobs',
              scrapedAt: new Date()
            });
          }
        });
        
        if ($('.job, .job-result, article').length === 0) break;
        
      } catch (error) {
        logger.error(`Error scraping TotalJobs page ${page}:`, error);
        break;
      }
    }
    
    logger.info(`✅ Scraped ${jobs.length} jobs from TotalJobs for "${keywords}"`);
    return jobs;
  }
}

module.exports = new TotalJobsScraper();