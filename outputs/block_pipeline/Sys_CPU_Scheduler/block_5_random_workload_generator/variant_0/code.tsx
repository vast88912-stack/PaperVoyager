import React, { useState, useEffect, useCallback } from 'react';

// Types
type Job = {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number | null;
};

type Config = {
  jobCount: number;
  maxBurst: number;
  maxArrival: number;
  usePriority: boolean;
  priorityRange: number;
};

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [config, setConfig] = useState<Config>({
    jobCount: 8,
    maxBurst: 20,
    maxArrival: 15,
    usePriority: true,
    priorityRange: 5,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [systemTime, setSystemTime] = useState<string>('');

  // Terminal clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toISOString().replace('T', ' ').substring(0, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const generateWorkload = useCallback(() => {
    setIsGenerating(true);
    
    // Simulate terminal processing delay
    setTimeout(() => {
      const newJobs: Job[] = [];
      for (let i = 0; i < config.jobCount; i++) {
        newJobs.push({
          id: `P${String(i + 1).padStart(2, '0')}`,
          arrivalTime: Math.floor(Math.random() * (config.maxArrival + 1)),
          burstTime: Math.floor(Math.random() * config.maxBurst) + 1,
          priority: config.usePriority 
            ? Math.floor(Math.random() * config.priorityRange) + 1 
            : null,
        });
      }
      
      // Sort by arrival time to simulate a natural queue
      newJobs.sort((a, b) => a.arrivalTime - b.arrivalTime);
      
      setJobs(newJobs);
      setIsGenerating(false);
      showToast('WORKLOAD_GENERATED_SUCCESSFULLY');
    }, 600);
  }, [config]);

  // Generate initial workload on mount
  useEffect(() => {
    generateWorkload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyToClipboard = () => {
    const json = JSON.stringify(jobs, null, 2);
    navigator.clipboard.writeText(json);
    showToast('COPIED_TO_CLIPBOARD');
  };

  const clearWorkload = () => {
    setJobs([]);
    showToast('WORKLOAD_CLEARED');
  };

  const handleConfigChange = (key: keyof Config, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Calculate metrics
  const totalBurst = jobs.reduce((acc, job) => acc + job.burstTime, 0);
  const avgBurst = jobs.length ? (totalBurst / jobs.length).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 md:p-8 selection:bg-[#33ff33] selection:text-black flex flex-col">
      {/* Header */}
      <header className="border-b border-[#33ff33]/30 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tighter flex items-center gap-3">
            <TerminalIcon />
            CPU_SCHED_STUDIO
          </h1>
          <p className="text-[#33ff33]/70 text-sm mt-1">
            MODULE: RANDOM_WORKLOAD_GENERATOR // v1.0.0
          </p>
        </div>
        <div className="text-xs text-[#33ff33]/50 text-right">
          <div>SYS_TIME: {systemTime || 'INITIALIZING...'}</div>
          <div>STATUS: {isGenerating ? 'PROCESSING' : 'IDLE'}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Configuration */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="border border-[#33ff33]/30 bg-[#0a0a0a] p-5 shadow-[0_0_15px_rgba(51,255,51,0.05)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#33ff33]/50 to-transparent opacity-50"></div>
            
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-[#33ff33]/20 pb-2">
              <SettingsIcon />
              PARAMETERS
            </h2>

            <div className="space-y-6">
              {/* Job Count */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label>PROCESS_COUNT</label>
                  <span className="text-[#33ff33] font-bold">[{config.jobCount}]</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="50" 
                  value={config.jobCount}
                  onChange={(e) => handleConfigChange('jobCount', parseInt(e.target.value))}
                  className="w-full accent-[#33ff33] bg-gray-800 h-1 appearance-none cursor-pointer"
                />
              </div>

              {/* Max Burst */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label>MAX_BURST_TIME</label>
                  <span className="text-[#33ff33] font-bold">[{config.maxBurst}ms]</span>
                </div>
                <input 
                  type="range" 
                  min="5" max="100" 
                  value={config.maxBurst}
                  onChange={(e) => handleConfigChange('maxBurst', parseInt(e.target.value))}
                  className="w-full accent-[#33ff33] bg-gray-800 h-1 appearance-none cursor-pointer"
                />
              </div>

              {/* Max Arrival */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label>MAX_ARRIVAL_SPREAD</label>
                  <span className="text-[#33ff33] font-bold">[{config.maxArrival}ms]</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={config.maxArrival}
                  onChange={(e) => handleConfigChange('maxArrival', parseInt(e.target.value))}
                  className="w-full accent-[#33ff33] bg-gray-800 h-1 appearance-none cursor-pointer"
                />
              </div>

              {/* Priority Toggle & Range */}
              <div className="pt-4 border-t border-[#33ff33]/20 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={config.usePriority}
                      onChange={(e) => handleConfigChange('usePriority', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 border ${config.usePriority ? 'border-[#33ff33] bg-[#33ff33]/20' : 'border-gray-600 bg-gray-800'} transition-colors duration-200 ease-in-out flex items-center px-1`}>
                      <div className={`w-3 h-3 bg-[#33ff33] transform transition-transform duration-200 ease-in-out ${config.usePriority ? 'translate-x-4' : 'translate-x-0 bg-gray-500'}`}></div>
                    </div>
                  </div>
                  <span className="text-sm group-hover:text-white transition-colors">ENABLE_PRIORITY</span>
                </label>

                {config.usePriority && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between text-sm text-[#33ff33]/70">
                      <label>PRIORITY_LEVELS</label>
                      <span>[1-{config.priorityRange}]</span>
                    </div>
                    <input 
                      type="range" 
                      min="3" max="20" 
                      value={config.priorityRange}
                      onChange={(e) => handleConfigChange('priorityRange', parseInt(e.target.value))}
                      className="w-full accent-[#33ff33] bg-gray-800 h-1 appearance-none cursor-pointer opacity-70 hover:opacity-100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button 
                onClick={generateWorkload}
                disabled={isGenerating}
                className="col-span-2 bg-[#33ff33]/10 hover:bg-[#33ff33]/20 border border-[#33ff33] text-[#33ff33] py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshIcon className={isGenerating ? "animate-spin" : ""} />
                {isGenerating ? 'GENERATING...' : 'EXECUTE_GENERATOR'}
              </button>
              
              <button 
                onClick={clearWorkload}
                className="border border-red-500/50 text-red-400 hover:bg-red-500/10 py-2 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
              >
                <TrashIcon />
                CLEAR
              </button>
              
              <button 
                onClick={copyToClipboard}
                disabled={jobs.length === 0}
                className="border border-[#33ff33]/50 text-[#33ff33] hover:bg-[#33ff33]/10 py-2 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CopyIcon />
                EXPORT
              </button>
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="border border-[#33ff33]/30 bg-[#0a0a0a] p-4 text-sm">
            <h3 className="text-[#33ff33]/50 mb-2 border-b border-[#33ff33]/20 pb-1">WORKLOAD_METRICS</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-400">TOTAL_JOBS:</div>
              <div className="text-right">{jobs.length}</div>
              <div className="text-gray-400">TOTAL_BURST:</div>
              <div className="text-right">{totalBurst}ms</div>
              <div className="text-gray-400">AVG_BURST:</div>
              <div className="text-right">{avgBurst}ms</div>
            </div>
          </div>
        </div>

        {/* Right Panel: Output Table */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="border border-[#33ff33]/30 bg-[#0a0a0a] flex-1 flex flex-col relative">
            
            {/* Table Header */}
            <div className="bg-[#33ff33]/10 border-b border-[#33ff33]/30 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DatabaseIcon />
                <span className="font-bold">GENERATED_DATASET.json</span>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-4 relative min-h-[400px]">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#33ff33]/50">
                  <div className="animate-pulse flex flex-col items-center gap-4">
                    <TerminalIcon className="w-12 h-12 opacity-50" />
                    <span>COMPILING_WORKLOAD_DATA...</span>
                    <div className="w-48 h-1 bg-gray-800 mt-2 overflow-hidden">
                      <div className="h-full bg-[#33ff33] animate-[loading_1s_ease-in-out_infinite]"></div>
                    </div>
                  </div>
                </div>
              ) : jobs.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[#33ff33]/30">
                  NO_DATA_AVAILABLE. RUN_GENERATOR.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[#33ff33]/50 border-b border-[#33ff33]/20">
                      <th className="py-2 px-4 font-normal">PID</th>
                      <th className="py-2 px-4 font-normal">ARRIVAL_TIME</th>
                      <th className="py-2 px-4 font-normal">BURST_TIME</th>
                      {config.usePriority && <th className="py-2 px-4 font-normal">PRIORITY</th>}
                      <th className="py-2 px-4 font-normal text-right">MEMORY_ADDR</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {jobs.map((job, idx) => (
                      <tr 
                        key={job.id} 
                        className="border-b border-[#33ff33]/10 hover:bg-[#33ff33]/5 transition-colors group"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <td className="py-3 px-4 font-bold text-white group-hover:text-[#33ff33] transition-colors">
                          {job.id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block w-8 text-right">{job.arrivalTime}</span> ms
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-8 text-right">{job.burstTime}</span> ms
                            {/* Visual burst indicator */}
                            <div className="h-1 bg-[#33ff33]/30 hidden sm:block" style={{ width: `${(job.burstTime / config.maxBurst) * 50}px` }}></div>
                          </div>
                        </td>
                        {config.usePriority && (
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-xs border ${
                              job.priority! <= 2 ? 'border-red-500/50 text-red-400' : 
                              job.priority! <= 5 ? 'border-yellow-500/50 text-yellow-400' : 
                              'border-blue-500/50 text-blue-400'
                            }`}>
                              LVL_{job.priority}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4 text-right text-[#33ff33]/30 font-mono text-xs">
                          0x{(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Status Bar */}
            <div className="bg-[#0a0a0a] border-t border-[#33ff33]/30 p-2 text-xs flex justify-between items-center text-[#33ff33]/60">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#33ff33] rounded-full animate-pulse"></span>
                  SYSTEM_ONLINE
                </span>
                <span>|</span>
                <span>MEM_USAGE: {(Math.random() * 10 + 15).toFixed(1)}MB</span>
              </div>
              <div>
                EOF
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 bg-[#33ff33] text-black px-4 py-2 font-bold transform transition-all duration-300 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        &gt; {toast}
      </div>

      {/* Global Styles for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}

// --- SVG Icons (Zero Dependencies) ---

function TerminalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 2v6h-6"></path>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
      <path d="M3 22v-6h6"></path>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}