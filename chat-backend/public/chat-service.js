// Chat Service Abstraction Layer - Production Ready
// Handles both custom backend and direct Gemini API with fallback mechanism

class ChatService {
    constructor() {
        this.mode = window.templateConfig?.chatMode || 'custom_backend';
        this.customBackendUrl = 'https://nebula-chatbot-3qe8.onrender.com';
        this.directBackendUrl = window.templateConfig?.backendUrl || '';
        this.fallbackEnabled = window.templateConfig?.fallbackEnabled !== false;
        
        console.log(`🤖 ChatService initialized with mode: ${this.mode}`);
        console.log(`📡 Custom backend: ${this.customBackendUrl}`);
        console.log(`📡 Direct backend: ${this.directBackendUrl}`);
    }
    
    async sendMessage(message, context, learnerData) {
        console.log(`📤 Sending message via ${this.mode} mode:`, { message, context });
        
        try {
            if (this.mode === 'custom_backend') {
                return await this.sendToCustomBackend(message, context, learnerData);
            } else {
                return await this.sendToDirectGemini(message, context, learnerData);
            }
        } catch (error) {
            console.error(`❌ Chat service error (${this.mode}):`, error);
            
            // Fallback to direct Gemini if custom backend fails
            if (this.mode === 'custom_backend' && this.fallbackEnabled) {
                console.log('🔄 Falling back to direct Gemini due to error...');
                try {
                    return await this.sendToDirectGemini(message, context, learnerData);
                } catch (fallbackError) {
                    console.error('❌ Fallback also failed:', fallbackError);
                    throw fallbackError;
                }
            }
            throw error;
        }
    }
    
    async sendToCustomBackend(message, context, learnerData) {
        const payload = {
            user_message: message,
            system_prompt: this.getSystemPrompt(context),
            learner_id: learnerData.id || 'anonymous',
            course_id: this.getCourseId(),
            module_id: this.getModuleId(),
            subtopic_id: this.getSubtopicId(),
            use_rag: false
        };
        
        console.log('📤 Custom backend payload:', payload);
        
        const response = await fetch(`${this.customBackendUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Custom backend request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📥 Custom backend response:', data);
        
        return {
            reply: data.message,
            sessionId: data.session_id,
            status: data.status,
            sources: data.sources || []
        };
    }
    
    async sendToDirectGemini(message, context, learnerData) {
        console.log('📤 Using direct Gemini API');
        
        const payload = {
            message: message,
            topic: window.topicConfig?.topic || 'general',
            context: context,
            learnerData: learnerData,
            sessionId: this.getCurrentSessionId()
        };
        
        const response = await fetch(`${this.directBackendUrl}/chat-api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Direct Gemini request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📥 Direct Gemini response:', data);
        
        return {
            reply: data.reply,
            sessionId: data.sessionId,
            status: 'success'
        };
    }
    
    async loadHistory(learnerData) {
        if (this.mode !== 'custom_backend') {
            console.log('ℹ️ History loading only available in custom_backend mode');
            return null;
        }
        
        try {
            const params = new URLSearchParams({
                learner_id: learnerData.id || 'anonymous',
                course_id: this.getCourseId(),
                module_id: this.getModuleId(),
                subtopic_id: this.getSubtopicId()
            });
            
            console.log('📥 Loading conversation history with params:', params.toString());
            
            const response = await fetch(`${this.customBackendUrl}/api/chat/history?${params}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ No existing conversation found');
                    return null;
                }
                throw new Error(`History request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📥 History response:', data);
            
            return {
                sessionId: data.session_id,
                messages: data.messages || [],
                totalMessages: data.total_messages || 0
            };
            
        } catch (error) {
            console.error('❌ Failed to load history:', error);
            return null;
        }
    }
    
    // Helper methods for extracting IDs from template data
    getCourseId() {
        try {
            // Parse from templateData.id (format: Robotics-M1-T1)
            const templateId = window.templateData?.id || '';
            const parts = templateId.split('-');
            const courseId = parts[0] || 'unknown-course';
            console.log(`📚 Extracted courseId: ${courseId} from ${templateId}`);
            return courseId;
        } catch (error) {
            console.error('❌ Error extracting courseId:', error);
            return 'unknown-course';
        }
    }
    
    getModuleId() {
        try {
            // Parse from templateData.id (format: Robotics-M1-T1)
            const templateId = window.templateData?.id || '';
            const parts = templateId.split('-');
            const moduleId = parts[1] || 'unknown-module';
            console.log(`📚 Extracted moduleId: ${moduleId} from ${templateId}`);
            return moduleId;
        } catch (error) {
            console.error('❌ Error extracting moduleId:', error);
            return 'unknown-module';
        }
    }
    
    getSubtopicId() {
        try {
            // Use templateData.title as subtopicId
            const subtopicId = window.templateData?.title || 'unknown-subtopic';
            console.log(`📚 Using subtopicId: ${subtopicId}`);
            return subtopicId;
        } catch (error) {
            console.error('❌ Error extracting subtopicId:', error);
            return 'unknown-subtopic';
        }
    }
    
    getSystemPrompt(context) {
        // Handle learn_more context with custom prompt from concepts
        if (context === 'learn_more') {
            return this.getLearnMorePrompt();
        }
        
        const prompts = {
            'help': 'You are a helpful educational assistant providing guidance on tasks.',
            'quiz_failed': 'You are an educational assistant. Explain quiz mistakes clearly and concisely. Focus on the key concept and provide quick, actionable guidance.',
            'quiz_explanation': 'You are an educational tutor providing detailed explanations of quiz answers.',
            'hints_exhausted': 'You are a helpful educational assistant providing additional guidance when all hints have been used.',
            'summary': 'You are an educational tutor providing comprehensive summaries of learning topics.',
            'practice': 'You are an educational assistant creating practice exercises and activities.',
            'general': 'You are a helpful educational assistant focused on the current learning topic.'
        };
        
        const prompt = prompts[context] || prompts['general'];
        console.log(`🎯 System prompt for context '${context}': ${prompt}`);
        return prompt;
    }
    
    getLearnMorePrompt() {
        try {
            // Try to get the current context from the chat widget
            let learnMoreContext = '';
            
            // Check if chat widget has context data
            if (window.chatWidget && window.chatWidget.contextData) {
                learnMoreContext = window.chatWidget.contextData.learnMoreContext || 
                                 window.chatWidget.contextData.additionalContextText || '';
            }
            
            // If no context from widget, try to get from templateData concepts
            if (!learnMoreContext) {
                const concepts = window.templateData?.content?.concepts || [];
                const currentConcept = this.getCurrentConcept();
                
                if (currentConcept && currentConcept.learn_more_context) {
                    learnMoreContext = currentConcept.learn_more_context;
                }
            }
            
            if (learnMoreContext) {
                const customPrompt = `You are an educational tutor specializing in this topic. ${learnMoreContext} Provide clear, detailed explanations that help students deepen their understanding of this concept.`;
                console.log(`🎯 Custom learn_more prompt:`, customPrompt);
                return customPrompt;
            }
            
            // Fallback to general learn_more prompt
            const fallbackPrompt = 'You are an educational tutor explaining concepts in detail. Provide comprehensive explanations that help students understand the topic thoroughly.';
            console.log(`🎯 Using fallback learn_more prompt:`, fallbackPrompt);
            return fallbackPrompt;
            
        } catch (error) {
            console.error('❌ Error generating learn_more prompt:', error);
            return 'You are an educational tutor explaining concepts in detail.';
        }
    }
    
    getCurrentConcept() {
        try {
            // Try to get current concept from chat widget context first
            if (window.chatWidget && window.chatWidget.contextData && window.chatWidget.contextData.conceptTitle) {
                const concepts = window.templateData?.content?.concepts || [];
                return concepts.find(c => c.title === window.chatWidget.contextData.conceptTitle) || concepts[0] || null;
            }
            
            // Fallback to first concept
            const concepts = window.templateData?.content?.concepts || [];
            return concepts.length > 0 ? concepts[0] : null;
        } catch (error) {
            console.error('❌ Error getting current concept:', error);
            return null;
        }
    }
    
    getCurrentSessionId() {
        return localStorage.getItem('chat_session_id') || null;
    }
    
    setSessionId(sessionId) {
        if (sessionId) {
            localStorage.setItem('chat_session_id', sessionId);
            console.log(`💾 Session ID stored: ${sessionId}`);
        }
    }
    
    // Mode switching for development/testing
    switchMode(newMode) {
        if (newMode !== 'custom_backend' && newMode !== 'direct_gemini') {
            console.error('❌ Invalid mode. Use "custom_backend" or "direct_gemini"');
            return false;
        }
        
        const oldMode = this.mode;
        this.mode = newMode;
        console.log(`🔄 Chat mode switched from ${oldMode} to ${newMode}`);
        return true;
    }
    
    // Get current configuration info
    getConfigInfo() {
        return {
            mode: this.mode,
            customBackendUrl: this.customBackendUrl,
            directBackendUrl: this.directBackendUrl,
            fallbackEnabled: this.fallbackEnabled,
            courseId: this.getCourseId(),
            moduleId: this.getModuleId(),
            subtopicId: this.getSubtopicId()
        };
    }
}

// Create global instance
window.chatService = new ChatService();

// Development helper functions
function toggleChatMode() {
    const currentMode = window.chatService.mode;
    const newMode = currentMode === 'custom_backend' ? 'direct_gemini' : 'custom_backend';
    
    if (window.chatService.switchMode(newMode)) {
        // Reinitialize chat widget if it exists
        if (window.chatWidget && window.chatWidget.isInitialized) {
            console.log('🔄 Reinitializing chat widget with new mode...');
            window.chatWidget.clearChat();
            window.chatWidget.loadConversationHistory();
        }
        
        console.log(`✅ Chat mode switched to: ${newMode}`);
        return true;
    }
    return false;
}

function showCurrentChatMode() {
    const config = window.chatService.getConfigInfo();
    console.group('🤖 Current Chat Configuration');
    console.log('Mode:', config.mode);
    console.log('Custom Backend:', config.customBackendUrl);
    console.log('Direct Backend:', config.directBackendUrl);
    console.log('Fallback Enabled:', config.fallbackEnabled);
    console.log('Course ID:', config.courseId);
    console.log('Module ID:', config.moduleId);
    console.log('Subtopic ID:', config.subtopicId);
    console.groupEnd();
}

// Make development helpers available globally
window.toggleChatMode = toggleChatMode;
window.showCurrentChatMode = showCurrentChatMode;

console.log('✅ ChatService loaded successfully');
console.log('💡 Development helpers: toggleChatMode(), showCurrentChatMode()');