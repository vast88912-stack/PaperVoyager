import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Info, Settings2, SkipForward, BrainCircuit, Activity } from 'lucide-react';

// --- Types ---
type Coordinate = [number, number];

type StepType = 'CALL' | 'RETURN' | 'CACHE_HIT' | 'OBSTACLE' | 'OUT_OF_BOUNDS';

interface TraceStep {
  type: StepType;
  r: number;
  c: number;
  val?: number;
  depth: number;
  msg: string;
}

interface VisualState {
  activeStack: string[];
  memoTable: Record<string, number>;
  visitCounts: Record<string, number>;
  currentStep: TraceStep | null;
  totalCalls: number;
  totalHits: number;
  isComplete: boolean;
}

// --- Constants ---
const ROWS = 6;
const COLS = 6;
const MAX_SPEED = 10;
const MIN_SPEED = 1;

// --- Helper: Generate Algorithm Trace ---
const generateTrace = (grid: boolean[][], useMemo: boolean) => {
  const trace: TraceStep[] = [];
  const memo: Record<string, number> = {};
  let calls = 0;
  let hits = 0;

  const dfs = (r: number, c: number, depth: number): number => {
    calls++;
    const key = `${r},${c}`;
    
    trace.push({
      type: 'CALL', r, c, depth,
      msg: `Exploring paths from (${r}, ${c})`
    });

    // Base cases
    if (r >= ROWS || c >= COLS) {
      trace.push({
        type: 'OUT_OF_BOUNDS', r, c, val: 0, depth,
        msg: `(${r}, ${c}) is out of bounds. Return 0.`
      });
      return 0;
    }
    if (grid[r][c]) {
      trace.push({
        type: 'OBSTACLE', r, c, val: 0, depth,
        msg: `Hit obstacle at (${r}, ${c}). Return 0.`
      });
      return 0;
    }
    if (r === ROWS - 1 && c === COLS - 1) {
      trace.push({
        type: 'RETURN', r, c, val: 1, depth,
        msg: `Reached destination! Return 1.`
      });
      return 1;
    }

    // Memoization Check
    if (useMemo && memo[key] !== undefined) {
      hits++;
      trace.push({
        type: 'CACHE_HIT', r, c, val: memo[key], depth,
        msg: `Cache hit! Already know (${r}, ${c}) has ${memo[key]} paths.`
      });
      return memo[key];
    }

    // Recursive Calls (Right, then Down)
    const right = dfs(r, c + 1, depth + 1);
    const down = dfs(r + 1, c, depth + 1);
    const total = right + down;

    if (useMemo) {
      memo[key] = total;
    }

    trace.push({
      type: 'RETURN', r, c, val: total, depth,
      msg: `Paths from (${r}, ${c}) = Right(${right}) + Down(${down}) = ${total}`
    });

    return total;
  };

  const answer = dfs(0, 0, 0);
  return { trace, answer, finalCalls: calls, finalHits: hits };
};

// --- Main Component ---
export default function App() {
  // Config State
  const [grid, setGrid] = useState<boolean[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(false))
  );
  const [useMemoization, setUseMemoization] = useState(true);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [stepIndex, setStepIndex] = useState(0);

  // Engine State
  const engineData = useMemo(() => generateTrace(grid, useMemoization), [grid, useMemoization]);
  const { trace, answer } = engineData;

  // Reset playback when config changes
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [grid, useMemoization]);

  // Playback Loop
  useEffect(() => {
    let timer: number;
    if (isPlaying && stepIndex < trace.length - 1) {
      const delay = 1000 / (speed * 1.5); // non-linear speed feel
      timer = window.setTimeout(() => setStepIndex(s => s + 1), delay);
    } else if (stepIndex >= trace.length - 1) {
      setIsPlaying(false);
    }
    return () => window.clearTimeout(timer);
  }, [isPlaying, stepIndex, speed, trace.length]);

  // Derived Visual State
  const visState = useMemo<VisualState>(() => {
    const activeStack: string[] = [];
    const memoTable: Record<string, number> = {};
    const visitCounts: Record<string, number> = {};
    let totalCalls = 0;
    let totalHits = 0;

    for (let i = 0; i <= stepIndex; i++) {
      const step = trace[i];
      const key = `${step.r},${step.c}`;

      if (step.type === 'CALL') {
        activeStack.push(key);
        visitCounts[key] = (visitCounts[key] || 0) + 1;
        totalCalls++;
      } else if (step.type === 'RETURN' || step.type === 'OBSTACLE' || step.type === 'OUT_OF_BOUNDS') {
        if (activeStack[activeStack.length - 1] === key) {
          activeStack.pop();
        }
        if (step.type === 'RETURN' && step.val !== undefined) {
          memoTable[key] = step.val;
        }
      } else if (step.type === 'CACHE_HIT') {
        visitCounts[key] = (visitCounts[key] || 0) + 1;
        totalHits++;
      }
    }

    return {
      activeStack,
      memoTable,
      visitCounts,
      currentStep: trace[stepIndex] || null,
      totalCalls,
      totalHits,
      isComplete: stepIndex === trace.length - 1
    };
  }, [trace, stepIndex]);

  // Handlers
  const toggleObstacle = (r: number, c: number) => {
    if (stepIndex > 0) return; // Disallow edits during run
    if ((r === 0 && c === 0) || (r === ROWS - 1 && c === COLS - 1)) return; // Protect start/end

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = !newGrid[r][c];
    setGrid(newGrid);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIndex(0);
  };

  // --- Render Helpers ---
  const getCellClasses = (r: number, c: number) => {
    const key = `${r},${c}`;
    const isObstacle = grid[r][c];
    const isStart = r === 0 && c === 0;
    const isEnd = r === ROWS - 1 && c === COLS - 1;
    const isActive = visState.activeStack[visState.activeStack.length - 1] === key;
    const inStack = visState.activeStack.includes(key);
    const isMemoized = visState.memoTable[key] !== undefined;
    const isCurrentHit = visState.currentStep?.type === 'CACHE_HIT' && visState.currentStep.r === r && visState.currentStep.c === c;
    const visits = visState.visitCounts[key] || 0;

    let classes = "relative flex items-center justify-center border-2 text-sm font-semibold transition-all duration-300 rounded-lg select-none ";

    if (isObstacle) {
      classes += "bg-slate-700 border-slate-800 text-slate-500 shadow-inner ";
    } else if (isActive) {
      classes += "bg-blue-100 border-blue-500 text-blue-900 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10 scale-105 ";
    } else if (isCurrentHit) {
      classes += "bg-yellow-200 border-yellow-500 text-yellow-900 shadow-[0_0_15px_rgba(234,179,8,0.6)] z-10 scale-105 ";
    } else if (inStack) {
      classes += "bg-blue-50 border-blue-300 text-blue-800 ";
    } else if (isMemoized) {
      classes += "bg-emerald-50 border-emerald-300 text-emerald-800 ";
    } else {
      // Base state with heatmap for redundant visits
      classes += "bg-white border-slate-200 text-slate-400 hover:border-slate-300 ";
      if (!useMemoization && visits > 1) {
        // Red heatmap for naive approach
        const intensity = Math.min(visits * 10, 80);
        classes += `!bg-red-[${intensity}%] !border-red-300 !text-red-900 `; // Using style override below for dynamic colors
      }
    }

    if (isStart && !isObstacle && !isActive && !inStack && !isMemoized) classes += "ring-2 ring-indigo-400 ring-offset-2 ";
    if (isEnd && !isObstacle && !isActive && !inStack && !isMemoized) classes += "ring-2 ring-purple-400 ring-offset-2 ";

    if (stepIndex === 0 && !isStart && !isEnd) {
      classes += "cursor-pointer hover:bg-slate-100 ";
    }

    return classes;
  };

  const getHeatmapStyle = (r: number, c: number) => {
    const key = `${r},${c}`;
    const visits = visState.visitCounts[key] || 0;
    if (!useMemoization && visits > 1 && !grid[r][c] && !visState.activeStack.includes(key)) {
      const alpha = Math.min((visits - 1) * 0.15, 0.6);
      return { backgroundColor: `rgba(239, 68, 68, ${alpha})`, borderColor: `rgba(239, 68, 68, ${alpha + 0.2})`, color: '#7f1d1d' };
    }
    return {};
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-5xl w-full mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-indigo-600" />
          Dynamic Programming Lab
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Module 3: Grid Paths. Analyze subproblem overlap and the power of memoization.
        </p>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls & Context */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Settings Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-slate-500" /> Algorithm Settings
            </h2>
            
            <div className="space-y-6">
              {/* Memoization Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block">Use Memoization</label>
                  <span className="text-xs text-slate-500">Cache subproblem results</span>
                </div>
                <button 
                  onClick={() => setUseMemoization(!useMemoization)}
                  disabled={stepIndex > 0 && !visState.isComplete}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${useMemoization ? 'bg-indigo-600' : 'bg-slate-300'} ${stepIndex > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useMemoization ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Playback Controls */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-3">Playback Controls</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Pause' : stepIndex === 0 ? 'Start' : 'Resume'}
                  </button>
                  <button 
                    onClick={() => { setIsPlaying(false); setStepIndex(s => Math.min(s + 1, trace.length - 1)); }}
                    disabled={isPlaying || visState.isComplete}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Step Forward"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleReset}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    title="Reset"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Animation Speed</label>
                  <FastForward className="w-4 h-4 text-slate-400" />
                </div>
                <input 
                  type="range" 
                  min={MIN_SPEED} 
                  max={MAX_SPEED} 
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-slate-500" /> Execution Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Function Calls</div>
                <div className="text-2xl font-bold text-slate-800 font-mono mt-1">{visState.totalCalls}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cache Hits</div>
                <div className={`text-2xl font-bold font-mono mt-1 ${useMemoization ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {useMemoization ? visState.totalHits : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{Math.round((stepIndex / (trace.length - 1 || 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${(stepIndex / (trace.length - 1 || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel: Visualization */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Status Message Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-start gap-3 min-h-[4.5rem]">
            <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {stepIndex === 0 ? (
                <p className="text-slate-600">
                  Click grid cells to place obstacles. Press <strong className="text-slate-800">Start</strong> to trace the algorithm finding paths from top-left to bottom-right.
                </p>
              ) : visState.isComplete ? (
                <p className="text-slate-800 font-medium">
                  Algorithm complete! Found <span className="text-indigo-600 font-bold">{answer}</span> unique paths.
                  {!useMemoization && visState.totalCalls > 100 && " Notice how many redundant calls were made."}
                </p>
              ) : (
                <p className="text-slate-700 font-medium font-mono text-sm">
                  {visState.currentStep?.msg}
                </p>
              )}
            </div>
          </div>

          {/* The Grid Canvas */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex justify-center items-center overflow-x-auto">
            <div 
              className="grid gap-2" 
              style={{ 
                gridTemplateColumns: `repeat(${COLS}, minmax(3rem, 4rem))`,
                gridTemplateRows: `repeat(${ROWS}, minmax(3rem, 4rem))`
              }}
            >
              {grid.map((row, r) => 
                row.map((_, c) => {
                  const key = `${r},${c}`;
                  const isObstacle = grid[r][c];
                  const memoVal = visState.memoTable[key];
                  const visits = visState.visitCounts[key] || 0;
                  
                  return (
                    <div 
                      key={key}
                      onClick={() => toggleObstacle(r, c)}
                      className={getCellClasses(r, c)}
                      style={getHeatmapStyle(r, c)}
                    >
                      {/* Cell Content */}
                      {isObstacle ? (
                        <div className="w-3 h-3 bg-slate-500 rounded-sm rotate-45" />
                      ) : (
                        <>
                          {/* Value display */}
                          <span className={`z-10 ${memoVal !== undefined ? 'text-lg font-bold' : 'text-xs opacity-40 font-mono'}`}>
                            {memoVal !== undefined ? memoVal : `${