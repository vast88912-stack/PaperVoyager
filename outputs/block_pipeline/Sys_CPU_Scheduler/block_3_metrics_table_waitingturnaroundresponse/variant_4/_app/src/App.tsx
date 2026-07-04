import React, { useState, useMemo } from 'react';

// --- Types ---
type MetricKey = 'pid' | 'arrival' | 'burst' | 'wait' | 'turnaround' | 'response';
type SortOrder = 'asc' | 'desc';

interface ProcessMetrics {
  pid: string;
  arrival: number;
  burst: number;
  wait: number;
  turnaround: number;
  response: number;
}

interface AlgorithmData {
  id: string;
  name: string;
  processes: ProcessMetrics[];
}

// --- Mock Data ---
const MOCK_DATA: AlgorithmData[] = [
  {
    id: 'fcfs',
    name: 'First-Come, First-Served (FCFS)',
    processes: [
      { pid: 'P1', arrival: 0, burst: 8, wait: 0, turnaround: 8, response: 0 },
      { pid: 'P2', arrival: 1, burst: 4, wait: 7, turnaround: 11, response: 7 },
      { pid: 'P3', arrival: 2, burst: 9, wait: 10, turnaround: 19, response: 10 },
      { pid: 'P4', arrival: 3, burst: 5, wait: 18, turnaround: 23, response: 18 },
      { pid: 'P5', arrival: 4, burst: 2, wait: 22, turnaround: 24, response: 22 },
    ],
  },
  {
    id: 'sjf',
    name: 'Shortest Job First (SJF - Non-Preemptive)',
    processes: [
      { pid: 'P1', arrival: 0, burst: 8, wait: 0, turnaround: 8, response: 0 },
      { pid: 'P2', arrival: 1, burst: 4, wait: 7, turnaround: 11, response: 7 },
      { pid: 'P5', arrival: 4, burst: 2, wait: 8, turnaround: 10, response: 8 },
      { pid: 'P4', arrival: 3, burst: 5, wait: 11, turnaround: 16, response: 11 },
      { pid: 'P3', arrival: 2, burst: 9, wait: 17, turnaround: 26, response: 17 },
    ],
  },
  {
    id: 'rr',
    name: 'Round Robin (RR - Quantum: 3)',
    processes: [
      { pid: 'P1', arrival: 0, burst: 8, wait: 14, turnaround: 22, response: 0 },
      { pid: 'P2', arrival: 1, burst: 4, wait: 12, turnaround: 16, response: 2 },
      { pid: 'P3', arrival: 2, burst: 9, wait: 17, turnaround: 26, response: 4 },
      { pid: 'P4', arrival: 3, burst: 5, wait: 15, turnaround: 20, response: 7 },
      { pid: 'P5', arrival: 4, burst: 2, wait: 8, turnaround: 10, response: 8 },
    ],
  },
];

// --- Icons ---
const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const SortAscIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"/>
  </svg>
);

const SortDescIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default function App() {
  const [activeAlgoId, setActiveAlgoId] = useState<string>('fcfs');
  const [sortKey, setSortKey] = useState<MetricKey>('pid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const activeData = useMemo(() => 
    MOCK_DATA.find(d => d.id === activeAlgoId) || MOCK_DATA[0], 
  [activeAlgoId]);

  const sortedProcesses = useMemo(() => {
    return [...activeData.processes].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });
  }, [activeData, sortKey, sortOrder]);

  const averages = useMemo(() => {
    const total = activeData.processes.length;
    if (total === 0) return { wait: 0, turnaround: 0, response: 0 };
    
    return {
      wait: (activeData.processes.reduce((sum, p) => sum + p.wait, 0) / total).toFixed(2),
      turnaround: (activeData.processes.reduce((sum, p) => sum + p.turnaround, 0) / total).toFixed(2),
      response: (activeData.processes.reduce((sum, p) => sum + p.response, 0) / total).toFixed(2),
    };
  }, [activeData]);

  const maxTurnaround = useMemo(() => 
    Math.max(...activeData.processes.map(p => p.turnaround)), 
  [activeData]);

  const handleSort = (key: MetricKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: MetricKey }) => {
    if (sortKey !== columnKey) return <span className="w-3.5 inline-block opacity-0 group-hover:opacity-30 transition-opacity"><SortAscIcon/></span>;
    return <span className="w-3.5 inline-block text-emerald-400">{sortOrder === 'asc' ? <SortAscIcon /> : <SortDescIcon />}</span>;
  };

  // Helper to render a small visual bar inside the table cell
  const VisualBar = ({ value, max, colorClass }: { value: number, max: number, colorClass: string }) => {
    const width = Math.max(2, (value / max) * 100);
    return (
      <div className="w-24 h-1.5 bg-gray-800 rounded-sm ml-3 overflow-hidden border border-gray-700">
        <div className={`h-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-mono p-6 selection:bg-emerald-900 selection:text-emerald-100 flex flex-col items-center">
      
      <div className="w-full max-w-5xl border border-gray-800 bg-[#0f0f0f] shadow-2xl relative">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#141414]">
          <div className="flex items-center gap-2 text-emerald-500">
            <TerminalIcon />
            <span className="text-sm font-bold tracking-widest uppercase">sys_metrics_daemon</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 mb-2">Simulation Metrics</h1>
              <p className="text-gray-500 text-sm">Waiting, Turnaround, and Response Times</p>
            </div>
            
            <div className="flex bg-[#0a0a0a] border border-gray-800 rounded-sm p-1">
              {MOCK_DATA.map(algo => (
                <button
                  key={algo.id}
                  onClick={() => setActiveAlgoId(algo.id)}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeAlgoId === algo.id 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  {algo.id}
                </button>
              ))}
            </div>
          </div>

          {/* Averages Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-800 bg-[#141414] p-4 border-l-2 border-l-cyan-500/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <TerminalIcon />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Avg Turnaround</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light text-cyan-400">{averages.turnaround}</span>
                <span className="text-xs text-cyan-500/50">ms</span>
              </div>
            </div>

            <div className="border border-gray-800 bg-[#141414] p-4 border-l-2 border-l-amber-500/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <TerminalIcon />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Avg Wait</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light text-amber-400">{averages.wait}</span>
                <span className="text-xs text-amber-500/50">ms</span>
              </div>
            </div>

            <div className="border border-gray-800 bg-[#141414] p-4 border-l-2 border-l-indigo-500/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <TerminalIcon />
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Avg Response</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-light text-indigo-400">{averages.response}</span>
                <span className="text-xs text-indigo-500/50">ms</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-gray-800 bg-[#0a0a0a] overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs uppercase bg-[#141414] text-gray-400 border-b border-gray-800">
                <tr>
                  {[
                    { key: 'pid', label: 'Process' },
                    { key: 'arrival', label: 'Arrival' },
                    { key: 'burst', label: 'Burst' },
                    { key: 'turnaround', label: 'Turnaround (TAT)' },
                    { key: 'wait', label: 'Wait (WT)' },
                    { key: 'response', label: 'Response (RT)' }
                  ].map((col) => (
                    <th 
                      key={col.key} 
                      onClick={() => handleSort(col.key as MetricKey)}
                      className="px-6 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIndicator columnKey={col.key as MetricKey} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sortedProcesses.map((process, idx) => (
                  <tr 
                    key={process.pid} 
                    className="hover:bg-[#141414] transition-colors group"
                  >
                    <td className="px-6 py-3 font-medium text-emerald-400">
                      <span className="inline-block w-2 text-emerald-500/30 mr-2">{'>'}</span>
                      {process.pid}
                    </td>
                    <td className="px-6 py-3 text-gray-400">{process.arrival}</td>
                    <td className="px-6 py-3 text-gray-400">{process.burst}</td>
                    
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <span className="w-8 text-cyan-200">{process.turnaround}</span>
                        <VisualBar value={process.turnaround} max={maxTurnaround} colorClass="bg-cyan-500/80" />
                      </div>
                    </td>
                    
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <span className="w-8 text-amber-200">{process.wait}</span>
                        <VisualBar value={process.wait} max={maxTurnaround} colorClass="bg-amber-500/80" />
                      </div>
                    </td>
                    
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <span className="w-8 text-indigo-200">{process.response}</span>
                        <VisualBar value={process.response} max={maxTurnaround} colorClass="bg-indigo-500/80" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Info */}
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-600 pt-4 border-t border-gray-800/50">
            <div className="flex gap-4">
              <span>TAT = Completion Time - Arrival Time</span>
              <span>WT = TAT - Burst Time</span>
            </div>
            <div className="mt-2 sm:mt-0">
              [ Algorithm: <span className="text-emerald-500/70">{activeData.name}</span> ]
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}