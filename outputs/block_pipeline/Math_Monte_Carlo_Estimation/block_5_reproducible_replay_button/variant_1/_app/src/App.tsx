import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Pseudo-Random Number Generator (Mulberry32) ---
// Allows us to seed the random number generator for reproducible replays.
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Icons (Inline SVGs to ensure zero dependencies) ---
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const ReplayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
);
const DnaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"></path><path d="M9 22c1.798-1.998 2.518-3.995 2.808-5.993"></path><path d="M15 2c-1.798 1.998-2.518 3.995-2.808 5.993"></path><path d="m17 6-2.5-2.5"></path><path d="m14 8-1-1"></path><path d="m7 18 2.5 2.5"></path><path d="m3.5 14.5.5.5"></path><path d="m20 9 .5.5"></path><path d="m6.5 12.5 2 2"></path><path d="m15.5 11.5 2 2"></path><path d="m10 16 1.5 1.5"></path><path d="m12.5 8 1.5 1.5"></path></svg>
);
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
);

export default function App() {
  // --- State ---
  const [targetSamples, setTargetSamples] = useState<number>(5000);
  const [currentSeed, setCurrentSeed] = useState<number>(1337);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  
  // Simulation Results
  const [samplesDone, setSamplesDone] = useState<number>(0);
  const [estimate, setEstimate] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [confidenceInterval, setConfidenceInterval] = useState<number>(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // --- Core Simulation Logic ---
  const runSimulation = useCallback((seedToUse: number, isReplay: boolean) => {
    // Cleanup previous run
    if (animRef.current) cancelAnimationFrame(animRef.current);
    
    setIsRunning(true);
    setIsReplayMode(isReplay);
    setCurrentSeed(seedToUse);
    setSamplesDone(0);
    setEstimate(0);
    setHistory([]);
    setConfidenceInterval(0);

    const prng = mulberry32(seedToUse);
    let count = 0;
    let inside = 0;
    const localHistory: number[] = [];

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw unit circle boundary
      ctx.strokeStyle = '#334155'; // slate-700
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, 2 * Math.PI);
      ctx.stroke();
    }

    const loop = () => {
      // Process in chunks to maintain 60FPS while animating quickly
      const chunkSize = Math.max(10, Math.floor(targetSamples / 120)); 
      let chunkInside = 0;

      if (!ctx || !canvas) return;

      for (let i = 0; i < chunkSize && count < targetSamples; i++) {
        // Generate values between -1 and 1
        const x = prng() * 2 - 1;
        const y = prng() * 2 - 1;
        const inCircle = x * x + y * y <= 1;
        
        if (inCircle) chunkInside++;

        // Map to canvas coordinates
        const cx = (x + 1) * (canvas.width / 2);
        const cy = (y + 1) * (canvas.height / 2);

        // Draw point (Teal if inside, Orange if outside)
        ctx.fillStyle = inCircle ? '#2dd4bf' : '#fb923c';
        ctx.fillRect(cx, cy, 2, 2);

        count++;
      }

      inside += chunkInside;
      const currentPi = (inside / count) * 4;

      // Update state periodically to avoid React overhead
      if (count % (chunkSize * 2) === 0 || count === targetSamples) {
        localHistory.push(currentPi);
        setHistory([...localHistory]);
        setEstimate(currentPi);
        setSamplesDone(count);
        
        // Calculate 95% Confidence Interval (Z = 1.96)
        // p = inside/count. SE = sqrt(p*(1-p)/n). CI for Pi = 4 * 1.96 * SE
        const p = inside / count;
        const se = Math.sqrt((p * (1 - p)) / count);
        setConfidenceInterval(4 * 1.96 * se);
      }

      if (count < targetSamples) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        setIsRunning(false);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  }, [targetSamples]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Handlers
  const handleNewRun = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    runSimulation(newSeed, false);
  };

  const handleReplay = () => {
    runSimulation(currentSeed, true);
  };

  const handleStop = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsRunning(false);
  };

  // --- Rendering Helpers ---
  const renderVarianceChart = () => {
    if (history.length === 0) return null;
    
    const width = 300;
    const height = 100;
    const minVal = 2.8;
    const maxVal = 3.5;
    
    const points = history.map((val, i) => {
      const x = (i / Math.max(1, history.length - 1)) * width;
      // Clamp value for visual stability
      const clampedVal = Math.max(minVal, Math.min(maxVal, val));
      const y = height - ((clampedVal - minVal) / (maxVal - minVal)) * height;
      return `${x},${y}`;
    }).join(' ');

    const piY = height - ((Math.PI - minVal) / (maxVal - minVal)) * height;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        {/* True Pi Line */}
        <line x1="0" y1={piY} x2={width} y2={piY} stroke="#fb923c" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
        {/* Estimate Trajectory */}
        <polyline points={points} fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 selection:bg-teal-500/30">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex items-end justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Monte Carlo Estimator Lab
            <span className="text-xs font-mono bg-teal-500/10 text-teal-400 px-2 py-1 rounded border border-teal-500/20">
              v2.0.1
            </span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Quant-minded frontend engineering demo</p>
        </div>
        
        {/* Mock Tabs */}
        <div className="flex gap-2">
          <div className="px-4 py-2 text-sm font-medium bg-slate-800 text-teal-400 rounded-t-lg border-t border-l border-r border-slate-700 cursor-default">
            Pi Estimation
          </div>
          <div className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 cursor-not-allowed">
            Area Under Curve
          </div>
          <div className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 cursor-not-allowed">
            Option Pricing (Toy)
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualization */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            
            {/* Replay Mode Indicator */}
            <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${isReplayMode ? 'bg-orange-500' : 'bg-teal-500'}`} />
            {isReplayMode && (
              <div className="absolute top-4 right-4 flex items-center gap-2 text-orange-400 text-xs font-bold tracking-wider animate-pulse">
                <ReplayIcon /> REPLAY MODE ACTIVE
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Scatter Plot Sequence</h2>
              <div className="text-sm font-mono text-slate-400">
                N = {samplesDone.toLocaleString()} / {targetSamples.toLocaleString()}
              </div>
            </div>

            <div className="aspect-square w-full max-w-[500px] mx-auto bg-slate-950 rounded-lg border-2 border-slate-800 flex items-center justify-center relative shadow-inner">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={800} 
                className="w-full h-full object-contain p-4"
              />
              {samplesDone === 0 && !isRunning && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-sm">
                  Awaiting simulation start...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Module 6 Focus: Reproducible Replay Button & Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DnaIcon /> Simulation Control Deck
            </h3>
            
            <div className="space-y-6">
              {/* Sample Size Slider */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <label className="text-slate-300">Sample Size (N)</label>
                  <span className="font-mono text-teal-400">{targetSamples.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="50000" 
                  step="1000"
                  value={targetSamples}
                  onChange={(e) => setTargetSamples(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="w-full accent-teal-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Seed Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-slate-500">Current PRNG Seed:</span>
                <span className="font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                  {currentSeed}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {isRunning ? (
                  <button 
                    onClick={handleStop}
                    className="col-span-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    Stop Execution
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleNewRun}
                      className="bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20"
                    >
                      <PlayIcon /> New Run
                    </button>
                    
                    {/* The Core Feature: Reproducible Replay */}
                    <button 
                      onClick={handleReplay}
                      disabled={samplesDone === 0}
                      className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 group relative"
                    >
                      <ReplayIcon /> Replay Exact
                      
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-slate-200 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700">
                        Re-run with seed {currentSeed}
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Variance Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-