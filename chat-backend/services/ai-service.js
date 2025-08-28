const config = require('../config/llm-config');
const logger = require('./logger');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
  }

  async generateResponse(prompt, options = {}) {
    try {
      const startTime = Date.now();
      
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          ...config.gemini.generationConfig,
          ...options.generationConfig
        }
      };

      logger.debug('Sending request to Gemini API', {
        promptLength: prompt.length,
        model: config.gemini.model
      });

      const response = await fetch(
        `${config.gemini.apiUrl}/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          timeout: options.timeout || 25000
        }
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API Error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          responseTime
        });
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info('Gemini API Response Success', {
        responseTime,
        responseLength: JSON.stringify(data).length
      });

      // Extract response text
      let responseText = '';
      if (data.candidates && data.candidates.length > 0 &&
          data.candidates[0].content && data.candidates[0].content.parts &&
          data.candidates[0].content.parts.length > 0) {
        responseText = data.candidates[0].content.parts[0].text;
      } else {
        logger.warn('Unexpected Gemini response structure', { data });
        responseText = "I apologize, but I'm having trouble generating a response right now. Could you please rephrase your question?";
      }

      return {
        text: responseText,
        metadata: {
          responseTime,
          model: 'gemini-1.5-flash-latest',
          tokensEstimate: Math.ceil(responseText.length / 4) // Rough estimate
        }
      };

    } catch (error) {
      logger.error('AI Service Error', {
        error: error.message,
        stack: error.stack
      });

      return {
        text: "I'm experiencing technical difficulties right now. Please try again in a moment, or rephrase your question if the issue persists.",
        error: true,
        metadata: {
          errorType: error.name,
          errorMessage: error.message
        }
      };
    }
  }

  // Health check for AI service
  async healthCheck() {
    try {
      const testPrompt = "Respond with 'OK' if you're working correctly.";
      const result = await this.generateResponse(testPrompt, { 
        generationConfig: { maxOutputTokens: 10 } 
      });
      
      return {
        status: result.error ? 'degraded' : 'healthy',
        responseTime: result.metadata?.responseTime || 0,
        error: result.error || false
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new AIService();