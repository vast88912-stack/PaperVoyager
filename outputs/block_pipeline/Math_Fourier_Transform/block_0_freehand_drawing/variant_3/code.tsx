import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const N_SAMPLES = 512;
const MAX_HARMONICS = 100;

// Presets
const generateSquare = () => Array.from({ length: N_SAMPLES }, (_, i) => (i < N_SAMPLES / 2 ? 0.8 : -0.8));
const generateSawtooth = () => Array.from({ length: N_SAMPLES }, (_, i) => 0.8 * (2 * (i / N_SAMPLES) - 1));
const generateTriangle = () => Array.from({ length: N_SAMPLES }, (_, i) => {
  const t = i / N_SAMPLES;
  return t < 0.5 ? 0.8 * (4 * t - 1) : 0.8 * (3 - 4 * t);
});
const generateZero = () => Array(N_SAMPLES).fill(0);

export default function App() {
  const [signal, setSignal] = useState<number[]>(generateSquare());
  const [harmonics, setHarmonics] = useState<number>(10);
  const [isDrawing, setIsDrawing] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showGibbs, setShowGibbs] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number>();
  const [animTime, setAnimTime] = useState(0);

  // Compute Fourier Coefficients
  const { a0, an, bn } = useMemo(() => {
    let sumA0 = 0;
    for (let i = 0; i < N_SAMPLES; i++) sumA0 += signal[i];
    const a0 = sumA0 / N_SAMPLES;

    const an = [];
    const bn = [];

    for (let n = 1; n <= harmonics; n++) {
      let sumA = 0;
      let sumB = 0;
      for (let i = 0; i < N_SAMPLES; i++) {
        const t = i / N_SAMPLES;
        const angle = 2 * Math.PI * n * t;
        sumA += signal[i] * Math.cos(angle);
        sumB += signal[i] * Math.sin(angle);
      }
      an.push((2 / N_SAMPLES) * sumA);
      bn.push((2 / N_SAMPLES) * sumB);
    }

    return { a0, an, bn };
  }, [signal, harmonics]);

  // Compute Reconstructed Signal
  const reconstructed = useMemo(() => {
    const rec = new Array(N_SAMPLES).fill(0);
    for (let i = 0; i < N_SAMPLES; i++) {
      const t = i / N_SAMPLES;
      let val = a0;
      for (let n = 1; n <= harmonics; n++) {
        const angle = 2 * Math.PI * n * t;
        val += an[n - 1] * Math.cos(angle) + bn[n - 1] * Math.sin(angle);
      }
      rec[i] = val;
    }
    return rec;
  }, [a0, an, bn, harmonics]);

  // Magnitudes and Phases for Bar Charts
  const { magnitudes, phases } = useMemo(() => {
    const mags = [];
    const phs = [];
    for (let n = 0; n < harmonics; n++) {
      const a = an[n];
      const b = bn[n];
      mags.push(Math.sqrt(a * a + b * b));
      phs.push(Math.atan2(-b, a)); // Phase in radians
    }
    return { magnitudes, phases: phs };
  }, [an, bn, harmonics]);

  // Drawing Logic - Map canvas coords to array indices
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    // Convert to index and signal value
    const idx = Math.floor((x / rect.width) * (N_SAMPLES - 1));
    const val = 1 - 2 * (y / rect.height);
    
    return { idx, val };
  };

  const drawSegment = (startIdx: number, startVal: number, endIdx: number, endVal: number) => {
    setSignal((prev) => {
      const next = [...prev];
      const step = startIdx <= endIdx ? 1 : -1;
      const count = Math.abs(endIdx - startIdx) + 1;
      
      for (let i = 0; i < count; i++) {
        const currIdx = startIdx + i * step;
        const t = count > 1 ? i / (count - 1) : 0;
        next[currIdx] = startVal + t * (endVal - startVal);
      }
      return next;
    });
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const { idx, val } = getCanvasCoords(e, canvasRef.current);
    lastDrawPos.current = { x: idx, y: val };
    
    setSignal((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current || !lastDrawPos.current) return;
    e.preventDefault(); // Prevent scrolling on touch
    
    const { idx, val } = getCanvasCoords(e, canvasRef.current);
    drawSegment(lastDrawPos.current.x, lastDrawPos.current.y, idx, val);
    lastDrawPos.current = { x: idx, y: val };
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
    lastDrawPos.current = null;
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const drawCanvas = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Horizontal center line
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      // Vertical grid lines
      for (let i = 1; i < 8; i++) {
        ctx.moveTo((width / 8) * i, 0);
        ctx.lineTo((width / 8) * i, height);
      }
      // Horizontal grid lines
      for (let i = 1; i < 4; i++) {
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
      }
      ctx.stroke();

      // Draw Original Signal (User Drawing)
      ctx.beginPath();
      ctx.strokeStyle = '#94a3b8'; // slate-400
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let i = 0; i < N_SAMPLES; i++) {
        const x = (i / (N_SAMPLES - 1)) * width;
        const y = (1 - signal[i]) * (height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Reconstructed Signal
      ctx.beginPath();
      ctx.strokeStyle = '#f97316'; // orange-500
      ctx.lineWidth = 2.5;
      
      const drawLimit = animate ? Math.floor(animTime * N_SAMPLES) : N_SAMPLES;

      for (let i = 0; i < drawLimit; i++) {
        const x = (i / (N_SAMPLES - 1)) * width;
        const y = (1 - reconstructed[i]) * (height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Animation Sweep Line
      if (animate && drawLimit < N_SAMPLES) {
        const sweepX = (drawLimit / (N_SAMPLES - 1)) * width;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // red-500
        ctx.lineWidth = 2;
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, height);
        ctx.stroke();
        
        // Draw little circle at current reconstructed point
        const sweepY = (1 - reconstructed[drawLimit]) * (height / 2);
        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(sweepX, sweepY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    drawCanvas();
  }, [signal, reconstructed, animTime, animate]);

  // Animation Loop
  useEffect(() => {
    if (!animate) {
      setAnimTime(1);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let start = performance.now();
    const duration = 3000; // 3 seconds per sweep

    const loop = (time: number) => {
      let elapsed = time - start;
      if (elapsed > duration) {
        start = time;
        elapsed = 0;
      }
      setAnimTime(elapsed / duration);
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Export CSV
  const handleExport = () => {
    let csv = 'Time,OriginalSignal,ReconstructedSignal\n';
    for (let i = 0; i < N_SAMPLES; i++) {
      const t = (i / N_SAMPLES).toFixed(4);
      csv += `${t},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Fourier Sketchpad
          </h1>
          <p className="text-sm text-slate-500 mt-1">Draw any periodic signal and see its Fourier series approximation.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowGibbs(!showGibbs)}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Gibbs Phenomenon
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </header>

      {/* Gibbs Explainer Alert */}
      {showGibbs && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-orange-800 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
          <strong>The Gibbs Phenomenon:</strong> Notice the "wiggles" or ringing near sharp corners (like in a square wave)? 
          This happens because we are approximating a discontinuous function with a finite sum of continuous sine waves. 
          No matter how many harmonics you add, the overshoot near the jump will remain about 9% of the jump's height!
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Time Domain & Drawing */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Time Domain</h2>
                <p className="text-xs text-slate-500">Draw freely on the canvas below</p>
              </div>
              
              {/* Toolbar */}
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setSignal(generateSquare())} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-700">Square</button>
                <button onClick={() => setSignal(generateSawtooth())} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-700">Saw</button>
                <button onClick={() => setSignal(generateTriangle())} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-700">Triangle</button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button onClick={() => setSignal(generateZero())} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all text-red-600">Clear</button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative w-full aspect-[21/9] bg-white rounded-xl overflow-hidden border-2 border-slate-200 cursor-crosshair touch-none shadow-inner group">
              {/* Legend overlay */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="w-3 h-0.5 bg-slate-400"></div> Original
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                  <div className="w-3 h-0.5 bg-orange-500"></div> Reconstructed
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={N_SAMPLES}
                height={220} // Fixed internal height to maintain scale
                className="w-full h-full block"
                onMouseDown={handleStartDraw}
                onMouseMove={handleDraw}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleDraw}
                onTouchEnd={handleEndDraw}
              />
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-6 mt-2">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Number of Harmonics (N)</label>
                  <span className="text-sm font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">{harmonics}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={MAX_HARMONICS} 
                  value={harmonics} 
                  onChange={(e) => setHarmonics(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 (Fundamental)</span>
                  <span>100 (High Fidelity)</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Animation</label>
                <button
                  onClick={() => setAnimate(!animate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${animate ? 'bg-orange-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${animate ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Frequency Domain */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Frequency Domain</h2>
              <p className="text-xs text-slate-500 mb-6">Magnitude & Phase of Harmonics</p>
            </div>

            <div className="flex flex-col gap-8 flex-1">
              {/* Magnitude Chart */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Magnitude |Cₙ|</h3>
                <div className="flex-1 flex items-end gap-[1px] bg-slate-50 border-b-2 border-l-2 border-slate-200 p-2 h-32">
                  {magnitudes.map((mag, i) => {
                    // scale visually, cap at 1