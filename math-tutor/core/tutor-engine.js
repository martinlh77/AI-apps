/**
 * TutorEngine - Main Conversation & Coordination Controller
 * Manages chat, multi-model API routing, Python execution, and TTS
 */

class TutorEngine {
    constructor() {
        this.API_KEY = 'pk_OIQlw5rh71ylmlqV';
        this.API_BASE = 'https://gen.pollinations.ai';

        this.models = {
            tutor: 'grok',
            vision: 'gemini-fast',
            coder: 'qwen-coder',
            search: 'gemini-search',
            audio: 'openai-audio'
        };

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
            currentVoice: 'alloy',
            loadedApps: new Set(),
            activeApp: null
        };

        this.languageManager = new LanguageManager();
        this.messageParser = new MessageParser();
        this.appLoader = new AppLoader();
        this.pythonEngine = window.pythonEngine;

        this.init();
    }

    async init() {
        await this.languageManager.initPromise;

        const savedGrade = localStorage.getItem('mathTutorGrade') || 'middle';
        const savedLang = localStorage.getItem('mathTutorLang') || 'en';
        const savedVoice = localStorage.getItem('mathTutorVoice') || 'alloy';

        this.state.currentGrade = savedGrade;
        this.state.currentLang = savedLang;
        this.state.currentVoice = savedVoice;

        document.getElementById('grade-select').value = savedGrade;
        document.getElementById('lang-select').value = savedLang;
        document.getElementById('voice-select').value = savedVoice;

        await this.languageManager.applyLanguage(savedLang);
        this.languageManager.renderStarterPrompts(savedGrade);

        this.pythonEngine.initialize();

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('grade-select').addEventListener('change', (e) => {
            this.state.currentGrade = e.target.value;
            localStorage.setItem('mathTutorGrade', e.target.value);
            this.startNewChat();
        });

        document.getElementById('voice-select').addEventListener('change', (e) => {
            this.state.currentVoice = e.target.value;
            localStorage.setItem('mathTutorVoice', e.target.value);
        });

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

        document.getElementById('other-lang-input').addEventListener('change', async (e) => {
            if (e.target.value.trim()) {
                const langName = e.target.value.trim();
                this.state.currentLang = langName;
                localStorage.setItem('mathTutorLang', langName);
                await this.languageManager.translateAndApply(langName, `${this.API_BASE}/text`, this.API_KEY);
                this.startNewChat();
            }
        });

        document.getElementById('new-chat-btn').addEventListener('click', () => this.startNewChat());

        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('chat-input');

        sendBtn.addEventListener('click', () => this.sendMessage());

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-code-btn')) {
                this.handleCopyCode(e.target);
            } else if (e.target.classList.contains('run-code-btn')) {
                this.handleRunCode(e.target);
            } else if (e.target.classList.contains('speak-btn')) {
                this.handleSpeak(e.target);
            } else if (e.target.classList.contains('download-btn')) {
                this.handleDownload(e.target);
            } else if (e.target.classList.contains('copy-btn')) {
                this.handleCopy(e.target);
            }
        });
    }

    detectQueryType(message) {
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('code') || lowerMsg.includes('program') ||
            lowerMsg.includes('python') || lowerMsg.includes('javascript') ||
            lowerMsg.includes('algorithm') || lowerMsg.includes('write a function')) {
            return 'coder';
        }

        if (lowerMsg.includes('latest') || lowerMsg.includes('recent') ||
            lowerMsg.includes('news') || lowerMsg.includes('current') ||
            lowerMsg.includes('today') || lowerMsg.includes('2024') ||
            lowerMsg.includes('2025')) {
            return 'search';
        }

        return 'tutor';
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message) return;
        if (this.state.isProcessing) return;

        if (this.containsPII(message)) {
            this.addSystemMessage(
                "⚠️ Please do not share personal information like your email, phone number, or address. I am here to help with math!"
            );
            return;
        }

        document.getElementById('welcome-screen').style.display = 'none';

        this.addMessage(message, 'user');
        input.value = '';
        input.style.height = 'auto';

        this.setProcessing(true);
        const typingId = this.addTypingIndicator();

        try {
            const queryType = this.detectQueryType(message);
            const model = this.models[queryType];

            const response = await this.callAPI(message, model);
            this.removeTypingIndicator(typingId);

            const pythonBlocks = this.messageParser.extractPythonCode(response);

            await this.addMessage(response, 'assistant', pythonBlocks.length > 0);

            this.state.chatHistory.push({ role: 'user', content: message });
            this.state.chatHistory.push({ role: 'assistant', content: response });

            if (pythonBlocks.length > 0) {
                for (const block of pythonBlocks) {
                    if (this.isVisualizationCode(block.code)) {
                        await this.executeAndDisplayPython(block.code);
                    }
                }
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

    isVisualizationCode(code) {
        const visualKeywords = ['plt.', 'matplotlib', 'plot', 'graph', 'chart', 'figure', 'save_plot', 'ax.', 'fig,'];
        return visualKeywords.some(kw => code.includes(kw));
    }

    async executeAndDisplayPython(code) {
        const result = await this.pythonEngine.runCode(code);

        if (result.success && result.image) {
            this.addVisualization(result.image);
        } else if (result.success && result.stdout) {
            this.addCodeOutput(result.stdout);
        } else if (!result.success) {
            this.addSystemMessage(`Python Error: ${result.error}`);
        }
    }

    addVisualization(base64Image) {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = 'message assistant';

        const imgSrc = this.pythonEngine.getImageDataUrl(base64Image);
        const downloadBtn = this.languageManager.getString('downloadBtn');

        div.innerHTML = `
            <div class="message-content">
                <div class="visual-container">
                    <img src="${imgSrc}" alt="Math Visualization" />
                    <div class="visual-actions">
                        <button class="action-btn download-btn" data-image="${base64Image}">${downloadBtn}</button>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(div);
        this.scrollToBottom();
    }

    addCodeOutput(output) {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = 'message assistant';

        div.innerHTML = `
            <div class="message-content">
                <div class="code-container">
                    <div class="code-header">
                        <span class="code-language">OUTPUT</span>
                    </div>
                    <div class="code-block">
                        <pre>${this.escapeHtml(output)}</pre>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(div);
        this.scrollToBottom();
    }

    async callAPI(userMessage, model = 'grok') {
        const gradeData = this.grades[this.state.currentGrade];
        const lang = this.state.currentLang;
        const langName = this.languageManager.getLanguageName();

        let langInstruction = lang === 'en' ?
            "Reply in English." :
            `Reply in ${langName}.`;

        const systemPrompt = `You are a safe, educational AI Math Tutor for ${gradeData.level} students.

CRITICAL RULES:
1. **Safety**: No violence, hate speech, or requests for personal information.
2. **No Cheating**: Do not solve homework directly. Use the Socratic Method - ask guiding questions.
3. **Language**: ${langInstruction}
4. **Tone**: ${gradeData.tone}
5. **Math Scope**: ${gradeData.mathTopics}

PYTHON VISUALIZATION CAPABILITIES:
When explaining math concepts that benefit from visuals, generate Python code using matplotlib.
The code will be automatically executed and displayed. Always end visualization code with save_plot_as_base64().

Available helper functions (pre-loaded):
- create_coordinate_grid(xmin, xmax, ymin, ymax) - Creates coordinate plane with axes
- plot_function(equation_string, xmin, xmax, color, ax) - Plots math functions
- save_plot_as_base64() - REQUIRED at end of any visualization

VISUALIZATION TYPES YOU CAN CREATE:

**Graphs & Functions:**
- Linear: y = mx + b
- Quadratic: y = ax² + bx + c  
- Polynomial, exponential, logarithmic, trigonometric
- Multiple functions on same axes
- Piecewise functions

**Inequalities:**
- Number line inequalities (x > 3, x ≤ -2) - use open/closed circles
- Two-variable linear inequalities with shading (y > 2x + 1)
- Systems of inequalities showing solution region

**Geometry - 2D:**
- Points with coordinates labeled
- Lines, rays (with arrows), line segments
- Angles with degree measurements and arcs
- All polygons: triangles, quadrilaterals, pentagons, hexagons, etc.
- Circles with radius, diameter, chords, arcs, sectors
- Geometric transformations: translations, reflections, rotations, dilations

**Geometry - 3D:**
- Prisms (rectangular, triangular)
- Pyramids (square base, triangular base)
- Cylinders, cones, spheres
- Cross-sections of 3D shapes

**Data & Statistics:**
- Bar charts (single and double/grouped)
- Pie charts with percentages
- Line graphs with data points
- Histograms with frequency labels
- Scatter plots with optional trend lines
- Box plots (box-and-whisker)
- Dot plots
- Stem-and-leaf plots

**Probability Models:**
- Fair dice probability distributions
- Coin flip models (single and multiple coins)
- Spinners with equal or unequal sections
- Playing card probabilities by suit and type
- Theoretical vs experimental comparison with simulations

**Infographics:**
- Step-by-step process diagrams
- Flowcharts for problem-solving methods

WHEN TO CREATE VISUALIZATIONS:
- Student asks to "graph", "plot", "draw", "show", or "visualize" something
- Explaining geometric concepts
- Demonstrating data or statistics
- Teaching about probability
- Showing function behavior
- Comparing mathematical scenarios

CODE FORMAT:
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Your visualization code here

save_plot_as_base64()
\`\`\`

EXERCISE CREATION:
Create practice problems for students. Guide them to discover answers through questioning.

${gradeData.constraints}`;

        const recentHistory = this.state.chatHistory.slice(-8);

        try {
            const response = await fetch(`${this.API_BASE}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...recentHistory,
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();

        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async handleSpeak(button) {
        const text = button.getAttribute('data-text');
        if (!text) return;

        button.disabled = true;
        button.textContent = '🔊...';

        try {
            const lang = this.languageManager.getLanguageName();
            const voice = this.state.currentVoice;

            const ttsPrompt = `READ THIS TEXT EXACTLY WORD-FOR-WORD. Do NOT solve any problems, do NOT add explanations, do NOT change anything. Simply read aloud exactly what is written below in ${lang}:

"${text}"`;

            const response = await fetch(`${this.API_BASE}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: this.models.audio,
                    modalities: ['text', 'audio'],
                    audio: {
                        voice: voice,
                        format: 'mp3'
                    },
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a text-to-speech reader. Your ONLY job is to read the provided text EXACTLY as written, word-for-word. Never solve problems, never add commentary, never modify the text. Just read it aloud.'
                        },
                        { role: 'user', content: ttsPrompt }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('TTS request failed');
            }

            const data = await response.json();

            if (data.choices?.[0]?.message?.audio?.data) {
                const audioData = data.choices[0].message.audio.data;
                const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
                audio.play();
            }

        } catch (error) {
            console.error('TTS Error:', error);
            this.addSystemMessage('Unable to generate audio. Please try again.');
        } finally {
            button.disabled = false;
            button.textContent = this.languageManager.getString('speakBtn');
        }
    }

    handleCopyCode(button) {
        const code = button.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        button.textContent = '✓';
        setTimeout(() => button.textContent = '📋', 2000);
    }

    async handleRunCode(button) {
        const codeId = button.getAttribute('data-code-id');
        const container = document.getElementById(codeId);
        if (!container) return;

        const codeBlock = container.querySelector('.code-block pre');
        const code = codeBlock.textContent;

        button.disabled = true;
        button.textContent = '⏳...';

        const result = await this.pythonEngine.runCode(code);

        if (result.success) {
            if (result.image) {
                this.addVisualization(result.image);
            } else if (result.stdout) {
                this.addCodeOutput(result.stdout);
            }
        } else {
            this.addSystemMessage(`Error: ${result.error}`);
        }

        button.disabled = false;
        button.textContent = '▶️ Run';
    }

    handleDownload(button) {
        const imageData = button.getAttribute('data-image');
        if (imageData) {
            this.pythonEngine.downloadImage(imageData, 'math_visualization.png');
        }
    }

    handleCopy(button) {
        const text = button.getAttribute('data-text');
        navigator.clipboard.writeText(text);
        button.textContent = this.languageManager.getString('copiedBtn');
        setTimeout(() => button.textContent = this.languageManager.getString('copyBtn'), 2000);
    }

    containsPII(text) {
        const patterns = [
            /[\w.-]+@[\w.-]+\.\w+/,
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
            /\b\d{3}-\d{2}-\d{4}\b/,
            /\b\d{5}(-\d{4})?\b/
        ];

        return patterns.some(pattern => pattern.test(text));
    }

    addMessage(content, role, hasPython = false) {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = `message ${role}`;

        const htmlContent = this.messageParser.renderContent(content, {
            canRunPython: this.pythonEngine.isReady
        });

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const roleName = role === 'user' ? 'You' : '🤖 Tutor';

        const copyBtn = this.languageManager.getString('copyBtn');
        const speakBtn = this.languageManager.getString('speakBtn');

        div.innerHTML = `
            <div class="message-content">
                <div class="msg-header">
                    <span class="msg-role">${roleName}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-body">${htmlContent}</div>
                ${role === 'assistant' ? `
                    <div class="msg-actions">
                        <button class="action-btn copy-btn" data-text="${this.escapeHtml(content)}">${copyBtn}</button>
                        <button class="action-btn speak-btn" data-text="${this.escapeHtml(content)}">${speakBtn}</button>
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(div);
        this.scrollToBottom();
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

        this.languageManager.updateUI();
        this.languageManager.renderStarterPrompts(this.state.currentGrade);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
