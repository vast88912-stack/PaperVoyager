import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Helpers ---

type Point = { x: number; y: number };

type ObjectiveFunction = {
  id: string;
  name: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => Point;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  defaultStart: Point;
  zRange: [number, number]; // approx min and max for color mapping
};

const FUNCTIONS: ObjectiveFunction[] = [
  {
    id: 'valley',
    name: 'Steep Valley',
    // Stretched quadratic: Adam adapts well, Momentum oscillates
    f: (x, y) => x * x + 20 * y * y,
    grad: (x, y) => ({ x: 2 * x, y: 40 * y }),
    bounds: { minX: -2, maxX: 2, minY: -2, maxY: 2 },
    defaultStart: { x: -1.8, y: 1.5 },
    zRange: [0, 80],
  },
  {
    id: 'rastrigin',
    name: 'Rastrigin (Noisy)',
    // Multiple local minima
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    grad: (x, y) => ({
      x: 2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      y: 2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    }),
    bounds: { minX: -2.5, maxX: 2.5, minY: -2.5, maxY: 2.5 },
    defaultStart: { x: -2.2, y: -2.1 },
    zRange: [0, 50],
  },
  {
    id: 'bowl',
    name: 'Standard Bowl',
    f: (x, y) => x * x + y * y,
    grad: (x, y) => ({ x: 2 * x, y: 2 * y }),
    bounds: { minX: -2, maxX: 2, minY: -2, maxY: 2 },
    defaultStart: { x: -1.8, y: -1.8 },
    zRange: [0, 8],
  },
];

// Optimizer States
type MomentumState = {
  pos: Point;
  path: Point[];
  v: Point;
  done: boolean;
};

type AdamState = {
  pos: Point;
  path: Point[];
  m: Point;
  v: Point;
  t: number;
  done: boolean;
};

export default function MomentumVsAdam() {
  const [selectedFuncId, setSelectedFuncId] = useState<string>('valley');
  const [learningRate, setLearningRate] = useState<number>(0.02);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [steps, setSteps] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  const activeFunc = FUNCTIONS.find((f) => f.id === selectedFuncId) || FUNCTIONS[0];

  // Mutable refs for high-performance animation loop
  const momentumRef = useRef<MomentumState>({
    pos: { ...activeFunc.defaultStart },
    path: [{ ...activeFunc.defaultStart }],
    v: { x: 0, y: 0 },
    done: false,
  });

  const adamRef = useRef<AdamState>({
    pos: { ...activeFunc.defaultStart },
    path: [{ ...activeFunc.defaultStart }],
    m: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    t: 0,
    done: false,
  });

  // Hyperparameters
  const MOMENTUM_GAMMA = 0.9;
  const ADAM_BETA1 = 0.9;
  const ADAM_BETA2 = 0.999;
  const ADAM_EPSILON = 1e-8;

  // --- Rendering Helpers ---

  const mapToCanvas = (pt: Point, width: number, height: number) => {
    const { bounds } = activeFunc;
    return {
      x: ((pt.x - bounds.minX) / (bounds.maxX - bounds.minX)) * width,
      y: height - ((pt.y - bounds.minY) / (bounds.maxY - bounds.minY)) * height,
    };
  };

  const mapFromCanvas = (cx: number, cy: number, width: number, height: number) => {
    const { bounds } = activeFunc;
    return {
      x: bounds.minX + (cx / width) * (bounds.maxX - bounds.minX),
      y: bounds.minY + ((height - cy) / height) * (bounds.maxY - bounds.minY),
    };
  };

  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { bounds, f, zRange } = activeFunc;

    // Grid size for performance
    const res = 4;
    for (let x = 0; x < width; x += res) {
      for (let y = 0; y < height; y += res) {
        const pt = mapFromCanvas(x, y, width, height);
        const z = f(pt.x, pt.y);
        
        // Normalize Z for coloring (Dark charcoal to lighter teal-tinted gray)
        const normZ = Math.max(0, Math.min(1, (z - zRange[0]) / (zRange[1] - zRange[0])));
        
        // Custom palette: Charcoal base (#111827) blending into slightly lighter shades
        const r = 17 + normZ * 30;
        const g = 24 + normZ * 40;
        const b = 39 + normZ * 50;
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, res, res);
      }
    }

    // Draw Minima target (0,0 is min for all our functions)
    const target = mapToCanvas({ x: 0, y: 0 }, width, height);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15'; // yellow-400
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#facc15';
    ctx.stroke();
    ctx.shadowBlur = 0;

  }, [activeFunc]);

  const drawPaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const renderLine = (path: Point[], color: string, glow: string) => {
      if (path.length < 2) return;
      ctx.beginPath();
      const start = mapToCanvas(path[0], width, height);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < path.length; i++) {
        const pt = mapToCanvas(path[i], width, height);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = glow;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw current head
      const head = mapToCanvas(path[path.length - 1], width, height);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = glow;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Momentum: Rose/Pink
    renderLine(momentumRef.current.path, '#f43f5e', 'rgba(244, 63, 94, 0.6)');
    // Adam: Teal
    renderLine(adamRef.current.path, '#14b8a6', 'rgba(20, 184, 166, 0.6)');

  }, [activeFunc]);


  // --- Optimization Logic ---

  const stepOptimizers = useCallback(() => {
    let advanced = false;

    // --- Step Momentum ---
    const mState = momentumRef.current;
    if (!mState.done) {
      const g = activeFunc.grad(mState.pos.x, mState.pos.y);
      // v = gamma * v + lr * grad
      mState.v.x = MOMENTUM_GAMMA * mState.v.x + learningRate * g.x;
      mState.v.y = MOMENTUM_GAMMA * mState.v.y + learningRate * g.y;
      
      // x = x - v
      mState.pos.x -= mState.v.x;
      mState.pos.y -= mState.v.y;
      
      mState.path.push({ ...mState.pos });
      
      if (Math.sqrt(g.x * g.x + g.y * g.y) < 1e-3 || mState.path.length > 2000) {
        mState.done = true;
      }
      advanced = true;
    }

    // --- Step Adam ---
    const aState = adamRef.current;
    if (!aState.done) {
      const g = activeFunc.grad(aState.pos.x, aState.pos.y);
      aState.t += 1;
      
      // m = beta1 * m + (1 - beta1) * g
      aState.m.x = ADAM_BETA1 * aState.m.x + (1 - ADAM_BETA1) * g.x;
      aState.m.y = ADAM_BETA1 * aState.m.y + (1 - ADAM_BETA1) * g.y;
      
      // v = beta2 * v + (1 - beta2) * g^2
      aState.v.x = ADAM_BETA2 * aState.v.x + (1 - ADAM_BETA2) * (g.x * g.x);
      aState.v.y = ADAM_BETA2 * aState.v.y + (1 - ADAM_BETA2) * (g.y * g.y);
      
      // bias correction
      const mHatX = aState.m.x / (1 - Math.pow(ADAM_BETA1, aState.t));
      const mHatY = aState.m.y / (1 - Math.pow(ADAM_BETA1, aState.t));
      
      const vHatX = aState.v.x / (1 - Math.pow(ADAM_BETA2, aState.t));
      const vHatY = aState.v.y / (1 - Math.pow(ADAM_BETA2, aState.t));
      
      // x = x - lr * mHat / (sqrt(vHat) + eps)
      // *Note: Adam often needs a larger base LR than standard SGD/Momentum. 
      // We scale it slightly here to make the comparison visually fair at the same slider value.
      const adamLr = learningRate * 2.0; 
      aState.pos.x -= (adamLr * mHatX) / (Math.sqrt(vHatX) + ADAM_EPSILON);
      aState.pos.y -= (adamLr * mHatY) / (Math.sqrt(vHatY) + ADAM_EPSILON);
      
      aState.path.push({ ...aState.pos });

      if (Math.sqrt(g.x * g.x + g.y * g.y) < 1e-3 || aState.path.length > 2000) {
        aState.done = true;
      }
      advanced = true;
    }

    if (advanced) {
      setSteps((s) => s + 1);
    } else {
      setIsPlaying(false);
    }
  }, [activeFunc, learningRate]);


  const animate = useCallback(() => {
    if (isPlaying) {
      // Step multiple times per frame to speed up visual
      for(let i=0; i<3; i++) stepOptimizers();
      drawPaths();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, stepOptimizers, drawPaths]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);


  const resetPaths = useCallback((startPos = activeFunc.defaultStart) => {
    setIsPlaying(false);
    setSteps(0);
    momentumRef.current = {
      pos: { ...startPos },
      path: [{ ...startPos }],
      v: { x: 0, y: 0 },
      done: false,
    };
    adamRef.current = {
      pos: { ...startPos },
      path: [{ ...startPos }],
      m: { x: 0, y: 0 },
      v: { x: 0, y: 0 },
      t: 0,
      done: false,
    };
    drawPaths();
  }, [activeFunc, drawPaths]);

  useEffect(() => {
    drawBackground();
    resetPaths();
  }, [selectedFuncId, drawBackground, resetPaths]);

  // Click on canvas to set custom start point
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const newStart = mapFromCanvas(cx, cy, rect.width, rect.height);
    resetPaths(newStart);
  };


  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <aside className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-teal-200">
            Optimizer Race
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Watch Momentum and Adam navigate complex terrain. Click the map to drop a new starting point!
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          
          {/* Function Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Terrain (Objective Function)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {FUNCTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFuncId(f.id)}
                  className={`px-4 py-2 text-sm text-left rounded-md transition-all border ${
                    selectedFuncId === f.id
                      ? 'bg-teal-500/10 border-teal-500 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                      : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hyperparameters */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Base Learning Rate
              </label>
              <span className="text-teal-300 font-mono text-sm">{learningRate.toFixed(4)}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.1"
              step="0.001"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          {/* Live Stats */}
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Race Stats
            </label>
            
            {/* Adam Stats */}
            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"></div>
                <span className="font-semibold text-teal-400">Adam</span>
                {adamRef.current.done && <span className="ml-auto text-xs text-teal-300">Converged</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                <div>X: {adamRef.current.pos.x.toFixed(3)}</div>
                <div>Y: {adamRef.current.pos.y.toFixed(3)}</div>
                <div className="col-span-2">
                  f(x,y): {activeFunc.f(adamRef.current.pos.x, adamRef.current.pos.y).toFixed(5)}
                </div>
              </div>
            </div>

            {/* Momentum Stats */}
            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                <span className="font-semibold text-rose-400">Momentum</span>
                {momentumRef.current.done && <span className="ml-auto text-xs text-rose-300">Converged</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                <div>X: {momentumRef.current.pos.x.toFixed(3)}</div>
                <div>Y: {momentumRef.current.pos.y.toFixed(3)}</div>
                <div className="col-span-2">
                  f(x,y): {activeFunc.f(momentumRef.current.pos.x, momentumRef.current.pos.y).toFixed(5)}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 font-mono text-right">
              Steps: {steps}
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray