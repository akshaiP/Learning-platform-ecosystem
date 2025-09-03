//scorm-builder/scripts/generate-topic.js
const Mustache = require('mustache');
const fs = require('fs-extra');
const path = require('path');
const AssetProcessor = require('./process-assets');

class TopicGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/topic-template.html');
    this.assetProcessor = new AssetProcessor();
  }

  async generateHTML(topicConfig, config, tempDir) {
    try {
      // Load HTML template
      const template = await fs.readFile(this.templatePath, 'utf8');
    
      // Process assets first
      const topicDir = path.join(__dirname, '../topics', topicConfig.id);
      if (await fs.pathExists(topicDir)) {
        const processedImages = await this.assetProcessor.processTopicAssets(topicConfig, topicDir, tempDir);
        
        // Update image paths in config to match processed locations
        this.updateImagePaths(topicConfig, processedImages);
      }
      
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

  updateImagePaths(topicConfig, processedImages) {
    // Create a mapping of original src to processed filename
    const imageMap = {};
    processedImages.forEach(img => {
      const originalSrc = img.original.src;
      imageMap[originalSrc] = `assets/images/${img.filename}`;
    });
    
    // Update hero image
    if (topicConfig.content?.hero_image?.src) {
      const newPath = imageMap[topicConfig.content.hero_image.src];
      if (newPath) {
        topicConfig.content.hero_image.src = newPath;
      }
    }
    
    // Update task images
    if (topicConfig.content?.task_images) {
      topicConfig.content.task_images.forEach(img => {
        const newPath = imageMap[img.src];
        if (newPath) {
          img.src = newPath;
        }
      });
    }
    
    // Update concept images
    if (topicConfig.content?.concepts) {
      topicConfig.content.concepts.forEach(concept => {
        if (concept.image?.src) {
          const newPath = imageMap[concept.image.src];
          if (newPath) {
            concept.image.src = newPath;
          }
        }
      });
    }
    
    // Update quiz image
    if (topicConfig.quiz?.explanation_image?.src) {
      const newPath = imageMap[topicConfig.quiz.explanation_image.src];
      if (newPath) {
        topicConfig.quiz.explanation_image.src = newPath;
      }
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
    if (!data.content.task_images) data.content.task_images = [];
    if (!data.content.task_requirements) data.content.task_requirements = [];
    if (!data.learning_objectives) data.learning_objectives = [];
    if (!data.chat_contexts) data.chat_contexts = {};
    
    // Add array length properties for Mustache conditional rendering
    data.learning_objectives.length = data.learning_objectives.length;
    data.content.concepts.length = data.content.concepts.length;
    data.content.hints.length = data.content.hints.length;
    data.content.task_images.length = data.content.task_images.length;
    data.content.task_requirements.length = data.content.task_requirements.length;
    
    // Create properly escaped JSON strings for template injection
    data.hintsJson = JSON.stringify(data.content.hints || []);
    data.quizJson = data.quiz ? JSON.stringify(data.quiz) : 'null';
    data.chatContextsJson = JSON.stringify(data.chat_contexts || {});
    
    // Add company branding data
    data.company = {
      name: 'Nebula KnowLab',
      logo: data.company?.logo || null,
      colors: {
        primary: data.styling?.primaryColor || '#4A9B8E',
        secondary: data.styling?.secondaryColor || '#6B4C93'
      }
    };
  
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

  // Simplified CSS generation - now just returns minimal custom CSS
  async generateStyles(topicConfig, config) {
    try {
      let customStyles = `/* Custom styles for ${topicConfig.title} */\n`;
      
      // Add topic-specific customizations if needed
      if (topicConfig.styling) {
        if (topicConfig.styling.primaryColor) {
          customStyles += `:root { 
            --nebula-primary: ${topicConfig.styling.primaryColor}; 
          }\n`;
        }
        if (topicConfig.styling.secondaryColor) {
          customStyles += `:root { 
            --nebula-secondary: ${topicConfig.styling.secondaryColor}; 
          }\n`;
        }
      }
      
      // Add any custom CSS overrides if needed
      customStyles += `
/* Print styles */
@media print {
  .fixed, .sticky { position: static !important; }
  .shadow-lg, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
}

/* Enhanced focus styles for accessibility */
.focus\\:ring-2:focus {
  outline: 2px solid #4A9B8E;
  outline-offset: 2px;
}
      `;
      
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

    // Enhanced validation for new template structure
    this.validateContentStructure(topicConfig);

    // Validate image assets
    const topicDir = path.join(__dirname, '../topics', topicConfig.id);
    if (fs.pathExistsSync(topicDir)) {
      const validation = this.assetProcessor.validateImageAssets(topicConfig, topicDir);
      if (!validation.valid) {
        console.warn(`⚠️ Image validation warnings for ${topicConfig.id}:`);
        if (validation.missing.length > 0) {
          console.warn(`Missing images: ${validation.missing.join(', ')}`);
        }
        if (validation.invalid.length > 0) {
          console.warn(`Invalid image types: ${validation.invalid.join(', ')}`);
        }
      }
    }

    return true;
  }

  validateContentStructure(topicConfig) {
    // Validate content structure for new template
    if (topicConfig.content) {
      // Validate task images structure
      if (topicConfig.content.task_images) {
        if (!Array.isArray(topicConfig.content.task_images)) {
          throw new Error('task_images must be an array');
        }
        
        topicConfig.content.task_images.forEach((img, index) => {
          if (!img.src) {
            throw new Error(`task_images[${index}] missing src`);
          }
          if (!img.alt) {
            console.warn(`task_images[${index}] missing alt text for accessibility`);
          }
        });
      }

      // Validate concepts structure
      if (topicConfig.content.concepts) {
        if (!Array.isArray(topicConfig.content.concepts)) {
          throw new Error('concepts must be an array');
        }
        
        topicConfig.content.concepts.forEach((concept, index) => {
          if (!concept.title) {
            throw new Error(`concepts[${index}] missing title`);
          }
          if (!concept.summary) {
            throw new Error(`concepts[${index}] missing summary`);
          }
          if (!concept.learn_more_context) {
            console.warn(`concepts[${index}] missing learn_more_context for chat integration`);
          }
        });
      }

      // Validate hero image structure
      if (topicConfig.content.hero_image) {
        if (!topicConfig.content.hero_image.src) {
          throw new Error('hero_image missing src');
        }
        if (!topicConfig.content.hero_image.alt) {
          console.warn('hero_image missing alt text for accessibility');
        }
      }
    }
  }
}

module.exports = async function generateTopic(topicConfig, config, tempDir) {
  const generator = new TopicGenerator();
  
  console.log(`🚀 Generating topic: ${topicConfig.title}`);
  
  // Validate configuration
  generator.validateTopicConfig(topicConfig);
  console.log('✅ Topic configuration validated');
  
  // Generate HTML and minimal CSS
  const html = await generator.generateHTML(topicConfig, config, tempDir);
  console.log('✅ HTML generated with Tailwind CSS');
  
  const css = await generator.generateStyles(topicConfig, config);
  console.log('✅ Custom styles generated');
  
  return {
    html,
    css,
    metadata: {
      topicId: topicConfig.id,
      title: topicConfig.title,
      buildTime: topicConfig.buildTime || new Date().toISOString(),
      backendUrl: topicConfig.backendUrl || config.backendUrl,
      template: 'tailwind-modern',
      company: 'Nebula KnowLab'
    }
  };
};