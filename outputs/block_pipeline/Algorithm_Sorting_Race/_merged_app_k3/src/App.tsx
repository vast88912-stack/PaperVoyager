import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Info, BarChart2, Zap, LayoutList, ShieldCheck, 
  Trophy, Clock, ArrowRightLeft, Activity, CheckCircle2, 
  XCircle, ChevronDown, ChevronUp, Database, Home, 
  Flag, BookOpen, Settings, Menu, X
} from 'lucide-react';

// --- Types & Interfaces ---
type Item = { val: number; id: number };
type Action = 
  | { type: 'COMPARE'; idx: [number, number] } 
  | { type: 'SWAP'; idx: [number, number] } 
  | { type: 'SET'; idx: number; item: Item } 
  | { type: 'FINISH' };

type DatasetType = 'Random' | 'Nearly Sorted' | 'Reversed' | 'Few Uniques';
type Complexity = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n + k)' | 'O(nk)';

interface AlgorithmInfo {
  id: string;
  name: string;
  type: 'Comparative' | 'Non-Comparative';
  description: string;
  timeComplexity: { best: Complexity; average: Complexity; worst: Complexity; };
  spaceComplexity: Complexity;
  stable: boolean;
  inPlace: boolean;
  idealFor: string;
  pitfalls: string;
}

interface AlgorithmResult {
  id: string;
  name: string;
  timeMs: number;
  operations: number;
  swaps: number;
  isStable: boolean;
  color: string;
}

type SortKey = keyof AlgorithmResult;

// --- Constants & Mock Data ---
const DATASETS: DatasetType[] = ['Random', 'Nearly Sorted', 'Reversed', 'Few Uniques'];

const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'bubble', name: 'Bubble Sort', type: 'Comparative',
    description: 'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)', stable: true, inPlace: true,
    idealFor: 'Educational demonstrations and detecting if a small array is already sorted.',
    pitfalls: 'Extremely inefficient for large datasets.'
  },
  {
    id: 'insertion', name: 'Insertion Sort', type: 'Comparative',
    description: 'Builds the final sorted array one item at a time. It iterates through the input, growing a sorted list behind it.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)', stable: true, inPlace: true,
    idealFor: 'Small datasets, nearly-sorted data, or as a hybrid fallback.',
    pitfalls: 'Performance degrades quadratically as the dataset size increases.'
  },
  {
    id: 'merge', name: 'Merge Sort', type: 'Comparative',
    description: 'A divide-and-conquer algorithm that recursively splits the array into halves, then merges those sub-arrays.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)', stable: true, inPlace: false,
    idealFor: 'Large datasets where stability is required.',
    pitfalls: 'Requires O(n) auxiliary space.'
  },
  {
    id: 'quick', name: 'Quick Sort', type: 'Comparative',
    description: 'Picks an element as a "pivot" and partitions the given array around the picked pivot.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(log n)', stable: false, inPlace: true,
    idealFor: 'General-purpose sorting in memory. Often the fastest in practice.',
    pitfalls: 'Can degrade to O(n²) if a poor pivot is chosen. Unstable by default.'
  },
  {
    id: 'heap', name: 'Heap Sort', type: 'Comparative',
    description: 'Converts the array into a max-heap data structure, then repeatedly extracts the maximum element.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)', stable: false, inPlace: true,
    idealFor: 'Systems with strict memory limits requiring guaranteed O(n log n) worst-case.',
    pitfalls: 'Poor cache locality compared to Quick Sort.'
  },
  {
    id: 'radix', name: 'Radix Sort', type: 'Non-Comparative',
    description: 'Sorts data with integer keys by grouping keys by the individual digits.',
    timeComplexity: { best: 'O(nk)', average: 'O(nk)', worst: 'O(nk)' },
    spaceComplexity: 'O(n + k)', stable: true, inPlace: false,
    idealFor: 'Large arrays of integers where k (number of digits) is small.',
    pitfalls: 'Not a general-purpose sort. High memory overhead.'
  }
];

const MOCK_RESULTS: Record<DatasetType, AlgorithmResult[]> = {
  'Random': [
    { id: 'merge', name: 'Merge Sort', timeMs: 12, operations: 9976, swaps: 9976, isStable: true, color: 'bg-blue-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 9, operations: 11432, swaps: 3120, isStable: false, color: 'bg-emerald-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18401, swaps: 9200, isStable: false, color: 'bg-amber-500' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 145, operations: 251432, swaps: 250432, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 380, operations: 499500, swaps: 251432, isStable: true, color: 'bg-red-500' },
  ],
  'Nearly Sorted': [
    { id: 'insertion', name: 'Insertion Sort', timeMs: 2, operations: 1980, swaps: 980, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 5, operations: 9990, swaps: 980, isStable: true, color: 'bg-red-500' },
    { id: 'merge', name: 'Merge Sort', timeMs: 10, operations: 8432, swaps: 8432, isStable: true, color: 'bg-blue-500' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 15, operations: 15432, swaps: 4120, isStable: false, color: 'bg-emerald-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18001, swaps: 9000, isStable: false, color: 'bg-amber-500' },
  ],
  'Reversed': [
    { id: 'merge', name: 'Merge Sort', timeMs: 11, operations: 8976, swaps: 8976, isStable: true, color: 'bg-blue-500' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 13, operations: 17401, swaps: 8700, isStable: false, color: 'bg-amber-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 28, operations: 31432, swaps: 15120, isStable: false, color: 'bg-emerald-500' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 290, operations: 499500, swaps: 499500, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 450, operations: 499500, swaps: 499500, isStable: true, color: 'bg-red-500' },
  ],
  'Few Uniques': [
    { id: 'radix', name: 'Radix Sort', timeMs: 5, operations: 2000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 8, operations: 9432, swaps: 2120, isStable: false, color: 'bg-emerald-500' },
    { id: 'merge', name: 'Merge Sort', timeMs: 12, operations: 9976, swaps: 9976, isStable: true, color: 'bg-blue-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18401, swaps: 9200, isStable: false, color: 'bg-amber-500' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 120, operations: 201432, swaps: 200432, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 340, operations: 499500, swaps: 201432, isStable: true, color: 'bg-red-500' },
  ]
};

// --- Sorting Algorithms (Trace Generators) ---
const bubbleSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  const arr = [...initialArr];
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      actions.push({ type: 'COMPARE', idx: [j, j + 1] });
      if (arr[j].val > arr[j + 1].val) {
        actions.push({ type: 'SWAP', idx: [j, j + 1] });
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  actions.push({ type: 'FINISH' });
  return actions;
};

const insertionSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  const arr = [...initialArr];
  for (let i = 1; i < arr.length; i++) {
    let j = i;
    while (j > 0) {
      actions.push({ type: 'COMPARE', idx: [j - 1, j] });
      if (arr[j - 1].val > arr[j].val) {
        actions.push({ type: 'SWAP', idx: [j - 1, j] });
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        j--;
      } else {
        break;
      }
    }
  }
  actions.push({ type: 'FINISH' });
  return actions;
};

const quickSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  const arr = [...initialArr];

  const partition = (low: number, high: number) => {
    const pivot = arr[high].val;
    let i = low - 1;
    for (let j = low; j < high; j++) {
      actions.push({ type: 'COMPARE', idx: [j, high] });
      if (arr[j].val < pivot) {
        i++;
        actions.push({ type: 'SWAP', idx: [i, j] });
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    actions.push({ type: 'SWAP', idx: [i + 1, high] });
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
  };

  const sort = (low: number, high: number) => {
    if (low < high) {
      const pi = partition(low, high);
      sort(low, pi - 1);
      sort(pi + 1, high);
    }
  };

  sort(0, arr.length - 1);
  actions.push({ type: 'FINISH' });
  return actions;
};

const generateArray = (size: number, type: DatasetType): Item[] => {
  let arr: number[] = [];
  if (type === 'Random') {
    arr = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
  } else if (type === 'Nearly Sorted') {
    arr = Array.from({ length: size }, (_, i) => i + 1);
    for (let i = 0; i < size * 0.1; i++) {
      const idx1 = Math.floor(Math.random() * size);
      const idx2 = Math.floor(Math.random() * size);
      [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
    }
  } else if (type === 'Reversed') {
    arr = Array.from({ length: size }, (_, i) => size - i);
  } else if (type === 'Few Uniques') {
    const uniques = [10, 30, 50, 70, 90];
    arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }
  return arr.map((val, id) => ({ val, id }));
};

// --- Components ---

const HeroTab = ({ onEnter }: { onEnter: () => void }) => {
  const SHUFFLED_STATE = [85, 30, 95, 45, 15, 75, 55, 25, 65, 10, 90, 40, 70, 20, 60, 50, 80, 35];
  const SORTED_STATE =   [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
  const [bars, setBars] = useState(SHUFFLED_STATE);
  const [isSorted, setIsSorted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setIsSorted(prev => !prev), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setBars(isSorted ? SORTED_STATE : SHUFFLED_STATE);
  }, [isSorted]);

  return (
    <div className="min-h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-violet-900/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <main className="relative z-10 flex-grow container mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-16 py-20">
        <div className="w-full lg:w-1/2 flex flex-col items-start gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/50 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-700/50">
            <Zap className="w-3.5 h-3.5" />
            <span>ChatGPT Edition</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-100">
            The Ultimate <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">
              Algorithm Showdown
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 leading-relaxed max-w-xl font-medium">
            Watch Bubble, Merge, Quick, Heap, and Radix sort battle it out in real-time. 
            Discover how dataset shapes—from random to nearly sorted—impact performance, swaps, and stability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button onClick={onEnter} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-indigo-900/20 hover:shadow-2xl hover:shadow-indigo-900/40 transform hover:-translate-y-1">
              <Play className="w-5 h-5 fill-current" />
              Start the Race
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-800 w-full">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400">
                <LayoutList className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Multiple Datasets</h3>
              <p className="text-xs text-slate-500 font-medium">Test on random, reversed, or nearly sorted arrays.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center text-emerald-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Live Telemetry</h3>
              <p className="text-xs text-slate-500 font-medium">Track array reads, writes, and swaps in real-time.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-900/50 flex items-center justify-center text-rose-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Stability Analysis</h3>
              <p className="text-xs text-slate-500 font-medium">Visualize how algorithms handle duplicate values.</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/50 to-emerald-900/20 transform rotate-3 rounded-[3rem] shadow-inner"></div>
          <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl shadow-black/50 transform -rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-2">Live Preview</span>
              </div>
              <div className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isSorted ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                {isSorted ? 'O(n log n) Achieved' : 'Sorting in Progress...'}
              </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-1 sm:gap-2">
              {bars.map((height, index) => {
                const hue = 220 + (height / 100) * 100;
                return (
                  <div
                    key={index}
                    className="w-full rounded-t-sm sm:rounded-t-md relative group"
                    style={{
                      height: `${height}%`,
                      backgroundColor: `hsl(${hue}, 80%, 60%)`,
                      transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.8s ease'
                    }}
                  />
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase">Algorithm</span>
                <span className="text-sm font-black text-slate-200">Quick Sort</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-500 uppercase">Elements</span>
                <span className="text-sm font-black text-slate-200">{bars.length}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const RaceTab = () => {
  const [dataset, setDataset] = useState<DatasetType>('Random');
  const [arraySize, setArraySize] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(50);
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>(['bubble', 'insertion', 'quick']);
  
  const [baseArray, setBaseArray] = useState<Item[]>([]);
  const [raceState, setRaceState] = useState<Record<string, { arr: Item[], active: number[], done: boolean, ops: number }>>({});
  const [isRunning, setIsRunning] = useState(false);
  
  const tracesRef = useRef<Record<string, Action[]>>({});
  const progressRef = useRef<Record<string, number>>({});
  const reqRef = useRef<number>();

  useEffect(() => {
    handleShuffle();
  }, [dataset, arraySize]);

  const handleShuffle = () => {
    setIsRunning(false);
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    const newArr = generateArray(arraySize, dataset);
    setBaseArray(newArr);
    const initialRaceState: any = {};
    selectedAlgos.forEach(algo => {
      initialRaceState[algo] = { arr: [...newArr], active: [], done: false, ops: 0 };
    });
    setRaceState(initialRaceState);
  };

  const handleAlgoToggle = (id: string) => {
    setSelectedAlgos(prev => {
      const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      return next.length ? next : prev;
    });
  };

  const startRace = () => {
    if (isRunning) return;
    setIsRunning(true);
    
    tracesRef.current = {};
    progressRef.current = {};
    
    selectedAlgos.forEach(algo => {
      progressRef.current[algo] = 0;
      if (algo === 'bubble') tracesRef.current[algo] = bubbleSortRun(baseArray);
      else if (algo === 'insertion') tracesRef.current[algo] = insertionSortRun(baseArray);
      else if (algo === 'quick') tracesRef.current[algo] = quickSortRun(baseArray);
      else tracesRef.current[algo] = [{ type: 'FINISH' }]; // Mock others for now
    });

    let lastTime = performance.now();
    
    const step = (time: number) => {
      const delay = 100 - speed;
      if (time - lastTime > delay) {
        lastTime = time;
        setRaceState(prev => {
          const next = { ...prev };
          let allDone = true;
          
          selectedAlgos.forEach(algo => {
            if (next[algo].done) return;
            allDone = false;
            
            const trace = tracesRef.current[algo];
            const idx = progressRef.current[algo];
            if (idx >= trace.length) {
              next[algo] = { ...next[algo], done: true, active: [] };
              return;
            }
            
            const action = trace[idx];
            const newArr = [...next[algo].arr];
            let active: number[] = [];
            
            if (action.type === 'COMPARE') {
              active = action.idx;
            } else if (action.type === 'SWAP') {
              active = action.idx;
              [newArr[action.idx[0]], newArr[action.idx[1]]] = [newArr[action.idx[1]], newArr[action.idx[0]]];
            } else if (action.type === 'FINISH') {
              next[algo] = { ...next[algo], done: true, active: [] };
              return;
            }
            
            progressRef.current[algo]++;
            next[algo] = { arr: newArr, active, done: false, ops: next[algo].ops + 1 };
          });
          
          if (allDone) setIsRunning(false);
          return next;
        });
      }
      if (isRunning) reqRef.current = requestAnimationFrame(step);
    };
    reqRef.current = requestAnimationFrame(step);
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-500" />
            Race Arena
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Configure parameters and watch the algorithms compete.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Controls</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">Dataset</label>
                <select 
                  value={dataset} 
                  onChange={e => setDataset(e.target.value as DatasetType)}
                  disabled={isRunning}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  {DATASETS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold text-slate-300 mb-2">
                  <label>Array Size</label>
                  <span className="text-indigo-400">{arraySize}</span>
                </div>
                <input 
                  type="range" min="10" max="200" value={arraySize} 
                  onChange={e => setArraySize(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full accent-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold text-slate-300 mb-2">
                  <label>Speed</label>
                  <span className="text-indigo-400">{speed}%</span>
                </div>
                <input 
                  type="range" min="1" max="100" value={speed} 
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">Competitors</label>
                <div className="flex flex-wrap gap-2">
                  {ALGORITHMS.slice(0, 4).map(algo => (
                    <button
                      key={algo.id}
                      onClick={() => handleAlgoToggle(algo.id)}
                      disabled={isRunning}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors disabled:opacity-50 ${
                        selectedAlgos.includes(algo.id) 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {algo.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={startRace} 
                  disabled={isRunning}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" /> Start
                </button>
                <button 
                  onClick={handleShuffle}
                  disabled={isRunning}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Shuffle
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedAlgos.map(algoId => {
            const algoInfo = ALGORITHMS.find(a => a.id === algoId);
            const state = raceState[algoId];
            if (!state) return null;

            return (
              <div key={algoId} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-200">{algoInfo?.name}</h3>
                  <div className="flex gap-4 text-xs font-mono text-slate-400">
                    <span>Ops: {state.ops}</span>
                    <span className={state.done ? 'text-emerald-400' : 'text-amber-400'}>
                      {state.done ? 'Finished' : 'Running'}
                    </span>
                  </div>
                </div>
                <div className="h-32 flex items-end gap-[1px] bg-slate-950 p-2 rounded-lg">
                  {state.arr.map((item, idx) => {
                    const isActive = state.active.includes(idx);
                    const isSorted = state.done;
                    return (
                      <div
                        key={item.id}
                        className="w-full rounded-t-sm transition-all duration-75"
                        style={{
                          height: `${item.val}%`,
                          backgroundColor: isActive ? '#f43f5e' : isSorted ? '#10b981' : '#6366f1',
                          opacity: isActive ? 1 : 0.8
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StabilityCard = () => {
  const [demoState, setDemoState] = useState<'initial' | 'stable' | 'unstable'>('initial');
  const cards = [
    { val: 5, id: 'A', color: 'bg-rose-900/50 text-rose-200 border-rose-700' },
    { val: 2, id: '', color: 'bg-slate-800 text-slate-200 border-slate-600' },
    { val: 5, id: 'B', color: 'bg-sky-900/50 text-sky-200 border-sky-700' },
    { val: 1, id: '', color: 'bg-slate-800 text-slate-200 border-slate-600' },
  ];

  const getDisplayOrder = () => {
    if (demoState === 'stable') return [3, 1, 0, 2];
    if (demoState === 'unstable') return [3, 1, 2, 0];
    return [0, 1, 2, 3];
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Info className="w-6 h-6 text-indigo-500" />
            What is Algorithm Stability?
          </h3>
          <p className="text-slate-400 mt-2 font-medium max-w-2xl">
            A sorting algorithm is <strong>stable</strong> if it preserves the relative order of items with equal keys.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-lg">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex-1 w-full">
            <div className="flex justify-center gap-3 mb-6 min-h-[4rem]">
              {getDisplayOrder().map((index) => {
                const card = cards[index];
                return (
                  <div key={`${card.val}-${card.id}-${index}`} className={`relative w-16 h-16 flex items-center justify-center text-2xl font-black rounded-lg border-2 shadow-sm transition-all duration-500 ${card.color}`}>
                    {card.val}
                    {card.id && (
                      <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-slate-900 border-2 border-current flex items-center justify-center text-xs font-bold">
                        {card.id}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={() => setDemoState('initial')} className={`px-4 py-2 text-sm font-bold rounded-md border transition-colors ${demoState === 'initial' ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Original</button>
              <button onClick={() => setDemoState('stable')} className={`px-4 py-2 text-sm font-bold rounded-md border transition-colors ${demoState === 'stable' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Stable Sort</button>
              <button onClick={() => setDemoState('unstable')} className={`px-4 py-2 text-sm font-bold rounded-md border transition-colors ${demoState === 'unstable' ? 'bg-rose-900/50 text-rose-400 border-rose-700' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>Unstable Sort</button>
            </div>
          </div>
          <div className="flex-1 text-sm bg-slate-900 p-4 border border-slate-800 rounded-md">
            <h4 className="font-bold text-slate-300 mb-2 uppercase tracking-wider text-xs">Observation</h4>
            {demoState === 'initial' && <p className="text-slate-400">Notice the two <strong>5</strong>s. <span className="text-rose-400 font-bold">A</span> comes before <span className="text-sky-400 font-bold">B</span>.</p>}
            {demoState === 'stable' && <p className="text-emerald-400 font-medium">Equal elements maintain original relative order. <span className="text-rose-400 font-black">5A</span> is before <span className="text-sky-400 font-black">5B</span>.</p>}
            {demoState === 'unstable' && <p className="text-rose-400 font-medium">Algorithm swapped equal elements. <span className="text-sky-400 font-black">5B</span> ended up before <span className="text-rose-400 font-black">5A</span>.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalysisTab = () => {
  const [dataset, setDataset] = useState<DatasetType>('Random');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'timeMs', direction: 'asc' });

  const currentResults = MOCK_RESULTS[dataset];
  const maxValues = useMemo(() => ({
    timeMs: Math.max(...currentResults.map(r => r.timeMs)),
    operations: Math.max(...currentResults.map(r => r.operations)),
    swaps: Math.max(...currentResults.map(r => r.swaps)),
  }), [currentResults]);

  const sortedResults = useMemo(() => {
    return [...currentResults].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentResults, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <BarChart2 className="w-4 h-4 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-100 uppercase">Race Analysis</h1>
          <p className="text-slate-400 font-medium mt-2">Post-run summary, metrics, and stability breakdown.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800 shadow-sm">
          <Database className="w-5 h-5 text-slate-500 ml-2" />
          <select 
            value={dataset} onChange={(e) => setDataset(e.target.value as DatasetType)}
            className="bg-transparent border-none text-slate-200 font-bold focus:ring-0 cursor-pointer outline-none pr-4"
          >
            {DATASETS.map(ds => <option key={ds} value={ds}>{ds} Dataset (N=1000)</option>)}
          </select>
        </div>
      </header>

      <div className="bg-indigo-900/40 text-white rounded-xl p-6 border border-indigo-800 flex items-center gap-6">
        <div className="bg-indigo-800 p-4 rounded-full border border-indigo-600">
          <Trophy className="w-10 h-10 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-indigo-200 font-bold uppercase tracking-wider text-sm mb-1">Fastest Algorithm ({dataset})</h2>
          <div className="text-3xl font-black flex items-baseline gap-3">
            {sortedResults.reduce((p, c) => p.timeMs < c.timeMs ? p : c).name}
            <span className="text-xl text-indigo-300 font-bold">{sortedResults.reduce((p, c) => p.timeMs < c.timeMs ? p : c).timeMs}ms</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="p-4 font-black text-slate-300 uppercase tracking-wider text-sm w-1/4">Algorithm</th>
                <th className="p-4 font-black text-slate-300 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-800 transition-colors w-1/5" onClick={() => handleSort('timeMs')}>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Time (ms) <SortIcon columnKey="timeMs" /></div>
                </th>
                <th className="p-4 font-black text-slate-300 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-800 transition-colors w-1/5" onClick={() => handleSort('operations')}>
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Operations <SortIcon columnKey="operations" /></div>
                </th>
                <th className="p-4 font-black text-slate-300 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-800 transition-colors w-1/5" onClick={() => handleSort('swaps')}>
                  <div className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Swaps <SortIcon columnKey="swaps" /></div>
                </th>
                <th className="p-4 font-black text-slate-300 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('isStable')}>
                  <div className="flex items-center justify-center gap-2">Stability <SortIcon columnKey="isStable" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedResults.map((result) => (
                <tr key={result.id} className="group transition-colors hover:bg-slate-800/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-sm ${result.color}`} />
                      <span className="font-bold text-slate-200">{result.name}</span>
                    </div>
                  </td>
                  <td className="p-4 relative">
                    <div className="absolute inset-y-0 left-0 bg-indigo-900/30 -z-10 transition-all duration-500" style={{ width: `${(result.timeMs / maxValues.timeMs) * 100}%` }} />
                    <span className="font-mono font-bold text-slate-300">{result.timeMs.toLocaleString()}</span>
                  </td>
                  <td className="p-4 relative">
                    <div className="absolute inset-y-0 left-0 bg-amber-900/20 -z-10 transition-all duration-500" style={{ width: `${(result.operations / maxValues.operations) * 100}%` }} />
                    <span className="font-mono font-bold text-slate-300">{result.operations.toLocaleString()}</span>
                  </td>
                  <td className="p-4 relative">
                    <div className="absolute inset-y-0 left-0 bg-emerald-900/20 -z-10 transition-all duration-500" style={{ width: maxValues.swaps > 0 ? `${(result.swaps / maxValues.swaps) * 100}%` : '0%' }} />
                    <span className="font-mono font-bold text-slate-300">{result.swaps.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-center">
                    {result.isStable ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800 font-bold text-xs uppercase tracking-wide">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Stable
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-900/30 text-rose-400 border border-rose-800 font-bold text-xs uppercase tracking-wide">
                        <XCircle className="w-3.5 h-3.5" /> Unstable
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <StabilityCard />
    </div>
  );
};

const ComplexityBadge = ({ value, type }: { value: Complexity; type: 'time' | 'space' }) => {
  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';
  if (type === 'time') {
    if (value === 'O(1)' || value === 'O(log n)') colorClass = 'bg-emerald-900/50 text-emerald-400 border-emerald-800';
    else if (value === 'O(n)') colorClass = 'bg-teal-900/50 text-teal-400 border-teal-800';
    else if (value === 'O(n log n)') colorClass = 'bg-indigo-900/50 text-indigo-400 border-indigo-800';
    else if (value === 'O(n²)') colorClass = 'bg-rose-900/50 text-rose-400 border-rose-800';
    else colorClass = 'bg-purple-900/50 text-purple-400 border-purple-800';
  } else {
    if (value === 'O(1)') colorClass = 'bg-emerald-900/50 text-emerald-400 border-emerald-800';
    else if (value === 'O(log n)') colorClass = 'bg-indigo-900/50 text-indigo-400 border-indigo-800';
    else colorClass = 'bg-amber-900/50 text-amber-400 border-amber-800';
  }
  return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>{value}</span>;
};

const TheoryTab = () => {
  const [activeAlgoId, setActiveAlgoId] = useState<string>(ALGORITHMS[0].id);
  const activeAlgo = ALGORITHMS.find(a => a.id === activeAlgoId)!;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <section className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Algorithm Reference Guide</h2>
        <p className="text-slate-400 max-w-3xl leading-relaxed">
          Understanding the theoretical foundation of sorting algorithms is crucial for choosing the right tool for the job. 
          Use this reference to explore time/space complexities, stability, and ideal use cases.
        </p>
      </section>

      <section className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden sticky top-6">
            <div className="p-4 bg-slate-950 border-b border-slate-800 font-semibold text-slate-400 uppercase tracking-wider text-xs">
              Algorithms
            </div>
            <ul className="divide-y divide-slate-800/50">
              {ALGORITHMS.map((algo) => (
                <li key={algo.id}>
                  <button
                    onClick={() => setActiveAlgoId(algo.id)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                      activeAlgoId === algo.id 
                        ? 'bg-indigo-900/30 text-indigo-400 border-l-4 border-indigo-500' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                    }`}
                  >
                    {algo.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-1 bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-900">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">{activeAlgo.name}</h2>
                <span className="inline-block mt-2 px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-widest rounded-md">
                  {activeAlgo.type}
                </span>
              </div>
            </div>
            <p className="text-lg text-slate-400 leading-relaxed">{activeAlgo.description}</p>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Complexity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Best Case</div>
                  <ComplexityBadge value={activeAlgo.timeComplexity.best} type="time" />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Average Case</div>
                  <ComplexityBadge value={activeAlgo.timeComplexity.average} type="time" />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Worst Case</div>
                  <ComplexityBadge value={activeAlgo.timeComplexity.worst} type="time" />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Space</div>
                  <ComplexityBadge value={activeAlgo.spaceComplexity} type="space" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Properties</h3>
              <ul className="space-y-4">
                <li className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-medium text-slate-300">Stable Sort</span>
                  {activeAlgo.stable ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                </li>
                <li className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-medium text-slate-300">In-Place</span>
                  {activeAlgo.inPlace ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                </li>
              </ul>
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-1">Ideal For</h4>
                  <p className="text-sm text-slate-400">{activeAlgo.idealFor}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-1">Pitfalls</h4>
                  <p className="text-sm text-slate-400">{activeAlgo.pitfalls}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'race' | 'analysis' | 'theory'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'race', label: 'Arena', icon: Flag },
    { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    { id: 'theory', label: 'Theory', icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <BarChart2 className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-black tracking-tight">SortingRace<span className="text-indigo-500">2.0</span></span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 z-40 transition-transform duration-300 ease-in-out flex flex-col
      `}>
        <div className="p-6 hidden md:flex items-center gap-2 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <BarChart2 className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-100">
            SortingRace<span className="text-indigo-500">2.0</span>
          </span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-16 md:mt-0">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        {activeTab === 'home' && <HeroTab onEnter={() => setActiveTab('race')} />}
        {activeTab === 'race' && <RaceTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'theory' && <TheoryTab />}
      </main>
    </div>
  );
}