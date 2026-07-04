import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Math & PRNG Utilities ---

// Simple Seeded PRNG (Mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for standard normal distribution
function randomNormal(rng: () => number) {
  let u1 = rng(),
    u2 = rng();
  while (u1 === 0) u1 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Format numbers
const fmt = (num: number, digits = 4) => num.toFixed(digits);

// --- Simulation Engine ---

type SimDataPoint = {
  n: number;
  mean: number;
  variance: number;
  stdErr: number;
  ciLower: number;
  ciUpper: number;
};

type SimResult = {
  data: SimDataPoint[];
  finalEst: number;
  finalStdErr: number;
  trueValue: number | null;
  targetName: string;
};

const RUN_CHUNKS = 100; // Plot points

function runSimulation(
  tab: string,
  sampleSize: number,
  useIS: boolean,
  seed: number
): SimResult {
  const rng = mulberry32(seed);
  const data: SimDataPoint[] = [];

  let count = 0;
  let mean = 0;
  let M2 = 0;

  let trueValue: number | null = null;
  let targetName = '';

  const recordPoint = (n: number) => {
    const variance = count > 1 ? M2 / (count - 1) : 0;
    const stdErr = Math.sqrt(variance / count);
    data.push({
      n,
      mean,
      variance,
      stdErr,
      ciLower: mean - 1.96 * stdErr,
      ciUpper: mean + 1.96 * stdErr,
    });
  };

  const updateWelford = (val: number) => {
    count += 1;
    const delta = val - mean;
    mean += delta / count;
    const delta2 = val - mean;
    M2 += delta * delta2;
  };

  const chunkSize = Math.max(1, Math.floor(sampleSize / RUN_CHUNKS));

  if (tab === 'pi') {
    trueValue = Math.PI;
    targetName = 'π (Pi)';
    for (let i = 1; i <= sampleSize; i++) {
      const x = rng();
      const y = rng();
      const val = x * x + y * y <= 1 ? 4 : 0;
      updateWelford(val);
      if (i % chunkSize === 0 || i === sampleSize) recordPoint(i);
    }
  } else if (tab === 'tail') {
    // Target: P(Z > 3) for Z ~ N(0,1). True val ~= 0.00135
    trueValue = 0.001349898;
    targetName = 'P(Z > 3)';
    const threshold = 3;

    for (let i = 1; i <= sampleSize; i++) {
      let val = 0;
      if (!useIS) {
        // Standard MC
        const z = randomNormal(rng);
        val = z > threshold ? 1 : 0;
      } else {
        // Importance Sampling: Sample Y ~ N(3, 1)
        const shift = threshold;
        const y = randomNormal(rng) + shift;
        if (y > threshold) {
          // Weight W = N(y; 0, 1) / N(y; shift, 1) = exp(-shift*y + shift^2 / 2)
          val = Math.exp(-shift * y + (shift * shift) / 2);
        }
      }
      updateWelford(val);
      if (i % chunkSize === 0 || i === sampleSize) recordPoint(i);
    }
  } else if (tab === 'option') {
    // Deep OTM European Call: S0=100, K=150, T=1, r=0.05, sigma=0.3
    // True value is very small (~0.395)
    trueValue = 0.3954;
    targetName = 'Call Option Price';
    const S0 = 100, K = 150, T = 1, r = 0.05, sigma = 0.3;
    const drift = (r - 0.5 * sigma * sigma) * T;
    const vol = sigma * Math.sqrt(T);

    for (let i = 1; i <= sampleSize; i++) {
      let val = 0;
      if (!useIS) {
        // Standard MC
        const z = randomNormal(rng);
        const ST = S0 * Math.exp(drift + vol * z);
        val = Math.max(ST - K, 0) * Math.exp(-r * T);
      } else {
        // IS: Shift mean of Z to make ST ≈ K
        // K = S0 * exp(drift + vol * mu) => mu = (ln(K/S0) - drift) / vol
        const mu = (Math.log(K / S0) - drift) / vol; // ≈ 1.33
        const y = randomNormal(rng) + mu;
        const ST = S0 * Math.exp(drift + vol * y);
        const payoff = Math.max(ST - K, 0) * Math.exp(-r * T);
        const weight = Math.exp(-mu * y + (mu * mu) / 2);
        val = payoff * weight;
      }
      updateWelford(val);
      if (i % chunkSize === 0 || i === sampleSize) recordPoint(i);
    }
  }

  const finalPoint = data[data.length - 1] || { mean: 0, stdErr: 0 };
  return {
    data,
    finalEst: finalPoint.mean,
    finalStdErr: finalPoint.stdErr,
    trueValue,
    targetName,
  };
}

// --- Components ---

// SVG Icons
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'pi' | 'tail' | 'option'>('tail');
  const [sampleSize, setSampleSize] = useState(10000);
  const [useIS, setUseIS] = useState(true);
  const [baseSeed, setBaseSeed] = useState(0xcafe);
  const [replayCount, setReplayCount] = useState(0);

  // Auto-disable IS for Pi estimation as it's not implemented/relevant in this simple model
  const isISApplicable = activeTab !== 'pi';
  const effectiveIS = isISApplicable ? useIS : false;

  const result = useMemo(
    () => runSimulation(activeTab, sampleSize, effectiveIS, baseSeed + replayCount),
    [activeTab, sampleSize, effectiveIS, baseSeed, replayCount]
  );

  const handleReplay = () => setReplayCount((c) => c + 1);
  const handleNewSeed = () => {
    setBaseSeed(Math.floor(Math.random() * 0xffff));
    setReplayCount(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-teal-900 selection:text-teal-200 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header spanning full width */}
        <header className="lg:col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/30 text-teal-400">
              <ChartIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Monte Carlo Estimator Lab</h1>
              <p className="text-sm text-slate-500 font-mono">ChatGPT Quant Edition // Q-Lab.v1</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/50 p-2 rounded-xl border border-slate-800">
            <div className="flex flex-col px-3 border-r border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Random Seed</span>
              <span className="font-mono text-teal-400">0x{(baseSeed + replayCount).toString(16).padStart(4, '0').toUpperCase()}</span>
            </div>
            <button onClick={handleReplay} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors tooltip-trigger" title="Replay with same seed">
              <PlayIcon />
            </button>
            <button onClick={handleNewSeed} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors" title="Generate new seed">
              <RefreshIcon />
            </button>
          </div>
        </header>

        {/* Left Sidebar Controls */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Experiment Tabs */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-2 flex flex-col gap-2">
            {[
              { id: 'tail', label: 'Tail Probability', desc: 'Area under N(0,1) for x > 3' },
              { id: 'option', label: 'Deep OTM Call', desc: 'European Option Pricing' },
              { id: 'pi', label: 'Pi Estimation', desc: 'Circle in Square method' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`text-left p-4 rounded-xl transition-all duration-200 border ${
                  activeTab === t.id
                    ? 'bg-slate-800 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]'
                    : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className={`font-semibold ${activeTab === t.id ? 'text-teal-400' : 'text-slate-200'}`}>{t.label}</div>
                <div className="text-xs text-slate-500 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Core Controls */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-8 shadow-xl">
            
            {/* Importance Sampling Toggle (FOCUS BLOCK 4) */}
            <div className={`relative p-5 rounded-xl border transition-all duration-500 overflow-hidden ${
                effectiveIS 
                  ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.15)]' 
                  : 'bg-slate-900 border-slate-700'
              } ${!isISApplicable ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
              {/* Background