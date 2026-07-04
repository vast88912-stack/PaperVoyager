import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Download, Info, Play, Pause, Square, Triangle, Zap, Edit3, RefreshCw } from 'lucide-react';

const SAMPLE_RATE = 512;
const MAX_HARMONICS = 50;

type SignalType = 'square' | 'sawtooth' | 'triangle' | 'custom';

interface FourierCoefficient {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

export default function App() {
  const [signalType, setSignalType] = useState<SignalType>('square');
  const [signal, setSignal] = useState<number[]>(Array(SAMPLE_RATE).fill(0));
  const [harmonics, setHarmonics] = useState<number>(10);
  const [coefficients, setCoefficients] = useState<FourierCoefficient[]>([]);
  const [reconstructed, setReconstructed] = useState<number[]>(Array(SAMPLE_RATE).fill(0));
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(1); // 0 to 1

  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastDrawPos = useRef<{ x: number, y: number } | null>(null);

  // --- Signal Generation ---
  const generatePreset = useCallback((type: SignalType) => {
    const newSignal = new Array(SAMPLE_RATE).fill(0);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const t = i / SAMPLE_RATE; // 0 to 1
      if (type === 'square') {
        newSignal[i] = t < 0.5 ? 1 : -1;
      } else if (type === 'sawtooth') {
        newSignal[i] = 2 * t - 1;
      } else if (type === 'triangle') {
        if (t < 0.25) newSignal[i] = 4 * t;
        else if (t < 0.75) newSignal[i] = 2 - 4 * t;
        else newSignal[i] = 4 * t - 4;
      }
    }
    setSignal(newSignal);
    setSignalType(type);
  }, []);

  // Initialize with square wave
  useEffect(() => {
    generatePreset('square');
  }, [generatePreset]);

  // --- Fourier Math ---
  useEffect(() => {
    // Compute Coefficients
    const coeffs: FourierCoefficient[] = [];
    for (let n = 0; n <= harmonics; n++) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < SAMPLE_RATE; i++) {
        const theta = (2 * Math.PI * n * i) / SAMPLE_RATE;
        a += signal[i] * Math.cos(theta);
        b += signal[i] * Math.sin(theta);
      }
      a *= (n === 0 ? 1 / SAMPLE_RATE : 2 / SAMPLE_RATE);
      b *= (n === 0 ? 1 / SAMPLE_RATE : 2 / SAMPLE_RATE);
      
      coeffs.push({
        n,
        a,
        b,
        mag: Math.sqrt(a * a + b * b),
        phase: Math.atan2(b, a)
      });
    }
    setCoefficients(coeffs);

    // Reconstruct Signal
    const recon = new Array(SAMPLE_RATE).fill(0);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      let val = coeffs[0].a; // DC component
      for (let n = 1; n <= harmonics; n++) {
        const theta = (2 * Math.PI * n * i) / SAMPLE_RATE;
        val += coeffs[n].a * Math.cos(theta) + coeffs[n].b * Math.sin(theta);
      }
      recon[i] = val;
    }
    setReconstructed(recon);
  }, [signal, harmonics]);

  // --- Animation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const duration = 3000; // 3 seconds per cycle
      
      const progress = (elapsed % duration) / duration;
      setAnimProgress(progress);
      
      if (isAnimating) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (isAnimating) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setAnimProgress(1); // Full draw when not animating
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating]);

  // --- Canvas Rendering ---
  const drawTimeDomain = useCallback(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const amplitude = height * 0.4;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#e2e8f0';
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

    // Draw Original Signal
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; // slate-400
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const x = (i / SAMPLE_RATE) * width;
      const y = centerY - signal[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Reconstructed Signal
    const drawLimit = Math.floor(SAMPLE_RATE * animProgress);
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 3;
    for (let i = 0; i < drawLimit; i++) {
      const x = (i / SAMPLE_RATE) * width;
      const y = centerY - reconstructed[i] * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Animation Head
    if (isAnimating && drawLimit < SAMPLE_RATE && drawLimit > 0) {
      const x = (drawLimit / SAMPLE_RATE) * width;
      const y = centerY - reconstructed[drawLimit] * amplitude;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      
      // Vertical scanline
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

  }, [signal, reconstructed, animProgress, isAnimating]);

  const drawFreqDomain = useCallback(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    if (coefficients.length === 0) return;

    const maxMag = Math.max(...coefficients.map(c => c.mag), 0.01); // avoid div by 0
    const barWidth = Math.max((width / (harmonics + 1)) - 2, 2);

    // Draw Magnitude Bars
    for (let i = 0; i <= harmonics; i++) {
      const coeff = coefficients[i];
      const barHeight = (coeff.mag / maxMag) * (height * 0.8);
      const x = i * (width / (harmonics + 1)) + 1;
      const y = height - barHeight;

      // Gradient for bars
      const gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, '#6366f1'); // indigo-500
      gradient.addColorStop(1, '#818cf8'); // indigo-400

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Label every few harmonics if space permits
      if (harmonics <= 20 || i % 5 === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i.toString(), x + barWidth / 2, height - 5);
      }
    }
  }, [coefficients, harmonics]);

  useEffect(() => {
    drawTimeDomain();
  }, [drawTimeDomain]);

  useEffect(() => {
    drawFreqDomain();
  }, [drawFreqDomain]);

  // --- Interaction Handlers ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    setSignalType('custom');
    updateSignalFromMouse(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    updateSignalFromMouse(e);
  };

  const handleCanvasMouseUp = () => {
    isDrawing.current = false;
    lastDrawPos.current = null;
  };

  const updateSignalFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const index = Math.floor((x / canvas.width) * SAMPLE_RATE);
    const clampedIndex = Math.max(0, Math.min(SAMPLE_RATE - 1, index));
    
    // Convert Y to signal value [-1, 1]
    const centerY = canvas.height / 2;
    const amplitude = canvas.height * 0.4;
    let val = (centerY - y) / amplitude;
    val = Math.max(-1.5, Math.min(1.5, val)); // Allow slight overshoot drawing

    setSignal(prev => {
      const newSignal = [...prev];
      
      // Interpolate if we have a last position to avoid gaps
      if (lastDrawPos.current) {
        const lastIndex = lastDrawPos.current.x;
        const lastVal = lastDrawPos.current.y;
        
        const startIdx = Math.min(lastIndex, clampedIndex);
        const endIdx = Math.max(lastIndex, clampedIndex);
        
        for (let i = startIdx; i <= endIdx; i++) {
          const t = endIdx === startIdx ? 0 : (i - startIdx) / (endIdx - startIdx);
          const interpVal = lastIndex < clampedIndex 
            ? lastVal + t * (val - lastVal)
            : val + t * (lastVal - val);
          newSignal[i] = interpVal;
        }
      } else {
        newSignal[clampedIndex] = val;
      }
      
      lastDrawPos.current = { x: clampedIndex, y: val };
      return newSignal;
    });
  };

  const exportCSV = () => {
    let csv = "Index,Time,OriginalSignal,ReconstructedSignal\n";
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const t = i / SAMPLE_RATE;
      csv += `${i},${t.toFixed(4)},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fourier_signal_${signalType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Fourier Sketchpad</h1>
              <p className="text-sm text-slate-500">Draw a signal or pick a preset to see its frequency components.</p>
            </div>
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Controls & Presets */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Presets Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Preset Signals</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => generatePreset('square')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    signalType === 'square' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <Square size={24} />
                  <span className="text-sm font-semibold">Square</span>
                </button>
                <button
                  onClick={() => generatePreset('sawtooth')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    signalType === 'sawtooth' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <Zap size={24} />
                  <span className="text-sm font-semibold">Sawtooth</span>
                </button>
                <button
                  onClick={() => generatePreset('triangle')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    signalType === 'triangle' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <Triangle size={24} />
                  <span className="text-sm font-semibold">Triangle</span>
                </button>
                <button
                  onClick={() => {
                    setSignal(new Array(SAMPLE_RATE).fill(0));
                    setSignalType('custom');
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    signalType === 'custom' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <Edit3 size={24} />
                  <span className="text-sm font-semibold">Custom</span>
                </button>
              </div>

              {/* Gibbs Phenomenon Explainer */}
              {(signalType === 'square' || signalType === 'sawtooth') && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-start">
                  <Info className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-amber-800">
                    <strong>Gibbs Phenomenon:</strong> Notice the ringing at the sharp edges? Because we approximate discontinuous jumps with continuous sine waves, an overshoot of ~9% remains near the jump, regardless of how many harmonics you add!
                  </div>
                </div>
              )}
            </div>

            {/* Controls Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Harmonics (N)</label>
                  <span className="text-lg font-bold text-indigo-600">{harmonics}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={MAX_HARMONICS} 
                  value={harmonics}
                  onChange={(e) => setHarmonics(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 (Sine)</span>
                  <span>{MAX_HARMONICS} (Complex)</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${
                    isAnimating 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isAnimating ? <Pause size={18} /> : <Play size={18} />}
                  {isAnimating ? 'Stop Animation' : 'Animate Reconstruction'}
                </button>
              </div>
              
              <div className="text-xs text-slate-400 flex items-center gap-1 justify-center">
                <RefreshCw size={12} />
                <span>Sample Rate: {SAMPLE_RATE} pts/period</span>
              </div>
            </div>
          </div>

          {/* Right Column: Canvases */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Time Domain Canvas */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Time Domain</h2>
                <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1 text-slate-500">
                    <div className="w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-400"></div>
                    Original
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    Reconstructed
                  </div>
                </div>
              </div>
              <div className="relative bg-slate-50 rounded-xl border border-slate