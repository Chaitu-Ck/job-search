const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const SmartRateLimiter = require('../utils/rateLimiter');

class ReedScraper {
  constructor() {
    this.baseURL = 'https://www.reed.co.uk';
    this.rateLimiter = new SmartRateLimiter(10); // 10 requests/min
  }

  async scrapeJobs(keywords, location = 'United Kingdom') {
    const jobs = [];
    const maxPages = 5;
    
    for (let page = 1; page <= maxPages; page++) {
      await this.rateLimiter.throttle();
      
      try {
        const searchURL = `${this.baseURL}/jobs/${encodeURIComponent(keywords)}-jobs-in-${encodeURIComponent(location)}?pageno=${page}`;
        
        logger.info(`🔍 Scraping Reed page ${page} for "${keywords}"`);
        
        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        $('.job-result').each((i, element) => {
          const title = $(element).find('.job-result-heading__title').text().trim();
          const company = $(element).find('.job-result-heading__company').text().trim();
          const location = $(element).find('.job-result-heading__location').text().trim();
          const url = this.baseURL + $(element).find('a').attr('href');
          const salary = $(element).find('.job-result-heading__salary').text().trim();
          const description = $(element).find('.job-result-description__details').text().trim();
          
          if (title && url) {
            jobs.push({
              title,
              company,
              location,
              url,
              salary,
              description,
              platform: 'Reed',
              scrapedAt: new Date()
            });
          }
        });
        
        // Break if no more results
        if ($('.job-result').length === 0) break;
        
      } catch (error) {
        logger.error(`Error scraping Reed page ${page}:`, error);
        break;
      }
    }
    
    logger.info(`✅ Scraped ${jobs.length} jobs from Reed for "${keywords}"`);
    return jobs;
  }
}

module.exports = new ReedScraper();