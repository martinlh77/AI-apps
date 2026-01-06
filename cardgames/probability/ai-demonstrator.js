/**
 * AI Probability Demonstrator
 * AI-powered visual probability explainer using cards
 * Part 3 of 5 probability tools
 */

class AIProbabilityDemonstrator {
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
            isProcessing: false,
            lastDemo: null,
            cards: []
        };
        
        // Example questions
        this.exampleQuestions = [
            "What is the probability of drawing a red card?",
            "How likely am I to draw a face card?",
            "What are my chances of getting an ace?",
            "If I draw 2 cards, what's the chance they're the same suit?",
            "What's the probability of NOT drawing a spade?",
            "What's the chance of drawing a heart or a diamond?",
            "How often will I draw an even-numbered card?",
            "What's the probability of drawing a king?",
            "What are the odds of drawing a card higher than 7?",
            "How likely is it to draw a black face card?"
        ];
    }

    setup() {
        // Initialize cards
        this.state.cards = this.engine.createCardArray(this.deck, true);
        
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
            overflow-x: hidden;
            overflow-y: auto;
            padding: 20px;
        `;

        gameBoard.innerHTML = `
            <div class="demo-container">
                <!-- Header -->
                <div class="demo-header">
                    <h1>🤖 AI Probability Demonstrator</h1>
                    <p class="subtitle">Ask a probability question and watch the AI explain it with cards!</p>
                </div>
                
                <!-- Model Selector -->
                <div class="model-selector">
                    <label>AI Model:</label>
                    <select id="model-select">
                        <option value="nova-micro" selected>Nova Micro (Fast ⚡)</option>
                        <option value="qwen-coder">Qwen Coder</option>
                        <option value="mistral">Mistral</option>
                        <option value="gemini-fast">Gemini Fast</option>
                        <option value="openai-fast">OpenAI Fast</option>
                        <option value="grok">Grok</option>
                    </select>
                </div>
                
                <!-- Example Questions -->
                <div class="examples-section">
                    <h3>💡 Example Questions (Click to Try):</h3>
                    <div class="examples-grid" id="examples-grid"></div>
                </div>
                
                <!-- Input Area -->
                <div class="input-section">
                    <div class="input-wrapper">
                        <textarea 
                            id="question-input" 
                            placeholder="Type your probability question here... For example: 'What is the probability of drawing a red card?'"
                            rows="3"
                        ></textarea>
                        <button id="demonstrate-btn" class="primary-btn">
                            <span class="btn-icon">🎯</span>
                            <span class="btn-text">Demonstrate</span>
                        </button>
                    </div>
                    <button id="new-question-btn" class="secondary-btn">✨ New Question</button>
                </div>
                
                <!-- Demo Result Area -->
                <div class="demo-result" id="demo-result" style="display: none;">
                    <!-- Cards Display -->
                    <div class="cards-section">
                        <h3>🎴 Relevant Cards:</h3>
                        <div class="demo-cards" id="demo-cards"></div>
                    </div>
                    
                    <!-- Explanation -->
                    <div class="explanation-section">
                        <h3>📚 Explanation:</h3>
                        <div class="explanation-box" id="explanation-box"></div>
                    </div>
                    
                    <!-- Probability Box -->
                    <div class="probability-box" id="probability-box"></div>
                    
                    <!-- Try This Button -->
                    <div class="action-section">
                        <button id="try-experiment-btn" class="action-btn">
                            📊 Try This Experiment
                            <span class="btn-note">Switch to Basic Experiment app</span>
                        </button>
                    </div>
                </div>
                
                <!-- Loading State -->
                <div class="loading-state" id="loading-state" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>AI is thinking...</p>
                    <p class="loading-subtext">Analyzing your question and finding relevant cards</p>
                </div>
                
                <!-- Error State -->
                <div class="error-state" id="error-state" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <h3>Oops! Something went wrong</h3>
                    <p id="error-message"></p>
                    <div class="error-suggestions">
                        <h4>Try asking questions like:</h4>
                        <ul>
                            <li>"What is the probability of drawing a red card?"</li>
                            <li>"How likely am I to draw a face card?"</li>
                            <li>"What are the chances of getting an ace?"</li>
                        </ul>
                    </div>
                    <button id="retry-btn" class="secondary-btn">Try Again</button>
                </div>
            </div>
        `;

        this.injectStyles();
        this.buildExamplesGrid();
        this.attachEventListeners();
    }

    injectStyles() {
        const existingStyle = document.getElementById('ai-demonstrator-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'ai-demonstrator-styles';
        style.textContent = `
            .demo-container {
                max-width: 1000px;
                margin: 0 auto;
            }
            
            /* Header */
            .demo-header {
                text-align: center;
                margin-bottom: 30px;
            }
            .demo-header h1 {
                color: #d4af37;
                margin: 0 0 10px 0;
                font-size: 2.2rem;
            }
            .subtitle {
                color: #aaa;
                font-size: 1.1rem;
                margin: 0;
            }
            
            /* Model Selector */
            .model-selector {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 30px;
                padding: 15px;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
            }
            .model-selector label {
                color: #d4af37;
                font-weight: bold;
            }
            .model-selector select {
                padding: 10px 15px;
                border-radius: 8px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
                cursor: pointer;
            }
            
            /* Examples Section */
            .examples-section {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
            }
            .examples-section h3 {
                color: #d4af37;
                margin: 0 0 15px 0;
            }
            .examples-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 10px;
            }
            .example-card {
                background: rgba(0,0,0,0.4);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 12px 15px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                font-size: 0.95rem;
            }
            .example-card:hover {
                border-color: #d4af37;
                background: rgba(212, 175, 55, 0.1);
                transform: translateY(-2px);
            }
            
            /* Input Section */
            .input-section {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 30px;
            }
            .input-wrapper {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }
            #question-input {
                flex: 1;
                padding: 15px;
                border-radius: 10px;
                border: 2px solid #444;
                background: #000;
                color: #fff;
                font-size: 1.05rem;
                font-family: inherit;
                resize: vertical;
                transition: border-color 0.3s;
            }
            #question-input:focus {
                outline: none;
                border-color: #d4af37;
            }
            
            /* Buttons */
            .primary-btn {
                padding: 15px 30px;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #d4af37, #f1c40f);
                color: #000;
                font-weight: bold;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
            }
            .primary-btn:hover:not(:disabled) {
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(212, 175, 55, 0.5);
            }
            .primary-btn:disabled {
                background: #555;
                color: #888;
                cursor: not-allowed;
                box-shadow: none;
            }
            .btn-icon {
                font-size: 1.3rem;
            }
            .secondary-btn {
                width: 100%;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                background: #34495e;
                color: white;
                font-weight: bold;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .secondary-btn:hover {
                background: #46627f;
            }
            
            /* Demo Result */
            .demo-result {
                animation: fadeIn 0.5s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Cards Section */
            .cards-section {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
            }
            .cards-section h3 {
                color: #d4af37;
                margin: 0 0 20px 0;
            }
            .demo-cards {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                min-height: 140px;
            }
            .demo-card {
                width: 90px;
                height: 126px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.4);
                transition: transform 0.3s;
                animation: cardAppear 0.4s ease backwards;
            }
            @keyframes cardAppear {
                from { opacity: 0; transform: scale(0.8) rotateY(180deg); }
                to { opacity: 1; transform: scale(1) rotateY(0); }
            }
            .demo-card:hover {
                transform: scale(1.08) translateY(-5px);
            }
            .more-cards {
                display: flex;
                align-items: center;
                justify-content: center;
                color: #d4af37;
                font-weight: bold;
                font-size: 1.2rem;
                background: rgba(212, 175, 55, 0.1);
                border: 2px dashed #d4af37;
                border-radius: 8px;
                width: 90px;
                height: 126px;
                text-align: center;
                padding: 10px;
            }
            
            /* Explanation Section */
            .explanation-section {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
            }
            .explanation-section h3 {
                color: #d4af37;
                margin: 0 0 15px 0;
            }
            .explanation-box {
                background: rgba(0,0,0,0.4);
                border-left: 4px solid #d4af37;
                padding: 20px;
                border-radius: 8px;
                line-height: 1.8;
                font-size: 1.05rem;
            }
            .explanation-box p {
                margin: 0 0 15px 0;
            }
            .explanation-box p:last-child {
                margin-bottom: 0;
            }
            .explanation-box strong {
                color: #f1c40f;
            }
            .explanation-box em {
                color: #00ffcc;
                font-style: normal;
            }
            
            /* Probability Box */
            .probability-box {
                background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(52, 152, 219, 0.2));
                border: 3px solid #2ecc71;
                border-radius: 15px;
                padding: 25px;
                text-align: center;
                margin-bottom: 25px;
            }
            .probability-box .label {
                color: #aaa;
                font-size: 0.9rem;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .probability-box .value {
                color: #2ecc71;
                font-size: 2.5rem;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .probability-box .details {
                color: #bbb;
                font-size: 1.1rem;
            }
            
            /* Action Section */
            .action-section {
                text-align: center;
            }
            .action-btn {
                padding: 18px 35px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                font-weight: bold;
                font-size: 1.15rem;
                cursor: pointer;
                transition: all 0.3s;
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
            }
            .action-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 20px rgba(52, 152, 219, 0.5);
            }
            .btn-note {
                font-size: 0.8rem;
                font-weight: normal;
                opacity: 0.8;
            }
            
            /* Loading State */
            .loading-state {
                text-align: center;
                padding: 60px 20px;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
            }
            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(212, 175, 55, 0.2);
                border-top-color: #d4af37;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .loading-state p {
                color: #d4af37;
                font-size: 1.3rem;
                font-weight: bold;
                margin: 10px 0;
            }
            .loading-subtext {
                color: #aaa !important;
                font-size: 1rem !important;
                font-weight: normal !important;
            }
            
            /* Error State */
            .error-state {
                text-align: center;
                padding: 40px 20px;
                background: rgba(231, 76, 60, 0.1);
                border: 2px solid #e74c3c;
                border-radius: 12px;
            }
            .error-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }
            .error-state h3 {
                color: #e74c3c;
                margin: 0 0 15px 0;
            }
            .error-state p {
                color: #bbb;
                margin-bottom: 20px;
            }
            .error-suggestions {
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }
            .error-suggestions h4 {
                color: #d4af37;
                margin: 0 0 10px 0;
            }
            .error-suggestions ul {
                margin: 0;
                padding-left: 25px;
                color: #aaa;
            }
            .error-suggestions li {
                margin-bottom: 8px;
            }
            
            /* Mobile Responsive */
            @media (max-width: 700px) {
                .demo-header h1 {
                    font-size: 1.6rem;
                }
                .subtitle {
                    font-size: 0.95rem;
                }
                .input-wrapper {
                    flex-direction: column;
                }
                .primary-btn {
                    width: 100%;
                    justify-content: center;
                }
                .demo-card {
                    width: 70px;
                    height: 98px;
                }
                .more-cards {
                    width: 70px;
                    height: 98px;
                    font-size: 1rem;
                }
                .probability-box .value {
                    font-size: 2rem;
                }
                .examples-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    buildExamplesGrid() {
        const grid = document.getElementById('examples-grid');
        grid.innerHTML = '';
        
        // Show 6 random examples
        const shuffled = [...this.exampleQuestions].sort(() => Math.random() - 0.5);
        const displayed = shuffled.slice(0, 6);
        
        displayed.forEach(question => {
            const card = document.createElement('div');
            card.className = 'example-card';
            card.textContent = question;
            card.onclick = (e) => {
                e.stopPropagation();
                document.getElementById('question-input').value = question;
            };
            grid.appendChild(card);
        });
    }

    attachEventListeners() {
        document.getElementById('model-select').onchange = (e) => {
            e.stopPropagation();
            this.currentModel = e.target.value;
        };
        
        document.getElementById('demonstrate-btn').onclick = (e) => {
            e.stopPropagation();
            this.runDemonstration();
        };
        
        document.getElementById('new-question-btn').onclick = (e) => {
            e.stopPropagation();
            this.resetDemo();
        };
        
        document.getElementById('try-experiment-btn').onclick = (e) => {
            e.stopPropagation();
            this.setupExperiment();
        };
        
        document.getElementById('retry-btn').onclick = (e) => {
            e.stopPropagation();
            this.resetDemo();
        };
        
        // Enter key to submit
        document.getElementById('question-input').onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.runDemonstration();
            }
        };
    }

    async runDemonstration() {
        const question = document.getElementById('question-input').value.trim();
        
        if (!question) {
            alert('Please enter a probability question!');
            return;
        }
        
        if (this.state.isProcessing) return;
        
        this.state.isProcessing = true;
        
        // Show loading state
        document.getElementById('demo-result').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('loading-state').style.display = 'block';
        
        // Disable button
        document.getElementById('demonstrate-btn').disabled = true;
        
        try {
            const response = await this.callAI(question);
            this.displayDemo(response);
        } catch (error) {
            console.error('AI Error:', error);
            this.showError(error.message);
        } finally {
            this.state.isProcessing = false;
            document.getElementById('demonstrate-btn').disabled = false;
            document.getElementById('loading-state').style.display = 'none';
        }
    }

    async callAI(question) {
        const systemPrompt = `You are a 7th-grade mathematics teacher specializing in probability. 
When given a probability question about playing cards, you must:

1. Identify which specific cards are relevant to the question
2. Explain the probability calculation step by step at a 7th-grade level
3. Format your response as JSON with this exact structure:

{
  "cards": ["hearts-ace", "hearts-king", "diamonds-queen"],
  "explanation": "Step-by-step explanation here...",
  "favorable_outcomes": 12,
  "total_outcomes": 52,
  "fraction": "12/52",
  "simplified_fraction": "3/13",
  "percentage": "23.1"
}

CARD FORMAT: Use suit-rank format:
- Suits: hearts, diamonds, clubs, spades
- Ranks: ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, jack, queen, king, joker
- Examples: "hearts-ace", "spades-10", "diamonds-jack", "clubs-joker"

EXPLANATION GUIDELINES:
- Use simple 7th-grade vocabulary
- Break into clear steps
- Use bold for key terms (wrap in ** **)
- Use emphasis for numbers (wrap in * *)
- Be encouraging and friendly
- Use real-world analogies

ONLY return valid JSON. No other text before or after.`;

        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(question);
        const encodedSystem = encodeURIComponent(systemPrompt);
        const url = `${this.API_BASE}/${encodedPrompt}?model=${this.currentModel}&seed=${seed}&key=${this.API_KEY}&system=${encodedSystem}&json=true`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('AI service returned an error. Please try again.');
            }
            
            const text = await response.text();
            
            // Try to parse JSON
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                // Try to extract JSON from text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Could not parse AI response. Please try rephrasing your question.');
                }
            }
            
            // Validate data structure
            if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
                throw new Error('AI did not identify any cards. Please try a clearer question.');
            }
            
            if (!data.explanation) {
                throw new Error('AI did not provide an explanation. Please try again.');
            }
            
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    }

    displayDemo(data) {
        this.state.lastDemo = data;
        
        // Show result area
        document.getElementById('demo-result').style.display = 'block';
        
        // Display cards
        this.displayCards(data.cards);
        
        // Display explanation
        this.displayExplanation(data.explanation);
        
        // Display probability
        this.displayProbability(data);
        
        // Scroll to result
        document.getElementById('demo-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    displayCards(cardIds) {
        const container = document.getElementById('demo-cards');
        container.innerHTML = '';
        
        const maxDisplay = 10;
        const displayCards = cardIds.slice(0, maxDisplay);
        const remaining = cardIds.length - maxDisplay;
        
        displayCards.forEach((cardId, index) => {
            const [suit, rank] = cardId.split('-');
            const card = this.state.cards.find(c => 
                c.suit === suit && c.rank.toLowerCase() === rank.toLowerCase()
            );
            
            if (card) {
                const cardEl = this.engine.renderCard(card, true);
                cardEl.classList.add('demo-card');
                cardEl.style.animationDelay = `${index * 0.1}s`;
                
                // Mobile responsive sizing
                const isMobile = window.innerWidth < 700;
                if (isMobile) {
                    cardEl.style.width = '70px';
                    cardEl.style.height = '98px';
                    cardEl.style.fontSize = '0.7rem';
                }
                
                container.appendChild(cardEl);
            }
        });
        
        if (remaining > 0) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'more-cards';
            moreDiv.textContent = `...and ${remaining} more`;
            container.appendChild(moreDiv);
        }
    }

    displayExplanation(explanation) {
        const container = document.getElementById('explanation-box');
        
        // Process markdown-style formatting
        let formatted = explanation
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Emphasis
            .replace(/\n\n/g, '</p><p>') // Paragraphs
            .replace(/\n/g, '<br>'); // Line breaks
        
        container.innerHTML = `<p>${formatted}</p>`;
    }

    displayProbability(data) {
        const container = document.getElementById('probability-box');
        
        const fraction = data.simplified_fraction || data.fraction || 'N/A';
        const percentage = data.percentage || '0';
        const favorable = data.favorable_outcomes || 0;
        const total = data.total_outcomes || 52;
        
        container.innerHTML = `
            <div class="label">Theoretical Probability</div>
            <div class="value">${percentage}%</div>
            <div class="details">
                ${fraction} = ${favorable} favorable outcomes out of ${total} total cards
            </div>
        `;
    }

    showError(message) {
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('error-message').textContent = message;
    }

    resetDemo() {
        document.getElementById('question-input').value = '';
        document.getElementById('demo-result').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('loading-state').style.display = 'none';
        this.state.lastDemo = null;
        
        // Regenerate examples
        this.buildExamplesGrid();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setupExperiment() {
        // This would ideally switch to the Basic Experiment app
        // For now, just show a message
        alert('This would switch you to the Basic Probability Experiment app with this scenario pre-configured!\n\nIn a full implementation, this would communicate with the main Card Game Engine to load the appropriate app.');
    }

    handleResize() {
        // Responsive adjustments
        const isMobile = window.innerWidth < 700;
        
        document.querySelectorAll('.demo-card').forEach(card => {
            card.style.width = isMobile ? '70px' : '90px';
            card.style.height = isMobile ? '98px' : '126px';
        });
    }

    render() {
        // Rendering handled by buildUI and display methods
    }

    updateStats() {
        // No stats to update for this app
    }

    pause() {
        // No animations to pause
    }

    cleanup() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        const styleElement = document.getElementById('ai-demonstrator-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['probability-ai-demonstrator-v1'] = AIProbabilityDemonstrator;