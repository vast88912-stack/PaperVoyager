import React, { useState } from 'react';
import { BookOpen, FastForward, CheckSquare, XSquare, AlertTriangle, Info, BarChart, Layers } from 'lucide-react';

// --- DATA DEFINITIONS ---

type Complexity = 'O(1)' | 'O(N)' | 'O(N log N)' | 'O(N²)' | 'O(N + K)' | 'O(N * K)';

interface AlgorithmDef {
  id: string;
  name: string;
  type: string;
  best: Complexity;
  average: Complexity;
  worst: Complexity;
  space: Complexity;
  stable: boolean;
  description: string;
  color: string;
}

const algorithms: AlgorithmDef[] = [
  {
    id: 'bubble',
    name: 'Bubble Sort',
    type: 'Comparison',
    best: 'O(N)',
    average: 'O(N²)',
    worst: 'O(N²)',
    space: 'O(1)',
    stable: true,
    description: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order. Optimized versions stop early if no swaps occur.',
    color: 'border-pink-600 bg-pink-50',
  },
  {
    id: 'insertion',
    name: 'Insertion Sort',
    type: 'Comparison',
    best: 'O(N)',
    average: 'O(N²)',
    worst: 'O(N²)',
    space: 'O(1)',
    stable: true,
    description: 'Builds the final sorted array one item at a time. Much less efficient on large lists than more advanced algorithms, but excellent for nearly-sorted data.',
    color: 'border-blue-600 bg-blue-50',
  },
  {
    id: 'merge',
    name: 'Merge Sort',
    type: 'Comparison',
    best: 'O(N log N)',
    average: 'O(N log N)',
    worst: 'O(N log N)',
    space: 'O(N)',
    stable: true,
    description: 'Divide and conquer algorithm that divides the input array into two halves, calls itself for the two halves, and then merges the two sorted halves.',
    color: 'border-indigo-600 bg-indigo-50',
  },
  {
    id: 'quick',
    name: 'Quick Sort',
    type: 'Comparison',
    best: 'O(N log N)',
    average: 'O(N log N)',
    worst: 'O(N²)',
    space: 'O(log N)',
    stable: false,
    description: 'Picks an element as a pivot and partitions the given array around the picked pivot. Highly efficient in practice, but unstable and can hit O(N²) on bad pivots.',
    color: 'border-orange-600 bg-orange-50',
  },
  {
    id: 'heap',
    name: 'Heap Sort',
    type: 'Comparison',
    best: 'O(N log N)',
    average: 'O(N log N)',
    worst: 'O(N log N)',
    space: 'O(1)',
    stable: false,
    description: 'Comparison-based sorting algorithm that uses a binary heap data structure. It divides its input into a sorted and an unsorted region, iteratively shrinking the unsorted region.',
    color: 'border-teal-600 bg-teal-50',
  },
  {
    id: 'radix',
    name: 'Radix Sort',
    type: 'Non-Comparison',
    best: 'O(N * K)',
    average: 'O(N * K)',
    worst: 'O(N * K)',
    space: 'O(N + K)',
    stable: true,
    description: 'Avoids comparison by creating and distributing elements into buckets according to their radix (base). K is the number of digits in the largest number.',
    color: 'border-purple-600 bg-purple-50',
  },
];

const datasets = [
  {
    name: 'Random',
    desc: 'Elements are completely shuffled with no discernible order.',
    impact: 'Provides the baseline average-case performance for all algorithms. Quick Sort and Merge Sort shine here.',
  },
  {
    name: 'Nearly Sorted',
    desc: 'Most elements are in their correct positions, with a few elements randomly displaced.',
    impact: 'Insertion Sort becomes incredibly efficient (approaching O(N)). Quick Sort might degrade if the pivot strategy is naive (e.g., always picking the first element).',
  },
  {
    name: 'Reversed',
    desc: 'Elements are sorted, but in the exact opposite order (descending).',
    impact: 'Triggers the worst-case O(N²) for Insertion and Bubble Sort. Causes maximum element movement.',
  },
  {
    name: 'Few Uniques',
    desc: 'The array contains many duplicate values (e.g., only 3 distinct numbers in an array of 100).',
    impact: 'Algorithms like 3-Way Quick Sort excel. Unstable algorithms might unnecessarily swap equal elements.',
  },
];

// --- COMPONENTS ---

const ComplexityBadge = ({ value, label }: { value: string; label: string }) => {
  let colorClass = 'bg-gray-200 text-gray-800';
  if (value === 'O(1)' || value === 'O(log N)') colorClass = 'bg-emerald-200 text-emerald-900 border-emerald-400';
  if (value === 'O(N)' || value === 'O(N + K)') colorClass = 'bg-lime-200 text-lime-900 border-lime-400';
  if (value === 'O(N log N)' || value === 'O(N * K)') colorClass = 'bg-amber-200 text-amber-900 border-amber-400';
  if (value === 'O(N²)') colorClass = 'bg-red-200 text-red-900 border-red-400';

  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <span className={`px-2 py-1 font-mono text-sm font-bold border-2 rounded ${colorClass}`}>
        {value}
      </span>
    </div>
  );
};

const StabilityInteractiveCard = () => {
  const [sortState, setSortState] = useState<'unsorted' | 'stable' | 'unstable'>('unsorted');

  // We use suits/colors to demonstrate stability.
  // The sorting key is the number.
  // 5♠ (Spades/Black), 3♥ (Hearts/Red), 5♦ (Diamonds/Blue for contrast)
  const items = [
    { id: 'item1', key: 5, variant: 'A', color: 'bg-black text-white' },
    { id: 'item2', key: 3, variant: 'B', color: 'bg-red-600 text-white' },
    { id: 'item3', key: 5, variant: 'C', color: 'bg-blue-600 text-white' },
    { id: 'item4', key: 1, variant: 'D', color: 'bg-emerald-600 text-white' },
  ];

  let displayItems = [...items];

  if (sortState === 'stable') {
    // 1(D), 3(B), 5(A), 5(C)
    displayItems = [items[3], items[1], items[0], items[2]];
  } else if (sortState === 'unstable') {
    // 1(D), 3(B), 5(C), 5(A) - C and A swapped!
    displayItems = [items[3], items[1], items[2], items[0]];
  }

  return (
    <div className="border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_rgba(15,23,42,1)] rounded-xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" />
            Understanding Stability
          </h3>
          <p className="text-slate-700 mt-2 font-medium max-w-2xl">
            A sorting algorithm is <strong className="text-blue-700">Stable</strong> if two objects with equal keys appear in the same order in sorted output as they appear in the input array.
          </p>
        </div>
      </div>

      <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-6 mb-6">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">
          Visual Demonstration
        </h4>
        <div className="flex justify-center gap-4 min-h-[120px]">
          {displayItems.map((item, idx) => (
            <div
              key={item.id}
              className={`relative flex flex-col items-center justify-center w-24 h-32 rounded-lg border-4 border-slate-900 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] transition-all duration-500 ${item.color}`}
            >
              <span className="text-4xl font-black">{item.key}</span>
              <span className="absolute bottom-2 right-2 text-sm font-bold opacity-80">
                Type {item.variant}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => setSortState('unsorted')}
          className={`px-6 py-3 font-bold text-lg rounded border-2 transition-all ${
            sortState === 'unsorted'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'
          }`}
        >
          Reset (Unsorted)
        </button>
        <button
          onClick={() => setSortState('stable')}
          className={`px-6 py-3 font-bold text-lg rounded border-2 transition-all ${
            sortState === 'stable'
              ? 'bg-emerald-600 text-white border-emerald-900 shadow-[4px_4px_0px_rgba(6,78,59,1)]'
              : 'bg-emerald-50 text-emerald-900 border-emerald-900 hover:bg-emerald-100'
          }`}
        >
          Sort (Stable)
        </button>
        <button
          onClick={() => setSortState('unstable')}
          className={`px-6 py-3 font-bold text-lg rounded border-2 transition-all ${
            sortState === 'unstable'
              ? 'bg-red-600 text-white border-red-900 shadow-[4px_4px_0px_rgba(127,29,29,1)]'
              : 'bg-red-50 text-red-900 border-red-900 hover:bg-red-100'
          }`}
        >
          Sort (Unstable)
        </button>
      </div>

      {sortState === 'stable' && (
        <div className="mt-6 p-4 bg-emerald-100 border-l-8 border-emerald-600 text-emerald-900 font-semibold rounded">
          <p>Notice how <strong>5 (Type A)</strong> still comes before <strong>5 (Type C)</strong>. Their relative order was preserved!</p>
        </div>
      )}
      {sortState === 'unstable' && (
        <div className="mt-6 p-4 bg-red-100 border-l-8 border-red-600 text-red-900 font-semibold rounded">
          <p>Notice how <strong>5 (Type C)</strong> now comes before <strong>5 (Type A)</strong>. The algorithm swapped them unnecessarily!</p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'algorithms' | 'datasets' | 'stability'>('algorithms');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-300 selection:text-blue-900">
      {/* Header */}
      <header className="bg-slate-900 text-white py-8 px-6 border-b-8 border-blue-600">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <BookOpen className="w-10 h-10 text-blue-400" />
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Sorting Race 2.0</h1>
            <h2 className="text-xl font-medium text-blue-200">Theory & Reference Manual</h2>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">
        
        {/* Navigation Sidebar */}
        <aside className="lg:w-1/4 flex-shrink-0">
          <nav className="flex flex-col gap-3 sticky top-10">
            <button
              onClick={() => setActiveTab('algorithms')}
              className={`flex items-center gap-3 px-5 py-4 text-left font-bold text-lg rounded-xl border-4 transition-all ${
                activeTab === 'algorithms'
                  ? 'bg-blue-600 text-white border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] translate-x-[-2px] translate-y-[-2px]'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900 hover:text-slate-900'
              }`}
            >
              <FastForward className="w-6 h-6" />
              Algorithm Specs
            </button>
            <button
              onClick={() => setActiveTab('datasets')}
              className={`flex items-center gap-3 px-5 py-4 text-left font-bold text-lg rounded-xl border-4 transition-all ${
                activeTab === 'datasets'
                  ? 'bg-amber-500 text-slate-900 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] translate-x-[-2px] translate-y-[-2px]'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900 hover:text-slate-900'
              }`}
            >
              <BarChart className="w-6 h-6" />
              Dataset Impacts
            </button>
            <button
              onClick={() => setActiveTab('stability')}
              className={`flex items-center gap-3 px-5 py-4 text-left font-bold text-lg rounded-xl border-4 transition-all ${
                activeTab === 'stability'
                  ? 'bg-emerald-500 text-slate-900 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] translate-x-[-2px] translate-y-[-2px]'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900 hover:text-slate-900'
              }`}
            >
              <Layers className="w-6 h-6" />
              Stability Concept
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <section className="lg:w-3/4">
          
          {/* ALGORITHM SPECS TAB */}
          {activeTab === 'algorithms' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-4xl font-black text-slate-900 mb-4">Algorithm Specifications</h2>
                <p className="text-xl text-slate-600 font-medium">
                  Compare the theoretical performance of the racers. Time complexity dictates how operations scale as the array grows.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {algorithms.map((algo) => (
                  <div key={algo.id} className={`flex flex-col rounded-xl border-4 border-slate-900 shadow-[6px_6px_0px_rgba(15,23,42,1)] overflow-hidden bg-white`}>
                    <div className={`px-6 py-4 border-b-4 border-slate-900 flex justify-between items-center ${algo.color}`}>
                      <h3 className="text-2xl font-black text-slate-900">{algo.name}</h3>
                      {algo.stable ? (
                        <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border-2 border-emerald-600 text-emerald-700 text-xs font-bold uppercase">
                          <CheckSquare className="w-4 h-4" /> Stable
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border-2 border-red-600 text-red-700 text-xs font-bold uppercase">
                          <XSquare className="w-4 h-4" /> Unstable
                        </span>
                      )}
                    </div>
                    
                    <div className="p-6 flex-grow flex flex-col">
                      <p className="text-slate-700 font-medium text-sm mb-6 flex-grow">
                        {algo.description}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <ComplexityBadge label="Best Time" value={algo.best} />
                        <ComplexityBadge label="Avg Time" value={algo.average} />
                        <ComplexityBadge label="Worst Time" value={algo.worst} />
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t-2 border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase">Space Complexity</span>
                        <span className="font-mono font-bold text-lg bg-slate-100 px-3 py-1 rounded border-2 border-slate-300">
                          {algo.space}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATASET IMPACTS TAB */}
          {activeTab === 'datasets' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-4xl font-black text-slate-900 mb-4">Dataset Impacts</h2>
                <p className="text-xl text-slate-600 font-medium">
                  The initial state of your data can drastically change which algorithm wins the race.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {datasets.map((ds, idx) => (
                  <div key={idx} className="bg-white border-4 border-slate-900 p-6 rounded-xl shadow-[6px_6px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row gap-6 items-start">
                    <div className="md:w-1/3">
                      <h3 className="text-2xl font-black text-amber-600 uppercase tracking-tight">{ds.name}</h3>
                      <p className="text-slate-600 mt-2 font-medium">{ds.desc}</p>
                    </div>
                    <div className="md:w-2/3 bg-amber-50 p-5 rounded-lg border-2 border-amber-200">
                      <h4 className="text-amber-900 font-bold uppercase text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Race Impact
                      </h4>
                      <p className="text-amber-800 font-medium leading-relaxed">
                        {ds.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STABILITY TAB */}
          {activeTab === 'stability' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StabilityInteractiveCard />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-slate-50 border-2 border-slate-300 p-6 rounded-xl">
                  <h4 className="text-lg font-black text-slate-900 mb-2">Why does it matter?</h4>
                  <p className="text-slate-700 font-medium">
                    Stability is crucial when sorting complex objects by multiple criteria. For example, if you sort a list of users by <em>Age</em>, and then sort that same list by <em>Department</em> using a stable algorithm, users within the same department will still be sorted by Age!
                  </p>
                </div>
                <div className="bg-slate-50 border-2 border-slate-300 p-6 rounded-xl">
                  <h4 className="text-lg font-black text-slate-900 mb-2">The Trade-off</h4>
                  <p className="text-slate-700 font-medium">
                    Stable algorithms often require extra memory (like Merge Sort's O(N) space) or are slower overall (like Bubble Sort). Unstable algorithms like Quick Sort are often faster in practice and use less memory, making them the default in many standard libraries.
                  </p>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}