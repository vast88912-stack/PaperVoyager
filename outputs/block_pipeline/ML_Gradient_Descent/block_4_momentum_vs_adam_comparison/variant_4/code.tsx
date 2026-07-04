import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Optimization Definitions ---

type Point = { x: number; y: number };

interface OptimizerState {
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

type FuncDef = {
  id: string;
  name: string;
  domain: [number, number]; // [min, max] for both x and y
  start: Point;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => Point;
  globalMin: Point | null;
};

const FUNCTIONS: Record<string, FuncDef> = {
  bowl: {
    id: 'bowl',
    name: 'Elongated Bowl (Quadratic)',
    domain: [-5, 5],
    start: { x: -4, y: 3 },
    f: (x, y) => 0.5 * x * x + 2 * y * y,
    grad: (x, y) => ({ x: x, y: 4 * y }),
    globalMin: { x: 0, y: 0 },
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle Point',
    domain: [-3, 3],
    start: { x: -0.1, y: 2.5 },
    f: (x, y) => x * x - y * y,
    grad: (x, y) => ({ x: 2 * x, y: -2 * y }),
    globalMin: null,
  },
  rastrigin: {
    id: 'rastrigin',
    name: 'Rastrigin (Non-convex)',
    domain: [-2.5, 2.5],
    start: { x: -2.0, y: 2.2 },
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    grad: (x, y) => ({
      x: 2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      y: 2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    }),
    globalMin: { x: 0, y: 0 },
  },
};

const MAX_STEPS = 2000;

export default function App() {
  // --- UI State ---
  const [selectedFunc, setSelectedFunc] = useState<string>('bowl');
  const [lr, setLr] = useState<number>(0.05);
  const [momentumBeta, setMomentumBeta] = useState<number>(0.9);
  const [adamBeta1, setAdamBeta1] = useState<number>(0.9);
  const [adamBeta2, setAdamBeta2] = useState<number>(0.999);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [steps, setSteps] = useState<number>(0);

  // --- Refs for Canvas & Simulation ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reqRef = useRef<number>();
  
  const simState = useRef<{ momentum: OptimizerState; adam: OptimizerState }>({
    momentum: { x: 0, y: 0, vx: 0, vy: 0, path: [], m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
    adam: { x: 0, y: 0, vx: 0, vy: 0, path: [], m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 }
  });

  // --- Helpers ---
  const getFunc = () => FUNCTIONS[selectedFunc];

  const resetSimulation = useCallback(() => {
    const fDef = getFunc();
    simState.current = {
      momentum: { x: fDef.start.x, y: fDef.start.y, vx: 0, vy: 0, path: [{ x: fDef.start.x, y: fDef.start.y }], m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 },
      adam: { x: fDef.start.x, y: fDef.start.y, vx: 0, vy: 0, path: [{ x: fDef.start.x, y: fDef.start.y }], m_x: 0, m_y: 0, v_x: 0, v_y: 0, t: 0 }
    };
    setSteps(0);
    setIsRunning(false);
    renderCanvas();
  }, [selectedFunc]);

  // --- Background Heatmap Generation ---
  const generateBackground = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
      bgCanvasRef.current.width = width;
      bgCanvasRef.current.height = height;
    }
    
    const bgCtx = bgCanvasRef.current.getContext('2d');
    if (!bgCtx) return;

    const fDef = getFunc();
    const [dMin, dMax] = fDef.domain;
    
    // Create lower res heatmap for performance, then scale up
    const res = 100; 
    const imgData = bgCtx.createImageData(res, res);
    
    let minZ = Infinity;
    let maxZ = -Infinity;
    const zValues = new Float32Array(res * res);

    for (let py = 0; py < res; py++) {
      for (let px = 0; px < res; px++) {
        const x = dMin + (px / res) * (dMax - dMin);
        const y = dMax - (py / res) * (dMax - dMin); // flip Y for canvas
        const z = fDef.f(x, y);
        zValues[py * res + px] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    // Color map: Gray 900 (17,24,39) to Teal 500 (20,184,166)
    for (let i = 0; i < zValues.length; i++) {
      // Normalize z (log scale often looks better for deep bowls, but linear is safer for saddles)
      const normZ = (zValues[i] - minZ) / (maxZ - minZ || 1);
      
      const r = 17 + normZ * (20 - 17);
      const g = 24 + normZ * (184 - 24);
      const b = 39 + normZ * (166 - 39);

      const pIdx = i * 4;
      imgData.data[pIdx] = r;
      imgData.data[pIdx + 1] = g;
      imgData.data[pIdx + 2] = b;
      imgData.data[pIdx + 3] = 255; // Alpha
    }

    // Draw low-res image to a temp canvas, then draw scaled to bgCanvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = res;
    tempCanvas.height = res;
    tempCanvas.getContext('2d')!.putImageData(imgData, 0, 0);
    
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.drawImage(tempCanvas, 0, 0, width, height);

    // Draw contour lines approximations
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    bgCtx.lineWidth = 1;
    const numContours = 15;
    for (let py = 1; py < res - 1; py++) {
      for (let px = 1; px < res - 1; px++) {
        const z = zValues[py * res + px];
        const normZ = (z - minZ) / (maxZ - minZ || 1);
        const contourLevel = normZ * numContours;
        const diffX = Math.abs(contourLevel - ((zValues[py * res + px + 1] - minZ) / (maxZ - minZ) * numContours));
        const diffY = Math.abs(contourLevel - ((zValues[(py + 1) * res + px] - minZ) / (maxZ - minZ) * numContours));
        
        if (Math.floor(contourLevel) !== Math.floor(contourLevel + Math.max(diffX, diffY))) {
           bgCtx.fillStyle = 'rgba(255,255,255,0.1)';
           bgCtx.fillRect(px * (width/res), py * (height/res), 2, 2);
        }
      }
    }
  }, [selectedFunc]);

  // --- Coordinate Mapping ---
  const mapToCanvas = (p: Point, width: number, height: number): Point => {
    const fDef = getFunc();
    const [dMin, dMax] = fDef.domain;
    const range = dMax - dMin;
    return {
      x: ((p.x - dMin) / range) * width,
      y: ((dMax - p.y) / range) * height, // Flip Y
    };
  };

  // --- Render Loop ---
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !bgCanvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw background
    ctx.drawImage(bgCanvasRef.current, 0, 0);

    const drawAgent = (state: OptimizerState, color: string, glow: string) => {
      if (state.path.length === 0) return;

      // Draw Path
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = glow;
      
      const startC = mapToCanvas(state.path[0], width, height);
      ctx.moveTo(startC.x, startC.y);
      
      for (let i = 1; i < state.path.length; i++) {
        const p = mapToCanvas(state.path[i], width, height);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw Head
      const head = mapToCanvas(state.path[state.path.length - 1], width, height);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Colors: Momentum (Neon Pink), Adam (Neon Yellow)
    drawAgent(simState.current.momentum, '#f472b6', 'rgba(244, 114, 182, 0.6)');
    drawAgent(simState.current.adam, '#fde047', 'rgba(253, 224, 71, 0.6)');

  }, [selectedFunc]);

  // --- Physics/Math Step ---
  const stepSimulation = useCallback(() => {
    const fDef = getFunc();
    const eps = 1e-8;
    
    // Copy state
    let mom = { ...simState.current.momentum };
    let adam = { ...simState.current.adam };

    // --- Momentum Update ---
    const g_mom = fDef.grad(mom.x, mom.y);
    // Classic Momentum: v = beta * v + lr * grad
    mom.vx = momentumBeta * mom.vx + lr * g_mom.x;
    mom.vy = momentumBeta * mom.vy + lr * g_mom.y;
    mom.x -= mom.vx;
    mom.y -= mom.vy;
    mom.path.push({ x: mom.x, y: mom.y });

    // --- Adam Update ---
    const g_adam = fDef.grad(adam.x, adam.y);
    adam.t += 1;
    
    adam.m_x = adamBeta1 * adam.m_x + (1 - adamBeta1) * g_adam.x;
    adam.m_y = adamBeta1 * adam.m_y + (1 - adamBeta1) * g_adam.y;
    
    adam.v_x = adamBeta2 * adam.v_x + (1 - adamBeta2) * (g_adam.x * g_adam.x);
    adam.v_y = adamBeta2 * adam.v_y + (1 - adamBeta2) * (g_adam.y * g_adam.y);
    
    const m_hat_x = adam.m_x / (1 - Math.pow(adamBeta1, adam.t));
    const m_hat_y = adam.m_y / (1 - Math.pow(adamBeta1, adam.t));
    
    const v_hat_x = adam.v_x / (1 - Math.pow(adamBeta2, adam.t));
    const v_hat_y = adam.v_y / (1 - Math.pow(adamBeta2, adam.t));
    
    // Adam effective LR is often much smaller than required for pure momentum on same scale,
    // but we use the same user `lr` to highlight the difference in scale invariant behavior.
    adam.x -= (lr * m_hat_x) / (Math.sqrt(v_hat_x) + eps);
    adam.y -= (lr * m_hat_y) / (Math.sqrt(v_hat_y) + eps);
    adam.path.push({ x: adam.x, y: adam.y });

    simState.current = { momentum: mom, adam };
    setSteps(s => s + 1);

    renderCanvas();

    if (mom.path.length < MAX_STEPS && isRunning) {
      reqRef.current = requestAnimationFrame(stepSimulation);
    } else if (mom.path.length >= MAX_STEPS) {
      setIsRunning(false);
    }
  }, [lr, momentumBeta, adamBeta1, adamBeta2, isRunning, renderCanvas]);

  // --- Effects ---
  useEffect(() => {
    generateBackground();
    resetSimulation();
  }, [selectedFunc, generateBackground, resetSimulation]);

  useEffect(() => {
    if (isRunning) {
      reqRef.current = requestAnimationFrame(stepSimulation);
    } else if (reqRef.current) {
      cancelAnimationFrame(reqRef.current);
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isRunning, stepSimulation]);

  // Initial draw
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);


  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 mb-1 tracking-tight">Gradient Descent</h1>
          <p className="text-sm text-gray-400">Momentum vs Adam</p>
        </div>

        {/* Function Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Landscape</label>
          <div className="flex flex-col gap-2">
            {Object.values(FUNCTIONS).map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFunc(f.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left border ${
                  selectedFunc === f.id 
                    ? 'bg-teal-500/2