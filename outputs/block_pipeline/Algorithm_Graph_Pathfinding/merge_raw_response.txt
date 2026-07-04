import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Terminal, Play, Cpu, Waypoints, ChevronRight, Activity, Pause, RotateCcw, StepForward, StepBack, Shuffle, Trash2, LayoutGrid, Compass, BarChart3 } from 'lucide-react';

// --- Shared Hooks & Helpers ---

const useTypewriter = (text: string, speed: number = 30, delay: number = 0) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (started && count < text.length) {
      const timeout = setTimeout(() => setCount((c) => c + 1), speed);
      return () => clearTimeout(timeout);
    }
  }, [count, text, speed, started]);

  return text.slice(0, count);
};

// --- Block 1: Hero Module ---

const HeroModule = ({ onStart }: { onStart: () => void }) => {
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [systemReady, setSystemReady] = useState(false);

  const missionText = "MISSION: Visualize and analyze advanced pathfinding algorithms. Compare BFS, Dijkstra, A*, and Bidirectional Search in real-time. Map the unknown. Optimize the frontier.";
  const typedMission = useTypewriter(missionText, 25, 800);

  useEffect(() => {
    if (isBooting) {
      const interval = setInterval(() => {
        setBootProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setSystemReady(true);
              setTimeout(onStart, 500);
            }, 400);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isBooting, onStart]);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 font-sans overflow-hidden relative flex items-center justify-center selection:bg-cyan-500/30">
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scanline { animation: scanline 6s linear infinite; }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px -5px rgba(34, 211, 238, 0.4); }
          50% { box-shadow: 0 0 30px 5px rgba(34, 211, 238, 0.7); }
        }
        .neon-box { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>

      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(circle at center, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 80%)'
        }}
      />
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="w-full h-32 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-scanline" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <div className={`relative z-10 w-full max-w-3xl p-8 transition-all duration-1000 ${isBooting && systemReady ? 'scale-105 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
        <div className="flex items-center justify-between mb-12 text-xs font-mono tracking-widest text-cyan-500/70">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>SYS.STATUS: <span className="text-cyan-400">ONLINE</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span>SEED: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm font-mono mb-4">
            <Cpu className="w-4 h-4" />
            <span>ALGORITHM VISUALIZER v2.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-600 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            PATHFINDING <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">PLAYGROUND</span>
          </h1>
        </div>

        <div className="h-24 mb-12">
          <p className="text-lg md:text-xl text-slate-400 font-mono leading-relaxed border-l-2 border-cyan-500/50 pl-6">
            {typedMission}
            <span className="inline-block w-2 h-5 ml-1 bg-cyan-400 animate-pulse align-middle" />
          </p>
        </div>

        <div className="relative">
          {!isBooting ? (
            <button
              onClick={() => setIsBooting(true)}
              className="group relative inline-flex items-center gap-4 px-8 py-4 bg-slate-900/80 border border-cyan-500/50 rounded-none overflow-hidden transition-all hover:bg-cyan-950/50 neon-box"
            >
              <div className="absolute inset-0 w-0 bg-cyan-500/20 transition-all duration-500 ease-out group-hover:w-full" />
              <div className="relative flex items-center gap-3 text-cyan-400 font-mono text-lg font-bold tracking-widest uppercase">
                <Waypoints className="w-6 h-6 group-hover:animate-spin" style={{ animationDuration: '3s' }} />
                <span>Initialize Grid</span>
                <ChevronRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </div>
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
            </button>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <div className="flex justify-between text-sm font-mono text-cyan-400">
                <span>BOOTING ENVIRONMENT...</span>
                <span>{Math.min(bootProgress, 100)}%</span>
              </div>
              <div className="h-1 w-full bg-slate-800 overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-150 ease-out"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-slate-500 h-4">
                {bootProgress < 30 && "> Loading heuristics..."}
                {bootProgress >= 30 && bootProgress < 70 && "> Generating coordinate matrix..."}
                {bootProgress >= 70 && bootProgress < 100 && "> Calibrating weights..."}
                {bootProgress >= 100 && "> System Ready. Transferring control."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Block 2: Grid Editor Module ---

const EDITOR_ROWS = 20;
const EDITOR_COLS = 35;

type NodeType = 'empty' | 'wall' | 'weight';
type Tool = 'wall' | 'weight' | 'eraser' | 'start' | 'goal';

interface NodeData {
  row: number;
  col: number;
  type: NodeType;
}

const GridEditorModule = () => {
  const [grid, setGrid] = useState<NodeData[][]>([]);
  const [startPos, setStartPos] = useState({ row: Math.floor(EDITOR_ROWS / 2), col: Math.floor(EDITOR_COLS / 6) });
  const [goalPos, setGoalPos] = useState({ row: Math.floor(EDITOR_ROWS / 2), col: Math.floor((EDITOR_COLS / 6) * 5) });
  const [activeTool, setActiveTool] = useState<Tool>('wall');
  const [isMousePressed, setIsMousePressed] = useState(false);

  useEffect(() => {
    const initialGrid: NodeData[][] = [];
    for (let r = 0; r < EDITOR_ROWS; r++) {
      const currentRow: NodeData[] = [];
      for (let c = 0; c < EDITOR_COLS; c++) {
        currentRow.push({ row: r, col: c, type: 'empty' });
      }
      initialGrid.push(currentRow);
    }
    setGrid(initialGrid);
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

  const handleMouseDown = (row: number, col: number) => {
    setIsMousePressed(true);
    applyTool(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isMousePressed) return;
    applyTool(row, col);
  };

  const handleMouseUp = () => setIsMousePressed(false);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const clearGrid = () => setGrid((prev) => prev.map(row => row.map(node => ({ ...node, type: 'empty' }))));
  const generateRandomMaze = () => {
    setGrid((prev) => prev.map((row, r) => row.map((node, c) => {
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
    if (isStart) return base + "bg-green-400 border-green-200 shadow-[0_0_15px_rgba(74,222,128,1)] z-10 scale-110 rounded-sm";
    if (isGoal) return base + "bg-pink-500 border-pink-200 shadow-[0_0_15px_rgba(236,72,153,1)] z-10 scale-110 rounded-sm";
    switch (type) {
      case 'wall': return base + "bg-slate-800 border-indigo-500/50 shadow-[0_0_10px_rgba(79,70,229,0.4)_inset] scale-95 rounded-sm";
      case 'weight': return base + "bg-amber-500/30 border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
      case 'empty': default: return base + "bg-transparent border-cyan-900/30 hover:bg-cyan-900/40 hover:border-cyan-500/50";
    }
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'wall', label: 'Draw Wall', color: 'indigo', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'weight', label: 'Add Weight', color: 'amber', icon: <Activity className="w-4 h-4" /> },
    { id: 'eraser', label: 'Eraser', color: 'cyan', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'start', label: 'Move Start', color: 'green', icon: <Waypoints className="w-4 h-4" /> },
    { id: 'goal', label: 'Move Goal', color: 'pink', icon: <Compass className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full h-full bg-slate-950 text-cyan-50 font-mono flex flex-col items-center py-12 px-4 selection:bg-cyan-900 overflow-y-auto">
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          GRID EDITOR
        </h1>
        <p className="text-cyan-600/80 text-sm uppercase tracking-widest">Design your environment • Set parameters • Prepare for routing</p>
      </div>
      <div className="flex flex-col xl:flex-row gap-8 items-start max-w-7xl w-full justify-center">
        <div className="w-full xl:w-64 flex flex-col gap-6 bg-slate-900/50 p-6 rounded-xl border border-cyan-900/50 shadow-[0_0_30px_rgba(8,145,178,0.05)] backdrop-blur-sm">
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-cyan-500 tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span> Active Tool
            </h2>
            <div className="flex flex-col gap-2">
              {tools.map((tool) => {
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 border ${
                      isActive ? `bg-${tool.color}-500/20 border-${tool.color}-400 text-${tool.color}-300 shadow-[0_0_15px_var(--tw-shadow-color)] shadow-${tool.color}-500/30` 
                               : `bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 hover:border-cyan-800`
                    }`}
                  >
                    {tool.icon} {tool.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent my-2"></div>
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-cyan-500 tracking-widest uppercase mb-4">Actions</h2>
            <button onClick={generateRandomMaze} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-slate-950/50 border border-indigo-900/50 text-indigo-300 hover:bg-indigo-900/30 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
              <Shuffle className="w-4 h-4" /> Random Walls
            </button>
            <button onClick={clearGrid} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-slate-950/50 border border-red-900/50 text-red-400 hover:bg-red-900/30 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">
              <Trash2 className="w-4 h-4" /> Clear Grid
            </button>
          </div>
        </div>
        <div className="relative p-1 bg-slate-900/80 rounded-xl border border-cyan-900/50 shadow-[0_0_40px_rgba(8,145,178,0.1)] backdrop-blur-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>
          <div className="relative grid gap-[1px] bg-cyan-950/30 p-[1px] rounded-lg" style={{ gridTemplateColumns: `repeat(${EDITOR_COLS}, minmax(0, 1fr))` }} onMouseLeave={handleMouseUp}>
            {grid.map((row, rIdx) => row.map((node, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} onMouseDown={() => handleMouseDown(rIdx, cIdx)} onMouseEnter={() => handleMouseEnter(rIdx, cIdx)} className={getCellClasses(rIdx, cIdx, node.type)} />
            )))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Block 3: Algorithm Run Module ---

const ALG_ROWS = 15;
const ALG_COLS = 30;
const ALG_TOTAL_CELLS = ALG_ROWS * ALG_COLS;
const ALG_START_IDX = Math.floor(ALG_ROWS / 2) * ALG_COLS + 5;
const ALG_END_IDX = Math.floor(ALG_ROWS / 2) * ALG_COLS + (ALG_COLS - 6);

const EMPTY = 0;
const WALL = 1;
const FRONTIER = 2;
const VISITED = 3;
const PATH = 4;

type AlgEvent = { idx: number; type: number };

const getNeighbors = (idx: number): number[] => {
  const r = Math.floor(idx / ALG_COLS);
  const c = idx % ALG_COLS;
  const neighbors = [];
  if (r > 0) neighbors.push(idx - ALG_COLS);
  if (c < ALG_COLS - 1) neighbors.push(idx + 1);
  if (r < ALG_ROWS - 1) neighbors.push(idx + ALG_COLS);
  if (c > 0) neighbors.push(idx - 1);
  return neighbors;
};

const getHeuristic = (idx: number): number => {
  const r = Math.floor(idx / ALG_COLS);
  const c = idx % ALG_COLS;
  const er = Math.floor(ALG_END_IDX / ALG_COLS);
  const ec = ALG_END_IDX % ALG_COLS;
  return Math.abs(r - er) + Math.abs(c - ec);
};

const AlgorithmRunModule = () => {
  const [baseGrid, setBaseGrid] = useState<Uint8Array>(new Uint8Array(ALG_TOTAL_CELLS));
  const [events, setEvents] = useState<AlgEvent[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [algorithm, setAlgorithm] = useState<'BFS' | 'AStar'>('AStar');

  const currentGrid = useMemo(() => {
    const grid = new Uint8Array(baseGrid);
    for (let i = 0; i < eventIndex; i++) {
      grid[events[i].idx] = events[i].type;
    }
    return grid;
  }, [baseGrid, events, eventIndex]);

  const runAlgorithm = useCallback(() => {
    const newEvents: AlgEvent[] = [];
    const grid = baseGrid;

    if (algorithm === 'BFS') {
      const queue = [ALG_START_IDX];
      const visited = new Set([ALG_START_IDX]);
      const cameFrom = new Map<number, number>();

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr !== ALG_START_IDX && curr !== ALG_END_IDX) newEvents.push({ idx: curr, type: VISITED });
        if (curr === ALG_END_IDX) break;

        for (const n of getNeighbors(curr)) {
          if (grid[n] === WALL || visited.has(n)) continue;
          visited.add(n);
          cameFrom.set(n, curr);
          queue.push(n);
          if (n !== ALG_END_IDX) newEvents.push({ idx: n, type: FRONTIER });
        }
      }
      let curr = cameFrom.get(ALG_END_IDX);
      const path = [];
      while (curr && curr !== ALG_START_IDX) {
        path.push(curr);
        curr = cameFrom.get(curr);
      }
      for (let i = path.length - 1; i >= 0; i--) newEvents.push({ idx: path[i], type: PATH });
    } else if (algorithm === 'AStar') {
      const openSet = [ALG_START_IDX];
      const cameFrom = new Map<number, number>();
      const gScore = new Map<number, number>([[ALG_START_IDX, 0]]);
      const fScore = new Map<number, number>([[ALG_START_IDX, getHeuristic(ALG_START_IDX)]]);
      const inOpenSet = new Set([ALG_START_IDX]);
      const closedSet = new Set<number>();

      while (openSet.length > 0) {
        openSet.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
        const curr = openSet.shift()!;
        inOpenSet.delete(curr);
        closedSet.add(curr);

        if (curr !== ALG_START_IDX && curr !== ALG_END_IDX) newEvents.push({ idx: curr, type: VISITED });
        if (curr === ALG_END_IDX) break;

        for (const n of getNeighbors(curr)) {
          if (grid[n] === WALL || closedSet.has(n)) continue;
          const tentativeGScore = (gScore.get(curr) || 0) + 1;
          if (!inOpenSet.has(n)) {
            inOpenSet.add(n);
            openSet.push(n);
            if (n !== ALG_END_IDX) newEvents.push({ idx: n, type: FRONTIER });
          } else if (tentativeGScore >= (gScore.get(n) || Infinity)) {
            continue;
          }
          cameFrom.set(n, curr);
          gScore.set(n, tentativeGScore);
          fScore.set(n, tentativeGScore + getHeuristic(n));
        }
      }
      let curr = cameFrom.get(ALG_END_IDX);
      const path = [];
      while (curr && curr !== ALG_START_IDX) {
        path.push(curr);
        curr = cameFrom.get(curr);
      }
      for (let i = path.length - 1; i >= 0; i--) newEvents.push({ idx: path[i], type: PATH });
    }
    setEvents(newEvents);
    setEventIndex(0);
    setIsPlaying(true);
  }, [algorithm, baseGrid]);

  useEffect(() => {
    let timer: number;
    if (isPlaying && eventIndex < events.length) {
      timer = window.setTimeout(() => setEventIndex(i => i + 1), 20);
    } else if (eventIndex >= events.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, eventIndex, events.length]);

  const toggleWall = (idx: number) => {
    if (idx === ALG_START_IDX || idx === ALG_END_IDX || isPlaying) return;
    const newGrid = new Uint8Array(baseGrid);
    newGrid[idx] = newGrid[idx] === WALL ? EMPTY : WALL;
    setBaseGrid(newGrid);
    setEvents([]);
    setEventIndex(0);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-8">
      <div className="mb-8 flex gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
        <select 
          value={algorithm} 
          onChange={(e) => { setAlgorithm(e.target.value as any); setEvents([]); setEventIndex(0); }}
          className="bg-slate-950 border border-slate-700 rounded px-4 py-2 text-cyan-400 font-mono outline-none"
        >
          <option value="BFS">Breadth-First Search</option>
          <option value="AStar">A* Search</option>
        </select>
        <button onClick={runAlgorithm} disabled={isPlaying} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-bold disabled:opacity-50">
          <Play className="w-4 h-4" /> Run
        </button>
        <button onClick={() => { setEvents([]); setEventIndex(0); setIsPlaying(false); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded font-bold">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      <div className="grid gap-[1px] bg-slate-800 p-[1px] rounded" style={{ gridTemplateColumns: `repeat(${ALG_COLS}, minmax(0, 1fr))` }}>
        {Array.from({ length: ALG_TOTAL_CELLS }).map((_, idx) => {
          const isStart = idx === ALG_START_IDX;
          const isEnd = idx === ALG_END_IDX;
          const state = currentGrid[idx];
          
          let bg = "bg-slate-950 hover:bg-slate-800";
          if (isStart) bg = "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] z-10";
          else if (isEnd) bg = "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)] z-10";
          else if (state === WALL) bg = "bg-slate-700";
          else if (state === PATH) bg = "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] z-10";
          else if (state === VISITED) bg = "bg-cyan-900/50";
          else if (state === FRONTIER) bg = "bg-cyan-500/50";

          return (
            <div 
              key={idx} 
              onClick={() => toggleWall(idx)}
              className={`w-6 h-6 transition-colors duration-200 cursor-pointer ${bg}`}
            />
          );
        })}
      </div>
    </div>
  );
};

// --- Block 4: Heuristic Inspector Module ---

const HeuristicInspectorModule = () => {
  const [activeAlgorithm, setActiveAlgorithm] = useState<'BFS' | 'Dijkstra' | 'A*'>('A*');
  const [hoverPos, setHoverPos] = useState({ x: 2, y: 2 });
  const [activeHeuristic, setActiveHeuristic] = useState<'Both' | 'Manhattan' | 'Euclidean'>('Both');

  const GRID_SIZE = 10;
  const CELL_SIZE = 40;
  const goalPos = { x: 8, y: 7 };

  const dx = Math.abs(hoverPos.x - goalPos.x);
  const dy = Math.abs(hoverPos.y - goalPos.y);
  const manhattanCost = dx + dy;
  const euclideanCost = Math.sqrt(dx * dx + dy * dy);
  const maxManhattan = 18; 
  const maxEuclidean = Math.sqrt(9 * 9 + 9 * 9);

  const hx = hoverPos.x * CELL_SIZE + CELL_SIZE / 2;
  const hy = hoverPos.y * CELL_SIZE + CELL_SIZE / 2;
  const gx = goalPos.x * CELL_SIZE + CELL_SIZE / 2;
  const gy = goalPos.y * CELL_SIZE + CELL_SIZE / 2;

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 font-sans p-6 md:p-12 flex flex-col items-center justify-center relative overflow-y-auto selection:bg-cyan-900">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      <div className="relative z-10 w-full max-w-5xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
            <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">PATH</span>FINDER
          </h1>
          <p className="text-slate-500 text-sm tracking-widest uppercase mt-1">Heuristic Inspector Module</p>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 shadow-xl">
          {['BFS', 'Dijkstra', 'A*'].map((algo) => (
            <button
              key={algo}
              onClick={() => setActiveAlgorithm(algo as any)}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-300 ${activeAlgorithm === algo ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              {algo}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-5xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {activeAlgorithm !== 'A*' ? (
          <div className="flex-1 p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
            <div className="w-24 h-24 mb-6 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
              <Activity className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Heuristics Disabled</h2>
            <p className="text-slate-400 max-w-md">
              <span className="text-cyan-400 font-mono">{activeAlgorithm}</span> is an uninformed search algorithm. It explores equally in all directions without a heuristic guide.
            </p>
            <button onClick={() => setActiveAlgorithm('A*')} className="mt-8 px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors font-mono text-sm">
              SWITCH TO A* SEARCH
            </button>
          </div>
        ) : (
          <>
            <div className="p-8 lg:border-r border-slate-800 flex flex-col items-center justify-center bg-slate-950/50">
              <div className="mb-6 w-full flex justify-between items-center">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider">Interactive Grid</h3>
                <div className="flex gap-2">
                  {(['Both', 'Manhattan', 'Euclidean'] as const).map(h => (
                    <button key={h} onClick={() => setActiveHeuristic(h)} className={`text-xs px-2 py-1 rounded font-mono border transition-colors ${activeHeuristic === h ? 'border-slate-500 text-slate-200 bg-slate-800' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative bg-slate-900 border border-slate-800 rounded-lg shadow-2xl" style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const x = i % GRID_SIZE;
                    const y = Math.floor(i / GRID_SIZE);
                    const isGoal = x === goalPos.x && y === goalPos.y;
                    const isHovered = x === hoverPos.x && y === hoverPos.y;
                    return (
                      <div key={i} onMouseEnter={() => !isGoal && setHoverPos({ x, y })} className={`border-r border-b border-slate-800/50 transition-colors duration-75 cursor-crosshair ${isGoal ? 'bg-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.5)]' : ''} ${isHovered && !isGoal ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'}`}>
                        {isGoal && <div className="w-full h-full flex items-center justify-center"><div className="w-3 h-3 bg-emerald-400 rounded-sm shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse" /></div>}
                        {isHovered && !isGoal && <div className="w-full h-full flex items-center justify-center"><div className="w-2 h-2 bg-slate-400 rounded-full" /></div>}
                      </div>
                    );
                  })}
                </div>
                <svg className="absolute inset-0 pointer-events-none" width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE}>
                  <defs>
                    <linearGradient id="euclideanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#a21caf" />
                    </linearGradient>
                  </defs>
                  {(activeHeuristic === 'Both' || activeHeuristic === 'Manhattan') && (
                    <polyline points={`${hx},${hy} ${gx},${hy} ${gx},${gy}`} fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="6 6" className="drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-[dash_1s_linear_infinite]" style={{ strokeDashoffset: 12 }} />
                  )}
                  {(activeHeuristic === 'Both' || activeHeuristic === 'Euclidean') && (
                    <line x1={hx} y1={hy} x2={gx} y2={gy} fill="none" stroke="url(#euclideanGrad)" strokeWidth="3" strokeDasharray="4 4" className="drop-shadow-[0_0_5px_rgba(217,70,239,0.8)] animate-[dash_1s_linear_infinite_reverse]" />
                  )}
                  <circle cx={hx} cy={hy} r="4" fill="#94a3b8" />
                  <circle cx={gx} cy={gy} r="4" fill="#34d399" className="drop-shadow-[0_0_8px_rgba(52,211,153,1)]" />
                </svg>
              </div>
              <div className="mt-6 text-xs font-mono text-slate-500 flex gap-6">
                <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-cyan-400" /> Manhattan</span>
                <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-fuchsia-500" /> Euclidean</span>
              </div>
            </div>
            <div className="flex-1 p-8 flex flex-col bg-slate-900">
              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-cyan-500" /> Cost Analysis
              </h3>
              <div className="space-y-10 flex-1">
                <div className={`transition-opacity duration-300 ${(activeHeuristic === 'Both' || activeHeuristic === 'Manhattan') ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="text-cyan-400 font-mono font-bold tracking-wide">MANHATTAN (h)</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">|x₁ - x₂| + |y₁ - y₂|</p>
                    </div>
                    <div className="text-3xl font-light text-white font-mono">{manhattanCost}</div>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                    <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-300 ease-out rounded-full" style={{ width: `${(manhattanCost / maxManhattan) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-2"><span>0</span><span>Max: {maxManhattan}</span></div>
                </div>
                <div className={`transition-opacity duration-300 ${(activeHeuristic === 'Both' || activeHeuristic === 'Euclidean') ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="text-fuchsia-400 font-mono font-bold tracking-wide">EUCLIDEAN (h)</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">√((x₁ - x₂)² + (y₁ - y₂)²)</p>
                    </div>
                    <div className="text-3xl font-light text-white font-mono">{euclideanCost.toFixed(2)}</div>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                    <div className="absolute top-0 left-0 h-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)] transition-all duration-300 ease-out rounded-full" style={{ width: `${(euclideanCost / maxEuclidean) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-2"><span>0</span><span>Max: {maxEuclidean.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" /> Technologist Insight
                </h5>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Notice how <strong className="text-cyan-400 font-normal">Manhattan</strong> is always <strong className="text-white font-normal">≥</strong> <strong className="text-fuchsia-400 font-normal">Euclidean</strong>. 
                  In a 4-way movement grid, Manhattan is an <em>admissible</em> and perfect heuristic. Euclidean underestimates the true cost, causing A* to explore more nodes than necessary.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes dash { to { stroke-dashoffset: 0; } }`}} />
    </div>
  );
};

// --- Block 5: Complexity Card Module ---

const StatCard = ({ label, value, color, icon }: { label: string; value: number | string; color: 'cyan' | 'fuchsia' | 'emerald' | 'amber'; icon: React.ReactNode; }) => {
  const colorStyles = {
    cyan: 'text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]',
    fuchsia: 'text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_15px_rgba(232,121,249,0.15)]',
    emerald: 'text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]',
    amber: 'text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]',
  };
  const glowStyles = {
    cyan: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    fuchsia: 'drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]',
    emerald: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    amber: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  };
  return (
    <div className={`relative flex flex-col p-4 bg-gray-950/50 rounded-lg border ${colorStyles[color]} backdrop-blur-sm overflow-hidden group transition-all duration-300 hover:bg-gray-900/80`}>
      <div className="flex items-center justify-between mb-2 opacity-80">
        <span className="text-xs font-medium tracking-wider text-gray-400 uppercase">{label}</span>
        <div className={`${colorStyles[color].split(' ')[0]}`}>{icon}</div>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className={`text-3xl font-mono font-bold tracking-tight ${glowStyles[color]}`}>{value}</span>
      </div>
      <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20 bg-current ${colorStyles[color].split(' ')[0]}`} />
    </div>
  );
};

const ComplexityCardModule = () => {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [visited, setVisited] = useState(0);
  const [frontier, setFrontier] = useState(0);
  const [cost, setCost] = useState(0);
  const [time, setTime] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const simRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'running') {
      timerRef.current = window.setInterval(() => setTime((t) => t + 16), 16);
      simRef.current = window.setInterval(() => {
        setVisited((v) => {
          const newV = v + Math.floor(Math.random() * 5) + 1;
          if (newV > 450) {
            setStatus('completed');
            setCost(84);
            setFrontier(0);
            return 450;
          }
          return newV;
        });
        setFrontier((f) => Math.max(0, f + Math.floor(Math.random() * 7) - 2));
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [status]);

  const handleStart = () => { setVisited(0); setFrontier(1); setCost(0); setTime(0); setStatus('running'); };
  const handleReset = () => { setVisited(0); setFrontier(0); setCost(0); setTime(0); setStatus('idle'); };

  return (
    <div className="w-full h-full bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f1a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1a_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950 pointer-events-none" />
      <div className="relative z-10 w-full max-w-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-fuchsia-400" /> COMPLEXITY METRICS
            </h2>
            <p className="text-sm text-gray-400 mt-1">Live algorithm performance analysis</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-950 border border-gray-800">
            <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : status === 'completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-gray-500'}`} />
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">{status}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Visited Nodes" value={visited} color="cyan" icon={<Waypoints className="w-4 h-4" />} />
          <StatCard label="Frontier Size" value={frontier} color="fuchsia" icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Path Cost" value={status === 'completed' ? cost : '--'} color="emerald" icon={<Compass className="w-4 h-4" />} />
          <StatCard label="Time (ms)" value={time} color="amber" icon={<Terminal className="w-4 h-4" />} />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
          <div className="text-xs text-gray-500 font-mono">SEED: <span className="text-gray-400">0x8F9A2B</span></div>
          <div className="flex gap-3">
            <button onClick={handleReset} className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Reset</button>
            <button onClick={status === 'running' ? () => setStatus('idle') : handleStart} className={`px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${status === 'running' ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' : 'bg-cyan-500 text-gray-950 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]'}`}>
              {status === 'running' ? 'Pause' : status === 'completed' ? 'Re-run' : 'Simulate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('hero');

  const tabs = [
    { id: 'hero', label: 'Initialization', icon: <Terminal className="w-5 h-5" /> },
    { id: 'editor', label: 'Grid Editor', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'algorithm', label: 'Algorithm Run', icon: <Play className="w-5 h-5" /> },
    { id: 'heuristics', label: 'Heuristics', icon: <Compass className="w-5 h-5" /> },
    { id: 'complexity', label: 'Complexity', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-cyan-400 font-black tracking-tighter text-xl">
            <Waypoints className="w-6 h-6" />
            PATH.PLAY
          </div>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-600 font-mono text-center">
          v2.0.0 // ONLINE
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'hero' && <HeroModule onStart={() => setActiveTab('editor')} />}
        {activeTab === 'editor' && <GridEditorModule />}
        {activeTab === 'algorithm' && <AlgorithmRunModule />}
        {activeTab === 'heuristics' && <HeuristicInspectorModule />}
        {activeTab === 'complexity' && <ComplexityCardModule />}
      </main>
    </div>
  );
}