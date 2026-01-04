/**
 * Go Fish - Classic Card Matching Game
 * 2-4 players (human and/or CPU)
 * Features: Smart CPU AI, Improved Hand Layout, Mobile support
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
    gameBoard.style.gap = '20px';
    gameBoard.style.padding = '20px';
    gameBoard.style.background = '#1a1a2e';
    
    const isMobile = window.innerWidth < 700;
    
    const title = document.createElement('div');
    title.style.fontSize = isMobile ? '1.8rem' : '2.5rem';
    title.style.color = '#ffd700';
    title.style.fontWeight = 'bold';
    title.textContent = '🎣 Go Fish';
    gameBoard.appendChild(title);
    
    const setupBox = document.createElement('div');
    setupBox.style.background = 'rgba(255, 255, 255, 0.05)';
    setupBox.style.padding = '30px';
    setupBox.style.borderRadius = '15px';
    setupBox.style.border = '2px solid #00ffcc';
    setupBox.style.width = '100%';
    setupBox.style.maxWidth = '400px';
    
    // Config markup
    setupBox.innerHTML = `
      <div style="margin-bottom:20px">
        <label style="display:block; color:#fff; margin-bottom:10px">Total Players</label>
        <select id="total-pts" style="width:100%; padding:10px; border-radius:5px; background:#000; color:#fff; border:1px solid #00ffcc">
          <option value="2">2 Players</option>
          <option value="3">3 Players</option>
          <option value="4">4 Players</option>
        </select>
      </div>
      <div style="margin-bottom:30px">
        <label style="display:block; color:#fff; margin-bottom:10px">Human Players</label>
        <select id="human-pts" style="width:100%; padding:10px; border-radius:5px; background:#000; color:#fff; border:1px solid #00ffcc">
          <option value="1">1 Human (vs CPUs)</option>
        </select>
      </div>
      <button id="start-btn" style="width:100%; padding:15px; background:#00ffcc; color:#000; border:none; border-radius:5px; font-weight:bold; cursor:pointer">START GAME</button>
    `;
    
    gameBoard.appendChild(setupBox);

    const totalSelect = setupBox.querySelector('#total-pts');
    const humanSelect = setupBox.querySelector('#human-pts');
    
    totalSelect.onchange = () => {
        const val = parseInt(totalSelect.value);
        humanSelect.innerHTML = '';
        for(let i=1; i < val; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${i} Human${i>1?'s':''} / ${val-i} CPU${(val-i)>1?'s':''}`;
            humanSelect.appendChild(opt);
        }
    };

    setupBox.querySelector('#start-btn').onclick = () => {
      this.config.totalPlayers = parseInt(totalSelect.value);
      this.config.humanPlayers = parseInt(humanSelect.value);
      this.startGame();
    };
  }
  
  startGame() {
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
    
    const allCards = this.engine.createCardArray(this.deck);
    this.state.drawPile = this.engine.shuffleDeck(allCards);
    
    const cardsPerPlayer = this.config.totalPlayers <= 3 ? 7 : 5;
    for (let i = 0; i < cardsPerPlayer; i++) {
      this.state.players.forEach(player => {
        if (this.state.drawPile.length > 0) {
          player.hand.push(this.state.drawPile.pop());
        }
      });
    }
    
    this.state.players.forEach(player => this.checkAndRemoveSets(player));
    this.state.cpuMemory = [];
    this.state.currentPlayerIndex = 0;
    this.state.sets = [];
    this.state.message = `${this.state.players[0].name}'s turn`;
    
    this.render();
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
        this.state.sets.push({ player: player.id, rank: rank, cards: setCards });
      }
    });
  }
  
  render() {
    if (this.state.players.length === 0) return;
    
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'grid';
    gameBoard.style.gridTemplateRows = 'auto 1fr auto';
    gameBoard.style.height = '100vh';
    gameBoard.style.width = '100%';
    gameBoard.style.padding = '10px';
    gameBoard.style.boxSizing = 'border-box';
    gameBoard.style.overflow = 'hidden';
    gameBoard.style.background = 'radial-gradient(circle, #1a2a6c, #b21f1f, #fdbb2d)';
    
    const isMobile = window.innerWidth < 700;

    // 1. HEADER: Message and Stats
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.padding = '10px';
    header.style.background = 'rgba(0,0,0,0.6)';
    header.style.borderRadius = '10px';
    header.style.marginBotton = '10px';
    
    const msg = document.createElement('div');
    msg.style.color = '#fff';
    msg.style.fontSize = isMobile ? '1.1rem' : '1.4rem';
    msg.style.fontWeight = 'bold';
    msg.textContent = this.state.message;
    header.appendChild(msg);
    gameBoard.appendChild(header);

    // 2. MAIN AREA: Opponents and Table
    const mainArea = document.createElement('div');
    mainArea.style.display = 'flex';
    mainArea.style.flexDirection = 'column';
    mainArea.style.justifyContent = 'space-around';
    mainArea.style.alignItems = 'center';
    mainArea.style.overflowY = 'auto';

    // Opponents Grid
    const oppGrid = document.createElement('div');
    oppGrid.style.display = 'flex';
    oppGrid.style.gap = '15px';
    oppGrid.style.flexWrap = 'wrap';
    oppGrid.style.justifyContent = 'center';
    oppGrid.style.width = '100%';

    this.state.players.forEach((player, idx) => {
        if (idx === 0) return; // Skip human
        oppGrid.appendChild(this.createOpponentUI(player, idx, isMobile));
    });
    mainArea.appendChild(oppGrid);

    // Fishing Pond (Draw Pile)
    const tableCenter = document.createElement('div');
    tableCenter.style.display = 'flex';
    tableCenter.style.gap = '40px';
    tableCenter.style.alignItems = 'center';
    tableCenter.style.margin = '20px 0';
    
    const pond = document.createElement('div');
    pond.style.textAlign = 'center';
    pond.innerHTML = `<div style="color:#00ffcc; font-weight:bold">POND (${this.state.drawPile.length})</div>`;
    if(this.state.drawPile.length > 0) {
        const back = this.engine.renderCard({suit:'spades', rank:'A'}, false);
        back.style.width = '60px';
        back.style.height = '85px';
        pond.appendChild(back);
    }
    tableCenter.appendChild(pond);

    const setCounter = document.createElement('div');
    setCounter.style.color = '#ffd700';
    setCounter.style.textAlign = 'center';
    setCounter.innerHTML = `<div style="font-weight:bold">TOTAL SETS</div><div style="font-size:2rem">${this.state.sets.length}/13</div>`;
    tableCenter.appendChild(setCounter);

    mainArea.appendChild(tableCenter);
    gameBoard.appendChild(mainArea);

    // 3. FOOTER: Human Hand and Controls
    const footer = document.createElement('div');
    footer.style.background = 'rgba(0,0,0,0.4)';
    footer.style.padding = '15px';
    footer.style.borderRadius = '15px 15px 0 0';
    footer.style.display = 'flex';
    footer.style.flexDirection = 'column';
    footer.style.alignItems = 'center';

    const handContainer = document.createElement('div');
    handContainer.style.display = 'flex';
    handContainer.style.flexWrap = 'wrap';
    handContainer.style.justifyContent = 'center';
    handContainer.style.gap = '10px';
    handContainer.style.width = '100%';
    handContainer.style.marginBottom = '15px';

    const human = this.state.players[0];
    human.hand.sort((a, b) => a.value - b.value).forEach(card => {
        const cardEl = this.engine.renderCard(card, true);
        cardEl.style.width = isMobile ? '55px' : '80px';
        cardEl.style.height = isMobile ? '80px' : '115px';
        cardEl.style.cursor = 'pointer';
        cardEl.style.transition = 'transform 0.2s';
        
        if (this.state.selectedRank === card.rank) {
            cardEl.style.transform = 'translateY(-20px)';
            cardEl.style.boxShadow = '0 0 15px #ffd700';
            cardEl.style.border = '2px solid #ffd700';
        }

        cardEl.onclick = () => {
            if (this.state.currentPlayerIndex !== 0 || this.state.turnInProgress) return;
            this.state.selectedRank = card.rank;
            this.render();
        };
        handContainer.appendChild(cardEl);
    });
    footer.appendChild(handContainer);

    // Action Row
    if (this.state.currentPlayerIndex === 0 && !this.state.gameWon) {
        const askBtn = document.createElement('button');
        askBtn.textContent = (this.state.selectedRank && this.state.selectedOpponent !== null) 
            ? `Ask ${this.state.players[this.state.selectedOpponent].name} for ${this.state.selectedRank}s`
            : "Select a Card & Opponent";
        
        askBtn.style.padding = '12px 25px';
        askBtn.style.fontSize = '1.1rem';
        askBtn.style.borderRadius = '30px';
        askBtn.style.border = 'none';
        askBtn.style.fontWeight = 'bold';
        askBtn.style.cursor = (this.state.selectedRank && this.state.selectedOpponent !== null) ? 'pointer' : 'not-allowed';
        askBtn.style.background = (this.state.selectedRank && this.state.selectedOpponent !== null) ? '#00ffcc' : '#555';
        
        askBtn.onclick = () => this.executePlayerAsk();
        footer.appendChild(askBtn);
    }

    gameBoard.appendChild(footer);
    this.updateStats();
  }
  
  createOpponentUI(player, index, isMobile) {
    const box = document.createElement('div');
    const isActive = this.state.currentPlayerIndex === index;
    const isSelected = this.state.selectedOpponent === index;

    box.style.padding = '10px';
    box.style.borderRadius = '10px';
    box.style.background = isActive ? 'rgba(0, 255, 204, 0.3)' : 'rgba(255, 255, 255, 0.1)';
    box.style.border = isSelected ? '3px solid #ffd700' : (isActive ? '3px solid #00ffcc' : '1px solid #666');
    box.style.minWidth = isMobile ? '100px' : '140px';
    box.style.textAlign = 'center';
    box.style.cursor = 'pointer';

    box.innerHTML = `
        <div style="color:#fff; font-weight:bold; font-size:0.9rem">${player.name}</div>
        <div style="color:#00ffcc; font-size:0.8rem">Cards: ${player.hand.length} | Sets: ${player.sets}</div>
    `;

    box.onclick = () => {
        if (this.state.currentPlayerIndex !== 0 || this.state.turnInProgress) return;
        this.state.selectedOpponent = index;
        this.render();
    };

    return box;
  }

  executePlayerAsk() {
    if (!this.state.selectedRank || this.state.selectedOpponent === null || this.state.turnInProgress) return;
    
    this.state.turnInProgress = true;
    const asker = this.state.players[0];
    const target = this.state.players[this.state.selectedOpponent];
    const rank = this.state.selectedRank;

    const matches = target.hand.filter(c => c.rank === rank);
    
    if (matches.length > 0) {
        this.state.message = `Success! ${target.name} gave you ${matches.length} ${rank}${matches.length > 1 ? 's' : ''}!`;
        target.hand = target.hand.filter(c => c.rank !== rank);
        asker.hand.push(...matches);
        this.checkAndRemoveSets(asker);
        this.state.turnInProgress = false;
        this.state.selectedRank = null; 
        // Keep selectedOpponent for convenience or clear it
        setTimeout(() => {
            if (!this.checkGameEnd()) this.render();
        }, 1500);
    } else {
        this.state.message = `${target.name} says: "GO FISH!"`;
        this.render();
        setTimeout(() => {
            this.goFish(asker, rank);
        }, 1200);
    }
  }

  goFish(player, askedRank) {
    if (this.state.drawPile.length > 0) {
        const drawn = this.state.drawPile.pop();
        player.hand.push(drawn);
        this.checkAndRemoveSets(player);
        
        if (drawn.rank === askedRank) {
            this.state.message = `You fished a ${drawn.rank}! You get to go again!`;
            this.state.turnInProgress = false;
            this.state.selectedRank = null;
            setTimeout(() => { if (!this.checkGameEnd()) this.render(); }, 1500);
        } else {
            this.state.message = `You caught a ${drawn.rank}. Turn over.`;
            this.render();
            setTimeout(() => this.nextTurn(), 1500);
        }
    } else {
        this.state.message = "The pond is empty! Turn passes.";
        this.render();
        setTimeout(() => this.nextTurn(), 1500);
    }
  }

  executeCPUTurn() {
    if (this.state.gameWon) return;
    const cpu = this.state.players[this.state.currentPlayerIndex];
    
    if (cpu.hand.length === 0) {
        this.nextTurn();
        return;
    }

    const targetIdx = this.chooseCPUTarget();
    const target = this.state.players[targetIdx];
    const rank = cpu.hand[Math.floor(Math.random() * cpu.hand.length)].rank;

    this.state.message = `${cpu.name} asks ${target.name} for ${rank}s...`;
    this.render();

    setTimeout(() => {
        const matches = target.hand.filter(c => c.rank === rank);
        if (matches.length > 0) {
            this.state.message = `${cpu.name} got ${matches.length} ${rank}s from ${target.name}!`;
            target.hand = target.hand.filter(c => c.rank !== rank);
            cpu.hand.push(...matches);
            this.checkAndRemoveSets(cpu);
            this.render();
            setTimeout(() => {
                if (!this.checkGameEnd()) this.executeCPUTurn();
            }, 1500);
        } else {
            this.state.message = `${target.name} says: "GO FISH!"`;
            this.render();
            setTimeout(() => {
                if (this.state.drawPile.length > 0) {
                    const drawn = this.state.drawPile.pop();
                    cpu.hand.push(drawn);
                    this.checkAndRemoveSets(cpu);
                    if (drawn.rank === rank) {
                        this.state.message = `${cpu.name} fished the ${rank}! They go again.`;
                        this.render();
                        setTimeout(() => this.executeCPUTurn(), 1500);
                    } else {
                        this.nextTurn();
                    }
                } else {
                    this.nextTurn();
                }
            }, 1200);
        }
    }, 1500);
  }

  chooseCPUTarget() {
    let idx;
    do {
        idx = Math.floor(Math.random() * this.state.players.length);
    } while (idx === this.state.currentPlayerIndex || this.state.players[idx].hand.length === 0);
    return idx;
  }
  
  nextTurn() {
    this.state.selectedRank = null;
    this.state.selectedOpponent = null;
    this.state.turnInProgress = false;
    
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    
    if (this.checkGameEnd()) return;

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    this.state.message = `${currentPlayer.name}'s turn`;
    this.render();
    
    if (!currentPlayer.isHuman) {
      setTimeout(() => this.executeCPUTurn(), 1000);
    }
  }
  
  checkGameEnd() {
    const allSetsCollected = this.state.sets.length === 13;
    const allHandsEmpty = this.state.players.every(p => p.hand.length === 0) && this.state.drawPile.length === 0;

    if (allSetsCollected || allHandsEmpty) {
      this.state.gameWon = true;
      const maxSets = Math.max(...this.state.players.map(p => p.sets));
      const winners = this.state.players.filter(p => p.sets === maxSets);
      
      this.state.message = winners.length === 1 
        ? `🏆 ${winners[0].name} wins with ${maxSets} sets! 🏆`
        : `🤝 Tie Game! ${winners.map(w => w.name).join(' & ')} win!`;
      
      this.render();
      this.engine.celebrateWin();
      return true;
    }
    return false;
  }

  updateStats() {
    document.getElementById('game-score').textContent = `Sets: ${this.state.sets.length}/13`;
    document.getElementById('game-moves').textContent = `Pond: ${this.state.drawPile.length}`;
  }
  
  cleanup() {
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }
}

window.GameModules = window.GameModules || {};
window.GameModules['multiplayer-go-fish-v1'] = GoFish;
