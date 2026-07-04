import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- DATASETS ---
const DATASETS = {
  XOR: [
    { x: 0, y: 0, label: 0 },
    { x: 0, y: 1, label: 1 },
    { x: 1, y: 0, label: 1 },
    { x: 1, y: 1, label: 0 },
  ],
  BULLSEYE: [
    { x: 0.5, y: 0.5, label: 1 },
    { x: 0.4, y: 0.4, label: 1 },
    { x: 0.6, y: 0.6, label: 1 },
    { x: 0.5, y: 0.6, label: 1 },
    { x: 0.6, y: 0.5, label: 1 },
    { x: 0.1, y: 0.1, label: 0 },
    { x: 0.1, y: 0.9, label: 0 },
    { x: 0.9, y: 0.1, label: 0 },
    { x: 0.9, y: 0.9, label: 0 },
    { x: 0.5, y: 0.1, label: 0 },
    { x: 0.1, y: 0.5, label: 0 },
    { x: 0.9, y: 0.5, label: 0 },
    { x: 0.5, y: 0.9, label: 0 },
  ],
};

// --- MINI ML ENGINE ---
class MLPEngine {
  hSize: number;
  w1: number[][];
  b1: number[];
  w2: number[];
  b2: number;
  ablated: boolean[];
  gradMagnitude: number[];
  activations: number[];
  lastInput: number[];
  lastOut: number;

  constructor(hiddenSize = 5) {
    this.hSize = hiddenSize;
    // He Initialization
    this.w1 = Array.from({ length: 2 }, () =>
      Array.from({ length: hiddenSize }, () => (Math.random() * 2 - 1) * Math.sqrt(2 / 2))
    );
    this.b1 = Array(hiddenSize).fill(0);
    this.w2 = Array.from({ length: hiddenSize }, () => (Math.random() * 2 - 1) * Math.sqrt(2 / hiddenSize));
    this.b2 = 0;

    this.ablated = Array(hiddenSize).fill(false);
    this.gradMagnitude = Array(hiddenSize).fill(0);
    this.activations = Array(hiddenSize).fill(0);
    this.lastInput = [0, 0];
    this.lastOut = 0;
  }

  forward(x: number[], record = false): number {
    let h = [];
    for (let i = 0; i < this.hSize; i++) {
      if (this.ablated[i]) {
        h.push(0);
        continue;
      }
      let z = x[0] * this.w1[0][i] + x[1] * this.w1[1][i] + this.b1[i];
      h.push(Math.tanh(z));
    }

    let out_z = this.b2;
    for (let i = 0; i < this.hSize; i++) {
      out_z += h[i] * this.w2[i];
    }
    let out = 1 / (1 + Math.exp(-out_z)); // Sigmoid output

    if (record) {
      this.activations = [...h];
      this.lastInput = x;
      this.lastOut = out;
    }
    return out;
  }

  backward(target: number, lr: number = 0.1): number {
    let d_out = this.lastOut - target;
    let d_out_z = d_out * (this.lastOut * (1 - this.lastOut));

    let d_w2 = Array(this.hSize).fill(0);
    let d_h = Array(this.hSize).fill(0);

    for (let i = 0; i < this.hSize; i++) {
      d_w2[i] = d_out_z * this.activations[i];
      d_h[i] = d_out_z * this.w2[i];
    }
    let d_b2 = d_out_z;

    let d_w1 = Array.from({ length: 2 }, () => Array(this.hSize).fill(0));
    let d_b1 = Array(this.hSize).fill(0);

    for (let i = 0; i < this.hSize; i++) {
      if (this.ablated[i]) continue;
      let dtanh = 1 - this.activations[i] * this.activations[i];
      let d_z = d_h[i] * dtanh;

      d_w1[0][i] = d_z * this.lastInput[0];
      d_w1[1][i] = d_z * this.lastInput[1];
      d_b1[i] = d_z;

      // Track relative gradient heat for visualization
      let gradMag = Math.abs(d_w1[0][i]) + Math.abs(d_w1[1][i]) + Math.abs(d_w2[i]);
      this.gradMagnitude[i] = this.gradMagnitude[i] * 0.95 + gradMag * 0.05;
    }

    // Update weights
    for (let i = 0; i < this.hSize; i++) {
      if (!this.ablated[i]) {
        this.w1[0][i] -= lr * d_w1[0][i];
        this.w1[1][i] -= lr * d_w1[1][i];
        this.b1[i] -= lr * d_b1[i];
      }
      this.w2[i] -= lr * d_w2[i];
    }
    this.b2 -= lr * d_b2;

    return d_out * d_out; // MSE
  }
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [datasetKey, setDatasetKey] = useState<keyof typeof DATASETS>('XOR');
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [nodesInfo, setNodesInfo] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mlpRef = useRef(new MLPEngine(5));
  const reqRef = useRef<number>();

  // Init offscreen canvas once
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 60;
    offscreen.height = 60;
    offscreenCanvasRef.current = offscreen;
  }, []);

  const renderDecisionBoundary = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    const RES = offscreen.width;
    const imgData = offCtx.createImageData(RES, RES);
    const mlp = mlpRef.current;

    for (let x = 0; x < RES; x++) {
      for (let y = 0; y < RES; y++) {
        // Map grid to [-0.2, 1.2]
        const nx = (x / RES) * 1.4 - 0.2;
        const ny = (y / RES) * 1.4 - 0.2;
        const out = mlp.forward([nx, ny], false);

        const idx = (y * RES + x) * 4;
        
        // Color mapping: Cyan (class 0) to Fuchsia (class 1)
        // Cyan: 6, 182, 212  | Fuchsia: 217, 70, 239
        const r = 6 + out * (217 - 6);
        const g = 182 + out * (70 - 182);
        const b = 212 + out * (239 - 212);
        
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    
    offCtx.putImageData(imgData, 0, 0);
    
    // Scale up to main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw with slight opacity to blend with background
    ctx.globalAlpha = 0.85;
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    // Draw Dataset Points
    const dataset = DATASETS[datasetKey];
    dataset.forEach(pt => {
      const cx = ((pt.x + 0.2) / 1.4) * canvas.width;
      const cy = ((pt.y + 0.2) / 1.4) * canvas.height;
      
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = pt.label === 1 ? '#d946ef' : '#06b6d4';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });
  }, [datasetKey]);

  const trainStep = useCallback(() => {
    const mlp = mlpRef.current;
    const dataset = DATASETS[datasetKey];
    let totalLoss = 0;
    
    // Train loop batch
    for (let step = 0; step < 20; step++) {
      let batchLoss = 0;
      for (let i = 0; i < dataset.length; i++) {
        const pt = dataset[i];
        mlp.forward([pt.x, pt.y], true);
        batchLoss += mlp.backward(pt.label, 0.15);
      }
      totalLoss += batchLoss / dataset.length;
    }
    
    const avgLoss = totalLoss / 20;

    setEpoch(e => e + 20);
    setLossHistory(prev => {
      const next = [...prev, avgLoss];
      if (next.length > 100) next.shift();
      return next;
    });

    // Update Node Info state
    const newNodesInfo = [];
    for (let i = 0; i < mlp.hSize; i++) {
      newNodesInfo.push({
        id: i,
        ablated: mlp.ablated[i],
        act: mlp.activations[i],
        grad: mlp.gradMagnitude[i],
      });
    }
    setNodesInfo(newNodesInfo);

    renderDecisionBoundary();
  }, [datasetKey, renderDecisionBoundary]);

  // Main Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    
    const loop = (time: number) => {
      if (time - lastTime > 32) { // Target ~30 FPS updates for UI smoothness
        trainStep();
        lastTime = time;
      }
      reqRef.current = requestAnimationFrame(loop);
    };
    reqRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying, trainStep]);

  // Handle Reset
  const resetModel = () => {
    mlpRef.current = new MLPEngine(5);
    setEpoch(0);
    setLossHistory([]);
    renderDecisionBoundary();
  };

  const toggleAblation = (idx: number) => {
    mlpRef.current.ablated[idx] = !mlpRef.current.ablated[idx];
    setNodesInfo(prev => prev.map((n, i) => i === idx ? { ...n, ablated: mlpRef.current.ablated[idx] } : n));
    if (!isPlaying) renderDecisionBoundary();
  };

  // SVG Loss Curve Path
  const maxLoss = Math.max(...lossHistory, 0.5);
  const pathData = lossHistory.map((l, i) => {
    const x = (i / 100) * 300;
    const y = 100 - (l / maxLoss) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 flex flex-col items-center">
      {/* HEADER */}
      <header className="w-full max-w-6xl flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            NEURAL ANALYSIS CONSOLE
          </h1>
          <p className="text-zinc-400 text-sm mt-1 tracking-widest uppercase">
            Forward & Backward Propagation Viewer
          </p>
        </div>
        <div className="flex gap-4">
          <select 
            className="bg-zinc-900