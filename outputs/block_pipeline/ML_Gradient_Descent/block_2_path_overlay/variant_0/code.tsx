import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Functions ---

type Point = { x: number; y: number };

const FUNCTIONS = {
  bowl: {
    name: 'Convex Bowl',
    fn: (x: number, y: number) => (x * x + y * y) / 20,
    minMax: [0, 2.5],
    start: { x: -4, y: -3 }
  },
  saddle: {
    name: 'Saddle Point',
    fn: (x: number, y: number) => (x * x - y * y) / 20,
    minMax: [-1.25, 1.25],
    start: { x: -0.1, y: -4 }
  },
  rastrigin: {
    name: 'Rastrigin (Non-convex)',
    fn: (x: number, y: number) => {
      const A = 10;
      return (2 * A + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y))) / 40;
    },
    minMax: [0, 1.5],
    start: { x: -4.5, y: -4.5 }
  }
};

const getGradient = (fn: (x: number, y: number) => number, x: number, y: number) => {
  const h = 1e-5;
  const dx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  return { dx, dy };
};

// --- Types ---

type OptimizerType = 'vanilla' | 'momentum' | 'adam';

interface OptimizerState {
  type: OptimizerType;
  color: string;
  active: boolean;
  x: number;
  y: number;
  history: Point[];
  // Momentum
  vx: number;
  vy: number;
  // Adam
  m_x: number;
  m_y: number;
  v_x: number;
  v_y: number;
  t: number;
}

// --- Main Component ---

export default function App() {
  // UI State
  const [fnKey, setFnKey] = useState<keyof typeof FUNCTIONS>('bowl');
  const [isPlaying, setIsPlaying] = useState(false);
  const [learningRate, setLearningRate] = useState(0.1);
  const [momentumBeta, setMomentumBeta] = useState(0.9);
  const [adamBeta1, setAdamBeta1] = useState(0.9);
  const [adamBeta2, setAdamBeta2] = useState(0.999);
  
  const [activeOpts, setActiveOpts] = useState<Record<OptimizerType, boolean>>({
    vanilla: true,
    momentum: true,
    adam: true
  });

  // Canvas & Animation Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>();
  
  // Mutable state for the animation loop to avoid dependency tangles
  const stateRef = useRef<{
    optimizers: OptimizerState[];
    startPt: Point;
  }>({
    optimizers: [],
    startPt: FUNCTIONS['bowl'].start
  });

  // --- Initialization ---

  const initOptimizers = useCallback(() => {
    const start = stateRef.current.startPt;
    stateRef.current.optimizers = [
      {
        type: 'vanilla', color: '#f43f5e', active: activeOpts.vanilla,
        x: start.x, y: start.y, history: [{ x: start.x, y: start.y }],
        vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0
      },
      {
        type: 'momentum', color: '#fbbf24', active: activeOpts.momentum,
        x: start.x, y: start.y, history: [{ x: start.x, y: start.y }],
        vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0
      },
      {
        type: 'adam', color: '#14b8a6', active: activeOpts.adam,
        x: start.x, y: start.y, history: [{ x: start.x, y: start.y }],
        vx: 0, vy: 0, m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0
      }
    ];
  }, [activeOpts]);

  // Pre-render background contour
  const renderBackground = useCallback(() => {
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
      bgCanvasRef.current.width = 600;
      bgCanvasRef.current.height = 600;
    }
    const ctx = bgCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 600;
    const blockSize = 4;
    const fn = FUNCTIONS[fnKey].fn;
    const [minVal, maxVal] = FUNCTIONS[fnKey].minMax;

    // Charcoal to Teal colormap
    const getColor = (val: number) => {
      const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      // Charcoal: #1f2937 (31, 41, 55)
      // Teal: #14b8a6 (20, 184, 166)
      const r = Math.round(31 + norm * (20 - 31));
      const g = Math.round(41 + norm * (184 - 41));
      const b = Math.round(55 + norm * (166 - 55));
      return `rgb(${r},${g},${b})`;
    };

    for (let px = 0; px < width; px += blockSize) {
      for (let py = 0; py < height; py += blockSize) {
        const x = (px / width) * 10 - 5;
        const y = 5 - (py / height) * 10;
        const z = fn(x, y);
        ctx.fillStyle = getColor(z);
        ctx.fillRect(px, py, blockSize, blockSize);
      }
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Draw global minimum indicator (0,0)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 5, height / 2); ctx.lineTo(width / 2 + 5, height / 2);
    ctx.moveTo(width / 2, height / 2 - 5); ctx.lineTo(width / 2, height / 2 + 5);
    ctx.stroke();

  }, [fnKey]);

  // --- Animation Loop ---

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Background
    if (bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0);
    }

    // 2. Draw Paths
    const mapToScreen = (x: number, y: number) => ({
      px: ((x + 5) / 10) * 600,
      py: ((5 - y) / 10) * 600
    });

    stateRef.current.optimizers.forEach(opt => {
      if (!opt.active || opt.history.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = opt.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const startPx = mapToScreen(opt.history[0].x, opt.history[0].y);
      ctx.moveTo(startPx.px, startPx.py);

      for (let i = 1; i < opt.history.length; i++) {
        const pt = mapToScreen(opt.history[i].x, opt.history[i].y);
        ctx.lineTo(pt.px, pt.py);
      }
      ctx.stroke();

      // Draw current position head
      const head = mapToScreen(opt.x, opt.y);
      ctx.beginPath();
      ctx.fillStyle = opt.color;
      ctx.arc(head.px, head.py, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw Start Point
    const startPx = mapToScreen(stateRef.current.startPt.x, stateRef.current.startPt.y);
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(startPx.px, startPx.py, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();

  }, []);

  const updateOptimizers = useCallback(() => {
    const fn = FUNCTIONS[fnKey].fn;
    const eps = 1e-8;

    stateRef.current.optimizers.forEach(opt => {
      if (!opt.active) return;
      
      const { dx, dy } = getGradient(fn, opt.x, opt.y);

      if (opt.type === 'vanilla') {
        opt.x -= learningRate * dx;
        opt.y -= learningRate * dy;
      } 
      else if (opt.type === 'momentum') {
        opt.vx = momentumBeta * opt.vx + (1 - momentumBeta) * dx;
        opt.vy = momentumBeta * opt.vy + (1 - momentumBeta) * dy;
        opt.x -= learningRate * opt.vx;
        opt.y -= learningRate * opt.vy;
      } 
      else if (opt.type === 'adam') {
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

      // Clamp to domain to prevent flying off to infinity
      opt.x = Math.max(-5, Math.min(5, opt.x));
      opt.y = Math.max(-5, Math.min(5, opt.y));

      opt.history.push({ x: opt.x, y: opt.y });
      
      // Keep history manageable
      if (opt.history.length > 1000) {
        opt.history.shift();
      }
    });
  }, [fnKey, learningRate, momentumBeta, adamBeta1, adamBeta2]);

  const loop = useCallback(() => {
    if (isPlaying) {
      updateOptimizers();
    }
    drawFrame();
    requestRef.current = requestAnimationFrame(loop);
  }, [isPlaying, updateOptimizers, drawFrame]);

  // --- Effects ---

  // Handle function change
  useEffect(() => {
    stateRef.current.startPt = FUNCTIONS[fnKey].start;
    renderBackground();
    initOptimizers();
    drawFrame();
  }, [fnKey, renderBackground, initOptimizers, drawFrame]);

  // Handle active optimizers change
  useEffect(() => {
    stateRef.current.optimizers.forEach(opt => {
      opt.active = activeOpts[opt.type];
    });
    drawFrame();
  }, [activeOpts, drawFrame]);

  // Start/Stop Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  // --- Handlers ---

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    const x = (px / 600) * 10 - 5;
    const y = 5 - (py / 600) * 10;
    
    stateRef.current.startPt = { x, y };
    initOptimizers();
    if (!isPlaying) drawFrame();
  };

  const handleReset = () => {
    initOptimizers();
    if (!isPlaying) drawFrame();
  };

  // --- Render ---

  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-teal-400 tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            GD Playground
          </h1>
          <p className="text-xs text-gray-400 mt-2">Path Overlay & Optimizer Comparison</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Function Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Landscape Function</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(FUNCTIONS) as Array<keyof typeof FUNCTIONS>).map((key) => (
                <button
                  key={key}
                  onClick={() => { setFnKey(key); setIsPlaying(false); }}
                  className={`px-4 py-2 rounded-md text-sm text-left transition-colors ${
                    fnKey === key 
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50' 
                      : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {FUNCTIONS[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Optimizers Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Optimizers</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={activeOpts.vanilla} onChange={(e) => setActiveOpts(p => ({...p, vanilla: e.target.checked}))} className="hidden" />
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${activeOpts.vanilla ? 'bg-rose-500 border-rose-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                  {activeOpts.vanilla && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-gray-300">Vanilla GD</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={activeOpts.momentum} onChange={(e) => setActiveOpts(p => ({...p, momentum: e.target.checked}))} className="hidden" />
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${activeOpts.momentum ? 'bg-amber-400 border-amber-400' : 'border-gray-600 group-hover:border-gray-400'}`}>
                  {activeOpts.momentum && <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-sm text-gray-300">Momentum</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={activeOpts.adam} onChange={(e) => setActiveOpts(p => ({...p, adam: e.target.checked}))} className="hidden" />
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${activeOpts.adam ? 'bg-teal-500 border-teal-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                  {activeOpts.adam && <svg className