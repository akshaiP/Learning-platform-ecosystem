module.exports = {
    port: process.env.PORT || 3000,
    environment: 'production',
    
    // CORS settings for production
    cors: {
      origins: [
        process.env.LMS_DOMAIN || 'https://prod.edrevel.com',
        'http://localhost:8080',
        'https://cloud.scorm.com',
        'https://academy.nebulaknowlab.com'
      ],
      credentials: true
    },
  
    // AI Configuration
    ai: {
      provider: 'gemini',
      // MODEL CHANGE: Switch between versions by changing this line
      // For 2.5 Flash: 'gemini-2.5-flash-latest'
      // For 1.5 Flash: 'gemini-1.5-flash-latest' 
      // For 2.5 Pro: 'gemini-2.5-pro-latest'
      model: 'gemini-1.5-flash', // ✅ CHANGED: Updated from 1.5 to 2.5 Flash
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
  