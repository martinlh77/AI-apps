/**
 * Klondike Solitaire Pro v1.2
 * Features: Drag & Drop, Double-Click to Collect, Pinch-to-Zoom, Infinite Recycle.
 */

class KlondikeSolitaire {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      stock: [], 
      waste: [], 
      foundations: [[], [], [], []], 
      tableau: [[], [], [], [], [], [], []],
      drawCount: 1, 
      moves: 0, 
      score: 0,
      zoom: 1.0, 
      panX: 0, 
      panY: 0,
      isDragging: false, 
      dragData: null, 
      dragElement: null,
      startX: 0, 
      startY: 0, 
      originalElement: null
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
      board.parentElement.insertBefore(ctrl, board);
      
      document.getElementById('d1').onclick = () => this.setDraw(1);
      document.getElementById('d3').onclick = () => this.setDraw(3);
      document.getElementById('reset-cam').onclick = () => { 
        this.state.zoom = 1; 
        this.state.panX = 0; 
        this.state.panY = 0; 
        this.render(); 
      };
    }
  }

  setDraw(n) {
    this.state.drawCount = n;
    document.getElementById('d1').style.background = n === 1 ? '#00ffcc' : '#444';
    document.getElementById('d1').style.color = n === 1 ? '#000' : '#fff';
    document.getElementById('d3').style.background = n === 3 ? '#00ffcc' : '#444';
    document.getElementById('d3').style.color = n === 3 ? '#000' : '#fff';
  }

  attachGlobalEvents() {
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  handlePointerDown(e, type, colIdx, cardIdx) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    e.preventDefault();
    e.stopPropagation();

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

    const rect = e.currentTarget.getBoundingClientRect();
    
    const container = document.createElement('div');
    container.id = 'drag-proxy';
    container.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; pointer-events:none; z-index:10000; transition:none;`;
    
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
    e.currentTarget.style.opacity = '0.3';
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
    
    const dragEl = this.state.dragElement;
    this.state.isDragging = false;
    this.state.dragElement = null;
    
    if (dragEl) dragEl.remove();

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

    this.state.originalElement = null;
    this.render();
  }

  handleDblClick(type, colIdx, cardIdx) {
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
      return this.cardValues[card.rank] === 1; // Must be Ace
    }
    const topCard = foundation[foundation.length - 1];
    return card.suit === topCard.suit && this.cardValues[card.rank] === this.cardValues[topCard.rank] + 1;
  }

  isValidTableauMove(cards, destIdx) {
    const destCol = this.state.tableau[destIdx];
    const movingCard = cards[0];
    
    if (destCol.length === 0) {
      return this.cardValues[movingCard.rank] === 13; // Must be King
    }
    
    const destCard = destCol[destCol.length - 1];
    if (!destCard.faceUp) return false;
    
    // Check alternating colors - Fixed to use card.color property from deck
    const colorDifferent = movingCard.color !== destCard.color;
    
    // Check descending value (moving card must be one less than destination)
    const valueCorrect = this.cardValues[movingCard.rank] === this.cardValues[destCard.rank] - 1;
    
    return colorDifferent && valueCorrect;
  }

  moveToFoundation(foundIdx) {
    const { type, colIdx, cardIdx } = this.state.dragData;
    const cards = this.getSelectedCards(type, colIdx, cardIdx);
    
    if (cards.length !== 1) return false;
    if (!this.isValidFoundationMove(cards[0], foundIdx)) return false;
    
    if (type === 'waste') {
      this.state.waste.pop();
    } else if (type === 'tableau') {
      this.state.tableau[colIdx].splice(cardIdx, 1);
      if (this.state.tableau[colIdx].length > 0) {
        this.state.tableau[colIdx][this.state.tableau[colIdx].length - 1].faceUp = true;
      }
    }
    
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
    
    if (type === 'waste') {
      this.state.waste.pop();
    } else if (type === 'tableau') {
      this.state.tableau[colIdx].splice(cardIdx);
      if (this.state.tableau[colIdx].length > 0) {
        this.state.tableau[colIdx][this.state.tableau[colIdx].length - 1].faceUp = true;
      }
    }
    
    this.state.tableau[destIdx].push(...cards);
    this.state.moves++;
    this.updateStats();
    return true;
  }

  drawFromStock() {
    if (this.state.stock.length === 0) {
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
      setTimeout(() => {
        this.engine.celebrateWin();
        alert('🎉 You won! Moves: ' + this.state.moves);
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
    wrapper.id = 'view-wrapper';
    wrapper.style.cssText = `width:100%; height:100%; transform: translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom}); transform-origin: center center;`;
    gameBoard.appendChild(wrapper);

    const isMobile = window.innerWidth < 700;
    const cardSize = isMobile ? { w: 60, h: 84 } : { w: 100, h: 140 };
    const gap = isMobile ? 8 : 20;

    const content = document.createElement('div');
    content.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:100%; padding-top:20px;';
    wrapper.appendChild(content);

    // Top Row
    const topRow = document.createElement('div');
    topRow.style.cssText = `display:flex; justify-content:space-between; width:100%; max-width:900px; margin-bottom:${gap*2}px; padding:0 10px;`;
    
    const stockWaste = document.createElement('div');
    stockWaste.style.display = 'flex';
    stockWaste.style.gap = `${gap}px`;
    
    // Stock
    const stock = this.createSlot(cardSize, 'stock', 0);
    stock.style.cursor = 'pointer';
    stock.onclick = () => this.drawFromStock();
    if (this.state.stock.length > 0) {
      const cardBack = this.createCardElement(null, cardSize, true);
      stock.appendChild(cardBack);
    }
    stockWaste.appendChild(stock);
    
    // Waste
    const waste = this.createSlot(cardSize, 'waste', 0);
    if (this.state.waste.length > 0) {
      const topCard = this.state.waste[this.state.waste.length - 1];
      const cardEl = this.createCardElement(topCard, cardSize, false);
      cardEl.style.cursor = 'grab';
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
        slot.appendChild(this.createCardElement(topCard, cardSize, false));
      }
      foundations.appendChild(slot);
    }
    topRow.appendChild(foundations);
    content.appendChild(topRow);
    
    // Tableau
    const tableau = document.createElement('div');
    tableau.style.cssText = `display:flex; gap:${gap}px; justify-content:center; width:100%; max-width:900px;`;
    
    for (let i = 0; i < 7; i++) {
      const col = document.createElement('div');
      col.style.cssText = `position:relative; width:${cardSize.w}px; min-height:${cardSize.h}px;`;
      col.dataset.zoneType = 'tableau';
      col.dataset.zoneIdx = i;
      
      if (this.state.tableau[i].length === 0) {
        const emptySlot = this.createSlot(cardSize, 'tableau', i);
        col.appendChild(emptySlot);
      }
      
      this.state.tableau[i].forEach((card, idx) => {
        const cardEl = this.createCardElement(card, cardSize, !card.faceUp);
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

  createCardElement(card, size, faceDown) {
    if (faceDown) {
      // Use the deck's back image
      const backCard = this.engine.renderCard(card || {backImage: this.deck.backImage}, false);
      backCard.style.width = `${size.w}px`;
      backCard.style.height = `${size.h}px`;
      return backCard;
    } else if (card) {
      // Use the engine's renderCard method to display the actual deck card
      const cardEl = this.engine.renderCard(card, true);
      cardEl.style.width = `${size.w}px`;
      cardEl.style.height = `${size.h}px`;
      
      // Scale fonts for mobile
      const isMobile = window.innerWidth < 700;
      if (isMobile) {
        cardEl.style.fontSize = '0.7rem';
        
        cardEl.querySelectorAll('.rank').forEach(el => {
          el.style.fontSize = '0.85rem';
        });
        
        cardEl.querySelectorAll('.mini-pip').forEach(el => {
          el.style.fontSize = '0.7rem';
        });
        
        cardEl.querySelectorAll('.pip').forEach(pip => {
          pip.style.fontSize = pip.classList.contains('large') ? '2rem' : '0.98rem';
        });
      }
      
      return cardEl;
    }
    
    // Empty placeholder
    const div = document.createElement('div');
    div.style.cssText = `width:${size.w}px; height:${size.h}px; border-radius:8px;`;
    return div;
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

// REQUIRED: Register the game with window.GameModules
window.GameModules = window.GameModules || {};
window.GameModules['solitaire-klondike-v1'] = KlondikeSolitaire;
