const logger = require('../utils/logger');
const reedScraper = require('../scrapers/reedScraper');
const cwjobsScraper = require('../scrapers/cwjobsScraper');
const totaljobsScraper = require('../scrapers/totaljobsScraper');

async function runComprehensiveTest() {
  logger.info('🧪 Running Comprehensive Scraper Test...\n');
  
  try {
    // Test Reed Scraper
    logger.info('Testing Reed Scraper...');
    const reedJobs = await reedScraper.scrapeJobs('Software Engineer', 'UK', 1);
    logger.info(`✅ Reed: Found ${reedJobs.length} jobs\n`);
    
    // Test CWJobs Scraper
    logger.info('Testing CWJobs Scraper...');
    const cwJobs = await cwjobsScraper.scrapeJobs('Software Engineer', 'UK', 1);
    logger.info(`✅ CWJobs: Found ${cwJobs.length} jobs\n`);
    
    // Test TotalJobs Scraper
    logger.info('Testing TotalJobs Scraper...');
    const totalJobs = await totaljobsScraper.scrapeJobs('Software Engineer', 'UK', 1);
    logger.info(`✅ TotalJobs: Found ${totalJobs.length} jobs\n`);
    
    logger.info('🎉 All scraper tests completed successfully!');
    logger.info(`📊 Summary: Reed(${reedJobs.length}) | CWJobs(${cwJobs.length}) | TotalJobs(${totalJobs.length})`);
    
  } catch (error) {
    logger.error('❌ Test failed:', error.message);
  }
}

runComprehensiveTest();