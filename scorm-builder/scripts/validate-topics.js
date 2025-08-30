const Joi = require('joi');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Topic configuration schema
const topicSchema = Joi.object({
  id: Joi.string().required().pattern(/^[a-z0-9-]+$/),
  title: Joi.string().required().min(5).max(100),
  description: Joi.string().required().min(10).max(500),
  keywords: Joi.array().items(Joi.string()).optional(),
  
  learning_objectives: Joi.array().items(Joi.string()).min(1).required(),
  difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
  estimated_duration: Joi.string().pattern(/^PT\d+[HM]$/).default('PT30M'),
  
  content: Joi.object({
    task_statement: Joi.string().required(),
    task_requirements: Joi.array().items(Joi.string()).optional(),
    concepts: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        summary: Joi.string().required(),
        learn_more_context: Joi.string().required()
      })
    ).min(1).required(),
    hints: Joi.array().items(Joi.string()).min(1).required(),
    practice: Joi.object({
      description: Joi.string().required()
    }).optional()
  }).required(),
  
  quiz: Joi.object({
    question: Joi.string().required(),
    options: Joi.array().items(Joi.string()).min(2).max(6).required(),
    correct_answer: Joi.number().integer().min(0).required(),
    explanation: Joi.string().optional()
  }).optional(),
  
  chat_contexts: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  styling: Joi.object().optional()
});

async function validateTopics(topicsDir = path.join(__dirname, '../topics')) {
  console.log(chalk.blue('🔍 Validating topic configurations...\n'));
  
  try {
    const topicFiles = await fs.readdir(topicsDir);
    const jsonFiles = topicFiles.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No topic files found in topics directory'));
      return;
    }
    
    let validCount = 0;
    let errorCount = 0;
    
    for (const file of jsonFiles) {
      const topicId = path.basename(file, '.json');
      console.log(chalk.gray(`Validating ${file}...`));
      
      try {
        // Read and parse JSON
        const filePath = path.join(topicsDir, file);
        const topicData = await fs.readJson(filePath);
        
        // Validate against schema
        const { error, value } = topicSchema.validate(topicData, { 
          abortEarly: false,
          allowUnknown: false
        });
        
        if (error) {
          console.log(chalk.red(`  ✗ ${file}: Validation failed`));
          error.details.forEach(detail => {
            console.log(chalk.red(`    - ${detail.message}`));
          });
          errorCount++;
        } else {
          // Additional custom validations
          const customErrors = validateCustomRules(value);
          
          if (customErrors.length > 0) {
            console.log(chalk.red(`  ✗ ${file}: Custom validation failed`));
            customErrors.forEach(error => {
              console.log(chalk.red(`    - ${error}`));
            });
            errorCount++;
          } else {
            console.log(chalk.green(`  ✓ ${file}: Valid`));
            validCount++;
          }
        }
        
      } catch (error) {
        console.log(chalk.red(`  ✗ ${file}: ${error.message}`));
        errorCount++;
      }
      
      console.log('');
    }
    
    // Summary
    console.log(chalk.blue('📊 Validation Summary:'));
    console.log(chalk.green(`  ✓ Valid topics: ${validCount}`));
    if (errorCount > 0) {
      console.log(chalk.red(`  ✗ Invalid topics: ${errorCount}`));
      process.exit(1);
    } else {
      console.log(chalk.green('  🎉 All topics are valid!'));
    }
    
  } catch (error) {
    console.error(chalk.red(`Validation failed: ${error.message}`));
    process.exit(1);
  }
}

function validateCustomRules(topic) {
  const errors = [];
  
  // Check ID matches filename convention
  if (topic.id !== topic.id.toLowerCase()) {
    errors.push('ID must be lowercase');
  }
  
  // Validate quiz correct_answer is within options range
  if (topic.quiz) {
    if (topic.quiz.correct_answer >= topic.quiz.options.length) {
      errors.push('Quiz correct_answer index is out of range');
    }
  }
  
  // Validate chat contexts reference existing concepts
  if (topic.content.concepts) {
    const conceptContexts = topic.content.concepts.map(c => c.learn_more_context);
    const chatContextKeys = Object.keys(topic.chat_contexts);
    
    for (const context of conceptContexts) {
      if (!chatContextKeys.includes(context)) {
        errors.push(`Concept references undefined chat context: ${context}`);
      }
    }
  }
  
  // Validate learning objectives count
  if (topic.learning_objectives.length > 8) {
    errors.push('Too many learning objectives (max 8 recommended)');
  }
  
  return errors;
}

// Run validation if called directly
if (require.main === module) {
  const topicsDir = process.argv[2] || path.join(__dirname, '../topics');
  validateTopics(topicsDir).catch(console.error);
}

module.exports = { validateTopics, topicSchema };