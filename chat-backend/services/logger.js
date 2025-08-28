const winston = require('winston');
const path = require('path');

// Load environment config
const env = process.env.NODE_ENV || 'development';
const config = require(`../config/${env}`);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport (always enabled in development)
if (config.logging.console || env === 'development') {
  transports.push(
    new winston.transports.Console({
      format: env === 'development' ? consoleFormat : logFormat,
      level: config.logging.level
    })
  );
}

// File transport (enabled in production or when configured)
if (config.logging.file) {
  // Ensure logs directory exists
  const fs = require('fs');
  const logsDir = path.dirname(config.logging.filename || 'logs/app.log');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  transports.push(
    new winston.transports.File({
      filename: config.logging.filename || 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: config.logging.filename || 'logs/app.log',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false
});

// Add custom methods for structured logging
logger.apiRequest = (req, metadata = {}) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    ...metadata
  });
};

logger.apiResponse = (req, res, responseTime, metadata = {}) => {
  logger.info('API Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ...metadata
  });
};

logger.aiRequest = (prompt, metadata = {}) => {
  logger.info('AI Request', {
    promptLength: prompt.length,
    ...metadata
  });
};

logger.aiResponse = (response, metadata = {}) => {
  logger.info('AI Response', {
    responseLength: response.length,
    ...metadata
  });
};

module.exports = logger;