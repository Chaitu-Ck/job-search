const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const Job = require('../models/Job');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class ReedScraper {
  constructor() {
    this.baseURL = 'https://www.reed.co.uk';
    this.rateLimiter = new RateLimiter(5, 60000);
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async scrapeJobs(keywords = 'cybersecurity', location = 'United Kingdom', limit = 50) {
    const jobs = [];
    const maxPages = Math.ceil(limit / 25);
    
    logger.info(`🚀 Starting Reed scraper: "${keywords}" in ${location}`);

    for (let page = 1; page <= maxPages; page++) {
      try {
        await this.rateLimiter.wait('reed');
        await this.delay(2000, 4000);

        const searchURL = page === 1
          ? `${this.baseURL}/jobs/${encodeURIComponent(keywords)}-jobs-in-${encodeURIComponent(location)}`
          : `${this.baseURL}/jobs/${encodeURIComponent(keywords)}-jobs-in-${encodeURIComponent(location)}?pageno=${page}`;

        logger.info(`🔍 Reed page ${page}/${maxPages}: ${searchURL}`);

        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Referer': 'https://www.google.com/',
            'Cache-Control': 'no-cache'
          },
          timeout: 20000
        });

        if (response.status === 403 || response.status === 429) {
          logger.warn(`⚠️ Reed blocked request (${response.status})`);
          break;
        }

        const $ = cheerio.load(response.data);
        const jobCards = $('.job-card, article[data-job-id]');

        if (jobCards.length === 0) {
          logger.warn(`No job cards found on page ${page}`);
          
          const altJobCards = $('article.job-result, div.job-result');
          if (altJobCards.length > 0) {
            logger.info(`Found ${altJobCards.length} jobs using alternate selector`);
            this.parseAlternateJobCards($, altJobCards, jobs);
          } else {
            break;
          }
        } else {
          this.parseJobCards($, jobCards, jobs);
        }

        if (jobs.length >= limit) {
          logger.info(`Reached limit of ${limit} jobs`);
          break;
        }

      } catch (error) {
        logger.error(`Error scraping Reed page ${page}:`, error.message);
        if (error.response?.status === 403) break;
      }
    }

    await this.saveJobs(jobs);
    logger.info(`✅ Reed scraping complete: ${jobs.length} jobs processed`);
    return { success: true, jobsScraped: jobs.length, platform: 'Reed' };
  }

  parseJobCards($, cards, jobs) {
    cards.each((_, element) => {
      try {
        const $card = $(element);
        
        const titleEl = $card.find('h2 a, h3 a, a.job-result-heading__title');
        const title = titleEl.text().trim();
        const relativeUrl = titleEl.attr('href');
        
        if (!title || !relativeUrl) return;

        const url = relativeUrl.startsWith('http') 
          ? relativeUrl 
          : `${this.baseURL}${relativeUrl}`;

        const company = $card.find('.gtmJobListingPostedBy, .job-result-employer, span[itemprop="hiringOrganization"]').text().trim() || 'Company not specified';
        
        const location = $card.find('.location, .job-result-location, span[itemprop="jobLocation"]').text().trim() || 'UK';
        
        const salaryEl = $card.find('.salary, .job-result-salary');
        let salary = null;
        if (salaryEl.length > 0) {
          const salaryText = salaryEl.text().trim();
          salary = this.parseSalary(salaryText);
        }

        const description = $card.find('.job-result-description, p.description').text().trim() || 
          `${title} position at ${company}. Exciting opportunity in ${location}. Apply now to join our dynamic team.`;

        const postedEl = $card.find('.posted-date, time');
        const postedText = postedEl.text().trim() || postedEl.attr('datetime');
        const postedDate = this.parsePostedDate(postedText);

        const jobId = url.match(/\/job\/(\d+)/)?.[1] || url.match(/jobId=(\d+)/)?.[1] || crypto.randomBytes(8).toString('hex');

        jobs.push({
          jobId: `reed_${jobId}`,
          title,
          company,
          location,
          salary,
          description: description.length > 50 ? description : `${description}. This is a great opportunity to advance your career.`,
          source: {
            platform: 'Reed',
            url,
            scrapedAt: new Date()
          },
          postedDate,
          status: 'scraped',
          jobHash: crypto.createHash('md5').update(`${company}-${title}-${location}`).digest('hex')
        });

        logger.debug(`Extracted: ${title} at ${company} - ${url}`);
      } catch (err) {
        logger.error('Error parsing job card:', err.message);
      }
    });
  }

  parseAlternateJobCards($, cards, jobs) {
    cards.each((_, element) => {
      try {
        const $card = $(element);
        const link = $card.find('a').first();
        const url = link.attr('href');
        
        if (!url || !url.includes('/job/')) return;

        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        const title = link.text().trim() || $card.find('h2, h3').text().trim();
        
        if (!title) return;

        jobs.push({
          jobId: `reed_${crypto.randomBytes(6).toString('hex')}`,
          title,
          company: 'Company not specified',
          location: 'UK',
          description: `${title} - Exciting career opportunity. Full details available on Reed.co.uk.`,
          source: {
            platform: 'Reed',
            url: fullUrl,
            scrapedAt: new Date()
          },
          postedDate: new Date(),
          status: 'scraped',
          jobHash: crypto.createHash('md5').update(`${title}-${fullUrl}`).digest('hex')
        });
      } catch (err) {
        logger.error('Error parsing alternate job card:', err.message);
      }
    });
  }

  parseSalary(salaryText) {
    if (!salaryText || salaryText.toLowerCase().includes('competitive')) return null;

    const cleanText = salaryText.replace(/[£,]/g, '').trim();
    const rangeMatch = cleanText.match(/(\d+)\s*-\s*(\d+)/);
    
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1]),
        max: parseInt(rangeMatch[2]),
        currency: 'GBP',
        period: salaryText.toLowerCase().includes('hour') ? 'per hour' : 'per annum'
      };
    }

    const singleMatch = cleanText.match(/(\d+)/);
    if (singleMatch) {
      const amount = parseInt(singleMatch[1]);
      return {
        min: amount,
        max: amount,
        currency: 'GBP',
        period: salaryText.toLowerCase().includes('hour') ? 'per hour' : 'per annum'
      };
    }

    return null;
  }

  parsePostedDate(text) {
    if (!text) return new Date();
    
    const now = new Date();
    const lowerText = text.toLowerCase();

    if (lowerText.includes('today') || lowerText.includes('just')) {
      return now;
    }
    
    if (lowerText.includes('yesterday')) {
      return new Date(now.setDate(now.getDate() - 1));
    }

    const daysMatch = text.match(/(\d+)\s*days?\s*ago/i);
    if (daysMatch) {
      return new Date(now.setDate(now.getDate() - parseInt(daysMatch[1])));
    }

    const weeksMatch = text.match(/(\d+)\s*weeks?\s*ago/i);
    if (weeksMatch) {
      return new Date(now.setDate(now.getDate() - (parseInt(weeksMatch[1]) * 7)));
    }

    return now;
  }

  async saveJobs(jobs) {
    let savedCount = 0;
    
    for (const jobData of jobs) {
      try {
        const existing = await Job.findOne({ 'source.url': jobData.source.url });
        if (existing) {
          logger.debug(`Job already exists: ${jobData.title}`);
          continue;
        }

        await Job.create(jobData);
        savedCount++;
      } catch (err) {
        if (err.code === 11000) {
          logger.debug(`Duplicate job: ${jobData.title}`);
        } else {
          logger.error(`Failed to save job: ${err.message}`);
        }
      }
    }

    logger.info(`💾 Saved ${savedCount}/${jobs.length} new jobs`);
  }

  async delay(min, max) {
    const ms = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ReedScraper();