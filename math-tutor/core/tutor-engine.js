/**
 * TutorEngine - Main Conversation & Coordination Controller
 * Manages chat, multi-model API routing, Python execution, TTS, uploads, and drawing
 */

class TutorEngine {
    constructor() {
        this.API_KEY = 'pk_8CQPK8dxqANijjhy';
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
                tone: "very friendly, encouraging, and simple",
                constraints: "Use VERY simple sentences. One idea at a time. Use everyday examples. Keep responses SHORT (2-3 sentences max for initial explanations). Avoid big words.",
                mathTopics: "basic arithmetic, simple fractions, shapes, measurement",
                responseStyle: "Brief and clear. Let the student ask follow-up questions."
            },
            middle: {
                level: "Middle School (Grades 6-8)",
                tone: "helpful, supportive, and clear",
                constraints: "Use clear explanations. Keep initial responses concise (3-4 sentences). Introduce algebraic thinking. Use real-world examples.",
                mathTopics: "algebra basics, coordinate planes, ratios, statistics",
                responseStyle: "Moderate length. Encourage questions."
            },
            high: {
                level: "High School (Grades 9-12)",
                tone: "professional but approachable",
                constraints: "Use standard mathematical terminology. Encourage problem-solving. Can be more detailed when needed.",
                mathTopics: "algebra, geometry, trigonometry, pre-calculus",
                responseStyle: "Thorough but not overwhelming."
            },
            general: {
                level: "General / College",
                tone: "academic and precise",
                constraints: "Full mathematical rigor. Advanced notation acceptable. Detailed explanations welcome.",
                mathTopics: "all topics including calculus, statistics, linear algebra",
                responseStyle: "Comprehensive and rigorous."
            }
        };

        this.state = {
            chatHistory: [],
            isProcessing: false,
            currentGrade: 'middle',
            currentLang: 'en',
            currentVoice: 'alloy',
            pendingImage: null, // For image uploads
            currentConversationId: null,
            messageImages: {} // Store images by message index
        };

        this.languageManager = new LanguageManager();
        this.messageParser = new MessageParser();
        this.appLoader = new AppLoader();
        this.pythonEngine = window.pythonEngine;
        this.contentFilter = window.contentFilter;
        this.conversationManager = window.conversationManager;

        this.init();
    }

    async init() {
        await this.languageManager.initPromise;
        await this.contentFilter.initPromise;

        const savedGrade = localStorage.getItem('mathTutorGrade') || 'middle';
        const savedLang = localStorage.getItem('mathTutorLang') || 'en';
        const savedVoice = localStorage.getItem('mathTutorVoice') || 'alloy';
        const savedTheme = localStorage.getItem('mathTutorTheme') || 'dark';

        this.state.currentGrade = savedGrade;
        this.state.currentLang = savedLang;
        this.state.currentVoice = savedVoice;

        document.getElementById('grade-select').value = savedGrade;
        document.getElementById('lang-select').value = savedLang;
        document.getElementById('voice-select').value = savedVoice;
        
        this.applyTheme(savedTheme);
        await this.languageManager.applyLanguage(savedLang);
        this.languageManager.renderStarterPrompts(savedGrade);

        this.pythonEngine.initialize();

        this.setupEventListeners();
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('mathTutorTheme', theme);
        
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    setupEventListeners() {
        // Grade select
        document.getElementById('grade-select').addEventListener('change', (e) => {
            this.state.currentGrade = e.target.value;
            localStorage.setItem('mathTutorGrade', e.target.value);
            this.startNewChat();
        });

        // Voice select
        document.getElementById('voice-select').addEventListener('change', (e) => {
            this.state.currentVoice = e.target.value;
            localStorage.setItem('mathTutorVoice', e.target.value);
        });

        // Language select
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

        // Other language input
        document.getElementById('other-lang-input').addEventListener('change', async (e) => {
            if (e.target.value.trim()) {
                const langName = e.target.value.trim();
                this.state.currentLang = langName;
                localStorage.setItem('mathTutorLang', langName);
                await this.languageManager.translateAndApply(langName, `${this.API_BASE}/text`, this.API_KEY);
                this.startNewChat();
            }
        });

        // Theme toggle
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Conversations button
        document.getElementById('conversations-btn').addEventListener('click', () => {
            this.showConversationsModal();
        });

        // New chat
        document.getElementById('new-chat-btn').addEventListener('click', () => this.startNewChat());

        // Send button
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

        // File upload
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('file-upload').click();
        });

        document.getElementById('file-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Camera upload
        document.getElementById('camera-btn').addEventListener('click', () => {
            document.getElementById('camera-upload').click();
        });

        document.getElementById('camera-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Remove upload preview
        document.getElementById('remove-upload').addEventListener('click', () => {
            this.clearPendingImage();
        });

        // Drawing tool button
        document.getElementById('draw-btn').addEventListener('click', () => {
            this.openDrawingTool();
        });

        // Conversation modal buttons
        document.getElementById('close-conversations').addEventListener('click', () => {
            document.getElementById('conversations-modal').style.display = 'none';
        });

        document.getElementById('save-current-chat').addEventListener('click', () => {
            this.saveCurrentConversation();
        });

        // Message action buttons (delegated)
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

    // ==================== IMAGE HANDLING ====================

    handleFileUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.addSystemMessage('⚠️ Please upload an image file (JPG, PNG, etc.)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.state.pendingImage = e.target.result;
            
            // Show preview
            const preview = document.getElementById('upload-preview');
            const previewImg = document.getElementById('preview-image');
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    clearPendingImage() {
        this.state.pendingImage = null;
        const preview = document.getElementById('upload-preview');
        preview.style.display = 'none';
        
        // Clear file inputs
        document.getElementById('file-upload').value = '';
        document.getElementById('camera-upload').value = '';
    }

    // ==================== DRAWING TOOL ====================

    openDrawingTool(options = {}) {
        if (window.drawingTool) {
            window.drawingTool.open({
                ...options,
                onSubmit: (imageData) => {
                    this.handleDrawingSubmission(imageData);
                }
            });
        }
    }

handleDrawingSubmission(imageDataUrl) {
    // Set the drawing as pending image (DO NOT auto-send)
    this.state.pendingImage = imageDataUrl;
    
    // Show preview
    const preview = document.getElementById('upload-preview');
    const previewImg = document.getElementById('preview-image');
    previewImg.src = imageDataUrl;
    preview.style.display = 'block';
    
    // Focus input for user to add their comment/question
    const input = document.getElementById('chat-input');
    input.focus();
}}

    // ==================== CONVERSATIONS ====================

    async showConversationsModal() {
        const modal = document.getElementById('conversations-modal');
        const list = document.getElementById('conversations-list');
        
        modal.style.display = 'flex';
        list.innerHTML = '<div class="loading">Loading...</div>';
        
        try {
            const conversations = await this.conversationManager.getConversations();
            
            if (conversations.length === 0) {
                list.innerHTML = '<div class="no-conversations">No saved conversations yet.</div>';
            } else {
                list.innerHTML = conversations.map(conv => `
                    <div class="conversation-item" data-id="${conv.id}">
                        <div class="conversation-info">
                            <div class="conversation-name">${this.escapeHtml(conv.name)}</div>
                            <div class="conversation-date">${new Date(conv.date).toLocaleString()} • ${conv.messageCount} messages</div>
                        </div>
                        <div class="conversation-actions">
                            <button class="rename-conv-btn" title="Rename">✏️</button>
                            <button class="delete-btn delete-conv-btn" title="Delete">🗑️</button>
                        </div>
                    </div>
                `).join('');
                
                // Add event listeners
                list.querySelectorAll('.conversation-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (!e.target.closest('.conversation-actions')) {
                            this.loadConversation(item.dataset.id);
                        }
                    });
                });
                
                list.querySelectorAll('.rename-conv-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const item = btn.closest('.conversation-item');
                        this.renameConversation(item.dataset.id);
                    });
                });
                
                list.querySelectorAll('.delete-conv-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const item = btn.closest('.conversation-item');
                        this.deleteConversation(item.dataset.id);
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            list.innerHTML = '<div class="no-conversations">Error loading conversations.</div>';
        }
    }

    async saveCurrentConversation() {
        if (this.state.chatHistory.length === 0) {
            this.addSystemMessage('Nothing to save yet!');
            return;
        }
        
        const name = prompt('Name this conversation:', 
            'Chat ' + new Date().toLocaleDateString());
        
        if (!name) return;
        
        try {
            const id = await this.conversationManager.saveConversation({
                id: this.state.currentConversationId,
                name: name,
                messages: this.state.chatHistory,
                images: this.state.messageImages,
                grade: this.state.currentGrade,
                lang: this.state.currentLang
            });
            
            this.state.currentConversationId = id;
            this.addSystemMessage('💾 Conversation saved!');
            
            // Refresh modal if open
            if (document.getElementById('conversations-modal').style.display === 'flex') {
                this.showConversationsModal();
            }
        } catch (error) {
            console.error('Failed to save conversation:', error);
            this.addSystemMessage('❌ Failed to save conversation.');
        }
    }

    async loadConversation(id) {
        try {
            const conv = await this.conversationManager.loadConversation(id);
            if (!conv) return;
            
            // Clear current chat
            document.getElementById('messages-container').innerHTML = '';
            document.getElementById('welcome-screen').style.display = 'none';
            
            this.state.chatHistory = conv.messages || [];
            this.state.messageImages = conv.images || {};
            this.state.currentConversationId = id;
            
            // Update grade/lang if different
            if (conv.grade) {
                this.state.currentGrade = conv.grade;
                document.getElementById('grade-select').value = conv.grade;
            }
            
            // Rebuild messages
            conv.messages.forEach((msg, index) => {
                this.addMessage(msg.content, msg.role, {
                    image: this.state.messageImages[index]
                });
            });
            
            // Close modal
            document.getElementById('conversations-modal').style.display = 'none';
            
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to load conversation:', error);
            this.addSystemMessage('❌ Failed to load conversation.');
        }
    }

    async renameConversation(id) {
        const name = prompt('New name:');
        if (!name) return;
        
        await this.conversationManager.renameConversation(id, name);
        this.showConversationsModal();
    }

    async deleteConversation(id) {
        if (!confirm('Delete this conversation?')) return;
        
        await this.conversationManager.deleteConversation(id);
        
        if (this.state.currentConversationId === id) {
            this.state.currentConversationId = null;
        }
        
        this.showConversationsModal();
    }

    // ==================== MESSAGING ====================

    detectQueryType(message) {
        const lowerMsg = message.toLowerCase();

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

        if (!message && !this.state.pendingImage) return;
        if (this.state.isProcessing) return;

        // Check content filter
        const filterResult = await this.contentFilter.checkContent(message);
        if (filterResult.isBlocked) {
            this.addSystemMessage(`⚠️ ${filterResult.reason}`);
            return;
        }

        // Check for PII
        if (this.containsPII(message)) {
            this.addSystemMessage(
                "⚠️ Please do not share personal information like your email, phone number, or address. I am here to help with math!"
            );
            return;
        }

        document.getElementById('welcome-screen').style.display = 'none';

        // Create message content for display
        const hasImage = !!this.state.pendingImage;
        const messageIndex = this.state.chatHistory.length;
        
        // Store image for this message
        if (hasImage) {
            this.state.messageImages[messageIndex] = this.state.pendingImage;
        }

        this.addMessage(message || 'Image uploaded', 'user', {
            image: this.state.pendingImage
        });
        
        input.value = '';
        input.style.height = 'auto';

        this.setProcessing(true);
        const typingId = this.addTypingIndicator();

        try {
            const queryType = this.detectQueryType(message);
            const wantsVisual = this.needsVisualization(message);
            const hasImageAttachment = hasImage;

            console.log('Query type:', queryType, 'Wants visual:', wantsVisual, 'Has image:', hasImageAttachment);
            console.log('Calling API...'); 
            let response;
            
            if (hasImageAttachment) {
                // Use vision model for image analysis
                response = await this.callVisionAPI(message, this.state.pendingImage);
                this.clearPendingImage();
            } else {
                response = await this.callAPI(message, this.models[queryType], wantsVisual);
            }

            this.removeTypingIndicator(typingId);

            console.log('API Response:', response);

            // Extract Python code blocks
            const pythonBlocks = this.messageParser.extractPythonCode(response);
            console.log('Python blocks found:', pythonBlocks.length);

            // Add assistant message
            const messageElement = this.addMessage(response, 'assistant');

            // Update history
            this.state.chatHistory.push({ 
                role: 'user', 
                content: message || 'Image uploaded',
                hasImage: hasImageAttachment
            });
            this.state.chatHistory.push({ role: 'assistant', content: response });

            // Auto-execute Python visualization code
            if (pythonBlocks.length > 0) {
                console.log('Executing Python blocks...');
                for (let i = 0; i < pythonBlocks.length; i++) {
                    const block = pythonBlocks[i];
                    await this.executeAndDisplayPython(block.code, messageElement, i);
                }
            }

            // Check if tutor wants student to use drawing tool
            this.checkForDrawingTask(response);

        } catch (error) {
            console.error('API Error:', error);
            this.removeTypingIndicator(typingId);
            this.clearPendingImage();
            this.addSystemMessage(
                "❌ I encountered a network error. Please check your connection and try again!"
            );
        } finally {
            this.setProcessing(false);
        }
    }

    checkForDrawingTask(response) {
        const lowerResponse = response.toLowerCase();
        const drawingKeywords = ['draw', 'plot a point', 'graph it', 'sketch', 'show your work', 'try graphing'];
        
        if (drawingKeywords.some(kw => lowerResponse.includes(kw)) && 
            (lowerResponse.includes('your turn') || lowerResponse.includes('try it') || lowerResponse.includes('now you'))) {
            // Suggest opening drawing tool
            setTimeout(() => {
                this.addSystemMessage('💡 Tip: Click the ✏️ button to open the drawing tool and show your work!');
            }, 1000);
        }
    }

    async callVisionAPI(message, imageData) {
        const gradeData = this.grades[this.state.currentGrade];
        const langName = this.languageManager.getLanguageName();

        const systemPrompt = `You are a helpful math tutor reviewing a student's work. 
Grade level: ${gradeData.level}
Tone: ${gradeData.tone}
Language: Reply in ${langName}.

When reviewing student work:
1. Identify what the student has drawn or written
2. Point out what they did correctly (be encouraging!)
3. Gently correct any mistakes
4. Give a helpful tip for improvement if needed
5. ${gradeData.responseStyle}`;

        try {
            const response = await fetch(`${this.API_BASE}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: this.models.vision,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { 
                            role: 'user', 
                            content: [
                                { type: 'text', text: message || 'Please review my work.' },
                                { 
                                    type: 'image_url', 
                                    image_url: { url: imageData }
                                }
                            ]
                        }
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
            console.error('Vision API call failed:', error);
            throw error;
        }
    }

    async executeAndDisplayPython(code, messageElement, blockIndex) {
        console.log('Executing Python block', blockIndex);
        
        // Inject theme colors into Python code
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        const themedCode = this.injectThemeColors(code, isDark);
        
        const placeholder = messageElement.querySelector(`.python-pending[data-code-index="${blockIndex}"]`);
        
        if (placeholder) {
            placeholder.innerHTML = '<em>📊 Generating visualization...</em>';
        }

        const result = await this.pythonEngine.runCode(themedCode);
        console.log('Python result:', result.success, result.error || 'no error');

        if (result.success && result.image) {
            console.log('Got image, displaying...');
            if (placeholder) {
                const imgSrc = this.pythonEngine.getImageDataUrl(result.image);
                const downloadBtn = this.languageManager.getString('downloadBtn');
                
                placeholder.outerHTML = `
                    <div class="visual-container">
                        <img src="${imgSrc}" alt="Math Visualization" />
                        <div class="visual-actions">
                            <button class="action-btn download-btn" data-image="${result.image}">${downloadBtn}</button>
                            <button class="action-btn" onclick="window.mathTutor.openDrawingWithBackground('${imgSrc}')">✏️ Draw on this</button>
                        </div>
                    </div>
                `;
            } else {
                this.addVisualizationToMessage(messageElement, result.image);
            }
        } else if (result.success && result.stdout && result.stdout.trim()) {
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
            if (placeholder) {
                placeholder.remove();
            }
        }
    }

    injectThemeColors(code, isDark) {
        // Replace color values based on theme
        if (!isDark) {
            // Light theme replacements
            code = code.replace(/#1a1a2e/g, '#ffffff');
            code = code.replace(/'#1a1a2e'/g, "'#ffffff'");
            code = code.replace(/#16213e/g, '#f5f7fa');
            code = code.replace(/#f0f0f0/g, '#1a1a2e');
            code = code.replace(/'#f0f0f0'/g, "'#1a1a2e'");
            code = code.replace(/#444444/g, '#cccccc');
            code = code.replace(/'#444'/g, "'#ccc'");
            
            // Also update matplotlib style
            code = code.replace("plt.style.use('dark_background')", "plt.style.use('default')");
        }
        return code;
    }

    openDrawingWithBackground(imageDataUrl) {
        if (window.drawingTool) {
            window.drawingTool.open({
                backgroundImage: imageDataUrl,
                clear: true,
                onSubmit: (imageData) => {
                    this.handleDrawingSubmission(imageData);
                }
            });
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
                <button class="action-btn" onclick="window.mathTutor.openDrawingWithBackground('${imgSrc}')">✏️ Draw on this</button>
            </div>
        `;

        msgBody.appendChild(visualDiv);
    }

    async callAPI(userMessage, model = 'grok', wantsVisualization = false) {
        const gradeData = this.grades[this.state.currentGrade];
        const lang = this.state.currentLang;
        const langName = this.languageManager.getLanguageName();
        const isDark = document.body.getAttribute('data-theme') !== 'light';

        let langInstruction = lang === 'en' ?
            "Reply in English." :
            `Reply in ${langName}.`;

        // Theme-aware color definitions
        const bgColor = isDark ? '#1a1a2e' : '#ffffff';
        const textColor = isDark ? '#f0f0f0' : '#1a1a2e';
        const gridColor = isDark ? '#444444' : '#cccccc';

        const systemPrompt = `You are a safe, educational AI Math Tutor for ${gradeData.level} students.

CRITICAL RULES:
1. Safety: No violence, hate speech, or personal information requests.
2. No Cheating: Guide students with questions, don't just give answers.
3. Language: ${langInstruction}
4. Tone: ${gradeData.tone}
5. Response Style: ${gradeData.responseStyle}

RESPONSE LENGTH GUIDELINES:
- For ${gradeData.level}: ${gradeData.constraints}
- Let students ask follow-up questions for more detail
- Don't overwhelm with information upfront

═══════════════════════════════════════════════════════════════════
VISUALIZATION - INCLUDE PYTHON CODE WHEN VISUAL IS REQUESTED
═══════════════════════════════════════════════════════════════════

When a student asks to SEE, GRAPH, PLOT, DRAW, SHOW, or VISUALIZE something, include Python matplotlib code.

THEME COLORS (current theme: ${isDark ? 'dark' : 'light'}):
- Background: ${bgColor}
- Text/labels: ${textColor}
- Grid: ${gridColor}
- Primary (lines): #00d4ff
- Secondary (points): #ff6b6b
- Accent (titles): #d4af37

FORMAT - Use exactly this structure:

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Set theme
plt.style.use('${isDark ? 'dark_background' : 'default'}')
plt.rcParams['figure.facecolor'] = '${bgColor}'
plt.rcParams['axes.facecolor'] = '${bgColor}'
plt.rcParams['text.color'] = '${textColor}'
plt.rcParams['axes.labelcolor'] = '${textColor}'
plt.rcParams['xtick.color'] = '${textColor}'
plt.rcParams['ytick.color'] = '${textColor}'

fig, ax = plt.subplots(figsize=(8, 6))

# Your visualization code here

ax.set_title("Title", color='#d4af37')
save_plot_as_base64()
\`\`\`

INTERACTIVE EXERCISES:
When appropriate, you can ask students to:
- "Try plotting this point on the grid" (they can use the drawing tool)
- "Draw a line through these points" (they can use the drawing tool)
- "Upload a photo of your work" (they can use camera/upload)

${gradeData.mathTopics}`;

        const recentHistory = this.state.chatHistory.slice(-8);

        let enhancedMessage = userMessage;
        if (wantsVisualization) {
            enhancedMessage = userMessage + "\n\n[Include a Python matplotlib visualization in your response]";
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
                        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
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

    addMessage(content, role, options = {}) {
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

        // For copy/speak - get ALL text content, not just partial
        // Strip Python code blocks and get clean text
        const cleanContent = content
            .replace(/```python[\s\S]*?```/g, '[Visualization]')
            .replace(/```[\s\S]*?```/g, '')
            .trim();

        // Build image HTML if present
        let imageHtml = '';
        if (options.image) {
            imageHtml = `<img src="${options.image}" class="message-image" alt="Uploaded image" onclick="window.open(this.src)" />`;
        }

        div.innerHTML = `
            <div class="message-content">
                <div class="msg-header">
                    <span class="msg-role">${roleName}</span>
                    <span class="msg-time">${time}</span>
                </div>
                ${imageHtml}
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
                        <button class="action-btn" onclick="window.mathTutor.openDrawingWithBackground('${imgSrc}')">✏️ Draw on this</button>
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

    addSystemMessage(content) {
        const container = document.getElementById('messages-container');
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.style.opacity = '0.8';
        div.innerHTML = `
            <div class="message-content" style="border-style: dashed; border-color: var(--accent-color);">
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
        this.state.currentConversationId = null;
        this.state.messageImages = {};
        this.clearPendingImage();
        
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
