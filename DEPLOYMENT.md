# Deployment Guide

## Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0
- Git

## Local Development Setup

### 1. Clone Repository
```
git clone https://github.com/Chaitu-Ck/job-search.git
cd job-search
```

### 2. Install Dependencies
```
npm install
```

### 3. Environment Configuration
```
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `MONGO_URI`: MongoDB connection string
- `GEMINI_API_KEY`: Google Gemini API key
- `EMAIL_USER`: Email address for sending applications
- `EMAIL_PASS`: App-specific password

### 4. Database Setup
```
npm run setup
```

### 5. Start Development Server
```
npm run dev
```

The application will be available at http://localhost:3000

## Production Deployment

### Option 1: Docker Deployment

```
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down
```

### Option 2: Manual Deployment

```
# Install production dependencies
npm ci --only=production

# Set environment
export NODE_ENV=production

# Start with cluster mode
npm run start:production
```

### Option 3: Cloud Platform (Railway/Render/Heroku)

1. **Railway**:
```
railway login
railway init
railway up
```

2. **Render**:
- Connect GitHub repository
- Set build command: `npm install`
- Set start command: `npm start`
- Add environment variables

3. **Heroku**:
```
heroku create job-automation-app
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=your_mongodb_url
git push heroku main
```

## Environment Variables

### Required
```
MONGO_URI=mongodb://localhost:27017/job-automation
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Optional
```
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SCRAPER_HEADLESS=true
```

## Database Indexes

Run this after first deployment:
```
npm run setup
```

Or manually in MongoDB:
```
db.jobs.createIndex({ "source.url": 1 }, { unique: true })
db.jobs.createIndex({ "status": 1, "quality.matchScore": -1 })
db.jobs.createIndex({ "source.scrapedAt": -1 })
```

## Monitoring

### Health Check
```
curl http://localhost:3000/health
```

### Logs
```
# Development
tail -f logs/combined.log

# Production (Docker)
docker-compose logs -f app

# Production (PM2)
pm2 logs job-automation
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong SESSION_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Backup database regularly

## Performance Optimization

### PM2 Process Manager
```
npm install -g pm2

pm2 start server.js -i max --name "job-automation"
pm2 startup
pm2 save
```

### Nginx Reverse Proxy
```
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Issue: Puppeteer fails to launch
```
# Install Chromium dependencies
sudo apt-get update
sudo apt-get install -y chromium-browser
```

### Issue: MongoDB connection fails
- Check MongoDB is running
- Verify MONGO_URI format
- Check firewall rules
- Verify credentials

### Issue: Email sending fails
- Use Gmail app-specific password
- Enable "Less secure app access"
- Check SMTP settings

## Backup & Recovery

### Database Backup
```
mongodump --uri="mongodb://localhost:27017/job-automation" --out=backup/
```

### Database Restore
```
mongorestore --uri="mongodb://localhost:27017/job-automation" backup/
```

## Maintenance

### Update Dependencies
```
npm outdated
npm update
npm audit fix
```

### Clean Old Jobs
```
// Run in MongoDB shell
db.jobs.deleteMany({ 
  status: "expired", 
  "source.scrapedAt": { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } 
})
```

### Monitor Resource Usage
```
# CPU and Memory
top

# Disk usage
df -h

# MongoDB stats
db.stats()
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