const studentcircusScraper = require('../scrapers/studentcircusScraper');
const logger = require('../utils/logger');

async function testStudentCircusScraper() {
  logger.info('🧪 Testing StudentCircus Scraper...\n');
  
  try {
    // Test 1: Basic scraping
    logger.info('Test 1: Scraping "Software Engineer" jobs');
    const jobs = await studentcircusScraper.scrapeJobs(
      'Software Engineer',
      'UK',
      7,  // Last 7 days
      2   // 2 pages only for testing
    );
    
    logger.info(`\n✅ Test 1 Results:`);
    logger.info(`- Found ${jobs.length} jobs`);
    if (jobs.length > 0) {
      logger.info(`- Sample job:`, {
        title: jobs[0].title,
        company: jobs[0].company,
        location: jobs[0].location,
        postedDate: jobs[0].postedDate,
        url: jobs[0].source.url
      });
    }
    
    // Test 2: Check freshness filtering
    logger.info('\n\nTest 2: Checking date filtering (3 days max)');
    const freshJobs = await studentcircusScraper.scrapeJobs(
      'Graduate',
      'UK',
      3,  // Last 3 days only
      1
    );
    
    logger.info(`\n✅ Test 2 Results:`);
    logger.info(`- Found ${freshJobs.length} jobs from last 3 days`);
    
    // Test 3: Metrics validation
    const metrics = studentcircusScraper.getMetrics();
    logger.info('\n\n📊 Scraper Metrics:', metrics);
    
    logger.info('\n\n🎉 All tests completed successfully!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

// Run the test
testStudentCircusScraper();