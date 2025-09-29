// Image upload and preview functionality
class ImageUploadHandler {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.uploadedFiles = new Map(); // Track uploaded files: fileId -> { file, fieldName }
    }

    setupImagePreview(inputId, previewId, singleImage = false) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        if (!input || !preview) {
            console.warn(`Image setup failed: input(${inputId}) or preview(${previewId}) not found`);
            return;
        }

        input.addEventListener('change', async (e) => {
            await this.handleFileSelection(e, preview, singleImage);
        });

        // Add drag and drop support
        this.setupDragAndDrop(input, preview);
    }

    async handleFileSelection(event, previewContainer, singleImage) {
        const inputEl = event.target;
        const fieldName = inputEl.name;
        const files = Array.from(inputEl.files);
        
        if (files.length === 0) return;

        // Validate files
        const validFiles = [];
        for (const file of files) {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            alert('No valid image files selected. Please choose JPEG, PNG, GIF, or WebP files under 5MB.');
            return;
        }

        // Clear preview if single image mode
        if (singleImage) {
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('hidden');
        }

        // Process each file
        for (const file of validFiles) {
            await this.createPreview(file, previewContainer, singleImage, fieldName);
        }

        // Auto-save after image upload
        if (typeof autoSave === 'function') {
            autoSave();
        }
    }

    validateFile(file) {
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            alert(`Invalid file type: ${file.name}. Only JPEG, PNG, GIF, and WebP files are allowed.`);
            return false;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            alert(`File too large: ${file.name}. Maximum size is 5MB.`);
            return false;
        }

        return true;
    }

    async createPreview(file, container, singleImage, fieldName) {
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store file reference
        this.uploadedFiles.set(fileId, { file, fieldName });

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewElement = this.createPreviewElement(fileId, file, e.target.result, singleImage);
            
            if (singleImage) {
                container.innerHTML = '';
                container.appendChild(previewElement);
                container.classList.remove('hidden');
            } else {
                container.appendChild(previewElement);
            }
        };
        
        reader.readAsDataURL(file);
    }

    createPreviewElement(fileId, file, dataUrl, singleImage) {
        const div = document.createElement('div');
        div.className = singleImage ? 'relative group' : 'relative group';
        
        if (singleImage) {
            div.innerHTML = `
                <div class="relative">
                    <img src="${dataUrl}" alt="Preview" class="h-20 w-auto rounded-lg shadow-sm">
                    <div class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer" 
                         onclick="imageUploadHandler.removeSingleImagePreview('${fileId}', this)" 
                         title="Remove image">
                        <i class="fas fa-times text-xs"></i>
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="relative overflow-hidden rounded-lg shadow-sm bg-white border border-gray-200">
                    <img src="${dataUrl}" alt="${file.name}" class="w-full h-32 object-cover">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button type="button" onclick="imageUploadHandler.removePreview('${fileId}', this)" 
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

    removePreview(fileId, button) {
        // Remove from uploaded files
        this.uploadedFiles.delete(fileId);
        
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

    removeSingleImagePreview(fileId, button) {
        // Remove from uploaded files
        this.uploadedFiles.delete(fileId);
        
        // Find the preview container and hide it
        const previewElement = button.closest(`[data-file-id="${fileId}"]`);
        let previewContainerEl = null;
        if (previewElement) {
            previewContainerEl = previewElement.closest('[id$="_preview"]');
            if (previewContainerEl) {
                previewContainerEl.classList.add('hidden');
                previewContainerEl.innerHTML = '';
            } else {
                // Fallback: remove just the preview element
                previewElement.remove();
            }
        }

        // Clear the file input - find it by looking for the input that corresponds to this preview
        if (previewContainerEl) {
            const previewId = previewContainerEl.id;
            const inputId = previewId.replace('_preview', '_input');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.value = '';
            }
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
            
            await this.handleFileSelection(fakeEvent, preview, input.hasAttribute('data-single'));
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(dropZone) {
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }

    unhighlight(dropZone) {
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get uploaded files for form submission
    getUploadedFiles() {
        return Array.from(this.uploadedFiles.values());
    }

    // Clear all uploaded files
    clearUploads() {
        this.uploadedFiles.clear();
    }
}

// Global instance
const imageUploadHandler = new ImageUploadHandler();

// Setup function for image previews (called from form-handler.js)
function setupImagePreview(inputId, previewId, singleImage = false) {
    imageUploadHandler.setupImagePreview(inputId, previewId, singleImage);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup main image uploads
    setupImagePreview('companyLogoInput', 'companyLogoPreview', true);
    setupImagePreview('heroImageInput', 'heroImagePreview', true);
    
    console.log('✅ Image upload handler initialized');
});