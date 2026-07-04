import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, Settings2, Info, Package, ArrowRight } from 'lucide-react';

// --- Types ---
type Item = {
  id: string;
  weight: number;
  value: number;
};

type StepType = 'idle' | 'compute' | 'backtrack' | 'done';

type StepInfo = {
  index: number;
  type: StepType;
  r: number;
  c: number;
  val: number;
  prevR1: number;
  prevC1: number;
  prevR2: number | null;
  prevC2: number | null;
  tookItem: boolean;
  explanation: string;
};

// --- Helper: Build DP Data ---
const buildDPData = (items: Item[], capacity: number) => {
  const N = items.length;
  const W = capacity;
  const grid = Array.from({ length: N + 1 }, () => Array(W + 1).fill(0));
  const steps: StepInfo[] = [];
  
  // Step 0: Idle / Base cases
  steps.push({
    index: 0,
    type: 'idle',
    r: 0, c: 0, val: 0, prevR1: 0, prevC1: 0, prevR2: null, prevC2: null, tookItem: false,
    explanation: "Initialization: Base cases (0 items or 0 capacity) yield 0 value."
  });

  // Compute steps
  let stepIndex = 1;
  for (let i = 1; i <= N; i++) {
    const item = items[i - 1];
    for (let w = 1; w <= W; w++) {
      const excludeVal = grid[i - 1][w];
      let includeVal = -1;
      let took = false;
      let val = excludeVal;
      let prevR2 = null;
      let prevC2 = null;

      if (item.weight <= w) {
        includeVal = grid[i - 1][w - item.weight] + item.value;
        if (includeVal > excludeVal) {
          val = includeVal;
          took = true;
        }
        prevR2 = i - 1;
        prevC2 = w - item.weight;
      }

      grid[i][w] = val;

      let explanation = `Capacity ${w}: `;
      if (item.weight > w) {
        explanation += `Item weight (${item.weight}) > capacity. Inherit value from above: ${val}.`;
      } else {
        explanation += `Max(exclude: ${excludeVal}, include: ${grid[i-1][w-item.weight]} + ${item.value} = ${includeVal}) = ${val}.`;
      }

      steps.push({
        index: stepIndex++,
        type: 'compute',
        r: i,
        c: w,
        val,
        prevR1: i - 1,
        prevC1: w,
        prevR2,
        prevC2,
        tookItem: took,
        explanation
      });
    }
  }

  // Backtrack steps
  let r = N;
  let c = W;
  while (r > 0) {
    const took = grid[r][c] !== grid[r - 1][c];
    
    steps.push({
      index: stepIndex++,
      type: 'backtrack',
      r,
      c,
      val: grid[r][c],
      prevR1: r - 1,
      prevC1: c,
      prevR2: took ? r - 1 : null,
      prevC2: took ? c - items[r - 1].weight : null,
      tookItem: took,
      explanation: took 
        ? `Value changed from row above (${grid[r][c]} != ${grid[r-1][c]}). Item ${r} was INCLUDED. Move up and left by weight ${items[r-1].weight}.`
        : `Value matches row above (${grid[r][c]} == ${grid[r-1][c]}). Item ${r} was EXCLUDED. Move up.`
    });

    if (took) {
      c -= items[r - 1].weight;
    }
    r--;
  }

  steps.push({
    index: stepIndex,
    type: 'done',
    r: 0, c: 0, val: 0, prevR1: 0, prevC1: 0, prevR2: null, prevC2: null, tookItem: false,
    explanation: "Optimal solution found! The highlighted path shows the items chosen."
  });

  return { grid, steps, totalSteps: steps.length };
};

// --- Main Component ---
export default function App() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', weight: 1, value: 2 },
    { id: '2', weight: 2, value: 3 },
    { id: '3', weight: 3, value: 5 },
    { id: '4', weight: 4, value: 7 },
  ]);
  const [capacity, setCapacity] = useState(7);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(500);

  const dpData = useMemo(() => buildDPData(items, capacity), [items, capacity]);
  const currentStep = dpData.steps[currentStepIndex] || dpData.steps[0];

  // Auto-play effect
  useEffect(() => {
    let timer: number;
    if (isPlaying && currentStepIndex < dpData.totalSteps - 1) {
      timer = window.setTimeout(() => {
        setCurrentStepIndex(prev => Math.min(prev + 1, dpData.totalSteps - 1));
      }, speedMs);
    } else if (currentStepIndex >= dpData.totalSteps - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, dpData.totalSteps, speedMs]);

  // Reset when data changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [items, capacity]);

  // Handlers
  const handleAddItem = () => {
    if (items.length >= 6) return; // Cap at 6 items for UI sanity
    const newId = (Math.max(0, ...items.map(i => parseInt(i.id))) + 1).toString();
    setItems([...items, { id: newId, weight: 1, value: 1 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: 'weight' | 'value', val: number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: Math.max(1, val) } : i));
  };

  // Cell rendering logic
  const getCellState = (r: number, c: number) => {
    const isBaseCase = r === 0 || c === 0;
    const computeIndex = isBaseCase ? 0 : ((r - 1) * capacity) + c;
    
    // Not yet computed
    if (currentStepIndex < computeIndex) return { text: '', class: 'bg-slate-50 border-slate-200 text-transparent' };
    
    // Base cases
    if (isBaseCase) return { text: '0', class: 'bg-slate-100 border-slate-300 text-slate-500' };

    const val = dpData.grid[r][c];
    let className = 'bg-white border-slate-300 text-slate-700';

    if (currentStep.type === 'compute') {
      if (currentStep.r === r && currentStep.c === c) {
        className = 'bg-blue-100 border-blue-500 text-blue-900 font-bold shadow-inner z-10 scale-105 transform transition-all';
      } else if (currentStep.prevR1 === r && currentStep.prevC1 === c) {
        className = 'bg-indigo-50 border-indigo-300 text-indigo-700'; // Exclude dependency
      } else if (currentStep.prevR2 === r && currentStep.prevC2 === c) {
        className = 'bg-purple-50 border-purple-300 text-purple-700'; // Include dependency
      }
    } else if (currentStep.type === 'backtrack' || currentStep.type === 'done') {
      // Check if this cell is part of the backtrack path
      const isPath = dpData.steps.some(s => s.type === 'backtrack' && s.index <= currentStepIndex && s.r === r && s.c === c);
      const isChosen = dpData.steps.some(s => s.type === 'backtrack' && s.index <= currentStepIndex && s.r === r && s.c === c && s.tookItem);
      
      if (isChosen && r === currentStep.r && c === currentStep.c) {
        className = 'bg-emerald-400 border-emerald-600 text-emerald-950 font-bold scale-110 shadow-lg z-10 transition-all';
      } else if (isChosen) {
        className = 'bg-emerald-200 border-emerald-500 text-emerald-900 font-bold shadow-inner';
      } else if (isPath) {
        className = 'bg-orange-100 border-orange-400 text-orange-800';
      }
    }

    return { text: val.toString(), class: className };
  };

  const chosenItems = new Set(
    dpData.steps
      .filter(s => s.type === 'backtrack' && s.index <= currentStepIndex && s.tookItem)
      .map(s => s.r - 1)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="text-indigo-600" />
              Knapsack 0/1 Visualization
            </h1>
            <p className="text-slate-500 mt-1 max-w-2xl">
              Maximize the total value of items placed in a knapsack without exceeding its capacity.
              Watch how Dynamic Programming builds a table of subproblems and backtracks to find the optimal subset.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Status</div>
            <div className="text-lg font-medium text-indigo-600 capitalize">
              {currentStep.type === 'idle' ? 'Ready' : currentStep.type}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Controls & Items */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Configuration Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-slate-400" />
                  Configuration
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Capacity:</span>
                  <input 
                    type="number" 
                    min="1" max="15" 
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-slate-300 rounded-md text-center font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    disabled={currentStepIndex > 0}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                  <div className="col-span-2">Item</div>
                  <div className="col-span-4 text-center">Weight</div>
                  <div className="col-span-4 text-center">Value</div>
                  <div className="col-span-2"></div>
                </div>
                
                {items.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-colors ${
                      chosenItems.has(idx) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="col-span-2 flex justify-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        chosenItems.has(idx) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                    </div>
                    <div className="col-span-4">
                      <input 
                        type="number" min="1"
                        value={item.weight}
                        onChange={(e) => handleUpdateItem(item.id, 'weight', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                        disabled={currentStepIndex > 0}
                      />
                    </div>
                    <div className="col-span-4">
                      <input 
                        type="number" min="1"
                        value={item.value}
                        onChange={(e) => handleUpdateItem(item.id, 'value', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                        disabled={currentStepIndex > 0}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1 || currentStepIndex > 0}
                        className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={handleAddItem}
                  disabled={items.length >= 6 || currentStepIndex > 0}
                  className="w-full py-2 mt-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Animation Controls</h2>
                <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded text-slate-600">
                  Step {currentStepIndex} / {dpData.totalSteps - 1}
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                  title="Reset"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-3 rounded-full text-white transition-transform active:scale-95 ${
                    isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(prev => Math.min(prev + 1, dpData.totalSteps - 1));
                  }}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                  title="Step Forward"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
                <input 
                  type="range" min="100" max="1500" step="100"
                  value={1600 - speedMs} // Invert for mental model (higher = faster)
                  onChange={(e) => setSpeedMs(1600 - parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Explanation Box */}
            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
              <h3 className="text-indigo-800 font-semibold flex items-center gap-2 mb-2">
                <Info className="w-5 h-5" /> Explanation
              </h3>
              <p className="text-indigo-900/80 text-sm leading-relaxed min-h-[4rem]">
                {currentStep.explanation}
              </p>
            </div>

          </div>

          {/* Right Panel: DP Table */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              DP Table 
              <span className="text-sm font-normal text-slate-400">
                (Rows: Items, Cols: Capacity)
              </span>
            </h2>

            <div className="inline-block min-w-full">
              {/* Table Header (Capacities) */}
              <div className="flex mb-1">
                <div className="w-32 shrink-0"></div>
                {Array.from({ length: capacity + 1 }).map((_, c) => (
                  <div key={`head-${c}`} className="w-12 shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                    W={c}
                  </div>
                ))}
              </div>

              {/* Table Rows */}
              <div className="space-y-1">
                {Array.from({ length: items.length + 1 }).map((_, r) => (
                  <div key={`row-${r}`} className="flex items-center gap-1">
                    {/* Row Label */}
                    <div className="w-32 shrink-0 flex items-center justify-end pr-4 text-sm font-medium text-slate-600">
                      {r === 0 ? (
                        <span className="text-slate-400">Base Case</span>
                      ) : (
                        <div className="flex flex-col items-end leading-tight">
                          <span>Item {r}</span>
                          <span className="text-xs text-slate-400 font-normal">
                            w:{items[r-1].weight}, v:{items[r-1].value}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cells */}
                    {Array.from({ length: capacity + 1 }).