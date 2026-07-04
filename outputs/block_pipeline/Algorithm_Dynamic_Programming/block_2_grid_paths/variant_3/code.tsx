import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Info, MousePointerClick, CheckCircle2, ShieldAlert } from 'lucide-react';

// --- Types & Constants ---
const ROWS = 5;
const COLS = 6;

type CellState = 'IDLE' | 'ACTIVE' | 'PROCESSED' | 'MEMO_HIT' | 'OBSTACLE' | 'BASE_CASE';

interface LogEntry {
  id: string;
  message: string;
  type: CellState | 'DONE';
  r?: number;
  c?: number;
}

interface DPEvent {
  type: CellState | 'DONE';
  r: number;
  c: number;
  val?: number;
  msg: string;
  isEnter?: boolean;
}

// --- Generator Algorithm ---
// Yields steps of the DP execution to visualize
function* gridPathsGenerator(
  rows: number,
  cols: number,
  obstacles: Set<string>,
  useMemo: boolean
): Generator<DPEvent, number, void> {
  const memo = new Map<string, number>();

  function* dp(r: number, c: number): Generator<DPEvent, number, void> {
    const key = `${r},${c}`;
    
    yield { type: 'ACTIVE', r, c, msg: `Calling dp(${r}, ${c})`, isEnter: true };

    // Bounds check
    if (r >= rows || c >= cols) {
      yield { type: 'BASE_CASE', r, c, val: 0, msg: `Out of bounds at (${r}, ${c})`, isEnter: false };
      return 0;
    }

    // Obstacle check
    if (obstacles.has(key)) {
      yield { type: 'OBSTACLE', r, c, val: 0, msg: `Hit obstacle at (${r}, ${c})`, isEnter: false };
      return 0;
    }

    // Destination check
    if (r === rows - 1 && c === cols - 1) {
      yield { type: 'BASE_CASE', r, c, val: 1, msg: `Reached destination at (${r}, ${c})`, isEnter: false };
      return 1;
    }

    // Memo check
    if (useMemo && memo.has(key)) {
      yield { type: 'MEMO_HIT', r, c, val: memo.get(key), msg: `Memo hit! Reusing dp(${r}, ${c}) = ${memo.get(key)}`, isEnter: false };
      return memo.get(key)!;
    }

    // Recursive relations
    const downPaths = yield* dp(r + 1, c);
    
    // Re-highlight current cell after returning from 'down' branch
    yield { type: 'ACTIVE', r, c, msg: `Returned from down. Now exploring right from dp(${r}, ${c})`, isEnter: true };
    
    const rightPaths = yield* dp(r, c + 1);

    const totalPaths = downPaths + rightPaths;

    // Store in memo table
    if (useMemo) {
      memo.set(key, totalPaths);
    }

    yield { type: 'PROCESSED', r, c, val: totalPaths, msg: `Computed dp(${r}, ${c}) = ${totalPaths}`, isEnter: false };
    return totalPaths;
  }

  const result = yield* dp(0, 0);
  yield { type: 'DONE', r: 0, c: 0, val: result, msg: `Finished! Total paths: ${result}`, isEnter: false };
  return result;
}

// --- Main Component ---
export default function App() {
  // Config State
  const [useMemo, setUseMemo] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(3); // 1 (slow) to 5 (fast)
  const [obstacles, setObstacles] = useState<Set<string>>(new Set(['1,2', '3,1', '2,4']));

  // Execution State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  
  // Visual State
  const [cellStatuses, setCellStatuses] = useState<Record<string, CellState>>({});
  const [cellValues, setCellValues] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ calls: 0, memoHits: 0 });
  const [activeCallStack, setActiveCallStack] = useState<string[]>([]);

  // Refs for execution
  const generatorRef = useRef<Generator<DPEvent, number, void> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize/Reset
  const reset = useCallback(() => {
    setIsPlaying(false);
    setIsDone(false);
    setHasStarted(false);
    setCellStatuses({});
    setCellValues({});
    setLogs([]);
    setStats({ calls: 0, memoHits: 0 });
    setActiveCallStack([]);
    generatorRef.current = gridPathsGenerator(ROWS, COLS, obstacles, useMemo);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [obstacles, useMemo]);

  // Initial setup & reaction to config changes (if not started)
  useEffect(() => {
    if (!hasStarted) reset();
  }, [useMemo, obstacles, reset, hasStarted]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle a single step
  const step = useCallback(() => {
    if (!generatorRef.current) return;
    setHasStarted(true);

    const result = generatorRef.current.next();

    if (result.done) {
      setIsPlaying(false);
      setIsDone(true);
      return;
    }

    const event = result.value;
    const key = `${event.r},${event.c}`;

    // Update Logs
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      message: event.msg,
      type: event.type,
      r: event.r,
      c: event.c
    }]);

    // Update Stats
    if (event.isEnter) {
      setStats(s => ({ ...s, calls: s.calls + 1 }));
      setActiveCallStack(prev => [...prev, key]);
    }
    if (event.type === 'MEMO_HIT') {
      setStats(s => ({ ...s, memoHits: s.memoHits + 1 }));
    }
    if (!event.isEnter && event.type !== 'ACTIVE' && event.type !== 'DONE') {
      // Pop from active stack if it's a returning state
      setActiveCallStack(prev => prev.filter(k => k !== key));
    }

    // Update Cell Statuses & Values
    if (event.type !== 'DONE') {
      setCellStatuses(prev => ({
        ...prev,
        // Don't overwrite PROCESSED or OBSTACLE permanently with transient states
        [key]: (prev[key] === 'PROCESSED' && event.type !== 'MEMO_HIT') ? 'PROCESSED' : event.type
      }));

      if (event.val !== undefined) {
        setCellValues(prev => ({ ...prev, [key]: event.val! }));
      }
    } else {
        setCellStatuses(prev => ({...prev, '0,0': 'PROCESSED'}));
    }
  }, []);

  // Playback Loop
  useEffect(() => {
    if (isPlaying && !isDone) {
      const delay = [1000, 600, 300, 100, 20][speed - 1];
      timerRef.current = window.setTimeout(step, delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, isDone, speed, step]);

  // Toggle obstacle interaction
  const handleCellClick = (r: number, c: number) => {
    if (hasStarted) return; // Prevent editing during run
    if (r === 0 && c === 0) return; // Start
    if (r === ROWS - 1 && c === COLS - 1) return; // End

    const key = `${r},${c}`;
    setObstacles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // --- Rendering Helpers ---
  const getCellClasses = (r: number, c: number) => {
    const key = `${r},${c}`;
    const status = cellStatuses[key];
    const isObstacle = obstacles.has(key);
    const isActiveStack = activeCallStack.includes(key);
    const isStart = r === 0 && c === 0;
    const isEnd = r === ROWS - 1 && c === COLS - 1;

    let base = "relative flex items-center justify-center border transition-all duration-300 select-none overflow-hidden ";
    
    // Size and cursor
    base += hasStarted ? "cursor-default " : (isStart || isEnd ? "cursor-not-allowed " : "cursor-pointer hover:border-indigo-400 hover:shadow-inner ");
    base += "h-16 sm:h-20 text-sm sm:text-base font-semibold ";

    if (isObstacle) return base + "bg-slate-800 border-slate-900 text-transparent";
    if (isActiveStack && status !== 'MEMO_HIT' && status !== 'PROCESSED') return base + "bg-indigo-100 border-indigo-500 ring-2 ring-indigo-400 ring-inset text-indigo-900 shadow-md transform scale-[1.02] z-10";
    if (status === 'PROCESSED') return base + "bg-emerald-100 border-emerald-300 text-emerald-800";
    if (status === 'MEMO_HIT') return base + "bg-amber-100 border-amber-400 ring-2 ring-amber-400 ring-inset text-amber-900 shadow-sm z-10 animate-pulse";
    if (status === 'BASE_CASE') return base + "bg-teal-50 border-teal-200 text-teal-700";
    
    // Default / Unvisited
    return base + "bg-white border-slate-200 text-slate-400";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 px-6 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded flex items-center justify-center text-lg shadow-sm">3</span>
              Grid Paths: Overlapping Subproblems
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Find the number of unique paths from top-left to bottom-right, moving only down or right. 
              Notice how the Naive approach recalculates the same cells repeatedly. Toggle <strong>Memoization</strong> to cache results and eliminate redundant work!
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200 shadow-inner">
             <span className="text-sm font-medium text-slate-600 pl-2">Optimization:</span>
             <button 
                onClick={() => setUseMemo(false)}
                disabled={hasStarted}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!useMemo ? 'bg-white shadow border border-slate-300 text-slate-800' : 'text-slate-500 hover:text-slate-700'} ${hasStarted && 'opacity-50 cursor-not-allowed'}`}
             >
                Naive (2ⁿ)
             </button>
             <button 
                onClick={() => setUseMemo(true)}
                disabled={hasStarted}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${useMemo ? 'bg-indigo-600 shadow border border-indigo-700 text-white' : 'text-slate-500 hover:text-slate-700'} ${hasStarted && 'opacity-50 cursor-not-allowed'}`}
             >
                Memoized (m×n)
             </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Grid Visualization */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center gap-2">
              {!isDone ? (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm
                    ${isPlaying ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow border border-indigo-700'}`}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : hasStarted ? 'Resume' : 'Start Execution'}
                </button>
              ) : (
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border border-emerald-700 transition-all"
                >
                  <RotateCcw size={16} /> Reset
                </button>
              )}
              
              <button
                onClick={step}
                disabled={isPlaying || isDone}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <FastForward size={16} className="rotate-90" /> Step
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                Speed:
                <input 
                  type="range" min="1" max="5" 
                  value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-24 accent-indigo-600"
                />
              </label>
              {!hasStarted && (
                <button onClick={reset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="Reset Grid">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Educational Tooltip area */}
          {!hasStarted && (
             <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3 shadow-sm">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Setup Phase:</strong> Click any cell to toggle obstacles (dark blocks). Paths cannot pass through obstacles. 
                  When ready, click <em>Start Execution</em> to visualize the recursion!
                </p>
             </div>
          )}

          {/* The Grid */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-grow flex items-center justify-center relative">
            <div 
              className="grid gap-1.5 w-full max-w-2xl"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: ROWS }).map((_, r) => 
                Array.from({ length: COLS }).map((_, c) => {
                  const key = `${r},${c}`;
                  const val = cellValues[key];
                  const isStart = r === 0 && c === 0;
                  const isEnd = r === ROWS - 1 && c === COLS - 1;
                  
                  return (
                    <div 
                      key={key}
                      onClick={() => handleCellClick(r, c)}
                      className={getCellClasses(r, c) + " rounded-lg"}
                      title={`Cell (${r}, ${c})`}
                    >
                      {/* Cell Indicators */}
                      {isStart && !hasStarted && <span className="absolute top-1 left-1 text-[10px] font-bold text-indigo-500 uppercase">Start</span>}
                      {isEnd && <span className="absolute bottom-1 right-1 text-[10px] font-bold text-emerald-600 uppercase">Target</span>}
                      
                      {/* Cell Value */}
                      {val !== undefined && obstacles.has(key) === false && (
                        <span className="text-xl sm:text-2xl drop-shadow-sm font-mono z-20">
                          {val}
                        </span>
                      )}

                      {/* Obstacle Visual (Crosshatch overlay pattern) */}
                      {obstacles.has(key) && (
                         <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#fff_5px,#fff_10px)] pointer-events-none"></div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 justify-center pb-2">
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-500"></div> Active Call</span>
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div> Computed/Cached</span>
            {useMemo && <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-200 border border-amber-400"></div> Memo Hit</span>}
            <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-800 border border-slate-900"></div> Obstacle</span>
          </div>

        </section>

        {/* Right Column: Execution Tracing & Stats */}
        <section className="lg:col-span-5 flex flex-col gap-4 max-