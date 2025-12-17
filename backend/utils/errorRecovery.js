class ErrorRecovery {
  static async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // If this was the last attempt, throw the error
        if (i === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        
        // Add some jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError;
  }
}

module.exports = ErrorRecovery;