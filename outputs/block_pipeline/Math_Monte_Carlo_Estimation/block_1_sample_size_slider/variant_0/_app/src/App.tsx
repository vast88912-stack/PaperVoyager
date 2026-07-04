import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, RefreshCw, Settings2, Activity, ShieldAlert, Zap } from 'lucide-react';

// --- Helper: Seeded PRNG (Mulberry32) ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function App() {
  // --- State ---
  const [sliderValue, setSliderValue] = useState<number>(3.5); // Log scale: 10^3.5
  const [seed, setSeed] = useState<number>(1337);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [useVarianceReduction, setUseVarianceReduction] = useState<boolean>(false);

  // --- Derived Values ---
  const sampleSize = Math.floor(Math.pow(10, sliderValue));
  const maxSamples = 1000000; // 10^6

  // --- Simulation Logic (Estimating Pi) ---
  const simulationResult = useMemo(() => {
    const random = mulberry32(seed);
    let hits = 0;
    let sum = 0;
    let sumSq = 0;

    // For performance in UI, we cap the actual loop if it gets too crazy, 
    // but JS can handle 1M iterations in a few ms.
    const iterations = Math.min(sampleSize, maxSamples);

    for (let i = 0; i < iterations; i++) {
      if (useVarianceReduction) {
        // Antithetic Variates for Variance Reduction
        const x = random();
        const y = random();
        const x2 = 1 - x;
        const y2 = 1 - y;

        const hit1 = x * x + y * y <= 1 ? 4 : 0;
        const hit2 = x2 * x2 + y2 * y2 <= 1 ? 4 : 0;
        
        const estimate = (hit1 + hit2) / 2;
        sum += estimate;
        sumSq += estimate * estimate;
        if (hit1 === 4) hits++;
        if (hit2 === 4) hits++;
      } else {
        // Standard Monte Carlo
        const x = random();
        const y = random();
        const hit = x * x + y * y <= 1 ? 4 : 0;
        sum += hit;
        sumSq += hit * hit;
        if (hit === 4) hits++;
      }
    }

    const actualN = useVarianceReduction ? iterations * 2 : iterations;
    const mean = sum / iterations;
    const variance = (sumSq / iterations - mean * mean) / iterations;
    const stdDev = Math.sqrt(variance);
    const ciLower = mean - 1.96 * stdDev;
    const ciUpper = mean + 1.96 * stdDev;
    const error = Math.abs(Math.PI - mean);

    return {
      estimate: mean,
      variance,
      stdDev,
      ciLower,
      ciUpper,
      error,
      actualN
    };
  }, [sampleSize, seed, useVarianceReduction]);

  // --- Handlers ---
  const handleReplay = () => {
    setSeed(Math.floor(Math.random() * 100000));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // --- Render Helpers ---
  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const formatDecimals = (num: number, dec: number = 5) => num.toFixed(dec);

  // Calculate slider progress percentage for custom track styling
  const sliderProgress = ((sliderValue - 1) / (6 - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-teal-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 flex items-center gap-3">
              <Activity className="w-8 h-8 text-teal-500" />
              Monte Carlo Estimator Lab
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Experiment: <span className="text-slate-300 font-medium">Estimation of π</span>
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Seed</span>
            <code className="text-orange-400 font-mono text-lg">{seed}</code>
            <button 
              onClick={handleReplay}
              className="ml-2 p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-teal-400"
              title="Generate new seed & replay"
            >
              <RefreshCw className={`w-4 h-4 ${isAnimating ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Main Control Panel - Focus: Sample Size Slider */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-teal-500/5 blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-10">
            {/* Slider Header */}
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-teal-500" />
                  Sample Size Controller
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Adjust the number of Monte Carlo iterations ($N$)
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-bold text-teal-400 tracking-tight">
                  {formatNumber(sampleSize)}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                  Samples Generated
                </div>
              </div>
            </div>

            {/* The Slider Component */}
            <div className="relative pt-6 pb-2">
              {/* Custom Slider Track Background */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-0 h-3 rounded-full bg-slate-800 w-full pointer-events-none"
              />
              {/* Custom Slider Track Fill */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-0 h-3 rounded-full bg-gradient-to-r from-teal-600 to-teal-400 pointer-events-none transition-all duration-75 ease-out"
                style={{ width: `${sliderProgress}%` }}
              />
              
              <input
                type="range"
                min="1"
                max="6"
                step="0.01"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                className="w-full absolute top-1/2 -translate-y-1/2 left-0 h-3 opacity-0 cursor-pointer z-20"
                aria-label="Sample Size"
              />

              {/* Custom Thumb (Visual Only) */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950 border-2 border-teal-400 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.5)] pointer-events-none transition-all duration-75 ease-out z-10 flex items-center justify-center"
                style={{ left: `calc(${sliderProgress}% - 12px)` }}
              >
                <div className="w-2 h-2 bg-teal-400 rounded-full" />
              </div>

              {/* Tick Marks & Labels */}
              <div className="flex justify-between mt-8 text-xs font-mono text-slate-500">
                <span>10¹</span>
                <span>10²</span>
                <span>10³</span>
                <span>10⁴</span>
                <span>10⁵</span>
                <span>10⁶</span>
              </div>
            </div>

            {/* Toggles & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800/50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={useVarianceReduction}
                    onChange={(e) => setUseVarianceReduction(e.target.checked)}
                  />
                  <div className={`block w-12 h-6 rounded-full transition-colors ${useVarianceReduction ? 'bg-orange-500' : 'bg-slate-700'}`} />
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useVarianceReduction ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${useVarianceReduction ? 'text-orange-400' : 'text-slate-500'}`} />
                  Antithetic Variates (Variance Reduction)
                </span>
              </label>

              <button 
                onClick={handleReplay}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg font-medium transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Run Simulation
              </button>
            </div>
          </div>
        </section>

        {/* Results Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estimate Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="text-slate-400 text-sm font-medium mb-2">Current Estimate (π)</div>
            <div className="text-3xl font-mono text-white mb-4">
              {formatDecimals(simulationResult.estimate, 6)}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">True π:</span>
              <span className="font-mono text-slate-400">3.141592...</span>
            </div>
          </div>

          {/* Error & Variance Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="text-slate-400 text-sm font-medium mb-2">Absolute Error</div>
            <div className="text-3xl font-mono text-orange-400 mb-4">
              {formatDecimals(simulationResult.error, 6)}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
              <div 
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((simulationResult.error / 0.1) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Var: {simulationResult.variance.toExponential(2)}
            </div>
          </div>

          {/* Confidence Interval Badge */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-slate-800/50">
              <ShieldAlert className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <div className="text-slate-400 text-sm font-medium mb-2">95% Confidence Interval</div>
              <div className="bg-slate-950 border border-teal-500/30 rounded-lg p-3 inline-block mb-2">
                <div className="text-sm font-mono text-teal-300">
                  [{formatDecimals(simulationResult.ciLower, 4)}, {formatDecimals(simulationResult.ciUpper, 4)}]
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Width: {formatDecimals(simulationResult.ciUpper - simulationResult.ciLower, 5)}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Variance Chart (Conceptual) */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-6">Variance vs. Sample Size (1/N Scaling)</h3>
          <div className="relative h-24 flex items-end gap-1">
            {/* Generate mock bars to show the 1/N curve visually */}
            {Array.from({ length: 40 }).map((_, i) => {
              const barN = Math.pow(10, 1 + (i / 39) * 5); // 10^1 to 10^6
              const isCurrent = barN <= sampleSize && barN > sampleSize / 1.5;
              const heightPct = Math.max(5, 100 / Math.sqrt(barN / 10)); // Scaled for visual
              
              return (
                <div 
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all duration-300 ${
                    barN <= sampleSize 
                      ? isCurrent ? 'bg-teal-400' : 'bg-teal-500/40' 
                      : 'bg-slate-800'
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`N ≈ ${Math.round(barN)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono uppercase">
            <span>High Variance (Low N)</span>
            <span>Low Variance (High N)</span>
          </div>
        </section>

      </div>
    </div>
  );
}