import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Constants ---
const ROWS = 6;
const COLS = 7;

type StepType = 'ENTER' | 'EXIT' | 'MEMO_HIT';

interface Step {
  type: StepType;
  r: number;
  c: number;
  val?: number;
  reason?: 'obstacle' | 'base' | 'computed';
}

interface CellData {
  visits: number;
  val: number | null;
  status: 'idle' | 'active' | 'done' | 'memo-flash';
}

// --- Icons (Inline to avoid external dependencies) ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>;
const StepForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

// --- Algorithm Generator ---
function* solveGridPaths(
  r: number,
  c: number,
  obstacles: boolean[][],
  useMemo: boolean,
  memo: (number | undefined)[][]
): Generator<Step, number, void> {
  if (r >= ROWS || c >= COLS) return 0;

  yield { type: 'ENTER', r, c };

  if (obstacles[r][c]) {
    yield { type: 'EXIT', r, c, val: 0, reason: 'obstacle' };
    return 0;
  }

  if (r === ROWS - 1 && c === COLS - 1) {
    yield { type: 'EXIT', r, c, val: 1, reason: 'base' };
    return 1;
  }

  if (useMemo && memo[r][c] !== undefined) {
    yield { type: 'MEMO_HIT', r, c, val: memo[r][c] };
    return memo[r][c]!;
  }

  const right = yield* solveGridPaths(r, c + 1, obstacles, useMemo, memo);
  const down = yield* solveGridPaths(r + 1, c, obstacles, useMemo, memo);
  const total = right + down;

  if (useMemo) {
    memo[r][c] = total;
  }

  yield { type: 'EXIT', r, c, val: total, reason: 'computed' };
  return total;
}

// --- Main Component ---
export default function App() {
  // --- State ---
  const [obstacles, setObstacles] = useState<boolean[][]>(() => {
    const init = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    // Default interesting obstacle pattern
    init[1][2] = true;
    init[2][2] = true;
    init[3][4] = true;
    init[4][4] = true;
    return init;
  });

  const [useMemo, setUseMemo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50); // ms per step
  const [isFinished, setIsFinished] = useState(false);
  
  const [stats, setStats] = useState({ calls: 0, memoHits: 0, finalResult: null as number | null });
  const [callStack, setCallStack] = useState<{r: number, c: number}[]>([]);
  
  const [gridData, setGridData] = useState<CellData[][]>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ visits: 0, val: null, status: 'idle' })))
  );

  // --- Refs for Execution ---
  const generatorRef = useRef<Generator<Step, number, void> | null>(null);
  const memoRef = useRef<(number | undefined)[][]>([]);
  const timerRef = useRef<number | null>(null);

  // --- Actions ---
  const initSimulation = useCallback(() => {
    memoRef.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(undefined));
    generatorRef.current = solveGridPaths(0, 0, obstacles, useMemo, memoRef.current);
    
    setGridData(Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ visits: 0, val: null, status: 'idle' }))));
    setStats({ calls: 0, memoHits: 0, finalResult: null });
    setCallStack([]);
    setIsFinished(false);
    setIsPlaying(false);
  }, [obstacles, useMemo]);

  // Re-init when core parameters change
  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

  const processStep = useCallback(() => {
    if (!generatorRef.current) return false;

    const { value: step, done } = generatorRef.current.next();

    if (done) {
      setIsFinished(true);
      setIsPlaying(false);
      if (step !== undefined) {
        setStats(s => ({ ...s, finalResult: step as number }));
      }
      return false;
    }

    if (step) {
      setGridData(prev => {
        const next = prev.map(row => [...row]);
        const cell = next[step.r][step.c];

        // Clear previous memo flashes
        for(let r=0; r<ROWS; r++) {
          for(let c=0; c<COLS; c++) {
            if (next[r][c].status === 'memo-flash') next[r][c].status = 'done';
          }
        }

        switch (step.type) {
          case 'ENTER':
            cell.visits += 1;
            cell.status = 'active';
            setCallStack(stack => [...stack, { r: step.r, c: step.c }]);
            setStats(s => ({ ...s, calls: s.calls + 1 }));
            break;
          case 'EXIT':
            cell.val = step.val!;
            cell.status = 'done';
            setCallStack(stack => stack.slice(0, -1));
            break;
          case 'MEMO_HIT':
            cell.visits += 1;
            cell.status = 'memo-flash';
            setStats(s => ({ ...s, calls: s.calls + 1, memoHits: s.memoHits + 1 }));
            break;
        }
        return next;
      });
    }
    return true;
  }, []);

  // Playback Loop
  useEffect(() => {
    if (isPlaying && !isFinished) {
      const delay = Math.max(10, 500 - speed * 4.9); // Map 0-100 to 500ms-10ms
      timerRef.current = window.setTimeout(() => {
        processStep();
      }, delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, isFinished, speed, gridData, processStep]);

  const toggleObstacle = (r: number, c: number) => {
    if (isPlaying || (r===0 && c===0) || (r===ROWS-1 && c===COLS-1)) return;
    setObstacles(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = !next[r][c];
      return next;
    });
  };

  // --- Render Helpers ---
  const getCellClass = (r: number, c: number, data: CellData) => {
    const isStart = r === 0 && c === 0;
    const isEnd = r === ROWS - 1 && c === COLS - 1;
    const isObstacle = obstacles[r][c];
    const inStack = callStack.some(pos => pos.r === r && pos.c === c);
    const isCurrent = callStack.length > 0 && callStack[callStack.length - 1].r === r && callStack[callStack.length - 1].c === c;

    let base = "relative flex items-center justify-center border transition-all duration-200 select-none overflow-hidden ";
    
    if (isObstacle) {
      return base + "bg-slate-700 border-slate-800 cursor-pointer hover:bg-slate-600";
    }

    if (data.status === 'memo-flash') {
      return base + "bg-amber-300 border-amber-500 scale-105 z-10 shadow-lg";
    }

    if (isCurrent) {
      return base + "bg-blue-500 border-blue-600 text-white shadow-md scale-105 z-10 ring-4 ring-blue-200";
    }

    if (inStack) {
      return base + "bg-blue-100 border-blue-300 text-blue-900";
    }

    if (data.status === 'done') {
      return base + "bg-slate-100 border-slate-300 text-slate-700";
    }

    // Idle state
    base += "bg-white border-slate-200 hover:bg-slate-50 cursor-pointer ";
    if (isStart) base += "ring-2 ring-inset ring-emerald-400 bg-emerald-50 ";
    if (isEnd) base += "ring-2 ring-inset ring-rose-400 bg-rose-50 ";

    return base;
  };

  // Heatmap color for visit counts (Naive mode visualization)
  const getVisitBadgeColor = (visits: number) => {
    if (visits === 0) return 'bg-slate-200 text-slate-500';
    if (visits === 1) return 'bg-blue-100 text-blue-700';
    if (visits < 5) return 'bg-amber-100 text-amber-700';
    if (visits < 20) return 'bg-orange-200 text-orange-800';
    return 'bg-red-500 text-white font-bold shadow-sm';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-5xl w-full mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
          Grid Paths: Overlapping Subproblems
        </h1>
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          Find the number of unique paths from the top-left to the bottom-right, moving only right or down. 
          Watch how a naive recursive approach recalculates the same cells repeatedly, while <strong>memoization</strong> solves each subproblem exactly once.
        </p>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Controls & Stats */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Controls Panel */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Execution Controls</h2>
            
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isFinished}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  isFinished ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
                  isPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                {isPlaying ? <><PauseIcon /> Pause</> : <><PlayIcon /> Play</>}
              </button>
              
              <button 
                onClick={processStep}
                disabled={isPlaying || isFinished}
                className="p-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Step Forward"
              >
                <StepForwardIcon />
              </button>

              <button 
                onClick={initSimulation}
                className="p-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Reset"
              >
                <ResetIcon />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                <span>Speed</span>
                <span>{speed}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={speed} 
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors flex items-center gap-2">
                  Use Memoization
                  <span className="text-slate-400" title="Cache results of subproblems to avoid redundant work."><InfoIcon /></span>
                </span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={useMemo}
                    onChange={(e) => setUseMemo(e.target.checked)}
                    disabled={isPlaying || stats.calls > 0}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${useMemo ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useMemo ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>
              {(!useMemo && stats.calls > 0) && (
                <p className="text-xs text-rose-500 mt-2 font-medium animate-pulse">
                  Warning: Naive approach scales exponentially!
                </p>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Live Statistics</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium mb-1">Total Calls</div>
                <div className="text-2xl font-mono font-semibold text-slate-800">{stats.calls}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium mb