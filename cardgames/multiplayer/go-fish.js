/**
 * Go Fish - Classic Card Matching Game
 * Completely rebuilt with proper spacing, visibility, and mobile support
 */

class GoFish {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      players: [],
      currentPlayerIndex: 0,
      drawPile: [],
      sets: [],
      gameWon: false,
      turnInProgress: false,
      selectedRank: null,
      selectedOpponent: null,
      cpuMemory: [],
      message: 'Welcome to Go Fish!'
    };
    this.resizeHandler = null;
    this.config = {
      totalPlayers: 2,
      humanPlayers: 1
    };
  }
  
  setup() {
    this.state = {
      players: [],
      currentPlayerIndex: 0,
      drawPile: [],
      sets: [],
      gameWon: false,
      turnInProgress: false,
      selectedRank: null,
      selectedOpponent: null,
      cpuMemory: [],
      message: 'Welcome to Go Fish!'
    };
    
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
    this.showSetupScreen();
  }
  
  showSetupScreen() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 25px;
      min-height: 500px;
    `;
    
    const isMobile = window.innerWidth < 700;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: ${isMobile ? '2rem' : '3rem'};
      font-weight: bold;
      color: #ffd700;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    title.textContent = '🎣 Go Fish';
    gameBoard.appendChild(title);
    
    // Setup box
    const setupBox = document.createElement('div');
    setupBox.style.cssText = `
      background: rgba(0, 0, 0, 0.7);
      border: 3px solid #00ffcc;
      border-radius: 15px;
      padding: ${isMobile ? '20px' : '40px'};
      max-width: ${isMobile ? '90%' : '500px'};
      width: 100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;
    
    // Player count selector
    setupBox.appendChild(this.createSelector(
      'Total Players:', 
      'players-select',
      [2, 3, 4],
      this.config.totalPlayers,
      (val) => {
        this.config.totalPlayers = val;
        if (this.config.humanPlayers > val - 1) {
          this.config.humanPlayers = val - 1;
        }
        this.showSetupScreen();
      },
      isMobile
    ));
    
    // Human players selector
    const humanOptions = [];
    for (let i = 1; i < this.config.totalPlayers; i++) {
      humanOptions.push(i);
    }
    setupBox.appendChild(this.createSelector(
      'Human Players:', 
      'human-select',
      humanOptions,
      Math.min(this.config.humanPlayers, this.config.totalPlayers - 1),
      (val) => { this.config.humanPlayers = val; },
      isMobile
    ));
    
    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = '🎮 Start Game';
    startBtn.style.cssText = `
      width: 100%;
      padding: ${isMobile ? '15px' : '20px'};
      font-size: ${isMobile ? '1.2rem' : '1.5rem'};
      font-weight: bold;
      background: linear-gradient(135deg, #00ff88, #00ccff);
      color: #000;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      margin-top: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    startBtn.onmouseover = () => {
      startBtn.style.transform = 'scale(1.05)';
      startBtn.style.boxShadow = '0 5px 20px rgba(0,255,200,0.5)';
    };
    startBtn.onmouseout = () => {
      startBtn.style.transform = 'scale(1)';
      startBtn.style.boxShadow = 'none';
    };
    startBtn.onclick = () => this.startGame();
    setupBox.appendChild(startBtn);
    
    gameBoard.appendChild(setupBox);
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      max-width: ${isMobile ? '90%' : '600px'};
      text-align: center;
      color: #87ceeb;
      font-size: ${isMobile ? '0.9rem' : '1.1rem'};
      line-height: 1.8;
      background: rgba(0,0,0,0.5);
      padding: 20px;
      border-radius: 10px;
      border: 2px solid #444;
    `;
    instructions.innerHTML = `
      <strong style="color: #ffd700; font-size: 1.2em;">How to Play:</strong><br><br>
      • Click your cards to select a rank<br>
      • Click an opponent to ask them<br>
      • If they have it, you get their cards<br>
      • If not, Go Fish from the deck!<br>
      • Collect all 4 of a rank to make a set<br>
      • Most sets wins!
    `;
    gameBoard.appendChild(instructions);
    
    this.updateStats();
  }
  
  createSelector(label, id, options, currentValue, onChange, isMobile) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 25px;';
    
    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-size: ${isMobile ? '1.1rem' : '1.3rem'};
      color: #fff;
      margin-bottom: 10px;
      font-weight: bold;
    `;
    labelEl.textContent = label;
    container.appendChild(labelEl);
    
    const select = document.createElement('select');
    select.id = id;
    select.style.cssText = `
      width: 100%;
      padding: 12px;
      font-size: ${isMobile ? '1rem' : '1.2rem'};
      border-radius: 8px;
      border: 2px solid #00ffcc;
      background: #1a1a2e;
      color: #fff;
      cursor: pointer;
    `;
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === currentValue) option.selected = true;
      select.appendChild(option);
    });
    
    select.onchange = (e) => onChange(parseInt(e.target.value));
    container.appendChild(select);
    
    return container;
  }
  
  startGame() {
    // Initialize players
    this.state.players = [];
    for (let i = 0; i < this.config.totalPlayers; i++) {
      const isHuman = i < this.config.humanPlayers;
      this.state.players.push({
        id: i,
        name: isHuman ? `You` : `CPU ${i - this.config.humanPlayers + 1}`,
        isHuman: isHuman,
        hand: [],
        sets: 0
      });
    }
    
    // Create and shuffle deck
    const allCards = this.engine.createCardArray(this.deck);
    this.state.drawPile = this.engine.shuffleDeck(allCards);
    
    // Deal cards (7 for 2 players, 5 for 3-4 players)
    const cardsPerPlayer = this.config.totalPlayers === 2 ? 7 : 5;
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
    
    this.state.currentPlayerIndex = 0;
    this.state.message = "Your turn! Select a rank from your hand, then click an opponent.";
    
    this.render();
    
    // If first player is CPU, start their turn
    if (!this.state.players[0].isHuman) {
      setTimeout(() => this.executeCPUTurn(), 1500);
    }
  }
  
  checkAndRemoveSets(player) {
    const rankCounts = {};
    player.hand.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    Object.keys(rankCounts).forEach(rank => {
      if (rankCounts[rank] === 4) {
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
    gameBoard.style.cssText = `
      display: flex;
      flex-direction: column;
      padding: 15px;
      gap: 20px;
      overflow-y: auto;
      max-height: 100vh;
    `;
    
    const isMobile = window.innerWidth < 700;
    
    // Message bar
    const messageBar = document.createElement('div');
    messageBar.style.cssText = `
      background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,255,200,0.2));
      border: 2px solid #ffd700;
      border-radius: 10px;
      padding: ${isMobile ? '12px' : '15px'};
      text-align: center;
      font-size: ${isMobile ? '1rem' : '1.3rem'};
      font-weight: bold;
      color: #ffd700;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    messageBar.textContent = this.state.message;
    gameBoard.appendChild(messageBar);
    
    // Opponents section
    const opponentsSection = document.createElement('div');
    opponentsSection.style.cssText = `
      display: flex;
      gap: ${isMobile ? '10px' : '15px'};
      justify-content: center;
      flex-wrap: wrap;
      padding: 10px;
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
    `;
    
    this.state.players.forEach((player, index) => {
      if (index !== 0) { // Skip human player
        opponentsSection.appendChild(this.createOpponentDisplay(player, index, isMobile));
      }
    });
    gameBoard.appendChild(opponentsSection);
    
    // Draw pile and stats
    const centerSection = document.createElement('div');
    centerSection.style.cssText = `
      display: flex;
      gap: ${isMobile ? '15px' : '30px'};
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 10px;
      flex-wrap: wrap;
    `;
    
    // Draw pile
    const pileContainer = document.createElement('div');
    pileContainer.style.cssText = 'text-align: center;';
    
    const pileLabel = document.createElement('div');
    pileLabel.style.cssText = `
      color: #00ffcc;
      font-size: ${isMobile ? '1rem' : '1.2rem'};
      font-weight: bold;
      margin-bottom: 10px;
    `;
    pileLabel.textContent = `🎣 Pond: ${this.state.drawPile.length}`;
    pileContainer.appendChild(pileLabel);
    
    if (this.state.drawPile.length > 0) {
      const pileCard = this.engine.renderCard(this.state.drawPile[0], false);
      pileCard.style.cssText = `
        width: ${isMobile ? '70px' : '100px'};
        height: ${isMobile ? '98px' : '140px'};
      `;
      pileContainer.appendChild(pileCard);
    }
    centerSection.appendChild(pileContainer);
    
    // Sets counter
    const setsDisplay = document.createElement('div');
    setsDisplay.style.cssText = `
      text-align: center;
      font-size: ${isMobile ? '1.2rem' : '1.5rem'};
      color: #ffd700;
      font-weight: bold;
    `;
    setsDisplay.innerHTML = `📚 Sets Complete<br>${this.state.sets.length} / 13`;
    centerSection.appendChild(setsDisplay);
    
    gameBoard.appendChild(centerSection);
    
    // Current player's hand
    const humanPlayer = this.state.players[0];
    const handSection = document.createElement('div');
    handSection.style.cssText = `
      background: ${this.state.currentPlayerIndex === 0 ? 'rgba(0,255,200,0.2)' : 'rgba(0,0,0,0.3)'};
      border: 3px solid ${this.state.currentPlayerIndex === 0 ? '#00ffcc' : '#444'};
      border-radius: 15px;
      padding: ${isMobile ? '15px' : '20px'};
    `;
    
    const handHeader = document.createElement('div');
    handHeader.style.cssText = `
      text-align: center;
      font-size: ${isMobile ? '1.2rem' : '1.5rem'};
      font-weight: bold;
      color: #00ff88;
      margin-bottom: 15px;
    `;
    handHeader.textContent = `Your Hand (${humanPlayer.hand.length} cards) - ${humanPlayer.sets} sets`;
    handSection.appendChild(handHeader);
    
    // Cards display
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
      display: flex;
      gap: ${isMobile ? '8px' : '12px'};
      justify-content: center;
      flex-wrap: wrap;
      padding: 10px;
    `;
    
    if (humanPlayer.hand.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = `
        color: #888;
        font-size: ${isMobile ? '1rem' : '1.2rem'};
        padding: 20px;
      `;
      emptyMsg.textContent = 'No cards - waiting for game to end';
      cardsContainer.appendChild(emptyMsg);
    } else {
      humanPlayer.hand.forEach(card => {
        const cardEl = this.engine.renderCard(card, true);
        const isSelected = this.state.selectedRank === card.rank;
        const canSelect = this.state.currentPlayerIndex === 0 && !this.state.turnInProgress;
        
        cardEl.style.cssText = `
          width: ${isMobile ? '70px' : '100px'};
          height: ${isMobile ? '98px' : '140px'};
          cursor: ${canSelect ? 'pointer' : 'default'};
          border: 3px solid ${isSelected ? '#ffd700' : 'transparent'};
          border-radius: 8px;
          transition: all 0.2s;
          box-shadow: ${isSelected ? '0 0 20px rgba(255,215,0,0.6)' : 'none'};
        `;
        
        if (isMobile) {
          this.scaleCardForMobile(cardEl);
        }
        
        if (canSelect) {
          cardEl.onmouseover = () => {
            if (!isSelected) {
              cardEl.style.transform = 'translateY(-10px) scale(1.05)';
              cardEl.style.boxShadow = '0 10px 20px rgba(0,255,200,0.4)';
            }
          };
          cardEl.onmouseout = () => {
            if (!isSelected) {
              cardEl.style.transform = 'translateY(0) scale(1)';
              cardEl.style.boxShadow = 'none';
            }
          };
          cardEl.onclick = () => this.selectRank(card.rank);
        }
        
        cardsContainer.appendChild(cardEl);
      });
    }
    
    handSection.appendChild(cardsContainer);
    gameBoard.appendChild(handSection);
    
    // Action button
    if (this.state.currentPlayerIndex === 0 && !this.state.turnInProgress && humanPlayer.hand.length > 0) {
      const actionBtn = document.createElement('button');
      const canAsk = this.state.selectedRank && this.state.selectedOpponent !== null;
      actionBtn.textContent = canAsk ? '🎣 Ask for Cards!' : 'Select rank & opponent';
      actionBtn.disabled = !canAsk;
      actionBtn.style.cssText = `
        padding: ${isMobile ? '15px 30px' : '18px 40px'};
        font-size: ${isMobile ? '1.1rem' : '1.3rem'};
        font-weight: bold;
        background: ${canAsk ? 'linear-gradient(135deg, #00ff88, #00ccff)' : '#555'};
        color: ${canAsk ? '#000' : '#888'};
        border: none;
        border-radius: 10px;
        cursor: ${canAsk ? 'pointer' : 'not-allowed'};
        margin: 0 auto;
        display: block;
        transition: all 0.2s;
      `;
      
      if (canAsk) {
        actionBtn.onmouseover = () => {
          actionBtn.style.transform = 'scale(1.05)';
          actionBtn.style.boxShadow = '0 5px 20px rgba(0,255,200,0.5)';
        };
        actionBtn.onmouseout = () => {
          actionBtn.style.transform = 'scale(1)';
          actionBtn.style.boxShadow = 'none';
        };
        actionBtn.onclick = () => this.executePlayerAsk();
      }
      
      gameBoard.appendChild(actionBtn);
    }
    
    this.updateStats();
  }
  
  createOpponentDisplay(player, index, isMobile) {
    const oppBox = document.createElement('div');
    const isSelected = this.state.selectedOpponent === index;
    const canSelect = this.state.currentPlayerIndex === 0 && !this.state.turnInProgress && 
                      this.state.selectedRank && player.hand.length > 0;
    
    oppBox.style.cssText = `
      background: ${isSelected ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.5)'};
      border: 3px solid ${isSelected ? '#ffd700' : '#00ffcc'};
      border-radius: 10px;
      padding: ${isMobile ? '10px' : '15px'};
      min-width: ${isMobile ? '120px' : '160px'};
      cursor: ${canSelect ? 'pointer' : 'default'};
      transition: all 0.2s;
      box-shadow: ${isSelected ? '0 0 20px rgba(255,215,0,0.5)' : 'none'};
    `;
    
    if (canSelect) {
      oppBox.onmouseover = () => {
        oppBox.style.transform = 'scale(1.05)';
        oppBox.style.borderColor = '#ffd700';
      };
      oppBox.onmouseout = () => {
        oppBox.style.transform = 'scale(1)';
        if (!isSelected) oppBox.style.borderColor = '#00ffcc';
      };
      oppBox.onclick = () => this.selectOpponent(index);
    }
    
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
      text-align: center;
      font-size: ${isMobile ? '1rem' : '1.2rem'};
      font-weight: bold;
      color: #ff8800;
      margin-bottom: 10px;
    `;
    nameLabel.textContent = player.name;
    oppBox.appendChild(nameLabel);
    
    const statsLabel = document.createElement('div');
    statsLabel.style.cssText = `
      text-align: center;
      font-size: ${isMobile ? '0.85rem' : '1rem'};
      color: #fff;
      margin-bottom: 10px;
    `;
    statsLabel.textContent = `${player.hand.length} cards | ${player.sets} sets`;
    oppBox.appendChild(statsLabel);
    
    // Show card backs
    const cardsRow = document.createElement('div');
    cardsRow.style.cssText = `
      display: flex;
      gap: 3px;
      justify-content: center;
      flex-wrap: wrap;
    `;
    
    const numToShow = Math.min(player.hand.length, 5);
    for (let i = 0; i < numToShow; i++) {
      const cardBack = this.engine.renderCard(player.hand[0], false);
      cardBack.style.cssText = `
        width: ${isMobile ? '25px' : '35px'};
        height: ${isMobile ? '35px' : '49px'};
      `;
      cardsRow.appendChild(cardBack);
    }
    
    if (player.hand.length > 5) {
      const moreLabel = document.createElement('div');
      moreLabel.style.cssText = `
        color: #fff;
        font-size: ${isMobile ? '0.8rem' : '1rem'};
        line-height: ${isMobile ? '35px' : '49px'};
      `;
      moreLabel.textContent = `+${player.hand.length - 5}`;
      cardsRow.appendChild(moreLabel);
    }
    
    oppBox.appendChild(cardsRow);
    return oppBox;
  }
  
  selectRank(rank) {
    if (this.state.turnInProgress) return;
    
    this.state.selectedRank = rank;
    
    if (this.state.selectedOpponent !== null) {
      const opp = this.state.players[this.state.selectedOpponent];
      this.state.message = `Ready to ask ${opp.name} for ${rank}s. Click "Ask for Cards!"`;
    } else {
      this.state.message = `Selected ${rank}s. Now click an opponent to ask.`;
    }
    
    this.render();
  }
  
  selectOpponent(index) {
    if (this.state.turnInProgress) return;
    if (!this.state.selectedRank) {
      this.state.message = "Select a rank from your hand first!";
      this.render();
      return;
    }
    
    this.state.selectedOpponent = index;
    const opp = this.state.players[index];
    this.state.message = `Ready to ask ${opp.name} for ${this.state.selectedRank}s. Click "Ask for Cards!"`;
    this.render();
  }
  
  executePlayerAsk() {
    if (!this.state.selectedRank || this.state.selectedOpponent === null) return;
    if (this.state.turnInProgress) return;
    
    this.state.turnInProgress = true;
    
    const opponent = this.state.players[this.state.selectedOpponent];
    const rank = this.state.selectedRank;
    
    this.state.cpuMemory.push({
      asker: 0,
      opponent: this.state.selectedOpponent,
      rank: rank
    });
    
    const matchingCards = opponent.hand.filter(c => c.rank === rank);
    
    if (matchingCards.length > 0) {
      // Got cards!
      matchingCards.forEach(card => {
        opponent.hand = opponent.hand.filter(c => c.id !== card.id);
        this.state.players[0].hand.push(card);
      });
      
      this.state.message = `${opponent.name} had ${matchingCards.length} ${rank}${matchingCards.length > 1 ? 's' : ''}! You get another turn.`;
      this.checkAndRemoveSets(this.state.players[0]);
      
      this.state.selectedRank = null;
      this.state.selectedOpponent = null;
      this.state.turnInProgress = false;
      
      setTimeout(() => {
        if (!this.checkGameEnd()) {
          this.state.message = "Your turn! Select another rank.";
          this.render();
        }
      }, 2000);
    } else {
      // Go Fish!
      this.state.message = `${opponent.name} says "Go Fish!" Drawing...`;
      this.render();
      
      setTimeout(() => {
        if (this.state.drawPile.length > 0) {
          const drawn = this.state.drawPile.pop();
          this.state.players[0].hand.push(drawn);
          
          if (drawn.rank === rank) {
            this.state.message = `Lucky! You drew the ${rank} you asked for! Another turn.`;
            this.checkAndRemoveSets(this.state.players[0]);
            
            this.state.selectedRank = null;
            this.state.selectedOpponent = null;
            this.state.turnInProgress = false;
            
            setTimeout(() => {
              if (!this.checkGameEnd()) {
                this.state.message = "Your turn! Select a rank.";
                this.render();
              }
            }, 2000);
          } else {
            this.state.message = `You drew a ${drawn.rank}. Turn passes.`;
            this.checkAndRemoveSets(this.state.players[0]);
            
            setTimeout(() => this.nextTurn(), 2000);
          }
        } else {
          this.state.message = "Pond is empty! Turn passes.";
          setTimeout(() => this.nextTurn(), 1500);
        }
        this.render();
      }, 1500);
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
    
    const { rank, opponentIndex } = this.chooseCPUAction();
    const opponent = this.state.players[opponentIndex];
    
    this.state.message = `${cpu.name} asks ${opponent.name} for ${rank}s...`;
    this.render();
    
    setTimeout(() => {
      const matchingCards = opponent.hand.filter(c => c.rank === rank);
      
      if (matchingCards.length > 0) {
        matchingCards.forEach(card => {
          opponent.hand = opponent.hand.filter(c => c.id !== card.id);
          cpu.hand.push(card);
        });
        
        this.state.message = `${cpu.name} got ${matchingCards.length} ${rank}${matchingCards.length > 1 ? 's' : ''}!`;
        this.checkAndRemoveSets(cpu);
        this.state.turnInProgress = false;
        
        this.render();
        
        setTimeout(() => {
          if (!this.checkGameEnd()) {
            this.executeCPUTurn();
          }
        }, 1500);
      } else {
        this.state.message = `${opponent.name} says "Go Fish!"`;
        this.render();
        
        setTimeout(() => {
          if (this.state.drawPile.length > 0) {
            const drawn = this.state.drawPile.pop();
            cpu.hand.push(drawn);
            
            if (drawn.rank === rank) {
              this.state.message = `${cpu.name} drew the ${rank} they wanted!`;
              this.checkAndRemoveSets(cpu);
              this.state.turnInProgress = false;
              
              this.render();
              
              setTimeout(() => {
                if (!this.checkGameEnd()) {
                  this.executeCPUTurn();
                }
              }, 1500);
            } else {
              this.checkAndRemoveSets(cpu);
              this.state.message = `${cpu.name} drew a card. Turn passes.`;
              this.render();
              
              setTimeout(() => this.nextTurn(), 1500);
            }
          } else {
            this.state.message = "Pond is empty! Turn passes.";
            this.render();
            setTimeout(() => this.nextTurn(), 1500);
          }
        }, 1000);
      }
    }, 1500);
  }
  
  chooseCPUAction() {
    const cpu = this.state.players[this.state.currentPlayerIndex];
    
    // Count ranks in hand
    const rankCounts = {};
    cpu.hand.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    // Prefer ranks we have multiples of
    const multipleRanks = Object.keys(rankCounts).filter(r => rankCounts[r] >= 2);
    const chosenRank = multipleRanks.length > 0 ? 
      multipleRanks[Math.floor(Math.random() * multipleRanks.length)] :
      cpu.hand[Math.floor(Math.random() * cpu.hand.length)].rank;
    
    // Choose random opponent with cards
    const validOpponents = this.state.players
      .map((p, i) => i)
      .filter(i => i !== this.state.currentPlayerIndex && this.state.players[i].hand.length > 0);
    
    const chosenOpponent = validOpponents[Math.floor(Math.random() * validOpponents.length)];
    
    return { rank: chosenRank, opponentIndex: chosenOpponent };
  }
  
  nextTurn() {
    this.state.selectedRank = null;
    this.state.selectedOpponent = null;
    this.state.turnInProgress = false;
    
    do {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    } while (this.state.players[this.state.currentPlayerIndex].hand.length === 0 && 
             this.state.players.some(p => p.hand.length > 0));
    
    const current = this.state.players[this.state.currentPlayerIndex];
    
    if (this.checkGameEnd()) return;
    
    this.state.message = current.isHuman ? 
      "Your turn! Select a rank and opponent." :
      `${current.name}'s turn...`;
    
    this.render();
    
    if (!current.isHuman) {
      setTimeout(() => this.executeCPUTurn(), 1000);
    }
  }
  
  checkGameEnd() {
    const allEmpty = this.state.players.every(p => p.hand.length === 0);
    const allSets = this.state.sets.length === 13;
    
    if (allEmpty || allSets) {
      this.state.gameWon = true;
      
      const maxSets = Math.max(...this.state.players.map(p => p.sets));
      const winners = this.state.players.filter(p => p.sets === maxSets);
      
      if (winners.length === 1) {
        this.state.message = `🏆 ${winners[0].name} wins with ${maxSets} sets! 🏆`;
      } else {
        this.state.message = `🏆 Tie! ${winners.map(w => w.name).join(' & ')} with ${maxSets} sets! 🏆`;
      }
      
      this.render();
      setTimeout(() => this.engine.celebrateWin(), 500);
      return true;
    }
    
    return false;
  }
  
  scaleCardForMobile(cardElement) {
    cardElement.style.fontSize = '0.6rem';
    cardElement.querySelectorAll('.rank').forEach(el => {
      el.style.fontSize = '0.75rem';
    });
    cardElement.querySelectorAll('.mini-pip').forEach(el => {
      el.style.fontSize = '0.6rem';
    });
    cardElement.querySelectorAll('.pip').forEach(pip => {
      pip.style.fontSize = pip.classList.contains('large') ? '1.5rem' : '0.8rem';
    });
  }
  
  updateStats() {
    document.getElementById('game-moves').textContent = `Asks: ${this.state.cpuMemory.length}`;
    document.getElementById('game-score').textContent = `Sets: ${this.state.sets.length}/13`;
  }
  
  pause() {}
  
  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}

window.GameModules = window.GameModules || {};
window.GameModules['multiplayer-go-fish-v1'] = GoFish;
