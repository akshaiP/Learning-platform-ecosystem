/**
 * LRS Sync Service
 *
 * Handles synchronization of quiz and task content to the LRS backend.
 * LRS API details: see LRS_API_DOCUMENTATION.md
 */

const axios = require('axios');

class LRSSyncService {
    constructor() {
        this.baseURL = process.env.LRS_API_BASE_URL || 'http://192.168.1.13:8001/api/lrs';
        this.syncTimeout = 10000; // 10 second timeout
        this.lastSyncStatus = new Map(); // Track sync status per subtopic
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Extract quiz and task content from topic data
     * @param {Object} topicData - The topic data from the form
     * @returns {Object} Extracted content with quizzes and tasks arrays
     */
    extractContentFromTopic(topicData) {
        try {
            const subtopicId = topicData.topicId;
            if (!subtopicId) {
                throw new Error('Topic ID is required for LRS sync');
            }

            // Check for alternative field names
            const quizFields = ['quizQuestions', 'quiz', 'quizzes', 'questions'];
            const taskFields = ['taskSteps', 'tasks', 'task_steps', 'steps'];

            
            const content = {
                subtopic_id: subtopicId,
                quizzes: [],
                tasks: []
            };

            // Extract quiz content - check multiple possible field names
            let quizData = null;
            if (topicData.quizQuestions && Array.isArray(topicData.quizQuestions)) {
                quizData = topicData.quizQuestions;
            } else if (topicData.quiz && Array.isArray(topicData.quiz.questions)) {
                quizData = topicData.quiz.questions;
            } else if (topicData.quizzes && Array.isArray(topicData.quizzes)) {
                quizData = topicData.quizzes;
            } else if (topicData.questions && Array.isArray(topicData.questions)) {
                quizData = topicData.questions;
            }

            if (quizData) {
                quizData.forEach((question, index) => {
                    // Use the actual quiz ID if available, otherwise generate one
                    const quizId = question.id || `${subtopicId}_q${index + 1}`;
                    content.quizzes.push({
                        content_id: quizId,
                        sequence_order: index + 1
                    });
                });
            }

            // Extract task content from task steps - check multiple possible field names
            let taskData = null;
            // Priority order: direct fields first, then nested content fields
            if (topicData.taskSteps && Array.isArray(topicData.taskSteps)) {
                taskData = topicData.taskSteps;
            } else if (topicData.tasks && Array.isArray(topicData.tasks)) {
                taskData = topicData.tasks;
            } else if (topicData.task_steps && Array.isArray(topicData.task_steps)) {
                taskData = topicData.task_steps;
            } else if (topicData.steps && Array.isArray(topicData.steps)) {
                taskData = topicData.steps;
            } else if (topicData.content && topicData.content.task_steps && Array.isArray(topicData.content.task_steps)) {
                taskData = topicData.content.task_steps;
            } else if (topicData.content && topicData.content.taskSteps && Array.isArray(topicData.content.taskSteps)) {
                taskData = topicData.content.taskSteps;
            }

            if (taskData) {
                taskData.forEach((step, index) => {
                    // Generate task ID based on template structure pattern
                    // Use _idx directly to match SCORM template indexing (0, 1, 2, etc.)
                    const taskId = step._idx !== undefined ? `${step._idx}` : `${index}`;

                    // Check for hints in multiple possible locations
                    let hasHint = false;
                    if (step.hint && step.hint.text && step.hint.text.trim()) {
                        hasHint = true;
                    } else if (step.hintText && step.hintText.trim()) {
                        hasHint = true;
                    } else if (step.hint && typeof step.hint === 'string' && step.hint.trim()) {
                        hasHint = true;
                    }

                    content.tasks.push({
                        content_id: taskId,
                        sequence_order: step.displayIndex || (index + 1),
                        has_hint: hasHint
                    });
                });
            }

            return content;
        } catch (error) {
            console.error('❌ Error extracting content from topic:', error);
            throw error;
        }
    }

    /**
     * Sync content inventory to LRS backend using bulk API
     * @param {Object} topicData - The topic data to sync
     * @param {Object} options - Sync options
     * @returns {Object} Sync result
     */
    async syncContentInventory(topicData, options = {}) {
        const subtopicId = topicData.topicId;
        const operationId = `${subtopicId}_${Date.now()}`;

        try {
            console.log(`🔄 Starting LRS sync for subtopic: ${subtopicId}`);

            // Update sync status
            this.updateSyncStatus(subtopicId, 'syncing', operationId);

            // Extract content from topic data
            const content = this.extractContentFromTopic(topicData);

            // Validate that we have content to sync
            if (content.quizzes.length === 0 && content.tasks.length === 0) {
                console.log(`⚠️  No quizzes or tasks found for subtopic ${subtopicId}, skipping LRS sync`);
                this.updateSyncStatus(subtopicId, 'skipped', operationId, 'No content to sync');
                return {
                    success: true,
                    message: 'No content to sync',
                    subtopicId,
                    operationId,
                    synced: false
                };
            }

            // Use bulk create/update endpoint
            const endpoint = `${this.baseURL}/content-inventory/bulk`;
            const payload = {
                subtopic_id: content.subtopic_id,
                quizzes: content.quizzes,
                tasks: content.tasks
            };

            
            // Make API call with retry logic
            const response = await this.makeAPICall('PUT', endpoint, payload);

            if (response.success) {
                console.log(`✅ LRS sync successful for subtopic: ${subtopicId}`, response.data);
                this.updateSyncStatus(subtopicId, 'success', operationId, response.data);
                return {
                    success: true,
                    message: 'Content synced to LRS successfully',
                    subtopicId,
                    operationId,
                    synced: true,
                    data: response.data
                };
            } else {
                throw new Error(response.message || 'LRS sync failed');
            }

        } catch (error) {
            console.error(`❌ LRS sync failed for subtopic ${subtopicId}:`, error);
            this.updateSyncStatus(subtopicId, 'error', operationId, error.message);

            return {
                success: false,
                message: `LRS sync failed: ${error.message}`,
                subtopicId,
                operationId,
                synced: false,
                error: error.message
            };
        }
    }

    /**
     * Make API call with retry logic
     * @param {string} method - HTTP method
     * @param {string} url - API URL
     * @param {Object} data - Request payload
     * @param {number} attempt - Current attempt number
     * @returns {Object} API response
     */
    async makeAPICall(method, url, data, attempt = 1) {
        try {
            const config = {
                method,
                url,
                timeout: this.syncTimeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
                config.data = data;
            }

            const response = await axios(config);

            // LRS API returns data in different format, check for success
            if (response.data && (response.data.success !== false)) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    message: response.data?.detail || 'API call failed'
                };
            }

        } catch (error) {
            if (attempt < this.retryAttempts && this.isRetryableError(error)) {
                console.log(`🔄 Retrying LRS API call (attempt ${attempt + 1}/${this.retryAttempts})`);
                await this.delay(this.retryDelay * attempt);
                return this.makeAPICall(method, url, data, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Check if error is retryable
     * @param {Error} error - The error to check
     * @returns {boolean} Whether error is retryable
     */
    isRetryableError(error) {
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return true;
        }
        if (error.response && error.response.status >= 500) {
            return true;
        }
        return false;
    }

    /**
     * Simple delay utility
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Update sync status for tracking
     * @param {string} subtopicId - Subtopic identifier
     * @param {string} status - Sync status
     * @param {string} operationId - Operation identifier
     * @param {string} message - Status message
     */
    updateSyncStatus(subtopicId, status, operationId, message = '') {
        this.lastSyncStatus.set(subtopicId, {
            status,
            operationId,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get latest sync status for a subtopic
     * @param {string} subtopicId - Subtopic identifier
     * @returns {Object} Sync status
     */
    getSyncStatus(subtopicId) {
        return this.lastSyncStatus.get(subtopicId) || {
            status: 'never',
            operationId: null,
            message: 'No sync attempts recorded',
            timestamp: null
        };
    }

    /**
     * Get sync status for all subtopics
     * @returns {Object} All sync statuses
     */
    getAllSyncStatuses() {
        return Object.fromEntries(this.lastSyncStatus);
    }

    /**
     * Test connection to LRS API
     * @returns {Object} Test result
     */
    async testConnection() {
        try {
            const endpoint = `${this.baseURL}/content-inventory?subtopic_id=test`;
            const response = await this.makeAPICall('GET', endpoint);

            return {
                success: true,
                message: 'LRS API connection successful',
                baseURL: this.baseURL
            };
        } catch (error) {
            console.error('❌ LRS API connection test failed:', error);
            return {
                success: false,
                message: `LRS API connection failed: ${error.message}`,
                baseURL: this.baseURL,
                error: error.message
            };
        }
    }

    /**
     * Get content inventory from LRS for a subtopic
     * @param {string} subtopicId - Subtopic identifier
     * @returns {Object} Content inventory
     */
    async getContentInventory(subtopicId) {
        try {
            const endpoint = `${this.baseURL}/content-inventory?subtopic_id=${subtopicId}`;
            const response = await this.makeAPICall('GET', endpoint);

            if (response.success) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    message: response.message || 'Failed to get content inventory'
                };
            }
        } catch (error) {
            console.error(`❌ Failed to get content inventory for ${subtopicId}:`, error);
            return {
                success: false,
                message: `Failed to get content inventory: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Manual re-sync for a subtopic
     * @param {Object} topicData - Topic data to re-sync
     * @returns {Object} Re-sync result
     */
    async resyncContent(topicData) {
        console.log(`🔄 Manual re-sync requested for subtopic: ${topicData.topicId}`);
        return this.syncContentInventory(topicData, { force: true });
    }

    /**
     * Delete all content inventory for a subtopic from LRS backend
     * @param {string} subtopicId - Subtopic identifier
     * @returns {Object} Delete result
     */
    async deleteContentInventory(subtopicId) {
        const operationId = `${subtopicId}_delete_${Date.now()}`;

        try {
            console.log(`🗑️  Starting bulk delete for subtopic: ${subtopicId}`);

            // Update sync status
            this.updateSyncStatus(subtopicId, 'deleting', operationId);

            // Use bulk delete endpoint
            const endpoint = `${this.baseURL}/content-inventory/bulk`;
            const payload = {
                subtopic_id: subtopicId,
                confirm_deletion: true
            };

            
            // Make DELETE API call with retry logic
            const response = await this.makeAPICall('DELETE', endpoint, payload);

            if (response.success) {
                console.log(`✅ LRS bulk delete successful for subtopic: ${subtopicId}`, response.data);
                this.updateSyncStatus(subtopicId, 'deleted', operationId, response.data);
                return {
                    success: true,
                    message: 'Content inventory deleted from LRS successfully',
                    subtopicId,
                    operationId,
                    deleted: true,
                    data: response.data
                };
            } else {
                throw new Error(response.message || 'LRS bulk delete failed');
            }

        } catch (error) {
            console.error(`❌ LRS bulk delete failed for subtopic ${subtopicId}:`, error);
            this.updateSyncStatus(subtopicId, 'delete_error', operationId, error.message);

            return {
                success: false,
                message: `LRS bulk delete failed: ${error.message}`,
                subtopicId,
                operationId,
                deleted: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const lrsSyncService = new LRSSyncService();

module.exports = lrsSyncService;