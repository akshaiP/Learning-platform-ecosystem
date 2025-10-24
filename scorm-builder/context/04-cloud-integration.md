# Cloud Services Integration - Firestore & Google Cloud Storage

## Overview
The SCORM Builder integrates with Google Cloud Platform services to provide cloud-based topic storage, image management, and data persistence. This enables collaboration, backup, and accessibility across multiple devices and users.

## Core Cloud Services

### 1. Cloud Services Manager
**File**: `services/cloud-services.js`

Centralized interface for managing all cloud service operations.

#### Service Initialization
```javascript
const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');

class CloudServices {
    constructor() {
        this.storage = null;
        this.firestore = null;
        this.bucket = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Initialize Google Cloud Storage
            this.storage = new Storage({
                projectId: process.env.GOOGLE_CLOUD_PROJECT,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
            });

            // Initialize Firestore
            this.firestore = new Firestore({
                projectId: process.env.GOOGLE_CLOUD_PROJECT,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
            });

            // Get default bucket
            this.bucket = this.storage.bucket(process.env.GCS_BUCKET_NAME);

            this.initialized = true;
            console.log('✅ Cloud services initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize cloud services:', error);
            throw error;
        }
    }
}
```

#### Configuration Management
```javascript
// Environment variables required
const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCS_BUCKET_NAME',
    'FIRESTORE_PROJECT_ID'
];

// Service account configuration
const serviceAccountConfig = {
    "type": "service_account",
    "project_id": process.env.GOOGLE_CLOUD_PROJECT,
    "private_key_id": "...",
    "private_key": "...",
    "client_email": "...",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
};
```

### 2. Firestore Database Operations

#### Topic Data Management
```javascript
// Save topic to Firestore
async saveTopic(topicId, topicData, userId = 'default') {
    try {
        const topicRef = this.firestore.collection('topics').doc(topicId);

        const topicDocument = {
            id: topicId,
            title: topicData.title,
            description: topicData.description,
            learning_objectives: topicData.learning_objectives || [],
            content: topicData.content || {},
            quiz: topicData.quiz || {},
            chat_contexts: topicData.chat_contexts || {},
            userId: userId,
            createdAt: Firestore.FieldValue.serverTimestamp(),
            updatedAt: Firestore.FieldValue.serverTimestamp(),
            version: (topicData.version || 1) + 1,
            metadata: {
                totalSteps: topicData.content?.task_steps?.length || 0,
                totalQuestions: topicData.quiz?.questions?.length || 0,
                hasImages: this.hasImages(topicData),
                estimatedDuration: this.calculateDuration(topicData)
            }
        };

        await topicRef.set(topicDocument, { merge: true });

        console.log(`✅ Topic saved to Firestore: ${topicId}`);
        return topicDocument;
    } catch (error) {
        console.error(`❌ Failed to save topic ${topicId}:`, error);
        throw error;
    }
}

// Load topic from Firestore
async loadTopic(topicId, userId = null) {
    try {
        const topicRef = this.firestore.collection('topics').doc(topicId);
        const topicDoc = await topicRef.get();

        if (!topicDoc.exists) {
            throw new Error(`Topic not found: ${topicId}`);
        }

        const topicData = topicDoc.data();

        // Check user access if userId is provided
        if (userId && topicData.userId !== userId) {
            throw new Error(`Access denied: Topic belongs to different user`);
        }

        console.log(`✅ Topic loaded from Firestore: ${topicId}`);
        return topicData;
    } catch (error) {
        console.error(`❌ Failed to load topic ${topicId}:`, error);
        throw error;
    }
}

// List topics for a user
async listTopics(userId = 'default', limit = 50, orderBy = 'updatedAt') {
    try {
        let query = this.firestore.collection('topics')
            .where('userId', '==', userId)
            .orderBy(orderBy, 'desc')
            .limit(limit);

        const snapshot = await query.get();
        const topics = [];

        snapshot.forEach(doc => {
            topics.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Listed ${topics.length} topics for user: ${userId}`);
        return topics;
    } catch (error) {
        console.error(`❌ Failed to list topics for user ${userId}:`, error);
        throw error;
    }
}
```

#### Advanced Query Operations
```javascript
// Search topics by title or content
async searchTopics(userId, searchTerm, limit = 20) {
    try {
        // Create full-text search using Firestore array contains
        const searchTerms = searchTerm.toLowerCase().split(' ');

        const topicsRef = this.firestore.collection('topics');
        let query = topicsRef.where('userId', '==', userId);

        // Use multiple queries for different search strategies
        const searchPromises = [
            // Title search
            query
                .where('searchTerms', 'array-contains-any', searchTerms)
                .limit(limit)
                .get(),

            // Description search
            query
                .where('descriptionSearchTerms', 'array-contains-any', searchTerms)
                .limit(limit)
                .get()
        ];

        const [titleResults, descResults] = await Promise.all(searchPromises);

        // Combine and deduplicate results
        const allResults = new Map();

        titleResults.forEach(doc => {
            allResults.set(doc.id, { id: doc.id, ...doc.data() });
        });

        descResults.forEach(doc => {
            if (!allResults.has(doc.id)) {
                allResults.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        return Array.from(allResults.values()).slice(0, limit);
    } catch (error) {
        console.error(`❌ Failed to search topics:`, error);
        throw error;
    }
}

// Get topic statistics
async getTopicStats(userId = 'default') {
    try {
        const topicsRef = this.firestore.collection('topics')
            .where('userId', '==', userId);

        const snapshot = await topicsRef.get();

        const stats = {
            totalTopics: snapshot.size,
            totalSteps: 0,
            totalQuestions: 0,
            totalImages: 0,
            topicsWithQuiz: 0,
            averageStepsPerTopic: 0,
            averageQuestionsPerTopic: 0,
            recentTopics: [],
            topicTypes: {}
        };

        if (snapshot.size === 0) {
            return stats;
        }

        snapshot.forEach(doc => {
            const data = doc.data();

            stats.totalSteps += data.metadata?.totalSteps || 0;
            stats.totalQuestions += data.metadata?.totalQuestions || 0;
            stats.totalImages += data.metadata?.hasImages ? 1 : 0;

            if (data.quiz && data.quiz.questions && data.quiz.questions.length > 0) {
                stats.topicsWithQuiz++;
            }

            // Track recent topics
            if (stats.recentTopics.length < 5) {
                stats.recentTopics.push({
                    id: doc.id,
                    title: data.title,
                    updatedAt: data.updatedAt
                });
            }

            // Track topic types
            const type = this.categorizeTopic(data);
            stats.topicTypes[type] = (stats.topicTypes[type] || 0) + 1;
        });

        stats.averageStepsPerTopic = Math.round(stats.totalSteps / stats.totalTopics);
        stats.averageQuestionsPerTopic = Math.round(stats.totalQuestions / stats.totalTopics);

        return stats;
    } catch (error) {
        console.error(`❌ Failed to get topic stats:`, error);
        throw error;
    }
}
```

### 3. Google Cloud Storage Operations

#### File Upload Management
```javascript
// Upload single file
async uploadFile(localFilePath, cloudPath, options = {}) {
    try {
        const file = this.bucket.file(cloudPath);

        const uploadOptions = {
            metadata: {
                contentType: options.contentType || this.getMimeType(localFilePath),
                metadata: options.metadata || {}
            },
            public: options.public || false,
            validation: options.validation || 'md5'
        };

        await this.bucket.upload(localFilePath, {
            destination: cloudPath,
            ...uploadOptions
        });

        // Make file public if needed
        if (options.public) {
            await file.makePublic();
        }

        const fileUrl = this.getPublicUrl(cloudPath);
        console.log(`✅ File uploaded to Cloud Storage: ${cloudPath}`);

        return {
            success: true,
            cloudPath: cloudPath,
            url: fileUrl,
            size: (await file.getMetadata())[0].size
        };
    } catch (error) {
        console.error(`❌ Failed to upload file ${cloudPath}:`, error);
        throw error;
    }
}

// Upload multiple files in batch
async uploadFiles(files, baseCloudPath, options = {}) {
    try {
        const uploadPromises = files.map(async (file) => {
            const cloudPath = `${baseCloudPath}/${file.filename}`;
            return await this.uploadFile(file.localPath, cloudPath, {
                ...options,
                metadata: {
                    ...options.metadata,
                    originalName: file.originalName,
                    uploadBatch: options.batchId || 'single'
                }
            });
        });

        const results = await Promise.all(uploadPromises);

        console.log(`✅ Batch upload completed: ${results.length} files`);
        return {
            success: true,
            files: results,
            totalUploaded: results.length
        };
    } catch (error) {
        console.error(`❌ Batch upload failed:`, error);
        throw error;
    }
}

// Upload image with optimization
async uploadImage(localFilePath, cloudPath, options = {}) {
    try {
        // Optimize image before upload
        const optimizedImage = await this.optimizeImage(localFilePath, options);

        // Upload optimized image
        const result = await this.uploadFile(optimizedImage.path, cloudPath, {
            ...options,
            contentType: optimizedImage.mimeType,
            metadata: {
                ...options.metadata,
                originalSize: options.originalSize,
                optimizedSize: optimizedImage.size,
                optimizationApplied: true
            }
        });

        // Clean up temporary optimized file
        if (optimizedImage.path !== localFilePath) {
            await fs.remove(optimizedImage.path);
        }

        return result;
    } catch (error) {
        console.error(`❌ Failed to upload image ${cloudPath}:`, error);
        throw error;
    }
}
```

#### File Download and Management
```javascript
// Download file from Cloud Storage
async downloadFile(cloudPath, localPath) {
    try {
        const file = this.bucket.file(cloudPath);

        // Ensure local directory exists
        await fs.ensureDir(path.dirname(localPath));

        await file.download({ destination: localPath });

        console.log(`✅ File downloaded from Cloud Storage: ${cloudPath}`);
        return {
            success: true,
            localPath: localPath,
            cloudPath: cloudPath,
            size: (await file.getMetadata())[0].size
        };
    } catch (error) {
        console.error(`❌ Failed to download file ${cloudPath}:`, error);
        throw error;
    }
}

// List files with prefix
async listFiles(prefix, delimiter = null) {
    try {
        const options = {
            prefix: prefix
        };

        if (delimiter) {
            options.delimiter = delimiter;
        }

        const [files, , prefixes] = await this.bucket.getFiles(options);

        const fileList = files.map(file => ({
            name: file.name,
            size: parseInt(file.metadata.size || 0),
            updated: file.metadata.updated,
            contentType: file.metadata.contentType,
            etag: file.metadata.etag
        }));

        const result = {
            files: fileList,
            prefixes: prefixes || []
        };

        console.log(`✅ Listed ${fileList.length} files with prefix: ${prefix}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to list files with prefix ${prefix}:`, error);
        throw error;
    }
}

// Delete file
async deleteFile(cloudPath) {
    try {
        const file = this.bucket.file(cloudPath);
        await file.delete();

        console.log(`✅ File deleted from Cloud Storage: ${cloudPath}`);
        return { success: true, cloudPath: cloudPath };
    } catch (error) {
        console.error(`❌ Failed to delete file ${cloudPath}:`, error);
        throw error;
    }
}

// Delete multiple files
async deleteFiles(cloudPaths) {
    try {
        const deletePromises = cloudPaths.map(cloudPath =>
            this.deleteFile(cloudPath)
        );

        const results = await Promise.all(deletePromises);

        console.log(`✅ Deleted ${results.length} files from Cloud Storage`);
        return {
            success: true,
            deletedFiles: results.length,
            results: results
        };
    } catch (error) {
        console.error(`❌ Failed to delete multiple files:`, error);
        throw error;
    }
}
```

#### URL Generation and Access Control
```javascript
// Generate public URL for file
getPublicUrl(cloudPath) {
    return `https://storage.googleapis.com/${this.bucket.name}/${cloudPath}`;
}

// Generate signed URL for private access
async getSignedUrl(cloudPath, expiresIn = 15 * 60 * 1000) { // 15 minutes default
    try {
        const file = this.bucket.file(cloudPath);

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + expiresIn
        });

        return url;
    } catch (error) {
        console.error(`❌ Failed to generate signed URL for ${cloudPath}:`, error);
        throw error;
    }
}

// Set file permissions
async setFilePermissions(cloudPath, permissions) {
    try {
        const file = this.bucket.file(cloudPath);

        if (permissions.public) {
            await file.makePublic();
        } else {
            await file.makePrivate();
        }

        // Set custom ACL if provided
        if (permissions.acl) {
            await file.acl.add(permissions.acl);
        }

        console.log(`✅ File permissions updated: ${cloudPath}`);
        return { success: true, cloudPath: cloudPath };
    } catch (error) {
        console.error(`❌ Failed to set permissions for ${cloudPath}:`, error);
        throw error;
    }
}
```

### 4. Topic Service Integration
**File**: `services/topic-service.js`

High-level service that combines Firestore and Cloud Storage operations.

#### Complete Topic Operations
```javascript
// Save complete topic with images
async saveCompleteTopic(topicData, userId = 'default', topicId = null, localImagesPath = null) {
    try {
        // Generate topic ID if not provided
        if (!topicId) {
            topicId = this.generateTopicId(topicData.title);
        }

        // 1. Save topic metadata to Firestore
        const savedTopic = await this.saveTopic(topicId, topicData, userId);

        // 2. Upload images if provided
        let uploadResult = { uploadedFiles: [] };
        if (localImagesPath && await fs.pathExists(localImagesPath)) {
            uploadResult = await this.uploadTopicImages(topicId, localImagesPath, userId);

            // Update topic data with image URLs
            const updatedTopicData = this.updateImageUrls(topicData, uploadResult.uploadedFiles);
            await this.saveTopic(topicId, updatedTopicData, userId);
        }

        console.log(`✅ Complete topic saved: ${topicId}`);
        return {
            success: true,
            topicId: topicId,
            data: savedTopic,
            uploadedImages: uploadResult.uploadedFiles.length
        };
    } catch (error) {
        console.error(`❌ Failed to save complete topic:`, error);
        throw error;
    }
}

// Load complete topic with images
async loadCompleteTopic(topicId, userId = null, downloadImages = false) {
    try {
        // 1. Load topic metadata from Firestore
        const topicData = await this.loadTopic(topicId, userId);

        // 2. Download images if requested
        let downloadedImages = [];
        if (downloadImages) {
            const localImagesPath = path.join(process.cwd(), 'temp', topicId, 'images');
            const downloadResult = await this.downloadTopicImages(topicId, localImagesPath, userId);
            downloadedImages = downloadResult.downloadedFiles;
        }

        console.log(`✅ Complete topic loaded: ${topicId}`);
        return {
            success: true,
            data: topicData,
            downloadedImages: downloadedImages
        };
    } catch (error) {
        console.error(`❌ Failed to load complete topic ${topicId}:`, error);
        throw error;
    }
}
```

#### Image Management Integration
```javascript
// Upload topic images with organization
async uploadTopicImages(topicId, localImagesPath, userId = 'default') {
    try {
        const imagePrefix = `topics/${userId}/${topicId}/images/`;

        // Get all image files from local directory
        const imageFiles = await this.getImageFiles(localImagesPath);

        if (imageFiles.length === 0) {
            return { success: true, uploadedFiles: [] };
        }

        // Upload images in batches
        const uploadResult = await this.uploadFiles(imageFiles, imagePrefix, {
            public: true,
            metadata: {
                topicId: topicId,
                userId: userId,
                uploadedAt: new Date().toISOString(),
                batchId: `batch-${Date.now()}`
            }
        });

        // Update image metadata in Firestore
        await this.updateImageMetadata(topicId, uploadResult.files, userId);

        console.log(`✅ Uploaded ${uploadResult.files.length} images for topic: ${topicId}`);
        return uploadResult;
    } catch (error) {
        console.error(`❌ Failed to upload images for topic ${topicId}:`, error);
        throw error;
    }
}

// Download topic images
async downloadTopicImages(topicId, localImagesPath, userId = 'default') {
    try {
        const imagePrefix = `topics/${userId}/${topicId}/images/`;

        // List all images for this topic
        const listResult = await this.listFiles(imagePrefix);

        if (listResult.files.length === 0) {
            console.warn(`⚠️  No images found for topic: ${topicId}`);
            return { success: true, downloadedFiles: [] };
        }

        // Download all images
        const downloadPromises = listResult.files.map(async (file) => {
            const fileName = path.basename(file.name);
            const localFilePath = path.join(localImagesPath, fileName);

            return await this.downloadFile(file.name, localFilePath);
        });

        const downloadedFiles = await Promise.all(downloadPromises);

        console.log(`✅ Downloaded ${downloadedFiles.length} images for topic: ${topicId}`);
        return {
            success: true,
            downloadedFiles: downloadedFiles
        };
    } catch (error) {
        console.error(`❌ Failed to download images for topic ${topicId}:`, error);
        throw error;
    }
}
```

### 5. Migration and Backup Operations

#### Local to Cloud Migration
```javascript
// Migrate local topic to cloud
async migrateLocalTopic(localTopicPath, userId = 'default', topicId = null) {
    try {
        console.log(`🚀 Starting migration of local topic: ${localTopicPath}`);

        // 1. Validate local topic structure
        await this.validateLocalTopic(localTopicPath);

        // 2. Load topic configuration
        const configPath = path.join(localTopicPath, 'config.json');
        const topicData = await fs.readJson(configPath);

        // 3. Migrate images if they exist
        const imagesPath = path.join(localTopicPath, 'images');
        let uploadResult = { uploadedFiles: [] };

        if (await fs.pathExists(imagesPath)) {
            console.log('📤 Uploading topic images...');
            uploadResult = await this.uploadTopicImages(topicId, imagesPath, userId);
        }

        // 4. Save topic to Firestore
        const saveResult = await this.saveTopic(topicId, topicData, userId);

        // 5. Update topic data with cloud image URLs
        if (uploadResult.uploadedFiles.length > 0) {
            const updatedTopicData = this.updateImageUrls(topicData, uploadResult.uploadedFiles);
            await this.saveTopic(topicId, updatedTopicData, userId);
        }

        // 6. Create migration record
        await this.createMigrationRecord(localTopicPath, topicId, userId);

        console.log(`✅ Migration completed: ${topicId}`);
        return {
            success: true,
            topicId: topicId,
            uploadedImages: uploadResult.uploadedFiles.length,
            localPath: localTopicPath
        };
    } catch (error) {
        console.error(`❌ Migration failed:`, error);
        throw error;
    }
}

// Batch migration of all local topics
async migrateAllLocalTopics(topicsDirectory, userId = 'default') {
    try {
        console.log(`🚀 Starting batch migration from: ${topicsDirectory}`);

        const topicDirectories = await this.getTopicDirectories(topicsDirectory);
        const migrationResults = [];

        for (const topicDir of topicDirectories) {
            try {
                const topicName = path.basename(topicDir);
                console.log(`📦 Migrating topic: ${topicName}`);

                const result = await this.migrateLocalTopic(topicDir, userId);
                migrationResults.push({
                    topicName: topicName,
                    success: true,
                    ...result
                });
            } catch (error) {
                console.error(`❌ Failed to migrate ${topicName}:`, error);
                migrationResults.push({
                    topicName: topicName,
                    success: false,
                    error: error.message
                });
            }
        }

        const successful = migrationResults.filter(r => r.success).length;
        const failed = migrationResults.filter(r => !r.success).length;

        console.log(`✅ Batch migration completed: ${successful} successful, ${failed} failed`);

        return {
            success: true,
            totalTopics: topicDirectories.length,
            successful: successful,
            failed: failed,
            results: migrationResults
        };
    } catch (error) {
        console.error(`❌ Batch migration failed:`, error);
        throw error;
    }
}
```

#### Cloud to Local Export
```javascript
// Export cloud topic to local directory
async exportCloudTopic(topicId, localTopicPath, userId = 'default') {
    try {
        console.log(`📥 Exporting cloud topic: ${topicId}`);

        // 1. Load topic data from Firestore
        const topicData = await this.loadTopic(topicId, userId);

        // 2. Create local directory structure
        await fs.ensureDir(localTopicPath);
        await fs.ensureDir(path.join(localTopicPath, 'images'));

        // 3. Save topic configuration
        const configPath = path.join(localTopicPath, 'config.json');
        await fs.writeJson(configPath, topicData, { spaces: 2 });

        // 4. Download images
        const imagesPath = path.join(localTopicPath, 'images');
        const downloadResult = await this.downloadTopicImages(topicId, imagesPath, userId);

        // 5. Create export metadata
        const exportMetadata = {
            topicId: topicId,
            exportedAt: new Date().toISOString(),
            exportedBy: userId,
            downloadedImages: downloadResult.downloadedFiles.length,
            version: topicData.version || 1
        };

        const metadataPath = path.join(localTopicPath, 'export-metadata.json');
        await fs.writeJson(metadataPath, exportMetadata, { spaces: 2 });

        console.log(`✅ Export completed: ${topicId}`);
        return {
            success: true,
            topicId: topicId,
            localPath: localTopicPath,
            downloadedImages: downloadResult.downloadedFiles.length
        };
    } catch (error) {
        console.error(`❌ Export failed for topic ${topicId}:`, error);
        throw error;
    }
}
```

### 6. Backup and Recovery

#### Automated Backups
```javascript
// Create topic backup
async createTopicBackup(topicId, userId = 'default', backupType = 'full') {
    try {
        console.log(`💾 Creating ${backupType} backup for topic: ${topicId}`);

        const backupId = `backup-${topicId}-${Date.now()}`;
        const backupPrefix = `backups/${userId}/${backupId}/`;

        // Load topic data
        const topicData = await this.loadTopic(topicId, userId);

        let backupData = {
            backupId: backupId,
            topicId: topicId,
            userId: userId,
            backupType: backupType,
            createdAt: new Date().toISOString(),
            topicData: topicData
        };

        if (backupType === 'full') {
            // Include images in backup
            const imagesPrefix = `topics/${userId}/${topicId}/images/`;
            const imageFiles = await this.listFiles(imagesPrefix);

            // Copy images to backup location
            const copyPromises = imageFiles.files.map(async (file) => {
                const backupImagePath = `${backupPrefix}images/${path.basename(file.name)}`;
                await this.copyFile(file.name, backupImagePath);
                return {
                    originalPath: file.name,
                    backupPath: backupImagePath,
                    size: file.size
                };
            });

            const copiedImages = await Promise.all(copyPromises);
            backupData.images = copiedImages;
        }

        // Save backup metadata
        const backupPath = `${backupPrefix}backup-metadata.json`;
        await this.uploadBuffer(Buffer.from(JSON.stringify(backupData, null, 2)), backupPath, {
            contentType: 'application/json'
        });

        console.log(`✅ Backup created: ${backupId}`);
        return {
            success: true,
            backupId: backupId,
            backupPath: backupPrefix,
            backupType: backupType,
            size: JSON.stringify(backupData).length
        };
    } catch (error) {
        console.error(`❌ Backup creation failed:`, error);
        throw error;
    }
}

// Restore from backup
async restoreFromBackup(backupId, targetTopicId = null, userId = 'default') {
    try {
        console.log(`🔄 Restoring from backup: ${backupId}`);

        const backupPrefix = `backups/${userId}/${backupId}/`;
        const backupMetadataPath = `${backupPrefix}backup-metadata.json`;

        // Download backup metadata
        const backupData = await this.downloadJsonFile(backupMetadataPath);

        const restoreTopicId = targetTopicId || backupData.topicId;

        // Restore topic data
        await this.saveTopic(restoreTopicId, backupData.topicData, userId);

        // Restore images if full backup
        if (backupData.backupType === 'full' && backupData.images) {
            const targetImagesPrefix = `topics/${userId}/${restoreTopicId}/images/`;

            const restorePromises = backupData.images.map(async (image) => {
                await this.copyFile(image.backupPath, `${targetImagesPrefix}${path.basename(image.originalPath)}`);
            });

            await Promise.all(restorePromises);
        }

        console.log(`✅ Restore completed: ${restoreTopicId}`);
        return {
            success: true,
            originalTopicId: backupData.topicId,
            restoredTopicId: restoreTopicId,
            backupId: backupId,
            backupType: backupData.backupType
        };
    } catch (error) {
        console.error(`❌ Restore failed:`, error);
        throw error;
    }
}
```

### 7. Performance Monitoring and Analytics

#### Usage Tracking
```javascript
// Track topic access
async trackTopicAccess(topicId, userId, accessType = 'view') {
    try {
        const accessLog = {
            topicId: topicId,
            userId: userId,
            accessType: accessType, // 'view', 'edit', 'download', 'build'
            timestamp: new Date(),
            userAgent: process.env.USER_AGENT || 'unknown',
            ipAddress: process.env.REMOTE_ADDR || 'unknown'
        };

        await this.firestore.collection('access_logs').add(accessLog);
    } catch (error) {
        console.warn('Failed to track topic access:', error);
        // Don't throw error - tracking shouldn't break main functionality
    }
}

// Get usage analytics
async getUsageAnalytics(userId = 'default', timeRange = '30d') {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));

        const accessLogs = await this.firestore.collection('access_logs')
            .where('userId', '==', userId)
            .where('timestamp', '>=', cutoffDate)
            .orderBy('timestamp', 'desc')
            .get();

        const analytics = {
            totalAccess: accessLogs.size,
            accessByType: {},
            accessByTopic: {},
            dailyAccess: {},
            mostAccessedTopics: []
        };

        accessLogs.forEach(doc => {
            const log = doc.data();

            // Track by access type
            analytics.accessByType[log.accessType] = (analytics.accessByType[log.accessType] || 0) + 1;

            // Track by topic
            analytics.accessByTopic[log.topicId] = (analytics.accessByTopic[log.topicId] || 0) + 1;

            // Track by day
            const day = log.timestamp.toDate().toISOString().split('T')[0];
            analytics.dailyAccess[day] = (analytics.dailyAccess[day] || 0) + 1;
        });

        // Get most accessed topics
        analytics.mostAccessedTopics = Object.entries(analytics.accessByTopic)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([topicId, count]) => ({ topicId, accessCount: count }));

        return analytics;
    } catch (error) {
        console.error(`❌ Failed to get usage analytics:`, error);
        throw error;
    }
}
```

### 8. Error Handling and Recovery

#### Comprehensive Error Handling
```javascript
class CloudServiceError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'CloudServiceError';
        this.code = code;
        this.details = details;
    }
}

// Error handling wrapper
async withErrorHandling(operation, context = {}) {
    try {
        return await operation();
    } catch (error) {
        console.error(`❌ Cloud service error in ${context.operation}:`, error);

        // Wrap known error types
        if (error.code === 404) {
            throw new CloudServiceError('Resource not found', 'NOT_FOUND', context);
        } else if (error.code === 403) {
            throw new CloudServiceError('Access denied', 'PERMISSION_DENIED', context);
        } else if (error.code === 429) {
            throw new CloudServiceError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', context);
        } else if (error.code === 'time-exceeded') {
            throw new CloudServiceError('Operation timeout', 'TIMEOUT', context);
        } else {
            throw new CloudServiceError(error.message, 'UNKNOWN_ERROR', { ...context, originalError: error });
        }
    }
}

// Retry mechanism with exponential backoff
async withRetry(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries || !this.isRetryableError(error)) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`⚠️  Retry ${attempt}/${maxRetries} after ${delay}ms delay`);
            await this.sleep(delay);
        }
    }
}

isRetryableError(error) {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];
    return retryableCodes.includes(error.code) || (error.response && error.response.status >= 500);
}

sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Configuration and Security

### 1. Environment Configuration
```bash
# Required environment variables
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
GCS_BUCKET_NAME=your-storage-bucket
FIRESTORE_PROJECT_ID=your-firestore-project

# Optional configuration
CLOUD_STORAGE_REGION=us-central1
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
MAX_FILE_SIZE=5242880      # 5MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
```

### 2. Service Account Security
```javascript
// Service account with minimal required permissions
const requiredPermissions = [
    'firestore.documents.create',
    'firestore.documents.read',
    'firestore.documents.update',
    'firestore.documents.delete',
    'storage.objects.create',
    'storage.objects.get',
    'storage.objects.update',
    'storage.objects.delete',
    'storage.objects.list'
];

// IAM roles to assign:
// - Cloud Datastore User (for Firestore)
// - Storage Object Admin (for Cloud Storage)
```

### 3. Access Control
```javascript
// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own topics
    match /topics/{topicId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Access logs are write-only for users
    match /access_logs/{logId} {
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}

// Cloud Storage IAM permissions
// Users get signed URLs for their own content only
// Public access only for published content
```

## Best Practices

### 1. Performance Optimization
- Use batch operations for multiple file uploads/downloads
- Implement caching for frequently accessed topic data
- Use compression for large text content
- Optimize images before upload

### 2. Cost Management
- Monitor storage usage and implement cleanup policies
- Use lifecycle policies for old backups
- Compress content before storage
- Implement data retention policies

### 3. Data Management
- Regular backups with automated scheduling
- Version control for topic configurations
- Audit logging for all operations
- Data validation before storage

### 4. Security
- Encrypt sensitive data at rest
- Use signed URLs for controlled access
- Implement rate limiting
- Regular security audits of permissions

### 5. Reliability
- Implement retry logic for transient failures
- Use exponential backoff for retries
- Circuit breaker pattern for external dependencies
- Comprehensive error logging and monitoring