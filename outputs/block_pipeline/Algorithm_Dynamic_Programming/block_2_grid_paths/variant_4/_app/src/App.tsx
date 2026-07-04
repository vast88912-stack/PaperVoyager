import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Settings, 
  Database, 
  MapPin, 
  XSquare,
  Activity,
  Zap,
  RotateCcw,
  Info
} from 'lucide-react';

// --- Types & Interfaces ---

type EventType = 'START' | 'CALL' | 'BASE_CASE' | 'CACHE_HIT' | 'RETURN' | 'DONE';

interface TraceStep {
  type: EventType;
  r: number;
  c: number;
  val?: number;
  stack: string[];
  memo: Record<string, number>;
  calls: number;
  hits: number;
  msg: string;
}

// --- Algorithm Trace Generator ---

function generateTrace(
  rows: number, 
  cols: number, 
  obstacles: Record<string, boolean>, 
  useMemo: boolean
): TraceStep[] {
  const trace: TraceStep[] = [];
  const memo: Record<string, number> = {};
  let calls = 0;
  let hits = 0;
  const stack: string[] = [];

  // Hard cap to prevent browser freeze on large naive runs
  const MAX_CALLS = 5000;

  trace.push({
    type: 'START', r: 0, c: 0, stack: [], memo: {}, calls, hits,
    msg: `Starting algorithm. Goal: reach (${rows - 1}, ${cols - 1}).`
  });

  function solve(r: number, c: number): number {
    if (calls > MAX_CALLS) return 0;
    
    calls++;
    const key = `${r},${c}`;
    const currentStack = [...stack, key];
    
    trace.push({
      type: 'CALL', r, c, stack: currentStack, memo: { ...memo }, calls, hits,
      msg: `Evaluating cell (${r}, ${c}).`
    });

    // Base Case 1: Out of bounds
    if (r >= rows || c >= cols) {
      trace.push({
        type: 'BASE_CASE', r, c, stack: currentStack, memo: { ...memo }, calls, hits,
        msg: `(${r}, ${c}) is out of bounds. Paths = 0.`
      });
      return 0;
    }

    // Base Case 2: Obstacle
    if (obstacles[key]) {
      trace.push({
        type: 'BASE_CASE', r, c, stack: currentStack, memo: { ...memo }, calls, hits,
        msg: `(${r}, ${c}) is an obstacle. Paths = 0.`
      });
      return 0;
    }

    // Base Case 3: Destination
    if (r === rows - 1 && c === cols - 1) {
      trace.push({
        type: 'BASE_CASE', r, c, stack: currentStack, memo: { ...memo }, calls, hits,
        msg: `Reached destination! Paths = 1.`
      });
      return 1;
    }

    // Cache Check
    if (useMemo && memo[key] !== undefined) {
      hits++;
      trace.push({
        type: 'CACHE_HIT', r, c, stack: currentStack, memo: { ...memo }, calls, hits,
        msg: `Cache hit at (${r}, ${c})! Reusing computed value: ${memo[key]}.`
      });
      return memo[key];
    }

    // Recursive Calls
    stack.push(key);
    const rightPaths = solve(r, c + 1);
    const downPaths = solve(r + 1, c);
    stack.pop();

    const totalPaths = rightPaths + downPaths;

    // Memoize
    if (useMemo) {
      memo[key] = totalPaths;
    }

    trace.push({
      type: 'RETURN', r, c, val: totalPaths, stack: currentStack, memo: { ...memo }, calls, hits,
      msg: `Total paths from (${r}, ${c}) = ${totalPaths}.${useMemo ? ' Saved to cache.' : ''}`
    });

    return totalPaths;
  }

  const ans = solve(0, 0);

  trace.push({
    type: 'DONE', r: 0, c: 0, val: ans, stack: [], memo: { ...memo }, calls, hits,
    msg: calls > MAX_CALLS 
      ? `Execution aborted. Exceeded ${MAX_CALLS} calls (try using memoization!).` 
      : `Finished! Total unique paths: ${ans}.`
  });

  return trace;
}

// --- Main Application Component ---

export default function App() {
  // Config State
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [obstacles, setObstacles] = useState<Record<string, boolean>>({});
  const [useMemo, setUseMemo] = useState(true);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speedMs, setSpeedMs] = useState(400);

  // Generate trace whenever config changes
  const trace = useMemo(() => {
    return generateTrace(rows, cols, obstacles, useMemo);
  }, [rows, cols, obstacles, useMemo]);

  // Reset playback when trace changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, [trace]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= trace.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speedMs);
    return () => clearInterval(timer);
  }, [isPlaying, speedMs, trace.length]);

  // Handlers
  const toggleObstacle = (r: number, c: number) => {
    // Prevent toggling start or end, and only allow when stopped at step 0
    if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) return;
    
    setObstacles(prev => {
      const next = { ...prev };
      if (next[`${r},${c}`]) {
        delete next[`${r},${c}`];
      } else {
        next[`${r},${c}`] = true;
      }
      return next;
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  // Active step data
  const stepData = trace[currentStep] || trace[0];
  const isDone = currentStep === trace.length - 1;

  // Render Helpers
  const getCellClasses = (r: number, c: number) => {
    const key = `${r},${c}`;
    const isActive = stepData.r === r && stepData.c === c && stepData.type !== 'DONE';
    const isInStack = stepData.stack.includes(key);
    const isObstacle = obstacles[key];
    const isDest = r === rows - 1 && c === cols - 1;
    const isStart = r === 0 && c === 0;
    const hasMemo = stepData.memo[key] !== undefined;

    let base = "relative w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center text-sm font-medium rounded-xl transition-all duration-300 border-2 shadow-sm cursor-pointer select-none ";

    if (isObstacle) {
      base += "bg-slate-700 border-slate-800 text-slate-400 ";
    } else if (isDest) {
      base += "bg-emerald-100 border-emerald-400 text-emerald-800 ";
    } else if (isStart) {
      base += "bg-slate-100 border-slate-300 text-slate-800 ";
    } else if (hasMemo) {
      base += "bg-amber-50 border-amber-300 text-amber-900 ";
    } else {
      base += "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 ";
    }

    // Dynamic highlights
    if (isActive) {
      if (stepData.type === 'CACHE_HIT') {
        base += "ring-4 ring-amber-400 ring-opacity-60 scale-105 z-10 bg-amber-200 ";
      } else if (stepData.type === 'BASE_CASE') {
        base += "ring-4 ring-rose-400 ring-opacity-60 scale-105 z-10 ";
      } else {
        base += "ring-4 ring-indigo-400 ring-opacity-60 scale-105 z-10 bg-indigo-100 ";
      }
    } else if (isInStack) {
      base += "ring-2 ring-indigo-200 bg-indigo-50 border-indigo-300 ";
    }

    return base;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200 selection:text-indigo-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-20 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="text-indigo-600" />
              Grid Paths DP Lab
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Visualize how Memoization collapses a massive $O(2^{N+M})$ call tree into $O(N \times M)$ table lookups.
            </p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <div className="flex flex-col items-center bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-xs uppercase tracking-wide">Function Calls</span>
              <span className="text-indigo-600 text-lg flex items-center gap-1">
                <Activity size={16}/> {stepData.calls}
              </span>
            </div>
            <div className="flex flex-col items-center bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-xs uppercase tracking-wide">Cache Hits</span>
              <span className="text-amber-600 text-lg flex items-center gap-1">
                <Zap size={16} /> {stepData.hits}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          {/* Controls Panel */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Settings size={16} /> Configuration
            </h2>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 flex justify-between">
                Rows: <span>{rows}</span>
              </label>
              <input 
                type="range" min="2" max="6" value={rows}
                onChange={(e) => { setRows(parseInt(e.target.value)); handleReset(); }}
                className="w-full accent-indigo-600"
                disabled={isPlaying}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 flex justify-between">
                Cols: <span>{cols}</span>
              </label>
              <input 
                type="range" min="2" max="6" value={cols}
                onChange={(e) => { setCols(parseInt(e.target.value)); handleReset(); }}
                className="w-full accent-indigo-600"
                disabled={isPlaying}
              />
            </div>

            <div className="pt-2">
              <button 
                onClick={() => { setUseMemo(!useMemo); handleReset(); }}
                disabled={isPlaying}
                className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                  useMemo 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' 
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                <Database size={18} />
                {useMemo ? 'Memoization Enabled' : 'Naive Recursion'}
              </button>
            </div>

            {!useMemo && (rows > 4 || cols > 4) && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                Warning: Naive recursion is exponential. The execution trace is capped to prevent freezing.
              </div>
            )}
          </div>

          {/* Instructions Panel */}
          <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 flex-1">
            <h3 className="text-sm font-bold text-indigo-900 mb-2">How to use</h3>
            <ul className="text-sm text-indigo-800 space-y-2 list-disc list-inside">
              <li>Click empty cells to toggle <strong>obstacles</strong>.</li>
              <li>Toggle <strong>Memoization</strong> to see how caching prevents redundant work.</li>
              <li>Use the player controls to step through the call stack.</li>
            </ul>
          </div>
        </div>

        {/* Center Column: Visualization & Player */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          
          {/* The Grid */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-8 overflow-auto relative">
            
            {/* Legend / Tooltip layer */}
            {stepData.r >= rows || stepData.c >= cols ? (
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200 animate-pulse flex items-center gap-1">
                <XSquare size={14} /> Out of bounds check
              </div>
            ) : null}

            <div 
              className="grid gap-2"
              style={{ 
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` 
              }}
            >
              {Array.from({ length: rows }).map((_, r) => (
                Array.from({ length: cols }).map((_, c) => {
                  const key = `${r},${c}`;
                  const val = stepData.memo[key];
                  
                  return (
                    <div 
                      key={key} 
                      className={getCellClasses(r, c)}
                      onClick={() => {
                        if (currentStep === 0 && !isPlaying) toggleObstacle(r, c);
                      }}
                    >
                      {/* Cell Coordinate */}
                      <span className="text-[10px] text-slate-400 absolute top-1 left-1 opacity-70">
                        {r},{c}
                      </span>
                      
                      {/* Cell Content */}
                      {obstacles[key] ? (
                        <XSquare className="text-slate-500 opacity-50" size={24} />
                      ) : r === rows - 1 && c === cols - 1 ? (
                        <MapPin className={stepData.type === 'DONE' ? 'text-emerald-600 animate-bounce' : 'text-emerald-5