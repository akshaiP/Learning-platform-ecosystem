const config = require('../config/llm-config');
const logger = require('./logger');
const { normalizeMarkdown } = require('./markdown-service');

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
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          ...config.gemini.generationConfig,
          // Force plain text to avoid tool/function-call structures with 2.5 models
          responseMimeType: 'text/plain',
          ...options.generationConfig
        }
      };

      logger.debug('Sending request to Gemini API', {
        promptLength: prompt.length,
        model: config.gemini.model
      });

      // Use the configured model if provided, otherwise default to 2.5 flash
      const modelName = config.gemini.model || 'gemini-1.5-flash-latest';
      const response = await fetch(
        `${config.gemini.apiUrl}/${modelName}:generateContent?key=${this.apiKey}`,
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

      // Extract response text robustly for Gemini 2.5
      let responseText = '';
      const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
      const firstCandidate = candidates[0];

      // Prefer concatenating all text parts from the first candidate
      const parts = firstCandidate?.content?.parts;
      if (Array.isArray(parts) && parts.length > 0) {
        responseText = parts
          .map(p => (typeof p.text === 'string' ? p.text : ''))
          .filter(Boolean)
          .join('');
      }

      // If empty, try any candidate with parts/text
      if (!responseText && candidates.length > 0) {
        for (const c of candidates) {
          const cParts = c?.content?.parts;
          if (Array.isArray(cParts) && cParts.length > 0) {
            responseText = cParts
              .map(p => (typeof p.text === 'string' ? p.text : ''))
              .filter(Boolean)
              .join('');
            if (responseText) break;
          }
        }
      }

      // As a last resort, check for top-level text fields some responses may include
      if (!responseText) {
        responseText = firstCandidate?.text || data?.text || '';
      }

      // Log finish reason and prompt feedback for diagnostics
      const finishReason = firstCandidate?.finishReason || data?.finishReason;
      const promptFeedback = data?.promptFeedback;
      if (!responseText) {
        logger.warn('Unexpected Gemini response structure', { finishReason, promptFeedback, data });
        responseText = "I apologize, but I'm having trouble generating a response right now. Could you please rephrase your question?";
      } else if (finishReason === 'MAX_TOKENS') {
        // Note partial completion due to token cap
        logger.warn('Gemini response truncated due to MAX_TOKENS', { finishReason });
      }

      // Normalize Markdown for consistent rendering across models
      const normalizedText = normalizeMarkdown(responseText);

      return {
        text: normalizedText,
        metadata: {
          responseTime,
          model: modelName,
          tokensEstimate: Math.ceil(responseText.length / 4), // Rough estimate
          finishReason
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