class SplitScreenManager {
    constructor() {
        this.isActive = false;
        this.isExpanded = false;
        this.currentTaskPage = null;
        this.container = null;
        this.leftPanel = null;
        this.iframe = null;
        this.loadingIndicator = null;

        this.init();
    }

    init() {
        // Cache DOM elements
        this.container = document.getElementById('splitScreenContainer');
        this.leftPanel = document.getElementById('splitLeftPanel');
        this.iframe = document.getElementById('taskIframe');
        this.loadingIndicator = document.getElementById('iframeLoading');

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Hide iframe initially
        this.iframe.style.display = 'none';
    }

    openSplitScreen(taskPage, stepContent) {
        if (!taskPage || !taskPage.url) {
            console.warn('Invalid task page configuration');
            return;
        }

        this.currentTaskPage = taskPage;

        // Copy current step content to left panel
        this.copyStepContent(stepContent);

        // Show loading indicator
        this.showLoading();

        // Set iframe source
        this.iframe.src = taskPage.url;

        // Show split screen container
        this.container.classList.add('active');
        document.body.classList.add('split-screen-active');

        // Set default split size to 50/50
        this.setExpanded(false);

        this.isActive = true;

        // Initialize button text
        this.updateResizeButton();

        // Handle iframe load
        this.iframe.onload = () => {
            this.hideLoading();
            this.iframe.style.display = 'block';
        };

        // Handle iframe error
        this.iframe.onerror = () => {
            this.hideLoading();
            this.showErrorWithFallback(taskPage.url);
        };

        // Set a timeout to detect if the iframe is blocked
        setTimeout(() => {
            if (this.isActive && this.loadingIndicator.style.display !== 'none') {
                this.hideLoading();
                this.showErrorWithFallback(taskPage.url);
            }
        }, 5000); // 5 second timeout
    }

    closeSplitScreen() {
        this.container.classList.remove('active', 'expanded');
        document.body.classList.remove('split-screen-active');

        // Clear iframe
        this.iframe.src = 'about:blank';
        this.iframe.style.display = 'none';

        // Clear left panel
        this.leftPanel.innerHTML = '';

        this.isActive = false;
        this.isExpanded = false;
        this.currentTaskPage = null;
    }

    toggleSplitSize() {
        if (!this.isActive) return;

        this.setExpanded(!this.isExpanded);
    }

    setExpanded(expanded) {
        this.isExpanded = expanded;

        if (expanded) {
            this.container.classList.add('expanded');
        } else {
            this.container.classList.remove('expanded');
        }

        this.updateResizeButton();
    }

  updateResizeButton() {
        const resizeBtnText = document.getElementById('resizeBtnText');
        if (resizeBtnText) {
            resizeBtnText.textContent = this.isExpanded ? 'Collapse' : 'Expand';
        } else {
            console.warn('Resize button text element not found');
        }
    }

    copyStepContent(stepContent) {
        if (!stepContent) {
            this.leftPanel.innerHTML = '<div class="p-8 text-center text-gray-500">No step content available</div>';
            return;
        }

        // Clone the step content
        const clonedContent = stepContent.cloneNode(true);

        // Add custom styling for left panel
        clonedContent.style.maxWidth = '100%';
        clonedContent.style.overflow = 'auto';

        // Clear and populate left panel
        this.leftPanel.innerHTML = '';
        this.leftPanel.appendChild(clonedContent);
    }

    openInNewTab() {
        if (this.currentTaskPage && this.currentTaskPage.url) {
            window.open(this.currentTaskPage.url, '_blank');
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;

            // ESC to close
            if (e.key === 'Escape') {
                this.closeSplitScreen();
            }

            // Ctrl/Cmd + Enter to toggle size
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.toggleSplitSize();
            }
        });
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.loadingIndicator.style.display = 'block';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'absolute inset-4 bg-red-50 border border-red-200 rounded-lg p-6 text-center';
        errorDiv.innerHTML = `
            <div class="text-red-600 mb-2">
                <i class="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <div class="text-red-800 font-medium">${message}</div>
            <button onclick="splitScreenManager.closeSplitScreen()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Close Workspace
            </button>
        `;

        this.iframe.style.display = 'none';
        this.iframe.parentNode.appendChild(errorDiv);
    }

    showErrorWithFallback(url) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'absolute inset-4 bg-amber-50 border border-amber-200 rounded-lg p-6 text-center';
        errorDiv.innerHTML = `
            <div class="text-amber-600 mb-4">
                <i class="fas fa-exclamation-triangle text-3xl"></i>
            </div>
            <div class="text-amber-800 font-medium mb-4">
                This page cannot be displayed in the workspace due to security restrictions.
            </div>
            <div class="text-sm text-amber-700 mb-6">
                Some external websites (like Streamlit apps) don't allow embedding in iframes.
            </div>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <button onclick="window.open('${url}', '_blank')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                    <i class="fas fa-external-link-alt"></i>
                    Open in New Tab
                </button>
                <button onclick="splitScreenManager.closeSplitScreen()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Close Workspace
                </button>
            </div>
        `;

        this.iframe.style.display = 'none';
        this.iframe.parentNode.appendChild(errorDiv);
    }

    isSplitScreenActive() {
        return this.isActive;
    }

    getCurrentTaskPage() {
        return this.currentTaskPage;
    }
}

// Global instance
let splitScreenManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    splitScreenManager = new SplitScreenManager();
});

// Global functions for inline handlers
function openSplitScreen(taskPage, stepIndex) {
    if (!splitScreenManager || !window.templateData || !window.templateData.taskSteps) {
        console.warn('Split screen manager or template data not available');
        return;
    }

    const stepElement = document.querySelector(`[data-step="${stepIndex}"]`);
    if (!stepElement) {
        console.warn('Step element not found:', stepIndex);
        return;
    }

    splitScreenManager.openSplitScreen(taskPage, stepElement);
}

function closeSplitScreen() {
    if (splitScreenManager) {
        splitScreenManager.closeSplitScreen();
    }
}

function toggleSplitSize() {
    if (splitScreenManager && splitScreenManager.isSplitScreenActive()) {
        splitScreenManager.toggleSplitSize();
    } else {
        console.warn('Split screen is not active');
    }
}

function openInNewTab() {
    if (splitScreenManager && splitScreenManager.isSplitScreenActive()) {
        splitScreenManager.openInNewTab();
    } else {
        console.warn('Split screen is not active');
    }
}

function toggleControlPanel() {
    const panel = document.getElementById('splitControlPanel');
    const toggle = document.getElementById('splitControlToggle');
    
    if (panel && toggle) {
        const isActive = panel.classList.contains('active');
        
        if (isActive) {
            panel.classList.remove('active');
            toggle.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        } else {
            panel.classList.add('active');
            toggle.classList.add('active');
            toggle.innerHTML = '<i class="fas fa-times"></i>';
        }
    }
}

// Auto-close control panel when clicking outside
document.addEventListener('click', (e) => {
    const controls = document.querySelector('.split-controls');
    if (controls && !controls.contains(e.target)) {
        const panel = document.getElementById('splitControlPanel');
        const toggle = document.getElementById('splitControlToggle');
        
        if (panel && panel.classList.contains('active')) {
            panel.classList.remove('active');
            toggle.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        }
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SplitScreenManager;
}