# Build System and SCORM Packaging

## Overview
The build system transforms topic configuration files into compliant SCORM 2004 packages that can be deployed to Learning Management Systems (LMS). The system handles template processing, asset management, manifest generation, and ZIP packaging.

## Core Build Components

### 1. Main Build Orchestrator
**File**: `build.js`

The main entry point for all build operations. Provides CLI interface for building individual topics or all topics.

#### Key Features
- CLI argument parsing for topic selection and configuration
- Integration with both local and cloud-based topic sources
- Progress tracking and error handling
- Support for production and development builds

#### Usage Commands
```bash
# Build specific topic
npm run build:topic -- --topic=Robotics-M1-T1.1

# Build all topics from topics/ directory
npm run build:all

# Build for production deployment
npm run build:prod -- --topic=Robotics-M1-T1.1

# Build with custom backend
npm run build:topic -- --topic=Robotics-M1-T1.1 --backend=https://api.example.com

# Test topic locally
npm run test:topic -- --topic=Robotics-M1-T1.1
```

#### Build Configuration Options
```javascript
// CLI Options
.options('-t, --topic <name>', 'Topic name to build')
.option('-a, --all', 'Build all topics')
.option('-b, --backend <url>', 'Backend URL for chat widget')
.option('-p, --prod', 'Production build (minified)')
.option('-c, --cloud', 'Use cloud-based topics')
.option('-o, --output <dir>', 'Output directory')
.option('-v, --verbose', 'Verbose logging')
```

### 2. Topic Generation Engine
**File**: `scripts/generate-topic.js`

Processes topic configurations and generates HTML content from templates.

#### Core Responsibilities
1. **Template Data Preparation**: Transforms topic config into template variables
2. **HTML Generation**: Renders Mustache templates with topic data
3. **Asset Processing**: Handles images, code blocks, and media files
4. **Content Validation**: Validates required fields and data structure

#### Data Processing Pipeline
```javascript
async function generateTopicHTML(topicData, options = {}) {
    // 1. Prepare template data
    const templateData = prepareTemplateData(topicData, options);

    // 2. Render template
    const html = await renderTemplate(templatePath, templateData);

    // 3. Process assets
    await processAssets(topicData, outputPath);

    // 4. Validate output
    validateGeneratedContent(html);

    return html;
}
```

#### Template Data Transformation
```javascript
// Key transformations performed
data.hintsJson = JSON.stringify(data.hints || []);
data.quizJson = JSON.stringify(data.quiz || {});
data.titleJson = JSON.stringify(data.title || '');
data.taskStepsJson = JSON.stringify(data.content?.task_steps || []);
data.learningObjectivesJson = JSON.stringify(data.learning_objectives || []);
data.conceptsJson = JSON.stringify(data.content?.concepts || []);
data.chatContextsJson = JSON.stringify(data.chat_contexts || {});
data.backend_url = options.backendUrl || config.backendUrl;
data.chat_mode = options.chatMode || config.chatMode || 'custom_backend';
```

#### Advanced Content Processing
1. **Instruction HTML Conversion**: Converts plain text instructions to safe HTML
2. **Code Block Processing**: Applies syntax highlighting and escaping
3. **Image Carousel Logic**: Handles single vs multiple image scenarios
4. **Content Validation**: Ensures all required sections are present

### 3. Asset Management System
**File**: `scripts/process-assets.js`

Handles all asset-related operations including copying, optimizing, and referencing.

#### Asset Types Handled
1. **Images**: PNG, JPG, JPEG, GIF formats
2. **Code Files**: Syntax highlighting and formatting
3. **Custom Styles**: CSS processing and minification
4. **JavaScript Modules**: Bundling and optimization

#### Asset Processing Flow
```javascript
async function processAssets(topicId, sourcePath, targetPath, options = {}) {
    // 1. Create asset directories
    await ensureDirectories(targetPath);

    // 2. Process images
    await processImages(sourcePath, targetPath);

    // 3. Process code blocks
    await processCodeBlocks(topicData);

    // 4. Copy template assets
    await copyTemplateAssets(targetPath);

    // 5. Generate custom styles
    await generateCustomStyles(topicData, targetPath);
}
```

#### Image Processing Features
- **File Size Validation**: 5MB limit enforcement
- **Format Validation**: Allowed file type checking
- **Path Resolution**: Handles both relative and absolute paths
- **Cloud URL Conversion**: Converts cloud storage URLs to accessible links

### 4. SCORM Manifest Generation
**File**: `scripts/create-manifest.js`

Creates IMS Manifest files required for SCORM 2004 compliance.

#### Manifest Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.nebula.topic-{{topicId}}" version="1"
    xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
    xmlns:lom="http://ltsc.ieee.org/xsd/LOM"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

    <metadata>
        <lom:lom>
            <lom:general>
                <lom:title>
                    <lom:string language="en-US">{{title}}</lom:string>
                </lom:title>
                <lom:description>
                    <lom:string language="en-US">{{description}}</lom:string>
                </lom:description>
            </lom:general>
        </lom:lom>
    </metadata>

    <organizations default="org-1">
        <organization identifier="org-1">
            <title>{{title}}</title>
            <item identifier="item-1" identifierref="res-1">
                <title>{{title}}</title>
            </item>
        </organization>
    </organizations>

    <resources>
        <resource identifier="res-1" type="webcontent" href="index.html">
            <!-- File references -->
        </resource>
    </resources>
</manifest>
```

#### Manifest Generation Process
```javascript
function generateManifest(topicData, files) {
    const manifest = {
        identifier: `com.nebula.topic-${topicData.id}`,
        version: topicData.version || '1',
        title: topicData.title,
        description: topicData.description,
        files: files.map(file => ({
            href: file.path,
            type: getFileType(file.path)
        }))
    };

    return renderManifestTemplate(manifest);
}
```

### 5. SCORM Packaging System
**File**: `scripts/package-scorm.js`

Creates the final SCORM ZIP package with all required files and proper structure.

#### Package Structure
```
topic-scorm-package.zip
├── imsmanifest.xml          # SCORM manifest
├── index.html              # Main topic HTML
├── styles.css              # Custom styles
├── task-split-screen.css   # Split-screen styles
├── scorm-api.js            # SCORM API integration
├── chat-integration.js     # Chat widget integration
├── core-functions.js       # Utility functions
├── quiz-system.js          # Quiz functionality
├── chat-system.js          # Chat system logic
├── task-system.js          # Task progress tracking
├── task-split-screen.js    # Split-screen workspace
├── images/                 # Topic images
│   ├── hero.png
│   ├── step1.png
│   └── ...
└── assets/                 # Additional assets
    └── ...
```

#### Packaging Process
```javascript
async function createSCORMPackage(topicId, buildPath, outputPath) {
    // 1. Validate required files
    await validateRequiredFiles(buildPath);

    // 2. Create file manifest
    const fileManifest = await createFileManifest(buildPath);

    // 3. Generate IMS manifest
    const manifestContent = await generateManifest(topicData, fileManifest);

    // 4. Write manifest to build directory
    await writeFile(path.join(buildPath, 'imsmanifest.xml'), manifestContent);

    // 5. Create ZIP package
    const zipPath = path.join(outputPath, `${topicId}.zip`);
    await createZipArchive(buildPath, zipPath);

    return zipPath;
}
```

### 6. Build Configuration Management
**File**: `package.json` scripts and `build.js` configuration

#### Build Scripts
```json
{
    "scripts": {
        "build": "node build.js",
        "build:topic": "node build.js --topic",
        "build:all": "node build.js --all",
        "build:prod": "node build.js --prod",
        "test:topic": "node build.js --test",
        "serve:test": "node test-server.js",
          "clean": "rm -rf dist/ output/",
        "lint": "eslint scripts/ templates/"
    }
}
```

#### Configuration Files
- **Default Configuration**: Built into `build.js`
- **Environment Configuration**: Via environment variables
- **Override Configuration**: Via CLI arguments

### 7. Local Development Server
**File**: `test-server.js`

Provides local testing environment for built SCORM packages.

#### Features
- Static file serving
- SCORM API simulation
- Hot reload support
- CORS handling
- Error logging

#### Usage
```bash
# Start test server
npm run serve:test

# Test built topic
npm run test:topic -- --topic=Robotics-M1-T1.1
```


## Build Process Workflow

### 1. Topic Discovery
```javascript
// Local topics
const topics = await discoverLocalTopics('topics/');

// Cloud topics
const topics = await loadCloudTopics(userId);
```

### 2. Build Pipeline
```javascript
for (const topic of topics) {
    try {
        // 1. Load topic configuration
        const topicData = await loadTopicConfig(topic);

        // 2. Validate configuration
        await validateTopicConfig(topicData);

        // 3. Process assets
        await processTopicAssets(topicData);

        // 4. Generate HTML
        const html = await generateTopicHTML(topicData);

        // 5. Create manifest
        const manifest = await createManifest(topicData);

        // 6. Package SCORM
        const packagePath = await createSCORMPackage(topicData);

        console.log(`✅ Built topic: ${topic.id}`);
    } catch (error) {
        console.error(`❌ Build failed for ${topic.id}:`, error);
    }
}
```

### 3. Output Management
```javascript
// Directory structure
output/
├── topics/
│   ├── Robotics-M1-T1.1/
│   │   ├── index.html
│   │   ├── imsmanifest.xml
│   │   ├── images/
│   │   └── assets/
│   └── Robotics-M1-T2.1/
└── scorm-packages/
    ├── Robotics-M1-T1.1.zip
    └── Robotics-M1-T2.1.zip
```

## Integration Points

### 1. Cloud Services Integration
```javascript
// Load topics from cloud
const cloudTopics = await topicService.listTopics(userId);

// Download images from cloud storage
await topicService.downloadTopicImages(topicId, imagesPath);
```

### 2. Backend Configuration
```javascript
// Inject backend URLs into templates
data.backend_url = backendUrl || process.env.BACKEND_URL;

// Configure chat widget integration
data.chat_mode = chatMode || process.env.CHAT_MODE;
```

### 3. Environment Variables
```bash
# Backend configuration
BACKEND_URL=https://api.example.com
CHAT_MODE=custom_backend

# Build configuration
NODE_ENV=production
OUTPUT_DIR=./dist

# Cloud configuration
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
FIREBASE_PROJECT_ID=your-project-id
```

## Error Handling and Logging

### 1. Build Errors
- **Configuration Errors**: Invalid JSON, missing required fields
- **Asset Errors**: Missing files, invalid formats
- **Template Errors**: Mustache rendering failures
- **Package Errors**: ZIP creation failures

### 2. Logging Strategy
```javascript
// Structured logging
console.log(`🚀 Building topic: ${topicId}`);
console.log(`📦 Assets processed: ${assetCount}`);
console.log(`📄 HTML generated: ${htmlPath}`);
console.log(`🗂️  Manifest created: ${manifestPath}`);
console.log(`📦 SCORM packaged: ${packagePath}`);
```

### 3. Error Recovery
- **Graceful Degradation**: Continue building other topics on failure
- **Detailed Error Messages**: Provide actionable error information
- **Partial Success Reporting**: Show successful and failed builds

## Performance Optimizations

### 1. Build Performance
- **Parallel Processing**: Build multiple topics concurrently
- **Asset Caching**: Cache processed assets between builds
- **Incremental Builds**: Only rebuild changed topics
- **Memory Management**: Efficient handling of large assets

### 2. Package Optimization
- **Image Compression**: Optimize image sizes without quality loss
- **CSS/JS Minification**: Reduce file sizes for production builds
- **ZIP Compression**: Optimize ZIP compression settings
- **File Deduplication**: Share common assets across topics

## Production Deployment

### 1. Production Build Features
- **Minified Assets**: CSS and JavaScript minification
- **Optimized Images**: Compressed and properly sized images
- **Error Handling**: Enhanced error reporting and recovery
- **Performance Monitoring**: Build time and success rate tracking

### 2. Deployment Pipeline
```bash
# 1. Validate all topics
npm run validate

# 2. Build all topics for production
npm run build:all

# 3. Test critical topics
npm run test:topic -- --topic=Robotics-M1-T1.1

# 4. Generate deployment package
npm run package:deployment
```

## Troubleshooting

### Common Build Issues
1. **Template Not Found**: Check template file paths
2. **Invalid JSON**: Validate topic configuration syntax
3. **Missing Assets**: Verify image file existence and paths
4. **Permission Errors**: Check file system permissions
5. **Memory Issues**: Increase Node.js memory limit

### Debug Commands
```bash
# Verbose build output
npm run build:topic -- --topic=Robotics-M1-T1.1 --verbose

# Validate specific topic
npm run validate -- --topic=Robotics-M1-T1.1

# Test build without packaging
npm run build:topic -- --topic=Robotics-M1-T1.1 --no-package
```

### Performance Issues
- **Build Time**: Use parallel builds and asset caching
- **Memory Usage**: Increase Node.js heap size for large topics
- **Disk Space**: Clean temporary files and optimize assets

## Best Practices

### 1. Configuration Management
- Use consistent naming conventions for topics
- Maintain backward compatibility for topic configurations
- Version control all topic configurations
- Document configuration changes

### 2. Asset Organization
- Keep images in dedicated `images/` folders
- Use descriptive file names
- Optimize image sizes before building
- Maintain consistent aspect ratios

### 3. Build Optimization
- Build only changed topics during development
- Use production builds for deployment
- Monitor build performance and success rates
- Implement automated testing of built packages

### 4. Quality Assurance
- Validate all topic configurations before building
- Test built packages in multiple LMS environments
- Verify SCORM compliance using testing tools
- Monitor package sizes and loading times