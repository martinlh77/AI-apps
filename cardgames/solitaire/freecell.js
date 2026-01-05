/**
 * FreeCell Solitaire v1.0
 * Features: Drag & Drop, Double-Click Auto-Move, Pinch-to-Zoom, Two-Finger Pan
 * FIXED: Proper card overlap to show BOTH rank and suit (which are stacked vertically)
 */

class FreeCellSolitaire {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      freeCells: [null, null, null, null],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], [], []],
      moves: 0,
      score: 0,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      isDragging: false,
      dragData: null,
      dragElement: null,
      originalElement: null,
      dragOffsetX: 0,
      dragOffsetY: 0,
      isPanning: false,
      lastTouchDistance: 0,
      lastPanX: 0,
      lastPanY: 0
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
    this.state.zoom = 1.0;
    this.state.panX = 0;
    this.state.panY = 0;
    this.state.freeCells = [null, null, null, null];
    this.state.foundations = [[], [], [], []];
    this.state.tableau = [[], [], [], [], [], [], [], []];

    const cards = this.engine.shuffleDeck(this.engine.createCardArray(this.deck));
    
    // Deal cards: first 4 columns get 7 cards, last 4 get 6 cards
    let cardIdx = 0;
    for (let col = 0; col < 8; col++) {
      const numCards = col < 4 ? 7 : 6;
      for (let i = 0; i < numCards; i++) {
        const card = cards[cardIdx++];
        card.faceUp = true;
        this.state.tableau[col].push(card);
      }
    }

    this.setupUI();
    this.attachGlobalEvents();
    this.attachTouchGestures();

    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);

    this.render();
    this.updateStats();
  }

  setupUI() {
    const board = document.getElementById('game-board');
    board.style.touchAction = 'none';
    
    if (!document.getElementById('freecell-ctrl')) {
      const ctrl = document.createElement('div');
      ctrl.id = 'freecell-ctrl';
      ctrl.style.cssText = 'display:flex; gap:10px; justify-content:center; margin-bottom:10px; z-index:1000; position:relative;';
      ctrl.innerHTML = `
        <button id="reset-view" style="padding:8px 15px; background:#00ffcc; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Reset View</button>
        <button id="auto-move" style="padding:8px 15px; background:#ffd700; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Auto-Move</button>
      `;
      board.parentElement.insertBefore(ctrl, board);
      
      document.getElementById('reset-view').onclick = () => {
        this.state.zoom = 1;
        this.state.panX = 0;
        this.state.panY = 0;
        this.render();
      };
      
      document.getElementById('auto-move').onclick = () => this.autoMoveToFoundations();
    }
  }

  attachGlobalEvents() {
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  attachTouchGestures() {
    const board = document.getElementById('game-board');
    
    board.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.state.isPanning = true;
        this.state.lastTouchDistance = this.getTouchDistance(e.touches);
        this.state.lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        this.state.lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: false });

    board.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        
        const currentDistance = this.getTouchDistance(e.touches);
        const currentPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        // Pinch to zoom
        if (this.state.lastTouchDistance > 0) {
          const zoomDelta = currentDistance / this.state.lastTouchDistance;
          this.state.zoom = Math.max(0.5, Math.min(3, this.state.zoom * zoomDelta));
        }
        
        // Two-finger pan
        const deltaX = currentPanX - this.state.lastPanX;
        const deltaY = currentPanY - this.state.lastPanY;
        this.state.panX += deltaX;
        this.state.panY += deltaY;
        
        this.state.lastTouchDistance = currentDistance;
        this.state.lastPanX = currentPanX;
        this.state.lastPanY = currentPanY;
        
        this.render();
      }
    }, { passive: false });

    board.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
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

  handlePointerDown(e, type, index, cardIndex = null) {
    if (this.state.isPanning) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    e.preventDefault();
    e.stopPropagation();

    let card = null;
    let cardsToMove = [];

    if (type === 'freeCell') {
      card = this.state.freeCells[index];
      if (card) cardsToMove = [card];
    } else if (type === 'foundation') {
      const pile = this.state.foundations[index];
      if (pile.length > 0) {
        card = pile[pile.length - 1];
        cardsToMove = [card];
      }
    } else if (type === 'tableau') {
      const column = this.state.tableau[index];
      if (cardIndex !== null && cardIndex < column.length) {
        cardsToMove = column.slice(cardIndex);
        card = cardsToMove[0];
      }
    }

    if (!card) return;

    // Check if we can move multiple cards
    if (cardsToMove.length > 1) {
      const maxMovable = this.getMaxMovableCards();
      if (cardsToMove.length > maxMovable) {
        return; // Can't move this many cards
      }
      
      // Verify sequence is valid
      if (!this.isValidSequence(cardsToMove)) {
        return;
      }
    }

    this.state.isDragging = true;
    this.state.dragData = { type, index, cardIndex, cardsToMove };
    this.state.originalElement = e.currentTarget;

    const rect = e.currentTarget.getBoundingClientRect();
    this.state.dragOffsetX = e.clientX - rect.left;
    this.state.dragOffsetY = e.clientY - rect.top;

    const isMobile = window.innerWidth < 700;
    const cardSize = isMobile ? { w: 50, h: 70 } : { w: 100, h: 140 };
    // FIXED: Show ~40% of card (rank + suit below it)
    // Mobile: 70px * 0.6 = 42px overlap, 28px visible (40%)
    // Desktop: 140px * 0.6 = 84px overlap, 56px visible (40%)
    const overlap = isMobile ? 42 : 84;

    const container = document.createElement('div');
    container.id = 'drag-proxy';
    container.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; pointer-events:none; z-index:10000;`;

    cardsToMove.forEach((cardData, idx) => {
      const cardEl = this.createCardElement(cardData, cardSize);
      cardEl.style.position = 'absolute';
      cardEl.style.top = `${idx * overlap}px`;
      cardEl.style.left = '0px';
      container.appendChild(cardEl);
    });

    document.body.appendChild(container);
    this.state.dragElement = container;
    e.currentTarget.style.opacity = '0.3';
  }

  handlePointerMove(e) {
    if (this.state.isDragging && this.state.dragElement) {
      const x = e.clientX - this.state.dragOffsetX;
      const y = e.clientY - this.state.dragOffsetY;
      this.state.dragElement.style.left = `${x}px`;
      this.state.dragElement.style.top = `${y}px`;
    }
  }

  handlePointerUp(e) {
    if (!this.state.isDragging) return;

    const dragEl = this.state.dragElement;
    this.state.isDragging = false;
    this.state.dragElement = null;

    if (dragEl) dragEl.remove();

    const targets = document.elementsFromPoint(e.clientX, e.clientY);
    let dropZone = targets.find(t => t.dataset.zoneType);

    let moved = false;
    if (dropZone) {
      const zoneType = dropZone.dataset.zoneType;
      const zoneIdx = parseInt(dropZone.dataset.zoneIdx);

      if (zoneType === 'freeCell') {
        moved = this.moveToFreeCell(zoneIdx);
      } else if (zoneType === 'foundation') {
        moved = this.moveToFoundation(zoneIdx);
      } else if (zoneType === 'tableau') {
        moved = this.moveToTableau(zoneIdx);
      }
    }

    this.state.originalElement = null;
    this.render();
  }

  handleDblClick(type, index, cardIndex = null) {
    // Try to auto-move to foundations first
    const { cardsToMove } = this.getDragInfo(type, index, cardIndex);
    if (cardsToMove.length !== 1) return;

    const card = cardsToMove[0];

    // Try foundations
    for (let i = 0; i < 4; i++) {
      if (this.isValidFoundationMove(card, i)) {
        this.state.dragData = { type, index, cardIndex, cardsToMove };
        if (this.moveToFoundation(i)) return;
      }
    }

    // Try free cells
    for (let i = 0; i < 4; i++) {
      if (this.state.freeCells[i] === null) {
        this.state.dragData = { type, index, cardIndex, cardsToMove };
        if (this.moveToFreeCell(i)) return;
      }
    }
  }

  getDragInfo(type, index, cardIndex) {
    let cardsToMove = [];
    if (type === 'freeCell' && this.state.freeCells[index]) {
      cardsToMove = [this.state.freeCells[index]];
    } else if (type === 'foundation') {
      const pile = this.state.foundations[index];
      if (pile.length > 0) cardsToMove = [pile[pile.length - 1]];
    } else if (type === 'tableau') {
      cardsToMove = this.state.tableau[index].slice(cardIndex);
    }
    return { type, index, cardIndex, cardsToMove };
  }

  getMaxMovableCards() {
    const emptyFreeCells = this.state.freeCells.filter(c => c === null).length;
    const emptyColumns = this.state.tableau.filter(col => col.length === 0).length;
    return (emptyFreeCells + 1) * Math.pow(2, emptyColumns);
  }

  isValidSequence(cards) {
    for (let i = 0; i < cards.length - 1; i++) {
      const current = cards[i];
      const next = cards[i + 1];
      if (current.color === next.color) return false;
      if (this.cardValues[current.rank] !== this.cardValues[next.rank] + 1) return false;
    }
    return true;
  }

  isValidFoundationMove(card, foundIdx) {
    const foundation = this.state.foundations[foundIdx];
    if (foundation.length === 0) {
      return this.cardValues[card.rank] === 1;
    }
    const topCard = foundation[foundation.length - 1];
    return card.suit === topCard.suit && 
           this.cardValues[card.rank] === this.cardValues[topCard.rank] + 1;
  }

  isValidTableauMove(cards, destIdx) {
    const destCol = this.state.tableau[destIdx];
    const movingCard = cards[0];

    if (destCol.length === 0) return true;

    const destCard = destCol[destCol.length - 1];
    const colorDifferent = movingCard.color !== destCard.color;
    const valueCorrect = this.cardValues[movingCard.rank] === this.cardValues[destCard.rank] - 1;

    return colorDifferent && valueCorrect;
  }

  moveToFreeCell(cellIdx) {
    const { type, index, cardsToMove } = this.state.dragData;
    if (cardsToMove.length !== 1) return false;
    if (this.state.freeCells[cellIdx] !== null) return false;

    const card = cardsToMove[0];

    if (type === 'freeCell') {
      this.state.freeCells[index] = null;
    } else if (type === 'foundation') {
      this.state.foundations[index].pop();
    } else if (type === 'tableau') {
      this.state.tableau[index].pop();
    }

    this.state.freeCells[cellIdx] = card;
    this.state.moves++;
    this.updateStats();
    return true;
  }

  moveToFoundation(foundIdx) {
    const { type, index, cardsToMove } = this.state.dragData;
    if (cardsToMove.length !== 1) return false;

    const card = cardsToMove[0];
    if (!this.isValidFoundationMove(card, foundIdx)) return false;

    if (type === 'freeCell') {
      this.state.freeCells[index] = null;
    } else if (type === 'foundation') {
      this.state.foundations[index].pop();
    } else if (type === 'tableau') {
      this.state.tableau[index].pop();
    }

    this.state.foundations[foundIdx].push(card);
    this.state.moves++;
    this.state.score += 10;
    this.updateStats();
    this.checkWin();
    return true;
  }

  moveToTableau(destIdx) {
    const { type, index, cardsToMove } = this.state.dragData;
    if (!this.isValidTableauMove(cardsToMove, destIdx)) return false;

    if (type === 'freeCell') {
      this.state.freeCells[index] = null;
    } else if (type === 'foundation') {
      this.state.foundations[index].pop();
    } else if (type === 'tableau') {
      this.state.tableau[index].splice(this.state.dragData.cardIndex);
    }

    this.state.tableau[destIdx].push(...cardsToMove);
    this.state.moves++;
    this.updateStats();
    return true;
  }

  autoMoveToFoundations() {
    let moved = false;
    do {
      moved = false;
      
      // Check free cells
      for (let i = 0; i < 4; i++) {
        const card = this.state.freeCells[i];
        if (card) {
          for (let f = 0; f < 4; f++) {
            if (this.isValidFoundationMove(card, f)) {
              this.state.dragData = { 
                type: 'freeCell', 
                index: i, 
                cardsToMove: [card] 
              };
              if (this.moveToFoundation(f)) {
                moved = true;
                break;
              }
            }
          }
        }
      }
      
      // Check tableau
      for (let i = 0; i < 8; i++) {
        const col = this.state.tableau[i];
        if (col.length > 0) {
          const card = col[col.length - 1];
          for (let f = 0; f < 4; f++) {
            if (this.isValidFoundationMove(card, f)) {
              this.state.dragData = { 
                type: 'tableau', 
                index: i, 
                cardIndex: col.length - 1,
                cardsToMove: [card] 
              };
              if (this.moveToFoundation(f)) {
                moved = true;
                break;
              }
            }
          }
        }
      }
    } while (moved);
    
    this.render();
  }

  checkWin() {
    const allInFoundations = this.state.foundations.every(f => f.length === 13);
    if (allInFoundations) {
      setTimeout(() => {
        this.engine.celebrateWin();
        alert('🎉 You won FreeCell! Moves: ' + this.state.moves);
      }, 100);
    }
  }

  updateStats() {
    const movesEl = document.getElementById('game-moves');
    const scoreEl = document.getElementById('game-score');
    if (movesEl) movesEl.textContent = `Moves: ${this.state.moves}`;
    if (scoreEl) scoreEl.textContent = `Score: ${this.state.score}`;
  }

  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      width:100%; 
      height:100%; 
      transform: translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom}); 
      transform-origin: center center;
      transition: ${this.state.isDragging ? 'none' : 'transform 0.1s ease-out'};
    `;
    gameBoard.appendChild(wrapper);

    const isMobile = window.innerWidth < 700;
    const cardSize = isMobile ? { w: 50, h: 70 } : { w: 100, h: 140 };
    const gap = isMobile ? 5 : 15;
    // FIXED: Show ~40% of card (rank + suit stacked vertically)
    // Mobile: 42px overlap leaves 28px visible (40% of 70px)
    // Desktop: 84px overlap leaves 56px visible (40% of 140px)
    const overlap = isMobile ? 42 : 84;

    const content = document.createElement('div');
    content.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:100%; padding:20px 10px;';
    wrapper.appendChild(content);

    // Calculate total width for proper alignment
    const totalTableauWidth = (cardSize.w * 8) + (gap * 7);

    // Top row: Free Cells and Foundations
    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display:flex; 
      justify-content:space-between; 
      width:${totalTableauWidth}px; 
      margin-bottom:${gap * 2}px;
    `;

    // Free Cells
    const freeCellsContainer = document.createElement('div');
    freeCellsContainer.style.display = 'flex';
    freeCellsContainer.style.gap = `${gap}px`;
    for (let i = 0; i < 4; i++) {
      const slot = this.createSlot(cardSize, 'freeCell', i);
      const card = this.state.freeCells[i];
      if (card) {
        const cardEl = this.createCardElement(card, cardSize);
        cardEl.style.cursor = 'grab';
        cardEl.onpointerdown = (e) => this.handlePointerDown(e, 'freeCell', i);
        cardEl.ondblclick = () => this.handleDblClick('freeCell', i);
        slot.appendChild(cardEl);
      }
      freeCellsContainer.appendChild(slot);
    }
    topRow.appendChild(freeCellsContainer);

    // Foundations
    const foundationsContainer = document.createElement('div');
    foundationsContainer.style.display = 'flex';
    foundationsContainer.style.gap = `${gap}px`;
    for (let i = 0; i < 4; i++) {
      const slot = this.createSlot(cardSize, 'foundation', i);
      const pile = this.state.foundations[i];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        const cardEl = this.createCardElement(topCard, cardSize);
        cardEl.style.cursor = 'grab';
        cardEl.onpointerdown = (e) => this.handlePointerDown(e, 'foundation', i);
        cardEl.ondblclick = () => this.handleDblClick('foundation', i);
        slot.appendChild(cardEl);
      }
      foundationsContainer.appendChild(slot);
    }
    topRow.appendChild(foundationsContainer);
    content.appendChild(topRow);

    // Tableau - now perfectly aligned
    const tableau = document.createElement('div');
    tableau.style.cssText = `
      display:flex; 
      gap:${gap}px; 
      justify-content:flex-start;
      width:${totalTableauWidth}px;
    `;

    for (let i = 0; i < 8; i++) {
      const col = document.createElement('div');
      col.style.cssText = `position:relative; width:${cardSize.w}px; min-height:${cardSize.h * 2}px;`;

      if (this.state.tableau[i].length === 0) {
        const emptySlot = this.createSlot(cardSize, 'tableau', i);
        col.appendChild(emptySlot);
      } else {
        this.state.tableau[i].forEach((card, idx) => {
          const cardEl = this.createCardElement(card, cardSize);
          cardEl.style.position = 'absolute';
          cardEl.style.top = `${idx * overlap}px`;
          cardEl.style.left = '0px';
          cardEl.style.cursor = 'grab';
          cardEl.dataset.zoneType = 'tableau';
          cardEl.dataset.zoneIdx = i;
          cardEl.onpointerdown = (e) => this.handlePointerDown(e, 'tableau', i, idx);
          cardEl.ondblclick = () => this.handleDblClick('tableau', i, idx);
          col.appendChild(cardEl);
        });
      }

      tableau.appendChild(col);
    }
    content.appendChild(tableau);
  }

  createSlot(size, zoneType, zoneIdx) {
    const slot = document.createElement('div');
    slot.style.cssText = `
      width:${size.w}px; 
      height:${size.h}px; 
      border:2px dashed rgba(255,255,255,0.3); 
      border-radius:8px; 
      position:relative;
      background:rgba(0,0,0,0.2);
    `;
    slot.dataset.zoneType = zoneType;
    slot.dataset.zoneIdx = zoneIdx;
    return slot;
  }

  createCardElement(card, size) {
    const cardEl = this.engine.renderCard(card, true);
    cardEl.style.width = `${size.w}px`;
    cardEl.style.height = `${size.h}px`;

    const isMobile = window.innerWidth < 700;
    if (isMobile) {
      cardEl.style.fontSize = '0.55rem';

      cardEl.querySelectorAll('.rank').forEach(el => {
        el.style.fontSize = '0.7rem';
      });

      cardEl.querySelectorAll('.mini-pip').forEach(el => {
        el.style.fontSize = '0.55rem';
      });

      cardEl.querySelectorAll('.pip').forEach(pip => {
        pip.style.fontSize = pip.classList.contains('large') ? '1.3rem' : '0.7rem';
      });
    }

    return cardEl;
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
window.GameModules['solitaire-freecell-v1'] = FreeCellSolitaire;
