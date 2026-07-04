import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Definitions ---

type Point = { x: number; y: number };

interface OptFunction {
  name: string;
  id: string;
  domainX: [number, number];
  domainY: [number, number];
  start: Point;
  minima: Point;
  fn: (x: number, y: number) => number;
  grad: (x: number, y: number) => Point;
}

const FUNCTIONS: Record<string, OptFunction> = {
  ravine: {
    name: 'Ravine (Stretched Bowl)',
    id: 'ravine',
    domainX: [-5, 5],
    domainY: [-5, 5],
    start: { x: -4, y: -3 },
    minima: { x: 0, y: 0 },
    fn: (x, y) => 0.5 * x * x + 10 * y * y,
    grad: (x, y) => ({ x: x, y: 20 * y }),
  },
  rosenbrock: {
    name: 'Rosenbrock (Banana)',
    id: 'rosenbrock',
    domainX: [-2.5, 2.5],
    domainY: [-1.5, 3.5],
    start: { x: -1.5, y: 0.5 },
    minima: { x: 1, y: 1 },
    fn: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
    grad: (x, y) => ({
      x: -2 * (1 - x) - 400 * x * (y - x * x),
      y: 200 * (y - x * x),
    }),
  },
};

// Optimizer States
interface MomentumState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  history: Point[];
  done: boolean;
}

interface AdamState {
  x: number;
  y: number;
  m_x: number;
  m_y: number;
  v_x: number;
  v_y: number;
  t: number;
  history: Point[];
  done: boolean;
}

export default function App() {
  // --- UI & Hyperparameter State ---
  const [funcId, setFuncId] = useState<string>('ravine');
  const [lr, setLr] = useState<number>(0.015);
  const [beta1, setBeta1] = useState<number>(0.9);
  const [beta2, setBeta2] = useState<number>(0.999);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepCount, setStepCount] = useState<number>(0);

  // --- Refs for Animation & Canvas ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Mutable state for optimizers to avoid React batching issues in animation loop
  const optimizers = useRef<{
    momentum: MomentumState;
    adam: AdamState;
  }>({
    momentum: { x: 0, y: 0, vx: 0, vy: 0, history: [], done: false },
    adam: { x: 0, y: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0, history: [], done: false },
  });

  // --- Initialization ---
  const initOptimizers = useCallback(() => {
    const fn = FUNCTIONS[funcId];
    optimizers.current = {
      momentum: { x: fn.start.x, y: fn.start.y, vx: 0, vy: 0, history: [{ ...fn.start }], done: false },
      adam: { x: fn.start.x, y: fn.start.y, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0, history: [{ ...fn.start }], done: false },
    };
    setStepCount(0);
    draw();
  }, [funcId]);

  useEffect(() => {
    initOptimizers();
  }, [initOptimizers]);

  // --- Optimization Logic ---
  const clipGradient = (g: Point, maxNorm = 50): Point => {
    const norm = Math.sqrt(g.x * g.x + g.y * g.y);
    if (norm > maxNorm) {
      return { x: (g.x / norm) * maxNorm, y: (g.y / norm) * maxNorm };
    }
    return g;
  };

  const stepOptimizers = () => {
    const fn = FUNCTIONS[funcId];
    const eps = 1e-8;
    const tolerance = 1e-3;

    let mom = optimizers.current.momentum;
    let adam = optimizers.current.adam;

    // --- Momentum Step ---
    if (!mom.done) {
      let g_mom = clipGradient(fn.grad(mom.x, mom.y));
      mom.vx = beta1 * mom.vx + (1 - beta1) * g_mom.x;
      mom.vy = beta1 * mom.vy + (1 - beta1) * g_mom.y;
      mom.x = mom.x - lr * mom.vx;
      mom.y = mom.y - lr * mom.vy;
      mom.history.push({ x: mom.x, y: mom.y });

      if (Math.hypot(mom.x - fn.minima.x, mom.y - fn.minima.y) < tolerance || mom.history.length > 2000) {
        mom.done = true;
      }
    }

    // --- Adam Step ---
    if (!adam.done) {
      adam.t += 1;
      let g_adam = clipGradient(fn.grad(adam.x, adam.y));
      
      adam.m_x = beta1 * adam.m_x + (1 - beta1) * g_adam.x;
      adam.m_y = beta1 * adam.m_y + (1 - beta1) * g_adam.y;
      
      adam.v_x = beta2 * adam.v_x + (1 - beta2) * (g_adam.x * g_adam.x);
      adam.v_y = beta2 * adam.v_y + (1 - beta2) * (g_adam.y * g_adam.y);
      
      const m_hat_x = adam.m_x / (1 - Math.pow(beta1, adam.t));
      const m_hat_y = adam.m_y / (1 - Math.pow(beta1, adam.t));
      
      const v_hat_x = adam.v_x / (1 - Math.pow(beta2, adam.t));
      const v_hat_y = adam.v_y / (1 - Math.pow(beta2, adam.t));
      
      adam.x = adam.x - lr * (m_hat_x / (Math.sqrt(v_hat_x) + eps));
      adam.y = adam.y - lr * (m_hat_y / (Math.sqrt(v_hat_y) + eps));
      adam.history.push({ x: adam.x, y: adam.y });

      if (Math.hypot(adam.x - fn.minima.x, adam.y - fn.minima.y) < tolerance || adam.history.length > 2000) {
        adam.done = true;
      }
    }

    setStepCount(prev => prev + 1);
  };

  // --- Drawing Logic ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const fn = FUNCTIONS[funcId];

    // Clear background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    // Coordinate mapping
    const mapX = (x: number) => ((x - fn.domainX[0]) / (fn.domainX[1] - fn.domainX[0])) * width;
    const mapY = (y: number) => height - ((y - fn.domainY[0]) / (fn.domainY[1] - fn.domainY[0])) * height;

    // Draw Vector Field (Gradient hints)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const steps = 20;
    const dx = (fn.domainX[1] - fn.domainX[0]) / steps;
    const dy = (fn.domainY[1] - fn.domainY[0]) / steps;

    for (let x = fn.domainX[0]; x <= fn.domainX[1]; x += dx) {
      for (let y = fn.domainY[0]; y <= fn.domainY[1]; y += dy) {
        const g = fn.grad(x, y);
        const norm = Math.sqrt(g.x * g.x + g.y * g.y) || 1;
        // Normalize and scale arrow
        const ax = -(g.x / norm) * (width / steps) * 0.4;
        const ay = (g.y / norm) * (height / steps) * 0.4; // inverted Y for canvas

        const cx = mapX(x);
        const cy = mapY(y);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + ax, cy + ay);
        ctx.stroke();
        
        // arrow head
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Minima
    const minX = mapX(fn.minima.x);
    const minY = mapY(fn.minima.y);
    ctx.fillStyle = '#FBBF24'; // Amber
    ctx.beginPath();
    ctx.arc(minX, minY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Helper to draw paths
    const drawPath = (history: Point[], color: string, glow: string) => {
      if (history.length === 0) return;
      
      ctx.beginPath();
      ctx.moveTo(mapX(history[0].x), mapY(history[0].y));
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(mapX(history[i].x), mapY(history[i].y));
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw current position
      const last = history[history.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mapX(last.x), mapY(last.y), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#121212';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Draw Paths
    drawPath(optimizers.current.momentum.history, '#F472B6', 'rgba(244, 114, 182, 0.6)'); // Pink for Momentum
    drawPath(optimizers.current.adam.history, '#2DD4BF', 'rgba(45, 212, 191, 0.6)');     // Teal for Adam

  }, [funcId]);

  // --- Animation Loop ---
  const animate = useCallback(() => {
    if (isPlaying) {
      stepOptimizers();
      draw();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, draw]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const parent = canvas.parentElement;
        if (parent) {
          // Keep it square based on the smallest dimension
          const size = Math.min(parent.clientWidth - 64, parent.clientHeight - 64);
          canvas.width = size;
          canvas.height = size;
          draw();
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);


  return (
    <div className="flex h-screen w-full bg-[#121212] text-gray-200 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-[#1A1A1A] p-6 border-r border-gray-800 flex flex-col gap-8 z-10 shadow-2xl overflow-y-auto">
        
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">
            Optimizer <span className="text-teal-400">Race</span>
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Compare Momentum and Adam on 2D loss landscapes. Watch how they navigate ravines and saddle points.
          </p>
        </div>

        {/* Function Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Landscape</label>
          <div className="flex flex-col gap-2">
            {Object.values(FUNCTIONS).map(fn => (
              <button
                key={fn.id}
                onClick={() => {
                  setFuncId(fn.id);
                  setIsPlaying(false);
                }}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                  funcId === fn.id 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' 
                    : 'bg-[#242424] text-gray-300 hover:bg-[#2A2A2A] border border-transparent'
                }`}
              >
                {fn.name}
              </button>
            ))}
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="flex flex-col gap-5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hyperparameters</label>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Learning Rate (<span className="font-mono text-teal-400">α</span>)</span>
              <span className="font-mono text-gray-400">{lr.toFixed(3)}</span>
            </div>
            <input 
              type="range" min="0.001" max="0.1" step="0.001" value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Momentum (<span className="font-mono text-pink-400">β₁</span>)</span>
              <span className="font-mono text-gray-400">{beta1.toFixed(3)}</span>
            </div>
            <input 
              type="range" min="0.5" max="0.99" step="0.01" value={beta1}
              onChange={(e) => setBeta1(parseFloat(e.target.value))}
              className="w-full accent-pink-400 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Adam RMS (<span className="font-mono text-teal-400">β₂</span>)</span>
              <span className="font-mono text-gray-400">{beta2.toFixed(4)}</span>
            </div>
            <input 
              type="range" min="0.8" max="0.9999" step="0.001" value={beta2}
              onChange={(e) => setBeta2(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${
              isPlaying 
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' 
                : 'bg-teal-500 text-gray-900 hover:bg-teal-400 hover:shadow-teal-500/20'
            }`}
          >
            {isPlaying ? 'PAUSE' : 'START DESCENT'}
          </button>
          
          <button
            onClick={() => {
              setIsPlaying(false);
              initOptimizers();
            }}
            className="w-full py-3 rounded-lg font-bold text-sm bg-[#242424] text-gray-300 hover:bg-[#2A2A2A] transition-colors"
          >
            RESET
          </button>
        </div>

      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#121212]">
        
        {/* Top Stats Bar */}
        <div className="absolute top-0 left-0 right-