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
      startX: 0, startY: 0
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
    board.style.touchAction = 'none'; // Essential for custom gestures
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
    if (e.buttons !== 1) return; // Only left click / single touch
    
    // Prevent dragging facedown cards (unless it's the top one which auto-flips)
    const card = type === 'tableau' ? this.state.tableau[colIdx][cardIdx] : this.state.waste[this.state.waste.length-1];
    if (!card.faceUp) return;

    this.state.isDragging = true;
    this.state.dragData = { type, colIdx, cardIdx };
    this.state.startX = e.clientX;
    this.state.startY = e.clientY;

    // Create visual drag proxy
    const originalEl = e.currentTarget;
    const rect = originalEl.getBoundingClientRect();
    
    const container = document.createElement('div');
    container.id = 'drag-proxy';
    container.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; pointer-events:none; z-index:10000; transition:none;`;
    
    // If tableau, grab the card and everything below it
    if (type === 'tableau') {
      const colEl = originalEl.parentElement;
      const siblings = Array.from(colEl.children).slice(cardIdx);
      siblings.forEach(sib => {
        const clone = sib.cloneNode(true);
        clone.style.position = 'relative';
        clone.style.top = sib.style.top;
        container.appendChild(clone);
      });
    } else {
      container.appendChild(originalEl.cloneNode(true));
    }
    
    document.body.appendChild(container);
    this.state.dragElement = container;
    originalEl.style.opacity = '0'; // Hide original
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

    if (dropZone) {
      const zoneType = dropZone.dataset.zoneType;
      const zoneIdx = parseInt(dropZone.dataset.zoneIdx);
      
      if (zoneType === 'foundation') this.moveFound(zoneIdx);
      else if (zoneType === 'tableau') this.moveTab(zoneIdx);
      else this.render();
    } else {
      this.render(); // Reset positions
    }
  }

  handleDblClick(type, colIdx, cardIdx) {
    // Attempt to auto-collect to foundations
    const cards = this.getSelCards(type, colIdx, cardIdx);
    if (cards.length !== 1) return;

    for (let i = 0; i < 4; i++) {
      if (this.isValidFoundationMove(cards[0], i)) {
        this.state.dragData = { type, colIdx, cardIdx };
        this.moveFound(i);
        return;
      }
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
