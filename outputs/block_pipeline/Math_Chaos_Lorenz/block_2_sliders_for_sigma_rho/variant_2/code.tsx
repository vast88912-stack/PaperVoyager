import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Share2, RotateCcw, Activity } from 'lucide-react';

// --- Types & Constants ---

type Parameter = {
  id: string;
  name: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  color: string;
  glowColor: string;
};

const PARAMETERS: Record<string, Parameter> = {
  sigma: {
    id: 'sigma',
    name: 'Prandtl Number',
    symbol: 'σ',
    min: 0,
    max: 50,
    step: 0.1,
    defaultValue: 10.0,
    color: '#0ea5e9', // Sky 500
    glowColor: 'rgba(14, 165, 233, 0.6)',
  },
  rho: {
    id: 'rho',
    name: 'Rayleigh Number',
    symbol: 'ρ',
    min: 0,
    max: 100,
    step: 0.1,
    defaultValue: 28.0,
    color: '#d946ef', // Fuchsia 500
    glowColor: 'rgba(217, 70, 239, 0.6)',
  },
  beta: {
    id: 'beta',
    name: 'Geometric Factor',
    symbol: 'β',
    min: 0,
    max: 10,
    step: 0.01,
    defaultValue: 2.67, // 8/3
    color: '#10b981', // Emerald 500
    glowColor: 'rgba(16, 185, 129, 0.6)',
  },
};

// --- Components ---

interface NeonSliderProps {
  param: Parameter;
  value: number;
  onChange: (val: number) => void;
}

const NeonSlider: React.FC<NeonSliderProps> = ({ param, value, onChange }) => {
  const percentage = ((value - param.min) / (param.max - param.min)) * 100;

  return (
    <div className="flex flex-col gap-3 w-full group">
      {/* Label & Value Header */}
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-serif italic font-bold"
            style={{ color: param.color, textShadow: `0 0 12px ${param.glowColor}` }}
          >
            {param.symbol}
          </span>
          <span className="text-slate-400 text-sm font-medium tracking-wider uppercase">
            {param.name}
          </span>
        </div>
        <div 
          className="font-mono text-xl font-bold bg-slate-900/50 px-3 py-1 rounded-md border border-slate-800"
          style={{ color: param.color, boxShadow: `inset 0 0 10px ${param.glowColor}` }}
        >
          {value.toFixed(2)}
        </div>
      </div>

      {/* Custom Slider Track */}
      <div className="relative w-full h-6 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-2 bg-slate-900 rounded-full border border-slate-800 shadow-inner overflow-hidden">
          {/* Grid lines in track */}
          <div className="absolute inset-0 opacity-20" 
               style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, #fff 10%, #fff 11%)' }}>
          </div>
        </div>

        {/* Fill Bar */}
        <div
          className="absolute h-2 rounded-full transition-all duration-75 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: param.color,
            boxShadow: `0 0 15px ${param.color}, 0 0 30px ${param.glowColor}`,
          }}
        />

        {/* Thumb */}
        <div
          className="absolute w-5 h-5 bg-white rounded-full pointer-events-none transition-all duration-75 ease-out border-2 border-slate-950 z-10"
          style={{
            left: `calc(${percentage}% - 10px)`,
            boxShadow: `0 0 20px ${param.color}, 0 0 40px ${param.color}`,
          }}
        >
          {/* Core glow */}
          <div className="absolute inset-1 rounded-full" style={{ backgroundColor: param.color }}></div>
        </div>

        {/* Invisible Native Input */}
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />
      </div>
      
      {/* Min/Max Labels */}
      <div className="flex justify-between text-xs text-slate-600 font-mono mt-[-4px]">
        <span>{param.min}</span>
        <span>{param.max}</span>
      </div>
    </div>
  );
};

export default function App() {
  const [params, setParams] = useState({
    sigma: PARAMETERS.sigma.defaultValue,
    rho: PARAMETERS.rho.defaultValue,
    beta: PARAMETERS.beta.defaultValue,
  });

  const [toast, setToast] = useState<string | null>(null);

  const handleParamChange = (id: keyof typeof params, value: number) => {
    setParams((prev) => ({ ...prev, [id]: value }));
  };

  const handleReset = () => {
    setParams({
      sigma: PARAMETERS.sigma.defaultValue,
      rho: PARAMETERS.rho.defaultValue,
      beta: PARAMETERS.beta.defaultValue,
    });
  };

  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('sigma', params.sigma.toString());
    url.searchParams.set('rho', params.rho.toString());
    url.searchParams.set('beta', params.beta.toString());
    
    // Mock clipboard copy
    navigator.clipboard.writeText(url.toString()).then(() => {
      setToast('URL Copied to Clipboard!');
      setTimeout(() => setToast(null), 3000);
    });
  }, [params]);

  // Mock URL param initialization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const s = urlParams.get('sigma');
    const r = urlParams.get('rho');
    const b = urlParams.get('beta');
    
    if (s || r || b) {
      setParams({
        sigma: s ? parseFloat(s) : PARAMETERS.sigma.defaultValue,
        rho: r ? parseFloat(r) : PARAMETERS.rho.defaultValue,
        beta: b ? parseFloat(b) : PARAMETERS.beta.defaultValue,
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] pointer-events-none" />

      {/* Main Control Panel */}
      <div className="relative w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
              <Settings2 className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-wide">System Parameters</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-1">Lorenz Attractor</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-full transition-colors"
              title="Share parameters"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sliders Container */}
        <div className="space-y-8">
          <NeonSlider 
            param={PARAMETERS.sigma} 
            value={params.sigma} 
            onChange={(val) => handleParamChange('sigma', val)} 
          />
          <NeonSlider 
            param={PARAMETERS.rho} 
            value={params.rho} 
            onChange={(val) => handleParamChange('rho', val)} 
          />
          <NeonSlider 
            param={PARAMETERS.beta} 
            value={params.beta} 
            onChange={(val) => handleParamChange('beta', val)} 
          />
        </div>

        {/* Live Equations Display */}
        <div className="mt-10 p-5 bg-slate-900/60 rounded-2xl border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-fuchsia-500 to-emerald-500 opacity-50" />
          
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Equations</span>
          </div>

          <div className="font-mono text-sm sm:text-base space-y-2 text-slate-300">
            <div className="flex items-center transition-all">
              <span className="w-16 text-slate-500 italic">dx/dt</span>
              <span className="text-slate-600 mx-2">=</span>
              <span style={{ color: PARAMETERS.sigma.color, textShadow: `0 0 8px ${PARAMETERS.sigma.glowColor}` }}>
                {params.sigma.toFixed(2)}
              </span>
              <span className="ml-2 text-slate-400">(y - x)</span>
            </div>
            <div className="flex items-center transition-all">
              <span className="w-16 text-slate-500 italic">dy/dt</span>
              <span className="text-slate-600 mx-2">=</span>
              <span className="text-slate-400">x(</span>
              <span style={{ color: PARAMETERS.rho.color, textShadow: `0 0 8px ${PARAMETERS.rho.glowColor}` }}>
                {params.rho.toFixed(2)}
              </span>
              <span className="text-slate-400 ml-1">- z) - y</span>
            </div>
            <div className="flex items-center transition-all">
              <span className="w-16 text-slate-500 italic">dz/dt</span>
              <span className="text-slate-600 mx-2">=</span>
              <span className="text-slate-400">xy - </span>
              <span style={{ color: PARAMETERS.beta.color, textShadow: `0 0 8px ${PARAMETERS.beta.glowColor}` }}>
                {params.beta.toFixed(2)}
              </span>
              <span className="ml-1 text-slate-400">z</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-sky-500/20 border border-sky-500/50 backdrop-blur-md text-sky-100 rounded-full font-medium shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}