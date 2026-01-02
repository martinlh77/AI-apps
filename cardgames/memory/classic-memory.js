/**
 * Classic Memory Match Game
 * Single-player card matching game
 */

class ClassicMemory {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      grid: [],
      flippedIndices: [],
      matchedPairs: [],
      moves: 0,
      pairsFound: 0,
      isProcessing: false,
      gameWon: false
    };
  }
  
  setup() {
    // Create card array and select 10 random cards
    const allCards = this.engine.createCardArray(this.deck);
    const shuffled = this.engine.shuffleDeck(allCards);
    const selected = shuffled.slice(0, 10);
    
    // Create pairs by duplicating
    const pairs = [];
    selected.forEach(card => {
      pairs.push({...card, id: card.id + '-a'});
      pairs.push({...card, id: card.id + '-b'});
    });
    
    // Shuffle the pairs
    this.state.grid = this.engine.shuffleDeck(pairs);
    this.state.flippedIndices = [];
    this.state.matchedPairs = [];
    this.state.moves = 0;
    this.state.pairsFound = 0;
    this.state.isProcessing = false;
    this.state.gameWon = false;
    
    this.render();
    this.updateStats();
  }
  
  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'grid';
    gameBoard.style.gridTemplateColumns = 'repeat(5, 120px)';
    gameBoard.style.gridTemplateRows = 'repeat(4, 168px)';
    gameBoard.style.gap = '15px';
    gameBoard.style.justifyContent = 'center';
    gameBoard.style.alignContent = 'center';
    gameBoard.style.minHeight = '600px';
    
    this.state.grid.forEach((card, index) => {
      const isFlipped = this.state.flippedIndices.includes(index);
      const isMatched = this.state.matchedPairs.includes(index);
      
      const cardElement = this.engine.renderCard(card, isFlipped || isMatched);
      cardElement.style.position = 'relative';
      cardElement.style.width = '120px';
      cardElement.style.height = '168px';
      cardElement.style.cursor = (isMatched || this.state.isProcessing) ? 'default' : 'pointer';
      cardElement.style.opacity = isMatched ? '0.5' : '1';
      cardElement.dataset.index = index;
      
      if (!isMatched && !this.state.isProcessing) {
        cardElement.onclick = () => this.handleCardClick(index);
      }
      
      if (isMatched) {
        cardElement.style.transform = 'scale(0.95)';
      }
      
      gameBoard.appendChild(cardElement);
    });
  }
  
  handleCardClick(index) {
    if (this.state.isProcessing) return;
    if (this.state.flippedIndices.includes(index)) return;
    if (this.state.matchedPairs.includes(index)) return;
    if (this.state.flippedIndices.length >= 2) return;
    
    // Flip the card
    this.state.flippedIndices.push(index);
    this.render();
    
    // If two cards are flipped, check for match
    if (this.state.flippedIndices.length === 2) {
      this.state.moves++;
      this.updateStats();
      this.state.isProcessing = true;
      
      setTimeout(() => {
        this.checkMatch();
      }, 1000);
    }
  }
  
  checkMatch() {
    const [idx1, idx2] = this.state.flippedIndices;
    const card1 = this.state.grid[idx1];
    const card2 = this.state.grid[idx2];
    
    if (card1.rank === card2.rank) {
      // Match found!
      this.state.matchedPairs.push(idx1, idx2);
      this.state.pairsFound++;
      
      // Check win condition
      if (this.state.matchedPairs.length === 20) {
        this.state.gameWon = true;
        setTimeout(() => {
          this.engine.celebrateWin();
        }, 500);
      }
    }
    
    this.state.flippedIndices = [];
    this.state.isProcessing = false;
    this.render();
    this.updateStats();
  }
  
  updateStats() {
    document.getElementById('game-moves').textContent = `Moves: ${this.state.moves}`;
    document.getElementById('game-score').textContent = `Pairs: ${this.state.pairsFound}/10`;
  }
  
  pause() {
    // Memory game doesn't need pause functionality
  }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['memory-classic-v1'] = ClassicMemory;