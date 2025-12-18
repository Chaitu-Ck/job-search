const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/rateLimiter');

class BaseScraper {
  constructor(platform, maxRequests = 10, windowMs = 60000) {
    this.platform = platform;
    this.rateLimiter = new RateLimiter(maxRequests, windowMs);
    this.browser = null;
    this.activeSessions = 0;
    this.maxSessions = 5;
  }

  async initBrowser() {
    if (this.browser) return this.browser;

    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--no-first-run',
          '--metrics-recording-only',
        ],
        timeout: 30000,
      });

      this.browser.on('disconnected', () => {
        logger.warn(`Browser disconnected for ${this.platform}`);
        this.browser = null;
      });

      logger.info(`Browser initialized for ${this.platform}`);
      return this.browser;
    } catch (err) {
      logger.error(`Failed to initialize browser for ${this.platform}:`, err);
      throw err;
    }
  }

  async createPage() {
    if (this.activeSessions >= this.maxSessions) {
      throw new Error(`Max concurrent sessions (${this.maxSessions}) reached`);
    }

    const browser = await this.initBrowser();
    const page = await browser.newPage();
    this.activeSessions++;

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    page.on('error', (err) => logger.error(`Page error on ${this.platform}:`, err));
    page.on('pageerror', (err) => logger.error(`Page script error on ${this.platform}:`, err));

    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(45000);

    return page;
  }

  async closePage(page) {
    if (!page) return;
    
    try {
      await page.close();
      this.activeSessions--;
    } catch (err) {
      logger.error(`Error closing page for ${this.platform}:`, err);
    }
  }

  async closeBrowser() {
    if (!this.browser) return;

    try {
      await this.browser.close();
      this.browser = null;
      this.activeSessions = 0;
      logger.info(`Browser closed for ${this.platform}`);
    } catch (err) {
      logger.error(`Error closing browser for ${this.platform}:`, err);
    }
  }

  async waitForSelector(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (err) {
      logger.warn(`Selector ${selector} not found on ${this.platform}`);
      return false;
    }
  }

  async safeEvaluate(page, fn, ...args) {
    try {
      return await page.evaluate(fn, ...args);
    } catch (err) {
      logger.error(`Evaluation error on ${this.platform}:`, err.message);
      return null;
    }
  }

  async retryOperation(operation, maxRetries = 3, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (err) {
        logger.warn(`Retry ${i + 1}/${maxRetries} for ${this.platform}: ${err.message}`);
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  handleError(err, context) {
    logger.error(`Error in ${this.platform} - ${context}:`, {
      message: err.message,
      stack: err.stack,
    });
    return {
      success: false,
      error: err.message,
      platform: this.platform,
      context,
    };
  }
}

module.exports = BaseScraper;