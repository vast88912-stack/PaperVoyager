import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Table as TableIcon, 
  Info, 
  Clock, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  BookOpen
} from 'lucide-react';

// --- Types & Mock Data ---

type AlgorithmType = 'Bubble' | 'Insertion' | 'Merge' | 'Quick' | 'Heap' | 'Radix';
type DatasetType = 'Random' | 'Nearly Sorted' | 'Reversed' | 'Few Uniques';

interface RaceResult {
  id: string;
  algorithm: AlgorithmType;
  dataset: DatasetType;
  size: number;
  comparisons: number;
  swaps: number;
  timeMs: number;
  isStable: boolean;
}

const MOCK_RESULTS: RaceResult[] = [
  // Random Data
  { id: '1', algorithm: 'Bubble', dataset: 'Random', size: 1000, comparisons: 499500, swaps: 245012, timeMs: 124.5, isStable: true },
  { id: '2', algorithm: 'Insertion', dataset: 'Random', size: 1000, comparisons: 248102, swaps: 248102, timeMs: 45.2, isStable: true },
  { id: '3', algorithm: 'Merge', dataset: 'Random', size: 1000, comparisons: 8704, swaps: 0, timeMs: 4.1, isStable: true },
  { id: '4', algorithm: 'Quick', dataset: 'Random', size: 1000, comparisons: 10542, swaps: 3120, timeMs: 3.8, isStable: false },
  { id: '5', algorithm: 'Heap', dataset: 'Random', size: 1000, comparisons: 18402, swaps: 8540, timeMs: 5.2, isStable: false },
  { id: '6', algorithm: 'Radix', dataset: 'Random', size: 1000, comparisons: 0, swaps: 0, timeMs: 2.9, isStable: true },
  // Nearly Sorted Data
  { id: '7', algorithm: 'Bubble', dataset: 'Nearly Sorted', size: 1000, comparisons: 15400, swaps: 120, timeMs: 12.5, isStable: true },
  { id: '8', algorithm: 'Insertion', dataset: 'Nearly Sorted', size: 1000, comparisons: 1118, swaps: 118, timeMs: 0.8, isStable: true },
  { id: '9', algorithm: 'Merge', dataset: 'Nearly Sorted', size: 1000, comparisons: 5040, swaps: 0, timeMs: 3.5, isStable: true },
  { id: '10', algorithm: 'Quick', dataset: 'Nearly Sorted', size: 1000, comparisons: 25400, swaps: 450, timeMs: 8.2, isStable: false },
  // Reversed Data
  { id: '11', algorithm: 'Bubble', dataset: 'Reversed', size: 1000, comparisons: 499500, swaps: 499500, timeMs: 156.0, isStable: true },
  { id: '12', algorithm: 'Insertion', dataset: 'Reversed', size: 1000, comparisons: 499500, swaps: 499500, timeMs: 89.5, isStable: true },
];

const ALGO_COMPLEXITY = {
  'Bubble': { time: 'O(n²)', space: 'O(1)' },
  'Insertion': { time: 'O(n²)', space: 'O(1)' },
  'Merge': { time: 'O(n log n)', space: 'O(n)' },
  'Quick': { time: 'O(n log n)', space: 'O(log n)' },
  'Heap': { time: 'O(n log n)', space: 'O(1)' },
  'Radix': { time: 'O(nk)', space: 'O(n+k)' },
};

// --- Components ---

const MetricCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex items-center space-x-4 ${colorClass}`}>
    <div className="p-3 rounded-full bg-slate-50 text-slate-700">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const StabilityExplanation = () => (
  <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col h-full">
    <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center space-x-2">
      <BookOpen className="text-emerald-600" size={20} />
      <h3 className="font-bold text-emerald-900 text-lg">Understanding Stability</h3>
    </div>
    <div className="p-5 flex-grow flex flex-col space-y-4">
      <p className="text-slate-700 text-sm leading-relaxed">
        A sorting algorithm is <strong>stable</strong> if it preserves the relative order of equal elements. 
        This is crucial when sorting complex objects by multiple criteria (e.g., sorting by Last Name, then by First Name).
      </p>
      
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Input Array (Unsorted)</p>
        <div className="flex space-x-2">
          {[{v: 5, c: 'bg-blue-200 text-blue-900'}, {v: 2, c: 'bg-slate-200 text-slate-900'}, {v: 5, c: 'bg-orange-200 text-orange-900'}, {v: 1, c: 'bg-slate-200 text-slate-900'}].map((item, i) => (
            <div key={i} className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-lg shadow-sm ${item.c}`}>
              {item.v}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1 w-44">
          <span>(Blue 5 first)</span>
          <span>(Orange 5 second)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="border border-emerald-200 rounded-lg p-3 bg-white shadow-sm">
          <div className="flex items-center space-x-1 mb-2 text-emerald-700">
            <CheckCircle2 size={16} />
            <span className="text-sm font-bold">Stable Output</span>
          </div>
          <div className="flex space-x-1">
             {[{v: 1, c: 'bg-slate-200'}, {v: 2, c: 'bg-slate-200'}, {v: 5, c: 'bg-blue-200'}, {v: 5, c: 'bg-orange-200'}].map((item, i) => (
              <div key={i} className={`w-8 h-8 flex items-center justify-center rounded font-bold text-slate-900 ${item.c}`}>{item.v}</div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Relative order of 5s preserved.</p>
        </div>

        <div className="border border-red-200 rounded-lg p-3 bg-white shadow-sm">
          <div className="flex items-center space-x-1 mb-2 text-red-700">
            <XCircle size={16} />
            <span className="text-sm font-bold">Unstable Output</span>
          </div>
          <div className="flex space-x-1">
             {[{v: 1, c: 'bg-slate-200'}, {v: 2, c: 'bg-slate-200'}, {v: 5, c: 'bg-orange-200'}, {v: 5, c: 'bg-blue-200'}].map((item, i) => (
              <div key={i} className={`w-8 h-8 flex items-center justify-center rounded font-bold text-slate-900 ${item.c}`}>{item.v}</div>
            ))}
          </div>
           <p className="text-[10px] text-slate-500 mt-2">Relative order of 5s flipped.</p>
        </div>
      </div>
    </div>
  </div>
);

const PerformanceChart = ({ data, metric }: { data: RaceResult[], metric: 'timeMs' | 'comparisons' }) => {
  const maxVal = Math.max(...data.map(d => d[metric]));

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800 text-lg flex items-center">
          <BarChart3 className="mr-2 text-blue-600" size={20} />
          Relative Performance ({metric === 'timeMs' ? 'Time in ms' : 'Total Comparisons'})
        </h3>
      </div>
      
      <div className="space-y-4">
        {data.map((result) => {
          const percentage = Math.max((result[metric] / maxVal) * 100, 1); // min 1% for visibility
          const isFastest = result[metric] === Math.min(...data.map(d => d[metric]));
          
          return (
            <div key={result.id} className="relative">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-slate-700 w-24">{result.algorithm}</span>
                <span className="text-slate-600 font-mono">
                  {metric === 'timeMs' ? `${result.timeMs.toFixed(2)} ms` : result.comparisons.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    isFastest ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetType>('Random');
  const [chartMetric, setChartMetric] = useState<'timeMs' | 'comparisons'>('timeMs');

  const filteredResults = useMemo(() => 
    MOCK_RESULTS.filter(r => r.dataset === selectedDataset),
  [selectedDataset]);

  const datasets: DatasetType[] = ['Random', 'Nearly Sorted', 'Reversed', 'Few Uniques'];

  const fastestAlgo = filteredResults.reduce((prev, curr) => prev.timeMs < curr.timeMs ? prev : curr, filteredResults[0]);
  const mostSwaps = filteredResults.reduce((prev, curr) => prev.swaps > curr.swaps ? prev : curr, filteredResults[0]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-blue-600" size={28} />
            <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase">
              Sorting Race <span className="text-blue-600">Analysis</span>
            </h1>
          </div>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {datasets.map(ds => (
              <button
                key={ds}
                onClick={() => setSelectedDataset(ds)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedDataset === ds 
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {ds}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Highlight Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="Fastest Algorithm" 
            value={fastestAlgo?.algorithm || 'N/A'} 
            icon={Clock} 
            colorClass="border-emerald-500"
          />
          <MetricCard 
            title="Max Operations" 
            value={mostSwaps?.algorithm || 'N/A'} 
            icon={ArrowRightLeft} 
            colorClass="border-orange-500"
          />
          <MetricCard 
            title="Dataset Size" 
            value={filteredResults[0]?.size.toLocaleString() || '0'} 
            icon={BarChart3} 
            colorClass="border-blue-500"
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Data Table & Chart (Takes up 2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Detailed Results Table */}
            <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 p-4 flex items-center justify-between">
                <h3 className="font-bold text-white text-lg flex items-center">
                  <TableIcon className="mr-2 text-blue-400" size={20} />
                  Race Summary: {selectedDataset} Data
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Algorithm</th>
                      <th className="p-4 font-semibold text-right">Comparisons</th>
                      <th className="p-4 font-semibold text-right">Swaps/Writes</th>
                      <th className="p-4 font-semibold text-right">Time (ms)</th>
                      <th className="p-4 font-semibold text-center">Stable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.length > 0 ? filteredResults.map((result) => (
                      <tr key={result.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4 font-medium text-slate-900 flex items-center">
                          {result.algorithm}
                          {result.id === fastestAlgo.id && (
                            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase">Winner</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-slate-600 font-mono text-sm">{result.comparisons.toLocaleString()}</td>
                        <td className="p-4 text-right text-slate-600 font-mono text-sm">{result.swaps.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono font-semibold text-slate-800">{result.timeMs.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          {result.isStable ? (
                            <CheckCircle2 className="inline text-emerald-500" size={18} />
                          ) : (
                            <XCircle className="inline text-slate-300" size={18} />
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                          No data available for this dataset preset yet. Run a race to populate!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Performance Visualizer */}
            {filteredResults.length > 0 && (
              <section>
                <div className="flex justify-end mb-2 space-x-2">
                  <button 
                    onClick={() => setChartMetric('timeMs')}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${chartMetric === 'timeMs' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  >
                    Time
                  </button>
                  <button 
                    onClick={() => setChartMetric('comparisons')}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${chartMetric === 'comparisons' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  >
                    Operations
                  </button>
                </div>
                <PerformanceChart data={filteredResults} metric={chartMetric} />
              </section>
            )}

          </div>

          {/* Right Column: Education & Theory (Takes up 1/3 width) */}
          <div className="space-y-8">
            
            {/* Stability Education Card */}
            <section className="h-auto">
              <StabilityExplanation />
            </section>

            {/* Complexity Reference Grid */}
            <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-blue-900 p-4 flex items-center space-x-2">
                <Info className="text-blue-300" size={20} />
                <h3 className="font-bold text-white text-lg">Complexity Reference</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Algorithm</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Avg Time</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Space</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(ALGO_COMPLEXITY).map(([algo, metrics]) => (
                      <tr key={algo}>
                        <td className="px-4 py-3 font-medium text-slate-800">{algo}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{metrics.time}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{metrics.space}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

// Dependencies required:
// npm install lucide-react