import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants & Helper Math ---
const TRUE_PI = Math.PI;

const Z_SCORES = {
  90: 1.645,
  95: 1.960,
  99: 2.576,
};

const SAMPLE_SIZES = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

// Format number with commas
const fmtN = (n) => new Intl.NumberFormat('en-US').format(n);

// Format decimal to precise fixed places
const fmtDec = (n, places = 4) => Number(n).toFixed(places);

export default function App() {
  const [sampleIdx, setSampleIdx] = useState(3); // Default 5000
  const [confLevel, setConfLevel] = useState(95);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [stats, setStats] = useState({
    estimate: 0,
    se: 0,
    marginOfError: 0,
    lowerBound: 0,
    upperBound: 0,
    isCovered: true,
  });

  const sampleSize = SAMPLE_SIZES[sampleIdx];

  // Monte Carlo Simulation for Pi
  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    
    // Simulate delay for visual effect
    setTimeout(() => {
      let pointsInside = 0;
      for (let i = 0; i < sampleSize; i++) {
        const x = Math.random();
        const y = Math.random();
        if (x * x + y * y <= 1) {
          pointsInside++;
        }
      }
      
      const p = pointsInside / sampleSize;
      const estimate = p * 4;
      
      // Standard Error of Pi estimate
      // SE(p) = sqrt(p * (1-p) / N)
      // SE(Pi) = 4 * SE(p)
      const se = 4 * Math.sqrt((p * (1 - p)) / sampleSize);
      
      const z = Z_SCORES[confLevel];
      const marginOfError = z * se;
      const lowerBound = estimate - marginOfError;
      const upperBound = estimate + marginOfError;
      
      // Frequentist coverage check
      const isCovered = TRUE_PI >= lowerBound && TRUE_PI <= upperBound;

      setStats({
        estimate,
        se,
        marginOfError,
        lowerBound,
        upperBound,
        isCovered,
      });
      
      setIsSimulating(false);
    }, 150); // slight artificial delay for button feedback
  }, [sampleSize, confLevel]);

  // Run on mount and when parameters change
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // --- Visual Bar Math ---
  // To render the CI visually, we need a fixed scale. 
  // We'll center it on True Pi and set bounds based on the max possible error at low N.
  const visualMaxError = 4 * Math.sqrt((0.785 * (1 - 0.785)) / SAMPLE_SIZES[0]) * Z_SCORES[99];
  const chartMin = TRUE_PI - visualMaxError * 1.1;
  const chartMax = TRUE_PI + visualMaxError * 1.1;
  const chartRange = chartMax - chartMin;
  
  const getPercent = (val) => Math.max(0, Math.min(100, ((val - chartMin) / chartRange) * 100));

  const truePiPct = getPercent(TRUE_PI);
  const estPct = getPercent(stats.estimate);
  const lowerPct = getPercent(stats.lowerBound);
  const upperPct = getPercent(stats.upperBound);
  const ciWidth = Math.max(0.5, upperPct - lowerPct); // min width for visibility

  // Theme colors based on coverage
  const themeColor = stats.isCovered ? 'teal' : 'orange';
  const borderClass = stats.isCovered ? 'border-teal-500/50' : 'border-orange-500/50';
  const shadowClass = stats.isCovered ? 'shadow-[0_0_30px_rgba(20,184,166,0.15)]' : 'shadow-[0_0_30px_rgba(249,115,22,0.15)]';
  const textClass = stats.isCovered ? 'text-teal-400' : 'text-orange-400';
  const bgClass = stats.isCovered ? 'bg-teal-500/20' : 'bg-orange-500/20';
  const barClass = stats.isCovered ? 'bg-teal-400' : 'bg-orange-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 flex flex-col items-center justify-center selection:bg-teal-900 selection:text-teal-200">
      
      {/* Header */}
      <div className="mb-10 text-center max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Monte Carlo Estimator <span className="text-slate-500">/</span> <span className="text-teal-400">CI Badge</span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Simulating the estimation of <span className="font-mono text-orange-300">π</span> using dart-throwing logic. 
          Observe how the Confidence Interval (CI) shrinks as sample size (<span className="font-mono text-teal-300">N</span>) increases, 
          and watch for frequentist misses (orange) when the true value falls outside our bounds.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-8">
          
          {/* Controls Title */}
          <div className="flex items-center gap-2 text-slate-300 font-semibold uppercase tracking-wider text-xs">
            <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Experiment Parameters
          </div>

          {/* Sample Size Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-slate-400">Sample Size (N)</label>
              <span className="font-mono text-teal-400 font-semibold">{fmtN(sampleSize)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={SAMPLE_SIZES.length - 1} 
              step="1"
              value={sampleIdx}
              onChange={(e) => setSampleIdx(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-all"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{fmtN(SAMPLE_SIZES[0])}</span>
              <span>{fmtN(SAMPLE_SIZES[SAMPLE_SIZES.length - 1])}</span>
            </div>
          </div>

          {/* Confidence Level Toggle */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400">Confidence Level</label>
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {[90, 95, 99].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setConfLevel(lvl)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    confLevel === lvl 
                      ? 'bg-teal-500/20 text-teal-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {lvl}%
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all
                ${isSimulating 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 shadow-lg'
                }`}
            >
              <svg 
                className={`w-4 h-4 ${isSimulating ? 'animate-spin text-slate-500' : 'text-teal-400'}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isSimulating ? 'Simulating...' : 'Re-run Simulation'}
            </button>
          </div>
        </div>

        {/* Right Column: The Badge */}
        <div className="lg:col-span-8 flex items-center justify-center p-4">
          
          <div className={`relative w-full max-w-2xl rounded-3xl bg-slate-900 border ${borderClass} ${shadowClass} transition-all duration-500 overflow-hidden`}>
            
            {/* Background Glow Effects */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 bg-${themeColor}-500 transition-colors duration-500`}></div>
            <div className={`absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-10 bg-${themeColor}-500 transition-colors duration-500`}></div>

            <div className="relative z-10 p-8 sm:p-10">
              
              {/* Badge Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderClass} ${bgClass} ${textClass} text-xs font-bold uppercase tracking-widest`}>
                  <span className={`w-2 h-2 rounded-full ${barClass} ${stats.isCovered ? 'animate-pulse' : ''}`}></span>
                  {confLevel}% CI Badge
                </div>
                
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  <span className="text-slate-500">TRUE π:</span>
                  <span className="text-slate-300">{fmtDec(TRUE_PI, 6)}</span>
                </div>
              </div>

              {/* Main Numbers */}
              <div className="flex flex-col items-center justify-center text-center mb-10">
                <h3 className="text-slate-500 text-sm uppercase tracking-widest font-semibold mb-2">Estimated Value</h3>
                <div className="flex items-baseline justify-center gap-3">
                  <span className={`text-6xl sm:text-7xl font-mono font-bold tracking-tight ${textClass} transition-colors duration-300`}>
                    {fmtDec(stats.estimate, 5)}
                  </span>
                </div>
                <div className={`mt-3 flex items-center gap-2 text-xl font-mono ${textClass} opacity-80`}>
                  <span>±</span>
                  <span>{fmtDec(stats.marginOfError, 5)}</span>
                  <span className="text-xs text-slate-500 uppercase ml-2 tracking-wider">Margin</span>
                </div>
              </div>

              {/* Visual Distribution Bar */}
              <div className="relative mt-8 mb-4">
                {/* Scale Markers Top */}
                <div className="absolute -top-6 w-full flex justify-between text-[10px] text-slate-600 font-mono">
                  <span>{fmtDec(chartMin, 2)}</span>
                  <span>{fmtDec(chartMax, 2)}</span>
                </div>

                {/* Main Track */}
                <div className="relative h-6 bg-slate-800 rounded-full border border-slate-700/50 overflow-hidden shadow-inner">
                  
                  {/* CI Interval Fill */}
                  <div 
                    className={`absolute h-full ${bgClass} transition-all duration-500 ease-out flex items-center justify-center border-x ${borderClass}`}
                    style={{ left: `${lowerPct}%`, width: `${ciWidth}%` }}
                  >
                    {/* Pattern inside CI to make it look technical */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '8px 8px' }}></div>
                  </div>

                  {/* Estimate Point (Center of CI) */}
                  <div 
                    className={`absolute top-0 bottom-0 w-1 ${barClass} transform -translate-x-1/2 z-20 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
                    style={{ left: `${estPct}%` }}
                  ></div>

                  {/* True Value Line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-orange-500 transform -translate-x-1/2 z-10 shadow-[0_0_8px_#f97316]"
                    style={{ left: `${truePiPct}%` }}
                  ></div>
                </div>

                {/* Legends under bar */}
                <div className="relative h-12 mt-2">
                  <div 
                    className="absolute transform -translate-x-1/2 text-xs font-mono text-slate-400 transition-all duration-500 ease-out"
                    style={{ left: `${lowerPct}%` }}
                  >
                    <div className="h-2 border-l border-slate-600 mx-auto mb-1"></div>
                    {fmtDec(stats.lowerBound, 4)}
                  </div>
                  
                  <div 
                    className="absolute transform -translate-x-1/2 text-xs font-mono text-slate-400 transition-all duration-500 ease-out"
                    style={{ left: `${upperPct}%` }}
                  >
                    <div className="h-2 border-l border-slate-600 mx-auto mb-1"></div>
                    {fmtDec(stats.upperBound, 4)}
                  </div>

                  {/* True Value Legend */}
                  <div 
                    className="absolute top-6 transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${truePiPct}%` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mb-1"></div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">True</span>
                  </div>
                </div>

              </div>

              {/* Status Message */}
              <div className={`mt-6 p-4 rounded-xl border ${borderClass} bg-slate-950/50 flex items-start gap-3`}>
                <div className={`mt-0.5 p-1 rounded-full ${bgClass} ${textClass}`}>
                  {stats.isCovered ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${textClass} uppercase tracking-wide`}>
                    {stats.isCovered ? 'Successful Coverage' : 'Interval Missed True Value'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {stats.isCovered 
                      ? `The true parameter (π) lies within the calculated ${confLevel}% confidence interval. In repeated sampling, we expect this to happen ${confLevel}% of the time.`
                      : `Statistical anomaly! The true parameter (π) fell strictly outside the generated bounds. At ${confLevel}% confidence, we expect this to occur ${100 - confLevel}% of the time.`}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}