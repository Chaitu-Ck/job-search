const mongoose = require('mongoose');
require('dotenv').config();

const continuousScheduler = require('../backend/scheduler/continuousScheduler');
const logger = require('../backend/utils/logger');

async function runManualScrape() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('✅ Connected to MongoDB');
    
    // Run scraping cycle
    logger.info('🚀 Starting manual scraping cycle...');
    await continuousScheduler.runScrapingCycle();
    
    logger.info('✅ Scraping completed successfully');
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

runManualScrape();