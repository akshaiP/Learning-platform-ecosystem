//scorm-builder/scripts/process-assets.js
const fs = require('fs-extra');
const path = require('path');

class AssetProcessor {
  constructor() {
    this.supportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    this.maxImageSize = 5 * 1024 * 1024; // 5MB limit
    this.optimizedSizes = {
      hero: { width: 1200, height: 675 }, // 16:9 aspect ratio
      task: { width: 600, height: 400 },
      concept: { width: 400, height: 300 },
      quiz: { width: 800, height: 600 }
    };
  }

  async processTopicAssets(topicConfig, topicDir, tempDir) {
    console.log('🖼️ Processing topic assets for modern template...');
    
    try {
      // Create assets directory in temp
      const assetsDir = path.join(tempDir, 'assets', 'images');
      await fs.ensureDir(assetsDir);
      
      // Extract all image references from topic config
      const imageRefs = this.extractImageReferences(topicConfig);
      
      if (imageRefs.length === 0) {
        console.log('ℹ️ No images found in topic configuration');
        return [];
      }
      
      // Process each image
      const processedImages = [];
      for (const imageRef of imageRefs) {
        const processedImage = await this.processImage(imageRef, topicDir, assetsDir);
        if (processedImage) {
          processedImages.push(processedImage);
        }
      }
      
      // Generate asset manifest
      const manifest = this.generateAssetManifest(processedImages);
      await fs.writeJSON(path.join(assetsDir, 'manifest.json'), manifest, { spaces: 2 });
      
      console.log(`✅ Processed ${processedImages.length}/${imageRefs.length} images successfully`);
      return processedImages;
      
    } catch (error) {
      console.error('❌ Error processing assets:', error);
      throw error;
    }
  }

  extractImageReferences(config) {
    const images = [];
    
    // Helper function to add image reference
    const addImage = (imageObj, context = 'general', required = false) => {
      if (imageObj && imageObj.src) {
        images.push({
          src: imageObj.src,
          alt: imageObj.alt || '',
          caption: imageObj.caption || '',
          context: context,
          required: required
        });
      }
    };
    
    // Extract hero image (important for modern template)
    if (config.content?.hero_image) {
      addImage(config.content.hero_image, 'hero', true);
    }
    
    // Extract task images (array in modern template)
    if (config.content?.task_images && Array.isArray(config.content.task_images)) {
      config.content.task_images.forEach((img, index) => {
        addImage({
          ...img,
          index: index
        }, 'task', false);
      });
    }
    
    // Extract concept images (enhanced in modern template)
    if (config.content?.concepts && Array.isArray(config.content.concepts)) {
      config.content.concepts.forEach((concept, index) => {
        if (concept.image) {
          addImage({
            ...concept.image,
            conceptTitle: concept.title,
            index: index
          }, 'concept', false);
        }
      });
    }
    
    // Extract quiz explanation image (enhanced display in modern template)
    if (config.quiz?.explanation_image) {
      addImage(config.quiz.explanation_image, 'quiz', false);
    }
    
    console.log(`📊 Found ${images.length} image references:`, {
      hero: images.filter(img => img.context === 'hero').length,
      task: images.filter(img => img.context === 'task').length,
      concept: images.filter(img => img.context === 'concept').length,
      quiz: images.filter(img => img.context === 'quiz').length
    });
    
    return images;
  }

  async processImage(imageRef, topicDir, outputDir) {
    try {
      // Resolve source path - handle both old and new path formats
      let sourcePath = this.resolveImagePath(imageRef.src, topicDir);
      
      // Check if source exists
      if (!await fs.pathExists(sourcePath)) {
        console.warn(`⚠️ Image not found: ${sourcePath}`);
        
        // Try alternative paths
        const alternatives = this.getAlternativePaths(imageRef.src, topicDir);
        for (const altPath of alternatives) {
          if (await fs.pathExists(altPath)) {
            sourcePath = altPath;
            console.log(`✅ Found image at alternative path: ${altPath}`);
            break;
          }
        }
        
        if (!await fs.pathExists(sourcePath)) {
          if (imageRef.required) {
            throw new Error(`Required image not found: ${imageRef.src}`);
          }
          return null;
        }
      }
      
      // Validate image type and size
      const validation = await this.validateImage(sourcePath);
      if (!validation.valid) {
        console.warn(`⚠️ Image validation failed for ${imageRef.src}: ${validation.reason}`);
        if (imageRef.required) {
          throw new Error(`Required image validation failed: ${validation.reason}`);
        }
        return null;
      }
      
      // Generate output filename with context prefix for organization
      const ext = path.extname(sourcePath);
      const baseName = path.basename(sourcePath, ext);
      const filename = `${imageRef.context}-${baseName}${ext}`;
      const outputPath = path.join(outputDir, filename);
      
      // Copy to output directory
      await fs.copy(sourcePath, outputPath);
      
      // Get image metadata
      const stats = await fs.stat(outputPath);
      
      console.log(`📁 Processed ${imageRef.context} image: ${filename} (${this.formatFileSize(stats.size)})`);
      
      return {
        original: imageRef,
        filename: filename,
        path: outputPath,
        size: stats.size,
        context: imageRef.context,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Failed to process image ${imageRef.src}:`, error.message);
      if (imageRef.required) {
        throw error;
      }
      return null;
    }
  }

  resolveImagePath(srcPath, topicDir) {
    let filename = path.basename(srcPath);
    
    if (srcPath.includes('assets/images/')) {
      filename = srcPath.replace(/^.*assets\/images\//, '');
    }
    
    return path.join(topicDir, 'images', filename);
  }
  

  getAlternativePaths(srcPath, topicDir) {
    const basename = path.basename(srcPath);
    return [
      path.join(topicDir, basename),
      path.join(topicDir, 'assets', basename),
      path.join(topicDir, 'images', basename)
    ];
  }

  async validateImage(imagePath) {
    try {
      // Check file extension
      const ext = path.extname(imagePath).toLowerCase();
      if (!this.supportedImageTypes.includes(ext)) {
        return {
          valid: false,
          reason: `Unsupported image type: ${ext}. Supported types: ${this.supportedImageTypes.join(', ')}`
        };
      }
      
      // Check file size
      const stats = await fs.stat(imagePath);
      if (stats.size > this.maxImageSize) {
        return {
          valid: false,
          reason: `Image too large: ${this.formatFileSize(stats.size)} (max: ${this.formatFileSize(this.maxImageSize)})`
        };
      }
      
      // Check if file is actually readable
      await fs.access(imagePath, fs.constants.R_OK);
      
      return { valid: true };
      
    } catch (error) {
      return {
        valid: false,
        reason: `File access error: ${error.message}`
      };
    }
  }

  validateImageAssets(topicConfig, topicDir) {
    const images = this.extractImageReferences(topicConfig);
    const missing = [];
    const invalid = [];
    const warnings = [];
    
    for (const imageRef of images) {
      const imagePath = this.resolveImagePath(imageRef.src, topicDir);
      
      if (!fs.pathExistsSync(imagePath)) {
        // Try alternative paths
        const alternatives = this.getAlternativePaths(imageRef.src, topicDir);
        const found = alternatives.some(altPath => fs.pathExistsSync(altPath));
        
        if (!found) {
          missing.push({
            src: imageRef.src,
            context: imageRef.context,
            required: imageRef.required
          });
        }
      } else {
        // Validate existing file
        const ext = path.extname(imagePath).toLowerCase();
        if (!this.supportedImageTypes.includes(ext)) {
          invalid.push({
            src: imageRef.src,
            context: imageRef.context,
            reason: `Unsupported type: ${ext}`
          });
        }
        
        // Check for missing alt text (accessibility)
        if (!imageRef.alt || imageRef.alt.trim() === '') {
          warnings.push({
            src: imageRef.src,
            context: imageRef.context,
            reason: 'Missing alt text for accessibility'
          });
        }
      }
    }
    
    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
      warnings,
      total: images.length,
      summary: {
        total: images.length,
        missing: missing.length,
        invalid: invalid.length,
        warnings: warnings.length,
        valid: images.length - missing.length - invalid.length
      }
    };
  }

  generateAssetManifest(processedImages) {
    const contextCounts = {};
    const totalSizes = {};
    
    processedImages.forEach(img => {
      contextCounts[img.context] = (contextCounts[img.context] || 0) + 1;
      totalSizes[img.context] = (totalSizes[img.context] || 0) + img.size;
    });
    
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      template: 'tailwind-modern',
      images: processedImages.map(img => ({
        filename: img.filename,
        context: img.context,
        size: img.size,
        processedAt: img.processedAt
      })),
      summary: {
        total_images: processedImages.length,
        total_size: processedImages.reduce((sum, img) => sum + img.size, 0),
        total_size_formatted: this.formatFileSize(processedImages.reduce((sum, img) => sum + img.size, 0)),
        contexts: contextCounts,
        context_sizes: Object.entries(totalSizes).reduce((acc, [context, size]) => {
          acc[context] = {
            size: size,
            formatted: this.formatFileSize(size)
          };
          return acc;
        }, {})
      }
    };
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // New method to check template compatibility
  checkTemplateCompatibility(topicConfig) {
    const issues = [];
    
    // Check for modern template features
    if (!topicConfig.content?.hero_image) {
      issues.push({
        type: 'recommendation',
        message: 'Consider adding a hero image for better visual impact in the modern template'
      });
    }
    
    if (!topicConfig.content?.task_images || topicConfig.content.task_images.length === 0) {
      issues.push({
        type: 'recommendation',
        message: 'Consider adding task images to enhance visual learning experience'
      });
    }
    
    if (topicConfig.content?.concepts) {
      const conceptsWithoutImages = topicConfig.content.concepts.filter(c => !c.image);
      if (conceptsWithoutImages.length > 0) {
        issues.push({
          type: 'recommendation',
          message: `${conceptsWithoutImages.length} concepts missing images for enhanced visual presentation`
        });
      }
    }
    
    return {
      compatible: true, // Modern template is backward compatible
      issues: issues,
      recommendations: issues.filter(i => i.type === 'recommendation').length
    };
  }
}

module.exports = AssetProcessor;