const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Import routes and services
const dashboardRoutes = require('./backend/routes/dashboard');
const continuousScheduler = require('./backend/scheduler/continuousScheduler');
const emailService = require('./backend/services/emailService');

// API Routes
app.use('/api', dashboardRoutes);

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  // In a real implementation, this would return actual metrics
  res.json({ 
    jobsProcessed: 0,
    jobsFailed: 0,
    uptime: process.uptime()
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start continuous scheduler
  continuousScheduler.startScheduler();
  
  // Test email connection on startup
  emailService.testConnection();
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Job Automation Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/`);
    console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
    console.log(`🎯 Health Check: http://localhost:${PORT}/health`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});