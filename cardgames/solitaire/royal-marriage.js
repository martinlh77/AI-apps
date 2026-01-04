/**
 * Royal Marriage (The Wedding)
 * Classic linear solitaire where the King of Hearts must reach the Queen of Hearts
 * by removing matching cards that are separated by 1 or 2 other cards.
 * Features: Horizontal scrolling layout, pinch-to-zoom, two-finger pan
 */

class RoyalMarriage {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      cards: [],
      moves: 0,
      score: 0,
      gameWon: false,
      selectedCard: null,
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
    
    // Find and remove King and Queen of Hearts
    const kingIndex = allCards.findIndex(c => c.suit === 'hearts' && c.rank === 'K');
    const queenIndex = allCards.findIndex(c => c.suit === 'hearts' && c.rank === 'Q');
    
    const king = allCards.splice(kingIndex, 1)[0];
    const queen = allCards.splice(queenIndex > kingIndex ? queenIndex - 1 : queenIndex, 1)[0];

    // Shuffle remaining 50 cards
    const shuffled = this.engine.shuffleDeck(allCards);

    // Build card row: King at start, shuffled cards, Queen at end
    this.state.cards = [
      { ...king, faceUp: true, isKing: true },
      ...shuffled.map(c => ({ ...c, faceUp: true })),
      { ...queen, faceUp: true, isQueen: true }
    ];

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

    if (!document.getElementById('marriage-ctrl')) {
      const ctrl = document.createElement('div');
      ctrl.id = 'marriage-ctrl';
      ctrl.style.cssText = 'display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:15px; z-index:1000; position:relative;';
      ctrl.innerHTML = `
        <button id="hint-btn" style="padding:8px 15px; background:#00ffcc; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Show Hint</button>
        <button id="reset-view-rm" style="padding:8px 15px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">Reset View</button>
        <button id="new-game-rm" style="padding:8px 15px; background:#ffd700; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">New Game</button>
      `;
      board.parentElement.insertBefore(ctrl, board);

      document.getElementById('hint-btn').onclick = () => this.showHint();
      document.getElementById('reset-view-rm').onclick = () => {
        this.state.zoom = 1;
        this.state.panX = 0;
        this.state.panY = 0;
        this.render();
      };
      document.getElementById('new-game-rm').onclick = () => this.setup();
    }
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

  handleCardClick(index) {
    const card = this.state.cards[index];
    if (!card) return; // Empty slot

    // Don't allow selecting King or Queen
    if (card.isKing || card.isQueen) return;

    if (this.state.selectedCard === null) {
      // First card selection
      this.state.selectedCard = index;
      this.render();
    } else {
      // Second card selection - try to match
      if (this.state.selectedCard === index) {
        // Deselect same card
        this.state.selectedCard = null;
        this.render();
        return;
      }

      if (this.canMatch(this.state.selectedCard, index)) {
        this.removeCards(this.state.selectedCard, index);
        this.state.selectedCard = null;
        this.state.moves++;
        this.state.score += 10;
        this.updateStats();
        this.render();
        
        setTimeout(() => this.checkWin(), 300);
      } else {
        // Invalid match - select new card
        this.state.selectedCard = index;
        this.render();
      }
    }
  }

  canMatch(index1, index2) {
    const card1 = this.state.cards[index1];
    const card2 = this.state.cards[index2];

    if (!card1 || !card2) return false;

    // Must match by suit or rank
    const matchesSuitOrRank = card1.suit === card2.suit || card1.rank === card2.rank;
    if (!matchesSuitOrRank) return false;

    // Count cards between them (non-null cards)
    const minIndex = Math.min(index1, index2);
    const maxIndex = Math.max(index1, index2);
    
    let cardsBetween = 0;
    for (let i = minIndex + 1; i < maxIndex; i++) {
      if (this.state.cards[i] !== null) {
        cardsBetween++;
      }
    }

    // Must be separated by exactly 1 or 2 cards
    return cardsBetween === 1 || cardsBetween === 2;
  }

  removeCards(index1, index2) {
    this.state.cards[index1] = null;
    this.state.cards[index2] = null;
  }

  showHint() {
    // Find first valid match
    for (let i = 0; i < this.state.cards.length; i++) {
      if (!this.state.cards[i]) continue;
      if (this.state.cards[i].isKing || this.state.cards[i].isQueen) continue;

      for (let j = i + 1; j < this.state.cards.length; j++) {
        if (!this.state.cards[j]) continue;
        if (this.state.cards[j].isKing || this.state.cards[j].isQueen) continue;

        if (this.canMatch(i, j)) {
          // Highlight these cards temporarily
          const prevSelected = this.state.selectedCard;
          this.state.selectedCard = i;
          this.render();

          setTimeout(() => {
            this.state.selectedCard = j;
            this.render();
            
            setTimeout(() => {
              this.state.selectedCard = prevSelected;
              this.render();
            }, 1000);
          }, 500);

          return;
        }
      }
    }

    alert('No valid moves found! Try starting a new game.');
  }

  checkWin() {
    // Count remaining cards
    const remaining = this.state.cards.filter(c => c !== null);

    // Win if only King and Queen remain
    if (remaining.length === 2) {
      const hasKing = remaining.some(c => c.isKing);
      const hasQueen = remaining.some(c => c.isQueen);

      if (hasKing && hasQueen) {
        // Check if they're adjacent (no null cards between them)
        const kingIndex = this.state.cards.findIndex(c => c && c.isKing);
        const queenIndex = this.state.cards.findIndex(c => c && c.isQueen);

        let cardsBetwee = 0;
        const minIndex = Math.min(kingIndex, queenIndex);
        const maxIndex = Math.max(kingIndex, queenIndex);

        for (let i = minIndex + 1; i < maxIndex; i++) {
          if (this.state.cards[i] !== null) {
            cardsBetwee++;
          }
        }

        if (cardsBetwee === 0) {
          this.state.gameWon = true;
          setTimeout(() => {
            this.engine.celebrateWin();
            alert(`💕 Royal Marriage Complete! 💕\n\nThe King and Queen of Hearts are united!\n\nMoves: ${this.state.moves}\nScore: ${this.state.score}`);
          }, 500);
        }
      }
    }

    // Check for no more moves (game lost)
    if (!this.hasValidMoves()) {
      setTimeout(() => {
        alert(`😔 No more moves available!\n\nThe King and Queen couldn't meet this time.\n\nMoves: ${this.state.moves}\nScore: ${this.state.score}\n\nTry again!`);
      }, 300);
    }
  }

  hasValidMoves() {
    for (let i = 0; i < this.state.cards.length; i++) {
      if (!this.state.cards[i]) continue;
      if (this.state.cards[i].isKing || this.state.cards[i].isQueen) continue;

      for (let j = i + 1; j < this.state.cards.length; j++) {
        if (!this.state.cards[j]) continue;
        if (this.state.cards[j].isKing || this.state.cards[j].isQueen) continue;

        if (this.canMatch(i, j)) {
          return true;
        }
      }
    }
    return false;
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
      overflow: visible;
    `;
    gameBoard.appendChild(wrapper);

    const isMobile = window.innerWidth < 700;
    const cardSize = isMobile ? { w: 70, h: 98 } : { w: 100, h: 140 };
    const gap = isMobile ? 10 : 15;

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: row;
      gap: ${gap}px;
      padding: 30px;
      align-items: center;
      justify-content: flex-start;
      min-width: min-content;
    `;

    // Render all cards in a row
    this.state.cards.forEach((card, index) => {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width: ${cardSize.w}px;
        height: ${cardSize.h}px;
        flex-shrink: 0;
        position: relative;
      `;

      if (card === null) {
        // Empty slot (card was removed)
        slot.style.border = '2px dashed rgba(255,255,255,0.2)';
        slot.style.borderRadius = '8px';
      } else {
        const cardEl = this.engine.renderCard(card, true);
        cardEl.style.width = `${cardSize.w}px`;
        cardEl.style.height = `${cardSize.h}px`;
        cardEl.style.cursor = 'pointer';
        cardEl.style.transition = 'transform 0.2s, box-shadow 0.2s';

        // Highlight King and Queen
        if (card.isKing || card.isQueen) {
          cardEl.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.9)';
          cardEl.style.border = '4px solid gold';
          
          // Add crown emoji
          const crown = document.createElement('div');
          crown.textContent = card.isKing ? '👑' : '💝';
          crown.style.cssText = `
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            font-size: ${isMobile ? '1.5rem' : '2rem'};
            z-index: 10;
          `;
          cardEl.appendChild(crown);
        }

        // Highlight selected card
        if (this.state.selectedCard === index) {
          cardEl.style.boxShadow = '0 0 30px rgba(0, 255, 204, 0.9)';
          cardEl.style.transform = 'translateY(-15px) scale(1.05)';
          cardEl.style.border = '3px solid #00ffcc';
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
            pip.style.fontSize = pip.classList.contains('large') ? '1.6rem' : '0.85rem';
          });
        }

        cardEl.onclick = () => this.handleCardClick(index);
        slot.appendChild(cardEl);
      }

      container.appendChild(slot);
    });

    wrapper.appendChild(container);

    // Add position indicator
    const remainingCards = this.state.cards.filter(c => c !== null).length;
    const posInfo = document.createElement('div');
    posInfo.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      font-size: ${isMobile ? '0.9rem' : '1rem'};
      z-index: 100;
      pointer-events: none;
    `;
    posInfo.textContent = `${remainingCards} cards remaining`;
    wrapper.appendChild(posInfo);

    // Add instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: ${isMobile ? '0.75rem' : '0.9rem'};
      text-align: center;
      max-width: 90%;
      z-index: 100;
      pointer-events: none;
    `;
    instructions.innerHTML = `
      Match cards by <strong>suit</strong> or <strong>rank</strong><br>
      separated by <strong>1 or 2</strong> other cards
    `;
    wrapper.appendChild(instructions);
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
window.GameModules['solitaire-royal-marriage-v1'] = RoyalMarriage;