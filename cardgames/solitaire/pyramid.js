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
      waste: [],
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
    
    this.resizeHandler = null;
    
    this.touchState = {
      scale: 1,
      minScale: 0.5,
      maxScale: 2,
      translateX: 0,
      translateY: 0,
      lastTouchDistance: 0,
      lastTouchCenter: { x: 0, y: 0 },
      isPanning: false,
      startPanX: 0,
      startPanY: 0
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
    this.state.waste = [];
    this.state.selectedCard = null;
    this.state.selectedLocation = null;
    this.state.moves = 0;
    this.state.score = 0;
    this.state.gameWon = false;
    
    // Reset zoom/pan state
    this.touchState.scale = 1;
    this.touchState.translateX = 0;
    this.touchState.translateY = 0;
    
    // Add resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
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
  
  scaleCardForMobile(cardElement) {
    cardElement.style.fontSize = '0.7rem';
    
    const cardFront = cardElement.querySelector('.card-front');
    const cardBack = cardElement.querySelector('.card-back');
    
    if (cardFront) {
      cardFront.style.fontSize = '0.7rem';
      
      const rankDisplays = cardFront.querySelectorAll('.card-rank');
      rankDisplays.forEach(rank => {
        rank.style.fontSize = '0.85rem';
      });
      
      const miniPips = cardFront.querySelectorAll('.mini-pip');
      miniPips.forEach(pip => {
        pip.style.fontSize = '0.7rem';
      });
      
      const suitCenter = cardFront.querySelector('.card-suit-center');
      if (suitCenter) {
        suitCenter.style.fontSize = '2rem';
      }
      
      const pips = cardFront.querySelectorAll('.pip');
      pips.forEach(pip => {
        if (pip.classList.contains('large')) {
          pip.style.fontSize = '2rem';
        } else {
          pip.style.fontSize = '0.98rem';
        }
      });
      
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
  
  setupTouchHandlers(gameBoard, isMobile) {
    if (!isMobile) return;
    
    gameBoard.ontouchstart = null;
    gameBoard.ontouchmove = null;
    gameBoard.ontouchend = null;
    
    gameBoard.ontouchstart = (e) => this.handleTouchStart(e, gameBoard);
    gameBoard.ontouchmove = (e) => this.handleTouchMove(e, gameBoard);
    gameBoard.ontouchend = (e) => this.handleTouchEnd(e);
  }
  
  handleTouchStart(e, gameBoard) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      this.touchState.lastTouchDistance = this.getTouchDistance(touch1, touch2);
      this.touchState.lastTouchCenter = this.getTouchCenter(touch1, touch2);
      this.touchState.isPanning = true;
      this.touchState.startPanX = this.touchState.translateX;
      this.touchState.startPanY = this.touchState.translateY;
    }
  }
  
  handleTouchMove(e, gameBoard) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const scaleChange = currentDistance / this.touchState.lastTouchDistance;
      
      let newScale = this.touchState.scale * scaleChange;
      newScale = Math.max(this.touchState.minScale, Math.min(this.touchState.maxScale, newScale));
      
      const currentCenter = this.getTouchCenter(touch1, touch2);
      const deltaX = currentCenter.x - this.touchState.lastTouchCenter.x;
      const deltaY = currentCenter.y - this.touchState.lastTouchCenter.y;
      
      this.touchState.scale = newScale;
      this.touchState.translateX += deltaX;
      this.touchState.translateY += deltaY;
      
      this.touchState.lastTouchDistance = currentDistance;
      this.touchState.lastTouchCenter = currentCenter;
      
      this.applyTransform(gameBoard);
    }
  }
  
  handleTouchEnd(e) {
    if (e.touches.length < 2) {
      this.touchState.isPanning = false;
    }
  }
  
  getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getTouchCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }
  
  applyTransform(gameBoard) {
    const pyramidContainer = gameBoard.querySelector('.pyramid-container');
    if (pyramidContainer) {
      pyramidContainer.style.transform = 
        `translate(${this.touchState.translateX}px, ${this.touchState.translateY}px) scale(${this.touchState.scale})`;
      pyramidContainer.style.transformOrigin = 'center center';
      pyramidContainer.style.transition = 'none';
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
    
    const isMobile = window.innerWidth < 700;
    
    if (isMobile) {
      gameBoard.style.overflow = 'hidden';
      gameBoard.style.touchAction = 'none';
      gameBoard.style.position = 'relative';
      
      const helperText = document.createElement('div');
      helperText.textContent = '🤏 Pinch to zoom • ✌️ Two fingers to pan';
      helperText.style.position = 'absolute';
      helperText.style.top = '5px';
      helperText.style.left = '50%';
      helperText.style.transform = 'translateX(-50%)';
      helperText.style.fontSize = '0.75rem';
      helperText.style.color = '#00ffcc';
      helperText.style.background = 'rgba(0,0,0,0.8)';
      helperText.style.padding = '5px 12px';
      helperText.style.borderRadius = '15px';
      helperText.style.zIndex = '1000';
      helperText.style.pointerEvents = 'none';
      helperText.style.whiteSpace = 'nowrap';
      gameBoard.appendChild(helperText);
    }
    
    const cardWidth = isMobile ? '60px' : '100px';
    const cardHeight = isMobile ? '84px' : '140px';
    const cardGap = isMobile ? '4px' : '10px';
    
    const pyramidWrapper = document.createElement('div');
    pyramidWrapper.className = 'pyramid-wrapper';
    pyramidWrapper.style.width = '100%';
    pyramidWrapper.style.display = 'flex';
    pyramidWrapper.style.justifyContent = 'center';
    pyramidWrapper.style.alignItems = 'center';
    pyramidWrapper.style.flex = '1';
    pyramidWrapper.style.overflow = isMobile ? 'visible' : 'visible';
    
    const pyramidContainer = document.createElement('div');
    pyramidContainer.className = 'pyramid-container';
    pyramidContainer.style.display = 'flex';
    pyramidContainer.style.flexDirection = 'column';
    pyramidContainer.style.alignItems = 'center';
    pyramidContainer.style.gap = cardGap;
    
    if (isMobile) {
      pyramidContainer.style.transform = 
        `translate(${this.touchState.translateX}px, ${this.touchState.translateY}px) scale(${this.touchState.scale})`;
      pyramidContainer.style.transformOrigin = 'center center';
      pyramidContainer.style.willChange = 'transform';
    }
    
    this.state.pyramid.forEach((row, rowIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'flex';
      rowDiv.style.gap = cardGap;
      
      row.forEach((card, colIndex) => {
        if (!card) {
          const emptySpace = document.createElement('div');
          emptySpace.style.width = cardWidth;
          emptySpace.style.height = cardHeight;
          emptySpace.style.visibility = 'hidden';
          rowDiv.appendChild(emptySpace);
          return;
        }
        
        const cardElement = this.engine.renderCard(card, true);
        cardElement.style.width = cardWidth;
        cardElement.style.height = cardHeight;
        cardElement.style.opacity = card.covered ? '0.5' : '1';
        cardElement.style.cursor = card.covered ? 'not-allowed' : 'pointer';
        cardElement.style.position = 'relative';
        cardElement.style.transition = 'all 0.2s';
        
        if (isMobile) {
          this.scaleCardForMobile(cardElement);
        }
        
        if (this.state.selectedLocation?.type === 'pyramid' &&
            this.state.selectedLocation?.row === rowIndex &&
            this.state.selectedLocation?.col === colIndex) {
          cardElement.style.border = '3px solid #00ffcc';
          cardElement.style.transform = 'translateY(-10px)';
          cardElement.style.boxShadow = '0 5px 20px rgba(0, 255, 204, 0.5)';
        }
        
        if (!card.covered) {
          cardElement.onclick = () => this.handlePyramidCardClick(rowIndex, colIndex);
          
          if (!isMobile) {
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
        }
        
        rowDiv.appendChild(cardElement);
      });
      
      pyramidContainer.appendChild(rowDiv);
    });
    
    pyramidWrapper.appendChild(pyramidContainer);
    gameBoard.appendChild(pyramidWrapper);
    
    // Render stock and waste
    const bottomArea = document.createElement('div');
    bottomArea.style.display = 'flex';
    bottomArea.style.gap = isMobile ? '15px' : '30px';
    bottomArea.style.alignItems = 'center';
    bottomArea.style.zIndex = '100';
    bottomArea.style.background = 'rgba(26, 26, 46, 0.95)';
    bottomArea.style.padding = isMobile ? '10px 15px' : '15px 20px';
    bottomArea.style.borderRadius = '12px';
    bottomArea.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.5)';
    
    // Stock pile
    const stockDiv = document.createElement('div');
    stockDiv.style.width = cardWidth;
    stockDiv.style.height = cardHeight;
    // ✅ CHANGED: Make stock clickable even when empty (for recycling)
    stockDiv.style.cursor = 'pointer';
    stockDiv.style.position = 'relative';
    
    if (this.state.stock.length > 0) {
      // Show back of top card
      const topCard = {...this.state.stock[this.state.stock.length - 1]};
      topCard.faceUp = false;
      const stockCard = this.engine.renderCard(topCard, false);
      stockCard.style.width = '100%';
      stockCard.style.height = '100%';
      stockCard.onclick = () => this.drawFromStock();
      
      if (isMobile) {
        this.scaleCardForMobile(stockCard);
      }
      
      stockDiv.appendChild(stockCard);
      
      // Stock counter
      const counter = document.createElement('div');
      counter.textContent = this.state.stock.length;
      counter.style.position = 'absolute';
      counter.style.top = '5px';
      counter.style.right = '5px';
      counter.style.background = 'rgba(0,0,0,0.8)';
      counter.style.color = '#00ffcc';
      counter.style.padding = isMobile ? '3px 7px' : '5px 10px';
      counter.style.borderRadius = '50%';
      counter.style.fontSize = isMobile ? '0.75rem' : '0.9rem';
      counter.style.fontWeight = 'bold';
      counter.style.border = '2px solid #00ffcc';
      stockDiv.appendChild(counter);
    } else {
      // ✅ CHANGED: Show recycle icon when stock is empty but waste has cards
      const emptyDiv = document.createElement('div');
      emptyDiv.style.width = '100%';
      emptyDiv.style.height = '100%';
      emptyDiv.style.border = '2px dashed #666';
      emptyDiv.style.borderRadius = '8px';
      emptyDiv.style.display = 'flex';
      emptyDiv.style.flexDirection = 'column';
      emptyDiv.style.alignItems = 'center';
      emptyDiv.style.justifyContent = 'center';
      emptyDiv.style.color = this.state.waste.length > 0 ? '#00ffcc' : '#666';
      emptyDiv.style.fontSize = isMobile ? '0.7rem' : '0.9rem';
      emptyDiv.style.cursor = this.state.waste.length > 0 ? 'pointer' : 'default';
      
      if (this.state.waste.length > 0) {
        emptyDiv.innerHTML = `<div style="font-size: ${isMobile ? '1.5rem' : '2rem'};">♻️</div><div style="margin-top: 5px;">Recycle</div>`;
        emptyDiv.onclick = () => this.drawFromStock();
      } else {
        emptyDiv.textContent = 'Empty';
      }
      
      stockDiv.appendChild(emptyDiv);
    }
    
    bottomArea.appendChild(stockDiv);
    
    // Waste pile
    const wasteDiv = document.createElement('div');
    wasteDiv.style.width = cardWidth;
    wasteDiv.style.height = cardHeight;
    
    if (this.state.waste.length > 0) {
      const topWasteCard = this.state.waste[this.state.waste.length - 1];
      const wasteCard = this.engine.renderCard(topWasteCard, true);
      wasteCard.style.width = '100%';
      wasteCard.style.height = '100%';
      wasteCard.style.cursor = 'pointer';
      wasteCard.style.position = 'relative';
      wasteCard.style.transition = 'all 0.2s';
      
      if (isMobile) {
        this.scaleCardForMobile(wasteCard);
      }
      
      if (this.state.selectedLocation?.type === 'waste') {
        wasteCard.style.border = '3px solid #00ffcc';
        wasteCard.style.transform = 'translateY(-10px)';
        wasteCard.style.boxShadow = '0 5px 20px rgba(0, 255, 204, 0.5)';
      }
      
      wasteCard.onclick = () => this.handleWasteCardClick();
      wasteDiv.appendChild(wasteCard);
    } else {
      wasteDiv.innerHTML = `<div style="width:100%;height:100%;border:2px dashed #666;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666;font-size:${isMobile ? '0.7rem' : '0.9rem'};">Waste</div>`;
    }
    
    bottomArea.appendChild(wasteDiv);
    gameBoard.appendChild(bottomArea);
    
    if (isMobile) {
      this.setupTouchHandlers(gameBoard, isMobile);
    }
  }
  
  handlePyramidCardClick(row, col) {
    const card = this.state.pyramid[row][col];
    if (!card || card.covered) return;
    
    const cardValue = this.cardValues[card.rank];
    
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
    
    if (!this.state.selectedCard) {
      this.state.selectedCard = card;
      this.state.selectedLocation = { type: 'pyramid', row, col };
      this.render();
      return;
    }
    
    if (this.state.selectedLocation?.type === 'pyramid' &&
        this.state.selectedLocation?.row === row &&
        this.state.selectedLocation?.col === col) {
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.render();
      return;
    }
    
    this.tryMatch(card, { type: 'pyramid', row, col });
  }
  
  handleWasteCardClick() {
    if (this.state.waste.length === 0) return;
    
    const topCard = this.state.waste[this.state.waste.length - 1];
    const cardValue = this.cardValues[topCard.rank];
    
    if (cardValue === 13) {
      this.state.waste.pop();
      this.state.moves++;
      this.state.score += 10;
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.updateStats();
      this.checkWinCondition();
      this.render();
      return;
    }
    
    if (!this.state.selectedCard) {
      this.state.selectedCard = topCard;
      this.state.selectedLocation = { type: 'waste' };
      this.render();
      return;
    }
    
    if (this.state.selectedLocation?.type === 'waste') {
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      this.render();
      return;
    }
    
    this.tryMatch(topCard, { type: 'waste' });
  }
  
  tryMatch(card2, location2) {
    const card1 = this.state.selectedCard;
    const value1 = this.cardValues[card1.rank];
    const value2 = this.cardValues[card2.rank];
    
    if (value1 + value2 === 13) {
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
      this.state.waste.pop();
    }
  }
  
  // ✅ CHANGED: Added recycling functionality
  drawFromStock() {
    // If stock is empty but waste has cards, recycle them
    if (this.state.stock.length === 0 && this.state.waste.length > 0) {
      // Move all waste cards back to stock (in reverse order)
      this.state.stock = [...this.state.waste].reverse();
      this.state.waste = [];
      
      // Clear selection when recycling
      this.state.selectedCard = null;
      this.state.selectedLocation = null;
      
      this.render();
      return;
    }
    
    // Normal draw - if stock is empty and waste is also empty, do nothing
    if (this.state.stock.length === 0) return;
    
    // Remove card from stock and add to waste
    const drawnCard = this.state.stock.pop();
    drawnCard.faceUp = true;
    this.state.waste.push(drawnCard);
    
    // Clear any selection when drawing a new card
    this.state.selectedCard = null;
    this.state.selectedLocation = null;
    
    this.render();
  }
  
  checkWinCondition() {
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
  
  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    const gameBoard = document.getElementById('game-board');
    if (gameBoard) {
      gameBoard.ontouchstart = null;
      gameBoard.ontouchmove = null;
      gameBoard.ontouchend = null;
    }
  }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['solitaire-pyramid-v1'] = PyramidSolitaire;
