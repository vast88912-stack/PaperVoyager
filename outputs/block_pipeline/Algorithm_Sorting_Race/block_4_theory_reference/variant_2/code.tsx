import React, { useState } from 'react';
import { BookOpen, Table, Layers, Database, ArrowRight, Check, X, Zap, Activity, Info } from 'lucide-react';

const ALGORITHMS = [
  {
    id: 'bubble',
    name: 'Bubble Sort',
    type: 'Comparison',
    desc: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted.',
    pedagogy: 'Excellent for teaching the concept of swapping and algorithmic stepping, but terribly inefficient for real-world use.',
    best: 'O(n)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    color: 'bg-rose-300',
    ideal: 'Almost never, unless the array is already mostly sorted and extremely small.'
  },
  {
    id: 'insertion',
    name: 'Insertion Sort',
    type: 'Comparison',
    desc: 'Builds the final sorted array one item at a time. It takes an element and inserts it into its correct position within the already sorted part of the array.',
    pedagogy: 'Demonstrates how sorting can be done online (as data is received). Used in hybrid algorithms like Timsort for small subarrays.',
    best: 'O(n)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    color: 'bg-emerald-300',
    ideal: 'Nearly sorted datasets or very small arrays (n < 50).'
  },
  {
    id: 'merge',
    name: 'Merge Sort',
    type: 'Divide & Conquer',
    desc: 'Divides the unsorted list into n sublists, each containing one element, then repeatedly merges sublists to produce new sorted sublists until there is only one left.',
    pedagogy: 'The quintessential divide-and-conquer algorithm. Great for understanding recursion and predictable time complexity.',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    color: 'bg-sky-300',
    ideal: 'Large datasets where guaranteed O(n log n) performance and stability are required.'
  },
  {
    id: 'quick',
    name: 'Quick Sort',
    type: 'Divide & Conquer',
    desc: 'Picks an element as a pivot and partitions the given array around the picked pivot, placing smaller elements before it and larger after it.',
    pedagogy: 'Highlights the importance of pivot selection. Shows how average-case performance can trump worst-case guarantees in practice.',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(log n)',
    stable: false,
    color: 'bg-amber-300',
    ideal: 'General purpose sorting for random data. Often the fastest in practice due to cache locality.'
  },
  {
    id: 'heap',
    name: 'Heap Sort',
    type: 'Comparison',
    desc: 'Converts the array into a max-heap data structure, then repeatedly swaps the first element (maximum) with the last, and heapifies the remaining elements.',
    pedagogy: 'Introduces tree-based data structures represented in flat arrays. Excellent for understanding priority queues.',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
    color: 'bg-fuchsia-300',
    ideal: 'Systems with strict memory constraints where O(1) space and guaranteed O(n log n) time are needed.'
  },
  {
    id: 'radix',
    name: 'Radix Sort',
    type: 'Non-Comparison',
    desc: 'Avoids comparison by creating and distributing elements into buckets according to their radix (base). Sorts digit by digit starting from the least significant.',
    pedagogy: 'Breaks the O(n log n) lower bound of comparison sorts by leveraging the properties of the data itself (integers/strings).',
    best: 'O(nk)',
    avg: 'O(nk)',
    worst: 'O(nk)',
    space: 'O(n + k)',
    stable: true,
    color: 'bg-indigo-300',
    ideal: 'Large arrays of integers or strings where the maximum number of digits/characters (k) is relatively small.'
  }
];

const DATASETS = [
  {
    id: 'random',
    name: 'Random',
    desc: 'Elements are completely shuffled with no discernible pattern.',
    impact: 'The standard benchmark. Quick Sort and Merge Sort excel here. Bubble and Insertion will struggle massively as array size increases.',
    color: 'bg-white'
  },
  {
    id: 'nearly-sorted',
    name: 'Nearly Sorted',
    desc: '90% of elements are in the correct position, with a few random swaps.',
    impact: 'Insertion Sort shines brilliantly here, operating in near O(n) time. Quick Sort might degrade if the pivot strategy is naive (e.g., always picking the last element).',
    color: 'bg-emerald-100'
  },
  {
    id: 'reversed',
    name: 'Reversed',
    desc: 'Sorted in descending order. The absolute opposite of the goal.',
    impact: 'The ultimate worst-case for Insertion Sort and Bubble Sort, forcing maximum possible swaps. Merge Sort and Heap Sort handle it without breaking a sweat.',
    color: 'bg-rose-100'
  },
  {
    id: 'few-uniques',
    name: 'Few Uniques',
    desc: 'Contains many duplicate values (e.g., only numbers 1 through 5).',
    impact: 'Tests an algorithm\'s partitioning scheme. Quick Sort with 3-way partitioning thrives. Radix Sort is also exceptionally fast here.',
    color: 'bg-amber-100'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('algos');
  const [selectedAlgoId, setSelectedAlgoId] = useState('merge');

  const selectedAlgo = ALGORITHMS.find(a => a.id === selectedAlgoId) || ALGORITHMS[0];

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-slate-900 font-sans p-4 md:p-8 selection:bg-indigo-300">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 border-b-4 border-black pb-6">
        <div className="flex items-center gap-4 mb-2">
          <Activity className="w-10 h-10 text-indigo-600" strokeWidth={3} />
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
            Sorting Race 2.0
          </h1>
        </div>
        <p className="text-xl font-bold text-slate-600 flex items-center gap-2">
          <Info className="w-5 h-5" /> Theory & Reference Manual
        </p>
      </header>

      <main className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <nav className="flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 lg:w-64 shrink-0">
          {[
            { id: 'algos', label: 'Algorithm Lexicon', icon: BookOpen },
            { id: 'matrix', label: 'Complexity Matrix', icon: Table },
            { id: 'stability', label: 'The Stability Principle', icon: Layers },
            { id: 'datasets', label: 'Dataset Dynamics', icon: Database },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-5 py-4 font-bold text-lg text-left border-2 border-black whitespace-nowrap lg:whitespace-normal transition-all
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-[4px_4px_0px_0px_#000] translate-x-0 lg:translate-x-2' 
                    : 'bg-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]'}
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <section className="flex-1 min-w-0">
          
          {/* TAB 1: ALGORITHMS */}
          {activeTab === 'algos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Algo List */}
              <div className="col-span-1 flex flex-col gap-3">
                {ALGORITHMS.map(algo => (
                  <button
                    key={algo.id}
                    onClick={() => setSelectedAlgoId(algo.id)}
                    className={`
                      px-4 py-3 font-bold border-2 border-black text-left transition-transform
                      ${selectedAlgoId === algo.id 
                        ? `${algo.color} shadow-[4px_4px_0px_0px_#000] scale-105 z-10` 
                        : 'bg-white hover:bg-slate-50 shadow-[2px_2px_0px_0px_#000]'}
                    `}
                  >
                    {algo.name}
                  </button>
                ))}
              </div>
              
              {/* Algo Details */}
              <div className="col-span-1 md:col-span-2 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 md:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
                      {selectedAlgo.name}
                    </h2>
                    <span className="inline-block px-3 py-1 bg-black text-white text-sm font-bold uppercase tracking-wider">
                      {selectedAlgo.type}
                    </span>
                  </div>
                  <div className={`w-12 h-12 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_#000] ${selectedAlgo.color}`}>
                    <Zap className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-400 uppercase tracking-wider text-sm mb-1">Mechanism</h3>
                    <p className="text-lg font-medium leading-relaxed border-l-4 border-black pl-4">
                      {selectedAlgo.desc}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-400 uppercase tracking-wider text-sm mb-1">Pedagogical Value</h3>
                    <p className="text-md font-medium bg-slate-100 p-4 border-2 border-black border-dashed">
                      {selectedAlgo.pedagogy}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-100 p-3 border-2 border-black">
                      <div className="text-xs font-bold uppercase mb-1">Best Time</div>
                      <div className="text-xl font-black font-mono">{selectedAlgo.best}</div>
                    </div>
                    <div className="bg-amber-100 p-3 border-2 border-black">
                      <div className="text-xs font-bold uppercase mb-1">Avg Time</div>
                      <div className="text-xl font-black font-mono">{selectedAlgo.avg}</div>
                    </div>
                    <div className="bg-rose-100 p-3 border-2 border-black">
                      <div className="text-xs font-bold uppercase mb-1">Worst Time</div>
                      <div className="text-xl font-black font-mono">{selectedAlgo.worst}</div>
                    </div>
                    <div className="bg-slate-200 p-3 border-2 border-black">
                      <div className="text-xs font-bold uppercase mb-1">Space</div>
                      <div className="text-xl font-black font-mono">{selectedAlgo.space}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white border-2 border-black p-4">
                    <div className="font-bold uppercase text-sm">Stability:</div>
                    {selectedAlgo.stable ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-1 border border-emerald-700">
                        <Check className="w-4 h-4" /> Stable
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-1 border border-rose-700">
                        <X className="w-4 h-4" /> Unstable
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-400 uppercase tracking-wider text-sm mb-1">Ideal Use Case</h3>
                    <p className="font-bold text-indigo-900 bg-indigo-50 p-3 border-l-4 border-indigo-600">
                      {selectedAlgo.ideal}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLEXITY MATRIX */}
          {activeTab === 'matrix' && (
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden">
              <div className="bg-black text-white p-6">
                <h2 className="text-2xl font-black uppercase tracking-tight">Big-O Cheat Sheet</h2>
                <p className="font-medium text-slate-300">Compare algorithmic efficiency at a glance.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-4 border-black text-sm uppercase tracking-wider">
                      <th className="p-4 border-r-2 border-black font-black">Algorithm</th>
                      <th className="p-4 border-r-2 border-black font-black text-emerald-700">Best</th>
                      <th className="p-4 border-r-2 border-black font-black text-amber-700">Average</th>
                      <th className="p-4 border-r-2 border-black font-black text-rose-700">Worst</th>
                      <th className="p-4 border-r-2 border-black font-black">Space</th>
                      <th className="p-4 font-black text-center">Stable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALGORITHMS.map((algo, idx) => (
                      <tr key={algo.id} className={`border-b-2 border-black ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}>
                        <td className="p-4 border-r-2 border-black font-bold whitespace-nowrap flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border border-black ${algo.color}`}></div>
                          {algo.name}
                        </td>
                        <td className="p-4 border-r-2 border-black font-mono font-bold text-slate-700">{algo.best}</td>
                        <td className="p-4 border-r-2 border-black font-mono font-bold text-slate-700">{algo.avg}</td>
                        <td className="p-4 border-r-2 border-black font-mono font-bold text-slate-700">{algo.worst}</td>
                        <td className="p-4 border-r-2 border-black font-mono font-bold text-slate-700">{algo.space}</td>
                        <td className="p-4 text-center">
                          {algo.stable ? (
                            <span className="inline-flex justify-center items-center w-6 h-6 bg-emerald-200 border border-black rounded-full text-emerald-800">
                              <Check className="w-4 h-4" strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="inline-flex justify-center items-center w-6 h-6 bg-rose-200 border border-black rounded-full text-rose-800">
                              <X className="w-4 h-4" strokeWidth={3} />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STABILITY */}
          {activeTab === 'stability' && (
            <div className="space-y-6">
              <div className="bg-indigo-600 text-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 md:p-8">
                <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What is Stability?</h2>
                <p className="text-xl font-medium leading-relaxed">
                  A sorting algorithm is <strong>stable</strong> if it preserves the relative order of equal elements. 
                  If two items have the same sorting key, a stable sort ensures that the one that appeared first in the original list will still appear first in the sorted list.
                </p>
              </div>

              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 md:p-8">
                <h3 className="text-2xl font-black mb-6 border-b-2 border-black pb-2">Visual Demonstration</h3>
                
                {/* Visualizer */}
                <div className="space-y-8">
                  {/* Row 1: Unsorted */}
                  <div>
                    <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-3">1. Original Unsorted Array</h4>
                    <div className="flex gap-2 md:gap-4">
                      <div className="w-16 h-20 md:w-20 md:h-24 bg-white border-4 border-black flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_#000] relative">
                        <span className="text-3xl font-black">5</span>
                        <span className="absolute bottom-1 right-2 text-xs font-bold text-