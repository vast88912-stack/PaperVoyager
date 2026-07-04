import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Trash2, Info, Package, ArrowRight } from 'lucide-react';

// --- Types ---

type Item = {
  id: string;
  weight: number;
  value: number;
};

type TraceStep = 
  | { type: 'INIT'; message: string }
  | { type: 'FILL'; r: number; c: number; val: number; deps: [number, number][]; message: string; equation: string }
  | { type: 'BACKTRACK'; r: number; c: number; chosen: boolean; nextR: number; nextC: number; message: string }
  | { type: 'DONE'; message: string; finalValue: number; chosenItems: Set<string> };

// --- Helper: Generate DP Trace ---

function generateKnapsackTrace(items: Item[], capacity: number): { trace: TraceStep[], dp: number[][] } {
  const trace: TraceStep[] = [];
  const n = items.length;
  const dp = Array(n + 1).fill(0).map(() => Array(capacity + 1).fill(0));

  trace.push({ 
    type: 'INIT', 
    message: 'Initialize DP table. Row 0 (0 items) and Col 0 (0 capacity) are base cases set to 0.' 
  });

  for (let i = 1; i <= n; i++) {
    for (let w = 1; w <= capacity; w++) {
      const item = items[i - 1];
      const valWithout = dp[i - 1][w];
      let valWith = 0;
      const deps: [number, number][] = [[i - 1, w]];
      
      let equation = `dp[${i}][${w}] = max(dp[${i-1}][${w}], `;

      if (w >= item.weight) {
        valWith = dp[i - 1][w - item.weight] + item.value;
        deps.push([i - 1, w - item.weight]);
        equation += `dp[${i-1}][${w - item.weight}] + ${item.value})`;
      } else {
        equation += `0) // Item too heavy`;
      }

      dp[i][w] = Math.max(valWithout, valWith);

      trace.push({
        type: 'FILL',
        r: i,
        c: w,
        val: dp[i][w],
        deps,
        message: `Evaluating Item ${i} (W:${item.weight}, V:${item.value}) at Capacity ${w}. Max of excluding (${valWithout}) or including (${valWith}).`,
        equation
      });
    }
  }

  let w = capacity;
  const chosenItems = new Set<string>();
  
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      const nextR = i - 1;
      const nextC = w - items[i - 1].weight;
      trace.push({ 
        type: 'BACKTRACK', 
        r: i, 
        c: w, 
        chosen: true, 
        nextR,
        nextC,
        message: `dp[${i}][${w}] != dp[${i-1}][${w}]. Item ${i} was chosen! Subtracting weight ${items[i-1].weight} from capacity.` 
      });
      chosenItems.add(items[i - 1].id);
      w = nextC;
    } else {
      trace.push({ 
        type: 'BACKTRACK', 
        r: i, 
        c: w, 
        chosen: false, 
        nextR: i - 1,
        nextC: w,
        message: `dp[${i}][${w}] == dp[${i-1}][${w}]. Item ${i} was NOT chosen. Moving up.` 
      });
    }
  }

  trace.push({ 
    type: 'DONE', 
    message: `Algorithm complete! Maximum value is ${dp[n][capacity]}.`, 
    finalValue: dp[n][capacity], 
    chosenItems 
  });

  return { trace, dp };
}

// --- Main Component ---

export default function App() {
  // State
  const [items, setItems] = useState<Item[]>([
    { id: 'i1', weight: 1, value: 1 },
    { id: 'i2', weight: 3, value: 4 },
    { id: 'i3', weight: 4, value: 5 },
    { id: 'i4', weight: 5, value: 7 },
  ]);
  const [capacity, setCapacity] = useState<number>(7);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(500);

  // Derived Trace
  const { trace } = useMemo(() => generateKnapsackTrace(items, capacity), [items, capacity]);

  // Playback Logic
  useEffect(() => {
    let timer: number;
    if (isPlaying && stepIndex < trace.length - 1) {
      timer = window.setTimeout(() => {
        setStepIndex(s => s + 1);
      }, speedMs);
    } else if (stepIndex >= trace.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, trace.length, speedMs]);

  // Handlers
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
  }, []);

  const handleItemsChange = useCallback((newItems: Item[]) => {
    setItems(newItems);
    handleReset();
  }, [handleReset]);

  const handleCapacityChange = useCallback((newCap: number) => {
    setCapacity(newCap);
    handleReset();
  }, [handleReset]);

  const addItem = () => {
    if (items.length >= 8) return; // Cap at 8 items for UI sanity
    const newId = `i${Math.max(0, ...items.map(i => parseInt(i.id.slice(1)) || 0)) + 1}`;
    handleItemsChange([...items, { id: newId, weight: 1, value: 1 }]);
  };

  const updateItem = (index: number, field: 'weight' | 'value', val: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: Math.max(1, val) };
    handleItemsChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    handleItemsChange(newItems);
  };

  // Reconstruct current table state based on stepIndex
  const currentStep = trace[stepIndex];
  
  const gridState = useMemo(() => {
    const n = items.length;
    const grid = Array(n + 1).fill(0).map(() => Array(capacity + 1).fill(null));
    const activeCells = new Set<string>();
    const depCells = new Set<string>();
    const backtrackPath = new Set<string>();
    const backtrackChosen = new Set<string>();
    const finalChosenItems = new Set<string>();

    for (let i = 0; i <= stepIndex; i++) {
      const t = trace[i];
      if (t.type === 'INIT') {
        for (let r = 0; r <= n; r++) grid[r][0] = 0;
        for (let c = 0; c <= capacity; c++) grid[0][c] = 0;
      } else if (t.type === 'FILL') {
        grid[t.r][t.c] = t.val;
      } else if (t.type === 'BACKTRACK') {
        backtrackPath.add(`${t.r}-${t.c}`);
        if (t.chosen) {
          backtrackChosen.add(`${t.r}-${t.c}`);
          finalChosenItems.add(items[t.r - 1].id);
        }
      } else if (t.type === 'DONE') {
        t.chosenItems.forEach(id => finalChosenItems.add(id));
      }
    }

    if (currentStep.type === 'FILL') {
      activeCells.add(`${currentStep.r}-${currentStep.c}`);
      currentStep.deps.forEach(d => depCells.add(`${d[0]}-${d[1]}`));
    } else if (currentStep.type === 'BACKTRACK') {
      activeCells.add(`${currentStep.r}-${currentStep.c}`);
    }

    return { grid, activeCells, depCells, backtrackPath, backtrackChosen, finalChosenItems };
  }, [items, capacity, stepIndex, trace, currentStep]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col">
      {/* Header */}
      <header className="mb-8 max-w-6xl mx-auto w-full flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-600" />
            Knapsack 0/1 Visualizer
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Learn dynamic programming through the classic Knapsack problem. 
            Watch how the table is tabulated by reusing subproblems, and how backtracking reveals the optimal items.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left Panel: Controls & Editor */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Playback Controls */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Animation Controls</h2>
            <div className="flex items-center gap-2 mb-6">
              <button 
                onClick={handleReset}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setIsPlaying(false); setStepIndex(Math.max(0, stepIndex - 1)); }}
                disabled={stepIndex === 0}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={stepIndex === trace.length - 1}
                className="p-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-full transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              <button 
                onClick={() => { setIsPlaying(false); setStepIndex(Math.min(trace.length - 1, stepIndex + 1)); }}
                disabled={stepIndex === trace.length - 1}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Speed</span>
                <span>{speedMs}ms</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="100"
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="w-full accent-indigo-600"
                style={{ direction: 'rtl' }} // Faster on the right
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(stepIndex / (trace.length - 1)) * 100}%` }}
                ></div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-2">
                Step {stepIndex + 1} of {trace.length}
              </p>
            </div>
          </div>

          {/* Problem Setup */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Problem Setup</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Knapsack Capacity: <span className="text-indigo-600 font-bold">{capacity}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="15" 
                value={capacity}
                onChange={(e) => handleCapacityChange(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">Available Items</label>
                <button 
                  onClick={addItem}
                  disabled={items.length >= 8}
                  className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, idx) => {
                  const isChosen = gridState.finalChosenItems.has(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-lg border transition-colors ${
                        isChosen 
                          ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          isChosen ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          Item {idx + 1}
                        </span>
                        <button 
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 uppercase">Weight</label>
                          <input 
                            type="number" 
                            min="1"
                            value={item.weight}
                            onChange={(e) => updateItem(idx, 'weight', Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 uppercase">Value</label>
                          <input 
                            type="number" 
                            min="1"
                            value={item.value}
                            onChange={(e) => updateItem(idx, 'value', Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>