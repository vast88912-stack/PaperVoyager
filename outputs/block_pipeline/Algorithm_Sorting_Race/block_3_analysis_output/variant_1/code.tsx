import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Clock, 
  ArrowRightLeft, 
  Activity, 
  Info, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  BarChart2,
  Database
} from 'lucide-react';

// --- Types & Mock Data ---

type DatasetType = 'Random' | 'Nearly Sorted' | 'Reversed' | 'Few Uniques';

interface AlgorithmResult {
  id: string;
  name: string;
  timeMs: number;
  operations: number;
  swaps: number;
  isStable: boolean;
  color: string;
}

const DATASETS: DatasetType[] = ['Random', 'Nearly Sorted', 'Reversed', 'Few Uniques'];

// Mock data simulating a race of 1000 elements
const MOCK_RESULTS: Record<DatasetType, AlgorithmResult[]> = {
  'Random': [
    { id: 'merge', name: 'Merge Sort', timeMs: 12, operations: 9976, swaps: 9976, isStable: true, color: 'bg-blue-600' },
    { id: 'quick', name: 'Quick Sort', timeMs: 9, operations: 11432, swaps: 3120, isStable: false, color: 'bg-emerald-600' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18401, swaps: 9200, isStable: false, color: 'bg-amber-600' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-600' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 145, operations: 251432, swaps: 250432, isStable: true, color: 'bg-cyan-600' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 380, operations: 499500, swaps: 251432, isStable: true, color: 'bg-red-600' },
  ],
  'Nearly Sorted': [
    { id: 'insertion', name: 'Insertion Sort', timeMs: 2, operations: 1980, swaps: 980, isStable: true, color: 'bg-cyan-600' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 5, operations: 9990, swaps: 980, isStable: true, color: 'bg-red-600' },
    { id: 'merge', name: 'Merge Sort', timeMs: 10, operations: 8432, swaps: 8432, isStable: true, color: 'bg-blue-600' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-600' },
    { id: 'quick', name: 'Quick Sort', timeMs: 15, operations: 15432, swaps: 4120, isStable: false, color: 'bg-emerald-600' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18001, swaps: 9000, isStable: false, color: 'bg-amber-600' },
  ],
  'Reversed': [
    { id: 'merge', name: 'Merge Sort', timeMs: 11, operations: 8976, swaps: 8976, isStable: true, color: 'bg-blue-600' },
    { id: 'radix', name: 'Radix Sort', timeMs: 7, operations: 4000, swaps: 0, isStable: true, color: 'bg-purple-600' },
    { id: 'heap', name: 'Heap Sort', timeMs: 13, operations: 17401, swaps: 8700, isStable: false, color: 'bg-amber-600' },
    { id: 'quick', name: 'Quick Sort', timeMs: 28, operations: 31432, swaps: 15120, isStable: false, color: 'bg-emerald-600' }, // Assuming randomized pivot
    { id: 'insertion', name: 'Insertion Sort', timeMs: 290, operations: 499500, swaps: 499500, isStable: true, color: 'bg-cyan-600' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 450, operations: 499500, swaps: 499500, isStable: true, color: 'bg-red-600' },
  ],
  'Few Uniques': [
    { id: 'radix', name: 'Radix Sort', timeMs: 5, operations: 2000, swaps: 0, isStable: true, color: 'bg-purple-600' },
    { id: 'quick', name: 'Quick Sort', timeMs: 8, operations: 9432, swaps: 2120, isStable: false, color: 'bg-emerald-600' }, // 3-way partition
    { id: 'merge', name: 'Merge Sort', timeMs: 12, operations: 9976, swaps: 9976, isStable: true, color: 'bg-blue-600' },
    { id: 'heap', name: 'Heap Sort', timeMs: 14, operations: 18401, swaps: 9200, isStable: false, color: 'bg-amber-600' },
    { id: 'insertion', name: 'Insertion Sort', timeMs: 120, operations: 201432, swaps: 200432, isStable: true, color: 'bg-cyan-600' },
    { id: 'bubble', name: 'Bubble Sort', timeMs: 340, operations: 499500, swaps: 201432, isStable: true, color: 'bg-red-600' },
  ]
};

type SortKey = keyof AlgorithmResult;

// --- Components ---

const StabilityCard = () => {
  const [demoState, setDemoState] = useState<'initial' | 'stable' | 'unstable'>('initial');

  const cards = [
    { val: 5, id: 'A', color: 'bg-rose-200 text-rose-900 border-rose-400' },
    { val: 2, id: '', color: 'bg-slate-200 text-slate-900 border-slate-400' },
    { val: 5, id: 'B', color: 'bg-sky-200 text-sky-900 border-sky-400' },
    { val: 1, id: '', color: 'bg-slate-200 text-slate-900 border-slate-400' },
  ];

  const getDisplayOrder = () => {
    switch(demoState) {
      case 'stable': return [3, 1, 0, 2]; // 1, 2, 5A, 5B
      case 'unstable': return [3, 1, 2, 0]; // 1, 2, 5B, 5A
      default: return [0, 1, 2, 3]; // 5A, 2, 5B, 1
    }
  };

  return (
    <div className="bg-white border-2 border-slate-800 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" />
            What is Algorithm Stability?
          </h3>
          <p className="text-slate-600 mt-2 font-medium max-w-2xl">
            A sorting algorithm is <strong>stable</strong> if it preserves the relative order of items with equal keys. 
            This is crucial when sorting complex objects by multiple criteria (e.g., sorting by First Name, then by Last Name).
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          
          <div className="flex-1 w-full">
            <div className="flex justify-center gap-3 mb-6 min-h-[4rem]">
              {getDisplayOrder().map((index) => {
                const card = cards[index];
                return (
                  <div 
                    key={`${card.val}-${card.id}-${index}`}
                    className={`relative w-16 h-16 flex items-center justify-center text-2xl font-black rounded-lg border-2 shadow-sm transition-all duration-500 ${card.color}`}
                  >
                    {card.val}
                    {card.id && (
                      <span className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold">
                        {card.id}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => setDemoState('initial')}
                className={`px-4 py-2 text-sm font-bold rounded-md border-2 transition-colors ${demoState === 'initial' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-800'}`}
              >
                Original Array
              </button>
              <button 
                onClick={() => setDemoState('stable')}
                className={`px-4 py-2 text-sm font-bold rounded-md border-2 transition-colors ${demoState === 'stable' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:border-emerald-600'}`}
              >
                Stable Sort
              </button>
              <button 
                onClick={() => setDemoState('unstable')}
                className={`px-4 py-2 text-sm font-bold rounded-md border-2 transition-colors ${demoState === 'unstable' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-300 hover:border-rose-600'}`}
              >
                Unstable Sort
              </button>
            </div>
          </div>

          <div className="flex-1 text-sm bg-white p-4 border-2 border-slate-200 rounded-md">
            <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-xs">Observation</h4>
            {demoState === 'initial' && <p className="text-slate-600">Notice the two <strong>5</strong>s. One is marked <span className="text-rose-600 font-bold">A</span> and the other <span className="text-sky-600 font-bold">B</span>. <span className="text-rose-600 font-bold">A</span> comes before <span className="text-sky-600 font-bold">B</span>.</p>}
            {demoState === 'stable' && <p className="text-emerald-700 font-medium">In a stable sort, the equal elements maintain their original relative order. <span className="text-rose-600 font-black">5A</span> still comes before <span className="text-sky-600 font-black">5B</span>.</p>}
            {demoState === 'unstable' && <p className="text-rose-700 font-medium">In an unstable sort, the algorithm might swap equal elements past each other. Here, <span className="text-sky-600 font-black">5B</span> ended up before <span className="text-rose-600 font-black">5A</span>.</p>}
          </div>

        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [dataset, setDataset] = useState<DatasetType>('Random');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'timeMs', direction: 'asc' });

  const currentResults = MOCK_RESULTS[dataset];

  // Calculate max values for bar charts
  const maxValues = useMemo(() => {
    return {
      timeMs: Math.max(...currentResults.map(r => r.timeMs)),
      operations: Math.max(...currentResults.map(r => r.operations)),
      swaps: Math.max(...currentResults.map(r => r.swaps)),
    };
  }, [currentResults]);

  const sortedResults = useMemo(() => {
    let sortable = [...currentResults];
    sortable.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [currentResults, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <BarChart2 className="w-4 h-4 opacity-20" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" /> 
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12 selection:bg-blue-200">
      
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-slate-900 pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">
              Race Analysis
            </h1>
            <p className="text-lg text-slate-600 font-medium mt-2">
              Post-run summary, metrics, and stability breakdown.
            </p>
          </div>

          {/* Dataset Selector Mock */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border-2 border-slate-300 shadow-sm">
            <Database className="w-5 h-5 text-slate-500 ml-2" />
            <select 
              value={dataset}
              onChange={(e) => setDataset(e.target.value as DatasetType)}
              className="bg-transparent border-none text-slate-800 font-bold focus:ring-0 cursor-pointer outline-none pr-4"
            >
              {DATASETS.map(ds => (
                <option key={ds} value={ds}>{ds} Dataset (N=1000)</option>
              ))}
            </select>
          </div>
        </header>

        {/* Top Stats / Winner Banner */}
        <div className="bg-blue-600 text-white rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] border-2 border-slate-900 flex items-center gap-6">
          <div className="bg-blue-500 p-4 rounded-full border-2 border-blue-400">
            <Trophy className="w-10 h-10 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-blue-100 font-bold uppercase tracking-wider text-sm mb-1">Fastest Algorithm ({dataset})</h2>
            <div className="text-3xl font-black flex items-baseline gap-3">
              {sortedResults.reduce((prev, curr) => prev.timeMs < curr.timeMs ? prev : curr).name}
              <span className="text-xl text-blue-200 font-bold">
                {sortedResults.reduce((prev, curr) => prev.timeMs < curr.timeMs ? prev : curr).timeMs}ms
              </span>
            </div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-900">
                  <th className="p-4 font-black text-slate-800 uppercase tracking-wider text-sm w-1/4">
                    Algorithm
                  </th>
                  <th 
                    className="p-4 font-black text-slate-800 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-200 transition-colors w-1/5"
                    onClick={() => handleSort('timeMs')}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Time (ms) <SortIcon columnKey="timeMs" />
                    </div>
                  </th>
                  <th 
                    className="p-4 font-black text-slate-800 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-200 transition-colors w-1/5"
                    onClick={() => handleSort('operations')}
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Operations <SortIcon columnKey="operations" />
                    </div>
                  </th>
                  <th 
                    className="p-4 font-black text-slate-800 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-200 transition-colors w-1/5"
                    onClick={() => handleSort('swaps')}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" /> Swaps <SortIcon columnKey="swaps" />
                    </div>
                  </th>
                  <th 
                    className="p-4 font-black text-slate-800 uppercase tracking-wider text-sm cursor-pointer hover:bg-slate-200 transition-colors text-center"
                    onClick={() => handleSort('isStable')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Stability <SortIcon columnKey="isStable" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {sortedResults.map((result, idx) => (
                  <tr 
                    key={result.id} 
                    className={`group transition-colors hover:bg-slate-50 ${idx === 0 && sortConfig.key === 'timeMs' && sortConfig.direction === 'asc' ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-sm border border-slate-900 ${result.color}`} />
                        <span className="font-bold text-slate-900">{result.name}</span>
                      </div>
                    </td>
                    
                    {/* Time Column with embedded bar */}
                    <td className="p-4 relative">
                      <div className="absolute inset-y-0 left-0 bg-blue-100/50 -z-10 transition-all duration-500" style={{ width: `${(result.timeMs / maxValues.timeMs) * 100}%` }} />
                      <span className="font-mono font-bold text-slate-700">{formatNumber(result.timeMs)}</span>
                    </td>
                    
                    {/* Operations Column with embedded bar */}
                    <td className="p-4 relative">
                      <div className="absolute inset-y-0 left-0 bg-amber-100/50 -z-10 transition-all duration-500" style={{ width: `${(result.operations / maxValues.operations) * 100}%` }} />
                      <span className="font-mono font-bold text-slate-700">{formatNumber(result.operations)}</span>
                    </td>
                    
                    {/* Swaps Column with embedded bar */}
                    <td className="p-4 relative">
                      <div className="absolute inset-y-0 left-0 bg-emerald-100/50 -z-10 transition-all duration-500" style={{ width: maxValues.swaps > 0 ? `${(result.swaps / maxValues.swaps) * 100}%` : '0%' }} />
                      <span className="font-mono font-bold text-slate-700">{formatNumber(result.swaps)}</span>
                    </td>
                    
                    <td className="p-4 text-center">
                      {result.isStable ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs uppercase tracking-wide">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Stable
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs uppercase tracking-wide">
                          <XCircle className="w-3.5 h-3.5" /> Unstable
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-4 border-t-2 border-slate-900 text-sm text-slate-500 font-medium flex justify-between items-center">
            <span>* Radix Sort operations represent digit bucket placements rather than direct comparisons.</span>
            <span>N = 1000 elements</span>
          </div>
        </div>

        {/* Stability Explanation Component */}
        <StabilityCard />

      </div>
    </div>
  );
}

// Optional Dependencies to install:
// npm install lucide-react