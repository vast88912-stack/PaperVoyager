import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Dices, Terminal, AlertTriangle, Play, XSquare } from 'lucide-react';

interface Job {
  id: string;
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
  ]);

  const [systemTime, setSystemTime] = useState<string>(new Date().toLocaleTimeString());

  // Blinking cursor effect for terminal feel
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const generateRandomWorkload = useCallback(() => {
    const count = Math.floor(Math.random() * 5) + 3; // 3 to 7 jobs
    const newJobs: Job[] = Array.from({ length: count }).map((_, i) => ({
      id: crypto.randomUUID(),
      pid: `P${i + 1}`,
      arrivalTime: Math.floor(Math.random() * 10),
      burstTime: Math.floor(Math.random() * 12) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
    }));
    // Sort by arrival time to make it logical
    newJobs.sort((a, b) => a.arrivalTime - b.arrivalTime);
    setJobs(newJobs);
  }, []);

  const addJob = () => {
    const newPid = `P${jobs.length > 0 ? Math.max(...jobs.map(j => parseInt(j.pid.replace('P', '')) || 0)) + 1 : 1}`;
    const lastArrival = jobs.length > 0 ? Math.max(...jobs.map(j => j.arrivalTime)) : 0;
    setJobs([
      ...jobs,
      {
        id: crypto.randomUUID(),
        pid: newPid,
        arrivalTime: lastArrival + Math.floor(Math.random() * 3),
        burstTime: 5,
        priority: 2,
      }
    ]);
  };

  const removeJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const clearJobs = () => {
    setJobs([]);
  };

  const updateJob = (id: string, field: keyof Job, value: string | number) => {
    setJobs(jobs.map(job => {
      if (job.id === id) {
        let parsedValue = value;
        if (field !== 'pid') {
          parsedValue = parseInt(value as string, 10);
          if (isNaN(parsedValue)) parsedValue = 0;
          if (field === 'burstTime' && parsedValue < 1) parsedValue = 1;
          if (field === 'arrivalTime' && parsedValue < 0) parsedValue = 0;
          if (field === 'priority' && parsedValue < 1) parsedValue = 1;
        }
        return { ...job, [field]: parsedValue };
      }
      return job;
    }));
  };

  const totalBurst = jobs.reduce((acc, job) => acc + job.burstTime, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-amber-500 font-mono p-4 md:p-8 selection:bg-amber-500 selection:text-gray-950">
      <div className="max-w-5xl mx-auto">
        
        {/* Terminal Header */}
        <header className="mb-8 border-b-2 border-amber-500/30 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-3 tracking-tighter shadow-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
              <Terminal className="w-8 h-8 md:w-10 md:h-10" />
              CPU_SCHEDULER_STUDIO
            </h1>
            <p className="text-amber-600 mt-2 text-sm">
              <span className="text-amber-400">root@sys:</span>~/workloads/editor# <span className="animate-pulse">_</span>
            </p>
          </div>
          <div className="text-right text-xs text-amber-600/80 uppercase">
            <div>System Time: {systemTime}</div>
            <div>Total Jobs: {jobs.length}</div>
            <div>Est. Total Burst: {totalBurst}ms</div>
          </div>
        </header>

        {/* Main Editor Section */}
        <main className="bg-gray-900/50 border border-amber-500/20 rounded-sm shadow-2xl shadow-amber-900/10 overflow-hidden backdrop-blur-sm">
          
          {/* Toolbar */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <button 
                onClick={addJob}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-950 border border-amber-500/40 hover:bg-amber-500 hover:text-gray-950 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <Plus className="w-4 h-4" />
                [ADD_JOB]
              </button>
              <button 
                onClick={generateRandomWorkload}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-950 border border-amber-500/40 hover:bg-amber-500 hover:text-gray-950 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <Dices className="w-4 h-4" />
                [RND_WORKLOAD]
              </button>
              <button 
                onClick={clearJobs}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-950 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-gray-950 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <XSquare className="w-4 h-4" />
                [CLEAR]
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {jobs.length === 0 && (
                <span className="text-red-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> NO_JOBS_LOADED
                </span>
              )}
              <button 
                disabled={jobs.length === 0}
                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-amber-500 text-gray-950 font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <Play className="w-4 h-4 fill-current" />
                EXECUTE_SIMULATION
              </button>
            </div>
          </div>

          {/* Job Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-500/20 text-amber-600 text-sm">
                  <th className="p-3 font-normal w-16 text-center">#</th>
                  <th className="p-3 font-normal">PROCESS_ID</th>
                  <th className="p-3 font-normal">ARRIVAL_TIME</th>
                  <th className="p-3 font-normal">BURST_TIME</th>
                  <th className="p-3 font-normal">PRIORITY</th>
                  <th className="p-3 font-normal w-24 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-amber-700/50 border-b border-amber-500/10">
                      ~ empty workload ~
                    </td>
                  </tr>
                ) : (
                  jobs.map((job, index) => (
                    <tr 
                      key={job.id} 
                      className="border-b border-amber-500/10 hover:bg-amber-500/5 transition-colors group"
                    >
                      <td className="p-3 text-center text-amber-700">
                        {index.toString().padStart(2, '0')}
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={job.pid}
                          onChange={(e) => updateJob(job.id, 'pid', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-500 outline-none w-full max-w-[120px] text-amber-300 transition-colors py-1"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={job.arrivalTime}
                          onChange={(e) => updateJob(job.id, 'arrivalTime', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-500 outline-none w-full max-w-[120px] text-amber-300 transition-colors py-1"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={job.burstTime}
                          onChange={(e) => updateJob(job.id, 'burstTime', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-500 outline-none w-full max-w-[120px] text-amber-300 transition-colors py-1"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={job.priority}
                          onChange={(e) => updateJob(job.id, 'priority', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-500 outline-none w-full max-w-[120px] text-amber-300 transition-colors py-1"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => removeJob(job.id)}
                          className="text-amber-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 focus:outline-none"
                          title="Kill Process"
                        >
                          <Trash2 className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Status Bar */}
          <div className="bg-gray-950 p-2 text-xs text-amber-700 border-t border-amber-500/20 flex justify-between">
            <span>STATUS: {jobs.length > 0 ? 'READY' : 'IDLE'}</span>
            <span>MEM: {Math.floor(Math.random() * 20 + 40)}% | CPU: {Math.floor(Math.random() * 10)}%</span>
          </div>
        </main>

        <div className="mt-8 text-center text-amber-800 text-xs">
          <p>CPU Scheduler Studio v2.0.1 - Hack/Terminal Edition</p>
          <p>Use [ADD_JOB] or [RND_WORKLOAD] to populate the queue.</p>
        </div>
      </div>
    </div>
  );
}