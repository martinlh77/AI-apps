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
      gameWon: false,
      totalPairs: 10, // Default to 10 pairs (20 cards)
      difficulty: 'medium' // easy=6, medium=10, hard=15
    };
    this.resizeHandler = null;
  }
  
  setup() {
    // Show difficulty selection on first setup
    if (!this.state.difficultySelected) {
      this.showDifficultySelection();
      return;
    }
    
    // Create card array
    const allCards = this.engine.createCardArray(this.deck, false);
    
    // Calculate how many unique cards we need
    const cardsNeeded = this.state.totalPairs;
    
    // Verify we have enough cards
    if (!allCards || allCards.length < cardsNeeded) {
      console.error('Not enough cards in deck:', allCards?.length || 0);
      return;
    }
    
    const shuffled = this.engine.shuffleDeck(allCards);
    const selected = shuffled.slice(0, cardsNeeded);
    
    // Verify we got the right number of cards
    if (selected.length !== cardsNeeded) {
      console.error(`Failed to select ${cardsNeeded} cards, got:`, selected.length);
      return;
    }
    
    // Create pairs by duplicating (exact copies for exact matching)
    const pairs = [];
    selected.forEach((card, index) => {
      // First copy with unique ID
      pairs.push({
        ...card,
        id: `${card.suit}-${card.rank}-a-${index}`,
        pairId: index // Track which pair this belongs to
      });
      // Second copy with unique ID but same pairId
      pairs.push({
        ...card,
        id: `${card.suit}-${card.rank}-b-${index}`,
        pairId: index
      });
    });
    
    const totalCards = this.state.totalPairs * 2;
    
    // Verify we have the right number of cards
    if (pairs.length !== totalCards) {
      console.error(`Failed to create pairs, expected ${totalCards}, got:`, pairs.length);
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
    
    // Add resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
    this.render();
    this.updateStats();
  }
  
  showDifficultySelection() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'flex';
    gameBoard.style.flexDirection = 'column';
    gameBoard.style.alignItems = 'center';
    gameBoard.style.justifyContent = 'center';
    gameBoard.style.gap = '30px';
    gameBoard.style.padding = '40px 20px';
    gameBoard.style.minHeight = '600px';
    
    const isMobile = window.innerWidth < 700;
    
    // Title
    const title = document.createElement('h2');
    title.textContent = '🧠 Choose Difficulty';
    title.style.color = '#00ffcc';
    title.style.fontSize = isMobile ? '1.8rem' : '2.5rem';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    gameBoard.appendChild(title);
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Select how many pairs you want to match:';
    instructions.style.color = '#ccc';
    instructions.style.fontSize = isMobile ? '1rem' : '1.2rem';
    instructions.style.marginBottom = '30px';
    instructions.style.textAlign = 'center';
    gameBoard.appendChild(instructions);
    
    // Difficulty buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = isMobile ? 'column' : 'row';
    buttonContainer.style.gap = '20px';
    buttonContainer.style.width = isMobile ? '100%' : 'auto';
    buttonContainer.style.maxWidth = '800px';
    
    const difficulties = [
      { name: 'Easy', pairs: 6, cards: 12, grid: '3x4', color: '#00b894' },
      { name: 'Medium', pairs: 10, cards: 20, grid: '4x5', color: '#fdcb6e' },
      { name: 'Hard', pairs: 15, cards: 30, grid: '5x6', color: '#e74c3c' },
      { name: 'Expert', pairs: 20, cards: 40, grid: '5x8', color: '#6c5ce7' }
    ];
    
    difficulties.forEach(diff => {
      const btn = document.createElement('button');
      btn.className = 'btn-game-control';
      btn.style.padding = isMobile ? '20px 30px' : '30px 40px';
      btn.style.fontSize = isMobile ? '1rem' : '1.2rem';
      btn.style.fontWeight = 'bold';
      btn.style.background = diff.color;
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '12px';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all 0.3s';
      btn.style.flex = isMobile ? '1' : 'none';
      btn.style.minWidth = isMobile ? '100%' : '180px';
      btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
      
      const nameDiv = document.createElement('div');
      nameDiv.textContent = diff.name;
      nameDiv.style.fontSize = isMobile ? '1.3rem' : '1.5rem';
      nameDiv.style.marginBottom = '8px';
      btn.appendChild(nameDiv);
      
      const detailsDiv = document.createElement('div');
      detailsDiv.textContent = `${diff.pairs} Pairs (${diff.cards} cards)`;
      detailsDiv.style.fontSize = isMobile ? '0.85rem' : '0.95rem';
      detailsDiv.style.opacity = '0.9';
      detailsDiv.style.marginBottom = '4px';
      btn.appendChild(detailsDiv);
      
      const gridDiv = document.createElement('div');
      gridDiv.textContent = `${diff.grid} grid`;
      gridDiv.style.fontSize = isMobile ? '0.75rem' : '0.85rem';
      gridDiv.style.opacity = '0.8';
      btn.appendChild(gridDiv);
      
      btn.onmouseenter = () => {
        btn.style.transform = 'translateY(-5px) scale(1.05)';
        btn.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
      };
      
      btn.onclick = () => {
        this.state.totalPairs = diff.pairs;
        this.state.difficulty = diff.name.toLowerCase();
        this.state.difficultySelected = true;
        this.setup();
      };
      
      buttonContainer.appendChild(btn);
    });
    
    gameBoard.appendChild(buttonContainer);
    
    // Back button if changing difficulty
    if (this.state.difficultySelected) {
      const backBtn = document.createElement('button');
      backBtn.textContent = '← Back to Game';
      backBtn.className = 'btn-game-control';
      backBtn.style.marginTop = '30px';
      backBtn.style.padding = isMobile ? '12px 25px' : '15px 30px';
      backBtn.style.fontSize = isMobile ? '0.9rem' : '1rem';
      backBtn.style.background = 'rgba(255,255,255,0.1)';
      backBtn.style.color = '#00ffcc';
      backBtn.style.border = '2px solid #00ffcc';
      backBtn.style.borderRadius = '8px';
      backBtn.style.cursor = 'pointer';
      backBtn.onclick = () => this.render();
      gameBoard.appendChild(backBtn);
    }
  }
  
  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'grid';
    
    // Determine if we're on mobile
    const isMobile = window.innerWidth < 700;
    
    // Calculate grid dimensions based on total pairs
    const totalCards = this.state.totalPairs * 2;
    let cols, rows;
    
    if (totalCards === 12) { // Easy: 6 pairs
      cols = isMobile ? 3 : 4;
      rows = isMobile ? 4 : 3;
    } else if (totalCards === 20) { // Medium: 10 pairs
      cols = isMobile ? 4 : 5;
      rows = isMobile ? 5 : 4;
    } else if (totalCards === 30) { // Hard: 15 pairs
      cols = 5;
      rows = 6;
    } else if (totalCards === 40) { // Expert: 20 pairs
      cols = 5;
      rows = 8;
    } else {
      // Fallback calculation
      cols = isMobile ? 4 : 5;
      rows = Math.ceil(totalCards / cols);
    }
    
    // Card sizing
    const cardWidth = isMobile ? 70 : 100;
    const cardHeight = isMobile ? 98 : 140;
    const gap = isMobile ? 8 : 12;
    
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth}px)`;
    gameBoard.style.gridTemplateRows = `repeat(${rows}, ${cardHeight}px)`;
    gameBoard.style.gap = `${gap}px`;
    gameBoard.style.justifyContent = 'center';
    gameBoard.style.alignContent = 'center';
    gameBoard.style.minHeight = '600px';
    gameBoard.style.padding = '20px';
    
    // Enable scrolling for larger grids on mobile
    if (isMobile && totalCards > 20) {
      gameBoard.style.overflowY = 'auto';
      gameBoard.style.maxHeight = 'calc(100vh - 200px)'; // Leave room for header/footer
      gameBoard.style.alignContent = 'start';
    }
    
    if (this.state.grid.length === 0) {
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'Error: No cards to display. Please restart the game.';
      errorMsg.style.color = '#ff6b6b';
      errorMsg.style.padding = '20px';
      errorMsg.style.textAlign = 'center';
      errorMsg.style.gridColumn = `1 / -1`;
      gameBoard.appendChild(errorMsg);
      return;
    }
    
    this.state.grid.forEach((card, index) => {
      const isFlipped = this.state.flippedIndices.includes(index);
      const isMatched = this.state.matchedPairs.includes(index);
      
      const cardElement = this.engine.renderCard(card, isFlipped || isMatched);
      
      // Apply responsive sizing
      cardElement.style.width = `${cardWidth}px`;
      cardElement.style.height = `${cardHeight}px`;
      
      if (isMobile) {
        this.scaleCardForMobile(cardElement);
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
    
    // Add change difficulty button at bottom
    const controlsDiv = document.createElement('div');
    controlsDiv.style.gridColumn = '1 / -1';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.justifyContent = 'center';
    controlsDiv.style.marginTop = '20px';
    
    const changeDiffBtn = document.createElement('button');
    changeDiffBtn.textContent = '⚙️ Change Difficulty';
    changeDiffBtn.className = 'btn-game-control';
    changeDiffBtn.style.padding = isMobile ? '10px 20px' : '12px 24px';
    changeDiffBtn.style.fontSize = isMobile ? '0.85rem' : '0.95rem';
    changeDiffBtn.style.background = 'rgba(255,255,255,0.1)';
    changeDiffBtn.style.color = '#00ffcc';
    changeDiffBtn.style.border = '2px solid #00ffcc';
    changeDiffBtn.style.borderRadius = '8px';
    changeDiffBtn.style.cursor = 'pointer';
    changeDiffBtn.style.transition = 'all 0.2s';
    changeDiffBtn.onmouseenter = () => {
      changeDiffBtn.style.background = 'rgba(0,255,204,0.2)';
      changeDiffBtn.style.transform = 'scale(1.05)';
    };
    changeDiffBtn.onmouseleave = () => {
      changeDiffBtn.style.background = 'rgba(255,255,255,0.1)';
      changeDiffBtn.style.transform = 'scale(1)';
    };
    changeDiffBtn.onclick = () => this.showDifficultySelection();
    
    controlsDiv.appendChild(changeDiffBtn);
    gameBoard.appendChild(controlsDiv);
  }
  
scaleCardForMobile(cardElement) {
  cardElement.style.fontSize = '0.7rem';
  
  const cardFront = cardElement.querySelector('.card-front');
  const cardBack = cardElement.querySelector('.card-back');
  
  if (cardFront) {
    cardFront.style.fontSize = '0.7rem';
    
    // Scale rank displays
    const rankDisplays = cardFront.querySelectorAll('.card-rank');
    rankDisplays.forEach(rank => {
      rank.style.fontSize = '0.85rem';
    });
    
    // Scale mini suit icons
    const miniPips = cardFront.querySelectorAll('.mini-pip');
    miniPips.forEach(pip => {
      pip.style.fontSize = '0.7rem';
    });
    
    // FOR MOBILE: Hide all multiple pips and show only center suit
    const allPips = cardFront.querySelectorAll('.pip');
    const suitCenter = cardFront.querySelector('.card-suit-center');
    
    if (allPips.length > 1) {
      // Multiple pips exist - hide them all
      allPips.forEach(pip => {
        pip.style.display = 'none';
      });
      
      // Show or create single centered pip
      if (suitCenter) {
        suitCenter.style.display = 'flex';
        suitCenter.style.fontSize = '2.5rem';
        suitCenter.style.position = 'absolute';
        suitCenter.style.top = '50%';
        suitCenter.style.left = '50%';
        suitCenter.style.transform = 'translate(-50%, -50%)';
      } else {
        // Create centered pip if it doesn't exist
        const centerPip = document.createElement('div');
        centerPip.className = 'card-suit-center';
        centerPip.textContent = cardElement.dataset.suitEmoji || 
                                this.state.grid[cardElement.dataset.index]?.suitEmoji || '♠';
        centerPip.style.fontSize = '2.5rem';
        centerPip.style.position = 'absolute';
        centerPip.style.top = '50%';
        centerPip.style.left = '50%';
        centerPip.style.transform = 'translate(-50%, -50%)';
        centerPip.style.display = 'flex';
        centerPip.style.alignItems = 'center';
        centerPip.style.justifyContent = 'center';
        cardFront.appendChild(centerPip);
      }
    } else {
      // Single pip - just scale it
      allPips.forEach(pip => {
        pip.style.fontSize = '2.5rem';
      });
      
      if (suitCenter) {
        suitCenter.style.fontSize = '2.5rem';
      }
    }
    
    // Scale face card windows
    const faceWindow = cardFront.querySelector('.face-card-window');
    if (faceWindow) {
      faceWindow.style.top = '20px';
      faceWindow.style.bottom = '20px';
      faceWindow.style.left = '15px';
      faceWindow.style.right = '15px';
    }
  }
  
  if (cardBack) {
    cardBack.style.fontSize = '0.7rem';
  }
}
      
      // Scale mini suit icons
      const miniPips = cardFront.querySelectorAll('.mini-pip');
      miniPips.forEach(pip => {
        pip.style.fontSize = '0.7rem';
      });
      
      // Scale center suit
      const suitCenter = cardFront.querySelector('.card-suit-center');
      if (suitCenter) {
        suitCenter.style.fontSize = '2rem';
      }
      
      // Scale center pips
      const pips = cardFront.querySelectorAll('.pip');
      pips.forEach(pip => {
        if (pip.classList.contains('large')) {
          pip.style.fontSize = '2rem';
        } else {
          pip.style.fontSize = '0.98rem';
        }
      });
      
      // Scale face card windows
      const faceWindow = cardFront.querySelector('.face-card-window');
      if (faceWindow) {
        faceWindow.style.top = '20px';
        faceWindow.style.bottom = '20px';
        faceWindow.style.left = '15px';
        faceWindow.style.right = '15px';
      }
    }
    
    if (cardBack) {
      cardBack.style.fontSize = '0.7rem';
    }
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
    
    // Exact match: same rank AND same suit (checking pairId is most reliable)
    if (card1.pairId === card2.pairId) {
      // Match found!
      this.state.matchedPairs.push(idx1, idx2);
      this.state.pairsFound++;
      
      // Check win condition
      const totalCards = this.state.totalPairs * 2;
      if (this.state.matchedPairs.length === totalCards) {
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
    document.getElementById('game-score').textContent = `Pairs: ${this.state.pairsFound}/${this.state.totalPairs}`;
  }
  
  pause() {
    // Memory game doesn't need pause functionality
  }
  
  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['memory-classic-v1'] = ClassicMemory;
