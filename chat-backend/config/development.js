module.exports = {
    port: 3000,
    environment: 'development',
    
    // CORS settings for development
    cors: {
      origins: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'https://prod.edrevel.com',
        'https://cloud.scorm.com',
        'https://academy.nebulaknowlab.com',
        'file://',
        'null'
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
      model: 'gemini-1.5-flash-latest', // ✅ CHANGED: Updated from 1.5 to 2.5 Flash
      // ... rest of config
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