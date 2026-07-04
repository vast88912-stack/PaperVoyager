import React, { useState } from 'react';
import { BookOpen, Zap, Shield, Layers, ArrowRight, CheckCircle2, XCircle, Info } from 'lucide-react';

// --- DATA ---

const ALGORITHMS = [
  {
    id: 'bubble',
    name: 'Bubble Sort',
    theme: 'bg-pink-400',
    type: 'Comparison',
    stable: true,
    time: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    description: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted.',
    pedagogy: 'Excellent for teaching the concept of swapping and basic algorithmic thinking, but terrible for practical use on large datasets due to its quadratic time complexity.',
    bestCase: 'When the array is already sorted (requires optimization to break early).',
    worstCase: 'When the array is reverse sorted.'
  },
  {
    id: 'insertion',
    name: 'Insertion Sort',
    theme: 'bg-green-400',
    type: 'Comparison',
    stable: true,
    time: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)' },
    space: 'O(1)',
    description: 'Builds the final sorted array one item at a time. It takes an element from the unsorted part and inserts it into its correct position in the sorted part.',
    pedagogy: 'Highly efficient for small datasets or nearly sorted arrays. Often used as the base case in more complex algorithms like Timsort.',
    bestCase: 'Nearly sorted data. It only needs to verify order, making it O(n).',
    worstCase: 'Reverse sorted data, requiring maximum shifts.'
  },
  {
    id: 'merge',
    name: 'Merge Sort',
    theme: 'bg-blue-400',
    type: 'Divide & Conquer',
    stable: true,
    time: { best: 'Ω(n log n)', avg: 'Θ(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
    description: 'Divides the unsorted list into n sublists, each containing one element, then repeatedly merges sublists to produce new sorted sublists until there is only one sorted list remaining.',
    pedagogy: 'The quintessential divide-and-conquer algorithm. Guarantees O(n log n) time, making it highly reliable, though it requires extra memory for the merging process.',
    bestCase: 'Consistent performance regardless of input.',
    worstCase: 'Consistent performance regardless of input.'
  },
  {
    id: 'quick',
    name: 'Quick Sort',
    theme: 'bg-yellow-400',
    type: 'Divide & Conquer',
    stable: false,
    time: { best: 'Ω(n log n)', avg: 'Θ(n log n)', worst: 'O(n²)' },
    space: 'O(log n)',
    description: 'Picks an element as a pivot and partitions the given array around the picked pivot, placing smaller elements before it and larger after it, then recursively sorting the sub-arrays.',
    pedagogy: 'Usually the fastest in practice due to excellent cache locality. The choice of pivot is crucial to avoid the O(n²) worst-case scenario.',
    bestCase: 'Pivot always divides the array into two equal halves.',
    worstCase: 'Array is already sorted or reverse sorted, and a poor pivot (like the first/last element) is chosen.'
  },
  {
    id: 'heap',
    name: 'Heap Sort',
    theme: 'bg-purple-400',
    type: 'Comparison',
    stable: false,
    time: { best: 'Ω(n log n)', avg: 'Θ(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
    description: 'Converts the array into a max-heap data structure, then repeatedly extracts the maximum element and rebuilds the heap until sorted.',
    pedagogy: 'An elegant in-place algorithm that guarantees O(n log n) time. Great for systems with strict memory limits, though generally slower than Quick Sort in practice.',
    bestCase: 'All elements are identical (can be O(n) with specific optimizations).',
    worstCase: 'Consistent O(n log n) regardless of input.'
  },
  {
    id: 'radix',
    name: 'Radix Sort',
    theme: 'bg-orange-400',
    type: 'Non-Comparison',
    stable: true,
    time: { best: 'Ω(nk)', avg: 'Θ(nk)', worst: 'O(nk)' },
    space: 'O(n + k)',
    description: 'Sorts data with integer keys by grouping keys by the individual digits which share the same significant position and value.',
    pedagogy: 'Demonstrates that we can break the O(n log n) lower bound of comparison sorts by using the specific properties of the data (like digits or characters).',
    bestCase: 'When the number of digits (k) is small.',
    worstCase: 'When elements have many digits/long string lengths.'
  }
];

// --- COMPONENTS ---

const StabilityDemo = () => {
  const [isStable, setIsStable] = useState(true);

  // Unsorted: [4, 5A, 2, 5B, 1]
  const unsorted = [
    { val: 4, id: '', color: 'bg-slate-100' },
    { val: 5, id: 'A', color: 'bg-red-300' },
    { val: 2, id: '', color: 'bg-slate-100' },
    { val: 5, id: 'B', color: 'bg-blue-300' },
    { val: 1, id: '', color: 'bg-slate-100' },
  ];

  // Stable Sort: [1, 2, 4, 5A, 5B]
  const stableSorted = [
    { val: 1, id: '', color: 'bg-slate-100' },
    { val: 2, id: '', color: 'bg-slate-100' },
    { val: 4, id: '', color: 'bg-slate-100' },
    { val: 5, id: 'A', color: 'bg-red-300' },
    { val: 5, id: 'B', color: 'bg-blue-300' },
  ];

  // Unstable Sort: [1, 2, 4, 5B, 5A]
  const unstableSorted = [
    { val: 1, id: '', color: 'bg-slate-100' },
    { val: 2, id: '', color: 'bg-slate-100' },
    { val: 4, id: '', color: 'bg-slate-100' },
    { val: 5, id: 'B', color: 'bg-blue-300' },
    { val: 5, id: 'A', color: 'bg-red-300' },
  ];

  const currentDisplay = isStable ? stableSorted : unstableSorted;

  return (
    <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-8 h-8 text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tight">What is Stability?</h2>
      </div>
      
      <p className="text-lg font-medium mb-6 text-slate-800">
        A sorting algorithm is <strong className="bg-yellow-200 px-1">stable</strong> if it preserves the relative order of equal elements. 
        Notice what happens to the two <strong className="text-red-600">5A</strong> and <strong className="text-blue-600">5B</strong> blocks when sorted!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Unsorted Array */}
        <div className="flex flex-col gap-2">
          <span className="font-bold uppercase text-sm tracking-wider text-slate-500">Original Array</span>
          <div className="flex gap-2">
            {unsorted.map((item, idx) => (
              <div key={idx} className={`w-12 h-12 flex items-center justify-center border-2 border-black font-black text-xl ${item.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                {item.val}{item.id && <span className="text-xs ml-0.5">{item.id}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Arrow (Desktop) */}
        <div className="hidden md:flex justify-center">
          <ArrowRight className="w-10 h-10 text-slate-300" />
        </div>

        {/* Sorted Array Interactive */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase text-sm tracking-wider text-slate-500">Sorted Result</span>
            <div className="flex border-2 border-black rounded overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <button 
                onClick={() => setIsStable(true)}
                className={`px-3 py-1 font-bold text-sm ${isStable ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'}`}
              >
                STABLE
              </button>
              <button 
                onClick={() => setIsStable(false)}
                className={`px-3 py-1 font-bold text-sm ${!isStable ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'}`}
              >
                UNSTABLE
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {currentDisplay.map((item, idx) => (
              <div key={idx} className={`w-12 h-12 flex items-center justify-center border-2 border-black font-black text-xl transition-all duration-300 ${item.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                {item.val}{item.id && <span className="text-xs ml-0.5">{item.id}</span>}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-600 min-h-[40px]">
            {isStable 
              ? <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> 5A stays before 5B. Order preserved!</span>
              : <span className="text-red-700 flex items-center gap-1"><XCircle className="w-4 h-4"/> 5B jumped before 5A. Order lost!</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const ComplexityTable = () => {
  return (
    <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      <div className="bg-black text-white p-4 flex items-center gap-3">
        <Zap className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-black uppercase tracking-tight">Big-O Complexity Cheatsheet</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-4 border-black">
              <th className="p-4 font-black uppercase tracking-wider text-sm border-r-4 border-black">Algorithm</th>
              <th className="p-4 font-black uppercase tracking-wider text-sm border-r-4 border-black text-green-700">Best Time</th>
              <th className="p-4 font-black uppercase tracking-wider text-sm border-r-4 border-black text-yellow-700">Avg Time</th>
              <th className="p-4 font-black uppercase tracking-wider text-sm border-r-4 border-black text-red-700">Worst Time</th>
              <th className="p-4 font-black uppercase tracking-wider text-sm border-r-4 border-black">Space</th>
              <th className="p-4 font-black uppercase tracking-wider text-sm">Stable?</th>
            </tr>
          </thead>
          <tbody>
            {ALGORITHMS.map((algo, idx) => (
              <tr key={algo.id} className={`border-b-2 border-black last:border-0 hover:bg-slate-50 transition-colors`}>
                <td className="p-4 border-r-4 border-black font-bold flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full border border-black ${algo.theme}`}></div>
                  {algo.name}
                </td>
                <td className="p-4 border-r-4 border-black font-mono font-medium">{algo.time.best}</td>
                <td className="p-4 border-r-4 border-black font-mono font-medium">{algo.time.avg}</td>
                <td className="p-4 border-r-4 border-black font-mono font-medium">{algo.time.worst}</td>
                <td className="p-4 border-r-4 border-black font-mono font-medium">{algo.space}</td>
                <td className="p-4 font-bold">
                  {algo.stable ? (
                    <span className="bg-green-200 text-green-900 px-2 py-1 border border-black text-xs uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">Yes</span>
                  ) : (
                    <span className="bg-red-200 text-red-900 px-2 py-1 border border-black text-xs uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [activeAlgo, setActiveAlgo] = useState(ALGORITHMS[0]);

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-slate-900 font-sans p-4 md:p-8 selection:bg-yellow-300 selection:text-black">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-12">
        <div className="inline-block border-4 border-black bg-yellow-400 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
            Sorting Theory
          </h1>
        </div>
        <p className="text-xl font-bold max-w-3xl leading-relaxed border-l-8 border-black pl-6 py-2">
          Master the mechanics behind the algorithms. Understand time complexity, space constraints, and why stability matters in real-world engineering.
        </p>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        
        {/* Stability Section */}
        <section>
          <StabilityDemo />
        </section>

        {/* Algorithm Deep Dive */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 mb-2">
              <Layers className="w-6 h-6" /> Algorithms
            </h3>
            {ALGORITHMS.map((algo) => {
              const isActive = activeAlgo.id === algo.id;
              return (
                <button
                  key={algo.id}
                  onClick={() => setActiveAlgo(algo)}
                  className={`
                    text-left px-5 py-4 font-bold uppercase tracking-wider border-4 border-black transition-all
                    ${isActive 
                      ? `${algo.theme} translate-x-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` 
                      : 'bg-white hover:bg-slate-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span>{algo.name}</span>
                    {isActive && <ArrowRight className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail View */}
          <div className="lg:col-span-8">
            <div className="h-full border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden">
              
              {/* Decorative background accent */}
              <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full border-4 border-black opacity-20 ${activeAlgo.theme}`}></div>

              <div className="flex flex-wrap items-start justify-between gap-4 mb-6 relative z-10">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tight mb-2">{activeAlgo.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-slate-200 border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {activeAlgo.type}
                    </span>
                    <span className={`px-3 py-1 border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${activeAlgo.stable ? 'bg-green-200' : 'bg-red-200'}`}>
                      {activeAlgo.stable ? 'Stable' : 'Unstable'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-4 text-center">
                  <div className="flex flex-col border-2 border-black p-2 bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-xs font-black uppercase text-slate-500 mb-1">Time (Avg)</span>
                    <span className="font-mono font-bold text-lg">{activeAlgo.time.avg}</span>
                  </div>
                  <div className="flex flex-col border-2 border-black p-2 bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-xs font-black uppercase text-slate-500 mb-1">Space</span>
                    <span className="font-mono font-bold text-lg">{activeAlgo.space}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <h4 className="text-lg font-black uppercase border-b-4 border-black pb-1 mb-3 inline-block">How it works</h4>
                  <p className="text-lg font-medium leading-relaxed text-slate-700">
                    {activeAlgo.description}
                  </p>
                </div>

                <div className="bg-yellow-100 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="text-sm font-black uppercase flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4" /> Pedagogy & Practice
                  </h4>
                  <p className="font-medium text-slate-800">
                    {activeAlgo.pedagogy}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="border-2 border-black p-4 relative">
                    <div className="absolute -top-3 left-4 bg-white px-2 font-black uppercase text-xs text-green-700 flex items-center gap-1">
                       Best Case
                    </div>
                    <p className="font-medium text-sm text-slate-700 mt-2">{activeAlgo.bestCase}</p>
                  </div>
                  <div className="border-2 border-black p-4 relative">
                    <div className="absolute -top-3 left-4 bg-white px-2 font-black uppercase text-xs text-red-700 flex items-center gap-1">
                       Worst Case
                    </div>
                    <p className="font-medium text-sm text-slate-700 mt-2">{activeAlgo.worstCase}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Complexity Table Section */}
        <section>
          <ComplexityTable />
        </section>

      </main>
    </div>
  );
}

// Dependencies required:
// npm install lucide-react