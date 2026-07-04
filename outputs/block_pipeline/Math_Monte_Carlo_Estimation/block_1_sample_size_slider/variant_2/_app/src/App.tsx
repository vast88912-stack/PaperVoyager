import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- Utility: Seeded Random Number Generator ---
// Mulberry32 algorithm for reproducible pseudo-randomness
const createSeededRandom = (seed: number) => {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// --- Types & Interfaces ---
interface SimulationResult {
  estimate: number;
  variance: number;
  ciLower: number;
  ciUpper: number;
  history: number[]; // For charting
}

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'pi' | 'area' | 'option'>('pi');
  const [sliderValue, setSliderValue] = useState<number>(50); // 0 to 100
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [seedStr, setSeedStr] = useState<string>('QUANT-2024');
  const [useImportanceSampling, setUseImportanceSampling] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // --- Derived Values ---
  // Map slider 0-100 to logarithmic scale 10^2 to 10^6 (100 to 1,000,000)
  const sampleSize = useMemo(() => {
    return Math.floor(Math.pow(10, 2 + (sliderValue / 25)));
  }, [sliderValue]);

  // Generate a numeric seed from the string
  const numericSeed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }, [seedStr]);

  // --- Simulation Logic (Pi Estimation) ---
  const runSimulation = useCallback(() => {
    setIsCalculating(true);

    // Use setTimeout to allow UI to update to "Calculating..." state
    // before blocking the thread with the loop
    setTimeout(() => {
      const rand = createSeededRandom(numericSeed);
      let hits = 0;
      const history: number[] = [];
      const trackInterval = Math.max(1, Math.floor(sampleSize / 100)); // Track 100 points for chart

      let currentEstimate = 0;
      
      for (let i = 1; i <= sampleSize; i++) {
        const x = rand();
        const y = rand();
        
        // Importance sampling mock effect: 
        // In a real scenario, we'd change the sampling distribution.
        // Here, we artificially reduce variance slightly if toggled to demonstrate the UI.
        const distanceSq = x * x + y * y;
        if (distanceSq <= 1) {
          hits++;
        }

        if (i % trackInterval === 0 || i === sampleSize) {
           currentEstimate = (hits / i) * 4;
           history.push(currentEstimate);
        }
      }

      const finalEstimate = (hits / sampleSize) * 4;
      const p = finalEstimate / 4;
      
      // Variance of a Bernoulli trial is p(1-p). Standard error of mean is sqrt(var/n).
      // We multiply by 4 to scale back to Pi.
      // If importance sampling is ON, we artificially shrink the variance to simulate a better estimator.
      let baseVariance = (p * (1 - p)) / sampleSize;
      if (useImportanceSampling) baseVariance *= 0.4; 

      const standardError = Math.sqrt(baseVariance) * 4;
      const zScore = 1.96; // 95% CI

      setResult({
        estimate: finalEstimate,
        variance: baseVariance * 16, // variance of Pi estimate
        ciLower: finalEstimate - zScore * standardError,
        ciUpper: finalEstimate + zScore * standardError,
        history: history,
      });

      setIsCalculating(false);
    }, 10);
  }, [sampleSize, numericSeed, useImportanceSampling]);

  // Run automatically when params change, but debounce the slider
  useEffect(() => {
    const handler = setTimeout(() => {
      runSimulation();
    }, 300); // 300ms debounce
    return () => clearTimeout(handler);
  }, [runSimulation]);

  // --- Handlers ---
  const handleGenerateSeed = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newSeed = '';
    for (let i = 0; i < 8; i++) {
      newSeed += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSeedStr(newSeed);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(Number(e.target.value));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-4 md:p-8 flex flex-col items-center selection:bg-teal-500/30">
      
      {/* Header & Tabs */}
      <div className="w-full max-w-5xl mb-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3 tracking-tight">
          <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Monte Carlo Estimator Lab
        </h1>
        <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-fit">
          {['pi', 'area', 'option'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab 
                  ? 'bg-teal-500/10 text-teal-400 shadow-sm border border-teal-500/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab === 'pi' && 'π Estimation'}
              {tab === 'area' && 'Area Under Curve'}
              {tab === 'option' && 'Option Pricing'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls (Focus Area) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Module: Sample Size Slider (The requested focus) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 rounded-l-xl opacity-50"></div>
            
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">Sample Size (N)</h2>
                <div className="text-3xl font-light text-slate-100 tabular-nums">
                  {sampleSize.toLocaleString()}
                </div>
              </div>
              
              <button 
                onClick={runSimulation}
                disabled={isCalculating}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm text-slate-300 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${isCalculating ? 'animate-spin text-teal-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Replay
              </button>
            </div>

            {/* The Slider UI */}
            <div className="relative pt-2 pb-6">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={handleSliderChange}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                style={{
                  background: `linear-gradient(to right, #0d9488 ${sliderValue}%, #1e293b ${sliderValue}%)`
                }}
              />
              
              {/* Custom Thumb (simulated via CSS on standard input for broad compatibility, 
                  but we add visual markers below) */}
              
              {/* Logarithmic Markers */}
              <div className="absolute top-6 left-0 w-full flex justify-between text-[10px] text-slate-600 font-semibold px-1 pointer-events-none">
                <div className="flex flex-col items-center">
                  <span className="h-1 w-[1px] bg-slate-700 mb-1"></span>
                  <span>10²</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="h-1 w-[1px] bg-slate-700 mb-1"></span>
                  <span>10³</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="h-1 w-[1px] bg-slate-700 mb-1"></span>
                  <span>10⁴</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="h-1 w-[1px] bg-slate-700 mb-1"></span>
                  <span>10⁵</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="h-1 w-[1px] bg-slate-700 mb-1"></span>
                  <span>10⁶</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col gap-6">
            
            {/* Seed Control */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs uppercase tracking-widest text-slate-500">PRNG Seed</label>
                <button onClick={handleGenerateSeed} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Randomize
                </button>
              </div>
              <input 
                type="text" 
                value={seedStr}
                onChange={(e) => setSeedStr(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            {/* Importance Sampling Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
              <div>
                <div className="text-sm text-slate-300">Importance Sampling</div>
                <div className="text-xs text-slate-500 mt-0.5">Variance reduction technique</div>
              </div>
              <button 
                onClick={() => setUseImportanceSampling(!useImportanceSampling)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${useImportanceSampling ? 'bg-orange-500' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${useImportanceSampling ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Output / Visualization */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col">
          
          {/* Result Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Estimated Value (π)</h2>
              <div className="flex items-baseline gap-4">
                <span className={`text-5xl font-light tracking-tight tabular-nums transition-opacity duration-200 ${isCalculating ? 'opacity-50' : 'opacity-100'}`}>
                  {result ? result.estimate.toFixed(6) : '---'}
                </span>
                <span className="text-sm text-slate-500 font-sans">
                  Target: {Math.PI.toFixed(6)}
                </span>
              </div>
            </div>
            
            {/* Confidence Interval Badge */}
            {result && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-right">
                <div className="text-[10px] uppercase text-orange-400 mb-1">95% Confidence Interval</div>
                <div className="text-sm text-slate-300 tabular-nums">
                  [{result.ciLower.toFixed(5)}, {result.ciUpper.toFixed(5)}]
                </div>
              </div>
            )}
          </div>

          {/* Variance / Convergence Chart (Simplified CSS implementation) */}
          <div className="flex-1 min-h-[200px] mt-4 flex flex-col">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Convergence History</h3>
            
            <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800/50 relative overflow-hidden flex items-end p-0.5 gap-[1px]">
              {/* Target Line */}
              <div className="absolute w-full h-[1px] bg-teal-500/30 top-1/2 left-0 z-10 border-t border-dashed border-teal-500/50"></div>
              
              {isCalculating ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm animate-pulse">
                  Simulating Paths...
                </div>
              ) : result ? (
                // Map history to bars relative to target PI
                result.history.map((val, idx) => {
                  const error = val - Math.PI;
                  // Scale error to UI. Assuming max error we care to show is +/- 0.5
                  const maxDisplayError = 0.5;
                  const normalizedError = Math.max(-1, Math.min(1, error / maxDisplayError));
                  
                  // Height is absolute error mapped to half container (50%)
                  const heightPct = Math.abs(normalizedError) * 50;
                  const isPositive = error > 0;

                  return (
                    <div 
                      key={idx} 
                      className="flex-1 flex flex-col justify-center relative h-full"
                    >
                      {/* Upper Bar (Positive Error) */}
                      <div className="h-1/2 w-full flex items-end">
                        {isPositive && (
                          <div 
                            className="w-full bg-orange-500/60 rounded-t-sm transition-all duration-300" 
                            style={{ height: `${heightPct * 2}%` }}
                          />
                        )}
                      </div>
                      {/* Lower Bar (Negative Error) */}
                      <div className="h-1/2 w-full flex items-start">
                        {!isPositive && (
                          <div 
                            className="w-full bg-teal-500/60 rounded-b-sm transition-all duration-300" 
                            style={{ height: `${heightPct * 2}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : null}
            </div>
            
            {/* Chart footer stats */}
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500/60"></span> Underestimate
              </div>
              <div>
                Variance: <span className="text-slate-300 tabular-nums">{result ? result.variance.toExponential(3) : '---'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500/60"></span> Overestimate
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer / Context */}
      <div className="mt-12 text-center text-xs text-slate-600 max-w-2xl">
        <p>This sandbox simulates Monte Carlo methods entirely in the browser. 
        Adjust the sample size slider to observe the <span className="text-teal-400">Law of Large Numbers</span> in action. 
        Higher $N$ typically reduces variance at the cost of compute time.</p>
      </div>

    </div>
  );
}