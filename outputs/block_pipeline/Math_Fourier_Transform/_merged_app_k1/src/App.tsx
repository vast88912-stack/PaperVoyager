import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Activity, BarChart2, Info, Download, Edit3, RefreshCw, Waves, Play, Pause, Square, Triangle, Zap } from 'lucide-react';

const NUM_SAMPLES = 512;
const MAX_HARMONICS = 100;

interface Harmonic {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

interface Point {
  x: number;
  y: number;
}

function computeFourier(signal: number[], numHarmonics: number): Harmonic[] {
  const N = signal.length;
  const coeffs: Harmonic[] = [];
  let a0 = 0;
  for (let i = 0; i < N; i++) a0 += signal[i];
  a0 /= N;
  coeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: a0 < 0 ? Math.PI : 0 });

  for (let n = 1; n <= numHarmonics; n++) {
    let an = 0;
    let bn = 0;
    for (let i = 0; i < N; i++) {
      const theta = 2 * Math.PI * n * (i / N);
      an += signal[i] * Math.cos(theta);
      bn += signal[i] * Math.sin(theta);
    }
    an *= 2 / N;
    bn *= 2 / N;
    const mag = Math.sqrt(an * an + bn * bn);
    const phase = mag > 0.01 ? Math.atan2(-bn, an) : 0;
    coeffs.push({ n, a: an, b: bn, mag, phase });
  }
  return coeffs;
}

function reconstructSignal(coeffs: Harmonic[], N: number, activeHarmonics?: Set<number>): number[] {
  const recon = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    if (!activeHarmonics || activeHarmonics.has(0)) {
      recon[i] += coeffs[0].a;
    }
    for (let n = 1; n < coeffs.length; n++) {
      if (activeHarmonics && !activeHarmonics.has(n)) continue;
      const theta = 2 * Math.PI * n * t;
      recon[i] += coeffs[n].a * Math.cos(theta) + coeffs[n].b * Math.sin(theta);
    }
  }
  return recon;
}

function generatePresetSignal(type: 'square' | 'sawtooth' | 'triangle' | 'sine', N: number): number[] {
  const sig = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    if (type === 'square') sig[i] = t < 0.5 ? 1 : -1;
    else if (type === 'sawtooth') sig[i] = 2 * t - 1;
    else if (type === 'triangle') sig[i] = t < 0.25 ? 4 * t : (t < 0.75 ? 2 - 4 * t : 4 * t - 4);
    else if (type === 'sine') sig[i] = Math.sin(2 * Math.PI * t);
  }
  return sig;
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ComputeCoefficientsTab() {
  const [signal, setSignal] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGibbsInfo, setShowGibbsInfo] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const lastDrawIdx = useRef<number | null>(null);
  const lastDrawVal = useRef<number | null>(null);

  useEffect(() => {
    setSignal(generatePresetSignal('square', NUM_SAMPLES));
  }, []);

  const coeffs = useMemo(() => computeFourier(signal, numHarmonics), [signal, numHarmonics]);
  const reconstructed = useMemo(() => reconstructSignal(coeffs, NUM_SAMPLES), [coeffs]);

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
    const val = -((y / rect.height) * 2 - 1);

    setSignal(prev => {
      const next = [...prev];
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

  const exportCSV = () => {
    let csvContent = "Harmonic (n),a_n (Cosine Coeff),b_n (Sine Coeff),Magnitude,Phase (rad)\n";
    coeffs.forEach(c => {
      csvContent += `${c.n},${c.a.toFixed(6)},${c.b.toFixed(6)},${c.mag.toFixed(6)},${c.phase.toFixed(6)}\n`;
    });
    downloadCSV("fourier_coefficients.csv", csvContent);
  };

  const generatePath = (data: number[], width: number, height: number) => {
    return data.map((val, i) => {
      const x = (i / (NUM_SAMPLES - 1)) * width;
      const y = height / 2 - (val * height) / 2;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const maxMag = Math.max(...coeffs.map(c => c.mag), 0.1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Compute Coefficients</h1>
          <p className="text-sm text-slate-400">Draw a signal and compute up to N harmonics</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowGibbsInfo(!showGibbsInfo)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${showGibbsInfo ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <Info size={16} /> Gibbs Phenomenon
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-400" />
                <h2 className="font-semibold text-slate-100">Draw Signal</h2>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['square', 'sawtooth', 'triangle', 'sine'] as const).map(type => (
                  <button key={type} onClick={() => setSignal(generatePresetSignal(type, NUM_SAMPLES))} className="px-3 py-1.5 text-xs font-semibold capitalize rounded-md hover:bg-slate-800 transition-all text-slate-400 hover:text-indigo-400">
                    {type}
                  </button>
                ))}
                <button onClick={() => setSignal(new Array(NUM_SAMPLES).fill(0))} className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-slate-800 transition-all text-red-400 flex items-center gap-1">
                  <RefreshCw size={12} /> Clear
                </button>
              </div>
            </div>

            <div className="relative w-full aspect-[21/9] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 cursor-crosshair touch-none">
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-0 w-full h-px bg-indigo-400"></div>
                <div className="absolute top-1/4 left-0 w-full h-px bg-slate-500 border-dashed border-t"></div>
                <div className="absolute top-3/4 left-0 w-full h-px bg-slate-500 border-dashed border-t"></div>
                <div className="absolute top-0 left-1/4 w-px h-full bg-slate-500 border-dashed border-l"></div>
                <div className="absolute top-0 left-2/4 w-px h-full bg-slate-500 border-dashed border-l"></div>
                <div className="absolute top-0 left-3/4 w-px h-full bg-slate-500 border-dashed border-l"></div>
              </div>
              <svg ref={svgRef} className="absolute inset-0 w-full h-full" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} preserveAspectRatio="none" viewBox="0 0 1000 400">
                <path d={generatePath(signal, 1000, 400)} fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d={generatePath(reconstructed, 1000, 400)} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              </svg>
              <div className="absolute top-3 left-4 flex flex-col gap-1 pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400"><div className="w-3 h-0.5 bg-slate-400 rounded"></div> Original</div>
                <div className="flex items-center gap-2 text-xs font-medium text-blue-400"><div className="w-3 h-0.5 bg-blue-500 rounded shadow-[0_0_4px_#3b82f6]"></div> Reconstructed</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Activity size={20} className="text-indigo-400" />
                  Compute Coefficients Up To <span className="text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded-md border border-indigo-800">{numHarmonics}</span> Harmonics
                </h2>
                <p className="text-sm text-slate-400 mt-1">Adjust N to see how higher frequencies refine the approximation.</p>
              </div>
            </div>
            <div className="relative pt-2 pb-6">
              <input type="range" min="1" max={MAX_HARMONICS} value={numHarmonics} onChange={(e) => setNumHarmonics(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <div className="flex justify-between text-xs font-medium text-slate-500 mt-3 px-1">
                <span>N = 1</span>
                <span>N = {Math.floor(MAX_HARMONICS/2)}</span>
                <span>N = {MAX_HARMONICS}</span>
              </div>
            </div>
            {showGibbsInfo && (
              <div className="mt-2 p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl text-amber-200 text-sm leading-relaxed">
                <strong>Gibbs Phenomenon:</strong> Notice the "ringing" or overshoots near sharp edges? When approximating a discontinuous signal with a finite number of continuous sine waves, the reconstruction will always overshoot the jump by about 9%.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col h-[calc(50%-12px)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><BarChart2 size={18} className="text-emerald-400" /> Magnitude Spectrum</h3>
              <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded">n = 0 to {numHarmonics}</span>
            </div>
            <div className="flex-1 relative w-full flex items-end gap-[2px] pb-6 pt-2 border-b border-slate-800">
              {coeffs.map((c) => {
                const heightPct = (c.mag / maxMag) * 100;
                return (
                  <div key={`mag-${c.n}`} className="flex-1 bg-emerald-500/80 hover:bg-emerald-400 transition-all rounded-t-sm group relative" style={{ height: `${Math.max(heightPct, 1)}%` }}>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      n={c.n}: {c.mag.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col h-[calc(50%-12px)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Activity size={18} className="text-rose-400" /> Phase Spectrum</h3>
            </div>
            <div className="flex-1 relative w-full flex items-center gap-[2px] py-2">
              <div className="absolute left-0 w-full h-px bg-slate-800 top-1/2"></div>
              {coeffs.map((c) => {
                const phaseNorm = c.phase / Math.PI; 
                const heightPct = Math.abs(phaseNorm) * 50;
                const isPositive = phaseNorm >= 0;
                return (
                  <div key={`phase-${c.n}`} className="flex-1 h-full relative group">
                    <div className={`absolute w-full bg-rose-500/80 hover:bg-rose-400 transition-all rounded-sm ${isPositive ? 'bottom-1/2' : 'top-1/2'}`} style={{ height: `${Math.max(heightPct, 1)}%` }}></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimateReconstructionTab() {
  const [signal, setSignal] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationTime, setAnimationTime] = useState<number>(0);

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const reqAnimRef = useRef<number>();

  const coeffs = useMemo(() => computeFourier(signal, harmonics), [signal, harmonics]);
  const reconstructed = useMemo(() => reconstructSignal(coeffs, NUM_SAMPLES), [coeffs]);

  useEffect(() => {
    setSignal(generatePresetSignal('sawtooth', NUM_SAMPLES));
  }, []);

  const animate = useCallback(() => {
    if (isPlaying) {
      setAnimationTime((prev) => (prev + 0.005) % 1);
    }
    reqAnimRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    reqAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [animate]);

  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    const mapY = (val: number) => height / 2 - val * (height / 2.5);

    ctx.beginPath();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      ctx.lineTo((i / NUM_SAMPLES) * width, mapY(signal[i]));
    }
    ctx.stroke();

    const currentSampleIndex = Math.floor(animationTime * NUM_SAMPLES);
    
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    for (let i = 0; i <= currentSampleIndex; i++) {
      ctx.lineTo((i / NUM_SAMPLES) * width, mapY(reconstructed[i]));
    }
    ctx.stroke();

    if (currentSampleIndex < NUM_SAMPLES) {
      const dotX = (currentSampleIndex / NUM_SAMPLES) * width;
      const dotY = mapY(reconstructed[currentSampleIndex]);
      ctx.beginPath();
      ctx.fillStyle = '#ef4444';
      ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.moveTo(dotX, 0);
      ctx.lineTo(dotX, height);
      ctx.stroke();
    }
  }, [signal, reconstructed, animationTime]);

  useEffect(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const maxMag = Math.max(...coeffs.map(c => c.mag), 0.01);
    const barWidth = Math.max(2, (width / (harmonics + 1)) - 4);

    for (let n = 0; n <= harmonics; n++) {
      const x = n * (width / (harmonics + 1)) + 2;
      const magHeight = (coeffs[n].mag / maxMag) * (height / 2 - 10);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(x, height / 2 - magHeight, barWidth, magHeight);

      const phaseHeight = (coeffs[n].phase / Math.PI) * (height / 2 - 10);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(x, height / 2, barWidth, phaseHeight);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#475569';
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [coeffs, harmonics]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateSignal(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    updateSignal(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
    lastPosRef.current = null;
  };

  const updateSignal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (NUM_SAMPLES / rect.width));
    const y = ((e.clientY - rect.top) * (canvas.height / rect.height));
    const normalizedY = Math.max(-1.2, Math.min(1.2, (canvas.height / 2 - y) / (canvas.height / 2.5)));

    setSignal((prev) => {
      const newSignal = [...prev];
      if (lastPosRef.current) {
        const startX = lastPosRef.current.x;
        const startY = lastPosRef.current.y;
        const minX = Math.min(startX, x);
        const maxX = Math.max(startX, x);
        for (let i = minX; i <= maxX; i++) {
          if (i >= 0 && i < NUM_SAMPLES) {
            const t = maxX === minX ? 0 : (i - startX) / (x - startX);
            newSignal[i] = startY + t * (normalizedY - startY);
          }
        }
      } else {
        if (x >= 0 && x < NUM_SAMPLES) newSignal[x] = normalizedY;
      }
      lastPosRef.current = { x, y: normalizedY };
      return newSignal;
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Animate Reconstruction</h1>
          <p className="text-sm text-slate-400">Watch the Fourier series trace the signal</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-slate-200">Time Domain</h2>
              <div className="flex items-center space-x-3">
                <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-400 hover:bg-indigo-800 transition-colors">
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Draw below</span>
              </div>
            </div>
            <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-crosshair">
              <canvas ref={timeCanvasRef} width={800} height={300} className="w-full h-auto block touch-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
            </div>
            <div className="mt-3 flex items-center space-x-4">
              <span className="text-sm text-slate-400 w-20">Time: {(animationTime * 100).toFixed(0)}%</span>
              <input type="range" min="0" max="1" step="0.01" value={animationTime} onChange={(e) => { setIsPlaying(false); setAnimationTime(parseFloat(e.target.value)); }} className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200 mb-3">Frequency Domain (Mag & Phase)</h2>
            <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <canvas ref={freqCanvasRef} width={800} height={200} className="w-full h-auto block" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Controls</h3>
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium text-slate-300 mb-2">
                  <span>Harmonics</span>
                  <span className="text-indigo-400">{harmonics}</span>
                </label>
                <input type="range" min="1" max={MAX_HARMONICS} value={harmonics} onChange={(e) => setHarmonics(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
              <div className="pt-4 border-t border-slate-800">
                <label className="text-sm font-medium text-slate-300 mb-2 block">Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['square', 'sawtooth', 'triangle'] as const).map(type => (
                    <button key={type} onClick={() => { setSignal(generatePresetSignal(type, NUM_SAMPLES)); setAnimationTime(0); }} className="px-3 py-2 text-sm font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 capitalize">
                      {type}
                    </button>
                  ))}
                  <button onClick={() => { setSignal(new Array(NUM_SAMPLES).fill(0)); setAnimationTime(0); }} className="px-3 py-2 text-sm font-medium rounded-md bg-slate-800 text-red-400 hover:bg-slate-700">
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BarChartProps {
  title: string;
  data: Harmonic[];
  dataKey: 'mag' | 'phase';
  yMin: number;
  yMax: number;
  color: string;
  activeHarmonics: Set<number>;
  onToggleHarmonic: (n: number) => void;
}

const BarChart: React.FC<BarChartProps> = ({ title, data, dataKey, yMin, yMax, color, activeHarmonics, onToggleHarmonic }) => {
  const [hovered, setHovered] = useState<Harmonic | null>(null);
  const range = yMax - yMin;
  const zeroY = range === 0 ? 50 : ((yMax - 0) / range) * 100;

  return (
    <div className="flex flex-col w-full bg-slate-900 rounded-xl border border-slate-800 p-4 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
        {hovered && (
          <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
            n={hovered.n}: {hovered[dataKey].toFixed(3)}
          </div>
        )}
      </div>
      <div className="relative w-full h-48">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible" onMouseLeave={() => setHovered(null)}>
          <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#475569" strokeWidth="0.5" strokeDasharray="1 1" />
          <text x="-1" y="4" fontSize="4" textAnchor="end" fill="#64748b">{yMax.toFixed(1)}</text>
          <text x="-1" y="98" fontSize="4" textAnchor="end" fill="#64748b">{yMin.toFixed(1)}</text>
          <text x="-1" y={zeroY + 1.5} fontSize="4" textAnchor="end" fill="#64748b">0</text>
          {data.map((d, i) => {
            const val = d[dataKey];
            const isActive = activeHarmonics.has(d.n);
            const barWidth = 100 / data.length;
            const x = i * barWidth;
            let y, height;
            if (val >= 0) {
              y = ((yMax - val) / range) * 100;
              height = zeroY - y;
            } else {
              y = zeroY;
              height = ((0 - val) / range) * 100;
            }
            if (height < 0.5 && val !== 0) height = 0.5;
            return (
              <g key={d.n} className="cursor-pointer transition-opacity duration-200" style={{ opacity: isActive ? 1 : 0.3 }} onClick={() => onToggleHarmonic(d.n)} onMouseEnter={() => setHovered(d)}>
                <rect x={x} y="0" width={barWidth} height="100" fill="transparent" />
                <rect x={x + barWidth * 0.1} y={y} width={barWidth * 0.8} height={height} fill={color} rx="0.5" />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-center text-xs text-slate-500 mt-2">Harmonic Index (n)</div>
    </div>
  );
};

function MagnitudePhaseTab() {
  const [signal, setSignal] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [numHarmonics, setNumHarmonics] = useState<number>(24);
  const [activeHarmonics, setActiveHarmonics] = useState<Set<number>>(new Set(Array.from({ length: 25 }, (_, i) => i)));
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawPoint, setLastDrawPoint] = useState<Point | null>(null);

  useEffect(() => {
    setSignal(generatePresetSignal('square', NUM_SAMPLES));
  }, []);

  const coeffs = useMemo(() => computeFourier(signal, numHarmonics), [signal, numHarmonics]);
  const reconstructed = useMemo(() => reconstructSignal(coeffs, NUM_SAMPLES, activeHarmonics), [coeffs, activeHarmonics]);

  const maxMag = useMemo(() => {
    const max = Math.max(...coeffs.map(c => c.mag));
    return max > 1 ? max : 1.5;
  }, [coeffs]);

  const toggleHarmonic = useCallback((n: number) => {
    setActiveHarmonics(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const drawOnCanvas = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sampleIdx = Math.floor((x / rect.width) * NUM_SAMPLES);
    const signalVal = -((y / rect.height) * 3 - 1.5);

    setSignal(prev => {
      const next = [...prev];
      if (lastDrawPoint) {
        const startIdx = Math.min(lastDrawPoint.x, sampleIdx);
        const endIdx = Math.max(lastDrawPoint.x, sampleIdx);
        const startY = lastDrawPoint.x === startIdx ? lastDrawPoint.y : signalVal;
        const endY = lastDrawPoint.x === endIdx ? lastDrawPoint.y : signalVal;
        for (let i = startIdx; i <= endIdx; i++) {
          if (i >= 0 && i < NUM_SAMPLES) {
            const t = endIdx === startIdx ? 0 : (i - startIdx) / (endIdx - startIdx);
            next[i] = startY + t * (endY - startY);
          }
        }
      } else {
        if (sampleIdx >= 0 && sampleIdx < NUM_SAMPLES) next[sampleIdx] = signalVal;
      }
      return next;
    });
    setLastDrawPoint({ x: sampleIdx, y: signalVal });
  }, [isDrawing, lastDrawPoint]);

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastDrawPoint(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const drawPath = (data: number[], color: string, lineWidth: number, isDashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (isDashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);
      for (let i = 0; i < NUM_SAMPLES; i++) {
        const x = (i / NUM_SAMPLES) * width;
        const y = height - ((data[i] + 1.5) / 3) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawPath(signal, '#64748b', 2, true);
    drawPath(reconstructed, '#e11d48', 3);
  }, [signal, reconstructed]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Magnitude & Phase Charts</h1>
          <p className="text-sm text-slate-400 mt-1">Toggle individual harmonics to see their effect.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg">
            <label className="text-sm font-medium text-slate-300">Harmonics: {numHarmonics}</label>
            <input type="range" min="1" max={64} value={numHarmonics} onChange={(e) => {
              const newN = parseInt(e.target.value, 10);
              setNumHarmonics(newN);
              setActiveHarmonics(new Set(Array.from({ length: newN + 1 }, (_, i) => i)));
            }} className="w-32 accent-indigo-500" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Time Domain</h3>
            </div>
            <div className="relative w-full aspect-square bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-crosshair touch-none">
              <canvas ref={canvasRef} width={512} height={512} className="w-full h-full block" onMouseDown={(e) => { setIsDrawing(true); drawOnCanvas(e); }} onMouseMove={drawOnCanvas} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={(e) => { setIsDrawing(true); drawOnCanvas(e); }} onTouchMove={drawOnCanvas} onTouchEnd={stopDrawing} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <BarChart title="Magnitude Spectrum" data={coeffs} dataKey="mag" yMin={0} yMax={maxMag} color="#10b981" activeHarmonics={activeHarmonics} onToggleHarmonic={toggleHarmonic} />
          <BarChart title="Phase Spectrum (rad)" data={coeffs} dataKey="phase" yMin={-Math.PI} yMax={Math.PI} color="#8b5cf6" activeHarmonics={activeHarmonics} onToggleHarmonic={toggleHarmonic} />
        </div>
      </div>
    </div>
  );
}

function PresetsTab() {
  const [signalType, setSignalType] = useState<'square' | 'sawtooth' | 'triangle' | 'custom'>('square');
  const [signal, setSignal] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [harmonics, setHarmonics] = useState<number>(10);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animProgress, setAnimProgress] = useState(1);

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);

  const coeffs = useMemo(() => computeFourier(signal, harmonics), [signal, harmonics]);
  const reconstructed = useMemo(() => reconstructSignal(coeffs, NUM_SAMPLES), [coeffs]);

  useEffect(() => {
    setSignal(generatePresetSignal('square', NUM_SAMPLES));
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const duration = 3000;
      setAnimProgress((elapsed % duration) / duration);
      if (isAnimating) animationFrameId = requestAnimationFrame(animate);
    };
    if (isAnimating) animationFrameId = requestAnimationFrame(animate);
    else setAnimProgress(1);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating]);

  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const amplitude = height * 0.4;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    
    for(let i=1; i<4; i++) {
      ctx.beginPath();
      ctx.moveTo((width/4)*i, 0);
      ctx.lineTo((width/4)*i, height);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = (i / NUM_SAMPLES) * width;
      const y = centerY - signal[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const drawLimit = Math.floor(NUM_SAMPLES * animProgress);
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    for (let i = 0; i < drawLimit; i++) {
      const x = (i / NUM_SAMPLES) * width;
      const y = centerY - reconstructed[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (isAnimating && drawLimit < NUM_SAMPLES && drawLimit > 0) {
      const x = (drawLimit / NUM_SAMPLES) * width;
      const y = centerY - reconstructed[drawLimit] * amplitude;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [signal, reconstructed, animProgress, isAnimating]);

  useEffect(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (coeffs.length === 0) return;
    const maxMag = Math.max(...coeffs.map(c => c.mag), 0.01);
    const barWidth = Math.max((width / (harmonics + 1)) - 2, 2);

    for (let i = 0; i <= harmonics; i++) {
      const coeff = coeffs[i];
      const barHeight = (coeff.mag / maxMag) * (height * 0.8);
      const x = i * (width / (harmonics + 1)) + 1;
      const y = height - barHeight;
      const gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#818cf8');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      if (harmonics <= 20 || i % 5 === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i.toString(), x + barWidth / 2, height - 5);
      }
    }
  }, [coeffs, harmonics]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-900/50 text-indigo-400 rounded-lg"><Activity size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Presets & Loop</h1>
            <p className="text-sm text-slate-400">Pick a preset to see its frequency components.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Preset Signals</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['square', 'sawtooth', 'triangle'] as const).map(type => (
                <button key={type} onClick={() => { setSignal(generatePresetSignal(type, NUM_SAMPLES)); setSignalType(type); }} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${signalType === type ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-indigo-800 hover:bg-indigo-900/20'}`}>
                  {type === 'square' && <Square size={24} />}
                  {type === 'sawtooth' && <Zap size={24} />}
                  {type === 'triangle' && <Triangle size={24} />}
                  <span className="text-sm font-semibold capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Harmonics (N)</label>
                <span className="text-lg font-bold text-indigo-400">{harmonics}</span>
              </div>
              <input type="range" min="1" max={MAX_HARMONICS} value={harmonics} onChange={(e) => setHarmonics(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
            <div className="pt-4 border-t border-slate-800">
              <button onClick={() => setIsAnimating(!isAnimating)} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${isAnimating ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {isAnimating ? <Pause size={18} /> : <Play size={18} />}
                {isAnimating ? 'Stop Animation' : 'Animate Reconstruction'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Time Domain</h2>
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <canvas ref={timeCanvasRef} width={800} height={300} className="w-full h-auto block" />
            </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Frequency Domain</h2>
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <canvas ref={freqCanvasRef} width={800} height={200} className="w-full h-auto block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GibbsExplainerTab() {
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
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
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
    <div className="p-6 max-w-6xl mx-auto flex items-center justify-center">
      <div className="w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 flex flex-col lg:flex-row shadow-xl">
        <div className="w-full lg:w-3/5 p-6 md:p-10 flex flex-col relative border-r border-slate-800">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Interactive Signal</h2>
            <p className="text-slate-400 text-sm">Time Domain Representation</p>
          </div>
          <div className="flex-grow flex items-center justify-center relative w-full aspect-video lg:aspect-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1={HEIGHT/2} x2={WIDTH} y2={HEIGHT/2} stroke="#334155" strokeWidth="2" />
              <line x1={WIDTH/2} y1="0" x2={WIDTH/2} y2={HEIGHT} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} x2={WIDTH} y2={HEIGHT / 2 - (THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <line x1="0" y1={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} x2={WIDTH} y2={HEIGHT / 2 - (-THEORETICAL_OVERSHOOT / MAX_Y) * (HEIGHT / 2)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d={idealPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
              <path d={approxPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-lg text-xs space-y-2">
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
              <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-sky-500/20 text-sky-400 border border-sky-500/50'}`}>
                {isPlaying ? 'Stop Animation' : 'Auto-Play'}
              </button>
            </div>
            <input type="range" min="1" max="100" value={harmonics} onChange={(e) => { setHarmonics(parseInt(e.target.value)); setIsPlaying(false); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400" />
          </div>
        </div>
        <div className="w-full lg:w-2/5 p-6 md:p-10 flex flex-col justify-between bg-slate-900">
          <div>
            <div className="inline-block px-3 py-1 bg-indigo-900/50 text-indigo-300 rounded-full text-xs font-bold tracking-wider uppercase mb-4">Signal Processing 101</div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 mb-4 leading-tight">The Gibbs Phenomenon</h1>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>When you try to approximate a signal with a jump discontinuity (like a square wave) using a Fourier series, you'll notice something strange at the edges.</p>
              <p>No matter how many harmonics <span className="font-semibold text-slate-200">(N)</span> you add, the approximation always overshoots the jump. This peculiar behavior is known as <strong>Gibbs Ringing</strong>.</p>
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-sm my-6">
                <h3 className="font-bold text-slate-200 mb-2 flex items-center gap-2"><Info className="text-amber-500" size={20} /> Why does this happen?</h3>
                <p className="text-sm">Fourier series use continuous sine and cosine waves. A sudden, instantaneous jump is impossible for continuous functions to perfectly trace without infinite frequencies. The sum converges pointwise, but not uniformly, causing the energy to "bunch up" near the discontinuity.</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-900/20 rounded-xl border border-indigo-800/50">
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

export default function App() {
  const [activeTab, setActiveTab] = useState('coefficients');

  const tabs = [
    { id: 'coefficients', icon: <Edit3 size={18} />, label: 'Draw & Compute' },
    { id: 'animate', icon: <Play size={18} />, label: 'Animate Recon' },
    { id: 'charts', icon: <BarChart2 size={18} />, label: 'Mag & Phase' },
    { id: 'presets', icon: <Activity size={18} />, label: 'Presets & Loop' },
    { id: 'gibbs', icon: <Info size={18} />, label: 'Gibbs Explainer' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
            <Waves size={24} />
            Fourier Pad
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'coefficients' && <ComputeCoefficientsTab />}
        {activeTab === 'animate' && <AnimateReconstructionTab />}
        {activeTab === 'charts' && <MagnitudePhaseTab />}
        {activeTab === 'presets' && <PresetsTab />}
        {activeTab === 'gibbs' && <GibbsExplainerTab />}
      </div>
    </div>
  );
}