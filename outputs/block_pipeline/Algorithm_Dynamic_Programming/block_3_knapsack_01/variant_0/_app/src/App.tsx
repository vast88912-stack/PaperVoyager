import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Plus, Trash2, Info, Settings2, RotateCcw } from 'lucide-react';

// --- Types ---

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

// --- Helper: Trace Generator ---

function generateKnapsackTrace(items: Item[], capacity: number): TraceStep[] {
  const n = items.length;
  const dp: (number | null)[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(capacity + 1).fill(null));

  const trace: TraceStep[] = [];
  const cloneDP = () => dp.map((row) => [...row]);

  // 1. INIT
  for (let i = 0; i <= n; i++) dp[i][0] = 0;
  for (let w = 0; w <= capacity; w++) dp[0][w] = 0;

  trace.push({
    type: 'INIT',
    i: 0,
    w: 0,
    dpState: cloneDP(),
    explanation: 'Initialize the DP table. 0 items or 0 capacity means 0 value.',
    activeCells: [],
    targetCell: null,
    backtrackPath: [],
    chosenItems: [],
  });

  // 2. EVALUATE
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

      trace.push({
        type: 'EVAL',
        i,
        w,
        dpState: cloneDP(),
        explanation,
        formula,
        activeCells,
        targetCell: { r: i, c: w },
        backtrackPath: [],
        chosenItems: [],
      });
    }
  }

  // 3. BACKTRACK
  let res = dp[n][capacity] as number;
  let currW = capacity;
  const chosenItems: number[] = [];
  const backtrackPath: Cell[] = [{ r: n, c: currW }];

  trace.push({
    type: 'BACKTRACK',
    i: n,
    w: currW,
    dpState: cloneDP(),
    explanation: `Table complete! Max value is ${res}. Now, let's backtrack to find which items we included.`,
    activeCells: [],
    targetCell: null,
    backtrackPath: [...backtrackPath],
    chosenItems: [...chosenItems],
  });

  for (let i = n; i > 0 && res > 0; i--) {
    const item = items[i - 1];
    const currentCellVal = dp[i][currW] as number;
    const cellAboveVal = dp[i - 1][currW] as number;

    if (currentCellVal === cellAboveVal) {
      backtrackPath.push({ r: i - 1, c: currW });
      trace.push({
        type: 'BACKTRACK',
        i,
        w: currW,
        dpState: cloneDP(),
        explanation: `Value comes from directly above (${currentCellVal} == ${cellAboveVal}). "${item.name}" was NOT included.`,
        activeCells: [{ r: i, c: currW }, { r: i - 1, c: currW }],
        targetCell: null,
        backtrackPath: [...backtrackPath],
        chosenItems: [...chosenItems],
      });
    } else {
      chosenItems.push(i - 1);
      currW -= item.weight;
      res -= item.value;
      backtrackPath.push({ r: i - 1, c: currW });
      
      trace.push({
        type: 'BACKTRACK',
        i,
        w: currW + item.weight,
        dpState: cloneDP(),
        explanation: `Value is different from above (${currentCellVal} != ${cellAboveVal}). "${item.name}" WAS included! Subtract its weight (${item.weight}) from capacity.`,
        activeCells: [{ r: i, c: currW + item.weight }, { r: i - 1, c: currW + item.weight }],
        targetCell: null,
        backtrackPath: [...backtrackPath],
        chosenItems: [...chosenItems],
      });
    }
  }

  trace.push({
    type: 'DONE',
    i: 0,
    w: 0,
    dpState: cloneDP(),
    explanation: `Backtracking complete. We found the optimal combination of items!`,
    activeCells: [],
    targetCell: null,
    backtrackPath: [...backtrackPath],
    chosenItems: [...chosenItems],
  });

  return trace;
}

// --- Main Component ---

export default function App() {
  // State
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'Guitar', weight: 1, value: 15 },
    { id: '2', name: 'Stereo', weight: 4, value: 30 },
    { id: '3', name: 'Laptop', weight: 3, value: 20 },
  ]);
  const [capacity, setCapacity] = useState<number>(5);
  
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(600);

  // Derived
  const trace = useMemo(() => generateKnapsackTrace(items, capacity), [items, capacity]);
  const stepData = trace[currentStep];

  // Reset step when inputs change
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [items, capacity]);

  // Auto-play
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStep < trace.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, speedMs);
    } else if (currentStep >= trace.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, speedMs, trace.length]);

  // Handlers
  const handleAddItem = () => {
    if (items.length >= 6) return; // Limit for visual sanity
    setItems([
      ...items,
      { id: Math.random().toString(36).substr(2, 9), name: `Item ${items.length + 1}`, weight: 1, value: 10 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: field === 'name' ? value : Math.max(1, Number(value) || 0) };
        }
        return item;
      })
    );
  };

  // Render Helpers
  const getCellClass = (r: number, c: number) => {
    const isTarget = stepData.targetCell?.r === r && stepData.targetCell?.c === c;
    const isActive = stepData.activeCells.some((cell) => cell.r === r && cell.c === c);
    const isBacktrack = stepData.backtrackPath.some((cell) => cell.r === r && cell.c === c);
    
    let base = "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border text-sm sm:text-base font-semibold transition-all duration-300 ";

    if (isTarget) return base + "bg-blue-500 text-white border-blue-600 shadow-lg scale-110 z-10 rounded-md";
    if (isActive) return base + "bg-amber-200 text-amber-900 border-amber-400 z-0";
    if (isBacktrack) return base + "bg-emerald-400 text-white border-emerald-500 shadow-inner z-0";
    
    if (stepData.dpState[r][c] !== null) {
      return base + "bg-white text-slate-700 border-slate-200";
    }
    
    return base + "bg-slate-50 text-slate-300 border-slate-100";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-8 flex flex-col">
      
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
            DP
          </div>
          0/1 Knapsack Pattern
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Learn how dynamic programming solves the 0/1 Knapsack problem by building a table of subproblems. 
          Watch the table fill up, then see how backtracking finds the optimal items.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Left Panel: Editor */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Capacity Editor */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings2 size={18} className="text-blue-500" />
                Knapsack Capacity
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="12"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold border border-blue-100">
                {capacity}
              </span>
            </div>
          </div>

          {/* Items Editor */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">Available Items</h2>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                {items.length} / 6
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              {items.map((item, idx) => {
                const isChosen = stepData.chosenItems.includes(idx);
                return (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-xl border transition-colors ${
                      isChosen 
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                        className="bg-transparent font-semibold text-slate-700 focus:outline-none focus:border-b border-blue-300 w-24"
                      />
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex gap