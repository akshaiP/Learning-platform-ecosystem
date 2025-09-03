const fs = require('fs-extra');
const path = require('path');

class AssetProcessor {
  constructor() {
    this.supportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
  }

  async processTopicAssets(topicConfig, topicDir, tempDir) {
    console.log('🖼️ Processing topic assets...');
    
    try {
      // Create assets directory in temp
      const assetsDir = path.join(tempDir, 'assets', 'images');
      await fs.ensureDir(assetsDir);
      
      // Extract all image references from topic config
      const imageRefs = this.extractImageReferences(topicConfig);
      
      // Process each image
      const processedImages = [];
      for (const imageRef of imageRefs) {
        const processedImage = await this.processImage(imageRef, topicDir, assetsDir);
        if (processedImage) {
          processedImages.push(processedImage);
        }
      }
      
      console.log(`✅ Processed ${processedImages.length} images successfully`);
      return processedImages;
      
    } catch (error) {
      console.error('❌ Error processing assets:', error);
      throw error;
    }
  }

  extractImageReferences(config) {
    const images = [];
    
    // Helper function to add image reference
    const addImage = (imageObj, context = 'general') => {
      if (imageObj && imageObj.src) {
        images.push({
          src: imageObj.src,
          alt: imageObj.alt || '',
          caption: imageObj.caption || '',
          context: context
        });
      }
    };
    
    // Extract hero image
    if (config.content && config.content.hero_image) {
      addImage(config.content.hero_image, 'hero');
    }
    
    // Extract task images
    if (config.content && config.content.task_images) {
      config.content.task_images.forEach(img => addImage(img, 'task'));
    }
    
    // Extract concept images
    if (config.content && config.content.concepts) {
      config.content.concepts.forEach(concept => {
        if (concept.image) {
          addImage(concept.image, 'concept');
        }
      });
    }
    
    // Extract quiz explanation image
    if (config.quiz && config.quiz.explanation_image) {
      addImage(config.quiz.explanation_image, 'quiz');
    }
    
    return images;
  }

  async processImage(imageRef, topicDir, outputDir) {
    try {
      // Resolve source path
      const sourcePath = path.join(topicDir, 'images', path.basename(imageRef.src.replace('assets/images/', '')));
      
      // Check if source exists
      if (!await fs.pathExists(sourcePath)) {
        console.warn(`⚠️ Image not found: ${sourcePath}`);
        return null;
      }
      
      // Validate image type
      const ext = path.extname(sourcePath).toLowerCase();
      if (!this.supportedImageTypes.includes(ext)) {
        console.warn(`⚠️ Unsupported image type: ${ext}`);
        return null;
      }
      
      // Copy to output directory
      const filename = path.basename(sourcePath);
      const outputPath = path.join(outputDir, filename);
      
      await fs.copy(sourcePath, outputPath);
      
      console.log(`📁 Copied: ${filename}`);
      
      return {
        original: imageRef,
        filename: filename,
        path: outputPath,
        size: (await fs.stat(outputPath)).size
      };
      
    } catch (error) {
      console.error(`❌ Failed to process image ${imageRef.src}:`, error);
      return null;
    }
  }

  validateImageAssets(topicConfig, topicDir) {
    const images = this.extractImageReferences(topicConfig);
    const missing = [];
    const invalid = [];
    
    for (const imageRef of images) {
      const imagePath = path.join(topicDir, 'images', path.basename(imageRef.src.replace('assets/images/', '')));
      
      if (!fs.pathExistsSync(imagePath)) {
        missing.push(imageRef.src);
      } else {
        const ext = path.extname(imagePath).toLowerCase();
        if (!this.supportedImageTypes.includes(ext)) {
          invalid.push(imageRef.src);
        }
      }
    }
    
    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
      total: images.length
    };
  }

  generateAssetManifest(processedImages) {
    return {
      timestamp: new Date().toISOString(),
      images: processedImages.map(img => ({
        filename: img.filename,
        size: img.size,
        context: img.original.context
      })),
      total_size: processedImages.reduce((sum, img) => sum + img.size, 0)
    };
  }
}

module.exports = AssetProcessor;