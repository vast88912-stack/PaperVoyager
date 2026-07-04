import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Play, Info, BarChart2, Zap, LayoutList, ShieldCheck, 
  Trophy, Clock, ArrowRightLeft, Activity, CheckCircle2, 
  XCircle, ChevronDown, ChevronUp, Database, Home, Flag, 
  BookOpen, Settings, RefreshCw
} from 'lucide-react';

// --- Types & Interfaces ---
type Item = { val: number; id: number; originalIdx: number };
type Action =
  | { type: 'COMPARE'; idx: [number, number] }
  | { type: 'SWAP'; idx: [number, number] }
  | { type: 'SET'; idx: number; item: Item }
  | { type: 'FINISH' };

type Algorithm = {
  id: string;
  name: string;
  run: (arr: Item[]) => Action[];
};

type DatasetType = 'random' | 'nearly-sorted' | 'reversed' | 'few-uniques';
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

// --- Constants & Mock Data ---
const SHUFFLED_STATE = [85, 30, 95, 45, 15, 75, 55, 25, 65, 10, 90, 40, 70, 20, 60, 50, 80, 35];
const SORTED_STATE =   [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

const DATASET_OPTIONS = [
  { id: 'random', label: 'Random', icon: '🔀', desc: 'Completely randomized array. Good for testing average-case performance.' },
  { id: 'nearly-sorted', label: 'Nearly Sorted', icon: '📶', desc: '90% of elements are in order. Highly efficient for adaptive algorithms like Insertion Sort.' },
  { id: 'reversed', label: 'Reversed', icon: '🔽', desc: 'Elements in descending order. Often triggers the worst-case time complexity.' },
  { id: 'few-uniques', label: 'Few Uniques', icon: '🧱', desc: 'Contains many duplicate values. Tests how algorithms handle redundancy and stability.' },
];

const ALGORITHMS_INFO: AlgorithmInfo[] = [
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
    description: 'Builds the final sorted array one item at a time by inserting elements into their correct position.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)', stable: true, inPlace: true,
    idealFor: 'Small datasets, nearly-sorted data, or as a hybrid fallback.',
    pitfalls: 'Performance degrades quadratically as the dataset size increases.'
  },
  {
    id: 'merge', name: 'Merge Sort', type: 'Comparative',
    description: 'A divide-and-conquer algorithm that recursively splits the array into halves and merges them.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)', stable: true, inPlace: false,
    idealFor: 'Large datasets where stability is required.',
    pitfalls: 'Requires O(n) auxiliary space.'
  },
  {
    id: 'quick', name: 'Quick Sort', type: 'Comparative',
    description: 'Picks a pivot and partitions the array around it, recursively sorting the sub-arrays.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(log n)', stable: false, inPlace: true,
    idealFor: 'General-purpose sorting in memory. Often the fastest in practice.',
    pitfalls: 'Can degrade to O(n²) if a poor pivot is chosen. Unstable by default.'
  },
  {
    id: 'heap', name: 'Heap Sort', type: 'Comparative',
    description: 'Converts the array into a max-heap, then repeatedly extracts the maximum element.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)', stable: false, inPlace: true,
    idealFor: 'Systems with strict memory limits requiring guaranteed O(n log n) worst-case.',
    pitfalls: 'Poor cache locality compared to Quick Sort.'
  },
  {
    id: 'radix', name: 'Radix Sort', type: 'Non-Comparative',
    description: 'Sorts data with integer keys by grouping keys by individual digits.',
    timeComplexity: { best: 'O(nk)', average: 'O(nk)', worst: 'O(nk)' },
    spaceComplexity: 'O(n + k)', stable: true, inPlace: false,
    idealFor: 'Large arrays of integers or fixed-length keys.',
    pitfalls: 'Not a general-purpose sort. High memory overhead.'
  }
];

const MOCK_RESULTS: Record<string, AlgorithmResult[]> = {
  'random': [
    { id: 'merge', name: 'Merge Sort', timeMs: 12, operations: 9976, swaps: 9976, isStable: true, color: 'bg-blue-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 9, operations: 11432, swaps: 3120, isStable: false, color: 'bg-emerald-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18401, swaps: 9200, isStable: false, color: 'bg-amber-500' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 145, operations: 251432, swaps: 250432, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 380, operations: 499500, swaps: 251432, isStable: true, color: 'bg-red-500' },
  ],
  'nearly-sorted': [
    { id: 'insertion', name: 'Insertion Sort', timeMs: 2, operations: 1980, swaps: 980, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 5, operations: 9990, swaps: 980, isStable: true, color: 'bg-red-500' },
    { id: 'merge', name: 'Merge Sort', timeMs: 10, operations: 8432, swaps: 8432, isStable: true, color: 'bg-blue-500' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 15, operations: 15432, swaps: 4120, isStable: false, color: 'bg-emerald-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18001, swaps: 9000, isStable: false, color: 'bg-amber-500' },
  ],
  'reversed': [
    { id: 'merge', name: 'Merge Sort', timeMs: 11, operations: 8976, swaps: 8976, isStable: true, color: 'bg-blue-500' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 13, operations: 17401, swaps: 8700, isStable: false, color: 'bg-amber-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 28, operations: 31432, swaps: 15120, isStable: false, color: 'bg-emerald-500' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 290, operations: 499500, swaps: 499500, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 450, operations: 499500, swaps: 499500, isStable: true, color: 'bg-red-500' },
  ],
  'few-uniques': [
    { id: 'radix', name: 'Radix Sort', timeMs: 5, operations: 2000, swaps: 0, isStable: true, color: 'bg-purple-500' },
    { id: 'quick', name: 'Quick Sort', timeMs: 8, operations: 9432, swaps: 2120, isStable: false, color: 'bg-emerald-500' },
    { id: 'merge', name: 'Merge Sort', timeMs: 12, operations: 9976, swaps: 9976, isStable: true, color: 'bg-blue-500' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18401, swaps: 9200, isStable: false, color: 'bg-amber-500' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 120, operations: 201432, swaps: 200432, isStable: true, color: 'bg-cyan-500' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 340, operations: 499500, swaps: 201432, isStable: true, color: 'bg-red-500' },
  ]
};

// --- Algorithm Implementations (Trace Generators) ---
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

const mergeSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  const arr = [...initialArr];
  
  const merge = (l: number, m: number, r: number) => {
    const left = arr.slice(l, m + 1);
    const right = arr.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    
    while (i < left.length && j < right.length) {
      actions.push({ type: 'COMPARE', idx: [l + i, m + 1 + j] });
      if (left[i].val <= right[j].val) {
        actions.push({ type: 'SET', idx: k, item: left[i] });
        arr[k++] = left[i++];
      } else {
        actions.push({ type: 'SET', idx: k, item: right[j] });
        arr[k++] = right[j++];
      }
    }
    while (i < left.length) {
      actions.push({ type: 'SET', idx: k, item: left[i] });
      arr[k++] = left[i++];
    }
    while (j < right.length) {
      actions.push({ type: 'SET', idx: k, item: right[j] });
      arr[k++] = right[j++];
    }
  };

  const sort = (l: number, r: number) => {
    if (l >= r) return;
    const m = l + Math.floor((r - l) / 2);
    sort(l, m);
    sort(m + 1, r);
    merge(l, m, r);
  };

  sort(0, arr.length - 1);
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

const heapSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  const arr = [...initialArr];
  const n = arr.length;

  const heapify = (n: number, i: number) => {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;

    if (l < n) {
      actions.push({ type: 'COMPARE', idx: [l, largest] });
      if (arr[l].val > arr[largest].val) largest = l;
    }
    if (r < n) {
      actions.push({ type: 'COMPARE', idx: [r, largest] });
      if (arr[r].val > arr[largest].val) largest = r;
    }

    if (largest !== i) {
      actions.push({ type: 'SWAP', idx: [i, largest] });
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      heapify(n, largest);
    }
  };

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
  for (let i = n - 1; i > 0; i--) {
    actions.push({ type: 'SWAP', idx: [0, i] });
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(i, 0);
  }
  actions.push({ type: 'FINISH' });
  return actions;
};

const radixSortRun = (initialArr: Item[]): Action[] => {
  const actions: Action[] = [];
  let arr = [...initialArr];
  const max = Math.max(...arr.map(d => d.val));
  
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const output = new Array(arr.length).fill(null);
    const count = new Array(10).fill(0);
    
    for (let i = 0; i < arr.length; i++) count[Math.floor(arr[i].val / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = arr.length - 1; i >= 0; i--) {
      const idx = Math.floor(arr[i].val / exp) % 10;
      output[count[idx] - 1] = arr[i];
      count[idx]--;
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i] = output[i];
      actions.push({ type: 'SET', idx: i, item: arr[i] });
    }
  }
  actions.push({ type: 'FINISH' });
  return actions;
};

const ALGO_MAP: Record<string, Algorithm> = {
  bubble: { id: 'bubble', name: 'Bubble Sort', run: bubbleSortRun },
  insertion: { id: 'insertion', name: 'Insertion Sort', run: insertionSortRun },
  merge: { id: 'merge', name: 'Merge Sort', run: mergeSortRun },
  quick: { id: 'quick', name: 'Quick Sort', run: quickSortRun },
  heap: { id: 'heap', name: 'Heap Sort', run: heapSortRun },
  radix: { id: 'radix', name: 'Radix Sort', run: radixSortRun },
};

// --- Helper Functions ---
const generateData = (size: number, type: DatasetType): Item[] => {
  let arr: number[] = [];
  if (type === 'random') {
    arr = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 5);
  } else if (type === 'nearly-sorted') {
    arr = Array.from({ length: size }, (_, i) => (i / size) * 100 + 5);
    for (let i = 0; i < size * 0.1; i++) {
      const idx1 = Math.floor(Math.random() * size);
      const idx2 = Math.floor(Math.random() * size);
      [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
    }
  } else if (type === 'reversed') {
    arr = Array.from({ length: size }, (_, i) => ((size - i) / size) * 100 + 5);
  } else if (type === 'few-uniques') {
    const uniques = [10, 30, 50, 70, 90];
    arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }
  return arr.map((val, i) => ({ val, id: i, originalIdx: i }));
};

// --- Components ---

const HeroModule = ({ onEnter }: { onEnter: () => void }) => {
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
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-blue-900/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <main className="relative z-10 flex-grow container mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-16 pb-20 pt-10">
        <div className="w-full lg:w-1/2 flex flex-col items-start gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
            <Zap className="w-3.5 h-3.5" />
            <span>ChatGPT Edition</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-50">
            The Ultimate <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">
              Algorithm Showdown
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 leading-relaxed max-w-xl font-medium">
            Watch Bubble, Merge, Quick, Heap, and Radix sort battle it out in real-time. 
            Discover how dataset shapes impact performance, swaps, and stability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button onClick={onEnter} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-indigo-900/50 transform hover:-translate-y-1">
              <Play className="w-5 h-5 fill-current" />
              Start the Race
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-800 w-full">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <LayoutList className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Multiple Datasets</h3>
              <p className="text-xs text-slate-500 font-medium">Test on random, reversed, or nearly sorted arrays.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Live Telemetry</h3>
              <p className="text-xs text-slate-500 font-medium">Track array reads, writes, and swaps in real-time.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
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
              <div className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isSorted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
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
          </div>
        </div>
      </main>
    </div>
  );
};

const RaceLane = ({ 
  algoId, 
  initialData, 
  speed, 
  isRunning, 
  onFinish 
}: { 
  algoId: string, 
  initialData: Item[], 
  speed: number, 
  isRunning: boolean,
  onFinish: (id: string, ops: number, swaps: number) => void
}) => {
  const [data, setData] = useState<Item[]>(initialData);
  const [activeIdx, setActiveIdx] = useState<number[]>([]);
  const [stats, setStats] = useState({ ops: 0, swaps: 0, finished: false });
  const algo = ALGO_MAP[algoId];
  
  const traceRef = useRef<Action[]>([]);
  const stepRef = useRef(0);
  const reqRef = useRef<number>();

  useEffect(() => {
    setData(initialData);
    setStats({ ops: 0, swaps: 0, finished: false });
    setActiveIdx([]);
    traceRef.current = [];
    stepRef.current = 0;
  }, [initialData]);

  useEffect(() => {
    if (isRunning && !stats.finished && traceRef.current.length === 0) {
      traceRef.current = algo.run(initialData);
    }
  }, [isRunning, initialData, algo, stats.finished]);

  useEffect(() => {
    if (!isRunning || stats.finished) return;

    let lastTime = performance.now();
    const delay = 101 - speed; // 1 to 100 ms roughly

    const tick = (time: number) => {
      if (time - lastTime > delay) {
        let stepsToRun = speed > 90 ? Math.floor(speed / 10) : 1;
        
        setData(prev => {
          let next = [...prev];
          let currentOps = stats.ops;
          let currentSwaps = stats.swaps;
          let isDone = false;
          let currentActive: number[] = [];

          for (let i = 0; i < stepsToRun; i++) {
            if (stepRef.current >= traceRef.current.length) break;
            const action = traceRef.current[stepRef.current++];
            
            if (action.type === 'COMPARE') {
              currentActive = action.idx;
              currentOps++;
            } else if (action.type === 'SWAP') {
              const [a, b] = action.idx;
              [next[a], next[b]] = [next[b], next[a]];
              currentActive = [a, b];
              currentSwaps++;
              currentOps++;
            } else if (action.type === 'SET') {
              next[action.idx] = action.item;
              currentActive = [action.idx];
              currentOps++;
            } else if (action.type === 'FINISH') {
              isDone = true;
              currentActive = [];
            }
          }

          setStats(s => ({ ...s, ops: currentOps, swaps: currentSwaps, finished: isDone }));
          setActiveIdx(currentActive);
          
          if (isDone) {
            onFinish(algoId, currentOps, currentSwaps);
          }
          
          return next;
        });
        lastTime = time;
      }
      if (!stats.finished) {
        reqRef.current = requestAnimationFrame(tick);
      }
    };

    reqRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [isRunning, speed, stats.finished, algoId, onFinish]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-200">{algo.name}</h3>
        <div className="text-xs font-mono text-slate-400 flex gap-3">
          <span>Ops: {stats.ops}</span>
          <span>Swaps: {stats.swaps}</span>
        </div>
      </div>
      <div className="flex-1 flex items-end gap-[1px] h-32">
        {data.map((item, i) => {
          const isActive = activeIdx.includes(i);
          const isSorted = stats.finished;
          let bg = 'bg-indigo-500';
          if (isSorted) bg = 'bg-emerald-500';
          else if (isActive) bg = 'bg-rose-500';
          
          return (
            <div 
              key={item.id}
              className={`w-full rounded-t-sm ${bg} transition-colors duration-75`}
              style={{ height: `${item.val}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};

const ArenaModule = () => {
  const [dataset, setDataset] = useState<DatasetType>('random');
  const [arraySize, setArraySize] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(50);
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>(['bubble', 'merge', 'quick']);
  const [isRunning, setIsRunning] = useState(false);
  const [initialData, setInitialData] = useState<Item[]>([]);

  const handleAlgoToggle = (id: string) => {
    setSelectedAlgos(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const generateNewData = useCallback(() => {
    setInitialData(generateData(arraySize, dataset));
    setIsRunning(false);
  }, [arraySize, dataset]);

  useEffect(() => {
    generateNewData();
  }, [generateNewData]);

  const handleFinish = useCallback((id: string, ops: number, swaps: number) => {
    // Could track leaderboard here
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-50 flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-500" />
            Race Arena
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Configure parameters and watch the algorithms compete.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={generateNewData}
            disabled={isRunning}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Shuffle
          </button>
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors ${isRunning ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
          >
            {isRunning ? <XCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Stop' : 'Start Race'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Dataset</h2>
            <div className="flex flex-col gap-2">
              {DATASET_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDataset(opt.id as DatasetType)}
                  disabled={isRunning}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dataset === opt.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 border border-transparent'}`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-300 mb-2">
                <span>Size</span>
                <span className="text-indigo-400">{arraySize}</span>
              </div>
              <input 
                type="range" min="10" max="200" value={arraySize} 
                onChange={(e) => setArraySize(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-300 mb-2">
                <span>Speed</span>
                <span className="text-indigo-400">{speed}%</span>
              </div>
              <input 
                type="range" min="1" max="100" value={speed} 
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </section>

          <section className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Competitors</h2>
            <div className="flex flex-wrap gap-2">
              {Object.values(ALGO_MAP).map(algo => (
                <button
                  key={algo.id}
                  onClick={() => handleAlgoToggle(algo.id)}
                  disabled={isRunning}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors border ${selectedAlgos.includes(algo.id) ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                >
                  {algo.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedAlgos.map(id => (
            <RaceLane 
              key={id} 
              algoId={id} 
              initialData={initialData} 
              speed={speed} 
              isRunning={isRunning}
              onFinish={handleFinish}
            />
          ))}
          {selectedAlgos.length === 0 && (
            <div className="col-span-full flex items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 font-medium">
              Select at least one algorithm to race.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AnalysisModule = () => {
  const [dataset, setDataset] = useState<DatasetType>('random');
  const [sortConfig, setSortConfig] = useState<{ key: keyof AlgorithmResult; direction: 'asc' | 'desc' }>({ key: 'timeMs', direction: 'asc' });

  const currentResults = MOCK_RESULTS[dataset];

  const maxValues = useMemo(() => ({
    timeMs: Math.max(...currentResults.map(r => r.timeMs)),
    operations: Math.max(...currentResults.map(r => r.operations)),
    swaps: Math.max(...currentResults.map(r => r.swaps)),
  }), [currentResults]);

  const sortedResults = useMemo(() => {
    let sortable = [...currentResults];
    sortable.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [currentResults, sortConfig]);

  const handleSort = (key: keyof AlgorithmResult) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof AlgorithmResult }) => {
    if (sortConfig.key !== columnKey) return <BarChart2 className="w-4 h-4 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-50 flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-indigo-500" />
            Race Analysis
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Post-run summary, metrics, and stability breakdown (N=1000).</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <Database className="w-5 h-5 text-slate-500 ml-2" />
          <select 
            value={dataset}
            onChange={(e) => setDataset(e.target.value as DatasetType)}
            className="bg-transparent border-none text-slate-200 font-bold focus:ring-0 cursor-pointer outline-none pr-4"
          >
            {DATASET_OPTIONS.map(ds => <option key={ds.id} value={ds.id}>{ds.label}</option>)}
          </select>
        </div>
      </header>

      <div className="bg-indigo-900/40 text-white rounded-xl p-6 border border-indigo-500/30 flex items-center gap-6">
        <div className="bg-indigo-500/20 p-4 rounded-full border border-indigo-500/50">
          <Trophy className="w-10 h-10 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-indigo-300 font-bold uppercase tracking-wider text-sm mb-1">Fastest Algorithm ({dataset})</h2>
          <div className="text-3xl font-black flex items-baseline gap-3">
            {sortedResults[0].name}
            <span className="text-xl text-indigo-200 font-bold">{sortedResults[0].timeMs}ms</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-xs w-1/4">Algorithm</th>
                <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-xs cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('timeMs')}>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Time (ms) <SortIcon columnKey="timeMs" /></div>
                </th>
                <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-xs cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('operations')}>
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Operations <SortIcon columnKey="operations" /></div>
                </th>
                <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-xs cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('swaps')}>
                  <div className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Swaps <SortIcon columnKey="swaps" /></div>
                </th>
                <th className="p-4 font-bold text-slate-400 uppercase tracking-wider text-xs cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('isStable')}>
                  <div className="flex items-center justify-center gap-2">Stability <SortIcon columnKey="isStable" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedResults.map((result, idx) => (
                <tr key={result.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${result.color}`} />
                      <span className="font-bold text-slate-200">{result.name}</span>
                    </div>
                  </td>
                  <td className="p-4 relative">
                    <div className="absolute inset-y-0 left-0 bg-indigo-500/10 -z-10" style={{ width: `${(result.timeMs / maxValues.timeMs) * 100}%` }} />
                    <span className="font-mono text-slate-300">{result.timeMs.toLocaleString()}</span>
                  </td>
                  <td className="p-4 relative">
                    <div className="absolute inset-y-0 left-0 bg-amber-500/10 -z-10" style={{ width: `${(result.operations / maxValues.operations) * 100}%` }} />
                    <span className="font-mono text-slate-300">{result.operations.toLocaleString()}</span>
                  </td>
                  <td className="p-4 relative">
                    <div className="absolute inset-y-0 left-0 bg-emerald-500/10 -z-10" style={{ width: maxValues.swaps > 0 ? `${(result.swaps / maxValues.swaps) * 100}%` : '0%' }} />
                    <span className="font-mono text-slate-300">{result.swaps.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-center">
                    {result.isStable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase"><CheckCircle2 className="w-3 h-3" /> Stable</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 text-rose-400 text-xs font-bold uppercase"><XCircle className="w-3 h-3" /> Unstable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TheoryModule = () => {
  const [activeAlgoId, setActiveAlgoId] = useState<string>(ALGORITHMS_INFO[0].id);
  const activeAlgo = ALGORITHMS_INFO.find(a => a.id === activeAlgoId)!;

  const ComplexityBadge = ({ value }: { value: Complexity }) => {
    let color = 'bg-slate-800 text-slate-300 border-slate-700';
    if (value === 'O(1)' || value === 'O(log n)') color = 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
    else if (value === 'O(n)') color = 'bg-teal-900/30 text-teal-400 border-teal-800';
    else if (value === 'O(n log n)') color = 'bg-blue-900/30 text-blue-400 border-blue-800';
    else if (value === 'O(n²)') color = 'bg-rose-900/30 text-rose-400 border-rose-800';
    return <span className={`px-2 py-1 rounded text-xs font-bold border ${color}`}>{value}</span>;
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <header className="pb-6 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold text-slate-50 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          Theory & Reference
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Understand the theoretical foundation of sorting algorithms.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden sticky top-6">
            <div className="p-4 bg-slate-950 border-b border-slate-800 font-bold text-slate-400 uppercase tracking-wider text-xs">Algorithms</div>
            <ul className="divide-y divide-slate-800/50">
              {ALGORITHMS_INFO.map(algo => (
                <li key={algo.id}>
                  <button
                    onClick={() => setActiveAlgoId(algo.id)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex justify-between items-center ${activeAlgoId === algo.id ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:bg-slate-800 border-l-2 border-transparent'}`}
                  >
                    {algo.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-50">{activeAlgo.name}</h2>
                <span className="inline-block mt-2 px-2 py-1 bg-slate-800 text-slate-300 text-xs font-bold uppercase rounded">{activeAlgo.type}</span>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed">{activeAlgo.description}</p>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Complexity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Best Case</div>
                  <ComplexityBadge value={activeAlgo.timeComplexity.best} />
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Average Case</div>
                  <ComplexityBadge value={activeAlgo.timeComplexity.average} />
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Worst Case</div>
                  <ComplexityBadge value={activeAlgo.timeComplexity.worst} />
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Space</div>
                  <ComplexityBadge value={activeAlgo.spaceComplexity} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Properties</h3>
              <ul className="space-y-3">
                <li className="flex justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-medium text-slate-300">Stable Sort</span>
                  {activeAlgo.stable ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <XCircle className="text-rose-500 w-5 h-5" />}
                </li>
                <li className="flex justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-medium text-slate-300">In-Place</span>
                  {activeAlgo.inPlace ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <XCircle className="text-rose-500 w-5 h-5" />}
                </li>
              </ul>
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-sm font-bold text-emerald-500 uppercase mb-1">Ideal For</h4>
                  <p className="text-sm text-slate-400">{activeAlgo.idealFor}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-500 uppercase mb-1">Pitfalls</h4>
                  <p className="text-sm text-slate-400">{activeAlgo.pitfalls}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'hero' | 'arena' | 'analysis' | 'theory'>('hero');

  const navItems = [
    { id: 'hero', label: 'Home', icon: Home },
    { id: 'arena', label: 'Arena', icon: Flag },
    { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    { id: 'theory', label: 'Theory', icon: BookOpen },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-900/50 shrink-0">
            <BarChart2 className="text-white w-5 h-5" />
          </div>
          <span className="hidden md:block text-lg font-black tracking-tight text-slate-50 ml-3">
            SortingRace<span className="text-indigo-500">2.0</span>
          </span>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-center md:justify-start gap-3 px-3 py-3 rounded-lg font-bold transition-all ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {activeTab === 'hero' && <HeroModule onEnter={() => setActiveTab('arena')} />}
        {activeTab === 'arena' && <ArenaModule />}
        {activeTab === 'analysis' && <AnalysisModule />}
        {activeTab === 'theory' && <TheoryModule />}
      </main>
    </div>
  );
}