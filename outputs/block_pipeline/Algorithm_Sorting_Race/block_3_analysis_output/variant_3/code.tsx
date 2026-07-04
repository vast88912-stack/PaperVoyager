import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, BarChart2, Info, CheckCircle2, XCircle, Clock, Zap, Target } from 'lucide-react';

// --- Types ---
type DataItem = { value: number; id: number; isDuplicate: boolean };
type OpType = 'compare' | 'swap' | 'write' | 'read';
type Operation = { type: OpType; indices: number[]; data?: DataItem[] };

interface Algorithm {
  id: string;
  name: string;
  color: string;
  darkColor: string;
  complexity: { best: string; avg: string; worst: string; space: string };
  isStable: boolean;
  fn: (arr: DataItem[]) => Operation[];
}

interface LaneState {
  id: string;
  name: string;
  color: string;
  darkColor: string;
  array: DataItem[];
  activeIndices: number[];
  comps: number;
  writes: number; // Swaps count as 2 writes usually, but we track operations
  status: 'idle' | 'running' | 'finished';
  rank?: number;
  runTime?: number;
  stabilityPreserved?: boolean;
}

// --- Algorithms Implementation (Pure functions returning operations) ---
const bubbleSort = (arr: DataItem[]): Operation[] => {
  const ops: Operation[] = [];
  const a = [...arr];
  let n = a.length;
  let swapped;
  do {
    swapped = false;
    for (let i = 0; i < n - 1; i++) {
      ops.push({ type: 'compare', indices: [i, i + 1] });
      if (a[i].value > a[i + 1].value) {
        ops.push({ type: 'swap', indices: [i, i + 1] });
        let temp = a[i];
        a[i] = a[i + 1];
        a[i + 1] = temp;
        swapped = true;
      }
    }
    n--;
  } while (swapped);
  return ops;
};

const insertionSort = (arr: DataItem[]): Operation[] => {
  const ops: Operation[] = [];
  const a = [...arr];
  for (let i = 1; i < a.length; i++) {
    let key = a[i];
    let j = i - 1;
    ops.push({ type: 'read', indices: [i] });
    while (j >= 0) {
      ops.push({ type: 'compare', indices: [j, i] }); // comparing with key conceptually
      if (a[j].value > key.value) {
        ops.push({ type: 'write', indices: [j + 1], data: [a[j]] });
        a[j + 1] = a[j];
        j = j - 1;
      } else {
        break;
      }
    }
    ops.push({ type: 'write', indices: [j + 1], data: [key] });
    a[j + 1] = key;
  }
  return ops;
};

const mergeSort = (arr: DataItem[]): Operation[] => {
  const ops: Operation[] = [];
  const a = [...arr];

  const merge = (left: number, mid: number, right: number) => {
    let n1 = mid - left + 1;
    let n2 = right - mid;
    let L = new Array(n1);
    let R = new Array(n2);

    for (let i = 0; i < n1; i++) L[i] = a[left + i];
    for (let j = 0; j < n2; j++) R[j] = a[mid + 1 + j];

    let i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
      ops.push({ type: 'compare', indices: [left + i, mid + 1 + j] });
      if (L[i].value <= R[j].value) {
        ops.push({ type: 'write', indices: [k], data: [L[i]] });
        a[k] = L[i];
        i++;
      } else {
        ops.push({ type: 'write', indices: [k], data: [R[j]] });
        a[k] = R[j];
        j++;
      }
      k++;
    }
    while (i < n1) {
      ops.push({ type: 'write', indices: [k], data: [L[i]] });
      a[k] = L[i];
      i++;
      k++;
    }
    while (j < n2) {
      ops.push({ type: 'write', indices: [k], data: [R[j]] });
      a[k] = R[j];
      j++;
      k++;
    }
  };

  const sort = (left: number, right: number) => {
    if (left >= right) return;
    let mid = left + Math.floor((right - left) / 2);
    sort(left, mid);
    sort(mid + 1, right);
    merge(left, mid, right);
  };

  sort(0, a.length - 1);
  return ops;
};

const quickSort = (arr: DataItem[]): Operation[] => {
  const ops: Operation[] = [];
  const a = [...arr];

  const partition = (low: number, high: number) => {
    let pivot = a[high];
    ops.push({ type: 'read', indices: [high] });
    let i = low - 1;
    for (let j = low; j < high; j++) {
      ops.push({ type: 'compare', indices: [j, high] });
      if (a[j].value < pivot.value) {
        i++;
        ops.push({ type: 'swap', indices: [i, j] });
        let temp = a[i];
        a[i] = a[j];
        a[j] = temp;
      }
    }
    ops.push({ type: 'swap', indices: [i + 1, high] });
    let temp = a[i + 1];
    a[i + 1] = a[high];
    a[high] = temp;
    return i + 1;
  };

  const sort = (low: number, high: number) => {
    if (low < high) {
      let pi = partition(low, high);
      sort(low, pi - 1);
      sort(pi + 1, high);
    }
  };

  sort(0, a.length - 1);
  return ops;
};

// Heap and Radix omitted for brevity to focus on Analysis UI complexity, 
// but Quick/Merge/Insertion/Bubble provide enough variation for stats.

const ALGORITHMS: Algorithm[] = [
  { id: 'insertion', name: 'Insertion Sort', color: 'bg-blue-400', darkColor: 'bg-blue-600', isStable: true, complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }, fn: insertionSort },
  { id: 'merge', name: 'Merge Sort', color: 'bg-emerald-400', darkColor: 'bg-emerald-600', isStable: true, complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' }, fn: mergeSort },
  { id: 'quick', name: 'Quick Sort', color: 'bg-purple-400', darkColor: 'bg-purple-600', isStable: false, complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' }, fn: quickSort },
  { id: 'bubble', name: 'Bubble Sort', color: 'bg-rose-400', darkColor: 'bg-rose-600', isStable: true, complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }, fn: bubbleSort },
];

// --- Helper Functions ---
const generateDataset = (size: number, type: 'random' | 'nearlySorted' | 'reversed' | 'fewUniques'): DataItem[] => {
  let arr: number[] = [];
  if (type === 'random') {
    arr = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
  } else if (type === 'nearlySorted') {
    arr = Array.from({ length: size }, (_, i) => Math.floor((i / size) * 100) + 1);
    for (let i = 0; i < size * 0.1; i++) {
      let idx1 = Math.floor(Math.random() * size);
      let idx2 = Math.floor(Math.random() * size);
      [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
    }
  } else if (type === 'reversed') {
    arr = Array.from({ length: size }, (_, i) => 100 - Math.floor((i / size) * 100));
  } else if (type === 'fewUniques') {
    const uniques = [10, 30, 50, 70, 90];
    arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }

  // Map to DataItem to track stability
  const valCounts: Record<number, number> = {};
  return arr.map((val, idx) => {
    valCounts[val] = (valCounts[val] || 0) + 1;
    return { value: val, id: idx, isDuplicate: valCounts[val] > 1 };
  });
};

const checkStability = (arr: DataItem[]): boolean => {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].value === arr[i - 1].value && arr[i].id < arr[i - 1].id) {
      return false;
    }
  }
  return true;
};

// --- Main Component ---
export default function App() {
  const [arraySize, setArraySize] = useState(40);
  const [speed, setSpeed] = useState(50);
  const [datasetType, setDatasetType] = useState<'random' | 'nearlySorted' | 'reversed' | 'fewUniques'>('random');
  const [baseArray, setBaseArray] = useState<DataItem[]>([]);
  const [lanes, setLanes] = useState<LaneState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [raceStartTime, setRaceStartTime] = useState<number | null>(null);

  // Refs for race loop mutability without re-renders during calculation
  const requestRef = useRef<number>();
  const raceStateRef = useRef<{
    [id: string]: { ops: Operation[]; opIdx: number; array: DataItem[]; comps: number; writes: number; finished: boolean; finishRank: number; finishTime: number }
  }>({});
  const finishedCountRef = useRef(0);

  // Initialize
  useEffect(() => {
    handleReset();
  }, [arraySize, datasetType]);

  const handleReset = useCallback(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setIsRunning(false);
    setIsFinished(false);
    setRaceStartTime(null);
    finishedCountRef.current = 0;

    const newBase = generateDataset(arraySize, datasetType);
    setBaseArray(newBase);

    const initialLanes: LaneState[] = ALGORITHMS.map(a => ({
      id: a.id,
      name: a.name,
      color: a.color,
      darkColor: a.darkColor,
      array: [...newBase],
      activeIndices: [],
      comps: 0,
      writes: 0,
      status: 'idle',
    }));
    setLanes(initialLanes);
  }, [arraySize, datasetType]);

  const startRace = () => {
    if (isRunning) return;
    setIsFinished(false);
    setIsRunning(true);
    setRaceStartTime(performance.now());
    finishedCountRef.current = 0;

    // Pre-calculate all operations
    const initialRaceState: any = {};
    ALGORITHMS.forEach(algo => {
      initialRaceState[algo.id] = {
        ops: algo.fn([...baseArray]),
        opIdx: 0,
        array: [...baseArray],
        comps: 0,
        writes: 0,
        finished: false,
        finishRank: 0,
        finishTime: 0,
      };
    });
    raceStateRef.current = initialRaceState;

    setLanes(lanes.map(l => ({ ...l, status: 'running', comps: 0, writes: 0, activeIndices: [], rank: undefined, runTime: undefined })));
    requestRef.current = requestAnimationFrame(raceLoop);
  };

  const raceLoop = (timestamp: number) => {
    let allFinished = true;
    const opsPerFrame = Math.max(1, Math.floor(speed / 5)); // Scale speed

    const updatedLanesData: Partial<LaneState>[] = [];

    ALGORITHMS.forEach(algo => {
      const state = raceStateRef.current[algo.id];
      if (state.finished) {
        updatedLanesData.push({ id: algo.id });
        return;
      }

      allFinished = false;
      let activeIdxs: number[] = [];

      // Process multiple ops per frame to speed up
      for (let i = 0; i < opsPerFrame; i++) {
        if (state.opIdx >= state.ops.length) {
          state.finished = true;
          finishedCountRef.current += 1;
          state.finishRank = finishedCountRef.current;
          state.finishTime = performance.now() - (raceStartTime || performance.now());
          break;
        }

        const op = state.ops[state.opIdx];
        activeIdxs = op.indices;

        if (op.type === 'compare') state.comps++;
        if (op.type === 'swap' || op.type === 'write') state.writes++;

        if (op.type === 'swap') {
          const [idx1, idx2] = op.indices;
          const temp = state.array[idx1];
          state.array[idx1] = state.array[idx2];
          state.array[idx2] = temp;
        } else if (op.type === 'write' && op.data) {
          state.array[op.indices[0]] = op.data[0];
        }
        state.opIdx++;
      }

      updatedLanesData.push({
        id: algo.id,
        array: [...state.array],
        comps: state.comps,
        writes: state.writes,
        activeIndices: activeIdxs,
        status: state.finished ? 'finished' : 'running',
        rank: state.finishRank > 0 ? state.finishRank : undefined,
        runTime: state.finishTime > 0 ? state.finishTime : undefined,
        stabilityPreserved: state.finished ? checkStability(state.array) : undefined,
      });
    });

    // Update React State
    setLanes(prev => prev.map(lane => {
      const update = updatedLanesData.find(u => u.id === lane.id);
      return update ? { ...lane, ...update } : lane;
    }));

    if (!allFinished) {
      requestRef.current = requestAnimationFrame(raceLoop);
    } else {
      setIsRunning(false);
      setIsFinished(true);
    }
  };

  // --- Subcomponents for clean structure ---
  const DataInfoCard = () => (
    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Target size={16} className="text-blue-500" /> Dataset Analysis
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-500 block text-xs">Type</span>
          <span className="font-semibold text-slate-800 capitalize">{datasetType.replace(/([A-Z])/g, ' $1').trim()}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs">Size</span>
          <span className="font-semibold text-slate-800">{arraySize} elements</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-600 border-t border-slate-200 pt-3">
        {datasetType === 'nearlySorted' && "Notice how Insertion Sort excels here, approaching O(n) time, while Quick Sort might degrade depending on pivot selection."}
        {datasetType === 'reversed' && "Worst-case scenario for Insertion and Bubble sort. Watch the operation counts explode compared to Merge Sort."}
        {datasetType === 'random' && "A standard test. O(n log n) algorithms (Merge/Quick) should easily pull ahead of O(n²) algorithms."}
        {datasetType === 'fewUniques' && "Observe how stable algorithms handle duplicates (marked visually). Quick sort often performs unnecessary swaps here."}
      </p>
    </div>
  );

  const SummaryTable = () => {
    // Sort lanes by rank if finished, else by operation count proxy
    const sortedLanes = [...lanes].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      return (a.comps + a.writes) - (b.comps + b.writes);
    });

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden flex-grow flex flex-col">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart2 size={18} /> Race Telemetry & Output
          </h3>
          {isFinished && <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">Race Complete</span>}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="p-3 font-medium">Rank</th>
                <th className="p-3 font-medium">Algorithm</th>
                <th className="p-3 font-medium text-right">Operations</th>
                <th className="p-3 font-medium text-center">Stability</th>
                <th className="p-3 font-medium text-right">Simulated Time</th>
              </tr>
            </thead>
            <tbody>
              {sortedLanes.map((lane, idx) => (
                <tr key={lane.id} className={`border-b border-slate-100 transition-colors ${lane.status === 'running' ? 'bg-blue-50/30' : ''} hover:bg-slate-50`}>
                  <td className="p-3">
                    {lane.rank ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font