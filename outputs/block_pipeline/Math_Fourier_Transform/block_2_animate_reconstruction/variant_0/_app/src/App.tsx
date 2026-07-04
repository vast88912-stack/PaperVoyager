import React, { useState, useEffect, useRef, useCallback } from 'react';

const SAMPLES = 800;
const CANVAS_HEIGHT = 300;
const FREQ_CANVAS_HEIGHT = 200;
const MAX_HARMONICS = 100;

export default function App() {
  const [signal, setSignal] = useState<number[]>(Array(SAMPLES).fill(0));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [coeffs, setCoeffs] = useState<{ a: number[]; b: number[]; mag: number[]; phase: number[] }>({
    a: [], b: [], mag: [], phase: []
  });
  const [reconstructed, setReconstructed] = useState<number[]>(Array(SAMPLES).fill(0));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationTime, setAnimationTime] = useState<number>(0);

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const reqAnimRef = useRef<number>();

  // --- Math & Signal Processing ---

  const computeFourier = useCallback((currentSignal: number[], numHarmonics: number) => {
    const a = new Array(numHarmonics + 1).fill(0);
    const b = new Array(numHarmonics + 1).fill(0);
    const mag = new Array(numHarmonics + 1).fill(0);
    const phase = new Array(numHarmonics + 1).fill(0);

    for (let n = 0; n <= numHarmonics; n++) {
      let sumA = 0;
      let sumB = 0;
      for (let i = 0; i < SAMPLES; i++) {
        const t = i / SAMPLES;
        const y = currentSignal[i];
        sumA += y * Math.cos(n * 2 * Math.PI * t);
        sumB += y * Math.sin(n * 2 * Math.PI * t);
      }
      
      a[n] = n === 0 ? sumA / SAMPLES : (2 * sumA) / SAMPLES;
      b[n] = n === 0 ? 0 : (2 * sumB) / SAMPLES;
      mag[n] = Math.sqrt(a[n] * a[n] + b[n] * b[n]);
      phase[n] = Math.atan2(-b[n], a[n]); // Phase in radians
    }

    setCoeffs({ a, b, mag, phase });

    const recon = new Array(SAMPLES).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      let y = a[0];
      for (let n = 1; n <= numHarmonics; n++) {
        y += a[n] * Math.cos(n * 2 * Math.PI * t) + b[n] * Math.sin(n * 2 * Math.PI * t);
      }
      recon[i] = y;
    }
    setReconstructed(recon);
  }, []);

  // Recompute when signal or harmonics change
  useEffect(() => {
    computeFourier(signal, harmonics);
  }, [signal, harmonics, computeFourier]);

  // --- Animation Loop ---

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

  // --- Canvas Rendering ---

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Horizontal center line
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SAMPLES, CANVAS_HEIGHT);
    drawGrid(ctx, SAMPLES, CANVAS_HEIGHT);

    const mapY = (val: number) => CANVAS_HEIGHT / 2 - val * (CANVAS_HEIGHT / 2.5);

    // Draw Original Signal
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 3;
    for (let i = 0; i < SAMPLES; i++) {
      ctx.lineTo(i, mapY(signal[i]));
    }
    ctx.stroke();

    // Draw Reconstructed Signal up to animationTime
    const currentSampleIndex = Math.floor(animationTime * SAMPLES);
    
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 3;
    for (let i = 0; i <= currentSampleIndex; i++) {
      ctx.lineTo(i, mapY(reconstructed[i]));
    }
    ctx.stroke();

    // Draw leading dot
    if (currentSampleIndex < SAMPLES) {
      const dotX = currentSampleIndex;
      const dotY = mapY(reconstructed[currentSampleIndex]);
      ctx.beginPath();
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw vertical sweeping line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
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
    
    const maxMag = Math.max(...coeffs.mag, 0.01);
    const barWidth = Math.max(2, (SAMPLES / (harmonics + 1)) - 4);

    for (let n = 0; n <= harmonics; n++) {
      const x = n * (SAMPLES / (harmonics + 1)) + 2;
      
      // Magnitude (Top half)
      const magHeight = (coeffs.mag[n] / maxMag) * (FREQ_CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#f43f5e'; // rose-500
      ctx.fillRect(x, FREQ_CANVAS_HEIGHT / 2 - magHeight, barWidth, magHeight);

      // Phase (Bottom half)
      const phaseHeight = (coeffs.phase[n] / Math.PI) * (FREQ_CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#14b8a6'; // teal-500
      ctx.fillRect(x, FREQ_CANVAS_HEIGHT / 2, barWidth, phaseHeight);
    }

    // Center line
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.moveTo(0, FREQ_CANVAS_HEIGHT / 2);
    ctx.lineTo(SAMPLES, FREQ_CANVAS_HEIGHT / 2);
    ctx.stroke();

  }, [coeffs, harmonics]);

  // --- Interaction ---

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const rect = timeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((e.clientX - rect.left) * (SAMPLES / rect.width));
    const y = ((e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height));
    const normalizedY = (CANVAS_HEIGHT / 2 - y) / (CANVAS_HEIGHT / 2.5);
    
    lastPosRef.current = { x, y: normalizedY };
    updateSignal(x, normalizedY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const rect = timeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.floor((e.clientX - rect.left) * (SAMPLES / rect.width));
    const y = ((e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height));
    const normalizedY = Math.max(-1.2, Math.min(1.2, (CANVAS_HEIGHT / 2 - y) / (CANVAS_HEIGHT / 2.5)));

    // Interpolate to fill gaps
    const startX = lastPosRef.current.x;
    const startY = lastPosRef.current.y;
    
    setSignal((prev) => {
      const newSignal = [...prev];
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

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  // --- Presets & Export ---

  const loadPreset = (type: 'square' | 'sawtooth' | 'triangle' | 'clear') => {
    const newSignal = new Array(SAMPLES).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      if (type === 'square') {
        newSignal[i] = t < 0.5 ? 1 : -1;
      } else if (type === 'sawtooth') {
        newSignal[i] = 1 - 2 * t;
      } else if (type === 'triangle') {
        newSignal[i] = 1 - 4 * Math.abs(t - 0.5);
      }
    }
    setSignal(newSignal);
    setAnimationTime(0);
  };

  const exportCSV = () => {
    let csv = 'Harmonic (n),a_n (Cosine Coeff),b_n (Sine Coeff),Magnitude,Phase (rad)\n';
    for (let n = 0; n <= harmonics; n++) {
      csv += `${n},${coeffs.a[n].toFixed(6)},${coeffs.b[n].toFixed(6)},${coeffs.mag[n].toFixed(6)},${coeffs.phase[n].toFixed(6)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fourier_coefficients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Fourier Sketchpad</h1>
            <p className="text-slate-500 mt-1">Draw a periodic signal to see its Fourier series approximation.</p>
          </div>
          <button 
            onClick={exportCSV}
            className="px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Export CSV
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Canvases */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Time Domain */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-slate-700">Time Domain</h2>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Draw below</span>
                </div>
              </div>
              <div className="relative bg-slate-50 rounded-lg overflow-hidden border border-slate-200 cursor-crosshair">
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
                <span className="text-sm text-slate-500">Time: {(animationTime * 100).toFixed(0)}%</span>
                <input 
                  type="range" 
                  min="0" max="1" step="0.01" 
                  value={animationTime} 
                  onChange={(e) => {
                    setIsPlaying(false);