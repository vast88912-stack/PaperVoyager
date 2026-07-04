import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Activity, Download, Play, Pause, Info, Square, Triangle, Zap } from 'lucide-react';

const SAMPLE_RATE = 512;
const MAX_HARMONICS = 100;

interface Harmonic {
  n: number;
  an: number;
  bn: number;
  mag: number;
  phase: number;
}

interface Coeffs {
  a0: number;
  h: Harmonic[];
}

export default function App() {
  const [signal, setSignal] = useState<number[]>(new Array(SAMPLE_RATE).fill(0));
  const [numHarmonics, setNumHarmonics] = useState<number>(15);
  const [isDrawing, setIsDrawing] = useState(false);
  const [animating, setAnimating] = useState(true);
  const [scanX, setScanX] = useState(0);

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawRef = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number>();

  // Generate Presets
  const loadPreset = (type: 'square' | 'saw' | 'triangle') => {
    const newSignal = new Array(SAMPLE_RATE).fill(0);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const t = i / SAMPLE_RATE;
      if (type === 'square') {
        newSignal[i] = t < 0.5 ? 1 : -1;
      } else if (type === 'saw') {
        newSignal[i] = 2 * (0.5 - t);
      } else if (type === 'triangle') {
        newSignal[i] = t < 0.5 ? -1 + 4 * t : 3 - 4 * t;
      }
    }
    setSignal(newSignal);
  };

  // Initialize with a square wave
  useEffect(() => {
    loadPreset('square');
  }, []);

  // Compute Fourier Coefficients (Real-valued series)
  const coeffs = useMemo<Coeffs>(() => {
    let a0 = 0;
    for (let i = 0; i < SAMPLE_RATE; i++) a0 += signal[i];
    a0 = (2 / SAMPLE_RATE) * a0;

    const h: Harmonic[] = [];
    for (let n = 1; n <= numHarmonics; n++) {
      let an = 0;
      let bn = 0;
      for (let i = 0; i < SAMPLE_RATE; i++) {
        const t = i / SAMPLE_RATE;
        an += signal[i] * Math.cos(2 * Math.PI * n * t);
        bn += signal[i] * Math.sin(2 * Math.PI * n * t);
      }
      an *= 2 / SAMPLE_RATE;
      bn *= 2 / SAMPLE_RATE;
      h.push({
        n,
        an,
        bn,
        mag: Math.sqrt(an * an + bn * bn),
        phase: Math.atan2(bn, an),
      });
    }
    return { a0, h };
  }, [signal, numHarmonics]);

  // Reconstruct Signal from Coefficients
  const reconstructed = useMemo(() => {
    const rec = new Array(SAMPLE_RATE).fill(coeffs.a0 / 2);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const t = i / SAMPLE_RATE;
      for (const h of coeffs.h) {
        rec[i] += h.an * Math.cos(2 * Math.PI * h.n * t) + h.bn * Math.sin(2 * Math.PI * h.n * t);
      }
    }
    return rec;
  }, [coeffs]);

  // Animation Loop
  useEffect(() => {
    if (!animating) return;
    let start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      // 1 full sweep every 2 seconds
      const progress = (elapsed % 2000) / 2000;
      setScanX(Math.floor(progress * SAMPLE_RATE));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animating]);

  // Draw Time Domain Canvas
  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Draw Original Signal
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const x = (i / SAMPLE_RATE) * width;
      const y = midY - (signal[i] * height) / 2.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Reconstructed Signal
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const x = (i / SAMPLE_RATE) * width;
      const y = midY - (reconstructed[i] * height) / 2.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Scanner
    if (animating) {
      const x = (scanX / SAMPLE_RATE) * width;
      const y = midY - (reconstructed[scanX] * height) / 2.5;
      
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#ef4444';
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [signal, reconstructed, scanX, animating]);

  // Draw Frequency Domain Canvas
  useEffect(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const magHeight = height * 0.65;
    const phaseHeight = height * 0.35;

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / (numHarmonics + 2);
    const maxMag = Math.max(Math.abs(coeffs.a0 / 2), ...coeffs.h.map(h => h.mag), 0.1);

    // DC Component (n=0)
    const drawBar = (n: number, mag: number, phase: number) => {
      const x = (n + 1) * barWidth;
      
      // Magnitude
      const barH = (mag / maxMag) * (magHeight - 20);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x - barWidth * 0.3, magHeight - barH, barWidth * 0.6, barH);
      
      // Phase
      const phaseY = magHeight + (phaseHeight / 2) - (phase / Math.PI) * (phaseHeight / 2 - 10);
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(x, phaseY, Math.min(barWidth * 0.3, 4), 0, 2 * Math.PI);
      ctx.fill();
    };

    // Draw axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, magHeight);
    ctx.lineTo(width, magHeight);
    ctx.moveTo(0, magHeight + phaseHeight / 2);
    ctx.lineTo(width, magHeight + phaseHeight / 2);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('Magnitude', 5, 15);
    ctx.fillText('Phase', 5, magHeight + 15);

    drawBar(0, Math.abs(coeffs.a0 / 2), coeffs.a0 < 0 ? Math.PI : 0);
    coeffs.h.forEach(h => drawBar(h.n, h.mag, h.phase));

  }, [coeffs, numHarmonics]);

  // Drawing Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    updateSignalFromEvent(e, false);
    if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    updateSignalFromEvent(e, true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    lastDrawRef.current = null;
    if (canvasRef.current) canvasRef.current.releasePointerCapture(e.pointerId);
  };

  const updateSignalFromEvent = (e: React.PointerEvent<HTMLCanvasElement>, interpolate: boolean) => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * SAMPLE_RATE);
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1) * 1.25; // Scale mapping

    setSignal(prev => {
      const next = [...prev];
      const clampedY = Math.max(-1, Math.min(1, y));
      
      if (interpolate && lastDrawRef.current) {
        const { x: lastX, y: lastY } = lastDrawRef.current;
        const steps = Math.abs(x - lastX);
        if (steps > 0) {
          for (let i = 0; i <= steps; i++) {
            const interpX = Math.floor(lastX + (x - lastX) * (i / steps));
            const interpY = lastY + (clampedY - lastY) * (i / steps);
            if (interpX >= 0 && interpX < SAMPLE_RATE) next[interpX] = interpY;
          }
        } else if (x >= 0 && x < SAMPLE_RATE) {
          next[x] = clampedY;
        }
      } else {
        if (x >= 0 && x < SAMPLE_RATE) next[x] = clampedY;
      }
      
      lastDrawRef.current = { x, y: clampedY };
      return next;
    });
  };

  const canvasRef = timeCanvasRef;

  const exportCSV = () => {
    let csv = 'TimeIndex,Original,Reconstructed\n';
    for (let i = 0; i < SAMPLE_RATE; i++) {
      csv += `${i},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fourier_signal.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans selection:bg-blue-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Fourier Sketchpad</h1>
              <p className="text-sm text-slate-500 font-medium">Draw a signal. See the math.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => loadPreset('square')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-700">
                <Square size={16} /> Square
              </button>
              <button onClick={() => loadPreset('saw')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-700">
                <Zap size={16} /> Saw
              </button>
              <button onClick={() => loadPreset('triangle')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-700">
                <Triangle size={16} /> Triangle
              </button>
            </div>
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Canvases */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Time Domain */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    Time Domain 
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full border border-slate-200">Draw Here</span>
                  </h2>
                  <p className="text-sm text-slate-500">Original signal (gray) vs. Reconstructed (blue)</p>
                </div>
                <button 
                  onClick={() => setAnimating(!animating)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                  title="Toggle Animation"
                >
                  {animating ? <Pause size={20} /> : <Play size={20} />}
                </button>
              </div>
              
              <div className="relative w-full aspect-[2/1] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden cursor-crosshair touch-none">
                <canvas
                  ref={timeCanvasRef}
                  width={1024}
                  height={512}
                  className="w-full h-full"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>
            </div>

            {/* Frequency Domain */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="mb-4">
                <h2 className="text-lg font-bold">Frequency Domain</h2>
                <p className="text-sm text-slate-500">Magnitude (top) and Phase (bottom) of harmonics</p>
              </div>
              <div className="relative w-full aspect-[3/1] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <canvas
                  ref={freqCanvasRef}
                  width={1024}
                  height={340}
                  className="w-full h-full"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Controls */}
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-6">Harmonics Control</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-slate-700">Compute up to N harmonics</label>
                    <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                      N = {numHarmonics}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max={MAX_HARMONICS} 
                    value={numHarmonics}
                    onChange={(e) => setNumHarmonics(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                    <span>1 (Sine wave)</span>
                    <span>{MAX_HARMONICS} (High detail)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-slate-500">Sampling Rate</span>
                    <span className="font-mono font-medium">{SAMPLE_RATE} Hz</span>
                  </div>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-slate-500">Nyquist Limit</span>
                    <span className="