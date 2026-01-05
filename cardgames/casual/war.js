/**
 * War Card Game
 * Classic card battle game - highest card wins each round
 * Mobile-responsive with pinch-to-zoom and two-finger pan support
 */

class WarGame {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    
    this.state = {
      playerDeck: [],
      computerDeck: [],
      playerCard: null,
      computerCard: null,
      roundsPlayed: 0,
      playerWins: 0,
      computerWins: 0,
      ties: 0,
      gameOver: false,
      battleInProgress: false,
      message: 'Click Battle! to start'
    };
    
    // Mobile touch controls
    this.touchControls = {
      scale: 1,
      minScale: 0.5,
      maxScale: 3,
      translateX: 0,
      translateY: 0,
      lastTouchDistance: 0,
      lastTouchCenter: { x: 0, y: 0 },
      isPinching: false,
      isPanning: false,
      hintShown: false
    };
    
    this.resizeHandler = null;
    this.cardValues = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
  }
  
  setup() {
    // Reset state
    this.state = {
      playerDeck: [],
      computerDeck: [],
      playerCard: null,
      computerCard: null,
      roundsPlayed: 0,
      playerWins: 0,
      computerWins: 0,
      ties: 0,
      gameOver: false,
      battleInProgress: false,
      message: 'Click Battle! to start'
    };
    
    // Reset touch controls but keep hintShown state
    const hintWasShown = this.touchControls.hintShown;
    this.touchControls = {
      scale: 1,
      minScale: 0.5,
      maxScale: 3,
      translateX: 0,
      translateY: 0,
      lastTouchDistance: 0,
      lastTouchCenter: { x: 0, y: 0 },
      isPinching: false,
      isPanning: false,
      hintShown: hintWasShown
    };
    
    // Create and shuffle deck
    const allCards = this.engine.createCardArray(this.deck);
    const shuffled = this.engine.shuffleDeck(allCards);
    
    // Split deck evenly
    this.state.playerDeck = shuffled.slice(0, 26);
    this.state.computerDeck = shuffled.slice(26, 52);
    
    // Set all cards face-down initially
    this.state.playerDeck.forEach(card => card.faceUp = false);
    this.state.computerDeck.forEach(card => card.faceUp = false);
    
    // Add resize listener for responsive display
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
    this.render();
    this.updateStats();
  }
  
  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    // Detect mobile
    const isMobile = window.innerWidth < 700;
    
    // Create touch-zoomable container
    const container = document.createElement('div');
    container.id = 'war-game-container';
    container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    `;
    
    // Create zoomable content wrapper
    const content = document.createElement('div');
    content.id = 'war-game-content';
    content.style.cssText = `
      position: relative;
      width: 100%;
      min-height: 600px;
      transform-origin: center center;
      transition: transform 0.1s ease-out;
      transform: scale(${this.touchControls.scale}) 
                 translate(${this.touchControls.translateX}px, ${this.touchControls.translateY}px);
    `;
    
    // Add touch event listeners for pinch-zoom and pan
    if (isMobile) {
      this.addTouchControls(container, content);
    }
    
    // Game layout
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.justifyContent = 'space-between';
    content.style.padding = isMobile ? '15px' : '30px';
    content.style.gap = isMobile ? '15px' : '30px';
    
    // Computer section (top)
    const computerSection = this.createPlayerSection(
      'computer',
      this.state.computerDeck.length,
      this.state.computerCard,
      isMobile
    );
    content.appendChild(computerSection);
    
    // Battle zone (center)
    const battleZone = this.createBattleZone(isMobile);
    content.appendChild(battleZone);
    
    // Player section (bottom)
    const playerSection = this.createPlayerSection(
      'player',
      this.state.playerDeck.length,
      this.state.playerCard,
      isMobile
    );
    content.appendChild(playerSection);
    
    container.appendChild(content);
    gameBoard.appendChild(container);
    
    // Show zoom controls hint on mobile (only once per session)
    if (isMobile && !this.touchControls.hintShown) {
      this.showZoomHint(container);
      this.touchControls.hintShown = true;
    }
  }
  
  addTouchControls(container, content) {
    let touchStartDistance = 0;
    let touchStartCenter = { x: 0, y: 0 };
    let initialScale = 1;
    let initialTranslate = { x: 0, y: 0 };
    
    // Helper: Calculate distance between two touches
    const getTouchDistance = (touch1, touch2) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    // Helper: Calculate center point between two touches
    const getTouchCenter = (touch1, touch2) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };
    
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // Two-finger gesture started
        e.preventDefault();
        touchStartDistance = getTouchDistance(e.touches[0], e.touches[1]);
        touchStartCenter = getTouchCenter(e.touches[0], e.touches[1]);
        initialScale = this.touchControls.scale;
        initialTranslate = {
          x: this.touchControls.translateX,
          y: this.touchControls.translateY
        };
        this.touchControls.isPinching = true;
        this.touchControls.isPanning = true;
      }
    }, { passive: false });
    
    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && (this.touchControls.isPinching || this.touchControls.isPanning)) {
        e.preventDefault();
        
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);
        
        // Pinch-to-zoom
        const scaleChange = currentDistance / touchStartDistance;
        let newScale = initialScale * scaleChange;
        newScale = Math.max(this.touchControls.minScale, Math.min(this.touchControls.maxScale, newScale));
        this.touchControls.scale = newScale;
        
        // Two-finger pan
        const deltaX = (currentCenter.x - touchStartCenter.x) / this.touchControls.scale;
        const deltaY = (currentCenter.y - touchStartCenter.y) / this.touchControls.scale;
        this.touchControls.translateX = initialTranslate.x + deltaX;
        this.touchControls.translateY = initialTranslate.y + deltaY;
        
        // Apply transform
        content.style.transform = `
          scale(${this.touchControls.scale}) 
          translate(${this.touchControls.translateX}px, ${this.touchControls.translateY}px)
        `;
      }
    }, { passive: false });
    
    container.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        this.touchControls.isPinching = false;
        this.touchControls.isPanning = false;
      }
    });
    
    // Double-tap to reset zoom
    let lastTap = 0;
    container.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected - reset zoom
        this.touchControls.scale = 1;
        this.touchControls.translateX = 0;
        this.touchControls.translateY = 0;
        content.style.transform = 'scale(1) translate(0px, 0px)';
      }
      lastTap = currentTime;
    });
  }
  
  showZoomHint(container) {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #00ffcc;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 0.75rem;
      z-index: 1000;
      pointer-events: none;
      animation: fadeOut 4s forwards;
    `;
    hint.textContent = '👆 Pinch to zoom • Pan with 2 fingers • Double-tap to reset';
    
    // Add fade-out animation
    const styleId = 'war-game-fade-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    container.appendChild(hint);
    setTimeout(() => hint.remove(), 4000);
  }
  
  createPlayerSection(type, deckCount, currentCard, isMobile) {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${isMobile ? '10px' : '15px'};
      width: 100%;
    `;
    
    // Label
    const label = document.createElement('div');
    label.style.cssText = `
      font-size: ${isMobile ? '1.1rem' : '1.3rem'};
      font-weight: bold;
      color: ${type === 'player' ? '#00ff00' : '#ff6b6b'};
      text-transform: uppercase;
    `;
    label.textContent = type === 'player' ? '👤 You' : '🤖 Computer';
    section.appendChild(label);
    
    // Card display
    const cardDisplay = document.createElement('div');
    cardDisplay.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: ${isMobile ? '112px' : '168px'};
    `;
    
    if (currentCard) {
      const cardElement = this.engine.renderCard(currentCard, true);
      const size = isMobile ? 
        { width: '80px', height: '112px' } : 
        { width: '120px', height: '168px' };
      cardElement.style.width = size.width;
      cardElement.style.height = size.height;
      
      if (isMobile) {
        this.scaleCardForMobile(cardElement);
      }
      
      cardDisplay.appendChild(cardElement);
    }
    
    section.appendChild(cardDisplay);
    
    // Deck count
    const deckInfo = document.createElement('div');
    deckInfo.style.cssText = `
      font-size: ${isMobile ? '0.9rem' : '1rem'};
      color: #aaa;
    `;
    deckInfo.textContent = `Cards remaining: ${deckCount}`;
    section.appendChild(deckInfo);
    
    return section;
  }
  
  createBattleZone(isMobile) {
    const zone = document.createElement('div');
    zone.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${isMobile ? '15px' : '20px'};
      padding: ${isMobile ? '15px' : '20px'};
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      min-width: ${isMobile ? '250px' : '300px'};
    `;
    
    // Message display
    const message = document.createElement('div');
    message.id = 'war-message';
    message.style.cssText = `
      font-size: ${isMobile ? '1rem' : '1.2rem'};
      color: #ffd700;
      text-align: center;
      min-height: ${isMobile ? '48px' : '60px'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    `;
    message.textContent = this.state.message;
    zone.appendChild(message);
    
    // Battle button
    if (!this.state.gameOver) {
      const button = document.createElement('button');
      button.textContent = '⚔️ Battle!';
      button.style.cssText = `
        padding: ${isMobile ? '12px 30px' : '15px 40px'};
        font-size: ${isMobile ? '1.1rem' : '1.3rem'};
        font-weight: bold;
        background: linear-gradient(135deg, #00ff88, #00cc66);
        color: #000;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
        ${this.state.battleInProgress ? 'opacity: 0.5; cursor: not-allowed;' : ''}
      `;
      
      button.onmouseover = () => {
        if (!this.state.battleInProgress) {
          button.style.transform = 'scale(1.05)';
          button.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5)';
        }
      };
      
      button.onmouseout = () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.3)';
      };
      
      button.onclick = () => {
        if (!this.state.battleInProgress) {
          this.playRound();
        }
      };
      
      button.disabled = this.state.battleInProgress;
      zone.appendChild(button);
    } else {
      // Restart button
      const restartBtn = document.createElement('button');
      restartBtn.textContent = '🔄 Play Again';
      restartBtn.style.cssText = `
        padding: ${isMobile ? '12px 30px' : '15px 40px'};
        font-size: ${isMobile ? '1.1rem' : '1.3rem'};
        font-weight: bold;
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
      `;
      
      restartBtn.onmouseover = () => {
        restartBtn.style.transform = 'scale(1.05)';
        restartBtn.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)';
      };
      
      restartBtn.onmouseout = () => {
        restartBtn.style.transform = 'scale(1)';
        restartBtn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)';
      };
      
      restartBtn.onclick = () => this.setup();
      zone.appendChild(restartBtn);
    }
    
    return zone;
  }
  
  scaleCardForMobile(cardElement) {
    cardElement.style.fontSize = '0.7rem';
    
    cardElement.querySelectorAll('.rank').forEach(el => {
      el.style.fontSize = '0.85rem';
    });
    
    cardElement.querySelectorAll('.mini-pip').forEach(el => {
      el.style.fontSize = '0.7rem';
    });
    
    cardElement.querySelectorAll('.pip').forEach(pip => {
      pip.style.fontSize = pip.classList.contains('large') ? '2rem' : '0.98rem';
    });
  }
  
  async playRound() {
    if (this.state.playerDeck.length === 0 || this.state.computerDeck.length === 0) {
      this.endGame();
      return;
    }
    
    this.state.battleInProgress = true;
    this.state.message = 'Drawing cards...';
    this.render();
    
    await this.sleep(500);
    
    // Draw cards
    const playerCard = this.state.playerDeck.shift();
    const computerCard = this.state.computerDeck.shift();
    
    playerCard.faceUp = true;
    computerCard.faceUp = true;
    
    this.state.playerCard = playerCard;
    this.state.computerCard = computerCard;
    this.state.roundsPlayed++;
    
    this.render();
    await this.sleep(1000);
    
    // Compare cards
    const playerValue = this.cardValues[playerCard.rank];
    const computerValue = this.cardValues[computerCard.rank];
    
    if (playerValue > computerValue) {
      // Player wins
      this.state.playerWins++;
      this.state.message = `🎉 You win! ${playerCard.rank} beats ${computerCard.rank}`;
      this.state.playerDeck.push(playerCard, computerCard);
    } else if (computerValue > playerValue) {
      // Computer wins
      this.state.computerWins++;
      this.state.message = `😞 Computer wins! ${computerCard.rank} beats ${playerCard.rank}`;
      this.state.computerDeck.push(computerCard, playerCard);
    } else {
      // Tie
      this.state.ties++;
      this.state.message = `🤝 Tie! Both cards removed from play`;
    }
    
    this.updateMessage(this.state.message);
    this.updateStats();
    
    await this.sleep(2000);
    
    // Clear cards for next round
    this.state.playerCard = null;
    this.state.computerCard = null;
    this.state.battleInProgress = false;
    
    // Check for game over
    if (this.state.playerDeck.length === 0 || this.state.computerDeck.length === 0) {
      this.endGame();
    } else {
      this.state.message = 'Click Battle! to continue';
      this.render();
    }
  }
  
  endGame() {
    this.state.gameOver = true;
    
    if (this.state.playerDeck.length > this.state.computerDeck.length) {
      this.state.message = '🎊 YOU WIN THE WAR! 🎊';
      setTimeout(() => this.engine.celebrateWin(), 300);
    } else if (this.state.computerDeck.length > this.state.playerDeck.length) {
      this.state.message = '💔 Computer wins the war!';
    } else {
      this.state.message = '🤝 It\'s a draw!';
    }
    
    this.render();
  }
  
  updateStats() {
    document.getElementById('game-moves').textContent = `Rounds: ${this.state.roundsPlayed}`;
    document.getElementById('game-score').textContent = 
      `Wins: ${this.state.playerWins} | Losses: ${this.state.computerWins} | Ties: ${this.state.ties}`;
  }
  
  updateMessage(text) {
    const msgElement = document.getElementById('war-message');
    if (msgElement) {
      msgElement.textContent = text;
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  pause() {
    // Optional: Implement pause functionality
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
window.GameModules['casual-war-v1'] = WarGame;
