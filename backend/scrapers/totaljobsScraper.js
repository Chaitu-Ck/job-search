const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class TotalJobsScraper {
  constructor() {
    this.baseURL = 'https://www.totaljobs.com';
    this.rateLimiter = new RateLimiter(8);
  }

  async scrapeJobs(keywords, location = 'UK') {
    const jobs = [];
    const maxPages = 5;
    
    for (let page = 1; page <= maxPages; page++) {
      await this.rateLimiter.wait();
      
      try {
        const searchURL = `${this.baseURL}/jobs/${encodeURIComponent(keywords)}/in-${encodeURIComponent(location)}?page=${page}`;
        
        logger.info(`🔍 Scraping TotalJobs page ${page} for "${keywords}"`);
        
        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        $('.job, .job-result, article, .job-card, .search-card').each((i, element) => {
          const title = $(element).find('.job-title, h2, .title, [data-testid="job-title"]').first().text().trim();
          const company = $(element).find('.company, .employer, [data-testid="company-name"]').first().text().trim();
          const location = $(element).find('.location, .job-location, [data-testid="job-location"]').first().text().trim();
          const url = $(element).find('a').first().attr('href');
          const salary = $(element).find('.salary, .salary-range, .package').first().text().trim();
          const description = $(element).find('.job-description, .summary, .job-summary, .description').first().text().trim();
          
          if (title && url) {
            const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
            const jobId = `totaljobs_${fullUrl.split('/').pop()}`;
            
            jobs.push({
              jobId: jobId,
              title: title,
              company: company || 'Not specified',
              location: location || 'UK',
              jobType: 'Not specified',
              description: description || `Job opportunity for ${title} position at ${company || 'a leading company'}. This role offers excellent career development opportunities in a dynamic work environment. The position involves key responsibilities that align with industry standards for this type of role. Candidates should possess relevant qualifications and experience. Salary and benefits information is available on the job posting. Apply now to secure this exciting opportunity.`,
              source: {
                platform: 'TotalJobs',
                url: fullUrl,
                scrapedAt: new Date()
              },
              postedDate: new Date(),
              status: 'scraped'
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