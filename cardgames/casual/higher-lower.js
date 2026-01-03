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
      lastResult: null
    };
    
    this.cardValues = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    
    // ✅ ADD: Initialize resize handler
    this.resizeHandler = null;
  }
  
  setup() {
    // Create and shuffle deck
    const allCards = this.engine.createCardArray(this.deck);
    this.state.cards = this.engine.shuffleDeck(allCards);
    this.state.currentIndex = 0;
    this.state.currentCard = this.state.cards[0];
    this.state.streak = 0;
    this.state.bestStreak = parseInt(localStorage.getItem('higherLowerBestStreak') || '0');
    this.state.gameOver = false;
    this.state.lastGuess = null;
    this.state.lastResult = null;
    
    // ✅ ADD: Add resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.render();
    window.addEventListener('resize', this.resizeHandler);
    
    this.render();
    this.updateStats();
  }
  
  // ✅ ADD: Mobile scaling helper
  scaleCardForMobile(cardElement) {
    cardElement.style.fontSize = '0.7rem';
    
    const cardFront = cardElement.querySelector('.card-front');
    const cardBack = cardElement.querySelector('.card-back');
    
    if (cardFront) {
      cardFront.style.fontSize = '0.7rem';
      
      // Scale rank displays
      const rankDisplays = cardFront.querySelectorAll('.card-rank');
      rankDisplays.forEach(rank => {
        rank.style.fontSize = '0.85rem';
      });
      
      // Scale mini suit icons
      const miniPips = cardFront.querySelectorAll('.mini-pip');
      miniPips.forEach(pip => {
        pip.style.fontSize = '0.7rem';
      });
      
      // Scale center suit
      const suitCenter = cardFront.querySelector('.card-suit-center');
      if (suitCenter) {
        suitCenter.style.fontSize = '2rem';
      }
      
      // Scale center pips
      const pips = cardFront.querySelectorAll('.pip');
      pips.forEach(pip => {
        if (pip.classList.contains('large')) {
          pip.style.fontSize = '2rem';
        } else {
          pip.style.fontSize = '0.98rem';
        }
      });
      
      // Scale face card windows
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
    gameBoard.style.justifyContent = 'flex-start'; // ✅ CHANGED from 'center' to prevent overlap
    gameBoard.style.gap = '20px'; // ✅ CHANGED from 30px to 20px for tighter spacing
    gameBoard.style.minHeight = '600px';
    gameBoard.style.padding = '20px'; // ✅ ADD padding
    gameBoard.style.paddingTop = '40px'; // ✅ ADD extra top padding
    gameBoard.style.overflowY = 'auto'; // ✅ ADD scrolling for mobile
    
    // ✅ ADD: Detect mobile
    const isMobile = window.innerWidth < 700;
    const cardWidth = isMobile ? '100px' : '150px';
    const cardHeight = isMobile ? '140px' : '210px';
    
    if (this.state.gameOver) {
      this.renderGameOver(gameBoard, isMobile);
      return;
    }
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Will the next card be...';
    title.style.color = '#00ffcc';
    title.style.marginBottom = '10px'; // ✅ CHANGED from 20px
    title.style.fontSize = isMobile ? '1.3rem' : '1.8rem'; // ✅ ADD responsive font
    title.style.textAlign = 'center';
    gameBoard.appendChild(title);
    
    // Current card
    const cardContainer = document.createElement('div');
    cardContainer.style.position = 'relative';
    cardContainer.style.marginBottom = '10px'; // ✅ ADD margin
    
    const cardElement = this.engine.renderCard(this.state.currentCard, true);
    cardElement.style.width = cardWidth;
    cardElement.style.height = cardHeight;
    cardElement.classList.add('card-dealing');
    
    // ✅ ADD: Mobile scaling
    if (isMobile) {
      this.scaleCardForMobile(cardElement);
    }
    
    cardContainer.appendChild(cardElement);
    gameBoard.appendChild(cardContainer);
    
    // Card value display
    const valueDisplay = document.createElement('div');
    valueDisplay.textContent = `Current Value: ${this.cardValues[this.state.currentCard.rank]}`;
    valueDisplay.style.fontSize = isMobile ? '1rem' : '1.2rem'; // ✅ ADD responsive font
    valueDisplay.style.color = '#ccc';
    valueDisplay.style.marginTop = '5px'; // ✅ CHANGED from 10px
    valueDisplay.style.marginBottom = '15px'; // ✅ ADD margin
    gameBoard.appendChild(valueDisplay);
    
    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = isMobile ? '10px' : '20px'; // ✅ ADD responsive gap
    buttonContainer.style.marginTop = '10px'; // ✅ CHANGED from 30px
    buttonContainer.style.marginBottom = '20px'; // ✅ ADD bottom margin
    buttonContainer.style.zIndex = '10'; // ✅ ADD to ensure buttons stay on top
    
    const higherBtn = document.createElement('button');
    higherBtn.textContent = '⬆️ HIGHER';
    higherBtn.className = 'btn-game-control';
    higherBtn.style.fontSize = isMobile ? '1rem' : '1.2rem'; // ✅ ADD responsive font
    higherBtn.style.padding = isMobile ? '12px 25px' : '15px 40px'; // ✅ ADD responsive padding
    higherBtn.style.background = '#00b894';
    higherBtn.style.color = 'white';
    higherBtn.style.fontWeight = 'bold';
    higherBtn.style.cursor = 'pointer';
    higherBtn.style.border = 'none';
    higherBtn.style.borderRadius = '8px';
    higherBtn.style.transition = 'transform 0.2s';
    higherBtn.onmouseenter = () => higherBtn.style.transform = 'scale(1.05)';
    higherBtn.onmouseleave = () => higherBtn.style.transform = 'scale(1)';
    higherBtn.onclick = () => this.makeGuess('higher');
    buttonContainer.appendChild(higherBtn);
    
    const lowerBtn = document.createElement('button');
    lowerBtn.textContent = '⬇️ LOWER';
    lowerBtn.className = 'btn-game-control';
    lowerBtn.style.fontSize = isMobile ? '1rem' : '1.2rem'; // ✅ ADD responsive font
    lowerBtn.style.padding = isMobile ? '12px 25px' : '15px 40px'; // ✅ ADD responsive padding
    lowerBtn.style.background = '#e74c3c';
    lowerBtn.style.color = 'white';
    lowerBtn.style.fontWeight = 'bold';
    lowerBtn.style.cursor = 'pointer';
    lowerBtn.style.border = 'none';
    lowerBtn.style.borderRadius = '8px';
    lowerBtn.style.transition = 'transform 0.2s';
    lowerBtn.onmouseenter = () => lowerBtn.style.transform = 'scale(1.05)';
    lowerBtn.onmouseleave = () => lowerBtn.style.transform = 'scale(1)';
    lowerBtn.onclick = () => this.makeGuess('lower');
    buttonContainer.appendChild(lowerBtn);
    
    gameBoard.appendChild(buttonContainer);
    
    // Result message
    if (this.state.lastResult) {
      const resultMsg = document.createElement('div');
      resultMsg.textContent = this.state.lastResult;
      resultMsg.style.marginTop = '10px'; // ✅ CHANGED from 20px
      resultMsg.style.padding = isMobile ? '10px 20px' : '15px 30px'; // ✅ ADD responsive padding
      resultMsg.style.borderRadius = '8px';
      resultMsg.style.fontSize = isMobile ? '0.9rem' : '1.1rem'; // ✅ ADD responsive font
      resultMsg.style.fontWeight = 'bold';
      resultMsg.style.textAlign = 'center';
      resultMsg.style.maxWidth = '90%'; // ✅ ADD to prevent overflow
      
      if (this.state.lastResult.includes('Correct')) {
        resultMsg.style.background = 'rgba(0, 255, 0, 0.2)';
        resultMsg.style.color = '#90ee90';
        resultMsg.style.border = '2px solid #90ee90';
      }
      
      gameBoard.appendChild(resultMsg);
    }
  }
  
  renderGameOver(gameBoard, isMobile) {
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.padding = isMobile ? '20px' : '40px'; // ✅ ADD responsive padding
    container.style.maxWidth = '100%'; // ✅ ADD to prevent overflow
    
    const title = document.createElement('h2');
    title.textContent = '❌ Game Over!';
    title.style.color = '#e74c3c';
    title.style.fontSize = isMobile ? '2rem' : '2.5rem'; // ✅ ADD responsive font
    title.style.marginBottom = '20px';
    container.appendChild(title);
    
    const streakMsg = document.createElement('div');
    streakMsg.textContent = `Final Streak: ${this.state.streak}`;
    streakMsg.style.fontSize = isMobile ? '1.2rem' : '1.5rem'; // ✅ ADD responsive font
    streakMsg.style.color = '#00ffcc';
    streakMsg.style.marginBottom = '10px';
    container.appendChild(streakMsg);
    
    const bestMsg = document.createElement('div');
    bestMsg.textContent = `Best Streak: ${this.state.bestStreak}`;
    bestMsg.style.fontSize = isMobile ? '1rem' : '1.2rem'; // ✅ ADD responsive font
    bestMsg.style.color = '#ffd700';
    bestMsg.style.marginBottom = '30px';
    container.appendChild(bestMsg);
    
    // Show the card that ended the game
    if (this.state.currentIndex < this.state.cards.length) {
      const nextCard = this.state.cards[this.state.currentIndex];
      const cardElement = this.engine.renderCard(nextCard, true);
      const cardWidth = isMobile ? '100px' : '150px';
      const cardHeight = isMobile ? '140px' : '210px';
      cardElement.style.width = cardWidth;
      cardElement.style.height = cardHeight;
      cardElement.style.margin = '20px auto';
      
      // ✅ ADD: Mobile scaling
      if (isMobile) {
        this.scaleCardForMobile(cardElement);
      }
      
      container.appendChild(cardElement);
      
      const explanation = document.createElement('div');
      explanation.textContent = `You guessed ${this.state.lastGuess.toUpperCase()}, but the card was ${this.cardValues[nextCard.rank]}`;
      explanation.style.color = '#ccc';
      explanation.style.marginTop = '10px';
      explanation.style.fontSize = isMobile ? '0.9rem' : '1rem'; // ✅ ADD responsive font
      explanation.style.padding = '0 10px'; // ✅ ADD padding for mobile
      container.appendChild(explanation);
    }
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = '🔄 Play Again';
    playAgainBtn.className = 'btn-game-control';
    playAgainBtn.style.fontSize = isMobile ? '1rem' : '1.2rem'; // ✅ ADD responsive font
    playAgainBtn.style.padding = isMobile ? '12px 30px' : '15px 40px'; // ✅ ADD responsive padding
    playAgainBtn.style.background = '#00ffcc';
    playAgainBtn.style.color = '#000';
    playAgainBtn.style.fontWeight = 'bold';
    playAgainBtn.style.marginTop = '30px';
    playAgainBtn.style.cursor = 'pointer';
    playAgainBtn.style.border = 'none';
    playAgainBtn.style.borderRadius = '8px';
    playAgainBtn.onclick = () => this.setup();
    container.appendChild(playAgainBtn);
    
    gameBoard.appendChild(container);
  }
  
  makeGuess(guess) {
    if (this.state.gameOver) return;
    if (this.state.currentIndex >= this.state.cards.length - 1) {
      this.endGame('No more cards!');
      return;
    }
    
    const currentValue = this.cardValues[this.state.currentCard.rank];
    const nextCard = this.state.cards[this.state.currentIndex + 1];
    const nextValue = this.cardValues[nextCard.rank];
    
    this.state.lastGuess = guess;
    
    let correct = false;
    if (nextValue === currentValue) {
      correct = true; // Equal is considered a win
      this.state.lastResult = `✅ Correct! Same value (${nextValue})`;
    } else if (guess === 'higher' && nextValue > currentValue) {
      correct = true;
      this.state.lastResult = `✅ Correct! ${nextValue} is higher than ${currentValue}`;
    } else if (guess === 'lower' && nextValue < currentValue) {
      correct = true;
      this.state.lastResult = `✅ Correct! ${nextValue} is lower than ${currentValue}`;
    }
    
    if (correct) {
      this.state.streak++;
      this.state.currentIndex++;
      this.state.currentCard = nextCard;
      
      if (this.state.streak > this.state.bestStreak) {
        this.state.bestStreak = this.state.streak;
        localStorage.setItem('higherLowerBestStreak', this.state.bestStreak.toString());
      }
      
      this.updateStats();
      this.render();
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
  
  // ✅ ADD: Cleanup method
  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['higher-lower-v1'] = HigherLower;
