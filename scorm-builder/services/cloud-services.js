const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

class CloudServices {
    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0364779787';
        this.region = process.env.GOOGLE_CLOUD_REGION || 'asia-south1';
        this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'scorm-builder-topics-bucket';
        
        this.db = null;
        this.storage = null;
        this.bucket = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (this.initialized) {
                return;
            }

			const isProduction = process.env.NODE_ENV === 'production';

			// Initialize Firebase Admin SDK based on environment
			if (!admin.apps.length) {
				if (isProduction) {
					// Cloud Run / GCP: use Application Default Credentials (ADC)
					admin.initializeApp();
					console.log('🔐 Using Application Default Credentials (production)');
				} else {
					// Local development: prefer key file or explicit env service account
					let keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
					const defaultKeyPath = path.resolve(__dirname, '..', 'key.json');

					// Support FIREBASE_* env block as an alternative
					if (process.env.FIREBASE_PRIVATE_KEY) {
						const serviceAccount = {
							type: 'service_account',
							project_id: process.env.FIREBASE_PROJECT_ID || this.projectId,
							private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
							private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
							client_email: process.env.FIREBASE_CLIENT_EMAIL,
							client_id: process.env.FIREBASE_CLIENT_ID,
							auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
							token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
							auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
							client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
						};
						admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: this.projectId });
						console.log('🔑 Using FIREBASE_* environment credentials (development)');
					} else {
						if (!keyFilePath) {
							keyFilePath = defaultKeyPath;
						} else {
							// Resolve env-provided path to absolute so require() does not treat it as module-relative
							keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.resolve(process.cwd(), keyFilePath);
						}
						if (!fs.existsSync(keyFilePath)) {
							throw new Error(`GOOGLE_APPLICATION_CREDENTIALS key file not found at ${keyFilePath}. Set env var or place key.json in project root.`);
						}
						const serviceAccount = require(keyFilePath);
						admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: this.projectId });
						console.log(`🔑 Using key file credentials (development): ${keyFilePath}`);
					}
				}
			}

			// Initialize Firestore
			this.db = admin.firestore();

			// Initialize Cloud Storage based on environment
			if (isProduction) {
				this.storage = new Storage(); // ADC on Cloud Run
			} else {
				let keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
				const defaultKeyPath = path.resolve(__dirname, '..', 'key.json');
				if (!process.env.FIREBASE_PRIVATE_KEY) {
					if (!keyFilePath) {
						keyFilePath = defaultKeyPath;
					} else {
						keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.resolve(process.cwd(), keyFilePath);
					}
					if (!fs.existsSync(keyFilePath)) {
						throw new Error(`GOOGLE_APPLICATION_CREDENTIALS key file not found at ${keyFilePath} for Storage client.`);
					}
				}
				this.storage = process.env.FIREBASE_PRIVATE_KEY
					? new Storage({ projectId: this.projectId })
					: new Storage({ projectId: this.projectId, keyFilename: keyFilePath });
			}

			this.bucket = this.storage.bucket(this.bucketName);
            
            // Ensure bucket exists
            await this.ensureBucketExists();
            
            this.initialized = true;
            console.log('✅ Cloud services initialized successfully');
            console.log(`📊 Firestore project: ${this.projectId}`);
            console.log(`🗄️  Storage bucket: ${this.bucketName}`);
            
        } catch (error) {
			console.error(`❌ Failed to initialize cloud services (${process.env.NODE_ENV || 'unknown env'}):`, error.message || error);
			// Surface a clean error with guidance
			if (process.env.NODE_ENV !== 'production') {
				console.error('ℹ️ For local development, set GOOGLE_APPLICATION_CREDENTIALS=./key.json or provide FIREBASE_* env vars.');
			}
            throw error;
        }
    }

    async ensureBucketExists() {
        try {
            const [exists] = await this.bucket.exists();
            if (!exists) {
                console.log(`Creating bucket: ${this.bucketName}`);
                await this.bucket.create({
                    location: this.region,
                    storageClass: 'STANDARD'
                });
                console.log(`✅ Bucket ${this.bucketName} created successfully`);
            } else {
                console.log(`✅ Bucket ${this.bucketName} already exists`);
            }
        } catch (error) {
			// On some environments (e.g., Cloud Run) the service account may not have bucket-create permissions
			if (error && (error.code === 403 || error.code === 409)) {
				console.warn(`⚠️ Bucket existence check/create encountered ${error.code}. Proceeding assuming bucket is managed externally.`);
				return;
			}
			console.error('❌ Error ensuring bucket exists:', error.message || error);
            throw error;
        }
    }

    getFirestore() {
        if (!this.initialized) {
            throw new Error('Cloud services not initialized. Call initialize() first.');
        }
        return this.db;
    }

    getStorageBucket() {
        if (!this.initialized) {
            throw new Error('Cloud services not initialized. Call initialize() first.');
        }
        return this.bucket;
    }

    async uploadFile(localFilePath, cloudPath, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }
    
            // Remove public flag to avoid ACL errors
            const { public: isPublic, ...restOptions } = options;
    
            const uploadOptions = {
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                    ...restOptions.metadata
                },
                destination: cloudPath,
                ...restOptions
            };
    
            await this.bucket.upload(localFilePath, uploadOptions);
    
            console.log(`✅ File uploaded: ${cloudPath}`);
            return {
                success: true,
                path: cloudPath,
                url: `https://storage.googleapis.com/${this.bucketName}/${cloudPath}`
            };
        } catch (error) {
            console.error(`❌ Failed to upload file ${cloudPath}:`, error);
            throw error;
        }
    }    

    async downloadFile(cloudPath, localFilePath) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const file = this.bucket.file(cloudPath);
            
            // Ensure directory exists
            await fs.ensureDir(path.dirname(localFilePath));
            
            await file.download({ destination: localFilePath });
            
            console.log(`✅ File downloaded: ${cloudPath} -> ${localFilePath}`);
            return {
                success: true,
                localPath: localFilePath,
                cloudPath: cloudPath
            };
        } catch (error) {
            console.error(`❌ Failed to download file ${cloudPath}:`, error);
            throw error;
        }
    }

    async deleteFile(cloudPath) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const file = this.bucket.file(cloudPath);
            await file.delete();
            
            console.log(`✅ File deleted: ${cloudPath}`);
            return { success: true, path: cloudPath };
        } catch (error) {
            console.error(`❌ Failed to delete file ${cloudPath}:`, error);
            throw error;
        }
    }

    async listFiles(prefix = '') {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const [files] = await this.bucket.getFiles({ prefix });
            
            return files.map(file => ({
                name: file.name,
                size: file.metadata.size,
                updated: file.metadata.updated,
                url: `https://storage.googleapis.com/${this.bucketName}/${file.name}`
            }));
        } catch (error) {
            console.error(`❌ Failed to list files with prefix ${prefix}:`, error);
            throw error;
        }
    }

    async getSignedUrl(cloudPath, expiresInSeconds = 3600) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const file = this.bucket.file(cloudPath);
            const expires = Date.now() + expiresInSeconds * 1000;
            const [url] = await file.getSignedUrl({ action: 'read', expires });
            return url;
        } catch (error) {
            console.error(`❌ Failed to get signed URL for ${cloudPath}:`, error);
            throw error;
        }
    }

    getPublicUrl(cloudPath) {
        return `https://storage.googleapis.com/${this.bucketName}/${cloudPath}`;
    }

    async healthCheck() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Test Firestore connection
            const testDoc = this.db.collection('_health').doc('test');
            await testDoc.set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
            await testDoc.delete();

            // Test Cloud Storage connection
            const testFile = this.bucket.file('_health/test.txt');
            await testFile.save('health check');
            await testFile.delete();

            return {
                status: 'healthy',
                firestore: 'connected',
                storage: 'connected',
                projectId: this.projectId,
                bucketName: this.bucketName
            };
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Create singleton instance
const cloudServices = new CloudServices();

module.exports = cloudServices;

