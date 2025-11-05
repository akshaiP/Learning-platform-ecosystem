#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get arguments from command line
const args = process.argv.slice(2);

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    // Ensure paths are properly quoted for Windows
    const safeArgs = args.map(arg => arg.includes(' ') ? `"${arg}"` : arg);

    const childProcess = spawn(command, safeArgs, {
      stdio: 'inherit',
      shell: true
    });

    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    // Run build with arguments + default dev parameters
    const buildArgs = [...args, '--dev', '--backend', 'https://learning-platform-ecosystem.onrender.com'];
    await runCommand('node', [path.join(__dirname, '..', 'build.js'), ...buildArgs]);

    // Run extract
    await runCommand('node', [path.join(__dirname, 'extract-topic.js')]);

    // Run test server
    await runCommand('node', [path.join(__dirname, '..', 'test-server.js')]);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();