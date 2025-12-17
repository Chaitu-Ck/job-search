# 🚀 Job Automation System - Deployment Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- Redis installed and running
- Gmail account with App Password enabled

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Chaitu-Ck/job-1.git
cd job-1
npm install
```

### 2. Run Setup Wizard

```bash
node scripts/setup.js
```

This will guide you through configuration and create your `.env` file.

### 3. Create Database Indexes

```bash
node scripts/createIndexes.js
```

### 4. Start MongoDB and Redis

Terminal 1 - MongoDB
```bash
mongod
```

Terminal 2 - Redis
```bash
redis-server
```

### 5. Start the Application

Development mode
```bash
npm run dev
```

Production mode with clustering
```bash
npm run start:cluster
```

### 6. Access the Dashboard

Open your browser to:
- **Dashboard**: http://localhost:3000/dashboard.html
- **Queue Monitor**: http://localhost:3000/admin/queues
- **Metrics**: http://localhost:3000/api/metrics
- **Health Check**: http://localhost:3000/health

## Gmail App Password Setup

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `.env` as `EMAIL_APP_PASSWORD`

## Manual Testing

### Test Scraping Manually

```bash
npm run scrape:now
```

### Test Single Platform

In Node REPL:
```javascript
node
> const scraper = require('./backend/scrapers/linkedinScraper')
> scraper.scrapeJobs('SOC Analyst', 'United Kingdom').then(console.log)
```

## Production Deployment

### Using PM2

Install PM2
```bash
npm install -g pm2
```

Start with clustering
```bash
pm2 start cluster.js --name job-automation -i max
```

Save PM2 configuration
```bash
pm2 save
```

Setup auto-restart on boot
```bash
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "cluster.js"]
```

```bash
docker build -t job-automation .
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name job-automation \
  job-automation
```

## Monitoring

### View Logs

Production logs
```bash
pm2 logs job-automation
```

Development logs
```bash
tail -f logs/combined.log
```

### Check System Health

```bash
curl http://localhost:3000/health
```

### View Metrics

```bash
curl http://localhost:3000/api/metrics
```

## Troubleshooting

### Server won't start

- Check MongoDB is running: `mongod --version`
- Check Redis is running: `redis-cli ping`
- Verify `.env` file exists and has correct values

### No jobs being scraped

- Check scheduler is running in logs
- Verify LinkedIn cookies are valid (if using LinkedIn scraper)
- Test manual scraping: `npm run scrape:now`

### Email sending fails

- Verify Gmail App Password is correct
- Ensure 2FA is enabled on Gmail account
- Check EMAIL_USER and EMAIL_APP_PASSWORD in .env

### Browser automation fails

- Check Chromium installation
- Verify sufficient memory (min 2GB)
- Check browser pool settings in `.env`

## Maintenance

### Clear Old Jobs

In MongoDB:
```javascript
use job-automation
db.jobs.deleteMany({ scrapedAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) } })
```

### Reset Queue

Access Redis CLI:
```bash
redis-cli
DEL bull:jobQueue:*
```

### Update Dependencies

```bash
npm update
npm audit fix
```

## Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer:
```
upstream job_automation {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}
server {
    listen 80;
    location / {
        proxy_pass http://job_automation;
    }
}
```

### Database Optimization

- Add indexes for frequently queried fields
- Use MongoDB sharding for large datasets
- Enable Redis persistence for queue data

## Support

For issues, check:
- Application logs in `logs/` directory
- GitHub Issues: https://github.com/Chaitu-Ck/job-1/issues
- Queue dashboard: http://localhost:3000/admin/queues

## Final Verification Checklist

Before going live, verify:
- MongoDB is running and accessible
- Redis is running and accessible
- All scrapers work (test each manually)
- Email sending works (test with your email)
- AI CV optimization works (test with sample job)
- AI email generation works (test with sample job)
- Dashboard loads and displays jobs
- Dashboard filters work correctly
- "Prepare" action generates CV and email
- "Apply" action sends email successfully
- Scheduler runs every 6 hours (check logs)
- Queue dashboard accessible at /admin/queues
- Metrics endpoint returns data
- Health check passes
- Performance acceptable (check /api/metrics)

## You're Done!

You now have a complete 24/7 job automation system that:
✅ Scrapes jobs from LinkedIn, Reed, Indeed every 6 hours
✅ Optimizes your CV using AI for each job
✅ Generates custom emails that combine your skills with job requirements
✅ Sends applications automatically via email or Easy Apply
✅ Provides a dashboard for review and manual control
✅ Monitors performance with metrics and health checks
✅ Scales efficiently with clustering and caching
✅ Runs continuously without manual intervention

Next Steps:
1. Run the setup: `node scripts/setup.js`
2. Start services: `npm start`
3. Open dashboard: http://localhost:3000/dashboard.html
4. Watch it work: Jobs will be scraped, optimized, and ready for your review!

Good luck with your job search! 🚀💼