import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
interface Coefficient {
  n: number;
  a: number;
  b: number;
  mag: number;
  phase: number;
}

// --- Constants ---
const CANVAS_W = 800;
const CANVAS_H = 400;
const MAX_HARMONICS = 50;

export default function App() {
  // --- State ---
  const [harmonics, setHarmonics] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [coeffs, setCoeffs] = useState<Coefficient[]>([]);
  
  // We use refs for high-frequency updates to avoid React render cycles
  const signalRef = useRef<Float32Array>(new Float32Array(CANVAS_W));
  const reconRef = useRef<Float32Array>(new Float32Array(CANVAS_W));
  const coeffsRef = useRef<Coefficient[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const tRef = useRef<number>(0);
  
  const isDrawingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // --- Core Signal Processing ---
  const computeFourier = useCallback((N: number) => {
    const sig = signalRef.current;
    const newCoeffs: Coefficient[] = [];
    
    // DC Component (n=0)
    let a0 = 0;
    for (let x = 0; x < CANVAS_W; x++) a0 += sig[x];
    a0 /= CANVAS_W;
    newCoeffs.push({ n: 0, a: a0, b: 0, mag: Math.abs(a0), phase: 0 });

    // Harmonics
    for (let n = 1; n <= N; n++) {
      let an = 0;
      let bn = 0;
      for (let x = 0; x < CANVAS_W; x++) {
        const angle = (2 * Math.PI * n * x) / CANVAS_W;
        an += sig[x] * Math.cos(angle);
        bn += sig[x] * Math.sin(angle);
      }
      an *= (2 / CANVAS_W);
      bn *= (2 / CANVAS_W);
      newCoeffs.push({
        n,
        a: an,
        b: bn,
        mag: Math.sqrt(an * an + bn * bn),
        phase: Math.atan2(bn, an)
      });
    }

    coeffsRef.current = newCoeffs;
    setCoeffs(newCoeffs);

    // Precompute reconstructed signal for fast rendering
    const recon = new Float32Array(CANVAS_W);
    for (let x = 0; x < CANVAS_W; x++) {
      let y = a0;
      for (let n = 1; n <= N; n++) {
        const angle = (2 * Math.PI * n * x) / CANVAS_W;
        y += newCoeffs[n].a * Math.cos(angle) + newCoeffs[n].b * Math.sin(angle);
      }
      recon[x] = y;
    }
    reconRef.current = recon;
  }, []);

  // --- Presets ---
  const loadPreset = (type: 'square' | 'saw' | 'triangle' | 'clear') => {
    const sig = signalRef.current;
    for (let x = 0; x < CANVAS_W; x++) {
      if (type === 'clear') sig[x] = 0;
      else if (type === 'square') sig[x] = x < CANVAS_W / 2 ? 100 : -100;
      else if (type === 'saw') sig[x] = 100 - (x / CANVAS_W) * 200;
      else if (type === 'triangle') {
        sig[x] = x < CANVAS_W / 2 
          ? -100 + (x / (CANVAS_W / 2)) * 200 
          : 100 - ((x - CANVAS_W / 2) / (CANVAS_W / 2)) * 200;
      }
    }
    computeFourier(harmonics);
  };

  // --- Initial Setup ---
  useEffect(() => {
    loadPreset('square');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute when harmonics change
  useEffect(() => {
    computeFourier(harmonics);
  }, [harmonics, computeFourier]);

  // --- Drawing Logic ---
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.floor(e.clientX - rect.left),
      y: e.clientY - rect.top
    };
  };

  const interpolateSignal = (x0: number, y0: number, x1: number, y1: number) => {
    const sig = signalRef.current;
    const startX = Math.min(x0, x1);
    const endX = Math.max(x0, x1);
    
    for (let x = startX; x <= endX; x++) {
      if (x >= 0 && x < CANVAS_W) {
        const t = endX === startX ? 0 : (x - x0) / (x1 - x0);
        const y = y0 + t * (y1 - y0);
        sig[x] = CANVAS_H / 2 - y; // Convert canvas Y to math Y
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const pos = getMousePos(e);
    lastPosRef.current = pos;
    interpolateSignal(pos.x, pos.y, pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const pos = getMousePos(e);
    interpolateSignal(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y);
    lastPosRef.current = pos;
    // Fast recompute for real-time feel
    computeFourier(harmonics); 
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    computeFourier(harmonics);
  };

  // --- Animation Loop ---
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw Grid & Axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H / 2); ctx.lineTo(CANVAS_W, CANVAS_H / 2);
    for(let i=0; i<=CANVAS_W; i+=100) { ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); }
    ctx.stroke();

    const sig = signalRef.current;
    const recon = reconRef.current;

    // Draw Original Signal (Faded)
    ctx.beginPath();
    for (let x = 0; x < CANVAS_W; x++) {
      ctx.lineTo(x, CANVAS_H / 2 - sig[x]);
    }
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Reconstructed Signal
    ctx.beginPath();
    for (let x = 0; x < CANVAS_W; x++) {
      ctx.lineTo(x, CANVAS_H / 2 - recon[x]);
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Animation (Stacking Vectors)
    if (isPlaying) {
      const t = Math.floor(tRef.current);
      const currentCoeffs = coeffsRef.current;
      
      if (currentCoeffs.length > 0) {
        let currentY = currentCoeffs[0].a; // DC offset

        // Draw vertical scanning line
        ctx.beginPath();
        ctx.moveTo(t, 0);
        ctx.lineTo(t, CANVAS_H);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Stack harmonics at time t
        ctx.lineWidth = 2;
        for (let n = 1; n < currentCoeffs.length; n++) {
          const c = currentCoeffs[n];
          const angle = (2 * Math.PI * n * t) / CANVAS_W;
          const val = c.a * Math.cos(angle) + c.b * Math.sin(angle);
          
          const startYCanvas = CANVAS_H / 2 - currentY;
          const endYCanvas = CANVAS_H / 2 - (currentY + val);

          ctx.beginPath();
          ctx.moveTo(t, startYCanvas);
          ctx.lineTo(t, endYCanvas);
          
          // Color code vectors
          ctx.strokeStyle = n % 2 === 0 ? '#f59e0b' : '#10b981';
          ctx.stroke();

          // Draw little dot at joints
          ctx.beginPath();
          ctx.arc(t, endYCanvas, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();

          currentY += val;
        }

        // Draw playhead dot
        ctx.beginPath();
        ctx.arc(t, CANVAS_H / 2 - recon