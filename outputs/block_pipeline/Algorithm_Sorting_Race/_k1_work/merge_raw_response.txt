import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
type DatasetType = 'random' | 'nearly-sorted' | 'reversed' | 'few-uniques';
type Complexity = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n + k)' | 'O(nk)';

interface Config {
  size: number;
  speed: number;
  dataset: DatasetType;
  isStable: boolean;
  selectedAlgos: string[];
}

interface Action {
  type: 'comp' | 'swap' | 'write';
  i: number;
  j?: number;
  val?: number;
}

interface AlgoStats {
  comps: number;
  swaps: number;
  writes: number;
}

interface LaneState {
  id: string;
  name: string;
  isStable: boolean;
  expectedTime: string;
  array: number[];
  originalArray: number[];
  activeIndices: number[];
  stats: AlgoStats;
  status: 'idle' | 'running' | 'finished';
  finishRank: number | null;
  frames: Action[];
  frameIdx: number;
}

interface AlgorithmInfo {
  id: string;
  name: string;
  type: 'Comparative' | 'Non-Comparative';
  description: string;
  timeComplexity: { best: Complexity; average: Complexity; worst: Complexity };
  spaceComplexity: Complexity;
  stable: boolean;
  inPlace: boolean;
  idealFor: string;
  pitfalls: string;
}

// --- Constants & Data ---
const DATASET_OPTIONS = [
  { id: 'random', label: 'Random', icon: '🔀', desc: 'Completely randomized array. Good for testing average-case performance.' },
  { id: 'nearly-sorted', label: 'Nearly Sorted', icon: '📶', desc: '90% of elements are in order. Highly efficient for adaptive algorithms like Insertion Sort.' },
  { id: 'reversed', label: 'Reversed', icon: '🔽', desc: 'Elements in descending order. Often triggers the worst-case time complexity.' },
  { id: 'few-uniques', label: 'Few Uniques', icon: '🧱', desc: 'Contains many duplicate values. Tests how algorithms handle redundancy and stability.' },
];

const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'bubble', name: 'Bubble Sort', type: 'Comparative',
    description: 'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)', stable: true, inPlace: true,
    idealFor: 'Educational demonstrations and detecting if a small array is already sorted.',
    pitfalls: 'Extremely inefficient for large datasets. The "turtle" elements move very slowly.'
  },
  {
    id: 'insertion', name: 'Insertion Sort', type: 'Comparative',
    description: 'Builds the final sorted array one item at a time. It iterates through the input, growing a sorted list behind it.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)', stable: true, inPlace: true,
    idealFor: 'Small datasets, nearly-sorted data, or as a hybrid fallback (e.g., in Timsort).',
    pitfalls: 'Performance degrades quadratically as the dataset size increases or if the data is in reverse order.'
  },
  {
    id: 'merge', name: 'Merge Sort', type: 'Comparative',
    description: 'A divide-and-conquer algorithm that recursively splits the array into halves until each sub-array contains a single element, then merges them.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)', stable: true, inPlace: false,
    idealFor: 'Large datasets where stability is required, or sorting linked lists.',
    pitfalls: 'Requires O(n) auxiliary space, making it less ideal for memory-constrained environments.'
  },
  {
    id: 'quick', name: 'Quick Sort', type: 'Comparative',
    description: 'Picks an element as a "pivot" and partitions the given array around the picked pivot, placing smaller elements before it and larger elements after it.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(log n)', stable: false, inPlace: true,
    idealFor: 'General-purpose sorting in memory. Often the fastest in practice due to excellent cache locality.',
    pitfalls: 'Can degrade to O(n²) if a poor pivot is chosen. Unstable by default.'
  },
  {
    id: 'heap', name: 'Heap Sort', type: 'Comparative',
    description: 'Converts the array into a max-heap data structure, then repeatedly extracts the maximum element and rebuilds the heap until the array is sorted.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)', stable: false, inPlace: true,
    idealFor: 'Systems with strict memory limits or real-time systems requiring guaranteed O(n log n) worst-case performance.',
    pitfalls: 'Poor cache locality compared to Quick Sort, making it generally slower in real-world benchmarks.'
  },
  {
    id: 'radix', name: 'Radix Sort', type: 'Non-Comparative',
    description: 'Sorts data with integer keys by grouping keys by the individual digits which share the same significant position and value.',
    timeComplexity: { best: 'O(nk)', average: 'O(nk)', worst: 'O(nk)' },
    spaceComplexity: 'O(n + k)', stable: true, inPlace: false,
    idealFor: 'Large arrays of integers, strings, or fixed-length keys where k (number of digits) is small.',
    pitfalls: 'Not a general-purpose sort (requires specific data types). High memory overhead for the buckets.'
  }
];

// --- Helpers & Algorithm Implementations ---
const generateData = (size: number, type: DatasetType): number[] => {
  let arr: number[] = [];
  if (type === 'random') {
    arr = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);
  } else if (type === 'nearly-sorted') {
    arr = Array.from({ length: size }, (_, i) => Math.floor((i / size) * 90) + 10);
    for (let i = 0; i < size / 10; i++) {
      const idx1 = Math.floor(Math.random() * size);
      const idx2 = Math.floor(Math.random() * size);
      [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
    }
  } else if (type === 'reversed') {
    arr = Array.from({ length: size }, (_, i) => Math.floor(((size - i) / size) * 90) + 10);
  } else if (type === 'few-uniques') {
    const uniques = [20, 40, 60, 80];
    arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }
  return arr;
};

class Recorder {
  frames: Action[] = [];
  stats: AlgoStats = { comps: 0, swaps: 0, writes: 0 };

  comp(i: number, j: number) {
    this.stats.comps++;
    this.frames.push({ type: 'comp', i, j });
  }
  swap(arr: number[], i: number, j: number) {
    this.stats.swaps++;
    this.frames.push({ type: 'swap', i, j });
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  write(arr: number[], i: number, val: number) {
    this.stats.writes++;
    this.frames.push({ type: 'write', i, val });
    arr[i] = val;
  }
}

const algoRunners: Record<string, (input: number[]) => Action[]> = {
  bubble: (input) => {
    const arr = [...input];
    const rec = new Recorder();
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        rec.comp(j, j + 1);
        if (arr[j] > arr[j + 1]) {
          rec.swap(arr, j, j + 1);
          swapped = true;
        }
      }
      if (!swapped) break;
    }
    return rec.frames;
  },
  insertion: (input) => {
    const arr = [...input];
    const rec = new Recorder();
    const n = arr.length;
    for (let i = 1; i < n; i++) {
      let key = arr[i];
      let j = i - 1;
      while (j >= 0) {
        rec.comp(j, i);
        if (arr[j] > key) {
          rec.write(arr, j + 1, arr[j]);
          j = j - 1;
        } else {
          break;
        }
      }
      rec.write(arr, j + 1, key);
    }
    return rec.frames;
  },
  merge: (input) => {
    const arr = [...input];
    const rec = new Recorder();
    const mergeSort = (l: number, r: number) => {
      if (l >= r) return;
      const m = l + Math.floor((r - l) / 2);
      mergeSort(l, m);
      mergeSort(m + 1, r);
      merge(l, m, r);
    };
    const merge = (l: number, m: number, r: number) => {
      const left = arr.slice(l, m + 1);
      const right = arr.slice(m + 1, r + 1);
      let i = 0, j = 0, k = l;
      while (i < left.length && j < right.length) {
        rec.comp(l + i, m + 1 + j);
        if (left[i] <= right[j]) {
          rec.write(arr, k, left[i]);
          i++;
        } else {
          rec.write(arr, k, right[j]);
          j++;
        }
        k++;
      }
      while (i < left.length) { rec.write(arr, k, left[i]); i++; k++; }
      while (j < right.length) { rec.write(arr, k, right[j]); j++; k++; }
    };
    mergeSort(0, arr.length - 1);
    return rec.frames;
  },
  quick: (input) => {
    const arr = [...input];
    const rec = new Recorder();
    const quickSort = (low: number, high: number) => {
      if (low < high) {
        const pi = partition(low, high);
        quickSort(low, pi - 1);
        quickSort(pi + 1, high);
      }
    };
    const partition = (low: number, high: number): number => {
      const pivot = arr[high];
      let i = low - 1;
      for (let j = low; j < high; j++) {
        rec.comp(j, high);
        if (arr[j] < pivot) {
          i++;
          rec.swap(arr, i, j);
        }
      }
      rec.swap(arr, i + 1, high);
      return i + 1;
    };
    quickSort(0, arr.length - 1);
    return rec.frames;
  },
  heap: (input) => {
    const arr = [...input];
    const rec = new Recorder();
    const n = arr.length;
    const heapify = (n: number, i: number) => {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n) { rec.comp(l, largest); if (arr[l] > arr[largest]) largest = l; }
      if (r < n) { rec.comp(r, largest); if (arr[r] > arr[largest]) largest = r; }
      if (largest !== i) {
        rec.swap(arr, i, largest);
        heapify(n, largest);
      }
    };
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
    for (let i = n - 1; i > 0; i--) {
      rec.swap(arr, 0, i);
      heapify(i, 0);
    }
    return rec.frames;
  },
  radix: (input) => {
    const arr = [...input];
    const rec = new Recorder();
    const max = Math.max(...arr);
    const countSort = (exp: number) => {
      const output = new Array(arr.length).fill(0);
      const count = new Array(10).fill(0);
      for (let i = 0; i < arr.length; i++) count[Math.floor(arr[i] / exp) % 10]++;
      for (let i = 1; i < 10; i++) count[i] += count[i - 1];
      for (let i = arr.length - 1; i >= 0; i--) {
        const idx = Math.floor(arr[i] / exp) % 10;
        output[count[idx] - 1] = arr[i];
        count[idx]--;
      }
      for (let i = 0; i < arr.length; i++) rec.write(arr, i, output[i]);
    };
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) countSort(exp);
    return rec.frames;
  }
};

// --- Custom Hooks ---
function useSimulatedSort(speed: number, type: 'fast' | 'slow') {
  const [arr, setArr] = useState<number[]>([]);
  const [active, setActive] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const reset = () => {
      setArr(Array.from({ length: 30 }, () => Math.floor(Math.random() * 85) + 15));
      setIsComplete(false);
      setActive([]);
    };
    reset();

    const interval = setInterval(() => {
      setArr(prev => {
        if (prev.length === 0) return prev;
        let next = [...prev];
        let isSorted = true;
        for(let i = 0; i < next.length - 1; i++) {
          if(next[i] > next[i+1]) { isSorted = false; break; }
        }
        if(isSorted) {
          setIsComplete(true);
          setActive([]);
          clearInterval(interval);
          timeoutId = setTimeout(reset, 3000);
          return next;
        }
        let newActive: number[] = [];
        if (type === 'fast') {
          let swaps = 0;
          let attempts = 0;
          while(swaps < 4 && attempts < 20) {
             let idx = Math.floor(Math.random() * (next.length - 1));
             if (next[idx] > next[idx+1]) {
               let temp = next[idx];
               next[idx] = next[idx+1];
               next[idx+1] = temp;
               newActive.push(idx, idx+1);
               swaps++;
             }
             attempts++;
          }
        } else {
           for(let i = 0; i < next.length - 1; i++) {
             if(next[i] > next[i+1]) {
               let temp = next[i];
               next[i] = next[i+1];
               next[i+1] = temp;
               newActive.push(i, i+1);
               break;
             }
           }
        }
        setActive(newActive);
        return next;
      });
    }, speed);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [speed, type]);

  return { arr, active, isComplete };
}

// --- Icons ---
const IconPlay = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconInfo = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconBarChart = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconSettings = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconBook = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const IconZap = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconCheck = () => <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
const IconX = () => <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>;

// --- Components ---

const ComplexityBadge = ({ value, type }: { value: Complexity; type: 'time' | 'space' }) => {
  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';
  if (type === 'time') {
    if (value === 'O(1)' || value === 'O(log n)') colorClass = 'bg-emerald-900/40 text-emerald-300 border-emerald-800';
    else if (value === 'O(n)') colorClass = 'bg-teal-900/40 text-teal-300 border-teal-800';
    else if (value === 'O(n log n)') colorClass = 'bg-blue-900/40 text-blue-300 border-blue-800';
    else if (value === 'O(n²)') colorClass = 'bg-rose-900/40 text-rose-300 border-rose-800';
    else if (value === 'O(nk)' || value === 'O(n + k)') colorClass = 'bg-indigo-900/40 text-indigo-300 border-indigo-800';
  } else {
    if (value === 'O(1)') colorClass = 'bg-emerald-900/40 text-emerald-300 border-emerald-800';
    else if (value === 'O(log n)') colorClass = 'bg-blue-900/40 text-blue-300 border-blue-800';
    else colorClass = 'bg-amber-900/40 text-amber-300 border-amber-800';
  }
  return <span className={`px-3 py-1 rounded-full text-sm font-bold border ${colorClass} shadow-sm inline-block`}>{value}</span>;
};

function HeroView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const fastSort = useSimulatedSort(50, 'fast');
  const slowSort = useSimulatedSort(150, 'slow');

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>
      
      <div className="max-w-4xl w-full text-center space-y-8 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-blue-400 text-sm font-bold tracking-wide uppercase mb-4">
          <IconZap /> Project: Sorting Race 2.0
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg">
          Visualize. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Compare.</span> Learn.
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          An interactive pedagogical tool to explore, race, and understand the mechanics of classic sorting algorithms in real-time.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <button onClick={() => onNavigate('race')} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-1 flex items-center gap-2 text-lg w-full sm:w-auto justify-center">
            <IconPlay /> Start the Race
          </button>
          <button onClick={() => onNavigate('theory')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2 text-lg w-full sm:w-auto justify-center">
            <IconBook /> Read Theory
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto opacity-80">
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between">
              <span>O(n log n) Simulation</span>
              {fastSort.isComplete && <span className="text-emerald-400">Sorted</span>}
            </h3>
            <div className="flex items-end h-32 gap-1">
              {fastSort.arr.map((val, i) => (
                <div key={i} className={`flex-1 rounded-t-sm transition-all duration-75 ${fastSort.active.includes(i) ? 'bg-blue-400' : fastSort.isComplete ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ height: `${val}%` }} />
              ))}
            </div>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between">
              <span>O(n²) Simulation</span>
              {slowSort.isComplete && <span className="text-emerald-400">Sorted</span>}
            </h3>
            <div className="flex items-end h-32 gap-1">
              {slowSort.arr.map((val, i) => (
                <div key={i} className={`flex-1 rounded-t-sm transition-all duration-75 ${slowSort.active.includes(i) ? 'bg-rose-400' : slowSort.isComplete ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ height: `${val}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RaceView({ config, setConfig }: { config: Config, setConfig: React.Dispatch<React.SetStateAction<Config>> }) {
  const [lanes, setLanes] = useState<LaneState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const requestRef = useRef<number>();
  const lanesRef = useRef<LaneState[]>([]);
  const rankCounterRef = useRef<number>(1);

  const initRace = useCallback(() => {
    const newBase = generateData(config.size, config.dataset);
    const selected = ALGORITHMS.filter(a => config.selectedAlgos.includes(a.id));
    
    const initialLanes: LaneState[] = selected.map(def => ({
      ...def,
      expectedTime: def.timeComplexity.average,
      isStable: def.stable,
      array: [...newBase],
      originalArray: [...newBase],
      activeIndices: [],
      stats: { comps: 0, swaps: 0, writes: 0 },
      status: 'idle',
      finishRank: null,
      frames: [],
      frameIdx: 0,
    }));
    
    setLanes(initialLanes);
    lanesRef.current = initialLanes;
    setIsFinished(false);
    setIsRunning(false);
    rankCounterRef.current = 1;
  }, [config]);

  useEffect(() => { initRace(); }, [initRace]);

  const startRace = () => {
    if (isRunning || lanes.length === 0) return;
    const preparedLanes = lanes.map(lane => {
      const frames = algoRunners[lane.id]([...lane.originalArray]);
      return { ...lane, frames, status: 'running' as const, frameIdx: 0, stats: { comps: 0, swaps: 0, writes: 0 } };
    });
    setLanes(preparedLanes);
    lanesRef.current = preparedLanes;
    setIsRunning(true);
    setIsFinished(false);
    rankCounterRef.current = 1;
    requestRef.current = requestAnimationFrame(playbackLoop);
  };

  const playbackLoop = () => {
    let allFinished = true;
    let updated = false;
    const currentLanes = [...lanesRef.current];

    for (let i = 0; i < currentLanes.length; i++) {
      const lane = { ...currentLanes[i] };
      if (lane.status === 'running') {
        allFinished = false;
        updated = true;
        const steps = Math.max(1, Math.floor(config.speed));
        let newArr = [...lane.array];
        let newStats = { ...lane.stats };
        let active: number[] = [];

        for (let s = 0; s < steps; s++) {
          if (lane.frameIdx >= lane.frames.length) {
            lane.status = 'finished';
            lane.finishRank = rankCounterRef.current++;
            active = [];
            break;
          }
          const frame = lane.frames[lane.frameIdx];
          if (frame.type === 'comp') {
            newStats.comps++;
            active = [frame.i, frame.j!];
          } else if (frame.type === 'swap') {
            newStats.swaps++;
            const temp = newArr[frame.i];
            newArr[frame.i] = newArr[frame.j!];
            newArr[frame.j!] = temp;
            active = [frame.i, frame.j!];
          } else if (frame.type === 'write') {
            newStats.writes++;
            newArr[frame.i] = frame.val!;
            active = [frame.i];
          }
          lane.frameIdx++;
        }
        lane.array = newArr;
        lane.stats = newStats;
        lane.activeIndices = active;
        currentLanes[i] = lane;
      }
    }

    if (updated) {
      lanesRef.current = currentLanes;
      setLanes(currentLanes);
    }

    if (!allFinished) {
      requestRef.current = requestAnimationFrame(playbackLoop);
    } else {
      setIsRunning(false);
      setIsFinished(true);
      setLanes(prev => prev.map(l => ({ ...l, activeIndices: [] })));
    }
  };

  useEffect(() => {
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  const handleAlgoToggle = (id: string) => {
    setConfig(prev => ({
      ...prev,
      selectedAlgos: prev.selectedAlgos.includes(id) 
        ? prev.selectedAlgos.filter(a => a !== id) 
        : [...prev.selectedAlgos, id]
    }));
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><IconSettings /> Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Dataset Preset</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DATASET_OPTIONS.map((opt) => (
                    <button key={opt.id} disabled={isRunning} onClick={() => setConfig({...config, dataset: opt.id as DatasetType})}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        config.dataset === opt.id ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:bg-slate-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-xs font-bold text-center">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-bold text-slate-400 uppercase">Array Size</label>
                    <span className="text-lg font-black text-blue-400">{config.size}</span>
                  </div>
                  <input type="range" min="10" max="200" step="10" disabled={isRunning} value={config.size} onChange={(e) => setConfig({...config, size: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50" />
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-bold text-slate-400 uppercase">Speed</label>
                    <span className="text-lg font-black text-blue-400">{config.speed}x</span>
                  </div>
                  <input type="range" min="1" max="50" value={config.speed} onChange={(e) => setConfig({...config, speed: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Competitors</label>
                <div className="flex flex-wrap gap-2">
                  {ALGORITHMS.map(algo => (
                    <button key={algo.id} disabled={isRunning} onClick={() => handleAlgoToggle(algo.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        config.selectedAlgos.includes(algo.id) ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {algo.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col gap-4 h-full justify-center">
            <button onClick={startRace} disabled={isRunning || isFinished || lanes.length === 0}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-xl shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed">
              <IconPlay /> {isRunning ? 'RACING...' : 'START RACE'}
            </button>
            <button onClick={initRace} disabled={isRunning}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-md rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <IconZap /> Shuffle Data
            </button>
            
            <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-300">Enforce Stability</span>
                <button onClick={() => setConfig({...config, isStable: !config.isStable})} disabled={isRunning}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.isStable ? 'bg-blue-500' : 'bg-slate-600'} disabled:opacity-50`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.isStable ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-tight">
                {config.isStable ? "Stable algorithms maintain relative order of equal keys." : "Unstable algorithms may swap equal keys."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Race Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lanes.map(lane => (
          <div key={lane.id} className={`bg-slate-900 rounded-2xl border ${lane.status === 'finished' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-800'} p-5 flex flex-col relative overflow-hidden transition-all`}>
            {lane.status === 'finished' && lane.finishRank && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 rounded-bl-lg z-10">
                RANK #{lane.finishRank}
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {lane.name}
                  {lane.status === 'running' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
                </h3>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded uppercase">{lane.expectedTime}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${lane.isStable ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                    {lane.isStable ? 'Stable' : 'Unstable'}
                  </span>
                </div>
              </div>
              
              <div className="text-right flex gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Comps</span>
                  <span className="text-sm font-mono text-slate-300">{lane.stats.comps}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Swaps/Writes</span>
                  <span className="text-sm font-mono text-slate-300">{lane.stats.swaps + lane.stats.writes}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 h-40 flex items-end gap-[1px] bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
              {lane.array.map((val, idx) => {
                const isActive = lane.activeIndices.includes(idx);
                const isFinished = lane.status === 'finished';
                return (
                  <div key={idx} 
                    className={`flex-1 rounded-t-sm transition-colors duration-75 ${
                      isActive ? 'bg-blue-400' : isFinished ? 'bg-emerald-500' : 'bg-indigo-500/80'
                    }`}
                    style={{ height: `${val}%` }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {lanes.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
            Select at least one competitor to start the race.
          </div>
        )}
      </div>
    </div>
  );
}

function TheoryView() {
  const [activeAlgoId, setActiveAlgoId] = useState<string>(ALGORITHMS[0].id);
  const activeAlgo = ALGORITHMS.find(a => a.id === activeAlgoId)!;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Algorithm Reference Guide</h2>
        <p className="text-slate-400 max-w-3xl leading-relaxed">
          Understanding the theoretical foundation of sorting algorithms is crucial for choosing the right tool for the job. 
          Use this reference to explore time/space complexities, stability, and ideal use cases.
        </p>
      </section>

      <section className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden sticky top-6">
            <div className="p-4 bg-slate-800/50 border-b border-slate-800 font-semibold text-slate-400 uppercase tracking-wider text-xs">
              Algorithms
            </div>
            <ul className="divide-y divide-slate-800">
              {ALGORITHMS.map((algo) => (
                <li key={algo.id}>
                  <button onClick={() => setActiveAlgoId(algo.id)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                      activeAlgoId === algo.id ? 'bg-indigo-900/30 text-indigo-300 border-l-4 border-indigo-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                    }`}>
                    {algo.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">{activeAlgo.name}</h2>
                <span className="inline-block mt-2 px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-widest rounded-md">
                  {activeAlgo.type}
                </span>
              </div>
            </div>
            <p className="text-lg text-slate-400 leading-relaxed">{activeAlgo.description}</p>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Complexity</h3>
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
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Space (Memory)</div>
                  <ComplexityBadge value={activeAlgo.spaceComplexity} type="space" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Properties</h3>
              <ul className="space-y-4">
                <li className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-medium text-slate-300">Stable Sort</span>
                  {activeAlgo.stable ? <IconCheck /> : <IconX />}
                </li>
                <li className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="font-medium text-slate-300">In-Place</span>
                  {activeAlgo.inPlace ? <IconCheck /> : <IconX />}
                </li>
              </ul>
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-1">Ideal For</h4>
                  <p className="text-sm text-slate-400">{activeAlgo.idealFor}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-1">Pitfalls</h4>
                  <p className="text-sm text-slate-400">{activeAlgo.pitfalls}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState('hero');
  const [config, setConfig] = useState<Config>({
    size: 50,
    speed: 10,
    dataset: 'random',
    isStable: true,
    selectedAlgos: ['bubble', 'merge', 'quick']
  });

  const tabs = [
    { id: 'hero', label: 'Home', icon: <IconZap /> },
    { id: 'race', label: 'Race Track', icon: <IconBarChart /> },
    { id: 'theory', label: 'Theory', icon: <IconBook /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-blue-900/50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
              <IconBarChart />
            </div>
            Sorting Race
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">System Status</div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
              <span className="text-sm font-medium text-slate-300">Engine Ready</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {activeTab === 'hero' && <HeroView onNavigate={setActiveTab} />}
        {activeTab === 'race' && <RaceView config={config} setConfig={setConfig} />}
        {activeTab === 'theory' && <TheoryView />}
      </main>
    </div>
  );
}