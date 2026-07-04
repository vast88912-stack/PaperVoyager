import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
type DatasetType = 'random' | 'nearlySorted' | 'reversed' | 'fewUniques';
type AlgorithmName = 'Bubble' | 'Insertion' | 'Merge' | 'Quick' | 'Heap' | 'Radix';

interface LaneState {
  array: number[];
  activeIndices: number[];
  sortedIndices: number[];
  ops: number;
  swaps: number;
  isFinished: boolean;
  timeElapsed: number;
}

interface RaceResult {
  algo: AlgorithmName;
  ops: number;
  swaps: number;
  timeElapsed: number;
}

// --- Helpers ---
const generateData = (size: number, type: DatasetType): number[] => {
  const arr = Array.from({ length: size }, (_, i) => Math.floor(((i + 1) / size) * 100) + 5); // Base 5 to 105 for visual height
  
  if (type === 'random') {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  if (type === 'reversed') {
    return arr.reverse();
  }
  
  if (type === 'nearlySorted') {
    const nearly = [...arr];
    const swaps = Math.max(1, Math.floor(size * 0.05));
    for (let i = 0; i < swaps; i++) {
      const idx1 = Math.floor(Math.random() * size);
      const idx2 = Math.min(size - 1, idx1 + Math.floor(Math.random() * 5));
      [nearly[idx1], nearly[idx2]] = [nearly[idx2], nearly[idx1]];
    }
    return nearly;
  }
  
  if (type === 'fewUniques') {
    const uniques = [20, 40, 60, 80, 100];
    return Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }
  
  return arr;
};

// --- Sorting Algorithms (Async Generators / Visualizers) ---
// We use a class to encapsulate the visual reporting logic easily
class SortVisualizer {
  arr: number[];
  ops: number = 0;
  swaps: number = 0;
  report: (state: Partial<LaneState>) => Promise<void>;
  isCancelled: () => boolean;

  constructor(initialArray: number[], reportCb: (state: Partial<LaneState>) => Promise<void>, cancelCheck: () => boolean) {
    this.arr = [...initialArray];
    this.report = reportCb;
    this.isCancelled = cancelCheck;
  }

  async compare(i: number, j: number): Promise<number> {
    this.ops++;
    if (this.ops % 5 === 0 || this.arr.length < 50) {
      await this.report({ array: [...this.arr], activeIndices: [i, j], ops: this.ops, swaps: this.swaps });
    }
    return this.arr[i] - this.arr[j];
  }

  async swap(i: number, j: number) {
    this.swaps++;
    const temp = this.arr[i];
    this.arr[i] = this.arr[j];
    this.arr[j] = temp;
    if (this.swaps % 3 === 0 || this.arr.length < 50) {
      await this.report({ array: [...this.arr], activeIndices: [i, j], ops: this.ops, swaps: this.swaps });
    }
  }

  async write(i: number, val: number) {
    this.swaps++; // Treating write as a swap for metric purposes
    this.arr[i] = val;
    if (this.swaps % 3 === 0 || this.arr.length < 50) {
       await this.report({ array: [...this.arr], activeIndices: [i], ops: this.ops, swaps: this.swaps });
    }
  }

  async finish() {
    await this.report({ array: [...this.arr], activeIndices: [], ops: this.ops, swaps: this.swaps, isFinished: true });
  }

  // ALGORITHMS
  async bubbleSort() {
    const n = this.arr.length;
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        if (this.isCancelled()) return;
        if (await this.compare(j, j + 1) > 0) {
          await this.swap(j, j + 1);
          swapped = true;
        }
      }
      if (!swapped) break;
    }
    await this.finish();
  }

  async insertionSort() {
    const n = this.arr.length;
    for (let i = 1; i < n; i++) {
      let key = this.arr[i];
      let j = i - 1;
      while (j >= 0 && !this.isCancelled()) {
        this.ops++;
        await this.report({ array: [...this.arr], activeIndices: [j, j+1], ops: this.ops, swaps: this.swaps });
        if (this.arr[j] > key) {
          await this.write(j + 1, this.arr[j]);
          j = j - 1;
        } else {
          break;
        }
      }
      if (this.isCancelled()) return;
      await this.write(j + 1, key);
    }
    await this.finish();
  }

  async mergeSort(l: number = 0, r: number = this.arr.length - 1) {
    if (l >= r || this.isCancelled()) return;
    const m = l + Math.floor((r - l) / 2);
    await this.mergeSort(l, m);
    await this.mergeSort(m + 1, r);
    await this.merge(l, m, r);
    if (l === 0 && r === this.arr.length - 1) await this.finish();
  }

  async merge(l: number, m: number, r: number) {
    const n1 = m - l + 1;
    const n2 = r - m;
    const L = new Array(n1);
    const R = new Array(n2);
    for (let i = 0; i < n1; i++) L[i] = this.arr[l + i];
    for (let j = 0; j < n2; j++) R[j] = this.arr[m + 1 + j];
    
    let i = 0, j = 0, k = l;
    while (i < n1 && j < n2 && !this.isCancelled()) {
      this.ops++;
      if (L[i] <= R[j]) {
        await this.write(k, L[i]);
        i++;
      } else {
        await this.write(k, R[j]);
        j++;
      }
      k++;
    }
    while (i < n1 && !this.isCancelled()) {
      await this.write(k, L[i]);
      i++; k++;
    }
    while (j < n2 && !this.isCancelled()) {
      await this.write(k, R[j]);
      j++; k++;
    }
  }

  async quickSort(low: number = 0, high: number = this.arr.length - 1) {
    if (low < high && !this.isCancelled()) {
      const pi = await this.partition(low, high);
      await this.quickSort(low, pi - 1);
      await this.quickSort(pi + 1, high);
    }
    if (low === 0 && high === this.arr.length - 1) await this.finish();
  }

  async partition(low: number, high: number): Promise<number> {
    const pivot = this.arr[high];
    let i = low - 1;
    for (let j = low; j <= high - 1; j++) {
      if (this.isCancelled()) return i+1;
      this.ops++;
      await this.report({ array: [...this.arr], activeIndices: [j, high], ops: this.ops, swaps: this.swaps });
      if (this.arr[j] < pivot) {
        i++;
        await this.swap(i, j);
      }
    }
    await this.swap(i + 1, high);
    return i + 1;
  }

  async heapSort() {
    const n = this.arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      if (this.isCancelled()) return;
      await this.heapify(n, i);
    }
    for (let i = n - 1; i > 0; i--) {
      if (this.isCancelled()) return;
      await this.swap(0, i);
      await this.heapify(i, 0);
    }
    await this.finish();
  }

  async heapify(n: number, i: number) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n && await this.compare(l, largest) > 0) largest = l;
    if (r < n && await this.compare(r, largest) > 0) largest = r;
    if (largest !== i) {
      await this.swap(i, largest);
      await this.heapify(n, largest);
    }
  }

  async radixSort() {
    const max = Math.max(...this.arr);
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      if (this.isCancelled()) return;
      await this.countingSort(exp);
    }
    await this.finish();
  }

  async countingSort(exp: number) {
    const n = this.arr.length;
    const output = new Array(n).fill(0);
    const count = new Array(10).fill(0);

    for (let i = 0; i < n; i++) {
      this.ops++;
      count[Math.floor(this.arr[i] / exp) % 10]++;
    }
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = n - 1; i >= 0; i--) {
      if (this.isCancelled()) return;
      output[count[Math.floor(this.arr[i] / exp) % 10] - 1] = this.arr[i];
      count[Math.floor(this.arr[i] / exp) % 10]--;
    }
    for (let i = 0; i < n; i++) {
      if (this.isCancelled()) return;
      await this.write(i, output[i]);
    }
  }
}

// --- Main Component ---
export default function App() {
  // Config State
  const [arraySize, setArraySize] = useState<number>(50);
  const [speedMs, setSpeedMs] = useState<number>(10);
  const [datasetType, setDatasetType] = useState<DatasetType>('random');
  const [selectedAlgos, setSelectedAlgos] = useState<AlgorithmName[]>(['Bubble', 'Quick', 'Merge']);
  const [showStabilityInfo, setShowStabilityInfo] = useState(false);
  
  // Race State
  const [baseArray, setBaseArray] = useState<number[]>([]);
  const [lanes, setLanes] = useState<Record<string, LaneState>>({});
  const [isRacing, setIsRacing] = useState(false);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  
  // Refs for async control
  const cancelRef = useRef<boolean>(false);
  const speedRef = useRef<number>(speedMs);
  const startTimeRef = useRef<number>(0);

  // Keep speed ref updated for live changes without restarting
  useEffect(() => { speedRef.current = speedMs; }, [speedMs]);

  // Init Data
  useEffect(() => {
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arraySize, datasetType, selectedAlgos]);

  const handleReset = useCallback(() => {
    cancelRef.current = true;
    setIsRacing(false);
    setRaceResults([]);
    
    const newData = generateData(arraySize, datasetType);
    setBaseArray(newData);
    
    const initialLanes: Record<string, LaneState> = {};
    selectedAlgos.forEach(algo => {
      initialLanes[algo] = {
        array: [...newData],
        activeIndices: [],
        sortedIndices: [],
        ops: 0,
        swaps: 0,
        isFinished: false,
        timeElapsed: 0
      };
    });
    setLanes(initialLanes);
  }, [arraySize, datasetType, selectedAlgos]);

  const delay = () => new Promise<void>(resolve => {
    if (speedRef.current === 0) {
      // Use microtask for max speed to avoid blocking UI completely but go very fast
      queueMicrotask(() => requestAnimationFrame(() => resolve()));
    } else {
      setTimeout(resolve, speedRef.current);
    }
  });

  const startRace = async () => {
    if (isRacing || selectedAlgos.length === 0) return;
    cancelRef.current = false;
    setIsRacing(true);
    setRaceResults([]);
    startTimeRef.current = performance.now();

    const promises = selectedAlgos.map(async (algo) => {
      let lastRenderTime = performance.now();
      
      const reportState = async (partialState: Partial<LaneState>) => {
        if (cancelRef.current) return;
        
        const now = performance.now();
        setLanes(prev => ({
          ...prev,
          [algo]: { 
            ...prev[algo], 
            ...partialState,
            timeElapsed: now - startTimeRef.current
          }
        }));

        // Throttle renders based on speed unless it's the final frame
        if (partialState.isFinished || (now - lastRenderTime > 16)) {
           await delay();
           lastRenderTime = now;
        } else if (speedRef.current > 0) {
           await delay();
        }
      };

      const visualizer = new SortVisualizer([...baseArray], reportState, () => cancelRef.current);
      
      try {
        switch (algo) {
          case 'Bubble': await visualizer.bubbleSort(); break;
          case 'Insertion': await visualizer.insertionSort(); break;
          case 'Merge': await visualizer.mergeSort(); break;
          case 'Quick': await visualizer.quickSort(); break;
          case 'Heap': await visualizer.heapSort(); break;
          case 'Radix': await visualizer.radixSort(); break;
        }
      } catch (e) {
        console.error(`Error in ${algo}:`, e);
      }

      if (!cancelRef.current) {
         setRaceResults(prev => [...prev, {
            algo,
            ops: visualizer.ops,
            swaps: visualizer.swaps,
            timeElapsed: performance.now() - startTimeRef.current
         }]);
      }
    });

    await Promise.all(promises);
    setIsRacing(false);
  };

  const toggleAlgo = (algo: AlgorithmName) => {
    if (isRacing) return;
    setSelectedAlgos(prev => 
      prev.includes(algo) ? prev.filter(a => a !== algo) : [...prev, algo]
    );
  };

  const allAlgos: AlgorithmName[] = ['Bubble', 'Insertion', 'Merge', 'Quick', 'Heap', 'Radix'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-indigo-600 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Sorting Race 2.0
          </h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">ChatGPT Edition • Interactive Pedagogy</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowStabilityInfo(!showStabilityInfo)}
            className="text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors"
          >
            {showStabilityInfo ? 'Hide Concepts' : 'Learn Concepts'}
          </button>
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Controls */}
        <aside className="w-full lg:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0 flex flex-col gap-8 shadow-sm z-0">
          
          {/* Controls Group */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b pb-2">Race Parameters</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold flex justify-between">
                Dataset Shape
              </label>
              <select 
                disabled={isRacing}
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value as DatasetType)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50"
              >
                <option value="random">Random Chaos</option>
                <option value="nearlySorted">Nearly Sorted</option>
                <option value="reversed">Reversed (Worst Case)</option>
                <option value="fewUniques">Few Unique Values</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex justify-between">
                <span>Array Size</span>
                <span className="text-indigo-600 font-mono">{arraySize}</span>
              </label>
              <input 
                type="range" min="10" max="200" step="10" 
                value={arraySize} 
                onChange={(e) => setArraySize(Number(e.target.value))}
                disabled={isRacing}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex justify-between">
                <span>Step Delay (Speed)</span>
                <span className="text-amber-600 font-mono">{speedMs}ms</span>
              </label>
              <input 
                type="range" min="0" max="100" step="1" 
                value={speedMs} 
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-xs text-slate-400 text-right">0ms = Max Speed</p>
            </div>
          </div>

          {/* Competitors Group */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b pb-2">Competitors</h2>
            <div className="grid grid-cols-2 gap-2">
              {allAlgos.map(algo => {
                const isSelected = selectedAlgos.includes(algo);
                return (
                  <button
                    key={algo}
                    disabled={isRacing}
                    onClick={() => toggleAlgo(algo)}
                    className={`text-sm py-2 px-3 border rounded-md transition-all font-medium text-left flex items-center justify-between
                      ${isSelected 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                      ${isRacing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {algo}
                    {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto pt-4 space-y-3">
            <button
              onClick={startRace}
              disabled={isRacing || selectedAlgos.length === 0}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isRacing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Racing...
                </>
              ) : 'Start Race'}