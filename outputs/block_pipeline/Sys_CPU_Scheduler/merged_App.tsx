import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Terminal, Plus, Trash2, Zap, Play, Pause, RotateCcw, 
  Shuffle, AlertTriangle, Cpu, Settings, RefreshCw, Copy, Database,
  CheckCircle, AlertCircle, Info, ChevronRight, Activity
} from 'lucide-react';

// Runtime dependencies: react, lucide-react, tailwindcss

// --- Shared Types ---
type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'MLFQ';

interface Job {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
  color: string;
}

interface ScheduleBlock {
  jobId: string;
  start: number;
  end: number;
  color: string;
}

interface JobMetrics {
  id: string;
  arrivalTime: number;
  burstTime: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
  starved: boolean;
}

interface SimulationResult {
  schedule: ScheduleBlock[];
  metrics: JobMetrics[];
  totalTime: number;
}

// --- Shared Constants & Helpers ---
const COLORS = [
  'bg-cyan-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 
  'bg-blue-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500'
];

const getRandomColor = (index: number) => COLORS[index % COLORS.length];

const generateProcessId = (existingJobs: Job[]) => {
  const existingIds = existingJobs.map(j => parseInt(j.id.replace(/\D/g, ''))).filter(n => !isNaN(n));
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return `P${maxId + 1}`;
};

// --- Core Simulation Engine ---
const simulateScheduling = (jobs: Job[], algo: Algorithm, quantum: number): SimulationResult => {
  if (jobs.length === 0) return { schedule: [], metrics: [], totalTime: 0 };

  const schedule: ScheduleBlock[] = [];
  const metricsMap: Record<string, { wait: number, turnaround: number, response: number, finish: number, remaining: number, arrival: number }> = {};
  
  jobs.forEach(j => {
    metricsMap[j.id] = { wait: 0, turnaround: 0, response: -1, finish: -1, remaining: j.burst, arrival: j.arrival };
  });

  let time = 0;
  let completed = 0;
  let currentJobId: string | null = null;
  let blockStart = 0;
  
  let readyQueue: string[] = [];
  let currentQuantumUsed = 0;
  
  let queue0: string[] = [];
  let queue1: string[] = [];

  const addBlock = (id: string, start: number, end: number) => {
    if (start === end) return;
    const color = jobs.find(j => j.id === id)?.color || 'bg-slate-500';
    if (schedule.length > 0 && schedule[schedule.length - 1].jobId === id && schedule[schedule.length - 1].end === start) {
      schedule[schedule.length - 1].end = end;
    } else {
      schedule.push({ jobId: id, start, end, color });
    }
  };

  const MAX_TICKS = 2000;

  while (completed < jobs.length && time < MAX_TICKS) {
    const arrivedNow = jobs.filter(j => j.arrival === time).map(j => j.id);
    if (algo === 'RR') {
      readyQueue.push(...arrivedNow);
    } else if (algo === 'MLFQ') {
      queue0.push(...arrivedNow);
    }

    let nextJobId: string | null = null;
    const availableJobs = jobs.filter(j => j.arrival <= time && metricsMap[j.id].remaining > 0);

    if (availableJobs.length > 0) {
      switch (algo) {
        case 'FCFS':
          nextJobId = currentJobId && metricsMap[currentJobId].remaining > 0 
            ? currentJobId 
            : availableJobs.sort((a, b) => a.arrival - b.arrival)[0].id;
          break;
        case 'SJF':
          nextJobId = currentJobId && metricsMap[currentJobId].remaining > 0 
            ? currentJobId 
            : availableJobs.sort((a, b) => {
                if (a.burst === b.burst) return a.arrival - b.arrival;
                return a.burst - b.burst;
              })[0].id;
          break;
        case 'SRTF':
          nextJobId = availableJobs.sort((a, b) => {
            const remA = metricsMap[a.id].remaining;
            const remB = metricsMap[b.id].remaining;
            if (remA === remB) return a.arrival - b.arrival;
            return remA - remB;
          })[0].id;
          break;
        case 'RR':
          if (currentJobId && metricsMap[currentJobId].remaining > 0) {
            if (currentQuantumUsed >= quantum) {
              readyQueue.push(currentJobId);
              currentJobId = null;
              currentQuantumUsed = 0;
            }
          } else {
            currentQuantumUsed = 0;
          }
          if (!currentJobId && readyQueue.length > 0) {
            currentJobId = readyQueue.shift() || null;
          }
          nextJobId = currentJobId;
          break;
        case 'MLFQ':
          if (currentJobId && metricsMap[currentJobId].remaining > 0) {
            if (currentQuantumUsed >= quantum && queue0.includes(currentJobId)) {
              queue0 = queue0.filter(id => id !== currentJobId);
              queue1.push(currentJobId);
              currentJobId = null;
              currentQuantumUsed = 0;
            }
          } else {
            currentQuantumUsed = 0;
          }
          
          if (currentJobId && queue1.includes(currentJobId) && queue0.length > 0) {
            queue1.push(currentJobId);
            currentJobId = null;
          }

          if (!currentJobId) {
            if (queue0.length > 0) {
              currentJobId = queue0.shift() || null;
            } else if (queue1.length > 0) {
              currentJobId = queue1.sort((a, b) => metricsMap[a].arrival - metricsMap[b].arrival)[0];
              queue1 = queue1.filter(id => id !== currentJobId);
            }
          }
          nextJobId = currentJobId;
          break;
      }
    }

    if (nextJobId !== currentJobId) {
      if (currentJobId) addBlock(currentJobId, blockStart, time);
      currentJobId = nextJobId;
      blockStart = time;
      currentQuantumUsed = 0;
    }

    if (currentJobId) {
      const m = metricsMap[currentJobId];
      if (m.response === -1) m.response = time - m.arrival;
      m.remaining -= 1;
      currentQuantumUsed += 1;

      if (m.remaining === 0) {
        addBlock(currentJobId, blockStart, time + 1);
        m.finish = time + 1;
        m.turnaround = m.finish - m.arrival;
        m.wait = m.turnaround - jobs.find(j => j.id === currentJobId)!.burst;
        completed += 1;
        currentJobId = null;
        currentQuantumUsed = 0;
      }
    }

    time += 1;
  }

  const metrics: JobMetrics[] = jobs.map(j => {
    const m = metricsMap[j.id];
    return {
      id: j.id,
      arrivalTime: j.arrival,
      burstTime: j.burst,
      completionTime: m.finish,
      turnaroundTime: m.turnaround,
      waitingTime: m.wait,
      responseTime: m.response,
      starved: m.wait > 15
    };
  });

  return { schedule, metrics, totalTime: time };
};

// --- Tab Components ---

function TabJobEditor({ jobs, setJobs, timeQuantum, setTimeQuantum }: any) {
  const [newJob, setNewJob] = useState({ arrival: 0, burst: 1, priority: 1 });
  const [logs, setLogs] = useState<{id: number, time: string, text: string, type: string}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    addLog('System initialized. Ready for job input.', 'info');
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (text: string, type: string = 'info') => {
    const now = new Date();
    const timeString = now.toISOString().split('T')[1].slice(0, 12);
    setLogs(prev => [...prev, { id: Date.now(), time: timeString, text, type }]);
  };

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (newJob.burst <= 0) return addLog('Error: Burst time must be > 0.', 'error');
    if (newJob.arrival < 0) return addLog('Error: Arrival time cannot be negative.', 'error');
    
    const job: Job = {
      id: generateProcessId(jobs),
      arrival: Number(newJob.arrival),
      burst: Number(newJob.burst),
      priority: Number(newJob.priority),
      color: getRandomColor(jobs.length)
    };
    
    setJobs([...jobs, job]);
    addLog(`Job ${job.id} added (Arr: ${job.arrival}, Burst: ${job.burst}, Prio: ${job.priority}).`, 'success');
    setNewJob(prev => ({ ...prev, arrival: prev.arrival + 1 }));
  };

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter((j: Job) => j.id !== id));
    addLog(`Job ${id} terminated by user.`, 'warning');
  };

  const handleClearAll = () => {
    setJobs([]);
    addLog('All jobs cleared from memory.', 'warning');
  };

  const handleGenerateRandom = () => {
    const count = Math.floor(Math.random() * 4) + 4;
    const generated: Job[] = Array.from({ length: count }).map((_, i) => ({
      id: `P${i + 1}`,
      arrival: Math.floor(Math.random() * 10),
      burst: Math.floor(Math.random() * 12) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
      color: getRandomColor(i)
    })).sort((a, b) => a.arrival - b.arrival);
    
    setJobs(generated);
    addLog(`Generated random workload of ${count} jobs.`, 'info');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <section className="border border-emerald-500/30 bg-slate-900 p-5 relative overflow-hidden group rounded-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-emerald-500/20 pb-2 flex items-center gap-2 text-emerald-400">
            <Zap className="w-4 h-4" /> Global Parameters
          </h2>
          <div className="space-y-4">
            <div>
              <label className="flex justify-between text-xs uppercase text-emerald-400/70 mb-2">
                <span>Time Quantum (RR)</span>
                <span>{timeQuantum} ms</span>
              </label>
              <input 
                type="range" min="1" max="10" value={timeQuantum}
                onChange={(e) => setTimeQuantum(Number(e.target.value))}
                className="w-full h-1 bg-emerald-500/20 rounded-none appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div className="pt-2 flex gap-2">
              <button onClick={handleGenerateRandom} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs uppercase py-2 px-3 transition-all flex items-center justify-center gap-2 rounded-sm">
                <Shuffle className="w-3 h-3" /> Randomize
              </button>
              <button onClick={handleClearAll} className="flex-1 bg-red-900/20 hover:bg-red-900/40 border border-red-500/40 text-red-400 text-xs uppercase py-2 px-3 transition-all flex items-center justify-center gap-2 rounded-sm">
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>
          </div>
        </section>

        <section className="border border-emerald-500/30 bg-slate-900 p-5 rounded-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-emerald-500/20 pb-2 flex items-center gap-2 text-emerald-400">
            <Plus className="w-4 h-4" /> Define Process
          </h2>
          <form onSubmit={handleAddJob} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs uppercase text-emerald-400/70">Arrival Time</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500/50"><ChevronRight className="w-4 h-4"/></span>
                  <input type="number" min="0" value={newJob.arrival} onChange={(e) => setNewJob({...newJob, arrival: Number(e.target.value)})} className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-400 p-2 pl-8 focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm rounded-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-emerald-400/70">Burst Time</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500/50"><ChevronRight className="w-4 h-4"/></span>
                  <input type="number" min="1" value={newJob.burst} onChange={(e) => setNewJob({...newJob, burst: Number(e.target.value)})} className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-400 p-2 pl-8 focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm rounded-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase text-emerald-400/70">Priority (Lower = Higher Prio)</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500/50"><ChevronRight className="w-4 h-4"/></span>
                <input type="number" min="1" value={newJob.priority} onChange={(e) => setNewJob({...newJob, priority: Number(e.target.value)})} className="w-full bg-slate-950 border border-emerald-500/30 text-emerald-400 p-2 pl-8 focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm rounded-sm" />
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold uppercase text-sm py-3 mt-2 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 rounded-sm">
              <Plus className="w-4 h-4" /> Inject Process
            </button>
          </form>
        </section>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6">
        <section className="border border-emerald-500/30 bg-slate-900 flex-1 flex flex-col overflow-hidden rounded-sm">
          <div className="p-4 border-b border-emerald-500/30 bg-emerald-500/5 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400">
              Process Queue <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{jobs.length}</span>
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {jobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-emerald-500/40 border-2 border-dashed border-emerald-500/20 p-8 rounded-sm">
                <Terminal className="w-12 h-12 mb-4 opacity-50" />
                <p className="uppercase tracking-widest text-sm">Queue is empty</p>
                <p className="text-xs mt-2">Awaiting process injection...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase text-emerald-500/60 border-b border-emerald-500/30">
                    <th className="pb-3 pl-2 font-normal">PID</th>
                    <th className="pb-3 font-normal">Arrival</th>
                    <th className="pb-3 font-normal">Burst</th>
                    <th className="pb-3 font-normal">Priority</th>
                    <th className="pb-3 text-right pr-2 font-normal">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: Job, idx: number) => (
                    <tr key={job.id} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors group">
                      <td className="py-3 pl-2 font-bold text-slate-100 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${job.color}`}></div>
                        {job.id}
                      </td>
                      <td className="py-3">{job.arrival} <span className="text-emerald-500/40 text-xs">ms</span></td>
                      <td className="py-3">{job.burst} <span className="text-emerald-500/40 text-xs">ms</span></td>
                      <td className="py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-emerald-500/30 text-xs text-emerald-400">
                          {job.priority}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button onClick={() => handleDeleteJob(job.id)} className="text-red-500/50 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all" title="Kill Process">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="h-48 border border-emerald-500/30 bg-slate-950 flex flex-col rounded-sm">
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-1 text-xs uppercase text-emerald-500/70 flex justify-between">
            <span>System.out</span>
            <span>tty1</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <span className="text-emerald-500/40 shrink-0">[{log.time}]</span>
                <span className={`
                  ${log.type === 'error' ? 'text-red-400' : ''}
                  ${log.type === 'warning' ? 'text-yellow-400' : ''}
                  ${log.type === 'success' ? 'text-emerald-300' : ''}
                  ${log.type === 'info' ? 'text-emerald-500/80' : ''}
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
    </div>
  );
}

function TabQuantum({ timeQuantum, setTimeQuantum }: any) {
  const [logs, setLogs] = useState<string[]>([
    'INIT: CPU Scheduler Studio v1.0',
    'MODULE: Time Quantum Controller loaded.',
    'Awaiting configuration...',
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleQuantumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setTimeQuantum(val);
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    let newLogs = [`[${timestamp}] > SET_QUANTUM --val=${val}ms`];
    if (val <= 2) newLogs.push(`[${timestamp}]   [WARN] High context switch overhead.`);
    else if (val >= 8) newLogs.push(`[${timestamp}]   [WARN] RR behavior degrading to FCFS.`);
    else newLogs.push(`[${timestamp}]   [OK] Optimal balance configured.`);
    setLogs(prev => [...prev, ...newLogs].slice(-15));
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const maxQuantum = 10;
  const blocks = Array.from({ length: maxQuantum }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-2xl border border-emerald-500/30 bg-slate-900/40 rounded-sm shadow-[0_0_30px_rgba(16,185,129,0.05)] overflow-hidden flex flex-col">
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-xs tracking-widest text-emerald-400/70 uppercase">root@scheduler-studio:~</span>
        </div>
        <div className="p-6 md:p-8 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-emerald-500/20 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-emerald-400">TIME_QUANTUM_CTRL</h1>
              <p className="text-sm text-emerald-600 mt-1">Target: Round Robin (RR) / MLFQ</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 border border-emerald-500/30 rounded-sm">
              <span className="text-xs text-emerald-600 uppercase">Current Slice</span>
              <span className="text-3xl font-bold text-emerald-300">{timeQuantum}<span className="text-lg text-emerald-600">ms</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex gap-1 h-8 w-full">
              {blocks.map((block) => (
                <div key={block} className={`flex-1 border transition-all duration-200 ${block <= timeQuantum ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-950 border-slate-800'}`} />
              ))}
            </div>
            <div className="relative w-full flex items-center group">
              <input type="range" min="1" max={maxQuantum} step="1" value={timeQuantum} onChange={handleQuantumChange} className="w-full h-2 bg-slate-800 rounded-none appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" style={{ background: `linear-gradient(to right, rgba(16, 185, 129, 0.5) ${(timeQuantum - 1) / (maxQuantum - 1) * 100}%, rgba(30, 41, 59, 1) ${(timeQuantum - 1) / (maxQuantum - 1) * 100}%)` }} />
            </div>
            <div className="flex justify-between text-xs text-emerald-700">
              <span>1ms (High Overhead)</span>
              <span>5ms</span>
              <span>10ms (FCFS-like)</span>
            </div>
          </div>
          <div className="mt-4 border border-emerald-500/20 bg-slate-950 p-4 h-40 overflow-y-auto rounded-sm font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className={`${log.includes('[WARN]') ? 'text-yellow-400' : log.includes('[OK]') ? 'text-emerald-300' : 'text-emerald-600'} mb-1`}>{log}</div>
            ))}
            <div ref={logEndRef} className="flex items-center text-emerald-500">
              <span>&gt;</span>
              <span className="w-2 h-4 bg-emerald-500 ml-2 animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabGantt({ jobs, setJobs, algorithm, setAlgorithm, timeQuantum, setTimeQuantum }: any) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const { schedule, metrics, totalTime } = useMemo(() => simulateScheduling(jobs, algorithm, timeQuantum), [jobs, algorithm, timeQuantum]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const delta = timestamp - lastUpdateRef.current;
      if (delta > 100) {
        setCurrentTime(prev => {
          if (prev >= totalTime) {
            setIsPlaying(false);
            return totalTime;
          }
          return prev + 0.2;
        });
        lastUpdateRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, totalTime]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [jobs, algorithm, timeQuantum]);

  const updateJob = (id: string, field: keyof Job, value: number) => {
    setJobs(jobs.map((j: Job) => j.id === id ? { ...j, [field]: Math.max(0, value) } : j));
  };

  const starvedJobs = metrics.filter(m => m.starved).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-slate-900 border border-emerald-800/50 rounded-sm p-4 shadow-lg shadow-black/50">
          <h2 className="text-sm font-bold uppercase mb-4 text-emerald-400 border-b border-emerald-900/50 pb-2">&gt; Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-emerald-600 mb-1">ALGORITHM</label>
              <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as Algorithm)} className="w-full bg-slate-950 border border-emerald-800 text-emerald-400 p-2 rounded-sm focus:outline-none focus:border-emerald-500 transition-colors">
                <option value="FCFS">First Come First Serve (FCFS)</option>
                <option value="SJF">Shortest Job First (SJF)</option>
                <option value="SRTF">Shortest Remaining Time (SRTF)</option>
                <option value="RR">Round Robin (RR)</option>
                <option value="MLFQ">Multi-Level Feedback Queue (MLFQ)</option>
              </select>
            </div>
            {(algorithm === 'RR' || algorithm === 'MLFQ') && (
              <div>
                <label className="flex justify-between text-xs text-emerald-600 mb-1">
                  <span>TIME QUANTUM</span>
                  <span className="text-emerald-400">{timeQuantum} ticks</span>
                </label>
                <input type="range" min="1" max="10" value={timeQuantum} onChange={(e) => setTimeQuantum(Number(e.target.value))} className="w-full accent-emerald-500" />
              </div>
            )}
          </div>
        </section>

        <section className="bg-slate-900 border border-emerald-800/50 rounded-sm p-4 shadow-lg shadow-black/50">
          <div className="flex items-center justify-between mb-4 border-b border-emerald-900/50 pb-2">
            <h2 className="text-sm font-bold uppercase text-emerald-400">&gt; Process_Table</h2>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {jobs.map((job: Job) => (
              <div key={job.id} className="flex items-center gap-3 bg-slate-950 p-2 rounded-sm border border-slate-800 hover:border-emerald-800/50 transition-colors group">
                <div className={`w-3 h-3 rounded-full ${job.color} shadow-[0_0_8px_currentColor] opacity-80`} />
                <span className="font-bold w-6 text-slate-100">{job.id}</span>
                <div className="flex-1 flex gap-2">
                  <div className="flex flex-col w-1/2">
                    <span className="text-[10px] text-emerald-700">ARR</span>
                    <input type="number" min="0" value={job.arrival} onChange={(e) => updateJob(job.id, 'arrival', parseInt(e.target.value) || 0)} className="bg-transparent border-b border-slate-800 focus:border-emerald-500 outline-none text-sm w-full text-emerald-400" />
                  </div>
                  <div className="flex flex-col w-1/2">
                    <span className="text-[10px] text-emerald-700">BURST</span>
                    <input type="number" min="1" value={job.burst} onChange={(e) => updateJob(job.id, 'burst', parseInt(e.target.value) || 1)} className="bg-transparent border-b border-slate-800 focus:border-emerald-500 outline-none text-sm w-full text-emerald-400" />
                  </div>
                </div>
                <button onClick={() => setJobs(jobs.filter((j: Job) => j.id !== job.id))} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {jobs.length === 0 && <div className="text-center text-sm text-emerald-800 py-4">No processes in queue.</div>}
          </div>
        </section>
      </div>

      <div className="lg:col-span-8 space-y-6 flex flex-col">
        <section className="bg-slate-900 border border-emerald-800/50 rounded-sm p-4 shadow-lg shadow-black/50 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-emerald-900/50 pb-2">
            <h2 className="text-sm font-bold uppercase text-emerald-400">&gt; Execution_Timeline</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-600 mr-2">TICK: {Math.floor(currentTime)} / {totalTime}</span>
              <button onClick={() => { if (currentTime >= totalTime) setCurrentTime(0); setIsPlaying(!isPlaying); }} className="flex items-center gap-1 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 px-3 py-1 rounded-sm border border-emerald-700/50 transition-colors text-sm">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'PAUSE' : currentTime >= totalTime ? 'REPLAY' : 'START'}
              </button>
              <button onClick={() => { setIsPlaying(false); setCurrentTime(0); }} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-sm border border-slate-700 transition-colors" title="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative w-full h-32 bg-slate-950 border border-emerald-900/50 rounded-sm overflow-hidden mt-4">
            {Array.from({ length: Math.max(1, totalTime) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-l border-emerald-900/30" style={{ left: `${(i / Math.max(1, totalTime)) * 100}%` }}>
                <span className="absolute -bottom-4 -left-1 text-[8px] text-emerald-800">{i}</span>
              </div>
            ))}
            {schedule.filter(s => s.start <= currentTime).map((block, i) => {
              const startPercent = (block.start / Math.max(1, totalTime)) * 100;
              const end = Math.min(block.end, currentTime);
              const widthPercent = ((end - block.start) / Math.max(1, totalTime)) * 100;
              return (
                <div key={i} className={`absolute top-4 bottom-6 ${block.color} opacity-80 rounded-sm border border-slate-950 flex items-center justify-center overflow-hidden shadow-md`} style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}>
                  {widthPercent > 2 && <span className="text-[10px] text-slate-950 font-bold px-1">{block.jobId}</span>}
                </div>
              );
            })}
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_5px_red]" style={{ left: `${(currentTime / Math.max(1, totalTime)) * 100}%` }} />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-emerald-900/30 p-3 rounded-sm">
              <div className="text-xs text-emerald-700 mb-1">AVG WAIT</div>
              <div className="text-xl font-bold text-emerald-400">{metrics.length ? (metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length).toFixed(2) : '0.00'}ms</div>
            </div>
            <div className="bg-slate-950 border border-emerald-900/30 p-3 rounded-sm">
              <div className="text-xs text-emerald-700 mb-1">AVG TURNAROUND</div>
              <div className="text-xl font-bold text-emerald-400">{metrics.length ? (metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length).toFixed(2) : '0.00'}ms</div>
            </div>
            <div className="bg-slate-950 border border-emerald-900/30 p-3 rounded-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700 mb-1">STARVATION</div>
                <div className={`text-xl font-bold ${starvedJobs > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>{starvedJobs}</div>
              </div>
              {starvedJobs > 0 && <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TabMetrics({ jobs, algorithm, setAlgorithm, timeQuantum }: any) {
  const [sortConfig, setSortConfig] = useState<{key: keyof JobMetrics, direction: 'asc'|'desc'} | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { metrics } = useMemo(() => simulateScheduling(jobs, algorithm, timeQuantum), [jobs, algorithm, timeQuantum]);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, [algorithm, jobs]);

  const handleSort = (key: keyof JobMetrics) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableData = [...metrics];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? 0;
        const bVal = b[sortConfig.key] ?? 0;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [metrics, sortConfig]);

  const averages = useMemo(() => {
    if (metrics.length === 0) return { wt: '0.00', tat: '0.00', rt: '0.00' };
    const sum = metrics.reduce((acc, curr) => ({ wt: acc.wt + curr.waitingTime, tat: acc.tat + curr.turnaroundTime, rt: acc.rt + curr.responseTime }), { wt: 0, tat: 0, rt: 0 });
    return { wt: (sum.wt / metrics.length).toFixed(2), tat: (sum.tat / metrics.length).toFixed(2), rt: (sum.rt / metrics.length).toFixed(2) };
  }, [metrics]);

  return (
    <div className="max-w-6xl mx-auto relative z-10 h-full flex flex-col">
      <header className="mb-8 border-b border-emerald-500/30 pb-4 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter flex items-center gap-3 text-emerald-400">
            <Activity className="w-6 h-6" /> METRICS_ANALYSIS
          </h1>
        </div>
        <div className="flex gap-2 bg-slate-900 p-1 border border-emerald-500/20 rounded-sm">
          {(['FCFS', 'SJF', 'SRTF', 'RR', 'MLFQ'] as Algorithm[]).map((algo) => (
            <button key={algo} onClick={() => setAlgorithm(algo)} className={`px-4 py-1 text-sm transition-all duration-200 rounded-sm ${algorithm === algo ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-emerald-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
              {algo}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-sm relative overflow-hidden group hover:border-emerald-500 transition-colors">
          <h3 className="text-emerald-600 text-xs font-bold mb-1 tracking-wider">AVG_WAITING_TIME</h3>
          <div className="text-2xl md:text-3xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{averages.wt} ms</div>
          <div className="w-full h-1 bg-emerald-500/10 mt-3 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-2/3 animate-[pulse_2s_ease-in-out_infinite]"></div></div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-sm relative overflow-hidden group hover:border-emerald-500 transition-colors">
          <h3 className="text-emerald-600 text-xs font-bold mb-1 tracking-wider">AVG_TURNAROUND_TIME</h3>
          <div className="text-2xl md:text-3xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{averages.tat} ms</div>
          <div className="w-full h-1 bg-emerald-500/10 mt-3 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-3/4 animate-[pulse_2s_ease-in-out_infinite]"></div></div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-sm relative overflow-hidden group hover:border-emerald-500 transition-colors">
          <h3 className="text-emerald-600 text-xs font-bold mb-1 tracking-wider">AVG_RESPONSE_TIME</h3>
          <div className="text-2xl md:text-3xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{averages.rt} ms</div>
          <div className="w-full h-1 bg-emerald-500/10 mt-3 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-1/2 animate-[pulse_2s_ease-in-out_infinite]"></div></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-emerald-500/30 rounded-sm relative shadow-[0_0_15px_rgba(16,185,129,0.05)] flex-1 flex flex-col overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
        <div className="p-4 border-b border-emerald-500/30 flex justify-between items-center bg-emerald-500/5">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-emerald-400">
            <Database className="w-5 h-5" /> PROCESS_METRICS_TABLE
          </h2>
          <div className="text-xs text-emerald-600 animate-pulse">{isAnimating ? 'CALCULATING...' : 'SYSTEM_READY'}</div>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-emerald-600 text-sm bg-slate-950 sticky top-0 z-10">
                {[
                  { label: 'PID', key: 'id' }, { label: 'ARRIVAL', key: 'arrivalTime' }, { label: 'BURST', key: 'burstTime' },
                  { label: 'COMPLETION', key: 'completionTime' }, { label: 'TURNAROUND', key: 'turnaroundTime' },
                  { label: 'WAITING', key: 'waitingTime' }, { label: 'RESPONSE', key: 'responseTime' }
                ].map(col => (
                  <th key={col.key} className="p-3 border-b border-emerald-500/30 font-normal cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors select-none group" onClick={() => handleSort(col.key as keyof JobMetrics)}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      <span className={`text-[10px] ${sortConfig?.key === col.key ? 'text-emerald-400' : 'text-transparent group-hover:text-emerald-600'}`}>
                        {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="p-3 border-b border-emerald-500/30 font-normal">STATUS</th>
              </tr>
            </thead>
            <tbody className={`transition-opacity duration-300 ${isAnimating ? 'opacity-30' : 'opacity-100'}`}>
              {sortedData.map((process) => (
                <tr key={process.id} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors group">
                  <td className="p-3 font-bold text-emerald-400"><span className="mr-2 opacity-30 group-hover:opacity-100 transition-opacity">&gt;</span>{process.id}</td>
                  <td className="p-3 text-emerald-600">{process.arrivalTime}</td>
                  <td className="p-3 text-emerald-600">{process.burstTime}</td>
                  <td className="p-3 text-slate-300">{process.completionTime}</td>
                  <td className="p-3 text-cyan-400">{process.turnaroundTime}</td>
                  <td className={`p-3 ${process.starved ? 'text-red-400 font-bold' : 'text-amber-400'}`}>{process.waitingTime}</td>
                  <td className="p-3 text-purple-400">{process.responseTime}</td>
                  <td className="p-3">
                    {process.starved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-bold bg-red-950 text-red-400 border border-red-500/50 animate-pulse">
                        <AlertCircle className="w-3 h-3" /> STARVATION_RISK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs text-emerald-600 border border-emerald-600/30">
                        <CheckCircle className="w-3 h-3" /> OPTIMAL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-emerald-700">NO DATA. ADD JOBS TO QUEUE.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabStarvation() {
  const WARNING_THRESHOLD = 15;
  const STARVATION_THRESHOLD = 30;

  const [systemTick, setSystemTick] = useState(0);
  const [autoTick, setAutoTick] = useState(false);
  const [processes, setProcesses] = useState([
    { id: 'PID-001', priority: 1, waitTime: 0, burstTime: 50, isExecuting: false },
    { id: 'PID-002', priority: 1, waitTime: 0, burstTime: 40, isExecuting: false },
    { id: 'PID-003', priority: 5, waitTime: 12, burstTime: 100, isExecuting: false },
    { id: 'PID-004', priority: 9, waitTime: 28, burstTime: 200, isExecuting: false },
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoTick) interval = setInterval(() => simulateTick(), 500);
    return () => clearInterval(interval);
  }, [autoTick, processes]);

  const simulateTick = () => {
    setSystemTick((prev) => prev + 1);
    const sorted = [...processes].sort((a, b) => a.priority - b.priority);
    const executingId = sorted.length > 0 ? sorted[0].id : null;
    setProcesses((prev) => prev.map((p) => {
      if (p.id === executingId) return { ...p, isExecuting: true, burstTime: Math.max(0, p.burstTime - 1) };
      return { ...p, isExecuting: false, waitTime: p.waitTime + 1 };
    }).filter(p => p.burstTime > 0));
  };

  const injectHighPriorityJob = () => {
    const newId = `PID-${Math.floor(Math.random() * 900) + 100}`;
    setProcesses((prev) => [...prev, { id: newId, priority: 1, waitTime: 0, burstTime: 20, isExecuting: false }]);
  };

  const applyAging = () => {
    setProcesses((prev) => prev.map((p) => {
      if (p.waitTime >= WARNING_THRESHOLD) return { ...p, priority: Math.max(1, p.priority - 2), waitTime: 0 };
      return p;
    }));
  };

  const starvingProcesses = processes.filter((p) => p.waitTime >= STARVATION_THRESHOLD);
  const warningProcesses = processes.filter((p) => p.waitTime >= WARNING_THRESHOLD && p.waitTime < STARVATION_THRESHOLD);
  const status = starvingProcesses.length > 0 ? 'CRITICAL' : warningProcesses.length > 0 ? 'WARNING' : 'OPTIMAL';

  return (
    <div className="mx-auto max-w-5xl h-full flex flex-col">
      <div className="mb-6 border-b border-emerald-800/50 pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">&gt; STARVATION_MONITOR</h1>
        <p className="text-xs text-emerald-600 mt-1">MODULE: PRIORITY_SCHEDULER_DEMO // STATUS: ONLINE</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 flex-1">
        <div className="space-y-6 lg:col-span-2 flex flex-col">
          <div className="border border-emerald-800/50 bg-slate-900 p-4 rounded-sm">
            <h3 className="mb-4 text-sm text-emerald-600">SYSTEM_CONTROLS</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setAutoTick(!autoTick)} className={`border px-4 py-2 text-sm uppercase transition-colors rounded-sm ${autoTick ? 'border-red-500 text-red-500 hover:bg-red-950/30' : 'border-emerald-500 text-emerald-500 hover:bg-emerald-950/30'}`}>
                {autoTick ? '■ Stop Clock' : '▶ Start Clock'}
              </button>
              <button onClick={simulateTick} className="border border-emerald-700 px-4 py-2 text-sm uppercase text-emerald-400 hover:bg-emerald-900/30 rounded-sm">+1 Tick</button>
              <button onClick={injectHighPriorityJob} className="border border-blue-500 px-4 py-2 text-sm uppercase text-blue-400 hover:bg-blue-950/30 rounded-sm">Inject High-Pri Job</button>
              <button onClick={applyAging} className="border border-purple-500 px-4 py-2 text-sm uppercase text-purple-400 hover:bg-purple-950/30 rounded-sm">Apply Aging (Fix)</button>
            </div>
          </div>

          <div className="border border-emerald-800/50 bg-slate-900 p-4 flex-1 flex flex-col rounded-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm text-emerald-600">PROCESS_QUEUE</h3>
              <span className="text-xs text-emerald-700">TICK: {systemTick}</span>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-emerald-900 text-emerald-700">
                    <th className="pb-2 font-normal">PID</th>
                    <th className="pb-2 font-normal">PRIORITY</th>
                    <th className="pb-2 font-normal">BURST_REMAINING</th>
                    <th className="pb-2 font-normal">WAIT_TIME</th>
                    <th className="pb-2 font-normal">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-emerald-800">[ QUEUE EMPTY ]</td></tr>
                  ) : (
                    processes.map((p) => (
                      <tr key={p.id} className={`border-b border-emerald-900/30 transition-colors ${p.isExecuting ? 'bg-emerald-950/30' : ''}`}>
                        <td className="py-2 text-slate-300">{p.id}</td>
                        <td className="py-2">
                          <span className="inline-block w-6 text-center text-emerald-400">{p.priority}</span>
                          {p.priority === 1 && <span className="ml-2 text-xs text-blue-400">(HIGH)</span>}
                          {p.priority >= 5 && <span className="ml-2 text-xs text-slate-500">(LOW)</span>}
                        </td>
                        <td className="py-2 text-slate-300">{p.burstTime}</td>
                        <td className="py-2">
                          <span className={`${p.waitTime >= STARVATION_THRESHOLD ? 'font-bold text-red-500' : p.waitTime >= WARNING_THRESHOLD ? 'text-amber-500' : 'text-emerald-500'}`}>{p.waitTime}</span>
                        </td>
                        <td className="py-2">
                          {p.isExecuting ? <span className="animate-pulse text-emerald-400">[EXECUTING]</span> : <span className="text-slate-500">[WAITING]</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`relative overflow-hidden border-2 p-4 transition-all duration-500 rounded-sm ${status === 'CRITICAL' ? 'border-red-500 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : status === 'WARNING' ? 'border-amber-500 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-emerald-800 bg-emerald-950/10'}`}>
            {status === 'CRITICAL' && <div className="absolute inset-0 animate-pulse bg-red-500/10"></div>}
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  {status === 'CRITICAL' && <AlertTriangle className="animate-bounce text-red-500 w-6 h-6" />}
                  {status === 'WARNING' && <AlertTriangle className="text-amber-500 w-6 h-6" />}
                  {status === 'OPTIMAL' && <CheckCircle className="text-emerald-500 w-6 h-6" />}
                  <h2 className={`text-xl font-bold tracking-wider ${status === 'CRITICAL' ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : status === 'WARNING' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {status === 'CRITICAL' ? 'STARVATION DETECTED' : status === 'WARNING' ? 'HIGH WAIT TIMES' : 'SYSTEM OPTIMAL'}
                  </h2>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {status === 'OPTIMAL' && <p className="text-emerald-600">All processes are receiving adequate CPU time.</p>}
                  {status === 'WARNING' && (
                    <div className="text-amber-400">
                      <p className="mb-2">Risk of starvation increasing.</p>
                      <div className="flex flex-wrap gap-2">
                        {warningProcesses.map((p) => <span key={p.id} className="border border-amber-500/50 bg-amber-950/50 px-2 py-1 text-xs rounded-sm">{p.id} (Wait: {p.waitTime}ms)</span>)}
                      </div>
                    </div>
                  )}
                  {status === 'CRITICAL' && (
                    <div className="text-red-400">
                      <p className="mb-2 font-bold text-red-300">ACTION REQUIRED: Low priority processes postponed!</p>
                      <div className="flex flex-wrap gap-2">
                        {starvingProcesses.map((p) => <span key={p.id} className="animate-pulse border border-red-500 bg-red-900/50 px-2 py-1 text-xs font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] rounded-sm">{p.id} (Wait: {p.waitTime}ms)</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-emerald-800/50 bg-slate-900 p-4 text-sm text-emerald-600 rounded-sm">
            <h3 className="mb-2 text-emerald-500 flex items-center gap-2"><Info className="w-4 h-4"/> INFO // STARVATION</h3>
            <p className="mb-2">Starvation occurs when low-priority processes are indefinitely prevented from running because high-priority processes keep arriving.</p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-emerald-700">
              <li>Warning Threshold: {WARNING_THRESHOLD} ticks</li>
              <li>Critical Threshold: {STARVATION_THRESHOLD} ticks</li>
            </ul>
            <div className="mt-4 border-t border-emerald-900 pt-2 text-xs">
              <span className="text-blue-400">TIP:</span> Click "Inject High-Pri Job" repeatedly to starve low priority jobs. Click "Apply Aging" to resolve.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabGenerator({ setJobs }: any) {
  const [config, setConfig] = useState({ jobCount: 8, maxBurst: 20, maxArrival: 15, usePriority: true, priorityRange: 5 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [localJobs, setLocalJobs] = useState<Job[]>([]);

  const generateWorkload = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const newJobs: Job[] = [];
      for (let i = 0; i < config.jobCount; i++) {
        newJobs.push({
          id: `P${String(i + 1).padStart(2, '0')}`,
          arrival: Math.floor(Math.random() * (config.maxArrival + 1)),
          burst: Math.floor(Math.random() * config.maxBurst) + 1,
          priority: config.usePriority ? Math.floor(Math.random() * config.priorityRange) + 1 : 1,
          color: getRandomColor(i)
        });
      }
      newJobs.sort((a, b) => a.arrival - b.arrival);
      setLocalJobs(newJobs);
      setIsGenerating(false);
    }, 600);
  }, [config]);

  useEffect(() => { generateWorkload(); }, [generateWorkload]);

  const handleConfigChange = (key: string, value: number | boolean) => setConfig(prev => ({ ...prev, [key]: value }));
  
  const applyToSystem = () => {
    setJobs(localJobs);
    alert('Workload applied to global system!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="border border-emerald-500/30 bg-slate-900 p-5 shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden rounded-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-emerald-500/20 pb-2 text-emerald-400">
            <Settings className="w-5 h-5" /> PARAMETERS
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-emerald-600"><label>PROCESS_COUNT</label><span className="text-emerald-400 font-bold">[{config.jobCount}]</span></div>
              <input type="range" min="1" max="50" value={config.jobCount} onChange={(e) => handleConfigChange('jobCount', parseInt(e.target.value))} className="w-full accent-emerald-500 bg-slate-800 h-1 appearance-none cursor-pointer" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-emerald-600"><label>MAX_BURST_TIME</label><span className="text-emerald-400 font-bold">[{config.maxBurst}ms]</span></div>
              <input type="range" min="5" max="100" value={config.maxBurst} onChange={(e) => handleConfigChange('maxBurst', parseInt(e.target.value))} className="w-full accent-emerald-500 bg-slate-800 h-1 appearance-none cursor-pointer" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-emerald-600"><label>MAX_ARRIVAL_SPREAD</label><span className="text-emerald-400 font-bold">[{config.maxArrival}ms]</span></div>
              <input type="range" min="0" max="100" value={config.maxArrival} onChange={(e) => handleConfigChange('maxArrival', parseInt(e.target.value))} className="w-full accent-emerald-500 bg-slate-800 h-1 appearance-none cursor-pointer" />
            </div>
            <div className="pt-4 border-t border-emerald-500/20 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={config.usePriority} onChange={(e) => handleConfigChange('usePriority', e.target.checked)} className="sr-only" />
                  <div className={`w-10 h-5 border ${config.usePriority ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-600 bg-slate-800'} transition-colors duration-200 ease-in-out flex items-center px-1`}>
                    <div className={`w-3 h-3 bg-emerald-500 transform transition-transform duration-200 ease-in-out ${config.usePriority ? 'translate-x-4' : 'translate-x-0 bg-slate-500'}`}></div>
                  </div>
                </div>
                <span className="text-sm text-emerald-600 group-hover:text-emerald-400 transition-colors">ENABLE_PRIORITY</span>
              </label>
              {config.usePriority && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-emerald-500/70"><label>PRIORITY_LEVELS</label><span>[1-{config.priorityRange}]</span></div>
                  <input type="range" min="3" max="20" value={config.priorityRange} onChange={(e) => handleConfigChange('priorityRange', parseInt(e.target.value))} className="w-full accent-emerald-500 bg-slate-800 h-1 appearance-none cursor-pointer opacity-70 hover:opacity-100" />
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button onClick={generateWorkload} disabled={isGenerating} className="col-span-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500 text-emerald-400 py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 rounded-sm">
              <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} /> {isGenerating ? 'GENERATING...' : 'EXECUTE_GENERATOR'}
            </button>
            <button onClick={() => setLocalJobs([])} className="border border-red-500/50 text-red-400 hover:bg-red-500/10 py-2 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm rounded-sm">
              <Trash2 className="w-4 h-4" /> CLEAR
            </button>
            <button onClick={applyToSystem} disabled={localJobs.length === 0} className="border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 py-2 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50 rounded-sm">
              <Copy className="w-4 h-4" /> APPLY
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col">
        <div className="border border-emerald-500/30 bg-slate-900 flex-1 flex flex-col relative rounded-sm">
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 p-3 flex justify-between items-center">
            <div className="flex items-center gap-2 text-emerald-400"><Database className="w-4 h-4" /> <span className="font-bold">GENERATED_DATASET.json</span></div>
          </div>
          <div className="flex-1 overflow-auto p-4 relative min-h-[400px]">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500/50">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <Terminal className="w-12 h-12 opacity-50" />
                  <span>COMPILING_WORKLOAD_DATA...</span>
                </div>
              </div>
            ) : localJobs.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-emerald-500/30">NO_DATA_AVAILABLE. RUN_GENERATOR.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-emerald-500/50 border-b border-emerald-500/20">
                    <th className="py-2 px-4 font-normal">PID</th>
                    <th className="py-2 px-4 font-normal">ARRIVAL_TIME</th>
                    <th className="py-2 px-4 font-normal">BURST_TIME</th>
                    {config.usePriority && <th className="py-2 px-4 font-normal">PRIORITY</th>}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {localJobs.map((job) => (
                    <tr key={job.id} className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-100">{job.id}</td>
                      <td className="py-3 px-4 text-emerald-600">{job.arrival} ms</td>
                      <td className="py-3 px-4 text-emerald-600">
                        <div className="flex items-center gap-2">
                          <span>{job.burst} ms</span>
                          <div className="h-1 bg-emerald-500/30 hidden sm:block" style={{ width: `${(job.burst / config.maxBurst) * 50}px` }}></div>
                        </div>
                      </td>
                      {config.usePriority && (
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-xs border rounded-sm ${job.priority <= 2 ? 'border-red-500/50 text-red-400' : job.priority <= 5 ? 'border-yellow-500/50 text-yellow-400' : 'border-blue-500/50 text-blue-400'}`}>
                            LVL_{job.priority}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('editor');
  
  // Shared State
  const [jobs, setJobs] = useState<Job[]>([
    { id: 'P1', arrival: 0, burst: 5, priority: 2, color: COLORS[0] },
    { id: 'P2', arrival: 1, burst: 3, priority: 1, color: COLORS[1] },
    { id: 'P3', arrival: 2, burst: 8, priority: 3, color: COLORS[2] },
  ]);
  const [algorithm, setAlgorithm] = useState<Algorithm>('RR');
  const [timeQuantum, setTimeQuantum] = useState<number>(3);

  const TABS = [
    { id: 'editor', label: 'Job Editor', icon: Terminal },
    { id: 'quantum', label: 'Time Quantum', icon: Zap },
    { id: 'gantt', label: 'Gantt Animation', icon: Play },
    { id: 'metrics', label: 'Metrics Table', icon: Activity },
    { id: 'starvation', label: 'Starvation Monitor', icon: AlertTriangle },
    { id: 'generator', label: 'Workload Generator', icon: Cpu },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-mono overflow-hidden selection:bg-emerald-900 selection:text-emerald-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-emerald-900/50 bg-slate-900 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="p-6 border-b border-emerald-900/50">
          <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2 tracking-tighter">
            <Terminal className="w-6 h-6" />
            CPU_STUDIO
          </h1>
          <p className="text-[10px] text-emerald-600 mt-2 uppercase tracking-widest">System UI Engineer</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`w-full text-left px-4 py-3 rounded-sm transition-all flex items-center gap-3 text-sm ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[inset_2px_0_0_rgba(16,185,129,1)]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-emerald-900/50 text-xs text-emerald-700 flex justify-between items-center">
          <span>SYS_STATUS</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> ONLINE</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
        {/* CRT Scanline Overlay */}
        <div className="pointer-events-none fixed inset-0 z-50 h-full w-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-10"></div>
        
        <div className="h-full max-w-7xl mx-auto relative z-10">
          {activeTab === 'editor' && <TabJobEditor jobs={jobs} setJobs={setJobs} timeQuantum={timeQuantum} setTimeQuantum={setTimeQuantum} />}
          {activeTab === 'quantum' && <TabQuantum timeQuantum={timeQuantum} setTimeQuantum={setTimeQuantum} />}
          {activeTab === 'gantt' && <TabGantt jobs={jobs} setJobs={setJobs} algorithm={algorithm} setAlgorithm={setAlgorithm} timeQuantum={timeQuantum} setTimeQuantum={setTimeQuantum} />}
          {activeTab === 'metrics' && <TabMetrics jobs={jobs} algorithm={algorithm} setAlgorithm={setAlgorithm} timeQuantum={timeQuantum} />}
          {activeTab === 'starvation' && <TabStarvation />}
          {activeTab === 'generator' && <TabGenerator setJobs={setJobs} />}
        </div>
      </main>
    </div>
  );
}