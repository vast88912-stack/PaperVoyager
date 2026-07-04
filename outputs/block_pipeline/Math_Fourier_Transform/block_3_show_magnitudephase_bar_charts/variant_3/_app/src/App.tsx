import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

const NUM_SAMPLES = 512;
const SAMPLING_RATE = 512; // Hz (1 period = 1 second for simplicity)

// Utility to generate preset signals
const generateSignal = (type: 'square' | 'saw' | 'triangle' | 'sine' | 'flat'): number[] => {
  const sig = new Array(NUM_SAMPLES).fill(0);
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / NUM_SAMPLES;
    switch (type) {
      case 'square':
        sig[i] = t < 0.5 ? 1 : -1;
        break;
      case 'saw':
        sig[i] = 2 * (t - Math.floor(t + 0.5));
        break;
      case 'triangle':
        sig[i] = 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
        break;
      case 'sine':
        sig[i] = Math.sin(2 * Math.PI * t);
        break;
      case 'flat':
      default:
        sig[i] = 0;
        break;
    }
  }
  return sig;
};

// Math: Compute Real Fourier Series Coefficients
interface FourierCoeff {
  k: number;
  ak: number;
  bk: number;
  mag: number;
  phase: number;
}

const computeFourier = (signal: number[], maxHarmonics: number): FourierCoeff[] => {
  const N = signal.length;
  const coeffs: FourierCoeff[] = [];

  for (let k = 0; k <= maxHarmonics; k++) {
    let ak = 0;
    let bk = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      ak += signal[n] * Math.cos(angle);
      bk += signal[n] * Math.sin(angle);
    }
    
    // Normalize
    ak *= k === 0 ? 1 / N : 2 / N;
    bk *= k === 0 ? 0 : 2 / N;

    const mag = Math.sqrt(ak * ak + bk * bk);
    // If magnitude is practically zero, phase is noise. Force to 0.
    let phase = mag > 1e-5 ? Math.atan2(-bk, ak) : 0; 

    coeffs.push({ k, ak, bk, mag, phase });
  }
  return coeffs;
};

// Math: Reconstruct signal from coefficients
const reconstructSignal = (coeffs: FourierCoeff[], N: number): number[] => {
  const recon = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    for (let i = 0; i < coeffs.length; i++) {
      const { k, ak, bk } = coeffs[i];
      const angle = (2 * Math.PI * k * n) / N;
      recon[n] += ak * Math.cos(angle) + bk * Math.sin(angle);
    }
  }
  return recon;
};

export default function App() {
  const [signal, setSignal] = useState<number[]>(generateSignal('square'));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawPos, setLastDrawPos] = useState<{x: number, y: number} | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derived state
  const coeffs = useMemo(() => computeFourier(signal, harmonics), [signal, harmonics]);
  const reconstructed = useMemo(() => reconstructSignal(coeffs, NUM_SAMPLES), [coeffs]);

  // Canvas Drawing Logic
  const drawOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const drawWave = (wave: number[], color: string, lineWidth: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      for (let i = 0; i < NUM_SAMPLES; i++) {
        const x = (i / NUM_SAMPLES) * width;
        // Map Y: Amplitude 1.5 -> top (0), Amplitude -1.5 -> bottom (height)
        const y = height / 2 - (wave[i] / 1.5) * (height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Draw Original Signal (Thick, semi-transparent blue)
    drawWave(signal, 'rgba(59, 130, 246, 0.4)', 6);
    
    // Draw Reconstructed Signal (Crisp Rose)
    drawWave(reconstructed, 'rgba(225, 29, 72, 1)', 2);

  }, [signal, reconstructed]);

  useEffect(() => {
    drawOnCanvas();
  }, [drawOnCanvas]);

  // Handle Freehand Drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    updateSignalFromEvent(e, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    updateSignalFromEvent(e, false);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setLastDrawPos(null);
  };

  const updateSignalFromEvent = (e: React.PointerEvent<HTMLCanvasElement>, isFirst: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const xPos = (e.clientX - rect.left) * scaleX;
    const yPos = (e.clientY - rect.left) * scaleY;

    // Convert to index and amplitude
    const index = Math.min(Math.max(Math.floor((xPos / canvas.width) * NUM_SAMPLES), 0), NUM_SAMPLES - 1);
    const amplitude = Math.max(Math.min(((canvas.height / 2 - yPos) / (canvas.height / 2)) * 1.5, 1.5), -1.5);

    setSignal((prev) => {
      const newSig = [...prev];
      if (isFirst || !lastDrawPos) {
        newSig[index] = amplitude;
      } else {
        // Linear interpolation to fill gaps when moving mouse fast
        const idxDist = Math.abs(index - lastDrawPos.x);
        const steps = Math.max(idxDist, 1);
        for (let i = 0; i <= steps; i++) {
          const interpIdx = Math.round(lastDrawPos.x + (index - lastDrawPos.x) * (i / steps));
          const interpAmp = lastDrawPos.y + (amplitude - lastDrawPos.y) * (i / steps);
          if (interpIdx >= 0 && interpIdx < NUM_SAMPLES) {
            newSig[interpIdx] = interpAmp;
          }
        }
      }
      return newSig;
    });

    setLastDrawPos({ x: index, y: amplitude });
  };

  // CSV Export
  const exportCSV = () => {
    let csv = `k,ak,bk,Magnitude,Phase\n`;
    coeffs.forEach(c => {
      csv += `${c.k},${c.ak.toFixed(5)},${c.bk.toFixed(5)},${c.mag.toFixed(5)},${c.phase.toFixed(5)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fourier_harmonics_N${harmonics}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-rose-500">
              Fourier Sketchpad
            </h1>
            <p className="text-slate-500 font-medium mt-1">Magnitude & Phase Bar Chart Explorer</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(['square', 'saw', 'triangle', 'sine', 'flat'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSignal(generateSignal(type))}
                className="px-4 py-2 text-sm font-semibold capitalize bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
        </header>

        {/* Main Grid: Signal & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Editor Column */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Drawn Signal & 
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block ml-1"></span> Reconstruction
              </h2>
              <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                Fs = {SAMPLING_RATE} Hz
              </span>
            </div>
            
            <div className="relative flex-1 w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden cursor-crosshair group">
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                className="w-full h-full object-cover touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="bg-white/80 backdrop-blur text-slate-600 px-4 py-2 rounded-full font-semibold shadow-sm -translate-y-20">
                  Draw to modify signal
                </span>
              </div>
            </div>

            {/* Explanation box */}
            <div className="mt-4 p-4 bg-amber-50 text-amber-900 rounded-xl text-sm leading-relaxed border border-amber-200">
              <strong className="block mb-1 text-amber-700">The Gibbs Phenomenon</strong>
              Notice the ringing (overshoot) at sharp corners or vertical drops in your signal? 
              This is called the <em>Gibbs phenomenon</em>, mathematically caused by truncating an infinite Fourier series to a finite {harmonics} harmonics.
            </div>
          </div>

          {/* Controls Column */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
            <div>
              <label className="flex justify-between items-end mb-3">
                <span className="text-lg font-bold text-slate-800">Harmonics (N)</span>
                <span className="text-2xl font-black text-indigo-600">{harmonics}</span>
              </label>
              <input
                type="range"
                min="0"
                max="64"
                value={harmonics}
                onChange={(e) => setHarmonics(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 font-medium mt-2">
                <span>0 (DC only)</span>
                <span>64 Max</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 mt-auto">
              <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Data Actions</h3>
              <button
                onClick={exportCSV}
                className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV Coefficients
              </button>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Magnitude Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Magnitude Spectrum <span className="text-slate-400 font-medium text-base ml-2">|X[k]|</span></h2>
            <div className="w-full h-64 relative border-b-2 border-l-2 border-slate-200 pb-2 pl-2">
              <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(10, harmonics) * 20 + 20} 120`} preserveAspectRatio="none" className="overflow-visible">
                {coeffs.map((c, i) => {
                  // Normalize height. Max magnitude for typical waves is ~1.27
                  const maxExpected = 1.5; 
                  const barHeight = Math.max(0, Math.min((c.mag / maxExpected) * 120, 120));
                  return (
                    <g key={`mag-${i}`} className="group relative">
                      <rect
                        x={i * 20 + 2}
                        y={120 - barHeight}
                        width={16}
                        height={barHeight}
                        className="fill-indigo-500 hover:fill-indigo-400 transition-colors cursor-pointer"
                        rx={2}
                      />
                      {/* Interactive Tooltip behavior via hover text in SVG context */}
                      <text x={i * 20 + 10} y={120 - barHeight - 5} textAnchor="middle" className="text-[8px] fill-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.mag.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {/* X-axis labels */}
              <div className="absolute top-full left-2 right-0 mt-2 flex justify-between text-xs text-slate-400 font-medium">
                <span>DC (k=0)</span>
                <span>k={harmonics}</span>
              </div>
              {/* Y-axis labels */}
              <div className="absolute top-0 right-full mr-2 h-full flex flex-col justify-between items-end text-xs text-slate-400 font-medium pb-2">
                <span>1.5</span>
                <span>0.75</span>
                <span>0.0</span>
              </div>
            </div>
          </div>

          {/* Phase Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Phase Spectrum <span className="text-slate-400 font-medium text-base ml-2">∠X[k] (rads)</span></h2>
            <div className="w-full h-64 relative border-l-2 border-slate-200 pl-2">
              {/* Center line for phase chart */}
              <div className="absolute top-1/2 left-2 right-0 border-b border-dashed border-slate-300 z-0"></div>
              
              <svg width="100%" height="100%" viewBox={`0 -100 ${Math.max(10, harmonics) * 20 + 20} 200`} preserveAspectRatio="none" className="overflow-visible z-10 relative">
                {coeffs.map((c, i) => {
                  // Phase is between -PI and +PI.
                  // Map PI -> -100 (top), -PI -> +100 (bottom)
                  const phaseMapped = (c.phase / Math.PI) * 100;
                  const barY = phaseMapped > 0 ? -phaseMapped : 0;
                  const barHeight = Math.abs(phaseMapped);
                  
                  return (
                    <g key={`phase-${i}`} className="group">
                      <rect
                        x={i * 20 + 2}
                        y={barY}
                        width={16}
                        height={barHeight || 1} // At least 1px for visibility if 0
                        className={`${phaseMapped > 0 ? 'fill-teal-500 hover:fill-teal-400' : 'fill-orange-400 hover:fill-orange-300'} transition-colors cursor-pointer`}
                        rx={2}
                      />
                      <text x={i * 20 + 10} y={phaseMapped > 0 ? -phaseMapped - 8 : phaseMapped + 14} textAnchor="middle" className="text-[8px] fill-slate-500 opacity-0 group-hover: