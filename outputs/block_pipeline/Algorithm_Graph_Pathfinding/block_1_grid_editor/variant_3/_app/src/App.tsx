import React, { useState, useCallback, useEffect } from 'react';
import { 
  Crosshair, 
  MapPin, 
  Square, 
  Hexagon, 
  Eraser, 
  RefreshCw, 
  Trash2, 
  Dices
} from 'lucide-react';

const ROWS = 20;
const COLS = 40;

type ToolMode = 'start' | 'target' | 'wall' | 'weight' | 'eraser';
type CellState = 'empty' | 'wall' | 'weight';
type Position = { r: number; c: number };

export default function App() {
  const [grid, setGrid] = useState<CellState[][]>(() => 
    Array.from({ length: ROWS }, () => Array(COLS).fill('empty'))
  );
  
  const [startPos, setStartPos] = useState<Position>({ r: 9, c: 5 });
  const [targetPos, setTargetPos] = useState<Position>({ r: 9, c: 34 });
  const [mode, setMode] = useState<ToolMode>('wall');
  const [isDrawing, setIsDrawing] = useState(false);

  // Prevent default drag behaviors that interrupt drawing
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragstart', handleDragStart);
    return () => document.removeEventListener('dragstart', handleDragStart);
  }, []);

  const applyTool = useCallback((r: number, c: number) => {
    if (mode === 'start') {
      if (!(targetPos.r === r && targetPos.c === c)) {
        setStartPos({ r, c });
      }
      return;
    }
    if (mode === 'target') {
      if (!(startPos.r === r && startPos.c === c)) {
        setTargetPos({ r, c });
      }
      return;
    }

    // Don't overwrite start/target with walls/weights
    if ((r === startPos.r && c === startPos.c) || (r === targetPos.r && c === targetPos.c)) {
      return;
    }

    setGrid((prev) => {
      const next = [...prev];
      next[r] = [...next[r]];
      if (mode === 'wall') next[r][c] = 'wall';
      else if (mode === 'weight') next[r][c] = 'weight';
      else if (mode === 'eraser') next[r][c] = 'empty';
      return next;
    });
  }, [mode, startPos, targetPos]);

  const handleMouseDown = (r: number, c: number) => {
    setIsDrawing(true);
    applyTool(r, c);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isDrawing) {
      applyTool(r, c);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearGrid = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill('empty')));
  };

  const randomizeGrid = () => {
    setGrid((prev) => {
      const next = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r === startPos.r && c === startPos.c) || (r === targetPos.r && c === targetPos.c)) {
            continue;
          }
          const rand = Math.random();
          if (rand < 0.25) next[r][c] = 'wall';
          else if (rand < 0.35) next[r][c] = 'weight';
          else next[r][c] = 'empty';
        }
      }
      return next;
    });
  };

  // Render helpers
  const getCellClasses = (r: number, c: number) => {
    const isStart = r === startPos.r && c === startPos.c;
    const isTarget = r === targetPos.r && c === targetPos.c;
    const state = grid[r][c];

    let baseClasses = "w-full h-full border-[0.5px] border-white/5 transition-all duration-200 select-none ";
    
    if (isStart) {
      return baseClasses + "bg-green-400 shadow-[0_0_15px_#4ade80] z-20 scale-110 rounded-sm";
    }
    if (isTarget) {
      return baseClasses + "bg-pink-500 shadow-[0_0_15px_#ec4899] z-20 scale-110 rounded-sm";
    }
    
    if (state === 'wall') {
      return baseClasses + "bg-cyan-400 shadow-[0_0_10px_#22d3ee] scale-95 rounded-sm z-10";
    }
    if (state === 'weight') {
      return baseClasses + "bg-fuchsia-900 border-fuchsia-500 shadow-[inset_0_0_8px_#c026d3] opacity-80 z-0";
    }
    
    // Empty state
    return baseClasses + "hover:bg-white/10";
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 flex flex-col items-center justify-center p-8 font-sans selection:bg-cyan-500/30">
      
      {/* Header / Title */}
      <div className="w-full max-w-[1200px] flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-pink-500 tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
            NEON GRID EDITOR
          </h1>
          <p className="text-slate-400 mt-2 tracking-wide text-sm font-medium uppercase opacity-80">
            Configure Start, Target, Walls, and Weights
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-3">
          <button 
            onClick={randomizeGrid}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold transition-all hover:border-fuchsia-400 hover:text-fuchsia-300 hover:shadow-[0_0_15px_rgba(232,121,249,0.3)]"
          >
            <Dices size={16} /> Randomize
          </button>
          <button 
            onClick={clearGrid}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold transition-all hover:border-red-400 hover:text-red-300 hover:shadow-[0_0_15px_rgba(248,113,113,0.3)]"
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>

      {/* Main Interface Layout */}
      <div className="w-full max-w-[1200px] flex gap-8 h-[600px]">
        
        {/* Toolbar Sidebar */}
        <div className="w-64 flex flex-col gap-4 p-5 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Tools</h2>
          
          <ToolButton 
            active={mode === 'start'} 
            onClick={() => setMode('start')}
            icon={<MapPin size={20} />}
            label="Set Start"
            activeColor="bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.2)]"
          />
          <ToolButton 
            active={mode === 'target'} 
            onClick={() => setMode('target')}
            icon={<Crosshair size={20} />}
            label="Set Target"
            activeColor="bg-pink-500/20 text-pink-400 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
          />
          <ToolButton 
            active={mode === 'wall'} 
            onClick={() => setMode('wall')}
            icon={<Square size={20} />}
            label="Draw Wall"
            activeColor="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          />
          <ToolButton 
            active={mode === 'weight'} 
            onClick={() => setMode('weight')}
            icon={<Hexagon size={20} />}
            label="Add Weight"
            activeColor="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]"
          />
          <div className="h-px w-full bg-white/10 my-2" />
          <ToolButton 
            active={mode === 'eraser'} 
            onClick={() => setMode('eraser')}
            icon={<Eraser size={20} />}
            label="Eraser"
            activeColor="bg-slate-500/20 text-slate-200 border-slate-500/50 shadow-[0_0_15px_rgba(148,163,184,0.2)]"
          />

          <div className="mt-auto pt-6 border-t border-white/10 text-xs text-slate-500 leading-relaxed">
            <span className="block mb-2 text-cyan-400 font-semibold tracking-wide">PRO TIP</span>
            Click and drag on the grid to continuously paint walls, weights, or erase cells.
          </div>
        </div>

        {/* Grid Canvas */}
        <div 
          className="flex-1 bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.1)] relative"
          onMouseLeave={handleMouseUp}
        >
          {/* Subtle grid background glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)]" />

          <div 
            className="w-full h-full grid relative z-10 p-4"
            style={{ 
              gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gap: '1px'
            }}
          >
            {grid.map((row, r) => 
              row.map((_, c) => (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                  className={getCellClasses(r, c)}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponent for Toolbar Buttons
interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
}

function ToolButton({ active, onClick, icon, label, activeColor }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium
        ${active 
          ? activeColor 
          : 'bg-transparent text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200'}
      `}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="tracking-wide">{label}</span>
    </button>
  );
}