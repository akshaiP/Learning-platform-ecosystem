const express = require('express');
const router = express.Router();
const aiService = require('../services/ai-service');
const sessionService = require('../services/session-service');
const logger = require('../services/logger');

/**
 * GET /health
 * Comprehensive health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const checks = {};
  let overallStatus = 'healthy';

  try {
    // Basic service info
    checks.service = {
      name: 'Learning Platform Chat Backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    // Memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    };

    // Check AI service
    try {
      const aiHealth = await Promise.race([
        aiService.healthCheck(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI health check timeout')), 5000))
      ]);
      
      checks.ai_service = {
        status: aiHealth.status,
        response_time: aiHealth.responseTime + 'ms',
        provider: 'gemini',
        model: 'gemini-1.5-flash-latest'
      };

      if (aiHealth.status !== 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.ai_service = {
        status: 'unhealthy',
        error: error.message
      };
      overallStatus = 'unhealthy';
    }

    // Check session service
    try {
      const sessionHealth = sessionService.getHealthInfo();
      checks.session_service = {
        status: 'healthy',
        active_sessions: sessionHealth.activeSessions,
        cache_stats: sessionHealth.cacheStats
      };
    } catch (error) {
      checks.session_service = {
        status: 'unhealthy',
        error: error.message
      };
      overallStatus = 'degraded';
    }

    // Configuration checks
    checks.configuration = {
      gemini_api_key: !!process.env.GEMINI_API_KEY,
      cors_configured: true,
      rate_limiting: true,
      logging: true
    };

    if (!process.env.GEMINI_API_KEY) {
      overallStatus = 'degraded';
      checks.configuration.warnings = ['GEMINI_API_KEY not configured'];
    }

    // Response time
    const responseTime = Date.now() - startTime;
    checks.performance = {
      health_check_time: responseTime + 'ms',
      status: responseTime < 1000 ? 'good' : 'slow'
    };

    // Overall health assessment
    const healthResponse = {
      status: overallStatus,
      checks,
      summary: {
        healthy: overallStatus === 'healthy',
        degraded: overallStatus === 'degraded',
        unhealthy: overallStatus === 'unhealthy'
      }
    };

    // Set appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    logger.info('Health check completed', {
      status: overallStatus,
      responseTime,
      checks: Object.keys(checks)
    });

    res.status(httpStatus).json(healthResponse);

  } catch (error) {
    logger.error('Health check error', {
      error: error.message,
      stack: error.stack
    });

    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/simple
 * Simple health check for load balancers
 */
router.get('/simple', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/ai
 * Dedicated AI service health check
 */
router.get('/ai', async (req, res) => {
  try {
    const aiHealth = await aiService.healthCheck();
    
    const status = aiHealth.status === 'healthy' ? 200 : 503;
    
    res.status(status).json({
      service: 'AI Service',
      ...aiHealth,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('AI health check error', { error: error.message });
    
    res.status(503).json({
      service: 'AI Service',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;