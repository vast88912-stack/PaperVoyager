import React, { useState, useCallback, useEffect } from 'react';

// Runtime deps: react

const ROWS = 20;
const COLS = 35;

type NodeType = 'empty' | 'wall' | 'weight';
type Tool = 'wall' | 'weight' | 'eraser' | 'start' | 'goal';

interface NodeData {
  row: number;
  col: number;
  type: NodeType;
}

export default function App() {
  const [grid, setGrid] = useState<NodeData[][]>([]);
  const [startPos, setStartPos] = useState({ row: Math.floor(ROWS / 2), col: Math.floor(COLS / 6) });
  const [goalPos, setGoalPos] = useState({ row: Math.floor(ROWS / 2), col: Math.floor((COLS / 6) * 5) });
  const [activeTool, setActiveTool] = useState<Tool>('wall');
  const [isMousePressed, setIsMousePressed] = useState(false);

  // Initialize grid
  useEffect(() => {
    const initialGrid: NodeData[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const currentRow: NodeData[] = [];
      for (let c = 0; c < COLS; c++) {
        currentRow.push({ row: r, col: c, type: 'empty' });
      }
      initialGrid.push(currentRow);
    }
    setGrid(initialGrid);
  }, []);

  const handleMouseDown = (row: number, col: number) => {
    setIsMousePressed(true);
    applyTool(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isMousePressed) return;
    applyTool(row, col);
  };

  const handleMouseUp = () => {
    setIsMousePressed(false);
  };

  // Global mouse up to catch drags outside the grid
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const applyTool = useCallback((row: number, col: number) => {
    if (activeTool === 'start') {
      if (grid[row][col].type !== 'wall') setStartPos({ row, col });
      return;
    }
    if (activeTool === 'goal') {
      if (grid[row][col].type !== 'wall') setGoalPos({ row, col });
      return;
    }

    // Prevent overwriting start/goal with walls/weights
    if ((row === startPos.row && col === startPos.col) || (row === goalPos.row && col === goalPos.col)) {
      return;
    }

    setGrid((prevGrid) => {
      const newGrid = [...prevGrid];
      const newRow = [...newGrid[row]];
      const node = { ...newRow[col] };

      if (activeTool === 'wall') node.type = 'wall';
      else if (activeTool === 'weight') node.type = 'weight';
      else if (activeTool === 'eraser') node.type = 'empty';

      newRow[col] = node;
      newGrid[row] = newRow;
      return newGrid;
    });
  }, [activeTool, startPos, goalPos, grid]);

  const clearGrid = () => {
    setGrid((prev) => prev.map(row => row.map(node => ({ ...node, type: 'empty' }))));
  };

  const generateRandomMaze = () => {
    setGrid((prev) => prev.map((row, r) => row.map((node, c) => {
      // Don't place walls on start/goal
      if ((r === startPos.row && c === startPos.col) || (r === goalPos.row && c === goalPos.col)) {
        return { ...node, type: 'empty' };
      }
      return { ...node, type: Math.random() < 0.25 ? 'wall' : 'empty' };
    })));
  };

  const getCellClasses = (row: number, col: number, type: NodeType) => {
    const isStart = row === startPos.row && col === startPos.col;
    const isGoal = row === goalPos.row && col === goalPos.col;

    let base = "w-6 h-6 border-[0.5px] transition-all duration-200 ease-in-out select-none ";

    if (isStart) {
      return base + "bg-green-400 border-green-200 shadow-[0_0_15px_rgba(74,222,128,1)] z-10 scale-110 rounded-sm";
    }
    if (isGoal) {
      return base + "bg-pink-500 border-pink-200 shadow-[0_0_15px_rgba(236,72,153,1)] z-10 scale-110 rounded-sm";
    }

    switch (type) {
      case 'wall':
        return base + "bg-slate-800 border-indigo-500/50 shadow-[0_0_10px_rgba(79,70,229,0.4)_inset] scale-95 rounded-sm";
      case 'weight':
        return base + "bg-amber-500/30 border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
      case 'empty':
      default:
        return base + "bg-transparent border-cyan-900/30 hover:bg-cyan-900/40 hover:border-cyan-500/50";
    }
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      id: 'wall', label: 'Draw Wall', color: 'indigo',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    { 
      id: 'weight', label: 'Add Weight', color: 'amber',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
    },
    { 
      id: 'eraser', label: 'Eraser', color: 'cyan',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    },
    { 
      id: 'start', label: 'Move Start', color: 'green',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    { 
      id: 'goal', label: 'Move Goal', color: 'pink',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50 font-mono flex flex-col items-center py-12 px-4 selection:bg-cyan-900">
      
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          GRID EDITOR
        </h1>
        <p className="text-cyan-600/80 text-sm uppercase tracking-widest">
          Design your environment • Set parameters • Prepare for routing
        </p>
      </div>

      {/* Main Interface */}
      <div className="flex flex-col xl:flex-row gap-8 items-start max-w-7xl w-full justify-center">
        
        {/* Sidebar Controls */}
        <div className="w-full xl:w-64 flex flex-col gap-6 bg-slate-900/50 p-6 rounded-xl border border-cyan-900/50 shadow-[0_0_30px_rgba(8,145,178,0.05)] backdrop-blur-sm">
          
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-cyan-500 tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Active Tool
            </h2>
            
            <div className="flex flex-col gap-2">
              {tools.map((tool) => {
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 border ${
                      isActive 
                        ? `bg-${tool.color}-500/20 border-${tool.color}-400 text-${tool.color}-300 shadow-[0_0_15px_var(--tw-shadow-color)] shadow-${tool.color}-500/30` 
                        : `bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 hover:border-cyan-800`
                    }`}
                  >
                    {tool.icon}
                    {tool.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent my-2"></div>

          <div className="space-y-3">
            <h2 className="text-xs font-bold text-cyan-500 tracking-widest uppercase mb-4">Actions</h2>
            <button 
              onClick={generateRandomMaze}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-slate-950/50 border border-indigo-900/50 text-indigo-300 hover:bg-indigo-900/30 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Random Walls
            </button>
            <button 
              onClick={clearGrid}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-slate-950/50 border border-red-900/50 text-red-400 hover:bg-red-900/30 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear Grid
            </button>
          </div>

        </div>

        {/* Grid Container */}
        <div className="relative p-1 bg-slate-900/80 rounded-xl border border-cyan-900/50 shadow-[0_0_40px_rgba(8,145,178,0.1)] backdrop-blur-md overflow-hidden">
          {/* Grid Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>
          
          <div 
            className="relative grid gap-[1px] bg-cyan-950/30 p-[1px] rounded-lg"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            onMouseLeave={handleMouseUp}
          >
            {grid.map((row, rIdx) => 
              row.map((node, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onMouseDown={() => handleMouseDown(rIdx, cIdx)}
                  onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                  className={getCellClasses(rIdx, cIdx, node.type)}
                />
              ))
            )}
          </div>
        </div>

      </div>

      {/* Footer Legend */}
      <div className="mt-12 flex flex-wrap justify-center gap-8 text-xs text-cyan-600/80 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div> Start Node
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div> Goal Node
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-slate-800 border border-indigo-500/50"></div> Wall (Impassable)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-400/80"></div> Weight (Cost +5)
        </div>
      </div>

    </div>
  );
}