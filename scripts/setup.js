const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Job Automation System - Setup Wizard\n');

const questions = [
  { key: 'MONGO_URI', prompt: 'MongoDB URI (default: mongodb://localhost:27017/job-automation): ', default: 'mongodb://localhost:27017/job-automation' },
  { key: 'GOOGLE_API_KEY', prompt: 'Google Gemini API Key: ', required: true },
  { key: 'EMAIL_USER', prompt: 'Your Gmail address: ', required: true },
  { key: 'EMAIL_APP_PASSWORD', prompt: 'Gmail App Password: ', required: true },
  { key: 'YOUR_NAME', prompt: 'Your Full Name: ', required: true },
  { key: 'YOUR_PHONE', prompt: 'Your Phone Number (optional): ', default: '' },
  { key: 'YOUR_LINKEDIN', prompt: 'Your LinkedIn URL (optional): ', default: '' }
];

const config = {};

async function ask(question) {
  return new Promise(resolve => {
    rl.question(question.prompt, answer => {
      config[question.key] = answer || question.default || '';
      resolve();
    });
  });
}

async function setup() {
  for (const question of questions) {
    await ask(question);
    if (question.required && !config[question.key]) {
      console.log('❌ This field is required!');
      await ask(question);
    }
  }
  
  // Generate random secrets
  config.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
  config.SESSION_SECRET = require('crypto').randomBytes(32).toString('hex');
  
  // Set defaults
  config.PORT = '3000';
  config.REDIS_HOST = 'localhost';
  config.REDIS_PORT = '6379';
  config.QUEUE_CONCURRENCY = '5';
  config.BROWSER_POOL_SIZE = '3';
  config.LINKEDIN_REQUESTS_PER_MINUTE = '8';
  
  // Write .env file
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);
  
  console.log('\n✅ Configuration saved to .env file');
  console.log('\n📋 Next steps:');
  console.log('1. Make sure MongoDB is running: mongod');
  console.log('2. Make sure Redis is running: redis-server');
  console.log('3. Install dependencies: npm install');
  console.log('4. Start the server: npm start');
  console.log('5. Open dashboard: http://localhost:3000/dashboard.html');
  
  rl.close();
}

setup().catch(console.error);