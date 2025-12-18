const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class StudentCircusScraper {
  constructor() {
    this.baseURL = 'https://studentcircus.com';
    this.rateLimiter = new RateLimiter(5); // Conservative rate limit
    
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      jobsFound: 0,
      newJobsFound: 0
    };
  }
  
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
  
  async randomDelay(min = 2000, max = 4000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Parse relative time strings to Date objects
   * Examples: "Just now", "1d ago", "2 weeks ago"
   */
  parseRelativeTime(timeStr) {
    if (!timeStr) return null;
    
    const now = new Date();
    const lowerTime = timeStr.toLowerCase().trim();
    
    if (lowerTime.includes('just now') || lowerTime.includes('today')) {
      return now;
    }
    
    // Extract number and unit
    const match = lowerTime.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    const date = new Date(now);
    
    switch(unit) {
      case 'minute':
        date.setMinutes(date.getMinutes() - value);
        break;
      case 'hour':
        date.setHours(date.getHours() - value);
        break;
      case 'day':
        date.setDate(date.getDate() - value);
        break;
      case 'week':
        date.setDate(date.getDate() - (value * 7));
        break;
      case 'month':
        date.setMonth(date.getMonth() - value);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - value);
        break;
    }
    
    return date;
  }
  
  /**
   * Extract job ID from URL or slug
   */
  extractJobId(url, title, company) {
    // Try to extract from URL pattern: /jobs/title-slug-{id}
    const urlMatch = url.match(/-(\d+)(?:\?|$)/);
    if (urlMatch) {
      return `studentcircus_${urlMatch[1]}`;
    }
    
    // Fallback: generate from title + company
    const slug = `${title}_${company}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `studentcircus_${slug}`;
  }
  
  /**
   * Scrape jobs with freshness filtering
   * @param {string} keywords - Search keywords
   * @param {string} location - Location filter (default: UK)
   * @param {number} maxAge - Maximum age in days (default: 7)
   * @param {number} maxPages - Max pages to scrape (default: 5)
   */
  async scrapeJobs(keywords = '', location = 'UK', maxAge = 7, maxPages = 5) {
    const jobs = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    logger.info(`🎓 Starting StudentCircus scraper for "${keywords}" in ${location}`);
    logger.info(`📅 Only fetching jobs posted after: ${cutoffDate.toISOString()}`);
    
    try {
      for (let page = 1; page <= maxPages; page++) {
        await this.rateLimiter.wait();
        await this.randomDelay();
        
        // Build search URL
        let searchURL = `${this.baseURL}/jobs`;
        const params = new URLSearchParams();
        
        if (keywords) {
          params.append('q', keywords);
        }
        params.append('page', page);
        
        if (params.toString()) {
          searchURL += `?${params.toString()}`;
        }
        
        logger.info(`🔍 Scraping StudentCircus page ${page}/${maxPages}`);
        this.metrics.totalRequests++;
        
        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.google.com/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
          },
          timeout: 20000,
          validateStatus: (status) => status < 500
        });
        
        if (response.status !== 200) {
          logger.warn(`⚠️ StudentCircus returned status ${response.status}`);
          break;
        }
        
        const $ = cheerio.load(response.data);
        
        // Find job cards - multiple selector fallbacks
        const jobElements = $([
          '.job-card', 
          '[class*="job"]', 
          'article', 
          '.listing-item', 
          '[data-job-id]',
          '.job-listing',
          '.position'
        ].join(',')).filter(function() {
          // Filter for actual job listings (must have title and company)
          return $(this).find('h2, h3, .job-title, [class*="title"], .position-title').length > 0;
        });
        
        if (jobElements.length === 0) {
          logger.warn(`⚠️ No job listings found on page ${page}. Stopping.`);
          break;
        }
        
        let newJobsOnPage = 0;
        let oldJobsOnPage = 0;
        
        jobElements.each((i, element) => {
          try {
            const $el = $(element);
            
            // Extract fields with multiple selector fallbacks
            const title = $el.find('h2, h3, .job-title, a.job-title, [class*="title"], .position-title')
              .first().text().trim();
            
            const company = $el.find('.company, .company-name, [class*="company"], .employer')
              .first().text().trim();
            
            const location = $el.find('.location, [class*="location"], .job-location')
              .first().text().trim();
            
            const jobType = $el.find('.job-type, .badge, .tag, [class*="type"], .contract-type')
              .first().text().trim();
            
            const postedTimeStr = $el.find('[class*="time"], [class*="date"], [class*="ago"], .posted')
              .first().text().trim();
            
            const viewsStr = $el.find('[class*="views"], .view-count')
              .first().text().trim();
            
            // Extract job URL
            const linkElement = $el.find('a[href*="/jobs/"]').first();
            const relativeUrl = linkElement.attr('href');
            const url = relativeUrl ? 
              (relativeUrl.startsWith('http') ? relativeUrl : `${this.baseURL}${relativeUrl}`) 
              : null;
            
            // Validate required fields
            if (!title || !url) {
              return; // Skip if missing critical data
            }
            
            // Parse posted date for freshness filtering
            const postedDate = this.parseRelativeTime(postedTimeStr);
            
            // Skip if too old
            if (postedDate && postedDate < cutoffDate) {
              oldJobsOnPage++;
              return;
            }
            
            // Extract description/snippet if available
            const description = $el.find('.description, .snippet, [class*="snippet"], .job-summary, .summary')
              .first().text().trim() || 'No description available';
            
            // Generate unique job ID
            const jobId = this.extractJobId(url, title, company);
            
            // Parse views count
            const viewsMatch = viewsStr.match(/(\d+)/);
            const views = viewsMatch ? parseInt(viewsMatch[1]) : 0;
            
            // Determine job category
            let category = 'Jobs';
            if (jobType.toLowerCase().includes('internship')) {
              category = 'Internship';
            } else if (jobType.toLowerCase().includes('placement')) {
              category = 'Placement';
            }
            
            jobs.push({
              jobId,
              title,
              company: company || 'Not specified',
              location: location || 'UK',
              jobType: 'Not specified', // StudentCircus doesn't clearly specify remote/hybrid
              description,
              source: {
                platform: 'StudentCircus',
                url,
                scrapedAt: new Date()
              },
              postedDate: postedDate || new Date(),
              status: 'scraped',
              quality: {
                hasDescription: description.length > 20,
                isGraduateRole: true, // StudentCircus specializes in graduate roles
                matchScore: 70 // Default match score
              },
              metadata: {
                category,
                views,
                visaSponsorship: url.includes('visa') || title.toLowerCase().includes('visa'),
                postedTimeStr
              }
            });
            
            this.metrics.jobsFound++;
            newJobsOnPage++;
            
          } catch (parseError) {
            logger.debug(`Error parsing job element: ${parseError.message}`);
          }
        });
        
        this.metrics.successfulRequests++;
        logger.info(`✅ Page ${page}: Found ${newJobsOnPage} new jobs, ${oldJobsOnPage} old jobs`);
        
        // Stop if we're only finding old jobs
        if (newJobsOnPage === 0 && oldJobsOnPage > 0) {
          logger.info(`⏹️ No new jobs on this page. All jobs are older than ${maxAge} days. Stopping.`);
          break;
        }
        
      }
      
    } catch (error) {
      this.metrics.failedRequests++;
      logger.error(`❌ StudentCircus scraper error:`, error.message);
      throw error;
    }
    
    logger.info(`✅ StudentCircus scraping complete: ${jobs.length} fresh jobs found`);
    logger.info(`📊 Metrics:`, this.metrics);
    
    return jobs;
  }
  
  getMetrics() {
    return this.metrics;
  }
  
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      jobsFound: 0,
      newJobsFound: 0
    };
  }
}

module.exports = new StudentCircusScraper();