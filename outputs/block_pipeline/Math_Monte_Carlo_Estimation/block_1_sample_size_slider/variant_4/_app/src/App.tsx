import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Icons ---
const RefreshCw = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const Zap = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const Dices = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="12" height="12" x="2" y="10" rx="2" ry="2"/>
    <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/>
    <path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>
  </svg>
);

const Activity = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

// --- Constants & Config ---
const EXPERIMENTS = {
  pi: { id: 'pi', name: 'Pi (π) Estimation', trueValue: Math.PI, baseVar: 2.6 },
  area: { id: 'area', name: 'Gaussian Integral', trueValue: 0.886226, baseVar: 1.2 },
  option: { id: 'option', name: 'Exotic Option Pricing', trueValue: 14.235, baseVar: 45.5 }
};

const LOG_MIN = 1; // 10^1 = 10
const LOG_MAX = 7; // 10^7 = 10,000,000

// --- Helper Functions ---
const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
const generateSeed = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// --- Components ---

// 1. High-Quality Distinct Sample Size Slider (Variant 5 focus)
const SampleSizeSlider = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const steps = LOG_MAX - LOG_MIN;
  const percentage = ((value - LOG_MIN) / steps) * 100;
  const actualSize = Math.pow(10, value);

  return (
    <div className="relative w-full py-8">
      {/* Dynamic Floating Tooltip */}
      <div 
        className="absolute top-0 transform -translate-x-1/2 transition-all duration-200 ease-out flex flex-col items-center pointer-events-none z-10"
        style={{ left: `${percentage}%` }}
      >
        <span className="bg-slate-800 text-teal-300 font-mono text-xs px-2 py-1 rounded border border-teal-500/30 shadow-lg whitespace-nowrap">
          N = {formatNumber(actualSize)}
        </span>
        <div className="w-1 h-2 bg-teal-500/30 mt-1" />
      </div>

      {/* Track & Ticks Container */}
      <div className="relative h-10 flex items-center group">
        {/* Base Track */}
        <div className="absolute w-full h-3 bg-slate-900 rounded-full border border-slate-700/50 shadow-inner overflow-hidden">
          {/* Fill Track */}
          <div 
            className="h-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-200 ease-out" 
            style={{ width: `${percentage}%` }} 
          />
        </div>

        {/* Ticks & Labels */}
        <div className="absolute w-full flex justify-between px-1.5 pointer-events-none">
          {Array.from({ length: steps + 1 }).map((_, i) => {
            const currentLog = i + LOG_MIN;
            const isActive = value >= currentLog;
            return (
              <div key={i} className="flex flex-col items-center relative transform translate-y-6">
                <div className={`w-1 h-2 rounded-full mb-1 transition-colors duration-300 ${isActive ? 'bg-teal-300 shadow-[0_0_5px_#2dd4bf]' : 'bg-slate-700'}`} />
                <span className={`text-[10px] font-mono transition-colors duration-300 ${isActive ? 'text-teal-400' : 'text-slate-500'}`}>
                  10^{currentLog}
                </span>
              </div>
            );
          })}
        </div>

        {/* Interactive Native Range */}
        <input
          type="range"
          min={LOG_MIN}
          max={LOG_MAX}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />

        {/* Custom Glowing Thumb */}
        <div 
          className="absolute w-6 h-6 bg-slate-800 rounded-full border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] pointer-events-none transition-all duration-75 ease-out flex items-center justify-center transform -translate-x-1/2 z-10 group-active:scale-110 group-active:shadow-[0_0_25px_rgba(249,115,22,0.8)]"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
        </div>
      </div>
    </div>
  );
};

// 2. Variance Decay Chart (Visualizes Law of Large Numbers)
const VarianceChart = ({ currentLog, isImportanceSampling }: { currentLog: number, isImportanceSampling: boolean }) => {
  const points = [];
  const IS_MULTIPLIER = isImportanceSampling ? 0.2 : 1.0;
  
  for (let xLog = LOG_MIN; xLog <= LOG_MAX; xLog += 0.2) {
    // Variance is proportional to 1/N. Error margin is proportional to 1/sqrt(N)
    const N = Math.pow(10, xLog);
    const error = (1 / Math.sqrt(N)) * IS_MULTIPLIER;
    points.push({ x: xLog, y: error });
  }

  const maxErr = points[0].y;
  
  // Convert to SVG coordinates
  const svgPoints = points.map(p => {
    const cx = ((p.x - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
    const cy = 100 - ((p.y / maxErr) * 90); // 10% padding bottom
    return `${cx},${cy}`;
  }).join(' ');

  // Current dot
  const currentN = Math.pow(10, currentLog);
  const currentErr = (1 / Math.sqrt(currentN)) * IS_MULTIPLIER;
  const dotX = ((currentLog - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
  const dotY = 100 - ((currentErr / maxErr) * 90);

  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-lg border border-slate-700/50 relative overflow-hidden p-2 flex flex-col justify-end">
      <span className="absolute top-2 left-3 text-xs font-mono text-slate-500">Error Margin Decay</span>
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Axes */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" />
        <line x1="0" y1="0" x2="0" y2="100" stroke="#334155" strokeWidth="1" />
        
        {/* Curve */}
        <polyline
          points={svgPoints}
          fill="none"
          stroke="url(#tealGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current Position Indicator */}
        <line x1={dotX} y1={dotY} x2={dotX} y2="100" stroke="#fb923c" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-50" />
        <line x1="0" y1={dotY} x2={dotX} y2={dotY} stroke="#fb923c" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-50" />
        
        <circle cx={dotX} cy={dotY} r="3" fill="#0f172a" stroke="#fb923c" strokeWidth="1.5" className="drop-shadow-[0_0_5px_rgba(249,115,22,1)]" />

        <defs>
          <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};


// Main App
export default function App() {
  const [activeTab, setActiveTab] = useState<keyof typeof EXPERIMENTS>('pi');
  const [logSize, setLogSize] = useState<number>(3); // Default 10^3 = 1000
  const [importanceSampling, setImportanceSampling] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>(generateSeed());
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Derived State
  const sampleSize = Math.floor(Math.pow(10, logSize));
  const expConfig = EXPERIMENTS[activeTab];

  // Monte Carlo Simulation Mock Data
  const { estimate, marginOfError } = useMemo(() => {
    // Generate a pseudo-random perturbation based on the seed so it's "reproducible"
    const seedHash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (Math.sin(seedHash) + 1) / 2; // [0, 1]
    
    // Variance Reduction via Importance Sampling
    const effectiveBaseVar = importanceSampling ? expConfig.baseVar * 0.15 : expConfig.baseVar;
    
    // Standard Error = sqrt(Variance / N)
    const standardError = Math.sqrt(effectiveBaseVar / sampleSize);
    
    // 95% Confidence Interval Z-score = 1.96
    const moe = standardError * 1.96;

    // Estimate naturally converges to true value as N increases
    // We mock this by having the perturbation scale down with the MoE
    const errorDirection = (pseudoRandom - 0.5) * 2; // [-1, 1]
    const est = expConfig.trueValue + (errorDirection * moe * 0.8);

    return { estimate: est, marginOfError: moe };
  }, [logSize, activeTab, importanceSampling, seed, expConfig]);

  // Actions
  const handleReplay = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSeed(generateSeed());
      setIsSimulating(false);
    }, 400); // 400ms fake computing delay
  };

  const handleTabChange = (tabId: keyof typeof EXPERIMENTS) => {
    setActiveTab(tabId);
    setImportanceSampling(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 flex items-center justify-center selection:bg-teal-500/30">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header & Tabs */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-20">
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Activity />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">Monte Carlo Estimator Lab</h1>
                <p className="text-xs text-slate-400 font-mono">Stochastic Modeling Console v2.0</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-950/50 p-1 rounded-lg border border-slate-800">
              {(Object.keys(EXPERIMENTS) as Array<keyof typeof EXPERIMENTS>).map((key) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === key 
                      ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700' 
                      : 'text-slate-500 hover:text-slate-300 hover