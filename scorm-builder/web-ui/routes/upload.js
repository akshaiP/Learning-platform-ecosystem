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

const upload = multer({
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