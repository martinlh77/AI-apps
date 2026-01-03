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
    
    this.resizeHandler = null;
    
    // ✅ ADD: Touch/zoom state for mobile
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
    this.state.waste = null;
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
      
      // Scale rank display (corner numbers/letters)
      const rankDisplays = cardFront.querySelectorAll('.card-rank');
      rankDisplays.forEach(rank => {
        rank.style.fontSize = '0.85rem';
      });
      
      // Scale mini suit icons in corners
      const miniPips = cardFront.querySelectorAll('.mini-pip');
      miniPips.forEach(pip => {
        pip.style.fontSize = '0.7rem';
      });
      
      // Scale center suit emoji
      const suitCenter = cardFront.querySelector('.card-suit-center');
      if (suitCenter) {
        suitCenter.style.fontSize = '2rem';
      }
      
      // Scale center pips (for numbered cards)
      const pips = cardFront.querySelectorAll('.pip');
      pips.forEach(pip => {
        if (pip.classList.contains('large')) {
          pip.style.fontSize = '2rem';
        } else {
          pip.style.fontSize = '0.98rem';
        }
      });
      
      // Scale face card windows (J, Q, K)
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
  
  // ✅ ADD: Setup touch event handlers for mobile zoom/pan
  setupTouchHandlers(gameBoard, isMobile) {
    if (!isMobile) return;
    
    // Remove existing listeners
    gameBoard.ontouchstart = null;
    gameBoard.ontouchmove = null;
    gameBoard.ontouchend = null;
    
    gameBoard.ontouchstart = (e) => this.handleTouchStart(e, gameBoard);
    gameBoard.ontouchmove = (e) => this.handleTouchMove(e, gameBoard);
    gameBoard.ontouchend = (e) => this.handleTouchEnd(e);
  }
  
  // ✅ ADD: Handle touch start
  handleTouchStart(e, gameBoard) {
    if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
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
  
  // ✅ ADD: Handle touch move
  handleTouchMove(e, gameBoard) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate pinch zoom
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const scaleChange = currentDistance / this.touchState.lastTouchDistance;
      
      let newScale = this.touchState.scale * scaleChange;
      newScale = Math.max(this.touchState.minScale, Math.min(this.touchState.maxScale, newScale));
      
      // Calculate pan
      const currentCenter = this.getTouchCenter(touch1, touch2);
      const deltaX = currentCenter.x - this.touchState.lastTouchCenter.x;
      const deltaY = currentCenter.y - this.touchState.lastTouchCenter.y;
      
      this.touchState.scale = newScale;
      this.touchState.translateX += deltaX;
      this.touchState.translateY += deltaY;
      
      this.touchState.lastTouchDistance = currentDistance;
      this.touchState.lastTouchCenter = currentCenter;
      
      // Apply transform
      this.applyTransform(gameBoard);
    }
  }
  
  // ✅ ADD: Handle touch end
  handleTouchEnd(e) {
    if (e.touches.length < 2) {
      this.touchState.isPanning = false;
    }
  }
  
  // ✅ ADD: Calculate distance between two touches
  getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // ✅ ADD: Calculate center point between two touches
  getTouchCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }
  
  // ✅ ADD: Apply transform to game board
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
    
    // Determine if we're on mobile
    const isMobile = window.innerWidth < 700;
    
    // ✅ ADD: Enable overflow and touch handling on mobile
    if (isMobile) {
      gameBoard.style.overflow = 'hidden';
      gameBoard.style.touchAction = 'none'; // Prevent default touch behaviors
      gameBoard.style.position = 'relative';
      
      // Add helper text
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
    
    // ✅ CHANGED: Wrap pyramid in container for transform
    const pyramidWrapper = document.createElement('div');
    pyramidWrapper.className = 'pyramid-wrapper';
    pyramidWrapper.style.width = '100%';
    pyramidWrapper.style.display = 'flex';
    pyramidWrapper.style.justifyContent = 'center';
    pyramidWrapper.style.alignItems = 'center';
    pyramidWrapper.style.flex = '1';
    pyramidWrapper.style.overflow = isMobile ? 'visible' : 'visible';
    
    // Render pyramid
    const pyramidContainer = document.createElement('div');
    pyramidContainer.className = 'pyramid-container';
    pyramidContainer.style.display = 'flex';
    pyramidContainer.style.flexDirection = 'column';
    pyramidContainer.style.alignItems = 'center';
    pyramidContainer.style.gap = cardGap;
    
    // ✅ ADD: Apply current transform state if on mobile
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
          
          // Add hover effect (not on mobile during zoom/pan)
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
    bottomArea.style.zIndex = '100'; // Keep above pyramid
    bottomArea.style.background = 'rgba(26, 26, 46, 0.95)'; // ✅ ADD background so it's visible
    bottomArea.style.padding = isMobile ? '10px 15px' : '15px 20px';
    bottomArea.style.borderRadius = '12px';
    bottomArea.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.5)';
    
    // Stock pile
    const stockDiv = document.createElement('div');
    stockDiv.style.width = cardWidth;
    stockDiv.style.height = cardHeight;
    stockDiv.style.cursor = this.state.stock.length > 0 ? 'pointer' : 'default';
    stockDiv.style.position = 'relative';
    
    if (this.state.stock.length > 0) {
      const stockCard = this.engine.renderCard(this.state.stock[0], false);
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
      stockDiv.innerHTML = `<div style="width:100%;height:100%;border:2px dashed #666;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#666;font-size:${isMobile ? '0.7rem' : '0.9rem'};">Empty</div>`;
    }
    
    bottomArea.appendChild(stockDiv);
    
    // Waste pile
    const wasteDiv = document.createElement('div');
    wasteDiv.style.width = cardWidth;
    wasteDiv.style.height = cardHeight;
    
    if (this.state.waste) {
      const wasteCard = this.engine.renderCard(this.state.waste, true);
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
    
    // ✅ ADD: Setup touch handlers after rendering
    if (isMobile) {
      this.setupTouchHandlers(gameBoard, isMobile);
    }
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
  
  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    
    // ✅ ADD: Clean up touch handlers
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
