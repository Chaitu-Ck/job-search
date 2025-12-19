# Job Automation Platform 🚀

Automated job search and application system with AI-powered CV optimization and multi-platform scraping.

## Features

### 🔍 Multi-Platform Job Scraping
- LinkedIn Jobs
- Reed.co.uk
- Indeed
- StudentCircus, CWJobs, TotalJobs
- Automatic deduplication

### 🤖 AI-Powered Content Generation
- CV generation optimized for ATS
- Cover email creation
- Content optimization with Google Gemini
- ATS compatibility scoring (60-99%)

### 📊 Interactive Dashboard
- Real-time job tracking
- Status management (Scraped → Ready → Applied)
- Platform and status filtering
- Search functionality
- View/Edit CV and emails
- Regenerate AI content on-demand

### 🛠️ Robust Backend
- RESTful API with Express.js
- MongoDB data persistence
- Rate limiting and retry logic
- Comprehensive error handling
- Modular service architecture

## Quick Start

```
# Clone repository
git clone https://github.com/Chaitu-Ck/job-search.git
cd job-search

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start MongoDB
mongod

# Run scrapers
npm run scrape:now

# Start server
npm start

# Access dashboard
open http://localhost:3000/dashboard.html
```

## Screenshots

### Dashboard
![Dashboard showing 92 scraped jobs with filtering options]

### Job Card with AI Content
- View generated CV and emails
- Regenerate with AI
- Edit and optimize
- ATS score display

### Modals
- CV preview with ATS score
- Email editor with subject/body
- AI optimization buttons

## Technology Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- Puppeteer (LinkedIn scraping)
- Axios + Cheerio (Reed/Indeed)
- Google Gemini AI

**Frontend:**
- Vanilla JavaScript
- Modern CSS with gradients
- Responsive design
- Modal system

## Configuration

### Environment Variables

```
# Server
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/job-automation

# AI Services
GEMINI_API_KEY=your_key_here

# LinkedIn (Optional)
LINKEDIN_EMAIL=your_email
LINKEDIN_PASSWORD=your_password
```

### User Profile (`data/profile.json`)

```
{
  "name": "Your Name",
  "email": "your.email@example.com",
  "phone": "+44 1234 567890",
  "location": "London, UK",
  "targetRole": "Software Engineer",
  "skills": ["JavaScript", "Node.js", "React"],
  "experience": [...]
}
```

## API Documentation

### Jobs

```
GET    /api/jobs?limit=100&status=scraped
GET    /api/jobs/:id
POST   /api/jobs
PATCH  /api/jobs/:id/status
DELETE /api/jobs/reset
```

### AI Operations

```
POST   /api/jobs/:id/regenerate-cv
POST   /api/jobs/:id/regenerate-email
PATCH  /api/jobs/:id/cv
PATCH  /api/jobs/:id/email
POST   /api/jobs/:id/optimize-cv
POST   /api/jobs/:id/optimize-email
```

### Statistics

```
GET    /api/stats
```

## Deployment

### Docker

```
docker-compose up -d
```

### PM2 (Production)

```
pm2 start cluster.js --name job-automation
pm2 save
pm2 startup
```

### Verification

```
chmod +x deployment-verification.sh
./deployment-verification.sh
```

## Architecture

```
┌─────────────┐
│   Browser   │
│  Dashboard  │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────┐
│   Express   │
│   Server    │
├─────────────┤
│  Routes     │
│  - Jobs     │
│  - Stats    │
│  - AI Ops   │
├─────────────┤
│  Services   │
│  - ATS      │
│  - Resume   │
│  - Email    │
│  - AI       │
├─────────────┤
│  Scrapers   │
│  - LinkedIn │
│  - Reed     │
│  - Indeed   │
└──────┬──────┘
       │
┌──────▼──────┐
│   MongoDB   │
│   Database  │
└─────────────┘
```

## Development

### Run Tests

```
npm test
```

### Watch Mode

```
npm run dev
```

### Linting

```
npm run lint
```

## Troubleshooting

### Scrapers timing out
- Increase rate limiter delays
- Check internet connection
- Verify user agent rotation

### AI generation failing
- Validate GEMINI_API_KEY
- Check API quota
- Review error logs

### MongoDB connection issues
- Ensure MongoDB is running
- Verify MONGODB_URI
- Check firewall settings

## Roadmap

- [ ] Email automation (SMTP integration)
- [ ] Chrome extension for one-click apply
- [ ] Advanced analytics dashboard
- [ ] Multi-user support
- [ ] Webhook notifications
- [ ] API rate limiting dashboard

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file

## Author

**Chaitu-Ck**  
GitHub: [@Chaitu-Ck](https://github.com/Chaitu-Ck)

---

⭐ Star this repo if you find it helpful!