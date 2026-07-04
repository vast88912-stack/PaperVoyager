import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Definitions ---

type Vector2 = [number, number];

interface ObjectiveFunction {
  id: string;
  name: string;
  domain: [number, number]; // [min, max] for both x and y
  f: (x: number, y: number) => number;
  df: (x: number, y: number) => Vector2;
}

const FUNCTIONS: Record<string, ObjectiveFunction> = {
  bowl: {
    id: 'bowl',
    name: 'Convex Bowl',
    domain: [-5, 5],
    f: (x, y) => (x * x + y * y) / 5,
    df: (x, y) => [(2 * x) / 5, (2 * y) / 5],
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle Point',
    domain: [-5, 5],
    f: (x, y) => (x * x - y * y) / 5,
    df: (x, y) => [(2 * x) / 5, (-2 * y) / 5],
  },
  rastrigin: {
    id: 'rastrigin',
    name: 'Rastrigin (Non-convex)',
    domain: [-5.12, 5.12],
    f: (x, y) => {
      const A = 10;
      return (A * 2 + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y))) / 10;
    },
    df: (x, y) => {
      const A = 10;
      return [
        (2 * x + A * 2 * Math.PI * Math.sin(2 * Math.PI * x)) / 10,
        (2 * y + A * 2 * Math.PI * Math.sin(2 * Math.PI * y)) / 10,
      ];
    },
  },
};

type OptimizerType = 'gd' | 'momentum' | 'adam';

interface OptimizerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  t: number;
}

interface PathData {
  id: number;
  optimizer: OptimizerType;
  color: string;
  points: Vector2[];
  state: OptimizerState;
  active: boolean;
}

const OPTIMIZER_COLORS: Record<OptimizerType, string> = {
  gd: '#f8fafc',       // Slate 50 (White-ish)
  momentum: '#fef08a', // Yellow 200
  adam: '#2dd4bf',     // Teal 400
};

// --- Helper Functions ---

const lerpColor = (c1: number[], c2: number[], t: number) => {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
};

export default function App() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // UI State
  const [selectedFunc, setSelectedFunc] = useState<string>('rastrigin');
  const [selectedOpt, setSelectedOpt] = useState<OptimizerType>('adam');
  const [learningRate, setLearningRate] = useState<number>(0.05);
  const [momentumParam, setMomentumParam] = useState<number>(0.9);
  
  // Simulation State
  const [paths, setPaths] = useState<PathData[]>([]);
  const pathsRef = useRef<PathData[]>([]);

  // Keep ref in sync for animation loop
  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  const func = FUNCTIONS[selectedFunc];

  // --- Coordinate Transformations ---
  const CANVAS_SIZE = 600;
  
  const toCanvas = useCallback((x: number, y: number) => {
    const [min, max] = func.domain;
    const range = max - min;
    const cx = ((x - min) / range) * CANVAS_SIZE;
    const cy = CANVAS_SIZE - ((y - min) / range) * CANVAS_SIZE; // Invert Y
    return [cx, cy];
  }, [func]);

  const toMath = useCallback((cx: number, cy: number) => {
    const [min, max] = func.domain;
    const range = max - min;
    const x = (cx / CANVAS_SIZE) * range + min;
    const y = ((CANVAS_SIZE - cy) / CANVAS_SIZE) * range + min;
    return [x, y];
  }, [func]);

  // --- Background Rendering (Heatmap) ---
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const blockSize = 4; // Render resolution
    const cols = Math.ceil(CANVAS_SIZE / blockSize);
    const rows = Math.ceil(CANVAS_SIZE / blockSize);

    let minZ = Infinity;
    let maxZ = -Infinity;
    const zValues = new Float32Array(cols * rows);

    // Calculate Z values and find bounds
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * blockSize;
        const cy = r * blockSize;
        const [x, y] = toMath(cx, cy);
        const z = func.f(x, y);
        zValues[r * cols + c] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    // Charcoal to Teal gradient
    const colorLow = [15, 23, 42];   // slate-900
    const colorHigh = [17, 94, 89];  // teal-800
    const colorPeak = [45, 212, 191]; // teal-400

    // Draw blocks
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const z = zValues[r * cols + c];
        // Normalize z
        const norm = maxZ > minZ ? Math.max(0, Math.min(1, (z - minZ) / (maxZ - minZ))) : 0;
        
        let rgb;
        if (norm < 0.5) {
          rgb = lerpColor(colorLow, colorHigh, norm * 2);
        } else {
          rgb = lerpColor(colorHigh, colorPeak, (norm - 0.5) * 2);
        }

        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
      }
    }

    // Draw Contours (approximate via thresholding)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const z = zValues[r * cols + c];
        const norm = maxZ > minZ ? (z - minZ) / (maxZ - minZ) : 0;
        // Simple contour lines
        if ((norm * 20) % 1 < 0.1) {
          ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
        }
      }
    }
  }, [func, toMath]);

  // --- Optimization Step Logic ---
  const stepOptimizer = useCallback((path: PathData): PathData => {
    if (!path.active) return path;

    const { optimizer, state } = path;
    let { x, y, vx, vy, mx, my, t } = state;
    
    const [gx, gy] = func.df(x, y);
    
    // Stop if gradient is tiny or out of bounds
    const gradMag = Math.sqrt(gx * gx + gy * gy);
    if (gradMag < 1e-4 || isNaN(x) || isNaN(y) || Math.abs(x) > 10 || Math.abs(y) > 10) {
      return { ...path, active: false };
    }

    t += 1;
    let nextX = x;
    let nextY = y;

    if (optimizer === 'gd') {
      nextX = x - learningRate * gx;
      nextY = y - learningRate * gy;
    } 
    else if (optimizer === 'momentum') {
      vx = momentumParam * vx + learningRate * gx;
      vy = momentumParam * vy + learningRate * gy;
      nextX = x - vx;
      nextY = y - vy;
    } 
    else if (optimizer === 'adam') {
      const beta1 = 0.9;
      const beta2 = 0.999;
      const epsilon = 1e-8;

      mx = beta1 * mx + (1 - beta1) * gx;
      my = beta1 * my + (1 - beta1) * gy;
      vx = beta2 * vx + (1 - beta2) * (gx * gx);
      vy = beta2 * vy + (1 - beta2) * (gy * gy);

      const mHatX = mx / (1 - Math.pow(beta1, t));
      const mHatY = my / (1 - Math.pow(beta1, t));
      const vHatX = vx / (1 - Math.pow(beta2, t));
      const vHatY = vy / (1 - Math.pow(beta2, t));

      nextX = x - (learningRate * mHatX) / (Math.sqrt(vHatX) + epsilon);
      nextY = y - (learningRate * mHatY) / (Math.sqrt(vHatY) + epsilon);
    }

    return {
      ...path,
      points: [...path.points, [nextX, nextY]],
      state: { x: nextX, y: nextY, vx, vy, mx, my, t },
      active: path.points.length < 500 // Max steps
    };
  }, [func, learningRate, momentumParam]);

  // --- Animation Loop ---
  const animate = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update paths
    let anyActive = false;
    const nextPaths = pathsRef.current.map(p => {
      if (p.active) {
        anyActive = true;
        // Do multiple steps per frame for faster visualization
        let updated = p;
        for(let i=0; i<3; i++) {
            if(updated.active) updated = stepOptimizer(updated);
        }
        return updated;
      }
      return p;
    });

    if (anyActive) {
      setPaths(nextPaths);
    }

    // Draw paths
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    nextPaths.forEach(path => {
      if (path.points.length === 0) return;

      ctx.beginPath();
      const [startX, startY] = toCanvas(path.points[0][0], path.points[0][1]);
      ctx.moveTo(startX, startY);

      for (let i = 1; i < path.points.length; i++) {
        const [cx, cy] = toCanvas(path.points[i][0], path.points[i][1]);
        ctx.lineTo(cx, cy);
      }

      ctx.strokeStyle = path.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Glow effect
      ctx.shadowBlur = 12;
      ctx.shadowColor = path.color;
      ctx.stroke();

      // Draw current position indicator
      const lastPt = path.points[path.points.length - 1];
      const [lx, ly] = toCanvas(lastPt[0], lastPt[1]);
      ctx.beginPath();
      ctx.arc(lx, ly, path.active ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [stepOptimizer, toCanvas]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // --- Interaction ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const [x, y] = toMath(cx, cy);

    const newPath: PathData = {
      id: Date.now(),
      optimizer: selectedOpt,
      color: OPTIMIZER_COLORS[selectedOpt],
      points: [[x, y]],
      state: { x, y, vx: 0, vy: 0, mx: 0, my: 0, t: 0 },
      active: true,
    };

    setPaths(prev => [...prev, newPath]);
  };

  const clearPaths = () => setPaths([]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-gray-800 border-b md:border-b-0 md:border-r border-gray-700 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto z-10 shadow-2xl">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 mb-1 tracking-tight">Path Overlay</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Click the landscape to drop a starting point. Compare how different optimizers navigate the terrain.
          </p>
        </div>

        {/* Function Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Landscape Function</label>
          <div className="grid gap-2">
            {Object.values(FUNCTIONS).map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedFunc(f.id); clearPaths(); }}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left border ${
                  selectedFunc === f.id 
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 shadow-[0_0_15px_rgba(45,212,191,0.15)]' 
                    : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Optimizer Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Optimizer</label>
          <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700">
            {(['gd', 'momentum', 'adam'] as OptimizerType[]).map(opt => (
              <button
                key={opt}
                onClick={() => setSelectedOpt(opt)}
                className={`flex-1 py-2 text-xs font-bold rounded-md capitalize transition-all ${
                  selectedOpt === opt 
                    ? 'bg-gray-700 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OPTIMIZER_COLORS[opt] }} />
                  {opt === 'gd' ? 'Vanilla' : opt}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Learning Rate (α)</label>
              <span className="text-teal-400 font-mono text-xs bg-teal-400/10 px-2 py-1 rounded">{learningRate.toFixed(3)}</span>
            </div>
            <input 
              type="range" 
              min="0.001" max="0.2" step="0.001" 
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>

          <div className={`space-y-2 transition-opacity duration-300 ${selectedOpt === 'gd' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Momentum (β)</label>
              <span className="text-teal-400 font-mono text-xs bg-teal-400/10 px-2 py-1 rounded">{momentumParam.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0" max="0.99" step="0.01" 
              value={momentumParam}
              onChange={(e) => setMomentumParam(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-700">
          <button 
            onClick={clearPaths}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none