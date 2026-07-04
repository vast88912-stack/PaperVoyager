import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Download, Info, Activity, WaveSine, RefreshCw } from 'lucide-react';

const NUM_SAMPLES = 512;
const MAX_HARMONICS = 50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const FREQ_CANVAS_WIDTH = 400;
const FREQ_CANVAS_HEIGHT = 400;
const Y_LIMIT = 1.5; // Y-axis goes from -1.5 to +1.5

type Harmonic = {
  n: number;
  an: number;
  bn: number;
  mag: number;
  phase: number;
};

// --- Helper Math Functions ---

const computeFourier = (samples: number[], maxN: number): Harmonic[] => {
  const harmonics: Harmonic[] = [];
  for (let n = 0; n <= maxN; n++) {
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const t = i / NUM_SAMPLES;
      sumA += samples[i] * Math.cos(2 * Math.PI * n * t);
      sumB += samples[i] * Math.sin(2 * Math.PI * n * t);
    }
    const an = (n === 0 ? 1 : 2) * (sumA / NUM_SAMPLES);
    const bn = (n === 0 ? 0 : 2) * (sumB / NUM_SAMPLES);
    harmonics.push({
      n,
      an,
      bn,
      mag: Math.sqrt(an * an + bn * bn),
      phase: Math.atan2(bn, an),
    });
  }
  return harmonics;
};

const getReconstructedY = (harmonics: Harmonic[], t: number): number => {
  let y = 0;
  for (const h of harmonics) {
    y += h.an * Math.cos(2 * Math.PI * h.n * t) + h.bn * Math.sin(2 * Math.PI * h.n * t);
  }
  return y;
};

// --- Presets ---

const generateSquare = () => Array.from({ length: NUM_SAMPLES }, (_, i) => (i < NUM_SAMPLES / 2 ? 1 : -1));
const generateSaw = () => Array.from({ length: NUM_SAMPLES }, (_, i) => 2 * (i / NUM_SAMPLES) - 1);
const generateTriangle = () =>
  Array.from({ length: NUM_SAMPLES }, (_, i) => {
    const t = i / NUM_SAMPLES;
    return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  });

export default function App() {
  // State
  const [samples, setSamples] = useState<number[]>(generateSquare());
  const [numHarmonics, setNumHarmonics] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>('square');

  // Refs for drawing and animation to avoid state-closure issues
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const animPhaseRef = useRef<number>(0);
  
  const samplesRef = useRef<number[]>(samples);
  const harmonicsRef = useRef<Harmonic[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    samplesRef.current = samples;
    harmonicsRef.current = computeFourier(samples, numHarmonics);
  }, [samples, numHarmonics]);

  // Derived Harmonics (for UI data export/rendering)
  const harmonics = useMemo(() => computeFourier(samples, numHarmonics), [samples, numHarmonics]);

  // Canvas Drawing & Interpolation
  const updateSamplesFromMouse = (e: React.PointerEvent<HTMLCanvasElement>, isClick = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert canvas coordinates to signal coordinates
    const signalY = ((CANVAS_HEIGHT / 2 - y) / (CANVAS_HEIGHT / 2)) * Y_LIMIT;
    // Clamp Y to reasonable limits
    const clampedY = Math.max(-Y_LIMIT, Math.min(Y_LIMIT, signalY));
    
    const currIdx = Math.max(0, Math.min(NUM_SAMPLES - 1, Math.floor((x / CANVAS_WIDTH) * NUM_SAMPLES)));

    if (isClick || !lastPosRef.current) {
      const newSamples = [...samplesRef.current];
      newSamples[currIdx] = clampedY;
      samplesRef.current = newSamples;
    } else {
      // Interpolate between last point and current point for smooth drawing
      const lastX = lastPosRef.current.x;
      const lastIdx = Math.max(0, Math.min(NUM_SAMPLES - 1, Math.floor((lastX / CANVAS_WIDTH) * NUM_SAMPLES)));
      
      const newSamples = [...samplesRef.current];
      const minIdx = Math.min(lastIdx, currIdx);
      const maxIdx = Math.max(lastIdx, currIdx);
      
      const lastSignalY = ((CANVAS_HEIGHT / 2 - lastPosRef.current.y) / (CANVAS_HEIGHT / 2)) * Y_LIMIT;
      const startY = lastIdx === minIdx ? lastSignalY : clampedY;
      const endY = lastIdx === minIdx ? clampedY : lastSignalY;

      for (let i = minIdx; i <= maxIdx; i++) {
        const t = maxIdx === minIdx ? 0 : (i - minIdx) / (maxIdx - minIdx);
        newSamples[i] = startY + t * (endY - startY);
      }
      samplesRef.current = newSamples;
    }
    
    lastPosRef.current = { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    setActivePreset('custom');
    updateSamplesFromMouse(e, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    updateSamplesFromMouse(e, false);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    // Commit to state to trigger re-renders of UI components
    setSamples([...samplesRef.current]);
  };

  const handleExportCSV = () => {
    let csv = "Time,Original,Reconstructed\n";
    for(let i=0; i<NUM_SAMPLES; i++) {
        const t = i / NUM_SAMPLES;
        const orig = samples[i];
        const recon = getReconstructedY(harmonics, t);
        csv += `${t.toFixed(4)},${orig.toFixed(4)},${recon.toFixed(4)}\n`;
    }
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fourier_signal.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Main Render Loop (Time Domain & Frequency Domain)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      if (isPlaying && !isDrawingRef.current) {
        // Advance animation phase (approx 4 seconds per cycle)
        animPhaseRef.current = (animPhaseRef.current + dt / 4000) % 1;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const freqCanvas = freqCanvasRef.current;
      const fCtx = freqCanvas?.getContext('2d');

      if (canvas && ctx && freqCanvas && fCtx) {
        // --- DRAW TIME DOMAIN ---
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Grid lines
        ctx.strokeStyle = '#e2e8f0'; // slate-200
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT / 2);
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        ctx.stroke();

        const curSamples = samplesRef.current;
        const curHarmonics = harmonicsRef.current;
        const mapY = (val: number) => CANVAS_HEIGHT / 2 - (val / Y_LIMIT) * (CANVAS_HEIGHT / 2);

        // Draw original signal (light gray)
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8'; // slate-400
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        for (let i = 0; i < NUM_SAMPLES; i++) {
          const x = (i / NUM_SAMPLES) * CANVAS_WIDTH;
          const y = mapY(curSamples[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw reconstructed signal (solid blue)
        ctx.beginPath();
        ctx.strokeStyle = '#2563eb'; // blue-600
        ctx.lineWidth = 3;
        const currentPhase = isDrawingRef.current ? 1.0 : animPhaseRef.current;
        const endIdx = Math.floor(currentPhase * NUM_SAMPLES);
        
        for (let i = 0; i <= endIdx; i++) {
          const t = i / NUM_SAMPLES;
          const x = t * CANVAS_WIDTH;
          const reconY = getReconstructedY(curHarmonics, t);
          const y = mapY(reconY);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw scanning line and glowing head
        if (!isDrawingRef.current) {
          const t = currentPhase;
          const x = t * CANVAS_WIDTH;
          const reconY = getReconstructedY(curHarmonics, t);
          const y = mapY(reconY);

          // Scanner line
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(37, 99, 235, 0.3)'; // faint blue
          ctx.lineWidth = 2;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();

          // Head dot
          ctx.beginPath();
          ctx.fillStyle = '#ef4444'; // red-500
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        }

        // --- DRAW FREQUENCY DOMAIN ---
        fCtx.clearRect(0, 0, FREQ_CANVAS_WIDTH, FREQ_CANVAS_HEIGHT);
        
        const maxMag = Math.max(0.001, ...curHarmonics.map(h => h.mag));
        const barWidth = (FREQ_CANVAS_WIDTH - 20) / (curHarmonics.length || 1);
        
        // Top half: Magnitude
        fCtx.fillStyle = '#1e293b'; // slate-800
        fCtx.font = '12px sans-serif';
        fCtx.fillText('Magnitude', 10, 20);
        
        curHarmonics.forEach((h, i) => {
          const hNorm = h.mag / maxMag;
          const barHeight = hNorm * (FREQ_CANVAS_HEIGHT / 2 - 40);
          const x = 10 + i * barWidth;
          const y = FREQ_CANVAS_HEIGHT /