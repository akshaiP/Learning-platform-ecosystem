const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

class ScormPackager {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
  }

  async packageScorm(topicId, buildData) {
    const { html, manifest, topicConfig, config, tempDir } = buildData;
    
    try {
      // Create package temp directory
      const packageTempDir = path.join(this.tempDir, `package-${topicId}-${Date.now()}`);
      await fs.ensureDir(packageTempDir);
      console.log(`📁 Package temp directory: ${packageTempDir}`);

      // ✅ STEP 1: Write core files
      await fs.writeFile(path.join(packageTempDir, 'index.html'), html.html);
      await fs.writeFile(path.join(packageTempDir, 'styles.css'), html.css);
      await fs.writeFile(path.join(packageTempDir, 'imsmanifest.xml'), manifest);
      console.log('📄 Core files written (HTML, CSS, manifest)');

      // ✅ STEP 2: Copy JavaScript files
      const jsFiles = ['scorm-api.js', 'chat-integration.js', 'core-functions.js', 'quiz-system.js', 'chat-system.js', 'task-system.js', 'carousel-assistant-modal.js', 'carousel-assistant-styles.css','task-split-screen.js','task-split-screen.css'];
      for (const jsFile of jsFiles) {
        const sourcePath = path.join(tempDir, jsFile);
        const destPath = path.join(packageTempDir, jsFile);
        
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, destPath);
          console.log(`📄 Copied ${jsFile} to package`);
        } else {
          console.warn(`⚠️ JavaScript file not found: ${jsFile}`);
        }
      }

      // ✅ STEP 3: Copy assets directory with full structure
      const assetsSourceDir = path.join(tempDir, 'assets');
      const assetsDestDir = path.join(packageTempDir, 'assets');
      
      if (await fs.pathExists(assetsSourceDir)) {
        console.log('📁 Copying assets directory...');
        await fs.copy(assetsSourceDir, assetsDestDir);
        
        // Log copied assets
        const copiedAssets = await this.getAllFilesRecursive(assetsDestDir);
        console.log(`✅ Copied ${copiedAssets.length} asset files`);
        
        // Show first few assets
        const relativePaths = copiedAssets.slice(0, 5).map(file => 
          path.relative(packageTempDir, file)
        );
        relativePaths.forEach(assetPath => 
          console.log(`  📄 ${assetPath}`)
        );
        
        if (copiedAssets.length > 5) {
          console.log(`  ... and ${copiedAssets.length - 5} more assets`);
        }
      } else {
        console.log('ℹ️ No assets directory found');
      }

      // ✅ STEP 4: Create ZIP with proper structure
      const outputPath = path.join(config.outputDir, `${topicId}.zip`);
      await this.createZipFile(packageTempDir, outputPath);

      // ✅ STEP 5: Get package info and cleanup
      const stats = await fs.stat(outputPath);
      await fs.remove(packageTempDir);
      console.log('🧹 Cleaned up package temp directory');

      return {
        filename: `${topicId}.zip`,
        fullPath: outputPath,
        size: stats.size
      };

    } catch (error) {
      throw new Error(`Failed to package SCORM: ${error.message}`);
    }
  }

  async getAllFilesRecursive(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.getAllFilesRecursive(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error reading directory ${dir}:`, error.message);
    }
    
    return files;
  }

  async createZipFile(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { 
        zlib: { level: 9 }
      });

      let fileCount = 0;
      
      output.on('close', () => {
        const sizeKB = (archive.pointer() / 1024).toFixed(1);
        console.log(`📦 SCORM package created: ${sizeKB} KB (${fileCount} files)`);
        resolve();
      });

      archive.on('error', (err) => {
        console.error('❌ Archive error:', err);
        reject(err);
      });

      // Track files being added
      archive.on('entry', (entry) => {
        fileCount++;
        if (fileCount <= 10) {
          console.log(`  📄 Adding to ZIP: ${entry.name}`);
        }
      });

      archive.pipe(output);
      
      // ✅ CRITICAL: Add files at root level (false = no subfolder)
      archive.directory(sourceDir, false);
      
      archive.finalize();
    });
  }
}

module.exports = async function packageScorm(topicId, buildData) {
  const packager = new ScormPackager();
  return await packager.packageScorm(topicId, buildData);
};