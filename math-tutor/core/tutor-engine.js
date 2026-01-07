/**
 * TutorEngine - Main Conversation & Coordination Controller
 * Manages chat, API calls, app triggers, and safety
 */

class TutorEngine {
    constructor() {
        this.API_KEY = 'pk_OIQlw5rh71ylmlqV';
        this.API_BASE = 'https://gen.pollinations.ai/text';
        this.currentModel = 'nova-micro';

        this.grades = {
            elementary: { 
                level: "Elementary (Grades 3-5)", 
                tone: "very friendly and encouraging", 
                constraints: "Use simple sentences. Avoid abstract concepts. Use concrete examples.",
                mathTopics: "basic arithmetic, simple fractions, shapes, measurement"
            },
            middle: { 
                level: "Middle School (Grades 6-8)", 
                tone: "helpful and supportive", 
                constraints: "Introduce algebraic thinking. Use real-world examples.",
                mathTopics: "algebra basics, coordinate planes, ratios, statistics"
            },
            high: { 
                level: "High School (Grades 9-12)", 
                tone: "professional but approachable", 
                constraints: "Use standard mathematical terminology. Encourage problem-solving.",
                mathTopics: "algebra, geometry, trigonometry, pre-calculus"
            },
            general: { 
                level: "General / College", 
                tone: "academic and precise", 
                constraints: "Full mathematical rigor. Advanced notation acceptable.",
                mathTopics: "all topics including calculus, statistics, linear algebra"
            }
        };

        this.state = {
            chatHistory: [],
            isProcessing: false,
            currentGrade: 'middle',
            currentLang: 'en',
            loadedApps: new Set(),
            activeApp: null
        };

        // Initialize subsystems
        this.languageManager = new LanguageManager();
        this.messageParser = new MessageParser();
        this.appLoader = new AppLoader();

        this.init();
    }

    init() {
        // Load saved preferences
        const savedGrade = localStorage.getItem('mathTutorGrade') || 'middle';
        const savedLang = localStorage.getItem('mathTutorLang') || 'en';
        const savedModel = localStorage.getItem('mathTutorModel') || 'nova-micro';
        
        this.state.currentGrade = savedGrade;
        this.state.currentLang = savedLang;
        this.currentModel = savedModel;

        document.getElementById('grade-select').value = savedGrade;
        document.getElementById('lang-select').value = savedLang;
        document.getElementById('model-select').value = savedModel;

        // Apply language
        this.languageManager.applyLanguage(savedLang);

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Grade selection
        document.getElementById('grade-select').addEventListener('change', (e) => {
            this.state.currentGrade = e.target.value;
            localStorage.setItem('mathTutorGrade', e.target.value);
            this.startNewChat();
        });

        // Model selection
        document.getElementById('model-select').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            localStorage.setItem('mathTutorModel', e.target.value);
        });

        // Language selection
        document.getElementById('lang-select').addEventListener('change', async (e) => {
            const lang = e.target.value;
            const input = document.getElementById('other-lang-input');
            
            if (lang === 'other') {
                input.style.display = 'block';
                input.focus();
                input.value = '';
            } else {
                input.style.display = 'none';
                this.state.currentLang = lang;
                localStorage.setItem('mathTutorLang', lang);
                await this.languageManager.applyLanguage(lang);
                this.startNewChat();
            }
        });

        // Custom language input
        document.getElementById('other-lang-input').addEventListener('change', async (e) => {
            if (e.target.value.trim()) {
                const langName = e.target.value.trim();
                this.state.currentLang = langName;
                localStorage.setItem('mathTutorLang', langName);
                await this.languageManager.translateAndApply(langName, this.API_BASE, this.API_KEY);
                this.startNewChat();
            }
        });

        // New chat button
        document.getElementById('new-chat-btn').addEventListener('click', () => this.startNewChat());

        // App panel close
        document.getElementById('app-panel-close').addEventListener('click', () => {
            document.getElementById('app-container-panel').style.display = 'none';
        });

        // Send message
        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('chat-input');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        if (this.state.isProcessing) return;

        // Safety check
        if (this.containsPII(message)) {
            this.addSystemMessage(
                "⚠️ Please do not share personal information like your email, phone number, or address. I am here to help with math!"
            );
            return;
        }

        // Hide welcome screen
        document.getElementById('welcome-screen').style.display = 'none';

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        input.style.height = 'auto';

        // Set processing state
        this.setProcessing(true);
        const typingId = this.addTypingIndicator();

        try {
            // Call API
            const response = await this.callAPI(message);
            this.removeTypingIndicator(typingId);

            // Parse for app triggers
            const { cleanText, appCalls } = this.messageParser.extractAppCalls(response);

            // Add assistant message
            this.addMessage(cleanText, 'assistant');

            // Update history
            this.state.chatHistory.push({ role: 'user', content: message });
            this.state.chatHistory.push({ role: 'assistant', content: cleanText });

            // Process app calls
            if (appCalls.length > 0) {
                await this.processAppCalls(appCalls);
            }

        } catch (error) {
            console.error('API Error:', error);
            this.removeTypingIndicator(typingId);
            this.addSystemMessage(
                "❌ I encountered a network error. Please check your connection and try again!"
            );
        } finally {
            this.setProcessing(false);
        }
    }

    async processAppCalls(appCalls) {
        for (const call of appCalls) {
            try {
                // Load app if not already loaded
                if (!this.state.loadedApps.has(call.appId)) {
                    await this.appLoader.loadApp(call.appId);
                    this.state.loadedApps.add(call.appId);
                }

                // Get app instance
                const AppClass = window[call.appId];
                if (!AppClass) {
                    console.error(`App ${call.appId} not found`);
                    continue;
                }

                // Show app panel
                document.getElementById('app-container-panel').style.display = 'block';
                document.getElementById('app-panel-title').textContent = call.appId;

                // Initialize app
                const app = new AppClass('app-panel-content');
                this.state.activeApp = app;

                // Render app
                const result = await app.render(call.payload);

                // Add result to chat context
                if (result.summary) {
                    this.state.chatHistory.push({
                        role: 'system',
                        content: `[Visualization: ${result.summary}]`
                    });
                }

            } catch (error) {
                console.error(`App ${call.appId} error:`, error);
                this.addSystemMessage(`⚠️ Could not load ${call.appId}. Continuing with text explanation.`);
            }
        }
    }

    async callAPI(userMessage) {
        const gradeData = this.grades[this.state.currentGrade];
        const lang = this.state.currentLang;

        // Language instruction
        let langInstruction = "";
        if (lang === 'en') {
            langInstruction = "Reply in English.";
        } else if (this.languageManager.builtInTranslations[lang]) {
            langInstruction = `Reply in ${lang.toUpperCase()}.`;
        } else {
            langInstruction = `Reply in the user's language: ${lang}.`;
        }

        // System prompt with app integration
        const systemPrompt = `You are a safe, educational AI Math Tutor for ${gradeData.level} students.

CRITICAL RULES:
1. **Safety**: No violence, hate speech, or requests for personal information (PII).
2. **No Cheating**: Do not solve homework directly. Use the Socratic Method - ask guiding questions.
3. **Language**: ${langInstruction}
4. **Tone**: ${gradeData.tone}
5. **Math Scope**: ${gradeData.mathTopics}

APP INTEGRATION:
When visualization would help, output app markers:
[[APP:CoordinateGrid|{"points":[[1,2],[3,4]],"type":"scatter"}]]
[[APP:FractionVisualizer|{"operation":"add","fractions":["1/2","1/4"],"visualType":"circles"}]]

Available Apps: CoordinateGrid, FractionVisualizer, ChartMaker, NumberLine, SlopeExplorer

// Inside callAPI() method, update systemPrompt to include:

COORDINATE GRID APP USAGE:

When student asks to graph points, lines, or functions, use:

**Points**: 
[[APP:CoordinateGrid|{"type":"points","points":[[x1,y1,"label"],[x2,y2]]}]]

**Linear Function**: 
[[APP:CoordinateGrid|{"type":"line","slope":m,"intercept":b,"equation":"y = mx + b"}]]

**Quadratic/Other Function**: 
[[APP:CoordinateGrid|{"type":"function","equation":"y = x^2 - 4x + 3"}]]

**Inequality**: 
[[APP:CoordinateGrid|{"type":"inequality","equation":"y > 2x + 1"}]]

**Multiple Functions**: 
[[APP:CoordinateGrid|{"type":"multi","functions":[{"equation":"y = x","color":"#00d4ff"},{"equation":"y = x^2","color":"#ff0055"}]}]]

Window options: {"window":{"xMin":-10,"xMax":10,"yMin":-10,"yMax":10}}

VISUALIZATION RULES:
- If asked for graphs/plots: Use CoordinateGrid app OR output SVG with these specs:
  - viewBox="0 0 300 300", origin at (150,150)
  - Grid: stroke="rgba(255,255,255,0.2)"
  - Function line: stroke="#00d4ff" stroke-width="2"
  - Points: fill="#ff0055" r="4"
  - Text: fill="#ffffff" font-size="12"
- Never output markdown tables for coordinate data
- Structure: Output SVG first, then explanation text

${gradeData.constraints}`;

        // Build context from recent history
        const recentHistory = this.state.chatHistory.slice(-8);
        const contextStr = recentHistory
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n');
        
        const fullPrompt = contextStr 
            ? `${contextStr}\n\nuser: ${userMessage}` 
            : userMessage;

        // Make API call
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
                throw new Error(`API responded with status ${response.status}`);
            }
            
            const text = await response.text();
            return text.trim();
        } catch (e) {
            clearTimeout(timeoutId);
            throw e;
        }
    }

    containsPII(text) {
        const patterns = [
            /[\w.-]+@[\w.-]+\.\w+/,                    // Email
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,          // Phone
            /\b\d{3}-\d{2}-\d{4}\b/,                  // SSN
            /\b\d{5}(-\d{4})?\b/                       // ZIP code
        ];
        
        return patterns.some(pattern => pattern.test(text));
    }

    addMessage(content, role) {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = `message ${role}`;
        
        const htmlContent = this.messageParser.renderContent(content);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const roleName = role === 'user' ? 'You' : '🤖 Tutor';

        div.innerHTML = `
            <div class="message-content">
                <div class="msg-header">
                    <span class="msg-role">${roleName}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-body">${htmlContent}</div>
                ${role === 'assistant' ? `
                    <div class="msg-actions">
                        <button class="copy-btn" data-text="${this.escapeHtml(content)}">📋 Copy</button>
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(div);
        this.scrollToBottom();

        // Attach copy handler
        div.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.target.getAttribute('data-text');
                navigator.clipboard.writeText(text);
                e.target.textContent = '✓ Copied';
                setTimeout(() => e.target.textContent = '📋 Copy', 2000);
            });
        });
    }

    addSystemMessage(content) {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.style.opacity = '0.8';
        div.innerHTML = `
            <div class="message-content" style="border-style: dashed; border-color: #d4af37;">
                ${content}
            </div>
        `;
        container.appendChild(div);
        this.scrollToBottom();
    }

    addTypingIndicator() {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.id = 'typing-indicator';
        div.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
        this.scrollToBottom();
        return 'typing-indicator';
    }

    removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    setProcessing(state) {
        this.state.isProcessing = state;
        document.getElementById('chat-input').disabled = state;
        document.getElementById('send-btn').disabled = state;
    }

    scrollToBottom() {
        const chat = document.getElementById('chat-area');
        setTimeout(() => chat.scrollTop = chat.scrollHeight, 100);
    }

    startNewChat() {
        this.state.chatHistory = [];
        this.state.activeApp = null;
        document.getElementById('messages-container').innerHTML = '';
        document.getElementById('welcome-screen').style.display = 'block';
        document.getElementById('app-container-panel').style.display = 'none';
        
        this.languageManager.updateUI();
        this.languageManager.renderStarterPrompts(this.state.currentGrade);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}