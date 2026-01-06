/**
 * Advanced Multi-Deck Analyzer
 * Power tool for complex multi-deck probability experiments
 * Part 5 of 5 probability tools
 */

class AdvancedMultiDeckAnalyzer {
    constructor(engine, deckData) {
        this.engine = engine;
        this.deck = deckData;
        this.resizeHandler = null;
        
        // State
        this.state = {
            // Deck configuration
            numDecks: 1,
            activeDecks: [0],
            includeJokers: false,
            
            // Card filtering
            filterMode: 'all', // all, suit, rank, deck, individual, custom
            selectedSuits: ['hearts', 'diamonds', 'clubs', 'spades'],
            selectedRanks: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
            selectedDecks: [0],
            targetCards: [], // Array of {suit, rank, deckIndex}
            
            // Working deck
            workingDeck: [],
            
            // Probability mode
            probabilityMode: 'basic',
            trackingCategories: [],
            customCategories: [],
            
            // Experiment tracking
            currentRound: 1,
            rounds: [], // Array of round data
            grandTotals: {},
            totalFlips: 0,
            
            // Experiment settings
            cardsToFlip: 1,
            autoFlipCount: 10,
            autoFlipSpeed: 'medium', // slow, medium, fast
            
            // Running state
            isRunning: false,
            isPaused: false,
            stopRequested: false,
            
            // UI state
            expertMode: false,
            leftPanelCollapsed: false,
            
            // Statistics
            statistics: {
                streaks: {},
                deckSources: {},
                timeSeriesData: []
            }
        };
        
        // Constants
        this.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.DECK_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        
        this.RANK_VALUES = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'Joker': 0
        };
        
        this.SPEED_DELAYS = {
            slow: 300,
            medium: 100,
            fast: 30
        };
    }

    setup() {
        // Initialize deck
        this.initializeDeck();
        
        // Set up resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = () => this.handleResize();
        window.addEventListener('resize', this.resizeHandler);
        
        this.buildUI();
        this.updateTableHeaders();
        this.render();
    }

    initializeDeck() {
        let cards = [];
        for (let d = 0; d < this.state.numDecks; d++) {
            const deckCards = this.engine.createCardArray(this.deck, this.state.includeJokers);
            deckCards.forEach(card => {
                card.deckIndex = d;
                card.deckColor = this.DECK_COLORS[d % this.DECK_COLORS.length];
            });
            cards = cards.concat(deckCards);
        }
        
        this.applyFilters(cards);
    }

    applyFilters(cards) {
        let filtered = [...cards];
        
        // Filter by deck selection
        if (this.state.filterMode === 'deck' || this.state.filterMode === 'all') {
            filtered = filtered.filter(c => this.state.selectedDecks.includes(c.deckIndex));
        }
        
        // Filter by suit
        if (this.state.filterMode === 'suit') {
            filtered = filtered.filter(c => this.state.selectedSuits.includes(c.suit));
        }
        
        // Filter by rank
        if (this.state.filterMode === 'rank') {
            filtered = filtered.filter(c => this.state.selectedRanks.includes(c.rank));
        }
        
        // Filter by individual cards
        if (this.state.filterMode === 'individual' && this.state.targetCards.length > 0) {
            filtered = filtered.filter(c => 
                this.state.targetCards.some(t => 
                    t.suit === c.suit && 
                    t.rank === c.rank && 
                    (t.deckIndex === undefined || t.deckIndex === c.deckIndex)
                )
            );
        }
        
        // Remove jokers if not included
        if (!this.state.includeJokers) {
            filtered = filtered.filter(c => c.rank !== 'Joker');
        }
        
        this.state.workingDeck = this.engine.shuffleDeck(filtered);
    }

    buildUI() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        gameBoard.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #f0f0f0;
            font-family: 'Segoe UI', system-ui, sans-serif;
            overflow: hidden;
        `;

        gameBoard.innerHTML = `
            <div class="analyzer-layout">
                <!-- Top Bar -->
                <div class="top-bar">
                    <div class="title-section">
                        <h1>🔬 Advanced Multi-Deck Analyzer</h1>
                        <div class="expert-toggle">
                            <label class="toggle-label">
                                <input type="checkbox" id="expert-mode-toggle">
                                <span>Expert Mode</span>
                            </label>
                        </div>
                    </div>
                    <div class="deck-status" id="deck-status">
                        <span class="status-label">Active Decks:</span>
                        <span class="status-value" id="active-decks-display">1</span>
                        <span class="status-separator">|</span>
                        <span class="status-label">Total Cards:</span>
                        <span class="status-value" id="total-cards-display">52</span>
                        <span class="status-separator">|</span>
                        <span class="status-label">Remaining:</span>
                        <span class="status-value" id="remaining-cards-display">52</span>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="main-area">
                    <!-- Left Sidebar -->
                    <div class="left-sidebar" id="left-sidebar">
                        <button class="collapse-btn" id="collapse-left">◀</button>
                        
                        <div class="sidebar-content">
                            <!-- Deck Configuration -->
                            <div class="config-section">
                                <h3>🎴 Deck Configuration</h3>
                                <div class="deck-selector">
                                    <label>Number of Decks (1-8):</label>
                                    <input type="number" id="num-decks-input" value="1" min="1" max="8">
                                </div>
                                <div class="deck-checkboxes" id="deck-checkboxes"></div>
                                <div class="joker-toggle">
                                    <label>
                                        <input type="checkbox" id="joker-checkbox">
                                        Include Jokers
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Filter Mode -->
                            <div class="config-section">
                                <h3>🔍 Card Selection</h3>
                                <select id="filter-mode-select" class="mode-select">
                                    <option value="all">All Cards from Active Decks</option>
                                    <option value="suit">Filter by Suit</option>
                                    <option value="rank">Filter by Rank</option>
                                    <option value="deck">Filter by Deck Number</option>
                                    <option value="individual">Select Individual Cards</option>
                                    <option value="custom">Custom Filter</option>
                                </select>
                                <div id="filter-options" class="filter-options"></div>
                            </div>
                            
                            <!-- Target Cards (Expert Mode) -->
                            <div class="config-section expert-only" style="display: none;">
                                <h3>🎯 Target Cards</h3>
                                <p class="help-text">Track specific cards across decks</p>
                                <div id="target-cards-grid" class="target-grid"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Center Panel -->
                    <div class="center-panel">
                        <!-- Flip Zone -->
                        <div class="flip-zone">
                            <div class="deck-piles" id="deck-piles"></div>
                            <div class="flip-area" id="flip-area">
                                <p class="hint-text">Flipped cards appear here</p>
                            </div>
                        </div>
                        
                        <!-- Controls -->
                        <div class="controls-panel">
                            <div class="control-group">
                                <label>Cards per Flip:</label>
                                <input type="number" id="cards-per-flip" value="1" min="1" max="10">
                            </div>
                            <div class="control-group">
                                <label>Auto-Flip Count:</label>
                                <input type="number" id="auto-flip-count" value="10" min="1" max="10000">
                            </div>
                            <div class="control-group">
                                <label>Speed:</label>
                                <select id="speed-select">
                                    <option value="slow">Slow</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="fast">Fast</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="action-buttons">
                            <button id="flip-btn" class="action-btn primary">🎴 Flip</button>
                            <button id="auto-flip-btn" class="action-btn primary">⚡ Auto Flip</button>
                            <button id="pause-btn" class="action-btn secondary" disabled>⏸ Pause</button>
                            <button id="stop-btn" class="action-btn secondary" disabled>⏹ Stop</button>
                            <button id="new-round-btn" class="action-btn secondary">➕ New Round</button>
                            <button id="clear-all-btn" class="action-btn danger">🗑 Clear All</button>
                        </div>
                        
                        <!-- Probability Mode -->
                        <div class="mode-panel">
                            <label>Probability Mode:</label>
                            <select id="probability-mode-select" class="mode-select">
                                <option value="basic">Basic (Individual Ranks)</option>
                                <option value="even-odd">Even vs Odd</option>
                                <option value="prime">Prime vs Composite</option>
                                <option value="face-nonface">Face Cards vs Non-Face</option>
                                <option value="joker">Jokers vs Non-Jokers</option>
                                <option value="suit">By Suit</option>
                                <option value="color">Red vs Black</option>
                                <option value="high-low">High (8-K) vs Low (A-7)</option>
                                <option value="deck-source">By Deck Source</option>
                                <option value="custom">Custom Categories</option>
                            </select>
                        </div>
                        
                        <!-- Quick Stats Dashboard -->
                        <div class="stats-dashboard">
                            <div class="stat-card">
                                <div class="stat-label">Total Flips</div>
                                <div class="stat-value" id="total-flips-stat">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Current Round</div>
                                <div class="stat-value" id="current-round-stat">1</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Rounds Completed</div>
                                <div class="stat-value" id="rounds-completed-stat">0</div>
                            </div>
                            <div class="stat-card expert-only" style="display: none;">
                                <div class="stat-label">Longest Streak</div>
                                <div class="stat-value" id="longest-streak-stat">0</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Panel (Expert Mode) -->
                    <div class="right-panel expert-only" style="display: none;">
                        <h3>📊 Advanced Analytics</h3>
                        
                        <div class="analytics-section">
                            <h4>Deck Source Tracking</h4>
                            <div id="deck-source-chart" class="mini-chart"></div>
                        </div>
                        
                        <div class="analytics-section">
                            <h4>Streak Analysis</h4>
                            <div id="streak-display" class="streak-info">
                                <p>No streaks detected yet</p>
                            </div>
                        </div>
                        
                        <div class="analytics-section">
                            <h4>Statistical Tests</h4>
                            <div id="chi-square-result" class="stat-test">
                                <p>Flip more cards to see chi-square test</p>
                            </div>
                        </div>
                        
                        <div class="analytics-section">
                            <h4>Export Data</h4>
                            <button id="export-csv-btn" class="export-btn">📄 Export CSV</button>
                            <button id="export-json-btn" class="export-btn">📦 Export JSON</button>
                            <button id="screenshot-btn" class="export-btn">📸 Screenshot</button>
                        </div>
                    </div>
                </div>
                
                <!-- Results Table -->
                <div class="results-section">
                    <div class="results-header">
                        <h3>📈 Experiment Results</h3>
                        <div class="theoretical-display" id="theoretical-display"></div>
                    </div>
                    <div class="results-table-container">
                        <table id="results-table">
                            <thead id="results-thead"></thead>
                            <tbody id="results-tbody"></tbody>
                            <tfoot id="results-tfoot"></tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
        this.buildDeckCheckboxes();
        this.buildTargetCardsGrid();
        this.attachEventListeners();
    }

    injectStyles() {
        const existingStyle = document.getElementById('advanced-analyzer-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'advanced-analyzer-styles';
        style.textContent = `
            .analyzer-layout {
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }
            
            /* Top Bar */
            .top-bar {
                background: rgba(0,0,0,0.5);
                padding: 15px 20px;
                border-bottom: 2px solid #d4af37;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
            }
            .title-section {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            .top-bar h1 {
                color: #d4af37;
                margin: 0;
                font-size: 1.6rem;
            }
            .expert-toggle {
                display: flex;
                align-items: center;
            }
            .toggle-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 0.9rem;
            }
            .toggle-label input[type="checkbox"] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            .deck-status {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.95rem;
            }
            .status-label {
                color: #aaa;
            }
            .status-value {
                color: #d4af37;
                font-weight: bold;
            }
            .status-separator {
                color: #555;
            }
            
            /* Main Area */
            .main-area {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            /* Left Sidebar */
            .left-sidebar {
                width: 320px;
                background: rgba(0,0,0,0.4);
                border-right: 1px solid #444;
                overflow-y: auto;
                position: relative;
                transition: width 0.3s, margin-left 0.3s;
            }
            .left-sidebar.collapsed {
                width: 0;
                margin-left: -320px;
            }
            .collapse-btn {
                position: absolute;
                top: 10px;
                right: -30px;
                width: 30px;
                height: 40px;
                background: rgba(0,0,0,0.7);
                border: 1px solid #444;
                border-left: none;
                color: #d4af37;
                cursor: pointer;
                z-index: 10;
                border-radius: 0 8px 8px 0;
            }
            .sidebar-content {
                padding: 20px;
            }
            .config-section {
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
            }
            .config-section h3 {
                color: #d4af37;
                margin: 0 0 12px 0;
                font-size: 1.1rem;
            }
            .help-text {
                color: #888;
                font-size: 0.85rem;
                margin-bottom: 10px;
            }
            
            /* Deck Configuration */
            .deck-selector {
                margin-bottom: 12px;
            }
            .deck-selector label {
                display: block;
                color: #bbb;
                margin-bottom: 5px;
                font-size: 0.9rem;
            }
            .deck-selector input {
                width: 100%;
                padding: 8px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #d4af37;
                font-size: 1rem;
            }
            .deck-checkboxes {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-bottom: 12px;
            }
            .deck-checkbox {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 6px;
                background: rgba(0,0,0,0.4);
                border-radius: 4px;
                font-size: 0.85rem;
            }
            .deck-checkbox input {
                width: auto;
            }
            .deck-checkbox label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            .deck-color-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                display: inline-block;
            }
            
            /* Filter Options */
            .mode-select {
                width: 100%;
                padding: 10px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 0.95rem;
                margin-bottom: 10px;
            }
            .filter-options {
                margin-top: 10px;
            }
            .filter-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }
            .filter-checkbox {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 0.85rem;
            }
            
            /* Target Cards Grid */
            .target-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 5px;
                max-height: 300px;
                overflow-y: auto;
            }
            .target-card-btn {
                padding: 8px 4px;
                background: rgba(0,0,0,0.5);
                border: 1px solid #444;
                border-radius: 4px;
                color: #bbb;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }
            .target-card-btn:hover {
                border-color: #d4af37;
                background: rgba(212, 175, 55, 0.1);
            }
            .target-card-btn.selected {
                background: rgba(212, 175, 55, 0.3);
                border-color: #d4af37;
                color: #d4af37;
            }
            .card-suit {
                font-size: 1rem;
            }
            .card-suit.red { color: #e74c3c; }
            .card-suit.black { color: #fff; }
            
            /* Center Panel */
            .center-panel {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            /* Flip Zone */
            .flip-zone {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
                min-height: 200px;
            }
            .deck-piles {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .deck-pile {
                width: 80px;
                height: 112px;
                border-radius: 8px;
                border: 2px solid;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: bold;
                box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
            }
            .pile-label {
                margin-bottom: 5px;
            }
            .pile-count {
                font-size: 1.2rem;
            }
            .flip-area {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                justify-content: center;
                min-height: 130px;
                align-items: center;
            }
            .hint-text {
                color: #666;
                font-style: italic;
            }
            .flipped-card {
                width: 80px;
                height: 112px;
                border-radius: 6px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                position: relative;
                transition: transform 0.2s;
            }
            .flipped-card:hover {
                transform: scale(1.05);
            }
            .deck-badge {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                font-weight: bold;
                color: #000;
                background: white;
                border: 1px solid #000;
            }
            
            /* Controls */
            .controls-panel {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                background: rgba(0,0,0,0.3);
                padding: 15px;
                border-radius: 8px;
            }
            .control-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .control-group label {
                color: #bbb;
                font-size: 0.85rem;
            }
            .control-group input,
            .control-group select {
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #d4af37;
                font-size: 1rem;
            }
            
            /* Action Buttons */
            .action-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .action-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .action-btn.primary {
                background: linear-gradient(135deg, #d4af37, #f1c40f);
                color: #000;
            }
            .action-btn.primary:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(212, 175, 55, 0.5);
            }
            .action-btn.secondary {
                background: #34495e;
                color: white;
            }
            .action-btn.secondary:hover:not(:disabled) {
                background: #46627f;
            }
            .action-btn.danger {
                background: #e74c3c;
                color: white;
            }
            .action-btn.danger:hover:not(:disabled) {
                background: #c0392b;
            }
            .action-btn:disabled {
                background: #555;
                color: #888;
                cursor: not-allowed;
            }
            
            /* Mode Panel */
            .mode-panel {
                background: rgba(0,0,0,0.3);
                padding: 15px;
                border-radius: 8px;
            }
            .mode-panel label {
                color: #d4af37;
                font-weight: bold;
                margin-right: 10px;
            }
            
            /* Stats Dashboard */
            .stats-dashboard {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
            }
            .stat-card {
                background: rgba(0,0,0,0.3);
                border: 1px solid #444;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
            }
            .stat-label {
                color: #aaa;
                font-size: 0.85rem;
                margin-bottom: 5px;
            }
            .stat-value {
                color: #d4af37;
                font-size: 1.8rem;
                font-weight: bold;
            }
            
            /* Right Panel */
            .right-panel {
                width: 280px;
                background: rgba(0,0,0,0.4);
                border-left: 1px solid #444;
                overflow-y: auto;
                padding: 20px;
            }
            .right-panel h3 {
                color: #d4af37;
                margin: 0 0 15px 0;
            }
            .analytics-section {
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
            }
            .analytics-section h4 {
                color: #d4af37;
                margin: 0 0 10px 0;
                font-size: 1rem;
            }
            .mini-chart {
                min-height: 100px;
                color: #bbb;
                font-size: 0.85rem;
            }
            .streak-info,
            .stat-test {
                color: #bbb;
                font-size: 0.9rem;
                line-height: 1.5;
            }
            .export-btn {
                width: 100%;
                padding: 10px;
                margin-bottom: 8px;
                border: none;
                border-radius: 6px;
                background: #34495e;
                color: white;
                cursor: pointer;
                font-size: 0.9rem;
            }
            .export-btn:hover {
                background: #46627f;
            }
            
            /* Results Section */
            .results-section {
                background: rgba(255,255,255,0.95);
                border-top: 3px solid #d4af37;
                max-height: 280px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 20px;
                background: #f0f0f0;
                border-bottom: 1px solid #ddd;
            }
            .results-header h3 {
                margin: 0;
                color: #333;
            }
            .theoretical-display {
                color: #2ecc71;
                font-weight: bold;
            }
            .results-table-container {
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
                font-size: 0.9rem;
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
            
            /* Expert Mode */
            .expert-only {
                display: none;
            }
            body.expert-mode .expert-only {
                display: block !important;
            }
            
            /* Mobile Responsive */
            @media (max-width: 1200px) {
                .main-area {
                    flex-direction: column;
                }
                .left-sidebar,
                .right-panel {
                    width: 100%;
                    max-height: 300px;
                }
                .stats-dashboard {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 700px) {
                .top-bar h1 {
                    font-size: 1.2rem;
                }
                .deck-status {
                    font-size: 0.8rem;
                }
                .flipped-card {
                    width: 60px;
                    height: 84px;
                }
                .deck-pile {
                    width: 60px;
                    height: 84px;
                }
                .action-buttons {
                    flex-direction: column;
                }
                .action-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    buildDeckCheckboxes() {
        const container = document.getElementById('deck-checkboxes');
        container.innerHTML = '';
        
        for (let i = 0; i < this.state.numDecks; i++) {
            const div = document.createElement('div');
            div.className = 'deck-checkbox';
            const color = this.DECK_COLORS[i % this.DECK_COLORS.length];
            const checked = this.state.activeDecks.includes(i) ? 'checked' : '';
            
            div.innerHTML = `
                <input type="checkbox" id="deck-${i}" value="${i}" ${checked}>
                <label for="deck-${i}">
                    <span class="deck-color-dot" style="background: ${color}"></span>
                    D${i + 1}
                </label>
            `;
            
            div.querySelector('input').onchange = (e) => {
                e.stopPropagation();
                this.updateActiveDecksSidebar();
            };
            
            container.appendChild(div);
        }
    }

    buildTargetCardsGrid() {
        const grid = document.getElementById('target-cards-grid');
        grid.innerHTML = '';
        
        this.SUITS.forEach(suit => {
            [...this.RANKS, 'Joker'].forEach(rank => {
                const btn = document.createElement('button');
                btn.className = 'target-card-btn';
                const colorClass = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
                const suitEmoji = this.getSuitEmoji(suit);
                
                btn.innerHTML = `
                    <span class="card-suit ${colorClass}">${suitEmoji}</span>
                    <div>${rank}</div>
                `;
                
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleTargetCard(suit, rank, btn);
                };
                
                grid.appendChild(btn);
            });
        });
    }

    getSuitEmoji(suit) {
        const emojis = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return emojis[suit] || '';
    }

    toggleTargetCard(suit, rank, btn) {
        const index = this.state.targetCards.findIndex(c => c.suit === suit && c.rank === rank);
        
        if (index >= 0) {
            this.state.targetCards.splice(index, 1);
            btn.classList.remove('selected');
        } else {
            this.state.targetCards.push({ suit, rank });
            btn.classList.add('selected');
        }
        
        if (this.state.filterMode === 'individual') {
            this.initializeDeck();
            this.render();
        }
    }

    attachEventListeners() {
        // Expert mode toggle
        document.getElementById('expert-mode-toggle').onchange = (e) => {
            e.stopPropagation();
            this.state.expertMode = e.target.checked;
            document.body.classList.toggle('expert-mode', e.target.checked);
        };
        
        // Collapse sidebar
        document.getElementById('collapse-left').onclick = (e) => {
            e.stopPropagation();
            document.getElementById('left-sidebar').classList.toggle('collapsed');
            e.currentTarget.textContent = document.getElementById('left-sidebar').classList.contains('collapsed') ? '▶' : '◀';
        };
        
        // Deck configuration
        document.getElementById('num-decks-input').onchange = (e) => {
            this.state.numDecks = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
            e.target.value = this.state.numDecks;
            this.state.activeDecks = Array.from({length: this.state.numDecks}, (_, i) => i);
            this.state.selectedDecks = [...this.state.activeDecks];
            this.buildDeckCheckboxes();
            this.initializeDeck();
            this.render();
        };
        
        document.getElementById('joker-checkbox').onchange = (e) => {
            e.stopPropagation();
            this.state.includeJokers = e.target.checked;
            this.initializeDeck();
            this.render();
        };
        
        // Filter mode
        document.getElementById('filter-mode-select').onchange = (e) => {
            e.stopPropagation();
            this.state.filterMode = e.target.value;
            this.updateFilterOptions();
            this.initializeDeck();
            this.render();
        };
        
        // Controls
        document.getElementById('cards-per-flip').onchange = (e) => {
            this.state.cardsToFlip = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
            e.target.value = this.state.cardsToFlip;
        };
        
        document.getElementById('auto-flip-count').onchange = (e) => {
            this.state.autoFlipCount = Math.max(1, Math.min(10000, parseInt(e.target.value) || 10));
            e.target.value = this.state.autoFlipCount;
        };
        
        document.getElementById('speed-select').onchange = (e) => {
            e.stopPropagation();
            this.state.autoFlipSpeed = e.target.value;
        };
        
        // Action buttons
        document.getElementById('flip-btn').onclick = (e) => {
            e.stopPropagation();
            this.flipCards();
        };
        
        document.getElementById('auto-flip-btn').onclick = (e) => {
            e.stopPropagation();
            this.startAutoFlip();
        };
        
        document.getElementById('pause-btn').onclick = (e) => {
            e.stopPropagation();
            this.togglePause();
        };
        
        document.getElementById('stop-btn').onclick = (e) => {
            e.stopPropagation();
            this.stopAutoFlip();
        };
        
        document.getElementById('new-round-btn').onclick = (e) => {
            e.stopPropagation();
            this.addNewRound();
        };
        
        document.getElementById('clear-all-btn').onclick = (e) => {
            e.stopPropagation();
            if (confirm('Clear all results and start fresh?')) {
                this.clearAllResults();
            }
        };
        
        // Probability mode
        document.getElementById('probability-mode-select').onchange = (e) => {
            e.stopPropagation();
            this.state.probabilityMode = e.target.value;
            this.updateTableHeaders();
            this.clearAllResults();
        };
        
        // Export buttons (if expert mode)
        document.getElementById('export-csv-btn').onclick = (e) => {
            e.stopPropagation();
            this.exportCSV();
        };
        
        document.getElementById('export-json-btn').onclick = (e) => {
            e.stopPropagation();
            this.exportJSON();
        };
        
        document.getElementById('screenshot-btn').onclick = (e) => {
            e.stopPropagation();
            alert('Screenshot functionality would capture the results table. In a full implementation, this would use html2canvas or similar library.');
        };
    }

    updateActiveDecksSidebar() {
        this.state.activeDecks = [];
        for (let i = 0; i < this.state.numDecks; i++) {
            const checkbox = document.getElementById(`deck-${i}`);
            if (checkbox && checkbox.checked) {
                this.state.activeDecks.push(i);
            }
        }
        
        if (this.state.activeDecks.length === 0) {
            this.state.activeDecks = [0];
            document.getElementById('deck-0').checked = true;
        }
        
        this.state.selectedDecks = [...this.state.activeDecks];
        this.initializeDeck();
        this.render();
    }

    updateFilterOptions() {
        const container = document.getElementById('filter-options');
        container.innerHTML = '';
        
        switch (this.state.filterMode) {
            case 'suit':
                container.innerHTML = '<div class="filter-grid" id="suit-filters"></div>';
                this.SUITS.forEach(suit => {
                    const div = document.createElement('div');
                    div.className = 'filter-checkbox';
                    const checked = this.state.selectedSuits.includes(suit) ? 'checked' : '';
                    div.innerHTML = `
                        <input type="checkbox" id="suit-${suit}" value="${suit}" ${checked}>
                        <label for="suit-${suit}">${this.getSuitEmoji(suit)} ${suit}</label>
                    `;
                    div.querySelector('input').onchange = () => this.updateSuitFilters();
                    document.getElementById('suit-filters').appendChild(div);
                });
                break;
                
            case 'rank':
                container.innerHTML = '<div class="filter-grid" id="rank-filters"></div>';
                this.RANKS.forEach(rank => {
                    const div = document.createElement('div');
                    div.className = 'filter-checkbox';
                    const checked = this.state.selectedRanks.includes(rank) ? 'checked' : '';
                    div.innerHTML = `
                        <input type="checkbox" id="rank-${rank}" value="${rank}" ${checked}>
                        <label for="rank-${rank}">${rank}</label>
                    `;
                    div.querySelector('input').onchange = () => this.updateRankFilters();
                    document.getElementById('rank-filters').appendChild(div);
                });
                break;
        }
    }

    updateSuitFilters() {
        this.state.selectedSuits = [];
        this.SUITS.forEach(suit => {
            const checkbox = document.getElementById(`suit-${suit}`);
            if (checkbox && checkbox.checked) {
                this.state.selectedSuits.push(suit);
            }
        });
        this.initializeDeck();
        this.render();
    }

    updateRankFilters() {
        this.state.selectedRanks = [];
        this.RANKS.forEach(rank => {
            const checkbox = document.getElementById(`rank-${rank}`);
            if (checkbox && checkbox.checked) {
                this.state.selectedRanks.push(rank);
            }
        });
        this.initializeDeck();
        this.render();
    }

    getTableColumns() {
        switch (this.state.probabilityMode) {
            case 'even-odd':
                return ['Even', 'Odd'];
            case 'prime':
                return ['Prime', 'Composite', 'Neither'];
            case 'face-nonface':
                return ['Face', 'Non-Face'];
            case 'joker':
                return ['Joker', 'Regular'];
            case 'suit':
                return ['♥ Hearts', '♦ Diamonds', '♣ Clubs', '♠ Spades'];
            case 'color':
                return ['Red', 'Black'];
            case 'high-low':
                return ['High (8-K)', 'Low (A-7)'];
            case 'deck-source':
                return this.state.activeDecks.map(d => `Deck ${d + 1}`);
            case 'basic':
            default:
                return this.RANKS;
        }
    }

    updateTableHeaders() {
        const columns = this.getTableColumns();
        const thead = document.getElementById('results-thead');
        const tfoot = document.getElementById('results-tfoot');
        
        thead.innerHTML = `
            <tr>
                <th>Round</th>
                ${columns.map(col => `<th>${col}</th>`).join('')}
                <th>Total</th>
            </tr>
        `;
        
        this.state.grandTotals = {};
        columns.forEach((_, i) => this.state.grandTotals[i] = 0);
        
        tfoot.innerHTML = `
            <tr>
                <td>TOTAL</td>
                ${columns.map((_, i) => `<td id="grand-${i}">0<span class="pct">0.0%</span></td>`).join('')}
                <td id="grand-total">0</td>
            </tr>
        `;
    }

    categorizeCard(card) {
        const value = this.RANK_VALUES[card.rank];
        
        switch (this.state.probabilityMode) {
            case 'even-odd':
                return ['2', '4', '6', '8', '10'].includes(card.rank) ? 0 : 1;
            case 'prime':
                const primes = [2, 3, 5, 7, 11, 13];
                if (primes.includes(value)) return 0;
                if (value === 1 || value === 0) return 2;
                return 1;
            case 'face-nonface':
                return ['J', 'Q', 'K'].includes(card.rank) ? 0 : 1;
            case 'joker':
                return card.rank === 'Joker' ? 0 : 1;
            case 'suit':
                return this.SUITS.indexOf(card.suit);
            case 'color':
                return (card.suit === 'hearts' || card.suit === 'diamonds') ? 0 : 1;
            case 'high-low':
                return value >= 8 ? 0 : 1;
            case 'deck-source':
                return this.state.activeDecks.indexOf(card.deckIndex);
            case 'basic':
            default:
                return this.RANKS.indexOf(card.rank);
        }
    }

    async flipCards() {
        if (this.state.workingDeck.length === 0) {
            alert('Deck is empty! Results recorded.');
            return;
        }
        
        const numToFlip = Math.min(this.state.cardsToFlip, this.state.workingDeck.length);
        const flippedCards = [];
        
        for (let i = 0; i < numToFlip; i++) {
            flippedCards.push(this.state.workingDeck.pop());
        }
        
        await this.displayFlippedCards(flippedCards);
        
        flippedCards.forEach(card => {
            const category = this.categorizeCard(card);
            if (!this.state.rounds[this.state.currentRound - 1]) {
                this.state.rounds[this.state.currentRound - 1] = {};
            }
            if (!this.state.rounds[this.state.currentRound - 1][category]) {
                this.state.rounds[this.state.currentRound - 1][category] = 0;
            }
            this.state.rounds[this.state.currentRound - 1][category]++;
            this.state.grandTotals[category]++;
            this.state.totalFlips++;
            
            // Track deck source
            if (!this.state.statistics.deckSources[card.deckIndex]) {
                this.state.statistics.deckSources[card.deckIndex] = 0;
            }
            this.state.statistics.deckSources[card.deckIndex]++;
        });
        
        this.updateRoundDisplay();
        this.updateGrandTotals();
        this.updateStatsDashboard();
        this.render();
    }

    async displayFlippedCards(cards) {
        const flipArea = document.getElementById('flip-area');
        
        // Keep last 20 cards
        while (flipArea.children.length >= 20) {
            flipArea.removeChild(flipArea.firstChild);
        }
        
        for (const card of cards) {
            const cardEl = this.engine.renderCard(card, true);
            cardEl.classList.add('flipped-card');
            
            // Add deck badge
            const badge = document.createElement('div');
            badge.className = 'deck-badge';
            badge.style.background = card.deckColor;
            badge.textContent = card.deckIndex + 1;
            cardEl.appendChild(badge);
            
            // Mobile responsive
            const isMobile = window.innerWidth < 700;
            if (isMobile) {
                cardEl.style.width = '60px';
                cardEl.style.height = '84px';
                cardEl.style.fontSize = '0.7rem';
            }
            
            cardEl.style.opacity = '0';
            flipArea.appendChild(cardEl);
            
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    cardEl.style.transition = 'opacity 0.3s';
                    cardEl.style.opacity = '1';
                    setTimeout(resolve, 50);
                });
            });
        }
    }

    async startAutoFlip() {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.stopRequested = false;
        
        this.setButtonsRunningState();
        
        const delay = this.SPEED_DELAYS[this.state.autoFlipSpeed];
        
        for (let i = 0; i < this.state.autoFlipCount && !this.state.stopRequested; i++) {
            if (this.state.workingDeck.length === 0) {
                break;
            }
            
            while (this.state.isPaused && !this.state.stopRequested) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (this.state.stopRequested) break;
            
            await this.flipCards();
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.setButtonsIdleState();
    }

    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        document.getElementById('pause-btn').textContent = this.state.isPaused ? '▶ Resume' : '⏸ Pause';
    }

    stopAutoFlip() {
        this.state.stopRequested = true;
    }

    setButtonsRunningState() {
        document.getElementById('flip-btn').disabled = true;
        document.getElementById('auto-flip-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('stop-btn').disabled = false;
    }

    setButtonsIdleState() {
        document.getElementById('flip-btn').disabled = false;
        document.getElementById('auto-flip-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('pause-btn').textContent = '⏸ Pause';
    }

    updateRoundDisplay() {
        const tbody = document.getElementById('results-tbody');
        const columns = this.getTableColumns();
        
        let row = tbody.querySelector(`tr[data-round="${this.state.currentRound}"]`);
        if (!row) {
            row = document.createElement('tr');
            row.dataset.round = this.state.currentRound;
            tbody.appendChild(row);
        }
        
        const roundData = this.state.rounds[this.state.currentRound - 1] || {};
        let roundTotal = 0;
        columns.forEach((_, i) => {
            roundTotal += roundData[i] || 0;
        });
        
        row.innerHTML = `
            <td>${this.state.currentRound}</td>
            ${columns.map((_, i) => {
                const count = roundData[i] || 0;
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

    updateStatsDashboard() {
        document.getElementById('total-flips-stat').textContent = this.state.totalFlips;
        document.getElementById('current-round-stat').textContent = this.state.currentRound;
        document.getElementById('rounds-completed-stat').textContent = this.state.rounds.length - 1;
        
        // Update deck source chart
        if (this.state.expertMode) {
            this.updateDeckSourceChart();
        }
    }

    updateDeckSourceChart() {
        const container = document.getElementById('deck-source-chart');
        container.innerHTML = '';
        
        if (Object.keys(this.state.statistics.deckSources).length === 0) {
            container.innerHTML = '<p>No data yet</p>';
            return;
        }
        
        Object.entries(this.state.statistics.deckSources).forEach(([deckIndex, count]) => {
            const pct = ((count / this.state.totalFlips) * 100).toFixed(1);
            const color = this.DECK_COLORS[parseInt(deckIndex)];
            
            const bar = document.createElement('div');
            bar.style.cssText = `
                margin-bottom: 8px;
                font-size: 0.85rem;
            `;
            bar.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>Deck ${parseInt(deckIndex) + 1}</span>
                    <span>${count} (${pct}%)</span>
                </div>
                <div style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: ${color};"></div>
                </div>
            `;
            container.appendChild(bar);
        });
    }

    addNewRound() {
        this.state.currentRound++;
        this.updateStatsDashboard();
    }

    clearAllResults() {
        if (this.state.totalFlips > 0) {
            if (!confirm('Clear all results? This cannot be undone.')) {
                return;
            }
        }
        
        this.state.currentRound = 1;
        this.state.rounds = [];
        this.state.grandTotals = {};
        this.state.totalFlips = 0;
        this.state.statistics = {
            streaks: {},
            deckSources: {},
            timeSeriesData: []
        };
        
        const columns = this.getTableColumns();
        columns.forEach((_, i) => this.state.grandTotals[i] = 0);
        
        document.getElementById('results-tbody').innerHTML = '';
        document.getElementById('flip-area').innerHTML = '<p class="hint-text">Flipped cards appear here</p>';
        
        this.updateGrandTotals();
        this.updateStatsDashboard();
        this.initializeDeck();
        this.render();
    }

    exportCSV() {
        const columns = this.getTableColumns();
        let csv = 'Round,' + columns.join(',') + ',Total\n';
        
        this.state.rounds.forEach((roundData, index) => {
            const roundNum = index + 1;
            const values = columns.map((_, i) => roundData[i] || 0);
            const total = values.reduce((a, b) => a + b, 0);
            csv += `${roundNum},${values.join(',')},${total}\n`;
        });
        
        // Add totals row
        const totalValues = columns.map((_, i) => this.state.grandTotals[i] || 0);
        csv += `TOTAL,${totalValues.join(',')},${this.state.totalFlips}\n`;
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `probability-experiment-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportJSON() {
        const data = {
            metadata: {
                exportDate: new Date().toISOString(),
                numDecks: this.state.numDecks,
                includeJokers: this.state.includeJokers,
                probabilityMode: this.state.probabilityMode,
                totalFlips: this.state.totalFlips
            },
            rounds: this.state.rounds,
            grandTotals: this.state.grandTotals,
            statistics: this.state.statistics
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `probability-experiment-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    handleResize() {
        const isMobile = window.innerWidth < 700;
        
        document.querySelectorAll('.flipped-card').forEach(card => {
            card.style.width = isMobile ? '60px' : '80px';
            card.style.height = isMobile ? '84px' : '112px';
        });
    }

    render() {
        // Update displays
        document.getElementById('active-decks-display').textContent = this.state.activeDecks.length;
        
        const totalCards = this.state.numDecks * (this.state.includeJokers ? 56 : 52);
        document.getElementById('total-cards-display').textContent = totalCards;
        document.getElementById('remaining-cards-display').textContent = this.state.workingDeck.length;
        
        // Render deck piles
        this.renderDeckPiles();
    }

    renderDeckPiles() {
        const container = document.getElementById('deck-piles');
        container.innerHTML = '';
        
        this.state.activeDecks.forEach(deckIndex => {
            const cardsInDeck = this.state.workingDeck.filter(c => c.deckIndex === deckIndex).length;
            const color = this.DECK_COLORS[deckIndex % this.DECK_COLORS.length];
            
            const pile = document.createElement('div');
            pile.className = 'deck-pile';
            pile.style.borderColor = color;
            pile.style.background = `linear-gradient(135deg, ${color}33, ${color}11)`;
            pile.innerHTML = `
                <div class="pile-label">Deck ${deckIndex + 1}</div>
                <div class="pile-count">${cardsInDeck}</div>
            `;
            container.appendChild(pile);
        });
    }

    updateStats() {
        this.updateStatsDashboard();
    }

    pause() {
        if (this.state.isRunning) {
            this.togglePause();
        }
    }

    cleanup() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        this.stopAutoFlip();
        
        const styleElement = document.getElementById('advanced-analyzer-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['probability-advanced-analyzer-v1'] = AdvancedMultiDeckAnalyzer;