import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- Types ---

type Job = {
  id: string;
  arrival: number;
  burst: number;
  color: string;
};

type AlgorithmResult = {
  name: string;
  timeline: string[];
};

// --- Constants & Generators ---

const JOB_COLORS = [
  'bg-cyan-400 text-black',
  'bg-purple-400 text-black',
  'bg-yellow-400 text-black',
  'bg-rose-400 text-black',
  'bg-blue-400 text-black',
];

const generateRandomJobs = (): Job[] => {
  const jobs: Job[] = [];
  let currentArrival = 0;
  for (let i = 0; i < 5; i++) {
    currentArrival += Math.floor(Math.random() * 3); // Arrivals close to each other
    jobs.push({
      id: `P${i + 1}`,
      arrival: currentArrival,
      burst: Math.floor(Math.random() * 6) + 2, // Burst 2-7
      color: JOB_COLORS[i],
    });
  }
  return jobs;
};

// --- Simulators ---

const simulateFCFS = (jobs: Job[]): string[] => {
  const timeline: string[] = [];
  const sorted = [...jobs].sort((a, b) => a.arrival - b.arrival);
  let t = 0;
  for (const j of sorted) {
    while (t < j.arrival) {
      timeline[t] = 'IDLE';
      t++;
    }
    for (let i = 0; i < j.burst; i++) {
      timeline[t] = j.id;
      t++;
    }
  }
  return timeline;
};

const simulateSJF = (jobs: Job[]): string[] => {
  const timeline: string[] = [];
  const rem = jobs.map((j) => ({ ...j, remaining: j.burst }));
  let t = 0;
  let done = 0;
  while (done < jobs.length) {
    const avail = rem.filter((j) => j.arrival <= t && j.remaining > 0);
    if (avail.length === 0) {
      timeline[t] = 'IDLE';
      t++;
      continue;
    }
    avail.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
    const j = avail[0];
    for (let i = 0; i < j.remaining; i++) {
      timeline[t] = j.id;
      t++;
    }
    t += 0; // redundant but clarifies time moves
    done++;
    j.remaining = 0;
  }
  return timeline;
};

const simulateSRTF = (jobs: Job[]): string[] => {
  const timeline: string[] = [];
  const rem = jobs.map((j) => ({ ...j, remaining: j.burst }));
  let t = 0;
  let done = 0;
  while (done < jobs.length) {
    const avail = rem.filter((j) => j.arrival <= t && j.remaining > 0);
    if (avail.length === 0) {
      timeline[t] = 'IDLE';
      t++;
      continue;
    }
    avail.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
    const j = avail[0];
    timeline[t] = j.id;
    j.remaining--;
    if (j.remaining === 0) done++;
    t++;
  }
  return timeline;
};

const simulateRR = (jobs: Job[], quantum = 3): string[] => {
  const timeline: string[] = [];
  const rem = jobs.map((j) => ({ ...j, remaining: j.burst })).sort((a, b) => a.arrival - b.arrival);
  let t = 0;
  const queue: typeof rem = [];
  let done = 0;
  let curr: (typeof rem)[0] | null = null;
  let timeInQ = 0;

  while (done < jobs.length || queue.length > 0 || curr) {
    const arrived = rem.filter((j) => j.arrival === t);
    if (arrived.length > 0) queue.push(...arrived);

    if (curr && timeInQ === quantum && curr.remaining > 0) {
      queue.push(curr);
      curr = null;
      timeInQ = 0;
    }

    if (curr && curr.remaining === 0) {
      done++;
      curr = null;
      timeInQ = 0;
    }

    if (!curr && queue.length > 0) {
      curr = queue.shift()!;
      timeInQ = 0;
    }

    if (curr) {
      timeline[t] = curr.id;
      curr.remaining--;
      timeInQ++;
    } else {
      timeline[t] = 'IDLE';
    }
    t++;
  }
  return timeline;
};

const simulateMLFQ = (jobs: Job[]): string[] => {
  const timeline: string[] = [];
  const rem = jobs.map((j) => ({ ...j, remaining: j.burst, q: 0, timeInQ: 0 }));
  let t = 0;
  const q0: typeof rem = [];
  const q1: typeof rem = [];
  const q2: typeof rem = [];
  let done = 0;
  let curr: (typeof rem)[0] | null = null;

  while (done < jobs.length || q0.length || q1.length || q2.length || curr) {
    const arrived = rem.filter((j) => j.arrival === t);
    if (arrived.length > 0) q0.push(...arrived);

    if (curr && curr.remaining === 0) {
      done++;
      curr = null;
    }

    if (curr) {
      if (curr.q === 0 && curr.timeInQ === 2) {
        curr.q = 1;
        curr.timeInQ = 0;
        q1.push(curr);
        curr = null;
      } else if (curr.q === 1 && curr.timeInQ === 4) {
        curr.q = 2;
        curr.timeInQ = 0;
        q2.push(curr);
        curr = null;
      } else if (curr.q > 0 && q0.length > 0) {
        if (curr.q === 1) q1.push(curr);
        else q2.push(curr);
        curr = null;
      }
    }

    if (!curr) {
      if (q0.length > 0) {
        curr = q0.shift()!;
        curr.timeInQ = 0;
      } else if (q1.length > 0) {
        curr = q1.shift()!;
        curr.timeInQ = 0;
      } else if (q2.length > 0) {
        curr = q2.shift()!;
        curr.timeInQ = 0;
      }
    }

    if (curr) {
      timeline[t] = curr.id;
      curr.remaining--;
      curr.timeInQ++;
    } else {
      timeline[t] = 'IDLE';
    }
    t++;
  }
  return timeline;
};

// --- Helper Functions ---

const getStarvingJobs = (timeline: string[], jobs: Job[], currentTick: number): string[] => {
  const starving: string[] = [];
  jobs.forEach((job) => {
    if (job.arrival <= currentTick) {
      const executed = timeline.slice(0, currentTick).filter((id) => id === job.id).length;
      if (executed < job.burst) {
        const waitTime = currentTick - job.arrival - executed;
        if (waitTime >= 12) starving.push(job.id);
      }
    }
  });
  return starving;
};

// --- Main Application Component ---

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tick, setTick] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2); // Ticks per second
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setJobs(generateRandomJobs());
  }, []);

  const results = useMemo<AlgorithmResult[]>(() => {
    if (jobs.length === 0) return [];
    return [
      { name: 'FCFS', timeline: simulateFCFS(jobs) },
      { name: 'SJF (Non-Pre)', timeline: simulateSJF(jobs) },
      { name: 'SRTF (Pre)', timeline: simulateSRTF(jobs) },
      { name: 'RR (Q=3)', timeline: simulateRR(jobs, 3) },
      { name: 'MLFQ (Q0=