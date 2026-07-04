import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Settings2, Activity, BarChart3, Info, Calculator, Sigma, PenTool, Play, Pause, Download, Menu, X, Waves, ChevronRight } from 'lucide-react';

// --- Shared Types & Utilities ---

type SignalType = 'square' | 'sawtooth' | 'triangle' | 'custom';

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

const TWO_PI = 2 * Math.PI;

// Generate discrete samples for ideal signals
const generateIdealSignal = (type: SignalType, samples: number): number[] => {
  const sig = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    switch (type) {
      case 'square':
        sig[i] = t < 0.5 ? 1 : -1;
        break;
      case 'sawtooth':
        sig[i] = 1 - 2 * t; // Block 3 style sawtooth
        break;
      case 'triangle':
        sig[i] = 1 - 4 * Math.abs(t - 0.5); // Block 3 style triangle
        break;
      default:
        sig[i] = 0;
    }
  }
  return Array.from(sig);
};

// Shared numerical Fourier computation (Riemann Sum)
const computeNumericalFourier = (signal: number[], maxN: number): FourierResult => {
  const samples = signal.length;
  let sumA0 = 0;
  for (let i = 0; i < samples; i++) {
    sumA0 += signal[i];
  }
  const a0 = (2 * sumA0) / samples; // Note: a0 here is 2 * DC component for consistency with an/bn formulas

  const harmonics: HarmonicData[] = [];
  for (let n = 1; n <= maxN; n++) {
    let a = 0;
    let b = 0;
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const val = signal[i];
      a += val * Math.cos(n * TWO_PI * t);
      b += val * Math.sin(n * TWO_PI * t);
    }
    a *= 2 / samples;
    b *= 2 / samples;

    if (Math.abs(a) < 1e-10) a = 0;
    if (Math.abs(b) < 1e-10) b = 0;

    const mag = Math.sqrt(a * a + b * b);
    const phase = Math.atan2(-b, a);

    harmonics.push({ n, a, b, mag, phase });
  }

  return { a0, harmonics };
};

// Shared SVG Path generator
const generateSvgPath = (data: number[], width: number, height: number, minY: number, maxY: number): string => {
  if (data.length === 0) return '';
  const range = maxY - minY;
  const scaleX = width / (data.length - 1);
  const scaleY = height / range;

  return data.reduce((path, val, i) => {
    const x = i * scaleX;
    const y = height - ((val - minY) * scaleY);
    return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  }, '');
};

// --- Block 1: Freehand Drawing ---
function FreehandDrawing() {
  const SAMPLES = 500;
  const CANVAS_HEIGHT = 300;
  const [signal, setSignal] = useState<number[]>(Array(SAMPLES).fill(0));
  const [harmonics, setHarmonics] = useState<number>(20);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const fourier = useMemo(() => computeNumericalFourier(signal, harmonics), [signal, harmonics]);

  const reconstructed = useMemo(() => {
    const recon = new Array(SAMPLES).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      let y = fourier.a0 / 2;
      for (const h of fourier.harmonics) {
        y += h.a * Math.cos(h.n * TWO_PI * t) + h.b * Math.sin(h.n * TWO_PI * t);
      }
      recon[i] = y;
    }
    return recon;
  }, [fourier]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    updateSignal(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    updateSignal(e);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const updateSignal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.floor((e.clientX - rect.left) * (SAMPLES / rect.width));
    const y = ((e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height));
    const normalizedY = Math.max(-1.5, Math.min(1.5, (CANVAS_HEIGHT / 2 - y) / (CANVAS_HEIGHT / 2.5)));

    setSignal((prev) => {
      const newSignal = [...prev];
      const startX = lastPosRef.current ? lastPosRef.current.x : x;
      const startY = lastPosRef.current ? lastPosRef.current.y : normalizedY;
      
      const minX = Math.min(startX, x);
      const maxX = Math.max(startX, x);
      
      if (minX === maxX) {
        if (minX >= 0 && minX < SAMPLES) newSignal[minX] = normalizedY;
      } else {
        for (let i = minX; i <= maxX; i++) {
          if (i >= 0 && i < SAMPLES) {
            const t = (i - startX) / (x - startX);
            newSignal[i] = startY + t * (normalizedY - startY);
          }
        }
      }
      return newSignal;
    });
    lastPosRef.current = { x, y: normalizedY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SAMPLES, CANVAS_HEIGHT);
    
    // Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(SAMPLES, CANVAS_HEIGHT / 2);
    for (let i = 0; i <= 10; i++) {
      const x = (SAMPLES / 10) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    ctx.stroke();

    const mapY = (val: number) => CANVAS_HEIGHT / 2 - val * (CANVAS_HEIGHT / 2.5);

    // Original
    ctx.beginPath();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < SAMPLES; i++) {
      ctx.lineTo(i, mapY(signal[i]));
    }
    ctx.stroke();

    // Reconstructed
    ctx.beginPath();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    for (let i = 0; i < SAMPLES; i++) {
      ctx.lineTo(i, mapY(reconstructed[i]));
    }
    ctx.stroke();
  }, [signal, reconstructed]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <PenTool className="w-6 h-6 text-indigo-400" /> Freehand Drawing
        </h1>
        <p className="text-slate-400 mt-1">Draw any shape on the canvas and see its Fourier approximation instantly.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Draw Signal</h2>
              <button onClick={() => setSignal(Array(SAMPLES).fill(0))} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded transition-colors">Clear Canvas</button>
            </div>
            <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={SAMPLES}
                height={CANVAS_HEIGHT}
                className="w-full h-auto block touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
            <div className="flex gap-4 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-slate-500 rounded"></div> Original Drawing</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-indigo-400 rounded"></div> Fourier Approximation</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Settings</h2>
            <label className="block text-sm text-slate-400 mb-2 flex justify-between">
              <span>Harmonics (N)</span>
              <span className="text-indigo-400 font-mono">{harmonics}</span>
            </label>
            <input 
              type="range" min="1" max="50" value={harmonics} 
              onChange={(e) => setHarmonics(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Top Frequencies</h2>
            <div className="space-y-2">
              {fourier.harmonics.slice().sort((a, b) => b.mag - a.mag).slice(0, 5).map(h => (
                <div key={h.n} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">n = {h.n}</span>
                  <span className="text-indigo-300 font-mono">{h.mag.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Block 2: Compute Coefficients ---
function ComputeCoefficients() {
  const SAMPLES = 500;
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [activeN, setActiveN] = useState<number>(5);
  const maxComputedN = 50;

  const idealSignal = useMemo(() => generateIdealSignal(signalType, SAMPLES), [signalType]);
  const fourierData = useMemo(() => computeNumericalFourier(idealSignal, maxComputedN), [idealSignal]);
  
  const reconstructedSignal = useMemo(() => {
    const recon = new Float64Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      let val = fourierData.a0 / 2;
      for (let j = 0; j < activeN; j++) {
        if (j >= fourierData.harmonics.length) break;
        const h = fourierData.harmonics[j];
        val += h.a * Math.cos(h.n * TWO_PI * t) + h.b * Math.sin(h.n * TWO_PI * t);
      }
      recon[i] = val;
    }
    return Array.from(recon);
  }, [fourierData, activeN]);

  const svgWidth = 800;
  const svgHeight = 250;
  const idealPath = useMemo(() => generateSvgPath(idealSignal, svgWidth, svgHeight, -1.5, 1.5), [idealSignal]);
  const reconPath = useMemo(() => generateSvgPath(reconstructedSignal, svgWidth, svgHeight, -1.5, 1.5), [reconstructedSignal]);

  const maxMag = useMemo(() => Math.max(...fourierData.harmonics.map(h => h.mag), 0.1), [fourierData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
            <Calculator className="w-6 h-6 text-indigo-400" /> Coefficient Engine
          </h1>
          <p className="text-slate-400 text-sm mt-1">Interactive computation of real Fourier series up to N harmonics.</p>
        </div>
        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['square', 'sawtooth', 'triangle'] as SignalType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSignalType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                signalType === type ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Parameters
              </h2>
              <span className="bg-indigo-900/50 text-indigo-300 text-xs font-bold px-2 py-1 rounded">N = {activeN}</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2 flex justify-between">
                  <span>Harmonics to Compute</span>
                  <span className="font-mono">{activeN} / {maxComputedN}</span>
                </label>
                <input 
                  type="range" min="1" max={maxComputedN} value={activeN} 
                  onChange={(e) => setActiveN(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="bg-amber-900/20 border border-amber-700/50 p-3 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300/80 leading-relaxed">
                  <strong>Gibbs Phenomenon:</strong> Notice the ringing artifacts near sharp transitions. This overshoot persists even as N increases.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800 h-[380px] flex flex-col">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Sigma className="w-4 h-4" /> Computed Values
            </h2>
            <div className="text-xs text-slate-400 mb-2 font-mono bg-slate-950 p-2 rounded border border-slate-800">
              a₀ = {fourierData.a0.toFixed(4)}
            </div>
            <div className="flex-1 overflow-auto border rounded-md border-slate-800 bg-slate-950">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium text-center">n</th>
                    <th className="px-3 py-2 font-medium">aₙ (cos)</th>
                    <th className="px-3 py-2 font-medium">bₙ (sin)</th>
                    <th className="px-3 py-2 font-medium">Mag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {fourierData.harmonics.slice(0, activeN).map((h) => (
                    <tr key={h.n} className="hover:bg-indigo-900/20 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-500 font-bold">{h.n}</td>
                      <td className={`px-3 py-2 ${Math.abs(h.a) > 0.01 ? 'text-slate-200' : 'text-slate-600'}`}>{h.a.toFixed(4)}</td>
                      <td className={`px-3 py-2 ${Math.abs(h.b) > 0.01 ? 'text-slate-200' : 'text-slate-600'}`}>{h.b.toFixed(4)}</td>
                      <td className="px-3 py-2 font-semibold text-indigo-400">{h.mag.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" /> Time Domain Reconstruction
            </h2>
            <div className="relative w-full aspect-[21/9] bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-px bg-slate-500"></div>
                <div className="w-full h-px bg-slate-500"></div>
                <div className="w-full h-px bg-slate-300"></div>
                <div className="w-full h-px bg-slate-500"></div>
                <div className="w-full h-px bg-slate-500"></div>
              </div>
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="absolute inset-0 w-full h-full preserve-3d">
                <path d={idealPath} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
                <path d={reconPath} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-md border border-slate-700 text-xs shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-0.5 bg-slate-500 border-t-2 border-dashed border-slate-500"></div>
                  <span className="text-slate-300">Ideal Signal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-indigo-500 rounded-full"></div>
                  <span className="font-medium text-slate-200">Sum of {activeN} Harmonics</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" /> Magnitude Spectrum
            </h2>
            <div className="w-full h-[200px] flex items-end gap-1 px-4 pb-6 pt-2 relative border-b-2 border-slate-700 bg-slate-950/50 rounded-t-lg">
              <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-500 py-2 -translate-x-full pr-2">
                <span>{maxMag.toFixed(1)}</span>
                <span>0</span>
              </div>
              {fourierData.harmonics.slice(0, activeN).map((h) => {
                const heightPercent = (h.mag / maxMag) * 100;
                const isSignificant = h.mag > 0.05;
                return (
                  <div key={h.n} className="flex-1 flex flex-col justify-end group relative" style={{ height: '100%' }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-100 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                      n={h.n} | Mag: {h.mag.toFixed(3)}
                    </div>
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 ${isSignificant ? 'bg-indigo-500 group-hover:bg-indigo-400' : 'bg-slate-700'}`}
                      style={{ height: `${heightPercent}%`, minHeight: '1px' }}
                    />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                      {h.n % 2 !== 0 || h.n < 10 ? h.n : ''}
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: maxComputedN - activeN }).map((_, i) => (
                 <div key={`ghost-${i}`} className="flex-1 h-full border-b border-slate-800/50" />
              ))}
            </div>
            <div className="text-center text-xs text-slate-500 mt-6">Harmonic Number (n)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Block 3: Animate Reconstruction ---
function AnimateReconstruction() {
  const SAMPLES = 800;
  const CANVAS_HEIGHT = 300;
  const FREQ_CANVAS_HEIGHT = 200;
  
  const [signal, setSignal] = useState<number[]>(Array(SAMPLES).fill(0));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationTime, setAnimationTime] = useState<number>(0);

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const reqAnimRef = useRef<number>();

  const fourier = useMemo(() => computeNumericalFourier(signal, harmonics), [signal, harmonics]);
  
  const reconstructed = useMemo(() => {
    const recon = new Array(SAMPLES).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      let y = fourier.a0 / 2;
      for (const h of fourier.harmonics) {
        y += h.a * Math.cos(h.n * TWO_PI * t) + h.b * Math.sin(h.n * TWO_PI * t);
      }
      recon[i] = y;
    }
    return recon;
  }, [fourier]);

  const animate = useCallback(() => {
    if (isPlaying) {
      setAnimationTime((prev) => (prev + 0.005) % 1);
    }
    reqAnimRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    reqAnimRef.current = requestAnimationFrame(animate);
    return () => { if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current); };
  }, [animate]);

  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SAMPLES, CANVAS_HEIGHT);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(SAMPLES, CANVAS_HEIGHT / 2);
    for (let i = 0; i <= 10; i++) {
      const x = (SAMPLES / 10) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    ctx.stroke();

    const mapY = (val: number) => CANVAS_HEIGHT / 2 - val * (CANVAS_HEIGHT / 2.5);

    ctx.beginPath();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    for (let i = 0; i < SAMPLES; i++) {
      ctx.lineTo(i, mapY(signal[i]));
    }
    ctx.stroke();

    const currentSampleIndex = Math.floor(animationTime * SAMPLES);
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    for (let i = 0; i <= currentSampleIndex; i++) {
      ctx.lineTo(i, mapY(reconstructed[i]));
    }
    ctx.stroke();

    if (currentSampleIndex < SAMPLES) {
      const dotX = currentSampleIndex;
      const dotY = mapY(reconstructed[currentSampleIndex]);
      ctx.beginPath();
      ctx.fillStyle = '#ef4444';
      ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.moveTo(dotX, 0);
      ctx.lineTo(dotX, CANVAS_HEIGHT);
      ctx.stroke();
    }
  }, [signal, reconstructed, animationTime]);

  useEffect(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SAMPLES, FREQ_CANVAS_HEIGHT);
    const maxMag = Math.max(...fourier.harmonics.map(h => h.mag), 0.01);
    const barWidth = Math.max(2, (SAMPLES / (harmonics + 1)) - 4);

    for (let n = 1; n <= harmonics; n++) {
      const h = fourier.harmonics[n - 1];
      const x = n * (SAMPLES / (harmonics + 1)) + 2;
      
      const magHeight = (h.mag / maxMag) * (FREQ_CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(x, FREQ_CANVAS_HEIGHT / 2 - magHeight, barWidth, magHeight);

      const phaseHeight = (h.phase / Math.PI) * (FREQ_CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(x, FREQ_CANVAS_HEIGHT / 2, barWidth, phaseHeight);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#475569';
    ctx.moveTo(0, FREQ_CANVAS_HEIGHT / 2);
    ctx.lineTo(SAMPLES, FREQ_CANVAS_HEIGHT / 2);
    ctx.stroke();
  }, [fourier, harmonics]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    updateSignal(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    updateSignal(e);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const updateSignal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = timeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((e.clientX - rect.left) * (SAMPLES / rect.width));
    const y = ((e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height));
    const normalizedY = Math.max(-1.2, Math.min(1.2, (CANVAS_HEIGHT / 2 - y) / (CANVAS_HEIGHT / 2.5)));

    setSignal((prev) => {
      const newSignal = [...prev];
      const startX = lastPosRef.current ? lastPosRef.current.x : x;
      const startY = lastPosRef.current ? lastPosRef.current.y : normalizedY;
      const minX = Math.min(startX, x);
      const maxX = Math.max(startX, x);
      
      if (minX === maxX) {
        if (minX >= 0 && minX < SAMPLES) newSignal[minX] = normalizedY;
      } else {
        for (let i = minX; i <= maxX; i++) {
          if (i >= 0 && i < SAMPLES) {
            const t = (i - startX) / (x - startX);
            newSignal[i] = startY + t * (normalizedY - startY);
          }
        }
      }
      return newSignal;
    });
    lastPosRef.current = { x, y: normalizedY };
  };

  const loadPreset = (type: SignalType | 'clear') => {
    if (type === 'clear') {
      setSignal(Array(SAMPLES).fill(0));
    } else {
      setSignal(generateIdealSignal(type, SAMPLES));
    }
    setAnimationTime(0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="pb-4 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" /> Animate Reconstruction
          </h1>
          <p className="text-slate-400 mt-1">Watch the Fourier series sweep across the time domain.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-slate-200">Time Domain</h2>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-400 hover:bg-indigo-800/50 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Draw below</span>
              </div>
            </div>
            <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-crosshair">
              <canvas
                ref={timeCanvasRef}
                width={SAMPLES}
                height={CANVAS_HEIGHT}
                className="w-full h-auto block touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
            <div className="mt-3 flex items-center space-x-4">
              <span className="text-sm text-slate-400 w-20">Time: {(animationTime * 100).toFixed(0)}%</span>
              <input 
                type="range" min="0" max="1" step="0.01" value={animationTime} 
                onChange={(e) => {
                  setIsPlaying(false);
                  setAnimationTime(parseFloat(e.target.value));
                }}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200 mb-3">Frequency Domain (Mag/Phase)</h2>
            <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <canvas ref={freqCanvasRef} width={SAMPLES} height={FREQ_CANVAS_HEIGHT} className="w-full h-auto block" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Controls</h2>
            <label className="block text-sm text-slate-400 mb-2 flex justify-between">
              <span>Harmonics</span>
              <span className="text-indigo-400 font-mono">{harmonics}</span>
            </label>
            <input 
              type="range" min="1" max="100" value={harmonics} 
              onChange={e => setHarmonics(parseInt(e.target.value))} 
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-6" 
            />
            
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => loadPreset('square')} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition-colors">Square</button>
              <button onClick={() => loadPreset('sawtooth')} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition-colors">Sawtooth</button>
              <button onClick={() => loadPreset('triangle')} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition-colors">Triangle</button>
              <button onClick={() => loadPreset('clear')} className="py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded text-sm transition-colors border border-rose-900/30">Clear</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Block 4: Magnitude/Phase Charts ---
const computeAnalyticalHarmonics = (type: SignalType, numHarmonics: number): HarmonicData[] => {
  const harmonics: HarmonicData[] = [];
  for (let n = 1; n <= numHarmonics; n++) {
    let a = 0;
    let b = 0;
    if (type === 'square') {
      if (n % 2 !== 0) b = 4 / (n * Math.PI);
    } else if (type === 'sawtooth') {
      b = (2 / (n * Math.PI)) * (n % 2 === 0 ? -1 : 1);
    } else if (type === 'triangle') {
      if (n % 2 !== 0) {
        const sign = ((n - 1) / 2) % 2 === 0 ? 1 : -1;
        a = (8 / (n * n * Math.PI * Math.PI)) * sign;
      }
    }
    const mag = Math.sqrt(a * a + b * b);
    const phase = mag > 1e-5 ? Math.atan2(b, a) : 0;
    harmonics.push({ n, a, b, mag, phase });
  }
  return harmonics;
};

function MagnitudePhaseCharts() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [hoveredHarmonic, setHoveredHarmonic] = useState<number | null>(null);

  const harmonics = useMemo(() => computeAnalyticalHarmonics(signalType, numHarmonics), [signalType, numHarmonics]);

  const svgWidth = 800;
  const svgHeight = 240;
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const maxMagnitude = Math.max(1.5, ...harmonics.map(h => h.mag));
  const barWidth = Math.max(2, (plotWidth / numHarmonics) - 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" /> Frequency Domain
          </h1>
          <p className="text-sm text-slate-400 mt-1">Explore exact analytical magnitude and phase spectra.</p>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex bg-slate-950 p-1 rounded-lg self-start border border-slate-800">
            {(['square', 'sawtooth', 'triangle'] as SignalType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSignalType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                  signalType === type ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-300 whitespace-nowrap">
              Harmonics: <span className="text-indigo-400 w-6 inline-block">{numHarmonics}</span>
            </label>
            <input
              type="range" min="1" max="50" value={numHarmonics}
              onChange={(e) => setNumHarmonics(parseInt(e.target.value, 10))}
              className="w-full md:w-48 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 relative">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Magnitude Spectrum</h2>
            <p className="text-xs text-slate-400">Amplitude of each frequency component (Mₙ = √(aₙ² + bₙ²))</p>
          </div>
          {hoveredHarmonic !== null && (
            <div className="text-right text-sm bg-indigo-900/30 px-3 py-1.5 rounded-md border border-indigo-800/50">
              <span className="font-semibold text-indigo-300">n = {hoveredHarmonic}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-300">Mag: {harmonics[hoveredHarmonic - 1].mag.toFixed(3)}</span>
            </div>
          )}
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
            {[0, 0.5, 1.0, 1.5].map((val) => {
              if (val > maxMagnitude && val !== 0) return null;
              const y = margin.top + plotHeight - (val / maxMagnitude) * plotHeight;
              return (
                <g key={`grid-mag-${val}`}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} className="stroke-slate-700" strokeDasharray="4 4" />
                  <text x={margin.left - 10} y={y + 4} className="text-[10px] fill-slate-500 text-end" textAnchor="end">{val.toFixed(1)}</text>
                </g>
              );
            })}
            <line x1={margin.left} y1={margin.top + plotHeight} x2={svgWidth - margin.right} y2={margin.top + plotHeight} className="stroke-slate-500 stroke-2" />
            {harmonics.map((h, i) => {
              const x = margin.left + (i * (plotWidth / numHarmonics)) + (plotWidth / numHarmonics) / 2 - barWidth / 2;
              const barH = (h.mag / maxMagnitude) * plotHeight;
              const y = margin.top + plotHeight - barH;
              const isHovered = hoveredHarmonic === h.n;
              return (
                <g key={`mag-${h.n}`}>
                  <rect
                    x={x} y={y} width={barWidth} height={barH} rx={2}
                    className={`transition-all duration-300 ease-out cursor-pointer ${h.mag < 1e-5 ? 'fill-transparent' : isHovered ? 'fill-indigo-400' : 'fill-indigo-600'}`}
                    onMouseEnter={() => setHoveredHarmonic(h.n)} onMouseLeave={() => setHoveredHarmonic(null)}
                  />
                  {(numHarmonics <= 20 || h.n % 5 === 0 || h.n === 1) && (
                    <text x={x + barWidth / 2} y={margin.top + plotHeight + 16} className={`text-[10px] text-center transition-colors ${isHovered ? 'fill-indigo-400 font-bold' : 'fill-slate-500'}`} textAnchor="middle">
                      {h.n}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={svgWidth / 2} y={svgHeight - 2} className="text-[11px] fill-slate-500 font-medium" textAnchor="middle">Harmonic Number (n)</text>
          </svg>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 relative">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Phase Spectrum</h2>
            <p className="text-xs text-slate-400">Phase shift of each frequency component (φₙ = atan2(bₙ, aₙ))</p>
          </div>
          {hoveredHarmonic !== null && (
            <div className="text-right text-sm bg-teal-900/20 px-3 py-1.5 rounded-md border border-teal-800/50">
              <span className="font-semibold text-teal-400">n = {hoveredHarmonic}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-300">Phase: {(harmonics[hoveredHarmonic - 1].phase / Math.PI).toFixed(2)}π</span>
            </div>
          )}
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[600px]">
            {[{ val: Math.PI, label: 'π' }, { val: Math.PI / 2, label: 'π/2' }, { val: 0, label: '0' }, { val: -Math.PI / 2, label: '-π/2' }, { val: -Math.PI, label: '-π' }].map((tick) => {
              const y = margin.top + plotHeight / 2 - (tick.val / Math.PI) * (plotHeight / 2);
              return (
                <g key={`grid-phase-${tick.label}`}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} className={tick.val === 0 ? "stroke-slate-500 stroke-2" : "stroke-slate-700"} strokeDasharray={tick.val === 0 ? "none" : "4 4"} />
                  <text x={margin.left - 10} y={y + 4} className="text-[10px] fill-slate-500 text-end" textAnchor="end">{tick.label}</text>
                </g>
              );
            })}
            {harmonics.map((h, i) => {
              const x = margin.left + (i * (plotWidth / numHarmonics)) + (plotWidth / numHarmonics) / 2 - barWidth / 2;
              const centerY = margin.top + plotHeight / 2;
              const barH = Math.abs((h.phase / Math.PI) * (plotHeight / 2));
              const y = h.phase >= 0 ? centerY - barH : centerY;
              const isHovered = hoveredHarmonic === h.n;
              const isSignificant = h.mag > 1e-5;
              return (
                <g key={`phase-${h.n}`}>
                  {isSignificant && (
                    <rect
                      x={x} y={y} width={barWidth} height={Math.max(barH, 2)} rx={2}
                      className={`transition-all duration-300 ease-out cursor-pointer ${isHovered ? 'fill-teal-400' : 'fill-teal-600'}`}
                      onMouseEnter={() => setHoveredHarmonic(h.n)} onMouseLeave={() => setHoveredHarmonic(null)}
                    />
                  )}
                  <rect x={x - 2} y={margin.top} width={barWidth + 4} height={plotHeight} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredHarmonic(h.n)} onMouseLeave={() => setHoveredHarmonic(null)} />
                  {(numHarmonics <= 20 || h.n % 5 === 0 || h.n === 1) && (
                    <text x={x + barWidth / 2} y={margin.top + plotHeight + 16} className={`text-[10px] text-center transition-colors ${isHovered ? 'fill-teal-400 font-bold' : 'fill-slate-500'}`} textAnchor="middle">
                      {h.n}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={svgWidth / 2} y={svgHeight - 2} className="text-[11px] fill-slate-500 font-medium" textAnchor="middle">Harmonic Number (n)</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

// --- Block 5: Preset Signals ---
function PresetSignals() {
  const NUM_SAMPLES = 500;
  const MAX_HARMONICS = 50;
  const [preset, setPreset] = useState<PresetType>('square');
  const [numHarmonics, setNumHarmonics] = useState<number>(10);
  const [originalSignal, setOriginalSignal] = useState<{t:number, y:number}[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [scanTime, setScanTime] = useState<number>(0);

  const canvasRef = useRef<SVGSVGElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (preset !== 'custom') {
      const sig = generateIdealSignal(preset, NUM_SAMPLES);
      setOriginalSignal(sig.map((y, i) => ({ t: i / NUM_SAMPLES, y })));
    }
  }, [preset]);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    const loop = (time: number) => {
      if (isAnimating) {
        const dt = time - lastTime;
        setScanTime((prev) => (prev + dt * 0.0005) % 1);
      }
      lastTime = time;
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isAnimating]);

  const fourier = useMemo(() => {
    if (originalSignal.length === 0) return { a0: 0, harmonics: [] };
    return computeNumericalFourier(originalSignal.map(p => p.y), MAX_HARMONICS);
  }, [originalSignal]);

  const reconstructedSignal = useMemo(() => {
    if (originalSignal.length === 0) return [];
    return originalSignal.map((p) => {
      let y = fourier.a0 / 2;
      for (let i = 0; i < numHarmonics; i++) {
        const h = fourier.harmonics[i];
        if (!h) break;
        y += h.a * Math.cos(h.n * TWO_PI * p.t) + h.b * Math.sin(h.n * TWO_PI * p.t);
      }
      return { t: p.t, y };
    });
  }, [originalSignal, fourier, numHarmonics]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setPreset('custom');
    isDrawing.current = true;
    updateSignalFromPointer(e);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    updateSignalFromPointer(e);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const updateSignalFromPointer = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = Math.max(0, Math.min(1, x / rect.width));
    const val = Math.max(-1.5, Math.min(1.5, -(y - rect.height / 2) / (rect.height / 3)));

    setOriginalSignal((prev) => {
      const next = [...prev];
      const idx = Math.floor(t * NUM_SAMPLES);
      if (idx >= 0 && idx < NUM_SAMPLES) {
        const brushSize = 15;
        for (let i = -brushSize; i <= brushSize; i++) {
          const targetIdx = idx + i;
          if (targetIdx >= 0 && targetIdx < NUM_SAMPLES) {
            const distance = Math.abs(i) / brushSize;
            const weight = Math.cos(distance * Math.PI / 2);
            next[targetIdx].y = next[targetIdx].y * (1 - weight) + val * weight;
          }
        }
      }
      return next;
    });
  };

  const toSvgPath = (points: {t:number, y:number}[]) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.t * 1000} ${150 - p.y * 100}`).join(' ');
  };

  const scanIdx = Math.floor(scanTime * NUM_SAMPLES);
  const currentScanPoint = reconstructedSignal[scanIdx] || { y: 0 };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-500">
      <aside className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Preset Signals</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['square', 'sawtooth', 'triangle', 'custom'] as PresetType[]).map((type) => (
              <button
                key={type} onClick={() => setPreset(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                  preset === type ? 'bg-indigo-900/50 border-indigo-500/50 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Harmonics</h2>
            <span className="bg-indigo-900/50 text-indigo-300 font-bold px-2 py-0.5 rounded text-xs">N = {numHarmonics}</span>
          </div>
          <input
            type="range" min="1" max={MAX_HARMONICS} value={numHarmonics}
            onChange={(e) => setNumHarmonics(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </aside>

      <section className="flex-1 flex flex-col gap-6 min-w-0 w-full">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Waves className="w-5 h-5 text-indigo-400" /> Time Domain
            </h2>
            <button onClick={() => setIsAnimating(!isAnimating)} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              {isAnimating ? <><Pause className="w-4 h-4"/> Pause</> : <><Play className="w-4 h-4"/> Play</>}
            </button>
          </div>
          <div 
            className="relative w-full h-64 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-crosshair touch-none"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
          >
            <svg ref={canvasRef} viewBox="0 0 1000 300" className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="1000" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="1000" y2="150" stroke="#475569" strokeWidth="2" />
              <line x1="0" y1="250" x2="1000" y2="250" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <path d={toSvgPath(originalSignal)} fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="8 4" className="opacity-60" />
              <path d={toSvgPath(reconstructedSignal)} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {isAnimating && (
                <g transform={`translate(${scanTime * 1000}, 0)`}>
                  <line x1="0" y1="0" x2="0" y2="300" stroke="#f43f5e" strokeWidth="1" className="opacity-50" />
                  <circle cx="0" cy={150 - currentScanPoint.y * 100} r="6" fill="#f43f5e" />
                </g>
              )}
            </svg>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Frequency Domain <span className="text-slate-500 font-normal">Magnitude</span></h2>
          <div className="relative w-full h-48 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            <svg viewBox={`0 0 ${MAX_HARMONICS * 20} 200`} className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="180" x2={MAX_HARMONICS * 20} y2="180" stroke="#475569" strokeWidth="2" />
              {fourier.harmonics.map((h, i) => {
                const x = h.n * 20 - 10;
                const height = Math.min(160, h.mag * 100);
                const y = 180 - height;
                const isActive = i < numHarmonics;
                return (
                  <g key={h.n} className={isActive ? 'opacity-100' : 'opacity-20 transition-opacity'}>
                    <line x1={x} y1="180" x2={x} y2={y} stroke={isActive ? '#818cf8' : '#475569'} strokeWidth="4" strokeLinecap="round" />
                    <circle cx={x} cy={y} r="4" fill={isActive ? '#4f46e5' : '#334155'} />
                    {h.n <= 10 && isActive && <text x={x} y={195} fontSize="10" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">{h.n}</text>}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Block 6: Gibbs Explainer ---
function GibbsExplainer() {
  const [harmonics, setHarmonics] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const WIDTH = 600;
  const HEIGHT = 400;
  const POINTS = 500;
  const MAX_Y = 1.5;
  const THEORETICAL_OVERSHOOT = 1.1789797;

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setHarmonics((prev) => {
          if (prev >= 100) { setIsPlaying(false); return 100; }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const signalData = useMemo(() => {
    const data = [];
    let currentMax = 0;
    for (let i = 0; i <= POINTS; i++) {
      const t = (i / POINTS) * 2 * Math.PI;
      let ideal = 0;
      if (t > 0 && t < Math.PI) ideal = 1;
      else if (t > Math.PI && t < 2 * Math.PI) ideal = -1;

      let approximation = 0;
      for (let n = 1; n <= harmonics * 2; n += 2) {
        approximation += (4 / Math.PI) * (Math.sin(n * t) / n);
      }
      if (Math.abs(approximation) > currentMax) currentMax = Math.abs(approximation);
      data.push({ t, ideal, approximation });
    }
    return { data, currentMax };
  }, [harmonics]);

  const { idealPath, approxPath } = useMemo(() => {
    let iPath = '';
    let aPath = '';
    signalData.data.forEach((pt, index) => {
      const x = (pt.t / (2 * Math.PI)) * WIDTH;
      const yIdeal = HEIGHT / 2 - (pt.ideal / MAX_Y) * (HEIGHT / 2);
      const yApprox = HEIGHT / 2 - (pt.approximation / MAX_Y) * (HEIGHT / 2);
      if (index === 0) {
        iPath += `M ${x} ${yIdeal} `;
        aPath += `M ${x} ${yApprox} `;
      } else {
        if (Math.abs(signalData.data[index].ideal - signalData.data[index - 1].ideal) > 1) {
          iPath += `L ${x} ${HEIGHT / 2 - (signalData.data[index - 1].ideal / MAX_Y) * (HEIGHT / 2)} `;
        }
        iPath += `L ${x} ${yIdeal} `;
        aPath += `L ${x} ${yApprox} `;
      }
    });
    return { idealPath: iPath, approxPath: aPath };
  }, [signalData]);

  const overshootPercent = (((signalData.currentMax - 1) / 2) * 100).toFixed(1);

  return (
    <div className="flex items-center justify-center animate-in fade-in duration-500">
      <div className="max-w-6xl w-full bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col lg:flex-row">
        <div className="w-full lg:w-3/5 bg-slate-950 p-6 md:p-10 flex flex-col relative border-r border-slate-800">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Interactive Signal</h2>
            <p className="text-slate-400 text-sm">Time Domain Representation</p>
          </div>
          <div className="flex-grow flex items-center justify-center relative w-full aspect-video lg:aspect-auto bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full drop-shadow-md" preserveAspectRatio="none">
              <line x1="0" y1={HEIGHT/2} x2={WIDTH} y2={HEIGHT/2} stroke="#334155" strokeWidth="2" />
              <line x1={WIDTH/2} y1="0" x2={WIDTH/2} y2={HEIGHT} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} x2={WIDTH} y2={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <line x1="0" y1={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} x2={WIDTH} y2={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d={idealPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
              <path d={approxPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-slate-500 border-t-2 border-dashed border-slate-500"></div><span className="text-slate-300">Ideal Square Wave</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-sky-400"></div><span className="text-slate-300">Fourier Series (N={harmonics})</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500"></div><span className="text-slate-300">~9% Overshoot Limit</span></div>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-slate-300 font-medium text-sm flex flex-col">
                Number of Harmonics (N)
                <span className="text-sky-400 text-2xl font-bold mt-1">{harmonics}</span>
              </label>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isPlaying ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-sky-900/30 text-sky-400 border border-sky-900/50'}`}
              >
                {isPlaying ? 'Stop Animation' : 'Auto-Play'}
              </button>
            </div>
            <input 
              type="range" min="1" max="100" value={harmonics} 
              onChange={(e) => { setHarmonics(parseInt(e.target.value)); setIsPlaying(false); }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>
        <div className="w-full lg:w-2/5 p-6 md:p-10 flex flex-col justify-between bg-slate-900">
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-900/50 text-indigo-300 rounded-full text-xs font-bold tracking-wider uppercase mb-4 border border-indigo-800/50">
              Signal Processing 101
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 mb-4 leading-tight">The Gibbs Phenomenon</h1>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>When approximating a signal with a jump discontinuity using a Fourier series, you'll notice something strange at the edges.</p>
              <p>No matter how many harmonics <span className="font-semibold text-slate-200">(N)</span> you add, the approximation always overshoots the jump. This is known as <strong>Gibbs Ringing</strong>.</p>
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-sm my-6">
                <h3 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-500" /> Why does this happen?
                </h3>
                <p className="text-sm">Fourier series use continuous sine waves. A sudden jump is impossible for continuous functions to perfectly trace without infinite frequencies. The energy "bunches up" near the discontinuity.</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-950/30 rounded-xl border border-indigo-900/50">
                <div>
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Current Overshoot</p>
                  <p className="text-2xl font-bold text-indigo-200">~{overshootPercent}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Theoretical Limit</p>
                  <p className="text-2xl font-bold text-indigo-200">8.95%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Layout ---
export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { name: 'Freehand Drawing', icon: <PenTool className="w-5 h-5" />, component: <FreehandDrawing /> },
    { name: 'Compute Coefficients', icon: <Calculator className="w-5 h-5" />, component: <ComputeCoefficients /> },
    { name: 'Animate Reconstruction', icon: <Activity className="w-5 h-5" />, component: <AnimateReconstruction /> },
    { name: 'Magnitude & Phase', icon: <BarChart3 className="w-5 h-5" />, component: <MagnitudePhaseCharts /> },
    { name: 'Preset Signals', icon: <Waves className="w-5 h-5" />, component: <PresetSignals /> },
    { name: 'Gibbs Phenomenon', icon: <Info className="w-5 h-5" />, component: <GibbsExplainer /> },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Activity className="w-6 h-6 text-indigo-500" /> Fourier Sketchpad
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400 hover:text-slate-100">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 hidden lg:flex">
          <div className="bg-indigo-500/20 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="font-bold text-lg tracking-tight">Fourier Sketchpad</span>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 mt-16 lg:mt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Modules</div>
          {tabs.map((tab, idx) => (
            <button
              key={tab.name}
              onClick={() => { setActiveTab(idx); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === idx 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.name}
              {activeTab === idx && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore the mathematical beauty of periodic signals and their frequency components.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-slate-950 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {tabs[activeTab].component}
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}