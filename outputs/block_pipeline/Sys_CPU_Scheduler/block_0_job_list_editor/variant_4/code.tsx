import React, { useState, useEffect, useRef } from 'react';

// Dependencies: None beyond React and Tailwind CSS.
// (Ensure Tailwind is configured to handle the standard utility classes)

type Job = {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
};

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([
    { id: 'P1', arrival: 0, burst: 8, priority: 2 },
    { id: 'P2', arrival: 1, burst: 4, priority: 1 },
    { id: 'P3', arrival: 2, burst: 9, priority: 3 },
  ]);

  const [form, setForm] = useState({ arrival: 0, burst: 1, priority: 1 });
  const [cursorBlink, setCursorBlink] = useState(true);
  const nextIdRef = useRef(4);

  // Blinking cursor effect for terminal vibe
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.burst <= 0) return;
    
    const newJob: Job = {
      id: `P${nextIdRef.current++}`,
      arrival: form.arrival,
      burst: form.burst,
      priority: form.priority,
    };
    
    setJobs([...jobs, newJob].sort((a, b) => a.arrival - b.arrival));
    setForm({ arrival: form.arrival + 1, burst: 1, priority: 1 });
  };

  const removeJob = (id: string) => {
    setJobs(jobs.filter(job => job.id !== id));
  };

  const generateRandomWorkload = () => {
    const count = Math.floor(Math.random() * 4) + 4; // 4 to 7 jobs
    const newJobs: Job[] = [];
    let currentId = 1;
    for (let i = 0; i < count; i++) {
      newJobs.push({
        id: `P${currentId++}`,
        arrival: Math.floor(Math.random() * 10),
        burst: Math.floor(Math.random() * 15) + 1,
        priority: Math.floor(Math.random() * 5) + 1,
      });
    }
    nextIdRef.current = currentId;
    setJobs(newJobs.sort((a, b) => a.arrival - b.arrival));
  };

  const clearJobs = () => {
    setJobs([]);
    nextIdRef.current = 1;
  };

  // Stats calculations
  const totalBurst = jobs.reduce((acc, job) => acc + job.burst, 0);
  const maxArrival = jobs.length > 0 ? Math.max(...jobs.map(j => j.arrival)) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 sm:p-8 flex flex-col items-center selection:bg-green-500 selection:text-black relative overflow-hidden">
      
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />

      <div className="w-full max-w-4xl z-10 flex flex-col gap-6">
        
        {/* Header */}
        <header className="border-b-2 border-green-500/50 pb-4 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
              CPU_SCHEDULER_STUDIO
            </h1>
            <p className="text-sm text-green-600 mt-1 uppercase tracking-widest">
              Module 01: Job_List_Editor <span className="text-green-400">{cursorBlink ? '█' : ' '}</span>
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-green-700">SYS_TIME: {new Date().toLocaleTimeString()}</div>
            <div className="text-xs text-green-700">STATUS: ONLINE</div>
          </div>
        </header>

        {/* Control Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Job Form */}
          <div className="lg:col-span-1 border border-green-500/30 bg-black/40 p-5 shadow-[0_0_15px_rgba(34,197,94,0.05)] relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-b border-green-500/20 pb-2 text-green-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              INITIALIZE_PROCESS
            </h2>
            
            <form onSubmit={handleAddJob} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-green-600 uppercase">Arrival Time</label>
                <input 
                  type="number" 
                  min="0" 
                  value={form.arrival}
                  onChange={(e) => setForm({...form, arrival: parseInt(e.target.value) || 0})}
                  className="bg-transparent border border-green-500/30 focus:border-green-400 focus:bg-green-950/30 outline-none px-3 py-2 text-green-300 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-green-600 uppercase">Burst Time</label>
                <input 
                  type="number" 
                  min="1" 
                  value={form.burst}
                  onChange={(e) => setForm({...form, burst: parseInt(e.target.value) || 0})}
                  className="bg-transparent border border-green-500/30 focus:border-green-400 focus:bg-green-950/30 outline-none px-3 py-2 text-green-300 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-green-600 uppercase">Priority (1=High)</label>
                <input 
                  type="number" 
                  min="1" 
                  value={form.priority}
                  onChange={(e) => setForm({...form, priority: parseInt(e.target.value) || 0})}
                  className="bg-transparent border border-green-500/30 focus:border-green-400 focus:bg-green-950/30 outline-none px-3 py-2 text-green-300 transition-colors"
                />
              </div>
              
              <button 
                type="submit"
                className="mt-2 w-full bg-green-500/10 hover:bg-green-500 hover:text-black border border-green-500 px-4 py-2 font-bold uppercase tracking-wider transition-all duration-200 active:scale-95"
              >
                Execute Add
              </button>
            </form>
          </div>

          {/* Job Table */}
          <div className="lg:col-span-2 border border-green-500/30 bg-black/40 p-5 shadow-[0_0_15px_rgba(34,197,94,0.05)] flex flex-col">
            
            <div className="flex justify-between items-end border-b border-green-500/20 pb-2 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-green-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                PROCESS_QUEUE
              </h2>
              <div className="flex gap-2 text-xs">
                <button 
                  onClick={generateRandomWorkload}
                  className="px-2 py-1 border border-green-500/40 hover:bg-green-500/20 transition-colors text-green-400 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                  RANDOMIZE
                </button>
                <button 
                  onClick={clearJobs}
                  className="px-2 py-1 border border-red-500/40 hover:bg-red-500/20 transition-colors text-red-400 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  PURGE
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-grow">
              {jobs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-green-700/50 space-y-2 py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="15" y1="9" y2="15"/><line x1="15" x2="9" y1="9" y2="15"/></svg>
                  <span>QUEUE_EMPTY</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-green-600 border-b border-green-500/30">
                      <th className="py-2 px-3 font-normal">PID</th>
                      <th className="py-2 px-3 font-normal">ARRIVAL</th>
                      <th className="py-2 px-3 font-normal">BURST</th>
                      <th className="py-2 px-3 font-normal">PRIORITY</th>
                      <th className="py-2 px-3 font-normal text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors group">
                        <td className="py-2 px-3 text-green-300 font-bold">{job.id}</td>
                        <td className="py-2 px-3">{job.arrival}</td>
                        <td className="py-2 px-3">{job.burst}</td>
                        <td className="py-2 px-3">{job.priority}</td>
                        <td className="py-2 px-3 text-right">
                          <button 
                            onClick={() => removeJob(job.id)}
                            className="text-red-500/50 hover:text-red-400 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                            title={`Terminate ${job.id}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Micro Stats Bar */}
            <div className="mt-4 pt-3 border-t border-green-500/20 text-xs flex justify-between text-green-600">
              <span>TOTAL_PROCESSES: {jobs.length}</span>
              <span>TOTAL_BURST: {totalBurst}ms</span>
              <span className="hidden sm:inline">MAX_ARRIVAL: {maxArrival}ms</span>
            </div>

          </div>
        </div>

        {/* Status Console output simulation */}
        <div className="border border-green-500/30 bg-black/60 p-3 h-24 overflow-y-auto text-xs text-green-700 font-mono flex flex-col justify-end relative">
          <div className="opacity-70">
            <p>{`> SYSTEM_BOOT_SEQUENCE_INITIATED... OK`}</p>
            <p>{`> LOADING_MODULE_01 [JOB_LIST_EDITOR]... OK`}</p>
            <p>{`> CURRENT_QUEUE_SIZE: ${jobs.length}`}</p>
            {jobs.length > 0 && (
              <p className="text-green-500">{`> AWAITING_SCHEDULER_EXECUTION_COMMAND...`}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}