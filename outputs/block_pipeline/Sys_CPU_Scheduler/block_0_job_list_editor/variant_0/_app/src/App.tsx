import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
type Job = {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
};

type LogMessage = {
  id: number;
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

// --- Icons (Inline SVGs for zero dependencies) ---
const TerminalIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ZapIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const PlayIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

export default function App() {
  // --- State ---
  const [jobs, setJobs] = useState<Job[]>([
    { id: 'P1', arrival: 0, burst: 5, priority: 2 },
    { id: 'P2', arrival: 1, burst: 3, priority: 1 },
    { id: 'P3', arrival: 2, burst: 8, priority: 3 },
  ]);
  
  const [newJob, setNewJob] = useState({ arrival: 0, burst: 1, priority: 1 });
  const [timeQuantum, setTimeQuantum] = useState<number>(2);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    addLog('System initialized. Ready for job input.', 'info');
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // --- Helpers ---
  const addLog = (text: string, type: LogMessage['type'] = 'info') => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [...prev, { id: Date.now(), time: timeString, text, type }]);
  };

  const generateProcessId = () => {
    const existingIds = jobs.map(j => parseInt(j.id.replace('P', ''))).filter(n => !isNaN(n));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `P${maxId + 1}`;
  };

  // --- Handlers ---
  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (newJob.burst <= 0) {
      addLog('Error: Burst time must be greater than 0.', 'error');
      return;
    }
    if (newJob.arrival < 0) {
      addLog('Error: Arrival time cannot be negative.', 'error');
      return;
    }
    
    const job: Job = {
      id: generateProcessId(),
      arrival: Number(newJob.arrival),
      burst: Number(newJob.burst),
      priority: Number(newJob.priority),
    };
    
    setJobs([...jobs, job]);
    addLog(`Job ${job.id} added (Arr: ${job.arrival}, Burst: ${job.burst}, Prio: ${job.priority}).`, 'success');
    
    // Reset form slightly but keep some values for quick entry
    setNewJob(prev => ({ ...prev, arrival: prev.arrival + 1 }));
  };

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
    addLog(`Job ${id} terminated by user.`, 'warning');
  };

  const handleClearAll = () => {
    setJobs([]);
    addLog('All jobs cleared from memory.', 'warning');
  };

  const handleGenerateRandom = () => {
    const count = Math.floor(Math.random() * 4) + 4; // 4 to 7 jobs
    const generated: Job[] = Array.from({ length: count }).map((_, i) => ({
      id: `P${i + 1}`,
      arrival: Math.floor(Math.random() * 10),
      burst: Math.floor(Math.random() * 12) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
    }));
    
    // Sort by arrival time for better UX
    generated.sort((a, b) => a.arrival - b.arrival);
    
    setJobs(generated);
    addLog(`Generated random workload of ${count} jobs.`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff00] font-mono p-4 md:p-8 selection:bg-[#33ff00] selection:text-black flex flex-col">
      
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#33ff00]/30 pb-4 mb-8">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-8 h-8 text-[#33ff00]" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase flex items-center gap-2">
              CPU Scheduler Studio
              <span className="w-3 h-5 bg-[#33ff00] animate-pulse inline-block"></span>
            </h1>
            <p className="text-xs text-[#33ff00]/60 uppercase tracking-wider mt-1">
              Module 01: Workload Configuration
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm border border-[#33ff00]/30 px-4 py-2 bg-[#33ff00]/5">
          <span className="text-[#33ff00]/60">STATUS:</span>
          <span className="text-[#33ff00] font-bold">AWAITING_EXECUTION</span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Global Settings Panel */}
          <section className="border border-[#33ff00]/30 bg-[#0a0a0a] p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#33ff00]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-[#33ff00]/20 pb-2 flex items-center gap-2">
              <ZapIcon className="w-4 h-4" /> Global Parameters
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-xs uppercase text-[#33ff00]/70 mb-2">
                  <span>Time Quantum (RR)</span>
                  <span>{timeQuantum} ms</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={timeQuantum}
                  onChange={(e) => setTimeQuantum(Number(e.target.value))}
                  className="w-full h-1 bg-[#33ff00]/20 rounded-none appearance-none cursor-pointer accent-[#33ff00]"
                />
              </div>
              
              <div className="pt-2 flex gap-2">
                <button 
                  onClick={handleGenerateRandom}
                  className="flex-1 bg-[#33ff00]/10 hover:bg-[#33ff00]/20 border border-[#33ff00]/40 text-[#33ff00] text-xs uppercase py-2 px-3 transition-all flex items-center justify-center gap-2"
                >
                  <ZapIcon className="w-3 h-3" /> Randomize
                </button>
                <button 
                  onClick={handleClearAll}
                  className="flex-1 bg-red-900/20 hover:bg-red-900/40 border border-red-500/40 text-red-400 text-xs uppercase py-2 px-3 transition-all flex items-center justify-center gap-2"
                >
                  <TrashIcon className="w-3 h-3" /> Clear All
                </button>
              </div>
            </div>
          </section>

          {/* Add Job Form */}
          <section className="border border-[#33ff00]/30 bg-[#0a0a0a] p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-[#33ff00]/20 pb-2 flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Define Process
            </h2>
            
            <form onSubmit={handleAddJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase text-[#33ff00]/70">Arrival Time</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#33ff00]/50">{'>'}</span>
                    <input 
                      type="number" 
                      min="0"
                      value={newJob.arrival}
                      onChange={(e) => setNewJob({...newJob, arrival: Number(e.target.value)})}
                      className="w-full bg-black border border-[#33ff00]/30 text-[#33ff00] p-2 pl-6 focus:outline-none focus:border-[#33ff00] transition-colors font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-[#33ff00]/70">Burst Time</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#33ff00]/50">{'>'}</span>
                    <input 
                      type="number" 
                      min="1"
                      value={newJob.burst}
                      onChange={(e) => setNewJob({...newJob, burst: Number(e.target.value)})}
                      className="w-full bg-black border border-[#33ff00]/30 text-[#33ff00] p-2 pl-6 focus:outline-none focus:border-[#33ff00] transition-colors font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs uppercase text-[#33ff00]/70">Priority (Lower = Higher Prio)</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#33ff00]/50">{'>'}</span>
                  <input 
                    type="number" 
                    min="1"
                    value={newJob.priority}
                    onChange={(e) => setNewJob({...newJob, priority: Number(e.target.value)})}
                    className="w-full bg-black border border-[#33ff00]/30 text-[#33ff00] p-2 pl-6 focus:outline-none focus:border-[#33ff00] transition-colors font-mono text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#33ff00] text-black font-bold uppercase text-sm py-3 mt-2 hover:bg-[#33ff00]/80 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" /> Inject Process
              </button>
            </form>
          </section>

        </div>

        {/* Right Column: Job List & Terminal Output */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Job Table */}
          <section className="border border-[#33ff00]/30 bg-[#0a0a0a] flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#33ff00]/30 bg-[#33ff00]/5 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                Process Queue <span className="text-xs bg-[#33ff00]/20 px-2 py-0.5 rounded-full">{jobs.length}</span>
              </h2>
              <button className="text-xs bg-[#33ff00] text-black px-4 py-1.5 font-bold uppercase flex items-center gap-2 hover:bg-[#33ff00]/80 transition-colors">
                <PlayIcon className="w-3 h-3" /> Run Simulation
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {jobs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#33ff00]/40 border-2 border-dashed border-[#33ff00]/20 p-8">
                  <TerminalIcon className="w-12 h-12 mb-4 opacity-50" />
                  <p className="uppercase tracking-widest text-sm">Queue is empty</p>
                  <p className="text-xs mt-2">Awaiting process injection...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs uppercase text-[#33ff00]/60 border-b border-[#33ff00]/30">
                      <th className="pb-3 pl-2 font-normal">PID</th>
                      <th className="pb-3 font-normal">Arrival</th>
                      <th className="pb-3 font-normal">Burst</th>
                      <th className="pb-3 font-normal">Priority</th>
                      <th className="pb-3 text-right pr-2 font-normal">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, idx) => (
                      <tr 
                        key={job.id} 
                        className="border-b border-[#33ff00]/10 hover:bg-[#33ff00]/5 transition-colors group"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <td className="py-3 pl-2 font-bold text-white">{job.id}</td>
                        <td className="py-3">{job.arrival} <span className="text-[#33ff00]/40 text-xs">ms</span></td>
                        <td className="py-3">{job.burst} <span className="text-[#33ff00]/40 text-xs">ms</span></td>
                        <td className="py-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-[#33ff00]/30 text-xs">
                            {job.priority}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button 
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-500/50 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                            title="Kill Process"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Terminal Log */}
          <section className="h-48 border border-[#33ff00]/30 bg-black flex flex-col">
            <div className="bg-[#33ff00]/10 border-b border-[#33ff00]/30 px-4 py-1 text-xs uppercase text-[#33ff00]/70 flex justify-between">
              <span>System.out</span>
              <span>tty1</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-[#33ff00]/40 shrink-0">[{log.time}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'warning' ? 'text-yellow-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-300' : ''}
                    ${log.type === 'info' ? 'text-[#33ff00]/80' : ''}
                  `}>
                    {log.type === 'error' ? 'ERR ' : log.type === 'warning' ? 'WRN ' : log.type === 'success' ? 'OK  ' : 'INF '}
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}