import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, Sliders, Activity, Crosshair } from 'lucide-react';

// --- Math & Quant Helpers ---

// Box-Muller transform for standard normal distribution
const randn_bm = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const Z_SCORES = {
  90: 1.645,
  95: 1.960,
  99: 2.576,
};

// --- Subcomponents ---

// The actual Confidence Interval Badge Component
const CIBadge = ({ 
  estimate, 
  marginOfError, 
  confidenceLevel, 
  trueValue, 
  se 
}: { 
  estimate: number, 
  marginOfError: number, 
  confidenceLevel: number, 
  trueValue: number,
  se: number
}) => {
  const lowerBound = estimate - marginOfError;
  const upperBound = estimate + marginOfError;
  const isCaptured = trueValue >= lowerBound && trueValue <= upperBound;

  // Visualization math for the error bar
  // We want to show a range of +/- 4 Standard Errors around the true value
  const viewRadius = se * 4; 
  const viewMin = trueValue - viewRadius;
  const viewMax = trueValue + viewRadius;
  const viewRange = viewMax - viewMin;

  const getPercent = (val: number) => Math.max(0, Math.min(100, ((val - viewMin) / viewRange) * 100));

  const lowerPct = getPercent(lowerBound);
  const upperPct = getPercent(upperBound);
  const estPct = getPercent(estimate);
  const truePct = getPercent(trueValue);

  return (
    <div className={`relative overflow-hidden rounded-xl border p-6 transition-all duration-500 ${
      isCaptured 
        ? 'bg-teal-950/20 border-teal-500/30 shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)]' 
        : 'bg-orange-950/20 border-orange-500/30 shadow-[0_0_30px_-10px_rgba(249,115,22,0.2)]'
    }`}>
      {/* Background Glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
        isCaptured ? 'bg-teal-500' : 'bg-orange-500'
      }`} />

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Confidence Interval
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
              isCaptured ? 'bg-teal-500/20 text-teal-300' : 'bg-orange-500/20 text-orange-300'
            }`}>
              {confidenceLevel}%
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-mono font-light text-slate-100">
              {estimate.toFixed(4)}
            </span>
            <span className="text-lg font-mono text-slate-500">
              ± {marginOfError.toFixed(4)}
            </span>
          </div>
        </div>

        <div className={`p-3 rounded-full ${
          isCaptured ? 'bg-teal-500/10 text-teal-400' : 'bg-orange-500/10 text-orange-400'
        }`}>
          {isCaptured ? <ShieldCheck size={28} /> : <AlertCircle size={28} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Lower Bound</div>
          <div className="font-mono text-sm text-slate-300">{lowerBound.toFixed(5)}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Upper Bound</div>
          <div className="font-mono text-sm text-slate-300">{upperBound.toFixed(5)}</div>
        </div>
      </div>

      {/* Visualizer Bar */}
      <div className="relative z-10">
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-2">
          <span>-4σ</span>
          <span className="text-teal-500/50 flex items-center gap-1"><Crosshair size={10}/> True Value</span>
          <span>+4σ</span>
        </div>
        
        <div className="h-2 w-full bg-slate-800 rounded-full relative">
          {/* True Value Marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-teal-500/50 z-0"
            style={{ left: `${truePct}%` }}
          />
          
          {/* Interval Bar */}
          <div 
            className={`absolute h-full rounded-full transition-all duration-500 ${
              isCaptured ? 'bg-teal-500/80' : 'bg-orange-500/80'
            }`}
            style={{ 
              left: `${lowerPct}%`, 
              width: `${upperPct - lowerPct}%` 
            }}
          />

          {/* Estimate Point */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all duration-500"
            style={{ left: `calc(${estPct}% - 4px)` }}
          />
        </div>
      </div>
      
      {!isCaptured && (
        <div className="mt-4 text-xs text-orange-400/80 flex items-center gap-2 bg-orange-950/30 p-2 rounded border border-orange-900/50">
          <AlertCircle size={14} />
          <span>Type I Error: True value fell outside the {confidenceLevel}% interval.</span>
        </div>
      )}
    </div>
  );
};


// --- Main App Component ---

export default function App() {
  // Simulation State
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [variance, setVariance] = useState<number>(2.5);
  const [confLevel, setConfLevel] = useState<90 | 95 | 99>(95);
  const [runId, setRunId] = useState<number>(0);

  // Constants for toy problem (Estimating Pi)
  const TRUE_VALUE = Math.PI;

  // Derived Quant Metrics
  const stdDev = Math.sqrt(variance);
  const standardError = stdDev / Math.sqrt(sampleSize);
  const zScore = Z_SCORES[confLevel];
  const marginOfError = zScore * standardError;

  // Current Estimate State
  const [estimate, setEstimate] = useState<number>(TRUE_VALUE);

  // Run Simulation
  const runSimulation = useCallback(() => {
    // Inject Gaussian noise based on standard error
    const noise = randn_bm() * standardError;
    setEstimate(TRUE_VALUE + noise);
  }, [standardError, TRUE_VALUE]);

  // Re-run when parameters change
  useEffect(() => {
    runSimulation();
  }, [runSimulation, runId]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-teal-500/30 p-4 md:p-8 flex items-center justify-center">
      
      <div className="max-w-3xl w-full grid gap-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 rounded-2xl border border-slate-800 mb-4 shadow-xl">
            <Activity className="text-teal-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Monte Carlo CI Engine
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Interactive visualization of Confidence Intervals. Adjust sample size and variance to see how the margin of error dynamically scales.
          </p>
        </header>

        <div className="grid md:grid-cols-[1fr_380px] gap-6 items-start">
          
          {/* Left Column: The Badge */}
          <div className="space-y-6">
            <CIBadge 
              estimate={estimate}
              marginOfError={marginOfError}
              confidenceLevel={confLevel}
              trueValue={TRUE_VALUE}
              se={standardError}
            />

            {/* Mini Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Standard Error</div>
                <div className="font-mono text-teal-400 text-sm">{standardError.toFixed(5)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Z-Score</div>
                <div className="font-mono text-orange-400 text-sm">{zScore.toFixed(3)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">True Value</div>
                <div className="font-mono text-slate-300 text-sm">{TRUE_VALUE.toFixed(5)}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
              <Sliders size={18} className="text-slate-400" />
              <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">Parameters</h2>
            </div>

            <div className="space-y-6">
              
              {/* Sample Size Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sample Size (N)</label>
                  <span className="font-mono text-xs text-teal-400 bg-teal-950/50 px-2 py-1 rounded">
                    {sampleSize.toLocaleString()}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="10000" 
                  step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              {/* Variance Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Variance (σ²)</label>
                  <span className="font-mono text-xs text-orange-400 bg-orange-950/50 px-2 py-1 rounded">
                    {variance.toFixed(1)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="10.0" 
                  step="0.1"
                  value={variance}
                  onChange={(e) => setVariance(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              {/* Confidence Level Toggle */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Confidence Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[90, 95, 99].map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfLevel(level as 90|95|99)}
                      className={`py-2 text-xs font-mono rounded-md transition-colors border ${
                        confLevel === level 
                          ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Replay Button */}
              <div className="pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setRunId(prev => prev + 1)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-700 hover:border-slate-600 active:scale-[0.98]"
                >
                  <RefreshCw size={16} className="text-teal-400" />
                  Resample Estimate
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}