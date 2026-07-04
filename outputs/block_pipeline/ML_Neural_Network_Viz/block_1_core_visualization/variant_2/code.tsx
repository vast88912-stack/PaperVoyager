import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Math & ML Utils ---
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const d_sigmoid = (x: number) => { const s = sigmoid(x); return s * (1 - s); };

const relu = (x: number) => Math.max(0, x);
const d_relu = (x: number) => x > 0 ? 1 : 0;

const tanh = (x: number) => Math.tanh(x);
const d_tanh = (x: number) => 1 - Math.pow(Math.tanh(x), 2);

const activations = {
  sigmoid: { f: sigmoid, df: d_sigmoid },
  relu: { f: relu, df: d_relu },
  tanh: { f: tanh, df: d_tanh }
};

type ActivationType = keyof typeof activations;

// --- Data Generation ---
type Point = { x: number; y: number; label: number };

const generateXOR = (numPoints: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const label = (x > 0 && y > 0) || (x < 0 && y < 0) ? 0 : 1;
    points.push({ x, y, label });
  }
  return points;
};

const generateSpiral = (numPoints: number): Point[] => {
  const points: Point[] = [];
  const n = numPoints / 2;
  for (let i = 0; i < n; i++) {
    const r = (i / n) * 0.9;
    const t = 1.25 * i / n * 2 * Math.PI;
    points.push({ x: r * Math.sin(t) + (Math.random()-0.5)*0.1, y: r * Math.cos(t) + (Math.random()-0.5)*0.1, label: 0 });
    points.push({ x: -r * Math.sin(t) + (Math.random()-0.5)*0.1, y: -r * Math.cos(t) + (Math.random()-0.5)*0.1, label: 1 });
  }
  return points;
};

const generateBlobs = (numPoints: number): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const label = Math.random() > 0.5 ? 1 : 0;
    const cx = label === 1 ? 0.5 : -0.5;
    const cy = label === 1 ? 0.5 : -0.5;
    points.push({
      x: cx + (Math.random() - 0.5) * 0.8,
      y: cy + (Math.random() - 0.5) * 0.8,
      label
    });
  }
  return points;
};

// --- Neural Network State Types ---
type Weights = {
  W1: number[][]; // [2][H]
  b1: number[];   // [H]
  W2: number[][]; // [H][1]
  b2: number[];   // [1]
};

// --- Main Component ---
export default function App() {
  // UI State
  const [datasetType, setDatasetType] = useState<'xor' | 'spiral' | 'blobs'>('xor');
  const [hiddenSize, setHiddenSize] = useState<number>(4);
  const [activationType, setActivationType] = useState<ActivationType>('tanh');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Model & Training State
  const [epoch, setEpoch] = useState<number>(0);
  const [loss, setLoss] = useState<number>(1.0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [ablatedNodes, setAblatedNodes] = useState<Set<number>>(new Set());

  // Mutable refs for high-frequency training loop to avoid React overhead
  const weightsRef = useRef<Weights>({ W1: [], b1: [], W2: [], b2: [] });
  const dataRef = useRef<Point[]>([]);
  const isPlayingRef = useRef(isPlaying);
  const reqIdRef = useRef<number>();
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync isPlaying ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Init Network & Data
  const initNetwork = useCallback(() => {
    const W1 = Array(2).fill(0).map(() => Array(hiddenSize).fill(0).map(() => (Math.random() * 2 - 1)));
    const b1 = Array(hiddenSize).fill(0);
    const W2 = Array(hiddenSize).fill(0).map(() => [(Math.random() * 2 - 1)]);
    const b2 = [0];
    weightsRef.current = { W1, b1, W2, b2 };
    
    let pts: Point[] = [];
    if (datasetType === 'xor') pts = generateXOR(300);
    if (datasetType === 'spiral') pts = generateSpiral(300);
    if (datasetType === 'blobs') pts = generateBlobs(300);
    dataRef.current = pts;

    setEpoch(0);
    setLossHistory([]);
    setAblatedNodes(new Set());
    drawDecisionBoundary();
    // Force a re-render to update SVG weights
    setLoss(1.0);
  }, [datasetType, hiddenSize]);

  useEffect(() => {
    initNetwork();
  }, [initNetwork]);

  // Core Training Step
  const trainStep = useCallback(() => {
    const { W1, b1, W2, b2 } = weightsRef.current;
    const act = activations[activationType].f;
    const d_act = activations[activationType].df;
    const data = dataRef.current;
    
    let totalLoss = 0;
    
    // Gradients
    const dW1 = Array(2).fill(0).map(() => Array(hiddenSize).fill(0));
    const db1 = Array(hiddenSize).fill(0);
    const dW2 = Array(hiddenSize).fill(0).map(() => [0]);
    let db2 = 0;

    for (let i = 0; i < data.length; i++) {
      const { x, y, label } = data[i];
      const X = [x, y];

      // Forward Pass
      const Z1 = Array(hiddenSize).fill(0);
      const A1 = Array(hiddenSize).fill(0);
      for (let h = 0; h < hiddenSize; h++) {
        if (ablatedNodes.has(h)) continue;
        Z1[h] = X[0] * W1[0][h] + X[1] * W1[1][h] + b1[h];
        A1[h] = act(Z1[h]);
      }

      let Z2 = b2[0];
      for (let h = 0; h < hiddenSize; h++) {
        if (ablatedNodes.has(h)) continue;
        Z2 += A1[h] * W2[h][0];
      }
      const A2 = sigmoid(Z2);

      // Binary Cross Entropy Loss
      const eps = 1e-15;
      const pred = Math.max(eps, Math.min(1 - eps, A2));
      totalLoss += -label * Math.log(pred) - (1 - label) * Math.log(1 - pred);

      // Backward Pass
      const dZ2 = A2 - label; // derivative of BCE with sigmoid
      db2 += dZ2;

      for (let h = 0; h < hiddenSize; h++) {
        if (ablatedNodes.has(h)) continue;
        dW2[h][0] += A1[h] * dZ2;
        
        const dA1 = W2[h][0] * dZ2;
        const dZ1 = dA1 * d_act(Z1[h]);
        
        dW1[0][h] += X[0] * dZ1;
        dW1[1][h] += X[1] * dZ1;
        db1[h] += dZ1;
      }
    }

    const m = data.length;
    // Update Weights (SGD)
    for (let h = 0; h < hiddenSize; h++) {
      if (!ablatedNodes.has(h)) {
        W1[0][h] -= learningRate * (dW1[0][h] / m);
        W1[1][h] -= learningRate * (dW1[1][h] / m);
        b1[h] -= learningRate * (db1[h] / m);
        W2[h][0] -= learningRate * (dW2[h][0] / m);
      }
    }
    b2[0] -= learningRate * (db2 / m);

    return totalLoss / m;
  }, [hiddenSize, activationType, learningRate, ablatedNodes]);

  // Drawing Decision Boundary
  const drawDecisionBoundary = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { W1, b1, W2, b2 } = weightsRef.current;
    const act = activations[activationType].f;

    const res = 40; // grid resolution
    const dx = width / res;
    const dy = height / res;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const x = (i / res) * 2 - 1;
        const y = -((j / res) * 2 - 1); // flip y for standard cartesian

        // Forward
        let Z2 = b2[0];
        for (let h = 0; h < hiddenSize; h++) {
          if (ablatedNodes.has(h)) continue;
          const z1 = x * W1[0][h] + y * W1[1][h] + b1[h];
          const a1 = act(z1);
          Z2 += a1 * W2[h][0];
        }
        const pred = sigmoid(Z2);

        // Color mix: Cyan (1) to Pink (0)
        const r = Math.round((1 - pred) * 236 + pred * 6);
        const g = Math.round((1 - pred) * 72 + pred * 182);
        const b = Math.round((1 - pred) * 153 + pred * 212);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.fillRect(i * dx, j * dy, dx + 1, dy + 1);
      }
    }

    // Draw points
    dataRef.current.forEach(pt => {
      const px = ((pt.x + 1) / 2) * width;
      const py = ((-pt.y + 1) / 2) * height;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fillStyle = pt.label === 1 ? '#06b6d4' : '#ec4899'; // cyan-500 : pink-500
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    });

  }, [hiddenSize, activationType, ablatedNodes]);

  // Main Loop
  const loop = useCallback(() => {
    if (!isPlayingRef.current) return;

    let currentLoss = 0;
    const epochsPerFrame = 5;
    for (let i = 0; i < epochsPerFrame; i++) {
      currentLoss = trainStep();
    }

    setEpoch(prev => {
      const next = prev + epochsPerFrame;
      if (next % 10 === 0) drawDecisionBoundary();
      return next;
    });
    
    setLoss(currentLoss);
    setLossHistory(prev => {
      const hist = [...prev, currentLoss];
      if (hist.length > 100) hist.shift();
      return hist;
    });

    reqIdRef.current = requestAnimationFrame(loop);
  }, [trainStep, drawDecisionBoundary]);

  useEffect(() => {
    if (isPlaying) {
      reqIdRef.current = requestAnimationFrame(loop);
    } else if (reqIdRef.current) {
      cancelAnimationFrame(reqIdRef.current);
    }
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [isPlaying, loop]);

  const toggleAblation = (h: number) => {
    setAblatedNodes(prev => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
    setTimeout(drawDecisionBoundary, 0); // redraw after state update
  };

  // SVG Network Layout
  const svgWidth = 500;
  const svgHeight = 400;
  
  const inputNodes = [
    { id: 'x1', x: 80, y: 150, label: 'X₁' },
    { id: 'x2', x: 80, y: 250, label: 'X₂' }
  ];

  const hiddenNodes = Array(hiddenSize).fill(0).map((_, i) => ({
    id: `h${i}`,
    index: i,
    x: 250,
    y: hiddenSize === 1 ? 200 : 50 + (300 / (hiddenSize - 1)) * i,
    label: `H${i+1}`
  }));

  const outputNode = { id: 'out', x: 420, y: 200, label: 'Out' };

  const getWeightColor = (w: number) => w > 0 ? '#06b6d4' : '#ec4899';
  const getWeightOpacity = (w: number) => Math.min(1, Math.max(0.1, Math.abs(w)));
  const getWeightWidth = (w: number) => Math.min(8, Math.max(1, Math.abs(w) * 3));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md z-10">
        <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
          Neural Net Viewer <span className="text-sm font-normal text-slate-400">v3.0</span>
        </h1>
        <div className="flex gap-4 items-center">
          <div className="text-sm text-slate-400 flex flex-col items-end">
            <span>Epoch: <span className="text-cyan-400 font-mono">{epoch.toString().padStart(5, '0')}</span></span>
            <span>Loss: <span className="text-fuchsia-400 font-mono">{loss.toFixed(4)}</span></span>
          </div>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-[0_0_15px_-3px] ${
              isPlaying 
                ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/50 shadow-fuchsia-500/20 hover:bg-fuchsia-600/30' 
                : 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 shadow-cyan-500/20 hover:bg-cyan-600/30'
            }`}
          >
            {isPlaying ? 'PAUSE' : 'TRAIN'}
          </button>
          <button 
            onClick={initNetwork}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Reset Network"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main