const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const logger = require('../services/logger');

/**
 * GET /chat-widget.js
 * Serve the chat widget JavaScript with dynamic configuration
 */
router.get('/chat-widget.js', (req, res) => {
  try {
    const widgetPath = path.join(__dirname, '../public/chat-widget.js');
    
    // Check if widget file exists
    if (!fs.existsSync(widgetPath)) {
      logger.error('Chat widget file not found', { path: widgetPath });
      return res.status(404).json({
        error: 'Chat widget not found'
      });
    }

    // Read the widget file
    let widgetContent = fs.readFileSync(widgetPath, 'utf8');
    
    // Dynamic configuration injection based on environment
    const env = process.env.NODE_ENV || 'development';
    const backendUrl = env === 'production' 
      ? process.env.BACKEND_URL || 'https://your-domain.com'
      : 'http://localhost:3000';
    
    // Inject configuration into the widget
    const configInjection = `
// Auto-injected configuration
window.CHAT_WIDGET_CONFIG = {
  backendUrl: '${backendUrl}',
  environment: '${env}',
  version: '1.0.0',
  features: {
    offlineMode: false,
    analytics: ${env === 'production'},
    debug: ${env === 'development'}
  }
};
`;
    
    // Prepend configuration to widget content
    widgetContent = configInjection + '\n' + widgetContent;
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'application/javascript',
      'Cache-Control': env === 'production' 
        ? 'public, max-age=3600' // Cache for 1 hour in production
        : 'no-cache', // No cache in development
      'X-Widget-Version': '1.0.0'
    });

    logger.debug('Chat widget served', {
      environment: env,
      backendUrl,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    });

    res.send(widgetContent);

  } catch (error) {
    logger.error('Error serving chat widget', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to load chat widget'
    });
  }
});

/**
 * GET /chat-widget.css
 * Serve the chat widget CSS with dynamic theming
 */
router.get('/chat-widget.css', (req, res) => {
  try {
    const cssPath = path.join(__dirname, '../public/chat-widget.css');
    
    if (!fs.existsSync(cssPath)) {
      logger.error('Chat widget CSS not found', { path: cssPath });
      return res.status(404).json({
        error: 'Chat widget CSS not found'
      });
    }

    // Read CSS content
    let cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Dynamic theme injection (optional)
    const theme = req.query.theme || 'default';
    if (theme !== 'default') {
      // You can add theme-specific CSS modifications here
      logger.debug('Custom theme requested', { theme });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': 'text/css',
      'Cache-Control': process.env.NODE_ENV === 'production' 
        ? 'public, max-age=86400' // Cache for 24 hours in production
        : 'no-cache'
    });

    res.send(cssContent);

  } catch (error) {
    logger.error('Error serving chat widget CSS', {
      error: error.message
    });

    res.status(500).send('/* Error loading chat widget styles */');
  }
});

/**
 * GET /widget/config
 * Get widget configuration for dynamic initialization
 */
router.get('/config', (req, res) => {
  try {
    const env = process.env.NODE_ENV || 'development';
    
    const config = {
      backendUrl: env === 'production' 
        ? process.env.BACKEND_URL || 'https://your-domain.com'
        : 'http://localhost:3000',
      apiEndpoint: '/chat-api',
      healthEndpoint: '/health',
      version: '1.0.0',
      environment: env,
      features: {
        offlineMode: false,
        conversationHistory: true,
        topicValidation: true,
        analytics: env === 'production',
        debug: env === 'development'
      },
      ui: {
        position: 'bottom-right',
        theme: 'default',
        animations: true,
        typing_indicator: true
      },
      limits: {
        maxMessageLength: 2000,
        maxSessionTime: 3600000, // 1 hour
        rateLimitPerMinute: 10
      }
    };

    res.json(config);

  } catch (error) {
    logger.error('Error serving widget config', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to load widget configuration'
    });
  }
});

module.exports = router;