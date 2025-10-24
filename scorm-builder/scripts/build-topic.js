#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get arguments from command line
const args = process.argv.slice(2);

// Build the complete command to run build.js with all arguments
const buildProcess = spawn('node', [path.join(__dirname, '..', 'build.js'), ...args], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('exit', (code) => {
  process.exit(code);
});