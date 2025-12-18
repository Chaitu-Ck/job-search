class SmartRateLimiter {
    constructor(requestsPerMinute = 10) {
        this.requestsPerMinute = requestsPerMinute;
        this.queue = [];
        this.minDelay = (60 * 1000) / requestsPerMinute;
        this.maxDelay = this.minDelay * 2;
    }
    
    async throttle() {
        const now = Date.now();
        
        // Remove old timestamps (older than 1 minute)
        this.queue = this.queue.filter(time => now - time < 60000);
        
        // If we've hit the limit, wait
        if (this.queue.length >= this.requestsPerMinute) {
            const oldestRequest = this.queue[0];
            const waitTime = 60000 - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
        }
        
        // Add random delay to appear more human
        const randomDelay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        
        this.queue.push(Date.now());
    }
    
    getStatus() {
        return {
            requestsInLastMinute: this.queue.length,
            limit: this.requestsPerMinute,
            remainingCapacity: this.requestsPerMinute - this.queue.length
        };
    }
}

module.exports = SmartRateLimiter;