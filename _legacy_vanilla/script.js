document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const gameArea = document.getElementById('gameArea');
    const puzzleBoard = document.getElementById('puzzleBoard');
    const moveCounterEl = document.getElementById('moveCounter');
    const timerEl = document.getElementById('timer');
    const hintBtn = document.getElementById('hintBtn');
    const originalPreview = document.getElementById('originalPreview');
    const previewImage = document.getElementById('previewImage');
    const restartBtn = document.getElementById('restartBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const winModal = document.getElementById('winModal');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const finalTimeEl = document.getElementById('finalTime');
    const finalMovesEl = document.getElementById('finalMoves');
    const gridBtns = document.querySelectorAll('.grid-btn');

    // --- State ---
    let gridSize = 3;
    let imageSrc = null;
    let tiles = []; // Current state of the board (array of tile objects)
    let emptyTileIndex = -1;
    let moves = 0;
    let time = 0;
    let timerInterval = null;
    let isGameActive = false;
    let isSolved = false;

    // --- Event Listeners ---

    // Grid Selection
    gridBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.grid-btn.active').classList.remove('active');
            e.target.classList.add('active');
            gridSize = parseInt(e.target.dataset.size);
            if (imageSrc) startGame(imageSrc);
        });
    });

    // Image Upload (File Input)
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });

    // Image Upload (Drag & Drop)
    dropZone.addEventListener('click', () => imageInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    // Game Controls
    restartBtn.addEventListener('click', () => {
        if (imageSrc) startGame(imageSrc);
    });

    newGameBtn.addEventListener('click', () => {
        resetGame();
        gameArea.style.display = 'none';
        dropZone.style.display = 'block';
        imageInput.value = ''; // Reset input
    });

    hintBtn.addEventListener('mouseenter', () => {
        originalPreview.classList.add('active');
    });

    hintBtn.addEventListener('mouseleave', () => {
        originalPreview.classList.remove('active');
    });

    // Also toggle on click for mobile/tablet
    hintBtn.addEventListener('click', () => {
        originalPreview.classList.toggle('active');
    });

    playAgainBtn.addEventListener('click', () => {
        winModal.classList.remove('active');
        if (imageSrc) startGame(imageSrc); // Restart with same settings
    });

    // --- Functions ---

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imageSrc = e.target.result;
            dropZone.style.display = 'none';
            gameArea.style.display = 'flex';
            previewImage.src = imageSrc;
            startGame(imageSrc);
        };
        reader.readAsDataURL(file);
    }

    function initBoard() {
        puzzleBoard.innerHTML = '';
        puzzleBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        puzzleBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        tiles = [];
        const totalTiles = gridSize * gridSize;

        // We need the computed size of the board to set background size correctly
        // But since it's responsive, we use percentages for background position usually.
        // However, for correct slicing, percentage is easier.
        // Background-size should be 100% * gridSize (wait, no. 100% covers the tile. 
        // We want the whole image to cover the whole board).
        // If the board is 300px, and we have 3 tiles, each tile is 100px.
        // The background image should be sized to cover the *entire board*.
        // So background-size = (gridSize * 100)% 

        const bgSize = `${gridSize * 100}%`;

        for (let i = 0; i < totalTiles; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');

            // Set initial correct position data
            tile.dataset.correctIndex = i;
            tile.dataset.currentIndex = i;

            // Calculate background position
            // x% = (col / (gridSize - 1)) * 100
            // y% = (row / (gridSize - 1)) * 100
            // Special handling for 1x1? No, min is 3x3.

            const xPos = (col / (gridSize - 1)) * 100;
            const yPos = (row / (gridSize - 1)) * 100;

            tile.style.backgroundImage = `url(${imageSrc})`;
            tile.style.backgroundSize = bgSize;
            tile.style.backgroundPosition = `${xPos}% ${yPos}%`;

            // The last tile is the empty one
            if (i === totalTiles - 1) {
                tile.classList.add('empty');
                tile.style.backgroundImage = 'none'; // Clear image for empty tile
                emptyTileIndex = i;
            } else {
                tile.addEventListener('click', () => handleTileClick(i));
            }

            tiles.push({
                element: tile,
                currentIndex: i, // Where it is currently on the board
                correctIndex: i  // Where it should be
            });

            puzzleBoard.appendChild(tile);
        }

        // Update tiles array to match DOM order? No, keep logic separate if possible.
        // Actually, let's keep a simple state array of indices.
        // state[0] = 5 means the tile at position 0 is actually tile #5.

        // Let's refactor slightly for easier shuffling.
        // We will just manipulate the DOM order is messy. 
        // Better: render based on state array.
    }

    // --- Logic-based Rendering Approach ---
    let gameState = []; // Array storing which tile (ID) is at which position (Index)

    function startGame(img) {
        resetGame();

        // Create the tiles data structure
        const totalTiles = gridSize * gridSize;
        gameState = Array.from({ length: totalTiles }, (_, i) => i); // [0, 1, 2, ... 8]
        emptyTileIndex = totalTiles - 1; // Last one is empty

        // Shuffle
        shuffleBoard();

        // Render
        renderBoard();

        isGameActive = true;
        isSolved = false;

        // Start timer on first interaction? Or immediately?
        // User asked for "Timer". Usually starts immediately or after first move. 
        // Let's start immediately after shuffle.
        startTimer();
    }

    function resetGame() {
        stopTimer();
        moves = 0;
        time = 0;
        moveCounterEl.innerText = '0';
        timerEl.innerText = '00:00';
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            time++;
            const minutes = Math.floor(time / 60).toString().padStart(2, '0');
            const seconds = (time % 60).toString().padStart(2, '0');
            timerEl.innerText = `${minutes}:${seconds}`;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    function shuffleBoard() {
        // Shuffle by simulating valid moves to ensure solvability
        // 100 * gridSize moves should be enough to randomize well
        const shuffleMoves = gridSize * 20;

        let previousIndex = -1;

        for (let i = 0; i < shuffleMoves; i++) {
            const adjacent = getAdjacentIndices(emptyTileIndex);
            // Filter out trying to move back to the immediately previous state to allow more mixing
            const valid = adjacent.filter(idx => idx !== previousIndex);

            if (valid.length > 0) {
                const randomNext = valid[Math.floor(Math.random() * valid.length)];

                // Swap in state
                swapTilesInState(randomNext, emptyTileIndex); // This updates emptyTileIndex
                previousIndex = emptyTileIndex; // The previous empty index is where we just came from
            }
        }

        // Ensure the empty tile ends up in the last position? Not strictly necessary, but looks cleaner.
        // If we want to force it to corner, we can, but random position is fine.
    }

    function getAdjacentIndices(index) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const adjacent = [];

        // Up
        if (row > 0) adjacent.push(index - gridSize);
        // Down
        if (row < gridSize - 1) adjacent.push(index + gridSize);
        // Left
        if (col > 0) adjacent.push(index - 1);
        // Right
        if (col < gridSize - 1) adjacent.push(index + 1);

        return adjacent;
    }

    function swapTilesInState(idx1, idx2) {
        [gameState[idx1], gameState[idx2]] = [gameState[idx2], gameState[idx1]];
        // Update emptyTileIndex if one of them was the empty tile
        // We know one of them IS the empty tile for a valid move
        if (gameState[idx1] === gridSize * gridSize - 1) emptyTileIndex = idx1;
        else if (gameState[idx2] === gridSize * gridSize - 1) emptyTileIndex = idx2;
    }

    function renderBoard() {
        puzzleBoard.innerHTML = '';
        puzzleBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        puzzleBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

        // Calculate background size once
        const bgSize = `${gridSize * 100}%`;

        gameState.forEach((tileId, positionIndex) => {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');

            // Calculate where this tile *should* be in the original image
            // tileId gives us the original row/col
            // positionIndex gives us the current DOM position (handled by grid order)

            if (tileId === gridSize * gridSize - 1) {
                tile.classList.add('empty');
            } else {
                // Calculate background position based on Original ID
                // Original Row/Col
                const origRow = Math.floor(tileId / gridSize);
                const origCol = tileId % gridSize;

                const xPos = (origCol / (gridSize - 1)) * 100;
                const yPos = (origRow / (gridSize - 1)) * 100;

                tile.style.backgroundImage = `url(${imageSrc})`;
                tile.style.backgroundSize = bgSize;
                tile.style.backgroundPosition = `${xPos}% ${yPos}%`;

                // Click to move
                tile.addEventListener('click', () => handleTileClick(positionIndex));
            }

            puzzleBoard.appendChild(tile);
        });
    }

    function handleTileClick(clickedIndex) {
        if (!isGameActive) return;

        // Check if adjacent to empty tile
        const adjacent = getAdjacentIndices(emptyTileIndex);
        if (adjacent.includes(clickedIndex)) {
            // Move is valid
            swapTilesInState(clickedIndex, emptyTileIndex);

            // Update UI
            // To animate, complex DOM manipulation is needed (FLIP technique).
            // For this version, we'll re-render for simplicity and robustness.
            // If the user wants animations later, we can add them.
            renderBoard();

            moves++;
            moveCounterEl.innerText = moves;

            checkWin();
        }
    }

    function checkWin() {
        // Check if gameState matches sorted [0, 1, 2, ...]
        const isWinning = gameState.every((val, index) => val === index);

        if (isWinning) {
            isGameActive = false;
            isSolved = true;
            stopTimer();
            showWinModal();
        }
    }

    function showWinModal() {
        finalTimeEl.innerText = timerEl.innerText;
        finalMovesEl.innerText = moves;

        // Small confetti or simply show modal
        // Let's create a simple confetti effect with the modal

        setTimeout(() => {
            winModal.classList.add('active');
        }, 300);
    }
});
