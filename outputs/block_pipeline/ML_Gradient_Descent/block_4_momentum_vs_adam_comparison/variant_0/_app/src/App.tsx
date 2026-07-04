import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Functions ---

type Point = { x: number; y: number };

interface OptState {
  x: number;
  y: number;
  path: Point[];
  // Momentum specific
  vx: number;
  vy: number;
  // Adam specific
  m_x: number;
  m_y: number;
  v_x: number;
  v_y: number;
  t: number;
}

interface ObjectiveFunction {
  id: string;
  name: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  scale: number;
}

const functions: Record<string, ObjectiveFunction> = {
  stretched: {
    id: 'stretched',
    name: 'Stretched Bowl (Ill-conditioned)',
    f: (x, y) => x * x + 10 * y * y,
    grad: (x, y) => [2 * x, 20 * y],
    scale: 50,
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle Point',
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
    scale: 20,
  },
  bowl: {
    id: 'bowl',
    name: 'Standard Bowl',
    f: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
    scale: 30,
  },
};

const START_POS = { x: -4, y: 3 };
const MAX_PATH_LENGTH = 1000;

export default function App() {
  // --- State ---
  const [activeFunc, setActiveFunc] = useState<string>('stretched');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  // Hyperparameters
  const [lr, setLr] = useState<number>(0.015);
  const [momentum, setMomentum] = useState<number>(0.9);
  const [beta1, setBeta1] = useState<number>(0.9);
  const [beta2, setBeta2] = useState<number>(0.999);

  // Refs for canvas and animation
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Ref to hold mutable simulation state without triggering re-renders
  const simState = useRef<{
    mom: OptState;
    adam: OptState;
  }>({
    mom: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
    adam: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
  });

  // Ref to hold current hyperparameters for the animation loop
  const paramsRef = useRef({ lr, momentum, beta1, beta2, func: functions[activeFunc] });
  useEffect(() => {
    paramsRef.current = { lr, momentum, beta1, beta2, func: functions[activeFunc] };
  }, [lr, momentum, beta1, beta2, activeFunc]);

  // --- Simulation Logic ---
  const resetSimulation = useCallback(() => {
    simState.current = {
      mom: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
      adam: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
    };
    setIsRunning(false);
    drawFrame();
  }, []);

  const stepSimulation = useCallback(() => {
    const { lr, momentum, beta1, beta2, func } = paramsRef.current;
    const state = simState.current;
    const epsilon = 1e-8;

    // Helper to clamp values to prevent infinity
    const clamp = (val: number, min = -10, max = 10) => Math.max(min, Math.min(max, val));

    // --- Momentum Step ---
    let [g_mom_x, g_mom_y] = func.grad(state.mom.x, state.mom.y);
    state.mom.vx = momentum * state.mom.vx + lr * g_mom_x;
    state.mom.vy = momentum * state.mom.vy + lr * g_mom_y;
    state.mom.x -= state.mom.vx;
    state.mom.y -= state.mom.vy;
    state.mom.x = clamp(state.mom.x);
    state.mom.y = clamp(state.mom.y);
    if (state.mom.path.length < MAX_PATH_LENGTH) {
      state.mom.path.push({ x: state.mom.x, y: state.mom.y });
    }

    // --- Adam Step ---
    let [g_adam_x, g_adam_y] = func.grad(state.adam.x, state.adam.y);
    state.adam.t += 1;
    
    state.adam.m_x = beta1 * state.adam.m_x + (1 - beta1) * g_adam_x;
    state.adam.m_y = beta1 * state.adam.m_y + (1 - beta1) * g_adam_y;
    
    state.adam.v_x = beta2 * state.adam.v_x + (1 - beta2) * (g_adam_x * g_adam_x);
    state.adam.v_y = beta2 * state.adam.v_y + (1 - beta2) * (g_adam_y * g_adam_y);
    
    const m_hat_x = state.adam.m_x / (1 - Math.pow(beta1, state.adam.t));
    const m_hat_y = state.adam.m_y / (1 - Math.pow(beta1, state.adam.t));
    const v_hat_x = state.adam.v_x / (1 - Math.pow(beta2, state.adam.t));
    const v_hat_y = state.adam.v_y / (1 - Math.pow(beta2, state.adam.t));
    
    // Adam typically uses a different effective learning rate scale, but we use the same slider for comparison
    // We multiply Adam's LR by a factor so it's visually comparable on the same scale for this demo
    const adam_lr = lr * 2.0; 
    
    state.adam.x -= adam_lr * m_hat_x / (Math.sqrt(v_hat_x) + epsilon);
    state.adam.y -= adam_lr * m_hat_y / (Math.sqrt(v_hat_y) + epsilon);
    state.adam.x = clamp(state.adam.x);
    state.adam.y = clamp(state.adam.y);
    if (state.adam.path.length < MAX_PATH_LENGTH) {
      state.adam.path.push({ x: state.adam.x, y: state.adam.y });
    }
  }, []);

  // --- Rendering Logic ---
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = 40; // pixels per unit

    // Clear background
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#1f2937'; // gray-800
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += scale) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += scale) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    // Draw Axes
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();

    // Draw Contours (Simplified visualization)
    const func = paramsRef.current.func;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Draw concentric shapes based on the function type
    for (let r = 1; r <= 10; r++) {
      ctx.beginPath();
      if (func.id === 'stretched') {
        ctx.ellipse(cx, cy, r * scale * 1.5, r * scale * 1.5 / Math.sqrt(10), 0, 0, 2 * Math.PI);
      } else if (func.id === 'bowl') {
        ctx.arc(cx, cy, r * scale, 0, 2 * Math.PI);
      } else if (func.id === 'saddle') {
        // Hyperbolas for saddle
        const offset = r * scale * 0.5;
        ctx.moveTo(cx - width, cy - width + offset);
        ctx.quadraticCurveTo(cx, cy + offset, cx + width, cy - width + offset);
        ctx.moveTo(cx - width, cy + width - offset);
        ctx.quadraticCurveTo(cx, cy - offset, cx + width, cy + width - offset);
      }
      ctx.stroke();
    }

    // Helper to map coordinates
    const mapX = (x: number) => cx + x * scale;
    const mapY = (y: number) => cy - y * scale; // invert Y for standard cartesian

    // Draw Paths
    const drawPath = (path: Point[], color: string) => {
      if (path.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      
      ctx.moveTo(mapX(path[0].x), mapY(path[0].y));
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(mapX(path[i].x), mapY(path[i].y));
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw current position dot
      const last = path[path.length - 1];
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.arc(mapX(last.x), mapY(last.y), 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const state = simState.current;
    drawPath(state.mom.path, '#2dd4bf'); // Teal for Momentum
    drawPath(state.adam.path, '#f472b6'); // Pink for Adam

  }, []);

  // --- Animation Loop ---
  const animate = useCallback(() => {
    if (isRunning) {
      stepSimulation();
      drawFrame();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isRunning, stepSimulation, drawFrame]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, animate]);

  // Initial draw and resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
          drawFrame();
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame]);

  // Redraw when function changes
  useEffect(() => {
    resetSimulation();
  }, [activeFunc, resetSimulation]);

  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full block"
        />
        
        {/* Overlay Info */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Momentum <span className="text-gray-400 font-light">vs</span> Adam
          </h1>
          <p className="text-gray-400 max-w-md text-sm leading-relaxed">
            Watch how different optimizers navigate the loss landscape. 
            Momentum builds velocity to overcome shallow gradients, while Adam adapts its learning rate per parameter.
          </p>
          
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-gray-800/80 backdrop-blur px-4 py-2 rounded-lg border border-gray-700 w-fit">
              <div className="w-4 h-4 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]"></div>
              <span className="font-medium text-teal-400">Momentum</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-800/80 backdrop-blur px-4 py-2 rounded-lg border border-gray-700 w-fit">
              <div className="w-4 h-4 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.8)]"></div>
              <span className="font-medium text-pink-400">Adam</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-sm">Controls</h2>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-2.5 rounded font-bold transition-colors ${
                isRunning 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                  : 'bg-teal-500 text-gray-900 hover:bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.4)]'
              }`}
            >
              {isRunning ? 'Pause' : 'Play'}
            </button>
            <button 
              onClick={resetSimulation}
              className="px-4 py-2.5 rounded font-bold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors border border-gray-600"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-8">
          
          {/* Function Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Landscape Function</label>
            <select 
              value={activeFunc}
              onChange={(e) => setActiveFunc(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none"
            >
              {Object.values(functions).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Global Hyperparameters */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Base Learning Rate</label>
                <span className="text-xs text-teal-400 font-mono">{lr.toFixed(3)}</span>
              </div>
              <input 
                type="range" min="0.001" max="0.05" step="0.001" 
                value={lr} onChange={(e) => setLr(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>
          </div>

          <hr className="border-gray-700" />

          {/* Momentum Params */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-teal-400">Momentum Settings</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Friction (γ)</label>
                <span className="text-xs text-teal-400 font-mono">{momentum.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="0.99