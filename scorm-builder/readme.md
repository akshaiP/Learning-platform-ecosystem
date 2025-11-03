# 📘 SCORM Builder App

  A production-ready SCORM 2004 package generator for task-based learning with chat integration.

  ## 🚀 Quick Start

  ### Prerequisites
  - Node.js 16+
  - npm

  ### Install Dependencies
  ```bash
  cd scorm-builder
  npm install

  📦 Build Any Topic:

  Important: Use -- before the topic parameter for cross-platform compatibility (Windows & Mac)

  Build for development

  npm run test:topic -- --topic=TestingAI-M1-T2

  Build for production

  npm run build:prod -- --topic=TestingAI-M1-T2

  Build all topics

  npm run build:all

  🧪 Test Any Topic:

  Important: Use -- before the topic parameter for cross-platform compatibility (Windows & Mac)

  Complete test workflow for any topic

  npm run test:topic -- --topic=TestingAI-M1-T2
  npm run test:topic -- --topic=Robotics-M1-T1
  npm run test:topic -- --topic=Robotics-M1-T2

  Individual Commands

  # Validate topic configurations
  npm run validate

  # Build specific topic (development mode with backend URL)
  npm run build:topic -- --topic=TestingAI-M1-T2

  # Extract topic from built package
  npm run extract

  # Start test server
  npm run serve:test

  🔧 Cross-Platform Compatibility

  This project now supports both Windows and Mac/Linux operating systems:

  ✅ Works on Windows & Mac:

  - All file operations use cross-platform tools (rimraf, mkdirp)
  - Argument passing works with -- separator
  - Path handling supports spaces in directory names

  ❌ Old Commands (Don't use):

  # These won't work on Windows
  npm run test:topic --topic=TestingAI-M1-T2
  npm run build:topic --topic=TestingAI-M1-T2

  ✅ New Commands (Cross-platform):

  # These work on both Windows and Mac
  npm run test:topic -- --topic=TestingAI-M1-T2
  npm run build:topic -- --topic=TestingAI-M1-T2

  📁 Project Structure

  scorm-builder/
  ├── scripts/           # Helper scripts for cross-platform compatibility
  ├── topics/           # Topic configurations and assets
  ├── output/           # Generated SCORM packages
  ├── test-output/      # Extracted test packages
  ├── templates/        # SCORM templates
  └── web-ui/          # Web interface

  🌐 Test Server

  When you run npm run test:topic, the test server starts at:
  - Main URL: http://localhost:8080
  - Health Check: http://localhost:8080/health

  🔄 Development Workflow

  1. Create/Update Topic: Add topic files to topics/ directory
  2. Validate: npm run validate
  3. Test: npm run test:topic -- --topic=YourTopicName
  4. Deploy: Use generated .zip files in output/ directory

  🛠️ Troubleshooting

  Command Not Working?

  - Make sure to use -- --topic= (double dash)
  - Check if topic exists in topics/ directory
  - Ensure all dependencies are installed

  Path Issues on Windows?

  - All paths are now handled cross-platform
  - Spaces in directory names are supported
  - Use quotes around paths if needed manually

  📝 Notes

  - Backend URL for development: https://learning-platform-ecosystem.onrender.com
  - Generated packages are SCORM 2004 compliant
  - Chat integration included in all packages
  - Image assets are automatically processed and optimized

A Cloud Run–based service for managing and previewing SCORM topics with signed image URLs from Google Cloud Storage.

## 🌩️ Cloud Integration (Google Cloud Run + GCS + Firestore)

This guide walks you through deploying and configuring the `scorm-builder-app` on Google Cloud Platform using Cloud Run, Google Cloud Storage, and Firestore.

---

## Prerequisites

- Google Cloud SDK (gcloud CLI) installed
- A Google Cloud Project with billing enabled
- Docker (for local testing, optional)

---

## 🚀 Deployment Steps

### 1. Login to Google Cloud

```bash
# Opens a browser – login with your Google account
gcloud auth login
```

### 2. Select Your Project

```bash
# List all projects to find yours
gcloud projects list

# Set your active project (replace with your Project ID)
gcloud config set project gen-lang-client-0364779787
```

### 3. Enable Required APIs

```bash
# Required for Cloud Run & builds
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Required for signed URL generation
gcloud services enable iamcredentials.googleapis.com
```

### 4. Set Up Permissions

#### 4.1 Firestore Permissions

```bash
# Allow the default Compute service account to access Firestore
gcloud projects add-iam-policy-binding gen-lang-client-0364779787 \
  --member="serviceAccount:759854934093-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

#### 4.2 Cloud Storage Permissions (Admin for default SA)

```bash
# Allow the default Compute service account to manage Storage
gcloud projects add-iam-policy-binding gen-lang-client-0364779787 \
  --member="serviceAccount:759854934093-compute@developer.gserviceaccount.com" \
  --role="roles/storage.admin"
```

#### 4.3 Permissions for Custom Service Account (scorm-builder-sa)

```bash
# Allow the service account to sign URLs
gcloud iam service-accounts add-iam-policy-binding \
  scorm-builder-sa@gen-lang-client-0364779787.iam.gserviceaccount.com \
  --member=serviceAccount:scorm-builder-sa@gen-lang-client-0364779787.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator \
  --project=gen-lang-client-0364779787

# Allow the service account to read bucket objects
gcloud storage buckets add-iam-policy-binding gs://scorm-builder-topics-bucket \
  --member=serviceAccount:scorm-builder-sa@gen-lang-client-0364779787.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer \
  --project=gen-lang-client-0364779787
```

#### 4.4 Verify Permissions

```bash
# Check IAM roles attached to the custom service account
gcloud projects get-iam-policy gen-lang-client-0364779787 \
  --filter="bindings.members:serviceAccount:scorm-builder-sa@gen-lang-client-0364779787.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### 5. Deploy to Cloud Run

#### Basic Deployment (US Region Example)

```bash
gcloud run deploy scorm-builder-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --port 8080
```

#### Full Deployment (Asia-South1 with Environment Variables + Custom Service Account)

```bash
gcloud run deploy scorm-builder-app \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --port 8080 \
  --service-account=scorm-builder-sa@gen-lang-client-0364779787.iam.gserviceaccount.com \
  --set-env-vars="GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0364779787,GOOGLE_CLOUD_REGION=asia-south1,GOOGLE_CLOUD_STORAGE_BUCKET=scorm-builder-topics-bucket,NODE_ENV=production,LOG_LEVEL=info"
```

### 6. Update Service Account (for existing service)

```bash
# Update an existing Cloud Run service with a new service account
gcloud run services update scorm-builder-app \
  --service-account=scorm-builder-sa@gen-lang-client-0364779787.iam.gserviceaccount.com \
  --region=asia-south1 \
  --project=gen-lang-client-0364779787
```

---

## 📋 Configuration Details

### Environment Variables

The following environment variables are configured during deployment:

- `GOOGLE_CLOUD_PROJECT_ID`: Your Google Cloud Project ID
- `GOOGLE_CLOUD_REGION`: The region where your resources are deployed
- `GOOGLE_CLOUD_STORAGE_BUCKET`: The GCS bucket for storing SCORM content
- `NODE_ENV`: Set to `production` for production deployments
- `LOG_LEVEL`: Logging level (e.g., `info`, `debug`, `error`)

### Service Account

The application uses a custom service account (`scorm-builder-sa`) with the following permissions:
- **Token Creator**: For signing URLs
- **Storage Object Viewer**: For reading bucket objects
- **Datastore User**: For Firestore operations

### Resource Allocation

- **Memory**: 4GiB
- **CPU**: 2 vCPUs
- **Timeout**: 300 seconds
- **Max Instances**: 10
- **Port**: 8080

---

## 🔧 Troubleshooting

### Common Issues

1. **Permission Denied Errors**: Ensure all IAM roles are properly assigned
2. **Build Failures**: Check that all required APIs are enabled
3. **Timeout Issues**: Increase the timeout value if needed
4. **Memory Issues**: Adjust memory allocation based on your application needs

### Useful Commands

```bash
# Check service status
gcloud run services list --region=asia-south1

# View service logs
gcloud run services logs read scorm-builder-app --region=asia-south1

# Describe service configuration
gcloud run services describe scorm-builder-app --region=asia-south1
```