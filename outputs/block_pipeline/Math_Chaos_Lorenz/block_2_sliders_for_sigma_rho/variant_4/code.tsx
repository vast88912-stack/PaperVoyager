import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, RotateCcw, Share2, Activity, Info, Check } from 'lucide-react';

// --- Types ---
type Parameter = 'sigma' | 'rho' | 'beta';

interface ParamConfig {
  id: Parameter;
  symbol: string;
  name: string;
  min: number;
  max: number;
  step: number;
  default: number;
  color: string;
  glow: string;
  desc: string;
}

// --- Configuration ---
const PARAMETERS: ParamConfig[] = [
  {
    id: 'sigma',
    symbol: 'σ',
    name: 'Sigma',
    min: 1,
    max: 50,
    step: 0.1,
    default: 10,
    color: '#22d3ee', // cyan-400
    glow: 'rgba(34, 211, 238, 0.5)',
    desc: 'Prandtl number (momentum vs thermal diffusivity)',
  },
  {
    id: 'rho',
    symbol: 'ρ',
    name: 'Rho',
    min: 1,
    max: 100,
    step: 0.1,
    default: 28,
    color: '#d946ef', // fuchsia-500
    glow: 'rgba(217, 70, 239, 0.5)',
    desc: 'Rayleigh number (temperature difference)',
  },
  {
    id: 'beta',
    symbol: 'β',
    name: 'Beta',
    min: 0.1,
    max: 10,
    step: 0.01,
    default: 2.667, // 8/3
    color: '#34d399', // emerald-400
    glow: 'rgba(52, 211, 153, 0.5)',
    desc: 'Geometric factor (convective cell proportion)',
  },
];

// --- Subcomponents ---

const GlowingSlider = ({
  config,
  value,
  onChange,
}: {
  config: ParamConfig;
  value: number;
  onChange: (val: number) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const percentage = ((value - config.min) / (config.max - config.min)) * 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div 
      className="flex flex-col gap-3 py-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <span 
            className="text-2xl font-serif italic transition-all duration-300"
            style={{ 
              color: config.color,
              textShadow: isHovered ? `0 0 12px ${config.glow}` : 'none'
            }}
          >
            {config.symbol}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200 tracking-wide uppercase">
              {config.name}
            </span>
            <span className="text-xs text-slate-500 font-light flex items-center gap-1">
              <Info size={10} className="inline" />
              {config.desc}
            </span>
          </div>
        </div>
        <div 
          className="font-mono text-lg font-semibold bg-slate-900/80 px-3 py-1 rounded-md border border-slate-700/50 min-w-[5rem] text-right"
          style={{ 
            color: config.color,
            boxShadow: isHovered ? `inset 0 0 10px ${config.glow.replace('0.5', '0.2')}` : 'none'
          }}
        >
          {value.toFixed(config.step >= 0.1 ? 1 : 2)}
        </div>
      </div>

      <div className="relative w-full h-6 flex items-center group">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={handleInputChange}
          className={`absolute w-full h-full opacity-0 cursor-pointer z-20`}
        />
        {/* Custom Track Background */}
        <div className="absolute w-full h-1.5 bg-slate-800 rounded-full overflow-hidden z-0 shadow-inner">
          <div 
            className="h-full rounded-full transition-all duration-75 ease-out"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: config.color,
              boxShadow: `0 0 10px ${config.glow}`
            }}
          />
        </div>
        {/* Custom Thumb */}
        <div 
          className="absolute h-4 w-4 rounded-full z-10 transition-transform duration-100"
          style={{ 
            left: `calc(${percentage}% - 8px)`,
            backgroundColor: '#fff',
            border: `2px solid ${config.color}`,
            boxShadow: `0 0 12px ${isHovered ? 4 : 2}px ${config.glow}`,
            transform: isHovered ? 'scale(1.2)' : 'scale(1)'
          }}
        />
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function App() {
  const [params, setParams] = useState<Record<Parameter, number>>({
    sigma: PARAMETERS.find(p => p.id === 'sigma')!.default,
    rho: PARAMETERS.find(p => p.id === 'rho')!.default,
    beta: PARAMETERS.find(p => p.id === 'beta')!.default,
  });

  const [shared, setShared] = useState(false);

  // Parse URL queries on mount for initial state (Simulation of shareable URLs)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialParams = { ...params };
    let hasUpdates = false;

    PARAMETERS.forEach(({ id }) => {
      const val = searchParams.get(id);
      if (val !== null) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          initialParams[id] = num;
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      setParams(initialParams);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleParamChange = useCallback((id: Parameter, val: number) => {
    setParams(prev => ({ ...prev, [id]: val }));
  }, []);

  const handleReset = () => {
    setParams({
      sigma: PARAMETERS.find(p => p.id === 'sigma')!.default,
      rho: PARAMETERS.find(p => p.id === 'rho')!.default,
      beta: PARAMETERS.find(p => p.id === 'beta')!.default,
    });
  };

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sigma', params.sigma.toString());
    url.searchParams.set('rho', params.rho.toString());
    url.searchParams.set('beta', params.beta.toString());
    
    // In a real app we'd push state or copy to clipboard
    window.history.replaceState({}, '', url.toString());
    navigator.clipboard.writeText(url.toString());
    
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background ambient glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-900/20 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="w-full max-w-lg relative z-10">
        
        {/* Holographic glowing border effect around the card */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-slate-700 to-slate-900 rounded-3xl opacity-50 blur-[2px]" />
        
        <div className="relative bg-[#0b0c10]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <Settings2 className="text-slate-300 w-5 h-5 z-10" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  System Parameters
                </h2>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium tracking-wider uppercase mt-1">
                  <Activity size={12} className="animate-pulse" />
                  Live Sensitivity Control
                </div>
              </div>
            </div>
          </div>

          {/* Sliders Container */}
          <div className="flex flex-col gap-6">
            {PARAMETERS.map(config => (
              <GlowingSlider
                key={config.id}
                config={config}
                value={params[config.id]}
                onChange={(val) => handleParamChange(config.id, val)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent my-8 opacity-50" />

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-700 transition-all duration-200 group"
            >
              <RotateCcw size={16} className="group-hover:-rotate-90 transition-transform duration-300" />
              Reset Defaults
            </button>
            
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 border ${
                shared 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-400 hover:text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
              }`}
            >
              {shared ? (
                <>
                  <Check size={16} />
                  Copied URL!
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  Export State
                </>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}