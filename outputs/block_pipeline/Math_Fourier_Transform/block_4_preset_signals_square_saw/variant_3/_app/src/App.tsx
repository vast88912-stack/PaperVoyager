import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Triangle, Activity, Download, Info, RefreshCw, ChevronRight, PenTool } from 'lucide-react';

const N_SAMPLES = 512;
const MAX_HARMONICS = 50;
const TIME_STEPS = Array.from({ length: N_SAMPLES }, (_, i) => (i / N_SAMPLES) * 2 * Math.PI);

type Coefficient = {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
};

type PresetType = 'square' | 'sawtooth' | 'triangle' | 'custom';

function generatePresetData(type: PresetType): number[] {
  return TIME_STEPS.map((t) => {
    switch (type) {
      case 'square':
        return t < Math.PI ? 1 : -1;
      case 'sawtooth':
        return t / Math.PI - 1;
      case 'triangle':
        return 1 - 2 * Math.abs(t / Math.PI - 1);
      default:
        return 0;
    }
  });
}

function computeFourierCoefficients(signal: number[], maxN: number): Coefficient[] {
  const coeffs: Coefficient[] = [];
  
  // DC Component (n = 0)
  let a0 = 0;
  for (let i = 0; i < N_SAMPLES; i++) {
    a0 += signal[i];
  }
  a0 = a0 / N_SAMPLES;
  coeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: 0 });

  // Harmonics
  for (let n = 1; n <= maxN; n++) {
    let a = 0;
    let b = 0;
    for (let i = 0; i < N_SAMPLES; i++) {
      const t = TIME_STEPS[i];
      a += signal[i] * Math.cos(n * t);
      b += signal[i] * Math.sin(n * t);
    }
    a = (a * 2) / N_SAMPLES;
    b = (b * 2) / N_SAMPLES;
    
    coeffs.push({
      n,
      a,
      b,
      mag: Math.sqrt(a * a + b * b),
      phase: Math.atan2(b, a)
    });
  }
  return coeffs;
}

function reconstructSignal(coeffs: Coefficient[], numHarmonics: number): number[] {
  return TIME_STEPS.map((t) => {
    let y = coeffs[0].a; // DC
    for (let n = 1; n <= numHarmonics; n++) {
      const { a, b } = coeffs[n];
      y += a * Math.cos(n * t) + b * Math.sin(n * t);
    }
    return y;
  });
}

export default function App() {
  const [activePreset, setActivePreset] = useState<PresetType>('square');
  const [signal, setSignal] = useState<number[]>(generatePresetData('square'));
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);

  const coefficients = useMemo(() => computeFourierCoefficients(signal, MAX_HARMONICS), [signal]);
  const reconstructed = useMemo(() => reconstructSignal(coefficients, numHarmonics), [coefficients, numHarmonics]);

  useEffect(() => {
    if (!isAnimating) return;
    let currentH = 1;
    setNumHarmonics(currentH);
    const interval = setInterval(() => {
      currentH++;
      if (currentH > MAX_HARMONICS) {
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        setNumHarmonics(currentH);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const handlePresetChange = (type: PresetType) => {
    setActivePreset(type);
    setIsAnimating(false);
    if (type !== 'custom') {
      setSignal(generatePresetData(type));
    } else {
      setSignal(Array(N_SAMPLES).fill(0));
    }
  };

  const getPointerCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    
    const xIdx = Math.max(0, Math.min(N_SAMPLES - 1, Math.floor(xRatio * N_SAMPLES)));
    // Y goes from -1.5 to 1.5. SVGs top is 0, bottom is H.
    const yVal = 1.5 - yRatio * 3.0;
    return { x: xIdx, y: Math.max(-1.5, Math.min(1.5, yVal)) };
  };

  const drawPoint = (x: number, y: number, prevX: number | null, prevY: number | null) => {
    setSignal((prev) => {
      const next = [...prev];
      if (prevX !== null && prevY !== null && Math.abs(x - prevX) > 1) {
        const step = Math.sign(x - prevX);
        for (let i = prevX + step; i !== x; i += step) {
          const t = (i - prevX) / (x - prevX);
          next[i] = prevY + t * (y - prevY);
        }
      }
      next[x] = y;
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setActivePreset('custom');
    setIsAnimating(false);
    setIsDrawing(true);
    const coords = getPointerCoords(e);
    if (coords) {
      drawPoint(coords.x, coords.y, null, null);
      lastDrawPos.current = coords;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const coords = getPointerCoords(e);
    if (coords) {
      drawPoint(coords.x, coords.y, lastDrawPos.current?.x ?? null, lastDrawPos.current?.y ?? null);
      lastDrawPos.current = coords;
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastDrawPos.current = null;
  };

  const handleExportCSV = () => {
    let csv = "t,Original_Signal,Reconstructed_Signal\n";
    for (let i = 0; i < N_SAMPLES; i++) {
      csv += `${TIME_STEPS[i].toFixed(4)},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fourier_sketchpad_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toPath = (data: number[]) => {
    return data.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${idx} ${val}`).join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 shadow-sm z-10 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Activity className="text-indigo-600" />
            Fourier Sketchpad
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Draw a custom signal or choose a preset to see its real-valued Fourier series approximation in real-time.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Preset Signals</h2>
          <div className="grid grid-cols-2 gap-2">
            <PresetButton 
              active={activePreset === 'square'} 
              onClick={() => handlePresetChange('square')}
              icon={<Square size={16} />} 
              label="Square" 
            />
            <PresetButton 
              active={activePreset === 'sawtooth'} 
              onClick={() => handlePresetChange('sawtooth')}
              icon={<Activity size={16} />} 
              label="Sawtooth" 
            />
            <PresetButton 
              active={activePreset === 'triangle'} 
              onClick={() => handlePresetChange('triangle')}
              icon={<Triangle size={16} />} 
              label="Triangle" 
            />
            <PresetButton 
              active={activePreset === 'custom'} 
              onClick={() => handlePresetChange('custom')}
              icon={<PenTool size={16} />} 
              label="Custom" 
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Harmonics: {numHarmonics}</h2>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isAnimating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {isAnimating ? 'Animating...' : 'Animate'}
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={MAX_HARMONICS}
            value={numHarmonics}
            onChange={(e) => {
              setNumHarmonics(Number(e.target.value));
              setIsAnimating(false);
            }}
            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>1 (Sine wave)</span>
            <span>{MAX_HARMONICS} (Complex)</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 shadow-sm mt-auto">
          <div className="flex items-center gap-2 font-bold mb-2">
            <Info size={16} className="text-amber-600" />
            Gibbs Phenomenon
          </div>
          <p className="text-amber-800/80 leading-relaxed text-xs">
            Notice the "ringing" or overshoots near sharp jumps (like in Square or Sawtooth waves). 
            Even with infinite harmonics, this 9% overshoot persists at discontinuities!
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Download size={18} />
          Export Data to CSV
        </button>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 h-screen overflow-y-auto">
        
        {/* Time Domain Canvas */}
        <section className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[350px]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Time Domain
              <ChevronRight size={16} className="text-slate-400" />
              <span className="text-sm font-normal text-slate-500">f(t) over 1 period (2π)</span>
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-3 h-0.5 bg-slate-300" /> Original 
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600">
                <div className="w-3 h-0.5 bg-indigo-600" /> Reconstructed
              </div>
            </div>
          </div>
          
          <div className="flex-1 relative w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
            <svg
              ref={svgRef}
              viewBox={`0 -1.5 ${N_SAMPLES} 3`}
              preserveAspectRatio="none"
              className={`w-full h-full absolute inset-0 ${activePreset === 'custom' ? 'cursor-crosshair' : 'cursor-default'}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <g transform="translate(0, 1.5) scale(1, -1)">
                {/* Center zero-line */}
                <line x1="0" y1="0" x2={N_SAMPLES} y2="0" stroke="#cbd5e1" strokeWidth="0.01" />
                
                {/* Original Signal */}
                <path
                  d={toPath(signal)}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="0.04"
                  strokeDasharray="0.1, 0.1"
                  className="opacity-60"
                />

                {/* Reconstructed Signal */}
                <path
                  d={toPath(reconstructed)}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="0.03"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
            {activePreset === 'custom' && !isDrawing && signal.every(v => v === 0) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-white/80 px-4 py-2 rounded-full text-slate-400 text-sm font-medium backdrop-blur-sm border border-slate-200 shadow-sm">
                  Click and drag to draw a signal
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Frequency Domain Canvas */}
        <section className="h-64 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              Frequency Domain
              <ChevronRight size={16} className="text-slate-400" />
              <span className="text-sm font-normal text-slate-500">Magnitude |Cₙ|</span>
            </h3>
          </div>
          
          <div className="flex-1 p-6 flex items-end gap-1">
            {coefficients.slice(0, numHarmonics + 1).map((coeff) => {
              // Normalize height for display (max expected magnitude ~ 1.5)
              const heightPercent = Math.min(100, (coeff.mag / 1.5) * 100);
              return (
                <div 
                  key={coeff.n} 
                  className="flex-1 flex flex-col items-center justify-end group relative"
                >
                  {/* Tooltip */}
                  <div className="