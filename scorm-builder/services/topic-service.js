const cloudServices = require('./cloud-services');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

class TopicService {
    constructor() {
        this.db = null;
        this.bucket = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (this.initialized) {
                return;
            }

            await cloudServices.initialize();
            this.db = cloudServices.getFirestore();
            this.bucket = cloudServices.getStorageBucket();
            this.initialized = true;
            
            console.log('✅ Topic service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize topic service:', error);
            throw error;
        }
    }

    async saveTopic(topicData, userId = 'default', topicId = null) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Generate topic ID if not provided
            if (!topicId) {
                topicId = topicData.title 
                    ? topicData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
                    : uuidv4();
            }

            // Prepare topic document
            const topicDoc = {
                id: topicId,
                title: topicData.title,
                description: topicData.description,
                learning_objectives: topicData.learning_objectives || [],
                content: topicData.content || {},
                quiz: topicData.quiz || {},
                chat_contexts: topicData.chat_contexts || {},
                userId: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            };

            // Save to Firestore
            await this.db.collection('topics').doc(topicId).set(topicDoc);

            console.log(`✅ Topic saved to Firestore: ${topicId}`);
            return {
                success: true,
                topicId: topicId,
                data: topicDoc
            };
        } catch (error) {
            console.error(`❌ Failed to save topic:`, error);
            throw error;
        }
    }

    async uploadTopicImages(topicId, localImagesPath, userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            if (!await fs.pathExists(localImagesPath)) {
                console.log(`⚠️  Images directory not found: ${localImagesPath}`);
                return { success: true, uploadedFiles: [] };
            }

            const uploadedFiles = [];
            const allowedExt = ['.png', '.jpg', '.jpeg', '.gif'];
            const files = (await fs.readdir(localImagesPath))
                .filter(file => allowedExt.includes(path.extname(file).toLowerCase()));

            for (const file of files) {
                const localFilePath = path.join(localImagesPath, file);
                const stat = await fs.stat(localFilePath);
                
                if (stat.isFile()) {
                    const cloudPath = `topics/${userId}/${topicId}/images/${file}`;
                    
                    await cloudServices.uploadFile(localFilePath, cloudPath, {
                        metadata: {
                            topicId: topicId,
                            userId: userId,
                            uploadedAt: new Date().toISOString()
                        }
                    });
                    
                    uploadedFiles.push({
                        fileName: file,
                        cloudPath: cloudPath,
                        url: cloudServices.getPublicUrl(cloudPath)
                    });
                }
            }

            console.log(`✅ Uploaded ${uploadedFiles.length} images for topic: ${topicId}`);
            return {
                success: true,
                uploadedFiles: uploadedFiles
            };
        } catch (error) {
            console.error(`❌ Failed to upload images for topic ${topicId}:`, error);
            throw error;
        }
    }

    async loadTopic(topicId, userId = null) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const topicDoc = await this.db.collection('topics').doc(topicId).get();
            
            if (!topicDoc.exists) {
                throw new Error(`Topic not found: ${topicId}`);
            }

            const topicData = topicDoc.data();
            
            // Check user access if userId is provided
            if (userId && topicData.userId !== userId) {
                throw new Error(`Access denied: Topic belongs to different user`);
            }

            console.log(`✅ Topic loaded: ${topicId}`);
            return {
                success: true,
                data: topicData
            };
        } catch (error) {
            console.error(`❌ Failed to load topic ${topicId}:`, error);
            throw error;
        }
    }

    async listTopics(userId = 'default', limit = 50) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            let query = this.db.collection('topics')
                .where('userId', '==', userId)
                .orderBy('updatedAt', 'desc')
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
            return {
                success: true,
                topics: topics
            };
        } catch (error) {
            console.error(`❌ Failed to list topics for user ${userId}:`, error);
            throw error;
        }
    }

    async updateTopic(topicId, updateData, userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Check if topic exists and user has access
            const existingTopic = await this.loadTopic(topicId, userId);
            
            const updateDoc = {
                ...updateData,
                updatedAt: new Date(),
                version: (existingTopic.data.version || 1) + 1
            };

            await this.db.collection('topics').doc(topicId).update(updateDoc);

            console.log(`✅ Topic updated: ${topicId}`);
            return {
                success: true,
                topicId: topicId,
                data: updateDoc
            };
        } catch (error) {
            console.error(`❌ Failed to update topic ${topicId}:`, error);
            throw error;
        }
    }

    async deleteTopic(topicId, userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Check if topic exists and user has access
            await this.loadTopic(topicId, userId);

            // Delete topic from Firestore
            await this.db.collection('topics').doc(topicId).delete();

            // Delete associated images from Cloud Storage
            const imagePrefix = `topics/${userId}/${topicId}/images/`;
            const files = await cloudServices.listFiles(imagePrefix);
            
            for (const file of files) {
                await cloudServices.deleteFile(file.name);
            }

            console.log(`✅ Topic deleted: ${topicId} (${files.length} images removed)`);
            return {
                success: true,
                topicId: topicId,
                deletedImages: files.length
            };
        } catch (error) {
            console.error(`❌ Failed to delete topic ${topicId}:`, error);
            throw error;
        }
    }

    async downloadTopicImages(topicId, localImagesPath, userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const imagePrefix = `topics/${userId}/${topicId}/images/`;
            let files = await cloudServices.listFiles(imagePrefix);

            await fs.ensureDir(localImagesPath);

            const downloadedFiles = [];

            if (files.length === 0) {
                console.warn(`⚠️  No files found with prefix ${imagePrefix}. Falling back to root filenames if referenced.`);
            }

            for (const file of files) {
                const fileName = path.basename(file.name);
                const localFilePath = path.join(localImagesPath, fileName);
                await cloudServices.downloadFile(file.name, localFilePath);
                downloadedFiles.push({ fileName, localPath: localFilePath, cloudPath: file.name });
            }

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

    async downloadTopicVideos(topicId, localVideosPath, userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const videoPrefix = `topics/${userId}/${topicId}/videos/`;
            let files = await cloudServices.listFiles(videoPrefix);

            await fs.ensureDir(localVideosPath);

            const downloadedFiles = [];

            if (files.length === 0) {
                console.warn(`⚠️  No video files found with prefix ${videoPrefix}.`);
            }

            for (const file of files) {
                const fileName = path.basename(file.name);
                const localFilePath = path.join(localVideosPath, fileName);
                await cloudServices.downloadFile(file.name, localFilePath);
                downloadedFiles.push({ fileName, localPath: localFilePath, cloudPath: file.name });
            }

            console.log(`✅ Downloaded ${downloadedFiles.length} videos for topic: ${topicId}`);
            return {
                success: true,
                downloadedFiles: downloadedFiles
            };
        } catch (error) {
            console.error(`❌ Failed to download videos for topic ${topicId}:`, error);
            throw error;
        }
    }

    async migrateLocalTopic(localTopicPath, userId = 'default', topicId = null) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const configPath = path.join(localTopicPath, 'config.json');
            const imagesPath = path.join(localTopicPath, 'images');

            // Check if config.json exists
            if (!await fs.pathExists(configPath)) {
                throw new Error(`Config file not found: ${configPath}`);
            }

            // Load topic data
            const topicData = await fs.readJson(configPath);
            
            // Save topic to Firestore
            const saveResult = await this.saveTopic(topicData, userId, topicId);
            const finalTopicId = saveResult.topicId;

            // Upload images if they exist
            let uploadResult = { uploadedFiles: [] };
            if (await fs.pathExists(imagesPath)) {
                uploadResult = await this.uploadTopicImages(finalTopicId, imagesPath, userId);
            }

            console.log(`✅ Migrated local topic to cloud: ${finalTopicId}`);
            return {
                success: true,
                topicId: finalTopicId,
                uploadedImages: uploadResult.uploadedFiles.length,
                data: saveResult.data
            };
        } catch (error) {
            console.error(`❌ Failed to migrate local topic:`, error);
            throw error;
        }
    }

    async exportCloudTopic(topicId, localTopicPath, userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Load topic data
            const topicResult = await this.loadTopic(topicId, userId);
            const topicData = topicResult.data;

            // Create local directory
            await fs.ensureDir(localTopicPath);
            await fs.ensureDir(path.join(localTopicPath, 'images'));
            await fs.ensureDir(path.join(localTopicPath, 'videos'));

            // Save config.json
            const configPath = path.join(localTopicPath, 'config.json');
            await fs.writeJson(configPath, topicData, { spaces: 2 });

            // Download images
            const imagesPath = path.join(localTopicPath, 'images');
            const imageDownloadResult = await this.downloadTopicImages(topicId, imagesPath, userId);

            // Download videos
            const videosPath = path.join(localTopicPath, 'videos');
            const videoDownloadResult = await this.downloadTopicVideos(topicId, videosPath, userId);

            console.log(`✅ Exported cloud topic to local: ${topicId}`);
            return {
                success: true,
                topicId: topicId,
                localPath: localTopicPath,
                downloadedImages: imageDownloadResult.downloadedFiles.length,
                downloadedVideos: videoDownloadResult.downloadedFiles.length
            };
        } catch (error) {
            console.error(`❌ Failed to export cloud topic ${topicId}:`, error);
            throw error;
        }
    }

    async getTopicStats(userId = 'default') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const topicsResult = await this.listTopics(userId, 1000);
            const topics = topicsResult.topics;

            const stats = {
                totalTopics: topics.length,
                totalImages: 0,
                totalSize: 0,
                recentTopics: topics.slice(0, 5).map(t => ({
                    id: t.id,
                    title: t.title,
                    updatedAt: t.updatedAt
                }))
            };

            // Calculate image statistics
            for (const topic of topics) {
                const imagePrefix = `topics/${userId}/${topic.id}/images/`;
                const files = await cloudServices.listFiles(imagePrefix);
                stats.totalImages += files.length;
                stats.totalSize += files.reduce((sum, file) => sum + parseInt(file.size || 0), 0);
            }

            return {
                success: true,
                stats: stats
            };
        } catch (error) {
            console.error(`❌ Failed to get topic stats for user ${userId}:`, error);
            throw error;
        }
    }
}

// Create singleton instance
const topicService = new TopicService();

module.exports = topicService;