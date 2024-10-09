const GRID_SIZE = 4;
const CELL_SIZE = 80;
const CELL_GAP = 10;
const MAX_UNDO_LEVELS = 10;

const DIFFICULTY = {
  EASY: 'easy',
  MODERATE: 'moderate',
  HARD: 'hard'
};

const CURRENT_DIFFICULTY = DIFFICULTY.HARD; // Change this to set the game difficulty

class Game2048 {
  constructor() {
    this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    this.score = 0;
    this.highScore = 0;
    this.gameBoard = document.getElementById('game-board');
    this.scoreElement = document.getElementById('score-value');
    this.highScoreElement = document.getElementById('high-score-value');
    this.undoButton = document.getElementById('undo-button');
    this.resetButton = document.getElementById('reset-button');
    this.tiltX = 0;
    this.tiltZ = 0;
    this.targetTiltX = 0;
    this.targetTiltZ = 0;
    this.tiltAnimationFrame = null;
    this.history = [];
    this.can_undo = true;
    this.can_tilt = true;
    this.isMobile = window.innerWidth <= 600;
    window.addEventListener('resize', this.handleResize.bind(this));
    this.loadGame();
    this.init();
    this.setupUndo();
    this.setupReset();
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.finalScoreElement = document.getElementById('final-score');
    this.gameOverResetButton = document.getElementById('game-over-reset-button');
    this.gameOverUndoButton = document.getElementById('game-over-undo-button');
    this.setupGameOverButtons();
    this.gameOver = false;
    this.setupThemeSwitch();
  }

  init() {
    if (this.grid.flat().every(cell => cell === 0)) {
      this.addRandomTile();
      this.addRandomTile();
    }
    this.updateBoard();
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  handleResize() {
    this.isMobile = window.innerWidth <= 600;
    if (this.isMobile) {
      this.centerBoard();
    }
  }

  // Remove the setupJoystick method

  // Remove the handleJoystickMove method

  // Remove the tiltBoard method

  // Remove the centerBoard method

  setupUndo() {
    this.undoButton.addEventListener('click', this.undo.bind(this));
    this.updateUndoButton();
  }

  setupReset() {
    this.resetButton.addEventListener('click', this.resetGame.bind(this));
  }

  setupGameOverButtons() {
    if (this.gameOverResetButton) {
      this.gameOverResetButton.addEventListener('click', () => {
        this.resetGame();
      });
    }
    if (this.gameOverUndoButton) {
      this.gameOverUndoButton.addEventListener('click', () => {
        this.undoLastMove();
      });
    }
  }

  addRandomTile() {
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (this.grid[i][j] === 0) {
          emptyCells.push({i, j});
        }
      }
    }
  
    if (emptyCells.length > 0) {
      const {i, j} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const fullness = emptyCells.length / (GRID_SIZE * GRID_SIZE);
  
      let tileValue;
      let fourProbability;
  
      switch (CURRENT_DIFFICULTY) {
        case DIFFICULTY.EASY:
          fourProbability = 0.1; // 10% chance of 4
          break;
        case DIFFICULTY.MODERATE:
          fourProbability = this.score < 5000 ? 0.1 + (0.1 * (1 - fullness)) : 0.2;
          break;
        case DIFFICULTY.HARD:
          fourProbability = this.score < 2000 ? 0.3 + (0.2 * (1 - fullness)) : 0.5;
          break;
      }
  
      tileValue = Math.random() < fourProbability ? 4 : 2;
  
      this.grid[i][j] = tileValue;
    }
  }

  updateBoard() {
    this.gameBoard.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const tile = document.createElement('div');
        tile.className = `tile ${this.grid[i][j] ? 'tile-' + this.grid[i][j] : ''}`;
        tile.textContent = this.grid[i][j] || '';
        cell.appendChild(tile);
        this.gameBoard.appendChild(cell);
      }
    }
    this.scoreElement.textContent = this.score;
    this.highScoreElement.textContent = this.highScore;
    this.saveGame();
  }

  handleKeyPress(event) {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      let direction;
      switch (event.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
      }
      this.move(direction);
    }
  }

  move(direction) {
    if (this.gameOver) return;

    this.saveState();
    let moved = false;
    const rotated = direction === 'up' || direction === 'down';
    const reversed = direction === 'right' || direction === 'down';

    // Apply tilt based on direction
    if (!this.isMobile) {
      switch (direction) {
        case 'up':
          this.tiltBoard(-10, 0, 'up');
          break;
        case 'down':
          this.tiltBoard(10, 0, 'down');
          break;
        case 'left':
          this.tiltBoard(0, 10, 'left');
          break;
        case 'right':
          this.tiltBoard(0, -10, 'right');
          break;
      }
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      let row = rotated ? this.grid.map(r => r[i]) : this.grid[i];
      if (reversed) row.reverse();

      const originalRow = [...row];
      const newRow = this.slide(row);

      if (JSON.stringify(originalRow) !== JSON.stringify(newRow)) {
        moved = true;
      }

      if (reversed) newRow.reverse();
      if (rotated) {
        for (let j = 0; j < GRID_SIZE; j++) {
          this.grid[j][i] = newRow[j];
        }
      } else {
        this.grid[i] = newRow;
      }
    }

    if (moved) {
      this.addRandomTile();
      this.updateBoard();
      this.updateHighScore();
      this.updateUndoButton();
      this.isGameOver();
    } else {
      // If no move was made, center the board only if not mobile
      if (!this.isMobile) {
        this.centerBoard();
      }
    }
  }

  slide(row) {
    let newRow = row.filter(tile => tile !== 0);
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        this.score += newRow[i];
        newRow.splice(i + 1, 1);
      }
    }
    while (newRow.length < GRID_SIZE) {
      newRow.push(0);
    }
    return newRow;
  }

  isGameOver() {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (this.grid[i][j] === 0) return false;
        if (i < GRID_SIZE - 1 && this.grid[i][j] === this.grid[i + 1][j]) return false;
        if (j < GRID_SIZE - 1 && this.grid[i][j] === this.grid[i][j + 1]) return false;
      }
    }
    this.gameOver = true;
    this.showGameOverOverlay();
    return true;
  }

  showGameOverOverlay() {
    if (this.gameOverOverlay) {
      this.finalScoreElement.textContent = this.score;
      this.gameOverOverlay.style.display = 'flex';
      this.gameOverUndoButton.style.display = this.can_undo && this.history.length > 0 ? 'inline-block' : 'none';
    }
  }

  hideGameOverOverlay() {
    if (this.gameOverOverlay) {
      this.gameOverOverlay.style.display = 'none';
    }
  }

  undoLastMove() {
    if (this.undo()) {
      this.gameOver = false;
      this.hideGameOverOverlay();
    }
  }

  undo() {
    if (!this.can_undo || this.history.length === 0) return false;

    const previousState = this.history.pop();
    this.grid = previousState.grid;
    this.score = previousState.score;
    this.updateBoard();
    this.updateUndoButton();
    return true;
  }

  updateUndoButton() {
    if (this.undoButton) {
      if (!this.can_undo || this.history.length === 0) {
        this.undoButton.classList.add('disabled');
      } else {
        this.undoButton.classList.remove('disabled');
      }
    }
  }

  updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreElement.textContent = this.highScore;
    }
  }

  saveGame() {
    const gameState = {
      grid: this.grid,
      score: this.score,
      highScore: this.highScore
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }

  loadGame() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      const { grid, score, highScore } = JSON.parse(savedState);
      this.grid = grid;
      this.score = score;
      this.highScore = highScore;
    }
  }

  resetGame() {
    if (confirm('Are you sure you want to reset the game? This action cannot be undone.')) {
      this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
      this.score = 0;
      this.history = [];
      this.gameOver = false;
      this.addRandomTile();
      this.addRandomTile();
      this.updateBoard();
      this.updateUndoButton();
      this.hideGameOverOverlay();
    }
  }

  tiltBoard(x, z, direction) {
    if (!this.can_tilt || this.isMobile) return;
    
    const tiltAmount = 10; // Base tilt amount
    const subtleTiltAmount = 3; // Subtle tilt for perpendicular direction
    
    switch (direction) {
      case 'left':
      case 'right':
        this.targetTiltX = Math.random() * subtleTiltAmount - subtleTiltAmount / 2; // Random subtle up/down tilt
        this.targetTiltZ = x;
        break;
      case 'up':
      case 'down':
        this.targetTiltX = x;
        this.targetTiltZ = Math.random() * subtleTiltAmount - subtleTiltAmount / 2; // Random subtle left/right tilt
        break;
    }

    if (!this.tiltAnimationFrame) {
      this.tiltAnimationFrame = requestAnimationFrame(this.updateTilt.bind(this));
    }
  }

  updateTilt() {
    const easing = 0.2;
    this.tiltX += (this.targetTiltX - this.tiltX) * easing;
    this.tiltZ += (this.targetTiltZ - this.tiltZ) * easing;

    this.gameBoard.style.transform = `rotateX(${this.tiltX}deg) rotateZ(${this.tiltZ}deg)`;

    if (Math.abs(this.targetTiltX - this.tiltX) < 0.1 && Math.abs(this.targetTiltZ - this.tiltZ) < 0.1) {
      this.tiltX = this.targetTiltX;
      this.tiltZ = this.targetTiltZ;
      cancelAnimationFrame(this.tiltAnimationFrame);
      this.tiltAnimationFrame = null;
    } else {
      this.tiltAnimationFrame = requestAnimationFrame(this.updateTilt.bind(this));
    }
  }

  centerBoard() {
    this.targetTiltX = 0;
    this.targetTiltZ = 0;
    if (!this.tiltAnimationFrame) {
      this.tiltAnimationFrame = requestAnimationFrame(this.updateTilt.bind(this));
    }
  }

  saveState() {
    const state = {
      grid: this.grid.map(row => [...row]),
      score: this.score
    };
    this.history.push(state);
    if (this.history.length > MAX_UNDO_LEVELS) {
      this.history.shift();
    }
  }

  setupThemeSwitch() {
    const themeSelect = document.getElementById('theme-select');
    const themeStyle = document.getElementById('theme-style');

    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      themeStyle.href = `themes/${theme}.css`;
      localStorage.setItem('2048-theme', theme);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('2048-theme');
    if (savedTheme) {
      themeSelect.value = savedTheme;
      themeStyle.href = `themes/${savedTheme}.css`;
    }
  }
}

new Game2048();