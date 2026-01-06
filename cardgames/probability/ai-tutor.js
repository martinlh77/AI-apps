/**
 * AI Math Tutor (Probability)
 * Conversational AI tutor for probability questions
 * Part 4 of 5 probability tools
 */

class AIMathTutor {
    constructor(engine, deckData) {
        this.engine = engine;
        this.deck = deckData;
        this.resizeHandler = null;
        
        // API Configuration
        this.API_KEY = 'pk_OIQlw5rh71ylmlqV';
        this.API_BASE = 'https://gen.pollinations.ai/text';
        this.currentModel = 'nova-micro';
        this.availableModels = ['nova-micro', 'qwen-coder', 'mistral', 'gemini-fast', 'openai-fast', 'grok'];
        
        // State
        this.state = {
            chatHistory: [],
            chatTokenCount: 0,
            maxTokens: 4096,
            isProcessing: false,
            conversationStarted: false
        };
        
        // Starter prompts
        this.starterPrompts = [
            "What is probability?",
            "How do I calculate probability with cards?",
            "What's the difference between theoretical and experimental probability?",
            "Explain sample space using a deck of cards",
            "What are independent events?",
            "How do I know if two events are dependent?",
            "What does 'or' mean in probability?",
            "What does 'and' mean in probability?",
            "Why do we use fractions in probability?",
            "How do I simplify probability fractions?"
        ];
    }

    setup() {
        // Set up resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = () => this.handleResize();
        window.addEventListener('resize', this.resizeHandler);
        
        this.buildUI();
        this.render();
    }

    buildUI() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        gameBoard.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #f0f0f0;
            font-family: 'Segoe UI', system-ui, sans-serif;
            overflow: hidden;
        `;

        gameBoard.innerHTML = `
            <div class="tutor-container">
                <!-- Header -->
                <div class="tutor-header">
                    <h1>🎓 AI Math Tutor</h1>
                    <p class="subtitle">Your friendly probability helper - Ask me anything!</p>
                    <div class="header-controls">
                        <div class="token-display">
                            <span class="token-label">Conversation:</span>
                            <span class="token-count" id="token-count">0</span>
                            <span class="token-max">/ 4096 tokens</span>
                        </div>
                        <select id="model-select" class="model-select">
                            <option value="nova-micro" selected>Nova Micro ⚡</option>
                            <option value="qwen-coder">Qwen Coder</option>
                            <option value="mistral">Mistral</option>
                            <option value="gemini-fast">Gemini Fast</option>
                            <option value="openai-fast">OpenAI Fast</option>
                            <option value="grok">Grok</option>
                        </select>
                        <button id="new-chat-btn" class="header-btn">🔄 New Chat</button>
                    </div>
                </div>
                
                <!-- Chat Area -->
                <div class="chat-area" id="chat-area">
                    <div class="welcome-screen" id="welcome-screen">
                        <div class="welcome-icon">🎓</div>
                        <h2>Hi! I'm your AI Math Tutor</h2>
                        <p class="welcome-text">I'm here to help you understand probability at a 7th-grade level. I'm patient, encouraging, and ready to explain concepts in different ways until they make sense!</p>
                        
                        <div class="starter-prompts">
                            <h3>🌟 Try asking me:</h3>
                            <div class="prompts-grid" id="prompts-grid"></div>
                        </div>
                        
                        <div class="tutor-features">
                            <div class="feature">
                                <span class="feature-icon">💡</span>
                                <span>Simple explanations</span>
                            </div>
                            <div class="feature">
                                <span class="feature-icon">📚</span>
                                <span>Step-by-step help</span>
                            </div>
                            <div class="feature">
                                <span class="feature-icon">🎯</span>
                                <span>Real-world examples</span>
                            </div>
                            <div class="feature">
                                <span class="feature-icon">✓</span>
                                <span>Patient & encouraging</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="messages-container" id="messages-container"></div>
                </div>
                
                <!-- Input Area -->
                <div class="input-area">
                    <div class="input-wrapper">
                        <textarea 
                            id="chat-input" 
                            placeholder="Ask me anything about probability... (Press Enter to send, Shift+Enter for new line)"
                            rows="2"
                        ></textarea>
                        <button id="send-btn" class="send-btn">
                            <span class="send-icon">📤</span>
                            <span class="send-text">Send</span>
                        </button>
                    </div>
                    <div class="input-hints">
                        <span class="hint">💡 Tip: Be specific! Instead of "I don't get it", try "Can you explain sample space again?"</span>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
        this.buildStarterPrompts();
        this.attachEventListeners();
    }

    injectStyles() {
        const existingStyle = document.getElementById('ai-tutor-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'ai-tutor-styles';
        style.textContent = `
            .tutor-container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }
            
            /* Header */
            .tutor-header {
                background: rgba(0,0,0,0.5);
                padding: 20px;
                border-bottom: 2px solid #d4af37;
            }
            .tutor-header h1 {
                color: #d4af37;
                margin: 0 0 5px 0;
                font-size: 2rem;
            }
            .subtitle {
                color: #aaa;
                margin: 0 0 15px 0;
                font-size: 1.05rem;
            }
            .header-controls {
                display: flex;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
            }
            .token-display {
                display: flex;
                align-items: center;
                gap: 5px;
                background: rgba(0,0,0,0.3);
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
            }
            .token-label {
                color: #aaa;
            }
            .token-count {
                color: #d4af37;
                font-weight: bold;
                font-size: 1.1rem;
            }
            .token-max {
                color: #666;
            }
            .token-count.warning {
                color: #f39c12;
            }
            .token-count.critical {
                color: #e74c3c;
            }
            .model-select {
                padding: 8px 12px;
                border-radius: 8px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 0.95rem;
                cursor: pointer;
            }
            .header-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                background: #34495e;
                color: white;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.95rem;
            }
            .header-btn:hover {
                background: #46627f;
            }
            
            /* Chat Area */
            .chat-area {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: rgba(0,0,0,0.2);
            }
            
            /* Welcome Screen */
            .welcome-screen {
                max-width: 700px;
                margin: 0 auto;
                text-align: center;
                padding: 40px 20px;
            }
            .welcome-icon {
                font-size: 5rem;
                margin-bottom: 20px;
                animation: bounce 2s infinite;
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
            }
            .welcome-screen h2 {
                color: #d4af37;
                margin: 0 0 15px 0;
            }
            .welcome-text {
                color: #bbb;
                font-size: 1.1rem;
                line-height: 1.6;
                margin-bottom: 30px;
            }
            
            /* Starter Prompts */
            .starter-prompts {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 30px;
            }
            .starter-prompts h3 {
                color: #d4af37;
                margin: 0 0 15px 0;
            }
            .prompts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
            }
            .prompt-card {
                background: rgba(0,0,0,0.4);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.9rem;
                text-align: left;
            }
            .prompt-card:hover {
                border-color: #d4af37;
                background: rgba(212, 175, 55, 0.1);
                transform: translateY(-2px);
            }
            
            /* Tutor Features */
            .tutor-features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }
            .feature {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(0,0,0,0.3);
                padding: 12px;
                border-radius: 8px;
                border-left: 3px solid #d4af37;
            }
            .feature-icon {
                font-size: 1.5rem;
            }
            
            /* Messages Container */
            .messages-container {
                max-width: 900px;
                margin: 0 auto;
            }
            
            /* Chat Messages */
            .chat-message {
                margin-bottom: 20px;
                animation: messageSlide 0.3s ease;
            }
            @keyframes messageSlide {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .message-content {
                padding: 15px 20px;
                border-radius: 15px;
                position: relative;
                max-width: 80%;
                word-wrap: break-word;
            }
            .chat-message.user {
                display: flex;
                justify-content: flex-end;
            }
            .chat-message.user .message-content {
                background: linear-gradient(135deg, #2c5282, #2b6cb0);
                border-bottom-right-radius: 5px;
                margin-left: 20%;
            }
            .chat-message.assistant {
                display: flex;
                justify-content: flex-start;
            }
            .chat-message.assistant .message-content {
                background: rgba(0,0,0,0.4);
                border: 1px solid #444;
                border-bottom-left-radius: 5px;
                margin-right: 20%;
            }
            .message-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 0.85rem;
                color: #aaa;
            }
            .message-role {
                font-weight: bold;
                color: #d4af37;
            }
            .message-text {
                line-height: 1.6;
                font-size: 1.05rem;
            }
            .message-text p {
                margin: 0 0 10px 0;
            }
            .message-text p:last-child {
                margin-bottom: 0;
            }
            .message-text strong {
                color: #f1c40f;
            }
            .message-text em {
                color: #3498db;
                font-style: normal;
            }
            .message-text code {
                background: rgba(0,0,0,0.5);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
                color: #00ffcc;
            }
            .message-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            .message-btn {
                background: rgba(0,0,0,0.3);
                border: 1px solid #444;
                color: #aaa;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .message-btn:hover {
                border-color: #d4af37;
                color: #d4af37;
            }
            .timestamp {
                font-size: 0.75rem;
                color: #666;
            }
            
            /* Typing Indicator */
            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 15px 20px;
                background: rgba(0,0,0,0.4);
                border: 1px solid #444;
                border-radius: 15px;
                border-bottom-left-radius: 5px;
                max-width: 80px;
            }
            .typing-dot {
                width: 8px;
                height: 8px;
                background: #d4af37;
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }
            .typing-dot:nth-child(2) {
                animation-delay: 0.2s;
            }
            .typing-dot:nth-child(3) {
                animation-delay: 0.4s;
            }
            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.7; }
                30% { transform: translateY(-10px); opacity: 1; }
            }
            
            /* Input Area */
            .input-area {
                background: rgba(0,0,0,0.5);
                border-top: 2px solid #d4af37;
                padding: 20px;
            }
            .input-wrapper {
                display: flex;
                gap: 15px;
                max-width: 900px;
                margin: 0 auto;
            }
            #chat-input {
                flex: 1;
                padding: 15px;
                border-radius: 12px;
                border: 2px solid #444;
                background: #000;
                color: #fff;
                font-size: 1.05rem;
                font-family: inherit;
                resize: none;
                transition: border-color 0.3s;
                min-height: 50px;
                max-height: 150px;
            }
            #chat-input:focus {
                outline: none;
                border-color: #d4af37;
            }
            #chat-input:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .send-btn {
                padding: 15px 25px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #d4af37, #f1c40f);
                color: #000;
                font-weight: bold;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
            }
            .send-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
            }
            .send-btn:disabled {
                background: #555;
                color: #888;
                cursor: not-allowed;
                box-shadow: none;
            }
            .send-icon {
                font-size: 1.2rem;
            }
            .input-hints {
                max-width: 900px;
                margin: 10px auto 0;
            }
            .hint {
                color: #888;
                font-size: 0.85rem;
                font-style: italic;
            }
            
            /* Token Warning Banner */
            .token-warning {
                background: rgba(243, 156, 18, 0.2);
                border: 2px solid #f39c12;
                color: #f39c12;
                padding: 12px 20px;
                border-radius: 8px;
                margin-bottom: 15px;
                text-align: center;
                font-weight: bold;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .token-critical {
                background: rgba(231, 76, 60, 0.2);
                border-color: #e74c3c;
                color: #e74c3c;
            }
            
            /* Mobile Responsive */
            @media (max-width: 700px) {
                .tutor-header h1 {
                    font-size: 1.5rem;
                }
                .header-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                .token-display {
                    justify-content: center;
                }
                .input-wrapper {
                    flex-direction: column;
                }
                .send-btn {
                    width: 100%;
                    justify-content: center;
                }
                .chat-message.user .message-content,
                .chat-message.assistant .message-content {
                    max-width: 90%;
                    margin-left: 0;
                    margin-right: 0;
                }
                .prompts-grid {
                    grid-template-columns: 1fr;
                }
                .tutor-features {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    buildStarterPrompts() {
        const grid = document.getElementById('prompts-grid');
        grid.innerHTML = '';
        
        // Show 6 random prompts
        const shuffled = [...this.starterPrompts].sort(() => Math.random() - 0.5);
        const displayed = shuffled.slice(0, 6);
        
        displayed.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.textContent = prompt;
            card.onclick = (e) => {
                e.stopPropagation();
                this.useStarterPrompt(prompt);
            };
            grid.appendChild(card);
        });
    }

    attachEventListeners() {
        document.getElementById('model-select').onchange = (e) => {
            e.stopPropagation();
            this.currentModel = e.target.value;
        };
        
        document.getElementById('new-chat-btn').onclick = (e) => {
            e.stopPropagation();
            this.startNewChat();
        };
        
        document.getElementById('send-btn').onclick = (e) => {
            e.stopPropagation();
            this.sendMessage();
        };
        
        document.getElementById('chat-input').onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };
        
        // Auto-resize textarea
        document.getElementById('chat-input').oninput = (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
        };
    }

    useStarterPrompt(prompt) {
        document.getElementById('chat-input').value = prompt;
        document.getElementById('chat-input').focus();
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) {
            return;
        }
        
        if (this.state.isProcessing) {
            return;
        }
        
        // Check token limit
        if (this.state.chatTokenCount >= this.state.maxTokens - 500) {
            alert('Chat conversation is getting too long! Please start a new conversation.');
            return;
        }
        
        // Hide welcome screen
        document.getElementById('welcome-screen').style.display = 'none';
        this.state.conversationStarted = true;
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        
        // Disable input
        this.setInputEnabled(false);
        
        // Show typing indicator
        const typingId = this.addTypingIndicator();
        
        // Update token count (estimate)
        this.state.chatTokenCount += Math.ceil(message.length / 4);
        this.updateTokenDisplay();
        
        try {
            const response = await this.callAI(message);
            
            // Remove typing indicator
            this.removeTypingIndicator(typingId);
            
            // Add assistant message
            this.addMessage(response, 'assistant');
            
            // Store in history
            this.state.chatHistory.push({ role: 'user', content: message });
            this.state.chatHistory.push({ role: 'assistant', content: response });
            
            // Update token count
            this.state.chatTokenCount += Math.ceil(response.length / 4);
            this.updateTokenDisplay();
            
            // Check token warning
            this.checkTokenWarning();
            
        } catch (error) {
            console.error('AI Error:', error);
            this.removeTypingIndicator(typingId);
            this.addMessage('Sorry, I had trouble responding. Please try again! 😊', 'assistant');
        } finally {
            this.setInputEnabled(true);
            input.focus();
        }
    }

    async callAI(message) {
        const systemPrompt = `You are an expert 7th-grade mathematics teacher specializing in probability.

Teaching style:
- Use simple, clear language appropriate for 7th graders
- Break complex ideas into small, manageable steps
- Use real-world examples students can relate to
- When discussing playing cards, remember: 52 cards (4 suits × 13 ranks), optionally 4 jokers (one per suit)
- Be encouraging and patient
- Celebrate understanding with enthusiasm
- Use analogies to make abstract concepts concrete
- Always check for understanding

Format responses:
- Keep paragraphs short (2-3 sentences max)
- Use bullet points for lists when helpful
- Bold key terms by wrapping in **asterisks**
- Emphasize numbers by wrapping in *single asterisks*
- Use emojis sparingly for encouragement (✓, ⭐, 🎯)
- Number your steps when explaining processes

Never:
- Use jargon without explaining it
- Make students feel bad for not understanding
- Provide overly mathematical explanations without context
- Give up explaining a concept - try different approaches

If a student says they don't understand:
- Ask what specific part is confusing
- Explain the concept in a different way
- Use a simpler analogy
- Break it down into even smaller steps
- Encourage them that it's okay to ask questions`;

        // Build conversation context (last 6 messages = 3 exchanges)
        const recentHistory = this.state.chatHistory.slice(-6);
        const contextMessages = recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
        
        const fullPrompt = contextMessages ? `${contextMessages}\n\nuser: ${message}` : message;
        
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(fullPrompt);
        const encodedSystem = encodeURIComponent(systemPrompt);
        const url = `${this.API_BASE}/${encodedPrompt}?model=${this.currentModel}&seed=${seed}&key=${this.API_KEY}&system=${encodedSystem}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('AI service error');
            }
            
            const text = await response.text();
            return text.trim();
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    addMessage(content, role) {
        const container = document.getElementById('messages-container');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Format content
        let formattedContent = content
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Emphasis
            .replace(/`([^`]+)`/g, '<code>$1</code>') // Code
            .replace(/\n\n/g, '</p><p>') // Paragraphs
            .replace(/\n/g, '<br>'); // Line breaks
        
        const roleLabel = role === 'user' ? 'You' : '🎓 Tutor';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-role">${roleLabel}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-text"><p>${formattedContent}</p></div>
                ${role === 'assistant' ? `
                    <div class="message-actions">
                        <button class="message-btn copy-btn" data-content="${content.replace(/"/g, '&quot;')}">📋 Copy</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(messageDiv);
        
        // Attach copy handler
        if (role === 'assistant') {
            messageDiv.querySelector('.copy-btn').onclick = (e) => {
                e.stopPropagation();
                const text = e.currentTarget.dataset.content;
                navigator.clipboard.writeText(text);
                e.currentTarget.textContent = '✓ Copied!';
                setTimeout(() => {
                    e.currentTarget.textContent = '📋 Copy';
                }, 2000);
            };
        }
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    addTypingIndicator() {
        const container = document.getElementById('messages-container');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        container.appendChild(typingDiv);
        this.scrollToBottom();
        
        return 'typing-indicator';
    }

    removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    updateTokenDisplay() {
        const countEl = document.getElementById('token-count');
        countEl.textContent = Math.round(this.state.chatTokenCount);
        
        // Color code based on usage
        countEl.classList.remove('warning', 'critical');
        if (this.state.chatTokenCount > 3500) {
            countEl.classList.add('critical');
        } else if (this.state.chatTokenCount > 3000) {
            countEl.classList.add('warning');
        }
    }

    checkTokenWarning() {
        const container = document.getElementById('messages-container');
        const existingWarning = container.querySelector('.token-warning');
        
        if (this.state.chatTokenCount > 3500) {
            if (!existingWarning) {
                const warning = document.createElement('div');
                warning.className = 'chat-message';
                warning.innerHTML = `
                    <div class="token-warning token-critical">
                        ⚠️ Token limit almost reached! Please start a new conversation soon.
                    </div>
                `;
                container.appendChild(warning);
                this.scrollToBottom();
            }
        } else if (this.state.chatTokenCount > 3000) {
            if (!existingWarning) {
                const warning = document.createElement('div');
                warning.className = 'chat-message';
                warning.innerHTML = `
                    <div class="token-warning">
                        💭 Conversation getting long! Consider starting a new chat soon.
                    </div>
                `;
                container.appendChild(warning);
                this.scrollToBottom();
            }
        }
    }

    setInputEnabled(enabled) {
        document.getElementById('chat-input').disabled = !enabled;
        document.getElementById('send-btn').disabled = !enabled;
        this.state.isProcessing = !enabled;
    }

    scrollToBottom() {
        const chatArea = document.getElementById('chat-area');
        setTimeout(() => {
            chatArea.scrollTop = chatArea.scrollHeight;
        }, 100);
    }

    startNewChat() {
        if (this.state.conversationStarted) {
            const confirm = window.confirm('Start a new conversation? Your current chat will be cleared.');
            if (!confirm) return;
        }
        
        // Reset state
        this.state.chatHistory = [];
        this.state.chatTokenCount = 0;
        this.state.conversationStarted = false;
        
        // Clear messages
        document.getElementById('messages-container').innerHTML = '';
        
        // Show welcome screen
        document.getElementById('welcome-screen').style.display = 'block';
        
        // Rebuild starter prompts
        this.buildStarterPrompts();
        
        // Update token display
        this.updateTokenDisplay();
        
        // Clear input
        document.getElementById('chat-input').value = '';
        
        // Scroll to top
        document.getElementById('chat-area').scrollTop = 0;
    }

    handleResize() {
        // Handle responsive adjustments if needed
    }

    render() {
        // Rendering handled by buildUI and message methods
    }

    updateStats() {
        this.updateTokenDisplay();
    }

    pause() {
        // No animations to pause
    }

    cleanup() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        const styleElement = document.getElementById('ai-tutor-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['probability-ai-tutor-v1'] = AIMathTutor;