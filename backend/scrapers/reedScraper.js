const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const SmartRateLimiter = require('../utils/rateLimiter');

class ReedScraper {
    constructor() {
        this.baseURL = 'https://www.reed.co.uk';
        this.rateLimiter = new SmartRateLimiter(8);
        
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
        
        logger.info(`🚀 Starting Reed scraper for "${keywords}" in ${location}`);
        
        for (let page = 1; page <= maxPages; page++) {
            let retries = 0;
            let success = false;
            
            while (retries < maxRetries && !success) {
                try {
                    await this.rateLimiter.throttle();
                    await this.randomDelay(); // Add random delay
                    
                    // Updated URL structure for Reed
                    let searchURL = `${this.baseURL}/jobs/${encodeURIComponent(keywords)}-jobs-in-${encodeURIComponent(location)}`;
                    if (page > 1) {
                        searchURL += `?pageno=${page}`;
                    }
                    
                    logger.info(`🔍 Scraping Reed page ${page}/${maxPages} (attempt ${retries + 1}/${maxRetries})`);
                    
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
                        logger.warn('⚠️  Reed blocked request (403)');
                        this.metrics.blockedRequests++;
                        // Instead of throwing error, return empty array to continue processing
                        return jobs;
                    }
                    
                    if (response.status === 429) {
                        logger.warn('⚠️  Rate limited by Reed (429)');
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
                    
                    // Extract job data from JSON embedded in the page
                    const jobDataPattern = /"jobDetail":\{"jobId":[0-9]+,[^\}]*"jobTitle":"[^"]*"/g;
                    const jobMatches = response.data.match(jobDataPattern);
                    
                    if (jobMatches && jobMatches.length > 0) {
                        logger.info(`✅ Found ${jobMatches.length} jobs in JSON data`);
                        
                        for (const match of jobMatches) {
                            try {
                                // Extract job details from the JSON string
                                const jobIdMatch = match.match(/"jobId":([0-9]+)/);
                                const titleMatch = match.match(/"jobTitle":"([^"]+)"/);
                                
                                if (jobIdMatch && titleMatch) {
                                    const jobId = jobIdMatch[1];
                                    const title = titleMatch[1].replace(/\\u0026/g, '&').replace(/\\u0027/g, "'");
                                    
                                    // Create job URL
                                    const url = `${this.baseURL}/job/${jobId}`;
                                    
                                    jobs.push({
                                        jobId: `reed_${jobId}`,
                                        title,
                                        company: 'Not specified',
                                        location: 'UK',
                                        description: '',
                                        source: {
                                            platform: 'Reed',
                                            url,
                                            scrapedAt: new Date()
                                        },
                                        postedDate: new Date(),
                                        status: 'scraped'
                                    });
                                    
                                    this.metrics.jobsFound++;
                                }
                            } catch (parseError) {
                                logger.debug(`Error parsing job from JSON: ${parseError.message}`);
                            }
                        }
                    } else {
                        logger.warn(`⚠️  No jobs found in JSON data on page ${page}. Stopping.`);
                        break;
                    }
                    
                    this.metrics.successfulRequests++;
                    success = true;
                    
                    logger.info(`✅ Page ${page}: Found ${jobElements.length} jobs`);
                    
                } catch (error) {
                    retries++;
                    this.metrics.failedRequests++;
                    
                    if (error.message === 'BLOCKED' || error.message === 'CAPTCHA_DETECTED') {
                        logger.error(`❌ Reed blocked scraper. Consider using proxy rotation.`);
                        return jobs; // Stop scraping if blocked
                    }
                    
                    if (error.message === 'RATE_LIMITED' && retries < maxRetries) {
                        continue; // Retry with exponential backoff
                    }
                    
                    if (retries >= maxRetries) {
                        logger.error(`❌ Max retries reached for page ${page}. Moving on.`);
                        break;
                    }
                    
                    logger.error(`Error scraping Reed page ${page} (attempt ${retries}):`, error.message);
                }
            }
            
            if (!success) break; // Stop if page failed after retries
        }
        
        logger.info(`✅ Reed scraping complete: ${jobs.length} jobs found for "${keywords}"`);
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

module.exports = new ReedScraper();