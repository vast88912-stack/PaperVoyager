import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & ML Definitions ---

type Point = { x: number; y: number };
type Particle = {
  pos: Point;
  vel: Point;
  history: Point[];
  active: boolean;
};

type FunctionDef = {
  id: string;
  name: string;
  description: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => Point;
  domain: [number, number]; // [min, max] for both x and y
  defaultLr: number;
};

const FUNCTIONS: Record<string, FunctionDef> = {
  bowl: {
    id: 'bowl',
    name: 'Bowl (Convex)',
    description: 'A simple quadratic function. Gradient descent converges easily to the global minimum at (0,0).',
    f: (x, y) => x * x + y * y,
    grad: (x, y) => ({ x: 2 * x, y: 2 * y }),
    domain: [-5, 5],
    defaultLr: 0.05,
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle (Minimax)',
    description: 'A hyperbolic paraboloid. The point (0,0) is a saddle point: a minimum along x, but a maximum along y.',
    f: (x, y) => x * x - y * y,
    grad: (x, y) => ({ x: 2 * x, y: -2 * y }),
    domain: [-5, 5],
    defaultLr: 0.05,
  },
  rastrigin: {
    id: 'rastrigin',
    name: 'Rastrigin (Non-convex)',
    description: 'A highly non-convex function with many local minima. Standard gradient descent often gets stuck!',
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    grad: (x, y) => ({
      x: 2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      y: 2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    }),
    domain: [-2.5, 2.5],
    defaultLr: 0.002,
  },
};

// --- Helper Functions ---

const interpolateColor = (val: number) => {
  // val is between 0 and 1
  // Charcoal: rgb(15, 23, 42)
  // Teal: rgb(45, 212, 191)
  // Light Teal: rgb(204, 251, 241)
  
  // Quantize for contour lines
  const levels = 12;
  const q = Math.floor(val * levels) / levels;

  let r, g, b;
  if (q < 0.5) {
    const t = q * 2; // 0 to 1
    r = 15 + t * (45 - 15);
    g = 23 + t * (212 - 23);
    b = 42 + t * (191 - 42);
  } else {
    const t = (q - 0.5) * 2; // 0 to 1
    r = 45 + t * (204 - 45);
    g = 212 + t * (251 - 212);
    b = 191 + t * (241 - 191);
  }
  return [r, g, b, 255];
};

// --- Main Component ---

export default function App() {
  const [selectedFnId, setSelectedFnId] = useState<string>('bowl');
  const [learningRate, setLearningRate] = useState<number>(FUNCTIONS['bowl'].defaultLr);
  const [useMomentum, setUseMomentum] = useState<boolean>(false);
  const momentumBeta = 0.9;

  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  
  const particlesRef = useRef<Particle[]>([]);
  const fnDef = FUNCTIONS[selectedFnId];

  // Coordinate transformations
  const mapToCanvas = useCallback((x: number, y: number, width: number, height: number) => {
    const [min, max] = fnDef.domain;
    const cx = ((x - min) / (max - min)) * width;
    const cy = ((max - y) / (max - min)) * height; // Invert Y
    return { cx, cy };
  }, [fnDef]);

  const mapToMath = useCallback((cx: number, cy: number, width: number, height: number) => {
    const [min, max] = fnDef.domain;
    const x = (cx / width) * (max - min) + min;
    const y = max - (cy / height) * (max - min); // Invert Y
    return { x, y };
  }, [fnDef]);

  // Render Background Contour Map
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    
    const zValues = new Float32Array(width * height);
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Compute Z values
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const { x, y } = mapToMath(px, py, width, height);
        const z = fnDef.f(x, y);
        zValues[py * width + px] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    // Map to colors
    for (let i = 0; i < zValues.length; i++) {
      const normalized = (zValues[i] - minZ) / (maxZ - minZ);
      const [r, g, b, a] = interpolateColor(normalized);
      const idx = i * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = a;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [fnDef, mapToMath]);

  // Animation Loop
  const animate = useCallback(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const [min, max] = fnDef.domain;

    ctx.clearRect(0, 0, width, height);

    particlesRef.current.forEach(p => {
      if (!p.active) return;

      // Compute gradient
      const grad = fnDef.grad(p.pos.x, p.pos.y);

      // Update velocity & position
      if (useMomentum) {
        p.vel.x = momentumBeta * p.vel.x - learningRate * grad.x;
        p.vel.y = momentumBeta * p.vel.y - learningRate * grad.y;
      } else {
        p.vel.x = -learningRate * grad.x;
        p.vel.y = -learningRate * grad.y;
      }

      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      // Stop if out of bounds or gradient is tiny
      if (
        p.pos.x < min || p.pos.x > max || 
        p.pos.y < min || p.pos.y > max ||
        (Math.abs(grad.x) < 1e-4 && Math.abs(grad.y) < 1e-4)
      ) {
        p.active = false;
      }

      // Add to history occasionally to save memory, or every frame for smooth lines
      if (p.history.length < 1000) {
        p.history.push({ ...p.pos });
      } else {
        p.active = false; // Kill runaway particles
      }
    });

    // Draw paths
    particlesRef.current.forEach(p => {
      if (p.history.length === 0) return;

      ctx.beginPath();
      const start = mapToCanvas(p.history[0].x, p.history[0].y, width, height);
      ctx.moveTo(start.cx, start.cy);

      for (let i = 1; i < p.history.length; i++) {
        const pt = mapToCanvas(p.history[i].x, p.history[i].y, width, height);
        ctx.lineTo(pt.cx, pt.cy);
      }

      ctx.strokeStyle = '#f472b6'; // Pink-400 for contrast
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw current position
      const current = mapToCanvas(p.pos.x, p.pos.y, width, height);
      ctx.beginPath();
      ctx.arc(current.cx, current.cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#fdf2f8'; // Pink-50
      ctx.fill();
      ctx.strokeStyle = '#db2777'; // Pink-600
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    reqRef.current = requestAnimationFrame(animate);
  }, [fnDef, learningRate, useMomentum, mapToCanvas]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(animate);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [animate]);

  // Handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const { x, y } = mapToMath(cx, cy, canvas.width, canvas.height);
    
    particlesRef.current.push({
      pos: { x, y },
      vel: { x: 0, y: 0 },
      history: [{ x, y }],
      active: true
    });
  };

  const handleClear = () => {
    particlesRef.current = [];
  };

  const handleFnChange = (id: string) => {
    setSelectedFnId(id);
    setLearningRate(FUNCTIONS[id].defaultLr);
    particlesRef.current = [];
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 p-6 flex flex-col gap-8 z-10 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 mb-2 tracking-tight">Function Selector</h1>
          <p className="text-sm text-slate-400">
            Explore how gradient descent behaves on different 2D topologies.
          </p>
        </div>

        {/* Function Selection */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Topology</h2>
          {Object.values(FUNCTIONS).map(fn => (
            <button
              key={fn.id}
              onClick={() => handleFnChange(fn.id)}
              className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                selectedFnId === fn.id 
                  ? 'bg-teal-500/10 border-teal-400 text-teal-300 shadow-[0_0_15px_rgba(45,212,191,0.15)]' 
                  : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              <div className="font-medium">{fn.name}</div>
            </button>
          ))}
        </div>

        {/* Description Box */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300 leading-relaxed">
          {fnDef.description}
        </div>

        {/* Hyperparameters */}
        <div className="flex flex-col gap-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hyperparameters</h2>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <label className="text-slate-300">Learning Rate</label>
              <span className="text-teal-400 font-mono">{learningRate.toFixed(4)}</span>
            </div>
            <input 
              type="range" 
              min={0.0001} 
              max={selectedFnId === 'rastrigin' ? 0.01 : 0.2} 
              step={0.0001}
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-teal-400 bg-slate-700 rounded-lg appearance-none h-1 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300 cursor-pointer select-none" htmlFor="momentum-toggle">
              Use Momentum
            </label>
            <button 
              id="momentum-toggle"
              onClick={() => setUseMomentum(!useMomentum)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                useMomentum ? 'bg-teal-400' : 'bg-slate-600'
              }`}
            >
              <span 
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  useMomentum ? 'translate-x-5' : 'translate-x-1'
                }`} 
              />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button 
            onClick={handleClear}
            className="w-full py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
          >
            Clear Particles
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        
        <div className="absolute top-8 text-center pointer-events-none z-20">
          <p className="text-slate-400 text-sm animate-pulse">
            Click anywhere on the contour map to drop a particle
          </p>
        </div>

        {/* Canvas Container */}
        <div className="relative w-full max-w-[600px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900">
          {/* Background Canvas (Contour Map) */}
          <canvas
            ref={bgCanvasRef}
            width={600}
            height={600}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          {/* Foreground Canvas (Particles & Paths) */}
          <canvas
            ref={fgCanvasRef}
            width={600}
            height={600}
            onClick={handleCanvasClick}
            className="absolute inset-0 w-full h-full cursor-crosshair"
          />
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#0f172a] border border-slate-600"></div>
            <span>Minima (Low)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#ccfbf1] border border-slate-600"></div>
            <span>Maxima (High)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded bg-pink-400"></div>
            <span>Descent Path</span>
          </div>
        </div>

      </div>
    </div>
  );
}