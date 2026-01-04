/**
 * Higher or Lower
 * Guess if next card is higher or lower
 */

class HigherLower {
  constructor(engine, deckData) {
    this.engine = engine;
    this.deck = deckData;
    this.state = {
      cards: [],
      currentIndex: 0,
      currentCard: null,
      streak: 0,
      bestStreak: 0,
      gameOver: false,
      lastGuess: null,
      lastResult: null,
      showingComparison: false,
      nextCard: null
    };
    
    this.cardValues = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    
    this.resizeHandler = null;
  }
  
  setup() {
    const allCards = this.engine.createCardArray(this.deck);
    this.state.cards = this.engine.shuffleDeck(allCards);
    this.state.currentIndex = 0;
    this.state.currentCard = this.state.cards[0];
    this.state.streak = 0;
    this.state.bestStreak = parseInt(localStorage.getItem('higherLowerBestStreak') || '0');
    this.state.gameOver = false;
    this.state.lastGuess = null;
    this.state.lastResult = null;
    this.state.showingComparison = false;
    this.state.nextCard = null;
    
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
    this.render();
    this.updateStats();
  }
  
  scaleCardForMobile(cardElement) {
    cardElement.style.fontSize = '0.7rem';
    
    const cardFront = cardElement.querySelector('.card-front');
    const cardBack = cardElement.querySelector('.card-back');
    
    if (cardFront) {
      cardFront.style.fontSize = '0.7rem';
      
      const rankDisplays = cardFront.querySelectorAll('.card-rank');
      rankDisplays.forEach(rank => {
        rank.style.fontSize = '0.85rem';
      });
      
      const miniPips = cardFront.querySelectorAll('.mini-pip');
      miniPips.forEach(pip => {
        pip.style.fontSize = '0.7rem';
      });
      
      const suitCenter = cardFront.querySelector('.card-suit-center');
      if (suitCenter) {
        suitCenter.style.fontSize = '2rem';
      }
      
      const pips = cardFront.querySelectorAll('.pip');
      pips.forEach(pip => {
        if (pip.classList.contains('large')) {
          pip.style.fontSize = '2rem';
        } else {
          pip.style.fontSize = '0.98rem';
        }
      });
      
      const faceWindow = cardFront.querySelector('.face-card-window');
      if (faceWindow) {
        faceWindow.style.top = '20px';
        faceWindow.style.bottom = '20px';
        faceWindow.style.left = '15px';
        faceWindow.style.right = '15px';
      }
    }
    
    if (cardBack) {
      cardBack.style.fontSize = '0.7rem';
    }
  }
  
  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'flex';
    gameBoard.style.flexDirection = 'column';
    gameBoard.style.alignItems = 'center';
    gameBoard.style.justifyContent = 'flex-start';
    gameBoard.style.gap = '20px';
    gameBoard.style.minHeight = '600px';
    gameBoard.style.padding = '30px 20px';
    gameBoard.style.paddingTop = '40px';
    gameBoard.style.overflowY = 'auto';
    gameBoard.style.position = 'relative';
    
    const isMobile = window.innerWidth < 700;
    const cardWidth = isMobile ? '100px' : '150px';
    const cardHeight = isMobile ? '140px' : '210px';
    
    if (this.state.gameOver) {
      this.renderGameOver(gameBoard, isMobile, cardWidth, cardHeight);
      return;
    }
    
    if (this.state.showingComparison) {
      this.renderComparison(gameBoard, isMobile, cardWidth, cardHeight);
      return;
    }
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Will the next card be...';
    title.style.color = '#00ffcc';
    title.style.margin = '0';
    title.style.fontSize = isMobile ? '1.3rem' : '1.8rem';
    title.style.textAlign = 'center';
    title.style.position = 'relative';
    title.style.zIndex = '1';
    gameBoard.appendChild(title);
    
    // Current card container
    const cardContainer = document.createElement('div');
    cardContainer.style.display = 'flex';
    cardContainer.style.flexDirection = 'column';
    cardContainer.style.alignItems = 'center';
    cardContainer.style.gap = '15px';
    cardContainer.style.position = 'relative';
    cardContainer.style.zIndex = '1';
    
    const cardElement = this.engine.renderCard(this.state.currentCard, true);
    cardElement.style.width = cardWidth;
    cardElement.style.height = cardHeight;
    cardElement.style.position = 'relative';
    cardElement.style.zIndex = '1';
    cardElement.classList.add('card-dealing');
    
    if (isMobile) {
      this.scaleCardForMobile(cardElement);
    }
    
    cardContainer.appendChild(cardElement);
    
    // Card value display
    const valueDisplay = document.createElement('div');
    valueDisplay.textContent = `Current Value: ${this.cardValues[this.state.currentCard.rank]}`;
    valueDisplay.style.fontSize = isMobile ? '1rem' : '1.2rem';
    valueDisplay.style.color = '#ffd700';
    valueDisplay.style.fontWeight = 'bold';
    valueDisplay.style.textAlign = 'center';
    valueDisplay.style.margin = '0';
    valueDisplay.style.position = 'relative';
    valueDisplay.style.zIndex = '2';
    cardContainer.appendChild(valueDisplay);
    
    gameBoard.appendChild(cardContainer);
    
    // Buttons - BELOW THE CARD with higher z-index
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = isMobile ? '15px' : '30px';
    buttonContainer.style.margin = '0';
    buttonContainer.style.width = '100%';
    buttonContainer.style.maxWidth = '500px';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.position = 'relative';
    buttonContainer.style.zIndex = '10';
    
    const higherBtn = this.createButton('⬆️ HIGHER', '#00b894', () => this.makeGuess('higher'), isMobile);
    const lowerBtn = this.createButton('⬇️ LOWER', '#e74c3c', () => this.makeGuess('lower'), isMobile);
    
    buttonContainer.appendChild(higherBtn);
    buttonContainer.appendChild(lowerBtn);
    gameBoard.appendChild(buttonContainer);
  }
  
  renderComparison(gameBoard, isMobile, cardWidth, cardHeight) {
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Comparing Cards...';
    title.style.color = '#00ffcc';
    title.style.margin = '0';
    title.style.fontSize = isMobile ? '1.3rem' : '1.8rem';
    title.style.textAlign = 'center';
    title.style.position = 'relative';
    title.style.zIndex = '1';
    gameBoard.appendChild(title);
    
    // Cards side by side
    const cardsContainer = document.createElement('div');
    cardsContainer.style.display = 'flex';
    cardsContainer.style.gap = isMobile ? '15px' : '30px';
    cardsContainer.style.justifyContent = 'center';
    cardsContainer.style.alignItems = 'flex-start';
    cardsContainer.style.flexWrap = 'wrap';
    cardsContainer.style.position = 'relative';
    cardsContainer.style.zIndex = '1';
    
    // Current card
    const currentContainer = document.createElement('div');
    currentContainer.style.display = 'flex';
    currentContainer.style.flexDirection = 'column';
    currentContainer.style.alignItems = 'center';
    currentContainer.style.gap = '10px';
    currentContainer.style.position = 'relative';
    currentContainer.style.zIndex = '1';
    
    const currentLabel = document.createElement('div');
    currentLabel.textContent = 'Current Card';
    currentLabel.style.fontSize = isMobile ? '0.9rem' : '1rem';
    currentLabel.style.color = '#fff';
    currentLabel.style.fontWeight = 'bold';
    currentLabel.style.position = 'relative';
    currentLabel.style.zIndex = '2';
    currentContainer.appendChild(currentLabel);
    
    const currentCardEl = this.engine.renderCard(this.state.currentCard, true);
    currentCardEl.style.width = cardWidth;
    currentCardEl.style.height = cardHeight;
    currentCardEl.style.position = 'relative';
    currentCardEl.style.zIndex = '1';
    if (isMobile) this.scaleCardForMobile(currentCardEl);
    currentContainer.appendChild(currentCardEl);
    
    const currentValue = document.createElement('div');
    currentValue.textContent = `Value: ${this.cardValues[this.state.currentCard.rank]}`;
    currentValue.style.fontSize = isMobile ? '0.9rem' : '1rem';
    currentValue.style.color = '#ffd700';
    currentValue.style.position = 'relative';
    currentValue.style.zIndex = '2';
    currentContainer.appendChild(currentValue);
    
    cardsContainer.appendChild(currentContainer);
    
    // Next card
    const nextContainer = document.createElement('div');
    nextContainer.style.display = 'flex';
    nextContainer.style.flexDirection = 'column';
    nextContainer.style.alignItems = 'center';
    nextContainer.style.gap = '10px';
    nextContainer.style.position = 'relative';
    nextContainer.style.zIndex = '1';
    
    const nextLabel = document.createElement('div');
    nextLabel.textContent = 'Next Card';
    nextLabel.style.fontSize = isMobile ? '0.9rem' : '1rem';
    nextLabel.style.color = '#fff';
    nextLabel.style.fontWeight = 'bold';
    nextLabel.style.position = 'relative';
    nextLabel.style.zIndex = '2';
    nextContainer.appendChild(nextLabel);
    
    const nextCardEl = this.engine.renderCard(this.state.nextCard, true);
    nextCardEl.style.width = cardWidth;
    nextCardEl.style.height = cardHeight;
    nextCardEl.style.position = 'relative';
    nextCardEl.style.zIndex = '1';
    if (isMobile) this.scaleCardForMobile(nextCardEl);
    nextContainer.appendChild(nextCardEl);
    
    const nextValue = document.createElement('div');
    nextValue.textContent = `Value: ${this.cardValues[this.state.nextCard.rank]}`;
    nextValue.style.fontSize = isMobile ? '0.9rem' : '1rem';
    nextValue.style.color = '#ffd700';
    nextValue.style.position = 'relative';
    nextValue.style.zIndex = '2';
    nextContainer.appendChild(nextValue);
    
    cardsContainer.appendChild(nextContainer);
    gameBoard.appendChild(cardsContainer);
    
    // Result message - BELOW cards with higher z-index
    const resultMsg = document.createElement('div');
    resultMsg.textContent = this.state.lastResult;
    resultMsg.style.margin = '0';
    resultMsg.style.padding = isMobile ? '12px 20px' : '15px 30px';
    resultMsg.style.borderRadius = '8px';
    resultMsg.style.fontSize = isMobile ? '1rem' : '1.2rem';
    resultMsg.style.fontWeight = 'bold';
    resultMsg.style.textAlign = 'center';
    resultMsg.style.maxWidth = '90%';
    resultMsg.style.background = 'rgba(0, 255, 0, 0.2)';
    resultMsg.style.color = '#90ee90';
    resultMsg.style.border = '2px solid #90ee90';
    resultMsg.style.position = 'relative';
    resultMsg.style.zIndex = '10';
    gameBoard.appendChild(resultMsg);
  }
  
  renderGameOver(gameBoard, isMobile, cardWidth, cardHeight) {
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.padding = isMobile ? '20px' : '40px';
    container.style.maxWidth = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '20px';
    container.style.position = 'relative';
    
    const title = document.createElement('h2');
    title.textContent = '❌ Game Over!';
    title.style.color = '#e74c3c';
    title.style.fontSize = isMobile ? '2rem' : '2.5rem';
    title.style.margin = '0';
    title.style.position = 'relative';
    title.style.zIndex = '1';
    container.appendChild(title);
    
    const streakMsg = document.createElement('div');
    streakMsg.textContent = `Final Streak: ${this.state.streak}`;
    streakMsg.style.fontSize = isMobile ? '1.2rem' : '1.5rem';
    streakMsg.style.color = '#00ffcc';
    streakMsg.style.margin = '0';
    streakMsg.style.position = 'relative';
    streakMsg.style.zIndex = '1';
    container.appendChild(streakMsg);
    
    const bestMsg = document.createElement('div');
    bestMsg.textContent = `Best Streak: ${this.state.bestStreak}`;
    bestMsg.style.fontSize = isMobile ? '1rem' : '1.2rem';
    bestMsg.style.color = '#ffd700';
    bestMsg.style.margin = '0';
    bestMsg.style.position = 'relative';
    bestMsg.style.zIndex = '1';
    container.appendChild(bestMsg);
    
    // Show comparison
    if (this.state.nextCard) {
      const explanation = document.createElement('div');
      const currentValue = this.cardValues[this.state.currentCard.rank];
      const nextValue = this.cardValues[this.state.nextCard.rank];
      explanation.textContent = `You guessed ${this.state.lastGuess.toUpperCase()}, but ${nextValue} is not ${this.state.lastGuess} than ${currentValue}`;
      explanation.style.color = '#ccc';
      explanation.style.fontSize = isMobile ? '0.9rem' : '1rem';
      explanation.style.padding = '0 10px';
      explanation.style.margin = '0';
      explanation.style.position = 'relative';
      explanation.style.zIndex = '2';
      container.appendChild(explanation);
      
      // Show both cards
      const cardsContainer = document.createElement('div');
      cardsContainer.style.display = 'flex';
      cardsContainer.style.gap = isMobile ? '15px' : '30px';
      cardsContainer.style.justifyContent = 'center';
      cardsContainer.style.flexWrap = 'wrap';
      cardsContainer.style.margin = '0';
      cardsContainer.style.position = 'relative';
      cardsContainer.style.zIndex = '1';
      
      const currentCardEl = this.engine.renderCard(this.state.currentCard, true);
      currentCardEl.style.width = cardWidth;
      currentCardEl.style.height = cardHeight;
      currentCardEl.style.position = 'relative';
      currentCardEl.style.zIndex = '1';
      if (isMobile) this.scaleCardForMobile(currentCardEl);
      cardsContainer.appendChild(currentCardEl);
      
      const nextCardEl = this.engine.renderCard(this.state.nextCard, true);
      nextCardEl.style.width = cardWidth;
      nextCardEl.style.height = cardHeight;
      nextCardEl.style.position = 'relative';
      nextCardEl.style.zIndex = '1';
      if (isMobile) this.scaleCardForMobile(nextCardEl);
      cardsContainer.appendChild(nextCardEl);
      
      container.appendChild(cardsContainer);
    }
    
    // Play Again button - BELOW cards with highest z-index
    const playAgainBtn = this.createButton('🔄 Play Again', '#00ffcc', () => this.setup(), isMobile);
    playAgainBtn.style.marginTop = '0';
    playAgainBtn.style.background = '#00ffcc';
    playAgainBtn.style.color = '#000';
    playAgainBtn.style.position = 'relative';
    playAgainBtn.style.zIndex = '100';
    container.appendChild(playAgainBtn);
    
    gameBoard.appendChild(container);
  }
  
  createButton(text, bgColor, onClick, isMobile) {
    const btn = document.createElement('button');
    btn.innerHTML = text;
    btn.className = 'btn-game-control';
    btn.style.fontSize = isMobile ? '1rem' : '1.3rem';
    btn.style.padding = isMobile ? '15px 30px' : '18px 45px';
    btn.style.background = bgColor;
    btn.style.color = 'white';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.border = 'none';
    btn.style.borderRadius = '10px';
    btn.style.transition = 'all 0.2s';
    btn.style.boxShadow = `0 4px 15px ${bgColor}66`;
    btn.style.position = 'relative';
    btn.style.zIndex = '100';
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = `0 6px 20px ${bgColor}99`;
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = `0 4px 15px ${bgColor}66`;
    };
    btn.onclick = onClick;
    return btn;
  }
  
  makeGuess(guess) {
    if (this.state.gameOver || this.state.showingComparison) return;
    if (this.state.currentIndex >= this.state.cards.length - 1) {
      this.endGame('No more cards!');
      return;
    }
    
    const currentValue = this.cardValues[this.state.currentCard.rank];
    const nextCard = this.state.cards[this.state.currentIndex + 1];
    const nextValue = this.cardValues[nextCard.rank];
    
    this.state.lastGuess = guess;
    this.state.nextCard = nextCard;
    
    let correct = false;
    if (nextValue === currentValue) {
      correct = true;
      this.state.lastResult = `✅ It's a Match! Both cards are ${nextValue}`;
    } else if (guess === 'higher' && nextValue > currentValue) {
      correct = true;
      this.state.lastResult = `✅ Correct! ${nextValue} is higher than ${currentValue}`;
    } else if (guess === 'lower' && nextValue < currentValue) {
      correct = true;
      this.state.lastResult = `✅ Correct! ${nextValue} is lower than ${currentValue}`;
    }
    
    if (correct) {
      this.state.showingComparison = true;
      this.render();
      
      setTimeout(() => {
        this.state.streak++;
        this.state.currentIndex++;
        this.state.currentCard = nextCard;
        this.state.showingComparison = false;
        
        if (this.state.streak > this.state.bestStreak) {
          this.state.bestStreak = this.state.streak;
          localStorage.setItem('higherLowerBestStreak', this.state.bestStreak.toString());
        }
        
        this.updateStats();
        this.render();
      }, 2000);
    } else {
      this.endGame();
    }
  }
  
  endGame(message) {
    this.state.gameOver = true;
    this.render();
  }
  
  updateStats() {
    document.getElementById('game-moves').textContent = `Streak: ${this.state.streak}`;
    document.getElementById('game-score').textContent = `Best: ${this.state.bestStreak}`;
  }
  
  pause() {
    // Higher/Lower doesn't need pause
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
window.GameModules['casual-higher-lower-v1'] = HigherLower;
