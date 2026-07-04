import React, { useState, useEffect, useMemo } from 'react';

// Z-scores for common confidence intervals
const Z_SCORES: Record<number, number> = {
  90: 1.645,
  95: 1.960,
  99: 2.576,
};

// Theoretical true value for our toy Monte Carlo (Pi)
const TRUE_VALUE = Math.PI;
// Assumed standard deviation of a single sample in our toy MC
const POPULATION_SD = 1.642; 

export default function App() {
  const [samples, setSamples] = useState<number>(1000);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  const [estimate, setEstimate] = useState<number>(3.12);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Calculate statistics
  const standardError = POPULATION_SD / Math.sqrt(samples);
  const marginOfError = Z_SCORES[confidenceLevel] * standardError;
  const lowerBound = estimate - marginOfError;
  const upperBound = estimate + marginOfError;

  // Simulate Monte Carlo convergence
  useEffect(() => {
    if (!isSimulating) return;

    let currentSamples = 100;
    const interval = setInterval(() => {
      currentSamples += Math.floor(currentSamples * 0.15); // Exponential growth for visual effect
      if (currentSamples >= 100000) {
        currentSamples = 100000;
        setIsSimulating(false);
        clearInterval(interval);
      }
      
      setSamples(currentSamples);
      
      // Simulate estimate converging to true value with random noise based on SE
      const currentSE = POPULATION_SD / Math.sqrt(currentSamples);
      const noise = (Math.random() - 0.5) * 2 * currentSE;
      setEstimate(TRUE_VALUE + noise);
      
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Visualization scales
  const vizMin = 2.8;
  const vizMax = 3.5;
  const vizRange = vizMax - vizMin;
  
  const getPercentage = (val: number) => Math.max(0, Math.min(100, ((val - vizMin) / vizRange) * 100));
  
  const lowerPct = getPercentage(lowerBound);
  const upperPct = getPercentage(upperBound);
  const estPct = getPercentage(estimate);
  const truePct = getPercentage(TRUE_VALUE);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-mono flex flex-col items-center justify-center p-6 selection:bg-teal-500/30">
      
      {/* Background ambient glows */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl w-full z-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Confidence Interval Badge
          </h1>
          <p className="text-gray-400 text-sm">Monte Carlo Estimator Lab • Component Sandbox</p>
        </div>

        {/* --- THE BADGE --- */}
        <div className="relative group rounded-2xl bg-gray-900 border border-teal-500/20 shadow-2xl overflow-hidden transition-all duration-500 hover:border-teal-500/40 hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]">
          
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />

          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-xs font-semibold tracking-widest text-teal-400 uppercase">MC Estimate (π)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-white tabular-nums tracking-tighter">
                    {estimate.toFixed(5)}
                  </span>
                  <span className="text-xl font-medium text-orange-400 tabular-nums">
                    ± {marginOfError.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span className="text-xs font-medium text-gray-300">Level: {confidenceLevel}%</span>
                </div>
                <div className="text-sm text-gray-400 tabular-nums">
                  Bounds: <span className="text-gray-200">[{lowerBound.toFixed(4)}, {upperBound.toFixed(4)}]</span>
                </div>
              </div>
            </div>

            {/* Graphical Representation */}
            <div className="relative mt-10 mb-4">
              {/* Axis Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-800 rounded-full -translate-y-1/2 overflow-hidden">
                {/* Confidence Interval Bar */}
                <div 
                  className="absolute h-full bg-teal-500/30 transition-all duration-300 ease-out"
                  style={{ 
                    left: `${lowerPct}%`, 
                    width: `${upperPct - lowerPct}%` 
                  }}
                />
              </div>

              {/* True Value Marker */}
              <div 
                className="absolute top-1/2 w-0.5 h-10 bg-white/40 -translate-y-1/2 transition-all duration-300"
                style={{ left: `${truePct}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-bold tracking-wider">TRUE</div>
              </div>

              {/* Lower Bound Marker */}
              <div 
                className="absolute top-1/2 w-0.5 h-6 bg-teal-500/80 -translate-y-1/2 transition-all duration-300 ease-out"
                style={{ left: `${lowerPct}%` }}
              />
              
              {/* Upper Bound Marker */}
              <div 
                className="absolute top-1/2 w-0.5 h-6 bg-teal-500/80 -translate-y-1/2 transition-all duration-300 ease-out"
                style={{ left: `${upperPct}%` }}
              />

              {/* Estimate Marker */}
              <div 
                className="absolute top-1/2 w-4 h-4 rounded-full bg-orange-400 border-4 border-gray-900 shadow-[0_0_10px_rgba(251,146,60,0.5)] -translate-y-1/2 -translate-x-1/2 transition-all duration-300 ease-out"
                style={{ left: `${estPct}%` }}
              />
            </div>
            
            {/* Axis labels */}
            <div className="flex justify-between text-[10px] text-gray-600 font-medium">
              <span>{vizMin.toFixed(2)}</span>
              <span>{vizMax.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Badge Footer / Meta */}
          <div className="bg-gray-950/50 border-t border-gray-800/50 p-4 px-8 flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>N = <strong className="text-gray-300 tabular-nums">{samples.toLocaleString()}</strong></span>
              <span>SE = <strong className="text-gray-300 tabular-nums">{standardError.toFixed(5)}</strong></span>
            </div>
            <div className="flex gap-2">
               <span className="px-2 py-0.5 rounded bg-gray-800 text-teal-400 border border-teal-900/50">Simulated</span>
            </div>
          </div>
        </div>
        {/* --- END BADGE --- */}

        {/* Controls (To interact with the badge) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
          
          {/* Confidence Level Selector */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Confidence Level</label>
            <div className="flex gap-2 text-sm">
              {[90, 95, 99].map(level => (
                <button
                  key={level}
                  onClick={() => setConfidenceLevel(level)}
                  className={`flex-1 py-2 rounded-lg border transition-all ${
                    confidenceLevel === level 
                      ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' 
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {level}%
                </button>
              ))}
            </div>
          </div>

          {/* Sample Size Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Sample Size (N)</label>
              <button 
                onClick={() => setIsSimulating(true)}
                disabled={isSimulating}
                className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 px-3 py-1 rounded hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {isSimulating ? 'Running...' : 'Run Simulation'}
              </button>
            </div>
            <input 
              type="range" 
              min="100" 
              max="100000" 
              step="100"
              value={samples}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSamples(val);
                // Adjust estimate slightly based on new sample size to show reactivity
                const currentSE = POPULATION_SD / Math.sqrt(val);
                const noise = (Math.random() - 0.5) * 2 * currentSE;
                setEstimate(TRUE_VALUE + noise);
              }}
              disabled={isSimulating}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
            />
          </div>

        </div>

      </div>
    </div>
  );
}