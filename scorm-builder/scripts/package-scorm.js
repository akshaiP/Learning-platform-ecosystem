const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');

class SCORMPackager {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
  }

  async packageSCORM(topicId, packageData) {
    const { html, manifest, topicConfig, config } = packageData;
    
    try {
      // Fixed: Use config.outputDir instead of config.config.outputDir
      await fs.ensureDir(config.outputDir);
      
      // Create temporary working directory
      const workDir = path.join(this.tempDir, topicId);
      await fs.ensureDir(workDir);
      
      // Write all files to temp directory
      await this.writePackageFiles(workDir, {
        html: html.html,
        css: html.css,
        manifest,
        topicConfig,
        config: config  // Fixed: Pass config directly
      });
      
      // Create zip package
      const outputPath = path.join(config.outputDir, `${topicId}.zip`);
      const packageStats = await this.createZipPackage(workDir, outputPath, config.isDev);
      
      // Cleanup temp directory
      await fs.remove(workDir);
      
      return {
        filename: `${topicId}.zip`,
        path: outputPath,
        size: packageStats.size,
        files: packageStats.files
      };
      
    } catch (error) {
      // Cleanup on error
      const workDir = path.join(this.tempDir, topicId);
      if (await fs.pathExists(workDir)) {
        await fs.remove(workDir);
      }
      throw new Error(`Failed to package SCORM: ${error.message}`);
    }
  }

  async writePackageFiles(workDir, { html, css, manifest, topicConfig, config }) {
    // Write main HTML file
    await fs.writeFile(path.join(workDir, 'index.html'), html, 'utf8');
    
    // Write CSS file
    await fs.writeFile(path.join(workDir, 'styles.css'), css, 'utf8');
    
    // Write manifest
    await fs.writeFile(path.join(workDir, 'imsmanifest.xml'), manifest, 'utf8');
    
    // Copy any additional assets
    if (topicConfig.assets) {
      const assetsDir = path.join(__dirname, '../assets');
      const targetAssetsDir = path.join(workDir, 'assets');
      
      for (const asset of topicConfig.assets) {
        const assetPath = path.join(assetsDir, asset);
        if (await fs.pathExists(assetPath)) {
          await fs.ensureDir(targetAssetsDir);
          await fs.copy(assetPath, path.join(targetAssetsDir, asset));
        }
      }
    }

    // Write package metadata (for debugging)
    if (config.isDev) {
      const metadata = {
        buildTime: new Date().toISOString(),
        topicId: topicConfig.id,
        backendUrl: topicConfig.backendUrl,
        version: '1.0.0'
      };
      await fs.writeFile(
        path.join(workDir, 'package-info.json'), 
        JSON.stringify(metadata, null, 2), 
        'utf8'
      );
    }
  }

  async createZipPackage(sourceDir, outputPath, isDev = false) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: isDev ? 1 : 9 } // Fast compression in dev, max in production
      });

      let stats = {
        size: 0,
        files: 0
      };

      output.on('close', () => {
        stats.size = archive.pointer();
        resolve(stats);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('entry', (entry) => {
        if (entry.type === 'file') {
          stats.files++;
        }
      });

      archive.pipe(output);

      // Add all files from source directory
      archive.directory(sourceDir, false);

      archive.finalize();
    });
  }

  async cleanup() {
    // Clean up temp directory
    if (await fs.pathExists(this.tempDir)) {
      await fs.remove(this.tempDir);
    }
  }
}

module.exports = async function packageScorm(topicId, packageData) {
  const packager = new SCORMPackager();
  return await packager.packageSCORM(topicId, packageData);
};