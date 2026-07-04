import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Math & Simulation Helpers ---
const TRUE_VALUE = 0.001349898; // P(Z > 3) for standard normal
const THRESHOLD = 3;

// Box-Muller transform for N(0,1)
const randn = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// Exponential with lambda = 1
const randExp = () => -Math.log(1 - Math.random());

export default function App() {
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [useIS, setUseIS] = useState<boolean>(true);
  const [seed, setSeed] = useState<number>(Date.now());
  const [isCalculating, setIsCalculating] = useState(false);

  const [results, setResults] = useState({
    estimate: 0,
    variance: 0,
    ciLower: 0,
    ciUpper: 0,
    history: [] as number[],
    error: 0
  });

  const runSimulation = useCallback(() => {
    setIsCalculating(true);
    
    // Small timeout to allow UI to render "calculating" state if N is huge
    setTimeout(() => {
      let sum = 0;
      let sumSq = 0;
      const history: number[] = [];
      const steps = 100; // Number of points for the chart
      const stepSize = Math.max(1, Math.floor(sampleSize / steps));

      for (let i = 1; i <= sampleSize; i++) {
        let val = 0;
        if (useIS) {
          // Importance Sampling: Proposal q(x) = shifted exponential, Target p(x) = N(0,1)
          const x = randExp() + THRESHOLD;
          // Weight W(x) = p(x)/q(x) = (1/sqrt(2pi)) * exp(-x^2/2) / exp(-(x-a))
          val = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x + x - THRESHOLD);
        } else {
          // Standard Monte Carlo
          const x = randn();
          val = x > THRESHOLD ? 1 : 0;
        }

        sum += val;
        sumSq += val * val;

        if (i % stepSize === 0 || i === sampleSize) {
          history.push(sum / i);
        }
      }

      const mean = sum / sampleSize;
      const variance = (sumSq / sampleSize) - (mean * mean);
      const standardError = Math.sqrt(Math.max(0, variance) / sampleSize);
      const zScore = 1.96; // 95% CI

      setResults({
        estimate: mean,
        variance: variance,
        ciLower: mean - zScore * standardError,
        ciUpper: mean + zScore * standardError,
        history: history,
        error: Math.abs(mean - TRUE_VALUE) / TRUE_VALUE
      });
      setIsCalculating(false);
    }, 0);
  }, [sampleSize, useIS, seed]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const handleReplay = () => setSeed(Date.now());

  // Chart rendering logic
  const chartPoints = useMemo(() => {
    if (results.history.length === 0) return "";
    const minVal = Math.min(...results.history, TRUE_VALUE * 0.5);
    const maxVal = Math.max(...results.history, TRUE_VALUE * 2.0);
    const range = maxVal - minVal || 1;
    
    return results.history.map((val, i) => {
      const x = (i / (results.history.length - 1)) * 100;
      const y = 100 - ((val - minVal) / range) * 100;
      return `${x},${y}`;
    }).join(" ");
  }, [results.history]);

  const trueValueY = useMemo(() => {
    if (results.history.length === 0) return 50;
    const minVal = Math.min(...results.history, TRUE_VALUE * 0.5);
    const maxVal = Math.max(...results.history, TRUE_VALUE * 2.0);
    const range = maxVal - minVal || 1;
    return 100 - ((TRUE_VALUE - minVal) / range) * 100;
  }, [results.history]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 flex flex-col items-center justify-center selection:bg-teal-500/30">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Controls & Toggle */}
        <div className="p-8 md:w-5/12 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between relative">
          
          {/* Background decorative accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-orange-500 opacity-50"></div>

          <div>
            <div className="mb-2 uppercase tracking-widest text-xs font-bold text-slate-500">Module 04</div>
            <h2 className="text-2xl font-light text-white mb-6 tracking-tight">
              Variance <span className="font-semibold text-teal-400">Reduction</span>
            </h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Estimating tail probability <code className="text-orange-300 bg-slate-800 px-1 py-0.5 rounded">P(Z &gt; 3)</code>. 
              Standard MC wastes cycles on common events. Importance Sampling focuses on the tail, drastically reducing variance.
            </p>

            {/* THE CORE FOCUS: Importance Sampling Toggle */}
            <div className="mb-8">
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-3 block font-semibold">
                Sampling Strategy
              </label>
              <div 
                className="relative flex items-center p-1 bg-slate-950 rounded-lg cursor-pointer border border-slate-800"
                onClick={() => setUseIS(!useIS)}
              >
                <div className="flex-1 text-center z-10">
                  <span className={`text-sm font-medium transition-colors duration-300 ${!useIS ? 'text-white' : 'text-slate-500'}`}>
                    Standard MC
                  </span>
                </div>
                <div className="flex-1 text-center z-10">
                  <span className={`text-sm font-medium transition-colors duration-300 ${useIS ? 'text-slate-950' : 'text-slate-500'}`}>
                    Importance
                  </span>
                </div>
                {/* Sliding Pill */}
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-in-out shadow-lg ${
                    useIS ? 'translate-x-[calc(100%+4px)] bg-teal-400 shadow-teal-500/20' : 'translate-x-0 bg-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Sample Size Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Sample Size (N)</label>
                <span className="font-mono text-teal-400">{sampleSize.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="10000" 
                step="100"
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
             <div className="flex flex-col">
               <span className="text-[10px] uppercase text-slate-500">Random Seed</span>
               <span className="font-mono text-xs text-slate-400">{seed.toString().slice(-6)}</span>
             </div>
             <button 
                onClick={handleReplay}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs uppercase tracking-wider font-semibold rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Replay
             </button>
          </div>
        </div>

        {/* Right Panel: Data Visualization & Metrics */}
        <div className="p-8 md:w-7/12 flex flex-col relative">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase mb-1">Estimate</div>
              <div className={`font-mono text-xl ${useIS ? 'text-teal-400' : 'text-slate-200'}`}>
                {results.estimate.toExponential(4)}
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
               <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-500/50"></div>
              <div className="text-xs text-slate-500 uppercase mb-1">True Value</div>
              <div className="font-mono text-xl text-orange-400">
                {TRUE_VALUE.toExponential(4)}
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 relative min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-4 z-10 relative">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Convergence Chart</span>
              {isCalculating && <span className="text-xs text-teal-400 animate-pulse">Computing...</span>}
            </div>
            
            <div className="flex-1 relative w-full h-full">
              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* True Value Line */}
                <line 
                  x1="0" y1={trueValueY} x2="100" y2={trueValueY} 
                  stroke="#f97316" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-50"
                />
                {/* Data Line */}
                <polyline 
                  points={chartPoints}
                  fill="none"
                  stroke={useIS ? "#2dd4bf" : "#94a3b8"}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>

          {/* Bottom Metrics Row */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-2">
                Variance
                {useIS && <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[8px] border border-teal-500/30">Reduced</span>}
              </div>
              <div className="font-mono text-sm text-slate-300">
                {results.variance.toExponential(4)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1">95% Confidence Interval</div>
              <div className="font-mono text-sm text-slate-300 flex items-center gap-2">
                <span className="text-slate-500">[</span>
                {results.ciLower.toExponential(2)}
                <span className="text-slate-600">,</span>
                {results.ciUpper.toExponential(2)}
                <span className="text-slate-500">]</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}