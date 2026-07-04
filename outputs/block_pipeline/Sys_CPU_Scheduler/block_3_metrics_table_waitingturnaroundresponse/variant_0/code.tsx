import React, { useState, useMemo, useEffect } from 'react';

// Runtime dependencies: react, tailwindcss

type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'MLFQ';

interface ProcessMetrics {
  id: string;
  arrivalTime: number;
  burstTime: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
  priority?: number;
}

// Pre-computed mock data to simulate different scheduling algorithms
const MOCK_DATA: Record<Algorithm, ProcessMetrics[]> = {
  FCFS: [
    { id: 'P1', arrivalTime: 0, burstTime: 24, completionTime: 24, turnaroundTime: 24, waitingTime: 0, responseTime: 0 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, completionTime: 27, turnaroundTime: 26, waitingTime: 23, responseTime: 23 },
    { id: 'P3', arrivalTime: 2, burstTime: 3, completionTime: 30, turnaroundTime: 28, waitingTime: 25, responseTime: 25 },
    { id: 'P4', arrivalTime: 3, burstTime: 10, completionTime: 40, turnaroundTime: 37, waitingTime: 27, responseTime: 27 },
    { id: 'P5', arrivalTime: 4, burstTime: 5, completionTime: 45, turnaroundTime: 41, waitingTime: 36, responseTime: 36 },
  ],
  SJF: [
    { id: 'P1', arrivalTime: 0, burstTime: 24, completionTime: 45, turnaroundTime: 45, waitingTime: 21, responseTime: 21 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, completionTime: 4, turnaroundTime: 3, waitingTime: 0, responseTime: 0 },
    { id: 'P3', arrivalTime: 2, burstTime: 3, completionTime: 7, turnaroundTime: 5, waitingTime: 2, responseTime: 2 },
    { id: 'P4', arrivalTime: 3, burstTime: 10, completionTime: 21, turnaroundTime: 18, waitingTime: 8, responseTime: 8 },
    { id: 'P5', arrivalTime: 4, burstTime: 5, completionTime: 11, turnaroundTime: 7, waitingTime: 2, responseTime: 2 },
  ],
  SRTF: [
    { id: 'P1', arrivalTime: 0, burstTime: 24, completionTime: 45, turnaroundTime: 45, waitingTime: 21, responseTime: 0 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, completionTime: 4, turnaroundTime: 3, waitingTime: 0, responseTime: 0 },
    { id: 'P3', arrivalTime: 2, burstTime: 3, completionTime: 7, turnaroundTime: 5, waitingTime: 2, responseTime: 2 },
    { id: 'P4', arrivalTime: 3, burstTime: 10, completionTime: 21, turnaroundTime: 18, waitingTime: 8, responseTime: 8 },
    { id: 'P5', arrivalTime: 4, burstTime: 5, completionTime: 11, turnaroundTime: 7, waitingTime: 2, responseTime: 2 },
  ],
  RR: [
    { id: 'P1', arrivalTime: 0, burstTime: 24, completionTime: 45, turnaroundTime: 45, waitingTime: 21, responseTime: 0 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, completionTime: 8, turnaroundTime: 7, waitingTime: 4, responseTime: 3 },
    { id: 'P3', arrivalTime: 2, burstTime: 3, completionTime: 14, turnaroundTime: 12, waitingTime: 9, responseTime: 6 },
    { id: 'P4', arrivalTime: 3, burstTime: 10, completionTime: 37, turnaroundTime: 34, waitingTime: 24, responseTime: 9 },
    { id: 'P5', arrivalTime: 4, burstTime: 5, completionTime: 26, turnaroundTime: 22, waitingTime: 17, responseTime: 14 },
  ],
  MLFQ: [
    { id: 'P1', arrivalTime: 0, burstTime: 24, completionTime: 45, turnaroundTime: 45, waitingTime: 21, responseTime: 0, priority: 3 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, completionTime: 5, turnaroundTime: 4, waitingTime: 1, responseTime: 1, priority: 1 },
    { id: 'P3', arrivalTime: 2, burstTime: 3, completionTime: 9, turnaroundTime: 7, waitingTime: 4, responseTime: 3, priority: 1 },
    { id: 'P4', arrivalTime: 3, burstTime: 10, completionTime: 31, turnaroundTime: 28, waitingTime: 18, responseTime: 5, priority: 2 },
    { id: 'P5', arrivalTime: 4, burstTime: 5, completionTime: 17, turnaroundTime: 13, waitingTime: 8, responseTime: 7, priority: 1 },
  ],
};

type SortConfig = {
  key: keyof ProcessMetrics;
  direction: 'asc' | 'desc';
} | null;

export default function App() {
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm>('FCFS');
  const [data, setData] = useState<ProcessMetrics[]>(MOCK_DATA['FCFS']);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulate data loading/calculation animation
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setData(MOCK_DATA[selectedAlgo]);
      setIsAnimating(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedAlgo]);

  const handleSort = (key: keyof ProcessMetrics) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? 0;
        const bVal = b[sortConfig.key] ?? 0;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const averages = useMemo(() => {
    if (data.length === 0) return { wt: 0, tat: 0, rt: 0 };
    const sum = data.reduce(
      (acc, curr) => ({
        wt: acc.wt + curr.waitingTime,
        tat: acc.tat + curr.turnaroundTime,
        rt: acc.rt + curr.responseTime,
      }),
      { wt: 0, tat: 0, rt: 0 }
    );
    return {
      wt: (sum.wt / data.length).toFixed(2),
      tat: (sum.tat / data.length).toFixed(2),
      rt: (sum.rt / data.length).toFixed(2),
    };
  }, [data]);

  // Starvation threshold logic (e.g., waiting time > 3x burst time)
  const isStarving = (process: ProcessMetrics) => {
    return process.waitingTime > process.burstTime * 2.5 && process.waitingTime > 15;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono p-4 md:p-8 relative overflow-hidden selection:bg-[#00ff41] selection:text-black">
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-10"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-8 border-b border-[#00ff41]/30 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter flex items-center gap-3 shadow-[#00ff41]">
              <span className="animate-pulse">_</span>
              CPU_SCHEDULER_STUDIO
            </h1>
            <p className="text-[#008f11] mt-2 text-sm">
              MODULE: METRICS_ANALYSIS_SUBSYSTEM v1.0.4
            </p>
          </div>
          
          {/* Algorithm Selector */}
          <div className="flex gap-2 bg-[#0a0a0a] p-1 border border-[#00ff41]/20 rounded">
            {(['FCFS', 'SJF', 'SRTF', 'RR', 'MLFQ'] as Algorithm[]).map((algo) => (
              <button
                key={algo}
                onClick={() => setSelectedAlgo(algo)}
                className={`px-4 py-1 text-sm transition-all duration-200 ${
                  selectedAlgo === algo
                    ? 'bg-[#00ff41] text-black font-bold shadow-[0_0_10px_rgba(0,255,65,0.5)]'
                    : 'text-[#008f11] hover:text-[#00ff41] hover:bg-[#00ff41]/10'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard title="AVG_WAITING_TIME" value={`${averages.wt} ms`} icon="⏳" />
          <MetricCard title="AVG_TURNAROUND_TIME" value={`${averages.tat} ms`} icon="🔄" />
          <MetricCard title="AVG_RESPONSE_TIME" value={`${averages.rt} ms`} icon="⚡" />
        </div>

        {/* Main Table Section */}
        <div className="bg-[#0a0a0a] border border-[#00ff41]/30 rounded-sm relative shadow-[0_0_15px_rgba(0,255,65,0.05)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41]/50 to-transparent opacity-50"></div>
          
          <div className="p-4 border-b border-[#00ff41]/30 flex justify-between items-center bg-[#00ff41]/5">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              PROCESS_METRICS_TABLE
            </h2>
            <div className="text-xs text-[#008f11] animate-pulse">
              {isAnimating ? 'CALCULATING...' : 'SYSTEM_READY'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-[#008f11] text-sm bg-[#050505]">
                  <SortableHeader label="PID" sortKey="id" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="ARRIVAL" sortKey="arrivalTime" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="BURST" sortKey="burstTime" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="COMPLETION" sortKey="completionTime" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="TURNAROUND" sortKey="turnaroundTime" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="WAITING" sortKey="waitingTime" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHeader label="RESPONSE" sortKey="responseTime" currentSort={sortConfig} onSort={handleSort} />
                  <th className="p-3 border-b border-[#00ff41]/30 font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody className={`transition-opacity duration-300 ${isAnimating ? 'opacity-30' : 'opacity-100'}`}>
                {sortedData.map((process, idx) => {
                  const starving = isStarving(process);
                  return (
                    <tr 
                      key={process.id} 
                      className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 transition-colors group"
                    >
                      <td className="p-3 font-bold text-[#00ff41]">
                        <span className="mr-2 opacity-30 group-hover:opacity-100 transition-opacity">&gt;</span>
                        {process.id}
                      </td>
                      <td className="p-3 text-[#008f11]">{process.arrivalTime}</td>
                      <td className="p-3 text-[#008f11]">{process.burstTime}</td>
                      <td className="p-3">{process.completionTime}</td>
                      <td className="p-3 text-cyan-400">{process.turnaroundTime}</td>
                      <td className={`p-3 ${starving ? 'text-red-400 font-bold' : 'text-amber-400'}`}>
                        {process.waitingTime}
                      </td>
                      <td className="p-3 text-purple-400">{process.responseTime}</td>
                      <td className="p-3">
                        {starving ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-950 text-red-400 border border-red-500/50 animate-pulse">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            STARVATION_RISK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-[#008f11] border border-[#008f11]/30">
                            OPTIMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Footer Stats */}
          <div className="p-3 bg-[#050505] border-t border-[#00ff41]/30 text-xs text-[#008f11] flex justify-between">
            <span>TOTAL_PROCESSES: {data.length}</span>
            <span>ALGORITHM_COMPLEXITY: {selectedAlgo === 'MLFQ' ? 'O(N LOG N)' : 'O(N)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function MetricCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-[#00ff41]/30 p-4 rounded-sm relative overflow-hidden group hover:border-[#00ff41] transition-colors">
      <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:opacity-10 transition-opacity grayscale group-hover:grayscale-0">
        {icon}
      </div>
      <h3 className="text-[#008f11] text-xs font-bold mb-1 tracking-wider">{title}</h3>
      <div className="text-2xl md:text-3xl font-bold text-[#00ff41] drop-shadow-[0_0_8px_rgba(0,255,65,0.8)]">
        {value}
      </div>
      {/* Decorative progress bar */}
      <div className="w-full h-1 bg-[#00ff41]/10 mt-3 rounded-full overflow-hidden">
        <div className="h-full bg-[#00ff41] w-2/3 animate-[pulse_2s_ease-in-out_infinite]"></div>
      </div>
    </div>
  );
}

function SortableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  onSort 
}: { 
  label: string; 
  sortKey: keyof ProcessMetrics; 
  currentSort: SortConfig; 
  onSort: (key: keyof ProcessMetrics) => void 
}) {
  const isActive = currentSort?.key === sortKey;
  
  return (
    <th 
      className="p-3 border-b border-[#00ff41]/30 font-normal cursor-pointer hover:bg-[#00ff41]/10 hover:text-[#00ff41] transition-colors select-none group"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${isActive ? 'text-[#00ff41]' : 'text-transparent group-hover:text-[#008f11]'}`}>
          {isActive ? (currentSort.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </div>
    </th>
  );
}