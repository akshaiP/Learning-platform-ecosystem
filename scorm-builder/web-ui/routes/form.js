const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const topicService = require('../../services/topic-service');

// Load draft data
router.get('/load-draft', async (req, res) => {
    try {
        const draftPath = path.join(__dirname, '../drafts', 'current.json');
        
        if (await fs.pathExists(draftPath)) {
            const draft = await fs.readJson(draftPath);
            res.json({ success: true, data: draft });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (error) {
        console.error('Error loading draft:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save draft data
router.post('/save-draft', async (req, res) => {
    try {
        const draftDir = path.join(__dirname, '../drafts');
        const draftPath = path.join(draftDir, 'current.json');
        
        await fs.ensureDir(draftDir);
        await fs.writeJson(draftPath, req.body, { spaces: 2 });
        
        res.json({ 
            success: true, 
            message: 'Draft saved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validate form data
router.post('/validate', (req, res) => {
    try {
        const errors = validateFormData(req.body);
        
        res.json({
            success: errors.length === 0,
            errors: errors,
            isValid: errors.length === 0
        });
    } catch (error) {
        console.error('Error validating form:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validation function
function validateFormData(data) {
    const errors = [];
    
    // Required fields
    if (!data.title || data.title.trim() === '') {
        errors.push({ field: 'title', message: 'Title is required' });
    }
    
    if (!data.topicId || data.topicId.trim() === '') {
        errors.push({ field: 'topicId', message: 'Topic ID is required' });
    }
    
    if (!data.description || data.description.trim() === '') {
        errors.push({ field: 'description', message: 'Description is required' });
    }
    
    if (!data.taskStatement || data.taskStatement.trim() === '') {
        errors.push({ field: 'taskStatement', message: 'Task statement is required' });
    }
    
    // Topic ID format validation
    if (data.topicId && !/^[a-z0-9-]+$/.test(data.topicId)) {
        errors.push({ 
            field: 'topicId', 
            message: 'Topic ID can only contain lowercase letters, numbers, and hyphens' 
        });
    }
    
    // Learning objectives validation
    if (data.learningObjectives && Array.isArray(data.learningObjectives)) {
        if (data.learningObjectives.length === 0) {
            errors.push({ field: 'learningObjectives', message: 'At least one learning objective is recommended' });
        }
    }
    
    // Task steps validation
    if (data.taskSteps && Array.isArray(data.taskSteps)) {
        data.taskSteps.forEach((step, index) => {
            if (!step.title || step.title.trim() === '') {
                errors.push({ 
                    field: `taskSteps[${index}].title`, 
                    message: `Step ${index + 1} title is required` 
                });
            }
            if (!step.instructions || step.instructions.trim() === '') {
                errors.push({ 
                    field: `taskSteps[${index}].instructions`, 
                    message: `Step ${index + 1} instructions are required` 
                });
            }
        });
    }
    
    // Quiz validation
    if (data.quizQuestions && Array.isArray(data.quizQuestions)) {
        data.quizQuestions.forEach((question, index) => {
            if (!question.question || question.question.trim() === '') {
                errors.push({ 
                    field: `quizQuestions[${index}].question`, 
                    message: `Quiz question ${index + 1} text is required` 
                });
            }
            if (!question.options || question.options.length < 2) {
                errors.push({ 
                    field: `quizQuestions[${index}].options`, 
                    message: `Quiz question ${index + 1} must have at least 2 options` 
                });
            }
            
            // Validate question type
            const questionType = question.type || 'mcq';
            if (questionType === 'mcq') {
                // Single choice validation
                if (typeof question.correctAnswer !== 'number' || 
                    question.correctAnswer < 0 || 
                    question.correctAnswer >= question.options.length) {
                    errors.push({ 
                        field: `quizQuestions[${index}].correctAnswer`, 
                        message: `Quiz question ${index + 1} must have a valid correct answer selected` 
                    });
                }
            } else if (questionType === 'checkbox') {
                // Multiple choice validation
                if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
                    errors.push({ 
                        field: `quizQuestions[${index}].correctAnswers`, 
                        message: `Quiz question ${index + 1} must have at least one correct answer selected` 
                    });
                } else {
                    // Validate that all selected answers are within valid range
                    const invalidAnswers = question.correctAnswers.filter(answer => 
                        typeof answer !== 'number' || answer < 0 || answer >= question.options.length
                    );
                    if (invalidAnswers.length > 0) {
                        errors.push({ 
                            field: `quizQuestions[${index}].correctAnswers`, 
                            message: `Quiz question ${index + 1} has invalid correct answer selections` 
                        });
                    }
                }
            }
        });
    }
    
    return errors;
}

module.exports = router;
 
// Cloud topic management routes
router.get('/topics', async (req, res) => {
    try {
        const result = await topicService.listTopics('default', 200);
        res.json({ success: true, topics: result.topics });
    } catch (error) {
        console.error('Error listing topics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/topics/:id', async (req, res) => {
    try {
        const topicId = req.params.id;
        const result = await topicService.loadTopic(topicId, 'default');
        // Build image URL map from Cloud Storage
        const prefix = `topics/default/${topicId}/images/`;
        const cloudServices = require('../../services/cloud-services');
        const files = await cloudServices.listFiles(prefix);
        const imageUrls = {};
        for (const f of files) {
            const filename = require('path').basename(f.name);
            try {
                const signed = await cloudServices.getSignedUrl(f.name, 3600);
                imageUrls[filename] = signed;
            } catch (_) {
                imageUrls[filename] = f.url; // fallback (may be 403 if bucket is private)
            }
        }
        res.json({ success: true, data: result.data, imageUrls });
    } catch (error) {
        console.error('Error loading topic:', error);
        res.status(404).json({ success: false, error: error.message });
    }
});

router.post('/topics', async (req, res) => {
    try {
        const body = req.body || {};
        const topicId = (body.topicId || '').trim() || null;
        const saveResult = await topicService.saveTopic(body, 'default', topicId);
        res.json({ success: true, topicId: saveResult.topicId, data: saveResult.data });
    } catch (error) {
        console.error('Error saving topic:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/topics/:id', async (req, res) => {
    try {
        const updateData = req.body || {};
        const result = await topicService.updateTopic(req.params.id, updateData, 'default');
        res.json({ success: true, topicId: result.topicId, data: result.data });
    } catch (error) {
        console.error('Error updating topic:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/topics/:id', async (req, res) => {
    try {
        const result = await topicService.deleteTopic(req.params.id, 'default');
        res.json({ success: true, topicId: result.topicId, deletedImages: result.deletedImages });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});