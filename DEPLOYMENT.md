# Job Automation Platform - Complete Deployment Guide

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- Git
- Google Gemini API Key

### Quick Start

1. **Clone Repository**
```
git clone https://github.com/Chaitu-Ck/job-search.git
cd job-search
```

2. **Environment Setup**
```
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb://localhost:27017/job-automation
PORT=3000
NODE_ENV=production

# AI Service
GEMINI_API_KEY=your_gemini_api_key_here

# Optional LinkedIn Integration
LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password
```

3. **Install Dependencies**
```
npm install
```

4. **Start MongoDB**
```
# Local installation
mongod --dbpath /data/db

# OR Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Run Verification**
```
chmod +x deployment-verification.sh
./deployment-verification.sh
```

6. **Start Application**
```
# Development
npm run dev

# Production
npm start

# PM2 (recommended)
npm install -g pm2
pm2 start cluster.js --name job-automation
pm2 save
pm2 startup
```

7. **Access Dashboard**
```
http://localhost:3000/dashboard.html
```

### Features Implemented

#### ✅ Core Features
- Multi-platform job scraping (LinkedIn, Reed, Indeed)
- Real-time dashboard with filtering
- Job status management
- ATS compatibility scoring
- Database management (reset functionality)

#### ✅ AI Integration
- CV generation with ATS optimization
- Cover email generation
- AI-powered content optimization
- Keyword extraction and matching

#### ✅ Frontend Features
- Interactive job cards with status badges
- View/Edit CV and email modals
- Regenerate AI content on-demand
- Platform and status filtering
- Real-time search

#### ✅ Backend Features
- RESTful API with Express
- MongoDB data persistence
- Rate limiting for scrapers
- Error handling and logging
- Modular service architecture

### API Endpoints

```
GET    /api/jobs              - List all jobs
GET    /api/jobs/:id          - Get specific job
POST   /api/jobs              - Create job
PATCH  /api/jobs/:id/status   - Update job status
DELETE /api/jobs/reset        - Reset database

POST   /api/jobs/:id/regenerate-cv     - Regenerate CV
POST   /api/jobs/:id/regenerate-email  - Regenerate email
PATCH  /api/jobs/:id/cv                - Update CV
PATCH  /api/jobs/:id/email             - Update email
POST   /api/jobs/:id/optimize-cv       - AI optimize CV
POST   /api/jobs/:id/optimize-email    - AI optimize email

GET    /api/stats             - Get statistics
```

### Running Scrapers

```
# Run all scrapers once
npm run scrape:now

# Schedule automatic scraping
npm run scrape:schedule

# Individual platforms
node backend/scrapers/reedScraper.js
node backend/scrapers/linkedinScraper.js
node backend/scrapers/indeedScraper.js
```

### Database Management

**View Jobs**
```
mongosh job-automation
db.jobs.find().pretty()
```

**Reset Database (via API)**
```
curl -X DELETE http://localhost:3000/api/jobs/reset
```

**Export Data**
```
mongoexport --db=job-automation --collection=jobs --out=jobs.json
```

**Import Data**
```
mongoimport --db=job-automation --collection=jobs --file=jobs.json
```

### Docker Deployment

```
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Production Considerations

1. **Security**
   - Use environment variables for secrets
   - Enable HTTPS/SSL certificates
   - Implement authentication for dashboard
   - Rate limit API endpoints

2. **Performance**
   - Use PM2 cluster mode
   - Enable MongoDB indexes
   - Implement Redis caching
   - Use CDN for static assets

3. **Monitoring**
   - Set up error logging (Sentry)
   - Monitor server metrics
   - Track scraper success rates
   - Set up alerts for failures

4. **Backup**
   - Automate MongoDB backups
   - Store backups offsite
   - Test restore procedures

### Troubleshooting

**Port already in use**
```
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

**MongoDB connection failed**
```
# Check MongoDB status
brew services list | grep mongodb
# Restart MongoDB
brew services restart mongodb-community
```

**Scraper timeouts**
- Check rate limiter settings
- Verify user agent rotation
- Ensure stable internet connection

**AI generation fails**
- Verify GEMINI_API_KEY is valid
- Check API quota limits
- Review error logs for details

### Development Workflow

1. **Make Changes**
```
git checkout -b feature/your-feature
# Make changes
npm test
git commit -m "Add feature"
```

2. **Test Locally**
```
npm run dev
# Test in browser
```

3. **Deploy**
```
git push origin feature/your-feature
# Create PR, merge to main
pm2 restart job-automation
```

### File Structure

```
job-search/
├── backend/
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API routes
│   ├── scrapers/       # Platform scrapers
│   ├── services/       # Business logic
│   │   ├── atsService.js
│   │   ├── resumeService.js
│   │   ├── emailService.js
│   │   └── aiService.js
│   └── utils/          # Helpers
├── frontend/
│   ├── js/
│   │   └── dashboard.js
│   └── dashboard.html
├── data/               # User data
│   ├── resume.txt
│   └── profile.json
├── .env.example
├── server.js
├── cluster.js
├── docker-compose.yml
└── package.json
```

### Support

Issues: https://github.com/Chaitu-Ck/job-search/issues
Docs: https://github.com/Chaitu-Ck/job-search/wiki

---

**Platform Status: Production Ready ✅**

All core features implemented:
- ✅ Multi-platform scraping
- ✅ AI CV/Email generation
- ✅ ATS scoring
- ✅ Interactive dashboard
- ✅ Database management
- ✅ API endpoints
- ✅ Deployment scripts
