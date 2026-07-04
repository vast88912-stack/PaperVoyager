import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Download, RotateCcw, Activity, Info, Waves, Zap } from 'lucide-react';

// --- Constants & Types ---
const RESOLUTION = 1024; // Number of samples in one period
const MAX_HARMONICS = 100;

interface FourierCoefficient {
  n: number;
  a: number; // Cosine coefficient
  b: number; // Sine coefficient
  mag: number;
  phase: number;
}

// --- Helper Functions ---
const computeFourierCoefficients = (signal: Float32Array, harmonics: number): FourierCoefficient[] => {
  const coeffs: FourierCoefficient[] = [];
  const K = signal.length;

  // DC Component (n = 0)
  let a0 = 0;
  for (let i = 0; i < K; i++) a0 += signal[i];
  a0 /= K;
  coeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: 0 });

  // Harmonics (n > 0)
  for (let n = 1; n <= harmonics; n++) {
    let an = 0;
    let bn = 0;
    for (let i = 0; i < K; i++) {
      const t = i / K;
      const angle = 2 * Math.PI * n * t;
      an += signal[i] * Math.cos(angle);
      bn += signal[i] * Math.sin(angle);
    }
    an *= 2 / K;
    bn *= 2 / K;
    const mag = Math.sqrt(an * an + bn * bn);
    const phase = Math.atan2(-bn, an);
    coeffs.push({ n, a: an, b: bn, mag, phase });
  }

  return coeffs;
};

const reconstructSignal = (coeffs: FourierCoefficient[], resolution: number): Float32Array => {
  const reconstructed = new Float32Array(resolution);
  for (let i = 0; i < resolution; i++) {
    const t = i / resolution;
    let val = coeffs[0].a; // DC
    for (let j = 1; j < coeffs.length; j++) {
      const { n, a, b } = coeffs[j];
      const angle = 2 * Math.PI * n * t;
      val += a * Math.cos(angle) + b * Math.sin(angle);
    }
    reconstructed[i] = val;
  }
  return reconstructed;
};

// --- Main Component ---
export default function App() {
  // State
  const [harmonics, setHarmonics] = useState<number>(10);
  const [coefficients, setCoefficients] = useState<FourierCoefficient[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationPhase, setAnimationPhase] = useState<number>(0);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // Refs
  const signalRef = useRef<Float32Array>(new Float32Array(RESOLUTION));
  const reconstructedRef = useRef<Float32Array>(new Float32Array(RESOLUTION));
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number>();

  // --- Canvas Drawing Logic ---
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const updateSignalArray = (x0: number, y0: number, x1: number, y1: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    
    // Convert canvas coordinates to signal indices and values
    const idx0 = Math.floor((x0 / canvas.width) * RESOLUTION);
    const idx1 = Math.floor((x1 / canvas.width) * RESOLUTION);
    const val0 = 1 - 2 * (y0 / canvas.height); // Map [0, height] to [1, -1]
    const val1 = 1 - 2 * (y1 / canvas.height);

    const startIdx = Math.max(0, Math.min(idx0, idx1));
    const endIdx = Math.min(RESOLUTION - 1, Math.max(idx0, idx1));

    for (let i = startIdx; i <= endIdx; i++) {
      // Linear interpolation
      const t = startIdx === endIdx ? 0 : (i - idx0) / (idx1 - idx0);
      const val = val0 + t * (val1 - val0);
      signalRef.current[i] = Math.max(-1, Math.min(1, val));
    }
  };

  const redrawUserSignal = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!hasDrawn) return;

    ctx.beginPath();
    ctx.strokeStyle = '#64748b'; // slate-500
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < RESOLUTION; i++) {
      const x = (i / RESOLUTION) * canvas.width;
      const y = (1 - signalRef.current[i]) * 0.5 * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [hasDrawn]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    setHasDrawn(true);
    const { x, y } = getCanvasCoordinates(e);
    lastPosRef.current = { x, y };
    updateSignalArray(x, y, x, y);
    redrawUserSignal();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const { x, y } = getCanvasCoordinates(e);
    updateSignalArray(lastPosRef.current.x, lastPosRef.current.y, x, y);
    lastPosRef.current = { x, y };
    redrawUserSignal();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    processSignal();
  };

  // --- Signal Processing ---
  const processSignal = useCallback(() => {
    if (!hasDrawn) return;
    const coeffs = computeFourierCoefficients(signalRef.current, harmonics);
    setCoefficients(coeffs);
    reconstructedRef.current = reconstructSignal(coeffs, RESOLUTION);
  }, [harmonics, hasDrawn]);

  // Trigger processing when harmonics change
  useEffect(() => {
    processSignal();
  }, [harmonics, processSignal]);

  // --- Animation & Overlay Rendering ---
  const renderOverlay = useCallback((phase: number) => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !hasDrawn) {
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Reconstructed Signal
    ctx.beginPath();
    ctx.strokeStyle = '#6366f1'; // indigo-500
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < RESOLUTION; i++) {
      const x = (i / RESOLUTION) * canvas.width;
      const y = (1 - reconstructedRef.current[i]) * 0.5 * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw scanning line and point if playing
    if (isPlaying) {
      const scanX = phase * canvas.width;
      const scanIdx = Math.floor(phase * RESOLUTION);
      const scanY = (1 - reconstructedRef.current[scanIdx]) * 0.5 * canvas.height;

      // Vertical scanner
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 2;
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, canvas.height);
      ctx.stroke();

      // Point on wave
      ctx.beginPath();
      ctx.fillStyle = '#4f46e5'; // indigo-600
      ctx.arc(scanX, scanY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [hasDrawn, isPlaying]);

  useEffect(() => {
    let lastTime = performance.now();
    const loop = (time: number) => {
      if (isPlaying) {
        const dt = (time - lastTime) / 1000; // seconds
        setAnimationPhase((prev) => (prev + dt * 0.5) % 1.0); // 2 seconds per period
      }
      lastTime = time;
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    renderOverlay(animationPhase);
  }, [animationPhase, renderOverlay]);

  // --- Presets ---
  const applyPreset = (type: 'square' | 'sawtooth' | 'triangle') => {
    setHasDrawn(true);
    for (let i = 0; i < RESOLUTION; i++) {
      const t = i / RESOLUTION;
      if (type === 'square') {
        signalRef.current[i] = t < 0.5 ? 0.8 : -0.8;
      } else if (type === 'sawtooth') {
        signalRef.current[i] = 1.6 * (t - 0.5);
      } else if (type === 'triangle') {
        signalRef.current[i] = t < 0.5 ? 3.2 * (t - 0.25) : 3.2 * (0.75 - t);
      }
    }
    redrawUserSignal();
    processSignal();
  };

  const clearCanvas = () => {
    signalRef.current.fill(0);
    reconstructedRef.current.fill(0);
    setHasDrawn(false);
    setCoefficients([]);
    redrawUserSignal();
    renderOverlay(0);
  };

  // --- Export ---
  const exportCSV = () => {
    if (coefficients.length === 0) return;
    const headers = ['n', 'a_n', 'b_n', 'magnitude', 'phase'];
    const rows = coefficients.map(c => 
      `${c.n},${c.a.toFixed(6)},${c.b.toFixed(6)},${c.mag.toFixed(6)},${c.phase.toFixed(6)}`
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fourier_coefficients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Initialization ---
  useEffect(() => {
    // Set canvas internal resolution
    if (drawCanvasRef.current && overlayCanvasRef.current) {
      drawCanvasRef.current.width = RESOLUTION;
      drawCanvasRef.current.height = 500;
      overlayCanvasRef.current.width = RESOLUTION;
      overlayCanvasRef.current.height = 500;
      redrawUserSignal();
    }
  }, [redrawUserSignal]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Fourier Sketchpad</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Interactive Signal Processing</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={!hasDrawn}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Canvas & Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Canvas Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Waves size={18} className="text-indigo-500" />
                Time Domain (Freehand Draw)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title={isPlaying ? "Pause Animation" : "Play Animation"}
                >