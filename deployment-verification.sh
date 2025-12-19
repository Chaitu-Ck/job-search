#!/bin/bash

echo "🚀 Job Automation Platform - Deployment Verification"
echo "=================================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version

# Check MongoDB
echo "✓ Checking MongoDB connection..."
mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  MongoDB: Connected"
else
  echo "  ⚠️ MongoDB: Not running - start with 'mongod' or Docker"
fi

# Check environment variables
echo "✓ Checking environment configuration..."
if [ -f ".env" ]; then
  echo "  .env file: Found"
  grep -q "GEMINI_API_KEY" .env && echo "  GEMINI_API_KEY: Set" || echo "  ⚠️ GEMINI_API_KEY: Missing"
  grep -q "MONGODB_URI" .env && echo "  MONGODB_URI: Set" || echo "  ⚠️ MONGODB_URI: Missing"
else
  echo "  ⚠️ .env file: Not found"
fi

# Install dependencies
echo ""
echo "✓ Installing dependencies..."
npm install

# Run tests
echo ""
echo "✓ Running tests..."
npm test

# Start server in background
echo ""
echo "✓ Starting server..."
npm start &
SERVER_PID=$!
sleep 5

# Test API endpoints
echo ""
echo "✓ Testing API endpoints..."

# Test health endpoint
curl -s http://localhost:3000/api/health > /dev/null
if [ $? -eq 0 ]; then
  echo "  /api/health: ✓ OK"
else
  echo "  /api/health: ✗ FAILED"
fi

# Test jobs endpoint
curl -s http://localhost:3000/api/jobs > /dev/null
if [ $? -eq 0 ]; then
  echo "  /api/jobs: ✓ OK"
else
  echo "  /api/jobs: ✗ FAILED"
fi

# Test stats endpoint
curl -s http://localhost:3000/api/stats > /dev/null
if [ $? -eq 0 ]; then
  echo "  /api/stats: ✓ OK"
else
  echo "  /api/stats: ✗ FAILED"
fi

# Test dashboard
curl -s http://localhost:3000/dashboard.html > /dev/null
if [ $? -eq 0 ]; then
  echo "  /dashboard.html: ✓ OK"
else
  echo "  /dashboard.html: ✗ FAILED"
fi

# Stop server
kill $SERVER_PID

echo ""
echo "=================================================="
echo "✅ Deployment verification complete!"
echo ""
echo "Next steps:"
echo "1. Start server: npm start"
echo "2. Run scrapers: npm run scrape:now"
echo "3. Access dashboard: http://localhost:3000/dashboard.html"
echo ""
echo "Production deployment:"
echo "- Docker: docker-compose up -d"
echo "- PM2: pm2 start cluster.js --name job-automation"
echo "=================================================="