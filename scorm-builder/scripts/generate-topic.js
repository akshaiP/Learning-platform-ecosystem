const Mustache = require('mustache');
const fs = require('fs-extra');
const path = require('path');

class TopicGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/topic-template.html');
    this.stylesPath = path.join(__dirname, '../templates/styles/topic-styles.css');
  }

  async generateHTML(topicConfig, config) {
    try {
      // Load HTML template
      const template = await fs.readFile(this.templatePath, 'utf8');
      
      // Prepare template data with proper JSON serialization
      const templateData = this.prepareTemplateData(topicConfig, config);
      
      // Register custom Mustache helpers
      this.registerMustacheHelpers();
      
      // Render template
      const renderedHTML = Mustache.render(template, templateData);
      
      return renderedHTML;
      
    } catch (error) {
      throw new Error(`Failed to generate HTML: ${error.message}`);
    }
  }

  prepareTemplateData(topicConfig, config) {
    // Create a deep copy to avoid modifying original
    const data = JSON.parse(JSON.stringify(topicConfig));
    
    // Add build-time data
    data.build_time = topicConfig.buildTime || new Date().toISOString();
    data.backend_url = topicConfig.backendUrl || config.backendUrl;
    data.is_dev = config.isDev;
    
    // Ensure required nested objects exist with proper defaults
    if (!data.content) data.content = {};
    if (!data.content.concepts) data.content.concepts = [];
    if (!data.content.hints) data.content.hints = [];
    if (!data.learning_objectives) data.learning_objectives = [];
    if (!data.chat_contexts) data.chat_contexts = {};
    
    // Create properly escaped JSON strings for template injection
    data.hintsJson = JSON.stringify(data.content.hints || []);
    data.quizJson = data.quiz ? JSON.stringify(data.quiz) : 'null';
    data.chatContextsJson = JSON.stringify(data.chat_contexts || {});
  
    return data;
  }  

  registerMustacheHelpers() {
    // Custom escape function for JSON data
    Mustache.escape = function(text) {
      if (typeof text !== 'string') {
        return text;
      }
      return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    };
  }

  async generateStyles(topicConfig, config) {
    try {
      // For now, just copy the base styles
      const styles = await fs.readFile(this.stylesPath, 'utf8');
      
      // Add topic-specific customizations
      let customStyles = styles;
      
      if (topicConfig.styling) {
        if (topicConfig.styling.primaryColor) {
          customStyles += `\n:root { --primary-color: ${topicConfig.styling.primaryColor}; }`;
        }
      }
      
      return customStyles;
      
    } catch (error) {
      throw new Error(`Failed to generate styles: ${error.message}`);
    }
  }

  validateTopicConfig(topicConfig) {
    const required = ['id', 'title', 'description'];
    const missing = required.filter(field => !topicConfig[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate quiz structure if present
    if (topicConfig.quiz) {
      if (!topicConfig.quiz.question) {
        throw new Error('Quiz question is required');
      }
      if (!Array.isArray(topicConfig.quiz.options) || topicConfig.quiz.options.length < 2) {
        throw new Error('Quiz must have at least 2 options');
      }
      if (typeof topicConfig.quiz.correct_answer !== 'number' || 
          topicConfig.quiz.correct_answer < 0 || 
          topicConfig.quiz.correct_answer >= topicConfig.quiz.options.length) {
        throw new Error('Quiz correct_answer must be a valid option index');
      }
    }

    return true;
  }
}

module.exports = async function generateTopic(topicConfig, config) {
  const generator = new TopicGenerator();
  
  // Validate configuration
  generator.validateTopicConfig(topicConfig);
  
  // Generate HTML and CSS
  const html = await generator.generateHTML(topicConfig, config);
  const css = await generator.generateStyles(topicConfig, config);
  
  return {
    html,
    css,
    metadata: {
      topicId: topicConfig.id,
      title: topicConfig.title,
      buildTime: topicConfig.buildTime,
      backendUrl: topicConfig.backendUrl
    }
  };
};