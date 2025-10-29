#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get arguments from command line
let args = process.argv.slice(2);

// Check if topic is passed via environment variable (for web UI compatibility)
if (process.env.npm_config_topic && !args.includes('--topic')) {
  args = ['--topic', process.env.npm_config_topic, ...args];
}

// Build the complete command to run build.js with all arguments
const buildJsPath = path.join(__dirname, '..', 'build.js');
const buildProcess = spawn('node', [buildJsPath, ...args], {
  stdio: 'inherit',
  shell: false
});

buildProcess.on('exit', (code) => {
  process.exit(code);
});