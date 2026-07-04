import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Types & Interfaces ---

interface Process {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
  ioFrequency: number;
}

interface GeneratorConfig {
  count: number;
  arrivalMax: number;
  burstMin: number;
  burstMax: number;
  priorityLevels: number;
  distribution: 'uniform' | 'normal' | 'bimodal';
  includeIO: boolean;
}

// --- Utility Functions ---

// Standard Normal variate using Box-Muller transform
const randNormal = (min: number, max: number): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randNormal(min, max); // resample
  return Math.floor(num * (max - min + 1) + min);
};

// Bimodal distribution (mix of two normals)
const randBimodal = (min: number, max: number): number => {
  const isPeak1 = Math.random() > 0.5;
  const mid = (min + max) / 2;
  if (isPeak1) {
    return randNormal(min, mid);
  } else {
    return randNormal(mid, max);
  }
};

const randUniform = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// --- Main Component ---

export default function App() {
  const [config, setConfig] = useState<GeneratorConfig>({
    count: 10,
    arrivalMax: 20,
    burstMin: 1,
    burstMax: 15,
    priorityLevels: 5,
    distribution: 'normal',
    includeIO: false,
  });

  const [workload, setWorkload] = useState<Process[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev, `[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${msg}`]);
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalLogs]);

  useEffect(() => {
    addLog("SYS_INIT: Random Workload Generator module loaded.");
    addLog("Awaiting generation command...");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(() => {
    if (config.burstMin > config.burstMax) {
      addLog("ERROR: burstMin cannot be greater than burstMax.");
      return;
    }

    setIsGenerating(true);
    setWorkload([]);
    addLog(`CMD_EXEC: generate_workload --count=${config.count} --dist=${config.distribution}`);

    setTimeout(() => {
      const newWorkload: Process[] = [];
      let currentArrivalTime = 0;

      for (let i = 1; i <= config.count; i++) {
        // Arrival time generation (Poisson-like inter-arrival approximation)
        const interArrival = randUniform(0, Math.max(1, Math.floor(config.arrivalMax / config.count) * 2));
        currentArrivalTime = i === 1 ? 0 : currentArrivalTime + interArrival;

        // Burst time generation based on selected distribution
        let burst = 1;
        switch (config.distribution) {
          case 'normal':
            burst = randNormal(config.burstMin, config.burstMax);
            break;
          case 'bimodal':
            burst = randBimodal(config.burstMin, config.burstMax);
            break;
          case 'uniform':
          default:
            burst = randUniform(config.burstMin, config.burstMax);
            break;
        }

        const priority = randUniform(1, config.priorityLevels);
        const ioFrequency = config.includeIO && Math.random() > 0.6 ? randUniform(2, Math.max(3, Math.floor(burst / 2))) : 0;

        newWorkload.push({
          id: `P${i.toString().padStart(2, '0')}`,
          arrival: currentArrivalTime,
          burst,
          priority,
          ioFrequency,
        });
      }

      setWorkload(newWorkload);
      setIsGenerating(false);
      addLog(`SUCCESS: Generated ${config.count} processes successfully.`);
      addLog(`INFO: Workload ready for FCFS, SJF, SRTF, RR, and MLFQ simulation.`);
    }, 600); // Simulate processing delay for effect
  }, [config]);

  const handleExport = () => {
    const dataStr = JSON.stringify(workload, null, 2);
    navigator.clipboard.writeText(dataStr);
    addLog("EXPORT: Workload copied to clipboard (JSON format).");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#00ffcc] font-mono p-4 md:p-8 selection:bg-[#00ffcc] selection:text-black flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl mb-8 border-b border-[#00ffcc]/30 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tighter uppercase drop-shadow-[0_0_8px_rgba(0,255,204,0.5)]">
            CPU_Sched_Studio // Generator
          </h1>
          <p className="text-[#00ffcc]/60 text-sm mt-2">
            Module: Workload_Synthesis (Variant #5)
          </p>
        </div>
        <div className="flex gap-4 text-xs md:text-sm text-[#00ffcc]/50">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse"></span> ONLINE</span>
          <span>v2.4.1_CYBER</span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls Panel */}
        <section className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#111114] border border-[#00ffcc]/20 p-5 rounded relative overflow-hidden shadow-[0_0_15px_rgba(0,255,204,0.05)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ffcc] to-transparent opacity-50"></div>
            
            <h2 className="text-xl mb-6 flex items-center gap-2 border-b border-[#00ffcc]/20 pb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Parameters
            </h2>

            <div className="space-y-5">
              {/* Process Count */}
              <div className="space-y-1">
                <label className="flex justify-between text-xs text-[#00ffcc]/70">
                  <span>Process Count</span>
                  <span>{config.count}</span>
                </label>
                <input
                  type="range" min="1" max="50"
                  value={config.count}
                  onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                  className="w-full h-1 bg-gray-800 appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ffcc] [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Arrival Max */}
              <div className="space-y-1">
                <label className="flex justify-between text-xs text-[#00ffcc]/70">
                  <span>Max Arrival Time</span>
                  <span>{config.arrivalMax}</span>
                </label>
                <input
                  type="range" min="0" max="100"
                  value={config.arrivalMax}
                  onChange={(e) => setConfig({ ...config, arrivalMax: parseInt(e.target.value) })}
                  className="w-full h-1 bg-gray-800 appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ffcc] [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Burst Min/Max */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-[#00ffcc]/70">Min Burst</label>
                  <input
                    type="number" min="1" max={config.burstMax}
                    value={config.burstMin}
                    onChange={(e) => setConfig({ ...config, burstMin: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#0a0a0c] border border-[#00ffcc]/30 p-1 text-[#00ffcc] text-sm focus:border-[#00ffcc] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-[#00ffcc]/70">Max Burst</label>
                  <input
                    type="number" min={config.burstMin} max="100"
                    value={config.burstMax}
                    onChange={(e) => setConfig({ ...config, burstMax: parseInt(e.target.value) || config.burstMin })}
                    className="w-full bg-[#0a0a0c] border border-[#00ffcc]/30 p-1 text-[#00ffcc] text-sm focus:border-[#00ffcc] outline-none"
                  />
                </div>
              </div>

              {/* Priority Levels */}
              <div className="space-y-1">
                <label className="flex justify-between text-xs text-[#00ffcc]/70">
                  <span>Priority Levels (1-N)</span>
                  <span>{config.priorityLevels}</span>
                </label>
                <input
                  type="range" min="1" max="10"
                  value={config.priorityLevels}
                  onChange={(e) => setConfig({ ...config, priorityLevels: parseInt(e.target.value) })}
                  className="w-full h-1 bg-gray-800 appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ffcc] [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Distribution & Options */}
              <div className="pt-2 space-y-3 border-t border-[#00ffcc]/20">
                <div className="space-y-1">
                  <label className="block text-xs text-[#00ffcc]/70 mb-1">Burst Distribution</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['uniform', 'normal', 'bimodal'].map((dist) => (
                      <button
                        key={dist}
                        onClick={() => setConfig({ ...config, distribution: dist as any })}
                        className={`text-xs py-1 border transition-colors ${
                          config.distribution === dist 
                            ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]' 
                            : 'bg-transparent border-[#00ffcc]/30 text-[#00ffcc]/50 hover:border-[#00ffcc]/60'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#00ffcc]/70 cursor-pointer group mt-4">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={config.includeIO}
                      onChange={(e) => setConfig({ ...config, includeIO: e.target.checked })}
                    />
                    <div className={`w-4 h-4 border transition-colors ${config.includeIO ? 'bg-[#00ffcc] border-[#00ffcc]' : 'border-[#00ffcc]/50 group-hover:border-[#00ffcc]'}`}>
                      {config.includeIO && <svg className="w-full h-full text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                  </div>
                  <span>Inject I/O Bursts (For MLFQ testing)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-col gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="relative w-full py-3 bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc] hover:bg-[#00ffcc] hover:text-black transition-all font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                >
                  <span className="relative z-10">{isGenerating ? 'Synthesizing...' : 'Generate Workload'}</span>
                  {/* Glitch overlay effect on hover */}
                  <div className="absolute inset-0 bg-[#00ffcc] opacity-0 group-hover:opacity-20 transform translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>
                <button
                  onClick={handleExport}
                  disabled={workload.length === 0}
                  className="w-full py-2 bg-transparent text-[#00ffcc]/70 border border-[#00ffcc]/30 hover:bg-[#00ffcc]/10 hover:border-[#00ffcc]/60 hover:text-[#00ffcc] transition-all text-sm uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Export to Clipboard
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Display Panel */}
        <section className="col-span-1 lg:col-span-8 flex flex-col gap-6">
          
          {/* Workload Data Table */}
          <div className="bg-[#050505] border border-[#00ffcc]/20 rounded relative h-[400px] flex flex-col shadow-inner">
            <div className="bg-[#111114] px-4 py-2 border-b border-[#00ffcc]/20 flex justify-between items-center text-sm">
              <span className="text-[#00ffcc]/80">workload.dat</span>
              <span className="text-[#00ffcc]/40">Items: {workload.length}</span>
            </div>
            
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {workload.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#00ffcc]/30 italic text-sm">
                  {isGenerating ? '> Processing...' : '> No data. Awaiting generation command.'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#050505] shadow-[0_4px_10px_-4px_rgba(0,0,0,1)] z-10">
                    <tr className="text-[#00ffcc]/60 text-xs uppercase tracking-wider">
                      <th className="pb-3 border-b border-[#00ffcc]/20">PID</th>
                      <th className="pb-3 border-b border-[#00ffcc]/20">Arrival Time</th>
                      <th className="pb-3 border-b border-[#00ffcc]/20">Burst Time</th>
                      <th className="pb-3 border-b border-[#00ffcc]/20">Priority</th>
                      {config.includeIO && <th className="pb-3 border-b border-[#00ffcc]/20">I/O Freq</th>}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {workload.map((p, idx) => (
                      <tr key={p.id} className="border-b border-[#00ffcc]/5 hover:bg-[#00ffcc]/5 transition-colors group">
                        <td className="py-2 text-[#00ffcc] font-bold">{p.id}</td>
                        <td className="py-2 text-white/80">{p.arrival}</td>
                        <td className="py-2 text-[#ff0099] font-bold drop-shadow-[0_0_2px_rgba(255,0,153,0.5)]">
                          {p.burst} <span className="text-xs text-[#ff0099]/50 font-normal">ms</span>
                        </td>
                        <td className="py-2">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-sm border ${
                            p.priority === 1 ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                            p.priority === config.priorityLevels ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                            'border-[#00ffcc]/30 text-[#00ffcc]/80'
                          }`}>
                            P{p.priority}
                          </span>
                        </td>
                        {config.includeIO && (
                          <td className="py-2 text-yellow-500/80 text-xs">
                            {p.ioFrequency > 0 ? `Every ${p.ioFrequency}ms` : 'None'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Terminal Log Output */}
          <div className="bg-[#050505] border border-[#00ffcc]/20 rounded relative flex-1 min-h-[150px] shadow-inner font-mono text-xs p-3 overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm-2-1h-6v-2h6v2zM6 10h2v2H6v-2zm0 3h2v2H6v-2z" /></svg>
            </div>
            <div className="flex-1 overflow-auto space-y-1 custom-scrollbar pr-4 text-[#00ffcc]/80">
              {terminalLogs.map((log, i) => (
                <div key={i} className={`${log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-green-400' : log.includes('CMD_EXEC') ? 'text-white' : ''}`}>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} className="h-0" />
            </div>
            <div className="mt-2 text-[#00ffcc] animate-pulse">_</div>
          </div>

        </section>
      </main>

      {/* Embedded Styles for custom scrollbar to ensure zero external CSS deps */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 255, 204, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 204, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 204, 0.5);
        }
      `}} />
    </div>
  );
}