import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Info, Zap, ShieldAlert, CheckCircle2, Grid2X2 } from 'lucide-react';

// --- Types & Constants ---

type StepType = 'call' | 'return' | 'cache_hit' | 'obstacle' | 'base_case' | 'out_of_bounds';

interface Step {
  type: StepType;
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
// Add some default obstacles
INITIAL_GRID[1][2] = 1;
INITIAL_GRID[3][1] = 1;
INITIAL_GRID[2][4] = 1;

// --- Helper: Algorithm Step Generator ---

function generateSteps(grid: number[][], useMemo: boolean): Step[] {
  const steps: Step[] = [];
  const memo: Record<string, number> = {};
  const stack: string[] = [];

  function solve(r: number, c: number): number {
    const key = `${r},${c}`;
    stack.push(key);

    if (r < 0 || c < 0) {
      steps.push({
        type: 'out_of_bounds',
        r, c,
        memo: { ...memo },
        stack: [...stack],
        description: `Out of bounds at (${r}, ${c}). Returning 0.`
      });
      stack.pop();
      return 0;
    }

    if (grid[r][c] === 1) {
      steps.push({
        type: 'obstacle',
        r, c,
        memo: { ...memo },
        stack: [...stack],
        description: `Hit an obstacle at (${r}, ${c}). Returning 0.`
      });
      stack.pop();
      return 0;
    }

    if (r === 0 && c === 0) {
      steps.push({
        type: 'base_case',
        r, c,
        value: 1,
        memo: { ...memo },
        stack: [...stack],
        description: `Reached Start (0, 0). Base case found: 1 path.`
      });
      stack.pop();
      return 1;
    }

    if (useMemo && memo[key] !== undefined) {
      steps.push({
        type: 'cache_hit',
        r, c,
        value: memo[key],
        memo: { ...memo },
        stack: [...stack],
        description: `Cache hit at (${r}, ${c})! Reusing computed value: ${memo[key]}.`
      });
      stack.pop();
      return memo[key];
    }

    steps.push({
      type: 'call',
      r, c,
      memo: { ...memo },
      stack: [...stack],
      description: `Computing paths to (${r}, ${c}). Exploring Up and Left...`
    });

    const up = solve(r - 1, c);
    const left = solve(r, c - 1);
    const total = up + left;

    if (useMemo) {
      memo[key] = total;
    }

    steps.push({
      type: 'return',
      r, c,
      value: total,
      memo: { ...memo },
      stack: [...stack],
      description: `Computed (${r}, ${c}) = ${up} (Up) + ${left} (Left) = ${total} paths.`
    });

    stack.pop();
    return total;
  }

  solve(ROWS - 1, COLS - 1);
  return steps;
}

// --- Main Component ---

export default function GridPathsDP() {
  const [grid, setGrid] = useState<number[][]>(INITIAL_GRID);
  const [isMemoEnabled, setIsMemoEnabled] = useState<boolean>(true);
  
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2); // 1 to 5
  
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // Initialize steps when grid or memo setting changes (if not started)
  useEffect(() => {
    if (!hasStarted) {
      const newSteps = generateSteps(grid, isMemoEnabled);
      setSteps(newSteps);
      setCurrentStepIndex(-1);
    }
  }, [grid, isMemoEnabled, hasStarted]);

  // Playback loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStepIndex < steps.length - 1) {
      const delay = 1000 / Math.pow(2, speed - 1); // Speed scaling
      timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, delay);
    } else if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, speed]);

  const toggleObstacle = (r: number, c: number) => {
    if (hasStarted) return; // Lock grid during playback
    if ((r === 0 && c === 0) || (r === ROWS - 1 && c === COLS - 1)) return; // Protect start/end

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = newGrid[r][c] === 1 ? 0 : 1;
    setGrid(newGrid);
  };

  const handlePlayPause = () => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(-1); // Restart if finished
    }
    setHasStarted(true);
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setHasStarted(true);
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setHasStarted(false);
    setCurrentStepIndex(-1);
    setSteps(generateSteps(grid, isMemoEnabled));
  };

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const currentMemo = currentStep?.memo || {};
  const currentStack = currentStep?.stack || [];

  // Calculate Stats
  const stats = steps.slice(0, currentStepIndex + 1).reduce(
    (acc, step) => {
      if (step.type === 'call') acc.calls++;
      if (step.type === 'cache_hit') acc.hits++;
      return acc;
    },
    { calls: 0, hits: 0 }
  );

  // --- Render Helpers ---

  const getCellClasses = (r: number, c: number) => {
    const isStart = r === 0 && c === 0;
    const isEnd = r === ROWS - 1 && c === COLS - 1;
    const isObstacle = grid[r][c] === 1;
    const isActive = currentStep?.r === r && currentStep?.c === c;
    const isMemoized = currentMemo[`${r},${c}`] !== undefined;
    const isCacheHit = isActive && currentStep?.type === 'cache_hit';

    let baseClasses = "relative flex items-center justify-center text-sm font-semibold transition-all duration-300 border border-slate-200 cursor-pointer select-none ";

    if (isObstacle) {
      baseClasses += "bg-slate-700 text-slate-400 ";
    } else if (isStart) {
      baseClasses += "bg-emerald-100 text-emerald-800 border-emerald-300 ";
    } else if (isEnd) {
      baseClasses += "bg-indigo-100 text-indigo-800 border-indigo-300 ";
    } else if (isCacheHit) {
      baseClasses += "bg-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.6)] z-10 scale-105 ";
    } else if (isActive) {
      baseClasses += "bg-amber-300 text-amber-900 shadow-[0_0_15px_rgba(252,211,77,0.6)] z-10 scale-105 ";
    } else if (isMemoized) {
      baseClasses += "bg-emerald-50 text-emerald-700 border-emerald-200 ";
    } else {
      baseClasses += "bg-white text-slate-400 hover:bg-slate-50 ";
    }

    if (!hasStarted && !isStart && !isEnd) {
      baseClasses += "hover:ring-2 hover:ring-indigo-400 hover:z-10 ";
    }

    return baseClasses;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-6xl w-full mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Grid2X2 size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Grid Paths</h1>
          <span className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full">
            Dynamic Programming Lab
          </span>
        </div>
        <p className="text-slate-600 max-w-3xl">
          Find the number of unique paths from the top-left (Start) to the bottom-right (End). 
          You can only move <strong>Right</strong> and <strong>Down</strong>. Click cells to toggle obstacles. 
          Compare naive recursion with top-down memoization to see how subproblem reuse saves computation.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Grid Visualization */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* The Grid */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="grid gap-1 mx-auto" 
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {grid.map((row, r) => 
                row.map((_, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`aspect-square rounded-md ${getCellClasses(r, c)}`}
                    onClick={() => toggleObstacle(r, c)}
                    title={hasStarted ? "" : "Click to toggle obstacle"}
                  >
                    {/* Cell Content */}
                    {grid[r][c] === 1 ? (
                      <ShieldAlert size={20} className="opacity-50" />
                    ) : (
                      <span className="text-lg">
                        {r === 0 && c === 0 ? 'S' : r === ROWS - 1 && c === COLS - 1 && currentMemo[`${r},${c}`] === undefined ? 'E' : currentMemo[`${r},${c}`] ?? ''}
                      </span>
                    )}
                    
                    {/* Coordinate Tooltip (Subtle) */}
                    <span className="absolute bottom-1 right-1 text-[10px] opacity-30 pointer-events-none">
                      {r},{c}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-300 rounded-sm"></div> Active Call</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded-sm"></div> Memoized</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-sky-400 rounded-sm"></div> Cache Hit</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-700 rounded-sm"></div> Obstacle</div>
            </div>
          </div>

          {/* Explanation Panel */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-h-[100px] flex items-start gap-4 transition-all">
            <div className="mt-1 text-indigo-500">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Current Action</h3>
              <p className="text-slate-600 font-mono text-sm leading-relaxed">
                {currentStep ? currentStep.description : "Click Play or Step to start the algorithm."}
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Controls & Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Controls Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Algorithm Settings
            </h3>
            
            {/* Memoization Toggle */}
            <div className="flex items-center justify-between mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <span className="font-medium text-slate-800 block">Memoization</span>
                <span className="text-xs text-slate-500">Cache subproblem results</span>
              </div>
              <button
                onClick={() => {
                  if (!hasStarted) setIsMemoEnabled(!isMemoEnabled);
                }}
                disabled={hasStarted}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isMemoEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                } ${hasStarted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isMemoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handlePlayPause}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : currentStepIndex >= steps.length - 1 ? 'Restart' : 'Play'}
              </button>
              <button
                onClick={handleStepForward}
                disabled={isPlaying || currentStepIndex >= steps.length - 1}
                className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Step Forward"
              >
                <SkipForward size={18} />
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-600 rounded-lg transition-colors