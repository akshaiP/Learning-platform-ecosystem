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
  
      // Write main files
      await fs.writeFile(path.join(packageTempDir, 'index.html'), html.html);
      await fs.writeFile(path.join(packageTempDir, 'styles.css'), html.css);
      await fs.writeFile(path.join(packageTempDir, 'imsmanifest.xml'), manifest);
  
      // Copy JavaScript files from tempDir to package
      const jsFiles = ['scorm-api.js', 'chat-integration.js', 'core-functions.js'];
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
  
      // Copy assets if they exist
      const assetsDir = path.join(tempDir, 'assets');
      if (await fs.pathExists(assetsDir)) {
        console.log('📁 Copying assets to package...');
        await fs.copy(assetsDir, path.join(packageTempDir, 'assets'));
      }

      // Create zip file
      const outputPath = path.join(config.outputDir, `${topicId}.zip`);
      await this.createZipFile(packageTempDir, outputPath);
 
      // Get file size
      const stats = await fs.stat(outputPath);
      
      // Clean up package temp directory
      await fs.remove(packageTempDir);
  
      return {
        filename: `${topicId}.zip`,
        fullPath: outputPath,
        size: stats.size
      };
  
    } catch (error) {
      throw new Error(`Failed to package SCORM: ${error.message}`);
    }
  }

  async createZipFile(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`📦 Package created: ${(archive.pointer() / 1024).toFixed(1)} KB`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}

module.exports = async function packageScorm(topicId, buildData) {
  const packager = new ScormPackager();
  return await packager.packageScorm(topicId, buildData);
};