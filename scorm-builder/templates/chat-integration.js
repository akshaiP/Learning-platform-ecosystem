// Enhanced Chat Widget Loading
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
    
    function loadFallbackChatWidget() {
        window.chatWidget = {
            initChatWidget: function(config) {
                const message = config.initialMessage || 'Chat would open here';
                const isOnline = navigator.onLine;
                
                const fallbackMsg = `🤖 Chat Widget (${isOnline ? 'Backend Offline' : 'No Internet'})\n\nTopic: ${config.topic}\nContext: ${config.trigger}\nMessage: ${message}\n\n${isOnline ? '⚠️ Backend server not responding' : '📡 No internet connection'}`;
                
                alert(fallbackMsg);
            }
        };
        chatWidgetLoaded = true;
    }
    
    window.ensureChatWidget = function(callback) {
        if (chatWidgetLoaded && window.chatWidget) {
            callback();
        } else {
            setTimeout(() => window.ensureChatWidget(callback), 100);
        }
    };
    
    // Auto-load when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChatWidget);
    } else {
        loadChatWidget();
    }
})();

// Auto-adjust main container when chat opens
window.addEventListener('chatOpened', () => {
    const pageWrapper = document.getElementById('pageWrapper');
    if (pageWrapper) pageWrapper.style.marginRight = '400px';
});

window.addEventListener('chatClosed', () => {
    const pageWrapper = document.getElementById('pageWrapper');
    if (pageWrapper) pageWrapper.style.marginRight = '0';
});