# Chat System and Backend Integration

## Overview
The SCORM Builder includes an integrated chat system that connects to a custom backend, providing learners with AI-powered tutoring and contextual assistance. The chat system persists conversation history and offers multiple interaction modes tailored to different learning scenarios.

## Chat System Architecture

### 1. Chat Integration Layer
**File**: `templates/chat-integration.js`

Manages the loading and initialization of chat widgets from the custom backend.

#### Backend Chat Widget Loading
```javascript
(function() {
    let chatWidgetLoaded = false;
    let loadAttempts = 0;
    const maxAttempts = 3;

    function loadChatWidget() {
        // Enhanced chat widget is loaded via script tags from backend
        if (window.chatWidget) {
            chatWidgetLoaded = true;
            console.log('✅ Enhanced chat widget available');

            // Hide any backend trigger buttons and use template button
            setTimeout(() => {
                hideBackendTriggerButton();
                setupTemplateButton();
            }, 500);
        } else {
            console.warn('❌ Enhanced chat widget not found');
            loadAttempts++;

            if (loadAttempts < maxAttempts) {
                setTimeout(loadChatWidget, 1000);
            } else {
                console.warn('🔄 Using fallback chat widget');
                loadFallbackChatWidget();
            }
        }
    }

    function hideBackendTriggerButton() {
        // Hide the backend's auto-generated trigger button
        const backendTriggers = document.querySelectorAll('.chat-trigger');
        backendTriggers.forEach(trigger => {
            trigger.style.display = 'none';
        });

        // Also check for any buttons with the chat emoji
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(button => {
            if (button.innerHTML === '💬' && button !== document.getElementById('templateChatTrigger')) {
                button.style.display = 'none';
            }
        });
    }

    function setupTemplateButton() {
        // Ensure template button works with backend widget
        const templateButton = document.getElementById('templateChatTrigger') ||
                              document.querySelector('button[onclick*="openGeneralChat"]');

        if (templateButton && window.chatWidget) {
            templateButton.onclick = function() {
                if (window.chatWidget.showChat) {
                    window.chatWidget.showChat();
                } else {
                    // Fallback to initChatWidget
                    openGeneralChat();
                }
            };
            console.log('✅ Template button connected to backend widget');
        }
    }
})();
```

#### Fallback Chat Widget
```javascript
function loadFallbackChatWidget() {
    window.chatWidget = {
        initChatWidget: function(config) {
            const message = config.initialMessage || 'Chat would open here';
            const isOnline = navigator.onLine;

            const fallbackMsg = `🤖 Chat Widget (${isOnline ? 'Backend Offline' : 'No Internet'})

Topic: ${config.topic}
Context: ${config.context}
Message: ${message}

${isOnline ? '⚠️ Backend server not responding' : '📡 No internet connection'}`;

            alert(fallbackMsg);
        },
        showChat: function() {
            this.initChatWidget({
                topic: window.topicConfig?.topic || 'general',
                context: 'general',
                initialMessage: 'Hello! I have questions about this topic.'
            });
        }
    };
    chatWidgetLoaded = true;
}
```

### 2. Chat System Controller
**File**: `templates/chat-system.js`

High-level controller that manages chat interactions with context awareness.

#### Chat System Class
```javascript
class ChatSystem {
    constructor() {
        this.chatHistory = [];
        this.currentContext = 'general';
        this.topicConfig = null;
        this.learnerData = null;
        this.templateData = null;
        this.isInitialized = false;
    }

    initialize(templateData, topicConfig, learnerData) {
        try {
            this.templateData = templateData;
            this.topicConfig = topicConfig;
            this.learnerData = learnerData;

            // Initialize chat widget with learner context
            this.initializeChatWidget();

            // Set up event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('✅ Chat system initialized with context:', {
                topic: topicConfig.topic,
                learner: learnerData.name,
                contexts: Object.keys(topicConfig.contexts || {})
            });
        } catch (error) {
            console.error('❌ Failed to initialize chat system:', error);
        }
    }

    initializeChatWidget() {
        if (window.chatWidget && window.chatWidget.initChatWidget) {
            const config = {
                topic: this.topicConfig.topic,
                context: this.currentContext,
                learnerId: this.learnerData.id,
                learnerName: this.learnerData.name,
                backendUrl: this.topicConfig.backendUrl,
                contexts: this.topicConfig.contexts || {},
                initialMessage: this.getWelcomeMessage()
            };

            window.chatWidget.initChatWidget(config);
        }
    }

    setupEventListeners() {
        // Listen for chat events from backend widget
        window.addEventListener('chatMessage', (event) => {
            this.handleChatMessage(event.detail);
        });

        window.addEventListener('chatOpened', () => {
            this.handleChatOpened();
        });

        window.addEventListener('chatClosed', () => {
            this.handleChatClosed();
        });
    }
}
```

#### Context Management
```javascript
// Context switching based on user actions
switchContext(contextKey, additionalData = {}) {
    if (!this.topicConfig.contexts || !this.topicConfig.contexts[contextKey]) {
        console.warn(`Context not found: ${contextKey}`);
        return;
    }

    this.currentContext = contextKey;

    // Update chat widget context
    if (window.chatWidget && window.chatWidget.updateContext) {
        window.chatWidget.updateContext({
            context: contextKey,
            contextData: this.topicConfig.contexts[contextKey],
            ...additionalData
        });
    }

    console.log(`🔄 Chat context switched to: ${contextKey}`);
}

// Specialized context handlers
handleTaskHelp(stepIndex, stepData) {
    this.switchContext('task_help', {
        stepIndex: stepIndex,
        stepTitle: stepData.title,
        stepInstructions: stepData.instructions,
        stepCode: stepData.code
    });
}

handleConceptLearning(conceptTitle, conceptData) {
    this.switchContext(conceptData.learn_more_context, {
        conceptTitle: conceptTitle,
        conceptSummary: conceptData.summary,
        conceptImage: conceptData.image
    });
}

handleQuizFailure(questionData, userAnswer) {
    this.switchContext('quiz_failed', {
        question: questionData.question,
        userAnswer: userAnswer,
        correctAnswer: questionData.correct_answer,
        explanation: questionData.explanation
    });
}

handleHintsExhausted(allHintsUsed) {
    this.switchContext('hints_exhausted', {
        hintsUsed: allHintsUsed,
        currentStep: this.getCurrentStep(),
        topicProgress: this.getTopicProgress()
    });
}
```

### 3. Backend Chat Service Integration
**URL**: `{backend_url}/chat-service.js`

Loaded from the custom backend, provides the chat API interface.

#### Chat Service Interface
```javascript
// Expected interface from backend chat service
class ChatService {
    constructor(config) {
        this.backendUrl = config.backendUrl;
        this.learnerId = config.learnerId;
        this.learnerName = config.learnerName;
        this.topic = config.topic;
        this.contexts = config.contexts || {};
    }

    // Initialize chat session
    async initializeSession() {
        try {
            const response = await fetch(`${this.backendUrl}/api/chat/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    learnerId: this.learnerId,
                    learnerName: this.learnerName,
                    topic: this.topic
                })
            });

            if (response.ok) {
                const sessionData = await response.json();
                this.sessionId = sessionData.sessionId;
                return sessionData;
            } else {
                throw new Error('Failed to initialize chat session');
            }
        } catch (error) {
            console.error('Chat session initialization failed:', error);
            throw error;
        }
    }

    // Send message to backend
    async sendMessage(message, context = 'general', contextData = {}) {
        try {
            const response = await fetch(`${this.backendUrl}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    message: message,
                    context: context,
                    contextData: contextData,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const aiResponse = await response.json();
                return aiResponse;
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Message send failed:', error);
            throw error;
        }
    }

    // Load chat history
    async loadHistory() {
        try {
            const response = await fetch(`${this.backendUrl}/api/chat/history/${this.sessionId}`);

            if (response.ok) {
                const history = await response.json();
                return history.messages || [];
            } else {
                throw new Error('Failed to load chat history');
            }
        } catch (error) {
            console.error('History load failed:', error);
            return [];
        }
    }

    // Update context
    updateContext(newContext) {
        this.currentContext = newContext.context;
        this.contextData = newContext.contextData || {};

        // Notify backend of context change
        if (this.sessionId) {
            this.notifyContextChange();
        }
    }

    async notifyContextChange() {
        try {
            await fetch(`${this.backendUrl}/api/chat/context`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    context: this.currentContext,
                    contextData: this.contextData
                })
            });
        } catch (error) {
            console.error('Context update failed:', error);
        }
    }
}
```

### 4. Enhanced Chat Widget
**URL**: `{backend_url}/enhanced-chat-widget.js`

Provides the UI components and interaction handling for the chat interface.

#### Chat Widget UI Components
```javascript
class EnhancedChatWidget {
    constructor() {
        this.isVisible = false;
        this.messages = [];
        this.isTyping = false;
        this.chatService = null;
    }

    initChatWidget(config) {
        // Create chat UI
        this.createChatInterface();

        // Initialize chat service
        this.chatService = new ChatService(config);

        // Load chat history
        this.loadChatHistory();

        // Set up event listeners
        this.setupUIEventListeners();

        // Show welcome message
        this.showWelcomeMessage(config);
    }

    createChatInterface() {
        // Chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'enhanced-chat-widget';
        chatContainer.className = 'enhanced-chat-widget';
        chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <i class="fas fa-robot"></i>
                    <span>AI Learning Assistant</span>
                </div>
                <button class="chat-minimize-btn" onclick="chatWidget.toggleChat()">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
            <div class="chat-messages" id="chat-messages">
                <!-- Messages will be loaded here -->
            </div>
            <div class="chat-input-container">
                <div class="chat-context-indicator" id="chat-context">
                    <span>General Chat</span>
                </div>
                <div class="chat-input-wrapper">
                    <textarea
                        id="chat-input"
                        placeholder="Ask me anything about this topic..."
                        rows="1"
                        maxlength="1000">
                    </textarea>
                    <button id="chat-send-btn" onclick="chatWidget.sendMessage()">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="chat-suggestions" id="chat-suggestions">
                    <!-- Contextual suggestions will appear here -->
                </div>
            </div>
        `;

        document.body.appendChild(chatContainer);
    }

    showChat() {
        const chatWidget = document.getElementById('enhanced-chat-widget');
        if (chatWidget) {
            chatWidget.style.display = 'flex';
            this.isVisible = true;

            // Focus on input
            setTimeout(() => {
                document.getElementById('chat-input').focus();
            }, 300);

            // Emit chat opened event
            window.dispatchEvent(new CustomEvent('chatOpened'));
        }
    }

    hideChat() {
        const chatWidget = document.getElementById('enhanced-chat-widget');
        if (chatWidget) {
            chatWidget.style.display = 'none';
            this.isVisible = false;

            // Emit chat closed event
            window.dispatchEvent(new CustomEvent('chatClosed'));
        }
    }

    toggleChat() {
        if (this.isVisible) {
            this.hideChat();
        } else {
            this.showChat();
        }
    }
}
```

#### Message Handling
```javascript
async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || this.isTyping) return;

    // Add user message to UI
    this.addMessage('user', message);

    // Clear input
    input.value = '';
    this.adjustTextareaHeight(input);

    // Show typing indicator
    this.showTypingIndicator();
    this.isTyping = true;

    try {
        // Send message to backend
        const response = await this.chatService.sendMessage(
            message,
            this.chatService.currentContext,
            this.chatService.contextData
        );

        // Hide typing indicator
        this.hideTypingIndicator();
        this.isTyping = false;

        // Add AI response to UI
        this.addMessage('assistant', response.message, {
            suggestions: response.suggestions,
            context: response.context
        });

        // Update suggestions if provided
        this.updateSuggestions(response.suggestions);

        // Store message in history
        this.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        this.messages.push({
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
            context: response.context
        });

    } catch (error) {
        this.hideTypingIndicator();
        this.isTyping = false;

        this.addMessage('system', 'Sorry, I encountered an error. Please try again.', {
            error: true
        });
    }
}

addMessage(role, content, metadata = {}) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${role}-message`;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let messageHTML = `
        <div class="message-content">
            ${this.formatMessage(content)}
        </div>
        <div class="message-timestamp">${timestamp}</div>
    `;

    if (role === 'assistant' && metadata.suggestions) {
        messageHTML += `
            <div class="message-suggestions">
                ${metadata.suggestions.map(suggestion => `
                    <button class="suggestion-btn" onclick="chatWidget.useSuggestion('${suggestion}')">
                        ${suggestion}
                    </button>
                `).join('')}
            </div>
        `;
    }

    messageElement.innerHTML = messageHTML;
    messagesContainer.appendChild(messageElement);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

formatMessage(content) {
    // Basic markdown-like formatting
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}
```

### 5. Contextual Chat Integration

#### Topic-Specific Chat Triggers
```javascript
// Chat triggers for different learning contexts
function openGeneralChat() {
    if (window.chatSystem) {
        window.chatSystem.switchContext('general');
        if (window.chatWidget) {
            window.chatWidget.showChat();
        }
    }
}

function openLearnMore(contextKey, conceptTitle) {
    if (window.chatSystem) {
        const conceptData = window.templateData.concepts.find(c => c.learn_more_context === contextKey);
        if (conceptData) {
            window.chatSystem.handleConceptLearning(conceptTitle, conceptData);
            if (window.chatWidget) {
                window.chatWidget.showChat();
            }
        }
    }
}

function openQuizFailureChat(questionData, userAnswer) {
    if (window.chatSystem) {
        window.chatSystem.handleQuizFailure(questionData, userAnswer);
        if (window.chatWidget) {
            window.chatWidget.showChat();
        }
    }
}

function openHintsExhaustedChat() {
    if (window.chatSystem) {
        const allHintsUsed = window.taskSystem ? window.taskSystem.revealedHints : [];
        window.chatSystem.handleHintsExhausted(allHintsUsed);
        if (window.chatWidget) {
            window.chatWidget.showChat();
        }
    }
}
```

#### Context-Specific Suggestions
```javascript
getContextualSuggestions(context) {
    const suggestions = {
        'general': [
            'Can you give me an overview of this topic?',
            'What are the key learning objectives?',
            'How should I approach this topic?'
        ],
        'task_help': [
            'Can you explain this step in more detail?',
            'What should I focus on in this step?',
            'Can you show me an example?'
        ],
        'quiz_failed': [
            'Can you explain why my answer was wrong?',
            'Can you help me understand this concept better?',
            'What should I study to improve?'
        ],
        'hints_exhausted': [
            'I need more help with this task',
            'Can you break this down into simpler steps?',
            'What alternative approaches can I try?'
        ]
    };

    return suggestions[context] || suggestions['general'];
}
```

### 6. Chat Persistence and History

#### History Management
```javascript
class ChatHistoryManager {
    constructor(learnerId, topicId) {
        this.learnerId = learnerId;
        this.topicId = topicId;
        this.storageKey = `chat_history_${learnerId}_${topicId}`;
    }

    saveHistory(messages) {
        try {
            const historyData = {
                learnerId: this.learnerId,
                topicId: this.topicId,
                messages: messages,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };

            // Save to localStorage as fallback
            localStorage.setItem(this.storageKey, JSON.stringify(historyData));

            // Also save to backend if available
            this.saveToBackend(historyData);
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    }

    loadHistory() {
        try {
            // Try loading from localStorage first
            const localHistory = localStorage.getItem(this.storageKey);
            if (localHistory) {
                const historyData = JSON.parse(localHistory);
                return historyData.messages || [];
            }

            // Try loading from backend
            return this.loadFromBackend();
        } catch (error) {
            console.error('Failed to load chat history:', error);
            return [];
        }
    }

    async saveToBackend(historyData) {
        try {
            const response = await fetch(`${window.topicConfig.backendUrl}/api/chat/history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(historyData)
            });

            if (!response.ok) {
                throw new Error('Failed to save history to backend');
            }
        } catch (error) {
            console.warn('Backend history save failed, using local storage:', error);
        }
    }

    async loadFromBackend() {
        try {
            const response = await fetch(
                `${window.topicConfig.backendUrl}/api/chat/history/${this.learnerId}/${this.topicId}`
            );

            if (response.ok) {
                const historyData = await response.json();
                return historyData.messages || [];
            }
        } catch (error) {
            console.warn('Backend history load failed:', error);
        }

        return [];
    }

    clearHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            this.clearFromBackend();
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    }

    async clearFromBackend() {
        try {
            await fetch(`${window.topicConfig.backendUrl}/api/chat/history/${this.learnerId}/${this.topicId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.warn('Backend history clear failed:', error);
        }
    }
}
```

### 7. Backend API Integration

#### Expected Backend Endpoints
```javascript
// Chat API endpoints that the custom backend should provide

// POST /api/chat/session
// Initialize a new chat session
{
    "learnerId": "user123",
    "learnerName": "John Doe",
    "topic": "Robotics Fundamentals"
}

// Response:
{
    "sessionId": "session_456",
    "createdAt": "2024-01-15T10:30:00Z",
    "welcomeMessage": "Hello! I'm here to help you learn about Robotics Fundamentals..."
}

// POST /api/chat/message
// Send a message and get AI response
{
    "sessionId": "session_456",
    "message": "Can you explain ROS in simple terms?",
    "context": "general",
    "contextData": {},
    "timestamp": "2024-01-15T10:31:00Z"
}

// Response:
{
    "message": "ROS (Robot Operating System) is like a nervous system for robots...",
    "suggestions": [
        "What are the main components of ROS?",
        "How does ROS handle robot communication?",
        "Can you give me a simple ROS example?"
    ],
    "context": "ros_concepts",
    "timestamp": "2024-01-15T10:31:05Z"
}

// PUT /api/chat/context
// Update chat context
{
    "sessionId": "session_456",
    "context": "quiz_failed",
    "contextData": {
        "question": "What is ROS?",
        "userAnswer": "Robot Operating System",
        "correctAnswer": 0,
        "explanation": "ROS is indeed Robot Operating System..."
    }
}

// GET /api/chat/history/{sessionId}
// Load chat history
// Response:
{
    "sessionId": "session_456",
    "messages": [
        {
            "role": "user",
            "content": "Hello",
            "timestamp": "2024-01-15T10:30:30Z"
        },
        {
            "role": "assistant",
            "content": "Hello! How can I help you learn today?",
            "timestamp": "2024-01-15T10:30:31Z"
        }
    ],
    "totalMessages": 2
}

// POST /api/chat/history
// Save chat history
{
    "learnerId": "user123",
    "topicId": "robotics-fundamentals",
    "messages": [...],
    "lastUpdated": "2024-01-15T10:35:00Z"
}

// DELETE /api/chat/history/{learnerId}/{topicId}
// Clear chat history
```

### 8. Voice Assistant Integration

#### Voice Chat Features
```javascript
// Voice assistant integration (template code already exists)
function toggleVoiceWidget() {
    try {
        var panel = document.getElementById('voiceWidgetPanel');
        if (!panel) {
            console.warn('Voice widget panel not found');
            return;
        }
        var iframe = document.getElementById('voiceWidgetIframe');
        if (panel.classList.contains('hidden')) {
            // Create fresh iframe for voice widget
            console.log('Creating new iframe for voice widget');

            if (iframe) {
                try { iframe.remove(); } catch (e) {}
            }

            var fresh = document.createElement('iframe');
            fresh.id = 'voiceWidgetIframe';
            fresh.title = 'Voice Assistant';
            fresh.allow = 'microphone';
            fresh.className = 'flex-1 w-full border-0';
            panel.appendChild(fresh);
            iframe = fresh;

            // Load the iframe src
            if (iframe) {
                setTimeout(function() {
                    try {
                        if (window.templateData) {
                            var title = (window.templateData.title || '').toString();
                            var topicsParam = encodeURIComponent([title].filter(Boolean).join(', '));
                            var baseUrl = 'https://voice-bot-production-d096.up.railway.app/widget.html';
                            var fullUrl = baseUrl + '?topics=' + topicsParam + '&widget=true';

                            console.log('🎤 Setting iframe src:', fullUrl);
                            iframe.src = fullUrl;
                        }
                    } catch (e) {
                        console.warn('Unable to set voice widget iframe src:', e);
                    }
                }, 100);
            }

            panel.classList.remove('hidden');
        } else {
            // Close voice widget
            if (iframe) {
                try { iframe.src = 'about:blank'; } catch (e) {}
                try { iframe.remove(); } catch (e) {}
            }
            panel.classList.add('hidden');
        }
    } catch (e) {
        console.warn('Unable to toggle voice widget:', e);
    }
}
```

### 9. Styling and UI Components

#### Chat Widget CSS
```css
/* Enhanced chat widget styles */
.enhanced-chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 380px;
    height: 560px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    border: 1px solid #e5e7eb;
    display: none;
    flex-direction: column;
    z-index: 1000;
    font-family: Inter, system-ui, sans-serif;
}

.chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    border-radius: 16px 16px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chat-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f9fafb;
}

.chat-message {
    margin-bottom: 16px;
    animation: messageSlideIn 0.3s ease-out;
}

.user-message {
    text-align: right;
}

.user-message .message-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 18px 18px 4px 18px;
    display: inline-block;
    max-width: 80%;
}

.assistant-message .message-content {
    background: white;
    color: #374151;
    padding: 12px 16px;
    border-radius: 18px 18px 18px 4px;
    border: 1px solid #e5e7eb;
    display: inline-block;
    max-width: 80%;
}

.chat-input-container {
    border-top: 1px solid #e5e7eb;
    background: white;
}

.chat-context-indicator {
    padding: 8px 16px;
    background: #f3f4f6;
    font-size: 12px;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
}

.chat-input-wrapper {
    display: flex;
    align-items: flex-end;
    padding: 12px;
    gap: 8px;
}

#chat-input {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 20px;
    padding: 8px 16px;
    resize: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    max-height: 120px;
    min-height: 40px;
}

#chat-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.chat-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
}

.chat-send-btn:hover {
    transform: scale(1.05);
}

.chat-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.typing-indicator {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    color: #6b7280;
}

.typing-dots {
    display: flex;
    gap: 4px;
    margin-left: 8px;
}

.typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #9ca3af;
    animation: typingDot 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typingDot {
    0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.5;
    }
    30% {
        transform: translateY(-10px);
        opacity: 1;
    }
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Mobile responsive */
@media (max-width: 480px) {
    .enhanced-chat-widget {
        width: 100%;
        height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
    }

    .chat-header {
        border-radius: 0;
    }
}
```

## Integration Points

### 1. Template Integration
```html
<!-- Template includes backend chat scripts -->
<script src="{{backend_url}}/chat-service.js"></script>
<script src="{{backend_url}}/enhanced-chat-widget.js"></script>
<script src="chat-integration.js"></script>
<script src="chat-system.js"></script>

// Backend configuration injected into template
window.templateConfig = {
    backendUrl: "{{backend_url}}",
    chatMode: "{{chat_mode}}",
    fallbackEnabled: true
};
```

### 2. Quiz System Integration
```javascript
// Quiz system triggers chat on failure
askAIForHelp(questionType, userAnswer) {
    const questionIndex = this.currentQuestionIndex;
    const question = this.questions[questionIndex];

    if (typeof openQuizFailureChat === 'function') {
        openQuizFailureChat(question, userAnswer);
    }
}
```

### 3. Task System Integration
```javascript
// Task system triggers hints exhausted chat
checkAllHintsUsed() {
    const totalAvailableHints = window.templateData?.content?.task_steps?.filter(step => step.hint).length || 0;
    const hintsUsed = this.revealedHints.length;

    if (hintsUsed >= totalAvailableHints && totalAvailableHints > 0) {
        const allHintsBtn = document.getElementById('allHintsUsedBtn');
        if (allHintsBtn) {
            allHintsBtn.classList.remove('hidden');
            allHintsBtn.style.animation = 'slideInUp 0.5s ease-out';
        }
    }
}
```

## Best Practices

### 1. Error Handling
- Graceful fallback to offline mode when backend unavailable
- Clear error messages for users
- Automatic retry mechanisms for transient failures
- Local storage backup for chat history

### 2. Performance
- Lazy loading of chat widget
- Message pagination for long conversations
- Optimized rendering for message history
- Debounced user input to reduce API calls

### 3. User Experience
- Contextual suggestions based on learning state
- Seamless integration with learning flow
- Mobile-responsive design
- Accessibility compliance

### 4. Security
- Secure API communication with HTTPS
- Input sanitization for user messages
- Rate limiting to prevent abuse
- Learner data privacy protection

### 5. Analytics and Monitoring
- Chat interaction tracking
- Context usage analytics
- Performance monitoring
- Error rate tracking