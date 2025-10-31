const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads');
        await fs.ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Image upload configuration
const imageUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Max 10 files per upload
    }
});

// Video upload configuration
const videoUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|webm|ogg|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'].includes(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only video files are allowed (MP4, WebM, OGG, MOV, AVI)'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 5 // Max 5 videos per upload
    }
});

// Backward compatibility
const upload = imageUpload;

// Single image upload
router.post('/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const fileInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: fileUrl,
            uploadedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            file: fileInfo,
            message: 'Image uploaded successfully'
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Multiple images upload
router.post('/images', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        const files = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: `/uploads/${file.filename}`,
            uploadedAt: new Date().toISOString()
        }));

        res.json({
            success: true,
            files: files,
            count: files.length,
            message: `${files.length} image(s) uploaded successfully`
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete uploaded file
router.delete('/file/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../public/uploads', filename);
        
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            res.json({ success: true, message: 'File deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get file info
router.get('/file/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../public/uploads', filename);
        
        if (await fs.pathExists(filePath)) {
            const stats = await fs.stat(filePath);
            const fileInfo = {
                filename: filename,
                size: stats.size,
                url: `/uploads/${filename}`,
                uploadedAt: stats.birthtime.toISOString(),
                modifiedAt: stats.mtime.toISOString()
            };
            res.json({ success: true, file: fileInfo });
        } else {
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (error) {
        console.error('File info error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// List uploaded files
router.get('/files', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../public/uploads');
        
        if (!(await fs.pathExists(uploadsDir))) {
            return res.json({ success: true, files: [] });
        }

        const files = await fs.readdir(uploadsDir);
        const fileInfos = await Promise.all(
            files.map(async (filename) => {
                const filePath = path.join(uploadsDir, filename);
                const stats = await fs.stat(filePath);
                return {
                    filename: filename,
                    size: stats.size,
                    url: `/uploads/${filename}`,
                    uploadedAt: stats.birthtime.toISOString()
                };
            })
        );

        res.json({ success: true, files: fileInfos });

    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Single video upload
router.post('/video', videoUpload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No video file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        const fileInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: fileUrl,
            type: 'video',
            uploadedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            file: fileInfo,
            message: 'Video uploaded successfully'
        });

    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Multiple videos upload
router.post('/videos', videoUpload.array('videos', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No video files uploaded' });
        }

        const files = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: `/uploads/${file.filename}`,
            type: 'video',
            uploadedAt: new Date().toISOString()
        }));

        res.json({
            success: true,
            files: files,
            count: files.length,
            message: `${files.length} video(s) uploaded successfully`
        });

    } catch (error) {
        console.error('Multiple video upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Video embed URL validation
router.post('/video/validate-embed', (req, res) => {
    try {
        const { embedUrl } = req.body;

        if (!embedUrl) {
            return res.status(400).json({
                success: false,
                error: 'Embed URL is required'
            });
        }

        // Validate common video platform URLs
        const supportedPlatforms = [
            'youtube.com',
            'youtu.be',
            'vimeo.com',
            'dailymotion.com',
            'twitch.tv',
            'wistia.com',
            'loom.com'
        ];

        let isValidEmbed = false;
        let platform = 'unknown';
        let embedCode = '';

        // YouTube validation
        if (embedUrl.includes('youtube.com/watch') || embedUrl.includes('youtu.be/')) {
            isValidEmbed = true;
            platform = 'youtube';

            // Extract video ID and create embed URL
            const videoId = embedUrl.includes('youtu.be/')
                ? embedUrl.split('youtu.be/')[1]?.split('?')[0]
                : embedUrl.split('v=')[1]?.split('&')[0];

            if (videoId) {
                embedCode = `https://www.youtube.com/embed/${videoId}`;
            }
        }
        // Vimeo validation
        else if (embedUrl.includes('vimeo.com/')) {
            isValidEmbed = true;
            platform = 'vimeo';

            const videoId = embedUrl.split('vimeo.com/')[1]?.split('?')[0];
            if (videoId) {
                embedCode = `https://player.vimeo.com/video/${videoId}`;
            }
        }
        // Other platforms
        else {
            supportedPlatforms.forEach(platformDomain => {
                if (embedUrl.includes(platformDomain)) {
                    isValidEmbed = true;
                    platform = platformDomain.replace('.com', '');
                }
            });
        }

        if (!isValidEmbed) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported video platform. Please use YouTube, Vimeo, or other supported platforms.',
                supportedPlatforms
            });
        }

        res.json({
            success: true,
            platform,
            originalUrl: embedUrl,
            embedUrl: embedCode || embedUrl,
            message: `Valid ${platform} embed URL detected`
        });

    } catch (error) {
        console.error('Embed validation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clean old uploads (older than 24 hours)
router.post('/cleanup', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../public/uploads');

        if (!(await fs.pathExists(uploadsDir))) {
            return res.json({ success: true, message: 'No uploads directory found', cleaned: 0 });
        }

        const files = await fs.readdir(uploadsDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        let cleaned = 0;

        for (const filename of files) {
            const filePath = path.join(uploadsDir, filename);
            const stats = await fs.stat(filePath);

            if (now - stats.birthtimeMs > maxAge) {
                await fs.remove(filePath);
                cleaned++;
            }
        }

        res.json({
            success: true,
            message: `Cleaned ${cleaned} old files`,
            cleaned: cleaned
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;