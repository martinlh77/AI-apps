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
    
    this.render();
    this.updateStats();
  }
  
  render() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.style.display = 'flex';
    gameBoard.style.flexDirection = 'column';
    gameBoard.style.alignItems = 'center';
    gameBoard.style.justifyContent = 'center';
    gameBoard.style.gap = '30px';
    gameBoard.style.minHeight = '600px';
    
    if (this.state.gameOver) {
      this.renderGameOver(gameBoard);
      return;
    }
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Will the next card be...';
    title.style.color = '#00ffcc';
    title.style.marginBottom = '20px';
    gameBoard.appendChild(title);
    
    // Current card
    const cardContainer = document.createElement('div');
    cardContainer.style.position = 'relative';
    
    const cardElement = this.engine.renderCard(this.state.currentCard, true);
    cardElement.style.width = '150px';
    cardElement.style.height = '210px';
    cardElement.classList.add('card-dealing');
    cardContainer.appendChild(cardElement);
    
    gameBoard.appendChild(cardContainer);
    
    // Card value display
    const valueDisplay = document.createElement('div');
    valueDisplay.textContent = `Current Value: ${this.cardValues[this.state.currentCard.rank]}`;
    valueDisplay.style.fontSize = '1.2rem';
    valueDisplay.style.color = '#ccc';
    valueDisplay.style.marginTop = '10px';
    gameBoard.appendChild(valueDisplay);
    
    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '20px';
    buttonContainer.style.marginTop = '30px';
    
    const higherBtn = document.createElement('button');
    higherBtn.textContent = '⬆️ HIGHER';
    higherBtn.className = 'btn-game-control';
    higherBtn.style.fontSize = '1.2rem';
    higherBtn.style.padding = '15px 40px';
    higherBtn.style.background = '#00b894';
    higherBtn.style.color = 'white';
    higherBtn.style.fontWeight = 'bold';
    higherBtn.onclick = () => this.makeGuess('higher');
    buttonContainer.appendChild(higherBtn);
    
    const lowerBtn = document.createElement('button');
    lowerBtn.textContent = '⬇️ LOWER';
    lowerBtn.className = 'btn-game-control';
    lowerBtn.style.fontSize = '1.2rem';
    lowerBtn.style.padding = '15px 40px';
    lowerBtn.style.background = '#e74c3c';
    lowerBtn.style.color = 'white';
    lowerBtn.style.fontWeight = 'bold';
    lowerBtn.onclick = () => this.makeGuess('lower');
    buttonContainer.appendChild(lowerBtn);
    
    gameBoard.appendChild(buttonContainer);
    
    // Result message
    if (this.state.lastResult) {
      const resultMsg = document.createElement('div');
      resultMsg.textContent = this.state.lastResult;
      resultMsg.style.marginTop = '20px';
      resultMsg.style.padding = '15px 30px';
      resultMsg.style.borderRadius = '8px';
      resultMsg.style.fontSize = '1.1rem';
      resultMsg.style.fontWeight = 'bold';
      
      if (this.state.lastResult.includes('Correct')) {
        resultMsg.style.background = 'rgba(0, 255, 0, 0.2)';
        resultMsg.style.color = '#90ee90';
        resultMsg.style.border = '2px solid #90ee90';
      }
      
      gameBoard.appendChild(resultMsg);
    }
  }
  
  renderGameOver(gameBoard) {
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.padding = '40px';
    
    const title = document.createElement('h2');
    title.textContent = '❌ Game Over!';
    title.style.color = '#e74c3c';
    title.style.fontSize = '2.5rem';
    title.style.marginBottom = '20px';
    container.appendChild(title);
    
    const streakMsg = document.createElement('div');
    streakMsg.textContent = `Final Streak: ${this.state.streak}`;
    streakMsg.style.fontSize = '1.5rem';
    streakMsg.style.color = '#00ffcc';
    streakMsg.style.marginBottom = '10px';
    container.appendChild(streakMsg);
    
    const bestMsg = document.createElement('div');
    bestMsg.textContent = `Best Streak: ${this.state.bestStreak}`;
    bestMsg.style.fontSize = '1.2rem';
    bestMsg.style.color = '#ffd700';
    bestMsg.style.marginBottom = '30px';
    container.appendChild(bestMsg);
    
    // Show the card that ended the game
    if (this.state.currentIndex < this.state.cards.length) {
      const nextCard = this.state.cards[this.state.currentIndex];
      const cardElement = this.engine.renderCard(nextCard, true);
      cardElement.style.width = '150px';
      cardElement.style.height = '210px';
      cardElement.style.margin = '20px auto';
      container.appendChild(cardElement);
      
      const explanation = document.createElement('div');
      explanation.textContent = `You guessed ${this.state.lastGuess.toUpperCase()}, but the card was ${this.cardValues[nextCard.rank]}`;
      explanation.style.color = '#ccc';
      explanation.style.marginTop = '10px';
      container.appendChild(explanation);
    }
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.textContent = '🔄 Play Again';
    playAgainBtn.className = 'btn-game-control';
    playAgainBtn.style.fontSize = '1.2rem';
    playAgainBtn.style.padding = '15px 40px';
    playAgainBtn.style.background = '#00ffcc';
    playAgainBtn.style.color = '#000';
    playAgainBtn.style.fontWeight = 'bold';
    playAgainBtn.style.marginTop = '30px';
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
}

// Register the game
window.GameModules = window.GameModules || {};
window.GameModules['higher-lower-v1'] = HigherLower;