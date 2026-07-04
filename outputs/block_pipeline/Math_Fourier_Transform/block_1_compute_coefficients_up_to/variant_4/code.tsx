import React, { useState, useMemo, useEffect } from 'react';

// --- Constants & Types ---
const M = 512; // Number of samples per period
const MAX_HARMONICS = 64;

type SignalType = 'square' | 'sawtooth' | 'triangle' | 'pulse';

interface Coefficient {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

interface FourierData {
  a0: number;
  coeffs: Coefficient[];
  maxMag: number;
}

// --- Signal Processing Helpers ---

// Generate base periodic signals
const generateSignal = (type: SignalType): Float32Array => {
  const arr = new Float32Array(M);
  for (let i = 0; i < M; i++) {
    const t = i / M; // Normalized time 0 to 1
    if (type === 'square') {
      arr[i] = t < 0.5 ? 1 : -1;
    } else if (type === 'sawtooth') {
      arr[i] = 2 * (t - Math.floor(t + 0.5));
    } else if (type === 'triangle') {
      arr[i] = 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
    } else if (type === 'pulse') {
      arr[i] = t > 0.4 && t < 0.6 ? 1 : -0.2; // slight offset for visual clarity
    }
  }
  return arr;
};

// Compute coefficients up to MAX_N
const precomputeCoefficients = (samples: Float32Array): FourierData => {
  let a0 = 0;
  for (let i = 0; i < M; i++) a0 += samples[i];
  a0 = (2 / M) * a0;

  const coeffs: Coefficient[] = [];
  let maxMag = 0;

  for (let n = 1; n <= MAX_HARMONICS; n++) {
    let an = 0;
    let bn = 0;
    for (let k = 0; k < M; k++) {
      const t = k / M;
      an += samples[k] * Math.cos(2 * Math.PI * n * t);
      bn += samples[k] * Math.sin(2 * Math.PI * n * t);
    }
    an = (2 / M) * an;
    bn = (2 / M) * bn;
    const mag = Math.hypot(an, bn);
    const phase = Math.atan2(bn, an);
    
    if (mag > maxMag) maxMag = mag;
    
    coeffs.push({ n, a: an, b: bn, mag, phase });
  }

  // Prevent divide by zero in charts
  if (maxMag === 0) maxMag = 1;

  return { a0, coeffs, maxMag };
};

// Reconstruct the signal using exactly N harmonics
const reconstructSignal = (fourier: FourierData, N: number): Float32Array => {
  const arr = new Float32Array(M);
  for (let k = 0; k < M; k++) {
    const t = k / M;
    let val = fourier.a0 / 2;
    for (let i = 0; i < N; i++) {
      const c = fourier.coeffs[i];
      val += c.a * Math.cos(2 * Math.PI * c.n * t) + c.b * Math.sin(2 * Math.PI * c.n * t);
    }
    arr[k] = val;
  }
  return arr;
};

// Generate SVG path string from array of samples
const createPath = (samples: Float32Array, width: number, height: number): string => {
  let d = '';
  for (let i = 0; i < M; i++) {
    const x = (i / (M - 1)) * width;
    // Map y from [-1.5, 1.5] to [height, 0]
    const y = height / 2 - (samples[i] / 1.5) * (height / 2);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
};

// --- Main Component ---
export default function App() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [activeHarmonics, setActiveHarmonics] = useState<number>(5);

  // Precompute the base signal and ALL coefficients whenever signal type changes
  const { baseSignal, fourierData } = useMemo(() => {
    const sig = generateSignal(signalType);
    const fd = precomputeCoefficients(sig);
    return { baseSignal: sig, fourierData: fd };
  }, [signalType]);

  // Instantly reconstruct signal when harmonic slider changes
  const reconstructedSignal = useMemo(() => {
    return reconstructSignal(fourierData, activeHarmonics);
  }, [fourierData, activeHarmonics]);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 300;

  const basePath = useMemo(() => createPath(baseSignal, svgWidth, svgHeight), [baseSignal]);
  const reconPath = useMemo(() => createPath(reconstructedSignal, svgWidth, svgHeight), [reconstructedSignal]);

  const hasDiscontinuity = signalType === 'square' || signalType === 'sawtooth' || signalType === 'pulse';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 selection:bg-indigo-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Harmonic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">Analyzer</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Compute and visualize Fourier coefficients up to N harmonics</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Live Reconstruction</span>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Plots) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Time Domain Visualization */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                Time Domain
              </h2>
              
              <div className="relative w-full aspect-video md:aspect-[2.5/1] bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                {/* Y-Axis lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20">
                  <div className="border-b border-slate-400 w-full h-0"></div>
                  <div className="border-b border-slate-400 w-full h-0"></div>
                  <div className="border-b border-slate-400 w-full h-0"></div>
                </div>
                
                <svg 
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                  preserveAspectRatio="none" 
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Original Signal (Background) */}
                  <path 
                    d={basePath} 
                    fill="none" 
                    stroke="#94a3b8" 
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="opacity-60"
                  />
                  {/* Reconstructed Signal (Foreground) */}
                  <path 
                    d={reconPath} 
                    fill="none" 
                    stroke="url(#gradient)" 
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-md"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="mt-4 flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400"></div>
                  <span className="text-slate-500">Original Target</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-gradient-to-r from-indigo-600 to-rose-500 rounded"></div>
                  <span className="text-slate-700 font-medium">Σ {activeHarmonics} Harmonics</span>
                </div>
              </div>
            </div>

            {/* Frequency Domain (Coefficients) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
               <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Coefficient Magnitudes (Up to N)
              </h2>

              <div className="relative w-full h-48 flex items-end gap-[2px] sm:gap-1">
                {fourierData.coeffs.map((coeff, idx) => {
                  const isActive = idx < activeHarmonics;
                  const heightPct = (coeff.mag / fourierData.maxMag) * 100;
                  
                  return (
                    <div 
                      key={coeff.n}
                      className="group relative flex-1 flex flex-col justify-end h-full"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap shadow-lg">
                          n = {coeff.n}<br/>
                          Mag = {coeff.mag.toFixed(3)}
                        </div>
                        <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-slate-800"></div>
                      </div>

                      <div 
                        className={`w-full rounded-t-sm transition-all duration-300 ease-out ${
                          isActive 
                            ? 'bg-indigo-500 group-hover:bg-indigo-400' 
                            : 'bg-slate-200 group-hover:bg-slate-300'
                        }`}
                        style={{ height: `${Math.max(heightPct, 0.5)}%` }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
                <span>n = 1</span>
                <span>Active: n = {activeHarmonics}</span>
                <span>n = {MAX_HARMONICS}</span>
              </div>
            </div>

          </div>

          {/* Right Column (Controls) */}
          <div className="flex flex-col gap-6">
            
            {/* Control Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-8">
              
              {/* Signal Selection */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 block">
                  Select Base Signal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['square', 'sawtooth', 'triangle', 'pulse'] as SignalType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSignalType(type)}
                      className={`py-2 px-3 rounded-xl text-sm font-semibold capitalize transition-all border ${
                        signalType === type 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* N Harmonics Slider */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-end mb-4">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking