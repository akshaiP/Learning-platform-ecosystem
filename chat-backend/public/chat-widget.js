// Learning Platform Chat Widget v1.0.0
// This is a simplified version - you can expand based on your prototype

class ChatWidget {
    constructor() {
      this.config = window.CHAT_WIDGET_CONFIG || {};
      this.backendUrl = this.config.backendUrl || 'http://localhost:3000';
      this.sessionId = null;
      this.isInitialized = false;
      this.messageHistory = [];
    }
  
    initChatWidget(options = {}) {
      this.currentTopic = options.topic || 'general';
      this.currentContext = options.context || 'general';
      this.learnerData = options.learnerData || {};
      
      if (!this.isInitialized) {
        this.createUI();
        this.isInitialized = true;
      }
      
      this.showChat();
      
      if (options.initialMessage) {
        this.sendMessage(options.initialMessage, true);
      }
    }
  
    createUI() {
      // Simplified UI creation - expand based on your prototype
      const chatContainer = document.createElement('div');
      chatContainer.id = 'chat-widget';
      chatContainer.innerHTML = `
        <div class="chat-header">
          <h3>Learning Assistant</h3>
          <button onclick="chatWidget.hideChat()">×</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-container">
          <input type="text" id="chat-input" placeholder="Ask me anything...">
          <button onclick="chatWidget.sendMessage()" id="chat-send">Send</button>
        </div>
      `;
      
      document.body.appendChild(chatContainer);
      
      // Add event listeners
      document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }
  
    async sendMessage(message = null, isFirst = false) {
      const input = document.getElementById('chat-input');
      const messageText = message || input.value.trim();
      
      if (!messageText) return;
      
      if (!message) input.value = '';
      
      this.addMessage('user', messageText);
      
      try {
        const response = await fetch(`${this.backendUrl}/chat-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            topic: this.currentTopic,
            context: this.currentContext,
            sessionId: this.sessionId,
            learnerData: this.learnerData,
            isFirstMessage: isFirst
          })
        });
  
        const data = await response.json();
        
        if (data.sessionId) {
          this.sessionId = data.sessionId;
        }
        
        this.addMessage('assistant', data.reply);
        
      } catch (error) {
        console.error('Chat error:', error);
        this.addMessage('assistant', "I'm sorry, I'm having trouble connecting. Please try again.");
      }
    }
  
    addMessage(sender, text) {
      const messagesContainer = document.getElementById('chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${sender}-message`;
      messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  
    showChat() {
      document.getElementById('chat-widget').style.display = 'flex';
    }
  
    hideChat() {
      document.getElementById('chat-widget').style.display = 'none';
    }
  }
  
  // Create global instance
  window.chatWidget = new ChatWidget();  