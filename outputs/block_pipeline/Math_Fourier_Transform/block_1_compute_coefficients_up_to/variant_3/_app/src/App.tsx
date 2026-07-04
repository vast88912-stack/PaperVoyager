import React, { useState, useMemo } from 'react';
import { Activity, BarChart2, Info, Settings2, Sigma, Waveform } from 'lucide-react';

// --- Signal Processing Math ---

const NUM_SAMPLES = 500;

type SignalType = 'square' | 'sawtooth' | 'triangle' | 'pulse';

const generateSignal = (type: SignalType): Float32Array => {
  const data = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / NUM_SAMPLES; // Normalized time 0 to 1
    switch (type) {
      case 'square':
        data[i] = t < 0.5 ? 1 : -1;
        break;
      case 'sawtooth':
        data[i] = 2 * t - 1;
        break;
      case 'triangle':
        data[i] = 2 * Math.abs(2 * t - 1) - 1;
        break;
      case 'pulse':
        data[i] = t < 0.2 ? 1 : 0;
        break;
    }
  }
  return data;
};

interface Harmonic {
  n: number;
  a: number; // Cosine coeff
  b: number; // Sine coeff
  mag: number;
  phase: number;
}

const computeCoefficients = (data: Float32Array, maxN: number): Harmonic[] => {
  const coeffs: Harmonic[] = [];
  const M = data.length;

  // DC Component (n=0)
  let sumDC = 0;
  for (let i = 0; i < M; i++) sumDC += data[i];
  const a0 = sumDC / M;
  coeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: 0 });

  // AC Components (n=1 to maxN)
  for (let n = 1; n <= maxN; n++) {
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < M; i++) {
      const angle = (2 * Math.PI * n * i) / M;
      sumA += data[i] * Math.cos(angle);
      sumB += data[i] * Math.sin(angle);
    }
    const a = (2 / M) * sumA;
    const b = (2 / M) * sumB;
    const mag = Math.sqrt(a * a + b * b);
    const phase = Math.atan2(-b, a);
    coeffs.push({ n, a, b, mag, phase });
  }

  return coeffs;
};

const reconstructSignal = (coeffs: Harmonic[], M: number): Float32Array => {
  const recon = new Float32Array(M);
  for (let i = 0; i < M; i++) {
    let val = coeffs[0].a; // a0
    for (let n = 1; n < coeffs.length; n++) {
      const angle = (2 * Math.PI * coeffs[n].n * i) / M;
      val += coeffs[n].a * Math.cos(angle) + coeffs[n].b * Math.sin(angle);
    }
    recon[i] = val;
  }
  return recon;
};

// --- Helper for SVG Paths ---
const buildPath = (data: Float32Array, width: number, height: number, scaleY: number): string => {
  if (data.length === 0) return '';
  const step = width / (data.length - 1);
  const midY = height / 2;
  let path = `M 0 ${(midY - data[0] * scaleY).toFixed(2)}`;
  for (let i = 1; i < data.length; i++) {
    path += ` L ${(i * step).toFixed(2)} ${(midY - data[i] * scaleY).toFixed(2)}`;
  }
  return path;
};


export default function App() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [harmonicsN, setHarmonicsN] = useState<number>(5);

  // Memoized computations to prevent unnecessary recalculation
  const originalSignal = useMemo(() => generateSignal(signalType), [signalType]);
  
  const coefficients = useMemo(
    () => computeCoefficients(originalSignal, harmonicsN),
    [originalSignal, harmonicsN]
  );

  const reconstructedSignal = useMemo(
    () => reconstructSignal(coefficients, NUM_SAMPLES),
    [coefficients]
  );

  // SVG Drawing parameters
  const svgWidth = 800;
  const svgHeight = 250;
  const yScale = 80; // pixels per unit value (maps [-1.5, 1.5] nicely into 250px)

  const originalPath = useMemo(() => buildPath(originalSignal, svgWidth, svgHeight, yScale), [originalSignal]);
  const reconPath = useMemo(() => buildPath(reconstructedSignal, svgWidth, svgHeight, yScale), [reconstructedSignal]);

  const hasGibbs = signalType === 'square' || signalType === 'pulse' || signalType === 'sawtooth';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sigma className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Fourier Coefficients Engine</h1>
            <p className="text-xs text-slate-500 font-medium">Real-valued Discrete Series Expansion</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Waveform className="w-4 h-4" /> Time Domain</span>
          <span className="flex items-center gap-1"><BarChart2 className="w-4 h-4" /> Frequency Domain</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Panel: Controls & Analysis */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          
          {/* Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-slate-800">Parameters</h2>
            </div>
            
            <div className="p-5 space-y-6">
              {/* Signal Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Base Signal</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['square', 'sawtooth', 'triangle', 'pulse'] as SignalType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSignalType(type)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        signalType === type 
                          ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harmonics Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Compute Up To N
                  </label>
                  <span className="text-lg font-bold text-indigo-600 tabular-nums">{harmonicsN}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={harmonicsN}
                  onChange={(e) => setHarmonicsN(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>1 (Fundamental)</span>
                  <span>50 Harmonics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Computed Coefficients Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-slate-800">Calculated Series</h2>
              </div>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Top 8</span>
            </div>
            
            <div className="flex-1 overflow-auto max-h-[300px] lg:max-h-none">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">n</th>
                    <th className="px-4 py-3 font-medium">aₙ (cos)</th>
                    <th className="px-4 py-3 font-medium">bₙ (sin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coefficients.slice(0, 8).map((c) => (
                    <tr key={c.n} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2 font-mono text-slate-400">{c.n}</td>
                      <td className="px-4 py-2 font-mono text-slate-700">
                        {Math.abs(c.a) < 0.001 ? '0.000' : c.a.toFixed(3)}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-700">
                        {Math.abs(c.b) < 0.001 ? '0.000' : c.b.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                  {harmonicsN > 7 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-center text-xs text-slate-400 italic bg-slate-50/50">
                        ... plus {harmonicsN - 7} more terms
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </aside>

        {/* Right Panel: Visualizations */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Time Domain Reconstruction */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1 flex flex-col relative overflow-hidden group">
            <div className="absolute top-4 left-5 z-10 pointer-events-none">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Time Domain
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Original vs Reconstructed (N={harmonicsN})</p>
            </div>
            
            {/* Legend */}
            <div className="absolute top-4 right-5 z-10 flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-slate-300 rounded-full"></div>
                <span className="text-slate-500">Target Signal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-indigo-500 rounded-full"></div>
                <span className="text-indigo-600">Fourier Sum</span>
              </div>
            </div>

            <div className="w-full bg-[#fafafa] rounded-lg border border-slate-100 mt-14 overflow-hidden relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-20" 
                   style={{ backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center center' }} />
              
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                preserveAspectRatio="none" 
                className="w-full h-64 sm:h-80 drop-shadow-sm"
              >
                {/* Center Zero Line */}
                <line x1="0" y1={svgHeight/2} x2={svgWidth} y2={svgHeight/2} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                
                {/* Original Signal (Background) */}
                <path 
                  d={originalPath} 
                  fill="none" 
                  stroke="#cbd5e1" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Reconstructed Signal (Foreground) */}
                <path 
                  d={reconPath} 
                  fill="none" 
                  stroke="#6366f1" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>
            </div>

            {/* Gibbs Phenomenon Explainer */}
            {hasGibbs && harmonicsN > 5 && (
              <div className="absolute bottom-4 left-5 right-5 bg-amber-50/90 backdrop-blur-sm border border-amber-200/50 rounded-lg p-3 shadow-sm transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex items-start gap-2 text-amber-800">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="font-semibold block mb-0.5">Gibbs Phenomenon Alert</strong>
                    Notice the "ringing" near the sharp transitions (discontinuities). Even as N → ∞, the Fourier series overshoots the jump by about 9%.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Frequency Domain Magnitude Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-5 z-10 pointer-events-none">
              <h3 className="font-bold text-slate-800">Frequency Domain</h3>
              <p className="text-xs text-slate-500 mt-0.5">Coefficient Magnitudes |Aₙ|</p>
            </div>

            <div className="w-full bg-white rounded-lg mt-14 overflow-hidden px-4 pb-4">
               <svg 
                viewBox={`0 0 ${svgWidth} 160`} 
                preserveAspectRatio="none" 
                className="w-full h-40 sm:h-48"
              >
                {/* Baseline */}
                <line x1="0" y1="150" x2={svgWidth} y2="150" stroke="#e2e8f0" strokeWidth="2" />
                
                {/* Y-axis ticks approximate */}
                <line x1="0" y1="50" x2={svgWidth} y2="50" stroke="#f1f5f9" strokeWidth="1" />
                <text x="5" y="45" fontSize="10" fill="#94a3b8" fontFamily="monospace">1.0</text>
                
                {/* Magnitude Bars */}
                {coefficients.map((c, i) => {
                  // Skip very tiny values to clean up graph visually
                  if (c.mag < 0.01) return null;
                  
                  // Scaling: Map magnitude 1.0 to 100px height. Base is at y=150.
                  const barHeight = c.mag * 100;
                  const y = 150 - barHeight;
                  // Distribute bars evenly across width, leaving margins
                  const startX = 20;
                  const endX = svgWidth - 20;
                  const availableWidth = endX - startX;
                  
                  // Calculate position based on ALL possible harmonics up to 50 for stable x-axis, 
                  // or dynamic based on current N? Dynamic looks cooler as it fills space.
                  const maxDisplayN = Math.max(10, harmonicsN); 
                  const step = availableWidth / (maxDisplayN + 1);
                  const x = startX + c.n * step;
                  
                  // Bar width depends on density
                  const barWidth = Math.max(2, Math.min(16, step * 0.6));

                  return (
                    <g key={`mag-${c.n}`} className="group/bar transition-all duration-300">
                      <rect 
                        x={x - barWidth/2} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        fill={c.n === 0 ? "#10b981" : "#f43f5e"} 
                        rx="2"
                        className="transition-all duration-300 ease-out hover:fill-indigo-500"
                      />
                      {/* Tooltip equivalent (visible on hover via css if we set it up, but SVG native title works simply) */}
                      <title>n={c.n}, Mag={c.mag.toFixed(3)}</title>
                      
                      {/* X-axis labels for sparse graphs */}
                      {maxDisplayN <= 20 && (
                        <text x={x} y="165" fontSize="10" fill="#64748b" textAnchor="middle" fontFamily="monospace">
                          {c.n}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {harmonicsN > 20 && (
                 <div className="text-center text-[10px] text-slate-400 mt-2 font-mono">
                   Harmonic Index (n)
                 </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}