import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Dices, 
  RotateCcw, 
  Settings2, 
  Activity, 
  ShieldCheck, 
  Hash, 
  Play,
  BarChart3
} from 'lucide-react';

// --- PRNG Helpers ---
// xmur3: String to 32-bit hash
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// mulberry32: 32-bit PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate random 8-char hex-like string
const generateRandomSeed = () => 
  Math.random().toString(36).substring(2, 10).toUpperCase();

// --- Components ---

// 1. Scrambling Text Component for the Seed Display
const ScramblingSeedDisplay = ({ seed, isReplaying }: { seed: string, isReplaying: boolean }) => {
  const [displayText, setDisplayText] = useState(seed);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;

    const scramble = () => {
      setDisplayText((prev) =>
        prev
          .split('')
          .map((char, index) => {
            if (index < iteration) return seed[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= seed.length) {
        clearInterval(interval);
      }
      iteration += 1 / 3; 
    };

    interval = setInterval(scramble, 30);
    return () => clearInterval(interval);
  }, [seed, isReplaying]);

  return (
    <div className="font-mono text-5xl sm:text-7xl font-bold tracking-[0.2em] text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]">
      {displayText}
    </div>
  );
};

// 2. Main App Component
export default function App() {
  const [seed, setSeed] = useState<string>('QUANT-01');
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [useImportanceSampling, setUseImportanceSampling] = useState<boolean>(false);
  const [replayKey, setReplayKey] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [animProgress, setAnimProgress] = useState<number>(1);

  // Handle Replay Animation
  useEffect(() => {
    if (isReplaying) {
      setAnimProgress(0);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        if (progress >= 1) {
          progress = 1;
          setIsReplaying(false);
          clearInterval(interval);
        }
        setAnimProgress(progress);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setAnimProgress(1);
    }
  }, [isReplaying, replayKey]);

  const handleNewSeed = () => {
    setSeed(generateRandomSeed());
    setReplayKey(prev => prev + 1);
    setIsReplaying(true);
  };

  const handleReplay = () => {
    setReplayKey(prev => prev + 1);
    setIsReplaying(true);
  };

  // Run Monte Carlo Simulation based on Seed
  const simulationData = useMemo(() => {
    const seedHash = xmur3(seed)();
    const prng = mulberry32(seedHash);
    
    let insideCircle = 0;
    const points = [];
    const varianceHistory = [];
    let runningSum = 0;
    let runningSumSq = 0;

    const currentSampleSize = Math.floor(sampleSize * animProgress);

    for (let i = 1; i <= currentSampleSize; i++) {
      let x = prng();
      let y = prng();
      
      // Toy Importance Sampling: Bias points towards the boundary (x^2 + y^2 ~ 1)
      // Visual only for this lab demonstration
      if (useImportanceSampling) {
         x = 1 - Math.pow(x, 2);
         y = 1 - Math.pow(y, 2);
      }

      const distanceSq = x * x + y * y;
      const isInside = distanceSq <= 1;
      
      if (isInside) insideCircle++;
      
      // Calculate running stats for variance chart
      const currentPiEst = 4 * (insideCircle / i);
      runningSum += currentPiEst;
      runningSumSq += currentPiEst * currentPiEst;
      
      if (i % Math.max(1, Math.floor(sampleSize / 50)) === 0) {
        const mean = runningSum / i;
        const variance = (runningSumSq / i) - (mean * mean);
        varianceHistory.push(variance || 0);
      }

      // Only store up to 2000 points for SVG rendering performance
      if (i <= 2000) {
        points.push({ x, y, isInside });
      }
    }

    const piEstimate = currentSampleSize > 0 ? 4 * (insideCircle / currentSampleSize) : 0;
    const standardError = currentSampleSize > 0 ? Math.sqrt((piEstimate * (4 - piEstimate)) / currentSampleSize) : 0;
    const ciLower = piEstimate - 1.96 * standardError;
    const ciUpper = piEstimate + 1.96 * standardError;

    return {
      points,
      piEstimate,
      varianceHistory,
      ciLower,
      ciUpper,
      standardError
    };
  }, [seed, sampleSize, useImportanceSampling, animProgress]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Activity className="text-orange-500" />
              Monte Carlo Estimator Lab
            </h1>
            <p className="text-slate-500 text-sm mt-1">Quant-Minded Frontend Engineering • Variant #2</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleReplay}
              disabled={isReplaying}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-teal-500/50 text-teal-400 rounded-lg hover:bg-teal-950/50 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={16} className={isReplaying ? "animate-spin" : ""} />
              Reproduce
            </button>
            <button 
              onClick={handleNewSeed}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)]"
            >
              <Dices size={16} />
              Roll New Seed
            </button>
          </div>
        </header>

        {/* MAIN FOCUS: Random Seed Display Module */}
        <section className="relative overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col items-center justify-center min-h-[280px]">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-orange-500 to-teal-500 opacity-50"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="flex items-center gap-2 text-slate-400 uppercase tracking-[0.3em] text-sm font-semibold">
              <Hash size={16} className="text-teal-500" />
              Active Simulation Seed
            </div>
            
            <div className="bg-slate-950/50 border border-slate-800 py-6 px-12 rounded-xl backdrop-blur-sm shadow-inner">
              <ScramblingSeedDisplay seed={seed} isReplaying={isReplaying} />
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>Algorithm: Mulberry32</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span>Hash: xmur3</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-teal-400/70">Deterministic Output</span>
            </div>
          </div>
        </section>

        {/* Controls & Visualization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls & Stats */}
          <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Settings2 size={18} className="text-teal-500" />
                Parameters
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400">Sample Size (N)</label>
                    <span className="text-teal-400 font-mono">{sampleSize.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="10000" 
                    step="100"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <label className="text-sm text-slate-400 flex flex-col">
                    <span className="text-white">Importance Sampling</span>
                    <span className="text-xs text-slate-500">Apply boundary bias</span>
                  </label>
                  <button 
                    onClick={() => setUseImportanceSampling(!useImportanceSampling)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useImportanceSampling ? 'bg-orange-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useImportanceSampling ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <BarChart3 size={18} className="text-orange-500" />
                Estimation Results
              </h3>
              
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-800/50">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimated Pi (π)</div>
                  <div className="text-3xl font-mono text-white">
                    {simulationData.piEstimate.toFixed(5)}
                  </div>
                </div>

                {/* Confidence Interval Badge */}
                <div className="flex items-center justify-between bg-teal-950/20 border border-teal-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-teal-500">
                    <ShieldCheck size={18} />
                    <span className="text-sm font-medium">95% CI</span>
                  </div>
                  <div className="font-mono text-sm text-teal-300">
                    [{simulationData.ciLower.toFixed(4)}, {simulationData.ciUpper.toFixed(4)}]
                  </div>
                </div>

                {/* Variance Sparkline */}
                <div className="pt-2">
                  <div className="text-xs text-slate-500 mb-2 flex justify-between">
                    <span>Variance Convergence</span>
                    <span className="font-mono">{simulationData.standardError.toFixed(5)} SE</span>
                  </div>
                  <div className="h-12 w-full flex items-end gap-[2px]">
                    {simulationData.varianceHistory.map((v, i) => {
                      // Normalize height for sparkline
                      const maxV = Math.max(...simulationData.varianceHistory, 0.001);
                      const height = Math.max(10, (v / maxV) * 100);
                      return (
                        <div 
                          key={i} 
                          className="flex-1 bg-orange-500/40 hover:bg-orange-400 rounded-t-[1px] transition-all"
                          style={{ height: `${height}%` }}
                          title={`Step ${i}: ${v.toFixed(6)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualizer */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Play size={18} className="text-teal-500" />
                Monte Carlo Space (2D Projection)
              </h3>
              <div className="flex gap-4 text-xs font-mono">
                <span className="flex items-center gap-1 text-teal-400">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span> Inside
                </span>
                <span className="flex items-center gap-1 text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Outside
                </span>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative flex items-center justify-center p-4">
              {/* SVG Scatter Plot */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full max-h-[500px] max-w-[500px] overflow-visible"
                style={{ transform: 'scaleY(-1)' }} // Flip Y axis so (0,0) is bottom left
              >
                {/* Axes and Unit Circle */}
                <path 
                  d="M 0 100 A 100 100 0 0 0 100 0" 
                  fill="none" 
                  stroke="rgba(45, 212, 191, 0.3)" 
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <rect x="0" y="0" width="100" height="100" fill="none" stroke="rgba(100, 116, 139, 0.2)" strokeWidth="0.5" />
                
                {/* Render Points */}
                {simulationData.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x * 100}
                    cy={p.y * 100}
                    r={useImportanceSampling ? 0.8 : 0.6}
                    fill={p.isInside ? '#2dd4bf' : '#f97316'}
                    opacity={0.7}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              
              {/* Overlay if replaying */}
              {isReplaying && (
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="text-teal-500 font-mono text-sm tracking-widest animate-pulse">
                    COMPUTING SEED PROJECTION...
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-center text-xs text-slate-600 font-mono">
              Displaying up to 2,000 points for performance. Total computed: {Math.floor(sampleSize * animProgress)}.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}