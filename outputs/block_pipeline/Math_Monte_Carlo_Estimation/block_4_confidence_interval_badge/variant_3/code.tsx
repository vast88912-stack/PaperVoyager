import React, { useState, useMemo } from 'react';
import { ShieldCheck, Crosshair, Activity, SlidersHorizontal, Info, Target } from 'lucide-react';

// --- Constants & Helpers ---

const Z_SCORES: Record<number, number> = {
  90: 1.645,
  95: 1.960,
  99: 2.576,
};

type ConfidenceLevel = 90 | 95 | 99;

interface CIBadgeProps {
  label: string;
  estimate: number;
  standardError: number;
  level: ConfidenceLevel;
  precision?: number;
}

// --- Confidence Interval Badge Component (The core module requested) ---

const ConfidenceBadge: React.FC<CIBadgeProps> = ({
  label,
  estimate,
  standardError,
  level,
  precision = 4,
}) => {
  const zScore = Z_SCORES[level];
  const marginOfError = zScore * standardError;
  const lowerBound = estimate - marginOfError;
  const upperBound = estimate + marginOfError;

  // For the visualizer bar, we scale based on +/- 3 Standard Errors to always show the context
  // of the distribution spread, regardless of the selected confidence level.
  const visualRangeSE = 3;
  
  // Calculate percentages for the CSS positioning
  const leftPercent = ((visualRangeSE - zScore) / (2 * visualRangeSE)) * 100;
  const widthPercent = ((2 * zScore) / (2 * visualRangeSE)) * 100;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 shadow-2xl backdrop-blur-md p-6 group transition-all duration-300 hover:border-teal-500/50 hover:shadow-teal-500/10">
      
      {/* Background ambient glow */}
      <div className="absolute -inset-1 bg-gradient-to-br from-teal-500/5 to-orange-500/5 blur-xl pointer-events-none group-hover:from-teal-500/10 group-hover:to-orange-500/10 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2 text-gray-400">
          <Activity className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-medium tracking-wider uppercase">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5" />
          {level}% CI
        </div>
      </div>

      {/* Main Values */}
      <div className="flex flex-col mb-6 relative z-10">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-3xl font-mono font-bold text-gray-100 tracking-tight">
            {estimate.toFixed(precision)}
          </span>
          <span className="text-sm font-mono text-gray-500 flex items-center gap-1">
            <span className="text-orange-400">±</span>
            {marginOfError.toFixed(precision)}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-500">Bounds:</span>
          <span className="text-teal-200 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
            [{lowerBound.toFixed(precision)}, {upperBound.toFixed(precision)}]
          </span>
        </div>
      </div>

      {/* Visualizer Bar */}
      <div className="relative z-10 w-full pt-4 pb-2">
        <div className="h-1.5 w-full bg-gray-800 rounded-full relative overflow-visible">
          {/* Confidence Interval Fill */}
          <div
            className="absolute top-0 h-full bg-teal-500/30 border-y border-teal-500/50 rounded-full transition-all duration-500 ease-out"
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
            }}
          >
            {/* Lower Bound Pip */}
            <div className="absolute -left-px top-1/2 -translate-y-1/2 w-[2px] h-3 bg-teal-400" />
            {/* Upper Bound Pip */}
            <div className="absolute -right-px top-1/2 -translate-y-1/2 w-[2px] h-3 bg-teal-400" />
          </div>

          {/* Center Point (Estimate) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-orange-500 rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.8)] z-10" />
        </div>
        
        {/* Scale labels */}
        <div className="flex justify-between mt-3 text-[10px] font-mono text-gray-600">
          <span>-3σ</span>
          <span className="text-orange-500/70">μ</span>
          <span>+3σ</span>
        </div>
      </div>
      
      {/* Footer stats */}
      <div className="mt-4 pt-4 border-t border-gray-800/50 flex justify-between items-center relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Std Error</span>
          <span className="text-xs font-mono text-gray-400">{standardError.toFixed(precision + 1)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Z-Score</span>
          <span className="text-xs font-mono text-gray-400">{zScore.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
};

// --- Interactive Demo Application ---

export default function App() {
  // Demo state simulating Monte Carlo simulation outputs
  const [estimate, setEstimate] = useState<number>(3.1415);
  const [samples, setSamples] = useState<number>(10000);
  const [baseVariance, setBaseVariance] = useState<number>(2.5);
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>(95);

  // Simulate calculating standard error based on sample size and variance
  // SE = sqrt(variance / n)
  const standardError = useMemo(() => {
    return Math.sqrt(baseVariance / samples);
  }, [samples, baseVariance]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-6 md:p-12 selection:bg-teal-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* App Header */}
        <header className="border-b border-gray-800 pb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-3">
              <Target className="text-orange-500 w-8 h-8" />
              Monte Carlo Estimator <span className="text-teal-500 font-bold">Lab</span>
            </h1>
            <p className="text-gray-500 mt-2 text-sm flex items-center gap-2">
              <Info className="w-4 h-4" />
              Module 5: Confidence Interval Badge Visualization (Variant 4)
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Section (Left Column) */}
          <div className="lg:col-span-5 space-y-6 bg-gray-900/40 border border-gray-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-gray-300 border-b border-gray-800 pb-3 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-teal-500" />
              <h2 className="text-lg font-medium">Simulation Parameters</h2>
            </div>

            {/* Control: Estimate */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-400">Simulated Estimate (μ)</label>
                <span className="font-mono text-xs text-teal-400 bg-teal-400/10 px-2 py-1 rounded">{estimate.toFixed(4)}</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="4.0"
                step="0.0001"
                value={estimate}
                onChange={(e) => setEstimate(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Control: Sample Size */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-400">Sample Size (n)</label>
                <span className="font-mono text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">{samples.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100"
                max="100000"
                step="100"
                value={samples}
                onChange={(e) => setSamples(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <p className="text-[10px] text-gray-600 font-mono">Higher n reduces Standard Error</p>
            </div>

            {/* Control: Variance */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-400">System Variance (σ²)</label>
                <span className="font-mono text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded">{baseVariance.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={baseVariance}
                onChange={(e) => setBaseVariance(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-gray-400"
              />
            </div>

            {/* Control: Confidence Level */}
            <div className="space-y-3 pt-4 border-t border-gray-800">
              <label className="text-sm font-medium text-gray-400 block mb-2">Target Confidence Level</label>
              <div className="grid grid-cols-3 gap-3">
                {[90, 95, 99].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidenceLevel(level as ConfidenceLevel)}
                    className={`py-2 rounded-lg text-sm font-mono transition-all duration-200 border ${
                      confidenceLevel === level
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                        : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Section (Right Column) */}
          <div className="lg:col-span-7 flex flex-col justify-center gap-6">
            
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-orange-500" />
              Live Telemetry Results
            </div>

            {/* THE MODULE IN ACTION */}
            <ConfidenceBadge
              label="Pi (π) Approximation"
              estimate={estimate}
              standardError={standardError}
              level={confidenceLevel}
              precision={4}
            />

            {/* Secondary instance to show reusability */}
            <div className="opacity-70 transform scale-95 origin-top mt-4">
              <ConfidenceBadge
                label="Call Option Price (Toy Model)"
                estimate={estimate * 14.2} // Just dummy data relative to primary
                standardError={standardError * 5.5}
                level={confidenceLevel}
                precision={2}
              />
            </div>

            <div className="mt-8 p-4 bg-gray-900/30 rounded-lg border border-gray-800/50 text-xs text-gray-500 font-mono leading-relaxed">
              <strong className="text-gray-300">Mathematical Note:</strong><br/>
              Confidence Interval = Estimate ± (Z-Score × Standard Error)<br/>
              SE is derived from $\sqrt{{\sigma^2}/{n}}$. The visual track spans ±3SE to guarantee 99.7% inclusion of normal variants, providing fixed spatial context as the interval width changes.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}