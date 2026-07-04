import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
interface JobConfig {
  numJobs: number;
  arrMin: number;
  arrMax: number;
  burstMin: number;
  burstMax: number;
  priMin: number;
  priMax: number;
}

interface ProcessJob {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
}

// --- Helper Functions ---
const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateHash = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export default function App() {
  const [config, setConfig] = useState<JobConfig>({
    numJobs: 8,
    arrMin: 0,
    arrMax: 15,
    burstMin: 1,
    burstMax: 20,
    priMin: 1,
    priMax: 5,
  });

  const [jobs, setJobs] = useState<ProcessJob[]>([]);
  const [status, setStatus] = useState<string>('SYSTEM_READY');
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: parseInt(value) || 0,
    }));
  };

  const executeGeneration = () => {
    if (isGenerating) return;
    
    // Validation / Auto-correction
    const safeConfig = { ...config };
    if (safeConfig.arrMin > safeConfig.arrMax) safeConfig.arrMax = safeConfig.arrMin;
    if (safeConfig.burstMin > safeConfig.burstMax) safeConfig.burstMax = safeConfig.burstMin;
    if (safeConfig.priMin > safeConfig.priMax) safeConfig.priMax = safeConfig.priMin;
    if (safeConfig.burstMin < 1) safeConfig.burstMin = 1;
    setConfig(safeConfig);

    setIsGenerating(true);
    setStatus('ALLOCATING_MEMORY...');
    setProgress(0);
    setJobs([]);

    // Simulate system processing time for terminal feel
    let tick = 0;
    const interval = setInterval(() => {
      tick += 10;
      setProgress(tick);
      
      if (tick === 30) setStatus('GENERATING_ENTROPY...');
      if (tick === 60) setStatus('COMPILING_WORKLOAD...');
      
      if (tick >= 100) {
        clearInterval(interval);
        
        const newJobs: ProcessJob[] = [];
        for (let i = 0; i < safeConfig.numJobs; i++) {
          newJobs.push({
            id: `P${i + 1}`,
            arrival: randomInt(safeConfig.arrMin, safeConfig.arrMax),
            burst: randomInt(safeConfig.burstMin, safeConfig.burstMax),
            priority: randomInt(safeConfig.priMin, safeConfig.priMax),
          });
        }
        
        // Sort by arrival time to make it realistic
        newJobs.sort((a, b) => a.arrival - b.arrival);
        
        setJobs(newJobs);
        setStatus('WORKLOAD_COMPILED_SUCCESSFULLY');
        setIsGenerating(false);
      }
    }, 50);
  };

  const flushMemory = () => {
    if (isGenerating) return;
    setJobs([]);
    setStatus('MEMORY_FLUSHED');
    setProgress(0);
  };

  // ASCII Progress Bar generator
  const renderProgressBar = () => {
    const totalBlocks = 20;
    const filledBlocks = Math.floor((progress / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return `[${'#'.repeat(filledBlocks)}${'-'.repeat(emptyBlocks)}] ${progress}%`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff00] font-mono p-4 sm:p-8 selection:bg-[#00ff00] selection:text-black flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-6xl mb-8 border-b border-[#00ff00]/30 pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-widest uppercase mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#00ff00] to-[#008800]">
          CPU_Scheduler_Studio
        </h1>
        <div className="flex justify-between items-end text-xs sm:text-sm text-[#00aa00]">
          <span>// MODULE: RANDOM_WORKLOAD_GENERATOR_V3.0</span>
          <span>SYS_TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Configuration */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <div className="border border-[#00ff00]/40 bg-[#0a0a0a] p-1 relative shadow-[0_0_15px_rgba(0,255,0,0.05)]">
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00ff00]"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00ff00]"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00ff00]"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00ff00]"></div>
            
            <div className="bg-[#050505] p-4 h-full">
              <h2 className="text-lg font-bold border-b border-dashed border-[#00ff00]/30 pb-2 mb-4 flex items-center gap-2">
                <span className="animate-pulse">_</span> CONFIG_PARAMETERS
              </h2>

              <div className="space-y-5 text-sm">
                {/* Total Jobs */}
                <div>
                  <label className="block text-[#00aa00] mb-1">TOTAL_PROCESSES: [{config.numJobs}]</label>
                  <input
                    type="range"
                    name="numJobs"
                    min="1"
                    max="50"
                    value={config.numJobs}
                    onChange={handleConfigChange}
                    className="w-full accent-[#00ff00] cursor-pointer"
                  />
                </div>

                {/* Arrival Time Range */}
                <div className="border-l-2 border-[#00ff00]/20 pl-2">
                  <label className="block text-[#00aa00] mb-1">ARRIVAL_TIME_RANGE</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">MIN:</span>
                    <input
                      type="number"
                      name="arrMin"
                      value={config.arrMin}
                      onChange={handleConfigChange}
                      className="w-16 bg-transparent border border-[#00ff00]/40 text-center text-[#00ff00] focus:outline-none focus:border-[#00ff00] focus:bg-[#00ff00]/10 py-1"
                    />
                    <span className="text-xs">MAX:</span>
                    <input
                      type="number"
                      name="arrMax"
                      value={config.arrMax}
                      onChange={handleConfigChange}
                      className="w-16 bg-transparent border border-[#00ff00]/40 text-center text-[#00ff00] focus:outline-none focus:border-[#00ff00] focus:bg-[#00ff00]/10 py-1"
                    />
                  </div>
                </div>

                {/* Burst Time Range */}
                <div className="border-l-2 border-[#00ff00]/20 pl-2">
                  <label className="block text-[#00aa00] mb-1">BURST_TIME_RANGE</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">MIN:</span>
                    <input
                      type="number"
                      name="burstMin"
                      value={config.burstMin}
                      onChange={handleConfigChange}
                      className="w-16 bg-transparent border border-[#00ff00]/40 text-center text-[#00ff00] focus:outline-none focus:border-[#00ff00] focus:bg-[#00ff00]/10 py-1"
                    />
                    <span className="text-xs">MAX:</span>
                    <input
                      type="number"
                      name="burstMax"
                      value={config.burstMax}
                      onChange={handleConfigChange}
                      className="w-16 bg-transparent border border-[#00ff00]/40 text-center text-[#00ff00] focus:outline-none focus:border-[#00ff00] focus:bg-[#00ff00]/10 py-1"
                    />
                  </div>
                </div>

                {/* Priority Range */}
                <div className="border-l-2 border-[#00ff00]/20 pl-2">
                  <label className="block text-[#00aa00] mb-1">PRIORITY_RANGE (Lower = Higher Pri)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">MIN:</span>
                    <input
                      type="number"
                      name="priMin"
                      value={config.priMin}
                      onChange={handleConfigChange}
                      className="w-16 bg-transparent border border-[#00ff00]/40 text-center text-[#00ff00] focus:outline-none focus:border-[#00ff00] focus:bg-[#00ff00]/10 py-1"
                    />
                    <span className="text-xs">MAX:</span>
                    <input
                      type="number"
                      name="priMax"
                      value={config.priMax}
                      onChange={handleConfigChange}
                      className="w-16 bg-transparent border border-[#00ff00]/40 text-center text-[#00ff00] focus:outline-none focus:border-[#00ff00] focus:bg-[#00ff00]/10 py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={executeGeneration}
                  disabled={isGenerating}
                  className="w-full border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-bold py-2 px-4 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <span className="relative z-10">{isGenerating ? 'EXECUTING...' : '[ EXECUTE_GEN ]'}</span>
                  {isGenerating && (
                    <div className="absolute top-0 left-0 h-full bg-[#00ff00]/20 z-0 animate-pulse w-full"></div>
                  )}
                </button>
                <button
                  onClick={flushMemory}
                  disabled={isGenerating}
                  className="w-full border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black font-bold py-2 px-4 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [ FLUSH_MEM ]
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Output Terminal */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="border border-[#00ff00]/40 bg-[#0a0a0a] flex-1 flex flex-col relative shadow-[0_0_20px_rgba(0,255,0,0.03)]">
            
            {/* Terminal Top Bar */}
            <div className="bg-[#00ff00]/10 border-b border-[#00ff00]/40 px-4 py-2 flex justify-between items-center text-xs">
              <span className="text-[#00ff00] font-bold">ttyS0 - WORKLOAD_VIEWER</span>
              <span className="text-[#00aa00]">PID: {generateHash()}</span>
            </div>

            {/* Terminal Body */}
            <div className="p-4 flex-1 overflow-auto bg-[#030303] min-h-[400px]">
              <div className="mb-4 text-sm text-[#00aa00]">
                <p>{'>'} STATUS: {status}</p>
                {isGenerating && (
                  <p className="mt-2 text-[#00ff00]">{renderProgressBar()}</p>
                )}
              </div>

              {!isGenerating && jobs.length > 0 && (
                <div className="animate-fade-in">
                  <p className="text-xs text-[#00aa00] mb-2 border-b border-dashed border-[#00aa00]/30 pb-1">
                    {'>'} {jobs.length} PROCESSES LOADED INTO MEMORY.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="text-[#00ff00] bg-[#00ff00]/5 text-sm uppercase">
                          <th className="py-2 px-3 border-b border-[#00ff00]/40">PID</th>
                          <th className="py-2 px-3 border-b border-[#00ff00]/40">Arrival_Time</th>
                          <th className="py-2 px-3 border-b border-[#00ff00]/40">Burst_Time</th>
                          <th className="py-2 px-3 border-b border-[#00ff00]/40">Priority</th>
                          <th className="py-2 px-3 border-b border-[#00ff00]/40">Mem_Addr</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {jobs.map((job, idx) => (
                          <tr 
                            key={job.id} 
                            className="border-b border-[#00ff00]/10 hover:bg-[#00ff00]/10 transition-colors group"
                            style={{ animationDelay: `${idx * 20}ms` }}
                          >
                            <td className="py-2 px-3 text-[#00ff00] font-bold group-hover:text-white">
                              {job.id}
                            </td>
                            <td className="py-2 px-3 text-[#00aa00] group-hover:text-[#00ff00]">
                              {job.arrival} <span className="text-xs opacity-50">ms</span>
                            </td>
                            <td className="py-2 px-3 text-[#00aa00] group-hover:text-[#00ff00]">
                              {job.burst} <span className="text-xs opacity-50">ms</span>
                            </td>
                            <td className="py-2 px-3 text-yellow-500/80 group-hover:text-yellow-400">
                              {job.priority}
                            </td>
                            <td className="py-2 px-3 text-[#005500] font-mono text-xs group-hover:text-[#00aa00]">
                              0x{Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex gap-4">
                    <button className="text-xs text-[#00aa00] hover:text-[#00ff00] underline decoration-dashed underline-offset-4">
                      {'>'} EXPORT_TO_JSON
                    </button>
                    <button className="text-xs text-[#00aa00] hover:text-[#00ff00] underline decoration-dashed underline-offset-4">
                      {'>'} SEND_TO_SCHEDULER
                    </button>
                  </div>
                </div>
              )}

              {!isGenerating && jobs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[#005500] opacity-50 pt-20">
                  <div className="text-6xl mb-4">▤</div>
                  <p>NO_DATA_IN_BUFFER</p>
                  <p className="text-xs mt-2">AWAITING_USER_EXECUTION</p>
                </div>
              )}
            </div>
            
            {/* Blinking Cursor at bottom */}
            <div className="bg-[#030303] px-4 pb-4 pt-1 border-t border-transparent">
               <span className="text-[#00ff00] animate-pulse">_</span>
            </div>
          </div>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
}