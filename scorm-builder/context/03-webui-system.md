# WebUI System - Form Handling and User Interface

## Overview
The WebUI provides a user-friendly interface for creating, managing, and building SCORM topics. It handles form validation, image uploads, cloud integration, and real-time preview capabilities.

## Core WebUI Components

### 1. Main WebUI Server
**File**: `web-ui/server.js`

Express.js server that handles all web interface functionality.

#### Key Features
- Static file serving for frontend assets
- API endpoints for topic management
- Image upload handling with validation
- Session management and security
- CORS handling for cross-origin requests
- Error handling and logging

#### Server Configuration
```javascript
const app = express();

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Security headers
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

#### Route Structure
```javascript
// Static routes
app.use('/', formRoutes);           // Main form interface
app.use('/upload', uploadRoutes);   // Image upload handling
app.use('/build', buildRoutes);     // Build management

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WebUI running on http://localhost:${PORT}`);
});
```

### 2. Form Interface Routes
**File**: `web-ui/routes/form.js`

Handles the main topic creation and editing interface.

#### Routes Defined
```javascript
// Main form interface
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Topic management APIs
router.get('/api/topics/:id', getTopic);
router.post('/api/topics', saveTopic);
router.put('/api/topics/:id', updateTopic);
router.delete('/api/topics/:id', deleteTopic);

// Cloud synchronization
router.get('/api/sync/from-cloud/:topicId', syncFromCloud);
router.post('/api/sync/to-cloud/:topicId', syncToCloud);
```

#### Topic Management Functions
```javascript
// Load existing topic
async function getTopic(req, res) {
    try {
        const { id } = req.params;

        // Try cloud first, then local
        let topicData;
        try {
            const cloudTopic = await topicService.loadTopic(id);
            topicData = cloudTopic.data;
        } catch (cloudError) {
            // Fallback to local storage
            topicData = await loadLocalTopic(id);
        }

        res.json({ success: true, data: topicData });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
}

// Save topic (cloud preferred, local fallback)
async function saveTopic(req, res) {
    try {
        const topicData = req.body;
        const topicId = generateTopicId(topicData.title);

        // Save to cloud
        try {
            await topicService.saveTopic(topicData, req.session.userId, topicId);
        } catch (cloudError) {
            // Fallback to local storage
            await saveLocalTopic(topicId, topicData);
        }

        res.json({ success: true, topicId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
```

### 3. Image Upload System
**File**: `web-ui/routes/upload.js`

Handles secure image uploads with validation and processing.

#### Upload Configuration
```javascript
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        fs.ensureDirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueName}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 20 // Maximum 20 files
    },
    fileFilter: fileFilter
});
```

#### File Validation
```javascript
function fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif'];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExt.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and GIF images are allowed.'), false);
    }
}
```

#### Upload Endpoints
```javascript
// Single image upload
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Process uploaded image
        const processedImage = await processImage(req.file);

        // Upload to cloud storage
        const cloudUrl = await uploadToCloud(processedImage);

        // Clean up local file
        await fs.remove(req.file.path);

        res.json({
            success: true,
            url: cloudUrl,
            filename: processedImage.filename,
            size: processedImage.size
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Multiple images upload
router.post('/images', upload.array('images', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadPromises = req.files.map(async (file) => {
            const processedImage = await processImage(file);
            const cloudUrl = await uploadToCloud(processedImage);
            await fs.remove(file.path);

            return {
                url: cloudUrl,
                filename: processedImage.filename,
                originalName: file.originalname,
                size: processedImage.size
            };
        });

        const uploadedImages = await Promise.all(uploadPromises);

        res.json({
            success: true,
            images: uploadedImages
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### 4. Build Management Interface
**File**: `web-ui/routes/build.js`

Handles SCORM package building through the web interface.

#### Build Triggers
```javascript
// Build single topic
router.post('/topic/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        const buildOptions = {
            backendUrl: req.body.backendUrl,
            chatMode: req.body.chatMode,
            prod: req.body.prod || false
        };

        // Trigger build process
        const buildResult = await buildTopic(topicId, buildOptions);

        res.json({
            success: true,
            packageUrl: `/downloads/${buildResult.packageName}`,
            buildLog: buildResult.log
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Build multiple topics
router.post('/batch', async (req, res) => {
    try {
        const { topicIds, buildOptions } = req.body;

        const buildPromises = topicIds.map(topicId =>
            buildTopic(topicId, buildOptions)
        );

        const buildResults = await Promise.all(buildPromises);

        res.json({
            success: true,
            results: buildResults,
            batchPackageUrl: `/downloads/batch-${Date.now()}.zip`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

#### Build Status Monitoring
```javascript
// Real-time build status updates
router.get('/status/:buildId', (req, res) => {
    const { buildId } = req.params;
    const status = buildStatusTracker.getStatus(buildId);

    res.json({
        buildId,
        status: status.status, // 'pending', 'running', 'completed', 'failed'
        progress: status.progress,
        message: status.message,
        logs: status.logs
    });
});
```

### 5. Frontend Form Handler
**File**: `web-ui/public/js/form-handler.js`

Manages the client-side form interactions and data management.

#### Form Structure Management
```javascript
class TopicFormHandler {
    constructor() {
        this.currentTopic = null;
        this.formState = 'new'; // 'new', 'edit', 'preview'
        this.uploadedImages = new Map();
        this.autoSaveTimer = null;
    }

    initialize() {
        this.setupFormValidation();
        this.setupImageUpload();
        this.setupAutoSave();
        this.setupPreviewMode();
        this.loadSavedTopics();
    }
}
```

#### Dynamic Form Sections
```javascript
// Task Steps Management
addTaskStep() {
    const stepId = `step-${Date.now()}`;
    const stepHTML = `
        <div class="task-step" data-step-id="${stepId}">
            <div class="step-header">
                <input type="text" class="step-title" placeholder="Step Title" required>
                <button type="button" onclick="formHandler.removeStep('${stepId}')" class="remove-step">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <textarea class="step-description" placeholder="Step Description"></textarea>
            <textarea class="step-instructions" placeholder="Step Instructions (supports HTML)"></textarea>
            <div class="step-images">
                <button type="button" onclick="formHandler.uploadImages('${stepId}')" class="upload-btn">
                    <i class="fas fa-image"></i> Add Images
                </button>
                <div class="images-container"></div>
            </div>
            <div class="step-code">
                <input type="text" class="code-language" placeholder="Language (e.g., javascript, python)">
                <textarea class="code-content" placeholder="Code Content"></textarea>
            </div>
            <div class="step-hint">
                <textarea class="hint-text" placeholder="Hint Text"></textarea>
                <div class="hint-images">
                    <button type="button" onclick="formHandler.uploadHintImages('${stepId}')" class="upload-btn">
                        <i class="fas fa-image"></i> Add Hint Images
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('task-steps-container').insertAdjacentHTML('beforeend', stepHTML);
}

// Quiz Questions Management
addQuizQuestion() {
    const questionId = `question-${Date.now()}`;
    const questionHTML = `
        <div class="quiz-question" data-question-id="${questionId}">
            <div class="question-header">
                <input type="text" class="question-text" placeholder="Question Text" required>
                <select class="question-type">
                    <option value="mcq">Single Choice (MCQ)</option>
                    <option value="checkbox">Multiple Choice</option>
                </select>
                <button type="button" onclick="formHandler.removeQuestion('${questionId}')" class="remove-question">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="question-options">
                <button type="button" onclick="formHandler.addOption('${questionId}')" class="add-option">
                    <i class="fas fa-plus"></i> Add Option
                </button>
                <div class="options-container"></div>
            </div>
            <div class="question-explanation">
                <textarea placeholder="Explanation (shown after answer)"></textarea>
                <div class="explanation-image">
                    <button type="button" onclick="formHandler.uploadExplanationImage('${questionId}')" class="upload-btn">
                        <i class="fas fa-image"></i> Add Explanation Image
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('quiz-questions-container').insertAdjacentHTML('beforeend', questionHTML);
}
```

#### Form Validation
```javascript
setupFormValidation() {
    const form = document.getElementById('topic-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!this.validateForm()) {
            this.showErrors(this.validationErrors);
            return;
        }

        const topicData = this.collectFormData();
        await this.saveTopic(topicData);
    });
}

validateForm() {
    this.validationErrors = [];

    // Required fields validation
    const title = document.getElementById('topic-title').value.trim();
    if (!title) {
        this.validationErrors.push('Topic title is required');
    }

    const description = document.getElementById('topic-description').value.trim();
    if (!description) {
        this.validationErrors.push('Topic description is required');
    }

    // Task steps validation
    const taskSteps = this.getTaskSteps();
    if (taskSteps.length === 0) {
        this.validationErrors.push('At least one task step is required');
    } else {
        taskSteps.forEach((step, index) => {
            if (!step.title) {
                this.validationErrors.push(`Step ${index + 1}: Title is required`);
            }
            if (!step.instructions) {
                this.validationErrors.push(`Step ${index + 1}: Instructions are required`);
            }
        });
    }

    // Quiz validation
    const quizQuestions = this.getQuizQuestions();
    if (quizQuestions.length > 0) {
        quizQuestions.forEach((question, index) => {
            if (!question.question) {
                this.validationErrors.push(`Quiz Question ${index + 1}: Question text is required`);
            }
            if (!question.options || question.options.length < 2) {
                this.validationErrors.push(`Quiz Question ${index + 1}: At least 2 options required`);
            }
            if (question.type === 'mcq' && question.correctAnswer === undefined) {
                this.validationErrors.push(`Quiz Question ${index + 1}: Correct answer must be selected`);
            }
            if (question.type === 'checkbox' && (!question.correctAnswers || question.correctAnswers.length === 0)) {
                this.validationErrors.push(`Quiz Question ${index + 1}: At least one correct answer must be selected`);
            }
        });
    }

    return this.validationErrors.length === 0;
}
```

#### Auto-Save Functionality
```javascript
setupAutoSave() {
    const formElements = document.querySelectorAll('#topic-form input, #topic-form textarea, #topic-form select');

    formElements.forEach(element => {
        element.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => {
                this.autoSave();
            }, 2000); // Auto-save after 2 seconds of inactivity
        });
    });
}

async autoSave() {
    try {
        const topicData = this.collectFormData();

        // Save to localStorage as backup
        localStorage.setItem('topic-autosave', JSON.stringify({
            data: topicData,
            timestamp: Date.now()
        }));

        // Save to backend
        if (this.currentTopic && this.currentTopic.id) {
            await this.saveToBackend(topicData, true); // Silent save
            this.showAutoSaveIndicator();
        }
    } catch (error) {
        console.warn('Auto-save failed:', error);
    }
}
```

### 6. Image Upload Interface
**File**: `web-ui/public/js/image-upload.js`

Handles client-side image uploads with preview and management.

#### Upload Process
```javascript
class ImageUploader {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        this.uploadQueue = [];
    }

    async uploadImages(files, container, type = 'step') {
        const validFiles = this.validateFiles(files);

        if (validFiles.length === 0) {
            this.showError('No valid files selected');
            return;
        }

        const uploadPromises = validFiles.map(file => this.uploadSingleImage(file, type));

        try {
            const results = await Promise.all(uploadPromises);
            this.displayUploadedImages(results, container);
            return results;
        } catch (error) {
            this.showError('Upload failed: ' + error.message);
        }
    }

    async uploadSingleImage(file, type) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', type);

        // Show progress
        const progressId = this.showProgress(file.name);

        try {
            const response = await fetch('/upload/image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.hideProgress(progressId, true);
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.hideProgress(progressId, false);
            throw error;
        }
    }

    validateFiles(files) {
        return Array.from(files).filter(file => {
            if (!this.allowedTypes.includes(file.type)) {
                this.showError(`Invalid file type: ${file.name}`);
                return false;
            }

            if (file.size > this.maxFileSize) {
                this.showError(`File too large: ${file.name} (max 5MB)`);
                return false;
            }

            return true;
        });
    }
}
```

#### Image Preview and Management
```javascript
displayUploadedImages(images, container) {
    images.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'uploaded-image';
        imageElement.innerHTML = `
            <div class="image-preview">
                <img src="${image.url}" alt="${image.originalName}">
                <div class="image-overlay">
                    <button type="button" onclick="imageUploader.removeImage('${image.url}', this)" class="remove-image">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" onclick="imageUploader.setAsCover('${image.url}', this)" class="set-cover">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
            </div>
            <div class="image-info">
                <input type="text" class="image-alt" placeholder="Alt text" value="${image.originalName}">
                <input type="text" class="image-caption" placeholder="Caption (optional)">
                <input type="hidden" class="image-url" value="${image.url}">
            </div>
        `;

        container.appendChild(imageElement);
    });
}
```

### 7. Preview System
**File**: `web-ui/public/js/preview.js`

Provides real-time preview of the topic as it would appear in the final SCORM package.

#### Preview Generation
```javascript
class PreviewManager {
    constructor() {
        this.previewWindow = null;
        this.previewData = null;
    }

    async generatePreview() {
        const topicData = this.collectFormData();

        try {
            // Generate preview HTML
            const previewHTML = await this.generatePreviewHTML(topicData);

            // Open preview window
            this.openPreviewWindow(previewHTML);

            // Store preview data
            this.previewData = topicData;
        } catch (error) {
            this.showError('Preview generation failed: ' + error.message);
        }
    }

    async generatePreviewHTML(topicData) {
        // Send topic data to preview endpoint
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(topicData)
        });

        if (!response.ok) {
            throw new Error('Preview generation failed');
        }

        return await response.text();
    }

    openPreviewWindow(html) {
        if (this.previewWindow && !this.previewWindow.closed) {
            this.previewWindow.close();
        }

        this.previewWindow = window.open('', 'preview', 'width=1200,height=800,scrollbars=yes');

        if (this.previewWindow) {
            this.previewWindow.document.write(html);
            this.previewWindow.document.close();
        } else {
            this.showError('Please allow popups for preview functionality');
        }
    }
}
```

### 8. Cloud Integration Interface

#### Cloud Synchronization
```javascript
class CloudSyncManager {
    constructor() {
        this.syncStatus = 'idle';
        this.lastSyncTime = null;
    }

    async syncToCloud(topicData) {
        try {
            this.setSyncStatus('syncing');

            const response = await fetch('/api/sync/to-cloud', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(topicData)
            });

            const result = await response.json();

            if (result.success) {
                this.setSyncStatus('synced');
                this.lastSyncTime = Date.now();
                this.showSuccess('Topic synced to cloud successfully');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.setSyncStatus('error');
            this.showError('Cloud sync failed: ' + error.message);
        }
    }

    async syncFromCloud(topicId) {
        try {
            this.setSyncStatus('loading');

            const response = await fetch(`/api/sync/from-cloud/${topicId}`);
            const result = await response.json();

            if (result.success) {
                this.loadTopicData(result.data);
                this.setSyncStatus('loaded');
                this.showSuccess('Topic loaded from cloud successfully');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.setSyncStatus('error');
            this.showError('Cloud load failed: ' + error.message);
        }
    }

    setSyncStatus(status) {
        this.syncStatus = status;
        const indicator = document.getElementById('sync-indicator');

        if (indicator) {
            indicator.className = `sync-indicator status-${status}`;

            const statusText = {
                'idle': 'Ready',
                'syncing': 'Syncing...',
                'synced': 'Synced',
                'loading': 'Loading...',
                'loaded': 'Loaded',
                'error': 'Error'
            };

            indicator.textContent = statusText[status] || status;
        }
    }
}
```

### 9. User Interface Components

#### Navigation and Controls
```html
<!-- Main Navigation -->
<nav class="main-nav">
    <div class="nav-brand">
        <h1>SCORM Builder</h1>
    </div>
    <div class="nav-actions">
        <button id="new-topic-btn" class="btn btn-primary">
            <i class="fas fa-plus"></i> New Topic
        </button>
        <button id="load-topic-btn" class="btn btn-secondary">
            <i class="fas fa-folder-open"></i> Load Topic
        </button>
        <button id="preview-btn" class="btn btn-info">
            <i class="fas fa-eye"></i> Preview
        </button>
        <button id="build-btn" class="btn btn-success">
            <i class="fas fa-cog"></i> Build SCORM
        </button>
    </div>
</nav>

<!-- Sync Status Indicator -->
<div id="sync-indicator" class="sync-indicator status-idle">
    Ready
</div>
```

#### Form Sections
```html
<!-- Basic Information -->
<section class="form-section">
    <h2>Basic Information</h2>
    <div class="form-group">
        <label for="topic-title">Topic Title *</label>
        <input type="text" id="topic-title" required>
    </div>
    <div class="form-group">
        <label for="topic-description">Description *</label>
        <textarea id="topic-description" required></textarea>
    </div>
    <div class="form-group">
        <label for="learning-objectives">Learning Objectives</label>
        <div id="learning-objectives-container">
            <button type="button" onclick="formHandler.addLearningObjective()" class="add-objective">
                <i class="fas fa-plus"></i> Add Objective
            </button>
        </div>
    </div>
</section>

<!-- Task Steps -->
<section class="form-section">
    <h2>Task Steps</h2>
    <div id="task-steps-container">
        <button type="button" onclick="formHandler.addTaskStep()" class="add-step">
            <i class="fas fa-plus"></i> Add Task Step
        </button>
    </div>
</section>

<!-- Quiz Section -->
<section class="form-section">
    <h2>Knowledge Check</h2>
    <div class="quiz-settings">
        <label>
            <input type="checkbox" id="enable-quiz">
            Enable Quiz
        </label>
    </div>
    <div id="quiz-container" class="hidden">
        <div class="form-group">
            <label for="quiz-title">Quiz Title</label>
            <input type="text" id="quiz-title">
        </div>
        <div id="quiz-questions-container">
            <button type="button" onclick="formHandler.addQuizQuestion()" class="add-question">
                <i class="fas fa-plus"></i> Add Question
            </button>
        </div>
    </div>
</section>
```

## WebUI Workflow

### 1. Topic Creation Flow
```javascript
// 1. Initialize new topic form
function createNewTopic() {
    formHandler.resetForm();
    formHandler.setFormState('new');
    showSection('basic-info');
}

// 2. Fill in basic information
function saveBasicInfo() {
    const basicInfo = {
        title: document.getElementById('topic-title').value,
        description: document.getElementById('topic-description').value,
        learningObjectives: getLearningObjectives()
    };

    formHandler.updateTopicData(basicInfo);
    showSection('task-steps');
}

// 3. Add task steps
function addTaskStep() {
    formHandler.addTaskStep();
    // Enable drag-and-drop reordering
    enableStepReordering();
}

// 4. Configure quiz (optional)
function enableQuiz() {
    document.getElementById('quiz-container').classList.remove('hidden');
    formHandler.addQuizQuestion();
}

// 5. Review and preview
function reviewTopic() {
    const topicData = formHandler.collectFormData();
    previewManager.generatePreview(topicData);
}

// 6. Save and build
function saveAndBuild() {
    const topicData = formHandler.collectFormData();
    formHandler.saveTopic(topicData).then(() => {
        buildManager.buildTopic(topicData.id);
    });
}
```

### 2. Real-time Validation
```javascript
// Field-level validation
document.getElementById('topic-title').addEventListener('input', function() {
    const value = this.value.trim();
    const errorElement = document.getElementById('title-error');

    if (value.length === 0) {
        errorElement.textContent = 'Topic title is required';
        this.classList.add('error');
    } else if (value.length < 3) {
        errorElement.textContent = 'Topic title must be at least 3 characters';
        this.classList.add('error');
    } else {
        errorElement.textContent = '';
        this.classList.remove('error');
    }
});

// Step validation
function validateTaskStep(stepElement) {
    const title = stepElement.querySelector('.step-title').value.trim();
    const instructions = stepElement.querySelector('.step-instructions').value.trim();

    let isValid = true;

    if (!title) {
        showFieldError(stepElement.querySelector('.step-title'), 'Step title is required');
        isValid = false;
    }

    if (!instructions) {
        showFieldError(stepElement.querySelector('.step-instructions'), 'Step instructions are required');
        isValid = false;
    }

    return isValid;
}
```

### 3. Error Handling and User Feedback

#### Error Display System
```javascript
class ErrorHandler {
    showErrors(errors) {
        const errorContainer = document.getElementById('error-container');
        errorContainer.innerHTML = '';

        errors.forEach(error => {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>${error}</span>
                <button type="button" onclick="this.parentElement.remove()" class="dismiss-error">
                    <i class="fas fa-times"></i>
                </button>
            `;
            errorContainer.appendChild(errorElement);
        });

        errorContainer.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getIconForType(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getIconForType(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}
```

## Security Considerations

### 1. Input Validation
- Server-side validation of all form inputs
- Sanitization of HTML content in instructions
- File type and size validation for uploads
- XSS protection for user-generated content

### 2. Authentication and Authorization
- Session-based authentication
- Role-based access control
- CSRF protection
- Rate limiting on API endpoints

### 3. File Upload Security
- File type validation by MIME type and extension
- File size limits enforcement
- Virus scanning for uploaded files
- Secure file storage with access controls

## Performance Optimizations

### 1. Frontend Optimizations
- Lazy loading of form sections
- Debounced auto-save to reduce server requests
- Image compression before upload
- Progressive loading of uploaded images

### 2. Backend Optimizations
- Caching of topic data
- Efficient image processing pipelines
- Background job processing for builds
- Database query optimization

### 3. Network Optimizations
- Compression of API responses
- CDN for static assets
- Optimized image delivery
- Connection pooling for database

## Mobile Responsiveness

### 1. Responsive Design
- Mobile-first CSS approach
- Touch-friendly interface elements
- Adaptive layouts for different screen sizes
- Optimized image handling for mobile

### 2. Touch Interactions
- Swipe gestures for image carousels
- Touch-optimized form controls
- Mobile-friendly drag-and-drop
- Keyboard accessibility

## Best Practices

### 1. User Experience
- Clear visual hierarchy
- Intuitive navigation flow
- Consistent design patterns
- Accessibility compliance

### 2. Data Management
- Regular auto-save functionality
- Conflict resolution for collaborative editing
- Version history for topic changes
- Backup and recovery mechanisms

### 3. Error Handling
- Graceful degradation for errors
- Clear error messages
- Recovery options for users
- Comprehensive logging for debugging