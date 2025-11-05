const Mustache = require('mustache');
const fs = require('fs-extra');
const path = require('path');

class ManifestGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/imsmanifest-template.xml');
  }

  async generateManifest(topicConfig, config, tempDir) {
    try {
      // Load manifest template
      const template = await fs.readFile(this.templatePath, 'utf8');
      
      // Prepare manifest data with XML escaping
      const manifestData = await this.prepareManifestData(topicConfig, config, tempDir);
      
      // Render manifest
      const renderedManifest = Mustache.render(template, manifestData);
      
      // Validate XML structure
      this.validateManifest(renderedManifest);
      
      return renderedManifest;
      
    } catch (error) {
      throw new Error(`Failed to generate manifest: ${error.message}`);
    }
  }

  async prepareManifestData(topicConfig, config, tempDir) {
    const data = {
      // ✅ XML-ESCAPED CONTENT
      id: this.escapeXML(topicConfig.id),
      title: this.escapeXML(topicConfig.title), // This fixes "NLP & Text" issue
      description: this.escapeXML(topicConfig.description || ''),
      
      // Build information
      build_time: topicConfig.buildTime || new Date().toISOString(),
      backend_url: topicConfig.backendUrl || config.backendUrl,
      
      // Asset files
      assets: await this.collectAssetFiles(tempDir)
    };

        return data;
  }

  // ✅ CRITICAL: XML Escaping Function
  escapeXML(text) {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')      // & must be first
      .replace(/</g, '&lt;')       // < 
      .replace(/>/g, '&gt;')       // >
      .replace(/"/g, '&quot;')     // "
      .replace(/'/g, '&apos;');    // '
  }

  async collectAssetFiles(tempDir) {
    const assets = [];
    
    try {
      const assetsDir = path.join(tempDir, 'assets');
      
      if (await fs.pathExists(assetsDir)) {
                const allFiles = await this.getAllFilesRecursive(assetsDir);
        
        for (const file of allFiles) {
          const relativePath = path.relative(tempDir, file);
          const normalizedPath = relativePath.replace(/\\/g, '/');
          assets.push(normalizedPath);
        }
      }
      
            return assets;
      
    } catch (error) {
      console.warn('⚠️ Error collecting assets:', error.message);
      return [];
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

  validateManifest(manifest) {
    // Basic XML validation
    const requiredElements = [
      '<manifest',
      '<metadata>',
      '<organizations',
      '<resources>',
      '</manifest>'
    ];

    for (const element of requiredElements) {
      if (!manifest.includes(element)) {
        throw new Error(`Invalid manifest: missing ${element}`);
      }
    }

    // ✅ CHECK FOR UNESCAPED AMPERSANDS
    const unescapedAmpMatch = manifest.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/);
    if (unescapedAmpMatch) {
      throw new Error(`Unescaped ampersand found in manifest: ${unescapedAmpMatch[0]}`);
    }

    // Check SCORM 2004 schema
    if (!manifest.includes('2004 4th Edition')) {
      throw new Error('Manifest must specify SCORM 2004 4th Edition');
    }

        return true;
  }
}

module.exports = async function createManifest(topicConfig, config, tempDir) {
  const generator = new ManifestGenerator();
  return await generator.generateManifest(topicConfig, config, tempDir);
};