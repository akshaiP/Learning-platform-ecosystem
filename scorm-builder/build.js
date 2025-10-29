#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const generateTopic = require('./scripts/generate-topic');
const createManifest = require('./scripts/create-manifest');
const packageScorm = require('./scripts/package-scorm');
const topicService = require('./services/topic-service');
const cloudServices = require('./services/cloud-services');

const program = new Command();

program
  .name('scorm-builder')
  .description('Production SCORM 2004 package generator')
  .version('1.0.0');

program
  .option('-t, --topic <topic>', 'Build specific topic')
  .option('-a, --all', 'Build all topics')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-b, --backend <url>', 'Backend URL for chat widget')
  .option('-d, --dev', 'Development mode (no compression)')
  .option('-c, --clean', 'Clean output directory before build')
  .option('-v, --verbose', 'Verbose logging');

program.parse();

const options = program.opts();

// Configuration
const config = {
  topicsDir: path.join(__dirname, 'topics'),
  templatesDir: path.join(__dirname, 'templates'),
  outputDir: path.resolve(options.output),
  backendUrl: options.backend || (options.dev ? 'http://localhost:3000' : 'https://learning-platform-ecosystem.onrender.com'),
  isDev: options.dev || false,
  verbose: options.verbose || false
};

// Logger
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  verbose: (msg) => config.verbose && console.log(chalk.gray('  →'), msg)
};

async function main() {
  try {
    log.info('🚀 SCORM Builder v1.0.0');
    log.info(`Backend URL: ${config.backendUrl}`);
    log.info(`Output Directory: ${config.outputDir}`);

    // Ensure output directory exists
    await fs.ensureDir(config.outputDir);

    // Clean if requested
    if (options.clean) {
      log.info('🧹 Cleaning output directory...');
      await fs.emptyDir(config.outputDir);
      log.success('Output directory cleaned');
    }

    // Determine which topics to build
    let topicsToBuild = [];
    
    if (options.all) {
      // Build all topics - check both folder and file structures
      const items = await fs.readdir(config.topicsDir);
      const folderTopics = [];
      const fileTopics = [];
      
      for (const item of items) {
        const itemPath = path.join(config.topicsDir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          // Check for config.json in folder
          const configPath = path.join(itemPath, 'config.json');
          if (await fs.pathExists(configPath)) {
            folderTopics.push(item);
          }
        } else if (item.endsWith('.json')) {
          // Old structure - direct JSON files
          fileTopics.push(path.basename(item, '.json'));
        }
      }
      
      topicsToBuild = [...folderTopics, ...fileTopics];
      log.info(`Found ${topicsToBuild.length} topics to build (${folderTopics.length} folders, ${fileTopics.length} files)`);
    } else if (options.topic) {
      topicsToBuild = [options.topic];
    } else {
      log.error('Please specify --topic <name> or --all');
      process.exit(1);
    }    

    // Build each topic
    const results = [];
    for (const topicId of topicsToBuild) {
      try {
        log.info(`\n📚 Building topic: ${topicId}`);
        
        const result = await buildTopic(topicId, config);
        results.push(result);
        
        log.success(`Successfully built: ${result.outputFile}`);
        
      } catch (error) {
        log.error(`Failed to build ${topicId}: ${error.message}`);
        if (config.verbose) {
          console.error(error.stack);
        }
        results.push({ topicId, success: false, error: error.message });
      }
    }

    // Summary
    log.info('\n📊 Build Summary:');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    log.info(`✅ Successful: ${successful.length}`);
    if (failed.length > 0) {
      log.warn(`❌ Failed: ${failed.length}`);
      failed.forEach(f => log.error(`  - ${f.topicId}: ${f.error}`));
    }

    // List output files
    if (successful.length > 0) {
      log.info('\n📦 Generated SCORM Packages:');
      successful.forEach(result => {
        const size = result.size ? ` (${(result.size / 1024).toFixed(1)} KB)` : '';
        log.success(`  - ${result.outputFile}${size}`);
      });
    }

    log.info('\n🎉 Build completed!');
    process.exit(failed.length > 0 ? 1 : 0);

  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function buildTopic(topicId, config) {
  const startTime = Date.now();
  let topicConfig = null;
  
  // Create temporary directory for this build
  const tempDir = path.join(__dirname, 'temp', `${topicId}-${Date.now()}`);
  await fs.ensureDir(tempDir);
  
  try {
    // 1. Load topic configuration
    log.verbose(`Loading topic configuration: ${topicId}`);
    topicConfig = await loadTopicConfig(topicId, config);
    
    // 2. Generate HTML from template (pass tempDir!)
    log.verbose('Generating HTML content');
    const htmlContent = await generateTopic(topicConfig, config, tempDir);
    
    log.verbose('Creating SCORM manifest');
    const manifestContent = await createManifest(topicConfig, config, tempDir);
    
    // 4. Package everything
    log.verbose('Packaging SCORM content');
    const packageResult = await packageScorm(topicId, {
      html: htmlContent,
      manifest: manifestContent,
      topicConfig,
      config,
      tempDir
    });
    
    const buildTime = Date.now() - startTime;
    log.verbose(`Build completed in ${buildTime}ms`);
    
    // Clean up temp directory
    await fs.remove(tempDir);
    
    // Clean up temporary topic/images directory if it exists
    if (topicConfig._tempTopicDir && await fs.pathExists(topicConfig._tempTopicDir)) {
      log.verbose(`Cleaning up temporary topic dir: ${topicConfig._tempTopicDir}`);
      await fs.remove(topicConfig._tempTopicDir);
    }
    
    return {
      topicId,
      success: true,
      outputFile: packageResult.filename,
      size: packageResult.size,
      buildTime
    };
    
  } catch (error) {
    // Clean up temp directory on error
    await fs.remove(tempDir);
    
    // Clean up temporary topic/images directory on error
    if (topicConfig && topicConfig._tempTopicDir && await fs.pathExists(topicConfig._tempTopicDir)) {
      log.verbose(`Cleaning up temporary topic dir on error: ${topicConfig._tempTopicDir}`);
      await fs.remove(topicConfig._tempTopicDir);
    }
    
    throw error;
  }
}

// Helper function to safely initialize cloud services
async function initializeCloudServices() {
  try {
    if (!cloudServices.initialized) {
      await cloudServices.initialize();
    }
    return true;
  } catch (error) {
    log.warn(`⚠️  Cloud services initialization failed: ${error.message}`);
    return false;
  }
}

async function loadTopicConfig(topicId, config) {
  // In development mode, prioritize local files if they exist
  if (config.isDev) {
    const folderConfigPath = path.join(config.topicsDir, topicId, 'config.json');

    if (await fs.pathExists(folderConfigPath)) {
      log.info(`📁 Development mode: Loading topic from local folder: ${topicId}`);
      const configData = await fs.readJson(folderConfigPath);

      // Set up temporary topic directory for local assets
      const tempTopicDir = path.join(__dirname, 'temp', `${topicId}-topic-${Date.now()}`);
      const topicBaseDir = path.join(config.topicsDir, topicId);

      // Copy local assets to temp directory if they exist
      const imagesDir = path.join(topicBaseDir, 'images');
      const videosDir = path.join(topicBaseDir, 'videos');
      const tempImagesDir = path.join(tempTopicDir, 'images');
      const tempVideosDir = path.join(tempTopicDir, 'videos');

      await fs.ensureDir(tempImagesDir);
      await fs.ensureDir(tempVideosDir);

      // Copy images if they exist
      if (await fs.pathExists(imagesDir)) {
        await fs.copy(imagesDir, tempImagesDir);
        log.verbose(`Copied local images from ${imagesDir}`);
      }

      // Copy videos if they exist
      if (await fs.pathExists(videosDir)) {
        await fs.copy(videosDir, tempVideosDir);
        log.verbose(`Copied local videos from ${videosDir}`);
      }

      // Store temp topic directory path for cleanup
      configData._tempTopicDir = tempTopicDir;

      return {
        id: topicId,
        backendUrl: config.backendUrl,
        buildTime: new Date().toISOString(),
        isDev: config.isDev,
        ...configData
      };
    }
  }

  // Try to load from cloud storage first
  try {
    log.verbose(`Attempting to load topic from cloud: ${topicId}`);

    // Initialize cloud services if not already done
    const cloudInitialized = await initializeCloudServices();
    if (!cloudInitialized) {
      throw new Error('Cloud services not available');
    }

    // Load topic from Firestore
    const topicResult = await topicService.loadTopic(topicId, 'default');
    const topicData = topicResult.data;
    
    log.success(`✅ Loaded topic from cloud: ${topicId}`);
    
    // Prepare a temporary topic directory with images subfolder for processing
    const tempTopicDir = path.join(__dirname, 'temp', `${topicId}-topic-${Date.now()}`);
    const tempImagesDir = path.join(tempTopicDir, 'images');
    await fs.ensureDir(tempImagesDir);

    try {
      // Try to download images from the expected prefix
      const downloadResult = await topicService.downloadTopicImages(topicId, tempImagesDir, 'default');
      log.verbose(`Downloaded ${downloadResult.downloadedFiles.length} images to temp topic directory`);

      // If nothing downloaded (legacy migration placed files at bucket root), try by filenames from config
      if (!downloadResult.downloadedFiles || downloadResult.downloadedFiles.length === 0) {
        log.warn('⚠️  No images under topics/<user>/<topic>/images/. Attempting root filename fallback...');

        const filenamesToFetch = collectImageFilenamesFromConfig(topicData);
        for (const fileName of filenamesToFetch) {
          try {
            await cloudServices.downloadFile(fileName, path.join(tempImagesDir, fileName));
            log.verbose(`Fetched from root: ${fileName}`);
          } catch (e) {
            // Best-effort; continue
            log.verbose(`Skip missing root image: ${fileName} (${e.message})`);
          }
        }
      }

      // Store temp topic directory path for downstream processing and cleanup
      topicData._tempTopicDir = tempTopicDir;

    } catch (imageError) {
      log.warn(`⚠️  Failed to prepare images for ${topicId}: ${imageError.message}`);
      // Continue without images - the build can still proceed
    }
    
    return {
      id: topicId,
      backendUrl: config.backendUrl,
      buildTime: new Date().toISOString(),
      isDev: config.isDev,
      ...topicData
    };
    
  } catch (cloudError) {
    log.warn(`⚠️  Cloud loading failed for ${topicId}: ${cloudError.message}`);
    log.verbose(`Falling back to local storage for: ${topicId}`);
    
    // Fallback to local storage
    const folderConfigPath = path.join(config.topicsDir, topicId, 'config.json');
    
    if (await fs.pathExists(folderConfigPath)) {
      log.info(`📁 Loading topic from local folder: ${topicId}`);
      const configData = await fs.readJson(folderConfigPath);
      
      return {
        id: topicId,
        backendUrl: config.backendUrl,
        buildTime: new Date().toISOString(),
        isDev: config.isDev,
        ...configData
      };
    }
    
    const fileConfigPath = path.join(config.topicsDir, `${topicId}.json`);
    
    if (await fs.pathExists(fileConfigPath)) {
      log.info(`📄 Loading topic from local file: ${topicId}.json`);
      const configData = await fs.readJson(fileConfigPath);
      
      return {
        id: topicId,
        backendUrl: config.backendUrl,
        buildTime: new Date().toISOString(),
        isDev: config.isDev,
        ...configData
      };
    }
    
    throw new Error(`Topic configuration not found in cloud or local storage: ${topicId}`);
  }
}

// Collect image filenames referenced in topic data to help root fallback download
function collectImageFilenamesFromConfig(topicData) {
  const filenames = new Set();
  const add = (src) => {
    if (!src) return;
    const base = path.basename(src);
    if (base) filenames.add(base);
  };

  const c = topicData.content || {};
  if (c.company_logo?.src) add(c.company_logo.src);
  if (c.hero_image?.src) add(c.hero_image.src);
  if (Array.isArray(c.task_images)) c.task_images.forEach(img => add(img?.src));
  if (Array.isArray(c.concepts)) c.concepts.forEach(con => add(con?.image?.src));
  if (Array.isArray(c.hints)) c.hints.forEach(h => add(h?.step_image?.src));
  if (Array.isArray(c.task_steps)) {
    c.task_steps.forEach(step => {
      add(step?.image?.src);
      if (Array.isArray(step?.images)) step.images.forEach(img => add(img?.src));
      if (step?.hint) {
        add(step.hint?.image?.src);
        if (Array.isArray(step.hint?.images)) step.hint.images.forEach(img => add(img?.src));
      }
    });
  }
  const q = topicData.quiz || {};
  if (q.explanation_image?.src) add(q.explanation_image.src);
  if (Array.isArray(q.questions)) q.questions.forEach(qn => add(qn?.explanation_image?.src));
  return Array.from(filenames);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { buildTopic, loadTopicConfig };