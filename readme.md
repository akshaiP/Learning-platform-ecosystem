# SCORM Builder - Learning Platform Ecosystem

  A production-ready SCORM 2004 package generator for task-based learning with chat integration.

  ## 🚀 Quick Start

  ### Prerequisites
  - Node.js 16+
  - npm

  ### Install Dependencies
  ```bash
  cd scorm-builder
  npm install

  📦 Build Any Topic:

  Important: Use -- before the topic parameter for cross-platform compatibility (Windows & Mac)

  Build for development

  npm run test:topic -- --topic=TestingAI-M1-T2

  Build for production

  npm run build:prod -- --topic=TestingAI-M1-T2

  Build all topics

  npm run build:all

  🧪 Test Any Topic:

  Important: Use -- before the topic parameter for cross-platform compatibility (Windows & Mac)

  Complete test workflow for any topic

  npm run test:topic -- --topic=TestingAI-M1-T2
  npm run test:topic -- --topic=Robotics-M1-T1
  npm run test:topic -- --topic=Robotics-M1-T2

  Individual Commands

  # Validate topic configurations
  npm run validate

  # Build specific topic (development mode with backend URL)
  npm run build:topic -- --topic=TestingAI-M1-T2

  # Extract topic from built package
  npm run extract

  # Start test server
  npm run serve:test

  🔧 Cross-Platform Compatibility

  This project now supports both Windows and Mac/Linux operating systems:

  ✅ Works on Windows & Mac:

  - All file operations use cross-platform tools (rimraf, mkdirp)
  - Argument passing works with -- separator
  - Path handling supports spaces in directory names

  ❌ Old Commands (Don't use):

  # These won't work on Windows
  npm run test:topic --topic=TestingAI-M1-T2
  npm run build:topic --topic=TestingAI-M1-T2

  ✅ New Commands (Cross-platform):

  # These work on both Windows and Mac
  npm run test:topic -- --topic=TestingAI-M1-T2
  npm run build:topic -- --topic=TestingAI-M1-T2

  📁 Project Structure

  scorm-builder/
  ├── scripts/           # Helper scripts for cross-platform compatibility
  ├── topics/           # Topic configurations and assets
  ├── output/           # Generated SCORM packages
  ├── test-output/      # Extracted test packages
  ├── templates/        # SCORM templates
  └── web-ui/          # Web interface

  🌐 Test Server

  When you run npm run test:topic, the test server starts at:
  - Main URL: http://localhost:8080
  - Health Check: http://localhost:8080/health

  🔄 Development Workflow

  1. Create/Update Topic: Add topic files to topics/ directory
  2. Validate: npm run validate
  3. Test: npm run test:topic -- --topic=YourTopicName
  4. Deploy: Use generated .zip files in output/ directory

  🛠️ Troubleshooting

  Command Not Working?

  - Make sure to use -- --topic= (double dash)
  - Check if topic exists in topics/ directory
  - Ensure all dependencies are installed

  Path Issues on Windows?

  - All paths are now handled cross-platform
  - Spaces in directory names are supported
  - Use quotes around paths if needed manually

  📝 Notes

  - Backend URL for development: https://learning-platform-ecosystem.onrender.com
  - Generated packages are SCORM 2004 compliant
  - Chat integration included in all packages
  - Image assets are automatically processed and optimized