import React, { useState, useEffect } from 'react';

// --- Types ---
interface Process {
  id: string;
  burstTime: number;
  waitTime: number;
  priority: number;
  algorithm: string;
}

// --- Icons (Inline SVGs) ---
const AlertTriangle = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const CheckCircle = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const TerminalIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

// --- Sub-components ---

const StarvationBadge = ({ starvingProcesses, threshold }: { starvingProcesses: Process[], threshold: number }) => {
  const isStarving = starvingProcesses.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`relative flex flex-col border-2 transition-all duration-500 ${isStarving ? 'border-red-500/80 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-emerald-500/30 bg-emerald-950/20'} p-4 rounded-sm`}>
      
      {/* Scanline overlay for terminal effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>

      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {isStarving ? (
            <div className="relative">
              <div className="absolute inset-0 animate-ping opacity-50 text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
          ) : (
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          )}
          
          <div className="flex flex-col">
            <h2 className={`text-xl font-bold tracking-widest uppercase ${isStarving ? 'text-red-500' : 'text-emerald-500'}`}>
              {isStarving ? 'SYS_WARN: Starvation Detected' : 'SYS_OK: No Starvation'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Threshold: {threshold}ms | Active Flags: {starvingProcesses.length}
            </p>
          </div>
        </div>

        {isStarving && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            {expanded ? 'Collapse Details' : 'View Details'}
          </button>
        )}
      </div>

      {/* Expanded Details Panel */}
      {isStarving && expanded && (
        <div className="mt-4 pt-4 border-t border-red-500/30 z-10 animate-in slide-in-from-top-2 fade-in duration-200">
          <p className="text-red-400/80 text-sm mb-3">
            The following processes have exceeded the maximum acceptable wait time. Consider implementing priority aging or switching to Round Robin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {starvingProcesses.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-black/40 border border-red-500/20 p-2 text-sm">
                <span className="text-red-300 font-bold">[{p.id}]</span>
                <span className="text-slate-300">Wait: <span className="text-red-400 font-mono">{p.waitTime}ms</span></span>
                <span className="text-slate-500 text-xs">{p.algorithm}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [threshold, setThreshold] = useState<number>(50);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  const [processes, setProcesses] = useState<Process[]>([
    { id: 'P1', burstTime: 120, waitTime: 10, priority: 1, algorithm: 'SJF' },
    { id: 'P2', burstTime: 45, waitTime: 48, priority: 3, algorithm: 'SJF' },
    { id: 'P3', burstTime: 10, waitTime: 5, priority: 2, algorithm: 'SJF' },
    { id: 'P4', burstTime: 200, waitTime: 30, priority: 5, algorithm: 'SJF' },
  ]);

  const starvingProcesses = processes.filter(p => p.waitTime >= threshold);

  // Simulation Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        setProcesses(prev => prev.map(p => ({
          ...p,
          // Randomly simulate some processes waiting while others run
          waitTime: p.id === 'P3' ? p.waitTime : p.waitTime + Math.floor(Math.random() * 5) + 1
        })));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  const resetSimulation = () => {
    setIsSimulating(false);
    setProcesses([
      { id: 'P1', burstTime: 120, waitTime: 10, priority: 1, algorithm: 'SJF' },
      { id: 'P2', burstTime: 45, waitTime: 48, priority: 3, algorithm: 'SJF' },
      { id: 'P3', burstTime: 10, waitTime: 5, priority: 2, algorithm: 'SJF' },
      { id: 'P4', burstTime: 200, waitTime: 30, priority: 5, algorithm: 'SJF' },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-mono p-6 selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-slate-800 pb-4">
          <TerminalIcon className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">CPU Scheduler Studio</h1>
            <p className="text-sm text-slate-500">Module: Starvation Detection Subsystem</p>
          </div>
        </header>

        {/* Core Component Highlight: Starvation Badge */}
        <section className="space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Live Telemetry</div>
          <StarvationBadge starvingProcesses={starvingProcesses} threshold={threshold} />
        </section>

        {/* Controls & Data Table (To demonstrate the badge functionality) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls Panel */}
          <div className="lg:col-span-1 bg-[#0a0a0a] border border-slate-800 p-5 rounded-sm space-y-6">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              Parameters
            </h3>
            
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-sm text-slate-400">
                <span>Starvation Threshold (ms): <span className="text-slate-200">{threshold}</span></span>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={threshold} 
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`w-full py-2 px-4 text-sm font-bold uppercase tracking-wider border transition-colors ${
                  isSimulating 
                    ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10' 
                    : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                {isSimulating ? 'Pause Clock' : 'Start Clock'}
              </button>
              
              <button
                onClick={resetSimulation}
                className="w-full py-2 px-4 text-sm font-bold uppercase tracking-wider border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Reset State
              </button>
            </div>
          </div>

          {/* Process Table */}
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800 p-5 rounded-sm">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
              Process Queue
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="pb-2 font-medium">PID</th>
                    <th className="pb-2 font-medium">Priority</th>
                    <th className="pb-2 font-medium">Burst Time</th>
                    <th className="pb-2 font-medium">Wait Time</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {processes.map((p) => {
                    const isStarving = p.waitTime >= threshold;
                    const isWarning = p.waitTime >= threshold * 0.8 && !isStarving;
                    
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-800/20">
                        <td className="py-3 text-slate-300 font-bold">{p.id}</td>
                        <td className="py-3 text-slate-400">{p.priority}</td>
                        <td className="py-3 text-slate-400">{p.burstTime}ms</td>
                        <td className="py-3">
                          <span className={`font-mono ${isStarving ? 'text-red-400 font-bold' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {p.waitTime}ms
                          </span>
                        </td>
                        <td className="py-3">
                          {isStarving ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              STARVING
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              AT RISK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              NOMINAL
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

        </div>
      </div>
    </div>
  );
}