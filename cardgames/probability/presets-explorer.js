/**
 * Probability Presets Explorer
 * Pre-configured probability scenarios for quick exploration
 * Part 2 of 5 probability tools
 */

class ProbabilityPresetsExplorer {
    constructor(engine, deckData) {
        this.engine = engine;
        this.deck = deckData;
        this.resizeHandler = null;
        
        // State
        this.state = {
            // Current preset
            activePreset: null,
            
            // Deck
            workingDeck: [],
            
            // Results tracking
            results: {},
            totalFlips: 0,
            
            // Running state
            isRunning: false,
            stopRequested: false
        };
        
        // Preset definitions
        this.presets = [
            {
                id: 'even-odd',
                title: 'Even vs Odd Numbers',
                description: 'What is the probability of drawing an even-numbered card (2, 4, 6, 8, 10)?',
                theoretical: '20/52 ≈ 38.5%',
                difficulty: 'easy',
                decks: 1,
                jokers: false,
                categories: ['Even', 'Odd'],
                categorize: (card) => {
                    return ['2', '4', '6', '8', '10'].includes(card.rank) ? 0 : 1;
                },
                explanation: 'There are 20 even-numbered cards (5 even numbers × 4 suits) out of 52 total cards.',
                whyItMatters: 'Understanding even and odd helps with number sense and probability basics!',
                realWorld: 'Like flipping a coin - but cards give us more options to explore!',
                exampleCards: ['hearts-2', 'hearts-4', 'hearts-6', 'hearts-8', 'hearts-10']
            },
            {
                id: 'prime-numbers',
                title: 'Prime Numbers',
                description: 'What is the probability of drawing a prime-numbered card (2, 3, 5, 7)?',
                theoretical: '16/52 ≈ 30.8%',
                difficulty: 'medium',
                decks: 1,
                jokers: false,
                categories: ['Prime', 'Not Prime'],
                categorize: (card) => {
                    const primes = ['2', '3', '5', '7'];
                    return primes.includes(card.rank) ? 0 : 1;
                },
                explanation: 'Prime numbers (2, 3, 5, 7) appear on 16 cards (4 ranks × 4 suits).',
                whyItMatters: 'Prime numbers are special in math - they can only be divided by 1 and themselves!',
                realWorld: 'Prime numbers are used in computer security and encryption.',
                exampleCards: ['hearts-2', 'diamonds-3', 'clubs-5', 'spades-7']
            },
            {
                id: 'face-cards',
                title: 'Face Cards',
                description: 'What is the probability of drawing a Jack, Queen, or King?',
                theoretical: '12/52 ≈ 23.1%',
                difficulty: 'easy',
                decks: 1,
                jokers: false,
                categories: ['Face Card', 'Number Card'],
                categorize: (card) => {
                    return ['J', 'Q', 'K'].includes(card.rank) ? 0 : 1;
                },
                explanation: 'There are 12 face cards (3 ranks × 4 suits) in a standard deck.',
                whyItMatters: 'Face cards are special - they represent royalty in the deck!',
                realWorld: 'Many card games give face cards special values or powers.',
                exampleCards: ['hearts-jack', 'diamonds-queen', 'clubs-king']
            },
            {
                id: 'red-black',
                title: 'Red vs Black',
                description: 'What is the probability of drawing a red card (hearts or diamonds)?',
                theoretical: '26/52 = 50%',
                difficulty: 'easy',
                decks: 1,
                jokers: false,
                categories: ['Red', 'Black'],
                categorize: (card) => {
                    return (card.suit === 'hearts' || card.suit === 'diamonds') ? 0 : 1;
                },
                explanation: 'Exactly half the deck is red (hearts and diamonds) and half is black (clubs and spades).',
                whyItMatters: 'This is a perfect 50/50 probability - like flipping a coin!',
                realWorld: 'In roulette, betting on red or black gives you nearly 50/50 odds.',
                exampleCards: ['hearts-ace', 'diamonds-king', 'clubs-queen', 'spades-jack']
            },
            {
                id: 'specific-suit',
                title: 'Drawing a Specific Suit',
                description: 'What is the probability of drawing a heart?',
                theoretical: '13/52 = 25%',
                difficulty: 'easy',
                decks: 1,
                jokers: false,
                categories: ['♥ Hearts', '♦ Diamonds', '♣ Clubs', '♠ Spades'],
                categorize: (card) => {
                    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                    return suits.indexOf(card.suit);
                },
                explanation: 'Each suit has exactly 13 cards, so each suit is 1/4 of the deck.',
                whyItMatters: 'All four suits are equally likely - the deck is perfectly balanced!',
                realWorld: 'Understanding equal probability helps in fair games and random selection.',
                exampleCards: ['hearts-ace', 'hearts-5', 'hearts-10', 'hearts-king']
            },
            {
                id: 'aces',
                title: 'Drawing an Ace',
                description: 'What is the probability of drawing any Ace?',
                theoretical: '4/52 ≈ 7.7%',
                difficulty: 'easy',
                decks: 1,
                jokers: false,
                categories: ['Ace', 'Not Ace'],
                categorize: (card) => {
                    return card.rank === 'A' ? 0 : 1;
                },
                explanation: 'There are only 4 Aces in the deck (one per suit).',
                whyItMatters: 'Aces are rare - only about 1 in 13 cards!',
                realWorld: 'In many games, Aces are the most powerful cards because they are rare.',
                exampleCards: ['hearts-ace', 'diamonds-ace', 'clubs-ace', 'spades-ace']
            },
            {
                id: 'high-cards',
                title: 'High Cards (8-K)',
                description: 'What is the probability of drawing a card 8 or higher?',
                theoretical: '28/52 ≈ 53.8%',
                difficulty: 'medium',
                decks: 1,
                jokers: false,
                categories: ['High (8-K)', 'Low (A-7)'],
                categorize: (card) => {
                    const highCards = ['8', '9', '10', 'J', 'Q', 'K'];
                    return highCards.includes(card.rank) ? 0 : 1;
                },
                explanation: 'There are 6 high ranks (8, 9, 10, J, Q, K) × 4 suits = 24 cards, plus 4 aces makes 28.',
                whyItMatters: 'Most cards are actually high cards - more than half the deck!',
                realWorld: 'In games like poker, high cards often beat low cards.',
                exampleCards: ['hearts-8', 'diamonds-10', 'clubs-queen', 'spades-king']
            },
            {
                id: 'jokers',
                title: 'Drawing a Joker',
                description: 'What is the probability of drawing a Joker (when jokers are included)?',
                theoretical: '4/56 ≈ 7.1%',
                difficulty: 'easy',
                decks: 1,
                jokers: true,
                categories: ['Joker', 'Regular Card'],
                categorize: (card) => {
                    return card.rank === 'Joker' ? 0 : 1;
                },
                explanation: 'With 4 jokers added to the 52-card deck, jokers make up 4 out of 56 cards.',
                whyItMatters: 'Jokers are wild cards in many games - they can be anything you want!',
                realWorld: 'The joker represents unpredictability and surprise in card games.',
                exampleCards: ['hearts-joker', 'diamonds-joker', 'clubs-joker', 'spades-joker']
            },
            {
                id: 'not-face',
                title: 'NOT a Face Card',
                description: 'What is the probability of NOT drawing a Jack, Queen, or King?',
                theoretical: '40/52 ≈ 76.9%',
                difficulty: 'easy',
                decks: 1,
                jokers: false,
                categories: ['Not Face', 'Face Card'],
                categorize: (card) => {
                    return ['J', 'Q', 'K'].includes(card.rank) ? 1 : 0;
                },
                explanation: 'Only 12 cards are face cards, so 40 cards are NOT face cards.',
                whyItMatters: 'Sometimes it\'s easier to calculate what WON\'T happen!',
                realWorld: 'In probability, finding the complement (NOT) is a useful trick.',
                exampleCards: ['hearts-ace', 'diamonds-5', 'clubs-7', 'spades-10']
            },
            {
                id: 'hearts-and-face',
                title: 'Hearts AND Face Card',
                description: 'What is the probability of drawing a card that is BOTH a heart AND a face card?',
                theoretical: '3/52 ≈ 5.8%',
                difficulty: 'hard',
                decks: 1,
                jokers: false,
                categories: ['Hearts+Face', 'Other'],
                categorize: (card) => {
                    return (card.suit === 'hearts' && ['J', 'Q', 'K'].includes(card.rank)) ? 0 : 1;
                },
                explanation: 'Only 3 cards are both hearts AND face cards: Jack, Queen, and King of hearts.',
                whyItMatters: 'When both conditions must be true, probability gets smaller!',
                realWorld: 'This is like finding someone who is both tall AND left-handed - rarer than just one trait.',
                exampleCards: ['hearts-jack', 'hearts-queen', 'hearts-king']
            },
            {
                id: 'red-or-face',
                title: 'Red OR Face Card',
                description: 'What is the probability of drawing a card that is red OR a face card (or both)?',
                theoretical: '32/52 ≈ 61.5%',
                difficulty: 'hard',
                decks: 1,
                jokers: false,
                categories: ['Red or Face', 'Black Number'],
                categorize: (card) => {
                    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
                    const isFace = ['J', 'Q', 'K'].includes(card.rank);
                    return (isRed || isFace) ? 0 : 1;
                },
                explanation: '26 red cards + 6 black face cards = 32 cards that are red OR face (or both).',
                whyItMatters: 'When EITHER condition is true, probability gets bigger!',
                realWorld: 'This is like finding someone who is tall OR plays sports - more common than both together.',
                exampleCards: ['hearts-2', 'diamonds-queen', 'clubs-jack', 'spades-king']
            },
            {
                id: 'multi-deck',
                title: 'Multi-Deck Experiment',
                description: 'Draw from 4 decks - how does this change the probability of getting an Ace?',
                theoretical: '16/208 ≈ 7.7% (same!)',
                difficulty: 'medium',
                decks: 4,
                jokers: false,
                categories: ['Ace', 'Not Ace'],
                categorize: (card) => {
                    return card.rank === 'A' ? 0 : 1;
                },
                explanation: 'With 4 decks, you have 16 Aces out of 208 cards - the percentage stays the same!',
                whyItMatters: 'More decks means more cards, but the probability percentage doesn\'t change!',
                realWorld: 'Casinos use multiple decks in blackjack, but the odds stay mathematically the same.',
                exampleCards: ['hearts-ace', 'diamonds-ace', 'clubs-ace', 'spades-ace']
            }
        ];
    }

    setup() {
        // Set up resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = () => this.render();
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
            <div class="presets-layout">
                <!-- Left Panel: Preset Cards -->
                <div class="presets-panel">
                    <div class="panel-header">
                        <h3>📊 Choose a Probability Experiment</h3>
                        <p class="subtitle">Click any card to try it!</p>
                    </div>
                    <div class="presets-grid" id="presets-grid"></div>
                </div>
                
                <!-- Right Panel: Active Experiment -->
                <div class="experiment-panel" id="experiment-panel">
                    <div class="empty-state" id="empty-state">
                        <div class="empty-icon">🎴</div>
                        <h3>No Experiment Selected</h3>
                        <p>Choose a preset from the left to get started!</p>
                    </div>
                    
                    <div class="active-experiment" id="active-experiment" style="display: none;">
                        <!-- Experiment Header -->
                        <div class="exp-header">
                            <h2 id="exp-title"></h2>
                            <div class="theoretical-badge" id="exp-theoretical"></div>
                        </div>
                        
                        <!-- Description & Info -->
                        <div class="exp-info">
                            <p class="exp-description" id="exp-description"></p>
                            <div class="info-boxes">
                                <div class="info-box">
                                    <strong>💡 Why This Matters:</strong>
                                    <p id="exp-why"></p>
                                </div>
                                <div class="info-box">
                                    <strong>🌎 Real World:</strong>
                                    <p id="exp-real"></p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Example Cards -->
                        <div class="example-cards">
                            <h4>Example Cards to Look For:</h4>
                            <div class="cards-display" id="example-cards-display"></div>
                        </div>
                        
                        <!-- Card Display Area -->
                        <div class="flip-zone">
                            <div class="deck-pile">
                                <div class="deck-count">Deck: <span id="deck-count">52</span></div>
                            </div>
                            <div class="flip-area" id="flip-area">
                                <p class="hint-text">Cards appear here when you flip</p>
                            </div>
                        </div>
                        
                        <!-- Controls -->
                        <div class="controls">
                            <button id="flip-1-btn" class="control-btn primary">Flip 1 Card</button>
                            <button id="flip-10-btn" class="control-btn primary">Flip 10 Cards</button>
                            <button id="flip-50-btn" class="control-btn primary">Flip 50 Cards</button>
                            <button id="reset-btn" class="control-btn secondary">🔄 Reset</button>
                        </div>
                        
                        <!-- Results Display -->
                        <div class="results-display" id="results-display">
                            <h4>📈 Your Results vs Expected</h4>
                            <div class="results-bars" id="results-bars"></div>
                            <div class="accuracy-message" id="accuracy-message"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
        this.buildPresetCards();
        this.attachEventListeners();
    }

    injectStyles() {
        const existingStyle = document.getElementById('presets-explorer-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'presets-explorer-styles';
        style.textContent = `
            .presets-layout {
                display: flex;
                height: 100vh;
                overflow: hidden;
            }
            
            /* Left Panel */
            .presets-panel {
                width: 380px;
                background: rgba(0,0,0,0.3);
                border-right: 2px solid #d4af37;
                display: flex;
                flex-direction: column;
            }
            .panel-header {
                padding: 20px;
                background: rgba(0,0,0,0.5);
                border-bottom: 1px solid #444;
            }
            .panel-header h3 {
                color: #d4af37;
                margin: 0 0 5px 0;
            }
            .panel-header .subtitle {
                color: #aaa;
                font-size: 0.9rem;
                margin: 0;
            }
            .presets-grid {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            /* Preset Cards */
            .preset-card {
                background: rgba(0,0,0,0.4);
                border: 2px solid #333;
                border-radius: 12px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s;
                position: relative;
            }
            .preset-card:hover {
                border-color: #d4af37;
                transform: translateX(5px);
                box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
            }
            .preset-card.active {
                border-color: #d4af37;
                background: rgba(212, 175, 55, 0.2);
            }
            .preset-card .difficulty-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: bold;
            }
            .preset-card .difficulty-badge.easy {
                background: #2ecc71;
                color: #000;
            }
            .preset-card .difficulty-badge.medium {
                background: #f39c12;
                color: #000;
            }
            .preset-card .difficulty-badge.hard {
                background: #e74c3c;
                color: #fff;
            }
            .preset-card h4 {
                color: #d4af37;
                margin: 0 0 8px 0;
                font-size: 1rem;
            }
            .preset-card p {
                color: #bbb;
                font-size: 0.85rem;
                margin: 0 0 8px 0;
                line-height: 1.4;
            }
            .preset-card .theoretical {
                color: #00ffcc;
                font-weight: bold;
                font-size: 0.9rem;
            }
            
            /* Right Panel */
            .experiment-panel {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            /* Empty State */
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                text-align: center;
                color: #666;
            }
            .empty-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }
            .empty-state h3 {
                color: #888;
                margin-bottom: 10px;
            }
            
            /* Active Experiment */
            .active-experiment {
                max-width: 900px;
                margin: 0 auto;
            }
            .exp-header {
                text-align: center;
                margin-bottom: 25px;
            }
            .exp-header h2 {
                color: #d4af37;
                margin: 0 0 10px 0;
            }
            .theoretical-badge {
                display: inline-block;
                background: rgba(0, 255, 204, 0.2);
                border: 2px solid #00ffcc;
                color: #00ffcc;
                padding: 8px 20px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 1.1rem;
            }
            
            /* Info Section */
            .exp-info {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .exp-description {
                font-size: 1.1rem;
                margin-bottom: 15px;
                color: #fff;
            }
            .info-boxes {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            .info-box {
                background: rgba(0,0,0,0.4);
                padding: 12px;
                border-radius: 8px;
                border-left: 3px solid #d4af37;
            }
            .info-box strong {
                color: #d4af37;
                display: block;
                margin-bottom: 5px;
            }
            .info-box p {
                margin: 0;
                color: #ccc;
                font-size: 0.9rem;
                line-height: 1.4;
            }
            
            /* Example Cards */
            .example-cards {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .example-cards h4 {
                color: #d4af37;
                margin: 0 0 10px 0;
            }
            .cards-display {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .example-card {
                width: 70px;
                height: 98px;
                border-radius: 6px;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            }
            
            /* Flip Zone */
            .flip-zone {
                display: flex;
                gap: 20px;
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                min-height: 150px;
                align-items: center;
            }
            .deck-pile {
                width: 90px;
                height: 126px;
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
                font-size: 0.9rem;
            }
            .flip-area {
                flex: 1;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                align-items: center;
                min-height: 126px;
            }
            .hint-text {
                color: #666;
                font-style: italic;
            }
            .flipped-card {
                width: 70px;
                height: 98px;
                border-radius: 6px;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                transition: transform 0.2s;
            }
            .flipped-card:hover {
                transform: scale(1.05);
            }
            
            /* Controls */
            .controls {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
                margin-bottom: 25px;
            }
            .control-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .control-btn.primary {
                background: #d4af37;
                color: #000;
            }
            .control-btn.primary:hover:not(:disabled) {
                background: #f1c40f;
                transform: translateY(-2px);
            }
            .control-btn.secondary {
                background: #34495e;
                color: white;
            }
            .control-btn.secondary:hover:not(:disabled) {
                background: #46627f;
            }
            .control-btn:disabled {
                background: #555;
                color: #888;
                cursor: not-allowed;
            }
            
            /* Results Display */
            .results-display {
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 20px;
            }
            .results-display h4 {
                color: #d4af37;
                margin: 0 0 15px 0;
                text-align: center;
            }
            .results-bars {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-bottom: 15px;
            }
            .result-bar {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .result-bar-header {
                display: flex;
                justify-content: space-between;
                font-size: 0.9rem;
            }
            .result-label {
                font-weight: bold;
                color: #d4af37;
            }
            .result-values {
                color: #bbb;
            }
            .bar-container {
                height: 30px;
                background: rgba(0,0,0,0.5);
                border-radius: 15px;
                overflow: hidden;
                position: relative;
            }
            .bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #d4af37, #f1c40f);
                border-radius: 15px;
                transition: width 0.5s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: #000;
                font-size: 0.85rem;
            }
            .accuracy-message {
                text-align: center;
                padding: 15px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1.1rem;
            }
            .accuracy-message.excellent {
                background: rgba(46, 204, 113, 0.2);
                border: 2px solid #2ecc71;
                color: #2ecc71;
            }
            .accuracy-message.good {
                background: rgba(52, 152, 219, 0.2);
                border: 2px solid #3498db;
                color: #3498db;
            }
            .accuracy-message.keep-going {
                background: rgba(243, 156, 18, 0.2);
                border: 2px solid #f39c12;
                color: #f39c12;
            }
            
            /* Mobile Responsive */
            @media (max-width: 900px) {
                .presets-layout {
                    flex-direction: column;
                }
                .presets-panel {
                    width: 100%;
                    max-height: 40vh;
                    border-right: none;
                    border-bottom: 2px solid #d4af37;
                }
                .info-boxes {
                    grid-template-columns: 1fr;
                }
                .example-card {
                    width: 60px;
                    height: 84px;
                }
                .flipped-card {
                    width: 60px;
                    height: 84px;
                }
                .deck-pile {
                    width: 70px;
                    height: 98px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    buildPresetCards() {
        const grid = document.getElementById('presets-grid');
        grid.innerHTML = '';
        
        this.presets.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.dataset.presetId = preset.id;
            
            card.innerHTML = `
                <div class="difficulty-badge ${preset.difficulty}">${preset.difficulty.toUpperCase()}</div>
                <h4>${preset.title}</h4>
                <p>${preset.description}</p>
                <div class="theoretical">Theoretical: ${preset.theoretical}</div>
            `;
            
            card.onclick = (e) => {
                e.stopPropagation();
                this.loadPreset(preset);
            };
            
            grid.appendChild(card);
        });
    }

    loadPreset(preset) {
        this.state.activePreset = preset;
        this.state.results = {};
        this.state.totalFlips = 0;
        
        // Update active state in preset cards
        document.querySelectorAll('.preset-card').forEach(card => {
            card.classList.toggle('active', card.dataset.presetId === preset.id);
        });
        
        // Initialize deck
        let cards = [];
        for (let d = 0; d < preset.decks; d++) {
            const deckCards = this.engine.createCardArray(this.deck, preset.jokers);
            cards = cards.concat(deckCards);
        }
        this.state.workingDeck = this.engine.shuffleDeck(cards);
        
        // Show experiment panel
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('active-experiment').style.display = 'block';
        
        // Populate experiment details
        document.getElementById('exp-title').textContent = preset.title;
        document.getElementById('exp-theoretical').textContent = `Theoretical: ${preset.theoretical}`;
        document.getElementById('exp-description').textContent = preset.description;
        document.getElementById('exp-why').textContent = preset.whyItMatters;
        document.getElementById('exp-real').textContent = preset.realWorld;
        
        // Display example cards
        this.displayExampleCards(preset.exampleCards);
        
        // Initialize results
        preset.categories.forEach((_, i) => {
            this.state.results[i] = 0;
        });
        
        this.render();
        this.updateResults();
    }

    displayExampleCards(cardIds) {
        const container = document.getElementById('example-cards-display');
        container.innerHTML = '';
        
        cardIds.forEach(cardId => {
            const [suit, rank] = cardId.split('-');
            const card = this.state.workingDeck.find(c => 
                c.suit === suit && c.rank.toLowerCase() === rank.toLowerCase()
            );
            if (card) {
                const cardEl = this.engine.renderCard(card, true);
                cardEl.classList.add('example-card');
                
                // Mobile responsive sizing
                const isMobile = window.innerWidth < 900;
                if (isMobile) {
                    cardEl.style.width = '60px';
                    cardEl.style.height = '84px';
                    cardEl.style.fontSize = '0.7rem';
                }
                
                container.appendChild(cardEl);
            }
        });
    }

    attachEventListeners() {
        document.getElementById('flip-1-btn').onclick = (e) => {
            e.stopPropagation();
            this.flipCards(1);
        };
        document.getElementById('flip-10-btn').onclick = (e) => {
            e.stopPropagation();
            this.flipCards(10);
        };
        document.getElementById('flip-50-btn').onclick = (e) => {
            e.stopPropagation();
            this.flipCards(50);
        };
        document.getElementById('reset-btn').onclick = (e) => {
            e.stopPropagation();
            this.resetExperiment();
        };
    }

    async flipCards(count) {
        if (!this.state.activePreset) return;
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.disableButtons(true);
        
        for (let i = 0; i < count; i++) {
            if (this.state.workingDeck.length === 0) {
                // Reshuffle
                let cards = [];
                for (let d = 0; d < this.state.activePreset.decks; d++) {
                    const deckCards = this.engine.createCardArray(this.deck, this.state.activePreset.jokers);
                    cards = cards.concat(deckCards);
                }
                this.state.workingDeck = this.engine.shuffleDeck(cards);
            }
            
            const card = this.state.workingDeck.pop();
            await this.displayFlippedCard(card);
            
            const category = this.state.activePreset.categorize(card);
            this.state.results[category]++;
            this.state.totalFlips++;
            
            this.render();
            this.updateResults();
            
            if (count > 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        this.state.isRunning = false;
        this.disableButtons(false);
    }

    async displayFlippedCard(card) {
        const flipArea = document.getElementById('flip-area');
        
        // Keep only last 10 cards
        while (flipArea.children.length >= 10) {
            flipArea.removeChild(flipArea.firstChild);
        }
        
        const cardEl = this.engine.renderCard(card, true);
        cardEl.classList.add('flipped-card');
        
        // Mobile responsive sizing
        const isMobile = window.innerWidth < 900;
        if (isMobile) {
            cardEl.style.width = '60px';
            cardEl.style.height = '84px';
            cardEl.style.fontSize = '0.7rem';
        }
        
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.8)';
        flipArea.appendChild(cardEl);
        
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                cardEl.style.transition = 'all 0.3s ease';
                cardEl.style.opacity = '1';
                cardEl.style.transform = 'scale(1)';
                setTimeout(resolve, 300);
            });
        });
    }

    updateResults() {
        if (!this.state.activePreset || this.state.totalFlips === 0) {
            document.getElementById('results-bars').innerHTML = '<p style="color: #666; text-align: center;">Flip some cards to see results!</p>';
            document.getElementById('accuracy-message').innerHTML = '';
            return;
        }
        
        const barsContainer = document.getElementById('results-bars');
        barsContainer.innerHTML = '';
        
        this.state.activePreset.categories.forEach((category, i) => {
            const count = this.state.results[i] || 0;
            const percentage = ((count / this.state.totalFlips) * 100).toFixed(1);
            
            const barDiv = document.createElement('div');
            barDiv.className = 'result-bar';
            barDiv.innerHTML = `
                <div class="result-bar-header">
                    <span class="result-label">${category}</span>
                    <span class="result-values">${count} / ${this.state.totalFlips} (${percentage}%)</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%">${percentage}%</div>
                </div>
            `;
            barsContainer.appendChild(barDiv);
        });
        
        // Calculate accuracy
        this.showAccuracyMessage();
    }

    showAccuracyMessage() {
        const messageEl = document.getElementById('accuracy-message');
        
        if (this.state.totalFlips < 10) {
            messageEl.className = 'accuracy-message keep-going';
            messageEl.innerHTML = '🎯 Keep going! Try at least 50 flips to see clearer patterns.';
            return;
        }
        
        // Calculate how close we are to theoretical
        const firstCategory = this.state.results[0] || 0;
        const firstPercentage = (firstCategory / this.state.totalFlips) * 100;
        
        // Parse theoretical percentage
        const theoreticalMatch = this.state.activePreset.theoretical.match(/([\d.]+)%/);
        const theoreticalPct = theoreticalMatch ? parseFloat(theoreticalMatch[1]) : 50;
        
        const difference = Math.abs(firstPercentage - theoreticalPct);
        
        if (difference < 5) {
            messageEl.className = 'accuracy-message excellent';
            messageEl.innerHTML = '🎉 Excellent! Your results are very close to the theoretical probability!';
        } else if (difference < 10) {
            messageEl.className = 'accuracy-message good';
            messageEl.innerHTML = '✅ Good work! Your results are getting close to the expected probability.';
        } else {
            messageEl.className = 'accuracy-message keep-going';
            messageEl.innerHTML = '📊 Keep flipping! More trials will get you closer to the theoretical probability.';
        }
    }

    resetExperiment() {
        if (!this.state.activePreset) return;
        
        this.state.results = {};
        this.state.totalFlips = 0;
        
        this.state.activePreset.categories.forEach((_, i) => {
            this.state.results[i] = 0;
        });
        
        // Re-initialize deck
        let cards = [];
        for (let d = 0; d < this.state.activePreset.decks; d++) {
            const deckCards = this.engine.createCardArray(this.deck, this.state.activePreset.jokers);
            cards = cards.concat(deckCards);
        }
        this.state.workingDeck = this.engine.shuffleDeck(cards);
        
        document.getElementById('flip-area').innerHTML = '<p class="hint-text">Cards appear here when you flip</p>';
        
        this.render();
        this.updateResults();
    }

    disableButtons(disabled) {
        document.getElementById('flip-1-btn').disabled = disabled;
        document.getElementById('flip-10-btn').disabled = disabled;
        document.getElementById('flip-50-btn').disabled = disabled;
        document.getElementById('reset-btn').disabled = disabled;
    }

    render() {
        if (this.state.activePreset) {
            document.getElementById('deck-count').textContent = this.state.workingDeck.length;
        }
    }

    updateStats() {
        this.render();
    }

    pause() {
        this.state.isRunning = false;
    }

    cleanup() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        const styleElement = document.getElementById('presets-explorer-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['probability-presets-explorer-v1'] = ProbabilityPresetsExplorer;