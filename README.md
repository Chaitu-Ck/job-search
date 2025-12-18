# Job Automation System

🚀 A complete 24/7 job automation system that scrapes jobs from multiple platforms, optimizes resumes, generates custom emails, and provides a dashboard for reviewing and applying to jobs.

## Features

✨ **Multi-Platform Scraping**
- LinkedIn, Indeed, Reed, TotalJobs, StudentCircus
- Configurable scraping schedules
- Duplicate detection
- Freshness tracking

🤖 **AI-Powered Automation**
- Resume optimization using Google Gemini
- Custom email generation
- ATS score calculation
- Skills matching

📊 **Dashboard Interface**
- Real-time job tracking
- Status management
- Search and filtering
- Application tracking

🔒 **Production-Ready**
- Security hardening (Helmet, CORS, rate limiting)
- MongoDB injection protection
- Input validation
- Comprehensive error handling
- Structured logging

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Scraping**: Puppeteer
- **AI**: Google Gemini API
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Gmail account (for email automation)
- Google Gemini API key

### Installation

```bash
# Clone repository
git clone https://github.com/Chaitu-Ck/job-search.git
cd job-search

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Setup database
npm run setup

# Start development server
npm run dev
```

Visit http://localhost:3000

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Database
MONGO_URI=mongodb://localhost:27017/job-automation

# Server
PORT=3000
NODE_ENV=development

# AI Service
GEMINI_API_KEY=your_gemini_api_key

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Security (optional)
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Scraper Schedules

Edit `backend/scheduler/continuousScheduler.js`:

```javascript
const scrapers = [
  { name: 'LinkedIn', scraper: linkedinScraper, schedule: '0 */6 * * *' },  // Every 6 hours
  { name: 'Indeed', scraper: indeedScraper, schedule: '0 */8 * * *' },      // Every 8 hours
  { name: 'Reed', scraper: reedScraper, schedule: '0 */4 * * *' },          // Every 4 hours
];
```

## API Documentation

### Get Jobs

```http
GET /api/jobs?status=scraped&platform=LinkedIn&limit=50
```

### Get Job by ID

```http
GET /api/jobs/:id
```

### Update Job Status

```http
PATCH /api/jobs/:id/status
Content-Type: application/json

{
  "status": "user_approved"
}
```

### Get Statistics

```http
GET /api/stats
```

### Health Check

```http
GET /health
```

## Architecture

```
job-search/
├── backend/
│   ├── config/          # Configuration files
│   ├── models/          # MongoDB schemas
│   ├── routes/          # Express routes
│   ├── scheduler/       # Cron job scheduler
│   ├── scrapers/        # Platform scrapers
│   ├── services/        # Business logic
│   ├── test/            # Unit & integration tests
│   └── utils/           # Utility functions
├── frontend/            # Dashboard UI
├── logs/                # Application logs
├── scripts/             # Setup & utility scripts
├── .env.example         # Environment template
├── server.js            # Application entry point
├── cluster.js           # Cluster mode for production
├── Dockerfile           # Docker configuration
└── docker-compose.yml   # Multi-container setup
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- backend/test/job.test.js

# Watch mode
npm run test:watch
```

## Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Manual Scraping

```bash
# Run scrapers manually
npm run scrape:now
```

### Database Management

```bash
# Create indexes
npm run setup

# MongoDB shell
mongosh mongodb://localhost:27017/job-automation
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Security

- All API endpoints are rate-limited
- MongoDB injection protection
- Input validation on all routes
- Secure headers with Helmet
- CORS configuration
- Environment-based secrets
- SQL injection prevention
- XSS protection

## Performance

- Cluster mode for multi-core utilization
- Connection pooling
- Database indexing
- Efficient scraping with rate limiting
- Memory leak prevention in Puppeteer
- Optimized MongoDB queries

## Monitoring

### Logs

```bash
tail -f logs/combined.log    # All logs
tail -f logs/error.log       # Error logs only
```

### Metrics

- Health endpoint: `/health`
- Metrics endpoint: `/api/metrics`

## Troubleshooting

### Common Issues

**Puppeteer fails to launch**
```bash
# Linux
sudo apt-get install -y chromium-browser

# macOS
brew install chromium
```

**MongoDB connection fails**
- Verify MongoDB is running
- Check MONGO_URI format
- Ensure network access

**Email sending fails**
- Use Gmail app-specific password
- Check SMTP settings
- Verify firewall rules

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) file

## Author

**Chaitu CK**
- GitHub: [@Chaitu-Ck](https://github.com/Chaitu-Ck)

## Acknowledgments

- Puppeteer for web scraping
- Google Gemini for AI capabilities
- MongoDB for data storage
- Express.js for backend framework