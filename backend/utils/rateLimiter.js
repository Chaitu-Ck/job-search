const logger = require('./logger');

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
    this.cleanup();
  }

  cleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.requests.entries()) {
        if (now - data.resetAt > this.windowMs) {
          this.requests.delete(key);
        }
      }
    }, this.windowMs);
  }

  async checkLimit(identifier) {
    const now = Date.now();
    const data = this.requests.get(identifier);

    if (!data || now > data.resetAt) {
      this.requests.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (data.count >= this.maxRequests) {
      const waitTime = data.resetAt - now;
      logger.warn(`Rate limit exceeded for ${identifier}, wait ${waitTime}ms`);
      return { allowed: false, waitTime, remaining: 0 };
    }

    data.count += 1;
    return { allowed: true, remaining: this.maxRequests - data.count };
  }

  async wait(identifier) {
    const result = await this.checkLimit(identifier);
    if (!result.allowed) {
      await new Promise(resolve => setTimeout(resolve, result.waitTime));
      return this.wait(identifier);
    }
    return result;
  }

  reset(identifier) {
    this.requests.delete(identifier);
  }

  resetAll() {
    this.requests.clear();
  }
}

module.exports = RateLimiter;

module.exports = SmartRateLimiter;