const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class TopicValidator {
  constructor() {
    this.topicsDir = path.join(__dirname, '../topics');
  }

  async validateAllTopics() {
    console.log(chalk.blue('🔍 Validating topic configurations...'));
    
    try {
      // Check if topics directory exists
      if (!await fs.pathExists(this.topicsDir)) {
        throw new Error('Topics directory not found');
      }

      // Find all topics (both folder and file structure)
      const topics = await this.findAllTopics();
      
      if (topics.length === 0) {
        console.log(chalk.yellow('⚠️  No topic configurations found'));
        return { valid: true, topics: [], warnings: ['No topics to validate'] };
      }

      console.log(chalk.blue(`📚 Found ${topics.length} topics to validate`));

      // Validate each topic
      const results = [];
      for (const topic of topics) {
        try {
          const result = await this.validateTopic(topic);
          results.push(result);
          
          if (result.valid) {
            console.log(chalk.green('✅'), `${topic.id} - Valid`);
          } else {
            console.log(chalk.red('❌'), `${topic.id} - Invalid`);
            result.errors.forEach(error => 
              console.log(chalk.red('   →'), error)
            );
          }
          
          if (result.warnings.length > 0) {
            result.warnings.forEach(warning =>
              console.log(chalk.yellow('   ⚠️'), warning)
            );
          }
          
        } catch (error) {
          console.log(chalk.red('❌'), `${topic.id} - Validation failed: ${error.message}`);
          results.push({
            id: topic.id,
            valid: false,
            errors: [error.message],
            warnings: []
          });
        }
      }

      const validTopics = results.filter(r => r.valid);
      const invalidTopics = results.filter(r => !r.valid);

      console.log(chalk.blue('\n📊 Validation Summary:'));
      console.log(chalk.green(`✅ Valid topics: ${validTopics.length}`));
      if (invalidTopics.length > 0) {
        console.log(chalk.red(`❌ Invalid topics: ${invalidTopics.length}`));
      }

      return {
        valid: invalidTopics.length === 0,
        topics: results,
        warnings: []
      };

    } catch (error) {
      console.log(chalk.red('❌ Validation failed:'), error.message);
      return {
        valid: false,
        topics: [],
        errors: [error.message]
      };
    }
  }

  async findAllTopics() {
    const items = await fs.readdir(this.topicsDir);
    const topics = [];

    for (const item of items) {
      const itemPath = path.join(this.topicsDir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        // Check for config.json in folder
        const configPath = path.join(itemPath, 'config.json');
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJson(configPath);
          topics.push({
            id: item,
            type: 'folder',
            configPath: configPath,
            config: config
          });
        }
      } else if (item.endsWith('.json')) {
        // Old structure - direct JSON files
        const config = await fs.readJson(itemPath);
        topics.push({
          id: path.basename(item, '.json'),
          type: 'file',
          configPath: itemPath,
          config: config
        });
      }
    }

    return topics;
  }

  async validateTopic(topic) {
    const errors = [];
    const warnings = [];
    const { config } = topic;

    // Required fields validation
    const requiredFields = ['title', 'description'];
    for (const field of requiredFields) {
      if (!config[field] || config[field].trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Content validation
    if (!config.content) {
      warnings.push('No content section defined');
    } else {
      // Validate task statement
      if (!config.content.task_statement) {
        warnings.push('No task statement defined');
      }

      // Validate concepts
      if (config.content.concepts && Array.isArray(config.content.concepts)) {
        config.content.concepts.forEach((concept, index) => {
          if (!concept.title) {
            errors.push(`Concept ${index + 1}: Missing title`);
          }
          if (!concept.summary) {
            warnings.push(`Concept ${index + 1}: Missing summary`);
          }
        });
      }

      // Validate images (if folder structure)
      if (topic.type === 'folder') {
        const imagesDir = path.join(path.dirname(topic.configPath), 'images');
        if (await fs.pathExists(imagesDir)) {
          const imageValidation = await this.validateImages(config, imagesDir);
          errors.push(...imageValidation.errors);
          warnings.push(...imageValidation.warnings);
        }
      }
    }

    // Quiz validation
    if (config.quiz) {
      if (!config.quiz.question) {
        errors.push('Quiz: Missing question');
      }
      if (!Array.isArray(config.quiz.options) || config.quiz.options.length < 2) {
        errors.push('Quiz: Must have at least 2 options');
      }
      if (typeof config.quiz.correct_answer !== 'number' || 
          config.quiz.correct_answer < 0 || 
          (config.quiz.options && config.quiz.correct_answer >= config.quiz.options.length)) {
        errors.push('Quiz: Invalid correct_answer index');
      }
    }

    return {
      id: topic.id,
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateImages(config, imagesDir) {
    const errors = [];
    const warnings = [];
    const imageRefs = this.extractImageReferences(config);

    for (const imageRef of imageRefs) {
      const imagePath = imageRef.src.replace('assets/images/', '');
      const fullImagePath = path.join(imagesDir, imagePath);
      
      if (!await fs.pathExists(fullImagePath)) {
        warnings.push(`Image not found: ${imagePath}`);
      }
    }

    return { errors, warnings };
  }

  extractImageReferences(config) {
    const images = [];
    
    const addImage = (imageObj) => {
      if (imageObj && imageObj.src) {
        images.push(imageObj);
      }
    };

    // Extract all image references
    if (config.content) {
      if (config.content.hero_image) addImage(config.content.hero_image);
      if (config.content.task_images) config.content.task_images.forEach(addImage);
      if (config.content.concepts) {
        config.content.concepts.forEach(concept => {
          if (concept.image) addImage(concept.image);
        });
      }
    }
    
    if (config.quiz && config.quiz.explanation_image) {
      addImage(config.quiz.explanation_image);
    }

    return images;
  }
}

// ✅ PROPERLY DEFINE AND EXPORT THE FUNCTION
async function validateTopics() {
  const validator = new TopicValidator();
  return await validator.validateAllTopics();
}

module.exports = validateTopics;

// ✅ CORRECTED FUNCTION CALL
if (require.main === module) {
  validateTopics()
    .then(result => {
      if (!result.valid) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}