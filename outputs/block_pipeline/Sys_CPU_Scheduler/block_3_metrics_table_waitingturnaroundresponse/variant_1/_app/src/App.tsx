import React, { useState, useEffect, useMemo } from 'react';

// --- Types ---
interface Process {
  id: string;
  arrival: number;
  burst: number;
}

interface Metrics {
  id: string;
  rt: number; // Response Time
  wt: number; // Waiting Time
  tat: number; // Turnaround Time
  completion: number;
  isStarving: boolean;
}

type Algorithm = 'FCFS' | 'SJF' | 'RR';

// --- Simulation Logic ---
const simulateScheduler = (
  processes: Process[],
  algo: Algorithm,
  quantum: number
): { metrics: Metrics[]; log: string[] } => {
  const log: string[] = [];
  let metrics: Record<string, Metrics> = {};
  
  // Initialize metrics
  processes.forEach((p) => {
    metrics[p.id] = { id: p.id, rt: -1, wt: 0, tat: 0, completion: 0, isStarving: false };
  });

  const sortedByArrival = [...processes].sort((a, b) => a.arrival - b.arrival);

  if (algo === 'FCFS') {
    let time = 0;
    sortedByArrival.forEach((p) => {
      if (time < p.arrival) time = p.arrival;
      metrics[p.id].rt = time - p.arrival;
      time += p.burst;
      metrics[p.id].completion = time;
      metrics[p.id].tat = metrics[p.id].completion - p.arrival;
      metrics[p.id].wt = metrics[p.id].tat - p.burst;
    });
    log.push('Executed First-Come, First-Served (FCFS) sequentially.');
  } 
  else if (algo === 'SJF') {
    let time = 0;
    let completed = 0;
    const remaining = sortedByArrival.map((p) => ({ ...p, isDone: false }));
    
    while (completed < processes.length) {
      const available = remaining.filter((p) => p.arrival <= time && !p.isDone);
      
      if (available.length === 0) {
        time++;
        continue;
      }
      
      available.sort((a, b) => a.burst - b.burst);
      const p = available[0];
      
      metrics[p.id].rt = time - p.arrival;
      time += p.burst;
      metrics[p.id].completion = time;
      metrics[p.id].tat = metrics[p.id].completion - p.arrival;
      metrics[p.id].wt = metrics[p.id].tat - p.burst;
      p.isDone = true;
      completed++;
    }
    log.push('Executed Shortest Job First (SJF) - Non-preemptive.');
  } 
  else if (algo === 'RR') {
    let time = 0;
    let completed = 0;
    const queue: (Process & { remainingBurst: number })[] = [];
    const remaining = sortedByArrival.map((p) => ({ ...p, remainingBurst: p.burst }));
    let i = 0;

    // Push initial available processes
    while (i < remaining.length && remaining[i].arrival <= time) {
      queue.push(remaining[i]);
      i++;
    }

    if (queue.length === 0 && i < remaining.length) {
      time = remaining[i].arrival;
      while (i < remaining.length && remaining[i].arrival <= time) {
        queue.push(remaining[i]);
        i++;
      }
    }

    while (completed < processes.length) {
      if (queue.length === 0) {
        if (i < remaining.length) {
          time = remaining[i].arrival;
          while (i < remaining.length && remaining[i].arrival <= time) {
            queue.push(remaining[i]);
            i++;
          }
        }
        continue;
      }

      const p = queue.shift()!;
      
      if (metrics[p.id].rt === -1) {
        metrics[p.id].rt = time - p.arrival;
      }

      const execTime = Math.min(p.remainingBurst, quantum);
      time += execTime;
      p.remainingBurst -= execTime;

      // Check for new arrivals during execution
      while (i < remaining.length && remaining[i].arrival <= time) {
        queue.push(remaining[i]);
        i++;
      }

      if (p.remainingBurst > 0) {
        queue.push(p);
      } else {
        metrics[p.id].completion = time;
        metrics[p.id].tat = metrics[p.id].completion - p.arrival;
        metrics[p.id].wt = metrics[p.id].tat - p.burst;
        completed++;
      }
    }
    log.push(`Executed Round Robin (RR) with Time Quantum = ${quantum}.`);
  }

  // Calculate Starvation Warning (Heuristic: WT is more than 3x Burst and > 10)
  const resultMetrics = Object.values(metrics).map(m => {
    const p = processes.find(proc => proc.id === m.id)!;
    return {
      ...m,
      isStarving: m.wt >= p.burst * 3 && m.wt > 10
    };
  });

  return { metrics: resultMetrics, log };
};


// --- Main Component ---
export default function App() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [algorithm, setAlgorithm] = useState<Algorithm>('FCFS');
  const [quantum, setQuantum] = useState<number>(4);
  const [sysLog, setSysLog] = useState<string[]>(['SYSTEM BOOT... OK', 'AWAITING WORKLOAD...']);

  const generateWorkload = () => {
    const count = Math.floor(Math.random() * 4) + 5; // 5 to 8 processes
    const newProcs: Process[] = [];
    let currentArrival = 0;
    
    for (let i = 1; i <= count; i++) {
      newProcs.push({
        id: `P${i}`,
        arrival: currentArrival,
        burst: Math.floor(Math.random() * 15) + 2,
      });
      // 30% chance next process arrives at same time, else advance arrival
      if (Math.random() > 0.3) {
        currentArrival += Math.floor(Math.random() * 5);
      }
    }
    setProcesses(newProcs);
    addLog(`Generated new workload with ${count} processes.`);
  };

  const addLog = (msg: string) => {
    setSysLog(prev => [msg, ...prev].slice(0, 5));
  };

  useEffect(() => {
    generateWorkload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { metrics, log } = useMemo(() => {
    if (processes.length === 0) return { metrics: [], log: [] };
    const res = simulateScheduler(processes, algorithm, quantum);
    return res;
  }, [processes, algorithm, quantum]);

  useEffect(() => {
    if (log.length > 0) addLog(log[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  // Averages
  const avgWT = metrics.length ? (metrics.reduce((acc, m) => acc + m.wt, 0) / metrics.length).toFixed(2) : '0.00';
  const avgTAT = metrics.length ? (metrics.reduce((acc, m) => acc + m.tat, 0) / metrics.length).toFixed(2) : '0.00';
  const avgRT = metrics.length ? (metrics.reduce((acc, m) => acc + m.rt, 0) / metrics.length).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 md:p-8 flex flex-col gap-6 selection:bg-green-500/30">
      
      {/* Header */}
      <header className="border-b border-green-500/30 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-green-400 flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
            CPU_SCHEDULER_STUDIO
          </h1>
          <p className="text-xs text-green-600 mt-1">MODULE: METRICS_ANALYSIS_TABLE // VARIANT_02</p>
        </div>
        
        <div className="flex items-center gap-4 text-sm bg-gray-900 border border-green-500/20 p-2 rounded">
          <div className="flex items-center gap-2">
            <span className="text-green-600">ALGO:</span>
            <select 
              className="bg-black border border-green-500/50 text-green-400 p-1 outline-none focus:border-green-300"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
            >
              <option value="FCFS">FCFS (First-Come)</option>
              <option value="SJF">SJF (Shortest Job)</option>
              <option value="RR">RR (Round Robin)</option>
            </select>
          </div>
          
          {algorithm === 'RR' && (
            <div className="flex items-center gap-2 border-l border-green-500/30 pl-4">
              <span className="text-green-600">QUANTUM:</span>
              <input 
                type="range" 
                min="1" max="10" 
                value={quantum} 
                onChange={(e) => setQuantum(Number(e.target.value))}
                className="w-20 accent-green-500"
              />
              <span className="w-4 text-center">{quantum}</span>
            </div>
          )}
          
          <button 
            onClick={generateWorkload}
            className="ml-2 border border-green-500/50 hover:bg-green-500/10 px-3 py-1 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            RND_GEN
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Metrics Table */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-black border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)] overflow-hidden relative">
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10 opacity-20"></div>
            
            <div className="p-3 border-b border-green-500/30 bg-green-950/20 flex justify-between items-center">
              <h2 className="text-sm font-bold tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                PROCESS_METRICS_DATATABLE
              </h2>
              <span className="text-xs text-green-600 animate-pulse">LIVE_TRACKING // ON</span>
            </div>
            
            <div className="overflow-x-auto relative z-20">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-green-600 bg-gray-900/50 border-b border-green-500/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">PID</th>
                    <th className="px-4 py-3 font-medium">ARRIVAL (AT)</th>
                    <th className="px-4 py-3 font-medium">BURST (BT)</th>
                    <th className="px-4 py-3 font-medium text-cyan-500/80">RESPONSE (RT)</th>
                    <th className="px-4 py-3 font-medium text-amber-500/80">WAITING (WT)</th>
                    <th className="px-4 py-3 font-medium text-purple-500/80">TURNAROUND (TAT)</th>
                    <th className="px-4 py-3 font-medium text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p, idx) => {
                    const m = metrics.find(x => x.id === p.id);
                    if (!m) return null;
                    
                    return (
                      <tr key={p.id} className="border-b border-green-500/10 hover:bg-green-900/10 transition-colors">
                        <td className="px-4 py-3 font-bold">{p.id}</td>
                        <td className="px-4 py-3 text-green-400/70">{p.arrival} ms</td>
                        <td className="px-4 py-3 text-green-400/70">{p.burst} ms</td>
                        <td className="px-4 py-3 text-cyan-400">{m.rt} ms</td>
                        <td className="px-4 py-3 text-amber-400">{m.wt} ms</td>
                        <td className="px-4 py-3 text-purple-400">{m.tat} ms</td>
                        <td className="px-4 py-3 flex justify-center">
                          {m.isStarving ? (
                            <span className="inline-flex items-center gap-1 bg-red-950/50 border border-red-500/50 text-red-400 text-[10px] px-2 py-1 rounded shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              STARVATION_WARN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 text-[10px] px-2 py-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
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
          </div>

          {/* Aggregated Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black border border-cyan-500/30 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <p className="text-xs text-cyan-600 mb-1">AVERAGE_RESPONSE_TIME</p>
              <p className="text-3xl font-light text-cyan-400">{avgRT} <span className="text-sm text-cyan-700">ms</span></p>
            </div>
            
            <div className="bg-black border border-amber-500/30 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs text-amber-600 mb-1">AVERAGE_WAITING_TIME</p>
              <p className="text-3xl font-light text-amber-400">{avgWT} <span className="text-sm text-amber-700">ms</span></p>
            </div>

            <div className="bg-black border border-purple-500/30 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <p className="text-xs text-purple-600 mb-1">AVERAGE_TURNAROUND_TIME</p>
              <p className="text-3xl font-light text-purple-400">{avgTAT} <span className="text-sm text-purple-700">ms</span></p>
            </div>
          </div>
        </div>

        {/* Right Col: System Logs & Info */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-black border border-green-500/30 flex-1 flex flex-col">
            <div className="p-3 border-b border-green-500/30 bg-green-950/20">
              <h2 className="text-sm font-bold tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                SYS_LOGS
              </h2>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2 overflow-y-auto text-xs text-green-500/70">
              {sysLog.map((logStr, i) => (
                <div key={i} className="flex gap-2 font-mono">
                  <span className="text-green-700 shrink-0">[{new Date().toISOString().substring(11, 19)}]</span>
                  <span className={i === 0 ? 'text-green-300' : ''}>{logStr}</span>
                </div>
              ))}
              <div className="mt-auto pt-4 flex gap-2 items-center opacity-50">
                <span className="w-2 h-4 bg-green-500 animate-pulse"></span>
                <span>AWAITING_INPUT</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-green-500/20 p-4 text-xs">
            <h3 className="text-green-400 font-bold mb-2 border-b border-green-500/20 pb-1">METRIC_DEFINITIONS</h3>
            <ul className="space-y-2 text-green-600">
              <li><strong className="text-cyan-500">RT (Response):</strong> Time from arrival to first execution.</li>
              <li><strong className="text-amber-500">WT (Waiting):</strong> Total time spent in ready queue. (TAT - Burst)</li>
              <li><strong className="text-purple-500">TAT (Turnaround):</strong> Total time from arrival to completion.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}