// Learning Platform Chat Widget v2.0.0 - Sidebar Edition

class ChatWidget {
  constructor() {
    this.config = window.CHAT_WIDGET_CONFIG || {};
    this.backendUrl = this.config.backendUrl || 'http://localhost:3000';
    this.sessionId = null;
    this.isInitialized = false;
    this.messageHistory = [];
    this.isTyping = false;
  }

  initChatWidget(options = {}) {
    this.currentTopic = options.topic || 'general';
    this.currentContext = options.context || 'general';
    this.learnerData = options.learnerData || {};
    
    if (!this.isInitialized) {
      this.createUI();
      this.createTrigger();
      this.isInitialized = true;
    }
    
    this.showChat();
    
    if (options.initialMessage) {
      this.sendMessage(options.initialMessage, true);
    }
  }

  createUI() {
    // Remove any existing chat widget
    const existing = document.getElementById('chat-widget');
    if (existing) existing.remove();

    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-widget';
    chatContainer.innerHTML = `
      <div class="chat-header">
        <h3>🤖 Learning Assistant</h3>
        <button onclick="chatWidget.hideChat()" title="Close chat">×</button>
      </div>
      <div id="chat-messages" class="chat-messages"></div>
      <div class="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask me anything about this topic...">
        <button onclick="chatWidget.sendMessage()" id="chat-send" title="Send message">➤</button>
      </div>
    `;
    
    document.body.appendChild(chatContainer);
    
    // Add event listeners
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize input
    chatInput.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    });
  }

  createTrigger() {
    // Remove existing trigger
    const existing = document.querySelector('.chat-trigger');
    if (existing) existing.remove();

    const trigger = document.createElement('button');
    trigger.className = 'chat-trigger';
    trigger.title = 'Open Learning Assistant';
    trigger.innerHTML = '💬';
    trigger.onclick = () => this.showChat();
    
    document.body.appendChild(trigger);
  }

  async sendMessage(message = null, isFirst = false) {
    const input = document.getElementById('chat-input');
    const messageText = message || input.value.trim();
    
    if (!messageText) return;
    
    if (!message) input.value = '';
    
    this.addMessage('user', messageText);
    this.showTyping();
    
    try {
      const payload = {
        message: messageText,
        topic: this.currentTopic,
        context: this.currentContext,
        learnerData: this.learnerData,
        isFirstMessage: isFirst
      };

      if (this.sessionId && !isFirst) {
        payload.sessionId = this.sessionId;
      }

      const response = await fetch(`${this.backendUrl}/chat-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      this.hideTyping();
      
      if (data.sessionId) {
        this.sessionId = data.sessionId;
        console.log('Session ID stored:', this.sessionId);
      }
      
      this.addMessage('assistant', data.reply);
      
    } catch (error) {
      console.error('Chat error:', error);
      this.hideTyping();
      this.addMessage('assistant', "I'm sorry, I'm having trouble connecting. Please try again in a moment.");
    }
  }

  addMessage(sender, text) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.innerHTML = `<div class="message-content">${this.formatMessage(text)}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Store in history
    this.messageHistory.push({ sender, text, timestamp: new Date() });
  }

  formatMessage(text) {
    // Basic formatting for better readability
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  showTyping() {
    if (this.isTyping) return;
    
    this.isTyping = true;
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant-message typing-message';
    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTyping() {
    this.isTyping = false;
    const typingMessage = document.querySelector('.typing-message');
    if (typingMessage) {
      typingMessage.remove();
    }
  }

  showChat() {
    const chatWidget = document.getElementById('chat-widget');
    if (chatWidget) {
      chatWidget.classList.add('open');
      
      // Focus input when opening
      setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
      }, 300);
      
      // Fire custom event
      window.dispatchEvent(new CustomEvent('chatOpened'));
    }
  }

  hideChat() {
    const chatWidget = document.getElementById('chat-widget');
    if (chatWidget) {
      chatWidget.classList.remove('open');
      
      // Fire custom event
      window.dispatchEvent(new CustomEvent('chatClosed'));
    }
  }

  clearChat() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
    this.messageHistory = [];
    this.sessionId = null;
  }
}

// Create global instance
window.chatWidget = new ChatWidget();

// Auto-load chat widget CSS if not already present
(function() {
  if (!document.querySelector('link[href*="chat-widget.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${window.chatWidget.backendUrl}/chat-widget.css`;
    document.head.appendChild(link);
  }
})();