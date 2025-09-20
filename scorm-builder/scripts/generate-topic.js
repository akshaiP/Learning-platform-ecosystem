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
        'core-functions.js',
        'quiz-system.js',
        'chat-system.js',
        'task-system.js'
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
    
    // Update task step images (NEW)
    if (topicConfig.content?.task_steps) {
      topicConfig.content.task_steps.forEach(step => {
        // Single image legacy
        if (step.image?.src) {
          const newPath = imageMap[step.image.src];
          if (newPath) {
            step.image.src = newPath;
          }
        }
        // Multiple images new
        if (Array.isArray(step.images)) {
          step.images.forEach(img => {
            if (img?.src) {
              const newPath = imageMap[img.src];
              if (newPath) img.src = newPath;
            }
          });
        }
        
        // Update hint images
        if (step.hint) {
          if (step.hint.image?.src) {
            const newPath = imageMap[step.hint.image.src];
            if (newPath) {
              step.hint.image.src = newPath;
            }
          }
          if (Array.isArray(step.hint.images)) {
            step.hint.images.forEach(img => {
              if (img?.src) {
                const newPath = imageMap[img.src];
                if (newPath) img.src = newPath;
              }
            });
          }
        }
      });
    }
    
    // Update quiz images (both legacy and new multi-question format)
    if (topicConfig.quiz) {
      // Legacy single question format
      if (topicConfig.quiz.explanation_image?.src) {
        const newPath = imageMap[topicConfig.quiz.explanation_image.src];
        if (newPath) {
          topicConfig.quiz.explanation_image.src = newPath;
        }
      }
      
      // New multi-question format
      if (topicConfig.quiz.questions && Array.isArray(topicConfig.quiz.questions)) {
        topicConfig.quiz.questions.forEach((question, index) => {
          if (question.explanation_image?.src) {
            const newPath = imageMap[question.explanation_image.src];
            if (newPath) {
              question.explanation_image.src = newPath;
            }
          }
        });
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
    if (!data.content.task_steps) data.content.task_steps = [];
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
    
    // Add stable indices to task steps for templating (Mustache has no @index)
    if (Array.isArray(data.content.task_steps)) {
      data.content.task_steps = data.content.task_steps.map((step, i) => {
        // Normalize images: allow either image (single) or images (array)
        let images = [];
        if (Array.isArray(step.images)) {
          images = step.images;
        } else if (step.image) {
          images = [step.image];
        }

        // Normalize hint images similarly
        let hint = step.hint;
        if (hint && typeof hint === 'object') {
          if (Array.isArray(hint.images)) {
            // If exactly one image is provided, also expose it as hint.image for the template
            if (hint.images.length === 1) {
              hint = { ...hint, image: hint.images[0] };
            }
          } else if (hint.image) {
            hint = { ...hint, images: [hint.image] };
          }
        }
        const imagesLength = Array.isArray(images) ? images.length : 0;
        const hintImagesLength = hint && Array.isArray(hint.images) ? hint.images.length : 0;

        return {
          _idx: i,
          displayIndex: i + 1,
          images,
          // Preserve single image for backward-compat template conditions
          image: images && images.length === 1 ? images[0] : undefined,
          ...step,
          hint,
          imagesLength,
          hintImagesLength,
          hasAnyImage: imagesLength > 0
        };
      });
    }

    data.learning_objectives.length = data.learning_objectives.length;
    data.content.concepts.length = data.content.concepts.length;
    data.content.hints.length = data.content.hints.length;
    data.content.task_images.length = data.content.task_images.length;
    data.content.task_requirements.length = data.content.task_requirements.length;
    data.content.task_steps.length = data.content.task_steps.length;
    
    // Safe stringify to avoid </script> prematurely closing the script tag
    const safeJson = (obj) => {
      const str = JSON.stringify(obj == null ? null : obj);
      return (str || '')
        .replace(/<\//g, '<\\/') // escape </script>, </style>, etc.
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
    };

    data.hintsJson = safeJson(data.content.hints || []);
    data.quizJson = data.quiz ? safeJson(data.quiz) : 'null';
    data.chatContextsJson = safeJson(data.chat_contexts || {});
    
    data.titleJson = safeJson(data.title || '');
    data.descriptionJson = safeJson(data.description || '');
    data.taskStatementJson = safeJson(data.content.task_statement || '');
    data.taskRequirementsJson = safeJson(data.content.task_requirements || []);
    data.learningObjectivesJson = safeJson(data.learning_objectives || []);
    data.taskStepsJson = safeJson(data.content.task_steps || []);
    
    // Add company branding data
    data.company = {
      name: 'Nebula KnowLab',
      logo: data.content.company_logo || null,
      colors: {
        primary: data.styling?.primaryColor || '#4A9B8E',
        secondary: data.styling?.secondaryColor || '#6B4C93'
      }
    };

    // Enhanced escape function for safe HTML data attributes (handles quotes, backslashes, newlines robustly)
    function escapeForHTMLAttribute(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')  // Escape ampersands first
        .replace(/"/g, '&quot;') // Escape double quotes for HTML attributes
        .replace(/'/g, '&#x27;') // Escape single quotes
        .replace(/</g, '&lt;')   // Escape less than
        .replace(/>/g, '&gt;')   // Escape greater than
        .replace(/\n/g, '&#10;') // Preserve newlines as HTML entities
        .replace(/\r/g, '&#13;') // Preserve carriage returns
        .replace(/\t/g, '&#9;')  // Preserve tabs
        .replace(/\u2028/g, '&#x2028;')  // Unicode line separator
        .replace(/\u2029/g, '&#x2029;'); // Unicode paragraph separator
    }

    // NEW: Apply escaping and add isLongCode boolean for condition
    if (Array.isArray(data.content.task_steps)) {
      data.content.task_steps = data.content.task_steps.map(step => {
        if (step.code && step.code.content) {
          step.escapedContent = escapeForHTMLAttribute(step.code.content);
          step.isLongCode = step.code.content.length > 100;  // LOWERED from 200 to 100
        }
        if (step.hint && step.hint.code && step.hint.code.content) {
          step.hint.escapedContent = escapeForHTMLAttribute(step.hint.code.content);
          step.hint.isLongCode = step.hint.code.content.length > 100;
        }
        // Precompute flags for template rendering
        step.hasMultipleImages = Array.isArray(step.images) && step.images.length > 1;
        if (step.hint && typeof step.hint === 'object') {
          step.hintHasMultipleImages = Array.isArray(step.hint.images) && step.hint.images.length > 1;
        }
        return step;
      });
      
      // MOVED: Console log AFTER the mapping is complete
      console.log('Escaped content for steps:', data.content.task_steps.map(s => s.escapedContent));
      
      // Additional debugging for each step
      data.content.task_steps.forEach((step, i) => {
        console.log(`Step ${i + 1}:`, {
          hasCode: !!step.code?.content,
          codeLength: step.code?.content?.length || 0,
          isLongCode: step.isLongCode,
          escapedLength: step.escapedContent?.length || 0
        });
      });
    }

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

    // Validate quiz structure if present (both legacy and new multi-question format)
    if (topicConfig.quiz) {
      // Check if it's the new multi-question format
      if (topicConfig.quiz.questions && Array.isArray(topicConfig.quiz.questions)) {
        // New multi-question format validation
        if (topicConfig.quiz.questions.length === 0) {
          // Make this a warning instead of error
          console.warn('⚠️ Quiz has no questions - quiz section will be hidden');
        } else {
          topicConfig.quiz.questions.forEach((question, index) => {
            if (!question.question) {
              throw new Error(`Quiz question ${index + 1} is missing the question text`);
            }
            if (!Array.isArray(question.options) || question.options.length < 2) {
              throw new Error(`Quiz question ${index + 1} must have at least 2 options`);
            }
            
            // Validate question type
            const questionType = question.type || 'mcq'; // Default to MCQ for backward compatibility
            if (!['mcq', 'checkbox'].includes(questionType)) {
              throw new Error(`Quiz question ${index + 1}: Invalid question type '${questionType}'. Must be 'mcq' or 'checkbox'`);
            }
            
            // Validate correct answers based on type
            if (questionType === 'mcq') {
              if (typeof question.correct_answer !== 'number' || 
                  question.correct_answer < 0 || 
                  question.correct_answer >= question.options.length) {
                throw new Error(`Quiz question ${index + 1} correct_answer must be a valid option index for MCQ`);
              }
            } else if (questionType === 'checkbox') {
              if (!Array.isArray(question.correct_answers) || question.correct_answers.length === 0) {
                throw new Error(`Quiz question ${index + 1}: Missing or empty correct_answers array for checkbox question`);
              } else {
                // Validate that all correct answer indices are valid
                const invalidIndices = question.correct_answers.filter(
                  answer => typeof answer !== 'number' || answer < 0 || answer >= question.options.length
                );
                if (invalidIndices.length > 0) {
                  throw new Error(`Quiz question ${index + 1}: Invalid correct_answers indices: ${invalidIndices.join(', ')}`);
                }
              }
            }
          });
        }
        
        // Validate quiz settings if present
        if (topicConfig.quiz.settings && topicConfig.quiz.questions.length > 0) {
          if (typeof topicConfig.quiz.settings.passing_score === 'number' && 
              (topicConfig.quiz.settings.passing_score < 0 || 
              topicConfig.quiz.settings.passing_score > topicConfig.quiz.questions.length)) {
            throw new Error('Quiz passing_score must be between 0 and total number of questions');
          }
        }
      } else {
        // Legacy single-question format validation
        if (!topicConfig.quiz.question) {
          console.warn('⚠️ Quiz question is missing - quiz section will be hidden');
        } else {
          if (!Array.isArray(topicConfig.quiz.options) || topicConfig.quiz.options.length < 2) {
            throw new Error('Quiz must have at least 2 options');
          }
          if (typeof topicConfig.quiz.correct_answer !== 'number' || 
              topicConfig.quiz.correct_answer < 0 || 
              topicConfig.quiz.correct_answer >= topicConfig.quiz.options.length) {
            throw new Error('Quiz correct_answer must be a valid option index');
          }
        }
      }
    } else {
      console.log('ℹ️ No quiz defined - quiz section will be hidden');
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

      // Validate task steps structure (UPDATED for object-based code and hint.code)
      if (topicConfig.content.task_steps) {
        if (!Array.isArray(topicConfig.content.task_steps)) {
          throw new Error('task_steps must be an array');
        }
        
        topicConfig.content.task_steps.forEach((step, index) => {
          if (!step.title) {
            throw new Error(`task_steps[${index}] missing title`);
          }
          if (!step.instructions) {
            throw new Error(`task_steps[${index}] missing instructions`);
          }
          
          // Validate step image(s) if present
          if (step.image) {
            if (!step.image.src) {
              throw new Error(`task_steps[${index}].image missing src`);
            }
            if (!step.image.alt) {
              console.warn(`task_steps[${index}].image missing alt text for accessibility`);
            }
          }
          if (Array.isArray(step.images)) {
            step.images.forEach((img, imgIdx) => {
              if (!img.src) throw new Error(`task_steps[${index}].images[${imgIdx}] missing src`);
              if (!img.alt) console.warn(`task_steps[${index}].images[${imgIdx}] missing alt text for accessibility`);
            });
          }
          
          // Validate code if present (now supports string or object)
          if (step.code) {
            if (typeof step.code === 'string') {
              // Legacy format: acceptable
            } else if (typeof step.code === 'object' && step.code !== null) {
              if (typeof step.code.content !== 'string') {
                throw new Error(`task_steps[${index}].code.content must be a string`);
              }
              if (step.code.language && typeof step.code.language !== 'string') {
                throw new Error(`task_steps[${index}].code.language must be a string`);
              }
            } else {
              throw new Error(`task_steps[${index}].code must be a string or an object with "content" (string) and optional "language" (string)`);
            }
          }
          
          // Validate hint if present
          if (step.hint) {
            if (typeof step.hint === 'string') {
              // Legacy string format is acceptable
              return;
            }
            
            if (typeof step.hint === 'object') {
              if (!step.hint.text) {
                throw new Error(`task_steps[${index}].hint missing text property`);
              }
              
              // Validate hint image(s) if present
              if (step.hint.image) {
                if (!step.hint.image.src) {
                  throw new Error(`task_steps[${index}].hint.image missing src`);
                }
                if (!step.hint.image.alt) {
                  console.warn(`task_steps[${index}].hint.image missing alt text for accessibility`);
                }
              }
              if (Array.isArray(step.hint.images)) {
                step.hint.images.forEach((img, imgIdx) => {
                  if (!img.src) throw new Error(`task_steps[${index}].hint.images[${imgIdx}] missing src`);
                  if (!img.alt) console.warn(`task_steps[${index}].hint.images[${imgIdx}] missing alt text for accessibility`);
                });
              }
              
              // Validate hint code if present (now supports string or object)
              if (step.hint.code) {
                if (typeof step.hint.code === 'string') {
                  // Legacy format: acceptable
                } else if (typeof step.hint.code === 'object' && step.hint.code !== null) {
                  if (typeof step.hint.code.content !== 'string') {
                    throw new Error(`task_steps[${index}].hint.code.content must be a string`);
                  }
                  if (step.hint.code.language && typeof step.hint.code.language !== 'string') {
                    throw new Error(`task_steps[${index}].hint.code.language must be a string`);
                  }
                } else {
                  throw new Error(`task_steps[${index}].hint.code must be a string or an object with "content" (string) and optional "language" (string)`);
                }
              }
            } else {
              throw new Error(`task_steps[${index}].hint must be a string or object`);
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