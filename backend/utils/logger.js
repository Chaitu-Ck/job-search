// Simple logger utility
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const logFile = path.join(logsDir, 'combined.log');
const errorFile = path.join(logsDir, 'error.log');

// Simple logging function
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
  
  // Write to combined log
  fs.appendFileSync(logFile, logMessage);
  
  // Write errors to separate file
  if (level === 'error') {
    fs.appendFileSync(errorFile, logMessage);
  }
  
  // Also output to console
  console.log(logMessage.trim());
}

module.exports = {
  info: (message) => log('info', message),
  warn: (message) => log('warn', message),
  error: (message) => log('error', message),
  debug: (message) => log('debug', message)
};