import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimizers ---
type Point = { x: number; y: number };
type Domain = { min: number; max: number };

const DOMAIN: Domain = { min: -5, max: 5 };

const FUNCTIONS = {
  bowl: {
    name: 'Convex Bowl',
    f: (x: number, y: number) => (x * x + y * y) / 5,
    df: (x: number, y: number) => [2 * x / 5, 2 * y / 5],
  },
  saddle: {
    name: 'Saddle Point',
    f: (x: number, y: number) => (x * x - y * y) / 5,
    df: (x: number, y: number) => [2 * x / 5, -2 * y / 5],
  },
  rastrigin: {
    name: 'Rastrigin (Non-convex)',
    f: (x: number, y: number) =>
      (20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y)) / 20,
    df: (x: number, y: number) => [
      (2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x)) / 20,
      (2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y)) / 20,
    ],
  },
};

type FuncKey = keyof typeof FUNCTIONS;

// --- Colors ---
const COLORS = {
  momentum: '#ec4899', // Pink
  adam: '#14b8a6', // Teal
  background: '#111827', // Charcoal (gray-900)
  grid: '#1f2937', // gray-800
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>();

  const [activeFunc, setActiveFunc] = useState<FuncKey>('bowl');
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [beta1, setBeta1] = useState<number>(0.9);
  const [beta2, setBeta2] = useState<number>(0.999);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Simulation State
  const simState = useRef({
    momentum: { x: -4, y: 0, vx: 0, vy: 0 },
    adam: { x: -4, y: 0, mx: 0, my: 0, vx: 0, vy: 0, t: 0 },
    paths: {
      momentum: [] as Point[],
      adam: [] as Point[],
    },
    startPos: { x: -4, y: 0 },
  });

  const [stats, setStats] = useState({
    momentum: { x: -4, y: 0, loss: 0 },
    adam: { x: -4, y: 0, loss: 0 },
    epochs: 0,
  });

  // Coordinate Mapping
  const mapToCanvas = (val: number, size: number) =>
    ((val - DOMAIN.min) / (DOMAIN.max - DOMAIN.min)) * size;
  const mapFromCanvas = (val: number, size: number) =>
    (val / size) * (DOMAIN.max - DOMAIN.min) + DOMAIN.min;

  // Draw Heatmap Background
  const generateBackground = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const ctx = bgCanvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);

    const func = FUNCTIONS[activeFunc].f;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = mapFromCanvas(px, width);
        // Invert Y for standard Cartesian coordinates
        const y = mapFromCanvas(height - py, height);

        const val = func(x, y);
        
        // Map value to a teal-to-dark color scale
        const normalized = Math.max(0, Math.min(1, val / 3));
        const r = 17 + normalized * 30; // 17 (gray-900)
        const g = 24 + normalized * 160; // 24 -> 184 (teal)
        const b = 39 + normalized * 127; // 39 -> 166 (teal)

        const idx = (py * width + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    
    // Draw contour lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height/10)*i);
        ctx.lineTo(width, (height/10)*i);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((width/10)*i, 0);
        ctx.lineTo((width/10)*i, height);
        ctx.stroke();
    }

    bgCanvasRef.current = bgCanvas;
  }, [activeFunc]);

  useEffect(() => {
    generateBackground();
    resetSimulation();
  }, [activeFunc, generateBackground]);

  const resetSimulation = (newStartX?: number, newStartY?: number) => {
    const startX = newStartX !== undefined ? newStartX : simState.current.startPos.x;
    const startY = newStartY !== undefined ? newStartY : simState.current.startPos.y;
    
    simState.current = {
      momentum: { x: startX, y: startY, vx: 0, vy: 0 },
      adam: { x: startX, y: startY, mx: 0, my: 0, vx: 0, vy: 0, t: 0 },
      paths: {
        momentum: [{ x: startX, y: startY }],
        adam: [{ x: startX, y: startY }],
      },
      startPos: { x: startX, y: startY },
    };
    setStats({
      momentum: { x: startX, y: startY, loss: FUNCTIONS[activeFunc].f(startX, startY) },
      adam: { x: startX, y: startY, loss: FUNCTIONS[activeFunc].f(startX, startY) },
      epochs: 0,
    });
    draw();
  };

  const draw = () => {
    if (!canvasRef.current || !bgCanvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    // Draw background
    ctx.drawImage(bgCanvasRef.current, 0, 0);

    const drawPath = (path: Point[], color: string) => {
      if (path.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Shadow for glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      path.forEach((p, i) => {
        const cx = mapToCanvas(p.x, width);
        const cy = height - mapToCanvas(p.y, height);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw current position indicator
      const lastPos = path[path.length - 1];
      const cx = mapToCanvas(lastPos.x, width);
      const cy = height - mapToCanvas(lastPos.y, height);
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawPath(simState.current.paths.momentum, COLORS.momentum);
    drawPath(simState.current.paths.adam, COLORS.adam);
  };

  const stepSimulation = useCallback(() => {
    const s = simState.current;
    const { df } = FUNCTIONS[activeFunc];
    
    // Momentum Step
    const [gxM, gyM] = df(s.momentum.x, s.momentum.y);
    s.momentum.vx = beta1 * s.momentum.vx + gxM;
    s.momentum.vy = beta1 * s.momentum.vy + gyM;
    s.momentum.x -= learningRate * s.momentum.vx;
    s.momentum.y -= learningRate * s.momentum.vy;
    s.paths.momentum.push({ x: s.momentum.x, y: s.momentum.y });

    // Adam Step
    s.adam.t += 1;
    const [gxA, gyA] = df(s.adam.x, s.adam.y);
    const eps = 1e-8;
    
    s.adam.mx = beta1 * s.adam.mx + (1 - beta1) * gxA;
    s.adam.my = beta1 * s.adam.my + (1 - beta1) * gyA;
    s.adam.vx = beta2 * s.adam.vx + (1 - beta2) * (gxA * gxA);
    s.adam.vy = beta2 * s.adam.vy + (1 - beta2) * (gyA * gyA);

    const mHatX = s.adam.mx / (1 - Math.pow(beta1, s.adam.t));
    const mHatY = s.adam.my / (1 - Math.pow(beta1, s.adam.t));
    const vHatX = s.adam.vx / (1 - Math.pow(beta2, s.adam.t));
    const vHatY = s.adam.vy / (1 - Math.pow(beta2, s.adam.t));

    s.adam.x -= learningRate * mHatX / (Math.sqrt(vHatX) + eps);
    s.adam.y -= learningRate * mHatY / (Math.sqrt(vHatY) + eps);
    s.paths.adam.push({ x: s.adam.x, y: s.adam.y });

    // Limit path lengths
    if (s.paths.momentum.length > 500) s.paths.momentum.shift();
    if (s.paths.adam.length > 500) s.paths.adam.shift();

    setStats(prev => ({
      momentum: { x: s.momentum.x, y: s.momentum.y, loss: FUNCTIONS[activeFunc].f(s.momentum.x, s.momentum.y) },
      adam: { x: s.adam.x, y: s.adam.y, loss: FUNCTIONS[activeFunc].f(s.adam.x, s.adam.y) },
      epochs: prev.epochs + 1,
    }));

    draw();

    if (isRunning) {
      requestRef.current = requestAnimationFrame(stepSimulation);
    }
  }, [activeFunc, learningRate, beta1, beta2, isRunning]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(stepSimulation);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, stepSimulation]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    const x = mapFromCanvas(px, rect.width);
    const y = mapFromCanvas(rect.height - py, rect.height);
    
    resetSimulation(x, y);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row font-sans selection:bg-teal-500 selection:text-white">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 p-6 bg-gray-800 border-r border-gray-700 flex flex-col gap-6 shadow-xl z-10">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 tracking-tight">Gradient Descent</h1>
          <p className="text-sm text-gray-400 mt-1">Playground</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-300">Loss Function</label>
          <select 
            className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md p-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            value={activeFunc}
            onChange={(e) => setActiveFunc(e.target.value as FuncKey)}
          >
            {Object.entries(FUNCTIONS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-gray-300">Learning Rate (α)</label>
              <span className="text-xs text-teal-400 font-mono">{learningRate.toFixed(3)}</span>
            </div>
            <input 
              type="range" min="0.001" max="0.5" step="0.001" 
              value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-gray-300">Momentum (β₁)</label>
              <span className="text-xs text-teal-400 font-mono">{beta1.toFixed(3)}</span>
            </div>
            <input 
              type="range" min="0" max="0.99" step="0.01" 
              value={beta1} onChange={(e) => setBeta1(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-gray-300">Adam (β₂)</label>
              <span className="text-xs text-teal-400 font-mono">{beta2.toFixed(3)}</span>
            </div>
            <input 
              type="range" min="0" max="0.999" step="0.001" 
              value={beta2} onChange={(e) => setBeta2(parseFloat(e.target.value))}
              className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-2 rounded-md font-semibold transition-all ${
              isRunning 
                ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
                : 'bg-teal-600 text-white hover:bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button 
            onClick={() => { setIsRunning(false); resetSimulation(); }}
            className="flex-1 py-2 rounded-md font-semibold bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600 transition-all"
          >
            Reset
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-700">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Live Stats (Epoch: {stats.epochs})</h3>
          
          <div className="space-y-3">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]"></div>
                <span className="text-sm font-semibold text-gray-200">Momentum</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                <div>X: {stats.momentum.x.toFixed(2)}</div>
                <div>Y: {stats.momentum.y.toFixed(2)}</div>
                <div className="col-span-2 text-pink-400">Loss: {stats.momentum.loss.toFixed(4)}</div>
              </div>
            </div>

            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"></div>
                <span className="text-sm font-semibold text-gray-200">Adam</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                <div>X: {stats.adam.x.toFixed(2)}</div>
                <div>Y: {stats.adam.y.toFixed(2)}</div>
                <div className="col-span-2 text-teal-400">Loss: {stats.adam.loss.toFixed(4)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="flex-1 flex flex-col relative overflow-