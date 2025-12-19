const mongoose = require('mongoose');
const Job = require('../backend/models/Job');
require('dotenv').config();

async function addTestJob() {
  await mongoose.connect(process.env.MONGO_URI);
  
  await Job.create({
    jobId: `test-${Date.now()}`,
    title: 'Cybersecurity Analyst',
    company: 'Test Company Ltd',
    location: 'London, UK',
    description: 'Looking for a skilled cybersecurity analyst to join our security team.',
    salary: { min: 40000, max: 60000, currency: 'GBP', period: 'per annum' },
    source: {
      platform: 'LinkedIn',
      url: `https://example.com/job/${Date.now()}`,
      scrapedAt: new Date()
    },
    status: 'scraped',
    jobHash: `hash-${Date.now()}`
  });
  
  console.log('Test job added');
  await mongoose.connection.close();
  process.exit(0);
}

addTestJob();