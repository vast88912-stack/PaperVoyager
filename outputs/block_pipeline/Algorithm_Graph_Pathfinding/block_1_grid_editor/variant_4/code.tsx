import React, { useState, useEffect, useCallback, memo } from 'react';

// Runtime deps: none (using inline SVGs to ensure a flawless zero-config standalone component)

const ROWS = 18;
const COLS = 36;

type Position = { r: number; c: number };
type Tool = 'start' | 'goal' | 'wall' | 'weight' | 'eraser';

interface CellData {
  isWall: boolean;
  weight: number;
}

const INITIAL_START: Position = { r: 9, c: 6 };
const INITIAL_GOAL: Position = { r: 9, c: 29 };

export default function App() {
  const [grid, setGrid] = useState<CellData[][]>(() => {
    const initialGrid: CellData[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({ isWall: false, weight: 1 });
      }
      initialGrid.push(row);
    }
    return initialGrid;
  });

  const [startPos, setStartPos] = useState<Position>(INITIAL_START);
  const [goalPos, setGoalPos] = useState<Position>(INITIAL_GOAL);
  const [currentTool, setCurrentTool] = useState<Tool>('wall');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoverPos, setHoverPos] = useState<Position | null>(null);

  // Global mouse up to prevent getting stuck in draw mode
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const applyTool = useCallback(
    (r: number, c: number, tool: Tool) => {
      if (tool === 'start') {
        if (r === goalPos.r && c === goalPos.c) return;
        setStartPos({ r, c });
        // Erase wall/weight under new start
        setGrid((prev) => {
          if (!prev[r][c].isWall && prev[r][c].weight === 1) return prev;
          const next = [...prev];
          next[r] = [...next[r]];
          next[r][c] = { isWall: false, weight: 1 };
          return next;
        });
      } else if (tool === 'goal') {
        if (r === startPos.r && c === startPos.c) return;
        setGoalPos({ r, c });
        // Erase wall/weight under new goal
        setGrid((prev) => {
          if (!prev[r][c].isWall && prev[r][c].weight === 1) return prev;
          const next = [...prev];
          next[r] = [...next[r]];
          next[r][c] = { isWall: false, weight: 1 };
          return next;
        });
      } else {
        if ((r === startPos.r && c === startPos.c) || (r === goalPos.r && c === goalPos.c)) {
          return; // Don't draw walls/weights over start/goal
        }

        setGrid((prev) => {
          const cell = prev[r][c];
          if (tool === 'wall' && cell.isWall) return prev;
          if (tool === 'weight' && cell.weight === 5) return prev;
          if (tool === 'eraser' && !cell.isWall && cell.weight === 1) return prev;

          const next = [...prev];
          next[r] = [...next[r]];
          if (tool === 'wall') next[r][c] = { isWall: true, weight: 1 };
          else if (tool === 'weight') next[r][c] = { isWall: false, weight: 5 };
          else if (tool === 'eraser') next[r][c] = { isWall: false, weight: 1 };
          return next;
        });
      }
    },
    [startPos, goalPos]
  );

  const handleMouseDown = useCallback(
    (r: number, c: number) => {
      setIsMouseDown(true);
      applyTool(r, c, currentTool);
    },
    [applyTool, currentTool]
  );

  const handleMouseEnter = useCallback(
    (r: number, c: number) => {
      setHoverPos({ r, c });
      if (!isMouseDown) return;
      applyTool(r, c, currentTool);
    },
    [isMouseDown, applyTool, currentTool]
  );

  const clearGrid = () => {
    setGrid((prev) => prev.map((row) => row.map(() => ({ isWall: false, weight: 1 }))));
  };

  const randomizeTerrain = () => {
    setGrid((prev) =>
      prev.map((row, r) =>
        row.map((_, c) => {
          if ((r === startPos.r && c === startPos.c) || (r === goalPos.r && c === goalPos.c)) {
            return { isWall: false, weight: 1 };
          }
          const rand = Math.random();
          if (rand < 0.25) return { isWall: true, weight: 1 };
          if (rand < 0.35) return { isWall: false, weight: 5 };
          return { isWall: false, weight: 1 };
        })
      )
    );
  };

  // Stats
  const wallCount = grid.flat().filter((c) => c.isWall).length;
  const weightCount = grid.flat().filter((c) => c.weight > 1).length;

  return (
    <div className="min-h-screen bg-[#030712] text-cyan-500 font-mono flex flex-col items-center py-8 selection:bg-cyan-900 relative overflow-hidden">
      {/* Cyberpunk background accents */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.05)_0%,transparent_70%)]" />
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(1000%); opacity: 0; }
        }
        .animate-scan {
          animation: scanline 4s linear infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(34, 211, 238, 0.4); }
          50% { box-shadow: 0 0 25px rgba(34, 211, 238, 0.8); }
        }
      `}</style>
      <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-400/30 animate-scan pointer-events-none blur-sm z-50" />

      {/* Header */}
      <div className="z-10 text-center mb-8">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] uppercase tracking-widest mb-2">
          Grid Matrix Editor
        </h1>
        <p className="text-cyan-800 text-sm tracking-widest">
          SYS.TERMINAL // TOPOLOGY_CONFIGURATION
        </p>
      </div>

      {/* Main Interface */}
      <div className="flex flex-col lg:flex-row gap-8 z-10 items-start">
        
        {/* Sidebar Controls */}
        <div className="flex flex-col gap-6 w-full lg:w-64">
          {/* Tool Selector */}
          <div className="bg-[#0a0f1c] border border-cyan-900/50 rounded-xl p-4 shadow-[0_0_20px_rgba(8,145,178,0.1)]">
            <h2 className="text-xs text-cyan-700 uppercase tracking-widest mb-4 font-bold border-b border-cyan-900/50 pb-2">
              Active Tool
            </h2>
            <div className="flex flex-col gap-2">
              <ToolButton
                active={currentTool === 'start'}
                onClick={() => setCurrentTool('start')}
                colorClass="text-green-400 border-green-900 hover:bg-green-950/30"
                activeClass="bg-green-950/50 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>}
                label="Set Start"
              />
              <ToolButton
                active={currentTool === 'goal'}
                onClick={() => setCurrentTool('goal')}
                colorClass="text-pink-500 border-pink-900 hover:bg-pink-950/30"
                activeClass="bg-pink-950/50 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>}
                label="Set Goal"
              />
              <ToolButton
                active={currentTool === 'wall'}
                onClick={() => setCurrentTool('wall')}
                colorClass="text-cyan-500 border-cyan-900 hover:bg-cyan-950/30"
                activeClass="bg-cyan-950/50 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><