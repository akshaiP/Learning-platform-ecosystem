require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import services and routes
const logger = require('./services/logger');
const chatApiRoutes = require('./routes/chat-api');
const healthRoutes = require('./routes/health');
const widgetRoutes = require('./routes/widget');

// Load environment-specific configuration
const env = process.env.NODE_ENV || 'development';
const config = require(`./config/${env}`);

const app = express();
const PORT = config.port;

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] RAW REQUEST: ${req.method} ${req.url}`, {
    origin: req.get('Origin'),
    headers: req.headers,
    ip: req.ip
  });
  next();
});

// Security middleware - RELAXED FOR DEVELOPMENT
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false  // Disables CORP entirely for local dev
  // Alternatively: crossOriginResourcePolicy: { policy: 'cross-origin' } to explicitly allow
}));

// Compression middleware
app.use(compression());

// CORS configuration - SIMPLIFIED FOR DEVELOPMENT
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.origins;
    if (!origin || allowedOrigins.includes(origin) || origin === 'null' || origin === 'file://') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Learner-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: true,
    message: config.rateLimit.message
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      error: true,
      message: config.rateLimit.message,
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = require('uuid').v4();
  res.set('X-Request-ID', req.id);
  next();
});

// Static files (widget assets)
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), {
  maxAge: env === 'production' ? 86400000 : 0 // 24 hours in production
}));

// API Routes
app.use('/chat-api', chatApiRoutes);
app.use('/health', healthRoutes);
app.use('/', widgetRoutes); // Widget routes at root level

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Learning Platform Chat Backend',
    version: '1.0.0',
    environment: env,
    status: 'running',
    endpoints: {
      chat: '/chat-api',
      health: '/health',
      widget: '/chat-widget.js',
      styles: '/chat-widget.css',
      config: '/widget/config'
    },
    documentation: 'https://your-docs-url.com',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: true,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'POST /chat-api',
      'GET /health',
      'GET /chat-widget.js',
      'GET /chat-widget.css'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose internal error details in production
  const errorResponse = {
    error: true,
    message: env === 'production' 
      ? 'Internal server error' 
      : err.message,
    requestId: req.id
  };

  if (env === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  logger.info('Received shutdown signal, starting graceful shutdown', { signal });
  
  // Stop accepting new requests
  const server = app.listen(PORT);
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Cleanup services
    try {
      // Add any cleanup logic here (database connections, etc.)
      logger.info('Services cleaned up successfully');
    } catch (error) {
      logger.error('Error during cleanup', { error: error.message });
    }
    
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
const server = app.listen(PORT,'0.0.0.0', () => {
  logger.info('🚀 Learning Platform Chat Backend started', {
    port: PORT,
    host:'0.0.0.0',
    environment: env,
    nodeVersion: process.version,
    corsOrigins: config.cors.origins,
    aiService: config.ai.provider,
    features: {
      rateLimit: true,
      compression: true,
      security: true,
      logging: true
    }
  });

  // API key validation
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('⚠️  GEMINI_API_KEY environment variable not set');
  } else {
    logger.info('✅ AI service configured and ready');
  }

  console.log(`
🤖 Learning Platform Chat Backend
🌐 Server: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
🔧 Environment: ${env}
📝 Logs: ${config.logging.level} level
  `);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server error', { error: error.message });
  }
  process.exit(1);
});

module.exports = app;