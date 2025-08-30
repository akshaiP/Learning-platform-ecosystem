const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function extractLatestTopic() {
  try {
    const outputDir = path.join(__dirname, '../output');
    const extractPath = path.join(__dirname, '../test-output');
    
    // Find the most recently created zip file
    if (!await fs.pathExists(outputDir)) {
      console.error('❌ Output directory not found. Run build first.');
      process.exit(1);
    }
    
    const zipFiles = (await fs.readdir(outputDir))
      .filter(file => file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(outputDir, file),
        stat: fs.statSync(path.join(outputDir, file))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
    
    if (zipFiles.length === 0) {
      console.error('❌ No SCORM packages found. Run build first.');
      process.exit(1);
    }
    
    const latestZip = zipFiles[0];
    const topicName = latestZip.name.replace('.zip', '');
    
    console.log(`📦 Extracting ${latestZip.name}...`);
    
    // Ensure extract directory exists and is clean
    await fs.remove(extractPath);
    await fs.ensureDir(extractPath);
    
    // Extract zip file
    await execAsync(`cd "${extractPath}" && unzip -q "../output/${latestZip.name}"`);
    
    console.log(`✅ Successfully extracted ${topicName}`);
    console.log(`📁 Content available at: ${extractPath}`);
    console.log(`🌐 Ready to serve at: http://localhost:8080`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

extractLatestTopic();