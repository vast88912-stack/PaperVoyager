import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const NUM_SAMPLES = 512;
const MAX_HARMONICS = 50;

// --- Signal Generation & Math Helpers ---

const generatePreset = (type: 'square' | 'saw' | 'triangle' | 'custom'): Float32Array => {
  const sig = new Float32Array(NUM_SAMPLES);
  if (type === 'custom') return sig;

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / NUM_SAMPLES; // 0 to 1
    if (type === 'square') {
      sig[i] = t < 0.5 ? 1 : -1;
    } else if (type === 'saw') {
      sig[i] = 2 * t - 1; // rising sawtooth
    } else if (type === 'triangle') {
      sig[i] = t < 0.25 ? 4 * t : t < 0.75 ? 2 - 4 * t : 4 * t - 4;
    }
  }
  return sig;
};

const computeFourierCoefficients = (signal: Float32Array, maxN: number) => {
  const a = new Float32Array(maxN + 1);
  const b = new Float32Array(maxN + 1);

  for (let n = 0; n <= maxN; n++) {
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = (i / NUM_SAMPLES) * 2 * Math.PI;
      sumA += signal[i] * Math.cos(n * x);
      sumB += signal[i] * Math.sin(n * x);
    }
    a[n] = (2 / NUM_SAMPLES) * sumA;
    b[n] = (2 / NUM_SAMPLES) * sumB;
  }
  a[0] = a[0] / 2; // Standard adjustment for a0
  return { a, b };
};

const reconstructSignal = (a: Float32Array, b: Float32Array, numHarmonics: number): Float32Array => {
  const reconstructed = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const x = (i / NUM_SAMPLES) * 2 * Math.PI;
    let sum = a[0];
    for (let n = 1; n <= numHarmonics; n++) {
      sum += a[n] * Math.cos(n * x) + b[n] * Math.sin(n * x);
    }
    reconstructed[i] = sum;
  }
  return reconstructed;
};

// --- Icons ---

const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;

// --- Main Component ---

export default function App() {
  const [preset, setPreset] = useState<'square' | 'saw' | 'triangle' | 'custom'>('square');
  const [signal, setSignal] = useState<Float32Array>(() => generatePreset('square'));
  const [targetHarmonics, setTargetHarmonics] = useState<number>(15);
  const [activeHarmonics, setActiveHarmonics] = useState<number>(15);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastDrawPosRef = useRef<{ x: number, y: number } | null>(null);

  // Compute Fourier coefficients whenever the signal changes
  const { a, b } = useMemo(() => computeFourierCoefficients(signal, MAX_HARMONICS), [signal]);

  // Reconstruct signal based on currently active harmonics (for animation)
  const reconstructed = useMemo(() => reconstructSignal(a, b, activeHarmonics), [a, b, activeHarmonics]);

  // Handle Animation
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isAnimating) return;
      
      const deltaTime = time - lastTime;
      if (deltaTime > 100) { // Update roughly every 100ms
        setActiveHarmonics((prev) => {
          if (prev >= targetHarmonics) {
            setIsAnimating(false);
            return targetHarmonics;
          }
          return prev + 1;
        });
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (isAnimating) {
      if (activeHarmonics >= targetHarmonics) {
        setActiveHarmonics(1); // Reset to 1 if we play from the end
      }
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating, targetHarmonics, activeHarmonics]);

  // Sync active harmonics when slider changes and not animating
  useEffect(() => {
    if (!isAnimating) {
      setActiveHarmonics(targetHarmonics);
    }
  }, [targetHarmonics, isAnimating]);

  // Canvas Drawing Logic
  const drawToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw Original Signal
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; // slate-400
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = (i / NUM_SAMPLES) * width;
      const y = (1 - (signal[i] + 1) / 2) * height; // Map -1..1 to height..0
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Reconstructed Signal
    ctx.beginPath();
    ctx.strokeStyle = '#4f46e5'; // indigo-600
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = (i / NUM_SAMPLES) * width;
      const y = (1 - (reconstructed[i] + 1) / 2) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [signal, reconstructed]);

  useEffect(() => {
    drawToCanvas();
  }, [drawToCanvas]);

  // Drawing Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    setPreset('custom');
    setIsAnimating(false);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const index = Math.max(0, Math.min(NUM_SAMPLES - 1, Math.floor((x / canvas.width) * NUM_SAMPLES)));
    const value = 1 - (y / canvas.height) * 2; // Map 0..height to 1..-1

    setSignal((prev) => {
      const next = new Float32Array(prev);
      
      // Interpolate to fill gaps if mouse moves fast
      if (lastDrawPosRef.current) {
        const lastIndex = lastDrawPosRef.current.x;
        const lastValue = lastDrawPosRef.current.y;
        const dist = Math.abs(index - lastIndex);
        if (dist > 1) {
          const step = (value - lastValue) / dist;
          const start = Math.min(index, lastIndex);
          const end = Math.max(index, lastIndex);
          const startVal = index < lastIndex ? value : lastValue;
          for (let i = start; i <= end; i++) {
            next[i] = startVal + step * (i - start);
          }
        } else {
          next[index] = value;
        }
      } else {
        next[index] = value;
      }
      
      lastDrawPosRef.current = { x: index, y: value };
      return next;
    });
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastDrawPosRef.current = null;
  };

  // Preset Selection
  const handlePresetSelect = (type: 'square' | 'saw' | 'triangle') => {
    setPreset(type);
    setSignal(generatePreset(type));
    setIsAnimating(false);
    setActiveHarmonics(targetHarmonics);
  };

  // CSV Export
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,TimeIndex,OriginalSignal,ReconstructedSignal\n";
    for (let i = 0; i < NUM_SAMPLES; i++) {
      csvContent += `${i},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fourier_signal_${preset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Data for Bar Charts
  const magnitudes = useMemo(() => {
    const mags = [];
    for (let n = 1; n <= activeHarmonics; n++) {
      mags.push(Math.sqrt(a[n] * a[n] + b[n] * b[n]));
    }
    return mags;
  }, [a, b, activeHarmonics]);

  const phases = useMemo(() => {
    const phs = [];
    for (let n = 1; n <= activeHarmonics; n++) {
      // Phase in radians, mapped for visualization
      phs.push(Math.atan2(b[n], a[n]));
    }
    return phs;
  }, [a, b, activeHarmonics]);

  const maxMag = Math.max(...magnitudes, 1.5); // Ensure scale isn't too tiny

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Fourier Sketchpad</h1>
          <p className="text-slate-500 mt-1">Interactive periodic signal reconstruction</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <DownloadIcon /> Export CSV
        </button>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Time Domain */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Controls Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Preset Signals</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              {(['square', 'saw', 'triangle'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePresetSelect(p)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                    preset === p 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <div className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                preset === 'custom' ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}>
                <EditIcon /> Custom (Draw Below)
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">
                  Harmonics (N = {targetHarmonics})
                </label>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {isAnimating ? <><PauseIcon /> Pause Build-up</> : <><PlayIcon /> Animate Build-up</>}
                </button>
              </div>
              <input
                type="range"
                min="1"
                max={MAX_HARMONICS}
                value={targetHarmonics}
                onChange={(e) => {
                  setTargetHarmonics(parseInt(e.target.value));
                  setIsAnimating(false);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>1 (Sine wave)</span>
                <span>{MAX_HARMONICS} (High fidelity)</span>
              </div>
            </div>
          </div>

          {/* Time Domain Canvas Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Domain</h2>
              <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 block"></span> Original
                </span>
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <span className="w-3 h-0.5 bg-indigo-600 block"></span> Reconstructed (N={activeHarmonics})
                </span>
              </div>
            </div>
            <div className="relative w-full aspect-[2/1] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden cursor-crosshair touch-none">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full h-full"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          </div>

          {/* Gibbs Explainer (Conditional) */}
          {(preset === 'square' || preset === 'saw') && activeHarmonics > 5 && (
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
               <strong>Notice the ripples?</strong> This is called the <em>Gibbs Phenomenon</em>. When approximating signals with jump discontinuities (like the sharp edges of a {preset} wave), Fourier series will always overshoot the jump by about 9%, no matter how many harmonics you add!
             </div>
          )}

        </div>

        {/* Right Column: Frequency Domain */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Magnitude Spectrum */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Magnitude Spectrum</h2>
            <div className="flex-1 w-full relative min-h-[180px] flex items-end gap-[2px]">
              {magnitudes.map((mag, idx) => {
                const heightPct = Math.min(100, (mag / maxMag) * 100);
                return (
                  <div key={`mag-${idx}`} className="flex-1 flex flex-col justify-end group relative h-full">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none z-10 transition-opacity whitespace-nowrap">
                      n={idx + 1}: {mag.toFixed(3)}
                    </div>
                    <div 
                      className="w-full bg-indigo-500 rounded-t-sm transition-all duration-300 ease-out hover:bg-indigo-400"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-center text-xs text-slate-400 font-medium">Harmonic Number (n)</div>
          </div>

          {/* Phase Spectrum */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Phase Spectrum</h2>
            <div className="flex-1 w-full relative min-h-[180px] flex items-center gap-[2px]">
              {/* Center Zero Line */}
              <div className="absolute w-full h-px bg-slate-200 top-1/2 -translate-y-1/2 z-0" />