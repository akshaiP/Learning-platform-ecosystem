const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { buildTopic } = require('../build.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/form', require('./routes/form'));
app.use('/build', require('./routes/build'));
app.use('/upload', require('./routes/upload'));

// Main page
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'SCORM Builder - Create Learning Content',
    pageType: 'form'
  });
});

app.get('/preview', (req, res) => {
    res.redirect('http://localhost:8080');
});

app.post('/start-preview', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        console.log('🌐 Starting test server for preview...');
        
        // Check if test-output exists
        const testOutputPath = path.join(__dirname, '../test-output');
        if (!await fs.pathExists(testOutputPath)) {
            return res.status(400).json({ 
                success: false, 
                error: 'No test content found. Generate a SCORM package first.' 
            });
        }
        
        // Start the serve:test command in the background
        const serveCommand = 'npm run serve:test';
        
        // Use spawn instead of exec to keep it running
        const { spawn } = require('child_process');
        const testServer = spawn('npm', ['run', 'serve:test'], {
            cwd: path.join(__dirname, '..'),
            detached: false,
            stdio: 'ignore'
        });
        
        // Don't wait for the server to finish
        testServer.unref();
        
        res.json({ 
            success: true, 
            previewUrl: 'http://localhost:8080',
            message: 'Test server started successfully'
        });
        
    } catch (error) {
        console.error('Preview start error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SCORM Builder Web UI running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'public/uploads')}`);
});

module.exports = app;