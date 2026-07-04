import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Download, Square, Triangle, Activity, Info, PenTool } from 'lucide-react';

const NUM_SAMPLES = 512;
const MAX_HARMONICS = 50;

type Coefficient = {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
};

export default function App() {
  const [signal, setSignal] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [reconstructed, setReconstructed] = useState<number[]>(new Array(NUM_SAMPLES).fill(0));
  const [coeffs, setCoeffs] = useState<Coefficient[]>([]);
  
  const [activeHarmonics, setActiveHarmonics] = useState<number>(10);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('square');
  
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const magCanvasRef = useRef<HTMLCanvasElement>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  // --- SIGNAL GENERATION ---
  const generatePreset = useCallback((type: string) => {
    const newSignal = new Array(NUM_SAMPLES).fill(0);
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = i / NUM_SAMPLES;
      switch (type) {
        case 'square':
          newSignal[i] = t < 0.5 ? 1 : -1;
          break;
        case 'sawtooth':
          newSignal[i] = 2 * (t - 0.5);
          break;
        case 'triangle':
          newSignal[i] = 1 - 4 * Math.abs(t - 0.5);
          break;
        case 'sine':
          newSignal[i] = Math.sin(2 * Math.PI * t);
          break;
        default:
          newSignal[i] = 0;
      }
    }
    setSignal(newSignal);
    setActivePreset(type);
  }, []);

  // --- FOURIER TRANSFORM ---
  const computeFourier = useCallback((sig: number[]) => {
    const newCoeffs: Coefficient[] = [];
    
    // a0 (DC Component)
    let a0 = 0;
    for (let i = 0; i < NUM_SAMPLES; i++) a0 += sig[i];
    a0 = a0 / NUM_SAMPLES;
    newCoeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: 0 });

    // Harmonics
    for (let n = 1; n <= MAX_HARMONICS; n++) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < NUM_SAMPLES; i++) {
        const t = i / NUM_SAMPLES;
        a += sig[i] * Math.cos(2 * Math.PI * n * t);
        b += sig[i] * Math.sin(2 * Math.PI * n * t);
      }
      a *= (2 / NUM_SAMPLES);
      b *= (2 / NUM_SAMPLES);
      
      const mag = Math.sqrt(a * a + b * b);
      const phase = Math.atan2(b, a);
      newCoeffs.push({ n, a, b, mag, phase });
    }
    
    setCoeffs(newCoeffs);
  }, []);

  // --- SIGNAL RECONSTRUCTION ---
  const reconstruct = useCallback((cfs: Coefficient[], maxN: number) => {
    if (!cfs.length) return;
    const recon = new Array(NUM_SAMPLES).fill(0);
    
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = i / NUM_SAMPLES;
      let val = cfs[0].a; // DC
      
      for (let n = 1; n <= maxN; n++) {
        if (n >= cfs.length) break;
        val += cfs[n].a * Math.cos(2 * Math.PI * n * t) + cfs[n].b * Math.sin(2 * Math.PI * n * t);
      }
      recon[i] = val;
    }
    setReconstructed(recon);
  }, []);

  // --- DRAWING LOGIC ---
  const drawTimeDomain = useCallback(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    
    ctx.clearRect(0, 0, W, H);
    
    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Original Signal
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = (i / NUM_SAMPLES) * W;
      const y = H / 2 - signal[i] * (H / 2.5);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Reconstructed Signal
    ctx.beginPath();
    ctx.strokeStyle = '#e11d48'; // Rose-600
    ctx.lineWidth = 2.5;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = (i / NUM_SAMPLES) * W;
      const y = H / 2 - reconstructed[i] * (H / 2.5);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [signal, reconstructed]);

  const drawFrequencyDomain = useCallback(() => {
    const magCanvas = magCanvasRef.current;
    const phaseCanvas = phaseCanvasRef.current;
    
    if (magCanvas && coeffs.length) {
      const ctx = magCanvas.getContext('2d');
      if (ctx) {
        const W = magCanvas.width;
        const H = magCanvas.height;
        ctx.clearRect(0, 0, W, H);
        
        const barWidth = W / (MAX_HARMONICS + 1) * 0.6;
        const maxMag = Math.max(...coeffs.map(c => c.mag), 1.5);
        
        coeffs.forEach((c) => {
          const x = (c.n / (MAX_HARMONICS + 1)) * W + (W / (MAX_HARMONICS + 1) - barWidth) / 2;
          const barH = (c.mag / maxMag) * (H * 0.9);
          
          ctx.fillStyle = c.n <= activeHarmonics ? '#3b82f6' : '#cbd5e1';
          ctx.fillRect(x, H - barH, barWidth, barH);
        });
      }
    }

    if (phaseCanvas && coeffs.length) {
      const ctx = phaseCanvas.getContext('2d');
      if (ctx) {
        const W = phaseCanvas.width;
        const H = phaseCanvas.height;
        ctx.clearRect(0, 0, W, H);
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();

        const barWidth = W / (MAX_HARMONICS + 1) * 0.4;
        
        coeffs.forEach((c) => {
          // Phase is between -PI and PI
          const x = (c.n / (MAX_HARMONICS + 1)) * W + (W / (MAX_HARMONICS + 1) - barWidth) / 2;
          const yCenter = H / 2;
          const phaseHeight = (c.phase / Math.PI) * (H * 0.4);
          
          ctx.fillStyle = c.n <= activeHarmonics ? '#8b5cf6' : '#cbd5e1';
          ctx.fillRect(x, yCenter - phaseHeight, barWidth, phaseHeight);
        });
      }
    }
  }, [coeffs, activeHarmonics]);

  // --- EFFECTS ---
  // Initial mount
  useEffect(() => {
    generatePreset('square');
  }, [generatePreset]);

  // When signal changes, recompute Fourier
  useEffect(() => {
    computeFourier(signal);
  }, [signal, computeFourier]);

  // When coeffs or active harmonics change, reconstruct
  useEffect(() => {
    reconstruct(coeffs, activeHarmonics);
  }, [coeffs, activeHarmonics, reconstruct]);

  // When signal/recon change, draw time domain
  useEffect(() => {
    drawTimeDomain();
  }, [signal, reconstructed, drawTimeDomain]);

  // When coeffs/active change, draw freq domain
  useEffect(() => {
    drawFrequencyDomain();
  }, [coeffs, activeHarmonics, drawFrequencyDomain]);

  // Animation Loop
  useEffect(() => {
    let interval: number;
    if (isAnimating) {
      interval = window.setInterval(() => {
        setActiveHarmonics((prev) => {
          if (prev >= MAX_HARMONICS) return 0;
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAnimating]);


  // --- INTERACTIVITY (FREEHAND) ---
  const handleCanvasMouse = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, type: 'down' | 'move' | 'up') => {
    if (type === 'down') {
      setIsDrawing(true);
      setActivePreset('custom');
    }
    if (type === 'up') {
      setIsDrawing(false);
      return;
    }
    if (!isDrawing && type === 'move') return;

    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // map x to index
    const index = Math.floor((x / rect.width) * NUM_SAMPLES);
    if (index >= 0 && index < NUM_SAMPLES) {
      // map y to signal value [-1.25, 1.25]
      const val = ((rect.height / 2 - y) / (rect.height / 2.5));
      
      setSignal(prev => {
        const newSig = [...prev];
        // Smear slightly for smoother drawing
        const brushSize = 4;
        for (let i = -brushSize; i <= brushSize; i++) {
          const idx = index + i;
          if (idx >= 0 && idx < NUM_SAMPLES) {
            const weight = 1 - Math.abs(i)/brushSize;
            newSig[idx] = prev[idx] * (1-weight) + val * weight;
          }
        }
        return newSig;
      });
    }
  };

  // --- EXPORT ---
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Time,Original,Reconstructed\n";
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = (i / NUM_SAMPLES).toFixed(4);
      csvContent += `${t},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fourier_signal.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-600 h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Fourier Sketchpad</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Sidebar */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Presets Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Preset Signals</h2>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => generatePreset('square')}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all ${activePreset === 'square' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <Square className="h-5 w-5" /> Square Wave
              </button>
              <button 
                onClick={() => generatePreset('sawtooth')}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all ${activePreset === 'sawtooth' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <Activity className="h-5 w-5" /> Sawtooth Wave
              </button>
              <button 
                onClick={() => generatePreset('triangle')}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all ${activePreset === 'triangle' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <Triangle className="h-5 w-5" /> Triangle Wave
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                <PenTool className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span>You can also <strong>draw directly</strong> on the time domain canvas to create custom periodic signals.</span>
              </div>
            </div>
          </div>

          {/* Reconstruction Controls */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Fourier Series</h2>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Harmonics (N)</label>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{activeHarmonics}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={MAX_HARMONICS} 
                value={activeHarmonics} 
                onChange={(e) => {
                  setActiveHarmonics(Number(e.target.value));
                  setIsAnimating(false);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <button 
              onClick={() => setIsAnimating(!isAnimating)}
              className={`w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${isAnimating ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {isAnimating ? <><Pause className="h-4 w-4" /> Stop Animation</> : <><Play className="h-4 w-4" /> Animate Reconstruction</>}
            </button>
          </div>

          {/* Explainer */}
          <div className="bg-sky-50 p-5 rounded-xl border border-sky-100 text-sky-800 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-sky-600" />
              <h3 className="font-bold text-sm">Gibbs Phenomenon</h3>
            </div>
            <p className="text-xs leading-relaxed">
              Notice the "ringing" or overshoot near the sharp edges of the Square and Sawtooth waves? 
              This is the <strong>Gibbs Phenomenon</strong>. No matter how many harmonics you add, 
              the Fourier series will always overshoot the discontinuity by about 9% because it tries to approximate a jump with continuous sine waves.
            </p>
          </div>
        </div>

        {/* Canvases */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Time Domain Canvas */}
          <div