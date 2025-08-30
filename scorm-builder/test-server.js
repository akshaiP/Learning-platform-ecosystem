const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files from test directory
app.use(express.static(path.join(__dirname, 'test-output')));

// Main test page
app.get('/', (req, res) => {
  const testDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(testDir)) {
    return res.send(`
      <h1>No Test Package Found</h1>
      <p>Run <code>npm run test:topic --topic=your-topic-name</code> first.</p>
    `);
  }
  
  const indexPath = path.join(testDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <h1>No Content Extracted</h1>
      <p>Run <code>npm run test:topic --topic=your-topic-name</code> first.</p>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  const outputDir = path.join(__dirname, 'output');
  const testDir = path.join(__dirname, 'test-output');
  
  const availablePackages = fs.existsSync(outputDir) 
    ? fs.readdirSync(outputDir).filter(f => f.endsWith('.zip')).map(f => f.replace('.zip', ''))
    : [];
    
  const testContent = fs.existsSync(path.join(testDir, 'index.html'));
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    availablePackages,
    testContent,
    directories: {
      output: outputDir,
      testOutput: testDir
    }
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`🌐 SCORM Test Server running at http://localhost:${PORT}`);
  console.log(`📦 Test your SCORM package: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\n📋 Instructions:`);
  console.log(`1. Ensure your chat backend is running on http://localhost:3000`);
  console.log(`2. Open http://localhost:${PORT} in your browser`);
  console.log(`3. Test all chat functionality`);
});