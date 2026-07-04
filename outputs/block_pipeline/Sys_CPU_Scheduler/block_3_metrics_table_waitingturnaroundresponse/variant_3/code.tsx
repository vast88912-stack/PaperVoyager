import React, { useState, useMemo, useEffect } from 'react';

// --- Mock Data Generators & Types ---
type ProcessMetrics = {
  id: string;
  at: number; // Arrival Time
  bt: number; // Burst Time
  ct: number; // Completion Time
  tat: number; // Turnaround Time
  wt: number; // Waiting Time
  rt: number; // Response Time
  starved?: boolean; // Starvation flag
};

type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'MLFQ';

const ALGO_MOCK_DATA: Record<Algorithm, ProcessMetrics[]> = {
  FCFS: [
    { id: 'P1', at: 0, bt: 8, ct: 8, tat: 8, wt: 0, rt: 0 },
    { id: 'P2', at: 1, bt: 4, ct: 12, tat: 11, wt: 7, rt: 7 },
    { id: 'P3', at: 2, bt: 9, ct: 21, tat: 19, wt: 10, rt: 10 },
    { id: 'P4', at: 3, bt: 5, ct: 26, tat: 23, wt: 18, rt: 18, starved: true },
    { id: 'P5', at: 4, bt: 2, ct: 28, tat: 24, wt: 22, rt: 22, starved: true },
  ],
  SJF: [
    { id: 'P1', at: 0, bt: 8, ct: 8, tat: 8, wt: 0, rt: 0 },
    { id: 'P5', at: 4, bt: 2, ct: 10, tat: 6, wt: 4, rt: 4 },
    { id: 'P2', at: 1, bt: 4, ct: 14, tat: 13, wt: 9, rt: 9 },
    { id: 'P4', at: 3, bt: 5, ct: 19, tat: 16, wt: 11, rt: 11 },
    { id: 'P3', at: 2, bt: 9, ct: 28, tat: 26, wt: 17, rt: 17, starved: true },
  ],
  SRTF: [
    { id: 'P1', at: 0, bt: 8, ct: 28, tat: 28, wt: 20, rt: 0, starved: true },
    { id: 'P2', at: 1, bt: 4, ct: 5, tat: 4, wt: 0, rt: 0 },
    { id: 'P5', at: 4, bt: 2, ct: 7, tat: 3, wt: 1, rt: 1 },
    { id: 'P4', at: 3, bt: 5, ct: 12, tat: 9, wt: 4, rt: 4 },
    { id: 'P3', at: 2, bt: 9, ct: 21, tat: 19, wt: 10, rt: 10 },
  ],
  RR: [
    { id: 'P1', at: 0, bt: 8, ct: 26, tat: 26, wt: 18, rt: 0 },
    { id: 'P2', at: 1, bt: 4, ct: 13, tat: 12, wt: 8, rt: 1 },
    { id: 'P3', at: 2, bt: 9, ct: 28, tat: 26, wt: 17, rt: 2 },
    { id: 'P4', at: 3, bt: 5, ct: 22, tat: 19, wt: 14, rt: 5 },
    { id: 'P5', at: 4, bt: 2, ct: 15, tat: 11, wt: 9, rt: 8 },
  ],
  MLFQ: [
    { id: 'P1', at: 0, bt: 8, ct: 24, tat: 24, wt: 16, rt: 0 },
    { id: 'P2', at: 1, bt: 4, ct: 9, tat: 8, wt: 4, rt: 1 },
    { id: 'P3', at: 2, bt: 9, ct: 28, tat: 26, wt: 17, rt: 2 },
    { id: 'P4', at: 3, bt: 5, ct: 17, tat: 14, wt: 9, rt: 4 },
    { id: 'P5', at: 4, bt: 2, ct: 11, tat: 7, wt: 5, rt: 6 },
  ]
};

// --- Helper Components ---
const SortIcon = ({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) => (
  <svg
    className={`w-3 h-3 ml-1 inline-block transition-transform duration-200 ${
      active ? 'text-green-400 opacity-100' : 'text-gray-600 opacity-50'
    } ${active && direction === 'desc' ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const AlertBadge = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-400 border border-red-800 ml-2 animate-pulse">
    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    STARVATION
  </span>
);

export default function App() {
  const [activeAlgo, setActiveAlgo] = useState<Algorithm>('FCFS');
  const [sortKey, setSortKey] = useState<keyof ProcessMetrics>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock effect for terminal realism
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (key: keyof ProcessMetrics) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const data = useMemo(() => {
    const rawData = [...ALGO_MOCK_DATA[activeAlgo]];
    return rawData.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Simple numeric extraction for P1, P2 sorting
        const aNum = parseInt(aVal.replace(/\D/g, ''));
        const bNum = parseInt(bVal.replace(/\D/g, ''));
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [activeAlgo, sortKey, sortDir]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    const total = data.length;
    if (total === 0) return { avgTat: 0, avgWt: 0, avgRt: 0 };
    return {
      avgTat: (data.reduce((acc, p) => acc + p.tat, 0) / total).toFixed(2),
      avgWt: (data.reduce((acc, p) => acc + p.wt, 0) / total).toFixed(2),
      avgRt: (data.reduce((acc, p) => acc + p.rt, 0) / total).toFixed(2),
    };
  }, [data]);

  const maxWt = Math.max(...data.map((d) => d.wt), 1);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono p-4 md:p-8 flex flex-col items-center">
      
      {/* Terminal Header */}
      <div className="w-full max-w-5xl mb-6">
        <div className="flex justify-between items-end border-b-2 border-green-500/30 pb-2 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-400 tracking-wider">
              sys_monitor <span className="text-gray-500 text-lg font-normal">v1.4.2</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">CPU SCHEDULING METRICS ENGINE // ROOT PRIVILEGES</p>
          </div>
          <div className="text-right hidden sm:block text-green-500/70 text-sm">
            UPTIME: {currentTime} <br />
            LOAD AVG: 0.14, 0.22, 0.28
          </div>
        </div>

        {/* Algorithm Selector */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(['FCFS', 'SJF', 'SRTF', 'RR', 'MLFQ'] as Algorithm[]).map((algo) => (
            <button
              key={algo}
              onClick={() => setActiveAlgo(algo)}
              className={`px-4 py-1.5 text-sm font-semibold rounded border transition-all duration-300 ${
                activeAlgo === algo
                  ? 'bg-green-500/10 border-green-400 text-green-300 shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                  : 'bg-transparent border-gray-800 text-gray-500 hover:border-green-500/50 hover:text-green-500/80'
              }`}
            >
              [{algo}]
            </button>
          ))}
        </div>
      </div>

      {/* Main Metrics Dashboard */}
      <div className="w-full max-w-5xl bg-[#0a0a0a] border border-gray-800 rounded-md shadow-2xl overflow-hidden relative">
        
        {/* Glowing top border indicator */}
        <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>

        {/* Panel Header */}
        <div className="bg-[#111] px-4 py-3 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-green-500 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            PROCESS_TABLE : {activeAlgo}
          </h2>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs uppercase bg-[#161616] text-gray-400 select-none">
              <tr>
                {[
                  { key: 'id', label: 'PID' },
                  { key: 'at', label: 'Arrival (AT)' },
                  { key: 'bt', label: 'Burst (BT)' },
                  { key: 'ct', label: 'Completion (CT)' },
                  { key: 'tat', label: 'Turnaround (TAT)' },
                  { key: 'rt', label: 'Response (RT)' },
                  { key: 'wt', label: 'Wait (WT)' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-6 py-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors border-b border-gray-800 group whitespace-nowrap"
                    onClick={() => handleSort(key as keyof ProcessMetrics)}
                  >
                    <div className="flex items-center">
                      <span className={sortKey === key ? 'text-green-400' : 'group-hover:text-gray-300'}>
                        {label}
                      </span>
                      <SortIcon active={sortKey === key} direction={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm text-gray-300 divide-y divide-gray-800/50">
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-green-500/5 transition-colors duration-200 group"
                >
                  <td className="px-6 py-4 font-bold text-green-400">
                    {row.id}
                    {row.starved && <AlertBadge />}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{row.at}ms</td>
                  <td className="px-6 py-4 text-blue-400">{row.bt}ms</td>
                  <td className="px-6 py-4 text-purple-400">{row.ct}ms</td>
                  <td className="px-6 py-4 text-yellow-400">{row.tat}ms</td>
                  <td className="px-6 py-4 text-cyan-400">{row.rt}ms</td>
                  <td className="px-6 py-4 relative min-w-[150px]">
                    <div className="flex items-center justify-between z-10 relative">
                      <span className={row.wt > 15 ? 'text-red-400 font-bold' : 'text-orange-400'}>
                        {row.wt}ms
                      </span>
                    </div>
                    {/* Wait Time Visualizer Bar */}
                    <div className="absolute inset-y-0 left-0 bg-red-500/10 border-l-2 border-red-500/50 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out" 
                         style={{ width: `${(row.wt / maxWt) * 100}%` }}>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Aggregated Summary Footer */}
        <div className="bg-[#111] border-t border-gray-800 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-gray-500 text-xs">
             <p>&gt; TAT = Completion Time - Arrival Time</p>
             <p>&gt; WT = Turnaround Time - Burst Time</p>
          </div>
          
          <div className="flex space-x-6">
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 mb-1">AVG TAT</span>
              <span className="text-xl font-bold text-yellow-400 shadow-yellow-400/20 drop-shadow-md">
                {summary.avgTat} <span className="text-sm text-yellow-600">ms</span>
              </span>
            </div>
            
            <div className="w-px h-10 bg-gray-800"></div>
            
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 mb-1">AVG RT</span>
              <span className="text-xl font-bold text-cyan-400 shadow-cyan-400/20 drop-shadow-md">
                {summary.avgRt} <span className="text-sm text-cyan-600">ms</span>
              </span>
            </div>

            <div className="w-px h-10 bg-gray-800"></div>

            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 mb-1">AVG WT</span>
              <span className={`text-xl font-bold ${parseFloat(summary.avgWt) > 10 ? 'text-red-400' : 'text-orange-400'} shadow-red-400/20 drop-shadow-md`}>
                {summary.avgWt} <span className="text-sm opacity-60">ms</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Terminal decorative footer */}
      <div className="w-full max-w-5xl mt-6 text-xs text-gray-700 font-mono flex justify-between">
        <span>STATUS: RUNNING</span>
        <span>SYS_CORE // SECURE CONNECTION</span>
      </div>

    </div>
  );
}