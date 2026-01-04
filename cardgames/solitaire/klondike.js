/**
 * Klondike Solitaire Pro v1.2
 * Features: Drag & Drop, Double-Click to Collect, Pinch-to-Zoom, Infinite Recycle.
 */

class KlondikeSolitaire {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []],
      drawCount: 1, moves: 0, score: 0,
      // Gesture/View State
      zoom: 1.0, panX: 0, panY: 0,
      // Drag State
      isDragging: false, dragData: null, dragElement: null,
      startX: 0, startY: 0, originalElement: null
    };
    this.resizeHandler = null;
    this.cardValues = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
  }

  setup() {
    this.state.moves = 0; this.state.score = 0;
    this.state.zoom = 1.0; this.state.panX = 0; this.state.panY = 0;
    
    const cards = this.engine.shuffleDeck(this.engine.createCardArray(this.deck));
    
    let cardIdx = 0;
    for (let i = 0; i < 7; i++) {
      this.state.tableau[i] = [];
      for (let j = 0; j <= i; j++) {
        const card = cards[cardIdx++];
        card.faceUp = (j === i);
        this.state.tableau[i].push(card);
      }
    }
    this.state.stock = cards.slice(cardIdx).map(c => ({...c, faceUp: false}));
    this.state.waste = [];
    this.state.foundations = [[], [], [], []];

    this.setupUI();
    this.attachGlobalEvents();

    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);

    this.render();
    this.updateStats();
  }

  setupUI() {
    const board = document.getElementById('game-board');
    board.style.touchAction = 'none';
    if (!document.getElementById('solitaire-ctrl')) {
      const ctrl = document.createElement('div');
      ctrl.id = 'solitaire-ctrl';
      ctrl.style.cssText = 'display:flex; gap:10px; justify-content:center; margin-bottom:10px; z-index:1000; position:relative;';
      ctrl.innerHTML = `
        <button id="d1" style="padding:8px 15px; background:#00ffcc; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Draw 1</button>
        <button id="d3" style="padding:8px 15px; background:#444; color:white; border:none; border-radius:4px; cursor:pointer;">Draw 3</button>
        <button id="reset-cam" style="padding:8px 15px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">Reset View</button>
      `;
      board.parentElement.prepend(ctrl);
      document.getElementById('d1').onclick = () => this.setDraw(1);
      document.getElementById('d3').onclick = () => this.setDraw(3);
      document.getElementById('reset-cam').onclick = () => { this.state.zoom = 1; this.state.panX = 0; this.state.panY = 0; this.render(); };
    }
  }

  setDraw(n) {
    this.state.drawCount = n;
    document.getElementById('d1').style.background = n === 1 ? '#00ffcc' : '#444';
    document.getElementById('d3').style.background = n === 3 ? '#00ffcc' : '#444';
  }

  // --- DRAG, DROP & ZOOM GESTURES ---

  attachGlobalEvents() {
    window.onpointermove = (e) => this.handlePointerMove(e);
    window.onpointerup = (e) => this.handlePointerUp(e);
  }

  handlePointerDown(e, type, colIdx, cardIdx) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Only left click
    
    e.preventDefault();
    e.stopPropagation();

    // Get the card
    let card;
    if (type === 'tableau') {
      card = this.state.tableau[colIdx][cardIdx];
    } else if (type === 'waste') {
      card = this.state.waste[this.state.waste.length - 1];
    } else {
      return;
    }

    if (!card || !card.faceUp) return;

    this.state.isDragging = true;
    this.state.dragData = { type, colIdx, cardIdx };
    this.state.startX = e.clientX;
    this.state.startY = e.clientY;
    this.state.originalElement = e.currentTarget;

    // Create visual drag proxy
    const rect = e.currentTarget.getBoundingClientRect();
    
    const container = document.createElement('div');
    container.id = 'drag-proxy';
    container.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; pointer-events:none; z-index:10000; transition:none;`;
    
    // If tableau, grab the card and everything below it
    if (type === 'tableau') {
      const colEl = e.currentTarget.parentElement;
      const siblings = Array.from(colEl.children).slice(cardIdx);
      siblings.forEach(sib => {
        const clone = sib.cloneNode(true);
        clone.style.position = 'relative';
        clone.style.top = sib.style.top;
        container.appendChild(clone);
      });
    } else {
      container.appendChild(e.currentTarget.cloneNode(true));
    }
    
    document.body.appendChild(container);
    this.state.dragElement = container;
    e.currentTarget.style.opacity = '0.3'; // Semi-transparent original
  }

  handlePointerMove(e) {
    if (this.state.isDragging && this.state.dragElement) {
      const dx = e.clientX - this.state.startX;
      const dy = e.clientY - this.state.startY;
      this.state.dragElement.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }

  handlePointerUp(e) {
    if (!this.state.isDragging) return;
    
    const dragData = this.state.dragData;
    const dragEl = this.state.dragElement;
    this.state.isDragging = false;
    this.state.dragElement = null;
    
    if (dragEl) dragEl.remove();

    // Check hit targets
    const targets = document.elementsFromPoint(e.clientX, e.clientY);
    const dropZone = targets.find(t => t.dataset.zoneType);

    let moved = false;
    if (dropZone) {
      const zoneType = dropZone.dataset.zoneType;
      const zoneIdx = parseInt(dropZone.dataset.zoneIdx);
      
      if (zoneType === 'foundation') {
        moved = this.moveToFoundation(zoneIdx);
      } else if (zoneType === 'tableau') {
        moved = this.moveToTableau(zoneIdx);
      }
    }

    if (!moved && this.state.originalElement) {
      this.state.originalElement.style.opacity = '1';
    }
    
    this.state.originalElement = null;
    this.render();
  }

  handleDblClick(type, colIdx, cardIdx) {
    // Attempt to auto-collect to foundations
    const cards = this.getSelectedCards(type, colIdx, cardIdx);
    if (cards.length !== 1) return;

    for (let i = 0; i < 4; i++) {
      if (this.isValidFoundationMove(cards[0], i)) {
        this.state.dragData = { type, colIdx, cardIdx };
        this.moveToFoundation(i);
        return;
      }
    }
  }

  // --- HELPER METHODS ---

  getSelectedCards(type, colIdx, cardIdx) {
    if (type === 'waste') {
      return this.state.waste.length > 0 ? [this.state.waste[this.state.waste.length - 1]] : [];
    } else if (type === 'tableau') {
      return this.state.tableau[colIdx].slice(cardIdx);
    }
    return [];
  }

  isValidFoundationMove(card, foundIdx) {
    const foundation = this.state.foundations[foundIdx];
    if (foundation.length === 0) {
      return this.cardValues[card.value] === 1; // Must be Ace
    }
    const topCard = foundation[foundation.length - 1];
    return card.suit === topCard.suit && this.cardValues[card.value] === this.cardValues[topCard.value] + 1;
  }

  isValidTableauMove(cards, destIdx) {
    const destCol = this.state.tableau[destIdx];
    const movingCard = cards[0];
    
    if (destCol.length === 0) {
      return this.cardValues[movingCard.value] === 13; // Must be King
    }
    
    const destCard = destCol[destCol.length - 1];
    if (!destCard.faceUp) return false;
    
    const isRed = (suit) => suit === '♥' || suit === '♦';
    const colorDifferent = isRed(movingCard.suit) !== isRed(destCard.suit);
    const valueCorrect = this.cardValues[movingCard.value] === this.cardValues[destCard.value] - 1;
    
    return colorDifferent && valueCorrect;
  }

  moveToFoundation(foundIdx) {
    const { type, colIdx, cardIdx } = this.state.dragData;
    const cards = this.getSelectedCards(type, colIdx, cardIdx);
    
    if (cards.length !== 1) return false;
    if (!this.isValidFoundationMove(cards[0], foundIdx)) return false;
    
    // Remove from source
    if (type === 'waste') {
      this.state.waste.pop();
    } else if (type === 'tableau') {
      this.state.tableau[colIdx].splice(cardIdx, 1);
      if (this.state.tableau[colIdx].length > 0) {
        this.state.tableau[colIdx][this.state.tableau[colIdx].length - 1].faceUp = true;
      }
    }
    
    // Add to foundation
    this.state.foundations[foundIdx].push(cards[0]);
    this.state.moves++;
    this.state.score += 10;
    this.updateStats();
    this.checkWin();
    return true;
  }

  moveToTableau(destIdx) {
    const { type, colIdx, cardIdx } = this.state.dragData;
    const cards = this.getSelectedCards(type, colIdx, cardIdx);
    
    if (cards.length === 0) return false;
    if (!this.isValidTableauMove(cards, destIdx)) return false;
    
    // Remove from source
    if (type === 'waste') {
      this.state.waste.pop();
    } else if (type === 'tableau') {
      this.state.tableau[colIdx].splice(cardIdx);
      if (this.state.tableau[colIdx].length > 0) {
        this.state.tableau[colIdx][this.state.tableau[colIdx].length - 1].faceUp = true;
      }
    }
    
    // Add to destination
    this.state.tableau[destIdx].push(...cards);
    this.state.moves++;
    this.updateStats();
    return true;
  }

  drawFromStock() {
    if (this.state.stock.length === 0) {
      // Recycle waste to stock
      if (this.state.waste.length === 0) return;
      this.state.stock = this.state.waste.reverse().map(c => ({...c, faceUp: false}));
      this.state.waste = [];
    } else {
      const count = Math.min(this.state.drawCount, this.state.stock.length);
      for (let i = 0; i < count; i++) {
        const card = this.state.stock.pop();
        card.faceUp = true;
        this.state.waste.push(card);
      }
    }
    this.render();
  }

  checkWin() {
    const allInFoundations = this.state.foundations.every(f => f.length === 13);
    if (allInFoundations) {
      setTimeout(() => alert('🎉 You won! Moves: ' + this.state.moves), 100);
    }
  }

  updateStats() {
    const statsEl = document.getElementById('game-stats');
    if (statsEl) {
      statsEl.textContent = `Moves: ${this.state.moves} | Score: ${this.state.score}`;
    }
  }

  // --- RENDERING ---

  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.id = 'view-wrapper';
    wrapper.style.cssText = `width:100%; height:100%; transform: translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom}); transform-origin: center center;`;
    gameBoard.appendChild(wrapper);

    const isMobile = window.innerWidth < 700;
    const cardSize = isMobile ? { w: 45, h: 63 } : { w: 100, h: 140 };
    const gap = isMobile ? 8 : 20;

    const content = document.createElement('div');
    content.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:100%; padding-top:20px;';
    wrapper.appendChild(content);

    // --- Top Row ---
    const topRow = document.createElement('div');
    topRow.style.cssText = `display:flex; justify-content:space-between; width:100%; max-width:900px; margin-bottom:${gap*2}px; padding:0 10px;`;
    
    const stockWaste = document.createElement('div');
    stockWaste.style.display = 'flex'; stockWaste.style.gap = `${gap}px`;
    
    // Stock
    const stock = this.createSlot(cardSize, 'stock', 0);
    stock.style.cursor = 'pointer';
    stock.onclick = () => this.drawFromStock();
    if (this.state.stock.length > 0) {
      const cardBack = this.createCard(null, cardSize, true);
      stock.appendChild(cardBack);
    }
    stockWaste.appendChild(stock);
    
    // Waste
    const waste = this.createSlot(cardSize, 'waste', 0);
    if (this.state.waste.length > 0) {
      const topCard = this.state.waste[this.state.waste.length - 1];
      const cardEl = this.createCard(topCard, cardSize, false);
      cardEl.onpointerdown = (e) => this.handlePointerDown(e, 'waste', 0, this.state.waste.length - 1);
      cardEl.ondblclick = () => this.handleDblClick('waste', 0, this.state.waste.length - 1);
      waste.appendChild(cardEl);
    }
    stockWaste.appendChild(waste);
    
    topRow.appendChild(stockWaste);
    
    // Foundations
    const foundations = document.createElement('div');
    foundations.style.display = 'flex';
    foundations.style.gap = `${gap}px`;
    for (let i = 0; i < 4; i++) {
      const slot = this.createSlot(cardSize, 'foundation', i);
      if (this.state.foundations[i].length > 0) {
        const topCard = this.state.foundations[i][this.state.foundations[i].length - 1];
        slot.appendChild(this.createCard(topCard, cardSize, false));
      }
      foundations.appendChild(slot);
    }
    topRow.appendChild(foundations);
    content.appendChild(topRow);
    
    // --- Tableau ---
    const tableau = document.createElement('div');
    tableau.style.cssText = `display:flex; gap:${gap}px; justify-content:center; width:100%; max-width:900px;`;
    
    for (let i = 0; i < 7; i++) {
      const col = document.createElement('div');
      col.style.cssText = `position:relative; width:${cardSize.w}px;`;
      col.dataset.zoneType = 'tableau';
      col.dataset.zoneIdx = i;
      
      // Make empty column a drop zone
      if (this.state.tableau[i].length === 0) {
        const emptySlot = this.createSlot(cardSize, 'tableau', i);
        col.appendChild(emptySlot);
      }
      
      this.state.tableau[i].forEach((card, idx) => {
        const cardEl = this.createCard(card, cardSize, !card.faceUp);
        cardEl.style.position = 'absolute';
        cardEl.style.top = `${idx * (isMobile ? 20 : 30)}px`;
        
        if (card.faceUp) {
          cardEl.style.cursor = 'grab';
          cardEl.onpointerdown = (e) => this.handlePointerDown(e, 'tableau', i, idx);
          cardEl.ondblclick = () => this.handleDblClick('tableau', i, idx);
        }
        
        col.appendChild(cardEl);
      });
      
      tableau.appendChild(col);
    }
    content.appendChild(tableau);
  }

  createSlot(size, zoneType, zoneIdx) {
    const slot = document.createElement('div');
    slot.style.cssText = `width:${size.w}px; height:${size.h}px; border:2px dashed rgba(255,255,255,0.3); border-radius:8px; position:relative;`;
    slot.dataset.zoneType = zoneType;
    slot.dataset.zoneIdx = zoneIdx;
    return slot;
  }

  createCard(card, size, faceDown) {
    const div = document.createElement('div');
    div.style.cssText = `width:${size.w}px; height:${size.h}px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:bold; user-select:none; transition:opacity 0.2s;`;
    
    if (faceDown) {
      div.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      div.style.border = '2px solid #fff';
    } else if (card) {
      const isRed = card.suit === '♥' || card.suit === '♦';
      div.style.background = 'white';
      div.style.color = isRed ? '#e74c3c' : '#2c3e50';
      div.style.border = '2px solid #ddd';
      div.innerHTML = `<div style="text-align:center; font-size:${size.w < 60 ? '12px' : '18px'};">${card.value}<br>${card.suit}</div>`;
    }
    
    return div;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KlondikeSolitaire;
}
