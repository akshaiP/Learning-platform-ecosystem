// Enhanced Learning Platform Chat Widget v3.0.0 - With Dual Backend Support
// Integrates with ChatService abstraction layer

class EnhancedChatWidget {
  constructor() {
    this.config = window.CHAT_WIDGET_CONFIG || {};
    this.sessionId = null;
    this.isInitialized = false;
    this.messageHistory = [];
    this.isTyping = false;
    this.currentTopic = 'general';
    this.currentContext = 'general';
    this.learnerData = {};
    this.contextData = null;
  }

  async initChatWidget(options = {}) {
    this.currentTopic = options.topic || 'general';
    this.currentContext = options.context || 'general';
    this.learnerData = options.learnerData || {};
    this.contextData = options.contextData || null;
    
    console.log('🚀 Initializing Enhanced Chat Widget:', {
      topic: this.currentTopic,
      context: this.currentContext,
      learnerData: this.learnerData
    });
    
    if (!this.isInitialized) {
      this.createUI();
      this.createTrigger();
      this.isInitialized = true;
    }
    
    // Load conversation history if ChatService is available
    await this.loadConversationHistory();
    
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
        <h3>Learning Assistant</h3>
        <button onclick="window.chatWidget.hideChat()" title="Close chat">×</button>
      </div>
      <div id="chat-messages" class="chat-messages"></div>
      <div class="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask your question..." rows="1">
        <button onclick="window.chatWidget.sendMessage()" id="chat-send" title="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 12L21 3L14 21L11 13L3 12Z" fill="currentColor"/>
          </svg>
        </button>
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
    trigger.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M20 2H4C2.895 2 2 2.895 2 4V22L6 18H20C21.105 18 22 17.105 22 16V4C22 2.895 21.105 2 20 2Z" fill="currentColor"/>
      </svg>`;
    trigger.onclick = () => this.showChat();
    
    document.body.appendChild(trigger);
  }

  async sendMessage(message = null, isFirst = false) {
    const input = document.getElementById('chat-input');
    const messageText = message || input.value.trim();
    
    if (!messageText) return;
    
    if (!message) {
      input.value = '';
      input.style.height = 'auto';
    }
    
    this.addMessage('user', messageText);
    this.showTyping();
    
    try {
      // Check if ChatService is available
      if (!window.chatService) {
        throw new Error('ChatService not available');
      }
      
      // Determine context: use initial context for first message, then switch to general
      let contextForMessage = this.currentContext;
      if (!isFirst && (this.currentContext === 'learn_more' || this.currentContext === 'quiz_failed')) {
        contextForMessage = 'general';
        console.log(`🔄 Context switched from '${this.currentContext}' to 'general' for follow-up message`);
      }
      
      const response = await window.chatService.sendMessage(
        messageText,
        contextForMessage,
        this.learnerData
      );
      
      this.hideTyping();
      
      // Store session ID
      if (response.sessionId) {
        this.sessionId = response.sessionId;
        window.chatService.setSessionId(response.sessionId);
      }
      
      this.addMessage('assistant', response.reply);
      
      // Log additional info if available
      if (response.sources && response.sources.length > 0) {
        console.log('📚 Sources:', response.sources);
      }
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      this.hideTyping();
      this.addMessage('assistant', "I'm sorry, I'm having trouble connecting. Please try again in a moment.");
    }
  }

  async loadConversationHistory() {
    if (!window.chatService || !this.learnerData) {
      console.log('ℹ️ Cannot load history: ChatService or learnerData not available');
      return;
    }
    
    try {
      const history = await window.chatService.loadHistory(this.learnerData);
      
      if (history && history.messages && history.messages.length > 0) {
        console.log(`📚 Restoring ${history.totalMessages} messages from history`);
        
        // Clear any existing messages first
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }
        this.messageHistory = [];
        
        // Restore existing messages
        history.messages.forEach(msg => {
          this.addMessage(msg.role, msg.content, false); // Don't save to history again
        });
        
        // Store session ID
        if (history.sessionId) {
          this.sessionId = history.sessionId;
          window.chatService.setSessionId(history.sessionId);
        }
        
        console.log(`✅ Successfully restored ${history.messages.length} messages`);
      } else {
        console.log('ℹ️ No existing conversation history found');
      }
    } catch (error) {
      console.error('❌ Failed to load conversation history:', error);
    }
  }

  addMessage(sender, text, saveToHistory = true) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.innerHTML = `<div class="message-content">${this.formatMessage(text)}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Store in history
    if (saveToHistory) {
      this.messageHistory.push({ sender, text, timestamp: new Date() });
    }
  }

  formatMessage(text) {
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1) Code fences to HTML blocks first
    const renderCodeFences = (s) => s.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${escapeHtml(code.trim())}</code></pre>`);

    // 2) Markdown tables to HTML blocks
    const renderTables = (s) => {
      const lines = s.split('\n');
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const header = lines[i] || '';
        const sep = lines[i + 1] || '';
        const isHeader = /\|/.test(header) && /^\s*\|?\s*(:?-{3,}:?\s*\|\s*)+(:?-{3,}:?)?\s*\|?\s*$/.test(sep);
        if (isHeader) {
          const headerCells = header.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
          i += 2;
          const rows = [];
          while (i < lines.length && /\|/.test(lines[i])) {
            const rowCells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
            rows.push(rowCells);
            i++;
          }
          let html = '<div class="table-wrapper"><table class="md-table"><thead><tr>';
          headerCells.forEach(h => { html += `<th>${escapeHtml(h)}</th>`; });
          html += '</tr></thead><tbody>';
          rows.forEach(r => { html += '<tr>' + r.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>'; });
          html += '</tbody></table></div>';
          out.push(html);
          continue;
        }
        out.push(lines[i]);
        i++;
      }
      return out.join('\n');
    };

    const renderInline = (s) => s
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');

    // 3) Block renderer that preserves previously generated HTML blocks
    const renderBlocks = (s) => {
      const blocks = s.split(/\n\n+/);
      const out = [];
      for (let b of blocks) {
        const trimmed = b.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('<pre') || trimmed.startsWith('<div class="table-wrapper"')) {
          out.push(trimmed);
          continue;
        }
        // Handle lists: allow optional blank lines inside the block
        const lines = trimmed.split('\n');
        const listLines = lines.filter(l => /^\s*[-*•]\s+\S/.test(l));
        if (listLines.length > 0 && listLines.length >= lines.length - 1) {
          const items = lines
            .filter(l => /^\s*[-*•]\s+\S/.test(l))
            .map(l => l.replace(/^\s*[-*•]\s+/, ''));
          out.push('<ul>' + items.map(it => `<li>${renderInline(escapeHtml(it))}</li>`).join('') + '</ul>');
          continue;
        }
        // Heuristic: convert multiple "Term: description" lines into a bullet list
        const termDescMatches = lines
          .map(l => l.match(/^\s*([^:]{2,80}):\s+(.+)$/))
          .filter(m => !!m);
        if (termDescMatches.length >= 3 && termDescMatches.length >= Math.floor(lines.length * 0.6)) {
          const items = lines
            .map(l => l.match(/^\s*([^:]{2,80}):\s+(.+)$/))
            .filter(m => !!m)
            .map(m => `<li><strong>${renderInline(escapeHtml(m[1]))}:</strong> ${renderInline(escapeHtml(m[2]))}</li>`);
          out.push('<ul>' + items.join('') + '</ul>');
          continue;
        }
        // Headings (single-line)
        if (/^#{1,6} \S/.test(trimmed)) {
          const level = (trimmed.match(/^#+/)[0] || '#').length;
          out.push(`<h${level}>${renderInline(escapeHtml(trimmed.replace(/^#+\s*/, '')))}</h${level}>`);
          continue;
        }
        // Paragraph: join lines with a space to avoid large gaps
        out.push(`<p>${renderInline(escapeHtml(lines.join(' ')))}</p>`);
      }
      return out.join('');
    };

    let processed = String(text || '');
    processed = renderCodeFences(processed);
    processed = renderTables(processed);
    processed = renderBlocks(processed);
    return processed;
  }

  showTyping() {
    if (this.isTyping) return;
    
    this.isTyping = true;
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
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
      document.body.classList.add('chat-open');
      
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
      document.body.classList.remove('chat-open');
      
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
    localStorage.removeItem('chat_session_id');
  }

  // Get current widget state
  getState() {
    return {
      isInitialized: this.isInitialized,
      currentTopic: this.currentTopic,
      currentContext: this.currentContext,
      learnerData: this.learnerData,
      sessionId: this.sessionId,
      messageCount: this.messageHistory.length
    };
  }
}

// Create global instance
window.chatWidget = new EnhancedChatWidget();

// Auto-load chat widget CSS if not already present
(function() {
  if (!document.querySelector('link[href*="chat-widget.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Use the direct backend URL for CSS (fallback)
    const cssUrl = window.templateConfig?.backendUrl || 'http://localhost:3000';
    link.href = `${cssUrl}/chat-widget.css`;
    document.head.appendChild(link);
  }
})();

console.log('✅ Enhanced Chat Widget loaded successfully');