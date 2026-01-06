/**
 * Basic Probability Experiment
 * Simple probability simulator for 7th-grade students
 * Part 1 of 5 probability tools
 */

class BasicProbabilityExperiment {
    constructor(engine, deckData) {
        this.engine = engine;
        this.deck = deckData;
        this.resizeHandler = null;
        
        // State
        this.state = {
            // Deck configuration
            numDecks: 1,
            includeJokers: false,
            workingDeck: [],
            
            // Experiment settings
            cardsToFlip: 1,
            autoFlipCount: 10,
            isRunning: false,
            stopRequested: false,
            
            // Results tracking
            currentRound: 1,
            roundResults: {},
            grandTotals: {},
            totalFlips: 0,
            
            // Probability mode
            probabilityMode: 'basic',
            
            // UI state
            settingsOpen: false
        };
        
        // Constants
        this.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.RANK_VALUES = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
        };
    }

    setup() {
        this.initializeDeck();
        
        // Set up resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = () => this.render();
        window.addEventListener('resize', this.resizeHandler);
        
        this.buildUI();
        this.updateTableHeaders();
        this.render();
    }

    initializeDeck() {
        let cards = [];
        for (let d = 0; d < this.state.numDecks; d++) {
            const deckCards = this.engine.createCardArray(this.deck, this.state.includeJokers);
            deckCards.forEach(card => card.deckIndex = d);
            cards = cards.concat(deckCards);
        }
        this.state.workingDeck = this.engine.shuffleDeck(cards);
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
            
            <!-- Settings Modal -->
            <div id="settings-modal" class="settings-modal" style="display: none;">
                <div class="settings-content">
                    <span class="close-settings">&times;</span>
                    <h3>Experiment Settings</h3>
                    
                    <div class="setting-group">
                        <label>Number of Decks (1-8):</label>
                        <input type="number" id="num-decks" value="1" min="1" max="8">
                    </div>
                    
                    <div class="setting-group">
                        <label>Include Jokers:</label>
                        <div class="toggle-container">
                            <span>No</span>
                            <div class="toggle" id="joker-toggle">
                                <div class="toggle-slider"></div>
                            </div>
                            <span>Yes</span>
                        </div>
                    </div>
                    
                    <button id="apply-settings" class="primary-btn">Apply Settings</button>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="main-content">
                <!-- Card Display Area -->
                <div class="card-display-area">
                    <div class="deck-pile">
                        <div class="deck-count">Cards: <span id="deck-count">52</span></div>
                    </div>
                    <div class="flip-area" id="flip-area">
                        <p class="hint-text">Flipped cards appear here</p>
                    </div>
                </div>
                
                <!-- Controls Panel -->
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
                        <button id="new-round-btn" class="secondary-btn">➕ New Round</button>
                        <button id="clear-btn" class="secondary-btn">🗑 Clear Results</button>
                        <button id="shuffle-btn" class="secondary-btn">🔀 Shuffle</button>
                    </div>
                </div>
                
                <!-- Probability Mode Selector -->
                <div class="mode-selector">
                    <label>Probability Mode:</label>
                    <select id="probability-mode">
                        <option value="basic">Basic (Individual Ranks)</option>
                        <option value="even-odd">Even vs Odd</option>
                        <option value="face-nonface">Face Cards vs Non-Face</option>
                        <option value="color">Red vs Black</option>
                        <option value="suit">By Suit</option>
                    </select>
                </div>
            </div>
            
            <!-- Results Table -->
            <div class="results-container">
                <div class="results-header">
                    <h4>📊 Probability Results</h4>
                    <div class="theoretical-prob" id="theoretical-prob"></div>
                </div>
                <div class="results-table-wrapper">
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
    }

    injectStyles() {
        const existingStyle = document.getElementById('basic-probability-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'basic-probability-styles';
        style.textContent = `
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
            
            .settings-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .settings-content {
                background: #1a1a1a;
                padding: 30px;
                border-radius: 15px;
                border: 2px solid #d4af37;
                max-width: 500px;
                width: 90%;
            }
            .settings-content h3 {
                color: #d4af37;
                margin-bottom: 20px;
            }
            .close-settings {
                float: right;
                font-size: 30px;
                cursor: pointer;
                color: #888;
                line-height: 1;
            }
            .close-settings:hover { color: #fff; }
            
            .setting-group {
                margin-bottom: 20px;
            }
            .setting-group label {
                display: block;
                margin-bottom: 8px;
                color: #bbb;
            }
            .setting-group input[type="number"] {
                width: 100%;
                padding: 10px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
            }
            
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
            
            .main-content {
                flex: 1;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .card-display-area {
                display: flex;
                gap: 20px;
                min-height: 200px;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
                align-items: center;
                flex-wrap: wrap;
            }
            .deck-pile {
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
                    6px 6px 0 rgba(0,0,0,0.2);
            }
            .deck-count {
                color: #d4af37;
                font-weight: bold;
                text-align: center;
            }
            .flip-area {
                flex: 1;
                min-height: 150px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                align-items: center;
            }
            .hint-text {
                color: #666;
                font-style: italic;
            }
            
            .controls-panel {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
            }
            .control-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            .control-row label {
                min-width: 140px;
                color: #bbb;
            }
            .control-row input {
                width: 100px;
                padding: 10px;
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
                gap: 10px;
                margin-top: 15px;
            }
            
            .primary-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                background: #d4af37;
                color: #000;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 1rem;
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
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                background: #34495e;
                color: white;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 1rem;
            }
            .secondary-btn:hover:not(:disabled) {
                background: #46627f;
            }
            
            .mode-selector {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
            }
            .mode-selector label {
                color: #d4af37;
                font-weight: bold;
                margin-right: 15px;
                font-size: 1.1rem;
            }
            .mode-selector select {
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #444;
                background: #000;
                color: #fff;
                font-size: 1rem;
                min-width: 250px;
            }
            
            .results-container {
                background: rgba(255,255,255,0.95);
                border-top: 3px solid #d4af37;
                max-height: 300px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
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
                font-size: 1.1rem;
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
                padding: 12px 10px;
                font-size: 0.9rem;
                text-align: center;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            #results-table td {
                padding: 10px;
                text-align: center;
                border-bottom: 1px solid #eee;
            }
            #results-table .pct {
                display: block;
                font-size: 0.8rem;
                color: #666;
            }
            #results-table tfoot td {
                background: #f9f1d7;
                font-weight: bold;
                border-top: 2px solid #d4af37;
            }
            
            .flipped-card {
                width: 80px;
                height: 112px;
                border-radius: 6px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                transition: transform 0.3s;
            }
            .flipped-card:hover {
                transform: scale(1.05);
            }
            
            @media (max-width: 700px) {
                .control-row {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .control-row label {
                    min-width: auto;
                }
                .flipped-card {
                    width: 60px;
                    height: 84px;
                }
                .deck-pile {
                    width: 80px;
                    height: 112px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Settings
        document.getElementById('settings-btn').onclick = (e) => {
            e.stopPropagation();
            this.toggleSettings(true);
        };
        document.querySelector('.close-settings').onclick = (e) => {
            e.stopPropagation();
            this.toggleSettings(false);
        };
        document.getElementById('apply-settings').onclick = (e) => {
            e.stopPropagation();
            this.applySettings();
        };
        
        // Settings modal click outside to close
        document.getElementById('settings-modal').onclick = (e) => {
            if (e.target.id === 'settings-modal') {
                e.stopPropagation();
                this.toggleSettings(false);
            }
        };
        
        // Prevent clicks inside modal from closing it
        document.querySelector('.settings-content').onclick = (e) => {
            e.stopPropagation();
        };
        
        // Toggle
        document.getElementById('joker-toggle').onclick = (e) => {
            e.stopPropagation();
            e.currentTarget.classList.toggle('active');
        };
        
        // Controls
        document.getElementById('flip-btn').onclick = (e) => {
            e.stopPropagation();
            this.flipCards();
        };
        document.getElementById('auto-flip-btn').onclick = (e) => {
            e.stopPropagation();
            this.startAutoFlip();
        };
        document.getElementById('stop-btn').onclick = (e) => {
            e.stopPropagation();
            this.stopAutoFlip();
        };
        document.getElementById('new-round-btn').onclick = (e) => {
            e.stopPropagation();
            this.addNewRound();
        };
        document.getElementById('clear-btn').onclick = (e) => {
            e.stopPropagation();
            this.clearResults();
        };
        document.getElementById('shuffle-btn').onclick = (e) => {
            e.stopPropagation();
            this.shuffleDeck();
        };
        
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
            e.stopPropagation();
            this.state.probabilityMode = e.target.value;
            this.updateTableHeaders();
            this.clearResults();
        };
    }

    toggleSettings(show) {
        document.getElementById('settings-modal').style.display = show ? 'flex' : 'none';
        this.state.settingsOpen = show;
    }

    applySettings() {
        const numDecks = parseInt(document.getElementById('num-decks').value) || 1;
        const includeJokers = document.getElementById('joker-toggle').classList.contains('active');
        
        this.state.numDecks = Math.max(1, Math.min(8, numDecks));
        this.state.includeJokers = includeJokers;
        
        this.initializeDeck();
        this.updateTableHeaders();
        this.clearResults();
        this.toggleSettings(false);
        this.render();
    }

    getTableColumns() {
        switch (this.state.probabilityMode) {
            case 'even-odd':
                return ['Even', 'Odd'];
            case 'face-nonface':
                return ['Face Card', 'Non-Face'];
            case 'color':
                return ['Red', 'Black'];
            case 'suit':
                return ['♥ Hearts', '♦ Diamonds', '♣ Clubs', '♠ Spades'];
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

    updateTheoreticalDisplay() {
        const display = document.getElementById('theoretical-prob');
        const prob = this.calculateTheoretical();
        display.textContent = `Theoretical: ${prob}`;
    }

    calculateTheoretical() {
        const total = this.state.workingDeck.length;
        
        switch (this.state.probabilityMode) {
            case 'even-odd':
                const even = this.state.workingDeck.filter(c => 
                    ['2', '4', '6', '8', '10'].includes(c.rank)
                ).length;
                return `${even}/${total} = ${((even/total)*100).toFixed(1)}%`;
            case 'face-nonface':
                const face = this.state.workingDeck.filter(c => 
                    ['J', 'Q', 'K'].includes(c.rank)
                ).length;
                return `${face}/${total} = ${((face/total)*100).toFixed(1)}%`;
            case 'color':
                const red = this.state.workingDeck.filter(c => 
                    c.suit === 'hearts' || c.suit === 'diamonds'
                ).length;
                return `${red}/${total} = ${((red/total)*100).toFixed(1)}%`;
            case 'suit':
                const hearts = this.state.workingDeck.filter(c => c.suit === 'hearts').length;
                return `${hearts}/${total} each suit`;
            default:
                return 'Varies by rank';
        }
    }

    categorizeCard(card) {
        switch (this.state.probabilityMode) {
            case 'even-odd':
                return ['2', '4', '6', '8', '10'].includes(card.rank) ? 0 : 1;
            case 'face-nonface':
                return ['J', 'Q', 'K'].includes(card.rank) ? 0 : 1;
            case 'color':
                return (card.suit === 'hearts' || card.suit === 'diamonds') ? 0 : 1;
            case 'suit':
                return this.SUITS.indexOf(card.suit);
            case 'basic':
            default:
                return this.RANKS.indexOf(card.rank);
        }
    }

    async flipCards() {
        if (this.state.workingDeck.length === 0) {
            alert('Deck is empty! Shuffle to continue.');
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
            if (!this.state.roundResults[category]) {
                this.state.roundResults[category] = 0;
            }
            this.state.roundResults[category]++;
            this.state.grandTotals[category]++;
            this.state.totalFlips++;
        });
        
        this.updateRoundDisplay();
        this.updateGrandTotals();
        this.render();
    }

    async displayFlippedCards(cards) {
        const flipArea = document.getElementById('flip-area');
        flipArea.innerHTML = '';
        
        for (const card of cards) {
            const cardEl = this.engine.renderCard(card, true);
            cardEl.classList.add('flipped-card');
            
            // Mobile responsive sizing
            const isMobile = window.innerWidth < 700;
            if (isMobile) {
                cardEl.style.width = '60px';
                cardEl.style.height = '84px';
                cardEl.style.fontSize = '0.7rem';
            }
            
            flipArea.appendChild(cardEl);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async startAutoFlip() {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.state.stopRequested = false;
        
        document.getElementById('flip-btn').disabled = true;
        document.getElementById('auto-flip-btn').disabled = true;
        document.getElementById('stop-btn').disabled = false;
        
        for (let i = 0; i < this.state.autoFlipCount && !this.state.stopRequested; i++) {
            if (this.state.workingDeck.length === 0) {
                this.initializeDeck();
            }
            await this.flipCards();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.state.isRunning = false;
        document.getElementById('flip-btn').disabled = false;
        document.getElementById('auto-flip-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
    }

    stopAutoFlip() {
        this.state.stopRequested = true;
    }

    updateRoundDisplay() {
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
    }

    shuffleDeck() {
        this.initializeDeck();
        this.render();
    }

    render() {
        document.getElementById('deck-count').textContent = this.state.workingDeck.length;
    }

    updateStats() {
        this.render();
    }

    pause() {
        this.stopAutoFlip();
    }

    cleanup() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        const styleElement = document.getElementById('basic-probability-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['probability-basic-experiment-v1'] = BasicProbabilityExperiment;