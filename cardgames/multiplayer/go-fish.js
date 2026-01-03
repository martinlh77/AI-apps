/**
 * Go Fish - Classic Card Matching Game
 * 2-4 players (human and/or CPU)
 * Features: Smart CPU AI, Mobile support with pinch-zoom and pan
 */

class GoFish {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      players: [],
      currentPlayerIndex: 0,
      drawPile: [],
      sets: [], // {player: index, rank: 'A', cards: []}
      gameWon: false,
      turnInProgress: false,
      selectedRank: null,
      selectedOpponent: null,
      cpuMemory: [], // What CPU players remember about asks
      message: 'Select number of players to start'
    };
    this.resizeHandler = null;
    this.config = {
      totalPlayers: 2,
      humanPlayers: 1
    };
    
    // Mobile gesture support
    this.gesture = {
      scale: 1,
      translateX: 0,
      translateY: 0,
      lastScale: 1,
      lastTranslateX: 0,
      lastTranslateY: 0,
      initialDistance: 0,
      isPinching: false,
      isPanning: false
    };
  }
  
  setup() {
    this.state.gameWon = false;
    this.state.turnInProgress = false;
    this.state.selectedRank = null;
    this.state.selectedOpponent = null;
    this.state.message = 'Select number of players to start';
    
    // Add resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
    this.showPlayerSetup();
  }
  
  showPlayerSetup() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'flex';
    gameBoard.style.flexDirection = 'column';
    gameBoard.style.alignItems = 'center';
    gameBoard.style.justifyContent = 'center';
    gameBoard.style.gap = '30px';
    gameBoard.style.padding = '20px';
    
    const isMobile = window.innerWidth < 700;
    
    // Title
    const title = document.createElement('div');
    title.style.fontSize = isMobile ? '1.8rem' : '2.5rem';
    title.style.color = '#ffd700';
    title.style.fontWeight = 'bold';
    title.style.textAlign = 'center';
    title.textContent = '🎣 Go Fish Setup';
    gameBoard.appendChild(title);
    
    // Setup container
    const setupBox = document.createElement('div');
    setupBox.style.background = 'rgba(0, 0, 0, 0.5)';
    setupBox.style.padding = isMobile ? '20px' : '30px';
    setupBox.style.borderRadius = '15px';
    setupBox.style.border = '2px solid #00ffcc';
    setupBox.style.maxWidth = isMobile ? '90%' : '500px';
    setupBox.style.width = '100%';
    
    // Total players
    const playersLabel = document.createElement('div');
    playersLabel.style.fontSize = isMobile ? '1rem' : '1.2rem';
    playersLabel.style.marginBottom = '10px';
    playersLabel.style.color = '#fff';
    playersLabel.textContent = 'Total Players (2-4):';
    setupBox.appendChild(playersLabel);
    
    const playersSelect = document.createElement('select');
    playersSelect.style.width = '100%';
    playersSelect.style.padding = '10px';
    playersSelect.style.fontSize = isMobile ? '1rem' : '1.1rem';
    playersSelect.style.marginBottom = '20px';
    playersSelect.style.borderRadius = '5px';
    playersSelect.style.border = '2px solid #00ffcc';
    playersSelect.style.background = '#1a1a2e';
    playersSelect.style.color = '#fff';
    for (let i = 2; i <= 4; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i} Players`;
      playersSelect.appendChild(option);
    }
    playersSelect.value = this.config.totalPlayers;
    playersSelect.onchange = (e) => {
      this.config.totalPlayers = parseInt(e.target.value);
      if (this.config.humanPlayers > this.config.totalPlayers - 1) {
        this.config.humanPlayers = this.config.totalPlayers - 1;
        humanSelect.value = this.config.humanPlayers;
      }
      updateHumanOptions();
    };
    setupBox.appendChild(playersSelect);
    
    // Human players
    const humanLabel = document.createElement('div');
    humanLabel.style.fontSize = isMobile ? '1rem' : '1.2rem';
    humanLabel.style.marginBottom = '10px';
    humanLabel.style.color = '#fff';
    humanLabel.textContent = 'Human Players (rest are CPU):';
    setupBox.appendChild(humanLabel);
    
    const humanSelect = document.createElement('select');
    humanSelect.style.width = '100%';
    humanSelect.style.padding = '10px';
    humanSelect.style.fontSize = isMobile ? '1rem' : '1.1rem';
    humanSelect.style.marginBottom = '30px';
    humanSelect.style.borderRadius = '5px';
    humanSelect.style.border = '2px solid #00ffcc';
    humanSelect.style.background = '#1a1a2e';
    humanSelect.style.color = '#fff';
    
    const updateHumanOptions = () => {
      humanSelect.innerHTML = '';
      const maxHuman = this.config.totalPlayers - 1;
      for (let i = 1; i <= maxHuman; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} Human${i > 1 ? 's' : ''} (${this.config.totalPlayers - i} CPU)`;
        humanSelect.appendChild(option);
      }
      if (this.config.humanPlayers > maxHuman) {
        this.config.humanPlayers = maxHuman;
      }
      humanSelect.value = this.config.humanPlayers;
    };
    updateHumanOptions();
    
    humanSelect.onchange = (e) => {
      this.config.humanPlayers = parseInt(e.target.value);
    };
    setupBox.appendChild(humanSelect);
    
    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    startBtn.style.width = '100%';
    startBtn.style.padding = '15px';
    startBtn.style.fontSize = isMobile ? '1.1rem' : '1.3rem';
    startBtn.style.fontWeight = 'bold';
    startBtn.style.background = 'linear-gradient(135deg, #00ff88, #00ccff)';
    startBtn.style.color = '#000';
    startBtn.style.border = 'none';
    startBtn.style.borderRadius = '10px';
    startBtn.style.cursor = 'pointer';
    startBtn.style.transition = 'transform 0.2s';
    startBtn.onmouseover = () => startBtn.style.transform = 'scale(1.05)';
    startBtn.onmouseout = () => startBtn.style.transform = 'scale(1)';
    startBtn.onclick = () => this.startGame();
    setupBox.appendChild(startBtn);
    
    gameBoard.appendChild(setupBox);
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.style.maxWidth = isMobile ? '90%' : '600px';
    instructions.style.textAlign = 'center';
    instructions.style.color = '#87ceeb';
    instructions.style.fontSize = isMobile ? '0.85rem' : '1rem';
    instructions.style.lineHeight = '1.6';
    instructions.innerHTML = `
      <strong>How to Play:</strong><br>
      • Ask opponents for cards to make sets of 4<br>
      • If they don't have it, "Go Fish" from the deck<br>
      • Most sets at the end wins!<br>
      ${isMobile ? '<br><strong>📱 Use two fingers to zoom and pan</strong>' : ''}
    `;
    gameBoard.appendChild(instructions);
    
    this.updateStats();
  }
  
  startGame() {
    // Initialize players
    this.state.players = [];
    for (let i = 0; i < this.config.totalPlayers; i++) {
      const isHuman = i < this.config.humanPlayers;
      this.state.players.push({
        id: i,
        name: isHuman ? `Player ${i + 1}` : `CPU ${i + 1 - this.config.humanPlayers}`,
        isHuman: isHuman,
        hand: [],
        sets: 0
      });
    }
    
    // Create and shuffle deck
    const allCards = this.engine.createCardArray(this.deck);
    this.state.drawPile = this.engine.shuffleDeck(allCards);
    
    // Deal cards
    const cardsPerPlayer = this.config.totalPlayers <= 3 ? 5 : 4;
    for (let i = 0; i < cardsPerPlayer; i++) {
      this.state.players.forEach(player => {
        if (this.state.drawPile.length > 0) {
          player.hand.push(this.state.drawPile.pop());
        }
      });
    }
    
    // Check for initial sets
    this.state.players.forEach(player => {
      this.checkAndRemoveSets(player);
    });
    
    // Initialize CPU memory
    this.state.cpuMemory = [];
    
    this.state.currentPlayerIndex = 0;
    this.state.sets = [];
    this.state.message = `${this.state.players[0].name}'s turn`;
    
    this.render();
    
    // If first player is CPU, start their turn
    if (!this.state.players[0].isHuman) {
      setTimeout(() => this.executeCPUTurn(), 1000);
    }
  }
  
  checkAndRemoveSets(player) {
    const rankCounts = {};
    player.hand.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    Object.keys(rankCounts).forEach(rank => {
      if (rankCounts[rank] === 4) {
        // Found a set!
        const setCards = player.hand.filter(card => card.rank === rank);
        player.hand = player.hand.filter(card => card.rank !== rank);
        player.sets++;
        this.state.sets.push({
          player: player.id,
          rank: rank,
          cards: setCards
        });
      }
    });
  }
  
  render() {
    if (this.state.players.length === 0) return;
    
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'block';
    gameBoard.style.position = 'relative';
    gameBoard.style.overflow = 'hidden';
    gameBoard.style.touchAction = 'none'; // Prevent default touch behaviors
    
    const isMobile = window.innerWidth < 700;
    
    // Create zoomable container
    const container = document.createElement('div');
    container.id = 'game-container';
    container.style.transform = `scale(${this.gesture.scale}) translate(${this.gesture.translateX}px, ${this.gesture.translateY}px)`;
    container.style.transformOrigin = 'center center';
    container.style.transition = this.gesture.isPinching || this.gesture.isPanning ? 'none' : 'transform 0.3s ease';
    container.style.padding = '20px';
    container.style.minHeight = '100%';
    
    // Add touch event listeners for mobile gestures
    if (isMobile) {
      this.setupMobileGestures(gameBoard);
    }
    
    // Message area
    const messageBox = document.createElement('div');
    messageBox.style.textAlign = 'center';
    messageBox.style.fontSize = isMobile ? '1rem' : '1.3rem';
    messageBox.style.fontWeight = 'bold';
    messageBox.style.color = '#ffd700';
    messageBox.style.marginBottom = '20px';
    messageBox.style.padding = '10px';
    messageBox.style.background = 'rgba(0, 0, 0, 0.5)';
    messageBox.style.borderRadius = '10px';
    messageBox.textContent = this.state.message;
    container.appendChild(messageBox);
    
    // Opponents area (top)
    const opponentsArea = document.createElement('div');
    opponentsArea.style.display = 'flex';
    opponentsArea.style.justifyContent = 'center';
    opponentsArea.style.gap = isMobile ? '10px' : '20px';
    opponentsArea.style.marginBottom = '20px';
    opponentsArea.style.flexWrap = 'wrap';
    
    this.state.players.forEach((player, index) => {
      if (index === 0) return; // Skip human player (shown at bottom)
      
      const playerBox = this.createPlayerDisplay(player, index, isMobile, true);
      opponentsArea.appendChild(playerBox);
    });
    container.appendChild(opponentsArea);
    
    // Center area - Draw pile and sets
    const centerArea = document.createElement('div');
    centerArea.style.display = 'flex';
    centerArea.style.justifyContent = 'center';
    centerArea.style.alignItems = 'center';
    centerArea.style.gap = isMobile ? '20px' : '40px';
    centerArea.style.margin = '20px 0';
    centerArea.style.flexWrap = 'wrap';
    
    // Draw pile
    const pileContainer = document.createElement('div');
    pileContainer.style.textAlign = 'center';
    
    const pileLabel = document.createElement('div');
    pileLabel.style.color = '#00ffcc';
    pileLabel.style.fontSize = isMobile ? '0.9rem' : '1.1rem';
    pileLabel.style.marginBottom = '10px';
    pileLabel.textContent = `🎣 Pond: ${this.state.drawPile.length} cards`;
    pileContainer.appendChild(pileLabel);
    
    if (this.state.drawPile.length > 0) {
      const pileCard = this.engine.renderCard(this.state.drawPile[0], false);
      const pileSize = isMobile ? { width: '60px', height: '84px' } : { width: '80px', height: '112px' };
      pileCard.style.width = pileSize.width;
      pileCard.style.height = pileSize.height;
      pileContainer.appendChild(pileCard);
    }
    
    centerArea.appendChild(pileContainer);
    
    // Sets display
    const setsContainer = document.createElement('div');
    setsContainer.style.textAlign = 'center';
    
    const setsLabel = document.createElement('div');
    setsLabel.style.color = '#00ffcc';
    setsLabel.style.fontSize = isMobile ? '0.9rem' : '1.1rem';
    setsLabel.style.marginBottom = '10px';
    setsLabel.textContent = `📚 Sets: ${this.state.sets.length}/13`;
    setsContainer.appendChild(setsLabel);
    
    centerArea.appendChild(setsContainer);
    container.appendChild(centerArea);
    
    // Current player's hand (bottom)
    const currentPlayer = this.state.players[0];
    const playerHandArea = this.createPlayerDisplay(currentPlayer, 0, isMobile, false);
    container.appendChild(playerHandArea);
    
    // Action buttons for human player
    if (currentPlayer.isHuman && this.state.currentPlayerIndex === 0 && !this.state.gameWon) {
      const actionsArea = this.createActionButtons(isMobile);
      container.appendChild(actionsArea);
    }
    
    gameBoard.appendChild(container);
    this.updateStats();
  }
  
  setupMobileGestures(element) {
    let touches = [];
    
    const getTouchDistance = (touch1, touch2) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    const getTouchCenter = (touch1, touch2) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };
    
    element.addEventListener('touchstart', (e) => {
      touches = Array.from(e.touches);
      
      if (touches.length === 2) {
        // Two finger gesture - prepare for pinch/pan
        this.gesture.isPinching = true;
        this.gesture.isPanning = true;
        this.gesture.initialDistance = getTouchDistance(touches[0], touches[1]);
        this.gesture.lastScale = this.gesture.scale;
        this.gesture.lastTranslateX = this.gesture.translateX;
        this.gesture.lastTranslateY = this.gesture.translateY;
        e.preventDefault();
      }
    }, { passive: false });
    
    element.addEventListener('touchmove', (e) => {
      touches = Array.from(e.touches);
      
      if (touches.length === 2) {
        e.preventDefault();
        
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const currentCenter = getTouchCenter(touches[0], touches[1]);
        
        // Calculate pinch zoom
        const scaleChange = currentDistance / this.gesture.initialDistance;
        let newScale = this.gesture.lastScale * scaleChange;
        
        // Limit zoom range
        newScale = Math.max(0.5, Math.min(3, newScale));
        this.gesture.scale = newScale;
        
        // Calculate pan (only if zoomed in)
        if (this.gesture.scale > 1) {
          const deltaX = (currentCenter.x - element.clientWidth / 2) * 0.5;
          const deltaY = (currentCenter.y - element.clientHeight / 2) * 0.5;
          
          this.gesture.translateX = this.gesture.lastTranslateX + deltaX / this.gesture.scale;
          this.gesture.translateY = this.gesture.lastTranslateY + deltaY / this.gesture.scale;
          
          // Limit pan range
          const maxPan = 200;
          this.gesture.translateX = Math.max(-maxPan, Math.min(maxPan, this.gesture.translateX));
          this.gesture.translateY = Math.max(-maxPan, Math.min(maxPan, this.gesture.translateY));
        }
        
        // Apply transform
        const container = document.getElementById('game-container');
        if (container) {
          container.style.transform = `scale(${this.gesture.scale}) translate(${this.gesture.translateX}px, ${this.gesture.translateY}px)`;
        }
      }
    }, { passive: false });
    
    element.addEventListener('touchend', (e) => {
      touches = Array.from(e.touches);
      
      if (touches.length < 2) {
        this.gesture.isPinching = false;
        this.gesture.isPanning = false;
        
        // Reset if zoomed out too much
        if (this.gesture.scale < 0.9) {
          this.gesture.scale = 1;
          this.gesture.translateX = 0;
          this.gesture.translateY = 0;
          const container = document.getElementById('game-container');
          if (container) {
            container.style.transition = 'transform 0.3s ease';
            container.style.transform = 'scale(1) translate(0, 0)';
          }
        }
      }
    });
  }
  
  createPlayerDisplay(player, index, isMobile, isOpponent) {
    const playerBox = document.createElement('div');
    playerBox.style.background = this.state.currentPlayerIndex === index ? 
      'rgba(0, 255, 204, 0.2)' : 'rgba(0, 0, 0, 0.3)';
    playerBox.style.border = this.state.currentPlayerIndex === index ? 
      '3px solid #00ffcc' : '2px solid #444';
    playerBox.style.borderRadius = '10px';
    playerBox.style.padding = isMobile ? '10px' : '15px';
    playerBox.style.minWidth = isMobile ? '150px' : '200px';
    
    // Player name and stats
    const playerInfo = document.createElement('div');
    playerInfo.style.textAlign = 'center';
    playerInfo.style.marginBottom = '10px';
    playerInfo.style.fontSize = isMobile ? '0.9rem' : '1.1rem';
    playerInfo.style.fontWeight = 'bold';
    playerInfo.style.color = player.isHuman ? '#00ff88' : '#ff8800';
    playerInfo.textContent = `${player.name} - ${player.hand.length} cards - ${player.sets} sets`;
    playerBox.appendChild(playerInfo);
    
    // Cards
    const cardsContainer = document.createElement('div');
    cardsContainer.style.display = 'flex';
    cardsContainer.style.gap = isMobile ? '5px' : '10px';
    cardsContainer.style.justifyContent = 'center';
    cardsContainer.style.flexWrap = 'wrap';
    
    if (isOpponent) {
      // Show face-down cards for opponents
      const numCards = Math.min(player.hand.length, 5);
      for (let i = 0; i < numCards; i++) {
        const card = this.engine.renderCard(player.hand[0], false);
        const cardSize = isMobile ? { width: '40px', height: '56px' } : { width: '50px', height: '70px' };
        card.style.width = cardSize.width;
        card.style.height = cardSize.height;
        
        // Make clickable for asking
        if (this.state.currentPlayerIndex === 0 && this.state.players[0].isHuman && !this.state.turnInProgress) {
          card.style.cursor = 'pointer';
          card.style.transition = 'transform 0.2s';
          card.onmouseover = () => card.style.transform = 'translateY(-5px)';
          card.onmouseout = () => card.style.transform = 'translateY(0)';
          card.onclick = () => {
            this.state.selectedOpponent = index;
            this.state.message = `Selected ${player.name}. Now pick a rank to ask for.`;
            this.render();
          };
        }
        
        cardsContainer.appendChild(card);
      }
      if (player.hand.length > 5) {
        const moreLabel = document.createElement('div');
        moreLabel.style.fontSize = isMobile ? '0.8rem' : '1rem';
        moreLabel.style.color = '#fff';
        moreLabel.textContent = `+${player.hand.length - 5}`;
        cardsContainer.appendChild(moreLabel);
      }
    } else {
      // Show face-up cards for current human player
      player.hand.forEach((card, cardIndex) => {
        const cardEl = this.engine.renderCard(card, true);
        const cardSize = isMobile ? { width: '60px', height: '84px' } : { width: '80px', height: '112px' };
        cardEl.style.width = cardSize.width;
        cardEl.style.height = cardSize.height;
        
        if (isMobile) {
          this.scaleCardForMobile(cardEl);
        }
        
        // Make clickable for selecting rank
        if (!this.state.turnInProgress && this.state.currentPlayerIndex === 0) {
          cardEl.style.cursor = 'pointer';
          cardEl.style.border = this.state.selectedRank === card.rank ? 
            '3px solid #ffd700' : '2px solid transparent';
          cardEl.style.transition = 'transform 0.2s, border 0.2s';
          cardEl.onmouseover = () => cardEl.style.transform = 'translateY(-10px)';
          cardEl.onmouseout = () => cardEl.style.transform = 'translateY(0)';
          cardEl.onclick = () => {
            this.state.selectedRank = card.rank;
            this.state.message = this.state.selectedOpponent !== null ?
              `Ask ${this.state.players[this.state.selectedOpponent].name} for ${card.rank}s? Click "Ask"` :
              `Selected ${card.rank}. Now select an opponent.`;
            this.render();
          };
        }
        
        cardsContainer.appendChild(cardEl);
      });
    }
    
    playerBox.appendChild(cardsContainer);
    return playerBox;
  }
  
  createActionButtons(isMobile) {
    const buttonsArea = document.createElement('div');
    buttonsArea.style.display = 'flex';
    buttonsArea.style.gap = isMobile ? '10px' : '20px';
    buttonsArea.style.justifyContent = 'center';
    buttonsArea.style.marginTop = '20px';
    buttonsArea.style.flexWrap = 'wrap';
    
    // Ask button
    const askBtn = document.createElement('button');
    askBtn.textContent = '🎣 Ask for Cards';
    askBtn.style.padding = isMobile ? '10px 20px' : '12px 30px';
    askBtn.style.fontSize = isMobile ? '1rem' : '1.2rem';
    askBtn.style.fontWeight = 'bold';
    askBtn.style.background = (this.state.selectedRank && this.state.selectedOpponent !== null) ?
      'linear-gradient(135deg, #00ff88, #00ccff)' : '#666';
    askBtn.style.color = '#000';
    askBtn.style.border = 'none';
    askBtn.style.borderRadius = '8px';
    askBtn.style.cursor = (this.state.selectedRank && this.state.selectedOpponent !== null) ? 'pointer' : 'not-allowed';
    askBtn.disabled = !(this.state.selectedRank && this.state.selectedOpponent !== null);
    askBtn.onclick = () => this.executePlayerAsk();
    buttonsArea.appendChild(askBtn);
    
    // Reset zoom button (mobile only)
    if (isMobile && (this.gesture.scale !== 1 || this.gesture.translateX !== 0 || this.gesture.translateY !== 0)) {
      const resetZoomBtn = document.createElement('button');
      resetZoomBtn.textContent = '🔍 Reset View';
      resetZoomBtn.style.padding = '10px 20px';
      resetZoomBtn.style.fontSize = '1rem';
      resetZoomBtn.style.fontWeight = 'bold';
      resetZoomBtn.style.background = '#444';
      resetZoomBtn.style.color = '#fff';
      resetZoomBtn.style.border = '2px solid #00ffcc';
      resetZoomBtn.style.borderRadius = '8px';
      resetZoomBtn.style.cursor = 'pointer';
      resetZoomBtn.onclick = () => {
        this.gesture.scale = 1;
        this.gesture.translateX = 0;
        this.gesture.translateY = 0;
        const container = document.getElementById('game-container');
        if (container) {
          container.style.transition = 'transform 0.3s ease';
          container.style.transform = 'scale(1) translate(0, 0)';
        }
      };
      buttonsArea.appendChild(resetZoomBtn);
    }
    
    return buttonsArea;
  }
  
  executePlayerAsk() {
    if (this.state.turnInProgress) return;
    if (!this.state.selectedRank || this.state.selectedOpponent === null) return;
    
    this.state.turnInProgress = true;
    
    const asker = this.state.players[this.state.currentPlayerIndex];
    const opponent = this.state.players[this.state.selectedOpponent];
    const rank = this.state.selectedRank;
    
    // Record this ask in CPU memory
    this.state.cpuMemory.push({
      asker: this.state.currentPlayerIndex,
      opponent: this.state.selectedOpponent,
      rank: rank,
      turn: this.state.sets.length
    });
    
    // Check if opponent has cards of that rank
    const matchingCards = opponent.hand.filter(card => card.rank === rank);
    
    if (matchingCards.length > 0) {
      // Transfer cards
      matchingCards.forEach(card => {
        opponent.hand = opponent.hand.filter(c => c.id !== card.id);
        asker.hand.push(card);
      });
      
      this.state.message = `${opponent.name} had ${matchingCards.length} ${rank}${matchingCards.length > 1 ? 's' : ''}! You get another turn.`;
      
      // Check for completed sets
      this.checkAndRemoveSets(asker);
      
      // Player gets another turn
      this.state.selectedRank = null;
      this.state.selectedOpponent = null;
      this.state.turnInProgress = false;
      
      setTimeout(() => {
        this.checkGameEnd();
        this.render();
      }, 1500);
      
    } else {
      // Go Fish!
      this.state.message = `${opponent.name} says "Go Fish!" Draw a card...`;
      
      setTimeout(() => {
        if (this.state.drawPile.length > 0) {
          const drawnCard = this.state.drawPile.pop();
          asker.hand.push(drawnCard);
          
          // Check if drawn card matches what was asked
          if (drawnCard.rank === rank) {
            this.state.message = `You drew the ${rank} you asked for! You get another turn.`;
            this.checkAndRemoveSets(asker);
            this.state.selectedRank = null;
            this.state.selectedOpponent = null;
            this.state.turnInProgress = false;
            
            setTimeout(() => {
              this.checkGameEnd();
              this.render();
            }, 1500);
          } else {
            this.state.message = `You drew a ${drawnCard.rank}. Turn passes.`;
            this.checkAndRemoveSets(asker);
            
            setTimeout(() => {
              this.nextTurn();
            }, 1500);
          }
        } else {
          this.state.message = "Pond is empty! Turn passes.";
          setTimeout(() => {
            this.nextTurn();
          }, 1500);
        }
        this.render();
      }, 1000);
    }
    
    this.render();
  }
  
  executeCPUTurn() {
    if (this.state.gameWon) return;
    
    const cpu = this.state.players[this.state.currentPlayerIndex];
    if (cpu.hand.length === 0) {
      this.nextTurn();
      return;
    }
    
    this.state.turnInProgress = true;
    
    // CPU AI: Choose rank and opponent
    const { rank, opponentIndex } = this.chooseCPUAction();
    const opponent = this.state.players[opponentIndex];
    
    this.state.message = `${cpu.name} asks ${opponent.name} for ${rank}s...`;
    this.render();
    
    // Record in memory
    this.state.cpuMemory.push({
      asker: this.state.currentPlayerIndex,
      opponent: opponentIndex,
      rank: rank,
      turn: this.state.sets.length
    });
    
    setTimeout(() => {
      const matchingCards = opponent.hand.filter(card => card.rank === rank);
      
      if (matchingCards.length > 0) {
        // Transfer cards
        matchingCards.forEach(card => {
          opponent.hand = opponent.hand.filter(c => c.id !== card.id);
          cpu.hand.push(card);
        });
        
        this.state.message = `${cpu.name} got ${matchingCards.length} ${rank}${matchingCards.length > 1 ? 's' : ''} from ${opponent.name}!`;
        this.checkAndRemoveSets(cpu);
        this.state.turnInProgress = false;
        
        setTimeout(() => {
          if (this.checkGameEnd()) return;
          // CPU gets another turn
          this.executeCPUTurn();
        }, 1500);
        
      } else {
        this.state.message = `${opponent.name} says "Go Fish!"`;
        
        setTimeout(() => {
          if (this.state.drawPile.length > 0) {
            const drawnCard = this.state.drawPile.pop();
            cpu.hand.push(drawnCard);
            
            if (drawnCard.rank === rank) {
              this.state.message = `${cpu.name} drew the ${rank} they asked for!`;
              this.checkAndRemoveSets(cpu);
              this.state.turnInProgress = false;
              
              setTimeout(() => {
                if (this.checkGameEnd()) return;
                this.executeCPUTurn();
              }, 1500);
            } else {
              this.checkAndRemoveSets(cpu);
              this.state.message = `${cpu.name} drew a card. Turn passes.`;
              
              setTimeout(() => {
                this.nextTurn();
              }, 1500);
            }
          } else {
            this.state.message = "Pond is empty! Turn passes.";
            setTimeout(() => {
              this.nextTurn();
            }, 1500);
          }
          this.render();
        }, 1000);
      }
      this.render();
    }, 1500);
  }
  
  chooseCPUAction() {
    const cpu = this.state.players[this.state.currentPlayerIndex];
    
    // Count cards by rank
    const rankCounts = {};
    cpu.hand.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    // Strategy 1: Ask for ranks we have multiple of
    const multipleRanks = Object.keys(rankCounts).filter(rank => rankCounts[rank] >= 2);
    
    // Strategy 2: Check memory for known cards
    const recentMemory = this.state.cpuMemory.slice(-20);
    const knownCards = {};
    recentMemory.forEach(mem => {
      if (mem.opponent !== this.state.currentPlayerIndex) {
        if (!knownCards[mem.opponent]) knownCards[mem.opponent] = [];
        if (rankCounts[mem.rank] && rankCounts[mem.rank] > 0) {
          knownCards[mem.opponent].push(mem.rank);
        }
      }
    });
    
    // Choose opponent (not self)
    const possibleOpponents = this.state.players
      .map((p, i) => i)
      .filter(i => i !== this.state.currentPlayerIndex && this.state.players[i].hand.length > 0);
    
    if (possibleOpponents.length === 0) {
      // No valid opponents, skip turn
      return { rank: cpu.hand[0].rank, opponentIndex: 0 };
    }
    
    // Prioritize opponents with known matching cards
    let chosenOpponent = possibleOpponents[0];
    let chosenRank = cpu.hand[0].rank;
    
    for (const oppIndex of possibleOpponents) {
      if (knownCards[oppIndex] && knownCards[oppIndex].length > 0) {
        chosenOpponent = oppIndex;
        chosenRank = knownCards[oppIndex][0];
        break;
      }
    }
    
    // If no memory match, ask for rank we have most of
    if (multipleRanks.length > 0 && !knownCards[chosenOpponent]) {
      const bestRank = multipleRanks.reduce((a, b) => 
        rankCounts[a] > rankCounts[b] ? a : b
      );
      chosenRank = bestRank;
      // Pick random opponent
      chosenOpponent = possibleOpponents[Math.floor(Math.random() * possibleOpponents.length)];
    }
    
    return { rank: chosenRank, opponentIndex: chosenOpponent };
  }
  
  nextTurn() {
    this.state.selectedRank = null;
    this.state.selectedOpponent = null;
    this.state.turnInProgress = false;
    
    // Move to next player
    do {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    } while (this.state.players[this.state.currentPlayerIndex].hand.length === 0 && 
             this.state.players.some(p => p.hand.length > 0));
    
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    
    if (this.checkGameEnd()) return;
    
    this.state.message = `${currentPlayer.name}'s turn`;
    this.render();
    
    // If CPU, execute their turn
    if (!currentPlayer.isHuman) {
      setTimeout(() => this.executeCPUTurn(), 1000);
    }
  }
  
  checkGameEnd() {
    // Game ends when all 13 sets are made OR all players have no cards
    const allCardsGone = this.state.players.every(p => p.hand.length === 0) || 
                         this.state.drawPile.length === 0;
    
    if (this.state.sets.length === 13 || allCardsGone) {
      this.state.gameWon = true;
      
      // Find winner
      const maxSets = Math.max(...this.state.players.map(p => p.sets));
      const winners = this.state.players.filter(p => p.sets === maxSets);
      
      if (winners.length === 1) {
        this.state.message = `🏆 ${winners[0].name} wins with ${maxSets} sets! 🏆`;
      } else {
        this.state.message = `🏆 Tie! ${winners.map(w => w.name).join(' and ')} with ${maxSets} sets! 🏆`;
      }
      
      this.render();
      setTimeout(() => {
        this.engine.celebrateWin();
      }, 500);
      
      return true;
    }
    
    return false;
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
  
  updateStats() {
    const totalSets = this.state.sets.length;
    const moves = this.state.cpuMemory.length;
    
    document.getElementById('game-moves').textContent = `Asks: ${moves}`;
    document.getElementById('game-score').textContent = `Sets: ${totalSets}/13`;
  }
  
  pause() {
    // Optional pause functionality
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
window.GameModules['multiplayer-go-fish-v1'] = GoFish;
