/**
 * Meeting in the Garden
 * A romantic grid-based solitaire where the King and Queen of Hearts
 * must navigate through a garden maze to find each other.
 * Features: Multiple grid sizes, Suitor blocking variant, pinch-to-zoom, two-finger pan
 */

class MeetingInTheGarden {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      grid: [],
      gridSize: 5, // 5x5 or 6x6
      stock: [],
      moves: 0,
      score: 0,
      gameWon: false,
      selectedCard: null,
      kingPos: null,
      queenPos: null,
      suitorRule: false, // Variant option
      zoom: 1.0,
      panX: 0,
      panY: 0,
      isPanning: false,
      isZooming: false,
      lastTouchDistance: 0,
      touchStartX: 0,
      touchStartY: 0,
      initialPanX: 0,
      initialPanY: 0
    };
    this.resizeHandler = null;
    this.cardValues = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
  }

  setup() {
    this.state.moves = 0;
    this.state.score = 0;
    this.state.gameWon = false;
    this.state.selectedCard = null;
    this.state.zoom = 1.0;
    this.state.panX = 0;
    this.state.panY = 0;

    // Create and shuffle deck
    let allCards = this.engine.createCardArray(this.deck);
    allCards = this.engine.shuffleDeck(allCards);

    // Find and remove King and Queen of Hearts
    const kingIndex = allCards.findIndex(c => c.suit === 'hearts' && c.rank === 'K');
    const queenIndex = allCards.findIndex(c => c.suit === 'hearts' && c.rank === 'Q');
    
    const king = allCards.splice(kingIndex, 1)[0];
    const queen = allCards.splice(queenIndex > kingIndex ? queenIndex - 1 : queenIndex, 1)[0];

    // Initialize grid
    const size = this.state.gridSize;
    this.state.grid = Array(size).fill(null).map(() => Array(size).fill(null));

    // Place King top-left, Queen bottom-right
    this.state.grid[0][0] = { ...king, faceUp: true, isKing: true };
    this.state.grid[size - 1][size - 1] = { ...queen, faceUp: true, isQueen: true };
    this.state.kingPos = { row: 0, col: 0 };
    this.state.queenPos = { row: size - 1, col: size - 1 };

    // Fill remaining grid
    let cardIndex = 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (this.state.grid[row][col] === null && cardIndex < allCards.length) {
          this.state.grid[row][col] = { ...allCards[cardIndex], faceUp: true };
          cardIndex++;
        }
      }
    }

    // Remaining cards become stock
    this.state.stock = allCards.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

    this.setupUI();
    this.attachTouchEvents();

    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);

    this.render();
    this.updateStats();
  }

  setupUI() {
    const board = document.getElementById('game-board');
    board.style.touchAction = 'none';

    if (!document.getElementById('garden-ctrl')) {
      const ctrl = document.createElement('div');
      ctrl.id = 'garden-ctrl';
      ctrl.style.cssText = 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:15px; z-index:1000; position:relative;';
      ctrl.innerHTML = `
        <button id="grid-5x5" style="padding:8px 15px; background:#00ffcc; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">5×5 Garden</button>
        <button id="grid-6x6" style="padding:8px 15px; background:#444; color:white; border:none; border-radius:4px; cursor:pointer;">6×6 Garden</button>
        <button id="suitor-toggle" style="padding:8px 15px; background:#444; color:white; border:none; border-radius:4px; cursor:pointer;">Suitor Rule: OFF</button>
        <button id="reset-view" style="padding:8px 15px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">Reset View</button>
        <button id="new-game-btn" style="padding:8px 15px; background:#ffd700; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">New Game</button>
      `;
      board.parentElement.insertBefore(ctrl, board);

      document.getElementById('grid-5x5').onclick = () => this.setGridSize(5);
      document.getElementById('grid-6x6').onclick = () => this.setGridSize(6);
      document.getElementById('suitor-toggle').onclick = () => this.toggleSuitorRule();
      document.getElementById('reset-view').onclick = () => {
        this.state.zoom = 1;
        this.state.panX = 0;
        this.state.panY = 0;
        this.render();
      };
      document.getElementById('new-game-btn').onclick = () => this.setup();
    }
  }

  setGridSize(size) {
    this.state.gridSize = size;
    document.getElementById('grid-5x5').style.background = size === 5 ? '#00ffcc' : '#444';
    document.getElementById('grid-5x5').style.color = size === 5 ? '#000' : '#fff';
    document.getElementById('grid-6x6').style.background = size === 6 ? '#00ffcc' : '#444';
    document.getElementById('grid-6x6').style.color = size === 6 ? '#000' : '#fff';
    this.setup();
  }

  toggleSuitorRule() {
    this.state.suitorRule = !this.state.suitorRule;
    const btn = document.getElementById('suitor-toggle');
    btn.textContent = `Suitor Rule: ${this.state.suitorRule ? 'ON' : 'OFF'}`;
    btn.style.background = this.state.suitorRule ? '#00ffcc' : '#444';
    btn.style.color = this.state.suitorRule ? '#000' : '#fff';
  }

  attachTouchEvents() {
    const board = document.getElementById('game-board');

    board.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.state.isZooming = true;
        this.state.isPanning = true;
        this.state.lastTouchDistance = this.getTouchDistance(e.touches);
        
        const midpoint = this.getTouchMidpoint(e.touches);
        this.state.touchStartX = midpoint.x;
        this.state.touchStartY = midpoint.y;
        this.state.initialPanX = this.state.panX;
        this.state.initialPanY = this.state.panY;
      }
    });

    board.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && (this.state.isZooming || this.state.isPanning)) {
        e.preventDefault();

        // Handle pinch-to-zoom
        const currentDistance = this.getTouchDistance(e.touches);
        if (this.state.isZooming && this.state.lastTouchDistance > 0) {
          const zoomDelta = currentDistance / this.state.lastTouchDistance;
          this.state.zoom = Math.max(0.5, Math.min(3.0, this.state.zoom * zoomDelta));
        }
        this.state.lastTouchDistance = currentDistance;

        // Handle two-finger pan
        const midpoint = this.getTouchMidpoint(e.touches);
        const deltaX = midpoint.x - this.state.touchStartX;
        const deltaY = midpoint.y - this.state.touchStartY;
        
        this.state.panX = this.state.initialPanX + deltaX;
        this.state.panY = this.state.initialPanY + deltaY;

        this.render();
      }
    });

    board.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        this.state.isZooming = false;
        this.state.isPanning = false;
        this.state.lastTouchDistance = 0;
      }
    });
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTouchMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  handleCardClick(row, col) {
    const card = this.state.grid[row][col];
    if (!card) return;

    // Don't allow selecting King or Queen
    if (card.isKing || card.isQueen) return;

    if (this.state.selectedCard === null) {
      // First card selection
      this.state.selectedCard = { row, col };
      this.render();
    } else {
      // Second card selection - try to match
      const first = this.state.selectedCard;
      if (first.row === row && first.col === col) {
        // Deselect same card
        this.state.selectedCard = null;
        this.render();
        return;
      }

      if (this.canMatch(first.row, first.col, row, col)) {
        this.removeCards(first.row, first.col, row, col);
        this.state.selectedCard = null;
        this.state.moves++;
        this.state.score += 10;
        this.updateStats();
        this.fillEmptySpaces();
        this.render();
        
        setTimeout(() => this.checkWin(), 300);
      } else {
        // Invalid match - select new card
        this.state.selectedCard = { row, col };
        this.render();
      }
    }
  }

  canMatch(row1, col1, row2, col2) {
    const card1 = this.state.grid[row1][col1];
    const card2 = this.state.grid[row2][col2];

    if (!card1 || !card2) return false;

    // Must match by suit or rank
    const matchesSuitOrRank = card1.suit === card2.suit || card1.rank === card2.rank;
    if (!matchesSuitOrRank) return false;

    // Check if adjacent (including diagonals)
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    if (rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff) > 0) {
      return true;
    }

    // Check if separated by exactly one card (horizontal, vertical, or diagonal)
    return this.isSeparatedByOne(row1, col1, row2, col2);
  }

  isSeparatedByOne(row1, col1, row2, col2) {
    const rowDiff = row2 - row1;
    const colDiff = col2 - col1;

    // Must be in a line (horizontal, vertical, or diagonal)
    if (rowDiff !== 0 && colDiff !== 0 && Math.abs(rowDiff) !== Math.abs(colDiff)) {
      return false;
    }

    // Check distance is exactly 2
    const distance = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    if (distance !== 2) return false;

    // Find the middle position
    const midRow = row1 + Math.sign(rowDiff);
    const midCol = col1 + Math.sign(colDiff);

    // There must be exactly one card in between
    return this.state.grid[midRow][midCol] !== null;
  }

  removeCards(row1, col1, row2, col2) {
    this.state.grid[row1][col1] = null;
    this.state.grid[row2][col2] = null;
  }

  fillEmptySpaces() {
    if (this.state.stock.length > 0) {
      // Fill from stock
      for (let row = 0; row < this.state.gridSize; row++) {
        for (let col = 0; col < this.state.gridSize; col++) {
          if (this.state.grid[row][col] === null && this.state.stock.length > 0) {
            const card = this.state.stock.pop();
            card.faceUp = true;
            this.state.grid[row][col] = card;
          }
        }
      }
    } else {
      // Stock empty - compress grid toward top-left
      this.compressGrid();
    }
  }

  compressGrid() {
    const size = this.state.gridSize;
    const allCards = [];

    // Collect all non-null cards
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (this.state.grid[row][col] !== null) {
          allCards.push(this.state.grid[row][col]);
        }
      }
    }

    // Clear grid
    this.state.grid = Array(size).fill(null).map(() => Array(size).fill(null));

    // Refill from top-left
    let cardIndex = 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (cardIndex < allCards.length) {
          this.state.grid[row][col] = allCards[cardIndex];
          
          // Update King and Queen positions
          if (allCards[cardIndex].isKing) {
            this.state.kingPos = { row, col };
          }
          if (allCards[cardIndex].isQueen) {
            this.state.queenPos = { row, col };
          }
          
          cardIndex++;
        }
      }
    }
  }

  checkWin() {
    // Count total non-null cards
    let cardCount = 0;
    let hasKing = false;
    let hasQueen = false;

    for (let row = 0; row < this.state.gridSize; row++) {
      for (let col = 0; col < this.state.gridSize; col++) {
        if (this.state.grid[row][col] !== null) {
          cardCount++;
          if (this.state.grid[row][col].isKing) hasKing = true;
          if (this.state.grid[row][col].isQueen) hasQueen = true;
        }
      }
    }

    // Win if only King and Queen remain AND they're adjacent
    if (cardCount === 2 && hasKing && hasQueen) {
      const kingPos = this.state.kingPos;
      const queenPos = this.state.queenPos;
      const rowDiff = Math.abs(kingPos.row - queenPos.row);
      const colDiff = Math.abs(kingPos.col - queenPos.col);

      if (rowDiff <= 1 && colDiff <= 1) {
        // Check Suitor Rule if enabled
        if (this.state.suitorRule && this.hasSuitorBlocking()) {
          return; // Not won yet - suitor blocking
        }

        this.state.gameWon = true;
        setTimeout(() => {
          this.engine.celebrateWin();
          alert(`💕 The King and Queen have met! 💕\nMoves: ${this.state.moves}\nScore: ${this.state.score}`);
        }, 500);
      }
    }
  }

  hasSuitorBlocking() {
    // Check if any other King or Queen is adjacent to our protagonists
    const checkAdjacent = (pos) => {
      const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [dr, dc] of directions) {
        const newRow = pos.row + dr;
        const newCol = pos.col + dc;
        if (newRow >= 0 && newRow < this.state.gridSize && 
            newCol >= 0 && newCol < this.state.gridSize) {
          const card = this.state.grid[newRow][newCol];
          if (card && (card.rank === 'K' || card.rank === 'Q') && 
              !card.isKing && !card.isQueen) {
            return true; // Suitor found
          }
        }
      }
      return false;
    };

    return checkAdjacent(this.state.kingPos) || checkAdjacent(this.state.queenPos);
  }

  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'view-wrapper';
    wrapper.style.cssText = `
      width:100%; 
      height:100%; 
      transform: translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom}); 
      transform-origin: center center;
      transition: transform 0.1s ease-out;
    `;
    gameBoard.appendChild(wrapper);

    const isMobile = window.innerWidth < 700;
    const size = this.state.gridSize;
    const cardSize = isMobile ? { w: 60, h: 84 } : { w: 100, h: 140 };
    const gap = isMobile ? 8 : 15;

    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${size}, ${cardSize.w}px);
      grid-template-rows: repeat(${size}, ${cardSize.h}px);
      gap: ${gap}px;
      justify-content: center;
      padding: 20px;
    `;

    // Render grid
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const card = this.state.grid[row][col];
        const slot = document.createElement('div');
        slot.style.cssText = `
          width: ${cardSize.w}px;
          height: ${cardSize.h}px;
          border: 2px dashed rgba(255,255,255,0.2);
          border-radius: 8px;
          position: relative;
          cursor: pointer;
        `;

        if (card) {
          const cardEl = this.engine.renderCard(card, true);
          cardEl.style.width = `${cardSize.w}px`;
          cardEl.style.height = `${cardSize.h}px`;
          cardEl.style.position = 'absolute';
          cardEl.style.top = '0';
          cardEl.style.left = '0';

          // Highlight King and Queen
          if (card.isKing || card.isQueen) {
            cardEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
            cardEl.style.border = '3px solid gold';
          }

          // Highlight selected card
          if (this.state.selectedCard && 
              this.state.selectedCard.row === row && 
              this.state.selectedCard.col === col) {
            cardEl.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.8)';
            cardEl.style.transform = 'translateY(-10px)';
          }

          // Scale fonts for mobile
          if (isMobile) {
            cardEl.style.fontSize = '0.6rem';
            cardEl.querySelectorAll('.rank').forEach(el => {
              el.style.fontSize = '0.75rem';
            });
            cardEl.querySelectorAll('.mini-pip').forEach(el => {
              el.style.fontSize = '0.6rem';
            });
            cardEl.querySelectorAll('.pip').forEach(pip => {
              pip.style.fontSize = pip.classList.contains('large') ? '1.8rem' : '0.9rem';
            });
          }

          cardEl.onclick = () => this.handleCardClick(row, col);
          slot.appendChild(cardEl);
        }

        container.appendChild(slot);
      }
    }

    wrapper.appendChild(container);

    // Stock pile indicator
    if (this.state.stock.length > 0) {
      const stockInfo = document.createElement('div');
      stockInfo.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-weight: bold;
      `;
      stockInfo.textContent = `Stock: ${this.state.stock.length} cards`;
      wrapper.appendChild(stockInfo);
    }
  }

  updateStats() {
    const movesEl = document.getElementById('game-moves');
    const scoreEl = document.getElementById('game-score');
    if (movesEl) movesEl.textContent = `Moves: ${this.state.moves}`;
    if (scoreEl) scoreEl.textContent = `Score: ${this.state.score}`;
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
window.GameModules['solitaire-meeting-garden-v1'] = MeetingInTheGarden;