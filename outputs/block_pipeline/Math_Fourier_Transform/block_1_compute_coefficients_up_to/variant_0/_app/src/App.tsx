import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Activity, BarChart2, Info, Download, Edit3, RefreshCw, Waves } from 'lucide-react';

const NUM_SAMPLES = 512;
const MAX_HARMONICS = 100;

export default function App() {
  const [signal, setSignal] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGibbsInfo, setShowGibbsInfo] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const lastDrawIdx = useRef<number | null>(null);
  const lastDrawVal = useRef<number | null>(null);

  // Initialize with a square wave
  useEffect(() => {
    generatePreset('square');
  }, []);

  const generatePreset = (type: 'square' | 'sawtooth' | 'triangle' | 'sine') => {
    const newSignal = new Array(NUM_SAMPLES).fill(0);
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = i / NUM_SAMPLES;
      if (type === 'square') {
        newSignal[i] = t < 0.5 ? 0.8 : -0.8;
      } else if (type === 'sawtooth') {
        newSignal[i] = 1.6 * (t - Math.floor(t + 0.5));
      } else if (type === 'triangle') {
        newSignal[i] = 1.6 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 0.8;
      } else if (type === 'sine') {
        newSignal[i] = 0.8 * Math.sin(2 * Math.PI * t);
      }
    }
    setSignal(newSignal);
  };

  // Compute Fourier Coefficients up to N harmonics
  const coeffs = useMemo(() => {
    const result = [];
    
    // DC Component (a0)
    let dc = 0;
    for (let i = 0; i < NUM_SAMPLES; i++) dc += signal[i];
    dc /= NUM_SAMPLES;
    result.push({ n: 0, a: dc, b: 0, mag: Math.abs(dc), phase: 0 });

    // Harmonics 1 to N
    for (let n = 1; n <= numHarmonics; n++) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < NUM_SAMPLES; i++) {
        const t = (i / NUM_SAMPLES) * 2 * Math.PI;
        a += signal[i] * Math.cos(n * t);
        b += signal[i] * Math.sin(n * t);
      }
      a = (a * 2) / NUM_SAMPLES;
      b = (b * 2) / NUM_SAMPLES;
      
      const mag = Math.sqrt(a * a + b * b);
      const phase = Math.atan2(-b, a); 
      
      result.push({ n, a, b, mag, phase });
    }
    return result;
  }, [signal, numHarmonics]);

  // Reconstruct signal from coefficients
  const reconstructed = useMemo(() => {
    const rec = new Array(NUM_SAMPLES).fill(0);
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = (i / NUM_SAMPLES) * 2 * Math.PI;
      let val = coeffs[0].a; // DC
      for (let n = 1; n <= numHarmonics; n++) {
        val += coeffs[n].a * Math.cos(n * t) + coeffs[n].b * Math.sin(n * t);
      }
      rec[i] = val;
    }
    return rec;
  }, [coeffs, numHarmonics]);

  // Drawing Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    updateSignalFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    updateSignalFromEvent(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDrawing(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
    lastDrawIdx.current = null;
    lastDrawVal.current = null;
  };

  const updateSignalFromEvent = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    const sampleIdx = Math.min(NUM_SAMPLES - 1, Math.floor((x / rect.width) * NUM_SAMPLES));
    const val = -((y / rect.height) * 2 - 1); // Map Y to [-1, 1]

    setSignal(prev => {
      const next = [...prev];
      
      // Interpolate to fill gaps if mouse moves fast
      if (lastDrawIdx.current !== null && lastDrawVal.current !== null) {
        const start = Math.min(lastDrawIdx.current, sampleIdx);
        const end = Math.max(lastDrawIdx.current, sampleIdx);
        const startVal = start === lastDrawIdx.current ? lastDrawVal.current : val;
        const endVal = end === lastDrawIdx.current ? lastDrawVal.current : val;
        
        for (let i = start; i <= end; i++) {
          const t = end === start ? 0 : (i - start) / (end - start);
          next[i] = startVal * (1 - t) + endVal * t;
        }
      } else {
        next[sampleIdx] = val;
      }
      
      lastDrawIdx.current = sampleIdx;
      lastDrawVal.current = val;
      return next;
    });
  }, []);

  // Export to CSV
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Harmonic (n),a_n (Cosine Coeff),b_n (Sine Coeff),Magnitude,Phase (rad)\n";
    coeffs.forEach(c => {
      csvContent += `${c.n},${c.a.toFixed(6)},${c.b.toFixed(6)},${c.mag.toFixed(6)},${c.phase.toFixed(6)}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fourier_coefficients.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Path Generators
  const generatePath = (data: number[], width: number, height: number) => {
    return data.map((val, i) => {
      const x = (i / (NUM_SAMPLES - 1)) * width;
      const y = height / 2 - (val * height) / 2;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const maxMag = Math.max(...coeffs.map(c => c.mag), 0.1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-inner">
            <Waves size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Fourier Sketchpad</h1>
            <p className="text-xs text-slate-500 font-medium">Compute Coefficients Up To N Harmonics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowGibbsInfo(!showGibbsInfo)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${showGibbsInfo ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Info size={16} />
            Gibbs Phenomenon
          </button>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Time Domain */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Controls & Presets */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-500" />
                <h2 className="font-semibold text-slate-800">Draw Signal</h2>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['square', 'sawtooth', 'triangle', 'sine'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => generatePreset(type)}
                    className="px-3 py-1.5 text-xs font-semibold capitalize rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-indigo-600"
                  >
                    {type}
                  </button>
                ))}
                <button
                  onClick={() => setSignal(new Array(NUM_SAMPLES).fill(0))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-white hover:shadow-sm transition-all text-red-500 flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Clear
                </button>
              </div>
            </div>

            {/* Drawing Canvas */}
            <div className="relative w-full aspect-[21/9] bg-slate-900 rounded-xl overflow-hidden shadow-inner cursor-crosshair touch-none group">
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-0 w-full h-px bg-indigo-400"></div>
                <div className="absolute top-1/4 left-0 w-full h-px bg-slate-500 border-dashed border-t"></div>
                <div className="absolute top-3/4 left-0 w-full h-px bg-slate-500 border-dashed border-t"></div>
                <div className="absolute top-0 left-1/4 w-px h-full bg-slate-500 border-dashed border-l"></div>
                <div className="absolute top-0 left-2/4 w-px h-full bg-slate-500 border-dashed border-l"></div>
                <div className="absolute top-0 left-3/4 w-px h-full bg-slate-500 border-dashed border-l"></div>
              </div>

              <svg 
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                preserveAspectRatio="none"
                viewBox="0 0 1000 400"
              >
                {/* Original Signal (Faded) */}
                <path 
                  d={generatePath(signal, 1000, 400)} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Reconstructed Signal */}
                <path 
                  d={generatePath(reconstructed, 1000, 400)} 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                />
              </svg>

              {/* Overlay Labels */}
              <div className="absolute top-3 left-4 flex flex-col gap-1 pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                  <div className="w-3 h-0.5 bg-white/50 rounded"></div> Original
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
                  <div className="w-3 h-0.5 bg-blue-500 rounded shadow-[0_0_4px_#3b82f6]"></div> Reconstructed
                </div>
              </div>
            </div>
          </div>

          {/* Harmonics Slider - The Core Feature */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={20} className="text-indigo-500" />
                  Compute Coefficients Up To <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{numHarmonics}</span> Harmonics
                </h2>
                <p className="text-sm text-slate-500 mt-1">Adjust N to see how higher frequencies refine the approximation.</p>
              </div>
            </div>
            
            <div className="relative pt-2 pb-6">
              <input 
                type="range" 
                min="1" 
                max={MAX_HARMONICS} 
                value={numHarmonics}
                onChange={(e) => setNumHarmonics(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              />
              <div className="flex justify-between text-xs font-medium text-slate-400 mt-3 px-1">
                <span>N = 1 (Fundamental)</span>
                <span>N = {Math.floor(MAX_HARMONICS/2)}</span>
                <span>N = {MAX_HARMONICS}</span>
              </div>
            </div>

            {/* Gibbs Phenomenon Explainer Box */}
            {showGibbsInfo && (
              <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                <strong>Gibbs Phenomenon:</strong> Notice the "ringing" or overshoots near sharp edges (like in a square wave)? 
                When approximating a discontinuous signal with a finite number of continuous sine waves ($N$ harmonics), 
                the reconstruction will always overshoot the jump by about 9%. Increasing $N$ moves the overshoot closer to the edge, but doesn't eliminate its height!
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Frequency Domain */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Magnitude Spectrum */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(50%-12px)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 size={18} className="text-emerald-500" />
                Magnitude Spectrum ($M_n$)
              </h3>
              <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded">n = 0 to {numHarmonics}</span>
            </div>
            
            <div className="flex-1 relative w-full flex items-end gap-[2px] pb-6 pt-2 border-b border-slate-200">
              {coeffs.map((c) => {
                const heightPct = (c.mag / maxMag) * 100;
                return (
                  <div 
                    key={`mag-${c.n}`}