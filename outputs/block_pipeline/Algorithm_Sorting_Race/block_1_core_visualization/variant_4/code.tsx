import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Constants ---
type AlgoState = {
  arr: number[];
  active: number[];
  ops: number;
  finished: boolean;
};

type LaneData = AlgoState & {
  id: string;
  name: string;
  isStable: boolean;
  rank: number | null;
  timeMs: number | null;
};

type DatasetType = 'random' | 'nearly_sorted' | 'reversed' | 'few_uniques';

// --- Algorithm Generators ---
// Generators yield the current state of the array, active indices for highlighting, and operation count.

function* bubbleSort(array: number[]): Generator<AlgoState> {
  let arr = [...array];
  let ops = 0;
  let n = arr.length;
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let i = 0; i < n - 1; i++) {
      ops++;
      yield { arr: [...arr], active: [i, i + 1], ops, finished: false };
      if (arr[i] > arr[i + 1]) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        ops++;
        swapped = true;
        yield { arr: [...arr], active: [i, i + 1], ops, finished: false };
      }
    }
    n--;
  }
  yield { arr, active: [], ops, finished: true };
}

function* insertionSort(array: number[]): Generator<AlgoState> {
  let arr = [...array];
  let ops = 0;
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i];
    let j = i - 1;
    ops++;
    yield { arr: [...arr], active: [i, j], ops, finished: false };
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
      ops++;
      yield { arr: [...arr], active: [j + 1, j], ops, finished: false };
    }
    arr[j + 1] = key;
    ops++;
    yield { arr: [...arr], active: [j + 1], ops, finished: false };
  }
  yield { arr, active: [], ops, finished: true };
}

function* mergeSort(array: number[]): Generator<AlgoState> {
  let arr = [...array];
  let ops = 0;

  function* merge(left: number, mid: number, right: number): Generator<AlgoState> {
    let temp = [];
    let i = left, j = mid + 1;
    while (i <= mid && j <= right) {
      ops++;
      yield { arr: [...arr], active: [i, j], ops, finished: false };
      if (arr[i] <= arr[j]) {
        temp.push(arr[i++]);
      } else {
        temp.push(arr[j++]);
      }
    }
    while (i <= mid) {
      ops++;
      temp.push(arr[i++]);
    }
    while (j <= right) {
      ops++;
      temp.push(arr[j++]);
    }
    for (let k = 0; k < temp.length; k++) {
      arr[left + k] = temp[k];
      ops++;
      yield { arr: [...arr], active: [left + k], ops, finished: false };
    }
  }

  function* sort(left: number, right: number): Generator<AlgoState> {
    if (left < right) {
      let mid = Math.floor((left + right) / 2);
      yield* sort(left, mid);
      yield* sort(mid + 1, right);
      yield* merge(left, mid, right);
    }
  }

  yield* sort(0, arr.length - 1);
  yield { arr, active: [], ops, finished: true };
}

function* quickSort(array: number[]): Generator<AlgoState> {
  let arr = [...array];
  let ops = 0;

  function* partition(low: number, high: number): Generator<any> {
    let pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      ops++;
      yield { arr: [...arr], active: [j, high], ops, finished: false };
      if (arr[j] < pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        ops++;
        yield { arr: [...arr], active: [i, j], ops, finished: false };
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    ops++;
    yield { arr: [...arr], active: [i + 1, high], ops, finished: false };
    return i + 1;
  }

  function* sort(low: number, high: number): Generator<AlgoState> {
    if (low < high) {
      let pi: number = yield* partition(low, high);
      yield* sort(low, pi - 1);
      yield* sort(pi + 1, high);
    }
  }

  yield* sort(0, arr.length - 1);
  yield { arr, active: [], ops, finished: true };
}

function* heapSort(array: number[]): Generator<AlgoState> {
  let arr = [...array];
  let ops = 0;
  let n = arr.length;

  function* heapify(n: number, i: number): Generator<AlgoState> {
    let largest = i;
    let l = 2 * i + 1;
    let r = 2 * i + 2;

    ops++;
    yield { arr: [...arr], active: [i, l, r], ops, finished: false };

    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;

    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      ops++;
      yield { arr: [...arr], active: [i, largest], ops, finished: false };
      yield* heapify(n, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    ops++;
    yield { arr: [...arr], active: [0, i], ops, finished: false };
    yield* heapify(i, 0);
  }

  yield { arr, active: [], ops, finished: true };
}

function* radixSort(array: number[]): Generator<AlgoState> {
  let arr = [...array];
  let ops = 0;
  let max = Math.max(...arr);

  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    let output = new Array(arr.length).fill(0);
    let count = new Array(10).fill(0);

    for (let i = 0; i < arr.length; i++) {
      ops++;
      count[Math.floor(arr[i] / exp) % 10]++;
      yield { arr: [...arr], active: [i], ops, finished: false };
    }

    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1];
    }

    for (let i = arr.length - 1; i >= 0; i--) {
      ops++;
      let idx = Math.floor(arr[i] / exp) % 10;
      output[count[idx] - 1] = arr[i];
      count[idx]--;
    }

    for (let i = 0; i < arr.length; i++) {
      ops++;
      arr[i] = output[i];
      yield { arr: [...arr], active: [i], ops, finished: false };
    }
  }
  yield { arr, active: [], ops, finished: true };
}

// --- Main App Component ---

export default function App() {
  const [arraySize, setArraySize] = useState<number>(40);
  const [speed, setSpeed] = useState<number>(80); // 1 to 100
  const [datasetType, setDatasetType] = useState<DatasetType>('random');
  const [showStability, setShowStability] = useState<boolean>(false);
  
  const [isRacing, setIsRacing] = useState<boolean>(false);
  const [raceFinished, setRaceFinished] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);

  const stopRaceRef = useRef<boolean>(false);

  // Initial Data
  const generateData = useCallback((size: number, type: DatasetType) => {
    let arr: number[] = [];
    const maxVal = 200;
    if (type === 'random') {
      arr = Array.from({ length: size }, () => Math.floor(Math.random() * maxVal) + 10);
    } else if (type === 'nearly_sorted') {
      arr = Array.from({ length: size }, (_, i) => Math.floor((i / size) * maxVal) + 10);
      for (let i = 0; i < size * 0.1; i++) {
        const idx1 = Math.floor(Math.random() * size);
        const idx2 = Math.floor(Math.random() * size);
        [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
      }
    } else if (type === 'reversed') {
      arr = Array.from({ length: size }, (_, i) => Math.floor(((size - i) / size) * maxVal) + 10);
    } else if (type === 'few_uniques') {
      const uniques = [20, 60, 100, 140, 180];
      arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
    }
    return arr;
  }, []);

  const initLanes = useCallback((arr: number[]) => {
    return [
      { id: 'bubble', name: 'Bubble Sort', arr: [...arr], active: [], ops: 0, finished: false, rank: null, timeMs: null, isStable: true },
      { id: 'insertion', name: 'Insertion Sort', arr: [...arr], active: [], ops: 0, finished: false, rank: null, timeMs: null, isStable: true },
      { id: 'merge', name: 'Merge Sort', arr: [...arr], active: [], ops: 0, finished: false, rank: null, timeMs: null, isStable: true },
      { id: 'quick', name: 'Quick Sort', arr: [...arr], active: [], ops: 0, finished: false, rank: null, timeMs: null, isStable: false },
      { id: 'heap', name: 'Heap Sort', arr: [...arr], active: [], ops: 0, finished: false, rank: null, timeMs: null, isStable: false },
      { id: 'radix', name: 'Radix Sort', arr: [...arr], active: [], ops: 0, finished: false, rank: null, timeMs: null, isStable: true },
    ];
  }, []);

  const [lanes, setLanes] = useState<LaneData[]>(() => initLanes(generateData(40, 'random')));

  const handleShuffle = () => {
    stopRaceRef.current = true;
    setIsRacing(false);
    setRaceFinished(false);
    const newData = generateData(arraySize, datasetType);
    setLanes(initLanes(newData));
  };

  useEffect(() => {
    handleShuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arraySize, datasetType]);

  const startRace = async () => {
    if (isRacing) return;
    
    // Reset if previously finished
    let currentLanes = lanes;
    if (raceFinished) {
      const newData = generateData(arraySize, datasetType);
      currentLanes = initLanes(newData);
      setLanes(currentLanes);
    }

    setIsRacing(true);
    setRaceFinished(false);
    stopRaceRef.current = false;
    const startT = performance.now();
    setStartTime(startT);

    const generators = {
      'bubble': bubbleSort([...currentLanes.find(l => l.id === 'bubble')!.arr]),
      'insertion': insertionSort([...currentLanes.find(l => l.id === 'insertion')!.arr]),
      'merge': mergeSort([...currentLanes.find(l => l.id === 'merge')!.arr]),
      'quick': quickSort([...currentLanes.find(l => l.id === 'quick')!.arr]),
      'heap': heapSort([...currentLanes.find(l => l.id === 'heap')!.arr]),
      'radix': radixSort([...currentLanes.find(l => l.id === 'radix')!.arr]),
    };

    let activeLanes = [...currentLanes];
    let rankCounter = 1;

    const runStep = async () => {
      let allDone = true;
      let nextLanes = [...activeLanes];

      for (let i = 0; i < nextLanes.length; i++) {
        let lane = nextLanes[i];
        if (!lane.finished) {
          allDone = false;
          // Step proportion based on speed to make fast algos finish reasonably fast visually
          // Higher speed = process more steps per frame
          const stepsPerFrame = Math.max(1, Math.floor(speed / 10));
          
          let result;
          for(let s=0; s<stepsPerFrame; s++) {
             result = generators[lane.id as keyof typeof generators].next();
             if(result.done || result.value.finished) break;
          }

          if (result && result.value) {
            nextLanes[i] = { ...lane, ...result.value };
            if (result.value.finished && !lane.finished) {
              nextLanes[i].rank = rankCounter++;
              nextLanes[i].timeMs = performance.now() - startT;
            }
          }
        }
      }

      setLanes(nextLanes);
      activeLanes = nextLanes;

      if (stopRaceRef.current) return;

      if (!allDone) {
        const delay = Math.max(0, 100 - speed);
        if (delay === 0) {
          requestAnimationFrame(runStep);
        } else {
          setTimeout(runStep, delay);
        }
      } else {
        setIsRacing(false);
        setRaceFinished(true);
      }
    };

    runStep();
  };

  const stopRace = () => {
    stopRaceRef.current = true;
    setIsRacing(false);
  };

  // UI Components
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-6 selection:bg-rose-200">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="bg-slate-50 border-2 border-slate-900 p-6 rounded-xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase border-b-4 border-rose-500 inline-block">Sorting Race 2.0</h1>
              <p className="text-slate-600 font-medium mt-2">The Ultimate Algorithm Showdown (ChatGPT Edition)</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={isRacing ? stopRace : startRace}
                className={`px-6 py-2 border-2 border-slate-900 font-bold rounded-md shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform active:translate-y-1 active:shadow-none ${isRacing ? 'bg-amber-400' : 'bg-emerald-400'}`}
              >
                {isRacing ? 'Stop Race' : 'Start Race'}
              </button>
              <button 
                onClick={handleShuffle}
                disabled={isRacing}
                className="px-6 py-2 bg-rose-400 border-2 border-slate-900 font-bold rounded-md shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              >
                Shuffle / Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider">Dataset</label>
              <select 
                value={datasetType} 
                onChange={(e) => setDatasetType(e.target.value as DatasetType)}
                disabled={isRacing}
                className="w-full bg-white border-2 border-slate-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 font-medium"
              >
                <option value="random">Random Chaos</option>
                <option value="nearly_sorted">Nearly Sorted</option>
                <option value="reversed">Reversed (Worst Case)</option>
                <option value="few_uniques">Few Uniques</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider flex justify-between">
                <span>Array Size</span>
                <span>{arraySize}</span>
              </label>
              <input 
                type="range" min="10" max="100" 
                value={arraySize} 
                onChange={(e) => setArraySize(Number(e.target.value))}
                disabled={isRacing}
                className="w-full h-2 bg-slate-200 border border-slate-900 rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider flex justify-between">
                <span>Speed</span>
                <span>{speed}%</span>
              </label>
              <input 
                type="range" min="1" max="100" 
                value={speed} 
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 border border-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
              />
            </div>
            <div className="flex items-center space-x-2 pb-2">
              <input 
                type="checkbox" id="stability-toggle" 
                checked={showStability}
                onChange={(e) => setShowStability(e.target.checked)}
                className="w-5 h-5 accent-rose-500 border-2 border-slate-900 rounded cursor-pointer"
              />
              <label htmlFor="stability-toggle" className="text-sm font-bold uppercase tracking-wider cursor-pointer select-none">
                Highlight Stable Algos
              </label>
            </div>
          </div>
        </div>

        {/* Stability Info Card */}
        {showStability && (
          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl text-rose-900 animate-fade-in flex items-start gap-4">
             <div className="text-2xl pt-1">⚖️</div>
             <div>
               <h3 className="font-bold text-lg">What is Stability?</h3>
               <p className="text-sm mt-1 font-medium opacity-90">
                 A stable sorting algorithm maintains the relative order of records with equal keys. 
                 Algorithms highlighted with a <span className="bg-rose-200 px-1 rounded text-rose-900 border border-rose-300">Rose Badge</span> below are naturally stable. 
                 Quick and Heap sort are inherently unstable as they swap elements across long distances.
               </p>
             </div>
          </div>
        )}

        {/* Race Tracks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lanes.map((lane) => (
            <div 
              key={lane.id} 
              className={`relative bg-white border-2 ${lane.finished ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-800'} rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col transition-colors duration-300`}
            >
              {/* Lane Header */}
              <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black uppercase tracking-wide">{lane.name}</h2>
                  {showStability && lane.isStable && (
                    <span className="text-[