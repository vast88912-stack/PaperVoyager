import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Shared Types & Helpers ---

type Point = { x: number; y: number };

const interpolateColor = (val: number) => {
  const levels = 12;
  const q = Math.floor(val * levels) / levels;
  let r, g, b;
  if (q < 0.5) {
    const t = q * 2;
    r = 15 + t * (45 - 15);
    g = 23 + t * (212 - 23);
    b = 42 + t * (191 - 42);
  } else {
    const t = (q - 0.5) * 2;
    r = 45 + t * (204 - 45);
    g = 212 + t * (251 - 212);
    b = 191 + t * (241 - 191);
  }
  return [r, g, b, 255];
};

// --- Module 1: Hero Intro ---

function HeroIntro({ onEnter, onBlindfold }: { onEnter: () => void, onBlindfold: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.parentElement?.clientHeight || window.innerHeight;

    const resize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    let x = width * 0.8;
    let y = height * 0.2;
    let vx = 0;
    let vy = 0;
    const trail: Point[] = [];
    const maxTrail = 150;
    const lr = 0.02;
    const momentum = 0.92;

    const animate = () => {
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(45, 212, 191, 0.05)';
      ctx.lineWidth = 1;
      for (let r = 50; r < Math.max(width, height); r += 60) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const dx = (x - centerX) * 0.01;
      const dy = (y - centerY) * 0.01;

      vx = vx * momentum - lr * dx * 100;
      vy = vy * momentum - lr * dy * 100;
      x += vx;
      y += vy;

      trail.push({ x, y });
      if (trail.length > maxTrail) trail.shift();

      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        const gradient = ctx.createLinearGradient(
          trail[0].x, trail[0].y, 
          trail[trail.length - 1].x, trail[trail.length - 1].y
        );
        gradient.addColorStop(0, 'rgba(45, 212, 191, 0)');
        gradient.addColorStop(1, 'rgba(45, 212, 191, 0.8)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#2dd4bf';
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#2dd4bf';
      ctx.fill();
      ctx.shadowBlur = 0;

      if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1 && Math.abs(x - centerX) < 5 && Math.abs(y - centerY) < 5) {
        setTimeout(() => {
          x = Math.random() * width;
          y = Math.random() * height * 0.3;
          vx = 0;
          vy = 0;
          trail.length = 0;
        }, 1000);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 block" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-0" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-16 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Interactive ML Visualization
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-slate-100">
            Master the Math of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
              Machine Learning
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
            Step into the Gradient Descent Playground. Demystify the engines of neural networks by visualizing Vanilla GD, Momentum, and Adam optimizers on interactive 2D landscapes. No papers, just pure intuition.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={onEnter} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-slate-950 bg-teal-400 rounded-lg overflow-hidden transition-all hover:bg-teal-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900">
              <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
              <span className="relative flex items-center gap-2">
                Enter Playground
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </span>
            </button>
            
            <button onClick={onBlindfold} className="inline-flex items-center justify-center px-8 py-4 font-bold text-teal-400 border-2 border-teal-400/30 rounded-lg transition-all hover:bg-teal-400/10 hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900">
              Take the Blindfold Challenge
            </button>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-slate-800 pt-8">
            <div>
              <div className="text-teal-400 font-bold text-xl mb-1">3</div>
              <div className="text-slate-500 text-sm">Distinct 2D Functions (Bowl, Saddle, Rastrigin)</div>
            </div>
            <div>
              <div className="text-teal-400 font-bold text-xl mb-1">Real-time</div>
              <div className="text-slate-500 text-sm">Mathematical path rendering & animation</div>
            </div>
            <div>
              <div className="text-teal-400 font-bold text-xl mb-1">Compare</div>
              <div className="text-slate-500 text-sm">Side-by-side optimizer performance</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 2: Function Selector ---

type Particle = { pos: Point; vel: Point; history: Point[]; active: boolean; };
type FunctionDef = { id: string; name: string; description: string; f: (x: number, y: number) => number; grad: (x: number, y: number) => Point; domain: [number, number]; defaultLr: number; };

const SELECTOR_FUNCTIONS: Record<string, FunctionDef> = {
  bowl: {
    id: 'bowl', name: 'Bowl (Convex)',
    description: 'A simple quadratic function. Gradient descent converges easily to the global minimum at (0,0).',
    f: (x, y) => x * x + y * y,
    grad: (x, y) => ({ x: 2 * x, y: 2 * y }),
    domain: [-5, 5], defaultLr: 0.05,
  },
  saddle: {
    id: 'saddle', name: 'Saddle (Minimax)',
    description: 'A hyperbolic paraboloid. The point (0,0) is a saddle point: a minimum along x, but a maximum along y.',
    f: (x, y) => x * x - y * y,
    grad: (x, y) => ({ x: 2 * x, y: -2 * y }),
    domain: [-5, 5], defaultLr: 0.05,
  },
  rastrigin: {
    id: 'rastrigin', name: 'Rastrigin (Non-convex)',
    description: 'A highly non-convex function with many local minima. Standard gradient descent often gets stuck!',
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    grad: (x, y) => ({
      x: 2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      y: 2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    }),
    domain: [-2.5, 2.5], defaultLr: 0.002,
  },
};

function FunctionSelector() {
  const [selectedFnId, setSelectedFnId] = useState<string>('bowl');
  const [learningRate, setLearningRate] = useState<number>(SELECTOR_FUNCTIONS['bowl'].defaultLr);
  const [useMomentum, setUseMomentum] = useState<boolean>(false);
  const momentumBeta = 0.9;

  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const fnDef = SELECTOR_FUNCTIONS[selectedFnId];

  const mapToCanvas = useCallback((x: number, y: number, width: number, height: number) => {
    const [min, max] = fnDef.domain;
    const cx = ((x - min) / (max - min)) * width;
    const cy = ((max - y) / (max - min)) * height;
    return { cx, cy };
  }, [fnDef]);

  const mapToMath = useCallback((cx: number, cy: number, width: number, height: number) => {
    const [min, max] = fnDef.domain;
    const x = (cx / width) * (max - min) + min;
    const y = max - (cy / height) * (max - min);
    return { x, y };
  }, [fnDef]);

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

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const { x, y } = mapToMath(px, py, width, height);
        const z = fnDef.f(x, y);
        zValues[py * width + px] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

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
      const grad = fnDef.grad(p.pos.x, p.pos.y);
      if (useMomentum) {
        p.vel.x = momentumBeta * p.vel.x - learningRate * grad.x;
        p.vel.y = momentumBeta * p.vel.y - learningRate * grad.y;
      } else {
        p.vel.x = -learningRate * grad.x;
        p.vel.y = -learningRate * grad.y;
      }
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      if (p.pos.x < min || p.pos.x > max || p.pos.y < min || p.pos.y > max || (Math.abs(grad.x) < 1e-4 && Math.abs(grad.y) < 1e-4)) {
        p.active = false;
      }
      if (p.history.length < 1000) {
        p.history.push({ ...p.pos });
      } else {
        p.active = false;
      }
    });

    particlesRef.current.forEach(p => {
      if (p.history.length === 0) return;
      ctx.beginPath();
      const start = mapToCanvas(p.history[0].x, p.history[0].y, width, height);
      ctx.moveTo(start.cx, start.cy);
      for (let i = 1; i < p.history.length; i++) {
        const pt = mapToCanvas(p.history[i].x, p.history[i].y, width, height);
        ctx.lineTo(pt.cx, pt.cy);
      }
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      const current = mapToCanvas(p.pos.x, p.pos.y, width, height);
      ctx.beginPath();
      ctx.arc(current.cx, current.cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#fdf2f8';
      ctx.fill();
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    reqRef.current = requestAnimationFrame(animate);
  }, [fnDef, learningRate, useMomentum, mapToCanvas]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(animate);
    return () => { if (reqRef.current) cancelAnimationFrame(reqRef.current); };
  }, [animate]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const { x, y } = mapToMath(cx, cy, canvas.width, canvas.height);
    particlesRef.current.push({ pos: { x, y }, vel: { x: 0, y: 0 }, history: [{ x, y }], active: true });
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-200">
      <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 z-10 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 mb-2 tracking-tight">Function Selector</h1>
          <p className="text-sm text-slate-400">Explore how gradient descent behaves on different 2D topologies.</p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Topology</h2>
          {Object.values(SELECTOR_FUNCTIONS).map(fn => (
            <button
              key={fn.id}
              onClick={() => { setSelectedFnId(fn.id); setLearningRate(fn.defaultLr); particlesRef.current = []; }}
              className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                selectedFnId === fn.id ? 'bg-teal-500/10 border-teal-400 text-teal-300 shadow-[0_0_15px_rgba(45,212,191,0.15)]' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <div className="font-medium">{fn.name}</div>
            </button>
          ))}
        </div>
        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed">
          {fnDef.description}
        </div>
        <div className="flex flex-col gap-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hyperparameters</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <label className="text-slate-300">Learning Rate</label>
              <span className="text-teal-400 font-mono">{learningRate.toFixed(4)}</span>
            </div>
            <input 
              type="range" min={0.0001} max={selectedFnId === 'rastrigin' ? 0.01 : 0.2} step={0.0001}
              value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="w-full accent-teal-400 bg-slate-700 rounded-lg appearance-none h-1 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300 cursor-pointer select-none" htmlFor="momentum-toggle">Use Momentum</label>
            <button 
              id="momentum-toggle" onClick={() => setUseMomentum(!useMomentum)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${useMomentum ? 'bg-teal-400' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useMomentum ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <div className="mt-auto pt-4">
          <button onClick={() => particlesRef.current = []} className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors">
            Clear Particles
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        <div className="absolute top-8 text-center pointer-events-none z-20">
          <p className="text-slate-400 text-sm animate-pulse">Click anywhere on the contour map to drop a particle</p>
        </div>
        <div className="relative w-full max-w-[600px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
          <canvas ref={bgCanvasRef} width={600} height={600} className="absolute inset-0 w-full h-full pointer-events-none" />
          <canvas ref={fgCanvasRef} width={600} height={600} onClick={handleCanvasClick} className="absolute inset-0 w-full h-full cursor-crosshair" />
        </div>
        <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#0f172a] border border-slate-700"></div><span>Minima (Low)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#ccfbf1] border border-slate-700"></div><span>Maxima (High)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-1 rounded bg-pink-400"></div><span>Descent Path</span></div>
        </div>
      </div>
    </div>
  );
}

// --- Module 3: Path Overlay ---

type OptimizerType = 'vanilla' | 'momentum' | 'adam';
interface OptimizerState { type: OptimizerType; color: string; active: boolean; x: number; y: number; history: Point[]; vx: number; vy: number; m_x: number; m_y: number; v_x: number; v_y: number; t: number; }

const OVERLAY_FUNCTIONS = {
  bowl: { name: 'Convex Bowl', fn: (x: number, y: number) => (x * x + y * y) / 20, minMax: [0, 2.5], start: { x: -4, y: -3 } },
  saddle: { name: 'Saddle Point', fn: (x: number, y: number) => (x * x - y * y) / 20, minMax: [-1.25, 1.25], start: { x: -0.1, y: -4 } },
  rastrigin: { name: 'Rastrigin (Non-convex)', fn: (x: number, y: number) => { const A = 10; return (2 * A + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y))) / 40; }, minMax: [0, 1.5], start: { x: -4.5, y: -4.5 } }
};

const getGradient = (fn: (x: number, y: number) => number, x: number, y: number) => {
  const h = 1e-5;
  const dx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  return { dx, dy };
};

function PathOverlay() {
  const [fnKey, setFnKey] = useState<keyof typeof OVERLAY_FUNCTIONS>('bowl');
  const [isPlaying, setIsPlaying] = useState(false);
  const [learningRate, setLearningRate] = useState(0.1);
  const [momentumBeta, setMomentumBeta] = useState(0.9);
  const [adamBeta1, setAdamBeta1] = useState(0.9);
  const [adamBeta2, setAdamBeta2] = useState(0.999);
  const [activeOpts, setActiveOpts] = useState<Record<OptimizerType, boolean>>({ vanilla: true, momentum: true, adam: true });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>();
  const stateRef = useRef<{ optimizers: OptimizerState[]; startPt: Point; }>({ optimizers: [], startPt: OVERLAY_FUNCTIONS['bowl'].start });

  const initOptimizers = useCallback(() => {
    const start = stateRef.current.startPt;
    stateRef.current.optimizers = [
      { type: 'vanilla', color: '#f43f5e', active: activeOpts.vanilla, x: start.x, y: start.y, history: [{ x: start.x, y: start.y }], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
      { type: 'momentum', color: '#fbbf24', active: activeOpts.momentum, x: start.x, y: start.y, history: [{ x: start.x, y: start.y }], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
      { type: 'adam', color: '#14b8a6', active: activeOpts.adam, x: start.x, y: start.y, history: [{ x: start.x, y: start.y }], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 }
    ];
  }, [activeOpts]);

  const renderBackground = useCallback(() => {
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
      bgCanvasRef.current.width = 600;
      bgCanvasRef.current.height = 600;
    }
    const ctx = bgCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const width = 600; const height = 600; const blockSize = 4;
    const fn = OVERLAY_FUNCTIONS[fnKey].fn;
    const [minVal, maxVal] = OVERLAY_FUNCTIONS[fnKey].minMax;

    const getColor = (val: number) => {
      const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      const r = Math.round(31 + norm * (20 - 31));
      const g = Math.round(41 + norm * (184 - 41));
      const b = Math.round(55 + norm * (166 - 55));
      return `rgb(${r},${g},${b})`;
    };

    for (let px = 0; px < width; px += blockSize) {
      for (let py = 0; py < height; py += blockSize) {
        const x = (px / width) * 10 - 5;
        const y = 5 - (py / height) * 10;
        ctx.fillStyle = getColor(fn(x, y));
        ctx.fillRect(px, py, blockSize, blockSize);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath();
    ctx.moveTo(width / 2 - 5, height / 2); ctx.lineTo(width / 2 + 5, height / 2);
    ctx.moveTo(width / 2, height / 2 - 5); ctx.lineTo(width / 2, height / 2 + 5); ctx.stroke();
  }, [fnKey]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (bgCanvasRef.current) ctx.drawImage(bgCanvasRef.current, 0, 0);

    const mapToScreen = (x: number, y: number) => ({ px: ((x + 5) / 10) * 600, py: ((5 - y) / 10) * 600 });

    stateRef.current.optimizers.forEach(opt => {
      if (!opt.active || opt.history.length === 0) return;
      ctx.beginPath(); ctx.strokeStyle = opt.color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const startPx = mapToScreen(opt.history[0].x, opt.history[0].y);
      ctx.moveTo(startPx.px, startPx.py);
      for (let i = 1; i < opt.history.length; i++) {
        const pt = mapToScreen(opt.history[i].x, opt.history[i].y);
        ctx.lineTo(pt.px, pt.py);
      }
      ctx.stroke();
      const head = mapToScreen(opt.x, opt.y);
      ctx.beginPath(); ctx.fillStyle = opt.color; ctx.arc(head.px, head.py, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    const startPx = mapToScreen(stateRef.current.startPt.x, stateRef.current.startPt.y);
    ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.arc(startPx.px, startPx.py, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.stroke();
  }, []);

  const updateOptimizers = useCallback(() => {
    const fn = OVERLAY_FUNCTIONS[fnKey].fn;
    const eps = 1e-8;
    stateRef.current.optimizers.forEach(opt => {
      if (!opt.active) return;
      const { dx, dy } = getGradient(fn, opt.x, opt.y);
      if (opt.type === 'vanilla') {
        opt.x -= learningRate * dx; opt.y -= learningRate * dy;
      } else if (opt.type === 'momentum') {
        opt.vx = momentumBeta * opt.vx + (1 - momentumBeta) * dx;
        opt.vy = momentumBeta * opt.vy + (1 - momentumBeta) * dy;
        opt.x -= learningRate * opt.vx; opt.y -= learningRate * opt.vy;
      } else if (opt.type === 'adam') {
        opt.t += 1;
        opt.m_x = adamBeta1 * opt.m_x + (1 - adamBeta1) * dx;
        opt.m_y = adamBeta1 * opt.m_y + (1 - adamBeta1) * dy;
        opt.v_x = adamBeta2 * opt.v_x + (1 - adamBeta2) * (dx * dx);
        opt.v_y = adamBeta2 * opt.v_y + (1 - adamBeta2) * (dy * dy);
        const m_hat_x = opt.m_x / (1 - Math.pow(adamBeta1, opt.t));
        const m_hat_y = opt.m_y / (1 - Math.pow(adamBeta1, opt.t));
        const v_hat_x = opt.v_x / (1 - Math.pow(adamBeta2, opt.t));
        const v_hat_y = opt.v_y / (1 - Math.pow(adamBeta2, opt.t));
        opt.x -= learningRate * m_hat_x / (Math.sqrt(v_hat_x) + eps);
        opt.y -= learningRate * m_hat_y / (Math.sqrt(v_hat_y) + eps);
      }
      opt.x = Math.max(-5, Math.min(5, opt.x)); opt.y = Math.max(-5, Math.min(5, opt.y));
      opt.history.push({ x: opt.x, y: opt.y });
      if (opt.history.length > 1000) opt.history.shift();
    });
  }, [fnKey, learningRate, momentumBeta, adamBeta1, adamBeta2]);

  const loop = useCallback(() => {
    if (isPlaying) updateOptimizers();
    drawFrame();
    requestRef.current = requestAnimationFrame(loop);
  }, [isPlaying, updateOptimizers, drawFrame]);

  useEffect(() => {
    stateRef.current.startPt = OVERLAY_FUNCTIONS[fnKey].start;
    renderBackground(); initOptimizers(); drawFrame();
  }, [fnKey, renderBackground, initOptimizers, drawFrame]);

  useEffect(() => {
    stateRef.current.optimizers.forEach(opt => { opt.active = activeOpts[opt.type]; });
    drawFrame();
  }, [activeOpts, drawFrame]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left; const py = e.clientY - rect.top;
    stateRef.current.startPt = { x: (px / 600) * 10 - 5, y: 5 - (py / 600) * 10 };
    initOptimizers();
    if (!isPlaying) drawFrame();
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100">
      <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-teal-400 tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Path Overlay
          </h1>
          <p className="text-xs text-slate-400 mt-2">Compare optimizers side-by-side</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Landscape Function</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(OVERLAY_FUNCTIONS) as Array<keyof typeof OVERLAY_FUNCTIONS>).map((key) => (
                <button key={key} onClick={() => { setFnKey(key); setIsPlaying(false); }} className={`px-4 py-2 rounded-md text-sm text-left transition-colors ${fnKey === key ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50' : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'}`}>
                  {OVERLAY_FUNCTIONS[key].name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Optimizers</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={activeOpts.vanilla} onChange={(e) => setActiveOpts(p => ({...p, vanilla: e.target.checked}))} className="hidden" />
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${activeOpts.vanilla ? 'bg-rose-500 border-rose-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                  {activeOpts.vanilla && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-slate-300">Vanilla GD</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={activeOpts.momentum} onChange={(e) => setActiveOpts(p => ({...p, momentum: e.target.checked}))} className="hidden" />
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${activeOpts.momentum ? 'bg-amber-400 border-amber-400' : 'border-slate-600 group-hover:border-slate-400'}`}>
                  {activeOpts.momentum && <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-slate-300">Momentum</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={activeOpts.adam} onChange={(e) => setActiveOpts(p => ({...p, adam: e.target.checked}))} className="hidden" />
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${activeOpts.adam ? 'bg-teal-500 border-teal-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                  {activeOpts.adam && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-slate-300">Adam</span>
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-2 rounded font-bold text-sm transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-teal-500 text-slate-900 hover:bg-teal-400'}`}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => { initOptimizers(); if (!isPlaying) drawFrame(); }} className="px-4 py-2 rounded font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700">
                Reset
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-slate-400">Learning Rate</span><span className="text-teal-400">{learningRate.toFixed(3)}</span></div>
              <input type="range" min="0.001" max="0.5" step="0.001" value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))} className="w-full accent-teal-400 h-1 bg-slate-700 rounded-lg appearance-none" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-8 text-center pointer-events-none z-20">
          <p className="text-slate-400 text-sm animate-pulse">Click anywhere to set a new starting point</p>
        </div>
        <div className="relative w-full max-w-[600px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
          <canvas ref={canvasRef} width={600} height={600} onClick={handleCanvasClick} className="absolute inset-0 w-full h-full cursor-crosshair" />
        </div>
      </div>
    </div>
  );
}

// --- Module 4: LR Slider ---

function LrSlider() {
  const [lr, setLr] = useState<number>(0.15);
  const [dotT, setDotT] = useState<number>(0);

  const START_X = 8; const MAX_STEPS = 12; const X_MIN = -10; const X_MAX = 10; const Y_MIN = -10; const Y_MAX = 100;

  const steps = useMemo(() => {
    const computedSteps = [];
    let currX = START_X;
    computedSteps.push(currX);
    for (let i = 0; i < MAX_STEPS; i++) {
      currX = currX - lr * (2 * currX);
      if (currX > 25) currX = 25;
      if (currX < -25) currX = -25;
      computedSteps.push(currX);
    }
    return computedSteps;
  }, [lr]);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      setDotT((prev) => {
        const newT = prev + dt * 0.003;
        return newT >= MAX_STEPS ? 0 : newT;
      });
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const mapX = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * 600;
  const mapY = (y: number) => 380 - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * 360;

  const parabolaPath = useMemo(() => {
    let d = '';
    for (let x = X_MIN; x <= X_MAX; x += 0.5) {
      const px = mapX(x);
      const py = mapY(x * x);
      d += `${x === X_MIN ? 'M' : 'L'} ${px} ${py} `;
    }
    return d;
  }, []);

  const idx = Math.floor(dotT);
  const nextIdx = Math.min(idx + 1, MAX_STEPS);
  const frac = dotT - idx;
  const currentX = steps[idx] * (1 - frac) + steps[nextIdx] * frac;
  const currentY = currentX * currentX;

  let statusText = ''; let statusColor = '';
  if (lr < 0.05) { statusText = 'Crawling (Too Slow)'; statusColor = 'text-blue-400'; }
  else if (lr >= 0.05 && lr <= 0.45) { statusText = 'Converging (Optimal)'; statusColor = 'text-teal-400'; }
  else if (lr > 0.45 && lr <= 0.95) { statusText = 'Oscillating (High)'; statusColor = 'text-yellow-400'; }
  else if (lr > 0.95 && lr <= 1.0) { statusText = 'Bouncing (Critical)'; statusColor = 'text-orange-400'; }
  else { statusText = 'Diverging (Too High)'; statusColor = 'text-red-500'; }

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mb-8 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
          The Learning Rate
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          The learning rate (α) determines the size of the steps we take down the gradient. Adjust the slider below to see how it affects convergence on a simple 2D bowl function.
        </p>
      </div>
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 p-8 bg-slate-900/80 border-r border-slate-800 flex flex-col justify-center space-y-8">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Learning Rate</label>
              <span className="text-2xl font-mono font-bold text-teal-400">{lr.toFixed(2)}</span>
            </div>
            <input type="range" min="0.01" max="1.08" step="0.01" value={lr} onChange={(e) => setLr(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-all" />
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-1"><span>0.01</span><span>0.50</span><span>1.08</span></div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</h3>
            <div className={`text-lg font-bold ${statusColor} transition-colors duration-300`}>{statusText}</div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {lr < 0.05 && "Steps are tiny. It will take many iterations to reach the minimum."}
              {lr >= 0.05 && lr <= 0.45 && "Smooth and steady descent towards the minimum."}
              {lr > 0.45 && lr <= 0.95 && "Overshooting the minimum, causing the path to zig-zag."}
              {lr > 0.95 && lr <= 1.0 && "Trapped in an endless bounce between two points."}
              {lr > 1.0 && "Steps are too large! The error is growing with each iteration."}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Math</h3>
            <div className="font-mono text-sm text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-teal-400/70 mb-1"># Update Rule</div>
              <div>x = x - α * ∇f(x)</div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-2/3 p-6 relative flex items-center justify-center bg-slate-900 min-h-[400px]">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#14b8a6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <svg viewBox="0 0 600 400" className="w-full h-full max-h-[500px] drop-shadow-xl overflow-visible">
            <line x1="0" y1={mapY(0)} x2="600" y2={mapY(0)} stroke="#334155" strokeWidth="2" />
            <line x1={mapX(0)} y1="0" x2={mapX(0)} y2="400" stroke="#334155" strokeWidth="2" />
            <path d={parabolaPath} fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" className="opacity-50" />
            {steps.map((stepX, i) => {
              if (i === steps.length - 1) return null;
              const nextX = steps[i + 1];
              if (Math.abs(stepX) > 15 || Math.abs(nextX) > 15) return null;
              return <line key={`line-${i}`} x1={mapX(stepX)} y1={mapY(stepX * stepX)} x2={mapX(nextX)} y2={mapY(nextX * nextX)} stroke="#14b8a6" strokeWidth="2" strokeDasharray="4 4" className="opacity-60" />;
            })}
            {steps.map((stepX, i) => {
              if (Math.abs(stepX) > 15) return null;
              return <circle key={`point-${i}`} cx={mapX(stepX)} cy={mapY(stepX * stepX)} r="4" fill="#14b8a6" className="opacity-50" />;
            })}
            {Math.abs(currentX) <= 15 && (
              <g transform={`translate(${mapX(currentX)}, ${mapY(currentY)})`}>
                <circle r="12" fill="#14b8a6" className="opacity-20 animate-ping" />
                <circle r="8" fill="#2dd4bf" className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// --- Module 5: Momentum Vs Adam Comparison ---

interface OptState { x: number; y: number; path: Point[]; vx: number; vy: number; m_x: number; m_y: number; v_x: number; v_y: number; t: number; }
interface ObjectiveFunction { id: string; name: string; f: (x: number, y: number) => number; grad: (x: number, y: number) => [number, number]; scale: number; }

const COMPARISON_FUNCTIONS: Record<string, ObjectiveFunction> = {
  stretched: { id: 'stretched', name: 'Stretched Bowl (Ill-conditioned)', f: (x, y) => x * x + 10 * y * y, grad: (x, y) => [2 * x, 20 * y], scale: 50 },
  saddle: { id: 'saddle', name: 'Saddle Point', f: (x, y) => x * x - y * y, grad: (x, y) => [2 * x, -2 * y], scale: 20 },
  bowl: { id: 'bowl', name: 'Standard Bowl', f: (x, y) => x * x + y * y, grad: (x, y) => [2 * x, 2 * y], scale: 30 },
};

function MomentumVsAdam() {
  const [activeFunc, setActiveFunc] = useState<string>('stretched');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lr, setLr] = useState<number>(0.015);
  const [momentum, setMomentum] = useState<number>(0.9);
  const [beta1, setBeta1] = useState<number>(0.9);
  const [beta2, setBeta2] = useState<number>(0.999);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const START_POS = { x: -4, y: 3 };
  const MAX_PATH_LENGTH = 1000;

  const simState = useRef<{ mom: OptState; adam: OptState; }>({
    mom: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
    adam: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
  });

  const paramsRef = useRef({ lr, momentum, beta1, beta2, func: COMPARISON_FUNCTIONS[activeFunc] });
  useEffect(() => { paramsRef.current = { lr, momentum, beta1, beta2, func: COMPARISON_FUNCTIONS[activeFunc] }; }, [lr, momentum, beta1, beta2, activeFunc]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width; const height = canvas.height;
    const cx = width / 2; const cy = height / 2; const scale = 40;

    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i < width; i += scale) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
    for (let i = 0; i < height; i += scale) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();

    const func = paramsRef.current.func;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    for (let r = 1; r <= 10; r++) {
      ctx.beginPath();
      if (func.id === 'stretched') { ctx.ellipse(cx, cy, r * scale * 1.5, r * scale * 1.5 / Math.sqrt(10), 0, 0, 2 * Math.PI); }
      else if (func.id === 'bowl') { ctx.arc(cx, cy, r * scale, 0, 2 * Math.PI); }
      else if (func.id === 'saddle') {
        const offset = r * scale * 0.5;
        ctx.moveTo(cx - width, cy - width + offset); ctx.quadraticCurveTo(cx, cy + offset, cx + width, cy - width + offset);
        ctx.moveTo(cx - width, cy + width - offset); ctx.quadraticCurveTo(cx, cy - offset, cx + width, cy + width - offset);
      }
      ctx.stroke();
    }

    const mapX = (x: number) => cx + x * scale;
    const mapY = (y: number) => cy - y * scale;

    const drawPath = (path: Point[], color: string) => {
      if (path.length === 0) return;
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.shadowColor = color; ctx.shadowBlur = 10;
      ctx.moveTo(mapX(path[0].x), mapY(path[0].y));
      for (let i = 1; i < path.length; i++) ctx.lineTo(mapX(path[i].x), mapY(path[i].y));
      ctx.stroke(); ctx.shadowBlur = 0;
      const last = path[path.length - 1];
      ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(mapX(last.x), mapY(last.y), 5, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    };

    const state = simState.current;
    drawPath(state.mom.path, '#2dd4bf');
    drawPath(state.adam.path, '#f472b6');
  }, []);

  const resetSimulation = useCallback(() => {
    simState.current = {
      mom: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
      adam: { ...START_POS, path: [{...START_POS}], vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
    };
    setIsRunning(false);
    drawFrame();
  }, [drawFrame]);

  const stepSimulation = useCallback(() => {
    const { lr, momentum, beta1, beta2, func } = paramsRef.current;
    const state = simState.current;
    const epsilon = 1e-8;
    const clamp = (val: number, min = -10, max = 10) => Math.max(min, Math.min(max, val));

    let [g_mom_x, g_mom_y] = func.grad(state.mom.x, state.mom.y);
    state.mom.vx = momentum * state.mom.vx + lr * g_mom_x;
    state.mom.vy = momentum * state.mom.vy + lr * g_mom_y;
    state.mom.x -= state.mom.vx; state.mom.y -= state.mom.vy;
    state.mom.x = clamp(state.mom.x); state.mom.y = clamp(state.mom.y);
    if (state.mom.path.length < MAX_PATH_LENGTH) state.mom.path.push({ x: state.mom.x, y: state.mom.y });

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
    const adam_lr = lr * 2.0; 
    state.adam.x -= adam_lr * m_hat_x / (Math.sqrt(v_hat_x) + epsilon);
    state.adam.y -= adam_lr * m_hat_y / (Math.sqrt(v_hat_y) + epsilon);
    state.adam.x = clamp(state.adam.x); state.adam.y = clamp(state.adam.y);
    if (state.adam.path.length < MAX_PATH_LENGTH) state.adam.path.push({ x: state.adam.x, y: state.adam.y });
  }, []);

  const animate = useCallback(() => {
    if (isRunning) {
      stepSimulation(); drawFrame();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isRunning, stepSimulation, drawFrame]);

  useEffect(() => {
    if (isRunning) requestRef.current = requestAnimationFrame(animate);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isRunning, animate]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        drawFrame();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame]);

  useEffect(() => { resetSimulation(); }, [activeFunc, resetSimulation]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100">
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Momentum <span className="text-slate-400 font-light">vs</span> Adam</h1>
          <p className="text-slate-400 max-w-md text-sm leading-relaxed">Watch how different optimizers navigate the loss landscape. Momentum builds velocity to overcome shallow gradients, while Adam adapts its learning rate per parameter.</p>
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-800 w-fit">
              <div className="w-4 h-4 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]"></div>
              <span className="font-medium text-teal-400">Momentum</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-800 w-fit">
              <div className="w-4 h-4 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.8)]"></div>
              <span className="font-medium text-pink-400">Adam</span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-10">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-sm">Controls</h2>
          <div className="flex gap-3">
            <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-2.5 rounded font-bold transition-colors ${isRunning ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' : 'bg-teal-500 text-slate-900 hover:bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.4)]'}`}>
              {isRunning ? 'Pause' : 'Play'}
            </button>
            <button onClick={resetSimulation} className="px-4 py-2.5 rounded font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700">
              Reset
            </button>
          </div>
        </div>
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Landscape Function</label>
            <select value={activeFunc} onChange={(e) => setActiveFunc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none">
              {Object.values(COMPARISON_FUNCTIONS).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Base Learning Rate</label><span className="text-xs text-teal-400 font-mono">{lr.toFixed(3)}</span></div>
              <input type="range" min="0.001" max="0.05" step="0.001" value={lr} onChange={(e) => setLr(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400" />
            </div>
          </div>
          <hr className="border-slate-800" />
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-teal-400">Momentum Settings</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Friction (γ)</label><span className="text-xs text-teal-400 font-mono">{momentum.toFixed(2)}</span></div>
              <input type="range" min="0" max="0.99" step="0.01" value={momentum} onChange={(e) => setMomentum(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400" />
            </div>
          </div>
          <hr className="border-slate-800" />
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-pink-400">Adam Settings</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Beta 1</label><span className="text-xs text-pink-400 font-mono">{beta1.toFixed(3)}</span></div>
              <input type="range" min="0.8" max="0.999" step="0.001" value={beta1} onChange={(e) => setBeta1(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Beta 2</label><span className="text-xs text-pink-400 font-mono">{beta2.toFixed(4)}</span></div>
              <input type="range" min="0.9" max="0.9999" step="0.0001" value={beta2} onChange={(e) => setBeta2(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 6: Blindfold Challenge ---

function BlindfoldChallenge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameState = useRef({ pos: { x: 0, y: 0 }, path: [] as Point[], target: { x: 0, y: 0 } });
  const [uiState, setUiState] = useState({ steps: 0, loss: 0, gradX: 0, gradY: 0, lr: 0.1, won: false, diverged: false });

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width; const height = canvas.height;
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, width, height);

    const cx = width / 2; const cy = height / 2; const scale = 20;
    const mapX = (x: number) => cx + x * scale;
    const mapY = (y: number) => cy - y * scale;

    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i < width; i += scale) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
    for (let i = 0; i < height; i += scale) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();

    const path = gameState.current.path;
    if (path.length > 0) {
      ctx.beginPath(); ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 2;
      ctx.moveTo(mapX(path[0].x), mapY(path[0].y));
      for (let i = 1; i < path.length; i++) ctx.lineTo(mapX(path[i].x), mapY(path[i].y));
      ctx.stroke();
      const last = path[path.length - 1];
      ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(mapX(last.x), mapY(last.y), 4, 0, 2 * Math.PI); ctx.fill();
    }

    if (uiState.won) {
      const t = gameState.current.target;
      ctx.beginPath(); ctx.fillStyle = '#f43f5e'; ctx.arc(mapX(t.x), mapY(t.y), 6, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
  }, [uiState.won]);

  const updateUi = useCallback(() => {
    const { pos, target, path } = gameState.current;
    const loss = Math.pow(pos.x - target.x, 2) + Math.pow(pos.y - target.y, 2);
    const gradX = 2 * (pos.x - target.x);
    const gradY = 2 * (pos.y - target.y);
    const won = loss < 0.01;
    const diverged = loss > 1000 || isNaN(loss);
    setUiState(prev => ({ ...prev, steps: path.length - 1, loss, gradX, gradY, won, diverged }));
    drawCanvas();
  }, [drawCanvas]);

  const handleReset = useCallback(() => {
    const tx = (Math.random() - 0.5) * 16; const ty = (Math.random() - 0.5) * 16;
    let sx = (Math.random() - 0.5) * 16; let sy = (Math.random() - 0.5) * 16;
    while (Math.pow(sx - tx, 2) + Math.pow(sy - ty, 2) < 10) {
      sx = (Math.random() - 0.5) * 16; sy = (Math.random() - 0.5) * 16;
    }
    gameState.current = { pos: { x: sx, y: sy }, path: [{ x: sx, y: sy }], target: { x: tx, y: ty } };
    updateUi();
  }, [updateUi]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        drawCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    handleReset();
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas, handleReset]);

  const handleStep = (times = 1) => {
    if (uiState.won || uiState.diverged) return;
    for (let i = 0; i < times; i++) {
      const { pos, target } = gameState.current;
      const gradX = 2 * (pos.x - target.x);
      const gradY = 2 * (pos.y - target.y);
      pos.x -= uiState.lr * gradX;
      pos.y -= uiState.lr * gradY;
      gameState.current.path.push({ ...pos });
    }
    updateUi();
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100">
      <div className="w-full md:w-96 bg-slate-900 border-r border-slate-800 p-8 flex flex-col gap-8 z-10 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 mb-2 tracking-tight">Blindfold Challenge</h1>
          <p className="text-sm text-slate-400">Find the hidden minimum using only the loss and gradient values. The landscape is invisible!</p>
        </div>
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400 text-sm">Steps Taken</span>
            <span className="text-xl font-mono font-bold text-white">{uiState.steps}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-slate-400 text-sm">Current Loss</span>
            <span className={`text-xl font-mono font-bold ${uiState.won ? 'text-teal-400' : uiState.diverged ? 'text-red-500' : 'text-amber-400'}`}>
              {uiState.diverged ? 'Infinity' : uiState.loss.toFixed(4)}
            </span>
          </div>
          <div className="space-y-2 pt-2">
            <span className="text-slate-400 text-sm block">Gradient Vector ∇f</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                <div className="text-xs text-slate-500 mb-1">dx</div>
                <div className="font-mono text-sm text-pink-400">{uiState.diverged ? 'NaN' : uiState.gradX.toFixed(3)}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                <div className="text-xs text-slate-500 mb-1">dy</div>
                <div className="font-mono text-sm text-pink-400">{uiState.diverged ? 'NaN' : uiState.gradY.toFixed(3)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Learning Rate</label>
            <input type="number" step="0.01" value={uiState.lr} onChange={(e) => setUiState(p => ({ ...p, lr: parseFloat(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleStep(1)} disabled={uiState.won || uiState.diverged} className="flex-1 py-3 rounded-lg font-bold bg-teal-500 text-slate-900 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Step (1x)
            </button>
            <button onClick={() => handleStep(10)} disabled={uiState.won || uiState.diverged} className="flex-1 py-3 rounded-lg font-bold bg-teal-500/20 text-teal-400 border border-teal-500/50 hover:bg-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Step (10x)
            </button>
          </div>
          <button onClick={handleReset} className="w-full py-3 rounded-lg font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
            Reset Challenge
          </button>
        </div>
        {uiState.won && (
          <div className="mt-4 p-4 bg-teal-500/20 border border-teal-500/50 rounded-lg text-center animate-pulse">
            <h3 className="text-teal-400 font-bold text-lg">Target Reached!</h3>
            <p className="text-teal-200/70 text-sm mt-1">You found the minimum in {uiState.steps} steps.</p>
          </div>
        )}
        {uiState.diverged && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
            <h3 className="text-red-400 font-bold text-lg">Diverged!</h3>
            <p className="text-red-200/70 text-sm mt-1">Learning rate was too high.</p>
          </div>
        )}
      </div>
      <div className="flex-1 relative bg-slate-950">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const tabs = [
    { name: 'Introduction', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Function Explorer', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { name: 'Optimizer Paths', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { name: 'Learning Rate', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { name: 'Momentum vs Adam', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Blindfold Challenge', icon: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' }
  ];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="w-16 md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col z-50 shrink-0">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(45,212,191,0.5)]">
            <span className="font-bold text-slate-950 text-sm">GD</span>
          </div>
          <span className="ml-3 font-bold text-lg tracking-tight hidden md:block text-slate-100">Playground</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center px-3 py-3 rounded-lg transition-all group ${activeTab === idx ? 'bg-teal-500/10 text-teal-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              title={tab.name}
            >
              <svg className={`w-6 h-6 shrink-0 ${activeTab === idx ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="ml-3 font-medium text-sm hidden md:block whitespace-nowrap">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 0 && <HeroIntro onEnter={() => setActiveTab(1)} onBlindfold={() => setActiveTab(5)} />}
        {activeTab === 1 && <FunctionSelector />}
        {activeTab === 2 && <PathOverlay />}
        {activeTab === 3 && <LrSlider />}
        {activeTab === 4 && <MomentumVsAdam />}
        {activeTab === 5 && <BlindfoldChallenge />}
      </div>
    </div>
  );
}