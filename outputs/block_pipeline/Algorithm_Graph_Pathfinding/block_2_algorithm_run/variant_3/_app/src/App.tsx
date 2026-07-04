import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- CONSTANTS & GRAPH DEFINITIONS ---
const ROWS = 15;
const COLS = 25;
const START = { x: 2, y: 7 };
const GOAL = { x: 22, y: 7 };

const START_ID = START.y * COLS + START.x;
const GOAL_ID = GOAL.y * COLS + GOAL.x;

// A symmetrical, cyberpunk-style grid layout
const MAZE_PATTERN = [
  "0000000000000000000000000",
  "0000111110000000111110000",
  "0000100000001000000010000",
  "0000100111111111110010000",
  "0000000100000000010000000",
  "0000000100011100010000000",
  "0001111100010100011111000",
  "0000000000010100000000000",
  "0001111100011100011111000",
  "0000000100000000010000000",
  "0000100111111111110010000",
  "0000100000001000000010000",
  "0000111110000000111110000",
  "0000000000000000000000000",
  "0000000000000000000000000"
];

const WALLS = new Set<number>();
MAZE_PATTERN.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    if (row[x] === '1') WALLS.add(y * COLS + x);
  }
});

// --- PATHFINDING LOGIC (PRECOMPUTED FOR SMOOTH ANIMATION) ---

type Frame = {
  frontier: number[];
  visited: number[];
  path: number[];
};

type Node = {
  id: number;
  x: number;
  y: number;
  g: number;
  f: number;
  parent: Node | null;
};

const getNeighbors = (x: number, y: number) => {
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // Right, Down, Left, Up
  const neighbors = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
      const nid = ny * COLS + nx;
      if (!WALLS.has(nid)) {
        neighbors.push({ x: nx, y: ny, id: nid });
      }
    }
  }
  return neighbors;
};

const computeAStarOrDijkstra = (isAStar: boolean): Frame[] => {
  const history: Frame[] = [];
  const openList: Node[] = [{ id: START_ID, x: START.x, y: START.y, g: 0, f: 0, parent: null }];
  const closedSet = new Set<number>();
  const openSet = new Set<number>([START_ID]);
  let foundNode: Node | null = null;

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;
    openSet.delete(current.id);
    closedSet.add(current.id);

    history.push({
      frontier: Array.from(openSet),
      visited: Array.from(closedSet),
      path: []
    });

    if (current.id === GOAL_ID) {
      foundNode = current;
      break;
    }

    for (const n of getNeighbors(current.x, current.y)) {
      if (closedSet.has(n.id)) continue;

      const g = current.g + 1;
      const h = isAStar ? Math.abs(n.x - GOAL.x) + Math.abs(n.y - GOAL.y) : 0;
      const f = g + h;

      const existing = openList.find(node => node.id === n.id);
      if (!existing) {
        openList.push({ id: n.id, x: n.x, y: n.y, g, f, parent: current });
        openSet.add(n.id);
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = f;
        existing.parent = current;
      }
    }
  }

  return buildPathFrames(history, foundNode, closedSet);
};

const computeBFS = (): Frame[] => {
  const history: Frame[] = [];
  const queue: Node[] = [{ id: START_ID, x: START.x, y: START.y, g: 0, f: 0, parent: null }];
  const visited = new Set<number>([START_ID]);
  const frontierSet = new Set<number>([START_ID]);
  let foundNode: Node | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    frontierSet.delete(current.id);

    history.push({
      frontier: Array.from(frontierSet),
      visited: Array.from(visited),
      path: []
    });

    if (current.id === GOAL_ID) {
      foundNode = current;
      break;
    }

    for (const n of getNeighbors(current.x, current.y)) {
      if (!visited.has(n.id)) {
        visited.add(n.id);
        frontierSet.add(n.id);
        queue.push({ id: n.id, x: n.x, y: n.y, g: current.g + 1, f: 0, parent: current });
      }
    }
  }

  return buildPathFrames(history, foundNode, visited);
};

const computeBidirectional = (): Frame[] => {
  const history: Frame[] = [];
  const qStart: Node[] = [{ id: START_ID, x: START.x, y: START.y, g: 0, f: 0, parent: null }];
  const qGoal: Node[] = [{ id: GOAL_ID, x: GOAL.x, y: GOAL.y, g: 0, f: 0, parent: null }];
  
  const visitedStart = new Map<number, Node>();
  const visitedGoal = new Map<number, Node>();
  
  visitedStart.set(START_ID, qStart[0]);
  visitedGoal.set(GOAL_ID, qGoal[0]);

  const frontierSet = new Set<number>([START_ID, GOAL_ID]);
  
  let meetNodeStart: Node | null = null;
  let meetNodeGoal: Node | null = null;

  while (qStart.length > 0 && qGoal.length > 0) {
    // Expand Start Side
    const currS = qStart.shift()!;
    frontierSet.delete(currS.id);
    
    if (visitedGoal.has(currS.id)) {
      meetNodeStart = currS;
      meetNodeGoal = visitedGoal.get(currS.id)!;
      break;
    }

    for (const n of getNeighbors(currS.x, currS.y)) {
      if (!visitedStart.has(n.id)) {
        const nextNode = { id: n.id, x: n.x, y: n.y, g: currS.g + 1, f: 0, parent: currS };
        visitedStart.set(n.id, nextNode);
        frontierSet.add(n.id);
        qStart.push(nextNode);
      }
    }

    // Expand Goal Side
    const currG = qGoal.shift()!;
    frontierSet.delete(currG.id);
    
    if (visitedStart.has(currG.id)) {
      meetNodeGoal = currG;
      meetNodeStart = visitedStart.get(currG.id)!;
      break;
    }

    for (const n of getNeighbors(currG.x, currG.y)) {
      if (!visitedGoal.has(n.id)) {
        const nextNode = { id: n.id, x: n.x, y: n.y, g: currG.g + 1, f: 0, parent: currG };
        visitedGoal.set(n.id, nextNode);
        frontierSet.add(n.id);
        qGoal.push(nextNode);
      }
    }

    history.push({
      frontier: Array.from(frontierSet),
      visited: [...Array.from(visitedStart.keys()), ...Array.from(visitedGoal.keys())],
      path: []
    });
  }

  // Reconstruct path
  const path: number[] = [];
  if (meetNodeStart && meetNodeGoal) {
    let curr: Node | null = meetNodeStart;
    while (curr) { path.push(curr.id); curr = curr.parent; }
    path.reverse();
    curr = meetNodeGoal.parent; // skip the meet node itself to avoid duplicate
    while (curr) { path.push(curr.id); curr = curr.parent; }
  }

  const allVisited = new Set([...Array.from(visitedStart.keys()), ...Array.from(visitedGoal.keys())]);
  for (let i = 1; i <= path.length; i++) {
    history.push({
      frontier: [],
      visited: Array.from(allVisited),
      path: path.slice(0, i)
    });
  }

  return history;
};

const buildPathFrames = (history: Frame[], foundNode: Node | null, closedSet: Set<number>): Frame[] => {
  const path: number[] = [];
  let curr = foundNode;
  while (curr) {
    path.push(curr.id);
    curr = curr.parent;
  }
  path.reverse();

  for (let i = 1; i <= path.length; i++) {
    history.push({
      frontier: [],
      visited: Array.from(closedSet),
      path: path.slice(0, i)
    });
  }
  return history;
};

type AlgoType = 'BFS' | 'Dijkstra' | 'A*' | 'Bidirectional';

export default function App() {
  const [algo, setAlgo] = useState<AlgoType>('A*');
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);

  // Pre-compute frames so playback is butter smooth and independent of logic
  const frames = useMemo(() => {
    switch (algo) {
      case 'BFS': return computeBFS();
      case 'Dijkstra': return computeAStarOrDijkstra(false);
      case 'A*': return computeAStarOrDijkstra(true);
      case 'Bidirectional': return computeBidirectional();
      default: return computeAStarOrDijkstra(true);
    }
  }, [algo]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && step < frames.length - 1) {
      interval = setInterval(() => {
        setStep(s => s + 1);
      }, 20); // Fast, snappy animation
    } else if (step >= frames.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, step, frames.length]);

  const handleReset = () => {
    setIsPlaying(false);
    setStep(0);
  };

  const handleStepForward = () => {
    if (step < frames.length - 1) {
      setStep(s => s + 1);
    }
  };

  const currentFrame = frames[step] || { frontier: [], visited: [], path: [] };
  const progress = ((step / (frames.length - 1)) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 flex flex-col items-center justify-center overflow-hidden selection:bg-cyan-500/30">
      
      {/* BACKGROUND GLOW */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER */}
      <div className