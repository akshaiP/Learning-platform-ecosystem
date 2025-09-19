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

// **NEW: Serve preview content from test-output**
app.use('/preview', express.static(path.join(__dirname, '../test-output')));

// **NEW: Preview route**
app.get('/preview', (req, res) => {
  const testOutputPath = path.join(__dirname, '../test-output/index.html');
  
  if (fs.existsSync(testOutputPath)) {
    res.sendFile(testOutputPath);
  } else {
    res.status(404).send(`
      <h1>No Preview Available</h1>
      <p>Generate a SCORM package first to see the preview.</p>
      <a href="/">← Back to Builder</a>
    `);
  }
});

// **UPDATED: Preview endpoint**
app.post('/start-preview', async (req, res) => {
  try {
      const testOutputPath = path.join(__dirname, '../test-output');
      if (!await fs.pathExists(testOutputPath)) {
          return res.status(400).json({ 
              success: false, 
              error: 'No test content found. Generate a SCORM package first.' 
          });
      }
      
      const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      
      res.json({ 
          success: true, 
          previewUrl: `${baseUrl}/preview`,
          message: 'Preview ready'
      });
  } catch (error) {
      res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SCORM Builder running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 Preview available at /preview`);
});

module.exports = app;