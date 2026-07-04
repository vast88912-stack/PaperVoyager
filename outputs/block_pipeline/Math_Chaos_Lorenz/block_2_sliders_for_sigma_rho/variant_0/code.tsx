import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, RotateCcw, Share2, Info, Activity } from 'lucide-react';

// Reusable custom slider component with glow effects
const ParameterSlider = ({
  label,
  symbol,
  value,
  min,
  max,
  step,
  onChange,
  colorClass,
  thumbColorClass,
  glowClass,
  desc
}: {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  colorClass: string;
  thumbColorClass: string;
  glowClass: string;
  desc: string;
}) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-3 mb-8 group">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-slate-200 tracking-wide">{label}</span>
            <span className={`font-serif italic text-xl ${thumbColorClass} drop-shadow-[0_0_8px_currentColor]`}>
              {symbol}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 group-hover:text-slate-400 transition-colors">
            {desc}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="w-20 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-sm font-mono text-slate-200 focus:outline-none focus:border-slate-500 transition-colors"
            step={step}
          />
        </div>
      </div>

      <div className="relative h-6 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          {/* Track Fill */}
          <div
            className={`absolute top-0 left-0 h-full ${colorClass} transition-all duration-75 ease-out`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Glowing Thumb (Visual) */}
        <div
          className={`absolute w-4 h-4 rounded-full bg-white border-2 ${thumbColorClass} ${glowClass} pointer-events-none transition-all duration-75 ease-out z-10`}
          style={{ left: `calc(${percent}% - 8px)` }}
        />

        {/* Actual Input (Invisible, for interaction) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />
      </div>
    </div>
  );
};

export default function App() {
  // Standard Lorenz attractor parameters
  const DEFAULT_SIGMA = 10;
  const DEFAULT_RHO = 28;
  const DEFAULT_BETA = 2.667; // 8/3

  const [sigma, setSigma] = useState(DEFAULT_SIGMA);
  const [rho, setRho] = useState(DEFAULT_RHO);
  const [beta, setBeta] = useState(DEFAULT_BETA);
  const [copied, setCopied] = useState(false);

  // Update URL query params when values change (mocking the export feature)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('s', sigma.toString());
    params.set('r', rho.toString());
    params.set('b', beta.toString());
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [sigma, rho, beta]);

  const handleReset = () => {
    setSigma(DEFAULT_SIGMA);
    setRho(DEFAULT_RHO);
    setBeta(DEFAULT_BETA);
  };

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-cyan-500/30">
      {/* Main Control Panel */}
      <div className="w-full max-w-md relative">
        {/* Ambient background glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-b from-cyan-500/20 via-fuchsia-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-50 pointer-events-none" />
        
        <div className="relative bg-[#0B1120]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Settings2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">System Parameters</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Activity className="w-3 h-3" />
                  Real-time chaotic tuning
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all duration-200 group"
                title="Reset to standard chaos"
              >
                <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all duration-200 relative"
                title="Copy shareable URL"
              >
                <Share2 className="w-4 h-4" />
                {copied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-2">
            <ParameterSlider
              label="Prandtl Number"
              symbol="σ"
              desc="Ratio of momentum diffusivity to thermal diffusivity."
              value={sigma}
              min={0}
              max={50}
              step={0.1}
              onChange={setSigma}
              colorClass="bg-gradient-to-r from-cyan-600 to-cyan-400"
              thumbColorClass="border-cyan-400 text-cyan-400"
              glowClass="shadow-[0_0_15px_rgba(34,211,238,0.6)]"
            />

            <ParameterSlider
              label="Rayleigh Number"
              symbol="ρ"
              desc="Proportional to the temperature difference."
              value={rho}
              min={0}
              max={100}
              step={0.1}
              onChange={setRho}
              colorClass="bg-gradient-to-r from-fuchsia-600 to-fuchsia-400"
              thumbColorClass="border-fuchsia-400 text-fuchsia-400"
              glowClass="shadow-[0_0_15px_rgba(232,121,249,0.6)]"
            />

            <ParameterSlider
              label="Geometric Factor"
              symbol="β"
              desc="Physical proportions of the convection cell."
              value={beta}
              min={0}
              max={10}
              step={0.001}
              onChange={setBeta}
              colorClass="bg-gradient-to-r from-emerald-600 to-emerald-400"
              thumbColorClass="border-emerald-400 text-emerald-400"
              glowClass="shadow-[0_0_15px_rgba(52,211,153,0.6)]"
            />
          </div>

          {/* Info Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start gap-3 bg-slate-900/30 p-3 rounded-xl">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Adjusting these parameters alters the differential equations governing the system. 
              Standard chaos occurs at <span className="text-cyan-400 font-mono">σ=10</span>, <span className="text-fuchsia-400 font-mono">ρ=28</span>, <span className="text-emerald-400 font-mono">β=2.667</span>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}