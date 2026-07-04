import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types & Constants ---
type PerfMetrics = {
  fps: number;
  frameTime: number;
  simTime: number;
};

const MAX_HISTORY = 100;
const TARGET_FPS = 60;

// --- Helper: Color mapping for performance ---
const getPerfColor = (fps: number) => {
  if (fps >= 50) return 'text-green-400';
  if (fps >= 30) return 'text-yellow-400';
  return 'text-red-500';
};

const getPerfStroke = (fps: number) => {
  if (fps >= 50) return '#4ade80';
  if (fps >= 30) return '#facc15';
  return '#ef4444';
};

export default function App() {
  // --- State ---
  const [resolution, setResolution] = useState<number>(128);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [showGraph, setShowGraph] = useState<boolean>(true);
  
  // UI metrics (throttled to avoid React rendering bottlenecking the actual loop)
  const [metrics, setMetrics] = useState<PerfMetrics>({ fps: 60, frameTime: 16.6, simTime: 5 });
  const [fpsHistory, setFpsHistory] = useState<number[]>(Array(MAX_HISTORY).fill(60));

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  
  // Raw history arrays to decouple tracking from rendering
  const rawFpsHistory = useRef<number[]>(Array(MAX_HISTORY).fill(60));

  // --- Artificial "Fluid/Graphics" Load ---
  // We simulate a 2D fluid solver grid overhead using a plasma effect
  const simulateFluidStep = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // Heavy nested loop to simulate grid iterations (stable fluids projection/advection overhead)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Artificial heavy math calculation (sine waves to look like fluid dye)
        const v = Math.sin(x / 10 + time) + Math.sin(y / 10 + time) + Math.sin((x + y) / 10 + time);
        const color = Math.abs(v) * 85; // 0 to ~255
        
        data[index] = color * 0.5;       // R
        data[index + 1] = color * 0.8;   // G
        data[index + 2] = color;         // B
        data[index + 3] = 255;           // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // --- Main Render Loop ---
  const tick = useCallback((time: DOMHighResTimeStamp) => {
    if (!isSimulating) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    
    if (!canvas || !ctx) return;

    // 1. Measure simulation step time
    const simStart = performance.now();
    simulateFluidStep(ctx, resolution, resolution, time * 0.002);
    const simEnd = performance.now();
    const currentSimTime = simEnd - simStart;

    // 2. Measure overall frame time and FPS
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    
    frameCountRef.current++;
    accumulatedTimeRef.current += deltaTime;

    // Update metrics UI 4 times a second
    if (accumulatedTimeRef.current >= 250) {
      const currentFps = Math.min((frameCountRef.current * 1000) / accumulatedTimeRef.current, TARGET_FPS);
      const currentFrameTime = accumulatedTimeRef.current / frameCountRef.current;

      // Update history buffer
      rawFpsHistory.current.push(currentFps);
      if (rawFpsHistory.current.length > MAX_HISTORY) {
        rawFpsHistory.current.shift();
      }

      setMetrics({
        fps: Math.round(currentFps),
        frameTime: currentFrameTime,
        simTime: currentSimTime
      });
      setFpsHistory([...rawFpsHistory.current]);

      frameCountRef.current = 0;
      accumulatedTimeRef.current = 0;
    }

    requestRef.current = requestAnimationFrame(tick);
  }, [resolution, isSimulating]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);

  // --- Component Styling ---
  const sparklinePoints = fpsHistory
    .map((fps, i) => `${(i / MAX_HISTORY) * 100},${100 - (fps / TARGET_FPS) * 100}`)
    .join(' ');

  const currentStroke = getPerfStroke(metrics.fps);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono text-slate-200">
      
      {/* Background Canvas (Simulating fluid solver load) */}
      <canvas
        ref={canvasRef}
        width={resolution}
        height={resolution}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black pointer-events-none opacity-60" 
           style={{ background: 'radial-gradient(circle, transparent 20%, #000 100%)' }} />

      {/* Main Performance Meter Widget */}
      <div className="absolute top-6 right-6 w-80 flex flex-col gap-4">
        
        {/* Header / Title */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase">Perf Meter</h2>
            </div>
            <button 
              onClick={() => setShowGraph(!showGraph)}
              className="text-xs text-slate-400 hover:text-cyan-300 transition-colors bg-slate-800 px-2 py-1 rounded"
            >
              {showGraph ? 'Hide Graph' : 'Show Graph'}
            </button>
          </div>

          {/* Primary Readout */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Current FPS</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-black tabular-nums tracking-tighter ${getPerfColor(metrics.fps)}`}>
                  {metrics.fps}
                </span>
                <span className="text-slate-500 font-bold text-lg">/ 60</span>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400 uppercase">Status</span>
              <div className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${metrics.fps >= 30 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${metrics.fps >= 50 ? 'bg-green-500' : metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              </div>
            </div>
          </div>

          {/* Sparkline Graph */}
          {showGraph && (
            <div className="w-full h-20 bg-slate-950/50 rounded-lg border border-slate-800 p-1 relative overflow-hidden group">
              <div className="absolute top-1 left-2 text-[10px] text-slate-500 z-10">60 FPS</div>
              <div className="absolute bottom-1 left-2 text-[10px] text-slate-500 z-10">0 FPS</div>
              
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 pointer-events-none opacity-20">
                <div className="w-full border-t border-slate-500 border-dashed"></div>
                <div className="w-full border-t border-slate-500 border-dashed"></div>
                <div className="w-full border-t border-slate-500 border-dashed"></div>
              </div>

              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                {/* Fill under line */}
                <polygon 
                  points={`0,100 ${sparklinePoints} 100,100`} 
                  fill={currentStroke} 
                  className="opacity-10"
                />
                {/* Actual line */}
                <polyline
                  points={sparklinePoints}
                  fill="none"
                  stroke={currentStroke}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          )}

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Frame Time
              </span>
              <span className="text-lg font-bold text-slate-200 tabular-nums">
                {metrics.frameTime.toFixed(1)} <span className="text-xs text-slate-500">ms</span>
              </span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                Sim Step
              </span>
              <span className="text-lg font-bold text-slate-200 tabular-nums">
                {metrics.simTime.toFixed(1)} <span className="text-xs text-slate-500">ms</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Control Panel (to induce load) */}
      <div className="absolute top-6 left-6 w-72 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-700/50">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
             <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
           </svg>
           <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase">Sim Controls</h2>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300 tracking-wider">GRID RESOLUTION</label>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-300 font-bold">{resolution}x{resolution}</span>
          </div>
          <input 
            type="range" 
            min="32" 
            max="1024" 
            step="32"
            value={resolution}
            onChange={(e) => setResolution(parseInt(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
          />
          <p className="text-[10px] text-slate-500 leading-tight mt-1">
            Increase to simulate heavy fluid projection calculations. Watch the performance meter react.
          </p>
        </div>

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`mt-2 w-full py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 border ${
            isSimulating 
              ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' 
              : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
          }`}
        >
          {isSimulating ? 'Pause Engine' : 'Resume Engine'}
        </button>
      </div>

    </div>
  );
}