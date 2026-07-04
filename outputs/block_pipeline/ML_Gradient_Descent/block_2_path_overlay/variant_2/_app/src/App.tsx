import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & ML Definitions ---

type Point = [number, number];

interface OptState {
  vx?: number;
  vy?: number;
  mx?: number;
  my?: number;
  t?: number;
}

interface MathFunction {
  id: string;
  name: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => Point;
  range: [number, number]; // [min, max] for both x and y
  defaultLr: { gd: number; momentum: number; adam: number };
}

const FUNCTIONS: Record<string, MathFunction> = {
  bowl: {
    id: 'bowl',
    name: 'Convex Bowl',
    f: (x, y) => Math.pow(x, 2) + Math.pow(y, 2),
    grad: (x, y) => [2 * x, 2 * y],
    range: [-5, 5],
    defaultLr: { gd: 0.1, momentum: 0.05, adam: 0.5 }
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle Point',
    f: (x, y) => Math.pow(x, 2) - Math.pow(y, 2),
    grad: (x, y) => [2 * x, -2 * y],
    range: [-5, 5],
    defaultLr: { gd: 0.05, momentum: 0.05, adam: 0.5 }
  },
  rastrigin: {
    id: 'rastrigin',
    name: 'Rastrigin (Non-convex)',
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    grad: (x, y) => [
      2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y)
    ],
    range: [-2.5, 2.5],
    defaultLr: { gd: 0.001, momentum: 0.001, adam: 0.1 }
  }
};

const OPTIMIZERS = [
  { id: 'gd', name: 'Vanilla GD' },
  { id: 'momentum', name: 'Momentum' },
  { id: 'adam', name: 'Adam' }
];

// --- Helper Functions ---

const lerpColor = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) => {
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
    255
  ];
};

// --- Main Component ---

export default function PathOverlayModule() {
  // UI State
  const [activeFn, setActiveFn] = useState<string>('bowl');
  const [activeOpt, setActiveOpt] = useState<string>('adam');
  const [lr, setLr] = useState<number>(0.5);
  const [momentumParam, setMomentumParam] = useState<number>(0.9);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepCount, setStepCount] = useState<number>(0);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation & Engine State
  const engineRef = useRef({
    x: 2.5,
    y: 2.5,
    path: [] as Point[],
    optState: {} as OptState,
    reqId: 0,
    lastDrawTime: 0
  });

  const fn = FUNCTIONS[activeFn];

  // Initialize offscreen canvas for contour map
  useEffect(() => {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 500;
    bgCanvas.height = 500;
    bgCanvasRef.current = bgCanvas;
  }, []);

  // Map coordinates
  const toMath = useCallback((px: number, py: number, size: number = 500) => {
    const range = fn.range;
    const span = range[1] - range[0];
    const x = range[0] + (px / size) * span;
    const y = range[1] - (py / size) * span; // Invert Y
    return [x, y];
  }, [fn]);

  const toScreen = useCallback((x: number, y: number, size: number = 500) => {
    const range = fn.range;
    const span = range[1] - range[0];
    const px = ((x - range[0]) / span) * size;
    const py = ((range[1] - y) / span) * size; // Invert Y
    return [px, py];
  }, [fn]);

  // Render Contour Background
  const renderContours = useCallback(() => {
    if (!bgCanvasRef.current) return;
    const ctx = bgCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const size = 500;
    const imgData = ctx.createImageData(size, size);
    
    // Pass 1: find min and max Z for normalization
    let minZ = Infinity;
    let maxZ = -Infinity;
    const zValues = new Float32Array(size * size);
    
    for (let py = 0; py < size; py += 2) {
      for (let px = 0; px < size; px += 2) {
        const [x, y] = toMath(px, py, size);
        const z = fn.f(x, y);
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    // Pass 2: fill pixel data
    let idx = 0;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const [x, y] = toMath(px, py, size);
        let z = fn.f(x, y);
        
        // Clamp and normalize
        z = Math.max(minZ, Math.min(maxZ, z));
        const t = Math.pow((z - minZ) / (maxZ - minZ || 1), 0.6); // slight gamma for better visuals

        // Colors: Charcoal (30, 41, 59) to Bright Teal (20, 184, 166)
        const [r, g, b, a] = lerpColor(20, 184, 166, 30, 41, 59, t);

        imgData.data[idx++] = r;
        imgData.data[idx++] = g;
        imgData.data[idx++] = b;
        imgData.data[idx++] = a;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [fn, toMath]);

  // Redraw Background when function changes
  useEffect(() => {
    renderContours();
    resetOptimizer(fn.range[1] * 0.8, fn.range[1] * 0.8);
    // Auto-adjust default LR based on function and optimizer
    setLr(fn.defaultLr[activeOpt as keyof typeof fn.defaultLr]);
  }, [activeFn, renderContours, fn]);

  // Redraw Background when optimizer changes (to update LR default)
  useEffect(() => {
    setLr(fn.defaultLr[activeOpt as keyof typeof fn.defaultLr]);
  }, [activeOpt, fn]);

  // Reset Optimizer State
  const resetOptimizer = (startX: number, startY: number) => {
    engineRef.current.x = startX;
    engineRef.current.y = startY;
    engineRef.current.path = [[startX, startY]];
    engineRef.current.optState = {
      vx: 0, vy: 0, mx: 0, my: 0, t: 0
    };
    setStepCount(0);
    setIsPlaying(false);
    drawFrame();
  };

  // Optimizer Step Logic
  const stepOptimizer = () => {
    const st = engineRef.current;
    let [x, y] = [st.x, st.y];
    const [dx, dy] = fn.grad(x, y);
    const opt = st.optState;

    if (activeOpt === 'gd') {
      x -= lr * dx;
      y -= lr * dy;
    } else if (activeOpt === 'momentum') {
      opt.vx = momentumParam * (opt.vx || 0) + lr * dx;
      opt.vy = momentumParam * (opt.vy || 0) + lr * dy;
      x -= opt.vx;
      y -= opt.vy;
    } else if (activeOpt === 'adam') {
      const beta1 = 0.9;
      const beta2 = 0.999;
      const eps = 1e-8;
      
      opt.t = (opt.t || 0) + 1;
      opt.mx = beta1 * (opt.mx || 0) + (1 - beta1) * dx;
      opt.my = beta1 * (opt.my || 0) + (1 - beta1) * dy;
      
      opt.vx = beta2 * (opt.vx || 0) + (1 - beta2) * (dx * dx);
      opt.vy = beta2 * (opt.vy || 0) + (1 - beta2) * (dy * dy);
      
      const mHatX = opt.mx / (1 - Math.pow(beta1, opt.t));
      const mHatY = opt.my / (1 - Math.pow(beta1, opt.t));
      const vHatX = opt.vx / (1 - Math.pow(beta2, opt.t));
      const vHatY = opt.vy / (1 - Math.pow(beta2, opt.t));
      
      x -= lr * mHatX / (Math.sqrt(vHatX) + eps);
      y -= lr * mHatY / (Math.sqrt(vHatY) + eps);
    }

    st.x = x;
    st.y = y;
    st.path.push([x, y]);
    
    // Cap path length to prevent memory issues
    if (st.path.length > 1000) {
      st.path.shift();
    }
  };

  // Drawing Frame
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Contours
    if (bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0, canvas.width, canvas.height);
    }

    const { path, x, y } = engineRef.current;

    // Draw Path Trail
    if (path.length > 1) {
      ctx.beginPath();
      const [startX, startY] = toScreen(path[0][0], path[0][1], canvas.width);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < path.length; i++) {
        const [px, py] = toScreen(path[i][0], path[i][1], canvas.width);
        ctx.lineTo(px, py);
      }
      
      ctx.strokeStyle = '#2dd4bf'; // Teal 400
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
    }

    // Draw Current Point
    const [px, py] = toScreen(x, y, canvas.width);
    
    // Outer Glow
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(45, 212, 191, 0.3)';
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

  }, [toScreen]);

  // Animation Loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (isPlaying) {
        // Throttle steps slightly for visual tracking
        if (timestamp - engineRef.current.lastDrawTime > 16) {
          stepOptimizer();
          setStepCount(c => c + 1);
          drawFrame();
          engineRef.current.lastDrawTime = timestamp;

          // Stop if out of bounds
          const { x, y } = engineRef.current;
          const [min, max] = fn.range;
          if (x < min * 2 || x > max * 2 || y < min * 2 || y > max * 2 || isNaN(x) || isNaN(y)) {
            setIsPlaying(false);
          }
        }
      }
      engineRef.current.reqId = requestAnimationFrame(loop);
    };

    engineRef.current.reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(engineRef.current.reqId);
  }, [isPlaying, drawFrame, activeOpt, lr, momentumParam, fn]);


  // Interaction Handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    // Map screen to math coords
    const [x, y] = toMath(px, py, rect.width);
    resetOptimizer(x, y);
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#121214] text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-[#18181b] border-r border-teal-900/50 flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-teal-900/30">
          <h1 className="text-xl font-bold text-teal-400 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Path Overlay
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Click anywhere on the contour map to set a starting point and observe the optimizer's path.
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          
          {/* Function Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Landscape Function
            </label>
            <div className="flex flex-col gap-2">
              {Object.values(FUNCTIONS).map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFn(f.id)}
                  className={`px-4 py-3 rounded-lg text-sm text-left transition-all border ${
                    activeFn === f.id 
                      ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' 
                      : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Optimizer Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Optimizer
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OPTIMIZERS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setActiveOpt(opt.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                    activeOpt === opt.id 
                      ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' 
                      : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hyperparameters */}
          <div className="space-y-5 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="space