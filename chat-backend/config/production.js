module.exports = {
    port: process.env.PORT || 3000,
    environment: 'production',
    
    // CORS settings for production
    cors: {
      origins: [
        process.env.LMS_DOMAIN || 'https://prod.edrevel.com',
        'http://localhost:8080'
      ],
      credentials: true
    },
  
    // AI Configuration
    ai: {
      provider: 'gemini',
      model: 'gemini-1.5-flash-latest',
      temperature: 0.6, // Slightly more focused for production
      maxTokens: 1500,   // More conservative token usage
      timeout: 25000
    },
  
    // Session management
    session: {
      maxAge: 1800000,   // 30 minutes
      cleanupInterval: 600000 // 10 minutes
    },
  
    // Rate limiting - more restrictive
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 50,
      message: 'Rate limit exceeded. Please try again later.'
    },
  
    // Logging
    logging: {
      level: 'info',
      console: false,
      file: true,
      filename: 'logs/app.log'
    }
  };
  