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

      // Copy core JS files to temp directory
      await this.copyJSFiles(tempDir);
    
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

  async copyJSFiles(tempDir) {
    const jsFiles = [
        'scorm-api.js',
        'chat-integration.js', 
        'core-functions.js'
    ];
    
    for (const jsFile of jsFiles) {
        const sourcePath = path.join(__dirname, '../templates', jsFile);
        const destPath = path.join(tempDir, jsFile);
        
        if (await fs.pathExists(sourcePath)) {
            await fs.copy(sourcePath, destPath);
            console.log(`✅ Copied ${jsFile}`);
        }
    }
  }

  updateImagePaths(topicConfig, processedImages) {
    // Create a mapping of original src to processed filename
    const imageMap = {};
    processedImages.forEach(img => {
      const originalSrc = img.original.src;
      imageMap[originalSrc] = `assets/images/${img.filename}`;
    });
    
    // Update company logo
    if (topicConfig.content?.company_logo?.src) {
      const newPath = imageMap[topicConfig.content.company_logo.src];
      if (newPath) {
        topicConfig.content.company_logo.src = newPath;
      }
    }
    
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
    
    // Update hint step images (NEW)
    if (topicConfig.content?.hints) {
      topicConfig.content.hints.forEach(hint => {
        if (hint.step_image?.src) {
          const newPath = imageMap[hint.step_image.src];
          if (newPath) {
            hint.step_image.src = newPath;
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
    
    if (!data.content) data.content = {};
    if (!data.content.concepts) data.content.concepts = [];
    if (!data.content.hints) data.content.hints = [];
    if (!data.content.task_images) data.content.task_images = [];
    if (!data.content.task_requirements) data.content.task_requirements = [];
    if (!data.learning_objectives) data.learning_objectives = [];
    if (!data.chat_contexts) data.chat_contexts = {};
    
    if (Array.isArray(data.content.hints)) {
      data.content.hints = data.content.hints.map((hint, index) => {
        if (typeof hint === 'string') {
          return {
            text: hint,
            step_image: null
          };
        }
        return hint;
      });
    }
    
    if (!data.content.task_statement && data.task_statement) {
      data.content.task_statement = data.task_statement;
    }
    
    data.learning_objectives.length = data.learning_objectives.length;
    data.content.concepts.length = data.content.concepts.length;
    data.content.hints.length = data.content.hints.length;
    data.content.task_images.length = data.content.task_images.length;
    data.content.task_requirements.length = data.content.task_requirements.length;
    
    data.hintsJson = JSON.stringify(data.content.hints || []);
    data.quizJson = data.quiz ? JSON.stringify(data.quiz) : 'null';
    data.chatContextsJson = JSON.stringify(data.chat_contexts || {});
    
    data.titleJson = JSON.stringify(data.title || '');
    data.descriptionJson = JSON.stringify(data.description || '');
    data.taskStatementJson = JSON.stringify(data.content.task_statement || '');
    data.taskRequirementsJson = JSON.stringify(data.content.task_requirements || []);
    data.learningObjectivesJson = JSON.stringify(data.learning_objectives || []);
    
    // Add company branding data
    data.company = {
      name: 'Nebula KnowLab',
      logo: data.content.company_logo || null,
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

  // Enhanced CSS generation with comprehensive hint system styles
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
      
      // Add comprehensive task-based learning and hint system styles
      customStyles += `
/* ===== TASK-BASED LEARNING TEMPLATE STYLES ===== */

/* Custom hint card animations */
.hint-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.hint-card.revealed {
  animation: hintReveal 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Progress bar animation */
#hintsProgressBar {
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Button hover effects */
.hint-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.hint-button:hover {
  transform: translateY(-1px);
}

.hint-button:active {
  transform: translateY(0);
}

/* Smooth reveal animation for hint content */
.hint-content {
  transition: all 0.4s ease-out;
}

/* Custom scrollbar for hints container */
#hintsContainer::-webkit-scrollbar {
  width: 6px;
}

#hintsContainer::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

#hintsContainer::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

#hintsContainer::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Focus states for accessibility */
.hint-button:focus {
  outline: 2px solid #f59e0b;
  outline-offset: 2px;
}

/* Loading state for hint reveal */
.hint-loading {
  position: relative;
  overflow: hidden;
}

.hint-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}

/* Custom animations */
@keyframes hintReveal {
  0% { transform: translateY(20px) scale(0.95); opacity: 0; }
  50% { transform: translateY(-5px) scale(1.02); opacity: 0.8; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes slideInUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

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

/* Chat integration styles */
.chat-trigger {
  z-index: 1000;
}

/* Responsive adjustments for task-based layout */
@media (max-width: 768px) {
  .task-hero {
    padding: 1rem;
  }
  
  .hint-card {
    margin-bottom: 0.5rem;
  }
}

/* Mobile-specific hint card adjustments */
@media (max-width: 640px) {
  .hint-card {
    padding: 1rem;
  }
  
  .hint-card .absolute.-top-3.-left-3 {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.75rem;
  }
}

/* ===== END TASK-BASED LEARNING STYLES ===== */
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
    // Validate content structure for task-based learning template
    if (topicConfig.content) {
      
      // Validate task statement
      if (!topicConfig.content.task_statement && !topicConfig.task_statement) {
        console.warn('No task_statement found - task-based learning requires a clear task statement');
      }
      
      // Validate company logo structure
      if (topicConfig.content.company_logo) {
        if (typeof topicConfig.content.company_logo === 'object' && !topicConfig.content.company_logo.src) {
          console.warn('company_logo object missing src property');
        }
      }
      
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

      // Validate enhanced hints structure with step images
      if (topicConfig.content.hints) {
        if (!Array.isArray(topicConfig.content.hints)) {
          throw new Error('hints must be an array');
        }
        
        topicConfig.content.hints.forEach((hint, index) => {
          if (typeof hint === 'string') {
            // Legacy string format is acceptable
            return;
          }
          
          if (typeof hint === 'object') {
            if (!hint.text) {
              throw new Error(`hints[${index}] missing text property`);
            }
            
            // Validate step image if present
            if (hint.step_image) {
              if (!hint.step_image.src) {
                throw new Error(`hints[${index}].step_image missing src`);
              }
              if (!hint.step_image.alt) {
                console.warn(`hints[${index}].step_image missing alt text for accessibility`);
              }
            }
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
      
      // Validate task requirements
      if (topicConfig.content.task_requirements) {
        if (!Array.isArray(topicConfig.content.task_requirements)) {
          throw new Error('task_requirements must be an array');
        }
        
        if (topicConfig.content.task_requirements.length === 0) {
          console.warn('task_requirements is empty - consider adding specific requirements for better learning outcomes');
        }
      }
    }
    
    // Validate chat contexts for task-based learning
    if (topicConfig.chat_contexts) {
      const recommendedContexts = ['task_help', 'hints_exhausted', 'quiz_failed', 'learn_more'];
      const missingContexts = recommendedContexts.filter(context => !topicConfig.chat_contexts[context]);
      
      if (missingContexts.length > 0) {
        console.warn(`Missing recommended chat contexts for task-based learning: ${missingContexts.join(', ')}`);
      }
    }
  }
}

module.exports = async function generateTopic(topicConfig, config, tempDir) {
  const generator = new TopicGenerator();
  
  console.log(`🚀 Generating task-based learning topic: ${topicConfig.title}`);
  
  // Validate configuration
  generator.validateTopicConfig(topicConfig);
  console.log('✅ Topic configuration validated for task-based learning');
  
  // Generate HTML and enhanced CSS
  const html = await generator.generateHTML(topicConfig, config, tempDir);
  console.log('✅ Task-based learning HTML generated with Tailwind CSS');
  
  const css = await generator.generateStyles(topicConfig, config);
  console.log('✅ Custom styles generated for task-based learning');
  
  return {
    html,
    css,
    metadata: {
      topicId: topicConfig.id,
      title: topicConfig.title,
      buildTime: topicConfig.buildTime || new Date().toISOString(),
      backendUrl: topicConfig.backendUrl || config.backendUrl,
      template: 'task-based-learning',
      company: 'Nebula KnowLab',
      templateVersion: '2.0'
    }
  };
};