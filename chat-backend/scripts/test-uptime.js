#!/usr/bin/env node

/**
 * Local Uptime Testing Script
 *
 * This script tests your service uptime monitoring locally
 * before deploying to GitHub Actions.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:3000';
const INTERVAL = 5 * 60 * 1000; // 5 minutes
const TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function makeRequest(url, endpoint = '/health/simple') {
  return new Promise((resolve, reject) => {
    const fullUrl = `${url.replace(/\/$/, '')}${endpoint}`;
    const urlObj = new URL(fullUrl);

    const startTime = Date.now();

    const options = {
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Uptime-Monitor/1.0'
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(fullUrl, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        resolve({
          statusCode: res.statusCode,
          responseTime,
          body: data,
          headers: res.headers,
          endpoint: fullUrl
        });
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        endpoint: fullUrl,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        endpoint: fullUrl,
        responseTime: TIMEOUT
      });
    });

    req.end();
  });
}

async function checkHealth(url, endpoint = '/health/simple') {
  log(`🔍 Checking health at: ${url}${endpoint}`, 'blue');

  try {
    const response = await makeRequest(url, endpoint);

    if (response.statusCode === 200) {
      log(`✅ Health check successful (${response.responseTime}ms)`, 'green');
      log(`   Response: ${response.body}`, 'green');
      return { success: true, ...response };
    } else {
      log(`❌ Health check failed - HTTP ${response.statusCode}`, 'red');
      log(`   Response: ${response.body}`, 'red');
      return { success: false, ...response };
    }
  } catch (error) {
    log(`❌ Health check error: ${error.error || error.message}`, 'red');
    return { success: false, error: error.error || error.message };
  }
}

async function runHealthCheckWithRetry(url, endpoint = '/health/simple') {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    if (attempt > 1) {
      log(`🔄 Retry attempt ${attempt - 1}/${MAX_RETRIES}`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    const result = await checkHealth(url, endpoint);

    if (result.success) {
      return result;
    }

    lastError = result;
  }

  return lastError;
}

async function comprehensiveHealthCheck(url) {
  log('🚀 Starting comprehensive health check', 'blue');

  const endpoints = [
    '/health/simple',
    '/health',
    '/'
  ];

  for (const endpoint of endpoints) {
    log(`\n--- Testing endpoint: ${endpoint} ---`, 'blue');

    const result = await runHealthCheckWithRetry(url, endpoint);

    if (result.success) {
      log(`✅ ${endpoint} is working correctly`, 'green');
      return { success: true, endpoint, ...result };
    } else {
      log(`❌ ${endpoint} failed`, 'red');
    }
  }

  log('\n🚨 All endpoints failed!', 'red');
  return { success: false, error: 'All endpoints failed' };
}

async function continuousMonitoring(url) {
  log(`🔄 Starting continuous monitoring (every ${INTERVAL/1000/60} minutes)`, 'blue');
  log('Press Ctrl+C to stop monitoring\n', 'yellow');

  let consecutiveFailures = 0;

  const checkInterval = setInterval(async () => {
    const result = await comprehensiveHealthCheck(url);

    if (result.success) {
      consecutiveFailures = 0;
      log('✅ Service is healthy - monitoring continues...', 'green');
    } else {
      consecutiveFailures++;
      log(`🚨 Service unhealthy (${consecutiveFailures} consecutive failures)`, 'red');

      if (consecutiveFailures >= 3) {
        log('🚨 Multiple consecutive failures - consider investigating!', 'red');
        // You could add notification logic here
      }
    }

    log('\n' + '='.repeat(60) + '\n');
  }, INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Stopping monitoring...', 'yellow');
    clearInterval(checkInterval);
    process.exit(0);
  });

  // Run initial check
  await comprehensiveHealthCheck(url);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const url = args[1] || SERVICE_URL;

  switch (command) {
    case 'test':
      await comprehensiveHealthCheck(url);
      break;

    case 'monitor':
      await continuousMonitoring(url);
      break;

    case 'help':
      console.log(`
Uptime Monitor Test Script

Usage:
  node scripts/test-uptime.js <command> [url]

Commands:
  test     Run a one-time comprehensive health check
  monitor  Start continuous monitoring (every 5 minutes)
  help     Show this help message

Examples:
  node scripts/test-uptime.js test https://your-service.onrender.com
  node scripts/test-uptime.js monitor http://localhost:3000
  SERVICE_URL=https://your-service.onrender.com node scripts/test-uptime.js test

Environment Variables:
  SERVICE_URL  Default service URL to test
      `);
      break;

    default:
      console.log('Unknown command. Use "help" for usage information.');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkHealth,
  comprehensiveHealthCheck,
  continuousMonitoring
};