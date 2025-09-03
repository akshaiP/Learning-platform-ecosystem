#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const generateTopic = require('./scripts/generate-topic');
const createManifest = require('./scripts/create-manifest');
const packageScorm = require('./scripts/package-scorm');

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
  
  // Create temporary directory for this build
  const tempDir = path.join(__dirname, 'temp', `${topicId}-${Date.now()}`);
  await fs.ensureDir(tempDir);
  
  try {
    // 1. Load topic configuration
    log.verbose(`Loading topic configuration: ${topicId}`);
    const topicConfig = await loadTopicConfig(topicId, config);
    
    // 2. Generate HTML from template (pass tempDir!)
    log.verbose('Generating HTML content');
    const htmlContent = await generateTopic(topicConfig, config, tempDir);
    
    // 3. Create manifest
    log.verbose('Creating SCORM manifest');
    const manifestContent = await createManifest(topicConfig, config);
    
    // 4. Package everything (pass tempDir!)
    log.verbose('Packaging SCORM content');
    const packageResult = await packageScorm(topicId, {
      html: htmlContent,
      manifest: manifestContent,
      topicConfig,
      config,
      tempDir  // Add this!
    });
    
    const buildTime = Date.now() - startTime;
    log.verbose(`Build completed in ${buildTime}ms`);
    
    // Clean up temp directory
    await fs.remove(tempDir);
    
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
    throw error;
  }
}

async function loadTopicConfig(topicId, config) {
  const folderConfigPath = path.join(config.topicsDir, topicId, 'config.json');
  
  if (await fs.pathExists(folderConfigPath)) {
    log.verbose(`Loading topic from folder: ${topicId}`);
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
    log.verbose(`Loading topic from file: ${topicId}.json`);
    const configData = await fs.readJson(fileConfigPath);
    
    return {
      id: topicId,
      backendUrl: config.backendUrl,
      buildTime: new Date().toISOString(),
      isDev: config.isDev,
      ...configData
    };
  }
  
  throw new Error(`Topic configuration not found: ${topicId}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { buildTopic, loadTopicConfig };