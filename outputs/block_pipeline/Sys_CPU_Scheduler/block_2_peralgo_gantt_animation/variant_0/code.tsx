import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Terminal, Shuffle, AlertTriangle, Cpu } from 'lucide-react';

// --- Types ---
type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'MLFQ';

interface Job {
  id: string;
  arrival: number;
  burst: number;
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
  wait: number;
  turnaround: number;
  response: number;
  starved: boolean;
}

interface SimulationResult {
  schedule: ScheduleBlock[];
  metrics: JobMetrics[];
  totalTime: number;
}

// --- Constants & Helpers ---
const COLORS = [
  'bg-cyan-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 
  'bg-blue-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500'
];

const generateId = () => Math.random().toString(36).substr(2, 5).toUpperCase();

const getRandomColor = (index: number) => COLORS[index % COLORS.length];

// --- Scheduling Simulator ---
const simulateScheduling = (jobs: Job[], algo: Algorithm, quantum: number): SimulationResult => {
  if (jobs.length === 0) return { schedule: [], metrics: [], totalTime: 0 };

  const schedule: ScheduleBlock[] = [];
  const metricsMap: Record<string, { wait: number, turnaround: number, response: number, firstStart: number, finish: number, remaining: number, arrival: number }> = {};
  
  jobs.forEach(j => {
    metricsMap[j.id] = { wait: 0, turnaround: 0, response: -1, firstStart: -1, finish: -1, remaining: j.burst, arrival: j.arrival };
  });

  let time = 0;
  let completed = 0;
  let currentJobId: string | null = null;
  let blockStart = 0;
  
  // RR / MLFQ specific state
  let readyQueue: string[] = [];
  let currentQuantumUsed = 0;
  
  // MLFQ specific (Simplified: Q0=RR(quantum), Q1=FCFS)
  let queue0: string[] = [];
  let queue1: string[] = [];

  const addBlock = (id: string, start: number, end: number) => {
    if (start === end) return;
    const color = jobs.find(j => j.id === id)?.color || 'bg-gray-500';
    if (schedule.length > 0 && schedule[schedule.length - 1].jobId === id && schedule[schedule.length - 1].end === start) {
      schedule[schedule.length - 1].end = end;
    } else {
      schedule.push({ jobId: id, start, end, color });
    }
  };

  // Safety limit to prevent infinite loops in edge cases
  const MAX_TICKS = 1000;

  while (completed < jobs.length && time < MAX_TICKS) {
    // 1. Handle Arrivals
    const arrivedNow = jobs.filter(j => j.arrival === time).map(j => j.id);
    if (algo === 'RR') {
      readyQueue.push(...arrivedNow);
    } else if (algo === 'MLFQ') {
      queue0.push(...arrivedNow);
    }

    // 2. Select Next Job based on Algorithm
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
          // Demote if quantum exceeded
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
          
          // Preempt if higher priority queue has jobs
          if (currentJobId && queue1.includes(currentJobId) && queue0.length > 0) {
            queue1.push(currentJobId); // put back
            currentJobId = null;
          }

          if (!currentJobId) {
            if (queue0.length > 0) {
              currentJobId = queue0.shift() || null;
            } else if (queue1.length > 0) {
              // FCFS for Q1
              currentJobId = queue1.sort((a, b) => metricsMap[a].arrival - metricsMap[b].arrival)[0];
              queue1 = queue1.filter(id => id !== currentJobId);
            }
          }
          nextJobId = currentJobId;
          break;
      }
    }

    // 3. Context Switch & Execution
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
      wait: m.wait,
      turnaround: m.turnaround,
      response: m.response,
      starved: m.wait > 15 // Arbitrary starvation threshold for UI demo
    };
  });

  return { schedule, metrics, totalTime: time };
};

// --- Main Component ---
export default function App() {
  const [jobs, setJobs] = useState<Job[]>([
    { id: 'J1', arrival: 0, burst: 5, color: COLORS[0] },
    { id: 'J2', arrival: 1, burst: 3, color: COLORS[1] },
    { id: 'J3', arrival: 2, burst: 8, color: COLORS[2] },
    { id: 'J4', arrival: 4, burst: 2, color: COLORS[3] },
  ]);
  const [algorithm, setAlgorithm] = useState<Algorithm>('RR');
  const [quantum, setQuantum] = useState<number>(3);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const { schedule, metrics, totalTime } = useMemo(() => 
    simulateScheduling(jobs, algorithm, quantum), 
  [jobs, algorithm, quantum]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const delta = timestamp - lastUpdateRef.current;

      if (delta > 100) { // 100ms per tick
        setCurrentTime(prev => {
          if (prev >= totalTime) {
            setIsPlaying(false);
            return totalTime;
          }
          return prev + 0.2; // Smooth sub-tick animation
        });
        lastUpdateRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, totalTime]);

  // Reset animation when inputs change
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [jobs, algorithm, quantum]);

  const handleAddJob = () => {
    if (jobs.length >= 8) return;
    const newJob: Job = {
      id: `J${jobs.length + 1}`,
      arrival: Math.max(0, Math.floor(Math.random() * 10)),
      burst: Math.max(1, Math.floor(Math.random() * 8) + 1),
      color: getRandomColor(jobs.length)
    };
    setJobs([...jobs, newJob]);
  };

  const handleRemoveJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const handleRandomize = () => {
    const count = Math.floor(Math.random() * 3) + 4; // 4 to 6 jobs
    const newJobs: Job[] = Array.from({ length: count }).map((_, i) => ({
      id: `J${i + 1}`,
      arrival: Math.floor(Math.random() * 8),
      burst: Math.floor(Math.random() * 8) + 1,
      color: getRandomColor(i)
    }));
    setJobs(newJobs);
  };

  const updateJob = (id: string, field: keyof Job, value: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, [field]: Math.max(0, value) } : j));
  };

  const avgWait = metrics.length ? (metrics.reduce((acc, m) => acc + m.wait, 0) / metrics.length).toFixed(2) : '0.00';
  const avgTurnaround = metrics.length ? (metrics.reduce((acc, m) => acc + m.turnaround, 0) / metrics.length).toFixed(2) : '0.00';
  const starvedJobs = metrics.filter(m => m.starved).length;

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 md:p-8 selection:bg-green-900 selection:text-green-100">
      
      {/* Header */}
      <header className="mb-8 border-b border-green-900/50 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              CPU_SCHEDULER_STUDIO <span className="animate-pulse text-green-400">_</span>
            </h1>
            <p className="text-xs text-green-700 uppercase tracking-widest">Interactive Algorithm Visualizer v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-900/50 p-2 border border-green-900/30 rounded">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">SYS_LOAD: NORMAL</span>
          </div>
          {starvedJobs > 0 && (
            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs font-bold border border-amber-500/20 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              STARVATION DETECTED ({starvedJobs})
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls & Job Editor */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Controls */}
          <section className="bg-gray-900 border border-green-800/50 rounded-md p-4 shadow-lg shadow-black/50">
            <h2 className="text-sm font-bold uppercase mb-4 text-green-400 border-b border-green-900/50 pb-2">
              &gt; Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-green-600 mb-1">ALGORITHM</label>
                <select 
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                  className="w-full bg-gray-950 border border-green-800 text-green-400 p-2 rounded focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="FCFS">First Come First Serve (FCFS)</option>
                  <option value="SJF">Shortest Job First (SJF)</option>
                  <option value="SRTF">Shortest Remaining Time (SRTF)</option>
                  <option value="RR">Round Robin (RR)</option>
                  <option value="MLFQ">Multi-Level Feedback Queue (MLFQ)</option>
                </select>
              </div>

              {(algorithm === 'RR' || algorithm === 'MLFQ') && (
                <div>
                  <label className="flex justify-between text-xs text-green-600 mb-1">
                    <span>TIME QUANTUM</span>
                    <span className="text-green-400">{quantum} ticks</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" max="10" 
                    value={quantum}
                    onChange={(e) => setQuantum(Number(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Job Editor */}
          <section className="bg-gray-900 border border-green-800/50 rounded-md p-4 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between mb-4 border-b border-green-900/50 pb-2">
              <h2 className="text-sm font-bold uppercase text-green-400">
                &gt; Process_Table
              </h2>
              <div className="flex gap-2">
                <button onClick={handleRandomize} className="p-1 hover:bg-green-900/30 text-green-600 hover:text-green-400 rounded transition-colors" title="Randomize Workload">
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={handleAddJob} disabled={jobs.length >= 8} className="p-1 hover:bg-green-900/30 text-green-600 hover:text-green-400 rounded disabled:opacity-50 transition-colors" title="Add Job">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 bg-gray-950 p-2 rounded border border-gray-800 hover:border-green-800/50 transition-colors group">
                  <div className={`w-3 h-3 rounded-full ${job.color} shadow-[0_0_8px_currentColor] opacity-80`} />
                  <span className="font-bold w-6">{job.id}</span>
                  
                  <div className="flex-1 flex gap-2">
                    <div className="flex flex-col w-1/2">
                      <span className="text-[10px] text-green-700">ARR</span>
                      <input 
                        type="number" min="0" 
                        value={job.arrival}
                        onChange={(e) => updateJob(job.id, 'arrival', parseInt(e.target.value) || 0)}
                        className="bg-transparent border-b border-gray-800 focus:border-green-500 outline-none text-sm w-full"
                      />
                    </div>
                    <div className="flex flex-col w-1/2">
                      <span className="text-[10px] text-green-700">BURST</span>
                      <input 
                        type="number" min="1" 
                        value={job.burst}
                        onChange={(e) => updateJob(job.id, 'burst', parseInt(e.target.value) || 1)}
                        className="bg-transparent border-b border-gray-800 focus:border-green-500 outline-none text-sm w-full"
                      />
                    </div>
                  </div>
                  
                  <button onClick={() => handleRemoveJob(job.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-center text-sm text-green-800 py-4">No processes in queue.</div>
              )}
            </div>
          </section>

        </div>

        {/* Right Panel: Visualization & Metrics */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          
          {/* Gantt Chart Animation */}
          <section className="bg-gray-900 border border-green-800/50 rounded-md p-4 shadow-lg shadow-black/50 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-green-900/50 pb-2">
              <h2 className="text-sm font-bold uppercase text-green-400">
                &gt; Execution_Timeline
              </h2>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 mr-2">TICK: {Math.floor(currentTime)} / {totalTime}</span>
                <button 
                  onClick={() => {
                    if (currentTime >= totalTime) setCurrentTime(0);
                    setIsPlaying(!isPlaying);
                  }}
                  className="flex items-center gap-1 bg-green-900/30 hover:bg-green-800/50 text-green-400 px-3 py-1 rounded border border-green-700/50 transition-colors text-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'PAUSE' : currentTime >= totalTime ? 'REPLAY' : 'START'}
                </button>
                <button 
                  onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded border border-gray-700 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Gantt Container */}
            <div className="relative w-full h-24 bg-gray-950 border border-green-900/50 rounded overflow-hidden mt-4">
              {/* Grid lines */}
              {Array.from