const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configure multer for file uploads
const upload = multer({
    dest: path.join(__dirname, '../public/uploads/temp'),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Generate SCORM package using existing build system
router.post('/generate', upload.any(), async (req, res) => {
    let topicId = null;
    let tempTopicDir = null;
    
    try {
        console.log('🚀 Starting SCORM generation using existing build system...');
        console.log('Raw form data keys:', Object.keys(req.body));
        console.log('Files received:', req.files?.length || 0);
        if (req.files && req.files.length) {
            console.log('File fieldnames:', req.files.map(f => f.fieldname));
        }
        
        // Generate unique topic ID
        topicId = req.body.topicId || `topic_${Date.now()}`;
        // Save topics under scorm-builder/topics so the existing builder can find them
        tempTopicDir = path.join(__dirname, '../../topics', topicId);
        
        // Process form data and create proper config.json
        await createTopicFromFormData(req.body, req.files, tempTopicDir);
        
        console.log(`✅ Topic created: ${topicId}`);
        
        // Use your existing build system with correct working directory
        const buildResult = await buildUsingExistingSystem(topicId);
        
        // Extract to test-output for preview
        await extractForPreview();
        
        // Clean up temp topic (but keep it until response is sent)
        setTimeout(() => {
            fs.remove(tempTopicDir).catch(() => {});
        }, 5000);
        
        res.json({
            success: true,
            filename: buildResult.filename,
            downloadUrl: `/downloads/${buildResult.filename}`,
            size: buildResult.size,
            previewUrl: '/preview', // Changed from localhost:8080
            topicId: topicId
        });
        
    } catch (error) {
        console.error('❌ SCORM generation failed:', error);
        
        // Clean up on error
        if (tempTopicDir) await fs.remove(tempTopicDir).catch(() => {});
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path).catch(() => {});
            }
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create topic using your existing structure
async function createTopicFromFormData(body, files, topicDir) {
    console.log('📁 Creating topic directory and config...');
    console.log('Form body keys:', Object.keys(body));
    
    const imagesDir = path.join(topicDir, 'images');
    await fs.ensureDir(imagesDir);
    
    // Copy nebula logo
    // Look for a default logo inside scorm-builder/topics
    const nebulaLogoSource = path.join(__dirname, '../../topics/nlp-text-summarization/images/nebula-logo.png');
    if (await fs.pathExists(nebulaLogoSource)) {
        await fs.copy(nebulaLogoSource, path.join(imagesDir, 'nebula-logo.png'));
    }
    
    // Process uploaded images
    const imageMap = {};
    if (files && files.length > 0) {
        console.log(`📸 Processing ${files.length} uploaded images...`);
        
        for (const file of files) {
            const ext = path.extname(file.originalname);
            const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const newFilename = `${file.fieldname.replace(/[\[\]]/g, '_')}-${unique}${ext}`;
            const destination = path.join(imagesDir, newFilename);
            
            await fs.move(file.path, destination);
            if (!imageMap[file.fieldname]) imageMap[file.fieldname] = [];
            imageMap[file.fieldname].push(newFilename);
            console.log(`✅ Processed: ${file.originalname} (${file.fieldname}) → ${newFilename}`);
        }
    }
    
    // Parse form data properly - handle both JSON strings and direct values
    // Prefer JSON field to avoid mixing with learningObjectives[] flat inputs
    const learningObjectives = parseFormArray(body.learningObjectivesJson || body.learningObjectives);
    const taskSteps = parseItemsFlexible(body, 'taskStep', 'taskSteps');
    const concepts = parseItemsFlexible(body, 'concept', 'concepts');
    const quizQuestions = parseItemsFlexible(body, 'quizQuestion', 'quizQuestions');
    
    console.log('📊 Form data parsed:', {
        learningObjectives: learningObjectives.length,
        taskSteps: taskSteps.length,
        concepts: concepts.length,
        quizQuestions: quizQuestions.length
    });
    
    // Debug: Log imageMap and parsed items
    console.log('🔍 ImageMap keys:', Object.keys(imageMap));
    console.log('🔍 TaskSteps with _id:', taskSteps.map(s => ({ _id: s._id, title: s.title })));
    console.log('🔍 Concepts with _id:', concepts.map(c => ({ _id: c._id, title: c.title })));
    console.log('🔍 QuizQuestions with _id:', quizQuestions.map(q => ({ _id: q._id, question: q.question })));
    
    // Create config.json in your existing format
    const config = {
        title: body.title || 'Untitled Topic',
        description: body.description || 'No description provided',
        learning_objectives: learningObjectives,
        
        content: {
            company_logo: imageMap.companyLogo && imageMap.companyLogo.length > 0 ? {
                src: imageMap.companyLogo[0],
                alt: body.title || 'Company Logo'
            } : {
                src: 'nebula-logo.png',
                alt: 'Nebula KnowLab Logo'
            },
            task_statement: body.taskStatement || 'Complete the learning task',
            task_steps: processTaskSteps(taskSteps, imageMap),
            hero_image: imageMap.heroImage ? {
                src: Array.isArray(imageMap.heroImage) ? imageMap.heroImage[0] : imageMap.heroImage,
                alt: body.title || 'Hero Image',
                caption: body.heroImageCaption || ''
            } : null,
            concepts: processConcepts(concepts, imageMap)
        },
        
        quiz: processQuiz(quizQuestions, body, imageMap),
        
        chat_contexts: {
            task_help: `Guide the learner through ${body.taskStatement || 'the learning task'} step-by-step`,
            quiz_failed: `Provide detailed explanation and additional context for ${body.title || 'this topic'}`,
            hints_exhausted: `Offer advanced troubleshooting and additional resources for ${body.title || 'this topic'}`
        }
    };
    
    // Write config.json
    await fs.writeJson(path.join(topicDir, 'config.json'), config, { spaces: 2 });
    console.log('✅ Config.json created');
    
    return config;
}

// Parse form array data (learning objectives)
function parseFormArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(x => x && x.trim());
    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed.filter(x => x && x.trim());
        return [];
    } catch {
        return [];
    }
}

// Parse items flexibly: prefer JSON array fields (e.g., taskSteps, concepts, quizQuestions),
// fallback to grouping flat dynamic names like taskStep_step_1_title
function parseItemsFlexible(body, singularPrefix, pluralKey) {
    // 1) Prefer JSON payload if present
    const jsonCandidate = body[pluralKey];
    if (jsonCandidate) {
        try {
            const parsed = typeof jsonCandidate === 'string' ? JSON.parse(jsonCandidate) : jsonCandidate;
            if (Array.isArray(parsed)) {
                // Normalize empty strings and trim, and synthesize stable _id to map images
                const idPrefixMap = { taskStep: 'step', concept: 'concept', quizQuestion: 'question' };
                const idPrefix = idPrefixMap[singularPrefix] || 'item';
                return parsed
                    .map((obj, index) => {
                        const normalized = { _id: `${idPrefix}_${index + 1}` };
                        for (const [k, v] of Object.entries(obj || {})) {
                            if (typeof v === 'string') normalized[k] = v.trim();
                            else normalized[k] = v;
                        }
                        return normalized;
                    })
                    .filter(obj => Object.values(obj).some(v => (typeof v === 'string' ? v.trim() : v)));
            }
        } catch (_) {
            // fall back to flat parsing
        }
    }

    // 2) Fallback: group flat names by id
    const items = [];
    const itemData = {};

    for (const [key, value] of Object.entries(body)) {
        if (!key.startsWith(singularPrefix + '_')) continue;
        // Matches: `${singularPrefix}_${itemId}_${field}`
        const match = key.match(new RegExp(`^${singularPrefix}_(.+?)_(.+)$`));
        if (!match) continue;
        const [, itemId, field] = match;
        if (!itemData[itemId]) itemData[itemId] = {};
        itemData[itemId][field] = value;
    }

    for (const [id, item] of Object.entries(itemData)) {
        if (item.title || item.question) items.push({ _id: id, ...item });
    }

    return items;
}

// Process task steps with images
function processTaskSteps(taskSteps, imageMap) {
    return taskSteps.map((step) => {
        const processedStep = {
            title: step.title || '',
            description: step.description || '',
            instructions: step.instructions || ''
        };
        
        // Attach step images if uploaded: field name pattern `taskStep_${_id}_images`
        if (step._id) {
            const imagesKey = `taskStep_${step._id}_images`;
            const hintImagesKey = `taskStep_${step._id}_hintImages`;
            if (imageMap[imagesKey]) {
                processedStep.images = imageMap[imagesKey].map(fn => ({ src: fn, alt: step.title || 'Step image' }));
            }
            if (imageMap[hintImagesKey]) {
                processedStep.hint = processedStep.hint || {};
                processedStep.hint.images = imageMap[hintImagesKey].map(fn => ({ src: fn, alt: 'Hint image' }));
            }
        }

        // Add code if present
        if (step.code && step.code.trim()) {
            processedStep.code = {
                content: step.code,
                language: step.codeLanguage || 'javascript'
            };
        }
        
        // Add hint if present
        if (step.hintText && step.hintText.trim()) {
            // Merge with existing hint (so we don't lose images)
            processedStep.hint = {
                ...(processedStep.hint || {}),
                text: step.hintText
            };
            
            if (step.hintCode && step.hintCode.trim()) {
                processedStep.hint.code = {
                    content: step.hintCode,
                    language: step.hintCodeLanguage || 'javascript'
                };
            }
        }
        
        return processedStep;
    });
}

// Process concepts with images
function processConcepts(concepts, imageMap) {
    return concepts.map((concept) => {
        const processed = {
            title: concept.title || '',
            summary: concept.summary || '',
            learn_more_context: concept.learnMoreContext || concept.title?.toLowerCase().replace(/\s+/g, '_') || 'concept'
        };

        if (concept._id) {
            const imageKey = `concept_${concept._id}_image`;
            if (imageMap[imageKey] && imageMap[imageKey][0]) {
                processed.image = { src: imageMap[imageKey][0], alt: concept.title || 'Concept image' };
            }
        }

        return processed;
    });
}

// Process quiz with images
function processQuiz(quizQuestions, body, imageMap) {
    if (!quizQuestions || quizQuestions.length === 0) {
        return null;
    }
    
    const questions = quizQuestions.map((question, index) => {
        const q = {
            id: `q${index + 1}`,
            type: question.type || 'mcq', // Default to MCQ for backward compatibility
            question: question.question || '',
            options: parseOptions(question.options) || [],
            explanation: question.explanation || ''
        };
        
        // Handle different question types
        if (question.type === 'checkbox') {
            // Multiple choice question
            q.correct_answers = question.correctAnswers || [];
        } else {
            // Single choice question (MCQ)
            q.correct_answer = parseInt(question.correctAnswer) || 0;
        }
        
        if (question._id) {
            const imageKey = `quizQuestion_${question._id}_explanationImage`;
            if (imageMap[imageKey] && imageMap[imageKey][0]) {
                q.explanation_image = { src: imageMap[imageKey][0], alt: 'Explanation image' };
            }
        }
        return q;
    }).filter(q => q.question && q.options.length >= 2);
    
    if (questions.length === 0) return null;
    
    return {
        title: body.quizTitle || 'Knowledge Check',
        description: body.quizDescription || 'Test your understanding',
        questions: questions,
        settings: {
            allow_retry: true,
            show_progress: true,
            randomize_questions: false,
            passing_score: Math.max(1, Math.floor(questions.length * 0.6))
        }
    };
}

// Parse quiz options
function parseOptions(options) {
    if (!options) return [];
    if (Array.isArray(options)) return options.filter(x => x && x.trim());
    if (typeof options === 'string') {
        try {
            const parsed = JSON.parse(options);
            if (Array.isArray(parsed)) return parsed.filter(x => x && x.trim());
            return [options];
        } catch {
            return [options];
        }
    }
    return [];
}

// Use your existing build system - FIXED working directory
async function buildUsingExistingSystem(topicId) {
    console.log('🔧 Running existing build system...');
    
    // FIXED: Use the correct working directory (scorm-builder root)
    const workingDir = path.join(__dirname, '../..');
    console.log('Working directory:', workingDir);
    
    // Set environment variable for topic (same way your scripts work)
    const env = { ...process.env, npm_config_topic: topicId };
    
    const buildCommand = `npm run build:topic`;
    console.log('Executing:', buildCommand);
    
    const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: workingDir,
        env: env,
        timeout: 60000 // 60 second timeout
    });
    
    console.log('Build output:', stdout);
    if (stderr) console.warn('Build warnings:', stderr);
    
    // Find the generated file
    const outputDir = path.join(workingDir, 'output');
    const filename = `${topicId}.zip`;
    const outputPath = path.join(outputDir, filename);
    
    if (!(await fs.pathExists(outputPath))) {
        throw new Error(`Generated SCORM package not found: ${filename}`);
    }
    
    // Copy to web UI downloads
    const downloadDir = path.join(__dirname, '../public/downloads');
    await fs.ensureDir(downloadDir);
    await fs.copy(outputPath, path.join(downloadDir, filename));
    
    const stats = await fs.stat(outputPath);
    
    return {
        filename: filename,
        size: stats.size
    };
}

// Extract for preview using your existing system
async function extractForPreview() {
    console.log('📦 Extracting for preview...');
    
    const workingDir = path.join(__dirname, '../..');
    const extractCommand = `npm run extract`;
    
    await execAsync(extractCommand, {
        cwd: workingDir,
        timeout: 30000
    });
    
    console.log('✅ Extracted to test-output for preview');
}

module.exports = router;