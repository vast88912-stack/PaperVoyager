import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- TYPES ---
type Mode = 'naive' | 'memo' | 'tabulation';

type TreeNode = {
  id: string;
  n: number;
  depth: number;
  x: number;
  y: number;
  children: TreeNode[];
};

type TraceStep = {
  active?: string;
  visited?: Set<string>;
  memo?: Record<number, number>;
  dp?: number[];
  activeIndices?: number[];
  target?: number;
  msg: string;
  result?: number;
  hit?: boolean;
};

// --- HELPER: TREE LAYOUT ---
const generateTree = (n: number, id = 'root', depth = 0): TreeNode => {
  if (n <= 1) return { id, n, depth, x: 0, y: 0, children: [] };
  return {
    id,
    n,
    depth,
    x: 0,
    y: 0,
    children: [
      generateTree(n - 1, id + '-L', depth + 1),
      generateTree(n - 2, id + '-R', depth + 1),
    ],
  };
};

const layoutTree = (root: TreeNode) => {
  let x = 0;
  let maxDepth = 0;
  const traverse = (node: TreeNode) => {
    if (node.children[0]) traverse(node.children[0]);
    node.x = x++;
    if (node.depth > maxDepth) maxDepth = node.depth;
    if (node.children[1]) traverse(node.children[1]);
  };
  traverse(root);
  
  const nodes: TreeNode[] = [];
  const edges: { source: TreeNode; target: TreeNode }[] = [];
  const extract = (node: TreeNode) => {
    nodes.push(node);
    for (const child of node.children) {
      edges.push({ source: node, target: child });
      extract(child);
    }
  };
  extract(root);
  
  return { root, maxX: x - 1, maxDepth, nodes, edges };
};

// --- HELPER: TRACE GENERATORS ---
const getNaiveTrace = (n: number): TraceStep[] => {
  const trace: TraceStep[] = [];
  const visited = new Set<string>();

  const run = (currN: number, id: string): number => {
    visited.add(id);
    trace.push({ active: id, visited: new Set(visited), msg: `Calling fib(${currN})` });
    
    if (currN <= 1) {
      trace.push({ active: id, visited: new Set(visited), msg: `Base case reached: fib(${currN}) = ${currN}`, result: currN });
      return currN;
    }
    
    const left = run(currN - 1, id + '-L');
    trace.push({ active: id, visited: new Set(visited), msg: `Left child returned ${left}. Now calling right child fib(${currN - 2}).` });
    
    const right = run(currN - 2, id + '-R');
    const res = left + right;
    
    trace.push({ active: id, visited: new Set(visited), msg: `Returning fib(${currN}) = ${left} + ${right} = ${res}`, result: res });
    return res;
  };
  
  run(n, 'root');
  trace.push({ visited: new Set(visited), msg: `Done! Final result is ${n <= 1 ? n : trace[trace.length - 1].result}.` });
  return trace;
};

const getMemoTrace = (n: number): TraceStep[] => {
  const trace: TraceStep[] = [];
  const visited = new Set<string>();
  const memo: Record<number, number> = {};

  const run = (currN: number, id: string): number => {
    visited.add(id);
    trace.push({ active: id, visited: new Set(visited), memo: { ...memo }, msg: `Calling fib(${currN})` });
    
    if (memo[currN] !== undefined) {
      trace.push({ active: id, visited: new Set(visited), memo: { ...memo }, msg: `Memo hit! fib(${currN}) is already ${memo[currN]}. Skipping subtree.`, hit: true });
      return memo[currN];
    }
    
    if (currN <= 1) {
      memo[currN] = currN;
      trace.push({ active: id, visited: new Set(visited), memo: { ...memo }, msg: `Base case fib(${currN}) = ${currN}. Saving to memo.` });
      return currN;
    }
    
    const left = run(currN - 1, id + '-L');
    const right = run(currN - 2, id + '-R');
    const res = left + right;
    
    memo[currN] = res;
    trace.push({ active: id, visited: new Set(visited), memo: { ...memo }, msg: `Computed fib(${currN}) = ${left} + ${right} = ${res}. Saving to memo.`, result: res });
    return res;
  };
  
  run(n, 'root');
  trace.push({ visited: new Set(visited), memo: { ...memo }, msg: `Done! Final result is ${memo[n]}.` });
  return trace;
};

const getTabTrace = (n: number): TraceStep[] => {
  const trace: TraceStep[] = [];
  const dp: number[] = [0, 1];
  
  trace.push({ dp: [], activeIndices: [], msg: `Starting tabulation for fib(${n}).` });
  trace.push({ dp: [0], activeIndices: [], target: 0, msg: `Initialize base case: dp[0] = 0` });
  if (n >= 1) {
    trace.push({ dp: [0, 1], activeIndices: [], target: 1, msg: `Initialize base case: dp[1] = 1` });
  }
  
  for (let i = 2; i <= n; i++) {
    trace.push({ dp: [...dp], activeIndices: [i - 1, i - 2], target: i, msg: `Computing dp[${i}] = dp[${i - 1}] + dp[${i - 2}]` });
    dp[i] = dp[i - 1] + dp[i - 2];
    trace.push({ dp: [...dp], activeIndices: [], target: i, msg: `dp[${i}] = ${dp[i]}` });
  }
  
  trace.push({ dp: [...dp], activeIndices: [], msg: `Done! Result is dp[${n}] = ${dp[n]}` });
  return trace;
};

// --- ICONS ---
const PlayIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>;
const PauseIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4h3v12H5zm7 0h3v12h-3z" /></svg>;
const ResetIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>;
const StepForwardIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 5h3v10h-3zM4 5l9 5-9 5z" /></svg>;
const StepBackIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 5h3v10H4zm9 5l-9 5v-10z" /></svg>;

// --- MAIN COMPONENT ---
export default function App() {
  const [n, setN] = useState<number>(5);
  const [mode, setMode] = useState<Mode>('naive');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(500);

  // Generate layout and trace when inputs change
  const { treeLayout, trace } = useMemo(() => {
    const rawTree = generateTree(n);
    const layout = layoutTree(rawTree);
    let tr: TraceStep[] = [];
    if (mode === 'naive') tr = getNaiveTrace(n);
    else if (mode === 'memo') tr = getMemoTrace(n);
    else if (mode === 'tabulation') tr = getTabTrace(n);
    return { treeLayout: layout, trace: tr };
  }, [n, mode]);

  const currentStep = trace[stepIndex] || trace[trace.length - 1];
  const isDone = stepIndex >= trace.length - 1;

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIndex((prev) => Math.min