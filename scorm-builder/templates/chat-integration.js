// Enhanced Chat Integration - Prevents Button Conflicts
(function() {
    let chatWidgetLoaded = false;
    let loadAttempts = 0;
    const maxAttempts = 3;
    
    function loadChatWidget() {
        const script = document.createElement('script');
        script.src = window.templateConfig?.backendUrl + '/chat-widget.js';
        
        script.onload = function() {
            chatWidgetLoaded = true;
            console.log('✅ Chat widget loaded successfully');
            
            // Hide backend's floating button and use template button
            setTimeout(() => {
                hideBackendTriggerButton();
                setupTemplateButton();
            }, 500);
        };
        
        script.onerror = function() {
            loadAttempts++;
            console.warn(`❌ Failed to load chat widget (attempt ${loadAttempts}/${maxAttempts})`);
            
            if (loadAttempts < maxAttempts) {
                setTimeout(loadChatWidget, 1000);
            } else {
                console.warn('🔄 Using fallback chat widget');
                loadFallbackChatWidget();
            }
        };
        
        document.head.appendChild(script);
    }
    
    function hideBackendTriggerButton() {
        // Hide the backend's auto-generated trigger button
        const backendTriggers = document.querySelectorAll('.chat-trigger');
        backendTriggers.forEach(trigger => {
            trigger.style.display = 'none';
            console.log('🔇 Backend chat trigger button hidden');
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
    
    function loadFallbackChatWidget() {
        window.chatWidget = {
            initChatWidget: function(config) {
                const message = config.initialMessage || 'Chat would open here';
                const isOnline = navigator.onLine;
                
                const fallbackMsg = `🤖 Chat Widget (${isOnline ? 'Backend Offline' : 'No Internet'})\n\nTopic: ${config.topic}\nContext: ${config.context}\nMessage: ${message}\n\n${isOnline ? '⚠️ Backend server not responding' : '📡 No internet connection'}`;
                
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
    
    window.ensureChatWidget = function(callback) {
        if (chatWidgetLoaded && window.chatWidget) {
            callback();
        } else {
            setTimeout(() => window.ensureChatWidget(callback), 500);
        }
    };
    
    // Auto-load when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChatWidget);
    } else {
        loadChatWidget();
    }  
    // Periodically check for and hide any new backend triggers
    setInterval(() => {
        if (chatWidgetLoaded) {
            hideBackendTriggerButton();
        }
    }, 2000);
})();

// Handle layout adjustments
window.addEventListener('chatOpened', () => {
    console.log('Chat opened by backend widget');
});

window.addEventListener('chatClosed', () => {
    console.log('Chat closed by backend widget');
});