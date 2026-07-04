import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const SAMPLES = 512;
const MAX_HARMONICS = 50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 360;

interface Harmonic {
  n: number;
  an: number;
  bn: number;
  magnitude: number;
  phase: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signal, setSignal] = useState<number[]>(new Array(SAMPLES).fill(0));
  const [harmonicsCount, setHarmonicsCount] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showGibbs, setShowGibbs] = useState<boolean>(false);
  const [animProgress, setAnimProgress] = useState<number>(0);

  const isDrawingRef = useRef<boolean>(false);
  const lastDrawPosRef = useRef<{ idx: number; amp: number } | null>(null);
  const animFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Generate Preset Signals
  const loadPreset = useCallback((type: 'square' | 'sawtooth' | 'triangle' | 'clear') => {
    const newSignal = new Array(SAMPLES).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES; // 0 to 1
      if (type === 'square') {
        newSignal[i] = t < 0.5 ? 1 : -1;
      } else if (type === 'sawtooth') {
        newSignal[i] = 2 * (t - Math.floor(t + 0.5));
      } else if (type === 'triangle') {
        const saw = 2 * (t - Math.floor(t + 0.5));
        newSignal[i] = 2 * Math.abs(saw) - 1;
      } else {
        newSignal[i] = 0;
      }
    }
    setSignal(newSignal);
    setAnimProgress(0);
  }, []);

  // Initialize with square wave
  useEffect(() => {
    loadPreset('square');
  }, [loadPreset]);

  // Compute Real Fourier Coefficients
  const harmonics = useMemo(() => {
    const result: Harmonic[] = [];
    
    // DC Offset (n = 0)
    let a0 = 0;
    for (let i = 0; i < SAMPLES; i++) {
      a0 += signal[i];
    }
    a0 = a0 / SAMPLES;
    result.push({ n: 0, an: a0, bn: 0, magnitude: Math.abs(a0), phase: 0 });

    // AC Harmonics (n > 0)
    for (let n = 1; n <= MAX_HARMONICS; n++) {
      let an = 0;
      let bn = 0;
      for (let i = 0; i < SAMPLES; i++) {
        const t = (i / SAMPLES) * 2 * Math.PI;
        an += signal[i] * Math.cos(n * t);
        bn += signal[i] * Math.sin(n * t);
      }
      an = (2 / SAMPLES) * an;
      bn = (2 / SAMPLES) * bn;
      
      const magnitude = Math.sqrt(an * an + bn * bn);
      const phase = Math.atan2(bn, an);
      
      result.push({ n, an, bn, magnitude, phase });
    }
    return result;
  }, [signal]);

  // Precompute Reconstructed Signal
  const reconstructedSignal = useMemo(() => {
    const recon = new Array(SAMPLES).fill(0);
    const activeHarmonics = harmonics.slice(0, harmonicsCount + 1);
    
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * 2 * Math.PI;
      let sum = activeHarmonics[0].an; // DC
      for (let j = 1; j < activeHarmonics.length; j++) {
        const h = activeHarmonics[j];
        sum += h.an * Math.cos(h.n * t) + h.bn * Math.sin(h.n * t);
      }
      recon[i] = sum;
    }
    return recon;
  }, [harmonics, harmonicsCount]);

  // Drawing Handlers
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
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
    
    const idx = Math.max(0, Math.min(SAMPLES - 1, Math.floor((x / rect.width) * SAMPLES)));
    // Map Y: height*0.1 to height*0.9 => 1 to -1
    const paddingY = rect.height * 0.1;
    const activeHeight = rect.height - 2 * paddingY;
    let amp = -((y - paddingY) / activeHeight * 2 - 1);
    amp = Math.max(-1, Math.min(1, amp));
    
    return { idx, amp };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const pos = getCanvasCoordinates(e);
    if (pos) {
      lastDrawPosRef.current = pos;
      updateSignal(pos.idx, pos.amp, pos.idx, pos.amp);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getCanvasCoordinates(e);
    if (pos && lastDrawPosRef.current) {
      updateSignal(lastDrawPosRef.current.idx, lastDrawPosRef.current.amp, pos.idx, pos.amp);
      lastDrawPosRef.current = pos;
    }
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastDrawPosRef.current = null;
  };

  const updateSignal = (idx0: number, amp0: number, idx1: number, amp1: number) => {
    setSignal(prev => {
      const newSignal = [...prev];
      const steps = Math.max(Math.abs(idx1 - idx0), 1);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const currIdx = Math.round(idx0 + t * (idx1 - idx0));
        const currAmp = amp0 + t * (amp1 - amp0);
        if (currIdx >= 0 && currIdx < SAMPLES) {
          newSignal[currIdx] = currAmp;
        }
      }
      return newSignal;
    });
  };

  // Animation and Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padY = height * 0.1;
    const drawH = height - 2 * padY;

    const ampToY = (amp: number) => padY + (1 - amp) * 0.5 * drawH;

    ctx.clearRect(0, 0, width, height);

    // Grid / Axes
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw Original Drawn Signal (Faded)
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < SAMPLES; i++) {
      const x = (i / SAMPLES) * width;
      const y = ampToY(signal[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Reconstructed Path (Animated limit)
    const limitIdx = isPlaying ? Math.floor(animProgress * SAMPLES) : SAMPLES - 1;
    
    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= limitIdx && i < SAMPLES; i++) {
      const x = (i / SAMPLES) * width;
      const y = ampToY(reconstructedSignal[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Additive Reconstruction Stack at Current Animation Time
    if (isPlaying && limitIdx < SAMPLES) {
      const t = (limitIdx / SAMPLES) * 2 * Math.PI;
      const currX = (limitIdx / SAMPLES) * width;
      
      const activeHarmonics = harmonics.slice(0, harmonicsCount + 1);
      
      let stackSum = 0;
      let prevY = ampToY(0); // center

      // Draw dashed reference line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(currX, 0);
      ctx.lineTo(currX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw constituent vectors
      for (let j = 0; j < activeHarmonics.length; j++) {
        const h = activeHarmonics[j];
        const val = h.n === 0 ? h.an : h.an * Math.cos(h.n * t) + h.bn * Math.sin(h.n * t);
        stackSum += val;
        
        const currentY = ampToY(stackSum);
        
        // Draw segment for this harmonic
        ctx.strokeStyle = j % 2 === 0 ? '#f43f5e' : '#ec4899'; // rose/pink colors
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currX, prevY);
        ctx.lineTo(currX, currentY);
        ctx.stroke();

        // Node
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(currX, currentY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        prevY = currentY;
      }

      // Draw leading glowing dot
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(currX, ampToY(reconstructedSignal[limitIdx]), 6, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [signal, reconstructedSignal, animProgress, isPlaying, harmonics, harmonicsCount]);

  // Animation Loop
  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (isPlaying) {
      setAnimProgress((prev) => {
        const next = prev + dt / 3000; // 3 second sweep
        return next > 1 ? 0 : next;
      });
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, animProgress]);


  // CSV Export
  const exportCSV = () => {
    let csv = "Time,Original_Signal,Reconstructed_Signal\n";
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      csv += `${t.toFixed(4)},${signal[i].toFixed(