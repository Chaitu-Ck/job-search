const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const SmartRateLimiter = require('../utils/rateLimiter');
const { COMPANY_CAREER_PAGES } = require('../config/companySources');

class CompanyPagesScraper {
  constructor() {
    this.rateLimiter = new SmartRateLimiter(5); // 5 requests per minute for company pages
  }

  /**
   * Scrape all high-priority company career pages
   */
  async scrapeAllCompanies(keywords) {
    const results = [];
    
    // Filter high priority companies
    const highPriorityCompanies = Object.entries(COMPANY_CAREER_PAGES)
      .filter(([_, config]) => config.priority === 'high')
      .map(([key, config]) => ({ key, ...config }));
    
    logger.info(`🏢 Starting company pages scraping for ${highPriorityCompanies.length} companies`);
    
    for (const company of highPriorityCompanies) {
      await this.rateLimiter.throttle();
      
      try {
        logger.info(`🔍 Scraping ${company.name}...`);
        
        let jobs = [];
        if (company.scraping_method === 'api') {
          jobs = await this.scrapeViaAPI(company, keywords);
        } else {
          jobs = await this.scrapeViaBrowser(company, keywords);
        }
        
        logger.info(`✅ ${company.name}: ${jobs.length} jobs found`);
        results.push(...jobs);
        
      } catch (error) {
        logger.error(`❌ Failed to scrape ${company.name}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Scrape via API (for companies with public APIs)
   */
  async scrapeViaAPI(company, keywords) {
    const jobs = [];
    
    try {
      // Generic API scraping logic
      // This would need to be customized per company
      
      if (company.name === 'Amazon') {
        return await this.scrapeAmazon(company, keywords);
      }
      
      if (company.name === 'Microsoft') {
        return await this.scrapeMicrosoft(company, keywords);
      }
      
      if (company.name === 'Barclays') {
        return await this.scrapeBarclays(company, keywords);
      }
      
      if (company.name === 'Deloitte UK') {
        return await this.scrapeDeloitte(company, keywords);
      }
      
      if (company.name === 'Accenture UK') {
        return await this.scrapeAccenture(company, keywords);
      }
      
      // Add more company-specific scrapers as needed
      
    } catch (error) {
      logger.error(`API scraping failed for ${company.name}:`, error);
    }
    
    return jobs;
  }

  /**
   * Scrape via browser automation
   */
  async scrapeViaBrowser(company, keywords) {
    const jobs = [];
    
    try {
      // For browser scraping, we would typically use Puppeteer
      // Since we don't have access to Puppeteer in this implementation,
      // we'll use a simplified approach with axios and cheerio
      
      const url = company.search_url || company.careers_url;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Try multiple common selectors
      const selectors = [
        '.job-listing',
        '.career-opportunity',
        '.job-card',
        '[data-job]',
        '.position',
        '.opening',
        '.job-result',
        '.vacancy',
        '.job-post'
      ];
      
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((i, el) => {
            const title = $(el).find('h2, h3, .title, [class*="title"]').first().text().trim();
            const location = $(el).find('[class*="location"]').first().text().trim();
            const url = $(el).find('a').first().attr('href');
            const description = $(el).find('.description, [class*="description"], .summary').first().text().trim();
            
            if (title && url) {
              jobs.push({
                title,
                company: company.name,
                location: location || 'United Kingdom',
                url: url.startsWith('http') ? url : `${company.careers_url}${url}`,
                description: description || '',
                platform: 'Company Career Page',
                scrapedAt: new Date()
              });
            }
          });
          break; // Stop after finding jobs with one selector
        }
      }
      
    } catch (error) {
      logger.error(`Browser scraping failed for ${company.name}:`, error);
    }
    
    return jobs;
  }

  /**
   * Amazon-specific scraper
   */
  async scrapeAmazon(company, keywords) {
    const jobs = [];
    
    try {
      for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords
        const response = await axios.get(company.search_endpoint, {
          params: {
            'search_terms[0]': keyword,
            'location[0]': 'United Kingdom',
            'category[0]': 'security',
            'category[1]': 'information-technology',
            'job_level[0]': 'Entry Level'
          }
        });
        
        if (response.data && response.data.jobs) {
          response.data.jobs.forEach(job => {
            jobs.push({
              title: job.title,
              company: 'Amazon',
              location: job.location,
              url: `https://www.amazon.jobs${job.job_path}`,
              description: job.description_short,
              platform: 'Company Career Page',
              salary: null,
              scrapedAt: new Date()
            });
          });
        }
      }
    } catch (error) {
      logger.error('Amazon API scraping failed:', error);
    }
    
    return jobs;
  }

  /**
   * Microsoft-specific scraper
   */
  async scrapeMicrosoft(company, keywords) {
    const jobs = [];
    
    try {
      // Microsoft uses a search API
      const searchParams = new URLSearchParams({
        'search': keywords.slice(0, 3).join(' '),
        'country': 'United Kingdom',
        'job-category': 'Cybersecurity'
      });
      
      const response = await axios.get(`https://careers.microsoft.com/us/en/search-results?${searchParams}`);
      
      const $ = cheerio.load(response.data);
      
      $('.job-result').each((i, element) => {
        jobs.push({
          title: $(element).find('.job-title').text().trim(),
          company: 'Microsoft',
          location: $(element).find('.job-location').text().trim(),
          url: 'https://careers.microsoft.com' + $(element).find('a').attr('href'),
          description: $(element).find('.job-description').text().trim(),
          platform: 'Company Career Page',
          scrapedAt: new Date()
        });
      });
      
    } catch (error) {
      logger.error('Microsoft scraping failed:', error);
    }
    
    return jobs;
  }

  /**
   * Barclays-specific scraper
   */
  async scrapeBarclays(company, keywords) {
    const jobs = [];
    
    try {
      const searchParams = new URLSearchParams({
        'category': 'Technology',
        'sub_category': 'Cyber Security',
        'location': 'United Kingdom'
      });
      
      const response = await axios.get(`https://search.jobs.barclays/search-jobs?${searchParams}`);
      
      const $ = cheerio.load(response.data);
      
      $('.job-result').each((i, element) => {
        jobs.push({
          title: $(element).find('.job-title').text().trim(),
          company: 'Barclays',
          location: $(element).find('.job-location').text().trim(),
          url: 'https://search.jobs.barclays' + $(element).find('a').attr('href'),
          description: $(element).find('.job-description').text().trim(),
          platform: 'Company Career Page',
          scrapedAt: new Date()
        });
      });
      
    } catch (error) {
      logger.error('Barclays scraping failed:', error);
    }
    
    return jobs;
  }

  /**
   * Deloitte-specific scraper
   */
  async scrapeDeloitte(company, keywords) {
    const jobs = [];
    
    try {
      const searchParams = new URLSearchParams({
        'business': 'Cyber',
        'location': 'United Kingdom'
      });
      
      const response = await axios.get(`https://jobsearch.deloitte.com/jobs?${searchParams}`);
      
      const $ = cheerio.load(response.data);
      
      $('.job-result').each((i, element) => {
        jobs.push({
          title: $(element).find('.job-title').text().trim(),
          company: 'Deloitte UK',
          location: $(element).find('.job-location').text().trim(),
          url: 'https://jobsearch.deloitte.com' + $(element).find('a').attr('href'),
          description: $(element).find('.job-description').text().trim(),
          platform: 'Company Career Page',
          scrapedAt: new Date()
        });
      });
      
    } catch (error) {
      logger.error('Deloitte scraping failed:', error);
    }
    
    return jobs;
  }

  /**
   * Accenture-specific scraper
   */
  async scrapeAccenture(company, keywords) {
    const jobs = [];
    
    try {
      const searchParams = new URLSearchParams({
        'specialization': 'Cybersecurity',
        'location': 'United Kingdom',
        'career_level': 'Entry Level'
      });
      
      const response = await axios.get(`https://www.accenture.com/gb-en/careers/jobsearch?${searchParams}`);
      
      const $ = cheerio.load(response.data);
      
      $('.job-result').each((i, element) => {
        jobs.push({
          title: $(element).find('.job-title').text().trim(),
          company: 'Accenture UK',
          location: $(element).find('.job-location').text().trim(),
          url: 'https://www.accenture.com' + $(element).find('a').attr('href'),
          description: $(element).find('.job-description').text().trim(),
          platform: 'Company Career Page',
          scrapedAt: new Date()
        });
      });
      
    } catch (error) {
      logger.error('Accenture scraping failed:', error);
    }
    
    return jobs;
  }

  /**
   * Generic fallback scraper for companies without specific implementation
   */
  async scrapeGenericCareerPage(company, keywords) {
    const jobs = [];
    
    try {
      const response = await axios.get(company.careers_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      
      // Try multiple common selectors
      const selectors = [
        '.job-listing',
        '.career-opportunity',
        '.job-card',
        '[data-job]',
        '.position',
        '.opening',
        '.job-result',
        '.vacancy',
        '.job-post'
      ];
      
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((i, el) => {
            const title = $(el).find('h2, h3, .title, [class*="title"]').first().text().trim();
            const location = $(el).find('[class*="location"]').first().text().trim();
            const url = $(el).find('a').first().attr('href');
            const description = $(el).find('.description, [class*="description"], .summary').first().text().trim();
            
            if (title && url) {
              jobs.push({
                title,
                company: company.name,
                location: location || 'United Kingdom',
                url: url.startsWith('http') ? url : `${company.careers_url}${url}`,
                description: description || '',
                platform: 'Company Career Page',
                scrapedAt: new Date()
              });
            }
          });
          break; // Stop after finding jobs with one selector
        }
      }
      
    } catch (error) {
      logger.error(`Generic scraping failed for ${company.name}:`, error);
    }
    
    return jobs;
  }
}

module.exports = new CompanyPagesScraper();