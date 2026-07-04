import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Icons (Inlined for zero-dependency standalone) ---
const PlayIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const StepForwardIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
);
const StepBackIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
);
const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
);

// --- Types ---
type Item = {
  id: string;
  weight: number;
  value: number;
  name: string;
};

type Snapshot = {
  table: (number | null)[][];
  phase: 'init' | 'fill' | 'backtrack' | 'done';
  activeCell: [number, number] | null;
  skipCell: [number, number] | null;
  takeCell: [number, number] | null;
  message: React.ReactNode;
  backtrackPath: [number, number][];
  inKnapsack: Set<string>;
  currentFormula?: string;
};

// --- Helpers ---
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_ITEMS: Item[] = [
  { id: generateId(), name: 'Guitar', weight: 1, value: 15 },
  { id: generateId(), name: 'Stereo', weight: 4, value: 30 },
  { id: generateId(), name: 'Laptop', weight: 3, value: 20 },
];

const INITIAL_CAPACITY = 4;

// --- Engine ---
const generateSnapshots = (items: Item[], capacity: number): Snapshot[] => {
  const snapshots: Snapshot[] = [];
  const n = items.length;
  
  // Initialize table with nulls
  const table: (number | null)[][] = Array.from({ length: n + 1 }, () => 
    Array(capacity + 1).fill(null)
  );

  const cloneTable = () => table.map(row => [...row]);

  // Step 1: Initialize base cases (Row 0, Col 0)
  snapshots.push({
    table: cloneTable(),
    phase: 'init',
    activeCell: null, skipCell: null, takeCell: null,
    message: "Initializing DP table. The table rows represent items considered (1 to N), and columns represent current capacity (0 to W).",
    backtrackPath: [],
    inKnapsack: new Set()
  });

  for (let i = 0; i <= n; i++) table[i][0] = 0;
  for (let w = 0; w <= capacity; w++) table[0][w] = 0;

  snapshots.push({
    table: cloneTable(),
    phase: 'init',
    activeCell: null, skipCell: null, takeCell: null,
    message: "Base cases filled: 0 value if we have 0 capacity, or 0 items to choose from.",
    backtrackPath: [],
    inKnapsack: new Set()
  });

  // Step 2: Fill the table
  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let w = 1; w <= capacity; w++) {
      const skipVal = table[i - 1][w] as number;
      let takeVal: number | null = null;
      let takeCoord: [number, number] | null = null;

      if (item.weight <= w) {
        takeVal = item.value + (table[i - 1][w - item.weight] as number);
        takeCoord = [i - 1, w - item.weight];
      }

      // Evaluation Step
      snapshots.push({
        table: cloneTable(),
        phase: 'fill',
        activeCell: [i, w],
        skipCell: [i - 1, w],
        takeCell: takeCoord,
        message: (
          <span>
            Evaluating <strong className="text-indigo-600">{item.name}</strong> (wt: {item.weight}, val: {item.value}) for capacity <strong>{w}</strong>.
          </span>
        ),
        currentFormula: `dp[${i}][${w}] = max( Skip, Take )`,
        backtrackPath: [],
        inKnapsack: new Set()
      });

      const chosenVal = takeVal !== null ? Math.max(skipVal, takeVal) : skipVal;
      table[i][w] = chosenVal;

      // Commit Step
      snapshots.push({
        table: cloneTable(),
        phase: 'fill',
        activeCell: [i, w],
        skipCell: [i - 1, w],
        takeCell: takeCoord,
        message: (
          <span>
            Choice: {takeVal !== null && takeVal > skipVal 
              ? <>Take item (Value: {item.value} + {table[i-1][w-item.weight]} = <strong>{takeVal}</strong>)</>
              : <>Skip item (Value remains <strong>{skipVal}</strong>)</>
            }
          </span>
        ),
        currentFormula: `dp[${i}][${w}] = max(${skipVal}, ${takeVal !== null ? takeVal : '—'}) = ${chosenVal}`,
        backtrackPath: [],
        inKnapsack: new Set()
      });
    }
  }

  // Step 3: Backtracking
  let currI = n;
  let currW = capacity;
  const path: [number, number][] = [[currI, currW]];
  const selectedItems = new Set<string>();

  snapshots.push({
    table: cloneTable(),
    phase: 'backtrack',
    activeCell: null, skipCell: null, takeCell: null,
    message: "Table completely filled. Optimal value is at the bottom right. Now, let's trace back to find which items were selected.",
    backtrackPath: [...path],
    inKnapsack: new Set(selectedItems)
  });

  while (currI > 0 && currW > 0) {
    const currentVal = table[currI][currW];
    const prevVal = table[currI - 1][currW];

    if (currentVal !== prevVal) {
      // Item was taken
      selectedItems.add(items[currI - 1].id);
      snapshots.push({
        table: cloneTable(),
        phase: 'backtrack',
        activeCell: null, skipCell: null, takeCell: null,
        message: <span>Value changed from row above ({prevVal} &rarr; {currentVal}). This means <strong className="text-emerald-600">{items[currI-1].name}</strong> was TAKEN.</span>,
        backtrackPath: [...path],
        inKnapsack: new Set(selectedItems)
      });
      currW -= items[currI - 1].weight;
      currI -= 1;
      path.push([currI, currW]);
    } else {
      // Item was skipped
      snapshots.push({
        table: cloneTable(),
        phase: 'backtrack',
        activeCell: null, skipCell: null, takeCell: null,
        message: <span>Value is same as row above. <strong className="text-slate-500">{items[currI-1].name}</strong> was SKIPPED.</span>,
        backtrackPath: [...path],
        inKnapsack: new Set(selectedItems)
      });
      currI -= 1;
      path.push([currI, currW]);
    }
  }

  snapshots.push({
    table: cloneTable(),
    phase: 'done',
    activeCell: null, skipCell: null, takeCell: null,
    message: <span><strong>Done!</strong> Trace complete. The highlighted items form the optimal knapsack.</span>,
    backtrackPath: [...path],
    inKnapsack: new Set(selectedItems)
  });

  return snapshots;
};


// --- Main Component ---
export default function App() {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [capacity, setCapacity] = useState(INITIAL_CAPACITY);
  
  // Playback state
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600); // ms per step

  // Derived
  const snapshots = useMemo(() => generateSnapshots(items, capacity), [items, capacity]);
  const currentSnap = snapshots[stepIdx] || snapshots[0];
  const isDone = stepIdx === snapshots.length - 1;

  // Auto-play effect
  useEffect(() => {
    let timer: number;
    if (isPlaying && !isDone) {
      timer = window.setTimeout(() => {
        setStepIdx(prev => Math.min(prev + 1, snapshots.length - 1));
      }, speed);
    } else if (isDone) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIdx, isDone, snapshots.length, speed]);

  // Handlers
  const handleAddItem = () => {
    if (items.length >= 8) return; // Prevent huge tables
    setItems([...items, { id: generateId(), name: `Item ${items.length + 1}`, weight: 1, value: 10 }]);
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleUpdateItem = (id: string, field: keyof Item, val: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleCapacityChange = (val: number) => {
    setCapacity(Math.min(Math.max(1, val), 15)); // Cap between 1 and 15
    setStepIdx(0);
    setIsPlaying(false);
  };

  const reset = () => {
    setStepIdx(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-sm font-mono">DP</span>
            Knapsack 0/1 Visualizer
          </h1>
          <p className="text-sm text-slate-500 mt-1">Dynamic Programming Lab &mdash; Understand Tabulation & Path Tracing</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Documentation</a>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Left Column: Configuration */}
        <section className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Capacity Config */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              Knapsack Capacity
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono text-sm">{capacity}</span>
            </h2>
            <input 
              type="range" min="1" max="15" 
              value={capacity} 
              onChange={(e) => handleCapacityChange(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
              <span>1</span>
              <span>15</span>
            </div>
          </div>

          {/* Items Config */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Available Items</h2>
              <button 
                onClick={handleAddItem}
                disabled={items.length >= 8}
                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add Item"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {items.map((item, idx) => {
                const isSelected = currentSnap.inKnapsack.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    className={cn(
                      "p-3 rounded-lg border transition-all duration-300 relative group",
                      isSelected 
                        ? "bg-emerald-50 border-emerald-200 shadow-[inset_4px_0_0_0_#10b981]" 
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold font-mono",
                          isSelected ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-600"
                        )}>
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="bg-transparent font-medium text-slate-900 w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <label className="flex-1 flex flex-col">
                        <span className="text-xs text-slate-500 mb-1">Weight</span>
                        <input
                          type="number" min="1" max="20"
                          value={item.weight}
                          onChange={(e) => handleUpdateItem(item.id, 'weight', parseInt(e.target.value) || 1)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </label>
                      <label className="flex-1 flex flex-col">
                        <span className="text-xs text-slate-500 mb-1">Value</span>
                        <input
                          type="number" min="1" max="999"
                          value={item.value}
                          onChange={(e