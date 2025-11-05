const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');

class TopicExtractor {
  constructor() {
    this.outputDir = path.join(__dirname, '../output');
    this.testOutputDir = path.join(__dirname, '../test-output');
  }

  async extractLatestTopic() {
    try {
      // Find the most recent zip file
      const files = await fs.readdir(this.outputDir);
      const zipFiles = files.filter(f => f.endsWith('.zip'));
      
      if (zipFiles.length === 0) {
        throw new Error('No SCORM packages found in output directory');
      }

      // Get the most recent file
      const latestZip = zipFiles
        .map(f => ({
          name: f,
          path: path.join(this.outputDir, f),
          mtime: fs.statSync(path.join(this.outputDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime)[0];

      console.log(`📂 Extracting: ${latestZip.name}`);

      // Clean test output directory
      await fs.emptyDir(this.testOutputDir);

      // Extract zip file
      await this.extractZip(latestZip.path, this.testOutputDir);

      const extractedFiles = await this.listExtractedFiles();
      console.log(`✅ Extracted ${extractedFiles.length} files to test directory`);

      return {
        success: true,
        extractedFiles,
        testOutputDir: this.testOutputDir
      };

    } catch (error) {
      throw new Error(`Failed to extract topic: ${error.message}`);
    }
  }

  async extractZip(zipPath, outputDir) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: outputDir }))
        .on('close', resolve)
        .on('error', reject);
    });
  }

  async listExtractedFiles() {
    const files = [];
    
    async function scan(dir, prefix = '') {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          files.push(`${prefix}${item}/`);
          await scan(itemPath, `${prefix}${item}/`);
        } else {
          files.push(`${prefix}${item}`);
        }
      }
    }
    
    await scan(this.testOutputDir);
    return files.sort();
  }
}

// Export the main function
async function extractTopic() {
  const extractor = new TopicExtractor();
  return await extractor.extractLatestTopic();
}

module.exports = extractTopic;

// Run if called directly - Fixed the function call
if (require.main === module) {
  extractTopic()
    .then(result => {
      console.log('\n🎉 Extraction completed successfully!');
    })
    .catch(error => {
      console.error('❌ Extraction failed:', error.message);
      process.exit(1);
    });
}