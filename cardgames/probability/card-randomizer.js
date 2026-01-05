/**
 * Card Probability Randomizer
 * Interactive probability simulator using playing cards
 * Designed for 7th-grade mathematics education
 */

class CardProbabilityRandomizer {
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
            // Deck configuration
            numDecks: 1,
            includeJokers: false,
            selectedCards: [],
            availableCards: [],
            workingDeck: [],
            
            // Experiment settings
            cardsToFlip: 1,
            autoFlipCount: 10,
            currentRound: 1,
            isRunning: false,
            stopRequested: false,
            
            // Results tracking
            results: [],
            roundResults: {},
            grandTotals: {},
            totalFlips: 0,
            
            // Probability mode
            probabilityMode: 'basic',
            modeParams: {},
            
            // Card selection mode
            selectionMode: 'all',
            selectedSuits: ['hearts', 'diamonds', 'clubs', 'spades'],
            selectedRanks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
            selectedIndividualCards: [],
            selectedDecks: [0, 1, 2, 3, 4, 5, 6, 7], // All deck indexes by default
            
            // Target card for specific selection
            targetCard: null,
            
            // UI state
            currentTab: 'experiment',
            settingsOpen: false,
            
            // Chat state
            chatHistory: [],
            chatTokenCount: 0,
            maxTokens: 4096
        };
        
        // Constants
        this.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.RANK_VALUES = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'Joker': 0
        };
        this.PRIMES = [2, 3, 5, 7, 11, 13];
    }

    setup() {
        // Initialize available cards from deck
        this.initializeCards();
        
        // Set up resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = () => this.handleResize();
        window.addEventListener('resize', this.resizeHandler);
        
        // Build UI
        this.buildUI();
        this.updateWorkingDeck();
        this.updateTableHeaders();
        this.render();
    }

    initializeCards() {
        // Create card array with jokers option
        this.state.availableCards = this.engine.createCardArray(this.deck, true);
        this.state.selectedCards = [...this.state.availableCards];
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
        `;

        gameBoard.innerHTML = `
            <!-- Settings Gear Button -->
            <div id="settings-btn" class="settings-gear">⚙️</div>
            
            <!-- Settings Menu Modal -->
            <div id="settings-menu" class="settings-modal" style="display: none;">
                <div class="settings-content">
                    <span class="close-settings">&times;</span>
                    <h3>Settings</h3>
                    
                    <!-- Deck Configuration -->
                    <button class="collapsible active">Deck Configuration</button>
                    <div class="collapsible-content" style="display: block;">
                        <div class="input-group">
                            <label>Number of Decks (1-8):</label>
                            <input type="number" id="num-decks" value="1" min="1" max="8">
                        </div>
                        <div class="input-group">
                            <label>Include Jokers:</label>
                            <div class="toggle-container">
                                <span>No</span>
                                <div class="toggle" id="joker-toggle">
                                    <div class="toggle-slider"></div>
                                </div>
                                <span>Yes</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Card Selection -->
                    <button class="collapsible">Card Selection</button>
                    <div class="collapsible-content">
                        <div class="input-group">
                            <label>Selection Mode:</label>
                            <select id="selection-mode">
                                <option value="all">All Cards</option>
                                <option value="suit">By Suit</option>
                                <option value="rank">By Rank</option>
                                <option value="individual">Individual Cards</option>
                                <option value="deck">By Deck</option>
                            </select>
                        </div>
                        <div id="selection-options"></div>
                    </div>
                    
                    <!-- Target Card Selection -->
                    <button class="collapsible">Target Card (What to Look For)</button>
                    <div class="collapsible-content">
                        <div class="input-group">
                            <label>Select specific card to find:</label>
                            <div class="target-card-grid" id="target-card-grid"></div>
                        </div>
                    </div>
                    
                    <!-- AI Model Selection -->
                    <button class="collapsible">AI Settings</button>
                    <div class="collapsible-content">
                        <div class="input-group">
                            <label>AI Model:</label>
                            <select id="ai-model">
                                <option value="nova-micro" selected>Nova Micro (Fast)</option>
                                <option value="qwen-coder">Qwen Coder</option>
                                <option value="mistral">Mistral</option>
                                <option value="gemini-fast">Gemini Fast</option>
                                <option value="openai-fast">OpenAI Fast</option>
                                <option value="grok">Grok</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tab Navigation -->
            <div class="tab-nav">
                <button class="tab-btn active" data-tab="experiment">🎴 Experiment</button>
                <button class="tab-btn" data-tab="presets">📊 Presets</button>
                <button class="tab-btn" data-tab="ai-demo">🤖 AI Demo</button>
                <button class="tab-btn" data-tab="tutor">💬 AI Tutor</button>
            </div>
            
            <!-- Main Content Area -->
            <div class="main-content">
                <!-- Experiment Tab -->
                <div id="experiment-tab" class="tab-content active">
                    <div class="experiment-container">
                        <!-- Card Display Area -->
                        <div class="card-display-area" id="card-display">
                            <div class="deck-pile" id="deck-pile">
                                <div class="deck-count">Cards: <span id="deck-count-num">52</span></div>
                            </div>
                            <div class="flip-area" id="flip-area">
                                <p class="hint-text">Flipped cards appear here</p>
                            </div>
                        </div>
                        
                        <!-- Controls -->
                        <div class="controls-panel">
                            <div class="control-row">
                                <label>Cards to Flip:</label>
                                <input type="number" id="cards-to-flip" value="1" min="1" max="10">
                            </div>
                            <div class="control-row">
                                <label>Auto-Flip Count:</label>
                                <input type="number" id="auto-flip-count" value="10" min="1" max="1000">
                            </div>
                            <div class="btn-group">
                                <button id="flip-btn" class="primary-btn">🎴 Flip Cards</button>
                                <button id="auto-flip-btn" class="primary-btn">⚡ Auto Flip</button>
                                <button id="stop-btn" class="secondary-btn" disabled>⏹ Stop</button>
                            </div>
                            <div class="btn-group">
                                <button id="add-row-btn" class="secondary-btn">➕ New Round</button>
                                <button id="clear-btn" class="secondary-btn">🗑 Clear Results</button>
                                <button id="shuffle-btn" class="secondary-btn">🔀 Shuffle Deck</button>
                            </div>
                        </div>
                        
                        <!-- Probability Mode Selector -->
                        <div class="mode-selector">
                            <label>Probability Mode:</label>
                            <select id="probability-mode">
                                <option value="basic">Basic (Individual Cards)</option>
                                <option value="even-odd">Even vs Odd</option>
                                <option value="prime-composite">Prime vs Composite</option>
                                <option value="face-nonface">Face Cards vs Non-Face</option>
                                <option value="joker-nonjoker">Jokers vs Non-Jokers</option>
                                <option value="suit">By Suit</option>
                                <option value="color">Red vs Black</option>
                                <option value="high-low">High (8-K) vs Low (A-7)</option>
                                <option value="specific">Specific Card</option>
                            </select>
                            <div id="mode-options"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Presets Tab -->
                <div id="presets-tab" class="tab-content">
                    <div class="presets-container">
                        <h3>Probability Experiment Presets</h3>
                        <div class="presets-grid" id="presets-grid"></div>
                    </div>
                </div>
                
                <!-- AI Demo Tab -->
                <div id="ai-demo-tab" class="tab-content">
                    <div class="ai-demo-container">
                        <h3>AI Probability Demonstrator</h3>
                        <p class="demo-description">Type a probability question and the AI will demonstrate it with cards!</p>
                        <div class="demo-input-area">
                            <textarea id="demo-prompt" placeholder="Example: What is the probability of drawing a red face card from a standard deck?"></textarea>
                            <button id="demo-btn" class="primary-btn">🎯 Demonstrate</button>
                        </div>
                        <div class="demo-result" id="demo-result">
                            <div class="demo-cards" id="demo-cards"></div>
                            <div class="demo-explanation" id="demo-explanation"></div>
                            <button id="setup-experiment-btn" class="secondary-btn" style="display:none;">📊 Set Up This Experiment</button>
                        </div>
                    </div>
                </div>
                
                <!-- AI Tutor Tab -->
                <div id="tutor-tab" class="tab-content">
                    <div class="tutor-container">
                        <h3>🎓 AI Math Tutor</h3>
                        <p class="tutor-info">Ask questions about probability! I explain at a 7th-grade level.</p>
                        <div class="token-counter">Tokens: <span id="token-count">0</span>/4096</div>
                        <div class="chat-area" id="chat-area"></div>
                        <div class="chat-input-area">
                            <textarea id="chat-input" placeholder="Ask me about probability..."></textarea>
                            <button id="send-btn" class="primary-btn">Send</button>
                            <button id="new-chat-btn" class="secondary-btn">New Chat</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Table (Always Visible at Bottom) -->
            <div class="results-container">
                <div class="results-header">
                    <h4>📊 Probability Results</h4>
                    <div class="theoretical-prob" id="theoretical-prob"></div>
                </div>
                <div class="results-table-wrapper" id="results-wrapper">
                    <table id="results-table">
                        <thead id="results-head"></thead>
                        <tbody id="results-body"></tbody>
                        <tfoot id="results-foot"></tfoot>
                    </table>
                </div>
            </div>
        `;

        this.injectStyles();
        this.attachEventListeners();
        this.buildPresets();
        this.buildTargetCardGrid();
    }

    injectStyles() {
        // Remove any existing style element for this game
        const existingStyle = document.getElementById('card-randomizer-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'card-randomizer-styles';
        style.textContent = `
            /* Settings Gear */
            .settings-gear {
                position: fixed;
                top: 75px;
                right: 15px;
                font-size: 28px;
                cursor: pointer;
                z-index: 100;
                transition: transform 0.3s;
                text-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            .settings-gear:hover { transform: rotate(90deg); }
            
            /* Settings Modal */
            .settings-modal {
                position: fixed;
                top: 60px;
                left: 0;
                width: 100%;
                height: calc(100% - 60px);
                background: rgba(0,0,0,0.9);
                z-index: 1000;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }
            .settings-content {
                max-width: 600px;
                margin: 0 auto;
                background: #1a1a1a;
                padding: 25px;
                border-radius: 15px;
                border: 1px solid #d4af37;
            }
            .close-settings {
                float: right;
                font-size: 30px;
                cursor: pointer;
                color: #888;
            }
            .close-settings:hover { color: #fff; }
            
            /* Collapsible Sections */
            .collapsible {
                background-color: #222;
                color: #d4af37;
                cursor: pointer;
                padding: 12px 15px;
                width: 100%;
                border: 1px solid #333;
                text-align: left;
                outline: none;
                font-size: 0.9rem;
                font-weight: bold;
                margin-top: 10px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .collapsible:after { content: '+'; font-size: 1.2rem; }
            .collapsible.active:after { content: '-'; }
            .collapsible-content {
                padding: 15px;
                display: none;
                background-color: #111;
                border: 1px solid #333;
                border-top: none;
                border-radius: 0 0 8px 8px;
                margin-bottom: 10px;
            }
            
            /* Input Groups */
            .input-group {
                margin-bottom: 15px;
            }
            .input-group label {
                display: block;
                font-size: 0.85rem;
                margin-bottom: 5px;
                color: #bbb;
            }
            .input-group select,
            .input-group input[type="number"],
            .input-group input[type="text"] {
                width: 100%;
                padding: 10px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
            }
            
            /* Toggle Switch */
            .toggle-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .toggle {
                width: 50px;
                height: 24px;
                background: #555;
                border-radius: 12px;
                position: relative;
                cursor: pointer;
                transition: background 0.3s;
            }
            .toggle.active { background: #d4af37; }
            .toggle-slider {
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                position: absolute;
                top: 2px;
                left: 2px;
                transition: transform 0.3s;
            }
            .toggle.active .toggle-slider { transform: translateX(26px); }
            
            /* Tab Navigation */
            .tab-nav {
                display: flex;
                background: rgba(0,0,0,0.3);
                padding: 10px;
                gap: 5px;
                flex-wrap: wrap;
                justify-content: center;
            }
            .tab-btn {
                padding: 10px 20px;
                border: none;
                background: #333;
                color: #bbb;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
            }
            .tab-btn.active {
                background: #d4af37;
                color: #000;
            }
            .tab-btn:hover:not(.active) {
                background: #444;
            }
            
            /* Main Content */
            .main-content {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
            }
            
            /* Experiment Container */
            .experiment-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            /* Card Display Area */
            .card-display-area {
                display: flex;
                gap: 20px;
                min-height: 200px;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 15px;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
            }
            .deck-pile {
                position: relative;
                width: 100px;
                height: 140px;
                background: linear-gradient(135deg, #2c3e50, #1a252f);
                border-radius: 8px;
                border: 2px solid #d4af37;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 
                    3px 3px 0 rgba(0,0,0,0.3),
                    6px 6px 0 rgba(0,0,0,0.2),
                    9px 9px 0 rgba(0,0,0,0.1);
            }
            .deck-count {
                color: #d4af37;
                font-weight: bold;
                text-align: center;
                font-size: 0.9rem;
            }
            .flip-area {
                flex: 1;
                min-height: 150px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                align-items: center;
                padding: 10px;
            }
            .hint-text {
                color: #666;
                font-style: italic;
            }
            
            /* Controls Panel */
            .controls-panel {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 15px;
            }
            .control-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            .control-row label {
                min-width: 120px;
                color: #bbb;
            }
            .control-row input {
                width: 80px;
                padding: 8px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #d4af37;
                font-size: 1rem;
                text-align: center;
            }
            .btn-group {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }
            
            /* Buttons */
            .primary-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                background: #d4af37;
                color: #000;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }
            .primary-btn:hover:not(:disabled) {
                background: #f1c40f;
                transform: translateY(-2px);
            }
            .primary-btn:disabled {
                background: #555;
                color: #888;
                cursor: not-allowed;
            }
            .secondary-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                background: #34495e;
                color: white;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }
            .secondary-btn:hover:not(:disabled) {
                background: #46627f;
            }
            .secondary-btn:disabled {
                background: #333;
                color: #666;
                cursor: not-allowed;
            }
            
            /* Mode Selector */
            .mode-selector {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 15px;
            }
            .mode-selector label {
                color: #d4af37;
                font-weight: bold;
                margin-right: 10px;
            }
            .mode-selector select {
                padding: 10px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
                min-width: 200px;
            }
            #mode-options {
                margin-top: 10px;
            }
            
            /* Presets */
            .presets-container {
                padding: 10px;
            }
            .presets-container h3 {
                color: #d4af37;
                margin-bottom: 15px;
            }
            .presets-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 15px;
            }
            .preset-card {
                background: rgba(0,0,0,0.4);
                border: 1px solid #333;
                border-radius: 12px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .preset-card:hover {
                border-color: #d4af37;
                transform: translateY(-3px);
            }
            .preset-card h4 {
                color: #d4af37;
                margin-bottom: 8px;
            }
            .preset-card p {
                color: #aaa;
                font-size: 0.9rem;
                margin-bottom: 10px;
            }
            .preset-card .theoretical {
                color: #00ffcc;
                font-weight: bold;
            }
            
            /* AI Demo */
            .ai-demo-container {
                padding: 10px;
            }
            .ai-demo-container h3 {
                color: #d4af37;
                margin-bottom: 10px;
            }
            .demo-description {
                color: #aaa;
                margin-bottom: 15px;
            }
            .demo-input-area {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            .demo-input-area textarea {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
                min-height: 80px;
                resize: vertical;
            }
            .demo-result {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
                min-height: 200px;
            }
            .demo-cards {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                margin-bottom: 15px;
            }
            .demo-explanation {
                color: #fff;
                line-height: 1.6;
                white-space: pre-wrap;
            }
            
            /* AI Tutor */
            .tutor-container {
                display: flex;
                flex-direction: column;
                height: calc(100vh - 350px);
                min-height: 400px;
            }
            .tutor-container h3 {
                color: #d4af37;
                margin-bottom: 5px;
            }
            .tutor-info {
                color: #aaa;
                font-size: 0.9rem;
                margin-bottom: 10px;
            }
            .token-counter {
                color: #888;
                font-size: 0.8rem;
                margin-bottom: 10px;
            }
            .chat-area {
                flex: 1;
                overflow-y: auto;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 10px;
            }
            .chat-message {
                margin-bottom: 15px;
                padding: 10px 15px;
                border-radius: 10px;
                position: relative;
            }
            .chat-message.user {
                background: #2c5282;
                margin-left: 20%;
            }
            .chat-message.assistant {
                background: #2d3748;
                margin-right: 20%;
            }
            .chat-message .copy-btn {
                position: absolute;
                top: 5px;
                right: 5px;
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 0.9rem;
            }
            .chat-message .copy-btn:hover {
                color: #fff;
            }
            .chat-input-area {
                display: flex;
                gap: 10px;
            }
            .chat-input-area textarea {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
                resize: none;
                min-height: 50px;
            }
            
            /* Results Table */
            .results-container {
                background: rgba(255,255,255,0.95);
                border-top: 3px solid #d4af37;
                max-height: 250px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: #f0f0f0;
                border-bottom: 1px solid #ddd;
            }
            .results-header h4 {
                margin: 0;
                color: #333;
            }
            .theoretical-prob {
                color: #2ecc71;
                font-weight: bold;
            }
            .results-table-wrapper {
                flex: 1;
                overflow: auto;
            }
            #results-table {
                width: 100%;
                border-collapse: collapse;
                color: #000;
            }
            #results-table th {
                background: #d4af37;
                color: #000;
                padding: 10px 8px;
                font-size: 0.85rem;
                text-align: center;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            #results-table td {
                padding: 8px;
                text-align: center;
                border-bottom: 1px solid #eee;
            }
            #results-table .pct {
                display: block;
                font-size: 0.75rem;
                color: #666;
            }
            #results-table tfoot td {
                background: #f9f1d7;
                font-weight: bold;
                border-top: 2px solid #d4af37;
            }
            
            /* Loading Spinner */
            .spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #d4af37;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Card in flip area */
            .flipped-card {
                width: 80px;
                height: 112px;
                border-radius: 6px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                transition: transform 0.3s;
            }
            .flipped-card:hover {
                transform: scale(1.1);
            }
            .flipped-card.highlight {
                box-shadow: 0 0 15px 5px #00ff00;
            }
            
            /* Target Card Grid */
            .target-card-grid {
                display: grid;
                grid-template-columns: repeat(13, 1fr);
                gap: 3px;
                max-height: 200px;
                overflow-y: auto;
            }
            .target-card-item {
                padding: 5px;
                background: #222;
                border: 1px solid #444;
                border-radius: 4px;
                text-align: center;
                cursor: pointer;
                font-size: 0.7rem;
                transition: all 0.2s;
            }
            .target-card-item:hover {
                background: #333;
            }
            .target-card-item.selected {
                background: #d4af37;
                color: #000;
                border-color: #d4af37;
            }
            .target-card-item .suit {
                font-size: 1rem;
            }
            .target-card-item .suit.red { color: #e74c3c; }
            .target-card-item .suit.black { color: #fff; }
            
            /* Checkbox Grid */
            .checkbox-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
            }
            .checkbox-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .checkbox-item input {
                width: auto;
            }
            .checkbox-item label {
                margin: 0;
                font-size: 0.85rem;
            }
            
            /* Mobile Responsive */
            @media (max-width: 700px) {
                .tab-btn {
                    padding: 8px 12px;
                    font-size: 0.85rem;
                }
                .control-row {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .control-row label {
                    min-width: auto;
                }
                .btn-group {
                    justify-content: center;
                }
                .flipped-card {
                    width: 60px;
                    height: 84px;
                }
                .deck-pile {
                    width: 80px;
                    height: 112px;
                }
                .preset-card {
                    padding: 12px;
                }
                .target-card-grid {
                    grid-template-columns: repeat(7, 1fr);
                }
                .chat-message.user {
                    margin-left: 10%;
                }
                .chat-message.assistant {
                    margin-right: 10%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Settings
        document.getElementById('settings-btn').onclick = () => this.toggleSettings(true);
        document.querySelector('.close-settings').onclick = () => this.toggleSettings(false);
        
        // Collapsibles
        document.querySelectorAll('.collapsible').forEach(btn => {
            btn.onclick = () => {
                btn.classList.toggle('active');
                const content = btn.nextElementSibling;
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            };
        });
        
        // Toggles
        document.getElementById('joker-toggle').onclick = (e) => {
            e.currentTarget.classList.toggle('active');
            this.state.includeJokers = e.currentTarget.classList.contains('active');
            this.updateWorkingDeck();
            this.updateTableHeaders();
        };
        
        // Deck settings
        document.getElementById('num-decks').onchange = (e) => {
            this.state.numDecks = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
            e.target.value = this.state.numDecks;
            this.state.selectedDecks = Array.from({length: this.state.numDecks}, (_, i) => i);
            this.updateSelectionOptions();
            this.updateWorkingDeck();
        };
        
        // Selection mode
        document.getElementById('selection-mode').onchange = (e) => {
            this.state.selectionMode = e.target.value;
            this.updateSelectionOptions();
            this.updateWorkingDeck();
        };
        
        // AI Model
        document.getElementById('ai-model').onchange = (e) => {
            this.currentModel = e.target.value;
        };
        
        // Tab navigation - FIX: Stop propagation to prevent main tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.switchTab(btn.dataset.tab);
            };
        });
        
        // Experiment controls
        document.getElementById('flip-btn').onclick = () => this.flipCards();
        document.getElementById('auto-flip-btn').onclick = () => this.startAutoFlip();
        document.getElementById('stop-btn').onclick = () => this.stopAutoFlip();
        document.getElementById('add-row-btn').onclick = () => this.addNewRound();
        document.getElementById('clear-btn').onclick = () => this.clearResults();
        document.getElementById('shuffle-btn').onclick = () => this.shuffleDeck();
        
        document.getElementById('cards-to-flip').onchange = (e) => {
            this.state.cardsToFlip = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
            e.target.value = this.state.cardsToFlip;
        };
        
        document.getElementById('auto-flip-count').onchange = (e) => {
            this.state.autoFlipCount = Math.max(1, Math.min(1000, parseInt(e.target.value) || 10));
            e.target.value = this.state.autoFlipCount;
        };
        
        // Probability mode
        document.getElementById('probability-mode').onchange = (e) => {
            this.state.probabilityMode = e.target.value;
            this.updateModeOptions();
            this.updateTableHeaders();
            this.clearResults();
        };
        
        // AI Demo
        document.getElementById('demo-btn').onclick = () => this.runAIDemo();
        document.getElementById('setup-experiment-btn').onclick = () => this.setupExperimentFromDemo();
        
        // AI Tutor
        document.getElementById('send-btn').onclick = () => this.sendChatMessage();
        document.getElementById('new-chat-btn').onclick = () => this.startNewChat();
        document.getElementById('chat-input').onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        };
    }

    toggleSettings(show) {
        document.getElementById('settings-menu').style.display = show ? 'block' : 'none';
        this.state.settingsOpen = show;
    }

    switchTab(tabName) {
        this.state.currentTab = tabName;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    updateSelectionOptions() {
        const container = document.getElementById('selection-options');
        container.innerHTML = '';
        
        switch (this.state.selectionMode) {
            case 'suit':
                container.innerHTML = `
                    <div class="checkbox-grid">
                        ${this.SUITS.map(suit => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="suit-${suit}" ${this.state.selectedSuits.includes(suit) ? 'checked' : ''} data-suit="${suit}">
                                <label for="suit-${suit}">${this.getSuitEmoji(suit)} ${suit}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.onchange = () => {
                        this.state.selectedSuits = Array.from(container.querySelectorAll('input:checked'))
                            .map(el => el.dataset.suit);
                        this.updateWorkingDeck();
                    };
                });
                break;
                
            case 'rank':
                container.innerHTML = `
                    <div class="checkbox-grid">
                        ${this.RANKS.map(rank => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="rank-${rank}" ${this.state.selectedRanks.includes(rank) ? 'checked' : ''} data-rank="${rank}">
                                <label for="rank-${rank}">${rank}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.onchange = () => {
                        this.state.selectedRanks = Array.from(container.querySelectorAll('input:checked'))
                            .map(el => el.dataset.rank);
                        this.updateWorkingDeck();
                    };
                });
                break;
                
            case 'deck':
                container.innerHTML = `
                    <div class="checkbox-grid">
                        ${Array.from({length: this.state.numDecks}, (_, i) => `
                            <div class="checkbox-item">
                                <input type="checkbox" id="deck-${i}" ${this.state.selectedDecks.includes(i) ? 'checked' : ''} data-deck="${i}">
                                <label for="deck-${i}">Deck ${i + 1}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.onchange = () => {
                        this.state.selectedDecks = Array.from(container.querySelectorAll('input:checked'))
                            .map(el => parseInt(el.dataset.deck));
                        this.updateWorkingDeck();
                    };
                });
                break;
                
            case 'individual':
                container.innerHTML = '<p style="color: #888; font-size: 0.85rem;">Use the Target Card section below to select individual cards.</p>';
                break;
        }
    }

    buildTargetCardGrid() {
        const grid = document.getElementById('target-card-grid');
        grid.innerHTML = '';
        
        this.SUITS.forEach(suit => {
            this.RANKS.forEach(rank => {
                const item = document.createElement('div');
                item.className = 'target-card-item';
                item.dataset.suit = suit;
                item.dataset.rank = rank;
                const colorClass = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
                item.innerHTML = `
                    <span class="suit ${colorClass}">${this.getSuitEmoji(suit)}</span>
                    <span>${rank}</span>
                `;
                item.onclick = () => {
                    grid.querySelectorAll('.target-card-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    this.state.targetCard = { suit, rank };
                };
                grid.appendChild(item);
            });
        });
        
        // Add jokers
        this.SUITS.forEach(suit => {
            const item = document.createElement('div');
            item.className = 'target-card-item';
            item.dataset.suit = suit;
            item.dataset.rank = 'Joker';
            const colorClass = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
            item.innerHTML = `
                <span class="suit ${colorClass}">${this.getSuitEmoji(suit)}</span>
                <span>🃏</span>
            `;
            item.onclick = () => {
                grid.querySelectorAll('.target-card-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                this.state.targetCard = { suit, rank: 'Joker' };
            };
            grid.appendChild(item);
        });
    }

    getSuitEmoji(suit) {
        const emojis = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return emojis[suit] || '';
    }

    updateWorkingDeck() {
        let cards = [];
        
        // Create cards for each deck
        for (let d = 0; d < this.state.numDecks; d++) {
            const deckCards = this.engine.createCardArray(this.deck, this.state.includeJokers);
            deckCards.forEach(card => {
                card.deckIndex = d;
            });
            cards = cards.concat(deckCards);
        }
        
        // Filter based on selection mode
        switch (this.state.selectionMode) {
            case 'suit':
                cards = cards.filter(c => this.state.selectedSuits.includes(c.suit));
                break;
            case 'rank':
                cards = cards.filter(c => this.state.selectedRanks.includes(c.rank));
                break;
            case 'deck':
                cards = cards.filter(c => this.state.selectedDecks.includes(c.deckIndex));
                break;
        }
        
        // Filter jokers if not included
        if (!this.state.includeJokers) {
            cards = cards.filter(c => c.rank !== 'Joker');
        }
        
        this.state.workingDeck = this.engine.shuffleDeck(cards);
        this.updateDeckDisplay();
    }

    updateDeckDisplay() {
        const countEl = document.getElementById('deck-count-num');
        if (countEl) {
            countEl.textContent = this.state.workingDeck.length;
        }
    }

    shuffleDeck() {
        this.state.workingDeck = this.engine.shuffleDeck([...this.state.workingDeck]);
        this.showMessage('Deck shuffled!');
    }

    buildPresets() {
        const presets = [
            {
                name: 'Even vs Odd',
                description: 'What is the probability of drawing an even-numbered card (2, 4, 6, 8, 10)?',
                mode: 'even-odd',
                theoretical: '20/52 ≈ 38.5%'
            },
            {
                name: 'Prime Numbers',
                description: 'Probability of drawing a prime-numbered card (2, 3, 5, 7)',
                mode: 'prime-composite',
                theoretical: '16/52 ≈ 30.8%'
            },
            {
                name: 'Face Cards',
                description: 'Probability of drawing a Jack, Queen, or King',
                mode: 'face-nonface',
                theoretical: '12/52 ≈ 23.1%'
            },
            {
                name: 'Red vs Black',
                description: 'Probability of drawing a red card (hearts or diamonds)',
                mode: 'color',
                theoretical: '26/52 = 50%'
            },
            {
                name: 'Specific Suit',
                description: 'Probability of drawing a heart',
                mode: 'suit',
                theoretical: '13/52 = 25%'
            },
            {
                name: 'Aces',
                description: 'Probability of drawing an Ace',
                mode: 'specific',
                theoretical: '4/52 ≈ 7.7%',
                params: { targetRank: 'A' }
            },
            {
                name: 'High Cards (8-K)',
                description: 'Probability of drawing a card 8 or higher',
                mode: 'high-low',
                theoretical: '28/52 ≈ 53.8%'
            },
            {
                name: 'Jokers',
                description: 'Probability of drawing a Joker (with jokers included)',
                mode: 'joker-nonjoker',
                theoretical: '4/56 ≈ 7.1%',
                requiresJokers: true
            },
            {
                name: 'NOT a Face Card',
                description: 'Probability of NOT drawing a J, Q, or K',
                mode: 'face-nonface',
                theoretical: '40/52 ≈ 76.9%',
                invert: true
            },
            {
                name: 'Hearts AND Face Card',
                description: 'Probability of drawing the Jack, Queen, or King of Hearts',
                mode: 'specific',
                theoretical: '3/52 ≈ 5.8%',
                params: { targetSuit: 'hearts', targetRanks: ['J', 'Q', 'K'] }
            },
            {
                name: 'Red OR Face Card',
                description: 'Probability of drawing a red card OR a face card',
                mode: 'or-condition',
                theoretical: '32/52 ≈ 61.5%'
            },
            {
                name: 'Two Cards Same Suit',
                description: 'Draw 2 cards - probability both are the same suit',
                mode: 'flush',
                theoretical: '12/51 ≈ 23.5%',
                cardsToFlip: 2
            }
        ];
        
        const grid = document.getElementById('presets-grid');
        grid.innerHTML = '';
        
        presets.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.innerHTML = `
                <h4>${preset.name}</h4>
                <p>${preset.description}</p>
                <div class="theoretical">Theoretical: ${preset.theoretical}</div>
            `;
            card.onclick = () => this.loadPreset(preset);
            grid.appendChild(card);
        });
    }

    loadPreset(preset) {
        // Set jokers if required
        if (preset.requiresJokers) {
            this.state.includeJokers = true;
            document.getElementById('joker-toggle').classList.add('active');
            this.updateWorkingDeck();
        }
        
        // Set probability mode
        this.state.probabilityMode = preset.mode;
        document.getElementById('probability-mode').value = preset.mode;
        
        // Set cards to flip if specified
        if (preset.cardsToFlip) {
            this.state.cardsToFlip = preset.cardsToFlip;
            document.getElementById('cards-to-flip').value = preset.cardsToFlip;
        }
        
        // Set mode parameters
        if (preset.params) {
            this.state.modeParams = preset.params;
        }
        
        this.updateModeOptions();
        this.updateTableHeaders();
        this.clearResults();
        this.switchTab('experiment');
        this.showMessage(`Loaded preset: ${preset.name}`);
    }

    updateModeOptions() {
        const container = document.getElementById('mode-options');
        container.innerHTML = '';
        
        switch (this.state.probabilityMode) {
            case 'specific':
                container.innerHTML = `
                    <div class="input-group" style="margin-top: 10px;">
                        <label>Target Rank:</label>
                        <select id="specific-rank">
                            ${this.RANKS.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>
                `;
                document.getElementById('specific-rank').onchange = (e) => {
                    this.state.modeParams.targetRank = e.target.value;
                    this.updateTheoreticalDisplay();
                };
                break;
        }
        
        this.updateTheoreticalDisplay();
    }

    updateTheoreticalDisplay() {
        const display = document.getElementById('theoretical-prob');
        const prob = this.calculateTheoreticalProbability();
        display.innerHTML = `Theoretical: ${prob.fraction} = ${prob.percentage}%`;
    }

    calculateTheoreticalProbability() {
        const totalCards = this.state.workingDeck.length;
        let favorableOutcomes = 0;
        
        switch (this.state.probabilityMode) {
            case 'even-odd':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    ['2', '4', '6', '8', '10'].includes(c.rank)
                ).length;
                break;
                
            case 'prime-composite':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    this.PRIMES.includes(this.RANK_VALUES[c.rank])
                ).length;
                break;
                
            case 'face-nonface':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    ['J', 'Q', 'K'].includes(c.rank)
                ).length;
                break;
                
            case 'joker-nonjoker':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    c.rank === 'Joker'
                ).length;
                break;
                
            case 'suit':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    c.suit === 'hearts'
                ).length;
                break;
                
            case 'color':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    c.suit === 'hearts' || c.suit === 'diamonds'
                ).length;
                break;
                
            case 'high-low':
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    this.RANK_VALUES[c.rank] >= 8
                ).length;
                break;
                
            case 'specific':
                const targetRank = this.state.modeParams.targetRank || 'A';
                favorableOutcomes = this.state.workingDeck.filter(c => 
                    c.rank === targetRank
                ).length;
                break;
                
            default:
                return { fraction: 'N/A', percentage: 'N/A' };
        }
        
        const gcd = this.gcd(favorableOutcomes, totalCards);
        const simplifiedNum = favorableOutcomes / gcd;
        const simplifiedDen = totalCards / gcd;
        const percentage = ((favorableOutcomes / totalCards) * 100).toFixed(1);
        
        return {
            fraction: `${simplifiedNum}/${simplifiedDen}`,
            percentage: percentage
        };
    }

    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    getTableColumns() {
        switch (this.state.probabilityMode) {
            case 'even-odd':
                return ['Even', 'Odd'];
            case 'prime-composite':
                return ['Prime', 'Composite', 'Neither'];
            case 'face-nonface':
                return ['Face Card', 'Non-Face'];
            case 'joker-nonjoker':
                return ['Joker', 'Non-Joker'];
            case 'suit':
                return ['♥ Hearts', '♦ Diamonds', '♣ Clubs', '♠ Spades'];
            case 'color':
                return ['Red', 'Black'];
            case 'high-low':
                return ['High (8-K)', 'Low (A-7)'];
            case 'specific':
                const target = this.state.modeParams.targetRank || 'A';
                return [`Is ${target}`, `Not ${target}`];
            case 'basic':
            default:
                return this.RANKS;
        }
    }

    updateTableHeaders() {
        const columns = this.getTableColumns();
        const thead = document.getElementById('results-head');
        const tfoot = document.getElementById('results-foot');
        
        thead.innerHTML = `
            <tr>
                <th>Round</th>
                ${columns.map(col => `<th>${col}</th>`).join('')}
                <th>Total</th>
            </tr>
        `;
        
        // Initialize grand totals
        this.state.grandTotals = {};
        columns.forEach((_, i) => this.state.grandTotals[i] = 0);
        
        tfoot.innerHTML = `
            <tr>
                <td>TOTAL</td>
                ${columns.map((_, i) => `<td id="grand-${i}">0<span class="pct">0.0%</span></td>`).join('')}
                <td id="grand-total">0</td>
            </tr>
        `;
        
        this.updateTheoreticalDisplay();
    }

    categorizeCard(card) {
        const value = this.RANK_VALUES[card.rank];
        
        switch (this.state.probabilityMode) {
            case 'even-odd':
                if (card.rank === 'Joker' || ['J', 'Q', 'K', 'A'].includes(card.rank)) {
                    return value % 2 === 0 ? 0 : 1;
                }
                return value % 2 === 0 ? 0 : 1;
                
            case 'prime-composite':
                if (this.PRIMES.includes(value)) return 0;
                if (value === 1 || value === 0) return 2;
                return 1;
                
            case 'face-nonface':
                return ['J', 'Q', 'K'].includes(card.rank) ? 0 : 1;
                
            case 'joker-nonjoker':
                return card.rank === 'Joker' ? 0 : 1;
                
            case 'suit':
                return this.SUITS.indexOf(card.suit);
                
            case 'color':
                return (card.suit === 'hearts' || card.suit === 'diamonds') ? 0 : 1;
                
            case 'high-low':
                return value >= 8 ? 0 : 1;
                
            case 'specific':
                const target = this.state.modeParams.targetRank || 'A';
                return card.rank === target ? 0 : 1;
                
            case 'basic':
            default:
                return this.RANKS.indexOf(card.rank);
        }
    }

    async flipCards() {
        if (this.state.workingDeck.length === 0) {
            this.showMessage('Deck is empty! Reshuffle to continue.');
            return;
        }
        
        const numToFlip = Math.min(this.state.cardsToFlip, this.state.workingDeck.length);
        const flippedCards = [];
        
        for (let i = 0; i < numToFlip; i++) {
            const card = this.state.workingDeck.pop();
            flippedCards.push(card);
        }
        
        // Display flipped cards with animation
        await this.displayFlippedCards(flippedCards);
        
        // Categorize and record results
        const columns = this.getTableColumns();
        flippedCards.forEach(card => {
            const category = this.categorizeCard(card);
            if (!this.state.roundResults[category]) {
                this.state.roundResults[category] = 0;
            }
            this.state.roundResults[category]++;
            this.state.grandTotals[category]++;
            this.state.totalFlips++;
        });
        
        this.updateCurrentRoundDisplay();
        this.updateGrandTotals();
        this.updateDeckDisplay();
    }

    async displayFlippedCards(cards) {
        const flipArea = document.getElementById('flip-area');
        flipArea.innerHTML = '';
        
        for (const card of cards) {
            const cardEl = this.engine.renderCard(card, true);
            cardEl.classList.add('flipped-card');
            cardEl.style.opacity = '0';
            cardEl.style.transform = 'rotateY(180deg)';
            flipArea.appendChild(cardEl);
            
            // Animate flip
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    cardEl.style.transition = 'all 0.3s ease';
                    cardEl.style.opacity = '1';
                    cardEl.style.transform = 'rotateY(0)';
                    setTimeout(resolve, 300);
                });
            });
        }
    }

    async startAutoFlip() {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.state.stopRequested = false;
        
        document.getElementById('flip-btn').disabled = true;
        document.getElementById('auto-flip-btn').disabled = true;
        document.getElementById('stop-btn').disabled = false;
        
        const totalFlips = this.state.autoFlipCount;
        
        for (let i = 0; i < totalFlips && !this.state.stopRequested; i++) {
            if (this.state.workingDeck.length === 0) {
                // Reshuffle when deck is empty
                this.updateWorkingDeck();
            }
            
            await this.flipCards();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.state.isRunning = false;
        document.getElementById('flip-btn').disabled = false;
        document.getElementById('auto-flip-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
    }

    stopAutoFlip() {
        this.state.stopRequested = true;
    }

    updateCurrentRoundDisplay() {
        const tbody = document.getElementById('results-body');
        const columns = this.getTableColumns();
        
        let row = tbody.querySelector(`tr[data-round="${this.state.currentRound}"]`);
        if (!row) {
            row = document.createElement('tr');
            row.dataset.round = this.state.currentRound;
            tbody.appendChild(row);
        }
        
        let roundTotal = 0;
        columns.forEach((_, i) => {
            roundTotal += this.state.roundResults[i] || 0;
        });
        
        row.innerHTML = `
            <td>${this.state.currentRound}</td>
            ${columns.map((_, i) => {
                const count = this.state.roundResults[i] || 0;
                const pct = roundTotal > 0 ? ((count / roundTotal) * 100).toFixed(1) : '0.0';
                return `<td>${count}<span class="pct">${pct}%</span></td>`;
            }).join('')}
            <td>${roundTotal}</td>
        `;
    }

    updateGrandTotals() {
        const columns = this.getTableColumns();
        
        columns.forEach((_, i) => {
            const count = this.state.grandTotals[i] || 0;
            const pct = this.state.totalFlips > 0 ? ((count / this.state.totalFlips) * 100).toFixed(1) : '0.0';
            const el = document.getElementById(`grand-${i}`);
            if (el) {
                el.innerHTML = `${count}<span class="pct">${pct}%</span>`;
            }
        });
        
        const totalEl = document.getElementById('grand-total');
        if (totalEl) {
            totalEl.textContent = this.state.totalFlips;
        }
    }

    addNewRound() {
        this.state.currentRound++;
        this.state.roundResults = {};
        this.showMessage(`Started Round ${this.state.currentRound}`);
    }

    clearResults() {
        this.state.currentRound = 1;
        this.state.roundResults = {};
        this.state.totalFlips = 0;
        
        const columns = this.getTableColumns();
        columns.forEach((_, i) => this.state.grandTotals[i] = 0);
        
        document.getElementById('results-body').innerHTML = '';
        this.updateGrandTotals();
        document.getElementById('flip-area').innerHTML = '<p class="hint-text">Flipped cards appear here</p>';
        
        this.updateWorkingDeck();
    }

    async runAIDemo() {
        const prompt = document.getElementById('demo-prompt').value.trim();
        if (!prompt) {
            this.showMessage('Please enter a probability question');
            return;
        }
        
        const demoResult = document.getElementById('demo-result');
        const demoCards = document.getElementById('demo-cards');
        const demoExplanation = document.getElementById('demo-explanation');
        
        demoCards.innerHTML = '<div class="spinner"></div>';
        demoExplanation.textContent = 'Thinking...';
        
        const systemPrompt = `You are a 7th-grade mathematics teacher specializing in probability. 
        When given a probability question about playing cards, you must:
        1. Identify which specific cards are relevant to the question
        2. Explain the probability calculation step by step at a 7th-grade level
        3. Format your response as JSON with this structure:
        {
            "cards": ["hearts-ace", "hearts-king", "diamonds-queen"],
            "explanation": "Step-by-step explanation here...",
            "theoretical_probability": "fraction and percentage",
            "mode": "probability mode to use (even-odd, face-nonface, suit, color, etc.)",
            "params": {}
        }
        Use card format: suit-rank (e.g., hearts-ace, spades-10, diamonds-jack, clubs-joker)
        Only return valid JSON, no other text.`;
        
        try {
            const seed = Math.floor(Math.random() * 1000000);
            const encodedPrompt = encodeURIComponent(prompt);
            const encodedSystem = encodeURIComponent(systemPrompt);
            const url = `${this.API_BASE}/${encodedPrompt}?model=${this.currentModel}&seed=${seed}&key=${this.API_KEY}&system=${encodedSystem}&json=true`;
            
            const response = await fetch(url);
            const text = await response.text();
            
            // Parse JSON from response
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                // Try to extract JSON from text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Could not parse response');
                }
            }
            
            // Display cards
            demoCards.innerHTML = '';
            if (data.cards && Array.isArray(data.cards)) {
                data.cards.slice(0, 10).forEach(cardId => {
                    const [suit, rank] = cardId.split('-');
                    const card = this.state.availableCards.find(c => 
                        c.suit === suit && c.rank.toLowerCase() === rank.toLowerCase()
                    );
                    if (card) {
                        const cardEl = this.engine.renderCard(card, true);
                        cardEl.classList.add('flipped-card');
                        demoCards.appendChild(cardEl);
                    }
                });
            }
            
            // Display explanation
            demoExplanation.textContent = data.explanation || 'No explanation provided.';
            
            // Store for setting up experiment
            this.state.demoData = data;
            document.getElementById('setup-experiment-btn').style.display = 'block';
            
        } catch (error) {
            console.error('AI Demo error:', error);
            demoCards.innerHTML = '';
            demoExplanation.textContent = 'Sorry, I had trouble processing that question. Please try again with a clearer probability question about playing cards.';
        }
    }

    setupExperimentFromDemo() {
        if (!this.state.demoData) return;
        
        const data = this.state.demoData;
        
        if (data.mode) {
            const modeSelect = document.getElementById('probability-mode');
            if (modeSelect.querySelector(`option[value="${data.mode}"]`)) {
                this.state.probabilityMode = data.mode;
                modeSelect.value = data.mode;
            }
        }
        
        if (data.params) {
            this.state.modeParams = data.params;
        }
        
        this.updateModeOptions();
        this.updateTableHeaders();
        this.clearResults();
        this.switchTab('experiment');
        this.showMessage('Experiment set up from AI demo!');
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;
        
        // Check token limit
        if (this.state.chatTokenCount >= this.state.maxTokens - 500) {
            this.showMessage('Chat limit reached. Please start a new conversation.');
            return;
        }
        
        // Add user message
        this.addChatMessage(message, 'user');
        input.value = '';
        
        // Add loading indicator
        const loadingId = this.addChatMessage('<div class="spinner"></div> Thinking...', 'assistant', true);
        
        const systemPrompt = `You are an expert 7th-grade mathematics teacher specializing in probability. 
        You explain concepts clearly at a 7th-grade level using simple language and real-world examples.
        When discussing playing cards, remember: standard deck has 52 cards (4 suits × 13 ranks), plus optionally 4 jokers (one per suit).
        Always encourage students and provide step-by-step explanations.
        Keep responses concise but thorough.`;
        
        // Build conversation history
        const messages = this.state.chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        try {
            const seed = Math.floor(Math.random() * 1000000);
            const conversationContext = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
            const fullPrompt = conversationContext ? `${conversationContext}\nuser: ${message}` : message;
            const encodedPrompt = encodeURIComponent(fullPrompt);
            const encodedSystem = encodeURIComponent(systemPrompt);
            const url = `${this.API_BASE}/${encodedPrompt}?model=${this.currentModel}&seed=${seed}&key=${this.API_KEY}&system=${encodedSystem}`;
            
            const response = await fetch(url);
            const text = await response.text();
            
            // Remove loading message and add real response
            this.removeChatMessage(loadingId);
            this.addChatMessage(text, 'assistant');
            
            // Update token estimate
            this.state.chatTokenCount += (message.length + text.length) / 4;
            document.getElementById('token-count').textContent = Math.round(this.state.chatTokenCount);
            
            // Store in history
            this.state.chatHistory.push({ role: 'user', content: message });
            this.state.chatHistory.push({ role: 'assistant', content: text });
            
        } catch (error) {
            console.error('Chat error:', error);
            this.removeChatMessage(loadingId);
            this.addChatMessage('Sorry, I had trouble responding. Please try again.', 'assistant');
        }
    }

    addChatMessage(content, role, isTemp = false) {
        const chatArea = document.getElementById('chat-area');
        const msgId = `msg-${Date.now()}`;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;
        msgDiv.id = msgId;
        msgDiv.innerHTML = `
            ${content}
            ${!isTemp && role === 'assistant' ? '<button class="copy-btn" title="Copy">📋</button>' : ''}
        `;
        
        if (!isTemp && role === 'assistant') {
            msgDiv.querySelector('.copy-btn').onclick = () => {
                navigator.clipboard.writeText(content);
                this.showMessage('Copied to clipboard!');
            };
        }
        
        chatArea.appendChild(msgDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        
        return msgId;
    }

    removeChatMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    startNewChat() {
        this.state.chatHistory = [];
        this.state.chatTokenCount = 0;
        document.getElementById('chat-area').innerHTML = '';
        document.getElementById('token-count').textContent = '0';
        this.showMessage('Started new conversation');
    }

    showMessage(text) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 280px;
            left: 50%;
            transform: translateX(-50%);
            background: #d4af37;
            color: #000;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 2000;
            animation: fadeInOut 2s ease;
        `;
        toast.textContent = text;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 2000);
    }

    handleResize() {
        // Responsive adjustments
        const isMobile = window.innerWidth < 700;
        
        // Adjust card sizes
        document.querySelectorAll('.flipped-card').forEach(card => {
            card.style.width = isMobile ? '60px' : '80px';
            card.style.height = isMobile ? '84px' : '112px';
        });
    }

    render() {
        this.updateDeckDisplay();
        this.updateTheoreticalDisplay();
    }

    updateStats() {
        // Stats are updated through specific update methods
    }

    pause() {
        this.stopAutoFlip();
    }

    cleanup() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        this.stopAutoFlip();
        
        // Remove injected styles
        const styleElement = document.getElementById('card-randomizer-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['probability-card-randomizer-v1'] = CardProbabilityRandomizer;
