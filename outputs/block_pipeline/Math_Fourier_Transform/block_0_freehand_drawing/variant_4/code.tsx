import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Constants & Types ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const MAX_HARMONICS = 50;

type Coefficient = {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
};

// --- Math Helpers ---
const generateSquareWave = (width: number) =>
  Array.from({ length: width }, (_, i) => (i < width / 2 ? 1 : -1));

const generateSawtoothWave = (width: number) =>
  Array.from({ length: width }, (_, i) => 2 * (i / width) - 1);

const generateTriangleWave = (width: number) =>
  Array.from({ length: width }, (_, i) => {
    const t = i / width;
    return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  });

// --- Main Component ---
export default function FourierSketchpad() {
  // State
  const [signal, setSignal] = useState<number[]>(new Array(CANVAS_WIDTH).fill(0));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [preset, setPreset] = useState<string>('custom');
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // --- Signal Processing ---
  // Compute Real Fourier Series Coefficients
  const coefficients = useMemo(() => {
    const L = signal.length;
    const coeffs: Coefficient[] = [];

    for (let n = 0; n <= MAX_HARMONICS; n++) {
      let a = 0;
      let b = 0;
      for (let k = 0; k < L; k++) {
        const angle = (2 * Math.PI * n * k) / L;
        a += signal[k] * Math.cos(angle);
        b += signal[k] * Math.sin(angle);
      }
      a = (2 / L) * a;
      b = (2 / L) * b;

      if (n === 0) {
        a = a / 2; // DC component
        b = 0;
      }

      coeffs.push({
        n,
        a,
        b,
        mag: Math.sqrt(a * a + b * b),
        phase: Math.atan2(b, a),
      });
    }
    return coeffs;
  }, [signal]);

  // Reconstruct signal from up to `harmonics` coefficients
  const reconstructedSignal = useMemo(() => {
    const L = signal.length;
    const recon = new Array(L).fill(0);

    for (let k = 0; k < L; k++) {
      let val = coefficients[0].a; // DC
      for (let n = 1; n <= harmonics; n++) {
        const angle = (2 * Math.PI * n * k) / L;
        val += coefficients[n].a * Math.cos(angle) + coefficients[n].b * Math.sin(angle);
      }
      recon[k] = val;
    }
    return recon;
  }, [coefficients, harmonics]);

  // --- Drawing Interaction (Enforces y = f(x)) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (preset !== 'custom') {
      setPreset('custom');
      setSignal(new Array(CANVAS_WIDTH).fill(0));
    }
    setIsDrawing(true);
    const rect = timeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor(e.clientX - rect.left);
    const y = e.clientY - rect.top;
    const val = 1 - y / (CANVAS_HEIGHT / 2); // Map canvas Y to [-1, 1]
    
    setLastPos({ x, y: val });
    updateSignal(x, val, x, val);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return;
    const rect = timeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.floor(e.clientX - rect.left);
    const y = e.clientY - rect.top;
    const val = Math.max(-1, Math.min(1, 1 - y / (CANVAS_HEIGHT / 2)));

    updateSignal(lastPos.x, lastPos.y, x, val);
    setLastPos({ x, y: val });
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const updateSignal = (startX: number, startY: number, endX: number, endY: number) => {
    setSignal((prev) => {
      const next = [...prev];
      const minX = Math.max(0, Math.min(startX, endX));
      const maxX = Math.min(CANVAS_WIDTH - 1, Math.max(startX, endX));
      
      if (minX === maxX) {
        next[minX] = endY;
      } else {
        // Linear interpolation to fill gaps when drawing fast
        for (let i = minX; i <= maxX; i++) {
          const t = (i - minX) / (maxX - minX);
          const interpolatedY = startX < endX 
            ? startY + t * (endY - startY)
            : endY + t * (startY - endY);
          next[i] = interpolatedY;
        }
      }
      return next;
    });
  };

  // --- Rendering ---
  const drawTimeDomain = useCallback(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid / Axes
    ctx.strokeStyle = '#e2e8f0'; // tailwind slate-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    // Draw Original Signal (User drawn / Preset)
    ctx.strokeStyle = '#94a3b8'; // tailwind slate-400
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < CANVAS_WIDTH; i++) {
      const x = i;
      const y = (1 - signal[i]) * (CANVAS_HEIGHT / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Reconstructed Signal
    ctx.strokeStyle = '#4f46e5'; // tailwind indigo-600
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < CANVAS_WIDTH; i++) {
      const x = i;
      const y = (1 - reconstructedSignal[i]) * (CANVAS_HEIGHT / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [signal, reconstructedSignal]);

  const drawFrequencyDomain = useCallback(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dynamic scaling based on max magnitude
    const maxMag = Math.max(...coefficients.slice(1).map(c => c.mag), 0.1); 
    const barWidth = (CANVAS_WIDTH - 40) / MAX_HARMONICS;

    // Grid line for 0
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - 20);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 20);
    ctx.stroke();

    coefficients.forEach((c, i) => {
      if (i === 0) return; // Skip DC for clearer AC scale

      const x = 20 + (i - 1) * barWidth;
      const height = (c.mag / maxMag) * (CANVAS_HEIGHT - 40);
      const y = CANVAS_HEIGHT - 20 - height;

      // Active vs Inactive harmonics
      ctx.fillStyle = i <= harmonics ? '#4f46e5' : '#cbd5e1'; 
      ctx.fillRect(x + 2, y, barWidth - 4, height);

      // Label some Ns
      if (i % 5 === 0 || i === 1) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`n=${i}`, x + barWidth / 2, CANVAS_HEIGHT - 5);
      }
    });
  }, [coefficients, harmonics]);

  useEffect(() => {
    drawTimeDomain();
  }, [drawTimeDomain]);

  useEffect(() => {
    drawFrequencyDomain();
  }, [drawFrequencyDomain]);

  // --- Animation Loop ---
  useEffect(() => {
    if (!isAnimating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let forward = true;
    const animate = () => {
      setHarmonics((prev) => {
        if (prev >= MAX_HARMONICS) forward = false;
        if (prev <= 1) forward = true;
        return forward ? prev + 1 : prev - 1;
      });
      // Throttle speed slightly
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 50);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating]);

  // --- Handlers ---
  const applyPreset = (type: string) => {
    setPreset(type);
    setIsAnimating(false);
    if (type === 'square') setSignal(generateSquareWave(CANVAS_WIDTH));
    else if (type === 'saw') setSignal(generateSawtoothWave(CANVAS_WIDTH));
    else if (type === 'triangle') setSignal(generateTriangleWave(CANVAS_WIDTH));
  };

  const exportCSV = () => {
    let csv = "time_index,original_signal,reconstructed_signal\n";
    for (let i = 0; i < CANVAS_WIDTH; i++) {
      csv += `${i},${signal[i].toFixed(4)},${reconstructedSignal[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fourier_signal_${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center py-10 px-4">
      
      {/* Header */}
      <div className="max-w-6xl w-full mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fourier Sketchpad</h1>
          <p className="text-slate-500 mt-1">Draw a periodic signal and explore its frequency domain.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="text-sm px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-100 transition font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Presets Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Waveform Presets</h2>
            <div className="flex flex-col gap-2">
              {[
                { id: 'square', label: 'Square Wave' },
                { id: 'saw', label: 'Sawtooth Wave' },
                { id: 'triangle', label: 'Triangle Wave' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-4 py-2 text-left rounded-md text-sm font-medium transition ${
                    preset === p.id 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                 onClick={() => {
                   setPreset('custom');
                   setSignal(new Array(CANVAS_WIDTH).fill(0));
                 }}
                 className={`px-4 py-2 mt-2 text-left rounded-md text-sm font-medium transition border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 ${preset === 'custom' ? 'bg-slate-100' : 'bg-white'}`}
              >
                Clear / Custom Draw
              </button>
            </div>

            {/* Gibbs Phenomenon Explainer */}
            {(preset === 'square' || preset === 'saw') && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Gibbs Phenomenon
                </h3>
                <p className="text-[11px] text-amber-700 mt-1 leading-tight">
                  Notice the "ringing" or overshoots near the sharp edges? A finite sum of continuous sine waves cannot perfectly represent a jump discontinuity without overshooting by ~9%.
                </p>
              </div>
            )}
          </div>

          {/* Settings Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Reconstruction</h2>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Harmonics (N = {harmonics})</label>
                <button 
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={`p-1.5 rounded-full transition ${isAnimating ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  title={isAnimating ? "Stop Sweep" : "Auto Sweep N"}
                >
                  {isAnimating ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  )}
                </button>
              </div>
              <input
                type="range"
                min="1"
                max={MAX_HARMONICS}
                value={harmonics}
                onChange={(e) => {
                  setHarmonics(parseInt(e.target.value));
                  setIsAnimating(false);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Fund.</span>
                <span>High Freq</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
               <div className="flex items-center gap-2">
                  <div className="