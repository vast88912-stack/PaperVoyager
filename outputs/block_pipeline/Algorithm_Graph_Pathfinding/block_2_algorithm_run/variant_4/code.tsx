import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, StepForward, RotateCcw, Shuffle, GitCommit, ChevronRight, Activity, Zap, Binary, BoxSelect } from 'lucide-react';

// --- Types & Constants ---
type NodeState = 'unvisited' | 'visited' | 'frontier' | 'path' | 'start' | 'end' | 'wall';

interface GridNode {
  row: number;
  col: number;
  state: NodeState;
  distance: number;
  isWeight: boolean;
  previousNode: GridNode | null;
  f: number; // For A*
  g: number; // For A*
  h: number; // For A*
}

type ActionType = 'VISIT' | 'FRONTIER' | 'PATH';

interface AnimationAction {
  type: ActionType;
  row: number;
  col: number;
}

const ROWS = 21;
const COLS = 45;
const START_ROW = 10;
const START_COL = 10;
const END_ROW = 10;
const END_COL = 34;

// --- Helper Functions ---
const createInitialGrid = (): GridNode[][] => {
  const grid: GridNode[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const currentRow: GridNode[] = [];
    for (let col = 0; col < COLS; col++) {
      currentRow.push({
        row,
        col,
        state: (row === START_ROW && col === START_COL) ? 'start' : (row === END_ROW && col === END_COL) ? 'end' : 'unvisited',
        distance: Infinity,
        isWeight: false,
        previousNode: null,
        f: Infinity,
        g: Infinity,
        h: 0,
      });
    }
    grid.push(currentRow);
  }
  return grid;
};

const getNeighbors = (node: GridNode, grid: GridNode[][]): GridNode[] => {
  const neighbors: GridNode[] = [];
  const { col, row } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < COLS - 1) neighbors.push(grid[row][col + 1]);
  return neighbors.filter(n => n.state !== 'wall');
};

const manhattan = (node: GridNode, endNode: GridNode) => {
  return Math.abs(node.row - endNode.row) + Math.abs(node.col - endNode.col);
};

// --- Algorithms (Generates sequences of actions for animation) ---
const solveAStar = (grid: GridNode[][], start: GridNode, end: GridNode): AnimationAction[] => {
  const actions: AnimationAction[] = [];
  const openSet: GridNode[] = [start];
  const closedSet: Set<string> = new Set();
  
  start.g = 0;
  start.f = manhattan(start, end);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.state !== 'start' && current.state !== 'end') {
      actions.push({ type: 'VISIT', row: current.row, col: current.col });
    }

    if (current.row === end.row && current.col === end.col) {
      // Reconstruct path
      let curr: GridNode | null = current.previousNode;
      const pathActions: AnimationAction[] = [];
      while (curr && curr.state !== 'start') {
        pathActions.push({ type: 'PATH', row: curr.row, col: curr.col });
        curr = curr.previousNode;
      }
      return [...actions, ...pathActions.reverse()];
    }

    closedSet.add(`${current.row},${current.col}`);

    const neighbors = getNeighbors(current, grid);
    for (const neighbor of neighbors) {
      if (closedSet.has(`${neighbor.row},${neighbor.col}`)) continue;

      const tentativeG = current.g + (neighbor.isWeight ? 5 : 1);
      
      const inOpenSet = openSet.some(n => n.row === neighbor.row && n.col === neighbor.col);

      if (tentativeG < neighbor.g) {
        neighbor.previousNode = current;
        neighbor.g = tentativeG;
        neighbor.h = manhattan(neighbor, end);
        neighbor.f = neighbor.g + neighbor.h;

        if (!inOpenSet) {
          openSet.push(neighbor);
          if (neighbor.state !== 'end') {
             actions.push({ type: 'FRONTIER', row: neighbor.row, col: neighbor.col });
          }
        }
      }
    }
  }
  return actions;
};

const solveBFS = (grid: GridNode[][], start: GridNode, end: GridNode): AnimationAction[] => {
  const actions: AnimationAction[] = [];
  const queue: GridNode[] = [start];
  const visited = new Set([`${start.row},${start.col}`]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.state !== 'start' && current.state !== 'end') {
      actions.push({ type: 'VISIT', row: current.row, col: current.col });
    }

    if (current.row === end.row && current.col === end.col) {
      let curr: GridNode | null = current.previousNode;
      const pathActions: AnimationAction[] = [];
      while (curr && curr.state !== 'start') {
        pathActions.push({ type: 'PATH', row: curr.row, col: curr.col });
        curr = curr.previousNode;
      }
      return [...actions, ...pathActions.reverse()];
    }

    const neighbors = getNeighbors(current, grid);
    for (const neighbor of neighbors) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        neighbor.previousNode = current;
        queue.push(neighbor);
        if (neighbor.state !== 'end') {
          actions.push({ type: 'FRONTIER', row: neighbor.row, col: neighbor.col });
        }
      }
    }
  }
  return actions;
};


// --- Main Component ---
export default function App() {
  const [grid, setGrid] = useState<GridNode[][]>(createInitialGrid());
  const [algorithm, setAlgorithm] = useState<'A*' | 'BFS'>('A*');
  
  // Animation State
  const [actions, setActions] = useState<AnimationAction[]>([]);
  const [actionIndex, setActionIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Stats
  const [visitedCount, setVisitedCount] = useState(0);
  const [frontierSize, setFrontierSize] = useState(0);
  const [pathLength, setPathLength] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Interaction Handlers ---
  const generateMaze = useCallback(() => {
    handleReset();
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => row.map(node => ({...node})));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r !== START_ROW || c !== START_COL) && (r !== END_ROW || c !== END_COL)) {
             // 25% chance of wall
             if (Math.random() < 0.25) {
               newGrid[r][c].state = 'wall';
             }
          }
        }
      }
      return newGrid;
    });
  }, []);

  const handleReset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setIsFinished(false);
    setActions([]);
    setActionIndex(0);
    setVisitedCount(0);
    setFrontierSize(0);
    setPathLength(0);
    setGrid(prev => prev.map(row => row.map(node => ({
      ...node,
      state: node.state === 'wall' ? 'wall' : (node.row === START_ROW && node.col === START_COL) ? 'start' : (node.row === END_ROW && node.col === END_COL) ? 'end' : 'unvisited',
      previousNode: null,
      distance: Infinity, f: Infinity, g: Infinity, h: 0
    }))));
  }, []);

  const prepareAnimation = useCallback(() => {
    // Clone grid to run algo without mutating display state yet
    const workGrid = grid.map(row => row.map(n => ({...n, previousNode: null})));
    const startNode = workGrid[START_ROW][START_COL];
    const endNode = workGrid[END_ROW][END_COL];
    
    let generatedActions: AnimationAction[] = [];
    if (algorithm === 'A*') {
      generatedActions = solveAStar(workGrid, startNode, endNode);
    } else {
      generatedActions = solveBFS(workGrid, startNode, endNode);
    }
    
    setActions(generatedActions);
    setActionIndex(0);
    return generatedActions;
  }, [grid, algorithm]);

  const applyAction = useCallback((action: AnimationAction) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[action.row] = [...newGrid[action.row]];
      const node = newGrid[action.row][action.col];
      
      if (node.state !== 'start' && node.state !== 'end') {
        node.state = action.type === 'VISIT' ? 'visited' : action.type === 'FRONTIER' ? 'frontier' : 'path';
      }
      return newGrid;
    });

    if (action.type === 'VISIT') {
      setVisitedCount(v => v + 1);
      setFrontierSize(f => Math.max(0, f - 1));
    } else if (action.type === 'FRONTIER') {
      setFrontierSize(f => f + 1);
    } else if (action.type === 'PATH') {
      setPathLength(p => p + 1);
    }
  }, []);

  const stepForward = useCallback(() => {
    let currentActions = actions;
    let currIdx = actionIndex;

    if (currentActions.length === 0) {
      currentActions = prepareAnimation();
      if (currentActions.length === 0) return; // No path or blocked
    }

    if (currIdx < currentActions.length) {
      // Apply batch of actions to speed up visually if needed, but standard is 1 by 1
      applyAction(currentActions[currIdx]);
      setActionIndex(currIdx + 1);
    } else {
      setIsRunning(false);
      setIsFinished(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [actions, actionIndex, prepareAnimation, applyAction]);

  const togglePlay = () => {
    if (isRunning) {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (isFinished) handleReset();
      setIsRunning(true);
    }
  };

  // --- Animation Loop ---
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setActions(prevActions => {
          setActionIndex(prevIdx => {
             // We need access to latest actions/index inside interval. 
             // Using refs or functional state updates helps here.
             // Actually, the simpler way is calling stepForward inside an effect that depends on isRunning.
             return prevIdx; 
          });
          return prevActions;
        });
      }, 10); // Super fast base interval, logic handled in effect below
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  // A more robust loop
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isRunning && actionIndex < actions.length) {
        timeoutId = setTimeout(() => {
            applyAction(actions[actionIndex]);
            setActionIndex(actionIndex + 1);
        }, 15); // Animation speed
    } else if (isRunning && actionIndex >= actions.length && actions.length > 0) {
        setIsRunning(false);
        setIsFinished(true);
    }
    return () => clearTimeout(timeoutId);
  }, [isRunning, actionIndex, actions, applyAction]);

  // If actions is empty and we hit play, generate them
  useEffect(() => {
      if (isRunning && actions.length === 0) {
          prepareAnimation();
      }
  }, [isRunning, actions.length, prepareAnimation]);


  // --- Render Helpers ---
  const getCellClasses = (state: NodeState) => {
    const base = "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 border-[0.5px] border-zinc-900/50 transition-colors duration-200 rounded-sm ";
    switch (state) {
      case 'start': return base + "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10 scale-110";
      case 'end': return base + "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] z-10 scale-110";
      case 'wall': return base + "bg-zinc-800 shadow-none";
      case 'visited': return base + "bg-fuchsia-900/60 shadow-[inset_0_0_8px_rgba(192,38,211,0.3)]";
      case 'frontier': return base + "bg-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.6)] animate-pulse";
      case 'path': return base + "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)] z-10 scale-105";
      default: return base + "bg-zinc-950 hover:bg-zinc-900";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-mono selection:bg-cyan-900 flex flex-col items-center p-4 sm:p-8 overflow-hidden">
      
      {/* Header / Hero area */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-zinc-800/50 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
            <Network className="w-8 h-8 text-cyan-400" />
            Path<span className="text-cyan-400">Finder</span> // <span className="text-zinc-500 text-xl font-light tracking-widest">NEON</span>
          </h1>
          <p className="text-zinc-500 mt-2 text-sm flex items-center gap-2">
            <TerminalIcon /> SYSTEM.INITIALIZE(GRID_PROJECTION)
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs tracking-wider uppercase text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
           <LegendItem color="bg-cyan-400 shadow-[0_0_8px_#22d3ee]" label="Frontier" />
           <LegendItem color="bg-fuchsia-900 shadow-[inset_0_0_5px_#c026d3]" label="Visited" />
           <LegendItem color="bg-amber-400 shadow-[0_0_8px_#fbbf24]" label="Path" />
           <LegendItem color="bg-zinc-800" label="Wall" />
        </div>
      </div>

      <div className="w-full max-w-7xl flex flex-col xl:flex-row gap-8">
        
        {/* Main Grid Area */}
        <div className="flex-1 bg-zinc-900/20 p-2 sm:p-4 rounded-xl border border-zinc-800/50 shadow-2xl relative">
          
          {/* Subtle grid background glow */}
          <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          <div 
            className="grid gap-[1px] relative z-10" 
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {grid.map((row, rIdx) => (
              row.map((node, cIdx) => (
                <div key={`${rIdx}-${cIdx}`} className={getCellClasses(node.state)} />
              ))
            ))}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Controls Panel */}
          <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50 backdrop-blur-sm shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
               <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                 <GitCommit className="w-4 h-4 text-cyan-400" /> Control Deck
               </h2>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Target Algorithm</label>
              <div className="grid grid-cols-2 gap-2">
                {(['A*', 'BFS'] as const).map(a => (
                  <button
                    key={a}
                    disabled={isRunning}
                    onClick={() => { setAlgorithm(a); handleReset(); }}
                    className={`py-2 px-3 rounded-md text-sm font-bold transition-all ${
                      algorithm === a 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                        : 'bg-zinc-950 text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              <button onClick={togglePlay} className="col-span-2 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 py-3 rounded-md font-bold transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? 'PAUSE' : isFinished ? 'RESTART' : 'START'}
              </button>
              
              <button onClick={stepForward} disabled={isRunning || isFinished} className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700">
                 <StepForward className="w-4 h-4" />
              </button>
              
              <button onClick={handleReset} className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-rose-400 py-3 rounded-md transition-colors border border-zinc-700">
                 <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button onClick={generateMaze} disabled={isRunning} className="w-full mt-2 flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-300 text-zinc-400 py-2.5 rounded-md text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Shuffle className="w-4 h-4" /> Generate Obstacles
            </button>
          </div>

          {/* Complexity / Telemetry Card */}
          <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50 backdrop-blur-sm shadow-xl flex flex-col gap-4 flex-1">
             <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">