import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Download, Play, Pause, Square, Triangle, Activity, Info, RefreshCw, Eraser } from 'lucide-react';

const SAMPLE_RATE = 512;
const MAX_HARMONICS = 50;

// -- Signal Processing Math --
interface FourierCoefficients {
  a0: number;
  an: number[];
  bn: number[];
}

function computeFourier(signal: Float32Array, maxN: number): FourierCoefficients {
  const K = signal.length;
  let a0 = 0;
  for (let i = 0; i < K; i++) a0 += signal[i];
  a0 = (2 / K) * a0;

  const an = new Array(maxN).fill(0);
  const bn = new Array(maxN).fill(0);

  for (let n = 1; n <= maxN; n++) {
    let sumA = 0;
    let sumB = 0;
    for (let k = 0; k < K; k++) {
      const angle = (2 * Math.PI * n * k) / K;
      sumA += signal[k] * Math.cos(angle);
      sumB += signal[k] * Math.sin(angle);
    }
    an[n - 1] = (2 / K) * sumA;
    bn[n - 1] = (2 / K) * sumB;
  }

  return { a0, an, bn };
}

function reconstructSignal(fourier: FourierCoefficients, K: number, N: number): Float32Array {
  const { a0, an, bn } = fourier;
  const rec = new Float32Array(K);
  for (let k = 0; k < K; k++) {
    let val = a0 / 2;
    for (let n = 1; n <= N; n++) {
      const angle = (2 * Math.PI * n * k) / K;
      val += an[n - 1] * Math.cos(angle) + bn[n - 1] * Math.sin(angle);
    }
    rec[k] = val;
  }
  return rec;
}

// -- Main Component --
export default function App() {
  // State
  const [signal, setSignal] = useState<Float32Array>(new Float32Array(SAMPLE_RATE));
  const [harmonics, setHarmonics] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animatedN, setAnimatedN] = useState<number>(15);

  // Refs for drawing
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const reconCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef<boolean>(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const tempSignal = useRef<Float32Array>(new Float32Array(SAMPLE_RATE));

  // Derived Fourier Data
  const fourier = useMemo(() => computeFourier(signal, MAX_HARMONICS), [signal]);
  
  const currentN = isPlaying ? animatedN : harmonics;
  const reconstructed = useMemo(() => reconstructSignal(fourier, SAMPLE_RATE, currentN), [fourier, currentN]);

  // Animation Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();
    
    const loop = (time: number) => {
      if (isPlaying) {
        if (time - lastTime > 150) { // update every 150ms
          setAnimatedN((prev) => (prev >= harmonics ? 1 : prev + 1));
          lastTime = time;
        }
        animationId = requestAnimationFrame(loop);
      }
    };
    if (isPlaying) {
      animationId = requestAnimationFrame(loop);
    } else {
      setAnimatedN(harmonics);
    }
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, harmonics]);

  // Drawing Logic
  const drawToCanvas = useCallback((canvas: HTMLCanvasElement | null, sig: Float32Array, color: string, alpha = 1, clear = true) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    
    if (clear) ctx.clearRect(0, 0, width, height);

    // Grid
    if (clear) {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    for (let i = 0; i < sig.length; i++) {
      const x = (i / (sig.length - 1)) * width;
      const y = (1 - sig[i]) * (height / 2); // Map [-1, 1] to [height, 0]
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  // Sync canvases when data changes
  useEffect(() => {
    drawToCanvas(drawCanvasRef.current, signal, '#4f46e5');
  }, [signal, drawToCanvas]);

  useEffect(() => {
    drawToCanvas(reconCanvasRef.current, signal, '#cbd5e1', 0.5, true);
    drawToCanvas(reconCanvasRef.current, reconstructed, '#10b981', 1, false);
  }, [signal, reconstructed, drawToCanvas]);

  // Pointer Events for Freehand Drawing
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    tempSignal.current = new Float32Array(signal);
    const pos = getPointerPos(e);
    lastPos.current = pos;
    updateSignalFromPointer(pos.x, pos.y, pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current) return;
    const pos = getPointerPos(e);
    updateSignalFromPointer(lastPos.current.x, lastPos.current.y, pos.x, pos.y);
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      setSignal(new Float32Array(tempSignal.current)); // Commit to state
    }
  };

  const updateSignalFromPointer = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas;

    // Convert pixel coordinates to signal indices and values
    const i1 = Math.max(0, Math.min(SAMPLE_RATE - 1, Math.round((x1 / width) * (SAMPLE_RATE - 1))));
    const i2 = Math.max(0, Math.min(SAMPLE_RATE - 1, Math.round((x2 / width) * (SAMPLE_RATE - 1))));
    const v1 = Math.max(-1, Math.min(1, 1 - (y1 / (height / 2))));
    const v2 = Math.max(-1, Math.min(1, 1 - (y2 / (height / 2))));

    // Linear interpolation between the two points to fill gaps
    const steps = Math.max(Math.abs(i2 - i1), 1);
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const index = Math.round(i1 + t * (i2 - i1));
      const val = v1 + t * (v2 - v1);
      if (index >= 0 && index < SAMPLE_RATE) {
        tempSignal.current[index] = val;
      }
    }
    
    // Fast render to canvas for immediate feedback
    drawToCanvas(drawCanvasRef.current, tempSignal.current, '#4f46e5');
  };

  // Presets
  const loadPreset = (type: 'square' | 'sawtooth' | 'triangle' | 'clear') => {
    const newSignal = new Float32Array(SAMPLE_RATE);
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const t = i / SAMPLE_RATE;
      if (type === 'square') newSignal[i] = t < 0.5 ? 1 : -1;
      else if (type === 'sawtooth') newSignal[i] = 2 * t - 1;
      else if (type === 'triangle') newSignal[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
      else if (type === 'clear') newSignal[i] = 0;
    }
    setSignal(newSignal);
    if (isPlaying) setIsPlaying(false);
  };

  // Export CSV
  const exportCSV = () => {
    let csv = 'Index,Time,Original,Reconstructed\n';
    for (let i = 0; i < SAMPLE_RATE; i++) {
      csv += `${i},${(i / SAMPLE_RATE).toFixed(4)},${signal[i].toFixed(4)},${reconstructed[i].toFixed(4)}\n`;
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Fourier Sketchpad</h1>
            <p className="text-sm text-slate-500 font-medium">Draw in Time, Analyze in Frequency</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1