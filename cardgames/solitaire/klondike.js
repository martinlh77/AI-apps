/**
 * Klondike Solitaire Pro
 * Featuring Draw 1/3, Infinite Recycle, and Mobile Pinch-to-Zoom/Pan.
 */

class KlondikeSolitaire {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []],
      drawCount: 1, selected: null, moves: 0, score: 0,
      // Gesture State
      zoom: 1.0, panX: 0, panY: 0,
      lastDist: 0, lastMid: null
    };
    this.resizeHandler = null;
    this.cardValues = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
  }

  setup() {
    this.state.moves = 0; this.state.score = 0; this.state.selected = null;
    this.state.zoom = 1.0; this.state.panX = 0; this.state.panY = 0;
    
    const cards = this.engine.shuffleDeck(this.engine.createCardArray(this.deck));
    
    // Deal Tableau
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

    this.setupUI();
    this.attachGestures();

    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);

    this.render();
    this.updateStats();
  }

  setupUI() {
    if (!document.getElementById('solitaire-ctrl')) {
      const ctrl = document.createElement('div');
      ctrl.id = 'solitaire-ctrl';
      ctrl.style.cssText = 'display:flex; gap:10px; justify-content:center; margin-bottom:10px; z-index:1000; position:relative;';
      ctrl.innerHTML = `
        <button id="d1" style="padding:8px 15px; background:#00ffcc; border:none; border-radius:4px; font-weight:bold;">Draw 1</button>
        <button id="d3" style="padding:8px 15px; background:#444; color:white; border:none; border-radius:4px;">Draw 3</button>
        <button id="reset-cam" style="padding:8px 15px; background:#ff6b6b; color:white; border:none; border-radius:4px;">Reset View</button>
      `;
      document.getElementById('game-board').parentElement.prepend(ctrl);
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

  attachGestures() {
    const board = document.getElementById('game-board');
    board.style.touchAction = 'none'; // Prevent browser scrolling/scaling
    
    board.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.state.lastDist = this.getDist(e.touches);
        this.state.lastMid = this.getMid(e.touches);
      }
    }, { passive: false });

    board.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        // Pinch to Zoom
        const dist = this.getDist(e.touches);
        const scaleChange = dist / this.state.lastDist;
        this.state.zoom = Math.min(Math.max(this.state.zoom * scaleChange, 0.5), 3.0);
        this.state.lastDist = dist;

        // Two-Finger Pan
        const mid = this.getMid(e.touches);
        this.state.panX += (mid.x - this.state.lastMid.x);
        this.state.panY += (mid.y - this.state.lastMid.y);
        this.state.lastMid = mid;

        this.applyTransform();
      }
    }, { passive: false });
  }

  getDist(t) { return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY); }
  getMid(t) { return { x: (t[0].pageX + t[1].pageX) / 2, y: (t[0].pageY + t[1].pageY) / 2 }; }

  applyTransform() {
    const wrapper = document.getElementById('view-wrapper');
    if (wrapper) {
      wrapper.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom})`;
    }
  }

  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.id = 'view-wrapper';
    wrapper.style.cssText = 'width:100%; height:100%; transition: transform 0.05s ease-out; transform-origin: center center;';
    gameBoard.appendChild(wrapper);

    const isMobile = window.innerWidth < 700;
    const cardSize = isMobile ? { w: 45, h: 63 } : { w: 100, h: 140 };
    const gap = isMobile ? 8 : 20;

    // Build the board layout inside wrapper...
    const content = document.createElement('div');
    content.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:100%; padding-top:20px;';
    wrapper.appendChild(content);

    // --- Top Row ---
    const topRow = document.createElement('div');
    topRow.style.cssText = `display:flex; justify-content:space-between; width:100%; max-width:900px; margin-bottom:${gap*2}px; padding:0 10px;`;
    
    const leftSide = document.createElement('div');
    leftSide.style.display = 'flex'; leftSide.style.gap = `${gap}px`;
    
    // Stock
    const stock = this.createSlot(cardSize);
    if (this.state.stock.length > 0) {
      const c = this.engine.renderCard(this.state.stock[0], false);
      this.styleCard(c, cardSize, isMobile);
      c.onclick = () => this.draw();
      stock.appendChild(c);
    } else {
      stock.style.border = '1px solid rgba(255,255,255,0.2)';
      stock.innerHTML = '⟳'; stock.style.color = '#fff'; stock.style.display='flex'; stock.style.justifyContent='center'; stock.style.alignItems='center';
      stock.onclick = () => this.recycle();
    }
    leftSide.appendChild(stock);

    // Waste
    const waste = this.createSlot(cardSize);
    if (this.state.waste.length > 0) {
      const topW = this.state.waste[this.state.waste.length-1];
      const c = this.engine.renderCard(topW, true);
      this.styleCard(c, cardSize, isMobile);
      if (this.isSelected('waste', 0, this.state.waste.length-1)) c.style.boxShadow = '0 0 15px #ffd700';
      c.onclick = (e) => { e.stopPropagation(); this.select('waste', 0, this.state.waste.length-1); };
      waste.appendChild(c);
    }
    leftSide.appendChild(waste);

    // Foundations
    const foundations = document.createElement('div');
    foundations.style.display = 'flex'; foundations.style.gap = `${gap}px`;
    this.state.foundations.forEach((pile, i) => {
      const f = this.createSlot(cardSize);
      f.style.background = 'rgba(0,0,0,0.3)';
      f.onclick = () => this.moveFound(i);
      if (pile.length > 0) {
        const c = this.engine.renderCard(pile[pile.length-1], true);
        this.styleCard(c, cardSize, isMobile);
        f.appendChild(c);
      }
      foundations.appendChild(f);
    });

    topRow.appendChild(leftSide);
    topRow.appendChild(foundations);
    content.appendChild(topRow);

    // --- Tableau ---
    const tabRow = document.createElement('div');
    tabRow.style.cssText = `display:flex; justify-content:center; gap:${gap}px; width:100%;`;
    this.state.tableau.forEach((col, i) => {
      const container = document.createElement('div');
      container.style.cssText = `width:${cardSize.w}px; position:relative; min-height:${cardSize.h}px;`;
      container.onclick = () => this.moveTab(i);
      col.forEach((card, j) => {
        const c = this.engine.renderCard(card, card.faceUp);
        this.styleCard(c, cardSize, isMobile);
        c.style.position = 'absolute';
        c.style.top = `${j * (isMobile ? 12 : 25)}px`;
        if (card.faceUp) {
          if (this.isSelected('tableau', i, j)) c.style.boxShadow = '0 0 15px #ffd700';
          c.onclick = (e) => { e.stopPropagation(); this.select('tableau', i, j); };
        }
        container.appendChild(c);
      });
      tabRow.appendChild(container);
    });
    content.appendChild(tabRow);
    this.applyTransform();
  }

  createSlot(s) {
    const d = document.createElement('div');
    d.style.width = `${s.w}px`; d.style.height = `${s.h}px`; d.style.borderRadius = '4px';
    return d;
  }

  styleCard(el, s, isMobile) {
    el.style.width = `${s.w}px`; el.style.height = `${s.h}px`;
    if (isMobile) {
      el.style.fontSize = '0.5rem';
      el.querySelectorAll('.rank').forEach(r => r.style.fontSize = '0.6rem');
      el.querySelectorAll('.pip').forEach(p => p.style.fontSize = p.classList.contains('large') ? '1rem' : '0.5rem');
    }
  }

  // --- Logic ---
  draw() {
    const take = Math.min(this.state.drawCount, this.state.stock.length);
    for(let i=0; i<take; i++) {
      const c = this.state.stock.shift(); c.faceUp = true; this.state.waste.push(c);
    }
    this.state.moves++; this.state.selected = null; this.render(); this.updateStats();
  }

  recycle() {
    if (this.state.waste.length === 0) return;
    this.state.stock = [...this.state.waste].reverse().map(c => ({...c, faceUp: false}));
    this.state.waste = []; this.render();
  }

  select(type, i, j) {
    this.state.selected = (this.state.selected?.type === type && this.state.selected?.i === i && this.state.selected?.j === j) ? null : {type, i, j};
    this.render();
  }

  isSelected(type, i, j) {
    return this.state.selected?.type === type && this.state.selected?.i === i && this.state.selected?.j <= j;
  }

  moveFound(idx) {
    if (!this.state.selected) return;
    const cards = this.getSel();
    if (cards.length !== 1) return;
    const c = cards[0], target = this.state.foundations[idx], top = target[target.length-1];
    if ((!top && c.rank === 'A') || (top && c.suit === top.suit && this.cardValues[c.rank] === this.cardValues[top.rank] + 1)) {
      target.push(this.popSel()[0]); this.state.score += 10; this.finishMove();
    }
  }

  moveTab(idx) {
    if (!this.state.selected) return;
    const cards = this.getSel(), c = cards[0], target = this.state.tableau[idx], top = target[target.length-1];
    if ((!top && c.rank === 'K') || (top && c.color !== top.color && this.cardValues[c.rank] === this.cardValues[top.rank] - 1)) {
      target.push(...this.popSel()); this.state.score += 5; this.finishMove();
    }
  }

  getSel() {
    const s = this.state.selected;
    if (s.type === 'waste') return [this.state.waste[this.state.waste.length-1]];
    return this.state.tableau[s.i].slice(s.j);
  }

  popSel() {
    const s = this.state.selected;
    let res;
    if (s.type === 'waste') res = [this.state.waste.pop()];
    else res = this.state.tableau[s.i].splice(s.j);
    // Auto flip top card
    if (s.type === 'tableau' && this.state.tableau[s.i].length > 0) {
      this.state.tableau[s.i][this.state.tableau[s.i].length-1].faceUp = true;
    }
    return res;
  }

  finishMove() {
    this.state.moves++; this.state.selected = null; this.render(); this.updateStats();
    if (this.state.foundations.reduce((a,b)=>a+b.length,0) === 52) this.engine.celebrateWin();
  }

  updateStats() {
    document.getElementById('game-moves').textContent = `Moves: ${this.state.moves}`;
    document.getElementById('game-score').textContent = `Score: ${this.state.score}`;
  }

  cleanup() {
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    const c = document.getElementById('solitaire-ctrl'); if (c) c.remove();
  }
}

window.GameModules = window.GameModules || {};
window.GameModules['solitaire-klondike-v1'] = KlondikeSolitaire;
