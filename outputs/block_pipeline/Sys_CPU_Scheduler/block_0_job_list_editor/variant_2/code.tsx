import React, { useState, useCallback, useEffect } from 'react';

interface Process {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

export default function App() {
  const [processes, setProcesses] = useState<Process[]>([
    { id: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: 'P3', arrivalTime: 2, burstTime: 8, priority: 4 },
    { id: 'P4', arrivalTime: 4, burstTime: 2, priority: 3 },
  ]);

  const [timeQuantum, setTimeQuantum] = useState<number>(4);
  const [pidCounter, setPidCounter] = useState<number>(5);
  const [sysTime, setSysTime] = useState<string>(new Date().toLocaleTimeString());

  // Terminal clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSysTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddJob = () => {
    const newProcess: Process = {
      id: `P${pidCounter}`,
      arrivalTime: processes.length > 0 ? Math.max(...processes.map(p => p.arrivalTime)) + 1 : 0,
      burstTime: Math.floor(Math.random() * 10) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
    };
    setProcesses([...processes, newProcess]);
    setPidCounter(pidCounter + 1);
  };

  const handleRemoveJob = (id: string) => {
    setProcesses(processes.filter(p => p.id !== id));
  };

  const handleUpdateJob = (id: string, field: keyof Process, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setProcesses(processes.map(p => {
      if (p.id === id) {
        return { ...p, [field]: numValue };
      }
      return p;
    }));
  };

  const generateRandomWorkload = useCallback(() => {
    const count = Math.floor(Math.random() * 4) + 4; // 4 to 7 jobs
    const newJobs: Process[] = [];
    let currentArrival = 0;
    
    for (let i = 1; i <= count; i++) {
      newJobs.push({
        id: `P${i}`,
        arrivalTime: currentArrival,
        burstTime: Math.floor(Math.random() * 12) + 1,
        priority: Math.floor(Math.random() * 5) + 1,
      });
      // 70% chance next job arrives a bit later
      if (Math.random() > 0.3) {
        currentArrival += Math.floor(Math.random() * 4);
      }
    }
    
    setProcesses(newJobs);
    setPidCounter(count + 1);
  }, []);

  const clearJobs = () => {
    setProcesses([]);
    setPidCounter(1);
  };

  const totalBurst = processes.reduce((acc, curr) => acc + curr.burstTime, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 sm:p-8 relative selection:bg-[#33ff33] selection:text-black overflow-x-hidden">
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-20"></div>
      
      {/* CRT Vignette */}
      <div className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="border-b-2 border-[#33ff33]/40 pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter drop-shadow-[0_0_8px_rgba(51,255,51,0.6)]">
              CPU_SCHEDULER_STUDIO
            </h1>
            <p className="text-[#33ff33]/70 text-sm mt-1">MODULE: WORKLOAD_CONFIGURATOR v3.0.1</p>
          </div>
          <div className="text-right text-sm border border-[#33ff33]/30 p-2 bg-[#0a200a]/50">
            <div>SYS_TIME: {sysTime}</div>
            <div>STATUS: <span className="animate-pulse text-[#33ff33]">ONLINE</span></div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Panel: Controls */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Action Menu */}
            <div className="border border-[#33ff33]/40 bg-[#001100] p-4 shadow-[0_0_15px_rgba(51,255,51,0.1)]">
              <h2 className="text-xl font-bold border-b border-[#33ff33]/40 pb-2 mb-4 drop-shadow-[0_0_5px_rgba(51,255,51,0.8)]">
                &gt; COMMANDS
              </h2>
              <div className="flex flex-col gap-3 text-sm">
                <button 
                  onClick={handleAddJob}
                  className="w-full text-left px-3 py-2 border border-[#33ff33]/30 hover:bg-[#33ff33]/20 hover:border-[#33ff33] transition-colors flex justify-between group"
                >
                  <span>[1] ADD_PROCESS</span>
                  <span className="opacity-0 group-hover:opacity-100">&lt;</span>
                </button>
                <button 
                  onClick={generateRandomWorkload}
                  className="w-full text-left px-3 py-2 border border-[#33ff33]/30 hover:bg-[#33ff33]/20 hover:border-[#33ff33] transition-colors flex justify-between group"
                >
                  <span>[2] GEN_RANDOM</span>
                  <span className="opacity-0 group-hover:opacity-100">&lt;</span>
                </button>
                <button 
                  onClick={clearJobs}
                  className="w-full text-left px-3 py-2 border border-[#ff3333]/40 text-[#ff3333] hover:bg-[#ff3333]/20 hover:border-[#ff3333] transition-colors flex justify-between group"
                >
                  <span>[3] FLUSH_MEMORY</span>
                  <span className="opacity-0 group-hover:opacity-100">&lt;</span>
                </button>
              </div>
            </div>

            {/* Global Params */}
            <div className="border border-[#33ff33]/40 bg-[#001100] p-4 shadow-[0_0_15px_rgba(51,255,51,0.1)]">
              <h2 className="text-xl font-bold border-b border-[#33ff33]/40 pb-2 mb-4 drop-shadow-[0_0_5px_rgba(51,255,51,0.8)]">
                &gt; GLOBALS
              </h2>
              <div className="mb-4">
                <label className="block text-sm mb-2 opacity-80">TIME_QUANTUM (RR): [{timeQuantum}ms]</label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={timeQuantum}
                  onChange={(e) => setTimeQuantum(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#0a200a] rounded-none appearance-none cursor-pointer border border-[#33ff33]/30 accent-[#33ff33]"
                />
                <div className="flex justify-between text-xs mt-1 opacity-50">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
              <div className="mt-6 text-sm border-t border-dashed border-[#33ff33]/30 pt-4">
                <div className="flex justify-between mb-1">
                  <span>ACTIVE_PROCS:</span>
                  <span>{processes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL_BURST:</span>
                  <span>{totalBurst}ms</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Job Editor Table */}
          <div className="lg:col-span-3 border border-[#33ff33]/40 bg-[#001100] p-1 sm:p-4 shadow-[0_0_15px_rgba(51,255,51,0.1)] overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 px-2 drop-shadow-[0_0_5px_rgba(51,255,51,0.8)]">
              &gt; PROCESS_TABLE <span className="animate-pulse">_</span>
            </h2>
            
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-[#33ff33]/50 text-sm">
                  <th className="p-3 font-normal opacity-70">PID</th>
                  <th className="p-3 font-normal opacity-70">ARRIVAL_TIME</th>
                  <th className="p-3 font-normal opacity-70">BURST_TIME</th>
                  <th className="p-3 font-normal opacity-70">PRIORITY</th>
                  <th className="p-3 font-normal opacity-70">FLAGS</th>
                  <th className="p-3 font-normal opacity-70 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#33ff33]/50 border-b border-[#33ff33]/20 border-dashed">
                      NO_PROCESSES_FOUND. AWAITING_INPUT...
                    </td>
                  </tr>
                ) : (
                  processes.map((proc, index) => {
                    // Starvation heuristic: High priority number (lower priority) & large burst time
                    const isStarvationRisk = proc.priority >= 4 && proc.burstTime > 6;

                    return (
                      <tr key={proc.id} className="border-b border-[#33ff33]/20 border-dashed hover:bg-[#33ff33]/5 transition-colors group">
                        <td className="p-3 font-bold">{proc.id}</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <span className="opacity-50 mr-1">&gt;</span>
                            <input 
                              type="number" 
                              min="0"
                              value={proc.arrivalTime}
                              onChange={(e) => handleUpdateJob(proc.id, 'arrivalTime', e.target.value)}
                              className="bg-transparent border-b border-transparent group-hover:border-[#33ff33]/50 focus:border-[#33ff33] focus:outline-none w-16 text-[#33ff33] font-mono"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <span className="opacity-50 mr-1">&gt;</span>
                            <input 
                              type="number" 
                              min="1"
                              value={proc.burstTime}
                              onChange={(e) => handleUpdateJob(proc.id, 'burstTime', e.target.value)}
                              className="bg-transparent border-b border-transparent group-hover:border-[#33ff33]/50 focus:border-[#33ff33] focus:outline-none w-16 text-[#33ff33] font-mono"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <span className="opacity-50 mr-1">&gt;</span>
                            <input 
                              type="number" 
                              min="1"
                              value={proc.priority}
                              onChange={(e) => handleUpdateJob(proc.id, 'priority', e.target.value)}
                              className="bg-transparent border-b border-transparent group-hover:border-[#33ff33]/50 focus:border-[#33ff33] focus:outline-none w-16 text-[#33ff33] font-mono"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          {isStarvationRisk ? (
                            <span className="bg-[#ff3333]/20 text-[#ff3333] border border-[#ff3333]/50 px-2 py-1 inline-block animate-pulse">
                              ! STARVATION_RISK
                            </span>
                          ) : (
                            <span className="text-[#33ff33]/50">OK</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleRemoveJob(proc.id)}
                            className="text-[#ff3333]/70 hover:text-[#ff3333] hover:bg-[#ff3333]/10 px-2 py-1 border border-transparent hover:border-[#ff3333]/50 transition-all"
                            title="Kill Process"
                          >
                            [KILL]
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {/* Visual memory representation */}
            {processes.length > 0 && (
              <div className="mt-8 px-2">
                <div className="text-xs opacity-50 mb-2">MEMORY_ALLOCATION_MAP:</div>
                <div className="w-full h-4 flex gap-1 bg-[#0a200a] p-1 border border-[#33ff33]/30">
                  {processes.map((p, i) => (
                    <div 
                      key={p.id} 
                      className="h-full bg-[#33ff33]/70 hover:bg-[#33ff33] transition-colors relative group"
                      style={{ width: `${(p.burstTime / totalBurst) * 100}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 bg-black border border-[#33ff33] px-1 z-10 pointer-events-none">
                        {p.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 text-center text-xs opacity-40 border-t border-[#33ff33]/20 pt-4">
          END OF LINE. SYSTEM READY.
        </div>
      </div>
    </div>
  );
}