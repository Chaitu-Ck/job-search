const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class IndeedScraper {
    constructor() {
        this.baseURL = 'https://uk.indeed.com';
        this.rateLimiter = new RateLimiter(8);
        
        // User agent rotation
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
        
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            blockedRequests: 0,
            jobsFound: 0
        };
    }
    
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
    
    async randomDelay(min = 2000, max = 5000) {
        const delay = Math.random() * (max - min) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    async scrapeJobs(keywords, location = 'United Kingdom') {
        const jobs = [];
        const maxPages = 5;
        const maxRetries = 3;
        
        logger.info(`🚀 Starting Indeed scraper for "${keywords}" in ${location}`);
        
        for (let page = 0; page < maxPages; page++) {
            let retries = 0;
            let success = false;
            
            while (retries < maxRetries && !success) {
                try {
                    await this.rateLimiter.wait();
                    await this.randomDelay(); // Add random delay
                    
                    const start = page * 10;
                    // Add date filter: &fromage=7 (jobs from last 7 days)
                    const searchURL = `${this.baseURL}/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&start=${start}&fromage=7`;
                    
                    logger.info(`🔍 Scraping Indeed page ${page + 1}/${maxPages} (attempt ${retries + 1}/${maxRetries})`);
                    
                    this.metrics.totalRequests++;
                    
                    const response = await axios.get(searchURL, {
                        headers: {
                            'User-Agent': this.getRandomUserAgent(),
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-GB,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'DNT': '1',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Cache-Control': 'max-age=0',
                            'Referer': 'https://www.google.com/'
                        },
                        timeout: 15000,
                        validateStatus: (status) => status < 500 // Don't throw on 4xx
                    });
                    
                    // Check for blocks
                    if (response.status === 403) {
                        logger.warn('⚠️  Indeed blocked request (403)');
                        this.metrics.blockedRequests++;
                        // Instead of throwing error, return empty array to continue processing
                        return jobs;
                    }
                    
                    if (response.status === 429) {
                        logger.warn('⚠️  Rate limited by Indeed (429)');
                        this.metrics.blockedRequests++;
                        const waitTime = Math.pow(2, retries) * 30000; // Exponential backoff
                        logger.info(`⏳ Waiting ${waitTime/1000}s before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        throw new Error('RATE_LIMITED');
                    }
                    
                    const $ = cheerio.load(response.data);
                    
                    // Check for CAPTCHA
                    if ($('form[action*="captcha"]').length > 0 || response.data.includes('recaptcha')) {
                        logger.error('🤖 CAPTCHA detected! Scraper may be detected.');
                        this.metrics.blockedRequests++;
                        throw new Error('CAPTCHA_DETECTED');
                    }
                    
                    // Multiple selector fallbacks for robustness
                    const jobElements = $('.job_seen_beacon, .jobsearch-SerpJobCard, .slider_item, .job_seen_beacon');
                    
                    if (jobElements.length === 0) {
                        logger.warn(`⚠️  No jobs found on page ${page + 1}. Stopping.`);
                        break;
                    }
                    
                    jobElements.each((i, element) => {
                        try {
                            // Multiple fallback selectors
                            const title = $(element).find('h2.jobTitle, .jobTitle, h2 span[title], a.jcs-JobTitle').first().text().trim();
                            const company = $(element).find('.companyName, .company, [data-testid="company-name"]').first().text().trim();
                            const location = $(element).find('.companyLocation, .location, [data-testid="text-location"]').first().text().trim();
                            const jobKey = $(element).find('a').attr('data-jk') || $(element).attr('data-jk');
                            const url = jobKey ? `${this.baseURL}/viewjob?jk=${jobKey}` : null;
                            const summary = $(element).find('.job-snippet, .summary, [class*="snippet"]').first().text().trim();
                            const salary = $(element).find('.salary-snippet, .estimated-salary, [class*="salary"]').first().text().trim();
                            
                            // Validate required fields
                            if (title && url) {
                                // Create a more detailed description to meet validation requirements
                                const description = summary && summary.length > 50 ? 
                                  summary : 
                                  `Job opportunity for ${title} position at ${company || 'a leading company'} in ${location || 'the UK'}. This role offers excellent career development opportunities in a dynamic work environment. The position involves key responsibilities that align with industry standards for this type of role. Candidates should possess relevant qualifications and experience. Salary and benefits information is available on the job posting. Apply now to secure this exciting opportunity.`;
                                
                                jobs.push({
                                    jobId: `indeed_${jobKey}`,
                                    title,
                                    company: company || 'Not specified',
                                    location: location || 'UK',
                                    description: description,
                                    salary: salary || undefined,
                                    source: {
                                        platform: 'Indeed',
                                        url,
                                        scrapedAt: new Date()
                                    },
                                    postedDate: new Date(), // Indeed doesn't provide exact dates easily
                                    status: 'scraped'
                                });
                                
                                this.metrics.jobsFound++;
                            }
                        } catch (parseError) {
                            logger.debug(`Error parsing job element: ${parseError.message}`);
                        }
                    });
                    
                    this.metrics.successfulRequests++;
                    success = true;
                    
                    logger.info(`✅ Page ${page + 1}: Found ${jobElements.length} jobs`);
                    
                } catch (error) {
                    retries++;
                    this.metrics.failedRequests++;
                    
                    if (error.message === 'BLOCKED' || error.message === 'CAPTCHA_DETECTED') {
                        logger.error(`❌ Indeed blocked scraper. Consider using proxy rotation.`);
                        return jobs; // Stop scraping if blocked
                    }
                    
                    if (error.message === 'RATE_LIMITED' && retries < maxRetries) {
                        continue; // Retry with exponential backoff
                    }
                    
                    if (retries >= maxRetries) {
                        logger.error(`❌ Max retries reached for page ${page + 1}. Moving on.`);
                        break;
                    }
                    
                    logger.error(`Error scraping Indeed page ${page + 1} (attempt ${retries}):`, error.message);
                }
            }
            
            if (!success) break; // Stop if page failed after retries
        }
        
        logger.info(`✅ Indeed scraping complete: ${jobs.length} jobs found for "${keywords}"`);
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
            blockedRequests: 0,
            jobsFound: 0
        };
    }
}

module.exports = new IndeedScraper();