import React, { useState, useEffect, useMemo } from 'react';
import { Info, BarChart2, Zap, RotateCcw, ShieldCheck, ShieldAlert, FastForward, Settings } from 'lucide-react';

// --- Types & Mock Data Generators ---
type DatasetType = 'random' | 'nearly_sorted' | 'reversed' | 'few_uniques';

interface AlgorithmResult {
  id: string;
  name: string;
  timeMs: number;
  swaps: number;
  operations: number;
  stable: boolean;
  color: string;
  complexity: string;
}

const ALGORITHMS = [
  { id: 'radix', name: 'Radix Sort', stable: true, color: 'bg-[#e11d48]', text: 'text-[#e11d48]', complexity: 'O(nk)' },
  { id: 'quick', name: 'Quick Sort', stable: false, color: 'bg-[#1d4ed8]', text: 'text-[#1d4ed8]', complexity: 'O(n log n)' },
  { id: 'merge', name: 'Merge Sort', stable: true, color: 'bg-[#047857]', text: 'text-[#047857]', complexity: 'O(n log n)' },
  { id: 'heap', name: 'Heap Sort', stable: false, color: 'bg-[#d97706]', text: 'text-[#d97706]', complexity: 'O(n log n)' },
  { id: 'insertion', name: 'Insertion Sort', stable: true, color: 'bg-[#6d28d9]', text: 'text-[#6d28d9]', complexity: 'O(n²)' },
  { id: 'bubble', name: 'Bubble Sort', stable: true, color: 'bg-[#0891b2]', text: 'text-[#0891b2]', complexity: 'O(n²)' },
];

const generateResults = (size: number, dataset: DatasetType): AlgorithmResult[] => {
  const baseN = size;
  const nLogN = size * Math.log2(size);
  const nSquared = size * size;

  return ALGORITHMS.map(algo => {
    let ops = 0;
    let swaps = 0;
    let timeMs = 0;

    switch (algo.id) {
      case 'radix':
        ops = baseN * 3; // O(nk) roughly
        swaps = ops; // Radix "moves" rather than swaps, modeled as swaps here
        timeMs = ops * 0.05;
        break;
      case 'quick':
        ops = dataset === 'reversed' ? nSquared * 0.5 : nLogN * 1.2;
        swaps = ops * 0.3;
        timeMs = ops * 0.08;
        break;
      case 'merge':
        ops = nLogN * 1.5;
        swaps = nLogN * 1.5; // Array writes
        timeMs = ops * 0.09;
        break;
      case 'heap':
        ops = nLogN * 2;
        swaps = nLogN;
        timeMs = ops * 0.1;
        break;
      case 'insertion':
        if (dataset === 'nearly_sorted') {
          ops = baseN * 2;
          swaps = baseN * 0.1;
        } else if (dataset === 'reversed') {
          ops = nSquared * 0.5;
          swaps = nSquared * 0.5;
        } else {
          ops = nSquared * 0.25;
          swaps = nSquared * 0.25;
        }
        timeMs = ops * 0.15;
        break;
      case 'bubble':
        if (dataset === 'nearly_sorted') {
          ops = baseN * 2;
          swaps = baseN * 0.1;
        } else if (dataset === 'reversed') {
          ops = nSquared * 0.5;
          swaps = nSquared * 0.5;
        } else {
          ops = nSquared * 0.5;
          swaps = nSquared * 0.25;
        }
        timeMs = ops * 0.2;
        break;
    }

    // Add slight randomization for realism
    const jitter = () => 0.95 + Math.random() * 0.1;

    return {
      ...algo,
      operations: Math.floor(ops * jitter()),
      swaps: Math.floor(swaps * jitter()),
      timeMs: Math.max(1, Math.floor(timeMs * jitter()))
    };
  }).sort((a, b) => a.timeMs - b.timeMs);
};

// --- Components ---

const MetricBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const percentage = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-slate-700 w-16 text-right">
        {value.toLocaleString()}
      </span>
    </div>
  );
};

export default function App() {
  const [dataset, setDataset] = useState<DatasetType>('random');
  const [arraySize, setArraySize] = useState<number>(1000);
  const [results, setResults] = useState<AlgorithmResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showStabilityGuide, setShowStabilityGuide] = useState(true);

  const runAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate async analysis processing
    setTimeout(() => {
      setResults(generateResults(arraySize, dataset));
      setIsAnalyzing(false);
    }, 600);
  };

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, arraySize]);

  const maxTime = Math.max(...results.map(r => r.timeMs), 1);
  const maxSwaps = Math.max(...results.map(r => r.swaps), 1);
  const maxOps = Math.max(...results.map(r => r.operations), 1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-8 selection:bg-blue-200">
      
      {/* Header */}
      <header className="mb-8 border-b-4 border-slate-900 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 className="w-8 h-8 text-blue-700" strokeWidth={2.5} />
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Race Analysis</h1>
          </div>
          <p className="text-slate-600 font-medium text-lg">
            Post-run performance summary and algorithmic metrics.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border-2 border-slate-200 shadow-sm">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">Dataset Preset</label>
            <select 
              value={dataset}
              onChange={(e) => setDataset(e.target.value as DatasetType)}
              className="bg-slate-100 border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2 font-semibold"
            >
              <option value="random">Randomized</option>
              <option value="nearly_sorted">Nearly Sorted</option>
              <option value="reversed">Reversed</option>
              <option value="few_uniques">Few Unique Values</option>
            </select>
          </div>

          <div className="flex flex-col w-32">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1">Array Size: {arraySize}</label>
            <input 
              type="range" 
              min="100" 
              max="5000" 
              step="100"
              value={arraySize}
              onChange={(e) => setArraySize(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
            />
          </div>

          <button 
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="mt-5 bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-md transition-colors disabled:opacity-50"
            title="Re-run Analysis"
          >
            <RotateCcw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Leaderboard Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FastForward className="w-6 h-6 text-slate-700" />
              Leaderboard & Metrics
            </h2>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Settings className="w-4 h-4" />
              <span>N = {arraySize.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 shadow-md rounded-xl overflow-hidden relative">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <RotateCcw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <span className="font-bold text-slate-700 animate-pulse">Computing operations...</span>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200">
                    <th className="p-4 font-black text-slate-600 uppercase tracking-wider text-sm w-16 text-center">Rank</th>
                    <th className="p-4 font-black text-slate-600 uppercase tracking-wider text-sm">Algorithm</th>
                    <th className="p-4 font-black text-slate-600 uppercase tracking-wider text-sm w-1/4">Time (ms)</th>
                    <th className="p-4 font-black text-slate-600 uppercase tracking-wider text-sm w-1/4">Operations</th>
                    <th className="p-4 font-black text-slate-600 uppercase tracking-wider text-sm w-1/4">Swaps / Moves</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((algo, index) => (
                    <tr key={algo.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 text-center font-black text-xl text-slate-400 group-hover:text-slate-700 transition-colors">
                        #{index + 1}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${algo.color}`}></span>
                          <span className="font-bold text-slate-800 text-lg">{algo.name}</span>
                          {algo.stable ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600" title="Stable" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-amber-500" title="Unstable" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Worst Case: {algo.complexity}</span>
                      </td>
                      <td className="p-4">
                        <MetricBar value={algo.timeMs} max={maxTime} color={algo.color} />
                      </td>
                      <td className="p-4">
                        <MetricBar value={algo.operations} max={maxOps} color="bg-slate-400" />
                      </td>
                      <td className="p-4">
                        <MetricBar value={algo.swaps} max={maxSwaps} color="bg-slate-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel: Info & Stability */}
        <div className="space-y-6">
          
          {/* Highlight Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 border-2 border-emerald-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-emerald-800 font-bold text-sm uppercase tracking-wider mb-1">Fastest</h3>
              <div className="text-2xl font-black text-slate-900 mb-2">{results[0]?.name}</div>
              <div className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
                <Zap className="w-4 h-4" />
                {results[0]?.timeMs.toLocaleString()} ms
              </div>
            </div>
            
            <div className="bg-white p-5 border-2 border-red-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-red-800 font-bold text-sm uppercase tracking-wider mb-1">Slowest</h3>
              <div className="text-2xl font-black text-slate-900 mb-2">{results[results.length - 1]?.name}</div>
              <div className="flex items-center gap-1 text-red-600 font-semibold text-sm">
                <Info className="w-4 h-4" />
                {results[results.length - 1]?.timeMs.toLocaleString()} ms
              </div>
            </div>
          </div>

          {/* Stability Explanation Card */}
          <div className="bg-white border-2 border-slate-800 rounded-xl shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] overflow-hidden">
            <div className="bg-slate-800 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Algorithm Stability
              </h3>
              <button 
                onClick={() => setShowStabilityGuide(!showStabilityGuide)}
                className="text-slate-300 hover:text-white bg-slate-700/50 p-1.5 rounded-md transition-colors"
              >
                {showStabilityGuide ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showStabilityGuide && (
              <div className="p-5 space-y-4">
                <p className="text-slate-600 font-medium text-sm leading-relaxed">
                  A sorting algorithm is <strong>stable</strong> if it preserves the relative order of equal elements. If two elements have the same key, a stable sort ensures the one that appeared first in the input will appear first in the output.
                </p>
                
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm uppercase border-b-2 border-slate-100 pb-1">Stable Sorts</h4>
                  <div className="flex flex-wrap gap-2">
                    {ALGORITHMS.filter(a => a.stable).map(a => (
                      <span key={a.id} className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-md border border-emerald-200">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm uppercase border-b-2 border-slate-100 pb-1">Unstable Sorts</h4>
                  <div className="flex flex-wrap gap-2">
                    {ALGORITHMS.filter(a => !a.stable).map(a => (
                      <span key={a.id} className="px-2 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-md border border-amber-200">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-4">
                  <p className="text-xs text-blue-800 font-semibold italic">
                    <strong>Why it matters:</strong> If you sort a list of students by "Grade", and then sort that result by "Age" using a stable sort, students of the same age will remain sorted by their grades!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dataset Behavior Info */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Dataset Insights
            </h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {dataset === 'random' && "Randomized data is the baseline. O(N log N) algorithms typically dominate here, while O(N²) sorts fall far behind."}
              {dataset === 'nearly_sorted' && "Insertion sort becomes highly competitive (approaching O(N)) when elements are only slightly out of place."}
              {dataset === 'reversed' && "Reversed data is the worst-case for simple algorithms. Bubble and Insertion perform terribly. Quick sort may also degrade to O(N²) if pivot selection is naive."}
              {dataset === 'few_uniques' && "Data with many duplicates favors algorithms like 3-way Quick Sort or Radix Sort. Unstable sorts might excessively swap equal elements."}
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

/* 
  Dependencies required for this component:
  - react
  - lucide-react (for icons)
  - tailwindcss (configured for the project)
*/