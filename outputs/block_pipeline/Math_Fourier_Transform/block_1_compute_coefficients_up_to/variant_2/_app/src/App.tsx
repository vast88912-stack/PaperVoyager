import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Settings2, Activity, BarChart3, Info, Calculator, Sigma } from 'lucide-react';

// --- Math & Signal Processing Utilities ---

const SAMPLES = 500;
const TWO_PI = 2 * Math.PI;

type SignalType = 'square' | 'sawtooth' | 'triangle';

interface HarmonicData {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

interface FourierResult {
  a0: number;
  harmonics: HarmonicData[];
}

// Generate discrete samples for ideal signals
const generateIdealSignal = (type: SignalType): number[] => {
  const sig = new Float64Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES; // Normalized time 0 to 1
    switch (type) {
      case 'square':
        sig[i] = t < 0.5 ? 1 : -1;
        break;
      case 'sawtooth':
        sig[i] = 2 * (t - Math.floor(t + 0.5));
        break;
      case 'triangle':
        sig[i] = 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
        break;
    }
  }
  return Array.from(sig);
};

// Compute real Fourier coefficients using numerical integration (Trapezoidal rule approximation)
const computeCoefficients = (signal: number[], maxN: number): FourierResult => {
  const dt = 1 / SAMPLES;
  let a0 = 0;
  
  // Calculate a0 (DC component)
  for (let i = 0; i < SAMPLES; i++) {
    a0 += signal[i] * dt;
  }
  a0 *= 2;

  const harmonics: HarmonicData[] = [];
  
  // Calculate an and bn
  for (let n = 1; n <= maxN; n++) {
    let a = 0;
    let b = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * TWO_PI;
      a += signal[i] * Math.cos(n * t) * dt;
      b += signal[i] * Math.sin(n * t) * dt;
    }
    a *= 2;
    b *= 2;
    
    // Clean up floating point near-zeros
    if (Math.abs(a) < 1e-10) a = 0;
    if (Math.abs(b) < 1e-10) b = 0;

    const mag = Math.sqrt(a * a + b * b);
    const phase = Math.atan2(-b, a); // Phase angle

    harmonics.push({ n, a, b, mag, phase });
  }

  return { a0, harmonics };
};

// Reconstruct signal up to N harmonics
const reconstructSignal = (fourier: FourierResult, activeN: number): number[] => {
  const recon = new Float64Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i / SAMPLES) * TWO_PI;
    let val = fourier.a0 / 2;
    
    for (let j = 0; j < activeN; j++) {
      if (j >= fourier.harmonics.length) break;
      const h = fourier.harmonics[j];
      val += h.a * Math.cos(h.n * t) + h.b * Math.sin(h.n * t);
    }
    recon[i] = val;
  }
  return Array.from(recon);
};

// SVG Path generator
const generateSvgPath = (data: number[], width: number, height: number, minY: number, maxY: number): string => {
  if (data.length === 0) return '';
  const range = maxY - minY;
  const scaleX = width / (data.length - 1);
  const scaleY = height / range;

  return data.reduce((path, val, i) => {
    const x = i * scaleX;
    // Invert Y axis for SVG coordinate system (0 is top)
    const y = height - ((val - minY) * scaleY);
    return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  }, '');
};

// --- Main Component ---

export default function App() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [activeN, setActiveN] = useState<number>(5);
  const maxComputedN = 50; // We compute up to 50 to allow smooth slider interaction

  // Memoized computations
  const idealSignal = useMemo(() => generateIdealSignal(signalType), [signalType]);
  const fourierData = useMemo(() => computeCoefficients(idealSignal, maxComputedN), [idealSignal]);
  const reconstructedSignal = useMemo(() => reconstructSignal(fourierData, activeN), [fourierData, activeN]);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 250;
  
  // Calculate paths
  const idealPath = useMemo(() => generateSvgPath(idealSignal, svgWidth, svgHeight, -1.5, 1.5), [idealSignal]);
  const reconPath = useMemo(() => generateSvgPath(reconstructedSignal, svgWidth, svgHeight, -1.5, 1.5), [reconstructedSignal]);

  // Max magnitude for bar chart scaling
  const maxMag = useMemo(() => {
    return Math.max(...fourierData.harmonics.map(h => h.mag), 0.1);
  }, [fourierData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Calculator className="w-6 h-6 text-indigo-600" />
              Fourier Coefficient Engine
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Interactive computation of real Fourier series up to N harmonics.
            </p>
          </div>
          <div className="flex gap-2">
            {(['square', 'sawtooth', 'triangle'] as SignalType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSignalType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  signalType === type 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls & Equation */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Control Panel */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Parameters
                </h2>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">
                  N = {activeN}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2 flex justify-between">
                    <span>Harmonics to Compute</span>
                    <span className="font-mono">{activeN} / {maxComputedN}</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max={maxComputedN} 
                    value={activeN} 
                    onChange={(e) => setActiveN(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <strong>Gibbs Phenomenon:</strong> Notice the ringing artifacts near the sharp transitions (discontinuities) of the {signalType} wave. This overshoot persists even as N increases.
                  </div>
                </div>
              </div>
            </div>

            {/* Computed Coefficients Table */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-[380px] flex flex-col">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Sigma className="w-4 h-4" /> Computed Values
              </h2>
              <div className="text-xs text-slate-500 mb-2 font-mono bg-slate-100 p-2 rounded">
                a₀ = {fourierData.a0.toFixed(4)}
              </div>
              
              <div className="flex-1 overflow-auto border rounded-md border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 font-medium text-center">n</th>
                      <th className="px-3 py-2 font-medium">aₙ (cos)</th>
                      <th className="px-3 py-2 font-medium">bₙ (sin)</th>
                      <th className="px-3 py-2 font-medium">Mag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {fourierData.harmonics.slice(0, activeN).map((h) => (
                      <tr key={h.n} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-3 py-2 text-center text-slate-400 font-bold">{h.n}</td>
                        <td className={`px-3 py-2 ${Math.abs(h.a) > 0.01 ? 'text-slate-900' : 'text-slate-300'}`}>
                          {h.a.toFixed(4)}
                        </td>
                        <td className={`px-3 py-2 ${Math.abs(h.b) > 0.01 ? 'text-slate-900' : 'text-slate-300'}`}>
                          {h.b.toFixed(4)}
                        </td>
                        <td className="px-3 py-2 font-semibold text-indigo-600">
                          {h.mag.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: Visualizations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Time Domain */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" /> Time Domain Reconstruction
              </h2>
              <div className="relative w-full aspect-[21/9] bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="w-full h-px bg-slate-400"></div>
                  <div className="w-full h-px bg-slate-400"></div>
                  <div className="w-full h-px bg-slate-800"></div> {/* Center Zero */}
                  <div className="w-full h-px bg-slate-400"></div>
                  <div className="w-full h-px bg-slate-400"></div>
                </div>
                
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="absolute inset-0 w-full h-full preserve-3d">
                  {/* Ideal Signal (Background) */}
                  <path 
                    d={idealPath} 
                    fill="none" 
                    stroke="#cbd5e1" 
                    strokeWidth="2" 
                    strokeDasharray="4 4"
                  />
                  {/* Reconstructed Signal */}
                  <path 
                    d={reconPath} 
                    fill="none" 
                    stroke="#4f46e5" 
                    strokeWidth="3" 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="drop-shadow-sm"
                  />
                </svg>
                
                {/* Legend */}
                <div className="absolute top-3 right-3 bg-white/80 backdrop-blur px-3 py-2 rounded-md border border-slate-200 text-xs shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-0.5 bg-slate-300 border-t-2 border-dashed border-slate-400"></div>
                    <span className="text-slate-600">Ideal Signal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-indigo-600 rounded-full"></div>
                    <span className="font-medium text-slate-800">Sum of {activeN} Harmonics</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequency Domain (Magnitude Spectrum) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4" /> Magnitude Spectrum (Frequency Domain)
              </h2>
              <div className="w-full h-[200px] flex items-end gap-1 px-4 pb-6 pt-2 relative border-b-2 border-slate-800 bg-slate-50/50 rounded-t-lg">
                
                {/* Y-Axis Label */}
                <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-400 py-2 -translate-x-full pr-2">
                  <span>{maxMag.toFixed(1)}</span>
                  <span>0</span>
                </div>

                {fourierData.harmonics.slice(0, activeN).map((h) => {
                  const heightPercent = (h.mag / maxMag) * 100;
                  const isSignificant = h.mag > 0.05;
                  
                  return (
                    <div 
                      key={h.n} 
                      className="flex-1 flex flex-col justify-end group relative"
                      style={{ height: '100%' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        n={h.n} | Mag: {h.mag.toFixed(3)}
                      </div>
                      
                      {/* Bar */}
                      <div 
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isSignificant ? 'bg-indigo-500 group-hover:bg-indigo-400' : 'bg-slate-300'
                        }`}
                        style={{ height: `${heightPercent}%`, minHeight: '1px' }}
                      />
                      
                      {/* X-Axis Label */}
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                        {h.n % 2 !== 0 || h.n < 10 ? h.n : ''}
                      </div>
                    </div>
                  );
                })}
                
                {/* Unused harmonic space (ghost bars) */}
                {Array.from({ length: maxComputedN - activeN }).map((_, i) => (
                   <div key={`ghost-${i}`} className="flex-1 h-full border-b border-slate-200/50" />
                ))}

              </div>
              <div className="text-center text-xs text-slate-500 mt-6">
                Harmonic Number (n)
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}