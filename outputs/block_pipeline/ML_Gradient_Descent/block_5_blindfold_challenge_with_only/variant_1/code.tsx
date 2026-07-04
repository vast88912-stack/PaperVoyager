import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Target, 
  Zap,
  Activity
} from 'lucide-react';

// --- Math & Game Constants ---
const BOARD_SIZE = 20; // -10 to +10
const WIN_DISTANCE = 0.8;
const MAX_STEPS = 100;

// Helper to generate a random coordinate between -8 and 8
const randCoord = () => (Math.random() * 16) - 8;

export default function App() {
  // --- State ---
  const [target, setTarget] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [path, setPath] = useState<{x: number, y: number}[]>([]);
  const [stepSize, setStepSize] = useState(1.0);
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [steps, setSteps] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  const initGame = useCallback(() => {
    let tx = randCoord();
    let ty = randCoord();
    let px = randCoord();
    let py = randCoord();
    
    // Ensure start is sufficiently far from target
    while (Math.hypot(tx - px, ty - py) < 8) {
      px = randCoord();
      py = randCoord();
    }

    setTarget({ x: tx, y: ty });
    setPosition({ x: px, y: py });
    setPath([{ x: px, y: py }]);
    setWon(false);
    setRevealed(false);
    setSteps(0);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // --- Core Logic ---
  // The function is a simple bowl: f(x,y) = 0.5 * ((x - tx)^2 + (y - ty)^2)
  // Gradient: df/dx = (x - tx), df/dy = (y - ty)
  const gradX = position.x - target.x;
  const gradY = position.y - target.y;
  const distance = Math.hypot(gradX, gradY);
  const currentLoss = 0.5 * (gradX * gradX + gradY * gradY);

  const handleMove = useCallback((dx: number, dy: number) => {
    if (won) return;

    setPosition(prev => {
      const newX = Math.max(-10, Math.min(10, prev.x + dx * stepSize));
      const newY = Math.max(-10, Math.min(10, prev.y + dy * stepSize));
      
      const newPos = { x: newX, y: newY };
      
      setPath(p => [...p, newPos]);
      setSteps(s => s + 1);

      // Check win condition
      if (Math.hypot(newX - target.x, newY - target.y) <= WIN_DISTANCE) {
        setWon(true);
        setRevealed(true);
      }

      return newPos;
    });
  }, [won, stepSize, target]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling only if arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case 'ArrowUp': handleMove(0, 1); break;
        case 'ArrowDown': handleMove(0, -1); break;
        case 'ArrowLeft': handleMove(-1, 0); break;
        case 'ArrowRight': handleMove(1, 0); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // --- Rendering Helpers ---
  // Map math coordinates [-10, 10] to SVG coordinates [0, 400]
  const mapCoord = (val: number, isY: boolean = false) => {
    const scaled = ((val + 10) / 20) * 400;
    return isY ? 400 - scaled : scaled; // Invert Y for standard Cartesian
  };

  // Generate contour lines for the background
  const contours = [2, 4, 6, 8, 10, 12, 14].map(r => (
    <circle
      key={r}
      cx={mapCoord(target.x)}
      cy={mapCoord(target.y, true)}
      r={(r / 20) * 400}
      fill="none"
      stroke="rgba(45, 212, 191, 0.15)"
      strokeWidth="2"
      strokeDasharray="4 4"
      className={`transition-opacity duration-1000 ${revealed ? 'opacity-100' : 'opacity-0'}`}
    />
  ));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-teal-500/30">
      
      {/* Left Column: Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-4 lg:p-8 border-b md:border-b-0 md:border-r border-slate-700/50 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
        
        {/* Win Overlay */}
        {won && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-teal-500 text-slate-900 px-6 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(45,212,191,0.5)] animate-bounce flex items-center gap-2">
            <Target size={20} />
            Minimum Found in {steps} steps!
          </div>
        )}

        <div 
          ref={containerRef}
          className="relative w-full max-w-[600px] aspect-square bg-slate-950 rounded-xl shadow-2xl overflow-hidden border border-slate-800"
        >
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Grid */}
            <g className="opacity-20">
              {Array.from({length: 21}).map((_, i) => (
                <React.Fragment key={i}>
                  <line x1={i*20} y1="0" x2={i*20} y2="400" stroke="#475569" strokeWidth="1" />
                  <line x1="0" y1={i*20} x2="400" y2={i*20} stroke="#475569" strokeWidth="1" />
                </React.Fragment>
              ))}
            </g>

            {/* Landscape Contours (Revealed on Win or Cheat) */}
            {contours}

            {/* Target Minimum (Revealed) */}
            <circle
              cx={mapCoord(target.x)}
              cy={mapCoord(target.y, true)}
              r="6"
              fill="#2dd4bf"
              className={`transition-opacity duration-1000 ${revealed ? 'opacity-100' : 'opacity-0'}`}
              filter="url(#glow)"
            />

            {/* Path Trail */}
            <polyline
              points={path.map(p => `${mapCoord(p.x)},${mapCoord(p.y, true)}`).join(' ')}
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
            />

            {/* Current Position Dot */}
            <circle
              cx={mapCoord(position.x)}
              cy={mapCoord(position.y, true)}
              r="6"
              fill="#e2e8f0"
              filter="url(#glow)"
            />

            {/* Gradient Arrow (Points Uphill) */}
            {!won && (
              <line
                x1={mapCoord(position.x)}
                y1={mapCoord(position.y, true)}
                // Scale arrow length for visual clarity (gradient gets smaller as you approach min)
                x2={mapCoord(position.x + gradX * 0.4)}
                y2={mapCoord(position.y + gradY * 0.4, true)}
                stroke="#f43f5e" // Rose-500
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
                className="transition-all duration-200"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Right Column: Sidebar & Controls */}
      <div className="w-full md:w-96 bg-slate-900 flex flex-col p-6 overflow-y-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
            <EyeOff className="text-teal-400" />
            Blindfold Challenge
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            You are the optimizer. The landscape is hidden. The <span className="text-rose-400 font-semibold">red arrow</span> shows the current <strong>Gradient</strong> (the direction of steepest <em>ascent</em>). 
            <br/><br/>
            To find the minimum, you must step in the <strong>opposite</strong> direction!
          </p>
        </div>

        {/* Stats Panel */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-8 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Activity size={16}/> Current Loss
            </span>
            <span className="font-mono text-teal-400 font-bold">
              {currentLoss.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Zap size={16}/> Gradient (dx, dy)
            </span>
            <span className="font-mono text-rose-400">
              [{gradX.toFixed(1)}, {gradY.toFixed(1)}]
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Target size={16}/> Steps Taken
            </span>
            <span className="font-mono text-slate-200">
              {steps} / {MAX_STEPS}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Learning Rate Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">Step Size (Learning Rate)</label>
              <span className="text-teal-400 font-mono text-sm">{stepSize.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="3.0" 
              step="0.1" 
              value={stepSize}
              onChange={(e) => setStepSize(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          {/* D-Pad */}
          <div className="flex flex-col items-center justify-center gap-2 my-4">
            <button 
              onClick={() => handleMove(0, 1)}
              disabled={won}
              className="p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-slate-700 active:scale-95 transition-all text-teal-400"
            >
              <ArrowUp size={24} />
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => handleMove(-1, 0)}
                disabled={won}
                className="p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-slate-700 active:scale-95 transition-all text-teal-400"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="w-14 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-600"></div>
              </div>
              <button 
                onClick={() => handleMove(1, 0)}
                disabled={won}
                className="p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-slate-700 active:scale-95 transition-all text-teal-400"
              >
                <ArrowRight size={24} />
              </button>
            </div>
            <button 
              onClick={() => handleMove(0, -1)}
              disabled={won}
              className="p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-slate-700 active:scale-95 transition-all text-teal-400"
            >
              <ArrowDown size={24} />
            </button>
          </div>

          <p className="text-center text-xs text-slate-500">
            Tip: You can also use Keyboard Arrow Keys.
          </p>

        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-6 flex gap-3 border-t border-slate-800">
          <button
            onClick={() => setRevealed(!revealed)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
          >
            {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
            {revealed ? 'Hide' : 'Peek'}
          </button>
          
          <button
            onClick={initGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold transition-colors shadow-[0_0_15px_rgba(45,212,191,0.2)]"
          >
            <RefreshCw size={18} />
            Reset
          </button>
        </div>

      </div>
    </div>
  );
}