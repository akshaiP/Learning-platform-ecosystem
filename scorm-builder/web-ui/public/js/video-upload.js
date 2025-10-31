// Video upload and preview functionality
class VideoUploadHandler {
    constructor() {
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
        this.uploadedVideos = new Map(); // Track uploaded videos: fileId -> { video, fieldName }
    }

    setupVideoUpload(inputId, previewId, singleVideo = false) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        if (!input || !preview) {
            console.warn(`Video setup failed: input(${inputId}) or preview(${previewId}) not found`);
            return;
        }

        input.addEventListener('change', async (e) => {
            await this.handleVideoFileSelection(e, preview, singleVideo);
        });

        // Add drag and drop support
        this.setupDragAndDrop(input, preview);
    }

    async handleVideoFileSelection(event, previewContainer, singleVideo) {
        const inputEl = event.target;
        const fieldName = inputEl.name;
        const files = Array.from(inputEl.files);

        if (files.length === 0) return;

        // Validate files
        const validFiles = [];
        for (const file of files) {
            if (this.validateVideoFile(file)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            alert('No valid video files selected. Please choose MP4, WebM, OGG, MOV, or AVI files under 50MB.');
            return;
        }

        // Clear preview if single video mode
        if (singleVideo) {
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('hidden');
        }

        // Process each file
        for (const file of validFiles) {
            await this.createVideoPreview(file, previewContainer, singleVideo, fieldName);
        }

        // Auto-save after video upload
        if (typeof autoSave === 'function') {
            autoSave();
        }
    }

    validateVideoFile(file) {
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            alert(`Invalid file type: ${file.name}. Only MP4, WebM, OGG, MOV, and AVI files are allowed.`);
            return false;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            alert(`File too large: ${file.name}. Maximum size is 50MB.`);
            return false;
        }

        return true;
    }

    async createVideoPreview(file, container, singleVideo, fieldName) {
        const fileId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store video reference
        this.uploadedVideos.set(fileId, { file, fieldName });

        // Create video object for thumbnail generation
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.addEventListener('loadedmetadata', () => {
            canvas.width = 320;
            canvas.height = (video.videoHeight / video.videoWidth) * 320;

            // Seek to 1 second for thumbnail
            video.currentTime = Math.min(1, video.duration / 2);
        });

        video.addEventListener('seeked', () => {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Create preview element with thumbnail
            const previewElement = this.createPreviewElement(fileId, file, thumbnailUrl, singleVideo);

            if (singleVideo) {
                container.innerHTML = '';
                container.appendChild(previewElement);
                container.classList.remove('hidden');
            } else {
                container.appendChild(previewElement);
            }

            // Update video metadata
            const videoInfo = this.uploadedVideos.get(fileId);
            videoInfo.duration = video.duration;
            videoInfo.width = video.videoWidth;
            videoInfo.height = video.videoHeight;
        });

        // Set video source to start loading
        video.src = URL.createObjectURL(file);
    }

    createPreviewElement(fileId, file, thumbnailUrl, singleVideo) {
        const div = document.createElement('div');
        div.className = singleVideo ? 'relative group' : 'relative group';

        if (singleVideo) {
            div.innerHTML = `
                <div class="relative">
                    <div class="relative w-40 h-24 rounded-lg shadow-sm overflow-hidden">
                        <img src="${thumbnailUrl}" alt="Video preview" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                            <div class="w-12 h-12 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                                <i class="fas fa-play text-gray-800 ml-1"></i>
                            </div>
                        </div>
                        <div class="absolute top-1 right-1 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                            VIDEO
                        </div>
                    </div>
                    <div class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                         onclick="videoUploadHandler.removeVideoPreview('${fileId}', this)"
                         title="Remove video">
                        <i class="fas fa-times text-xs"></i>
                    </div>
                </div>
                <div class="mt-2">
                    <p class="text-xs text-gray-600 truncate" title="${file.name}">${file.name}</p>
                    <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="relative overflow-hidden rounded-lg shadow-sm bg-white border border-gray-200">
                    <div class="relative">
                        <img src="${thumbnailUrl}" alt="${file.name}" class="w-full h-32 object-cover">
                        <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div class="w-10 h-10 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                                <i class="fas fa-play text-gray-800 ml-1 text-sm"></i>
                            </div>
                        </div>
                        <div class="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                            VIDEO
                        </div>
                    </div>
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button type="button" onclick="videoUploadHandler.removeVideoPreview('${fileId}', this)"
                                class="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                    <div class="p-2">
                        <p class="text-xs text-gray-600 truncate" title="${file.name}">${file.name}</p>
                        <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
            `;
        }

        div.dataset.fileId = fileId;
        return div;
    }

    removeVideoPreview(fileId, button) {
        // Remove from uploaded videos
        this.uploadedVideos.delete(fileId);

        // Remove preview element
        const previewElement = button.closest(`[data-file-id="${fileId}"]`);
        if (previewElement) {
            previewElement.remove();
        }

        // Auto-save after removal
        if (typeof autoSave === 'function') {
            autoSave();
        }
    }

    setupDragAndDrop(input, preview) {
        const dropZone = input.closest('.bg-gray-100') || input.parentElement;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
        });

        dropZone.addEventListener('drop', async (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            // Create a fake input event
            const fakeEvent = {
                target: { files: files }
            };

            await this.handleVideoFileSelection(fakeEvent, preview, input.hasAttribute('data-single'));
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(dropZone) {
        dropZone.classList.add('border-purple-500', 'bg-purple-50');
    }

    unhighlight(dropZone) {
        dropZone.classList.remove('border-purple-500', 'bg-purple-50');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get uploaded videos for form submission
    getUploadedVideos() {
        return Array.from(this.uploadedVideos.values());
    }

    // Clear all uploaded videos
    clearUploads() {
        this.uploadedVideos.clear();
    }
}

// Global instance
const videoUploadHandler = new VideoUploadHandler();

// Setup function for video previews (called from form-handler.js)
function setupVideoUpload(inputId, previewId, singleVideo = false) {
    videoUploadHandler.setupVideoUpload(inputId, previewId, singleVideo);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    });