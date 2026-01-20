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

        // Check if this is a visualization request
        const visualKeywords = ['graph', 'plot', 'draw', 'show', 'visualize', 'chart', 'diagram', 'picture', 'display', 'illustrate'];
        const isVisualRequest = visualKeywords.some(kw => lowerMsg.includes(kw));

        if (lowerMsg.includes('code') || lowerMsg.includes('program') ||
            lowerMsg.includes('javascript') || lowerMsg.includes('algorithm') || 
            lowerMsg.includes('write a function')) {
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

    needsVisualization(message) {
        const lowerMsg = message.toLowerCase();
        const visualKeywords = [
            'graph', 'plot', 'draw', 'show me', 'visualize', 'chart', 'diagram', 
            'picture', 'display', 'illustrate', 'number line', 'coordinate',
            'sketch', 'create a', 'make a', 'generate'
        ];
        return visualKeywords.some(kw => lowerMsg.includes(kw));
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
            const wantsVisual = this.needsVisualization(message);

            console.log('Query type:', queryType, 'Wants visual:', wantsVisual);

            const response = await this.callAPI(message, model, wantsVisual);
            this.removeTypingIndicator(typingId);

            console.log('API Response:', response);

            // Extract Python code blocks
            const pythonBlocks = this.messageParser.extractPythonCode(response);
            console.log('Python blocks found:', pythonBlocks.length);

            if (pythonBlocks.length > 0) {
                pythonBlocks.forEach((block, i) => {
                    console.log(`Block ${i}:`, block.code.substring(0, 100) + '...');
                });
            }

            // Add assistant message
            const messageElement = this.addMessage(response, 'assistant');

            // Update history
            this.state.chatHistory.push({ role: 'user', content: message });
            this.state.chatHistory.push({ role: 'assistant', content: response });

            // Auto-execute Python visualization code
            if (pythonBlocks.length > 0) {
                console.log('Executing Python blocks...');
                for (let i = 0; i < pythonBlocks.length; i++) {
                    const block = pythonBlocks[i];
                    await this.executeAndDisplayPython(block.code, messageElement, i);
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

    async executeAndDisplayPython(code, messageElement, blockIndex) {
        console.log('Executing Python block', blockIndex);
        
        // Find the placeholder in this message
        const placeholder = messageElement.querySelector(`.python-pending[data-code-index="${blockIndex}"]`);
        
        if (placeholder) {
            placeholder.innerHTML = '<em>📊 Generating visualization...</em>';
        }

        const result = await this.pythonEngine.runCode(code);
        console.log('Python result:', result.success, result.error || 'no error');

        if (result.success && result.image) {
            console.log('Got image, displaying...');
            // Replace placeholder with the actual image
            if (placeholder) {
                const imgSrc = this.pythonEngine.getImageDataUrl(result.image);
                const downloadBtn = this.languageManager.getString('downloadBtn');
                
                placeholder.outerHTML = `
                    <div class="visual-container">
                        <img src="${imgSrc}" alt="Math Visualization" />
                        <div class="visual-actions">
                            <button class="action-btn download-btn" data-image="${result.image}">${downloadBtn}</button>
                        </div>
                    </div>
                `;
            } else {
                // Fallback: append to message
                console.log('No placeholder found, appending...');
                this.addVisualizationToMessage(messageElement, result.image);
            }
        } else if (result.success && result.stdout && result.stdout.trim()) {
            console.log('Got stdout:', result.stdout);
            if (placeholder) {
                placeholder.outerHTML = `
                    <div class="code-output">
                        <pre>${this.escapeHtml(result.stdout)}</pre>
                    </div>
                `;
            }
        } else if (!result.success) {
            console.error('Python error:', result.error);
            if (placeholder) {
                placeholder.outerHTML = `
                    <div class="python-error">
                        <em>⚠️ Visualization could not be generated</em>
                    </div>
                `;
            }
        } else {
            console.log('No output from Python');
            if (placeholder) {
                placeholder.remove();
            }
        }
    }

    addVisualizationToMessage(messageElement, base64Image) {
        const msgBody = messageElement.querySelector('.msg-body');
        if (!msgBody) return;

        const imgSrc = this.pythonEngine.getImageDataUrl(base64Image);
        const downloadBtn = this.languageManager.getString('downloadBtn');

        const visualDiv = document.createElement('div');
        visualDiv.className = 'visual-container';
        visualDiv.innerHTML = `
            <img src="${imgSrc}" alt="Math Visualization" />
            <div class="visual-actions">
                <button class="action-btn download-btn" data-image="${base64Image}">${downloadBtn}</button>
            </div>
        `;

        msgBody.appendChild(visualDiv);
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

    async callAPI(userMessage, model = 'grok', wantsVisualization = false) {
        const gradeData = this.grades[this.state.currentGrade];
        const lang = this.state.currentLang;
        const langName = this.languageManager.getLanguageName();

        let langInstruction = lang === 'en' ?
            "Reply in English." :
            `Reply in ${langName}.`;

        // Build a very explicit system prompt
        const systemPrompt = `You are a safe, educational AI Math Tutor for ${gradeData.level} students.

RULES:
1. Safety: No violence, hate speech, or personal information requests.
2. No Cheating: Guide students with questions, don't just give answers.
3. Language: ${langInstruction}
4. Tone: ${gradeData.tone}

═══════════════════════════════════════════════════════════════════
VISUALIZATION REQUIREMENT - THIS IS MANDATORY
═══════════════════════════════════════════════════════════════════

When a student asks to SEE, GRAPH, PLOT, DRAW, SHOW, VISUALIZE, DISPLAY, or ILLUSTRATE anything mathematical, you MUST include Python code that creates the visualization.

The Python code will be automatically executed and the student will see the resulting image (not the code).

MANDATORY FORMAT - You MUST use this exact format:

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Your visualization code

save_plot_as_base64()
\`\`\`

CRITICAL REQUIREMENTS:
1. Use triple backticks with "python" language identifier
2. MUST call save_plot_as_base64() at the end
3. Use dark theme: background #1a1a2e, text #f0f0f0
4. Colors: primary #00d4ff, secondary #ff6b6b, accent #d4af37

═══════════════════════════════════════════════════════════════════
EXAMPLES - Follow these patterns exactly:
═══════════════════════════════════════════════════════════════════

EXAMPLE 1 - Linear function:
Student: "Show me a graph of y = 2x"

Your response should include:
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(8, 8))

# Set up coordinate plane
ax.set_xlim(-10, 10)
ax.set_ylim(-10, 10)
ax.axhline(y=0, color='#d4af37', linewidth=1.5)
ax.axvline(x=0, color='#d4af37', linewidth=1.5)
ax.grid(True, alpha=0.3)
ax.set_aspect('equal')

# Plot the line y = 2x
x = np.linspace(-10, 10, 100)
y = 2 * x
ax.plot(x, y, color='#00d4ff', linewidth=2, label='y = 2x')

ax.set_xlabel('x', color='#f0f0f0')
ax.set_ylabel('y', color='#f0f0f0')
ax.set_title('Graph of y = 2x', fontsize=14, color='#d4af37')
ax.legend()

save_plot_as_base64()
\`\`\`

EXAMPLE 2 - Number line inequality:
Student: "Graph x > 3 on a number line"

Your response should include:
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(12, 2.5))

# Draw number line
ax.hlines(0, -2, 10, colors='#f0f0f0', linewidth=2)

# Tick marks and labels
for i in range(-2, 11):
    ax.vlines(i, -0.15, 0.15, colors='#f0f0f0', linewidth=1)
    ax.text(i, -0.4, str(i), ha='center', va='top', fontsize=10, color='#f0f0f0')

# Shade solution region
ax.hlines(0, 3, 10, colors='#00d4ff', linewidth=6)
ax.annotate('', xy=(10.3, 0), xytext=(9.8, 0),
            arrowprops=dict(arrowstyle='->', color='#00d4ff', lw=3))

# Open circle at 3
circle = plt.Circle((3, 0), 0.2, color='#1a1a2e', ec='#00d4ff', linewidth=3, zorder=5)
ax.add_patch(circle)

ax.set_xlim(-2.5, 10.5)
ax.set_ylim(-0.8, 0.6)
ax.axis('off')
ax.set_title('x > 3', fontsize=14, color='#d4af37', pad=15)

save_plot_as_base64()
\`\`\`

EXAMPLE 3 - Bar chart:
Student: "Show me a bar chart"

\`\`\`python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(10, 6))

categories = ['A', 'B', 'C', 'D']
values = [25, 40, 30, 35]
colors = ['#00d4ff', '#ff6b6b', '#d4af37', '#27ae60']

bars = ax.bar(categories, values, color=colors)

for bar, val in zip(bars, values):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
            str(val), ha='center', color='#f0f0f0')

ax.set_ylabel('Value', color='#f0f0f0')
ax.set_title('Bar Chart Example', fontsize=14, color='#d4af37')
ax.set_facecolor('#1a1a2e')
fig.patch.set_facecolor('#1a1a2e')
ax.tick_params(colors='#f0f0f0')
ax.spines['bottom'].set_color('#f0f0f0')
ax.spines['left'].set_color('#f0f0f0')

save_plot_as_base64()
\`\`\`

═══════════════════════════════════════════════════════════════════

AVAILABLE VISUALIZATIONS:
- Coordinate planes with functions (linear, quadratic, etc.)
- Number line inequalities
- Bar charts, pie charts, line graphs, histograms
- Scatter plots
- Geometric shapes (triangles, circles, etc.)
- Angles with measurements
- 3D shapes
- Probability models

HELPER FUNCTION (pre-loaded):
- save_plot_as_base64() - REQUIRED at end of every visualization

${gradeData.constraints}`;

        const recentHistory = this.state.chatHistory.slice(-8);

        // If user wants visualization, add a hint
        let enhancedMessage = userMessage;
        if (wantsVisualization) {
            enhancedMessage = userMessage + "\n\n[System note: User wants a visual. Include Python matplotlib code in your response using ```python code blocks, ending with save_plot_as_base64()]";
        }

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
                        { role: 'user', content: enhancedMessage }
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
        button.textContent = '✓ Copied';
        setTimeout(() => button.textContent = '📋 Copy', 2000);
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

        // For copy/speak, strip out Python code blocks so students get clean text
        const cleanContent = content.replace(/```python[\s\S]*?```/g, '').trim();

        div.innerHTML = `
            <div class="message-content">
                <div class="msg-header">
                    <span class="msg-role">${roleName}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-body">${htmlContent}</div>
                ${role === 'assistant' ? `
                    <div class="msg-actions">
                        <button class="action-btn copy-btn" data-text="${this.escapeHtml(cleanContent)}">${copyBtn}</button>
                        <button class="action-btn speak-btn" data-text="${this.escapeHtml(cleanContent)}">${speakBtn}</button>
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(div);
        this.scrollToBottom();

        return div;
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
