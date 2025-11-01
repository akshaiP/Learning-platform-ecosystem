const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const cloudServices = require('../../services/cloud-services');
const topicService = require('../../services/topic-service');

// Configure multer for file uploads (supports both images and videos)
const upload = multer({
    dest: path.join(__dirname, '../public/uploads/temp'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
    fileFilter: (req, file, cb) => {
        // Allow both images and videos
        const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg/;
        const allowedVideoTypes = /mp4|webm|ogg|mov|avi/;
        const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                      allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
        const allowedMimeTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'
        ];
        const mimetype = allowedMimeTypes.includes(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'));
        }
    }
});
// Save topic draft to cloud (with images), no build
router.post('/save', upload.any(), async (req, res) => {
    let topicId = null;
    const userId = 'default';
    try {
                if (!cloudServices.initialized) {
            await cloudServices.initialize();
        }

        topicId = (req.body.topicId || '').trim() || `topic_${Date.now()}`;

        let existingConfig = null;
        try {
            const existing = await topicService.loadTopic(topicId, userId);
            existingConfig = existing.data || null;
        } catch (_) {
            existingConfig = null;
        }

        const deleteListObj = collectDeleteList(req.body);
        const { config, uploads } = await buildConfigFromFormDataCloud(req.body, req.files, existingConfig);
        const allDeletions = [...deleteListObj.images, ...deleteListObj.videos];
        if (allDeletions.length) {
            applyDeletionsToConfig(config, allDeletions);
            if (deleteListObj.images.length) {
                await deleteImagesFromCloud(deleteListObj.images, userId, topicId);
            }
            if (deleteListObj.videos.length) {
                await deleteVideosFromCloud(deleteListObj.videos, userId, topicId);
            }
        }

        // Ensure topicId is included in the config for LRS sync
        config.topicId = topicId;
        await topicService.saveTopic(config, userId, topicId);

        for (const uploadItem of uploads) {
            const { localPath, targetFileName, fileType } = uploadItem;
            // Determine if this is a video or image based on file extension and fieldname
            const fileExt = path.extname(targetFileName).toLowerCase();
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
            const isVideo = fileType === 'video' || videoExtensions.includes(fileExt) ||
                           localPath.toLowerCase().includes('video');

            const folder = isVideo ? 'videos' : 'images';
            const cloudPath = `topics/${userId}/${topicId}/${folder}/${targetFileName}`;

                        await cloudServices.uploadFile(localPath, cloudPath, {
                metadata: {
                    topicId,
                    userId,
                    uploadedAt: new Date().toISOString(),
                    fileType: isVideo ? 'video' : 'image'
                }
            });
        }

        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path).catch(() => {});
            }
        }

        res.json({ success: true, topicId });
    } catch (error) {
        console.error('❌ Draft save failed:', error);
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path).catch(() => {});
            }
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate SCORM package using cloud-backed topics
router.post('/generate', upload.any(), async (req, res) => {
    let topicId = null;
    const userId = 'default';
    try {
        
        if (!cloudServices.initialized) {
            await cloudServices.initialize();
        }

        // Determine topic ID
        topicId = (req.body.topicId || '').trim() || `topic_${Date.now()}`;

        // Build config and plan uploads
        // Load existing topic config (if any) to preserve image references when not re-uploaded
        let existingConfig = null;
        try {
            const existing = await topicService.loadTopic(topicId, userId);
            existingConfig = existing.data || null;
        } catch (_) {
            existingConfig = null;
        }

        const deleteListObj = collectDeleteList(req.body);
        const { config, uploads } = await buildConfigFromFormDataCloud(req.body, req.files, existingConfig);
        const allDeletions = [...deleteListObj.images, ...deleteListObj.videos];
        if (allDeletions.length) {
            applyDeletionsToConfig(config, allDeletions);
            if (deleteListObj.images.length) {
                await deleteImagesFromCloud(deleteListObj.images, userId, topicId);
            }
            if (deleteListObj.videos.length) {
                await deleteVideosFromCloud(deleteListObj.videos, userId, topicId);
            }
        }

        // Save topic to Firestore
        // Ensure topicId is included in the config for LRS sync
        config.topicId = topicId;
        await topicService.saveTopic(config, userId, topicId);

        // Upload images and videos to Cloud Storage
        for (const uploadItem of uploads) {
            const { localPath, targetFileName } = uploadItem;
            // Determine if it's a video file and use appropriate directory
            const isVideo = targetFileName.match(/\.(mp4|webm|ogg|mov|avi)$/i);
            const subDir = isVideo ? 'videos' : 'images';
            const cloudPath = `topics/${userId}/${topicId}/${subDir}/${targetFileName}`;
            await cloudServices.uploadFile(localPath, cloudPath, {
                metadata: {
                    topicId,
                    userId,
                    uploadedAt: new Date().toISOString(),
                    fileType: isVideo ? 'video' : 'image'
                }
            });
        }

        // Clean temp uploads
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path).catch(() => {});
            }
        }

        
        // Build using existing system (will load from cloud)
        const buildResult = await buildUsingExistingSystem(topicId);
        await extractForPreview();

        res.json({
            success: true,
            filename: buildResult.filename,
            downloadUrl: `/downloads/${buildResult.filename}`,
            size: buildResult.size,
            previewUrl: '/preview',
            topicId: topicId
        });
    } catch (error) {
        console.error('❌ SCORM generation failed:', error);
        if (req.files) {
            for (const file of req.files) {
                await fs.remove(file.path).catch(() => {});
            }
        }
        
        // Include build output in error response for better debugging
        let errorResponse = { success: false, error: error.message };
        if (error.buildOutput) {
            errorResponse.buildOutput = error.buildOutput;
        }
        if (error.buildStderr) {
            errorResponse.buildStderr = error.buildStderr;
        }
        
        res.status(500).json(errorResponse);
    }
});

// Build config and prepare uploads for cloud storage
async function buildConfigFromFormDataCloud(body, files, existingConfig) {
        const imageMap = {};
    const uploads = [];
    if (files && files.length > 0) {
                for (const file of files) {
            const ext = path.extname(file.originalname || '') || path.extname(file.filename || '');
            // Use original filename (sanitized) to preserve names expected by templates
            const base = path.basename(file.originalname || file.filename || `image${Date.now()}${ext}`);
            const safeName = base.replace(/[^A-Za-z0-9._-]/g, '_');
            const newFilename = safeName;

            // Determine file type
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
            const videoMimetypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
            const isVideo = videoExtensions.includes(ext.toLowerCase()) ||
                           (file.mimetype && videoMimetypes.includes(file.mimetype)) ||
                           file.fieldname.toLowerCase().includes('video');

            if (!imageMap[file.fieldname]) imageMap[file.fieldname] = [];
            imageMap[file.fieldname].push(newFilename);
            uploads.push({
                localPath: file.path,
                targetFileName: newFilename,
                fileType: isVideo ? 'video' : 'image',
                originalName: file.originalname || file.filename
            });
        }
    }

    const learningObjectives = parseFormArray(body.learningObjectivesJson || body.learningObjectives);
    const taskSteps = parseItemsFlexible(body, 'taskStep', 'taskSteps');
    const concepts = parseItemsFlexible(body, 'concept', 'concepts');
    const quizQuestions = parseItemsFlexible(body, 'quizQuestion', 'quizQuestions');

    const config = {
        title: body.title || 'Untitled Topic',
        description: body.description || 'No description provided',
        learning_objectives: learningObjectives,
        content: {
            company_logo: (imageMap.companyLogo && imageMap.companyLogo.length > 0)
                ? { src: imageMap.companyLogo[0], alt: body.title || 'Company Logo' }
                : (existingConfig && existingConfig.content && existingConfig.content.company_logo)
                    ? existingConfig.content.company_logo
                    : { src: 'https://storage.googleapis.com/scorm-builder-topics-bucket/default-company-logo.png', alt: 'Default Company Logo' },
            task_statement: body.taskStatement || 'Complete the learning task',
            task_steps: processTaskSteps(taskSteps, imageMap),
            hero_image: imageMap.heroImage
                ? { src: Array.isArray(imageMap.heroImage) ? imageMap.heroImage[0] : imageMap.heroImage, alt: body.title || 'Hero Image', caption: body.heroImageCaption || '' }
                : (existingConfig && existingConfig.content && existingConfig.content.hero_image) || null,
            concepts: processConcepts(concepts, imageMap)
        },
        quiz: processQuiz(quizQuestions, body, imageMap),
        chat_contexts: {
            task_help: `Guide the learner through ${body.taskStatement || 'the learning task'} step-by-step`,
            quiz_failed: `Provide detailed explanation and additional context for ${body.title || 'this topic'}`,
            hints_exhausted: `Offer advanced troubleshooting and additional resources for ${body.title || 'this topic'}`
        }
    };

    // Merge existing images for steps, concepts, quiz where no new uploads were provided
    try {
        if (existingConfig && existingConfig.content) {
            const oldContent = existingConfig.content;
            const newContent = config.content;

            // Task steps images and videos merge by index
            if (Array.isArray(newContent.task_steps) && Array.isArray(oldContent.task_steps)) {
                newContent.task_steps = newContent.task_steps.map((step, idx) => {
                    const prev = oldContent.task_steps[idx] || {};
                    const merged = { ...step };

                    // Merge images if no new images were uploaded
                    if (!merged.images && Array.isArray(prev.images)) merged.images = prev.images;

                    // Merge videos if no new videos were uploaded
                    if (!merged.video && prev.video) merged.video = prev.video;

                    // Merge hint content
                    if (merged.hint || prev.hint) {
                        merged.hint = merged.hint || {};
                        if (!merged.hint.images && prev.hint && Array.isArray(prev.hint.images)) {
                            merged.hint.images = prev.hint.images;
                        }
                        // Clean up empty hint objects after merge
                        const hasText = merged.hint.text && merged.hint.text.trim().length > 0;
                        const hasCode = merged.hint.code && (
                            (typeof merged.hint.code === 'string' && merged.hint.code.trim().length > 0) ||
                            (typeof merged.hint.code === 'object' && merged.hint.code.content && merged.hint.code.content.trim().length > 0)
                        );
                        const hasImages = merged.hint.images && merged.hint.images.length > 0;

                        if (!hasText && !hasCode && !hasImages) {
                            delete merged.hint;
                        }
                    }
                    return merged;
                });
            }

            // Concepts image merge by index
            if (Array.isArray(newContent.concepts) && Array.isArray(oldContent.concepts)) {
                newContent.concepts = newContent.concepts.map((c, idx) => {
                    const prev = oldContent.concepts[idx] || {};

                    // Merge concept image
                    if (!c.image && prev.image) c.image = prev.image;

                    // Merge carousel data
                    if (c.interactive_carousel) {
                        const newCarousel = c.interactive_carousel;

                        // If there's previous carousel data, merge it
                        if (prev.interactive_carousel) {
                            const prevCarousel = prev.interactive_carousel;

                            // If carousel is disabled in new data but was enabled before, preserve the slides and bot URL
                            if (!newCarousel.enabled && prevCarousel.enabled && prevCarousel.slides && Array.isArray(prevCarousel.slides)) {
                                newCarousel.slides = prevCarousel.slides;
                                newCarousel.bot_iframe_url = newCarousel.bot_iframe_url || prevCarousel.bot_iframe_url;
                            }
                            // If carousel is enabled in both, merge slides
                            else if (newCarousel.enabled && prevCarousel.enabled && newCarousel.slides && prevCarousel.slides && Array.isArray(newCarousel.slides) && Array.isArray(prevCarousel.slides)) {
                                newCarousel.slides = newCarousel.slides.map((slide, slideIdx) => {
                                    const prevSlide = prevCarousel.slides[slideIdx] || {};
                                    // Merge slide image if not provided in new upload
                                    if (!slide.image && prevSlide.image) {
                                        slide.image = prevSlide.image;
                                    }
                                    return slide;
                                });
                            }
                            // If no new slides but previous slides exist and carousel is still enabled, preserve them
                            else if (newCarousel.enabled && (!newCarousel.slides || newCarousel.slides.length === 0) && prevCarousel.slides && Array.isArray(prevCarousel.slides)) {
                                newCarousel.slides = prevCarousel.slides;
                            }

                            // Preserve bot URL if not set in new data
                            if (!newCarousel.bot_iframe_url && prevCarousel.bot_iframe_url) {
                                newCarousel.bot_iframe_url = prevCarousel.bot_iframe_url;
                            }
                        }
                    } else if (prev.interactive_carousel) {
                        // If no new carousel data but previous carousel exists, preserve it as disabled
                        c.interactive_carousel = {
                            enabled: false,
                            bot_iframe_url: prev.interactive_carousel.bot_iframe_url || '',
                            slides: prev.interactive_carousel.slides || []
                        };
                    }

                    return c;
                });
            }
        }

        // Quiz explanation images merge by index
        if (config.quiz && existingConfig && existingConfig.quiz) {
            const nq = config.quiz;
            const oq = existingConfig.quiz;
            if (Array.isArray(nq.questions) && Array.isArray(oq.questions)) {
                nq.questions = nq.questions.map((q, idx) => {
                    const pq = oq.questions[idx] || {};
                    if (!q.explanation_image && pq.explanation_image) q.explanation_image = pq.explanation_image;
                    // Merge question images if no new question images were uploaded
                    if (!q.images && pq.images) q.images = pq.images;
                    return q;
                });
            }
        }

        // Final cleanup: remove any empty hint objects that might have been created during merge
        if (config.content && Array.isArray(config.content.task_steps)) {
            config.content.task_steps = config.content.task_steps.map(step => {
                if (step.hint) {
                    const hasText = step.hint.text && step.hint.text.trim().length > 0;
                    const hasCode = step.hint.code && (
                        (typeof step.hint.code === 'string' && step.hint.code.trim().length > 0) ||
                        (typeof step.hint.code === 'object' && step.hint.code.content && step.hint.code.content.trim().length > 0)
                    );
                    const hasImages = step.hint.images && step.hint.images.length > 0;

                    if (!hasText && !hasCode && !hasImages) {
                        delete step.hint;
                    }
                }
                return step;
            });
        }
    } catch (_) {
        // best-effort merge; ignore errors
    }

    return { config, uploads };
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

        // Handle embed video data specifically
        if (field === 'videoEmbed' && typeof value === 'string') {
            try {
                const embedData = JSON.parse(decodeURIComponent(value));
                itemData[itemId].video = {
                    id: embedData.id,
                    originalUrl: embedData.originalUrl,
                    embedUrl: embedData.embedUrl,
                    platform: embedData.platform,
                    title: embedData.title,
                    source: 'embed'
                };
                            } catch (e) {
                console.error(`❌ Error parsing embed video for ${singularPrefix} ${itemId}:`, e);
                itemData[itemId][field] = value;
            }
        } else {
            itemData[itemId][field] = value;
        }
    }

    for (const [id, item] of Object.entries(itemData)) {
        if (item.title || item.question) items.push({ _id: id, ...item });
    }

    return items;
}

// Process task steps with images and videos
function processTaskSteps(taskSteps, imageMap) {
    return taskSteps.map((step) => {
        
        const processedStep = {
            title: step.title || '',
            description: step.description || '',
            instructions: step.instructions || ''
        };

        // Handle asset type (images or videos)
        if (step.assetType) {
            processedStep.assetType = step.assetType;
        }

        // Attach step images if uploaded: field name pattern `taskStep_${_id}_images`
        if (step._id) {
            const imagesKey = `taskStep_${step._id}_images`;
            const videosKey = `taskStep_${step._id}_video`;
            const hintImagesKey = `taskStep_${step._id}_hintImages`;

            // Process images
            if (imageMap[imagesKey]) {
                processedStep.images = imageMap[imagesKey].map(fn => ({ src: fn, alt: step.title || 'Step image' }));
            }

            // Process video (single)
            if (imageMap[videosKey]) {
                processedStep.video = {
                    src: imageMap[videosKey][0], // Take first video
                    alt: step.title || 'Step video',
                    caption: step.title || 'Step video', // Add caption field for template
                    type: 'local'
                };
            }

            // Process hint images
            if (imageMap[hintImagesKey]) {
                processedStep.hint = processedStep.hint || {};
                processedStep.hint.images = imageMap[hintImagesKey].map(fn => ({ src: fn, alt: 'Hint image' }));
            }

            // Handle video embed from form data (single)
            if (step.video && step.video.source === 'embed') {
                processedStep.video = {
                    src: step.video.embedUrl,
                    alt: step.video.title || 'Embedded video',
                    caption: step.video.title || 'Embedded video', // Add caption field for template
                    type: 'embed',
                    platform: step.video.platform,
                    originalUrl: step.video.originalUrl
                };
            }
        }

        // Add code if present
        if (step.code && step.code.trim()) {
            processedStep.code = {
                content: step.code,
                language: step.codeLanguage || 'javascript'
            };
        }
        
        // Add task page if URL is provided (handle both flat and nested structures)
        const hasTaskPageUrl = step.taskPageUrl && step.taskPageUrl.trim();
        const hasNestedTaskPage = step.taskPage && step.taskPage.url && step.taskPage.url.trim();
        
        if (hasTaskPageUrl) {
            processedStep.taskPage = {
                url: step.taskPageUrl.trim()
            };
        } else if (hasNestedTaskPage) {
            processedStep.taskPage = {
                url: step.taskPage.url.trim()
            };
        }

        // Add hint if any hint content is present (text, code, or images)
        const hasHintText = step.hintText && step.hintText.trim();
        const hasHintCode = step.hintCode && step.hintCode.trim();
        const hasHintImages = processedStep.hint && processedStep.hint.images && processedStep.hint.images.length > 0;

        if (hasHintText || hasHintCode || hasHintImages) {
            // Initialize hint object if needed
            if (!processedStep.hint) {
                processedStep.hint = {};
            }

            // Add text if present
            if (hasHintText) {
                processedStep.hint.text = step.hintText;
            }

            // Add code if present
            if (hasHintCode) {
                processedStep.hint.code = {
                    content: step.hintCode,
                    language: step.hintCodeLanguage || 'javascript'
                };
            }
        }
        
        return processedStep;
    }).filter(step => {
        // Clean up empty hint objects - only remove if completely empty
        if (step.hint) {
            const hasText = step.hint.text && step.hint.text.trim().length > 0;
            const hasCode = step.hint.code && (
                (typeof step.hint.code === 'string' && step.hint.code.trim().length > 0) ||
                (typeof step.hint.code === 'object' && step.hint.code.content && step.hint.code.content.trim().length > 0)
            );
            const hasImages = step.hint.images && step.hint.images.length > 0;

            if (!hasText && !hasCode && !hasImages) {
                delete step.hint;
            }
        }
        return true; // Keep all steps
    });
}

// Process concepts with images and carousel data
function processConcepts(concepts, imageMap) {
    return concepts.map((concept) => {
        const processed = {
            title: concept.title || '',
            summary: concept.summary || '',
            learn_more_context: concept.learnMoreContext || concept.title?.toLowerCase().replace(/\s+/g, '_') || 'concept'
        };

        // Handle concept image
        if (concept._id) {
            const imageKey = `concept_${concept._id}_image`;
            if (imageMap[imageKey] && imageMap[imageKey][0]) {
                processed.image = { src: imageMap[imageKey][0], alt: concept.title || 'Concept image' };
            }
        }

        // Handle interactive carousel data (both enabled and disabled)
        if (concept.interactive_carousel) {
            const carousel = {
                enabled: concept.interactive_carousel.enabled || false,
                bot_iframe_url: concept.interactive_carousel.bot_iframe_url || '',
                slides: []
            };

            // Process carousel slides only if enabled
            if (concept.interactive_carousel.enabled && concept.interactive_carousel.slides && Array.isArray(concept.interactive_carousel.slides)) {
                carousel.slides = concept.interactive_carousel.slides.map((slide, slideIndex) => {
                    const processedSlide = {
                        topic: slide.topic || '',
                        description: slide.description || '',
                        prompt: slide.prompt || ''
                    };

                    // Handle slide images - look for image in imageMap
                    const slideImageKey = `carousel_${concept._id}_slide_${slideIndex + 1}_image`;
                    if (imageMap[slideImageKey] && imageMap[slideImageKey][0]) {
                        processedSlide.image = imageMap[slideImageKey][0];
                    }

                    return processedSlide;
                }).filter(slide => slide.topic && slide.description && slide.prompt); // Only include complete slides
            }

            // Always include carousel data if it exists (enabled or disabled)
            processed.interactive_carousel = carousel;
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
            // Handle question images (multiple images support)
            const questionImagesKey = `quizQuestion_${question._id}_images`;
            if (imageMap[questionImagesKey] && imageMap[questionImagesKey].length > 0) {
                q.images = imageMap[questionImagesKey].map(imgSrc => ({ src: imgSrc, alt: `Question image for ${q.question.substring(0, 30)}...` }));
            }

            // Handle explanation image (single image)
            const explanationImageKey = `quizQuestion_${question._id}_explanationImage`;
            if (imageMap[explanationImageKey] && imageMap[explanationImageKey][0]) {
                q.explanation_image = { src: imageMap[explanationImageKey][0], alt: 'Explanation image' };
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
    // FIXED: Use the correct working directory (scorm-builder root)
    const workingDir = path.join(__dirname, '../..');

    // Set environment variable for topic (same way your scripts work)
    const env = { ...process.env, npm_config_topic: topicId };

    const buildCommand = `npm run build:topic`;
    
    try {
        const { stdout, stderr } = await execAsync(buildCommand, {
            cwd: workingDir,
            env: env,
            timeout: 60000 // 60 second timeout
        });
        
        if (stderr) console.warn('Build warnings:', stderr);
    } catch (execError) {
        console.error('Build command failed:', execError);
        
        // Create a new error with build output details
        const buildError = new Error(`Command failed: ${buildCommand}`);
        buildError.buildOutput = execError.stdout || '';
        buildError.buildStderr = execError.stderr || '';
        throw buildError;
    }
    
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
        
    const workingDir = path.join(__dirname, '../..');
    const extractCommand = `npm run extract`;
    
    await execAsync(extractCommand, {
        cwd: workingDir,
        timeout: 30000
    });
    
    }

module.exports = router;

// Helpers for deletions
function collectDeleteList(body) {
    // deleteImages may come as string or array of strings
    const rawImages = body.deleteImages;
    const rawVideos = body.deleteVideos;

    const imageList = [];
    const videoList = [];

    if (rawImages) {
        if (Array.isArray(rawImages)) {
            imageList.push(...rawImages.filter(Boolean));
        } else {
            imageList.push(rawImages);
        }
    }

    if (rawVideos) {
        if (Array.isArray(rawVideos)) {
            videoList.push(...rawVideos.filter(Boolean));
        } else {
            videoList.push(rawVideos);
        }
    }

    return { images: imageList, videos: videoList };
}

async function deleteImagesFromCloud(deleteList, userId, topicId) {
    for (const filename of deleteList) {
        const cloudPath = `topics/${userId}/${topicId}/images/${filename}`;
        try {
            await cloudServices.deleteFile(cloudPath);
        } catch (e) {
            // Log and continue
            console.warn('Delete failed (continuing):', cloudPath, e.message);
        }
    }
}

async function deleteVideosFromCloud(deleteList, userId, topicId) {
    for (const filename of deleteList) {
        const cloudPath = `topics/${userId}/${topicId}/videos/${filename}`;
        try {
            await cloudServices.deleteFile(cloudPath);
        } catch (e) {
            // Log and continue
            console.warn('Delete failed (continuing):', cloudPath, e.message);
        }
    }
}

function applyDeletionsToConfig(config, deleteList) {
    if (!config || !config.content) return;
    const shouldDelete = (src) => src && deleteList.includes(src);

    // Company logo
    if (config.content.company_logo && shouldDelete(config.content.company_logo.src)) {
        config.content.company_logo = null;
    }

    // Hero image
    if (config.content.hero_image && shouldDelete(config.content.hero_image.src)) {
        config.content.hero_image = null;
    }

    // Concepts
    if (Array.isArray(config.content.concepts)) {
        config.content.concepts = config.content.concepts.map(c => {
            const updatedConcept = { ...c };

            // Handle concept image deletion
            if (c && c.image && shouldDelete(c.image.src)) {
                updatedConcept.image = null;
            }

            // Handle carousel image deletions
            if (c.interactive_carousel && c.interactive_carousel.slides && Array.isArray(c.interactive_carousel.slides)) {
                updatedConcept.interactive_carousel = {
                    ...c.interactive_carousel,
                    slides: c.interactive_carousel.slides.map(slide => {
                        if (slide.image && shouldDelete(slide.image)) {
                            return { ...slide, image: null };
                        }
                        return slide;
                    })
                };
            }

            return updatedConcept;
        });
    }

    // Task steps, videos, and hints
    if (Array.isArray(config.content.task_steps)) {
        config.content.task_steps = config.content.task_steps.map(s => {
            const next = { ...s };

            // Filter images
            if (Array.isArray(next.images)) {
                next.images = next.images.filter(img => !(img && shouldDelete(img.src)));
            }

            // Filter single video
            if (next.video && next.video.src && shouldDelete(next.video.src)) {
                next.video = null;
            }

            // Filter hint images
            if (next.hint && Array.isArray(next.hint.images)) {
                next.hint = { ...next.hint, images: next.hint.images.filter(img => !(img && shouldDelete(img.src))) };
            }

            return next;
        });
    }

    // Quiz explanation images and question images
    if (config.quiz && Array.isArray(config.quiz.questions)) {
        config.quiz.questions = config.quiz.questions.map(q => {
            const updatedQuestion = { ...q };
            if (q && q.explanation_image && shouldDelete(q.explanation_image.src)) {
                updatedQuestion.explanation_image = null;
            }
            if (q && q.images && Array.isArray(q.images)) {
                updatedQuestion.images = q.images.filter(img => !(img && shouldDelete(img.src)));
            }
            return updatedQuestion;
        });
    }
}