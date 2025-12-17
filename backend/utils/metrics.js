// Simple metrics tracking
let metrics = {
  jobsProcessed: 0,
  jobsFailed: 0,
  totalTime: 0,
  averageTime: 0
};

module.exports = {
  recordJobProcessed: (processingTime) => {
    metrics.jobsProcessed++;
    metrics.totalTime += processingTime;
    metrics.averageTime = metrics.totalTime / metrics.jobsProcessed;
  },
  
  recordJobFailed: () => {
    metrics.jobsFailed++;
  },
  
  getMetrics: () => {
    return { ...metrics };
  },
  
  reset: () => {
    metrics = {
      jobsProcessed: 0,
      jobsFailed: 0,
      totalTime: 0,
      averageTime: 0
    };
  }
};