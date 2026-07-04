import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  BrainCircuit, Zap, ArrowRight, GitMerge, Layers, Play, Pause, RotateCcw, 
  Cpu, SkipForward, SkipBack, Info, ShieldAlert, Grid2X2, Plus, Trash2, 
  Settings2, BookOpen, Layout
} from 'lucide-react';

// ==========================================
// TYPES & CONSTANTS
// ==========================================

// --- Fibonacci Types ---
type FibAlgo = "naive" | "memo" | "tabulation";
type FibStep =
  | { type: "call"; n: number; parent?: number }
  | { type: "return"; n: number; value: number }
  | { type: "table_update"; n: number; value: number };

// --- Grid Paths Types ---
type GridStepType = 'call' | 'return' | 'cache_hit' | 'obstacle' | 'base_case' | 'out_of_bounds';
interface GridStep {
  type: GridStepType;
  r: number;
  c: number;
  value?: number;
  memo: Record<string, number>;
  stack: string[];
  description: string;
}
const ROWS = 5;
const COLS = 6;
const INITIAL_GRID = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
INITIAL_GRID[1][2] = 1;
INITIAL_GRID[3][1] = 1;
INITIAL_GRID[2][4] = 1;

// --- Knapsack Types ---
interface Item {
  id: string;
  name: string;
  weight: number;
  value: number;
}
interface Cell {
  r: number;
  c: number;
}
interface TraceStep {
  type: 'INIT' | 'EVAL' | 'BACKTRACK' | 'DONE';
  i: number;
  w: number;
  dpState: (number | null)[][];
  explanation: string;
  formula?: string;
  activeCells: Cell[];
  targetCell: Cell | null;
  backtrackPath: Cell[];
  chosenItems: number[];
}

// --- Pattern Library Types ---
type StepState = 0 | 1 | 2 | 3;
interface PatternData {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  examples: string[];
  formula: string;
  color: string;
  Visual: React.FC<{ step: StepState }>;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function* fibNaiveTrace(n: number, parent?: number): Generator<FibStep, number> {
  yield { type: "call", n, parent };
  if (n <= 1) {
    yield { type: "return", n, value: n };
    return n;
  }
  const left = yield* fibNaiveTrace(n - 1, n);
  const right = yield* fibNaiveTrace(n - 2, n);
  const val = left + right;
  yield { type: "return", n, value: val };
  return val;
}

function* fibMemoTrace(n: number, memo: Record<number, number> = {}, parent?: number): Generator<FibStep, number> {
  yield { type: "call", n, parent };
  if (n in memo) {
    yield { type: "return", n, value: memo[n] };
    return memo[n];
  }
  if (n <= 1) {
    memo[n] = n;
    yield { type: "return", n, value: n };
    return n;
  }
  const left = yield* fibMemoTrace(n - 1, memo, n);
  const right = yield* fibMemoTrace(n - 2, memo, n);
  memo[n] = left + right;
  yield { type: "return", n, value: memo[n] };
  return memo[n];
}

function* fibTabulationTrace(n: number): Generator<FibStep, number> {
  const table: number[] = [];
  for (let i = 0; i <= n; ++i) {
    if (i <= 1) {
      table[i] = i;
    } else {
      table[i] = table[i - 1] + table[i - 2];
    }
    yield { type: "table_update", n: i, value: table[i] };
  }
  return table[n];
}

function useStepper(n: number, algo: FibAlgo): [FibStep[], number, () => void, () => void, () => void, boolean, boolean, () => void, number | null] {
  const [steps, setSteps] = useState<FibStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const genRef = useRef<Generator<FibStep, number>>();
  const [running, setRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSteps([]);
    setStepIdx(0);
    setResult(null);
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    let gen: Generator<FibStep, number>;
    if (algo === "naive") gen = fibNaiveTrace(n);
    else if (algo === "memo") gen = fibMemoTrace(n);
    else gen = fibTabulationTrace(n);
    genRef.current = gen;
    const { value, done } = gen.next();
    if (!done && value) setSteps([value]);
    else if (done) setResult(value as number);
  }, [n, algo]);

  const stepForward = () => {
    if (!genRef.current) return;
    const gen = genRef.current;
    const { value, done } = gen.next();
    if (!done && value) {
      setSteps((prev) => [...prev, value]);
      setStepIdx((idx) => idx + 1);
    } else if (done) {
      setResult(value as number);
      setStepIdx((idx) => idx + 1);
    }
  };

  const stepBack = () => {
    if (stepIdx > 0) setStepIdx((idx) => idx - 1);
  };

  const reset = () => {
    setStepIdx(0);
    setRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (stepIdx >= steps.length && result !== null) {
      setRunning(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      stepForward();
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [running, stepIdx, steps.length, result]);

  const run = () => setRunning(true);
  const canStepForward = stepIdx < steps.length;
  const canStepBack = stepIdx > 0;

  return [steps.slice(0, stepIdx + 1), stepIdx, stepForward, stepBack, run, canStepForward, canStepBack, reset, result];
}

function generateSteps(grid: number[][], useMemo: boolean): GridStep[] {
  const steps: GridStep[] = [];
  const memo: Record<string, number> = {};
  const stack: string[] = [];

  function solve(r: number, c: number): number {
    const key = `${r},${c}`;
    stack.push(key);

    if (r < 0 || c < 0) {
      steps.push({ type: 'out_of_bounds', r, c, memo: { ...memo }, stack: [...stack], description: `Out of bounds at (${r}, ${c}). Returning 0.` });
      stack.pop();
      return 0;
    }
    if (grid[r][c] === 1) {
      steps.push({ type: 'obstacle', r, c, memo: { ...memo }, stack: [...stack], description: `Hit an obstacle at (${r}, ${c}). Returning 0.` });
      stack.pop();
      return 0;
    }
    if (r === 0 && c === 0) {
      steps.push({ type: 'base_case', r, c, value: 1, memo: { ...memo }, stack: [...stack], description: `Reached Start (0, 0). Base case found: 1 path.` });
      stack.pop();
      return 1;
    }
    if (useMemo && memo[key] !== undefined) {
      steps.push({ type: 'cache_hit', r, c, value: memo[key], memo: { ...memo }, stack: [...stack], description: `Cache hit at (${r}, ${c})! Reusing computed value: ${memo[key]}.` });
      stack.pop();
      return memo[key];
    }

    steps.push({ type: 'call', r, c, memo: { ...memo }, stack: [...stack], description: `Computing paths to (${r}, ${c}). Exploring Up and Left...` });

    const up = solve(r - 1, c);
    const left = solve(r, c - 1);
    const total = up + left;

    if (useMemo) memo[key] = total;

    steps.push({ type: 'return', r, c, value: total, memo: { ...memo }, stack: [...stack], description: `Computed (${r}, ${c}) = ${up} (Up) + ${left} (Left) = ${total} paths.` });
    stack.pop();
    return total;
  }

  solve(ROWS - 1, COLS - 1);
  return steps;
}

function generateKnapsackTrace(items: Item[], capacity: number): TraceStep[] {
  const n = items.length;
  const dp: (number | null)[][] = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(null));
  const trace: TraceStep[] = [];
  const cloneDP = () => dp.map((row) => [...row]);

  for (let i = 0; i <= n; i++) dp[i][0] = 0;
  for (let w = 0; w <= capacity; w++) dp[0][w] = 0;

  trace.push({ type: 'INIT', i: 0, w: 0, dpState: cloneDP(), explanation: 'Initialize the DP table. 0 items or 0 capacity means 0 value.', activeCells: [], targetCell: null, backtrackPath: [], chosenItems: [] });

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let w = 1; w <= capacity; w++) {
      const activeCells: Cell[] = [{ r: i - 1, c: w }];
      const valWithout = dp[i - 1][w] as number;
      let valWith = 0;
      let explanation = `Evaluating "${item.name}" (W:${item.weight}, V:${item.value}) at capacity ${w}. `;
      let formula = '';

      if (item.weight <= w) {
        valWith = (dp[i - 1][w - item.weight] as number) + item.value;
        activeCells.push({ r: i - 1, c: w - item.weight });
        if (valWith > valWithout) {
          dp[i][w] = valWith;
          explanation += `It fits! Including it gives ${valWith} (${dp[i - 1][w - item.weight]} + ${item.value}). Excluding gives ${valWithout}. We take the max.`;
          formula = `dp[${i}][${w}] = max(${valWithout}, ${dp[i - 1][w - item.weight]} + ${item.value}) = ${valWith}`;
        } else {
          dp[i][w] = valWithout;
          explanation += `It fits, but excluding it yields a higher or equal value (${valWithout} >= ${valWith}).`;
          formula = `dp[${i}][${w}] = max(${valWithout}, ${dp[i - 1][w - item.weight]} + ${item.value}) = ${valWithout}`;
        }
      } else {
        dp[i][w] = valWithout;
        explanation += `Item is too heavy (${item.weight} > ${w}). We must exclude it.`;
        formula = `dp[${i}][${w}] = dp[${i - 1}][${w}] = ${valWithout}`;
      }

      trace.push({ type: 'EVAL', i, w, dpState: cloneDP(), explanation, formula, activeCells, targetCell: { r: i, c: w }, backtrackPath: [], chosenItems: [] });
    }
  }

  let res = dp[n][capacity] as number;
  let currW = capacity;
  const chosenItems: number[] = [];
  const backtrackPath: Cell[] = [{ r: n, c: currW }];

  trace.push({ type: 'BACKTRACK', i: n, w: currW, dpState: cloneDP(), explanation: `Table complete! Max value is ${res}. Now, let's backtrack to find which items we included.`, activeCells: [], targetCell: null, backtrackPath: [...backtrackPath], chosenItems: [...chosenItems] });

  for (let i = n; i > 0 && res > 0; i--) {
    const item = items[i - 1];
    const currentCellVal = dp[i][currW] as number;
    const cellAboveVal = dp[i - 1][currW] as number;

    if (currentCellVal === cellAboveVal) {
      backtrackPath.push({ r: i - 1, c: currW });
      trace.push({ type: 'BACKTRACK', i, w: currW, dpState: cloneDP(), explanation: `Value comes from directly above (${currentCellVal} == ${cellAboveVal}). "${item.name}" was NOT included.`, activeCells: [{ r: i, c: currW }, { r: i - 1, c: currW }], targetCell: null, backtrackPath: [...backtrackPath], chosenItems: [...chosenItems] });
    } else {
      chosenItems.push(i - 1);
      currW -= item.weight;
      res -= item.value;
      backtrackPath.push({ r: i - 1, c: currW });
      trace.push({ type: 'BACKTRACK', i, w: currW + item.weight, dpState: cloneDP(), explanation: `Value is different from above (${currentCellVal} != ${cellAboveVal}). "${item.name}" WAS included! Subtract its weight (${item.weight}) from capacity.`, activeCells: [{ r: i, c: currW + item.weight }, { r: i - 1, c: currW + item.weight }], targetCell: null, backtrackPath: [...backtrackPath], chosenItems: [...chosenItems] });
    }
  }

  trace.push({ type: 'DONE', i: 0, w: 0, dpState: cloneDP(), explanation: `Backtracking complete. We found the optimal combination of items!`, activeCells: [], targetCell: null, backtrackPath: [...backtrackPath], chosenItems: [...chosenItems] });
  return trace;
}

// ==========================================
// MODULE COMPONENTS
// ==========================================

function WarmupHero({ onStart }: { onStart: () => void }) {
  const [n, setN] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setN((prev) => (prev >= 30 ? 1 : prev + 1));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const naiveOps = Math.pow(2, n) - 1;
  const dpOps = n;

  const formatNumber = (num: number) => {
    if (num > 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num > 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(to right, #475569 1px, transparent 1px), linear-gradient(to bottom, #475569 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/50 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6 border border-indigo-500/30">
          <Zap className="w-4 h-4" />
          <span>Algorithm Optimization</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Those who cannot remember the past are condemned to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">recompute it.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-8 leading-relaxed">
          Dynamic Programming (DP) is a method for solving complex problems by breaking them down into simpler subproblems. It is the ultimate trade-off: using memory to save time.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onStart} className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-900/20 hover:-translate-y-0.5">
            Start Module 1: Fibonacci
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-6xl relative z-10">
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-800">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              The Power of Memoization
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => setN(1)} className="p-2 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-8 flex-1 flex flex-col">
            <div className="mb-8 text-center">
              <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mb-1">Input Size (N)</p>
              <div className="text-4xl font-black text-slate-200 font-mono">{n}</div>
            </div>
            <div className="grid grid-cols-2 gap-8 flex-1">
              <div className="flex flex-col items-center justify-end relative">
                <div className="w-full bg-slate-800 rounded-t-lg flex flex-col justify-end overflow-hidden relative h-48">
                  <div className="w-full bg-red-500 transition-all duration-200 ease-linear" style={{ height: `${Math.min(100, (naiveOps / 1000) * 100)}%` }} />
                  {naiveOps > 10000 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 backdrop-blur-[1px]">
                      <span className="text-red-400 font-bold text-sm bg-slate-900/90 px-2 py-1 rounded shadow-sm animate-pulse border border-red-500/30">
                        Stack Overflow Risk
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <h4 className="font-semibold text-slate-200">Naive Recursion</h4>
                  <p className="text-xs text-slate-500 mb-1">O(2ⁿ) Time</p>
                  <div className={`font-mono font-bold text-lg ${naiveOps > 10000 ? 'text-red-400' : 'text-slate-300'}`}>
                    {formatNumber(naiveOps)} ops
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-end relative">
                <div className="w-full bg-slate-800 rounded-t-lg flex flex-col justify-end overflow-hidden h-48">
                  <div className="w-full bg-indigo-500 transition-all duration-200 ease-linear" style={{ height: `${Math.min(100, (dpOps / 30) * 100)}%` }} />
                </div>
                <div className="mt-4 text-center">
                  <h4 className="font-semibold text-slate-200">Dynamic Programming</h4>
                  <p className="text-xs text-slate-500 mb-1">O(n) Time</p>
                  <div className="font-mono font-bold text-lg text-indigo-400">
                    {formatNumber(dpOps)} ops
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
            <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
              <GitMerge className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Overlapping Subproblems</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              The problem can be broken down into smaller, identical problems. Instead of solving the same subproblem multiple times, DP solves it once and stores the result.
            </p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
            <div className="w-12 h-12 bg-emerald-900/30 text-emerald-400 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Optimal Substructure</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              The optimal solution to the main problem can be constructed efficiently from the optimal solutions of its subproblems. If this holds true, DP is your best tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallTree({ steps, highlightN, algo }: { steps: FibStep[]; highlightN: number | null; algo: FibAlgo; }) {
  type Node = { n: number; id: string; parent?: string; children: string[]; value?: number; reused?: boolean; };
  const nodes: Record<string, Node> = {};
  const stack: string[] = [];
  let nodeCount = 0;
  const nToId: Record<number, string[]> = {};

  steps.forEach((step, i) => {
    if (step.type === "call") {
      const id = `node${nodeCount++}`;
      const node: Node = { n: step.n, id, parent: stack.length ? stack[stack.length - 1] : undefined, children: [] };
      nodes[id] = node;
      if (node.parent) nodes[node.parent].children.push(id);
      stack.push(id);
      if (!nToId[step.n]) nToId[step.n] = [];
      nToId[step.n].push(id);
    } else if (step.type === "return") {
      const id = stack.pop();
      if (id) nodes[id].value = step.value;
    }
  });

  if (algo === "memo") {
    steps.forEach((step, i) => {
      if (step.type === "call" && steps[i + 1] && steps[i + 1].type === "return" && steps[i + 1].n === step.n) {
        const ids = nToId[step.n];
        if (ids && ids.length) nodes[ids[ids.length - 1]].reused = true;
      }
    });
  }

  const levels: string[][] = [];
  function buildLevels(root: string, depth: number) {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(root);
    nodes[root].children.forEach((child) => buildLevels(child, depth + 1));
  }
  const roots = Object.values(nodes).filter((n) => !n.parent);
  roots.forEach((r) => buildLevels(r.id, 0));

  const nodeW = 44, nodeH = 44, hGap = 24, vGap = 54;
  const svgW = Math.max(...levels.map((lv) => lv.length * (nodeW + hGap) - hGap), nodeW + 2 * hGap) + 20;
  const svgH = levels.length * (nodeH + vGap) + 10;

  const positions: Record<string, { x: number; y: number }> = {};
  levels.forEach((lv, d) => {
    const rowW = lv.length * (nodeW + hGap) - hGap;
    const x0 = (svgW - rowW) / 2;
    lv.forEach((id, i) => {
      positions[id] = { x: x0 + i * (nodeW + hGap), y: 10 + d * (nodeH + vGap) };
    });
  });

  return (
    <svg width={svgW} height={svgH} className="bg-slate-900 rounded-xl shadow-lg border border-slate-800" style={{ minWidth: 340, minHeight: 180 }}>
      {Object.values(nodes).map((node) => node.children.map((cid) => {
        const from = positions[node.id];
        const to = positions[cid];
        return <line key={node.id + "-" + cid} x1={from.x + nodeW / 2} y1={from.y + nodeH} x2={to.x + nodeW / 2} y2={to.y} stroke="#475569" strokeWidth={2} />;
      }))}
      {Object.values(nodes).map((node) => {
        const { x, y } = positions[node.id];
        const isActive = highlightN === node.n && !node.value;
        const isReused = node.reused;
        return (
          <g key={node.id}>
            <rect x={x} y={y} width={nodeW} height={nodeH} rx={12}
              fill={isActive ? "#3b82f6" : isReused ? "#b45309" : "#1e293b"}
              stroke={isActive ? "#60a5fa" : isReused ? "#f59e0b" : "#334155"}
              strokeWidth={isActive ? 3 : 1.5}
              style={{ filter: isActive ? "drop-shadow(0 0 6px #3b82f688)" : undefined, transition: "all 0.2s" }}
            />
            <text x={x + nodeW / 2} y={y + nodeH / 2 + 6} textAnchor="middle" fontWeight={isActive ? 700 : 500} fontSize={20} fill={isActive ? "#fff" : "#94a3b8"}>
              {node.n}
            </text>
            {typeof node.value === "number" && (
              <text x={x + nodeW / 2} y={y + nodeH - 6} textAnchor="middle" fontSize={13} fill="#64748b" fontWeight={500}>{node.value}</text>
            )}
            {isReused && (
              <g>
                <rect x={x + nodeW - 18} y={y + 4} width={14} height={14} rx={4} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1} />
                <text x={x + nodeW - 11} y={y + 15} fontSize={11} fill="#b45309" fontWeight={700} textAnchor="middle">♻</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TableViz({ steps, n, highlightN, algo }: { steps: FibStep[]; n: number; highlightN: number | null; algo: FibAlgo; }) {
  const table: (number | null)[] = Array(n + 1).fill(null);
  steps.forEach((step) => {
    if (step.type === "table_update" || step.type === "return") table[step.n] = step.value;
  });

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1">
        {table.map((val, i) => (
          <div key={i} className={`w-12 h-16 flex flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-200
              ${highlightN === i ? "bg-blue-600 text-white border-blue-400" : val !== null ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-slate-900 border-slate-800 text-slate-500"}
            `}>
            <div className={`text-xs mb-1 ${highlightN === i ? 'text-blue-200' : 'text-slate-500'}`}>n={i}</div>
            <div className="font-bold text-lg">{val !== null ? val : "?"}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500">
        {algo === "tabulation" ? "Table fills left→right iteratively" : "Table shows memoized values (cache)"}
      </div>
    </div>
  );
}

function FibonacciPanel() {
  const [n, setN] = useState(6);
  const [algo, setAlgo] = useState<FibAlgo>("naive");
  const [steps, stepIdx, stepForward, stepBack, run, canStepForward, canStepBack, reset, result] = useStepper(n, algo);

  let highlightN: number | null = null;
  if (steps.length) {
    const last = steps[steps.length - 1];
    if (last.type === "call" || last.type === "table_update") highlightN = last.n;
    else if (last.type === "return") highlightN = last.n;
  }

  const showTree = algo !== "tabulation";
  const BTN = "px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm";

  return (
    <div className="min-h-full bg-slate-950 p-6 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl font-bold tracking-tight text-white">Fibonacci Visualizer</div>
          <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-900/50 text-indigo-400 border border-indigo-500/30">DP Pattern: Line</span>
        </div>
        <div className="text-slate-400 mb-8 leading-relaxed">
          Explore how dynamic programming optimizes recursive problems. Step through <b>naive recursion</b>, <b>memoization</b>, and <b>tabulation</b> for Fibonacci numbers. Visualize the call tree and how subproblems are reused or collapsed into a table.
        </div>
        <div className="flex flex-wrap items-center gap-6 mb-8 p-4 bg-slate-950 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm font-medium">n =</span>
            <input type="range" min={1} max={15} value={n} onChange={(e) => setN(Number(e.target.value))} className="accent-blue-500 w-32" />
            <span className="font-bold text-blue-400 w-6">{n}</span>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>
          <div className="flex gap-2">
            <button className={`${BTN} ${algo === "naive" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`} onClick={() => setAlgo("naive")}>Naive</button>
            <button className={`${BTN} ${algo === "memo" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`} onClick={() => setAlgo("memo")}>Memoization</button>
            <button className={`${BTN} ${algo === "tabulation" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`} onClick={() => setAlgo("tabulation")}>Tabulation</button>
          </div>
          <div className="flex gap-2 ml-auto">
            <button className={`${BTN} bg-slate-800 text-slate-300 hover:bg-slate-700`} onClick={reset}><RotateCcw size={16} /></button>
            <button className={`${BTN} bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50`} onClick={stepBack} disabled={!canStepBack}><SkipBack size={16} /></button>
            <button className={`${BTN} bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-500`} onClick={stepForward} disabled={!canStepForward}><SkipForward size={16} /></button>
            <button className={`${BTN} bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-500`} onClick={run} disabled={!canStepForward}><Play size={16} /></button>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start justify-center">
          {showTree && (
            <div className="flex-1 flex flex-col items-center overflow-x-auto w-full pb-4">
              <div className="mb-4 font-semibold text-slate-200">Call Tree</div>
              <CallTree steps={steps} highlightN={highlightN} algo={algo} />
            </div>
          )}
          <div className="flex flex-col items-center">
            <div className="mb-4 font-semibold text-slate-200">{algo === "tabulation" ? "Table (Bottom-Up)" : "Memo Table"}</div>
            <TableViz steps={steps} n={n} highlightN={highlightN} algo={algo} />
            <div className="mt-8 flex items-center justify-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 w-full">
              <span className="text-slate-400 font-medium">fib({n}) =</span>
              <span className={`text-3xl font-bold ${result !== null ? "text-blue-400" : "text-slate-600"}`}>{result !== null ? result : "?"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GridPathsDP() {
  const [grid, setGrid] = useState<number[][]>(INITIAL_GRID);
  const [isMemoEnabled, setIsMemoEnabled] = useState<boolean>(true);
  const [steps, setSteps] = useState<GridStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  useEffect(() => {
    if (!hasStarted) {
      setSteps(generateSteps(grid, isMemoEnabled));
      setCurrentStepIndex(-1);
    }
  }, [grid, isMemoEnabled, hasStarted]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStepIndex < steps.length - 1) {
      const delay = 1000 / Math.pow(2, speed - 1);
      timer = setTimeout(() => setCurrentStepIndex(prev => prev + 1), delay);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, speed]);

  const toggleObstacle = (r: number, c: number) => {
    if (hasStarted) return;
    if ((r === 0 && c === 0) || (r === ROWS - 1 && c === COLS - 1)) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = newGrid[r][c] === 1 ? 0 : 1;
    setGrid(newGrid);
  };

  const handlePlayPause = () => {
    if (currentStepIndex >= steps.length - 1) setCurrentStepIndex(-1);
    setHasStarted(true);
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setHasStarted(true);
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex(prev => prev + 1);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setHasStarted(false);
    setCurrentStepIndex(-1);
    setSteps(generateSteps(grid, isMemoEnabled));
  };

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const currentMemo = currentStep?.memo || {};

  const getCellClasses = (r: number, c: number) => {
    const isStart = r === 0 && c === 0;
    const isEnd = r === ROWS - 1 && c === COLS - 1;
    const isObstacle = grid[r][c] === 1;
    const isActive = currentStep?.r === r && currentStep?.c === c;
    const isMemoized = currentMemo[`${r},${c}`] !== undefined;
    const isCacheHit = isActive && currentStep?.type === 'cache_hit';

    let base = "relative flex items-center justify-center text-sm font-semibold transition-all duration-300 border cursor-pointer select-none ";
    if (isObstacle) base += "bg-slate-950 text-slate-600 border-slate-800 ";
    else if (isStart) base += "bg-emerald-900/50 text-emerald-400 border-emerald-700 ";
    else if (isEnd) base += "bg-indigo-900/50 text-indigo-400 border-indigo-700 ";
    else if (isCacheHit) base += "bg-sky-500/20 text-sky-400 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)] z-10 scale-105 ";
    else if (isActive) base += "bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] z-10 scale-105 ";
    else if (isMemoized) base += "bg-emerald-900/30 text-emerald-500 border-emerald-800 ";
    else base += "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 ";

    if (!hasStarted && !isStart && !isEnd) base += "hover:ring-2 hover:ring-indigo-500 hover:z-10 ";
    return base;
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 p-6 flex flex-col items-center">
      <div className="max-w-5xl w-full mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Grid2X2 size={24} />
          </div>
          <h1 className="text-3xl font-bold text-white">Grid Paths</h1>
          <span className="ml-auto px-3 py-1 bg-indigo-900/50 text-indigo-400 border border-indigo-500/30 text-sm font-semibold rounded-full">
            DP Pattern: 2D Grid
          </span>
        </div>
        <p className="text-slate-400 max-w-3xl leading-relaxed">
          Find the number of unique paths from the top-left (Start) to the bottom-right (End). You can only move <strong>Right</strong> and <strong>Down</strong>. Click cells to toggle obstacles. Compare naive recursion with top-down memoization to see how subproblem reuse saves computation.
        </p>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
              {grid.map((row, r) => row.map((_, c) => (
                <div key={`${r}-${c}`} className={`aspect-square rounded-md ${getCellClasses(r, c)}`} onClick={() => toggleObstacle(r, c)} title={hasStarted ? "" : "Click to toggle obstacle"}>
                  {grid[r][c] === 1 ? <ShieldAlert size={20} className="opacity-50" /> : (
                    <span className="text-lg">
                      {r === 0 && c === 0 ? 'S' : r === ROWS - 1 && c === COLS - 1 && currentMemo[`${r},${c}`] === undefined ? 'E' : currentMemo[`${r},${c}`] ?? ''}
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 text-[10px] opacity-30 pointer-events-none">{r},{c}</span>
                </div>
              )))}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-400 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500/50 border border-amber-500 rounded-sm"></div> Active</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-900/50 border border-emerald-700 rounded-sm"></div> Memoized</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-sky-500/50 border border-sky-500 rounded-sm"></div> Cache Hit</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-950 border border-slate-800 rounded-sm"></div> Obstacle</div>
            </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 min-h-[100px] flex items-start gap-4">
            <div className="mt-1 text-indigo-400"><Info size={24} /></div>
            <div>
              <h3 className="font-semibold text-white mb-1">Current Action</h3>
              <p className="text-slate-400 font-mono text-sm leading-relaxed">
                {currentStep ? currentStep.description : "Click Play or Step to start the algorithm."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-amber-400" /> Algorithm Settings
            </h3>
            <div className="flex items-center justify-between mb-6 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <span className="font-medium text-slate-200 block">Memoization</span>
                <span className="text-xs text-slate-500">Cache subproblem results</span>
              </div>
              <button onClick={() => { if (!hasStarted) setIsMemoEnabled(!isMemoEnabled); }} disabled={hasStarted} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isMemoEnabled ? 'bg-indigo-600' : 'bg-slate-700'} ${hasStarted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isMemoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={handlePlayPause} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl font-medium transition-colors">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : currentStepIndex >= steps.length - 1 ? 'Restart' : 'Play'}
              </button>
              <button onClick={handleStepForward} disabled={isPlaying || currentStepIndex >= steps.length - 1} className="flex items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors disabled:opacity-50">
                <SkipForward size={18} />
              </button>
              <button onClick={handleReset} className="flex items-center justify-center p-3 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 rounded-xl transition-colors">
                <RotateCcw size={18} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Animation Speed</label>
              <input type="range" min="1" max="5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KnapsackDP() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'Guitar', weight: 1, value: 15 },
    { id: '2', name: 'Stereo', weight: 4, value: 30 },
    { id: '3', name: 'Laptop', weight: 3, value: 20 },
  ]);
  const [capacity, setCapacity] = useState<number>(5);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const speedMs = 600;

  const trace = useMemo(() => generateKnapsackTrace(items, capacity), [items, capacity]);
  const stepData = trace[currentStep];

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [items, capacity]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStep < trace.length - 1) {
      timer = setTimeout(() => setCurrentStep(prev => prev + 1), speedMs);
    } else if (currentStep >= trace.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speedMs, trace.length]);

  const handleAddItem = () => {
    if (items.length >= 6) return;
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: `Item ${items.length + 1}`, weight: 1, value: 10 }]);
  };
  const handleRemoveItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const handleUpdateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: field === 'name' ? value : Math.max(1, Number(value) || 0) } : item));
  };

  const getCellClass = (r: number, c: number) => {
    const isTarget = stepData.targetCell?.r === r && stepData.targetCell?.c === c;
    const isActive = stepData.activeCells.some(cell => cell.r === r && cell.c === c);
    const isBacktrack = stepData.backtrackPath.some(cell => cell.r === r && cell.c === c);
    let base = "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border text-sm sm:text-base font-semibold transition-all duration-300 rounded-md ";

    if (isTarget) return base + "bg-blue-600 text-white border-blue-500 shadow-lg scale-110 z-10";
    if (isActive) return base + "bg-amber-500/30 text-amber-400 border-amber-500 z-0";
    if (isBacktrack) return base + "bg-emerald-600 text-white border-emerald-500 shadow-inner z-0";
    if (stepData.dpState[r][c] !== null) return base + "bg-slate-800 text-slate-200 border-slate-700";
    return base + "bg-slate-900/50 text-slate-600 border-slate-800";
  };

  return (
    <div className="min-h-full bg-slate-950 p-6 flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">DP</div>
          0/1 Knapsack Pattern
        </h1>
        <p className="text-slate-400 mt-3 max-w-2xl leading-relaxed">
          Learn how dynamic programming solves the 0/1 Knapsack problem by building a table of subproblems. Watch the table fill up, then see how backtracking finds the optimal items.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Settings2 size={18} className="text-blue-400" /> Knapsack Capacity
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <input type="range" min="1" max="12" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value))} className="flex-1 accent-blue-500" />
              <span className="font-mono bg-blue-900/50 text-blue-400 px-3 py-1 rounded-lg font-bold border border-blue-500/30">{capacity}</span>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">Available Items</h2>
              <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-md">{items.length} / 6</span>
            </div>
            <div className="space-y-3 mb-4">
              {items.map((item, idx) => {
                const isChosen = stepData.chosenItems.includes(idx);
                return (
                  <div key={item.id} className={`p-3 rounded-xl border transition-colors ${isChosen ? 'bg-emerald-900/30 border-emerald-700 shadow-sm' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <input type="text" value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} className="bg-transparent font-semibold text-slate-200 focus:outline-none focus:border-b border-blue-500 w-24" />
                      <button onClick={() => handleRemoveItem(item.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Weight</label>
                        <input type="number" min="1" value={item.weight} onChange={(e) => handleUpdateItem(item.id, 'weight', e.target.value)} className="w-full bg-slate-800 border-none rounded p-2 text-sm font-mono text-slate-300 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Value</label>
                        <input type="number" min="0" value={item.value} onChange={(e) => handleUpdateItem(item.id, 'value', e.target.value)} className="w-full bg-slate-800 border-none rounded p-2 text-sm font-mono text-slate-300 focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={handleAddItem} disabled={items.length >= 6} className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 font-semibold hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <Plus size={18} /> Add Item
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-white text-xl">DP Table</h2>
              <div className="flex gap-2">
                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><RotateCcw size={18}/></button>
                <button onClick={() => { setIsPlaying(false); setCurrentStep(s => Math.max(0, s - 1)); }} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><SkipBack size={18}/></button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500">{isPlaying ? <Pause size={18}/> : <Play size={18}/>}</button>
                <button onClick={() => { setIsPlaying(false); setCurrentStep(s => Math.min(trace.length - 1, s + 1)); }} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"><SkipForward size={18}/></button>
              </div>
            </div>
            <div className="overflow-x-auto pb-4 flex-1">
              <div className="inline-block min-w-max">
                <div className="flex mb-2">
                  <div className="w-24 shrink-0"></div>
                  {Array.from({length: capacity + 1}).map((_, w) => (
                    <div key={`head-w-${w}`} className="w-12 sm:w-14 text-center text-xs font-bold text-slate-500">W={w}</div>
                  ))}
                </div>
                {Array.from({length: items.length + 1}).map((_, i) => (
                  <div key={`row-${i}`} className="flex mb-2 items-center">
                    <div className="w-24 shrink-0 text-right pr-4 text-xs font-bold text-slate-400">
                      {i === 0 ? '0 Items' : <span className="truncate block" title={items[i-1].name}>{items[i-1].name}</span>}
                    </div>
                    {Array.from({length: capacity + 1}).map((_, w) => (
                      <div key={`cell-${i}-${w}`} className={`mr-2 ${getCellClass(i, w)}`}>
                        {stepData.dpState[i][w] !== null ? stepData.dpState[i][w] : ''}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 p-5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex gap-4 items-start">
                <Info className="text-blue-400 shrink-0 mt-0.5" size={24} />
                <div>
                  <div className="font-semibold text-white mb-1">Step {currentStep + 1} of {trace.length}: {stepData.type}</div>
                  <div className="text-sm text-slate-400 leading-relaxed">{stepData.explanation}</div>
                  {stepData.formula && <div className="mt-3 font-mono text-xs bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-slate-300">{stepData.formula}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SvgDefs = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <marker id="arrow-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-indigo-500" />
      </marker>
      <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-500" />
      </marker>
    </defs>
  </svg>
);

const LineVisual: React.FC<{ step: StepState }> = ({ step }) => (
  <svg viewBox="0 0 200 80" className="w-full h-full font-mono text-xs">
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i} transform={`translate(${20 + i * 32}, 40)`}>
        <rect x="0" y="0" width="24" height="24" rx="4" className={`transition-all duration-300 ${
            i === 1 && step >= 2 ? 'fill-indigo-900/50 stroke-indigo-500 stroke-2' :
            i === 2 && step >= 1 ? 'fill-indigo-900/50 stroke-indigo-500 stroke-2' :
            i === 3 && step >= 3 ? 'fill-emerald-900/50 stroke-emerald-500 stroke-2' :
            'fill-slate-800 stroke-slate-700 stroke-2'
          }`} />
        <text x="12" y="16" textAnchor="middle" className="fill-slate-500">
          {i === 1 ? 'i-2' : i === 2 ? 'i-1' : i === 3 ? 'i' : ''}
        </text>
      </g>
    ))}
    <g className={`transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
      <path d="M 64 40 Q 90 20 124 38" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
      <path d="M 96 40 Q 110 30 124 38" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
    </g>
  </svg>
);

const GridVisual: React.FC<{ step: StepState }> = ({ step }) => (
  <svg viewBox="0 0 200 100" className="w-full h-full font-mono text-xs">
    <g transform="translate(60, 10)">
      {[0, 1, 2].map((row) => [0, 1, 2].map((col) => {
        const isTop = row === 0 && col === 1;
        const isLeft = row === 1 && col === 0;
        const isTarget = row === 1 && col === 1;
        let stateClass = 'fill-slate-800 stroke-slate-700 stroke-2';
        if (isTop && step >= 1) stateClass = 'fill-indigo-900/50 stroke-indigo-500 stroke-2';
        if (isLeft && step >= 2) stateClass = 'fill-indigo-900/50 stroke-indigo-500 stroke-2';
        if (isTarget && step >= 3) stateClass = 'fill-emerald-900/50 stroke-emerald-500 stroke-2';
        return <rect key={`${row}-${col}`} x={col * 28} y={row * 28} width="24" height="24" rx="4" className={`transition-all duration-300 ${stateClass}`} />;
      }))}
      <g className={`transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <path d="M 40 24 L 40 34" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
        <path d="M 24 40 L 34 40" fill="none" className="stroke-indigo-500 stroke-2" markerEnd="url(#arrow-indigo)" />
      </g>
    </g>
  </svg>
);

const SubsequenceVisual: React.FC<{ step: StepState }> = ({ step }) => {
  const s1 = ['A', 'B', 'C', 'D'];
  const s2 = ['A', 'X', 'B', 'C'];
  return (
    <svg viewBox="0 0 200 80" className="w-full h-full font-mono text-sm font-bold">
      {s1.map((char, i) => (
        <text key={`s1-${i}`} x={40 + i * 40} y="30" textAnchor="middle" className={`transition-colors duration-300 ${((i === 1 && step >= 1) || (i === 2 && step >= 2)) ? 'fill-indigo-400' : 'fill-slate-600'}`}>{char}</text>
      ))}
      {s2.map((char, i) => (
        <text key={`s2-${i}`} x={40 + i * 40} y="70" textAnchor="middle" className={`transition-colors duration-300 ${((i === 2 && step >= 1) || (i === 3 && step >= 2)) ? 'fill-indigo-400' : 'fill-slate-600'}`}>{char}</text>
      ))}
      <g className="stroke-indigo-500 stroke-2 stroke-dashed" fill="none">
        <path d="M 40 35 L 40 55" className={`transition-opacity duration-300 ${step >= 3 ? 'opacity-30' : 'opacity-0'}`} />
        <path d="M 80 35 L 120 55" className={`transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />
        <path d="M 120 35 L 160 55" className={`transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`} />
      </g>
    </svg>
  );
};

const IntervalVisual: React.FC<{ step: StepState }> = ({ step }) => (
  <svg viewBox="0 0 200 80" className="w-full h-full font-mono text-xs">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <rect key={i} x={20 + i * 26} y="45" width="22" height="22" rx="4" className={`transition-all duration-300 ${
          i >= 1 && i <= 2 && step >= 1 ? 'fill-indigo-900/50 stroke-indigo-500 stroke-2' :
          i >= 3 && i <= 4 && step >= 2 ? 'fill-purple-900/50 stroke-purple-500 stroke-2' :
          'fill-slate-800 stroke-slate-700 stroke-2'
        }`} />
    ))}
    <g fill="none" className="stroke-2 transition-all duration-500">
      <path d="M 46 40 L 46 32 L 98 32 L 98 40" className={`stroke-indigo-500 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />
      <path d="M 98 40 L 98 24 L 150 24 L 150 40" className={`stroke-purple-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`} />
      <path d="M 46 20 L 46 12 L 150 12 L 150 20" className={`stroke-emerald-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`} />
    </g>
    <text x="98" y="8" textAnchor="middle" className={`fill-emerald-400 text-[10px] font-bold transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
      dp[i][j]
    </text>
  </svg>
);

const patterns: PatternData[] = [
  { id: 'line', title: '1D / Line', icon: <ArrowRight className="w-5 h-5" />, description: 'State depends on a constant number of previous states in a linear sequence.', examples: ['Fibonacci', 'Climbing Stairs', 'House Robber'], formula: 'dp[i] = dp[i-1] + dp[i-2]', color: 'indigo', Visual: LineVisual },
  { id: 'grid', title: '2D / Grid', icon: <Layout className="w-5 h-5" />, description: 'State depends on spatial neighbors (usually top and left) in a matrix.', examples: ['Unique Paths', 'Min Path Sum', 'Maximal Square'], formula: 'dp[i][j] = dp[i-1][j] + dp[i][j-1]', color: 'blue', Visual: GridVisual },
  { id: 'subsequence', title: 'Subsequence', icon: <GitMerge className="w-5 h-5" />, description: 'State tracks matching elements across two sequences or within one sequence.', examples: ['Longest Common Subsequence', 'Edit Distance'], formula: 'if (s[i]==t[j]) dp[i][j] = dp[i-1][j-1] + 1', color: 'violet', Visual: SubsequenceVisual },
  { id: 'interval', title: 'Interval', icon: <Layers className="w-5 h-5" />, description: 'State depends on smaller sub-intervals [i, k] and [k+1, j] within a range.', examples: ['Matrix Chain Multiplication', 'Burst Balloons'], formula: 'dp[i][j] = min(dp[i][k] + dp[k+1][j] + cost)', color: 'emerald', Visual: IntervalVisual }
];

const PatternCard: React.FC<{ pattern: PatternData }> = ({ pattern }) => {
  const [step, setStep] = useState<StepState>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setStep((s) => (s >= 3 ? 0 : (s + 1) as StepState)), 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleManualStep = () => { setIsPlaying(false); setStep((s) => (s >= 3 ? 0 : (s + 1) as StepState)); };
  const handleReset = () => { setIsPlaying(false); setStep(0); };

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-900/30 text-indigo-400',
    blue: 'bg-blue-900/30 text-blue-400',
    violet: 'bg-violet-900/30 text-violet-400',
    emerald: 'bg-emerald-900/30 text-emerald-400'
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl hover:shadow-2xl transition-shadow overflow-hidden flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${colorMap[pattern.color] || 'bg-slate-800 text-slate-400'}`}>
            {pattern.icon}
          </div>
          <h3 className="text-xl font-bold text-white">{pattern.title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6 flex-1">{pattern.description}</p>
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Examples</div>
          <div className="flex flex-wrap gap-2">
            {pattern.examples.map(ex => <span key={ex} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium border border-slate-700">{ex}</span>)}
          </div>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
          {pattern.formula}
        </div>
      </div>
      <div className="h-48 bg-slate-950 relative border-t border-slate-800 flex items-center justify-center p-4">
        <pattern.Visual step={step} />
        <div className="absolute top-3 right-3 flex gap-2">
          <button onClick={handleReset} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"><RotateCcw size={14}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded transition-colors">{isPlaying ? <Pause size={14}/> : <Play size={14}/>}</button>
          <button onClick={handleManualStep} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"><ArrowRight size={14}/></button>
        </div>
      </div>
    </div>
  );
};

function PatternLibrary() {
  return (
    <div className="min-h-full bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-500" />
            DP Pattern Library
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">
            Dynamic programming problems generally fall into a few core shapes. Recognizing the shape is the key to formulating the state and transitions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {patterns.map(p => <PatternCard key={p.id} pattern={p} />)}
        </div>
      </div>
      <SvgDefs />
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [activeTab, setActiveTab] = useState('warmup');

  const tabs = [
    { id: 'warmup', label: 'Warmup Hero', icon: <Cpu size={18} /> },
    { id: 'fibonacci', label: 'Fibonacci Line', icon: <ArrowRight size={18} /> },
    { id: 'grid', label: 'Grid Paths', icon: <Grid2X2 size={18} /> },
    { id: 'knapsack', label: '0/1 Knapsack', icon: <Layers size={18} /> },
    { id: 'patterns', label: 'Pattern Library', icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 text-indigo-400 font-bold text-2xl tracking-tight border-b border-slate-800">
          <BrainCircuit className="w-8 h-8" />
          <span>DPLab</span>
        </div>
        <div className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Modules</div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto relative bg-slate-950">
        {/* canvas used for algorithm complexity visualization */}
        <canvas id="dp-complexity-canvas" className="hidden absolute" width={600} height={300} aria-hidden="true" />
        {activeTab === 'warmup' && <WarmupHero onStart={() => setActiveTab('fibonacci')} />}
        {activeTab === 'fibonacci' && <FibonacciPanel />}
        {activeTab === 'grid' && <GridPathsDP />}
        {activeTab === 'knapsack' && <KnapsackDP />}
        {activeTab === 'patterns' && <PatternLibrary />}
      </main>
    </div>
  );
}

// Runtime deps: lucide-react@latest