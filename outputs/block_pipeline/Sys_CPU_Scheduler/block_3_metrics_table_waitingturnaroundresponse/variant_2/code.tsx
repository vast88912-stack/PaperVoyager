import React, { useState, useMemo, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Clock, 
  RefreshCw, 
  ArrowDown, 
  ArrowUp, 
  ArrowUpDown,
  AlertTriangle,
  BarChart2
} from 'lucide-react';

// --- Types ---
type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'MLFQ';

interface Job {
  id: string;
  arrival: number;
  burst: number;
}

interface Metrics {
  wt: number; // Waiting Time
  tat: number; // Turnaround Time
  rt: number; // Response Time
}

interface JobMetrics extends Job, Metrics {}

type SortKey = keyof JobMetrics;
type SortDirection = 'asc' | 'desc';

// --- Mock Data Generator ---
// Mathematically sound mock data (TAT = WT + BT)
const generateWorkload = (count: number = 6): Job[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `P${i + 1}`,
    arrival: Math.floor(Math.random() * 10),
    burst: Math.floor(Math.random() * 12) + 1,
  })).sort((a, b) => a.arrival - b.arrival);
};

const simulateMetrics = (jobs: Job[], algo: Algorithm): JobMetrics[] => {
  return jobs.map(job => {
    let wt = 0;
    let rt = 0;

    // Faking algorithm behaviors for UI demonstration purposes
    switch (algo) {
      case 'FCFS':
        wt = Math.floor(Math.random() * 15) + job.arrival;
        rt = wt; 
        break;
      case 'SJF':
        wt = Math.max(0, Math.floor(Math.random() * 8));
        rt = wt;
        break;
      case 'SRTF':
        wt = Math.max(0, Math.floor(Math.random() * 6));
        rt = Math.max(0, wt - Math.floor(Math.random() * 3));
        break;
      case 'RR':
        wt = Math.floor(Math.random() * 20);
        rt = Math.max(0, Math.floor(Math.random() * 5));
        break;
      case 'MLFQ':
        wt = Math.floor(Math.random() * 25);
        rt = Math.max(0, Math.floor(Math.random() * 8));
        break;
    }

    return {
      ...job,
      wt,
      tat: wt + job.burst,
      rt,
    };
  });
};

// --- Main Component ---
export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm>('RR');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
    key: 'id', 
    direction: 'asc' 
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const algorithms: Algorithm[] = ['FCFS', 'SJF', 'SRTF', 'RR', 'MLFQ'];

  // Initialize Data
  useEffect(() => {
    handleRegenerate();
  }, []);

  const handleRegenerate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setJobs(generateWorkload(7));
      setIsRefreshing(false);
    }, 400);
  };

  // Derive Metrics for current algorithm
  const currentMetrics = useMemo(() => {
    return simulateMetrics(jobs, selectedAlgo);
  }, [jobs, selectedAlgo]);

  // Sort Data
  const sortedMetrics = useMemo(() => {
    const sorted = [...currentMetrics].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Natural sort for IDs (P1, P2, P10)
        return aVal.localeCompare(bVal, undefined, { numeric: true });
      }
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    return sortConfig.direction === 'asc' ? sorted : sorted.reverse();
  }, [currentMetrics, sortConfig]);

  // Calculate Averages
  const averages = useMemo(() => {
    if (!currentMetrics.length) return { wt: 0, tat: 0, rt: 0 };
    const sum = currentMetrics.reduce((acc, curr) => ({
      wt: acc.wt + curr.wt,
      tat: acc.tat + curr.tat,
      rt: acc.rt + curr.rt
    }), { wt: 0, tat: 0, rt: 0 });
    
    return {
      wt: (sum.wt / currentMetrics.length).toFixed(2),
      tat: (sum.tat / currentMetrics.length).toFixed(2),
      rt: (sum.rt / currentMetrics.length).toFixed(2)
    };
  }, [currentMetrics]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-emerald-400" /> 
      : <ArrowDown className="w-3 h-3 ml-1 text-emerald-400" />;
  };

  // Check for starvation warning
  const hasStarvationRisk = selectedAlgo === 'SJF' || selectedAlgo === 'SRTF';
  const maxWaitTime = Math.max(...currentMetrics.map(m => m.wt), 0);
  const starvationDetected = maxWaitTime > 20;

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-300 font-mono p-6 selection:bg-emerald-900 selection:text-emerald-100 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-5xl mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-emerald-500" />
          <h1 className="text-xl font-bold tracking-wider text-slate-100">
            <span className="text-emerald-500">root@scheduler</span>
            <span className="text-slate-500">:</span>
            <span className="text-cyan-400">~/metrics</span>
            <span className="text-slate-500">#</span> ./analyze
          </h1>
        </div>
        <button 
          onClick={handleRegenerate}
          className={`flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded transition-all text-sm ${isRefreshing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          Regenerate Workload
        </button>
      </div>

      <div className="w-full max-w-5xl space-y-6">
        
        {/* Controls & Badges */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800/80 shadow-inner">
          <div className="flex flex-wrap gap-2">
            {algorithms.map(algo => (
              <button
                key={algo}
                onClick={() => setSelectedAlgo(algo)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 border ${
                  selectedAlgo === algo 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>

          {hasStarvationRisk && starvationDetected && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md text-xs animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>STARVATION DETECTED (Max WT: {maxWaitTime}ms)</span>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard 
            title="Avg Waiting Time" 
            value={averages.wt} 
            unit="ms" 
            icon={<Clock className="w-5 h-5 text-cyan-400" />} 
            colorClass="text-cyan-400"
            borderClass="border-cyan-500/30"
            bgClass="bg-cyan-500/5"
          />
          <MetricCard 
            title="Avg Turnaround Time" 
            value={averages.tat} 
            unit="ms" 
            icon={<Activity className="w-5 h-5 text-purple-400" />} 
            colorClass="text-purple-400"
            borderClass="border-purple-500/30"
            bgClass="bg-purple-500/5"
          />
          <MetricCard 
            title="Avg Response Time" 
            value={averages.rt} 
            unit="ms" 
            icon={<BarChart2 className="w-5 h-5 text-emerald-400" />} 
            colorClass="text-emerald-400"
            borderClass="border-emerald-500/30"
            bgClass="bg-emerald-500/5"
          />
        </div>

        {/* Main Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl relative">
          
          {/* Table Header Decoration */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500 select-none">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>PROCESS_METRICS_TABLE</span>
            </div>
            <span>[ ALGO: {selectedAlgo} ]</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="p-4 font-medium group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center">Process ID <SortIcon column="id" /></div>
                  </th>
                  <th className="p-4 font-medium group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('arrival')}>
                    <div className="flex items-center">Arrival Time <SortIcon column="arrival" /></div>
                  </th>
                  <th className="p-4 font-medium group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('burst')}>
                    <div className="flex items-center">Burst Time <SortIcon column="burst" /></div>
                  </th>
                  <th className="p-4 font-medium group cursor-pointer hover:bg-slate-800/50 transition-colors border-l border-slate-800/50" onClick={() => handleSort('wt')}>
                    <div className="flex items-center text-cyan-400/80">Waiting (WT) <SortIcon column="wt" /></div>
                  </th>
                  <th className="p-4 font-medium group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('tat')}>
                    <div className="flex items-center text-purple-400/80">Turnaround (TAT) <SortIcon column="tat" /></div>
                  </th>
                  <th className="p-4 font-medium group cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('rt')}>
                    <div className="flex items-center text-emerald-400/80">Response (RT) <SortIcon column="rt" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-800/50">
                {sortedMetrics.map((job, idx) => (
                  <tr 
                    key={job.id} 
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <span className="inline-flex items-center justify-center bg-slate-800 text-slate-300 w-8 h-6 rounded text-xs font-bold border border-slate-700 group-hover:border-slate-500 transition-colors">
                        {job.id}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{job.arrival} <span className="text-slate-600 text-xs">ms</span></td>
                    <td className="p-4 text-slate-400">{job.burst} <span className="text-slate-600 text-xs">ms</span></td>
                    <td className="p-4 border-l border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-12 text-cyan-300 font-semibold">{job.wt}</div>
                        <ProgressBar value={job.wt} max={30} colorClass="bg-cyan-500" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 text-purple-300 font-semibold">{job.tat}</div>
                        <ProgressBar value={job.tat} max={45} colorClass="bg-purple-500" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 text-emerald-300 font-semibold">{job.rt}</div>
                        <ProgressBar value={job.rt} max={25} colorClass="bg-emerald-500" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer Legend */}
          <div className="bg-slate-900/80 border-t border-slate-800 p-3 flex flex-wrap gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>WT = Start Time - Arrival Time (or total time in ready queue)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>TAT = Completion Time - Arrival Time (WT + BT)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>RT = First Run Time - Arrival Time</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Subcomponents ---

function MetricCard({ 
  title, 
  value, 
  unit, 
  icon, 
  colorClass, 
  borderClass, 
  bgClass 
}: { 
  title: string; 
  value: string; 
  unit: string; 
  icon: React.ReactNode; 
  colorClass: string; 
  borderClass: string; 
  bgClass: string;
}) {
  return (
    <div className={`p-5 rounded-lg border ${borderClass} ${bgClass} flex items-center justify-between backdrop-blur-sm relative overflow-hidden group hover:bg-opacity-20 transition-all duration-300`}>
      {/* Decorative background glow */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-current opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-300 ${colorClass}`}></div>
      
      <div>
        <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold tracking-tight ${colorClass}`}>{value}</span>
          <span className="text-sm text-slate-500">{unit}</span>
        </div>
      </div>
      <div className={`p-3 rounded-md bg-slate-950/50 border border-slate-800 shadow-inner ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
      <div 
        className={`h-full ${colorClass} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}