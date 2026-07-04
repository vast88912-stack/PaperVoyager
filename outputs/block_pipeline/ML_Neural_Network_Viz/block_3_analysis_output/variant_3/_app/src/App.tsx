import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Mini ML Library ---
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const d_sigmoid = (x: number) => {
  const s = sigmoid(x);
  return s * (1 - s);
};
const tanh = (x: number) => Math.tanh(x);
const d_tanh = (x: number) => 1 - Math.pow(Math.tanh(x), 2);

// XOR Dataset mapped to [-1, 1] for better tanh performance
const DATASET = [
  { x: [-1, -1], y: [0] },
  { x: [-1, 1], y: [1] },
  { x: [1, -1], y: [1] },
  { x: [1, 1], y: [0] },
];

class SimpleMLP {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  
  // Gradients for visualization
  gradW1: number = 0;
  gradW2: number = 0;

  constructor() {
    // 2 inputs -> 4 hidden -> 1 output
    this.W1 = Array.from({ length: 2 }, () => Array.from({ length: 4 }, () => (Math.random() * 2 - 1)));
    this.b1 = Array(4).fill(0);
    this.W2 = Array.from({ length: 4 }, () => Array.from({ length: 1 }, () => (Math.random() * 2 - 1)));
    this.b2 = Array(1).fill(0);
  }

  forward(x: number[], ablated: boolean[]) {
    // Hidden Layer (tanh)
    const z1 = Array(4).fill(0);
    const a1 = Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
      z1[i] = x[0] * this.W1[0][i] + x[1] * this.W1[1][i] + this.b1[i];
      a1[i] = ablated[i] ? 0 : tanh(z1[i]);
    }

    // Output Layer (sigmoid)
    let z2 = this.b2[0];
    for (let i = 0; i < 4; i++) {
      z2 += a1[i] * this.W2[i][0];
    }
    const a2 = sigmoid(z2);

    return { z1, a1, z2, a2 };
  }

  trainStep(lr: number, ablated: boolean[]) {
    let totalLoss = 0;
    
    // Accumulators for gradients
    let dW1 = Array.from({ length: 2 }, () => Array(4).fill(0));
    let db1 = Array(4).fill(0);
    let dW2 = Array.from({ length: 4 }, () => Array(1).fill(0));
    let db2 = Array(1).fill(0);

    let sumGradW1 = 0;
    let sumGradW2 = 0;

    for (const { x, y } of DATASET) {
      // Forward
      const { z1, a1, z2, a2 } = this.forward(x, ablated);
      
      // Loss (MSE)
      const error = a2 - y[0];
      totalLoss += error * error;

      // Backward
      const dL_da2 = 2 * error;
      const da2_dz2 = d_sigmoid(z2);
      const dL_dz2 = dL_da2 * da2_dz2;

      db2[0] += dL_dz2;
      for (let i = 0; i < 4; i++) {
        dW2[i][0] += ablated[i] ? 0 : a1[i] * dL_dz2;
        sumGradW2 += Math.abs(dW2[i][0]);
      }

      for (let i = 0; i < 4; i++) {
        if (ablated[i]) continue;
        const dL_da1 = dL_dz2 * this.W2[i][0];
        const da1_dz1 = d_tanh(z1[i]);
        const dL_dz1 = dL_da1 * da1_dz1;

        db1[i] += dL_dz1;
        dW1[0][i] += x[0] * dL_dz1;
        dW1[1][i] += x[1] * dL_dz1;
        
        sumGradW1 += Math.abs(dW1[0][i]) + Math.abs(dW1[1][i]);
      }
    }

    // Update weights
    for (let i = 0; i < 4; i++) {
      this.b2[0] -= lr * db2[0];
      this.W2[i][0] -= lr * dW2[i][0];
      
      this.b1[i] -= lr * db1[i];
      this.W1[0][i] -= lr * dW1[0][i];
      this.W1[1][i] -= lr * dW1[1][i];
    }

    this.gradW1 = sumGradW1 / 8; // Avg grad W1
    this.gradW2 = sumGradW2 / 4; // Avg grad W2

    return totalLoss / DATASET.length;
  }
}

// --- React Component ---
export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState(1.0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [ablated, setAblated] = useState<boolean[]>([false, false, false, false]);
  const [learningRate, setLearningRate] = useState(0.1);
  const [metrics, setMetrics] = useState({ gradW1: 0, gradW2: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mlpRef = useRef(new SimpleMLP());
  const requestRef = useRef<number>();

  const resetNetwork = () => {
    mlpRef.current = new SimpleMLP();
    setEpoch(0);
    setLoss(1.0);
    setLossHistory([]);
    setMetrics({ gradW1: 0, gradW2: 0 });
    drawDecisionBoundary();
  };

  const drawDecisionBoundary = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const resolution = 25; // 25x25 grid for performance
    const stepX = width / resolution;
    const stepY = height / resolution;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid predictions
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        // Map grid to [-1.5, 1.5]
        const x1 = (i / resolution) * 3 - 1.5;
        const x2 = ((resolution - j) / resolution) * 3 - 1.5;

        const { a2 } = mlpRef.current.forward([x1, x2], ablated);
        
        // Neon color mapping (Cyan = 0, Magenta = 1)
        const r = Math.floor(a2 * 236 + (1 - a2) * 34);
        const g = Math.floor(a2 * 72 + (1 - a2) * 211);
        const b = Math.floor(a2 * 153 + (1 - a2) * 238);
        const alpha = 0.6;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(i * stepX, j * stepY, stepX, stepY);
      }
    }

    // Draw training data points
    DATASET.forEach(({ x, y }) => {
      const px = ((x[0] + 1.5) / 3) * width;
      const py = ((1.5 - x[1]) / 3) * height;

      ctx.beginPath();
      ctx.arc(px, py, 8, 0, 2 * Math.PI);
      ctx.fillStyle = y[0] === 1 ? '#ec4899' : '#22d3ee'; // magenta vs cyan
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      
      // Neon glow for points
      ctx.shadowBlur = 10;
      ctx.shadowColor = y[0] === 1 ? '#ec4899' : '#22d3ee';
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });
  }, [ablated]);

  const trainLoop = useCallback(() => {
    if (!isRunning) return;

    let currentLoss = 0;
    // Run 10 epochs per frame to speed up visual training
    for (let i = 0; i < 10; i++) {
      currentLoss = mlpRef.current.trainStep(learningRate, ablated);
    }

    setEpoch(prev => prev + 10);
    setLoss(currentLoss);
    setLossHistory(prev => [...prev.slice(-99), currentLoss]);
    setMetrics({
      gradW1: mlpRef.current.gradW1,
      gradW2: mlpRef.current.gradW2
    });

    drawDecisionBoundary();
    requestRef.current = requestAnimationFrame(trainLoop);
  }, [isRunning, learningRate, ablated, drawDecisionBoundary]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(trainLoop);
    }
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isRunning, trainLoop]);

  // Initial Draw
  useEffect(() => {
    drawDecisionBoundary();
  }, [drawDecisionBoundary]);

  const toggleAblation = (index: number) => {
    const newAblated = [...ablated];
    newAblated[index] = !newAblated[index];
    setAblated(newAblated);
    if (!isRunning) drawDecisionBoundary();
  };

  // --- SVG Path Generation for Loss Curve ---
  const generateLossPath = () => {
    if (lossHistory.length === 0) return "";
    const maxLoss = 0.5; // Expected max MSE roughly
    const width = 300;
    const height = 100;
    
    return lossHistory.map((l, i) => {
      const x = (i / 100) * width;
      const y = height - Math.min(l / maxLoss, 1) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(" ");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 selection:text-cyan-100 p-6 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-6xl mb-8 flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            Analysis & Output
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-semibold">
            Neural Net Viewer // Module 4
          </p>
        </div>
        
        {/* Global Controls */}
        <div className="flex gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
              isRunning 
                ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
            } hover:bg-opacity-40`}
          >
            {isRunning ? 'PAUSE TRAINING' : 'START TRAINING'}
          </button>
          <button
            onClick={resetNetwork}
            className="px-6 py-2 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all duration-300"
          >
            RESET
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Output Space Visualization */}
        <section className="col-span-1 lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-50"></div>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              Decision Boundary (XOR)
            </h2>
            <div className="text-sm font-mono bg-slate-950 px-3 py-1 rounded text-cyan-400 border border-cyan-900/50">
              Epoch: {epoch.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="flex justify-center items-center bg-slate-950 rounded-xl p-4 border border-slate-800 inset-shadow">
            <canvas 
              ref={canvasRef} 
              width={400} 
              height={400} 
              className="w-full max-w-[400px] aspect-square rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800"
            />
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                <span className="text-xs text-slate-400">Class 0</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></span>
                <span className="text-xs text-slate-400">Class 1</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-bold uppercase">Learning Rate</label>
              <input 
                type="range" 
                min="0.01" max="0.5" step="0.01" 
                value={learningRate} 
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-24 accent-cyan-400"
              />
              <span className="text-xs font-mono text-cyan-400">{learningRate.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Right Column: Analysis & Metrics */}
        <section className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          
          {/* Loss Curve Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Loss Curve (MSE)
            </h2>
            <div className="relative h-[100px] w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-20 pointer-events-none">
                <div className="border-b border-slate-700 w-full h-1/4"></div>
                <div className="border-b border-slate-700 w-full h-1/4"></div>
                <div className="border-b border-slate-700 w-full h-1/4"></div>
              </div>
              
              <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0">
                <defs>
                  <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                {lossHistory.length > 0 && (
                  <path 
                    d={`${generateLossPath()} L 300 100 L 0 100 Z`} 
                    fill="url(#lossGradient)" 
                  />
                )}
                {/* Line */}
                <path 
                  d={generateLossPath()} 
                  fill="none" 
                  stroke="#ec4899" 
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0px 0px 4px rgba(236,72,153,0.8))' }}
                />
              </svg>
            </div>
            <div className="mt-3 flex justify-between items-end">
              <span className="text-xs text-slate-500 uppercase font-bold">Current Loss</span>
              <span className="text-2xl font-mono text-fuchsia-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                {loss.toFixed(5)}
              </span>
            </div>
          </div>

          {/* Gradient Flow Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Gradient Flow
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Hidden Layer (W1) Mean Grad</span>
                  <span className="font-mono text-lime-400">{metrics.gradW1.toFixed(4)}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-lime-400 h-2 rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(163,230,53,0.8)]"
                    style={{ width: `${Math.min((metrics.gradW1 / 0.1) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Output Layer (W2) Mean Grad</span>
                  <span className="font-mono text-lime-400">{metrics.gradW2.toFixed(4)}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-lime-400 h-2 rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(163,230,53,0.8)]"
                    style={{ width: `${Math.min((metrics.gradW2 / 0.1) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 leading-tight">
              Visualizes the magnitude of gradients flowing backwards. Notice how the hidden layer gradients (W