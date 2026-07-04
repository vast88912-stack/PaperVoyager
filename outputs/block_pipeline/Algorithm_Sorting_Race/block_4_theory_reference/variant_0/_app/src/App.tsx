import React, { useState } from 'react';

// --- Data Models ---

type Complexity = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n + k)' | 'O(nk)';

interface AlgorithmInfo {
  id: string;
  name: string;
  type: 'Comparative' | 'Non-Comparative';
  description: string;
  timeComplexity: {
    best: Complexity;
    average: Complexity;
    worst: Complexity;
  };
  spaceComplexity: Complexity;
  stable: boolean;
  inPlace: boolean;
  idealFor: string;
  pitfalls: string;
}

const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'bubble',
    name: 'Bubble Sort',
    type: 'Comparative',
    description: 'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    inPlace: true,
    idealFor: 'Educational demonstrations and detecting if a small array is already sorted.',
    pitfalls: 'Extremely inefficient for large datasets. The "turtle" elements (small elements at the end) move very slowly to their correct positions.'
  },
  {
    id: 'insertion',
    name: 'Insertion Sort',
    type: 'Comparative',
    description: 'Builds the final sorted array one item at a time. It iterates through the input, growing a sorted list behind it by comparing the current element to the sorted ones and inserting it in the correct position.',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    stable: true,
    inPlace: true,
    idealFor: 'Small datasets, nearly-sorted data, or as a hybrid fallback (e.g., in Timsort).',
    pitfalls: 'Performance degrades quadratically as the dataset size increases or if the data is in reverse order.'
  },
  {
    id: 'merge',
    name: 'Merge Sort',
    type: 'Comparative',
    description: 'A divide-and-conquer algorithm that recursively splits the array into halves until each sub-array contains a single element, then merges those sub-arrays to produce new sorted sub-arrays until one remains.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)',
    stable: true,
    inPlace: false,
    idealFor: 'Large datasets where stability is required, or sorting linked lists.',
    pitfalls: 'Requires O(n) auxiliary space, making it less ideal for memory-constrained environments compared to Quick or Heap sort.'
  },
  {
    id: 'quick',
    name: 'Quick Sort',
    type: 'Comparative',
    description: 'Picks an element as a "pivot" and partitions the given array around the picked pivot, placing smaller elements before it and larger elements after it. It then recursively sorts the sub-arrays.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(log n)',
    stable: false,
    inPlace: true,
    idealFor: 'General-purpose sorting in memory. Often the fastest in practice due to excellent cache locality.',
    pitfalls: 'Can degrade to O(n²) if a poor pivot is chosen (e.g., already sorted array with naive pivot). Unstable by default.'
  },
  {
    id: 'heap',
    name: 'Heap Sort',
    type: 'Comparative',
    description: 'Converts the array into a max-heap data structure, then repeatedly extracts the maximum element and rebuilds the heap until the array is sorted.',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)',
    stable: false,
    inPlace: true,
    idealFor: 'Systems with strict memory limits or real-time systems requiring guaranteed O(n log n) worst-case performance.',
    pitfalls: 'Poor cache locality compared to Quick Sort, making it generally slower in real-world benchmarks despite the same Big-O.'
  },
  {
    id: 'radix',
    name: 'Radix Sort',
    type: 'Non-Comparative',
    description: 'Sorts data with integer keys by grouping keys by the individual digits which share the same significant position and value. It processes digits from least significant to most significant (LSD).',
    timeComplexity: { best: 'O(nk)', average: 'O(nk)', worst: 'O(nk)' },
    spaceComplexity: 'O(n + k)',
    stable: true,
    inPlace: false,
    idealFor: 'Large arrays of integers, strings, or fixed-length keys where k (number of digits) is small.',
    pitfalls: 'Not a general-purpose sort (requires specific data types). High memory overhead for the buckets.'
  }
];

// --- Helper Components ---

const ComplexityBadge = ({ value, type }: { value: Complexity; type: 'time' | 'space' }) => {
  let colorClass = 'bg-slate-100 text-slate-800 border-slate-300';
  
  if (type === 'time') {
    if (value === 'O(1)' || value === 'O(log n)') colorClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    else if (value === 'O(n)') colorClass = 'bg-teal-100 text-teal-900 border-teal-300';
    else if (value === 'O(n log n)') colorClass = 'bg-blue-100 text-blue-900 border-blue-300';
    else if (value === 'O(n²)') colorClass = 'bg-rose-100 text-rose-900 border-rose-300';
    else if (value === 'O(nk)' || value === 'O(n + k)') colorClass = 'bg-indigo-100 text-indigo-900 border-indigo-300';
  } else {
    if (value === 'O(1)') colorClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    else if (value === 'O(log n)') colorClass = 'bg-blue-100 text-blue-900 border-blue-300';
    else colorClass = 'bg-amber-100 text-amber-900 border-amber-300';
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${colorClass} shadow-sm inline-block`}>
      {value}
    </span>
  );
};

const IconCheck = () => (
  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const IconX = () => (
  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// --- Main Component ---

export default function App() {
  const [activeAlgoId, setActiveAlgoId] = useState<string>(ALGORITHMS[0].id);
  const activeAlgo = ALGORITHMS.find(a => a.id === activeAlgoId)!;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Sorting Race 2.0 <span className="text-indigo-600 font-medium">| Theory & Reference</span>
            </h1>
          </div>
          <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Race Track</a>
            <a href="#" className="text-indigo-600 border-b-2 border-indigo-600 pb-5 pt-5">Theory</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Summary Stats</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Algorithm Reference Guide</h2>
          <p className="text-slate-600 max-w-3xl leading-relaxed">
            Understanding the theoretical foundation of sorting algorithms is crucial for choosing the right tool for the job. 
            Use this reference to explore time/space complexities, stability, and ideal use cases before running the race.
          </p>
        </section>

        {/* Algorithm Explorer */}
        <section className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="p-4 bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-xs">
                Algorithms
              </div>
              <ul className="divide-y divide-slate-100">
                {ALGORITHMS.map((algo) => (
                  <li key={algo.id}>
                    <button
                      onClick={() => setActiveAlgoId(algo.id)}
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                        activeAlgoId === algo.id 
                          ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                      }`}
                    >
                      {algo.name}
                      {activeAlgoId === algo.id && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detail View */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{activeAlgo.name}</h2>
                  <span className="inline-block mt-2 px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-md">
                    {activeAlgo.type}
                  </span>
                </div>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed">
                {activeAlgo.description}
              </p>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Complexity Table */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Complexity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Best Case</div>
                    <ComplexityBadge value={activeAlgo.timeComplexity.best} type="time" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Average Case</div>
                    <ComplexityBadge value={activeAlgo.timeComplexity.average} type="time" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Worst Case</div>
                    <ComplexityBadge value={activeAlgo.timeComplexity.worst} type="time" />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Space (Memory)</div>
                    <ComplexityBadge value={activeAlgo.spaceComplexity} type="space" />
                  </div>
                </div>
              </div>

              {/* Properties & Use Cases */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Properties</h3>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-medium text-slate-700">Stable Sort</span>
                    {activeAlgo.stable ? <IconCheck /> : <IconX />}
                  </li>
                  <li className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-medium text-slate-700">In-Place</span>
                    {activeAlgo.inPlace ? <IconCheck /> : <IconX />}
                  </li>
                </ul>

                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                      Ideal For
                    </h4>
                    <p className="text-sm text-slate-600">{activeAlgo.idealFor}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                      Pitfalls
                    </h4>
                    <p className="text-sm text-slate-600">{activeAlgo.pitfalls}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Educational Cards (Stability & Datasets) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Stability Explanation */}
          <section className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl shadow-lg border border-indigo-800 p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-3xl"></div>
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Understanding Stability
            </h3>
            <p className="text-indigo-100 mb-6 leading-relaxed">
              A sorting algorithm is <strong>stable</strong> if it preserves the relative order of equal elements. 
              This is crucial when sorting objects by multiple criteria (e.g., sorting by First Name, then by Last Name).
            </p>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="text-sm text-indigo-300 font-semibold mb-2 uppercase tracking-wider">Example: Sort by Number</div>
              <div className="flex flex-col space-y-3 font-mono text-sm">
                <div className="flex items-center">
                  <span className="w-20 text-slate-400">Input:</span>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">5<sub className="text-rose-400">A</sub></span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">2</span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">5<sub className="text-emerald-400">B</sub></span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-20 text-emerald-400">Stable:</span>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">2</span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">5<sub className="text-rose-400">A</sub></span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">5<sub className="text-emerald-400">B</sub></span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-20 text-rose-400">Unstable:</span>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">2</span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">5<sub className="text-emerald-400">B</sub></span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-white">5<sub className="text-rose-400">A</sub></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dataset Presets Guide */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              Dataset Impact
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Algorithms perform differently based on the initial state of the data. The Race Track includes presets to demonstrate these edge cases.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-1">Random</h4>
                <p className="text-sm text-slate-600">The baseline. Shows the average-case time complexity for all algorithms.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-1">Nearly Sorted</h4>
                <p className="text-sm text-slate-600">Highlights the O(n) best-case scenario for Insertion Sort and Bubble Sort.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">