/**
 * Pyramid Solitaire
 * Remove pairs that add up to 13
 */

class PyramidSolitaire {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      pyramid: [], // 7 rows
      stock: [],
      waste: null,
      selectedCard: null,
      selectedLocation: null,
      moves: 0,
      score: 0,
      gameWon: false
    };
    
    this.cardValues = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
  }
  
  setup() {
    // Create and shuffle deck
    const allCards = this.engine.createCardArray(this.deck);
    const shuffled = this.engine.shuffleDeck(allCards);
    
    // Build pyramid (28 cards)
    this.state.pyramid = [];
    let cardIndex = 0;
    for (let row = 0; row < 7; row++) {
      this.state.pyramid[row] = [];
      for (let col = 0; col <= row; col++) {
        const card = shuffled[cardIndex++];
        card.faceUp = true;
        card.covered = false;
        this.state.pyramid[row][col] = card;
      }
    }
    
    // Update covered status
    this.updateCoveredStatus();
    
    // Remaining cards to stock
    this.state.stock = shuffled.slice(28);
    this.state.waste = null;
    this.state.selectedCard = null;
    this.state.selectedLocation = null;
    this.state.moves = 0;
    this.state.score = 0;
    this.state.gameWon = false;
    
    this.render();
    this.updateStats();
  }
  
  updateCoveredStatus() {
    // Mark cards as covered or uncovered
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < this.state.pyramid[row].length; col++) {
        const card = this.state.pyramid[row][col];
        if (!card) continue;
        
        // Check if cards below cover this card
        const leftChild = this.state.pyramid[row + 1]?.[col];
        const rightChild = this.state.pyramid[row + 1]?.[col + 1];
        
        // Card is covered if BOTH children exist
        card.covered = !!(leftChild && rightChild);
      }
    }
    
    // Bottom row is never covered
    if (this.state.pyramid[6]) {
      this.state.pyramid[6].forEach(card => {
        if (card) card.covered = false;
      });
    }
  }
  
  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'flex';
    gameBoard.style.flexDirection = 'column';
    gameBoard.style.alignItems = 'center';
    gameBoard.style.gap = '30px';
    gameBoard.style.padding = '20px';
    gameBoard.style.minHeight = '600px';
    
    // Render pyramid
    const pyramidContainer = document.createElement('div');
    pyramidContainer.style.display = 'flex';
    pyramidContainer.style.flexDirection = 'column';
    pyramidContainer.style.alignItems = 'center';
    pyramidContainer.style.gap = '10px';
    
    this.state.pyramid.forEach((row, rowIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'flex';
      rowDiv.style.gap = '10px';
      
      row.forEach((card, colIndex) => {
        if (!card) {
          const emptySpace = document.createElement('div');
          emptySpace.style.width = '100px';
          emptySpace.style.height = '140px';
          emptySpace.style.visibility = 'hidden';
          rowDiv.appendChild(emptySpace);
          return;
        }
        
        const cardElement = this.engine.renderCard(card, true);
        cardElement.style.width = '100px';
        cardElement.style.height = '140px';
        cardElement.style.opacity = card.covered ? '0.5' : '1';
        cardElement.style.cursor = card.covered ? 'not-allowed' : 'pointer';
        cardElement.style.position = 'relative';
        cardElement.style.transition = 'all 0.2s';
        
        // Highlight if selected
        if (this.state.selectedLocation?.type === 'pyramid' &&
            this.state.selectedLocation?.row === rowIndex &&
            this.state.selectedLocation?.col === colIndex) {
          cardElement.style.border = '3px solid #00ffcc';
          cardElement.style.transform = 'translateY(-10px)';
          cardElement.style.boxShadow = '0 5px 20px rgba(0, 255, 204, 0.5)';
        }
        
        if (!card.covered) {
          cardElement.onclick = () => this.handlePyramidCardClick(rowIndex, colIndex);
          
          // Add hover effect
          cardElement.onmouseenter = () => {
            if (!card.covered) {
              cardElement.style.transform = 'translateY(-5px)';
            }
          };
          cardElement.onmouseleave = () => {
            if (!(this.state.selectedLocation?.type === 'pyramid' &&
                  this.state.selectedLocation?.row === rowIndex &&
                  this.state.selectedLocation?.col === colIndex)) {
              cardElement.style.transform = 'translateY(0)';
            }
          };
        }
        
        rowDiv.appendChild(cardElement);
      });
      
      pyramidContainer.appendChild(rowDiv);
    });
    
    gameBoard.appendChild(pyramidContainer);
    
    // Render stock and waste
    const bottomArea = document.createElement('div');
    bottomArea.style.display = 'flex';
    bottomArea.style.gap = '30px';
    bottomArea.style.alignItems = 'center';
    
    // Stock pile
    const stockDiv = document.createElement('div');
    stockDiv.style.width = '100px';
    stockDiv.style.height = '140px';
    stockDiv.style.cursor = this.state.stock.length > 0 ? 'pointer' : 'default';
    stockDiv.style.position = 'relative';
    
    if (this.state.stock.length > 0) {
      const stockCard = this.engine.renderCard(this.state.stock[0], false);
      stockCard.style.width = '100%';
      stockCard.style.height = '100%';
      stockCard.onclick = () => this.drawFromStock();
      stockDiv.appendChild(stockCard);
      
      // Stock counter
      const counter = document.createElement('div');
      counter.textContent = this.state.stock.length;
      counter.style.position = 'absolute';
      counter.style.top = '5px';
      counter.style.right = '5px';
      counter.style.background = 'rgba(0,0,0,0.8)';
      counter.style.color = '#00ffcc';
      counter.style.padding = '5px 10px';
      counter.style.borderRadius = '50%';
      counter.style.fontSize = '0.9rem';
      counter.style.fontWeight = 'bold';
      counter.style.border = '2px solid #00ffcc';
      stockDiv.appendChild(counter);
    } else {
      stockDiv.innerHTML = '<div style="width:100%;height:100%;border:2px dashed #666;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666;">Empty</div>';
    }
    
    bottomArea.appendChild(stockDiv);
    
    // Waste pile
    const wasteDiv = document.createElement('div');
    wasteDiv.style.width = '100px';
    wasteDiv.style.height = '140px';
    
    if (this.state.waste) {
      const wasteCard = this.engine.renderCard(this.state.waste, true);
      wasteCard.style.width = '100%';
      wasteCard.style.height = '100%';
      wasteCard.style.cursor = 'pointer';
      wasteCard.style.position = 'relative';
      wasteCard.style.transition = 'all 0.2s';
      
      if (this.state.selectedLocation?.type === 'waste') {
        wasteCard.style.border = '3px solid #00ffcc';
        wasteCard.style.transform = 'translateY(-10px)';
        wasteCard.style.boxShadow = '0 5px 20px rgba(0, 255, 204, 0.5)';
      }
      
      wasteCard.onclick = () => this.handleWasteCardClick();
      wasteDiv.appendChild(wasteCard);
    } else {
      wasteDiv.innerHTML = '<div style="width:100%;height:100%;border:2px dashed #666;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666;">Waste</div>';
    }
    
    bottomArea.appendChild(wasteDiv);
    gameBoard.appendChild(bottomArea);
  }
  
  handlePyramidCardClick(row, col) {
    const card = this.state.pyramid[row][col];
    if (!card || card.covered) return;
    
    const cardValue = this.cardValues[card.rank];
    
    // Special case: King can be removed alone
    if (cardValue === 13) {
      this.removeCard({ type: 'pyramid', row, col });
      this.state.moves++;
      this.state.score += 10;
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.updateStats();
      this.checkWinCondition();
      this.render();
      return;
    }
    
    // If no card selected, select this one
    if (!this.state.selectedCard) {
      this.state.selectedCard = card;
      this.state.selectedLocation = { type: 'pyramid', row, col };
      this.render();
      return;
    }
    
    // If same card clicked, deselect
    if (this.state.selectedLocation?.type === 'pyramid' &&
        this.state.selectedLocation?.row === row &&
        this.state.selectedLocation?.col === col) {
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.render();
      return;
    }
    
    // Try to match with selected card
    this.tryMatch(card, { type: 'pyramid', row, col });
  }
  
  handleWasteCardClick() {
    if (!this.state.waste) return;
    
    const cardValue = this.cardValues[this.state.waste.rank];
    
    // Special case: King can be removed alone
    if (cardValue === 13) {
      this.state.waste = null;
      this.state.moves++;
      this.state.score += 10;
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.updateStats();
      this.checkWinCondition();
      this.render();
      return;
    }
    
    // If no card selected, select waste
    if (!this.state.selectedCard) {
      this.state.selectedCard = this.state.waste;
      this.state.selectedLocation = { type: 'waste' };
      this.render();
      return;
    }
    
    // If waste already selected, deselect
    if (this.state.selectedLocation?.type === 'waste') {
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.render();
      return;
    }
    
    // Try to match with selected card
    this.tryMatch(this.state.waste, { type: 'waste' });
  }
  
  tryMatch(card2, location2) {
    const card1 = this.state.selectedCard;
    const value1 = this.cardValues[card1.rank];
    const value2 = this.cardValues[card2.rank];
    
    // Check if sum is 13
    if (value1 + value2 === 13) {
      // Valid match!
      this.removeCard(this.state.selectedLocation);
      this.removeCard(location2);
      this.state.moves++;
      this.state.score += 10;
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.updateStats();
      this.checkWinCondition();
      this.render();
    } else {
      // Invalid match - select the new card instead
      this.state.selectedCard = card2;
      this.state.selectedLocation = location2;
      this.render();
    }
  }
  
  removeCard(location) {
    if (location.type === 'pyramid') {
      this.state.pyramid[location.row][location.col] = null;
      this.updateCoveredStatus();
    } else if (location.type === 'waste') {
      this.state.waste = null;
    }
  }
  
  drawFromStock() {
    if (this.state.stock.length === 0) return;
    
    this.state.waste = this.state.stock.shift();
    this.state.waste.faceUp = true;
    
    // Clear any selection when drawing a new card
    this.state.selectedCard = null;
    this.state.selectedLocation = null;
    
    this.render();
  }
  
  checkWinCondition() {
    // Check if pyramid is empty
    let pyramidEmpty = true;
    for (let row of this.state.pyramid) {
      for (let card of row) {
        if (card !== null) {
          pyramidEmpty = false;
          break;
        }
      }
      if (!pyramidEmpty) break;
    }
    
    if (pyramidEmpty && !this.state.gameWon) {
      this.state.gameWon = true;
      setTimeout(() => {
        this.engine.celebrateWin();
      }, 500);
    }
  }
  
  updateStats() {
    document.getElementById('game-moves').textContent = `Moves: ${this.state.moves}`;
    document.getElementById('game-score').textContent = `Score: ${this.state.score}`;
  }
  
  pause() {
    // Pyramid doesn't need pause
  }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['solitaire-pyramid-v1'] = PyramidSolitaire;
