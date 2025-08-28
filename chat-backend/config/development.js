module.exports = {
    port: 3000,
    environment: 'development',
    
    // CORS settings for development
    cors: {
      origins: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'file://' // For local SCORM testing
      ],
      credentials: true
    },
  
    // AI Configuration
    ai: {
      provider: 'gemini',
      model: 'gemini-1.5-flash-latest',
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 30000
    },
  
    // Session management
    session: {
      maxAge: 3600000, // 1 hour
      cleanupInterval: 300000 // 5 minutes
    },
  
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      message: 'Too many requests, please try again later'
    },
  
    // Logging
    logging: {
      level: 'debug',
      console: true,
      file: false
    }
  };  