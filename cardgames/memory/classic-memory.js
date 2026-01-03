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
    const allCards = this.engine.createCardArray(this.deck, false);
    
    // Verify we have enough cards
    if (!allCards || allCards.length < 10) {
      console.error('Not enough cards in deck:', allCards?.length || 0);
      return;
    }
    
    const shuffled = this.engine.shuffleDeck(allCards);
    const selected = shuffled.slice(0, 10);
    
    // Verify we got 10 cards
    if (selected.length !== 10) {
      console.error('Failed to select 10 cards, got:', selected.length);
      return;
    }
    
    // Create pairs by duplicating
    const pairs = [];
    selected.forEach((card, index) => {
      pairs.push({...card, id: `${card.suit}-${card.rank}-a-${index}`});
      pairs.push({...card, id: `${card.suit}-${card.rank}-b-${index}`});
    });
    
    // Verify we have 20 cards
    if (pairs.length !== 20) {
      console.error('Failed to create pairs, got:', pairs.length);
      return;
    }
    
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
    
    // Determine if we're on mobile
    const isMobile = window.innerWidth < 700;
    
    if (isMobile) {
      gameBoard.style.gridTemplateColumns = 'repeat(4, 80px)';
      gameBoard.style.gridTemplateRows = 'repeat(5, 112px)';
      gameBoard.style.gap = '10px';
    } else {
      gameBoard.style.gridTemplateColumns = 'repeat(5, 120px)';
      gameBoard.style.gridTemplateRows = 'repeat(4, 168px)';
      gameBoard.style.gap = '15px';
    }
    
    gameBoard.style.justifyContent = 'center';
    gameBoard.style.alignContent = 'center';
    gameBoard.style.minHeight = '600px';
    gameBoard.style.padding = '20px';
    
    if (this.state.grid.length === 0) {
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'Error: No cards to display. Please restart the game.';
      errorMsg.style.color = '#ff6b6b';
      errorMsg.style.padding = '20px';
      errorMsg.style.textAlign = 'center';
      gameBoard.appendChild(errorMsg);
      return;
    }
    
    this.state.grid.forEach((card, index) => {
      const isFlipped = this.state.flippedIndices.includes(index);
      const isMatched = this.state.matchedPairs.includes(index);
      
      const cardElement = this.engine.renderCard(card, isFlipped || isMatched);
      
      // Apply responsive sizing to the entire card
      if (isMobile) {
        cardElement.style.width = '80px';
        cardElement.style.height = '112px';
        cardElement.style.fontSize = '0.7rem'; // Scale down text
        
        // Scale down the card content
        const cardFront = cardElement.querySelector('.card-front');
        const cardBack = cardElement.querySelector('.card-back');
        
        if (cardFront) {
          cardFront.style.fontSize = '0.7rem';
          // Scale rank display
          const rankDisplays = cardFront.querySelectorAll('.card-rank');
          rankDisplays.forEach(rank => {
            rank.style.fontSize = '1rem';
          });
          // Scale suit emoji
          const suitCenter = cardFront.querySelector('.card-suit-center');
          if (suitCenter) {
            suitCenter.style.fontSize = '2rem';
          }
        }
        
        if (cardBack) {
          cardBack.style.fontSize = '0.7rem';
        }
      } else {
        cardElement.style.width = '120px';
        cardElement.style.height = '168px';
      }
      
      cardElement.style.position = 'relative';
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
