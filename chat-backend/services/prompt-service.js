const { systemPrompts, topicKeywords } = require('../config/llm-config');
const logger = require('./logger');

class PromptService {
  constructor() {
    this.systemPrompts = systemPrompts;
    this.topicKeywords = topicKeywords;
  }

  /**
   * Build context-aware prompt based on learning context and progress
   */
  buildPrompt({
    message,
    topic,
    context = 'general',
    learnerData = {},
    conversationHistory = [],
    isFirstMessage = false
  }) {
    try {
      // Get base system prompt for context
      const systemPrompt = this.getSystemPrompt(context, topic);
      
      // Build learner context
      const learnerContext = this.buildLearnerContext(learnerData, topic);
      
      // Build conversation context for follow-ups
      const conversationContext = this.buildConversationContext(conversationHistory, isFirstMessage);
      
      // Build topic boundary enforcement
      const topicBoundary = this.buildTopicBoundary(topic);
      
      // Assemble final prompt
      const fullPrompt = [
        systemPrompt,
        learnerContext,
        topicBoundary,
        conversationContext,
        `Current Student Question: ${message}`,
        '',
        'Please provide a helpful, educational response that stays within the topic scope.'
      ].filter(Boolean).join('\n\n');

      logger.debug('Prompt built successfully', {
        topic,
        context,
        learnerName: learnerData.name,
        promptLength: fullPrompt.length,
        isFirstMessage
      });

      return fullPrompt;

    } catch (error) {
      logger.error('Error building prompt', {
        error: error.message,
        topic,
        context
      });
      
      // Fallback to basic prompt
      return `${this.systemPrompts.general}\n\nTopic: ${topic}\nStudent Question: ${message}`;
    }
  }

  /**
   * Get appropriate system prompt based on context
   */
  getSystemPrompt(context, topic) {
    const basePrompt = this.systemPrompts[context] || this.systemPrompts.general;
    return basePrompt.replace(/\[CURRENT_TOPIC\]/g, topic)
                   .replace(/\[TOPIC_SPECIFIC_CONCEPT\]/g, this.getTopicConcepts(topic));
  }

  /**
   * Build learner-specific context
   */
  buildLearnerContext(learnerData, topic) {
    if (!learnerData.name && !learnerData.id) {
      return '';
    }

    let context = `LEARNER CONTEXT:`;
    
    if (learnerData.name) {
      context += `\n- Student Name: ${learnerData.name}`;
    }
    
    if (learnerData.progress) {
      context += `\n- Learning Progress: ${learnerData.progress}`;
    }
    
    if (learnerData.attempts) {
      context += `\n- Previous Attempts: ${learnerData.attempts}`;
    }

    context += `\n- Current Topic: ${topic}`;
    context += `\n- Personalize your response appropriately using the student's name when helpful.`;
    
    return context;
  }

  /**
   * Build conversation context for follow-up messages
   */
  buildConversationContext(history, isFirstMessage) {
    if (isFirstMessage || !history || history.length === 0) {
      return '';
    }

    const recentHistory = history.slice(-3); // Last 3 exchanges
    const contextLines = recentHistory.map(msg => 
      `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
    );

    return `RECENT CONVERSATION CONTEXT:\n${contextLines.join('\n')}\n\nConsider this context when responding to the new question.`;
  }

  /**
   * Build topic boundary enforcement
   */
  buildTopicBoundary(topic) {
    const keywords = this.topicKeywords[topic] || [];
    
    return `TOPIC BOUNDARY: Stay focused on "${topic}". 
Key concepts to emphasize: ${keywords.join(', ')}.
If the question goes outside this scope, politely redirect to relevant aspects of ${topic}.`;
  }

  /**
   * Get topic-specific concepts for prompt replacement
   */
  getTopicConcepts(topic) {
    const conceptMap = {
      'robot-arm-movement': 'coordinate systems and arm positioning',
      'sensor-integration': 'sensor data collection and processing',
      'control-systems': 'feedback loops and system stability'
    };
    
    return conceptMap[topic] || 'the current topic concepts';
  }

  /**
   * Validate if response stays within topic boundaries
   */
  validateTopicBoundary(response, topic) {
    if (!topic || !this.topicKeywords[topic]) {
      return { valid: true, confidence: 0.5 };
    }

    const keywords = this.topicKeywords[topic];
    const responseText = response.toLowerCase();
    
    // Count keyword matches
    const matches = keywords.filter(keyword => 
      responseText.includes(keyword.toLowerCase())
    );
    
    const confidence = matches.length / keywords.length;
    const valid = confidence > 0.2; // At least 20% keyword coverage
    
    logger.debug('Topic boundary validation', {
      topic,
      confidence,
      valid,
      matches: matches.length,
      totalKeywords: keywords.length
    });

    return { valid, confidence, matchedKeywords: matches };
  }

  /**
   * Get contextual initial message based on trigger
   */
  getContextualInitialMessage(context, topic) {
    const messages = {
      'help': `I need help understanding the ${topic} concepts. Can you provide step-by-step guidance?`,
      'learn_more': `I want to learn more about ${topic} in detail with practical examples.`,
      'quiz_failed': `I answered incorrectly on the quiz about ${topic}. Can you help me understand the correct approach?`,
      'practice': `I want to practice ${topic} with hands-on examples. Can you guide me through some exercises?`,
      'summary': `Can you provide a comprehensive summary of the ${topic} concepts and key points?`,
      'general': `Hello! I need assistance with ${topic}.`
    };
    
    return messages[context] || messages['general'];
  }
}

module.exports = new PromptService();
