const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class SessionService {
  constructor() {
    // Initialize cache with configurable TTL
    const config = this.loadConfig();
    this.cache = new NodeCache({
      stdTTL: config.session.maxAge / 1000, // Convert to seconds
      checkperiod: config.session.cleanupInterval / 1000,
      useClones: false,
      deleteOnExpire: true
    });

    // Setup cache event listeners
    this.setupEventListeners();
    
    logger.info('Session Service initialized', {
      maxAge: config.session.maxAge,
      cleanupInterval: config.session.cleanupInterval
    });
  }

  loadConfig() {
    const env = process.env.NODE_ENV || 'development';
    return require(`../config/${env}`);
  }

  setupEventListeners() {
    this.cache.on('expired', (key, value) => {
      logger.debug('Session expired', { sessionId: key });
    });

    this.cache.on('del', (key, value) => {
      logger.debug('Session deleted', { sessionId: key });
    });
  }

  /**
   * Create a new chat session
   */
  createSession(learnerData = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      learnerData: {
        id: learnerData.id || null,
        name: learnerData.name || null,
        progress: learnerData.progress || null,
        attempts: learnerData.attempts || 0
      },
      conversationHistory: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      currentTopic: null,
      currentContext: null
    };

    this.cache.set(sessionId, session);
    
    logger.info('New session created', {
      sessionId,
      learnerId: learnerData.id,
      learnerName: learnerData.name
    });

    return sessionId;
  }

  /**
   * Get existing session or create new one
   */
  getOrCreateSession(sessionId, learnerData = {}) {
    if (sessionId && this.cache.has(sessionId)) {
      const session = this.cache.get(sessionId);
      
      // Update learner data if provided
      if (Object.keys(learnerData).length > 0) {
        session.learnerData = { ...session.learnerData, ...learnerData };
        this.cache.set(sessionId, session);
      }
      
      return session;
    }

    // Create new session
    const newSessionId = this.createSession(learnerData);
    return this.cache.get(newSessionId);
  }

  /**
   * Update session with new message
   */
  addMessage(sessionId, role, content, metadata = {}) {
    try {
      const session = this.cache.get(sessionId);
      if (!session) {
        logger.warn('Attempted to add message to non-existent session', { sessionId });
        return false;
      }

      const message = {
        role,
        content,
        timestamp: new Date().toISOString(),
        metadata
      };

      session.conversationHistory.push(message);
      session.lastActivity = new Date().toISOString();
      session.messageCount++;

      // Keep only last 20 messages to prevent memory bloat
      if (session.conversationHistory.length > 20) {
        session.conversationHistory = session.conversationHistory.slice(-20);
      }

      this.cache.set(sessionId, session);
      
      logger.debug('Message added to session', {
        sessionId,
        role,
        messageCount: session.messageCount
      });

      return true;
    } catch (error) {
      logger.error('Error adding message to session', {
        sessionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Update session context
   */
  updateContext(sessionId, topic, context) {
    try {
      const session = this.cache.get(sessionId);
      if (!session) {
        return false;
      }

      session.currentTopic = topic;
      session.currentContext = context;
      session.lastActivity = new Date().toISOString();

      this.cache.set(sessionId, session);
      
      logger.debug('Session context updated', {
        sessionId,
        topic,
        context
      });

      return true;
    } catch (error) {
      logger.error('Error updating session context', {
        sessionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    const session = this.cache.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      messageCount: session.messageCount,
      conversationLength: session.conversationHistory.length,
      duration: Date.now() - new Date(session.createdAt).getTime(),
      lastActivity: session.lastActivity,
      currentTopic: session.currentTopic,
      currentContext: session.currentContext
    };
  }

  /**
   * Clean up expired sessions manually
   */
  cleanup() {
    const keys = this.cache.keys();
    logger.info('Manual session cleanup initiated', { 
      activeSessions: keys.length 
    });
    
    // Force garbage collection
    this.cache.flushAll();
    return keys.length;
  }

  /**
   * Get service health info
   */
  getHealthInfo() {
    const keys = this.cache.keys();
    const stats = this.cache.getStats();
    
    return {
      activeSessions: keys.length,
      cacheStats: {
        hits: stats.hits,
        misses: stats.misses,
        keys: stats.keys,
        ksize: stats.ksize,
        vsize: stats.vsize
      }
    };
  }
}

module.exports = new SessionService();