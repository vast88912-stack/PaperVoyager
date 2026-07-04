import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Plus, Trash2, Shuffle, AlertTriangle, Activity, Cpu, ShieldAlert, CheckSquare } from 'lucide-react';

// Runtime Dependencies:
// npm install lucide-react

type Job = {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
};

type LogEntry = {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'success';
};

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([
    { id: 'P1', arrival: 0, burst: 5, priority: 2 },
    { id: 'P2', arrival: 1, burst: 3, priority: 1 },
    { id: 'P3', arrival: 2, burst: 8, priority: 4 },
  ]);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const addLog = (message: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), timestamp, message, type }].slice(-10));
  };

  useEffect(() => {
    addLog('System initialized. Job Editor module loaded.', 'success');
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleGenerateWorkload = () => {
    const numJobs = Math.floor(Math.random() * 4) + 3; // 3 to 6 jobs
    const newJobs: Job[] = Array.from({ length: numJobs }).map((_, i) => ({
      id: `P${i + 1}`,
      arrival: Math.floor(Math.random() * 10),
      burst: Math.floor(Math.random() * 12) + 1, // 1 to 12
      priority: Math.floor(Math.random() * 5) + 1, // 1 to 5
    }));
    setJobs(newJobs);
    addLog(`Generated random workload with ${numJobs} processes.`, 'info');
  };

  const handleAddJob = () => {
    if (jobs.length >= 10) {
      addLog('Maximum process limit (10) reached.', 'warn');
      return;
    }
    const nextId = `P${Math.max(0, ...jobs.map(j => parseInt(j.id.replace('P', '')) || 0)) + 1}`;
    setJobs([...jobs, { id: nextId, arrival: 0, burst: 1, priority: 1 }]);
    addLog(`Process ${nextId} added to the queue.`, 'success');
  };

  const handleRemoveJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
    addLog(`Process ${id} terminated.`, 'warn');
  };

  const handleClearJobs = () => {
    setJobs([]);
    addLog('All processes cleared from memory.', 'warn');
  };

  const updateJob = (id: string, field: keyof Job, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setJobs(jobs.map(j => {
      if (j.id === id) {
        // Prevent 0 burst time
        if (field === 'burst' && numValue === 0) return { ...j, [field]: 1 };
        return { ...j, [field]: numValue };
      }
      return j;
    }));
  };

  // Helper to detect potential starvation (Low Priority + Long Burst in queue)
  // Assuming lower number = higher priority for this visual indicator
  const checkStarvationRisk = (job: Job) => {
    const hasHigherPriorityJobs = jobs.some(j => j.priority < job.priority && j.id !== job.id);
    return hasHigherPriorityJobs && job.burst > 5 && job.priority > 3;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden selection:bg-[#33ff33] selection:text-black">
      
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

      <div className="w-full max-w-5xl border border-[#33ff33]/40 bg-black shadow-[0_0_30px_rgba(51,255,51,0.05)] flex flex-col relative z-10">
        
        {/* Terminal Header */}
        <div className="bg-[#111] border-b border-[#33ff33]/40 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-[#33ff33]" />
            <span className="text-sm font-bold tracking-wider">root@scheduler-studio:~# ./edit_jobs.sh</span>
            <span className="animate-pulse">_</span>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
          </div>
        </div>

        {/* Control Panel */}
        <div className="p-4 border-b border-[#33ff33]/20 bg-[#0a0a0a] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            <button 
              onClick={handleAddJob}
              className="flex items-center gap-2 px-4 py-2 bg-[#33ff33]/10 hover:bg-[#33ff33]/20 border border-[#33ff33]/50 transition-colors text-sm uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-[#33ff33]"
            >
              <Plus size={16} /> Add Process
            </button>
            <button 
              onClick={handleGenerateWorkload}
              className="flex items-center gap-2 px-4 py-2 bg-[#33ff33]/10 hover:bg-[#33ff33]/20 border border-[#33ff33]/50 transition-colors text-sm uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-[#33ff33]"
            >
              <Shuffle size={16} /> Random Workload
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm opacity-80">
            <span className="flex items-center gap-2"><Cpu size={16}/> PID COUNT: {jobs.length}/10</span>
            <button 
              onClick={handleClearJobs}
              className="flex items-center gap-2 px-3 py-1 hover:text-red-400 hover:border-red-400 border border-transparent transition-colors focus:outline-none"
            >
              <Trash2 size={14} /> CLEAR ALL
            </button>
          </div>
        </div>

        {/* Main Job Table Area */}
        <div className="p-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#33ff33]/30 bg-[#111]">
                <th className="p-3 text-xs uppercase tracking-widest w-24">PID</th>
                <th className="p-3 text-xs uppercase tracking-widest">Arrival Time</th>
                <th className="p-3 text-xs uppercase tracking-widest">Burst Time</th>
                <th className="p-3 text-xs uppercase tracking-widest">Priority</th>
                <th className="p-3 text-xs uppercase tracking-widest text-center">Status</th>
                <th className="p-3 text-xs uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#33ff33]/50 border-b border-[#33ff33]/10">
                    <Activity className="mx-auto mb-2 opacity-50" />
                    NO PROCESSES IN READY QUEUE
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const isStarvationRisk = checkStarvationRisk(job);
                  return (
                    <tr key={job.id} className="border-b border-[#33ff33]/10 hover:bg-[#33ff33]/5 group transition-colors">
                      <td className="p-3 font-bold text-[#33ff33]">
                        {job.id}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#33ff33]/50 select-none">T=</span>
                          <input 
                            type="number" 
                            min="0"
                            value={job.arrival}
                            onChange={(e) => updateJob(job.id, 'arrival', e.target.value)}
                            className="bg-transparent border-b border-dashed border-[#33ff33]/30 focus:border-[#33ff33] focus:bg-[#33ff33]/10 outline-none w-16 p-1 text-[#33ff33] text-center"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#33ff33]/50 select-none">ms</span>
                          <input 
                            type="number" 
                            min="1"
                            value={job.burst}
                            onChange={(e) => updateJob(job.id, 'burst', e.target.value)}
                            className="bg-transparent border-b border-dashed border-[#33ff33]/30 focus:border-[#33ff33] focus:bg-[#33ff33]/10 outline-none w-16 p-1 text-[#33ff33] text-center"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#33ff33]/50 select-none">PR</span>
                          <input 
                            type="number" 
                            min="1"
                            value={job.priority}
                            onChange={(e) => updateJob(job.id, 'priority', e.target.value)}
                            className="bg-transparent border-b border-dashed border-[#33ff33]/30 focus:border-[#33ff33] focus:bg-[#33ff33]/10 outline-none w-16 p-1 text-[#33ff33] text-center"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {isStarvationRisk ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-900/40 border border-yellow-500/50 text-yellow-400 text-[10px] uppercase tracking-wider rounded-sm animate-pulse" title="High burst + low priority may cause starvation in SJF/SRTF/Priority algorithms.">
                            <ShieldAlert size={12} /> Starvation Risk
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-1 text-[#33ff33]/60 text-[10px] uppercase tracking-wider">
                            <CheckSquare size={12} /> Optimal
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleRemoveJob(job.id)}
                          className="p-2 text-[#33ff33]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-sm focus:outline-none"
                          title="Terminate Process"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Terminal Output */}
        <div className="border-t border-[#33ff33]/30 bg-[#050505] p-3">
          <div className="text-[10px] uppercase tracking-widest text-[#33ff33]/50 mb-2 flex items-center gap-2">
            <Activity size={12} /> System Log
          </div>
          <div 
            ref={logContainerRef}
            className="h-32 overflow-y-auto text-xs font-mono space-y-1 pr-2 custom-scrollbar"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#33ff33 #000' }}
          >
            {logs.map(log => (
              <div key={log.id} className="flex gap-3">
                <span className="text-[#33ff33]/40 w-24 shrink-0">[{log.timestamp}]</span>
                <span className={`
                  ${log.type === 'warn' ? 'text-yellow-400' : ''}
                  ${log.type === 'success' ? 'text-[#33ff33]' : ''}
                  ${log.type === 'info' ? 'text-blue-400' : ''}
                `}>
                  {log.type === 'warn' ? 'WARN:' : log.type === 'success' ? 'OK:' : 'SYS:'} {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Action Footer */}
        <div className="bg-[#33ff33]/10 border-t border-[#33ff33]/40 p-4 flex justify-between items-center">
          <div className="text-xs text-[#33ff33]/60">
            Total Burst Time: {jobs.reduce((acc, curr) => acc + curr.burst, 0)}ms
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-[#33ff33] text-black font-bold hover:bg-[#33ff33]/80 transition-colors uppercase text-sm focus:outline-none focus:ring-2 focus:ring-white">
            Commit Workload <Terminal size={16} />
          </button>
        </div>
        
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #33ff3340; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #33ff3380; }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}} />
    </div>
  );
}