const express = require('express');
const router = express.Router();
const Joi = require('joi');
const aiService = require('../services/ai-service');
const promptService = require('../services/prompt-service');
const sessionService = require('../services/session-service');
const logger = require('../services/logger');

// Request validation schema
const chatRequestSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  topic: Joi.string().required().min(1).max(100),
  context: Joi.string().valid('help', 'learn_more', 'practice', 'quiz_failed', 'summary', 'general').default('general'),
  sessionId: Joi.string().uuid().optional(),
  learnerData: Joi.object({
    id: Joi.string().optional(),
    name: Joi.string().optional(),
    progress: Joi.string().optional(),
    attempts: Joi.number().integer().min(0).optional()
  }).optional(),
  isFirstMessage: Joi.boolean().default(false)
});

/**
 * POST /chat-api
 * Main chat endpoint for processing student messages
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Log incoming request
    logger.apiRequest(req, {
      body: {
        topic: req.body.topic,
        context: req.body.context,
        messageLength: req.body.message?.length,
        sessionId: req.body.sessionId,
        learnerName: req.body.learnerData?.name
      }
    });

    // Validate request
    const { error, value } = chatRequestSchema.validate(req.body);
    if (error) {
      logger.warn('Chat API validation error', {
        error: error.details[0].message,
        body: req.body
      });
      
      return res.status(400).json({
        error: true,
        message: 'Invalid request format',
        details: error.details[0].message,
        reply: "I'm sorry, but there was an issue with your request format. Please try again."
      });
    }

    const { message, topic, context, sessionId, learnerData = {}, isFirstMessage } = value;

    // Get or create session
    const session = sessionService.getOrCreateSession(sessionId, learnerData);
    const currentSessionId = session.id;

    // Update session context
    sessionService.updateContext(currentSessionId, topic, context);

    // Add user message to session
    sessionService.addMessage(currentSessionId, 'user', message, {
      topic,
      context,
      isFirstMessage
    });

    // Build contextual prompt
    const fullPrompt = promptService.buildPrompt({
      message,
      topic,
      context,
      learnerData: session.learnerData,
      conversationHistory: session.conversationHistory.slice(-6), // Last 6 messages
      isFirstMessage
    });

    // Get AI response
    logger.aiRequest(fullPrompt, { topic, context, sessionId: currentSessionId });
    
    const aiResponse = await aiService.generateResponse(fullPrompt, {
      generationConfig: {
        temperature: context === 'quiz_failed' ? 0.5 : 0.7, // More focused for quiz explanations
        maxOutputTokens: context === 'summary' ? 1500 : 1000 // More tokens for summaries
      }
    });

    if (aiResponse.error) {
      logger.error('AI Service returned error', {
        sessionId: currentSessionId,
        topic,
        context,
        error: aiResponse.metadata?.errorMessage
      });

      return res.status(500).json({
        error: true,
        message: 'AI service error',
        reply: aiResponse.text,
        sessionId: currentSessionId
      });
    }

    // Validate topic boundary
    const boundaryCheck = promptService.validateTopicBoundary(aiResponse.text, topic);
    
    if (!boundaryCheck.valid) {
      logger.warn('Response outside topic boundary', {
        topic,
        confidence: boundaryCheck.confidence,
        sessionId: currentSessionId
      });
      
      // Override with topic-focused response
      const redirectPrompt = `The student asked about something outside the ${topic} topic. Politely redirect them back to ${topic} concepts and ask what specific aspect of ${topic} they'd like to explore instead.`;
      const redirectResponse = await aiService.generateResponse(redirectPrompt);
      aiResponse.text = redirectResponse.text;
    }

    // Add AI response to session
    sessionService.addMessage(currentSessionId, 'assistant', aiResponse.text, {
      topic,
      context,
      responseTime: aiResponse.metadata?.responseTime,
      tokensUsed: aiResponse.metadata?.tokensEstimate,
      boundaryValid: boundaryCheck.valid
    });

    logger.aiResponse(aiResponse.text, {
      sessionId: currentSessionId,
      topic,
      context,
      boundaryValid: boundaryCheck.valid,
      responseTime: aiResponse.metadata?.responseTime
    });

    // Prepare successful response
    const responseData = {
      reply: aiResponse.text,
      sessionId: currentSessionId,
      context,
      topic,
      metadata: {
        responseTime: Date.now() - startTime,
        aiResponseTime: aiResponse.metadata?.responseTime,
        messageCount: session.messageCount + 1,
        boundaryCheck: {
          valid: boundaryCheck.valid,
          confidence: boundaryCheck.confidence
        }
      }
    };

    // Log successful response
    logger.apiResponse(req, res, Date.now() - startTime, {
      sessionId: currentSessionId,
      topic,
      context,
      replyLength: aiResponse.text.length
    });

    res.json(responseData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Chat API error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      responseTime
    });

    // Return user-friendly error response
    res.status(500).json({
      error: true,
      message: 'Internal server error',
      reply: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or rephrase your question if the issue persists.",
      sessionId: req.body.sessionId || null,
      metadata: {
        responseTime,
        errorType: error.name
      }
    });
  }
});

/**
 * GET /chat-api/session/:sessionId/stats
 * Get session statistics
 */
router.get('/session/:sessionId/stats', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid session ID format'
      });
    }

    const stats = sessionService.getSessionStats(sessionId);
    
    if (!stats) {
      return res.status(404).json({
        error: true,
        message: 'Session not found'
      });
    }

    res.json({
      sessionId,
      stats
    });

  } catch (error) {
    logger.error('Session stats error', {
      error: error.message,
      sessionId: req.params.sessionId
    });

    res.status(500).json({
      error: true,
      message: 'Error retrieving session statistics'
    });
  }
});

/**
 * DELETE /chat-api/session/:sessionId
 * Clear session data
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // This would be implemented if we need explicit session cleanup
    // For now, sessions expire automatically
    
    res.json({
      message: 'Session cleanup requested',
      sessionId
    });

  } catch (error) {
    logger.error('Session cleanup error', {
      error: error.message,
      sessionId: req.params.sessionId
    });

    res.status(500).json({
      error: true,
      message: 'Error cleaning up session'
    });
  }
});

module.exports = router;