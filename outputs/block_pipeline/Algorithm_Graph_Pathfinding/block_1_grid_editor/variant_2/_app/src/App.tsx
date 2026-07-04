import React, { useState, useCallback, useEffect } from 'react';

// --- Types ---
type NodeType = {
  row: number;
  col: number;
  isStart: boolean;
  isGoal: boolean;
  isWall: boolean;
  weight: number;
};

type DrawMode = 'wall' | 'weight' | 'start' | 'goal' | 'eraser';

// --- Constants ---
const ROWS = 16;
const COLS = 36;
const DEFAULT_WEIGHT = 5;

// --- Helper: Initialize Grid ---
const createInitialGrid = (): NodeType[][] => {
  const grid: NodeType[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow: NodeType[] = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row,
        col,
        isStart: row === Math.floor(ROWS / 2) && col === Math.floor(COLS / 6),
        isGoal: row === Math.floor(ROWS / 2) && col === Math.floor(COLS - COLS / 6),
        isWall: false,
        weight: 1,
      });
    }
    grid.push(currentRow);
  }
  return grid;
};

// --- Icons ---
const WallIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M3 9h18M9 21V9M15 21V9M3 15h18" />
  </svg>
);

const WeightIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const StartIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const GoalIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const EraserIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

// --- Main Component ---
export default function App() {
  const [grid, setGrid] = useState<NodeType[][]>([]);
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>('wall');

  // Initialize grid on mount
  useEffect(() => {
    setGrid(createInitialGrid());
  }, []);

  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      setIsMousePressed(true);
      updateGrid(row, col, drawMode);
    },
    [drawMode, grid]
  );

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (!isMousePressed) return;
      updateGrid(row, col, drawMode);
    },
    [isMousePressed, drawMode, grid]
  );

  const handleMouseUp = useCallback(() => {
    setIsMousePressed(false);
  }, []);

  // Global mouse up to catch drags outside the grid
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const updateGrid = (row: number, col: number, mode: DrawMode) => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((r) => r.map((node) => ({ ...node })));
      const node = newGrid[row][col];

      // Prevent overwriting start/goal unless moving them or erasing
      const isSpecial = node.isStart || node.isGoal;

      switch (mode) {
        case 'wall':
          if (!isSpecial) {
            node.isWall = true;
            node.weight = 1;
          }
          break;
        case 'weight':
          if (!isSpecial && !node.isWall) {
            node.weight = DEFAULT_WEIGHT;
          }
          break;
        case 'eraser':
          if (!isSpecial) {
            node.isWall = false;
            node.weight = 1;
          }
          break;
        case 'start':
          // Clear old start
          newGrid.forEach((r) => r.forEach((n) => (n.isStart = false)));
          node.isStart = true;
          node.isGoal = false;
          node.isWall = false;
          node.weight = 1;
          break;
        case 'goal':
          // Clear old goal
          newGrid.forEach((r) => r.forEach((n) => (n.isGoal = false)));
          node.isGoal = true;
          node.isStart = false;
          node.isWall = false;
          node.weight = 1;
          break;
      }
      return newGrid;
    });
  };

  const clearGrid = () => {
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((node) => ({
          ...node,
          isWall: false,
          weight: 1,
        }))
      )
    );
  };

  const getCellClasses = (node: NodeType) => {
    let base = 'w-6 h-6 border-[0.5px] transition-all duration-200 select-none flex items-center justify-center text-[10px] font-bold ';

    if (node.isStart) {
      return base + 'bg-green-500 border-green-400 shadow-[0_0_12px_3px_rgba(34,197,94,0.8)] z-10 scale-110 rounded-sm';
    }
    if (node.isGoal) {
      return base + 'bg-pink-600 border-pink-400 shadow-[0_0_12px_3px_rgba(219,39,119,0.8)] z-10 scale-110 rounded-sm';
    }
    if (node.isWall) {
      return base + 'bg-cyan-950 border-cyan-800 shadow-[inset_0_0_8px_rgba(6,182,212,0.3)] scale-95 rounded-sm';
    }
    if (node.weight > 1) {
      return base + 'bg-amber-500/80 border-amber-400 shadow-[0_0_8px_1px_rgba(245,158,11,0.5)] text-amber-950 z-0 rounded-sm';
    }

    // Default empty cell
    return base + 'bg-transparent border-cyan-900/30 hover:bg-cyan-900/40 hover:border-cyan-500/50';
  };

  const tools: { id: DrawMode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'wall', label: 'Draw Wall', icon: <WallIcon />, color: 'hover:text-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.5)]' },
    { id: 'weight', label: 'Add Weight', icon: <WeightIcon />, color: 'hover:text-amber-400 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(251,191,36,0.5)]' },
    { id: 'start', label: 'Set Start', icon: <StartIcon />, color: 'hover:text-green-400 hover:border-green-400 hover:shadow-[0_0_10px_rgba(74,222,128,0.5)]' },
    { id: 'goal', label: 'Set Goal', icon: <GoalIcon />, color: 'hover:text-pink-400 hover:border-pink-400 hover:shadow-[0_0_10px_rgba(244,114,182,0.5)]' },
    { id: 'eraser', label: 'Eraser', icon: <EraserIcon />, color: 'hover:text-purple-400 hover:border-purple-400 hover:shadow-[0_0_10px_rgba(192,132,252,0.5)]' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-cyan-50 font-sans flex flex-col items-center py-10 selection:bg-cyan-900">
      
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          Grid Environment Editor
        </h1>
        <p className="text-cyan-600/80 font-medium text-sm tracking-widest uppercase">
          Configure the simulation matrix
        </p>
      </div>

      {/* Editor Container */}
      <div className="bg-gray-900/50 p-6 rounded-2xl border border-cyan-900/50 shadow-[0_0_40px_-10px_rgba(6,182,212,0.15)] backdrop-blur-xl flex flex-col xl:flex-row gap-8 items-start">
        
        {/* Sidebar Toolbar */}
        <div className="flex flex-col gap-6 w-full xl:w-56 shrink-0">
          
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-widest border-b border-cyan-900/50 pb-2">
              Draw Tools
            </h2>
            <div className="flex xl:flex-col gap-2 flex-wrap">
              {tools.map((tool) => {
                const isActive = drawMode === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setDrawMode(tool.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 font-medium text-sm w-full outline-none
                      ${isActive 
                        ? `bg-gray-800 border-current shadow-[0_0_15px_-3px_currentColor] ${
                            tool.id === 'wall' ? 'text-cyan-400' :
                            tool.id === 'weight' ? 'text-amber-400' :
                            tool.id === 'start' ? 'text-green-400' :
                            tool.id === 'goal' ? 'text-pink-400' :
                            'text-purple-400'
                          }` 
                        : `bg-gray-950/50 border-gray-800 text-gray-400 ${tool.color}`
                      }
                    `}
                  >
                    {tool.icon}
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-auto pt-6 border-t border-cyan-900/50">
            <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-widest">
              Actions
            </h2>
            <button
              onClick={clearGrid}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all duration-300 font-medium text-sm outline-none"
            >
              <TrashIcon />
              <span>Clear Grid</span>
            </button>
          </div>

          {/* Mini Legend / Hint */}
          <div className="mt-4 p-4 rounded-lg bg-gray-950/50 border border-gray-800 text-xs text-gray-500 leading-relaxed">
            <p><strong className="text-cyan-400">Hint:</strong> Click and drag to quickly paint walls or weights across the matrix.</p>
          </div>
        </div>

        {/* Grid Area */}
        <div className="relative p-2 rounded-xl bg-gray-950 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-gray-800 overflow-hidden">
          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500 rounded-tl-lg pointer-events-none opacity-50"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500 rounded-tr-lg pointer-events-none opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500 rounded-bl-lg pointer-events-none opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500 rounded-br-lg pointer-events-none opacity-50"></div>

          <div 
            className="flex flex-col cursor-crosshair"
            onMouseLeave={handleMouseUp}
          >
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((node, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent drag ghosting
                      handleMouseDown(rowIdx, colIdx);
                    }}
                    onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                    className={getCellClasses(node)}
                    title={`Row: ${rowIdx}, Col: ${colIdx}`}
                  >
                    {/* Render weight icon/text if needed, else empty */}
                    {node.weight > 1 && !node.isStart && !node.isGoal ? (
                       <svg className="w-3 h-3 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                         <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                       </svg>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}