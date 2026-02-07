import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaPuzzlePiece, FaSync, FaEye, FaRegEyeSlash, FaHome } from 'react-icons/fa';
import './index.css';
import defaultRobot from './assets/default_robot.jpg';

const Tile = ({ id, currentPos, correctPos, imageSrc, gridSize, onClick, isEmpty }) => {
  if (isEmpty) return <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-md"></div>;

  const bgSize = `${gridSize * 100}%`;

  // currentPos is not needed for bg calculation, correctPos IS.
  // We draw the part of the image corresponding to the original ID (correctPos)
  const row = Math.floor(correctPos / gridSize);
  const col = correctPos % gridSize;

  const xPos = (col / (gridSize - 1)) * 100;
  const yPos = (row / (gridSize - 1)) * 100;

  return (
    <div
      onClick={onClick}
      className="w-full h-full bg-cover rounded-md cursor-pointer transition-transform hover:scale-[1.02] shadow-sm hover:shadow-md duration-200"
      style={{
        backgroundImage: `url(${imageSrc})`,
        backgroundSize: bgSize,
        backgroundPosition: `${xPos}% ${yPos}%`
      }}
    />
  );
};

const Modal = ({ show, onPlayAgain, moves, time }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-slideIn">
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all duration-300">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-indigo-600 mb-2">Puzzle Solved!</h2>
        <p className="text-gray-500 mb-6">Fantastic work! You completed the puzzle.</p>

        <div className="flex justify-center space-x-8 mb-8 bg-gray-50 p-4 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time</span>
            <span className="text-xl font-extrabold text-gray-800">{time}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Moves</span>
            <span className="text-xl font-extrabold text-gray-800">{moves}</span>
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

function App() {
  const [imageSrc, setImageSrc] = useState(defaultRobot); // Use imported image
  const [gridSize, setGridSize] = useState(3);
  const [gameState, setGameState] = useState([]); // Array of tile IDs
  const [emptyIndex, setEmptyIndex] = useState(-1);
  const [isGameActive, setIsGameActive] = useState(false);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const timerRef = useRef(null);

  // --- Dropzone ---
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
        setIsGameActive(false); // Reset to "Game Setup/Start" state
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  // --- Game Logic ---

  useEffect(() => {
    if (imageSrc && !isGameActive) {
      startGame();
    }
  }, [imageSrc, gridSize]); // Auto restart if grid changes

  // Timer
  useEffect(() => {
    if (isGameActive && !isSolved) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isGameActive, isSolved]);

  const startGame = () => {
    // Generate solved state: [0, 1, 2, ... N-1]
    const totalTiles = gridSize * gridSize;
    let newGameState = Array.from({ length: totalTiles }, (_, i) => i);
    let currentEmptyIndex = totalTiles - 1;

    // Shuffle
    // To ensure solvability, we simulate moves from the solved state
    let previous = -1;
    const shuffleSteps = gridSize * 20; // 3 -> 60, 5 -> 100

    for (let i = 0; i < shuffleSteps; i++) {
      const adjacent = getAdjacent(currentEmptyIndex, gridSize);
      const valid = adjacent.filter(idx => idx !== previous);

      if (valid.length > 0) {
        const next = valid[Math.floor(Math.random() * valid.length)];
        // Swap
        [newGameState[currentEmptyIndex], newGameState[next]] = [newGameState[next], newGameState[currentEmptyIndex]];
        previous = currentEmptyIndex;
        currentEmptyIndex = next;
      }
    }

    setGameState(newGameState);
    setEmptyIndex(currentEmptyIndex);
    setMoves(0);
    setTime(0);
    setIsSolved(false);
    setIsGameActive(true);
  };

  const getAdjacent = (index, size) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const adjacent = [];

    if (row > 0) adjacent.push(index - size);
    if (row < size - 1) adjacent.push(index + size);
    if (col > 0) adjacent.push(index - 1);
    if (col < size - 1) adjacent.push(index + 1);

    return adjacent;
  };

  const handleTileClick = (index) => {
    if (!isGameActive || isSolved) return;

    const adjacent = getAdjacent(emptyIndex, gridSize);
    if (adjacent.includes(index)) {
      const newState = [...gameState];
      // Swap
      [newState[index], newState[emptyIndex]] = [newState[emptyIndex], newState[index]];

      setGameState(newState);
      setEmptyIndex(index);
      setMoves(m => m + 1);

      // Check Win
      const isWinning = newState.every((val, idx) => val === idx);
      if (isWinning) {
        setIsSolved(true);
        setIsGameActive(false);
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetToUpload = () => {
    setImageSrc(null);
    setIsGameActive(false);
    setIsSolved(false);
  };

  // --- Render ---

  if (!imageSrc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center animate-slideIn">
          <div className="mb-6 flex justify-center items-center gap-2">
            <FaPuzzlePiece className="text-4xl text-indigo-500" />
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Slide <span className="text-indigo-500">Puzzle</span></h1>
          </div>

          <div
            {...getRootProps()}
            className={`border-3 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400 group ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform">
              <FaCloudUploadAlt className="text-4xl text-indigo-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Drop your character here</p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Select Difficulty</p>
            <div className="flex gap-2 justify-center">
              {[3, 4, 5].map(size => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${gridSize === size
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 font-outfit">

      {/* Header */}
      <header className="w-full max-w-xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <FaPuzzlePiece className="text-2xl text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-800">Slide Puzzle</h1>
        </div>
        <button
          onClick={resetToUpload}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-600 hover:text-indigo-600 hover:shadow-md transition-all"
        >
          <FaHome /> New Game
        </button>
      </header>

      {/* Main Game Card */}
      <main className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden p-6 md:p-8 animate-slideIn">

        {/* Stats Bar */}
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-6 shadow-inner">
          <div className="text-center">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Moves</span>
            <span className="text-xl font-bold text-gray-800">{moves}</span>
          </div>

          <div className="text-center w-24">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Time</span>
            <span className="text-xl font-bold text-gray-800 font-mono">{formatTime(time)}</span>
          </div>

          <button
            onMouseEnter={() => setShowOriginal(true)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
          >
            {showOriginal ? <FaEye /> : <FaRegEyeSlash />} Hint
          </button>
        </div>

        {/* Puzzle Board Container */}
        <div className="relative w-full aspect-square bg-gray-200 rounded-xl overflow-hidden border-4 border-gray-100 shadow-inner">
          {/* The Grid */}
          <div
            className="w-full h-full grid p-1 gap-1"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize}, 1fr)`
            }}
          >
            {gameState.map((tileId, index) => (
              <Tile
                key={`${index}-${tileId}`} // Key by position and value to force re-render? No, better unique keys? But tileId is unique.
                // Actually, index changes on swap. Tile ID moves.
                // If we use index as key, React reuses DOM nodes (good for simple grid).
                // If we use tileId as key, React moves DOM nodes (better for animation if we add framer-motion later).
                id={tileId}
                currentPos={index}
                correctPos={tileId}
                imageSrc={imageSrc}
                gridSize={gridSize}
                onClick={() => handleTileClick(index)}
                isEmpty={tileId === gridSize * gridSize - 1} // The last tile ID is the empty one
              />
            ))}
          </div>

          {/* Original Preview Overlay */}
          <div
            className={`absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 pointer-events-none z-10 ${showOriginal ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={imageSrc} alt="Original" className="max-w-[90%] max-h-[90%] rounded-lg shadow-2xl" />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex justify-between items-center">
          <div className="flex gap-2">
            {[3, 4, 5].map(size => (
              <button
                key={size}
                onClick={() => {
                  setGridSize(size);
                  setMoves(0);
                  setTime(0);
                  // Effect will trigger restart
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${gridSize === size
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {size}x{size}
              </button>
            ))}
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-2 bg-orange-100 text-orange-600 rounded-xl font-bold hover:bg-orange-200 transition-colors"
          >
            <FaSync className={isGameActive && moves === 0 ? "animate-spin" : ""} /> Shuffle
          </button>
        </div>
      </main>

      <Modal
        show={isSolved}
        onPlayAgain={startGame}
        moves={moves}
        time={formatTime(time)}
      />

    </div>
  );
}

export default App;
