import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Trash2, Info, Settings, BookOpen } from 'lucide-react';

interface Item {
  id: string;
  weight: number;
  value: number;
}

interface Step {
  r: number;
  c: number;
  excR: number;
  excC: number;
  incR: number | null;
  incC: number | null;
  took: boolean;
  val: number;
  itemWt: number;
  itemVal: number;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', weight: 1, value: 1 },
    { id: '2', weight: 3, value: 4 },
    { id: '3', weight: 4, value: 5 },
    { id: '4', weight: 5, value: 7 },
  ]);
  const [capacity, setCapacity] = useState<number>(7);
  
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(500);

  // Constants
  const MAX_CAPACITY = 15;
  const MAX_ITEMS = 6;

  // Generate Simulation Data
  const sim = useMemo(() => {
    const n = items.length;
    const W = capacity;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
    const steps: Step[] = [];

    // Build table step-by-step
    for (let i = 1; i <= n; i++) {
      for (let w = 1; w <= W; w++) {
        const wt = items[i - 1].weight;
        const val = items[i - 1].value;
        const excR = i - 1;
        const excC = w;
        let incR = null;
        let incC = null;
        let took = false;

        let maxVal = dp[excR][excC];

        if (w >= wt) {
          incR = i - 1;
          incC = w - wt;
          const possibleVal = dp[incR][incC] + val;
          if (possibleVal > maxVal) {
            maxVal = possibleVal;
            took = true;
          }
        }

        dp[i][w] = maxVal;
        steps.push({
          r: i, c: w,
          excR, excC,
          incR, incC,
          took,
          val: maxVal,
          itemWt: wt, itemVal: val
        });
      }
    }

    // Backtrack to find chosen items
    const chosenCells = new Set<string>();
    const chosenItems = new Set<string>();
    let r = n, c = W;
    while (r > 0 && c > 0) {
      if (dp[r][c] !== dp[r - 1][c]) {
        chosenCells.add(`${r},${c}`);
        chosenItems.add(items[r - 1].id);
        c -= items[r - 1].weight;
      }
      r--;
    }

    return { dp, steps, chosenCells, chosenItems, maxVal: dp[n][W] };
  }, [items, capacity]);

  const isComplete = stepIdx >= sim.steps.length;

  // Playback Control
  useEffect(() => {
    let timer: number;
    if (isPlaying && !isComplete) {
      timer = window.setInterval(() => {
        setStepIdx((prev) => prev + 1);
      }, speedMs);
    } else if (isComplete) {
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isComplete, speedMs]);

  // Handlers
  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) return;
    setItems([...items, { id: Math.random().toString(36).substring(7), weight: 1, value: 1 }]);
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleItemChange = (id: string, field: 'weight' | 'value', val: number) => {
    const safeVal = Math.max(1, Math.min(99, val || 1));
    setItems(items.map((it) => it.id === id ? { ...it, [field]: safeVal } : it));
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleCapacityChange = (val: number) => {
    const safeVal = Math.max(1, Math.min(MAX_CAPACITY, val || 1));
    setCapacity(safeVal);
    setStepIdx(0);
    setIsPlaying(false);
  };

  const reset = () => {
    setStepIdx(0);
    setIsPlaying(false);
  };

  // UI Helpers
  const getCellState = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'base';
    
    // Convert (r,c) to a step index equivalent
    const W = capacity;
    const cellStepIndex = (r - 1) * W + (c - 1);

    if (cellStepIndex > stepIdx) return 'empty'; // Future

    if (isComplete) {
      return sim.chosenCells.has(`${r},${c}`) ? 'chosen' : 'computed';
    }

    if (cellStepIndex === stepIdx) return 'current'; // Currently evaluating
    
    // Check if it's a dependency of the current step
    const currStep = sim.steps[stepIdx];
    if (currStep) {
      if (currStep.excR === r && currStep.excC === c) return 'dep-exc';
      if (currStep.incR === r && currStep.incC === c) return 'dep-inc';
    }

    return 'computed'; // Past
  };

  const cellClassMap = {
    'base': 'bg-slate-100 text-slate-500 font-semibold border-slate-200',
    'empty': 'bg-slate-50/50 text-slate-200 border-slate-100',
    'computed': 'bg-white text-slate-800 border-slate-200 transition-all duration-300',
    'current': 'bg-indigo-100 text-indigo-900 border-indigo-400 ring-2 ring-indigo-400 z-10 scale-105 shadow-sm transition-all duration-300',
    'dep-exc': 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-400 z-0 transition-all duration-300',
    'dep-inc': 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400 z-0 transition-all duration-300',
    'chosen': 'bg-indigo-500 text-white font-bold border-indigo-600 ring-2 ring-indigo-500 shadow-md z-10 scale-105 transition-all duration-500',
  };

  const currStep = sim.steps[Math.min(stepIdx, sim.steps.length - 1)];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col items-center">
      {/* Header */}
      <header className="max-w-6xl w-full mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="bg-indigo-600 text-white p-2 rounded-lg"><BookOpen size={24} /></span>
            0/1 Knapsack Module
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl text-sm leading-relaxed">
            Dynamic Programming Tabulation strategy. We build a table where <code className="bg-slate-200 px-1 rounded text-indigo-700">DP[i][w]</code> represents the maximum value using a subset of the first <code className="bg-slate-200 px-1 rounded text-indigo-700">i</code> items with a maximum capacity <code className="bg-slate-200 px-1 rounded text-indigo-700">w</code>.
          </p>
        </div>
      </header>

      <main className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuration & Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Settings size={14} /> Simulation Controls
            </h2>
            
            <div className="flex flex-col gap-4">
              {/* Playback Buttons */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                <button onClick={reset} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Reset">
                  <RotateCcw size={20} />
                </button>
                <button onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0 || isPlaying} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-30" title="Step Back">
                  <SkipBack size={20} />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  disabled={isComplete}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-semibold text-white shadow-sm transition-all ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300'}`}
                >
                  {isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play</>}
                </button>
                <button onClick={() => setStepIdx(Math.min(sim.steps.length, stepIdx + 1))} disabled={isComplete || isPlaying} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-30" title="Step Forward">
                  <SkipForward size={20} />
                </button>
              </div>

              {/* Speed Slider */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-xs text-slate-400 font-medium">Slow</span>
                <input 
                  type="range" min="100" max="1500" step="100" 
                  value={1600 - speedMs} 
                  onChange={(e) => setSpeedMs(1600 - parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-xs text-slate-400 font-medium">Fast</span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((stepIdx / sim.steps.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${(stepIdx / sim.steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Items & Capacity</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-600">Max Cap (W):</label>
                <input 
                  type="number" min="1" max={MAX_CAPACITY} 
                  value={capacity} 
                  onChange={(e) => handleCapacityChange(parseInt(e.target.value))}
                  className="w-16 p-1 border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                <div className="col-span-2">Item</div>
                <div className="col-span-4 text-center">Wt (w)</div>
                <div className="col-span-4 text-center">Val (v)</div>
                <div className="col-span-2 text-right"></div>
              </div>
              
              {/* Items List */}
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isChosen = isComplete && sim.chosenItems.has(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-colors ${isChosen ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'} ${stepIdx > 0 && currStep && currStep.r === idx + 1 && !isComplete ? 'ring-2 ring-indigo-200' : ''}`}
                    >
                      <div className={`col-span-2 font-mono font-bold text-sm ${isChosen ? 'text-indigo-600' : 'text-slate-500'} flex items-center justify-center`}>
                        i={idx + 1}
                      </div>
                      <div className="col-span-4 flex justify-center">
                        <input 
                          type="number" min="1" 
                          value={item.weight}
                          onChange={(e) => handleItemChange(item.id, 'weight', parseInt(e.target.value))}
                          disabled={stepIdx > 0}
                          className="w-full max-w-[60px] p-1 border border-slate-300 rounded text-center text-sm disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                      <div className="col-span-4 flex justify-center">
                        <input 
                          type="number" min="1" 
                          value={item.value}
                          onChange={(e) => handleItemChange(item.id, 'value', parseInt(e.target.value))}
                          disabled={stepIdx > 0}
                          className="w-full max-w-[60px] p-1 border border-slate-300 rounded text-center text-sm disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1 || stepIdx > 0}
                          className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Button */}
              <button 
                onClick={handleAddItem}
                disabled={items.length >= MAX_ITEMS || stepIdx > 0}
                className="w-full mt-2 py-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-lg text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & Details */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Dynamic Educational Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            
            {isComplete ? (
              <div className="animate-fade-in text-center">
                <h3 className="text-xl font-bold text-indigo-700 mb-2">Simulation Complete!</h3>
                <p className="text-slate-600 text-lg">
                  Maximum value achieved: <span className="font-extrabold text