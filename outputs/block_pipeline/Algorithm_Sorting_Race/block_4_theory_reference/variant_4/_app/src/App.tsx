import React, { useState } from 'react';
import { 
  BookOpen, 
  Hash, 
  Layers, 
  Zap, 
  Info, 
  Code, 
  CheckCircle2, 
  XCircle, 
  BarChart, 
  Database 
} from 'lucide-react';

// --- DATA DEFINITIONS ---

type Complexity = 'O(1)' | 'O(n)' | 'O(n log n)' | 'O(n^2)' | 'O(n+k)' | 'O(nk)';

interface AlgorithmInfo {
  id: string;
  name: string;
  category: 'Comparative' | 'Non-Comparative';
  description: string;
  tBest: Complexity;
  tAvg: Complexity;
  tWorst: Complexity;
  space: Complexity;
  stable: boolean;
  tldr: string;
  codeSnippet: string;
}

const algorithms: AlgorithmInfo[] = [
  {
    id: 'bubble',
    name: 'Bubble Sort',
    category: 'Comparative',
    description: 'A simple sorting algorithm that repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted.',
    tBest: 'O(n)',
    tAvg: 'O(n^2)',
    tWorst: 'O(n^2)',
    space: 'O(1)',
    stable: true,
    tldr: 'Bubbles the largest elements to the end. Simple to write, but terribly slow for large datasets.',
    codeSnippet: `for (let i = 0; i < n; i++) {
  let swapped = false;
  for (let j = 0; j < n - i - 1; j++) {
    if (arr[j] > arr[j + 1]) {
      swap(arr, j, j + 1);
      swapped = true;
    }
  }
  if (!swapped) break;
}`
  },
  {
    id: 'insertion',
    name: 'Insertion Sort',
    category: 'Comparative',
    description: 'Builds the final sorted array one item at a time. It is much less efficient on large lists than more advanced algorithms such as quicksort, heapsort, or merge sort.',
    tBest: 'O(n)',
    tAvg: 'O(n^2)',
    tWorst: 'O(n^2)',
    space: 'O(1)',
    stable: true,
    tldr: 'Like sorting cards in your hand. Lightning fast for nearly-sorted data!',
    codeSnippet: `for (let i = 1; i < n; i++) {
  let key = arr[i];
  let j = i - 1;
  while (j >= 0 && arr[j] > key) {
    arr[j + 1] = arr[j];
    j--;
  }
  arr[j + 1] = key;
}`
  },
  {
    id: 'merge',
    name: 'Merge Sort',
    category: 'Comparative',
    description: 'An efficient, stable, divide-and-conquer algorithm. It divides the unsorted list into n sublists, each containing one element, and then repeatedly merges sublists to produce new sorted sublists.',
    tBest: 'O(n log n)',
    tAvg: 'O(n log n)',
    tWorst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    tldr: 'Divide and conquer! Highly consistent performance, but requires extra memory for the merging phase.',
    codeSnippet: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}`
  },
  {
    id: 'quick',
    name: 'Quick Sort',
    category: 'Comparative',
    description: 'Picks an element as a pivot and partitions the given array around the picked pivot. Extremely fast in practice due to excellent cache locality.',
    tBest: 'O(n log n)',
    tAvg: 'O(n log n)',
    tWorst: 'O(n^2)',
    space: 'O(log n)',
    stable: false,
    tldr: 'The practical winner for random data. Very fast on average, but watch out for worst-case pivots!',
    codeSnippet: `function quickSort(arr, low, high) {
  if (low < high) {
    let pi = partition(arr, low, high);
    quickSort(arr, low, pi - 1);
    quickSort(arr, pi + 1, high);
  }
}`
  },
  {
    id: 'heap',
    name: 'Heap Sort',
    category: 'Comparative',
    description: 'A comparison-based sorting technique based on a Binary Heap data structure. It is similar to selection sort where we first find the maximum element and place the maximum element at the end.',
    tBest: 'O(n log n)',
    tAvg: 'O(n log n)',
    tWorst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
    tldr: 'Consistent O(n log n) time and O(1) space. Great for memory-constrained systems, but slower than Quick Sort in practice.',
    codeSnippet: `function heapSort(arr) {
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--)
    heapify(arr, n, i);
  for (let i = n - 1; i > 0; i--) {
    swap(arr, 0, i);
    heapify(arr, i, 0);
  }
}`
  },
  {
    id: 'radix',
    name: 'Radix Sort',
    category: 'Non-Comparative',
    description: 'Sorts data with integer keys by grouping keys by the individual digits which share the same significant position and value.',
    tBest: 'O(nk)',
    tAvg: 'O(nk)',
    tWorst: 'O(nk)',
    space: 'O(n+k)',
    stable: true,
    tldr: 'Doesn\'t compare elements directly! Sorts digit by digit. Amazingly fast for integers or fixed-length strings.',
    codeSnippet: `function radixSort(arr) {
  let max = getMax(arr);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    countSort(arr, exp);
  }
}`
  }
];

// --- HELPER COMPONENTS ---

const ComplexityBadge = ({ value }: { value: Complexity }) => {
  let color = 'bg-gray-100 text-gray-800 border-gray-300';
  
  if (value === 'O(1)') color = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  else if (value === 'O(n)') color = 'bg-green-100 text-green-800 border-green-300';
  else if (value === 'O(n log n)') color = 'bg-blue-100 text-blue-800 border-blue-300';
  else if (value === 'O(n+k)' || value === 'O(nk)') color = 'bg-purple-100 text-purple-800 border-purple-300';
  else if (value === 'O(n^2)') color = 'bg-red-100 text-red-800 border-red-300';

  return (
    <span className={`px-2 py-1 text-xs font-mono font-bold rounded-md border ${color} shadow-sm`}>
      {value}
    </span>
  );
};

// --- MAIN COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('merge');

  const renderAlgorithmTheory = (algo: AlgorithmInfo) => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2 flex items-center gap-3">
            {algo.name}
            {algo.stable ? (
              <span className="flex items-center gap-1 text-sm bg-teal-100 text-teal-800 border-2 border-teal-800 px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(17,94,89,1)]">
                <CheckCircle2 size={16} /> Stable
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm bg-orange-100 text-orange-800 border-2 border-orange-800 px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(154,52,18,1)]">
                <XCircle size={16} /> Unstable
              </span>
            )}
          </h2>
          <p className="text-lg text-slate-600 font-medium">{algo.category} Algorithm</p>
        </div>
      </div>

      <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-lg shadow-sm">
        <h3 className="font-bold flex items-center gap-2 text-indigo-900 mb-1">
          <Zap size={20} /> ChatGPT's TL;DR
        </h3>
        <p className="text-indigo-800 italic">{algo.tldr}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-slate-200 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(203,213,225,1)]">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart size={24} className="text-slate-400" /> Complexity Profile
          </h3>
          <ul className="space-y-4">
            <li className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-700">Best Case Time</span>
              <ComplexityBadge value={algo.tBest} />
            </li>
            <li className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-700">Average Case Time</span>
              <ComplexityBadge value={algo.tAvg} />
            </li>
            <li className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-700">Worst Case Time</span>
              <ComplexityBadge value={algo.tWorst} />
            </li>
            <li className="flex justify-between items-center pt-2">
              <span className="font-semibold text-slate-700">Space (Memory)</span>
              <ComplexityBadge value={algo.space} />
            </li>
          </ul>
        </div>

        <div className="border-2 border-slate-200 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(203,213,225,1)]">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info size={24} className="text-slate-400" /> How it Works
          </h3>
          <p className="text-slate-700 leading-relaxed text-sm md:text-base">
            {algo.description}
          </p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] bg-slate-900">
        <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
          <Code size={18} className="text-slate-400" />
          <span className="text-slate-200 font-mono text-sm font-semibold">Pseudocode Snippet</span>
        </div>
        <pre className="p-4 text-emerald-400 font-mono text-sm overflow-x-auto">
          <code>{algo.codeSnippet}</code>
        </pre>
      </div>
    </div>
  );

  const renderStabilityTheory = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4 flex items-center gap-3">
          <Layers className="text-indigo-600" size={36} /> Algorithm Stability
        </h2>
        <p className="text-xl text-slate-600 font-medium">
          Why do we care about "Stability" in sorting?
        </p>
      </div>

      <p className="text-lg text-slate-800 leading-relaxed bg-white border-2 border-slate-200 p-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(203,213,225,1)]">
        A sorting algorithm is considered <strong>stable</strong> if it preserves the relative order of equal elements in the sorted output. If two items share the exact same key, the one that appeared first in the original list will still appear first in the sorted list.
      </p>

      <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-8 shadow-[6px_6px_0px_0px_rgba(148,163,184,1)]">
        <h3 className="text-2xl font-bold mb-6 text-center">Interactive Example: Sorting Cards by Value</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Original */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-slate-500 mb-4 tracking-widest uppercase text-sm">Original Array</span>
            <div className="flex gap-2">
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-red-500">♥5</span><span className="text-xs text-slate-400">1st</span></div>
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-slate-900">♠7</span><span className="text-xs text-slate-400">2nd</span></div>
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-red-500">♦2</span><span className="text-xs text-slate-400">3rd</span></div>
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-slate-900">♣7</span><span className="text-xs text-slate-400">4th</span></div>
            </div>
          </div>

          {/* Stable */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-teal-600 mb-4 tracking-widest uppercase text-sm flex items-center gap-1"><CheckCircle2 size={16}/> Stable Sort</span>
            <div className="flex gap-2">
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-red-500">♦2</span></div>
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-red-500">♥5</span></div>
              <div className="w-12 h-16 bg-white border-2 border-teal-500 rounded shadow-[0_0_10px_rgba(20,184,166,0.5)] flex flex-col items-center justify-center font-bold text-lg relative group">
                <span className="text-slate-900">♠7</span><span className="text-xs text-teal-600 font-bold">2nd</span>
              </div>
              <div className="w-12 h-16 bg-white border-2 border-teal-500 rounded shadow-[0_0_10px_rgba(20,184,166,0.5)] flex flex-col items-center justify-center font-bold text-lg relative group">
                <span className="text-slate-900">♣7</span><span className="text-xs text-teal-600 font-bold">4th</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-center text-slate-600">Spades stays before Clubs.<br/>Order preserved.</p>
          </div>

          {/* Unstable */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-orange-600 mb-4 tracking-widest uppercase text-sm flex items-center gap-1"><XCircle size={16}/> Unstable Sort</span>
            <div className="flex gap-2">
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-red-500">♦2</span></div>
              <div className="w-12 h-16 bg-white border-2 border-slate-800 rounded shadow-sm flex flex-col items-center justify-center font-bold text-lg"><span className="text-red-500">♥5</span></div>
              <div className="w-12 h-16 bg-white border-2 border-orange-500 rounded shadow-[0_0_10px_rgba(249,115,22,0.5)] flex flex-col items-center justify-center font-bold text-lg">
                <span className="text-slate-900">♣7</span><span className="text-xs text-orange-600 font-bold">4th</span>
              </div>
              <div className="w-12 h-16 bg-white border-2 border-orange-500 rounded shadow-[0_0_10px_rgba(249,115,22,0.5)] flex flex-col items-center justify-center font-bold text-lg">
                <span className="text-slate-900">♠7</span><span className="text-xs text-orange-600 font-bold">2nd</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-center text-slate-600">Clubs jumped ahead of Spades.<br/>Order scrambled.</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
          <h4 className="font-bold text-teal-900 mb-2">Stable Algorithms</h4>
          <p className="text-teal-800 text-sm">Bubble, Insertion, Merge, Radix</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <h4 className="font-bold text-orange-900 mb-2">Unstable Algorithms</h4>
          <p className="text-orange-800 text-sm">Quick, Heap, Selection</p>
        </div>
      </div>
    </div>
  );

  const renderDatasetsTheory = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4 flex items-center gap-3">
          <Database className="text-rose-600" size={36} /> Dataset Impact
        </h2>
        <p className="text-xl text-slate-600 font-medium">
          How data distribution alters algorithmic performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Random */}
        <div className="border-2 border-slate-200 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(203,213,225,1)] hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-slate-800">Random Distribution</h3>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded">Baseline</span>
          </div>
          <p className="text-slate-600 mb-4 text-sm">A completely shuffled array with no pre-existing order.</p>
          <div className="bg-blue-50 text-blue-900 p-3 rounded-md text-sm">
            <strong>Winner:</strong> Quick Sort ($O(n \log n)$ average time and low overhead makes it consistently top the charts).
          </div>
        </div>

        {/* Nearly Sorted */}
        <div className="border-2 border-slate-200 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(203,213,225,1)] hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-slate-800">Nearly Sorted</h3>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded">Best Case</span>
          </div>
          <p className="text-slate-600 mb-4 text-sm">Most elements are in correct order, with few out of place.</p>
          <div className="bg-emerald-50 text-emerald-900 p-3 rounded-md text-sm">
            <strong>Winner:</strong> Insertion Sort (Reaches $O(n)$ time since the inner loop rarely triggers).
          </div>
        </div>

        {/* Reversed */}
        <div className="border-2 border-slate-200 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(203,213,225,1)] hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-slate-800">Reversed Data</h3>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded">Worst Case</span>
          </div>
          <p className="text-slate-600 mb-4 text-sm">Sorted in descending order. Tests worst-case handling.</p>
          <div className="bg-red-50 text-red-900 p-3 rounded-md text-sm">
            <strong>Losers:</strong> Bubble & Insertion ($O(n^2)$ guaranteed as every element must travel the full distance).
          </div>
        </div>

        {/* Few Uniques */}
        <div className="border-2 border-slate-200 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(203,213,225,1)] hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-slate-800">Few Uniques</h3>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded">Edge Case</span>
          </div>
          <p className="text-slate-600 mb-4 text-sm">Contains many duplicated values (e.g. [1, 2, 1, 3, 2, 1]).</