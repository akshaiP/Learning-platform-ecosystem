# Cloud Services for SCORM Builder

This directory contains cloud storage services for the SCORM Builder application, enabling storage of topics and images in Google Cloud Firestore and Cloud Storage.

## Files

- `cloud-services.js` - Main cloud service class for Firestore and Cloud Storage connections
- `topic-service.js` - Topic-specific operations (CRUD, image handling)
- `test-cloud-integration.js` - Test script to verify cloud integration
- `migrate-to-cloud.js` - Migration utility for moving local topics to cloud storage

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your Google Cloud credentials:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0364779787
GOOGLE_CLOUD_REGION=asia-south1
GOOGLE_CLOUD_STORAGE_BUCKET=scorm-builder-topics-bucket

# Firebase Admin SDK Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
```

### 3. Google Cloud Setup

1. **Enable APIs**: Enable Firestore API and Cloud Storage API in your Google Cloud project
2. **Create Service Account**: Create a service account with the following roles:
   - Firestore Service Agent
   - Storage Admin
   - Storage Object Admin
3. **Download Credentials**: Download the service account key JSON file
4. **Set Environment Variable**: Point `GOOGLE_APPLICATION_CREDENTIALS` to your key file

### 4. Test Integration

Run the integration test to verify everything is working:

```bash
node services/test-cloud-integration.js
```

## Usage

### Basic Cloud Services

```javascript
const cloudServices = require('./services/cloud-services');

// Initialize
await cloudServices.initialize();

// Health check
const health = await cloudServices.healthCheck();

// Upload file
await cloudServices.uploadFile('local/path/file.jpg', 'cloud/path/file.jpg');

// Download file
await cloudServices.downloadFile('cloud/path/file.jpg', 'local/path/file.jpg');

// Delete file
await cloudServices.deleteFile('cloud/path/file.jpg');
```

### Topic Service

```javascript
const topicService = require('./services/topic-service');

// Initialize
await topicService.initialize();

// Save topic
const topicData = { title: 'My Topic', description: '...' };
await topicService.saveTopic(topicData, 'user-id', 'topic-id');

// Load topic
const topic = await topicService.loadTopic('topic-id', 'user-id');

// List topics
const topics = await topicService.listTopics('user-id');

// Upload images
await topicService.uploadTopicImages('topic-id', 'local/images/path', 'user-id');

// Delete topic
await topicService.deleteTopic('topic-id', 'user-id');
```

### Migration from Local Storage

```bash
# List local topics
node services/migrate-to-cloud.js list

# Compare local vs cloud
node services/migrate-to-cloud.js compare

# Migrate all topics (dry run)
node services/migrate-to-cloud.js migrate --dry-run

# Migrate all topics
node services/migrate-to-cloud.js migrate

# Migrate specific topic
node services/migrate-to-cloud.js migrate Robotics-M1-T1
```

### Export from Cloud to Local

```bash
# Export a cloud topic into local topics directory (same name)
node services/migrate-to-cloud.js export <topic-id>

# Export and rename the local folder
node services/migrate-to-cloud.js export <topic-id> --as <local-name>
```

This will:
- Load the cloud topic document from Firestore
- Create `scorm-builder/topics/<local-name || topic-id>/`
- Write `config.json` with the topic data
- Download all images from `topics/{userId}/{topicId}/images/` into the local `images/` folder

## Data Structure

### Firestore Collections

**topics** - Topic documents
```javascript
{
  id: "topic-id",
  title: "Topic Title",
  description: "Topic description",
  learning_objectives: ["objective1", "objective2"],
  content: { /* topic content */ },
  quiz: { /* quiz data */ },
  chat_contexts: { /* chat contexts */ },
  userId: "user-id",
  createdAt: timestamp,
  updatedAt: timestamp,
  version: 1
}
```

### Cloud Storage Structure

```
scorm-builder-topics-bucket/
├── topics/
│   └── {userId}/
│       └── {topicId}/
│           └── images/
│               ├── image1.jpg
│               ├── image2.png
│               └── ...
```

## API Reference

### CloudServices

- `initialize()` - Initialize Firebase Admin SDK and Cloud Storage
- `healthCheck()` - Check service health
- `uploadFile(localPath, cloudPath, options)` - Upload file to Cloud Storage
- `downloadFile(cloudPath, localPath)` - Download file from Cloud Storage
- `deleteFile(cloudPath)` - Delete file from Cloud Storage
- `listFiles(prefix)` - List files with prefix
- `getPublicUrl(cloudPath)` - Get public URL for file

### TopicService

- `initialize()` - Initialize topic service
- `saveTopic(topicData, userId, topicId)` - Save topic to Firestore
- `loadTopic(topicId, userId)` - Load topic from Firestore
- `listTopics(userId, limit)` - List user's topics
- `updateTopic(topicId, updateData, userId)` - Update topic
- `deleteTopic(topicId, userId)` - Delete topic and images
- `uploadTopicImages(topicId, localImagesPath, userId)` - Upload topic images
- `downloadTopicImages(topicId, localImagesPath, userId)` - Download topic images
- `migrateLocalTopic(localTopicPath, userId, topicId)` - Migrate local topic to cloud
- `exportCloudTopic(topicId, localTopicPath, userId)` - Export cloud topic to local
- `getTopicStats(userId)` - Get topic statistics

## Error Handling

All services include comprehensive error handling and logging. Check the console output for detailed error messages and troubleshooting information.

## Security

- Service account credentials should be kept secure
- Never commit `.env` files or service account keys to version control
- Use environment variables in production
- Consider using Google Cloud Secret Manager for production deployments

## Troubleshooting

### Common Issues

1. **Authentication Error**: Verify your service account key and permissions
2. **Bucket Not Found**: Ensure the bucket exists and is accessible
3. **API Not Enabled**: Enable Firestore and Cloud Storage APIs in Google Cloud Console
4. **Permission Denied**: Check service account roles and permissions

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.

## Production Considerations

- Use Google Cloud Secret Manager for credentials
- Set up proper IAM roles and permissions
- Configure Cloud Storage lifecycle policies
- Set up monitoring and alerting
- Consider using Cloud Functions for serverless operations
- Implement proper backup and disaster recovery

