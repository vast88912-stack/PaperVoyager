import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Square, RotateCcw, Info, Settings2, BarChart3, FastForward, CheckCircle2 } from 'lucide-react';

// --- Types & Interfaces ---

type DatasetType = 'random' | 'nearly_sorted' | 'reversed' | 'few_uniques';

interface SortItem {
  id: string;
  value: number;
  originalIndex: number;
  color: string; // Used to visualize stability
}

interface SortState {
  array: SortItem[];
  activeIndices: number[];
  comparingIndices: number[];
  sortedIndices: number[];
  comparisons: number;
  arrayAccesses: number; // Swaps or writes
  isComplete: boolean;
  startTime?: number;
  endTime?: number;
}

interface Algorithm {
  id: string;
  name: string;
  generator: (arr: SortItem[]) => Generator<SortState, void, unknown>;
  isStable: boolean;
  color: string;
}

// --- Helper Functions ---

const generateColor = (index: number, total: number) => {
  const hue = (index / total) * 300; // 0 to 300 (Red to Magenta)
  return `hsl(${hue}, 80%, 60%)`;
};

const generateData = (size: number, type: DatasetType): SortItem[] => {
  let arr: number[] = [];
  
  if (type === 'random') {
    for (let i = 0; i < size; i++) arr.push(Math.floor(Math.random() * 100) + 10);
  } else if (type === 'reversed') {
    for (let i = size; i > 0; i--) arr.push(Math.floor((i / size) * 100) + 10);
  } else if (type === 'nearly_sorted') {
    for (let i = 0; i < size; i++) arr.push(Math.floor((i / size) * 100) + 10);
    // Swap a few elements
    const swaps = Math.max(1, Math.floor(size * 0.1));
    for (let i = 0; i < swaps; i++) {
      const idx1 = Math.floor(Math.random() * size);
      const idx2 = Math.floor(Math.random() * size);
      [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
    }
  } else if (type === 'few_uniques') {
    const uniques = [20, 40, 60, 80, 100];
    for (let i = 0; i < size; i++) {
      arr.push(uniques[Math.floor(Math.random() * uniques.length)]);
    }
  }

  return arr.map((val, idx) => ({
    id: `item-${idx}-${Math.random().toString(36).substr(2, 9)}`,
    value: val,
    originalIndex: idx,
    color: generateColor(idx, size),
  }));
};

// --- Sorting Algorithms (Generators) ---
// Yielding state at interesting points for visualization

function* bubbleSort(initialArray: SortItem[]): Generator<SortState> {
  let arr = [...initialArray];
  let n = arr.length;
  let comparisons = 0;
  let accesses = 0;
  let sorted: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++;
      yield { array: [...arr], activeIndices: [j, j + 1], comparingIndices: [j, j + 1], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      
      if (arr[j].value > arr[j + 1].value) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        accesses += 2;
        swapped = true;
        yield { array: [...arr], activeIndices: [j, j + 1], comparingIndices: [], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      }
    }
    sorted.push(n - i - 1);
    if (!swapped) break;
  }
  
  while(sorted.length < n) sorted.push(n - sorted.length -1);
  yield { array: arr, activeIndices: [], comparingIndices: [], sortedIndices: sorted, comparisons, arrayAccesses: accesses, isComplete: true };
}

function* insertionSort(initialArray: SortItem[]): Generator<SortState> {
  let arr = [...initialArray];
  let n = arr.length;
  let comparisons = 0;
  let accesses = 0;
  let sorted: number[] = [0];

  for (let i = 1; i < n; i++) {
    let key = arr[i];
    let j = i - 1;
    accesses++; // Read key

    yield { array: [...arr], activeIndices: [i], comparingIndices: [], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };

    while (j >= 0) {
      comparisons++;
      yield { array: [...arr], activeIndices: [j + 1], comparingIndices: [j, i], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      
      if (arr[j].value > key.value) {
        arr[j + 1] = arr[j];
        accesses++;
        j = j - 1;
        yield { array: [...arr], activeIndices: [j + 1], comparingIndices: [], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      } else {
        break;
      }
    }
    arr[j + 1] = key;
    accesses++;
    sorted.push(i);
  }
  
  yield { array: arr, activeIndices: [], comparingIndices: [], sortedIndices: Array.from({length: n}, (_, i) => i), comparisons, arrayAccesses: accesses, isComplete: true };
}

function* selectionSort(initialArray: SortItem[]): Generator<SortState> {
    let arr = [...initialArray];
    let n = arr.length;
    let comparisons = 0;
    let accesses = 0;
    let sorted: number[] = [];
  
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        comparisons++;
        yield { array: [...arr], activeIndices: [minIdx], comparingIndices: [j, minIdx], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
        if (arr[j].value < arr[minIdx].value) {
          minIdx = j;
        }
      }
      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        accesses += 2;
        yield { array: [...arr], activeIndices: [i, minIdx], comparingIndices: [], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      }
      sorted.push(i);
    }
    sorted.push(n - 1);
    yield { array: arr, activeIndices: [], comparingIndices: [], sortedIndices: sorted, comparisons, arrayAccesses: accesses, isComplete: true };
}

function* mergeSort(initialArray: SortItem[]): Generator<SortState> {
  let arr = [...initialArray];
  let n = arr.length;
  let comparisons = 0;
  let accesses = 0;

  function* merge(left: number, mid: number, right: number): Generator<SortState> {
    let n1 = mid - left + 1;
    let n2 = right - mid;
    let L = new Array(n1);
    let R = new Array(n2);

    for (let i = 0; i < n1; i++) { L[i] = arr[left + i]; accesses++; }
    for (let j = 0; j < n2; j++) { R[j] = arr[mid + 1 + j]; accesses++; }

    let i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
      comparisons++;
      yield { array: [...arr], activeIndices: [k], comparingIndices: [left + i, mid + 1 + j], sortedIndices: [], comparisons, arrayAccesses: accesses, isComplete: false };
      
      if (L[i].value <= R[j].value) {
        arr[k] = L[i];
        i++;
      } else {
        arr[k] = R[j];
        j++;
      }
      accesses++;
      k++;
      yield { array: [...arr], activeIndices: [k-1], comparingIndices: [], sortedIndices: [], comparisons, arrayAccesses: accesses, isComplete: false };
    }

    while (i < n1) {
      arr[k] = L[i];
      accesses++;
      i++; k++;
      yield { array: [...arr], activeIndices: [k-1], comparingIndices: [], sortedIndices: [], comparisons, arrayAccesses: accesses, isComplete: false };
    }
    while (j < n2) {
      arr[k] = R[j];
      accesses++;
      j++; k++;
      yield { array: [...arr], activeIndices: [k-1], comparingIndices: [], sortedIndices: [], comparisons, arrayAccesses: accesses, isComplete: false };
    }
  }

  function* sort(left: number, right: number): Generator<SortState> {
    if (left >= right) return;
    let mid = left + Math.floor((right - left) / 2);
    yield* sort(left, mid);
    yield* sort(mid + 1, right);
    yield* merge(left, mid, right);
  }

  yield* sort(0, n - 1);
  yield { array: arr, activeIndices: [], comparingIndices: [], sortedIndices: Array.from({length: n}, (_, i) => i), comparisons, arrayAccesses: accesses, isComplete: true };
}

function* quickSort(initialArray: SortItem[]): Generator<SortState> {
  let arr = [...initialArray];
  let n = arr.length;
  let comparisons = 0;
  let accesses = 0;
  let sorted: number[] = [];

  function* partition(low: number, high: number): Generator<SortState, number> {
    let pivot = arr[high];
    accesses++;
    let i = low - 1;

    for (let j = low; j <= high - 1; j++) {
      comparisons++;
      yield { array: [...arr], activeIndices: [high], comparingIndices: [j, high], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      
      if (arr[j].value < pivot.value) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        accesses += 2;
        yield { array: [...arr], activeIndices: [i, j], comparingIndices: [], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    accesses += 2;
    yield { array: [...arr], activeIndices: [i + 1, high], comparingIndices: [], sortedIndices: [...sorted], comparisons, arrayAccesses: accesses, isComplete: false };
    return i + 1;
  }

  function* sort(low: number, high: number): Generator<SortState> {
    if (low < high) {
      let pi = yield* partition(low, high);
      sorted.push(pi);
      yield* sort(low, pi - 1);
      yield* sort(pi + 1, high);
    } else if (low === high) {
        sorted.push(low);
    }
  }

  yield* sort(0, n - 1);
  yield { array: arr, activeIndices: [], comparingIndices: [], sortedIndices: Array.from({length: n}, (_, i) => i), comparisons, arrayAccesses: accesses, isComplete: true };
}


const ALGORITHMS: Algorithm[] = [
  { id: 'bubble', name: 'Bubble Sort', generator: bubbleSort, isStable: true, color: 'bg-rose-500' },
  { id: 'insertion', name: 'Insertion Sort', generator: insertionSort, isStable: true, color: 'bg-amber-500' },
  { id: 'selection', name: 'Selection Sort', generator: selectionSort, isStable: false, color: 'bg-emerald-500' },
  { id: 'merge', name: 'Merge Sort', generator: mergeSort, isStable: true, color: 'bg-blue-500' },
  { id: 'quick', name: 'Quick Sort', generator: quickSort, isStable: false, color: 'bg-purple-500' },
];

// --- Main Component ---

export default function App() {
  const [arraySize, setArraySize] = useState<number>(40);
  const [speed, setSpeed] = useState<number>(50); // 1 to 100
  const [datasetType, setDatasetType] = useState<DatasetType>('random');
  const [isRacing, setIsRacing] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  
  const [baseData, setBaseData] = useState<SortItem[]>([]);
  const [laneStates, setLaneStates] = useState<Record<string, SortState>>({});
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>(['bubble', 'insertion', 'merge', 'quick']);

  const generatorsRef = useRef<Record<string, Generator<SortState>>>({});
  const animationRef = useRef<number>();
  const lastStepTimeRef = useRef<number>(0);

  // Initialize Data
  const initData = useCallback(() => {
    const newData = generateData(arraySize, datasetType);
    setBaseData(newData);
    
    const initialStates: Record<string, SortState> = {};
    selectedAlgos.forEach(algoId => {
      initialStates[algoId] = {
        array: [...newData],
        activeIndices: [],
        comparingIndices: [],
        sortedIndices: [],
        comparisons: 0,
        arrayAccesses: 0,
        isComplete: false
      };
    });
    setLaneStates(initialStates);
    setIsFinished(false);
    setIsRacing(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, [arraySize, datasetType, selectedAlgos]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Animation Loop
  const stepAnimation = useCallback((timestamp: number) => {
    if (!isRacing) return;

    // Calculate how many steps to take based on speed slider
    // Speed 1: 1 step per 200ms
    // Speed 50: 1 step per frame (~16ms)
    // Speed 100: 10 steps per frame
    
    let stepsToTake = 0;
    if (speed < 50) {
      const delay = 200 - (speed * 3.8); // 200ms to ~10ms
      if (timestamp - lastStepTimeRef.current > delay) {
        stepsToTake = 1;
        lastStepTimeRef.current = timestamp;
      }
    } else {
      stepsToTake = Math.floor((speed - 40) / 5) + 1; // 1 to ~13 steps
      lastStepTimeRef.current = timestamp;
    }

    if (stepsToTake > 0) {
      setLaneStates(prev => {
        const nextStates = { ...prev };
        let allComplete = true;

        for (const algoId of selectedAlgos) {
          if (nextStates[algoId]?.isComplete) continue;
          allComplete = false;

          let gen = generatorsRef.current[algoId];
          let result;
          
          for (let s = 0; s < stepsToTake; s++) {
             result = gen.next();
             if (result.done) break;
          }

          if (result && !result.done) {
            nextStates[algoId] = result.value;
          } else if (result && result.done) {
            nextStates[algoId] = { 
                ...nextStates[algoId], 
                isComplete: true, 
                activeIndices: [], 
                comparingIndices: [],
                endTime: performance.now()
            };
          }
        }

        if (allComplete) {
          setIsRacing(false);
          setIsFinished(true);
        }
        return nextStates;
      });
    }

    if (isRacing) {
      animationRef.current = requestAnimationFrame(stepAnimation);
    }
  }, [isRacing, speed, selectedAlgos]);

  useEffect(() => {
    if (isRacing) {
      animationRef.current = requestAnimationFrame(stepAnimation);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRacing, stepAnimation]);

  const handleStart = () => {
    if (isFinished) {
        initData();
        // slight delay to allow re-render before starting
        setTimeout(() => startRace(), 50);
    } else {
        startRace();
    }
  };

  const startRace = () => {
    const startTime = performance.now();
    
    // Initialize generators
    selectedAlgos.forEach(algoId => {
      const algo = ALGORITHMS.find(a => a.id === algoId);
      if (algo) {
        generatorsRef.current[algoId] = algo.generator(baseData);
      }
    });

    setLaneStates(prev => {
        const newStates = {...prev};
        Object.keys(newStates).forEach(k => newStates[k].startTime = startTime);
        return newStates;
    });

    setIsRacing(true);
    setIsFinished(false);
    lastStepTimeRef.current = performance.now();
  };

  const toggleAlgo = (id: string) => {
    if (isRacing) return;
    setSelectedAlgos(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      {/* Header / Controls */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-inner">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Sorting Race 2.0</h1>
                <p className="text-xs text-slate-500 font-medium">Visual Algorithm Comparison</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
              {/* Dataset Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1">Dataset</label>
                <select 
                  disabled={isRacing}
                  value={datasetType} 
                  onChange={(e) => setDatasetType(e.target.value as DatasetType)}
                  className="bg-white border border-slate-300 text-sm rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  <option value="random">Random</option>
                  <option value="nearly_sorted">Nearly Sorted</option>
                  <option value="reversed">Reversed</option>
                  <option value="few_uniques">Few Uniques</option>
                </select>
              </div>

              {/* Size Slider */}
              <div className="flex flex-col gap-1 w-32">
                <div className="flex justify-between px-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Size</label>
                  <span className="text-[10px] font-bold text-slate-700">{arraySize}</span>
                </div>
                <input 
                  type="range" min="10" max="150" 
                  disabled={isRacing}
                  value={arraySize} 
                  onChange={(e) => setArraySize(Number(e.target.value))}
                  className="w-full accent-blue-600 disabled:opacity-50"
                />
              </div>

              {/* Speed Slider */}
              <div className="flex flex-col gap-1 w-32">
                 <div className="flex justify-between px-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Speed</label>
                  <FastForward className="w-3 h-3 text-slate-400" />
                </div>
                <input 
                  type="range" min="1" max="100" 
                  value={speed} 
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={initData}
                disabled={isRacing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm"
              >
                <RotateCcw className="w-4 h-4" /> Shuffle
              </button>
              <button 
                onClick={handleStart}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg