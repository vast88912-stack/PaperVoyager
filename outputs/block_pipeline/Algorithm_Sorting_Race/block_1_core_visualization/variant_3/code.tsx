import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Shuffle, Info, Settings2, BarChart2, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

// --- Types ---
type SortEvent = 
  | { type: 'compare', indices: number[] }
  | { type: 'swap', indices: number[] }
  | { type: 'overwrite', indices: number[], values: number[] }
  | { type: 'sorted', indices: number[] };

type SortGenerator = Generator<SortEvent, void, unknown>;

type AlgorithmDefinition = {
  id: string;
  name: string;
  stable: boolean;
  generator: (arr: number[]) => SortGenerator;
};

type LaneData = {
  id: string;
  name: string;
  stable: boolean;
  arr: number[];
  active: number[];
  swapping: number[];
  sorted: Set<number>;
  comparisons: number;
  swaps: number;
  status: 'idle' | 'running' | 'finished';
  timeSteps: number;
};

// --- Algorithms (Pure Generators) ---

function* bubbleSort(arr: number[]): SortGenerator {
  let n = arr.length;
  let swapped: boolean;
  for (let i = 0; i < n - 1; i++) {
    swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      yield { type: 'compare', indices: [j, j + 1] };
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;
        yield { type: 'swap', indices: [j, j + 1] };
      }
    }
    yield { type: 'sorted', indices: [n - i - 1] };
    if (!swapped) break;
  }
  for (let i = 0; i < n; i++) yield { type: 'sorted', indices: [i] };
}

function* insertionSort(arr: number[]): SortGenerator {
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i];
    let j = i - 1;
    yield { type: 'compare', indices: [i, j] };
    while (j >= 0 && arr[j] > key) {
      yield { type: 'compare', indices: [j, j + 1] };
      arr[j + 1] = arr[j];
      yield { type: 'overwrite', indices: [j + 1], values: [arr[j]] };
      j = j - 1;
    }
    arr[j + 1] = key;
    yield { type: 'overwrite', indices: [j + 1], values: [key] };
  }
  for (let i = 0; i < arr.length; i++) yield { type: 'sorted', indices: [i] };
}

function* mergeSortGen(arr: number[], start = 0, end = arr.length - 1): SortGenerator {
  if (start >= end) return;
  const mid = Math.floor((start + end) / 2);
  yield* mergeSortGen(arr, start, mid);
  yield* mergeSortGen(arr, mid + 1, end);
  
  let left = arr.slice(start, mid + 1);
  let right = arr.slice(mid + 1, end + 1);
  let i = 0, j = 0, k = start;
  
  while (i < left.length && j < right.length) {
    yield { type: 'compare', indices: [start + i, mid + 1 + j] };
    if (left[i] <= right[j]) {
      arr[k] = left[i];
      yield { type: 'overwrite', indices: [k], values: [left[i]] };
      i++;
    } else {
      arr[k] = right[j];
      yield { type: 'overwrite', indices: [k], values: [right[j]] };
      j++;
    }
    k++;
  }
  while (i < left.length) {
    arr[k] = left[i];
    yield { type: 'overwrite', indices: [k], values: [left[i]] };
    i++; k++;
  }
  while (j < right.length) {
    arr[k] = right[j];
    yield { type: 'overwrite', indices: [k], values: [right[j]] };
    j++; k++;
  }
  if (start === 0 && end === arr.length - 1) {
     for (let x = 0; x < arr.length; x++) yield { type: 'sorted', indices: [x] };
  }
}

function* quickSortGen(arr: number[], low = 0, high = arr.length - 1): SortGenerator {
  if (low < high) {
    let pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      yield { type: 'compare', indices: [j, high] };
      if (arr[j] < pivot) {
        i++;
        let temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
        yield { type: 'swap', indices: [i, j] };
      }
    }
    let temp = arr[i + 1]; arr[i + 1] = arr[high]; arr[high] = temp;
    yield { type: 'swap', indices: [i + 1, high] };
    let pi = i + 1;
    
    yield { type: 'sorted', indices: [pi] };
    yield* quickSortGen(arr, low, pi - 1);
    yield* quickSortGen(arr, pi + 1, high);
  } else if (low === high) {
    yield { type: 'sorted', indices: [low] };
  }
  if (low === 0 && high === arr.length - 1) {
    for (let x = 0; x < arr.length; x++) yield { type: 'sorted', indices: [x] };
  }
}

function* heapSortGen(arr: number[]): SortGenerator {
  let n = arr.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(arr, n, i);
  }
  for (let i = n - 1; i > 0; i--) {
    let temp = arr[0]; arr[0] = arr[i]; arr[i] = temp;
    yield { type: 'swap', indices: [0, i] };
    yield { type: 'sorted', indices: [i] };
    yield* heapify(arr, i, 0);
  }
  yield { type: 'sorted', indices: [0] };
}

function* heapify(arr: number[], n: number, i: number): SortGenerator {
  let largest = i;
  let l = 2 * i + 1;
  let r = 2 * i + 2;

  if (l < n) {
    yield { type: 'compare', indices: [l, largest] };
    if (arr[l] > arr[largest]) largest = l;
  }
  if (r < n) {
    yield { type: 'compare', indices: [r, largest] };
    if (arr[r] > arr[largest]) largest = r;
  }
  if (largest !== i) {
    let swap = arr[i]; arr[i] = arr[largest]; arr[largest] = swap;
    yield { type: 'swap', indices: [i, largest] };
    yield* heapify(arr, n, largest);
  }
}

function* radixSortGen(arr: number[]): SortGenerator {
  const max = Math.max(...arr);
  let exp = 1;
  while (Math.floor(max / exp) > 0) {
    let output = new Array(arr.length).fill(0);
    let count = new Array(10).fill(0);
    
    for (let i = 0; i < arr.length; i++) {
      const digit = Math.floor(arr[i] / exp) % 10;
      count[digit]++;
      yield { type: 'compare', indices: [i] }; 
    }
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      output[count[digit] - 1] = arr[i];
      count[digit]--;
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i] = output[i];
      yield { type: 'overwrite', indices: [i], values: [arr[i]] };
    }
    exp *= 10;
  }
  for (let i = 0; i < arr.length; i++) yield { type: 'sorted', indices: [i] };
}

const ALGORITHMS: AlgorithmDefinition[] = [
  { id: 'bubble', name: 'Bubble Sort', stable: true, generator: bubbleSort },
  { id: 'insertion', name: 'Insertion Sort', stable: true, generator: insertionSort },
  { id: 'merge', name: 'Merge Sort', stable: true, generator: mergeSortGen },
  { id: 'quick', name: 'Quick Sort', stable: false, generator: quickSortGen },
  { id: 'heap', name: 'Heap Sort', stable: false, generator: heapSortGen },
  { id: 'radix', name: 'Radix Sort (LSD)', stable: true, generator: radixSortGen },
];

// --- Helpers ---
const generateData = (size: number, type: string) => {
  let arr = Array.from({ length: size }, (_, i) => Math.floor((i + 1) * (100 / size)));
  if (type === 'random') {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } else if (type === 'reversed') {
    arr.reverse();
  } else if (type === 'nearly-sorted') {
    for (let i = 0; i < arr.length; i += Math.max(1, Math.floor(size / 10))) {
      const j = Math.min(arr.length - 1, i + Math.floor(Math.random() * 5));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } else if (type === 'few-uniques') {
    const uniques = [20, 40, 60, 80, 100];
    arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
  }
  return arr;
};

// --- Main Component ---
export default function App() {
  // Config State
  const [arraySize, setArraySize] = useState(40);
  const [speed, setSpeed] = useState(80); // 1 to 100
  const [datasetType, setDatasetType] = useState('random');
  const [showStabilityInfo, setShowStabilityInfo] = useState(false);

  // Runtime State
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [, setTick] = useState(0); // For forcing renders from refs
  const baseArrayRef = useRef<number[]>([]);
  
  const lanesRef = useRef<Record<string, LaneData>>({});
  const iteratorsRef = useRef<Record<string, SortGenerator | null>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Data
  const initRace = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const newBase = generateData(arraySize, datasetType);
    baseArrayRef.current = newBase;
    
    const initialLanes: Record<string, LaneData> = {};
    ALGORITHMS.forEach(alg => {
      initialLanes[alg.id] = {
        id: alg.id,
        name: alg.name,
        stable: alg.stable,
        arr: [...newBase],
        active: [],
        swapping: [],
        sorted: new Set(),
        comparisons: 0,
        swaps: 0,
        status: 'idle',
        timeSteps: 0,
      };
      iteratorsRef.current[alg.id] = null;
    });
    
    lanesRef.current = initialLanes;
    setIsRunning(false);