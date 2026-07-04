import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// --- TYPES ---
type Job = {
  id: string;
  name: string;
  color: string;
  arrival: number;
  burst: number;
  priority: number; // Lower number = higher priority for some algos
};

type ScheduleBlock = {
  jobId: string;
  jobName: string;
  color: string;
  start: number;
  end: number;
  duration: number;
};

type JobMetrics = {
  jobId: string;
  name: string;
  color: string;
  arrival: number;
  burst: number;
  waiting: number;
  turnaround: number;
  response: number;
  completion: number;
};

type SimulationResult = {
  schedule: ScheduleBlock[];
  metrics: JobMetrics[];
  totalTime: number;
  starvationRisk: boolean;
  starvedJobs: string[];
};

type AlgoType = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'MLFQ';

// --- CONSTANTS & PALETTE ---
const TERMINAL_COLORS = [
  '#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff8800', '#ff0088', '#88ff00', '#0088ff'
];

const INITIAL_JOBS: Job[] = [
  { id: '1', name: 'P1', color: TERMINAL_COLORS[0], arrival: 0, burst: 5, priority: 2 },
  { id: '2', name: 'P2', color: TERMINAL_COLORS[1], arrival: 1, burst: 3, priority: 1 },
  { id: '3', name: 'P3', color: TERMINAL_COLORS[2], arrival: 2, burst: 8, priority: 3 },
  { id: '4', name: 'P4', color: TERMINAL_COLORS[3], arrival: 3, burst: 2, priority: 1 },
];

// --- SCHEDULER ENGINE ---
const simulate = (jobs: Job[], algo: AlgoType, quantum: number): SimulationResult => {
  const schedule: ScheduleBlock[] = [];
  const metricsMap: Record<string, Partial<JobMetrics>> = {};
  
  // Initialize tracking
  let jList = jobs.map(j => ({
    ...j,
    rem: j.burst,
    firstStart: -1,
    completion: -1,
    lastActive: -1
  })).sort((a, b) => a.arrival - b.arrival); // Sort by arrival primarily

  if (jList.length === 0) return { schedule: [], metrics: [], totalTime: 0, starvationRisk: false, starvedJobs: [] };

  let time = 0;
  let completed = 0;
  let currentJobIdx = -1;
  let currentRunTime = 0;

  // MLFQ Queues
  const q0: number[] = []; // RR (Quantum)
  const q1: number[] = []; // RR (Quantum * 2)
  const q2: number[] = []; // FCFS
  const jobQueueLevel: Record<number, number> = {};
  jList.forEach((_, i) => jobQueueLevel[i] = 0);

  // RR Queue
  const rrQueue: number[] = [];

  const addScheduleBlock = (jIdx: number, start: number, end: number) => {
    if (start === end) return;
    const job = jList[jIdx];
    const lastBlock = schedule[schedule.length - 1];
    
    // Merge contiguous blocks of the same job
    if (lastBlock && lastBlock.jobId === job.id && lastBlock.end === start) {
      lastBlock.end = end;
      lastBlock.duration = lastBlock.end - lastBlock.start;
    } else {
      schedule.push({
        jobId: job.id,
        jobName: job.name,
        color: job.color,
        start,
        end,
        duration: end - start
      });
    }
  };

  // Prevent infinite loops in UI
  let safetyCounter = 0;

  while (completed < jList.length && safetyCounter < 10000) {
    safetyCounter++;
    
    // 1. Handle Arrivals
    for (let i = 0; i < jList.length; i++) {
      if (jList[i].arrival === time && jList[i].rem > 0) {
        if (algo === 'RR') rrQueue.push(i);
        if (algo === 'MLFQ') q0.push(i);
      }
    }

    // 2. Algorithm Specific Selection & Preemption
    let nextJobIdx = -1;

    switch (algo) {
      case 'FCFS': {
        if (currentJobIdx !== -1 && jList[currentJobIdx].rem > 0) {
          nextJobIdx = currentJobIdx;
        } else {
          let earliest = -1;
          for (let i = 0; i < jList.length; i++) {
            if (jList[i].rem > 0 && jList[i].arrival <= time) {
              if (earliest === -1 || jList[i].arrival < jList[earliest].arrival) {
                earliest = i;
              }
            }
          }
          nextJobIdx = earliest;
        }
        break;
      }
      
      case 'SJF': {
        // Non-preemptive Shortest Job First
        if (currentJobIdx !== -1 && jList[currentJobIdx].rem > 0) {
          nextJobIdx = currentJobIdx;
        } else {
          let shortest = -1;
          for (let i = 0; i < jList.length; i++) {
            if (jList[i].rem > 0 && jList[i].arrival <= time) {
              if (shortest === -1 || jList[i].burst < jList[shortest].burst) {
                shortest = i;
              }
            }
          }
          nextJobIdx = shortest;
        }
        break;
      }

      case 'SRTF': {
        // Preemptive Shortest Remaining Time First
        let shortest = -1;
        for (let i = 0; i < jList.length; i++) {
          if (jList[i].rem > 0 && jList[i].arrival <= time) {
            if (shortest === -1 || jList[i].rem < jList[shortest].rem) {
              shortest = i;
            }
          }
        }
        nextJobIdx = shortest;
        break;
      }

      case 'RR': {
        if (currentJobIdx !== -1) {
          if (jList[currentJobIdx].rem === 0) {
            // Done, will pick next from queue
          } else if (currentRunTime >= quantum) {
            // Preempt
            rrQueue.push(currentJobIdx);
            currentJobIdx = -1;
          } else {
            // Continue
            nextJobIdx = currentJobIdx;
          }
        }
        
        if (nextJobIdx === -1 && rrQueue.length > 0) {
          nextJobIdx = rrQueue.shift()!;
          currentRunTime = 0;
        }
        break;
      }

      case 'MLFQ': {
        // Evaluate preemption or continuation
        if (currentJobIdx !== -1) {
          const level = jobQueueLevel[currentJobIdx];
          const qLimit = level === 0 ? quantum : (level === 1 ? quantum * 2 : Infinity);
          
          if (jList[currentJobIdx].rem === 0) {
            // Job done
            currentJobIdx = -1;
          } else if (currentRunTime >= qLimit) {
            // Demote
            const newLevel = Math.min(level + 1, 2);
            jobQueueLevel[currentJobIdx] = newLevel;
            if (newLevel === 1) q1.push(currentJobIdx);
            if (newLevel === 2) q2.push(currentJobIdx);
            currentJobIdx = -1;
          } else {
            // Check higher priority queues for preemption
            if (level > 0 && q0.length > 0) {
               // Preempted by Q0
               if (level === 1) q1.unshift(currentJobIdx);
               if (level === 2) q2.unshift(currentJobIdx);
               currentJobIdx = -1;
            } else if (level > 1 && q1.length > 0) {
               // Preempted by Q1
               q2.unshift(currentJobIdx);
               currentJobIdx = -1;
            } else {
               nextJobIdx = currentJobIdx;
            }
          }
        }

        if (nextJobIdx === -1) {
          if (q0.length > 0) nextJobIdx = q0.shift()!;
          else if (q1.length > 0) nextJobIdx = q1.shift()!;
          else if (q2.length > 0) nextJobIdx = q2.shift()!;
          currentRunTime = 0;
        }
        break;
      }
    }

    // 3. Execution Phase
    if (nextJobIdx !== -1) {
      if (currentJobIdx !== nextJobIdx) {
        currentRunTime = 0;
        currentJobIdx = nextJobIdx;
      }
      
      const job = jList[currentJobIdx];
      if (job.firstStart === -1) job.firstStart = time;
      
      addScheduleBlock(currentJobIdx, time, time + 1);
      
      job.rem -= 1;
      currentRunTime += 1;
      job.lastActive = time;

      if (job.rem === 0) {
        job.completion = time + 1;
        completed += 1;
        currentJobIdx = -1;
      }
    } else {
      currentJobIdx = -1;
    }

    time++;
  }

  // Calculate Metrics & Starvation
  const metrics: JobMetrics[] = [];
  let starvationRisk = false;
  const starvedJobs: string[] = [];

  const avgBurst = jobs.reduce((s, j) => s + j.burst, 0) / (jobs.length || 1);

  jList.forEach(j => {
    const turnaround = j.completion !== -1 ? j.completion - j.arrival : 0;
    const waiting = Math.max(0, turnaround - j.burst);
    const response = j.firstStart !== -1 ? j.firstStart - j.arrival : 0;

    // Starvation heuristic: waiting time > 3x average burst (for non-trivial bursts)
    if (waiting > avgBurst * 3 && j.burst > 0 && (algo === 'SJF' || algo === 'SRTF' || algo === 'MLFQ')) {
      starvationRisk = true;
      starvedJobs.push(j.name);
    }

    metrics.push({
      jobId: j.id,
      name: j.name,
      color: j.color,
      arrival: j.arrival,
      burst: j.burst,
      waiting,
      turnaround,
      response,
      completion: j.completion
    });
  });

  return {
    schedule,
    metrics,
    totalTime: time,
    starvationRisk,
    starvedJobs
  };
};

// --- COMPONENTS ---

export default function App() {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [algo, setAlgo] = useState<AlgoType>('RR');
  const [timeQuantum, setTimeQuantum] = useState<number>(2);
  
  // Animation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // Derived Simulation
  const simResult = useMemo(() => simulate(jobs, algo, timeQuantum), [jobs, algo, timeQuantum]);

  // Animation Loop
  const animate = useCallback((timestamp: number) => {
    if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
    const delta = timestamp - lastUpdateRef.current;

    if (delta > 50) { // Update approx 20fps
      setCurrentTime(prev => {
        const nextTime = prev + 0.2; // Speed multiplier
        if (nextTime >= simResult.totalTime) {
          setIsPlaying(false);
          return simResult.totalTime;
        }
        return nextTime;
      });
      lastUpdateRef.current = timestamp;
    }
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, simResult.totalTime]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, animate]);

  // Reset animation when simulation changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [simResult]);

  // Actions
  const handleRandomize = () => {
    const numJobs = Math.floor(Math.random() * 4) + 3; // 3 to 6 jobs
    const newJobs: Job[] = [];
    let currentArrival = 0;
    
    for (let i = 0; i < numJobs; i++) {
      newJobs.push({
        id: Math.random().toString(36).substr(2, 9),
        name: `P${i + 1}`,
        color: TERMINAL_COLORS[i % TERMINAL_COLORS.length],
        arrival: currentArrival,
        burst: Math.floor(Math.random() * 10) + 1,
        priority: Math.floor(Math.random() * 5) + 1
      });
      currentArrival += Math.floor(Math.random() * 3); // Stagger arrivals
    }
    setJobs(newJobs);
  };

  const addJob = () => {
    const nextIdx = jobs.length + 1;
    setJobs([...jobs, {
      id: Math.random().toString(36).substr(2, 9),
      name: `P${nextIdx}`,
      color: TERMINAL_COLORS[jobs.length % TERMINAL_COLORS.length],
      arrival: Math.max(0, ...jobs.map(j => j.arrival)) + 1,
      burst: 4,
      priority: 2
    }]);
  };

  const removeJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const updateJob = (id: string, field: keyof Job, value: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, [field]: value } : j));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-green-500 font-mono p-4 flex flex-col selection:bg-green-900 selection:text-green-100">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-green-800 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-3">
            <span className="text-green-400">[&gt;]</span> CPU Scheduler Studio
          </h1>
          <p className="text-xs text-green-700 mt-1">v3.0.1 // Interactive Gantt Edition</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleRandomize}
            className="px-4 py-2 text-sm border border-green-700 hover:bg-green-900 hover:text-white transition-colors uppercase tracking-wide"
          >
            [ Randomize Workload ]
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT PANEL: CONFIGURATION */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* ALGO SELECTOR */}
          <div className="border border-green-800 bg-gray-900/50 p-4 relative">
            <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs text-green-600 font-bold uppercase">Algorithm</div>
            <div className="flex flex-col gap-2 mt-2">
              {(['FCFS', 'SJF', 'SRTF', 'RR', 'MLFQ'] as AlgoType[]).map(a => (
                <button
                  key={a}
                  onClick={() => setAlgo(a)}
                  className={`text-left px-3 py-2 border uppercase text-sm transition-all ${
                    algo === a 
                      ? 'border-green-400 bg-green-900/30 text-green-300 shadow-[0_0_10px_rgba(0,255,0,0.2)]' 
                      : 'border-transparent hover:border-green-800 text-green-700 hover:text-green-500'
                  }`}
                >
                  {algo === a ? '> ' : '  '}{a}
                </button>
              ))}
            </div>

            {(algo === 'RR' || algo === 'MLFQ') && (
              <div className="mt-6 pt-4 border-t border-green-800/50">
                <label className="flex flex-col text-xs uppercase tracking-wide text-green-600 gap-2">
                  Time Quantum (q = {timeQuantum})
                  <input 
                    type="range" min="1" max="10" step="1" 
                    value={timeQuantum} 
                    onChange={e => setTimeQuantum(Number(e.target.value))}
                    className="accent-green-500 w-full bg-gray-800 h-1 outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          {/* JOB EDITOR */}
          <div className="border border-green-800 bg-gray-900/50 p-4 relative flex-1">
            <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs text-green-600 font-bold uppercase">Process Table</div>
            
            <div className="flex flex-col gap-3 mt-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {jobs.map((job) => (
                <div key={job.id} className="border border-green-900 bg-black p-3 relative group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold flex items-center gap-2" style={{ color: job.color }}>
                      <span className="w-2 h-2 inline-block rounded-full" style={{ backgroundColor: job.color }}></span>
                      {job.name}
                    </span>
                    <button onClick={() => removeJob(job.id)} className="text-red-900 hover:text-red-500 text-xs uppercase">
                      [x]
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex flex-col text-green-700">Arrival
                      <input type="number" min="0" value={job.arrival} onChange={e => updateJob(job.id, 'arrival', Number(e.target.value))} className="bg-transparent border-b border-green-900 text-green-400 focus:outline-none focus:border-green-500 w-full" />
                    </label>
                    <label className="flex flex-col text-green-700">Burst
                      <input type="number" min="1" value={job.burst} onChange={e => updateJob(job.id, 'burst', Number(e.target.value))} className="bg-transparent border-b border-green-900 text-green-400 focus:outline-none focus:border-green-500 w-full" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={addJob}
              className="mt-4 w-full py-2 border border-dashed border-green-800 text-green-700 hover:border-green-500 hover:text-green-400 transition-colors text-xs uppercase"
            >
              + Add Process
            </button>
          </div>

        </div>

        {/* RIGHT PANEL: VISUALIZATION & METRICS */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* ANIMATED GANTT CHART (FOCUS BLOCK 3) */}
          <div className="border border-green-500 bg-black p-4 relative shadow-[0_0_15px_rgba(0,255,0,0.1)] flex flex-col h-64">
            <div className="absolute -top-3 left-4 bg-gray-950 px-2 text-xs text-green-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="animate-pulse h-2 w-2 bg-green-500 rounded-full inline-block"></span>
              Execution Timeline ({algo})