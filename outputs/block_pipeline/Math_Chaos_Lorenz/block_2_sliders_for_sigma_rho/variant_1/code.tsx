import React, { useState, useEffect, useCallback } from 'react';
import { Share2, RotateCcw, Settings2, Activity } from 'lucide-react';

// --- Types & Constants ---
type Parameter = 'sigma' | 'rho' | 'beta';

interface ParamConfig {
  id: Parameter;
  name: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  default: number;
  color: string;
  glowColor: string;
}

const PARAMETERS: Record<Parameter, ParamConfig> = {
  sigma: {
    id: 'sigma',
    name: 'Prandtl Number',
    symbol: 'σ',
    min: 0,
    max: 50,
    step: 0.1,
    default: 10,
    color: 'text-cyan-400',
    glowColor: 'shadow-[0_0_15px_rgba(34,211,238,0.6)]',
  },
  rho: {
    id: 'rho',
    name: 'Rayleigh Number',
    symbol: 'ρ',
    min: 0,
    max: 100,
    step: 0.1,
    default: 28,
    color: 'text-fuchsia-400',
    glowColor: 'shadow-[0_0_15px_rgba(232,121,249,0.6)]',
  },
  beta: {
    id: 'beta',
    name: 'Geometric Factor',
    symbol: 'β',
    min: 0,
    max: 10,
    step: 0.001,
    default: 2.667, // 8/3
    color: 'text-emerald-400',
    glowColor: 'shadow-[0_0_15px_rgba(52,211,153,0.6)]',
  },
};

// --- Components ---

const GlowingSlider = ({
  config,
  value,
  onChange,
}: {
  config: ParamConfig;
  value: number;
  onChange: (val: number) => void;
}) => {
  const percentage = ((value - config.min) / (config.max - config.min)) * 100;

  return (
    <div className="flex flex-col gap-3 w-full group">
      <div className="flex justify-between items-end">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-serif italic font-bold ${config.color} drop-shadow-md`}>
            {config.symbol}
          </span>
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
            {config.name}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(Math.min(Math.max(val, config.min), config.max));
            }}
            className={`w-20 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right font-mono text-sm text-slate-200 focus:outline-none focus:border-${config.color.split('-')[1]}-500 transition-colors`}
            step={config.step}
          />
        </div>
      </div>

      <div className="relative h-6 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          {/* Active Track Fill */}
          <div
            className={`h-full ${config.color.replace('text-', 'bg-')} transition-all duration-75`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* The actual range input (invisible but interactive) */}
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`absolute w-full h-full appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-4 
            [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:${config.color.replace('text-', 'bg-')}
            [&::-webkit-slider-thumb]:${config.glowColor}
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:appearance-none 
            [&::-moz-range-thumb]:w-4 
            [&::-moz-range-thumb]:h-4 
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:${config.color.replace('text-', 'bg-')}
            [&::-moz-range-thumb]:${config.glowColor}
            [&::-moz-range-thumb]:transition-transform
            [&::-moz-range-thumb]:hover:scale-125
          `}
        />
      </div>
    </div>
  );
};

export default function App() {
  const [params, setParams] = useState({
    sigma: PARAMETERS.sigma.default,
    rho: PARAMETERS.rho.default,
    beta: PARAMETERS.beta.default,
  });

  const [copied, setCopied] = useState(false);

  // Initialize from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sigma = parseFloat(urlParams.get('sigma') || '');
    const rho = parseFloat(urlParams.get('rho') || '');
    const beta = parseFloat(urlParams.get('beta') || '');

    if (!isNaN(sigma) && !isNaN(rho) && !isNaN(beta)) {
      setParams({ sigma, rho, beta });
    }
  }, []);

  const handleParamChange = (key: Parameter, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const resetParams = () => {
    setParams({
      sigma: PARAMETERS.sigma.default,
      rho: PARAMETERS.rho.default,
      beta: PARAMETERS.beta.default,
    });
  };

  const shareConfiguration = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('sigma', params.sigma.toString());
    url.searchParams.set('rho', params.rho.toString());
    url.searchParams.set('beta', params.beta.toString());
    
    window.history.replaceState({}, '', url.toString());
    navigator.clipboard.writeText(url.toString());
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Main Control Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                <Settings2 className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold tracking-wide text-slate-100">System Parameters</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetParams}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors group relative"
                aria-label="Reset to defaults"
              >
                <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={shareConfiguration}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors relative"
                aria-label="Share configuration"
              >
                <Share2 className="w-4 h-4" />
                {copied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                    URL Copied!
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sliders Container */}
          <div className="p-6 space-y-8">
            <GlowingSlider
              config={PARAMETERS.sigma}
              value={params.sigma}
              onChange={(val) => handleParamChange('sigma', val)}
            />
            <GlowingSlider
              config={PARAMETERS.rho}
              value={params.rho}
              onChange={(val) => handleParamChange('rho', val)}
            />
            <GlowingSlider
              config={PARAMETERS.beta}
              value={params.beta}
              onChange={(val) => handleParamChange('beta', val)}
            />
          </div>

          {/* Live Equation Preview */}
          <div className="bg-slate-950/50 p-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Live Equations
            </div>
            <div className="font-mono text-sm space-y-2 pl-4 border-l-2 border-indigo-500/30">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">dx/dt =</span>
                <span className="text-cyan-400 font-bold">{params.sigma.toFixed(2)}</span>
                <span className="text-slate-300">(y - x)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">dy/dt =</span>
                <span className="text-slate-300">x(</span>
                <span className="text-fuchsia-400 font-bold">{params.rho.toFixed(2)}</span>
                <span className="text-slate-300">- z) - y</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">dz/dt =</span>
                <span className="text-slate-300">xy -</span>
                <span className="text-emerald-400 font-bold">{params.beta.toFixed(3)}</span>
                <span className="text-slate-300">z</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}