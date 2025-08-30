const Mustache = require('mustache');
const fs = require('fs-extra');
const path = require('path');

class ManifestGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/imsmanifest-template.xml');
  }

  async generateManifest(topicConfig, config) {
    try {
      // Load manifest template
      const template = await fs.readFile(this.templatePath, 'utf8');
      
      // Prepare manifest data
      const manifestData = this.prepareManifestData(topicConfig, config);
      
      // Render manifest
      const renderedManifest = Mustache.render(template, manifestData);
      
      // Validate XML structure (basic check)
      this.validateManifest(renderedManifest);
      
      return renderedManifest;
      
    } catch (error) {
      throw new Error(`Failed to generate manifest: ${error.message}`);
    }
  }

  prepareManifestData(topicConfig, config) {
    const data = {
      // Basic identifiers
      id: topicConfig.id,
      title: topicConfig.title,
      description: topicConfig.description,
      
      // Build information
      build_time: topicConfig.buildTime || new Date().toISOString(),
      backend_url: topicConfig.backendUrl || config.backendUrl,
      
      // Technical metadata
      estimated_size: this.calculateEstimatedSize(topicConfig),
      difficulty_level: topicConfig.difficulty_level || 'medium',
      estimated_duration: topicConfig.estimated_duration || 'PT30M',
      
      // File list
      additional_files: this.getAdditionalFiles(topicConfig),
      
      // Learning metadata
      keywords: this.generateKeywords(topicConfig),
      learning_resource_type: topicConfig.learning_resource_type || 'exercise'
    };

    return data;
  }

  calculateEstimatedSize(topicConfig) {
    // Rough estimation based on content complexity
    let size = 50000; // Base HTML + CSS size
    
    if (topicConfig.content) {
      // Add estimates for different content types
      if (topicConfig.content.concepts) {
        size += topicConfig.content.concepts.length * 1000;
      }
      if (topicConfig.content.hints) {
        size += topicConfig.content.hints.length * 500;
      }
      if (topicConfig.quiz) {
        size += 2000;
      }
    }
    
    return size.toString();
  }

  generateKeywords(topicConfig) {
    const keywords = ['interactive', 'chat-enabled', 'scorm-2004'];
    
    // Add topic-specific keywords
    if (topicConfig.keywords) {
      keywords.push(...topicConfig.keywords);
    }
    
    // Extract keywords from title and description
    const titleWords = topicConfig.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    keywords.push(...titleWords.slice(0, 3));
    
    return keywords.join(', ');
  }

  getAdditionalFiles(topicConfig) {
    const files = [];
    
    // Add any custom assets
    if (topicConfig.assets) {
      files.push(...topicConfig.assets);
    }
    
    return files.length > 0 ? files : null;
  }

  validateManifest(manifest) {
    // Basic XML validation
    const requiredElements = [
      '<manifest',
      '<organizations',
      '<resources',
      '</manifest>'
    ];

    for (const element of requiredElements) {
      if (!manifest.includes(element)) {
        throw new Error(`Invalid manifest: missing ${element}`);
      }
    }

    // Check for malformed XML (basic)
    const openTags = (manifest.match(/</g) || []).length;
    const closeTags = (manifest.match(/>/g) || []).length;
    
    if (openTags !== closeTags) {
      console.warn('Potential XML malformation detected in manifest');
    }

    return true;
  }
}

module.exports = async function createManifest(topicConfig, config) {
  const generator = new ManifestGenerator();
  return await generator.generateManifest(topicConfig, config);
};