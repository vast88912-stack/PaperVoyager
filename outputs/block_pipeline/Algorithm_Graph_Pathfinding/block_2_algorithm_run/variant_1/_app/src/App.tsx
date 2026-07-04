import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity, Hexagon, Target, Zap, Waves, Layers } from 'lucide-react';

// --- Runtime deps: lucide-react ---

// --- Types & Constants ---
type NodeType = 'EMPTY' | 'WALL' | 'START' | 'END';

interface GridNode {
  r: number;
  c: number;
  type: NodeType;
  weight: number;
  isFrontier: boolean;
  isVisited: boolean;
  isPath: boolean;
  g: number;
  f: number;
  parent: GridNode | null;
  // For Bidirectional
  visitedBy?: 'START' | 'END';
  parentB?: GridNode | null;
}

const ROWS = 17;
const COLS = 35;
const START_NODE = { r: 8, c: 5 };
const END_NODE = { r: 8, c: 29 };

const ALGORITHMS = [
  { id: 'BFS', name: 'Breadth-First', icon: Waves, desc: 'Explores equally in all directions. Guarantees shortest path on unweighted grids.' },
  { id: 'DIJKSTRA', name: 'Dijkstra', icon: Activity, desc: 'Respects cell weights. Guarantees shortest path.' },
  { id: 'ASTAR', name: 'A* Search', icon: Target, desc: 'Uses heuristics to move towards the target. Fastest pathfinder.' },
  { id: 'BIDIRECTIONAL', name: 'Bidirectional', icon: Zap, desc: 'Searches from both start and end simultaneously.' }
];

// --- Helpers ---
const createInitialGrid = (): GridNode[][] => {
  const grid: GridNode[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: GridNode[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push({
        r,
        c,
        type: (r === START_NODE.r && c === START_NODE.c) ? 'START' : (r === END_NODE.r && c === END_NODE.c) ? 'END' : 'EMPTY',
        weight: 1,
        isFrontier: false,
        isVisited: false,
        isPath: false,
        g: Infinity,
        f: Infinity,
        parent: null,
      });
    }
    grid.push(row);
  }
  return grid;
};

const getNeighbors = (node: GridNode, grid: GridNode[][]): GridNode[] => {
  const neighbors: GridNode[] = [];
  const { r, c } = node;
  if (r > 0) neighbors.push(grid[r - 1][c]);
  if (r < ROWS - 1) neighbors.push(grid[r + 1][c]);
  if (c > 0) neighbors.push(grid[r][c - 1]);
  if (c < COLS - 1) neighbors.push(grid[r][c + 1]);
  return neighbors;
};

const heuristic = (a: GridNode, b: GridNode) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

// --- Main Component ---
export default function App() {
  const [algo, setAlgo] = useState(ALGORITHMS[2]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [, setRenderTrigger] = useState(0);
  
  const gridRef = useRef<GridNode[][]>(createInitialGrid());
  const generatorRef = useRef<Generator | null>(null);
  const isDrawingRef = useRef(false);
  const drawModeRef = useRef<'WALL' | 'EMPTY'>('WALL');

  const forceRender = useCallback(() => setRenderTrigger(prev => prev + 1), []);

  // --- Grid Interactions ---
  const handleMouseDown = (r: number, c: number) => {
    if (isRunning || isFinished) return;
    const node = gridRef.current[r][c];
    if (node.type === 'START' || node.type === 'END') return;
    
    isDrawingRef.current = true;
    const newMode = node.type === 'WALL' ? 'EMPTY' : 'WALL';
    drawModeRef.current = newMode;
    node.type = newMode;
    forceRender();
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDrawingRef.current || isRunning || isFinished) return;
    const node = gridRef.current[r][c];
    if (node.type === 'START' || node.type === 'END') return;
    node.type = drawModeRef.current;
    forceRender();
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const addRandomWeights = () => {
    if (isRunning) return;
    resetSearch();
    const grid = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const node = grid[r][c];
        if (node.type === 'EMPTY' && Math.random() < 0.25) {
          node.weight = 5;
        }
      }
    }
    forceRender();
  };

  const clearGrid = () => {
    if (isRunning) setIsRunning(false);
    gridRef.current = createInitialGrid();
    setIsFinished(false);
    generatorRef.current = null;
    forceRender();
  };

  const resetSearch = () => {
    if (isRunning) setIsRunning(false);
    const grid = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const node = grid[r][c];
        node.isFrontier = false;
        node.isVisited = false;
        node.isPath = false;
        node.g = Infinity;
        node.f = Infinity;
        node.parent = null;
        node.visitedBy = undefined;
        node.parentB = null;
      }
    }
    setIsFinished(false);
    generatorRef.current = null;
    forceRender();
  };

  // --- Algorithm Generators ---
  function* backtrack(endNode: GridNode) {
    let curr: GridNode | null = endNode;
    while (curr) {
      curr.isPath = true;
      curr = curr.parent;
      yield true;
    }
  }

  function* backtrackBidirectional(intersectNode: GridNode) {
    let currA: GridNode | null = intersectNode;
    while (currA) {
      currA.isPath = true;
      currA = currA.parent;
      yield true;
    }
    let currB: GridNode | null = intersectNode.parentB || null;
    while (currB) {
      currB.isPath = true;
      currB = currB.parentB || null;
      yield true;
    }
  }

  function* runBFS(): Generator<boolean, void, unknown> {
    const grid = gridRef.current;
    const start = grid[START_NODE.r][START_NODE.c];
    const end = grid[END_NODE.r][END_NODE.c];
    const queue: GridNode[] = [start];
    start.isVisited = true;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      curr.isFrontier = false;

      if (curr === end) {
        yield* backtrack(curr);
        return;
      }

      for (const n of getNeighbors(curr, grid)) {
        if (!n.isVisited && n.type !== 'WALL') {
          n.isVisited = true;
          n.isFrontier = true;
          n.parent = curr;
          queue.push(n);
        }
      }
      yield true;
    }
  }

  function* runDijkstra(): Generator<boolean, void, unknown> {
    const grid = gridRef.current;
    const start = grid[START_NODE.r][START_NODE.c];
    const end = grid[END_NODE.r][END_NODE.c];
    const pq: GridNode[] = [start];
    start.g = 0;

    while (pq.length > 0) {
      pq.sort((a, b) => a.g - b.g);
      const curr = pq.shift()!;
      curr.isFrontier = false;
      curr.isVisited = true;

      if (curr === end) {
        yield* backtrack(curr);
        return;
      }

      for (const n of getNeighbors(curr, grid)) {
        if (n.type === 'WALL' || n.isVisited) continue;
        const tentativeG = curr.g + n.weight;
        if (tentativeG < n.g) {
          n.g = tentativeG;
          n.parent = curr;
          if (!n.isFrontier) {
            n.isFrontier = true;
            pq.push(n);
          }
        }
      }
      yield true;
    }
  }

  function* runAStar(): Generator<boolean, void, unknown> {
    const grid = gridRef.current;
    const start = grid[START_NODE.r][START_NODE.c];
    const end = grid[END_NODE.r][END_NODE.c];
    const pq: GridNode[] = [start];
    start.g = 0;
    start.f = heuristic(start, end);

    while (pq.length > 0) {
      pq.sort((a, b) => a.f - b.f);
      const curr = pq.shift()!;
      curr.isFrontier = false;
      curr.isVisited = true;

      if (curr === end) {
        yield* backtrack(curr);
        return;
      }

      for (const n of getNeighbors(curr, grid)) {
        if (n.type === 'WALL' || n.isVisited) continue;
        const tentativeG = curr.g + n.weight;
        if (tentativeG < n.g) {
          n.parent = curr;
          n.g = tentativeG;
          n.f = n.g + heuristic(n, end);
          if (!n.isFrontier) {
            n.isFrontier = true;
            pq.push(n);
          }
        }
      }
      yield true;
    }
  }

  function* runBidirectional(): Generator<boolean, void, unknown> {
    const grid = gridRef.current;
    const start = grid[START_NODE.r][START_NODE.c];
    const end = grid[END_NODE.r][END_NODE.c];
    
    const queueA: GridNode[] = [start];
    const queueB: GridNode[] = [end];
    
    start.visitedBy = 'START';
    end.visitedBy = 'END';

    while (queueA.length > 0 && queueB.length > 0) {
      // Expand A
      const currA = queueA.shift()!;
      currA.isFrontier = false;
      currA.isVisited = true;

      for (const n of getNeighbors(currA, grid)) {
        if (n.type === 'WALL') continue;
        if (n.visitedBy === 'END') {
          n.parent = currA;
          yield* backtrackBidirectional(n);
          return;
        }
        if (!n.visitedBy) {
          n.visitedBy = 'START';
          n.isFrontier = true;
          n.parent = currA;
          queueA.push(n);
        }
      }
      yield true;

      // Expand B
      const currB = queueB.shift()!;
      currB.isFrontier = false;
      currB.isVisited = true;

      for (const n of getNeighbors(currB, grid)) {
        if (n.type === 'WALL') continue;
        if (n.visitedBy === 'START') {
          n.parentB = currB;
          yield* backtrackBidirectional(n);
          return;
        }
        if (!n.visitedBy) {
          n.visitedBy = 'END';
          n.isFrontier = true;
          n.parentB = currB;
          queueB.push(n);
        }
      }
      yield true;
    }
  }

  // --- Animation Loop ---
  useEffect(() => {
    if (!isRunning) return;

    if (!generatorRef.current) {
      if (algo.id === 'BFS') generatorRef.current = runBFS();
      else if (algo.id === 'DIJKSTRA') generatorRef.current = runDijkstra();
      else if (algo.id === 'ASTAR') generatorRef.current = runAStar();
      else if (algo.id === 'BIDIRECTIONAL') generatorRef.current = runBidirectional();
    }

    const interval = setInterval(() => {
      if (generatorRef.current) {
        const { done } = generatorRef.current.next();
        forceRender();
        if (done) {
          setIsRunning(false);
          setIsFinished(true);
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isRunning, algo, speed, forceRender]);

  const togglePlay = () => {
    if (isFinished) resetSearch();
    setIsRunning(!isRunning);
  };

  // --- Render Helpers ---
  const getCellClasses = (node: GridNode) => {
    let base = "w-6 h-6 rounded-[2px] transition-all duration-200 border border-white/5 flex items-center justify-center relative ";
    
    if (node.type === 'START') return base + "bg-[#39ff14] shadow-[0_0_15px_#39ff14] z-10 scale-110";
    if (node.type === 'END') return base + "bg-[#ff003c] shadow-[0_0_15px_#ff003c] z-10 scale-110";
    if (node.type === 'WALL') return base + "bg-slate-800 border-slate-900 scale-95";
    
    if (node.isPath) return base + "bg-[#00f0ff] shadow-[0_0_12px_#00f0ff] z-10 scale-105 duration-75";
    if (node.isFrontier) return base + "bg-[#ffea00] shadow-[0_0_10px_#ffea00] duration-75";
    if (node.isVisited || node.visitedBy) return base + "bg-[#7000ff]/50 border-[#7000ff]/30 shadow-[inset_0_0_8px_rgba(112,0,255,0.5)] duration-500";
    
    return base + "bg-[#0a0a1a] hover:bg-[#1a1a3a]";
  };

  return (
    <div 
      className="min-h-screen bg-[#030308] text-[#00f0ff] font-mono p-6 flex flex-col selection:bg-[#00f0ff]/30"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header & Controls */}
      <div className="max-w-[1200px] mx-auto w-full mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-3 text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
            <Hexagon className="text-[#00f0ff]" />
            PATHFINDER<span className="text-[#00f0ff]">_OS</span>
          </h1>
          <p className="text-sm text-[#00f0ff]/60 mt-1 uppercase tracking-widest">Grid Expansion Visualizer v2.0</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-[#0a0a1a] p-2 rounded-lg border border-[#00f0ff]/20 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
          <div className="flex gap-1 pr-4 border-r border-[#00f0ff]/20">
            {ALGORITHMS.map(a => {
              const Icon = a.icon;
              const isActive = algo.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => { setAlgo(a); resetSearch(); }}
                  disabled={isRunning}
                  className={`px-3 py-2 rounded flex items-center gap-2 text-sm transition-all ${
                    isActive 
                      ? 'bg-[#