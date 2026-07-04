import React, { useState, useMemo, useEffect, useCallback } from 'react';

// --- Simple PRNG for Reproducible Replays ---
function mulberry32(a: number) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function App() {
  const [sampleSize, setSampleSize] = useState<number>(5000);
  const [seed, setSeed] = useState<number>(1337);
  const [useVarianceReduction, setUseVarianceReduction] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(5000);

  // Replay animation trigger
  const handleReplay = useCallback(() => {
    setIsAnimating(true);
    setCurrentStep(100);
    setSeed(prev => prev + 1); // change seed slightly for a new run
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    let animationId: number;
    const animate = () => {
      setCurrentStep(prev => {
        const next = prev + Math.max(100, Math.floor(sampleSize / 30));
        if (next >= sampleSize) {
          setIsAnimating(false);
          return sampleSize;
        }
        return next;
      });
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isAnimating, sampleSize]);

  // Handle manual slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSampleSize(val);
    if (!isAnimating) setCurrentStep(val);
  };

  // --- Monte Carlo Simulation Logic ---
  const simulationData = useMemo(() => {
    const rng = mulberry32(seed);
    const history = [];
    let cumulativeHits = 0;
    
    // Theoretical Standard Deviation for PI estimation
    // Standard MC: Var = pi/4 * (1 - pi/4) * 16 ~= 2.69. StdDev ~= 1.64
    // Antithetic MC: Empirically reduces variance by about half. StdDev ~= 0.82
    const theoreticalStdDev = useVarianceReduction ? 0.82 : 1.64;

    const stepSize = Math.max(10, Math.floor(sampleSize / 200));

    for (let i = 1; i <= sampleSize; i++) {
      const x = rng();
      const y = rng();

      if (useVarianceReduction) {
        // Antithetic Variates for Pi
        const hit1 = (x * x + y * y <= 1) ? 1 : 0;
        const hit2 = ((1 - x) * (1 - x) + (1 - y) * (1 - y) <= 1) ? 1 : 0;
        cumulativeHits += (hit1 + hit2) / 2;
      } else {
        // Standard Uniform
        if (x * x + y * y <= 1) cumulativeHits++;
      }

      // Record history at intervals for chart performance
      if (i % stepSize === 0 || i === sampleSize) {
        const estimate = (cumulativeHits / i) * 4;
        const standardError = theoreticalStdDev / Math.sqrt(i);
        history.push({
          n: i,
          estimate,
          upper: Math.PI + 1.96 * standardError,
          lower: Math.PI - 1.96 * standardError,
          se: standardError
        });
      }
    }
    return history;
  }, [sampleSize, seed, useVarianceReduction]);

  // Filter data up to the current animation step
  const visibleData = simulationData.filter(d => d.n <= currentStep);
  const finalPoint = visibleData[visibleData.length - 1] || { estimate: 0, se: 0, n: 0 };
  const currentError = Math.abs(finalPoint.estimate - Math.PI);

  // --- SVG Chart Configuration ---
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 20, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Scales
  const minEstimate = Math.PI - 0.4;
  const maxEstimate = Math.PI + 0.4;
  
  const mapX = (n: number) => padding.left + (n / sampleSize) * innerWidth;
  const mapY = (val: number) => {
    const clamped = Math.max(minEstimate, Math.min(maxEstimate, val));
    return padding.top + innerHeight - ((clamped - minEstimate) / (maxEstimate - minEstimate)) * innerHeight;
  };

  // Paths
  const estimatePath = visibleData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${mapX(d.n)},${mapY(d.estimate)}`).join(' ');
  const upperPts = visibleData.map(d => `${mapX(d.n)},${mapY(d.upper)}`);
  const lowerPts = visibleData.map(d => `${mapX(d.n)},${mapY(d.lower)}`).reverse();
  const ciAreaPath = visibleData.length > 0 ? `M ${upperPts.join(' ')} L ${lowerPts.join(' ')} Z` : '';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6 selection:bg-teal-500/30">
      
      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-teal-500 animate-pulse"></span>
            Monte Carlo Estimator Lab
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest">Variance Chart Analysis // Variant #4</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg flex items-center gap-3 shadow-lg">
            <span className="text-xs text-slate-400 font-mono">SEED</span>
            <span className="text-teal-400 font-mono font-bold">0x{seed.toString(16).toUpperCase()}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: CONTROLS & STATS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Controls Card */}
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
            <h2 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Parameters
            </h2>

            {/* Sample Size Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs text-slate-400 font-semibold">Sample Size (N)</label>
                <span className="text-teal-400 font-mono text-sm font-bold">{sampleSize.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={sampleSize}
                onChange={handleSliderChange}
                disabled={isAnimating}
                className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-50"
              />
            </div>

            {/* Importance Sampling Toggle */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Variance Reduction</label>
                <span className="text-[10px] text-slate-500 block leading-tight">Use Antithetic Variates</span>
              </div>
              <button
                onClick={() => { if (!isAnimating) setUseVarianceReduction(!useVarianceReduction); }}
                disabled={isAnimating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useVarianceReduction ? 'bg-teal-500' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useVarianceReduction ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Replay Button */}
            <button
              onClick={handleReplay}
              disabled={isAnimating}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 shadow-lg shadow-orange-500/20"
            >
              <svg className={`w-5 h-5 ${isAnimating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isAnimating ? 'Computing...' : 'Replay Simulation'}
            </button>
          </div>

          {/* Metrics Panel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/80 border-l-4 border-teal-500 p-4 rounded-r-xl shadow-md">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Current Est. (π)</p>
              <p className="text-xl text-white font-mono">{finalPoint.estimate.toFixed(5)}</p>
            </div>
            <div className="bg-slate-800/80 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-md">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Absolute Error</p>
              <p className="text-xl text-white font-mono">{currentError.toFixed(5)}</p>
            </div>
            <div className="col-span-2 bg-slate-800/80 border border-slate-700 p-4 rounded-xl shadow-md flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">95% Confidence Interval</p>
                <p className="text-sm text-slate-300 font-mono">
                  ± {(1.96 * finalPoint.se).toFixed(5)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md bg-teal-500/10 text-teal-400 text-xs font-mono font-medium border border-teal-500/20">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Bounds
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: VARIANCE CHART */}
        <div className="lg:col-span-8 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Convergence & Variance
            </h2>
            <div className="flex gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-orange-500"></div> True π
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-teal-400"></div> Estimate
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-teal-500/20 border border-teal-500/50 rounded-sm"></div> 95% CI
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 relative min-h-[400px]">
            {/* The SVG Chart */}
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.15" />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
                </linearGradient>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect x={padding.left} y={padding.top} width={innerWidth} height={innerHeight} fill="url(#grid)" />

              {/* Y-Axis Guidelines & Labels */}
              {[minEstimate, Math.PI - 0.2, Math.PI, Math.PI + 0.2, maxEstimate].map((val, i) => {
                const y = mapY(val);
                return (
                  <g key={`y-${i}`}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray={val === Math.PI ? "none" : "4 4"} />
                    <text x={padding.left - 10} y={y} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="end" alignmentBaseline="middle">
                      {val.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Guidelines & Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const nVal = Math.floor(sampleSize * pct);
                const x = mapX(nVal);
                return (
                  <g key={`x-${i}`}>
                    <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={x} y={height - padding.bottom + 20} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">
                      {nVal >= 1000 ? `${(nVal/1000).toFixed(nVal%1000===0?0:1)}k` : nVal}
                    </text>
                  </g>
                );
              })}

              {/* Data Visualization */}
              {visibleData.length > 0 && (
                <>
                  {/* True Value Line (Orange) */}
                  <line 
                    x1={padding.left} 
                    y1={mapY(Math