import React, { useEffect, useRef, useState, useCallback } from 'react';

// Runtime Dependencies:
// - React
// - Tailwind CSS (for styling classes)

const CANVAS_SIZE = 600;
const DOMAIN_SIZE = 10; // -5 to 5
const SCALE = CANVAS_SIZE / DOMAIN_SIZE;

// 2D Functions
const FUNCTIONS: Record<string, { fn: (x: number, y: number) => number, name: string }> = {
  bowl: {
    name: 'Convex Bowl',
    fn: (x, y) => (x * x + y * y) / 2
  },
  saddle: {
    name: 'Saddle Point',
    fn: (x, y) => (x * x - y * y) / 2
  },
  rastrigin: {
    name: 'Rastrigin (Non-convex)',
    fn: (x, y) => 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y))
  }
};

// Optimizers
type OptimizerType = 'gd' | 'momentum' | 'adam';

interface SimulationParams {
  funcKey: string;
  optKey: OptimizerType;
  lr: number;
  momentum: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>();

  const [funcKey, setFuncKey] = useState<string>('bowl');
  const [optKey, setOptKey] = useState<OptimizerType>('adam');
  const [lr, setLr] = useState<number>(0.1);
  const [momentumParam, setMomentumParam] = useState<number>(0.9);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Keep params in a ref to always access latest within event listeners/animation loops without rebinding
  const paramsRef = useRef<SimulationParams>({ funcKey, optKey, lr, momentum: momentumParam });
  useEffect(() => {
    paramsRef.current = { funcKey, optKey, lr, momentum: momentumParam };
  }, [funcKey, optKey, lr, momentumParam]);

  // Gradient computation via finite difference
  const computeGradient = (x: number, y: number, fn: (x: number, y: number) => number) => {
    const h = 1e-5;
    const dx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
    const dy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
    return { dx, dy };
  };

  // Map from domain (x,y) to canvas (px,py)
  const mapToCanvas = (x: number, y: number) => {
    const px = (x + DOMAIN_SIZE / 2) * SCALE;
    const py = CANVAS_SIZE - (y + DOMAIN_SIZE / 2) * SCALE; // Invert Y
    return { px, py };
  };

  // Map from canvas (px,py) to domain (x,y)
  const mapToDomain = (px: number, py: number) => {
    const x = px / SCALE - DOMAIN_SIZE / 2;
    const y = (CANVAS_SIZE - py) / SCALE - DOMAIN_SIZE / 2;
    return { x, y };
  };

  // Precompute and draw background
  const renderBackground = useCallback(() => {
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
      bgCanvasRef.current.width = CANVAS_SIZE;
      bgCanvasRef.current.height = CANVAS_SIZE;
    }
    
    const bgCtx = bgCanvasRef.current.getContext('2d');
    if (!bgCtx) return;

    const fn = FUNCTIONS[funcKey].fn;
    const imgData = bgCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    
    // Quick pass to find min/max for normalization
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    // Sample a grid to find bounds
    for (let px = 0; px < CANVAS_SIZE; px += 5) {
      for (let py = 0; py < CANVAS_SIZE; py += 5) {
        const { x, y } = mapToDomain(px, py);
        const z = fn(x, y);
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    // Colors
    // Charcoal: #111827 -> rgb(17, 24, 39)
    // Bright Teal: #14b8a6 -> rgb(20, 184, 166)
    
    for (let px = 0; px < CANVAS_SIZE; px++) {
      for (let py = 0; py < CANVAS_SIZE; py++) {
        const { x, y } = mapToDomain(px, py);
        const z = fn(x, y);
        
        const normZ = Math.max(0, Math.min(1, (z - minZ) / (maxZ - minZ || 1)));
        
        // Add contour lines
        const contourFreq = funcKey === 'rastrigin' ? 10 : 2;
        const isContour = (z % contourFreq) < (contourFreq * 0.05);
        const intensity = isContour ? 0.7 : 1.0;

        const r = (17 + (20 - 17) * normZ) * intensity;
        const g = (24 + (184 - 24) * normZ) * intensity;
        const b = (39 + (166 - 39) * normZ) * intensity;

        const idx = (py * CANVAS_SIZE + px) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    
    bgCtx.putImageData(imgData, 0, 0);

    // Initial draw to main canvas
    drawMainCanvas([]);
  }, [funcKey]);

  useEffect(() => {
    renderBackground();
  }, [renderBackground]);

  // Draw on main canvas
  const drawMainCanvas = (path: {x: number, y: number}[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !bgCanvasRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw cached background
    ctx.drawImage(bgCanvasRef.current, 0, 0);

    // Draw Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.moveTo(0, CANVAS_SIZE / 2);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
    ctx.stroke();

    if (path.length === 0) return;

    // Draw path
    ctx.beginPath();
    ctx.strokeStyle = '#2dd4bf'; // teal-400
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    path.forEach((pt, i) => {
      const { px, py } = mapToCanvas(pt.x, pt.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw start point
    const startPt = mapToCanvas(path[0].x, path[0].y);
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(startPt.px, startPt.py, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw current point
    const currPt = mapToCanvas(path[path.length - 1].x, path[path.length - 1].y);
    ctx.beginPath();
    ctx.fillStyle = '#14b8a6'; // teal-500
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.arc(currPt.px, currPt.py, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    const { x, y } = mapToDomain(px, py);
    startOptimization(x, y);
  };

  const startOptimization = (startX: number, startY: number) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    
    setIsSimulating(true);
    setCurrentStep(0);
    
    const p = paramsRef.current;
    const fn = FUNCTIONS[p.funcKey].fn;
    
    let currX = startX;
    let currY = startY;
    const path = [{ x: currX, y: currY }];
    
    // Optimizer State
    let m_dx = 0, m_dy = 0; // Momentum
    let v_dx = 0, v_dy = 0; // Adam velocity
    let t = 0;
    const beta1 = p.momentum;
    const beta2 = 0.999;
    const eps = 1e-8;

    const tick = () => {
      const { dx, dy } = computeGradient(currX, currY, fn);
      
      if (p.optKey === 'gd') {
        currX -= p.lr * dx;
        currY -= p.lr * dy;
      } else if (p.optKey === 'momentum') {
        m_dx = beta1 * m_dx - p.lr * dx;
        m_dy = beta1 * m_dy - p.lr * dy;
        currX += m_dx;
        currY += m_dy;
      } else if (p.optKey === 'adam') {
        t++;
        m_dx = beta1 * m_dx + (1 - beta1) * dx;
        m_dy = beta1 * m_dy + (1 - beta1) * dy;
        v_dx = beta2 * v_dx + (1 - beta2) * dx * dx;
        v_dy = beta2 * v_dy + (1 - beta2) * dy * dy;
        
        const m_hat_dx = m_dx / (1 - Math.pow(beta1, t));
        const m_hat_dy = m_dy / (1 - Math.pow(beta1, t));
        const v_hat_dx = v_dx / (1 - Math.pow(beta2, t));
        const v_hat_dy = v_dy / (1 - Math.pow(beta2, t));
        
        currX -= p.lr * m_hat_dx / (Math.sqrt(v_hat_dx) + eps);
        currY -= p.lr * m_hat_dy / (Math.sqrt(v_hat_dy) + eps);
      }

      path.push({ x: currX, y: currY });
      setCurrentStep(path.length);
      drawMainCanvas(path);

      // Stop conditions: diverging, max steps, or converged
      const dist = Math.sqrt(currX * currX + currY * currY);
      const gradMag = Math.sqrt(dx * dx + dy * dy);
      
      if (path.length > 1000 || dist > 20 || gradMag < 1e-4) {
        setIsSimulating(false);
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    tick();
  };

  return (
    <div className="flex h-screen w-full bg-gray-900 text-teal-50 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-gray-800 p-6 flex flex-col gap-8 border-r border-teal-900/50 shadow-2xl z-10">
        <div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 mb-2 tracking-tight">
            Gradient Descent
          </h1>
          <p className="text-sm text-teal-200/60 font-medium">Path Overlay Visualizer</p>
        </div>

        <div className="space-y-6">
          {/* Function Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Landscape</label>
            <div className="flex flex-col gap-2">
              {Object.entries(FUNCTIONS).map(([key, { name }]) => (
                <button
                  key={key}
                  onClick={() => {
                    if (animRef.current) cancelAnimationFrame(animRef.current);
                    setFuncKey(key);
                    setCurrentStep(0);
                  }}
                  className={`px-4 py-2 text-sm text-left rounded-md transition-all duration-200 border ${
                    funcKey === key 
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' 
                      : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-700/50" />

          {/* Optimizer Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Optimizer</label>
            <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700">
              {(['gd', 'momentum', 'adam'] as OptimizerType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setOptKey(type)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    optKey === type 
                      ? 'bg-teal-500 text-gray-900 shadow-md' 
                      : 'text-gray-400 hover:text-teal-200'
                  }`}
                >
                  {type === 'gd' ? 'Vanilla' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Hyperparameters */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Learning Rate</label>
                <span className="text-xs font-mono text-teal-200">{lr.toFixed(3)}</span>
              </div>
              <input 
                type="range" 
                min="0.001" max="0.5" step="0.001" 
                value={lr} 
                onChange={e => setLr(parseFloat(e.target.value))}
                className="w-full accent-teal-500 bg-gray-700 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
            </div>

            {(optKey === 'momentum' || optKey === 'adam') && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                    {optKey === 'adam' ? 'Beta 1