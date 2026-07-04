import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
type NodeType = 'empty' | 'wall' | 'start' | 'end' | 'frontier' | 'visited' | 'path';

interface GridNode {
  r: number;
  c: number;
  type: NodeType;
  isWall: boolean;
  distance: number;
  f: number;
  g: number;
  h: number;
  previousNode: GridNode | null;
  visitedBy?: 'start' | 'end'; // For bidirectional
}

interface StepAction {
  r: number;
  c: number;
  type: NodeType;
}

// --- Constants ---
const ROWS = 21;
const COLS = 35;
const START_NODE = { r: 10, c: 5 };
const END_NODE = { r: 10, c: 29 };

const SPEED_MS = 20;

// --- Helper Functions ---
const createInitialGrid = (): GridNode[][] => {
  const grid: GridNode[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const currentRow: GridNode[] = [];
    for (let c = 0; c < COLS; c++) {
      currentRow.push({
        r,
        c,
        type: (r === START_NODE.r && c === START_NODE.c) ? 'start' : (r === END_NODE.r && c === END_NODE.c) ? 'end' : 'empty',
        isWall: false,
        distance: Infinity,
        f: Infinity,
        g: Infinity,
        h: Infinity,
        previousNode: null,
      });
    }
    grid.push(currentRow);
  }
  
  // Add some aesthetic neon maze walls
  const walls = [
    [5,5],[6,5],[7,5],[8,5],[9,5],[11,5],[12,5],[13,5],[14,5],[15,5],
    [5,10],[5,11],[5,12],[5,13],[5,14],[15,10],[15,11],[15,12],[15,13],[15,14],
    [8,20],[9,20],[10,20],[11,20],[12,20],[13,20],
    [2,25],[3,25],[4,25],[5,25],[15,25],[16,25],[17,25],[18,25]
  ];
  
  walls.forEach(([wr, wc]) => {
    if (grid[wr] && grid[wr][wc]) {
      grid[wr][wc].isWall = true;
      grid[wr][wc].type = 'wall';
    }
  });

  return grid;
};

const getNeighbors = (node: GridNode, grid: GridNode[][]): GridNode[] => {
  const neighbors: GridNode[] = [];
  const { r, c } = node;
  if (r > 0) neighbors.push(grid[r - 1][c]);
  if (r < ROWS - 1) neighbors.push(grid[r + 1][c]);
  if (c > 0) neighbors.push(grid[r][c - 1]);
  if (c < COLS - 1) neighbors.push(grid[r][c + 1]);
  return neighbors.filter(n => !n.isWall);
};

const manhattanDistance = (a: GridNode, b: GridNode) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

// --- Algorithms ---
const runBFS = (grid: GridNode[][], start: GridNode, end: GridNode): StepAction[] => {
  const sequence: StepAction[] = [];
  const queue: GridNode[] = [start];
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current !== start && current !== end) {
      sequence.push({ r: current.r, c: current.c, type: 'visited' });
    }

    if (current.r === end.r && current.c === end.c) {
      // Trace path
      let curr: GridNode | null = current.previousNode;
      const path: StepAction[] = [];
      while (curr && curr !== start) {
        path.unshift({ r: curr.r, c: curr.c, type: 'path' });
        curr = curr.previousNode;
      }
      return sequence.concat(path);
    }

    const neighbors = getNeighbors(current, grid);
    for (const neighbor of neighbors) {
      const key = `${neighbor.r},${neighbor.c}`;
      if (!visited.has(key)) {
        visited.add(key);
        neighbor.previousNode = current;
        if (neighbor !== end) {
          sequence.push({ r: neighbor.r, c: neighbor.c, type: 'frontier' });
        }
        queue.push(neighbor);
      }
    }
  }
  return sequence;
};

const runDijkstra = (grid: GridNode[][], start: GridNode, end: GridNode): StepAction[] => {
  const sequence: StepAction[] = [];
  const unvisited: GridNode[] = [];
  
  for (const row of grid) {
    for (const node of row) {
      node.distance = Infinity;
      node.previousNode = null;
      unvisited.push(node);
    }
  }
  start.distance = 0;

  while (unvisited.length > 0) {
    unvisited.sort((a, b) => a.distance - b.distance);
    const current = unvisited.shift()!;

    if (current.distance === Infinity) break;
    if (current.isWall) continue;

    if (current !== start && current !== end) {
      sequence.push({ r: current.r, c: current.c, type: 'visited' });
    }

    if (current === end) {
      let curr: GridNode | null = current.previousNode;
      const path: StepAction[] = [];
      while (curr && curr !== start) {
        path.unshift({ r: curr.r, c: curr.c, type: 'path' });
        curr = curr.previousNode;
      }
      return sequence.concat(path);
    }

    const neighbors = getNeighbors(current, grid);
    for (const neighbor of neighbors) {
      const alt = current.distance + 1;
      if (alt < neighbor.distance) {
        neighbor.distance = alt;
        neighbor.previousNode = current;
        if (neighbor !== end) {
          sequence.push({ r: neighbor.r, c: neighbor.c, type: 'frontier' });
        }
      }
    }
  }
  return sequence;
};

const runAStar = (grid: GridNode[][], start: GridNode, end: GridNode): StepAction[] => {
  const sequence: StepAction[] = [];
  const openSet: GridNode[] = [start];
  const closedSet = new Set<string>();

  for (const row of grid) {
    for (const node of row) {
      node.g = Infinity;
      node.f = Infinity;
      node.previousNode = null;
    }
  }
  start.g = 0;
  start.f = manhattanDistance(start, end);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    closedSet.add(`${current.r},${current.c}`);

    if (current !== start && current !== end) {
      sequence.push({ r: current.r, c: current.c, type: 'visited' });
    }

    if (current === end) {
      let curr: GridNode | null = current.previousNode;
      const path: StepAction[] = [];
      while (curr && curr !== start) {
        path.unshift({ r: curr.r, c: curr.c, type: 'path' });
        curr = curr.previousNode;
      }
      return sequence.concat(path);
    }

    const neighbors = getNeighbors(current, grid);
    for (const neighbor of neighbors) {
      if (closedSet.has(`${neighbor.r},${neighbor.c}`)) continue;

      const tentativeG = current.g + 1;
      let isNewPath = false;

      const inOpenSet = openSet.find(n => n.r === neighbor.r && n.c === neighbor.c);
      if (!inOpenSet) {
        isNewPath = true;
        openSet.push(neighbor);
        if (neighbor !== end) {
          sequence.push({ r: neighbor.r, c: neighbor.c, type: 'frontier' });
        }
      } else if (tentativeG < neighbor.g) {
        isNewPath = true;
      }

      if (isNewPath) {
        neighbor.previousNode = current;
        neighbor.g = tentativeG;
        neighbor.h = manhattanDistance(neighbor, end);
        neighbor.f = neighbor.g + neighbor.h;
      }
    }
  }
  return sequence;
};

const runBidirectional = (grid: GridNode[][], start: GridNode, end: GridNode): StepAction[] => {
  const sequence: StepAction[] = [];
  const queueStart: GridNode[] = [start];
  const queueEnd: GridNode[] = [end];
  
  const visitedStart = new Map<string, GridNode>();
  const visitedEnd = new Map<string, GridNode>();
  
  visitedStart.set(`${start.r},${start.c}`, start);
  visitedEnd.set(`${end.r},${end.c}`, end);
  start.visitedBy = 'start';
  end.visitedBy = 'end';

  let meetNode: GridNode | null = null;

  while (queueStart.length > 0 && queueEnd.length > 0 && !meetNode) {
    // Expand Start
    const currStart = queueStart.shift()!;
    if (currStart !== start && currStart !== end) {
      sequence.push({ r: currStart.r, c: currStart.c, type: 'visited' });
    }
    
    for (const n of getNeighbors(currStart, grid)) {
      const key = `${n.r},${n.c}`;
      if (visitedEnd.has(key)) {
        n.previousNode = currStart;
        meetNode = n;
        break;
      }
      if (!visitedStart.has(key)) {
        visitedStart.set(key, n);
        n.previousNode = currStart;
        n.visitedBy = 'start';
        if (n !== start && n !== end) sequence.push({ r: n.r, c: n.c, type: 'frontier' });
        queueStart.push(n);
      }
    }

    if (meetNode) break;

    // Expand End
    const currEnd = queueEnd.shift()!;
    if (currEnd !== start && currEnd !== end) {
      sequence.push({ r: currEnd.r, c: currEnd.c, type: 'visited' });
    }

    for (const n of getNeighbors(currEnd, grid)) {
      const key = `${n.r},${n.c}`;
      if (visitedStart.has(key)) {
        // Met!
        meetNode = currEnd;
        currEnd.previousNode = n; // Connect backwards
        break;
      }
      if (!visitedEnd.has(key)) {
        visitedEnd.set(key, n);
        n.previousNode = currEnd;
        n.visitedBy = 'end';
        if (n !== start && n !== end) sequence.push({ r: n.r, c: n.c, type: 'frontier' });
        queueEnd.push(n);
      }
    }
  }

  if (meetNode) {
    // Reconstruct path. Bidirectional is tricky because pointers go towards start from both ends if we aren't careful.
    // In our logic: start side previousNodes go towards start. End side previousNodes go towards end.
    const path: StepAction[] = [];
    
    // Trace back to start
    let curr: GridNode | null = meetNode;
    while (curr && curr !== start) {
      if (curr !== meetNode && curr !== end) path.unshift({ r: curr.r, c: curr.c, type: 'path' });
      curr = curr.visitedBy === 'start' ? curr.previousNode : visitedStart.get(`${curr.previousNode?.r},${curr.previousNode?.c}`) || null;
      if (!curr) break; // Fallback
    }
    
    // Trace back to end
    curr = meetNode;
    while (curr && curr !== end) {
      if (curr !== start && curr !== meetNode) path.push({ r: curr.r, c: curr.c, type: 'path' });
      curr = curr.visitedBy === 'end' ? curr.previousNode : visitedEnd.get(`${curr.previousNode?.r},${curr.previousNode?.c}`) || null;
      if (!curr) break; // Fallback
    }

    path.push({ r: meetNode.r, c: meetNode.c, type: 'path' });
    return sequence.concat(path);
  }

  return sequence;
};

// --- Main Component ---
export default function App() {
  const [grid, setGrid] = useState<GridNode[][]>([]);
  const [algo, setAlgo] = useState<string>('A*');
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  
  const sequenceRef = useRef<StepAction[]>([]);
  const stepIndexRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    setGrid(createInitialGrid());
  }, []);

  const getAlgorithmSequence = () => {
    const gridCopy = createInitialGrid(); // Fresh grid for logic
    const start = gridCopy[START_NODE.r][START_NODE.c];
    const end = gridCopy[END_NODE.r][END_NODE.c];
    
    switch (algo) {
      case 'BFS': return runBFS(gridCopy, start, end);
      case 'Dijkstra': return runDijkstra(gridCopy, start, end);
      case 'Bidirectional': return runBidirectional(gridCopy, start, end);
      case 'A*':
      default: return runAStar(gridCopy, start, end);
    }
  };

  const applyStep = useCallback((action: StepAction) => {
    setGrid((prev) => {
      const newGrid = [...prev];
      const newRow = [...newGrid[action.r]];
      newRow[action.c] = { ...newRow[action.c], type: action.type };
      newGrid[action.r] = newRow;
      return newGrid;
    });
  }, []);

  const playForward = useCallback(() => {
    if (stepIndexRef.current >= sequenceRef.current.length) {
      setStatus('finished');
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const action = sequenceRef.current[stepIndexRef.current];
    applyStep(action);
    stepIndexRef.current++;
  }, [applyStep]);

  const handleStart = () => {
    if (status === 'idle' || status === 'finished') {
      setGrid(createInitialGrid());
      sequenceRef.current = getAlgorithmSequence();
      stepIndexRef.current = 0;
    }
    setStatus('running');
    if (!timerRef.current) {
      timerRef.current = setInterval(playForward, SPEED_MS);
    }
  };

  const handlePause = () => {
    setStatus('paused');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStep = () => {
    if (status === 'idle' || status === 'finished') {
      setGrid(createInitialGrid());
      sequenceRef.current = getAlgorithmSequence();
      stepIndexRef.current = 0;
      setStatus('paused');
    }
    playForward();
  };

  const handleReset = () => {
    setStatus('idle');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGrid(createInitialGrid());
    sequenceRef.current = [];
    stepIndexRef.current = 0;
  };

  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(playForward, SPEED_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, playForward]);

  // Color mapping for nodes
  const getNodeClasses = (type: NodeType) => {
    switch (type) {
      case 'start': return 'bg-cyan-400 shadow-[0_0_12px_#22d3ee] z-10 scale-110 rounded-sm';
      case 'end': return 'bg-fuchsia-500 shadow-[0_0_12px_#d946ef] z-10 scale-110 rounded-sm';
      case 'wall': return 'bg-slate-800 border border-slate-700/50';
      case 'frontier': return 'bg-yellow-400 shadow-[0_0_8px_#facc15] animate-pulse rounded-sm';
      case 'visited': return 'bg-indigo-600/80 border border-indigo-500/30 transition-colors duration-500';
      case 'path': return 'bg-white shadow-[0_0_15px_#ffffff] z-20 scale-105 rounded-sm transition-all duration-300';
      case 'empty': default: return 'bg-slate-900/40 border border-slate-800/50';
    }
  };

  // Legend dynamic text based on algo
  const getLegendText = () => {
    switch (algo) {
      case 'BFS': return { frontier: 'Queue (FIFO)', visited: 'Dequeued' };
      case 'Dijkstra': return { frontier: 'Min-Heap (Dist)', visited: 'Settled Node' };
      case 'A*': return { frontier: 'Open Set (f-score)', visited: 'Closed Set' };
      case 'Bidirectional': return { frontier: 'Frontiers (A & B)', visited: 'Explored' };
      default: return { frontier: 'Frontier', visited: 'Visited' };
    }
  };
  const legend = getLegendText();

  return (
    <div className="min-h-screen bg-gray-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-cyan-500/30">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-gray-900/80 border-b md:border-b-0 md:border-r border-gray-800 p-6 flex flex-col shadow-2xl z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 tracking-tight">
            PATHFINDING
            <br />
            <span className="text-white">PLAYGROUND</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            Analyze frontier expansion and shortest-path topologies in real-time.
          </p>
        </div>

        <div className="space-y-6 flex-1">
          {/* Algorithm Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Algorithm</label>
            <div className="space-y-2">
              {['A*', 'Dijkstra', 'BFS', 'Bidirectional'].map((a) => (
                <button
                  key={a}
                  onClick={() => { setAlgo(a); handleReset(); }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    algo === a 
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]' 
                    : 'bg-gray