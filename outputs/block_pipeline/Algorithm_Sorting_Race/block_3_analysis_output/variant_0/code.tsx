import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---

type DatasetType = 'random' | 'nearly_sorted' | 'reversed' | 'few_uniques';

interface Config {
  size: number;
  speed: number;
  dataset: DatasetType;
  checkStability: boolean;
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

// --- Algorithm Implementations (Pure Functions returning Actions) ---

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

const algorithms = {
  bubble: (input: number[]): Action[] => {
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

  insertion: (input: number[]): Action[] => {
    const arr = [...input];
    const rec = new Recorder();
    const n = arr.length;
    for (let i = 1; i < n; i++) {
      let key = arr[i];
      let j = i - 1;
      while (j >= 0) {
        rec.comp(j, i); // Approximate comparison for visualization
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

  merge: (input: number[]): Action[] => {
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
      while (i < left.length) {
        rec.write(arr, k, left[i]);
        i++;
        k++;
      }
      while (j < right.length) {
        rec.write(arr, k, right[j]);
        j++;
        k++;
      }
    };

    mergeSort(0, arr.length - 1);
    return rec.frames;
  },

  quick: (input: number[]): Action[] => {
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

  heap: (input: number[]): Action[] => {
    const arr = [...input];
    const rec = new Recorder();
    const n = arr.length;

    const heapify = (n: number, i: number) => {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < n) {
        rec.comp(l, largest);
        if (arr[l] > arr[largest]) largest = l;
      }
      if (r < n) {
        rec.comp(r, largest);
        if (arr[r] > arr[largest]) largest = r;
      }
      if (largest !== i) {
        rec.swap(arr, i, largest);
        heapify(n, largest);
      }
    };

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      heapify(n, i);
    }
    for (let i = n - 1; i > 0; i--) {
      rec.swap(arr, 0, i);
      heapify(i, 0);
    }
    return rec.frames;
  },

  radix: (input: number[]): Action[] => {
    const arr = [...input];
    const rec = new Recorder();
    const max = Math.max(...arr);

    const countSort = (exp: number) => {
      const output = new Array(arr.length).fill(0);
      const count = new Array(10).fill(0);

      for (let i = 0; i < arr.length; i++) {
        count[Math.floor(arr[i] / exp) % 10]++;
      }
      for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        const idx = Math.floor(arr[i] / exp) % 10;
        output[count[idx] - 1] = arr[i];
        count[idx]--;
      }
      for (let i = 0; i < arr.length; i++) {
        rec.write(arr, i, output[i]);
      }
    };

    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      countSort(exp);
    }
    return rec.frames;
  }
};

// --- Helper Functions ---

const generateData = (size: number, type: DatasetType): number[] => {
  let arr: number[] = [];
  if (type === 'random') {
    arr = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);
  } else if (type === 'nearly_sorted') {
    arr = Array.from({ length: size }, (_, i) => Math.floor((i / size) * 90) + 10);
    for (let i = 0; i < size / 10; i++) {
      const idx1 = Math.floor(Math.random() * size);
      const idx2 = Math.floor(Math.random() * size);
      [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
    }
  } else if (type === 'reversed') {
    arr = Array.from({ length: size }, (_, i) => Math.floor(((size - i) / size) * 90) + 10);
  } else if (type === 'few_uniques') {
    const uniques = [20, 40, 60, 80];
    arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }
  return arr;
};

const ALGO_DEFS = [
  { id: 'bubble', name: 'Bubble Sort', isStable: true, expectedTime: 'O(n²)' },
  { id: 'insertion', name: 'Insertion Sort', isStable: true, expectedTime: 'O(n²)' },
  { id: 'merge', name: 'Merge Sort', isStable: true, expectedTime: 'O(n log n)' },
  { id: 'quick', name: 'Quick Sort', isStable: false, expectedTime: 'O(n log n)' },
  { id: 'heap', name: 'Heap Sort', isStable: false, expectedTime: 'O(n log n)' },
  { id: 'radix', name: 'Radix Sort', isStable: true, expectedTime: 'O(nk)' },
];

// --- Main Component ---

export default function App() {
  const [config, setConfig] = useState<Config>({
    size: 40,
    speed: 5,
    dataset: 'random',
    checkStability: false,
  });

  const [lanes, setLanes] = useState<LaneState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [baseArray, setBaseArray] = useState<number[]>([]);

  const requestRef = useRef<number>();
  const lanesRef = useRef<LaneState[]>([]);
  const rankCounterRef = useRef<number>(1);

  // Initialize Data
  const initRace = useCallback(() => {
    const newBase = generateData(config.size, config.dataset);
    setBaseArray(newBase);
    
    const initialLanes: LaneState[] = ALGO_DEFS.map(def => ({
      ...def,
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
  }, [config.size, config.dataset]);

  useEffect(() => {
    initRace();
  }, [initRace]);

  // Start Race
  const startRace = () => {
    if (isRunning) return;
    
    // Pre-compute frames for all algorithms
    const preparedLanes = lanes.map(lane => {
      const frames = algorithms[lane.id as keyof typeof algorithms]([...lane.originalArray]);
      return { ...lane, frames, status: 'running' as const, frameIdx: 0, stats: { comps: 0, swaps: 0, writes: 0 } };
    });
    
    setLanes(preparedLanes);
    lanesRef.current = preparedLanes;
    setIsRunning(true);
    setIsFinished(false);
    rankCounterRef.current = 1;
    
    requestRef.current = requestAnimationFrame(playbackLoop);
  };

  // Playback Engine
  const playbackLoop = () => {
    let allFinished = true;
    let updated = false;

    const currentLanes = [...lanesRef.current];

    for (let i = 0; i < currentLanes.length; i++) {
      const lane = { ...currentLanes[i] };
      
      if (lane.status === 'running') {
        allFinished = false;
        updated = true;
        
        // Process multiple frames per tick based on speed
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
      // Clear active indices
      setLanes(prev => prev.map(l => ({ ...l, activeIndices: [] })));
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- UI Components ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header & Controls */}
      <header className="bg-white border-b border-slate-200 shadow-sm p-4 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sorting Race 2.0</h1>
            <p className="text-sm text-slate-500 font-medium">Analysis & Output Module</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
            <div className="flex flex-col px-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Dataset</label>
              <select 
                disabled={isRunning}
                value={config.dataset}
                onChange={(e) => setConfig({...config, dataset: e.target.value as DatasetType})}
                className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
              >
                <option value="random">Random</option>
                <option value="nearly_sorted">Nearly Sorted</option>
                <option value="reversed">Reversed</option>
                <option value="few_uniques">Few Uniques</option>
              </select>
            </div>

            <div className="w-px h-8 bg-slate-300"></div>

            <div className="flex flex-col px-2 w-32">
              <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                <span>Size</span> <span>{config.size}</span>
              </label>
              <input 
                type="range" min="10" max="100" step="10"
                disabled={isRunning}
                value={config.size}
                onChange={(e) => setConfig({...config, size: parseInt(e.target.value)})}
                className="accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="w-px h-8 bg-slate-300"></div>

            <div className="flex flex-col px-2 w-32">
              <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                <span>Speed</span> <span>{config.speed}x</span>
              </label>
              <input 
                type="range" min="1" max="20" step="1"
                value={config.speed}
                onChange={(e) => setConfig({...config, speed: parseInt(e.target.value)})}
                className="accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="w-px h-8 bg-slate-300"></div>

            <button 
              onClick={initRace} disabled={isRunning}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Shuffle
            </button>
            <button 
              onClick={startRace} disabled={isRunning || isFinished}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Racing...' : 'Start Race'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Race Tracks (2 Columns) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lan