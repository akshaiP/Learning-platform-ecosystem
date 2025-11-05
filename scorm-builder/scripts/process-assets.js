//scorm-builder/scripts/process-assets.js
const fs = require('fs-extra');
const path = require('path');

class AssetProcessor {
  constructor() {
    this.supportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    this.supportedVideoTypes = ['.mp4', '.webm', '.ogg'];
    this.maxImageSize = 5 * 1024 * 1024; // 5MB limit
    this.maxVideoSize = 50 * 1024 * 1024; // 50MB limit for videos
    this.optimizedSizes = {
      hero: { width: 1200, height: 675 }, // 16:9 aspect ratio
      task: { width: 600, height: 400 },
      concept: { width: 400, height: 300 },
      quiz: { width: 800, height: 600 },
      company_logo: { width: 200, height: 100 }, // Logo specific size
      step_image: { width: 800, height: 600 } // For hint step images
    };
  }

  async processTopicAssets(topicConfig, topicDir, tempDir) {
    console.log('🖼️ Processing topic assets for task-based learning template...');

    try {
      // Create assets directories in temp
      const imagesDir = path.join(tempDir, 'assets', 'images');
      const videosDir = path.join(tempDir, 'assets', 'videos');
      await fs.ensureDir(imagesDir);
      await fs.ensureDir(videosDir);

      // Extract all image references from topic config (including company logo)
      const imageRefs = this.extractImageReferences(topicConfig);
      const videoRefs = this.extractVideoReferences(topicConfig);

      if (imageRefs.length === 0 && videoRefs.length === 0) {
        console.log('ℹ️ No images or videos found in topic configuration');
        return [];
      }

      // Process each image
      const processedAssets = [];
      for (const imageRef of imageRefs) {
        const processedImage = await this.processImage(imageRef, topicDir, imagesDir);
        if (processedImage) {
          processedAssets.push(processedImage);
        }
      }

      // Process each video
      for (const videoRef of videoRefs) {
        const processedVideo = await this.processVideo(videoRef, topicDir, videosDir);
        if (processedVideo) {
          processedAssets.push(processedVideo);
        }
      }

      // Generate asset manifests
      const imageManifest = this.generateAssetManifest(processedAssets.filter(asset => asset.type === 'image'));
      const videoManifest = this.generateAssetManifest(processedAssets.filter(asset => asset.type === 'video'));
      await fs.writeJSON(path.join(imagesDir, 'manifest.json'), imageManifest, { spaces: 2 });
      await fs.writeJSON(path.join(videosDir, 'manifest.json'), videoManifest, { spaces: 2 });

      console.log(`✅ Processed ${processedAssets.length}/${imageRefs.length + videoRefs.length} assets successfully`);
      return processedAssets;
      
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
    
    // NEW: Extract company logo (high priority for branding)
    if (config.content?.company_logo) {
      addImage(config.content.company_logo, 'company_logo', true);
    }
    
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

        // NEW: Extract images from interactive carousel slides
        if (concept.interactive_carousel && Array.isArray(concept.interactive_carousel.slides)) {
          concept.interactive_carousel.slides.forEach((slide, sIdx) => {
            if (!slide || !slide.image) return;
            if (typeof slide.image === 'string') {
              addImage({ src: slide.image, alt: slide.topic || '', caption: '', conceptTitle: concept.title, index: index, slideIndex: sIdx }, 'concept', false);
            } else if (slide.image && slide.image.src) {
              addImage({ ...slide.image, conceptTitle: concept.title, index: index, slideIndex: sIdx }, 'concept', false);
            }
          });
        }
      });
    }
    
    // NEW: Extract hint step images (for task-based learning)
    if (config.content?.hints && Array.isArray(config.content.hints)) {
      config.content.hints.forEach((hint, index) => {
        if (hint.step_image) {
          addImage({
            ...hint.step_image,
            hintIndex: index
          }, 'step_image', false);
        }
      });
    }
    
    // NEW: Extract task step images (for step-by-step instructions)
    if (config.content?.task_steps && Array.isArray(config.content.task_steps)) {
      config.content.task_steps.forEach((step, index) => {
        if (step.image) {
          addImage({
            ...step.image,
            stepIndex: index
          }, 'task_step', false);
        }
        // NEW: Extract multiple step images if provided
        if (Array.isArray(step.images)) {
          step.images.forEach((img, i) => {
            addImage({
              ...img,
              stepIndex: index,
              imageIndex: i
            }, 'task_step', false);
          });
        }
        
        // Extract hint images from task steps
        if (step.hint && step.hint.image) {
          addImage({
            ...step.hint.image,
            stepIndex: index,
            isHint: true
          }, 'hint_image', false);
        }
        // NEW: Extract multiple hint images if provided
        if (step.hint && Array.isArray(step.hint.images)) {
          step.hint.images.forEach((img, i) => {
            addImage({
              ...img,
              stepIndex: index,
              isHint: true,
              imageIndex: i
            }, 'hint_image', false);
          });
        }
      });
    }
    
    // Extract quiz images (both legacy and new multi-question format)
    if (config.quiz) {
      // Legacy single question format
      if (config.quiz.explanation_image) {
        addImage(config.quiz.explanation_image, 'quiz', false);
      }

      // New multi-question format
      if (config.quiz.questions && Array.isArray(config.quiz.questions)) {
        config.quiz.questions.forEach((question, index) => {
          // Extract explanation images
          if (question.explanation_image) {
            addImage({
              ...question.explanation_image,
              questionIndex: index,
              questionId: question.id || `q${index + 1}`
            }, 'quiz', false);
          }

          // Extract question images (NEW)
          if (question.images && Array.isArray(question.images)) {
            question.images.forEach((img, imgIndex) => {
              if (img.src) {
                addImage({
                  ...img,
                  questionIndex: index,
                  questionId: question.id || `q${index + 1}`,
                  imageIndex: imgIndex,
                  context: 'quiz_question'
                }, 'quiz_question', false);
              }
            });
          }
        });
      }
    }
    
    if (images.length > 0) {
      console.log(`📊 Found ${images.length} image references`);
    }
    
    return images;
  }

  extractVideoReferences(config) {
    const videos = [];

    // Helper function to add video reference
    const addVideo = (videoObj, context = 'general', required = false) => {
      if (videoObj && videoObj.src) {
        // Only process local videos (non-URL), not embed URLs
        if (!videoObj.src.startsWith('http')) {
          videos.push({
            src: videoObj.src,
            caption: videoObj.caption || videoObj.alt || '',
            context: context,
            required: required
          });
        }
      }
    };

    // Extract videos from task steps
    if (config.content?.task_steps && Array.isArray(config.content.task_steps)) {
      config.content.task_steps.forEach((step, index) => {
        // Handle single video (simplified format)
        if (step.video) {
          // Only process local videos, not embed URLs
          if (step.video.src && !step.video.src.startsWith('http')) {
            addVideo({
              ...step.video,
              stepTitle: step.title,
              stepIndex: index
            }, 'task_step', false);
          }
        }
      });
    }

    return videos;
  }

  async processVideo(videoRef, topicDir, outputDir) {
    try {
      // Check if this is a cloud URL (shouldn't happen for local videos, but just in case)
      if (videoRef.src.startsWith('https://') || videoRef.src.startsWith('http://')) {
                return {
          original: videoRef,
          filename: videoRef.src,
          isCloudUrl: true,
          type: 'video'
        };
      }

      // Resolve the video path
      const videoPath = this.resolveImagePath(videoRef.src, topicDir, 'video');

      if (!fs.pathExistsSync(videoPath)) {
        console.warn(`⚠️ Video not found: ${videoRef.src} (looked at: ${videoPath})`);
        return null;
      }

      // Validate video file
      const videoStats = await fs.stat(videoPath);
      const fileExtension = path.extname(videoPath).toLowerCase();

      if (!this.supportedVideoTypes.includes(fileExtension)) {
        throw new Error(`Unsupported video format: ${fileExtension}. Supported formats: ${this.supportedVideoTypes.join(', ')}`);
      }

      if (videoStats.size > this.maxVideoSize) {
        throw new Error(`Video file too large: ${videoStats.size} bytes. Maximum size: ${this.maxVideoSize} bytes`);
      }

      // Generate unique filename
      const filename = this.generateVideoFilename(videoRef, fileExtension);
      const outputPath = path.join(outputDir, filename);

      // Copy video to output directory (no optimization for videos to maintain quality)
      await fs.copy(videoPath, outputPath);

      
      return {
        original: videoRef,
        filename: filename,
        isCloudUrl: false,
        type: 'video',
        size: videoStats.size,
        format: fileExtension
      };

    } catch (error) {
      console.error(`❌ Error processing video ${videoRef.src}:`, error.message);
      return null;
    }
  }

  generateVideoFilename(videoRef, extension) {
    // Generate a unique filename based on the context and original filename
    const originalName = path.basename(videoRef.src, extension);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();

    if (videoRef.stepIndex !== undefined) {
      return `step_${videoRef.stepIndex}_${sanitizedName}_${timestamp}${extension}`;
    }

    return `${sanitizedName}_${timestamp}${extension}`;
  }

  async processImage(imageRef, topicDir, outputDir) {
    try {
      // Check if this is a cloud URL (for default images)
      if (imageRef.src.startsWith('https://') || imageRef.src.startsWith('http://')) {
        // For default company logo, download it from cloud storage and include in SCORM
        if (imageRef.context === 'company_logo' && imageRef.src.includes('default-company-logo.png')) {
          
          try {
            const cloudServices = require('../services/cloud-services');
            // Extract the cloud path from the URL
            const cloudPath = 'default-company-logo.png';

            // Download to a temporary location
            const tempLocalPath = require('path').join(outputDir, 'temp-default-logo.png');
            await cloudServices.downloadFile(cloudPath, tempLocalPath);

            // Process it like a local image
            const ext = require('path').extname(tempLocalPath);
            const baseName = 'default-company-logo';
            const filename = `${imageRef.context}-${baseName}${ext}`;
            const finalPath = require('path').join(outputDir, filename);

            // Move to final location
            await require('fs-extra').move(tempLocalPath, finalPath);

            const stats = await require('fs-extra').stat(finalPath);
            console.log(`📁 Downloaded and processed default company logo: ${filename} (${this.formatFileSize(stats.size)})`);

            return {
              original: imageRef,
              filename: filename,
              path: finalPath,
              size: stats.size,
              context: imageRef.context,
              processedAt: new Date().toISOString(),
              isCloudUrl: false // Now treated as local image
            };
          } catch (downloadError) {
            console.warn(`⚠️ Failed to download default company logo: ${downloadError.message}`);
            // Fallback to keeping the cloud URL
            return {
              original: imageRef,
              filename: imageRef.src,
              path: imageRef.src,
              size: 0,
              context: imageRef.context,
              processedAt: new Date().toISOString(),
              isCloudUrl: true
            };
          }
        }

        // For other cloud URLs, reference them directly
                return {
          original: imageRef,
          filename: imageRef.src, // Use URL as filename for cloud images
          path: imageRef.src, // Path is the URL
          size: 0, // Unknown size for cloud images
          context: imageRef.context,
          processedAt: new Date().toISOString(),
          isCloudUrl: true
        };
      }

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
                        break;
          }
        }

        if (!await fs.pathExists(sourcePath)) {
          if (imageRef.required) {
            throw new Error(`Required image not found: ${imageRef.src}`);
          }
          console.warn(`⚠️ Skipping missing ${imageRef.context} image: ${imageRef.src}`);
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

  resolveImagePath(srcPath, topicDir, assetType = 'image') {
    let filename = path.basename(srcPath);

    // Handle different path formats
    if (srcPath.includes('assets/images/')) {
      filename = srcPath.replace(/^.*assets\/images\//, '');
    } else if (srcPath.includes('assets/videos/')) {
      filename = srcPath.replace(/^.*assets\/videos\//, '');
    }

    // Determine the appropriate folder based on asset type
    const folderName = assetType === 'video' ? 'videos' : 'images';
    return path.join(topicDir, folderName, filename);
  }

  getAlternativePaths(srcPath, topicDir, assetType = 'image') {
    const basename = path.basename(srcPath);
    const folderName = assetType === 'video' ? 'videos' : 'images';
    return [
      path.join(topicDir, basename),
      path.join(topicDir, 'assets', basename),
      path.join(topicDir, folderName, basename),
      path.join(topicDir, 'logos', basename) // Additional path for logos
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
      version: '2.0',
      timestamp: new Date().toISOString(),
      template: 'task-based-learning',
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

  // Enhanced template compatibility check
  checkTemplateCompatibility(topicConfig) {
    const issues = [];
    
    // Check for task-based learning template features
    if (!topicConfig.content?.company_logo) {
      issues.push({
        type: 'recommendation',
        message: 'Consider adding a company logo for better branding in the task-based learning template'
      });
    }
    
    if (!topicConfig.content?.hero_image) {
      issues.push({
        type: 'recommendation',
        message: 'Consider adding a hero image for better visual impact in the task-based learning template'
      });
    }
    
    if (!topicConfig.content?.task_images || topicConfig.content.task_images.length === 0) {
      issues.push({
        type: 'recommendation',
        message: 'Consider adding task images to enhance visual learning experience'
      });
    }
    
    // Check for enhanced hint structure with step images
    if (topicConfig.content?.hints) {
      const hintsWithoutImages = topicConfig.content.hints.filter(h => 
        typeof h === 'object' && !h.step_image
      );
      if (hintsWithoutImages.length > 0) {
        issues.push({
          type: 'recommendation',
          message: `${hintsWithoutImages.length} hints missing step images for enhanced task-based learning`
        });
      }
    }
    
    // Check for task steps with images
    if (topicConfig.content?.task_steps) {
      const stepsWithoutImages = topicConfig.content.task_steps.filter(step => !step.image);
      if (stepsWithoutImages.length > 0) {
        issues.push({
          type: 'recommendation',
          message: `${stepsWithoutImages.length} task steps missing images for enhanced visual learning`
        });
      }
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
      compatible: true, // Task-based learning template is backward compatible
      issues: issues,
      recommendations: issues.filter(i => i.type === 'recommendation').length
    };
  }
}

module.exports = AssetProcessor;