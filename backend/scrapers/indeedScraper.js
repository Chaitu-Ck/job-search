const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const Job = require('../models/Job');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class IndeedScraper {
  constructor() {
    this.baseURL = 'https://uk.indeed.com';
    this.rateLimiter = new RateLimiter(5, 60000);
  }

  async scrapeJobs(keywords = 'cybersecurity', location = 'United Kingdom', limit = 30) {
    const jobs = [];
    const pages = Math.ceil(limit / 15);

    logger.info(`🚀 Indeed scraping: "${keywords}" in ${location}`);

    for (let page = 0; page < pages; page++) {
      try {
        await this.rateLimiter.wait('indeed');
        await this.delay(2000, 4000);

        const searchURL = `${this.baseURL}/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&start=${page * 10}`;
        
        logger.info(`🔍 Indeed page ${page + 1}/${pages}`);

        const response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-GB,en;q=0.9'
          },
          timeout: 20000
        });

        const $ = cheerio.load(response.data);
        const jobCards = $('.job_seen_beacon, .resultContent, div[data-jk]');

        if (jobCards.length === 0) {
          logger.warn('No Indeed jobs found');
          break;
        }

        jobCards.each((_, element) => {
          try {
            const $card = $(element);
            
            const titleEl = $card.find('h2.jobTitle a, h2 a span');
            const title = titleEl.text().trim();
            
            const jobKey = $card.attr('data-jk') || 
                          $card.find('[data-jk]').attr('data-jk') ||
                          titleEl.attr('data-jk');
            
            if (!title || !jobKey) return;

            const url = `${this.baseURL}/viewjob?jk=${jobKey}`;
            
            const company = $card.find('.companyName, [data-testid="company-name"]').text().trim() || 'Company not specified';
            const location = $card.find('.companyLocation, [data-testid="text-location"]').text().trim() || 'UK';
            const description = $card.find('.job-snippet, .summary').text().trim() || 
              `${title} role at ${company}. Excellent career opportunity.`;

            const salary = $card.find('.salary-snippet, .metadata.salary-snippet-container').text().trim();
            const parsedSalary = salary ? this.parseSalary(salary) : null;

            jobs.push({
              jobId: `indeed_${jobKey}`,
              title,
              company,
              location,
              salary: parsedSalary,
              description: description.length > 50 ? description : `${description}. Great opportunity to advance your career in ${location}.`,
              source: {
                platform: 'Indeed',
                url,
                scrapedAt: new Date()
              },
              postedDate: new Date(),
              status: 'scraped',
              jobHash: crypto.createHash('md5').update(`${company}-${title}-${location}`).digest('hex')
            });

          } catch (err) {
            logger.error('Error parsing Indeed job:', err.message);
          }
        });

        if (jobs.length >= limit) break;

      } catch (error) {
        logger.error(`Indeed page ${page} error:`, error.message);
      }
    }

    await this.saveJobs(jobs);
    logger.info(`✅ Indeed: ${jobs.length} jobs processed`);
    return { success: true, jobsScraped: jobs.length, platform: 'Indeed' };
  }

  parseSalary(salaryText) {
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

    return null;
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
          logger.error(`Failed to save Indeed job: ${err.message}`);
        }
      }
    }
    logger.info(`💾 Indeed: Saved ${savedCount}/${jobs.length} new jobs`);
  }

  async delay(min, max) {
    const ms = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new IndeedScraper();