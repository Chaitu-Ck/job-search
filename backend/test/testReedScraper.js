const reedScraper = require('../scrapers/reedScraper');
const logger = require('../utils/logger');

async function testReedScraper() {
  logger.info('🧪 Testing Reed Scraper...\n');
  
  try {
    // Test 1: Basic scraping
    logger.info('Test 1: Scraping "Software Engineer" jobs');
    const jobs = await reedScraper.scrapeJobs(
      'Software Engineer',
      'UK',
      2   // 2 pages only for testing
    );
    
    logger.info(`\n✅ Test 1 Results:`);
    logger.info(`- Found ${jobs.length} jobs`);
    if (jobs.length > 0) {
      logger.info(`- Sample job:`, {
        title: jobs[0].title,
        company: jobs[0].company,
        location: jobs[0].location,
        url: jobs[0].source?.url || jobs[0].url
      });
    }
    
    // Test 2: Metrics validation
    const metrics = reedScraper.getMetrics();
    logger.info('\n\n📊 Scraper Metrics:', metrics);
    
    logger.info('\n\n🎉 Reed scraper test completed!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

// Run the test
testReedScraper();