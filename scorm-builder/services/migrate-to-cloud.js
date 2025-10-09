/**
 * Migration utility to move local topics to cloud storage
 * This script helps migrate existing topics from local storage to Firestore + Cloud Storage
 */

const topicService = require('./topic-service');
const fs = require('fs-extra');
const path = require('path');

class TopicMigrator {
    constructor() {
        this.topicsPath = path.join(__dirname, '..', 'topics');
    }

    /**
     * Migrate all local topics to cloud storage
     * @param {string} userId - User ID for cloud storage
     * @param {boolean} dryRun - If true, only show what would be migrated
     */
    async migrateAllTopics(userId = 'default', dryRun = false) {
        try {
            console.log('🚀 Starting topic migration to cloud storage...\n');
            
            if (!await fs.pathExists(this.topicsPath)) {
                throw new Error(`Topics directory not found: ${this.topicsPath}`);
            }

            const topicDirs = await fs.readdir(this.topicsPath);
            const validTopics = [];

            // Find valid topic directories
            for (const dir of topicDirs) {
                const topicPath = path.join(this.topicsPath, dir);
                const configPath = path.join(topicPath, 'config.json');
                
                if (await fs.pathExists(configPath)) {
                    try {
                        const config = await fs.readJson(configPath);
                        validTopics.push({
                            id: dir,
                            path: topicPath,
                            config: config,
                            title: config.title || dir
                        });
                    } catch (error) {
                        console.log(`⚠️  Skipping ${dir}: Invalid config.json`);
                    }
                }
            }

            console.log(`📊 Found ${validTopics.length} valid topics to migrate:\n`);
            
            for (const topic of validTopics) {
                console.log(`   📁 ${topic.id}: ${topic.title}`);
            }

            if (dryRun) {
                console.log('\n🔍 DRY RUN - No actual migration performed');
                return { success: true, topics: validTopics };
            }

            console.log('\n🔄 Starting migration...\n');

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const topic of validTopics) {
                try {
                    console.log(`📤 Migrating: ${topic.id}...`);
                    
                    const result = await topicService.migrateLocalTopic(
                        topic.path, 
                        userId, 
                        topic.id
                    );
                    
                    results.push({
                        topicId: topic.id,
                        success: true,
                        cloudTopicId: result.topicId,
                        uploadedImages: result.uploadedImages
                    });
                    
                    successCount++;
                    console.log(`   ✅ Migrated successfully (${result.uploadedImages} images)`);
                    
                } catch (error) {
                    results.push({
                        topicId: topic.id,
                        success: false,
                        error: error.message
                    });
                    
                    errorCount++;
                    console.log(`   ❌ Failed: ${error.message}`);
                }
            }

            console.log('\n📊 Migration Summary:');
            console.log(`   ✅ Successful: ${successCount}`);
            console.log(`   ❌ Failed: ${errorCount}`);
            console.log(`   📁 Total: ${validTopics.length}`);

            if (errorCount > 0) {
                console.log('\n❌ Failed migrations:');
                results.filter(r => !r.success).forEach(r => {
                    console.log(`   - ${r.topicId}: ${r.error}`);
                });
            }

            return {
                success: errorCount === 0,
                results: results,
                summary: {
                    total: validTopics.length,
                    successful: successCount,
                    failed: errorCount
                }
            };

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Migrate a specific topic
     * @param {string} topicId - Local topic ID
     * @param {string} userId - User ID for cloud storage
     * @param {string} newTopicId - New topic ID (optional)
     */
    async migrateTopic(topicId, userId = 'default', newTopicId = null) {
        try {
            const topicPath = path.join(this.topicsPath, topicId);
            
            if (!await fs.pathExists(topicPath)) {
                throw new Error(`Topic not found: ${topicPath}`);
            }

            console.log(`📤 Migrating topic: ${topicId}...`);
            
            const result = await topicService.migrateLocalTopic(
                topicPath, 
                userId, 
                newTopicId || topicId
            );

            console.log(`✅ Topic migrated successfully:`);
            console.log(`   📁 Local: ${topicId}`);
            console.log(`   ☁️  Cloud: ${result.topicId}`);
            console.log(`   🖼️  Images: ${result.uploadedImages}`);

            return result;

        } catch (error) {
            console.error(`❌ Failed to migrate topic ${topicId}:`, error);
            throw error;
        }
    }

    /**
     * List local topics that can be migrated
     */
    async listLocalTopics() {
        try {
            if (!await fs.pathExists(this.topicsPath)) {
                return { topics: [] };
            }

            const topicDirs = await fs.readdir(this.topicsPath);
            const topics = [];

            for (const dir of topicDirs) {
                const topicPath = path.join(this.topicsPath, dir);
                const configPath = path.join(topicPath, 'config.json');
                const imagesPath = path.join(topicPath, 'images');
                
                if (await fs.pathExists(configPath)) {
                    try {
                        const config = await fs.readJson(configPath);
                        const hasImages = await fs.pathExists(imagesPath);
                        const imageCount = hasImages ? (await fs.readdir(imagesPath)).length : 0;
                        
                        topics.push({
                            id: dir,
                            title: config.title || dir,
                            description: config.description || '',
                            hasImages: hasImages,
                            imageCount: imageCount,
                            path: topicPath
                        });
                    } catch (error) {
                        console.log(`⚠️  Skipping ${dir}: Invalid config.json`);
                    }
                }
            }

            return { topics: topics };
        } catch (error) {
            console.error('❌ Failed to list local topics:', error);
            throw error;
        }
    }

    /**
     * Compare local and cloud topics
     * @param {string} userId - User ID
     */
    async compareLocalAndCloud(userId = 'default') {
        try {
            console.log('🔍 Comparing local and cloud topics...\n');

            const localTopics = await this.listLocalTopics();
            const cloudTopics = await topicService.listTopics(userId);

            console.log(`📁 Local topics: ${localTopics.topics.length}`);
            console.log(`☁️  Cloud topics: ${cloudTopics.topics.length}\n`);

            const localIds = new Set(localTopics.topics.map(t => t.id));
            const cloudIds = new Set(cloudTopics.topics.map(t => t.id));

            const onlyLocal = localTopics.topics.filter(t => !cloudIds.has(t.id));
            const onlyCloud = cloudTopics.topics.filter(t => !localIds.has(t.id));
            const inBoth = localTopics.topics.filter(t => cloudIds.has(t.id));

            console.log('📊 Comparison Results:');
            console.log(`   📁 Only local: ${onlyLocal.length}`);
            console.log(`   ☁️  Only cloud: ${onlyCloud.length}`);
            console.log(`   🔄 In both: ${inBoth.length}\n`);

            if (onlyLocal.length > 0) {
                console.log('📁 Topics only in local storage:');
                onlyLocal.forEach(topic => {
                    console.log(`   - ${topic.id}: ${topic.title} (${topic.imageCount} images)`);
                });
                console.log('');
            }

            if (onlyCloud.length > 0) {
                console.log('☁️  Topics only in cloud storage:');
                onlyCloud.forEach(topic => {
                    console.log(`   - ${topic.id}: ${topic.title}`);
                });
                console.log('');
            }

            return {
                local: localTopics.topics,
                cloud: cloudTopics.topics,
                onlyLocal: onlyLocal,
                onlyCloud: onlyCloud,
                inBoth: inBoth
            };

        } catch (error) {
            console.error('❌ Failed to compare topics:', error);
            throw error;
        }
    }

    /**
     * Export a cloud topic to local filesystem
     * @param {string} topicId - Cloud topic ID
     * @param {string} userId - User ID that owns the topic in cloud
     * @param {string|null} localTopicId - Optional local folder name (defaults to topicId)
     */
    async exportTopic(topicId, userId = 'default', localTopicId = null) {
        try {
            if (!topicId) {
                throw new Error('Topic ID is required to export from cloud');
            }

            const targetFolderName = localTopicId || topicId;
            const localTopicPath = path.join(this.topicsPath, targetFolderName);

            console.log(`☁️  Exporting cloud topic '${topicId}' to local '${targetFolderName}'...`);

            const result = await topicService.exportCloudTopic(topicId, localTopicPath, userId);

            console.log('✅ Export completed:');
            console.log(`   ☁️  Cloud: ${topicId}`);
            console.log(`   📁 Local: ${result.localPath}`);
            console.log(`   🖼️  Images: ${result.downloadedImages}`);

            return result;
        } catch (error) {
            console.error(`❌ Failed to export topic ${topicId}:`, error);
            throw error;
        }
    }
}

// CLI interface
async function main() {
    const migrator = new TopicMigrator();
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case 'list':
                const localTopics = await migrator.listLocalTopics();
                console.log('📁 Local topics:');
                localTopics.topics.forEach(topic => {
                    console.log(`   - ${topic.id}: ${topic.title} (${topic.imageCount} images)`);
                });
                break;

            case 'compare':
                await migrator.compareLocalAndCloud();
                break;

            case 'migrate':
                const topicId = args[1];
                if (topicId) {
                    await migrator.migrateTopic(topicId);
                } else {
                    const dryRun = args.includes('--dry-run');
                    await migrator.migrateAllTopics('default', dryRun);
                }
                break;

            case 'export': {
                const cloudTopicId = args[1];
                const localNameArgIndex = args.findIndex(a => a === '--as');
                const localName = localNameArgIndex !== -1 ? args[localNameArgIndex + 1] : null;
                await migrator.exportTopic(cloudTopicId, 'default', localName || null);
                break;
            }

            default:
                console.log('📖 Topic Migration Utility');
                console.log('');
                console.log('Usage:');
                console.log('  node migrate-to-cloud.js list                    # List local topics');
                console.log('  node migrate-to-cloud.js compare                 # Compare local vs cloud');
                console.log('  node migrate-to-cloud.js migrate [topic-id]      # Migrate specific topic');
                console.log('  node migrate-to-cloud.js migrate --dry-run       # Show what would be migrated');
                console.log('  node migrate-to-cloud.js export <topic-id> [--as <local-name>]  # Export cloud topic to local');
                console.log('');
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run CLI if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = TopicMigrator;