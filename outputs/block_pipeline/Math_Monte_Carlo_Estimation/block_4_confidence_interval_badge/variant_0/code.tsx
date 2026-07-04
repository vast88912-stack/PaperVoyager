import React, { useState, useEffect, useCallback } from 'react';

// --- Utility: Box-Muller transform for normal distribution ---
const randomNormal = (): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// --- Constants for CI ---
const Z_SCORES: Record<number, number> = {
  90: 1.645,
  95: 1.960,
  99: 2.576,
};

// --- Sub-component: The Confidence Interval Badge ---
interface ConfidenceBadgeProps {
  estimate: number;
  standardError: number;
  confidenceLevel: number; // 90, 95, or 99
  trueValue?: number;
}

const ConfidenceIntervalBadge: React.FC<ConfidenceBadgeProps> = ({
  estimate,
  standardError,
  confidenceLevel,
  trueValue,
}) => {
  const zScore = Z_SCORES[confidenceLevel];
  const marginOfError = zScore * standardError;
  const lowerBound = estimate - marginOfError;
  const upperBound = estimate + marginOfError;

  // Determine if true value falls within the interval (for visual feedback)
  const containsTrueValue = trueValue !== undefined && trueValue >= lowerBound && trueValue <= upperBound;

  // Dynamic scale for the visual bullet chart
  const padding = marginOfError * 1.5;
  const minScale = Math.min(trueValue ?? lowerBound, lowerBound) - padding;
  const maxScale = Math.max(trueValue ?? upperBound, upperBound) + padding;
  const range = maxScale - minScale;

  const toPct = (val: number) => Math.max(0, Math.min(100, ((val - minScale) / range) * 100));

  const leftPct = toPct(lowerBound);
  const widthPct = toPct(upperBound) - leftPct;
  const estPct = toPct(estimate);
  const truePct = trueValue !== undefined ? toPct(trueValue) : null;

  return (
    <div className="relative flex flex-col p-6 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-orange-500/5 opacity-50 pointer-events-none" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10">
        <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
          Confidence Interval Badge
        </h3>
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
          {confidenceLevel}% CI
        </span>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 z-10">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">Lower Bound</span>
          <span className="text-lg font-mono text-slate-300">{lowerBound.toFixed(5)}</span>
        </div>
        <div className="flex flex-col items-center border-x border-slate-700/50 px-2">
          <span className="text-xs text-slate-500 mb-1">Mean Estimate (μ)</span>
          <span className="text-2xl font-mono font-bold text-teal-400">{estimate.toFixed(5)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500 mb-1">Upper Bound</span>
          <span className="text-lg font-mono text-slate-300">{upperBound.toFixed(5)}</span>
        </div>
      </div>

      {/* Math Breakdown */}
      <div className="flex justify-center items-center space-x-2 text-xs font-mono text-slate-400 mb-6 z-10 bg-slate-950/50 py-2 rounded-lg border border-slate-800/50">
        <span>μ ±</span>
        <span className="text-teal-500" title="Z-Score">Z({zScore})</span>
        <span>×</span>
        <span className="text-orange-400" title="Standard Error">SE({standardError.toFixed(5)})</span>
        <span>=</span>
        <span className="text-slate-200">±{marginOfError.toFixed(5)}</span>
      </div>

      {/* Visual Bullet Chart */}
      <div className="relative h-12 w-full bg-slate-950 rounded-lg border border-slate-800 z-10 flex items-center px-2">
        {/* Base line */}
        <div className="absolute left-2 right-2 h-0.5 bg-slate-800 rounded-full" />
        
        {/* Interval Span */}
        <div 
          className={`absolute h-3 rounded-full transition-all duration-500 ease-out ${containsTrueValue ? 'bg-teal-500/40 border border-teal-500/80' : 'bg-orange-500/40 border border-orange-500/80'}`}
          style={{ left: `calc(0.5rem + ${leftPct}% * 0.95)`, width: `${widthPct}% * 0.95` }}
        />
        
        {/* Estimate Marker */}
        <div 
          className="absolute w-1.5 h-5 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)] transition-all duration-500 ease-out transform -translate-x-1/2"
          style={{ left: `calc(0.5rem + ${estPct}% * 0.95)` }}
        />

        {/* True Value Marker */}
        {truePct !== null && (
          <div 
            className="absolute w-0.5 h-8 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-all duration-500 ease-out transform -translate-x-1/2 z-20"
            style={{ left: `calc(0.5rem + ${truePct}% * 0.95)` }}
          >
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[10px] font-mono text-orange-400 whitespace-nowrap">
              True: {trueValue?.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {/* Status Message */}
      {trueValue !== undefined && (
        <div className="mt-4 text-center z-10">
          {containsTrueValue ? (
            <span className="text-xs font-medium text-teal-400 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              True value captured within interval
            </span>
          ) : (
            <span className="text-xs font-medium text-orange-400 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              True value fell outside interval (Expected {(100 - confidenceLevel).toFixed(0)}% of the time)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main App: Wrapper to demonstrate the Badge ---
export default function App() {
  const [samples, setSamples] = useState<number>(1000);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  const [seed, setSeed] = useState<number>(Date.now());
  
  // Simulation State
  const [estimate, setEstimate] = useState<number>(0);
  const [se, setSe] = useState<number>(0);

  const TRUE_PI = Math.PI;
  // Approx variance of the indicator function for Pi estimation (Area of circle / Area of square)
  // p = Pi/4. Variance = p * (1 - p) * 16 (since we multiply by 4)
  const PI_VARIANCE = (TRUE_PI / 4) * (1 - TRUE_PI / 4) * 16;

  const runSimulation = useCallback(() => {
    // Simulate standard error based on sample size
    const currentSe = Math.sqrt(PI_VARIANCE / samples);
    
    // Simulate an estimate using a normal distribution around the true value
    // In a real MC, we'd average N random samples. Here we mock the *result* of that process
    // to cleanly demonstrate the confidence interval math.
    const noise = randomNormal();
    const currentEstimate = TRUE_PI + noise * currentSe;

    setSe(currentSe);
    setEstimate(currentEstimate);
  }, [samples, seed]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 font-sans selection:bg-teal-500/30">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-orange-400">
            Monte Carlo Estimator Lab
          </h1>
          <p className="text-slate-400 text-sm">
            Module Focus: <span className="text-teal-300 font-mono">Confidence Interval Badge</span>
          </p>
        </div>

        {/* The Badge Component */}
        <ConfidenceIntervalBadge 
          estimate={estimate}
          standardError={se}
          confidenceLevel={confidenceLevel}
          trueValue={TRUE_PI}
        />

        {/* Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Simulation Parameters</h2>
            <div className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Seed: {seed.toString().slice(-6)}
            </div>
          </div>

          <div className="space-y-4">
            {/* Sample Size Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-400">Sample Size (N)</label>
                <span className="font-mono text-teal-400">{samples.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="100000" 
                step="100"
                value={samples}
                onChange={(e) => setSamples(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Confidence Level Selector */}
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Confidence Level</label>
              <div className="flex space-x-2">
                {[90, 95, 99].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidenceLevel(level)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 border ${
                      confidenceLevel === level 
                        ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.2)]' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Replay Button */}
          <button 
            onClick={() => setSeed(Date.now())}
            className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-lg font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Resample (Replay)
          </button>
        </div>

      </div>
    </div>
  );
}