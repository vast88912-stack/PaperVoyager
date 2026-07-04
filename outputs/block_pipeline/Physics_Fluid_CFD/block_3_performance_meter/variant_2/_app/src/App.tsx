import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceStats {
  fps: number;
  avgFps: number;
  low1Percent: number;
  frameTime: number;
  avgFrameTime: number;
  memoryUsage: number | null;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  
  // Throttle React state updates so we don't cause performance issues WITH our performance meter
  const lastStateUpdateTimeRef = useRef<number>(performance.now());
  
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    avgFps: 0,
    low1Percent: 0,
    frameTime: 0,
    avgFrameTime: 0,
    memoryUsage: null,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [showFrameTime, setShowFrameTime] = useState(true);
  const [artificialLoad, setArtificialLoad] = useState(0);

  const MAX_HISTORY = 120; // Keep last 120 frames for the graph

  const drawGraph = useCallback((frameTimes: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (frameTimes.length === 0) return;

    // Draw background grid
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < height; i += 20) {
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
    }
    for (let i = 0; i < width; i += 40) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
    }
    ctx.stroke();

    // 16.6ms target line (60fps)
    const targetY = height - (16.6 / 50) * height; // Assuming max 50ms on graph
    ctx.strokeStyle = '#eab308'; // yellow-500
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw data line
    ctx.beginPath();
    ctx.strokeStyle = showFrameTime ? '#06b6d4' : '#d946ef'; // cyan-500 or fuchsia-500
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    const stepX = width / (MAX_HISTORY - 1);
    
    frameTimes.forEach((time, index) => {
      const x = index * stepX;
      // Map time to height (0-50ms range for frame time, 0-120 range for FPS)
      let normalizedValue;
      if (showFrameTime) {
        normalizedValue = Math.min(time, 50) / 50; 
      } else {
        const fps = time > 0 ? 1000 / time : 0;
        normalizedValue = Math.min(fps, 120) / 120;
      }
      
      const y = height - normalizedValue * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Add glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = showFrameTime ? '#06b6d4' : '#d946ef';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under graph
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = showFrameTime ? 'rgba(6, 182, 212, 0.1)' : 'rgba(217, 70, 239, 0.1)';
    ctx.fill();

  }, [showFrameTime]);

  const updateStats = useCallback((times: number[]) => {
    if (times.length === 0) return;

    const currentFrameTime = times[times.length - 1];
    const currentFps = currentFrameTime > 0 ? 1000 / currentFrameTime : 0;

    const sum = times.reduce((a, b) => a + b, 0);
    const avgFrameTime = sum / times.length;
    const avgFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    // Calculate 1% lows (sort descending frame times, take top 1%)
    const sortedTimes = [...times].sort((a, b) => b - a);
    const onePercentCount = Math.max(1, Math.floor(times.length * 0.01));
    const onePercentSum = sortedTimes.slice(0, onePercentCount).reduce((a, b) => a + b, 0);
    const avgOnePercentTime = onePercentSum / onePercentCount;
    const low1Percent = avgOnePercentTime > 0 ? 1000 / avgOnePercentTime : 0;

    // Try to get memory usage if available (Chrome specific)
    let memoryUsage = null;
    const perf = performance as any;
    if (perf && perf.memory) {
      memoryUsage = perf.memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    setStats({
      fps: Math.round(currentFps),
      avgFps: Math.round(avgFps),
      low1Percent: Math.round(low1Percent),
      frameTime: Number(currentFrameTime.toFixed(1)),
      avgFrameTime: Number(avgFrameTime.toFixed(1)),
      memoryUsage: memoryUsage ? Number(memoryUsage.toFixed(1)) : null,
    });
  }, []);

  const tick = useCallback((time: number) => {
    if (isPaused) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    // Artificial load injection
    if (artificialLoad > 0) {
      const startBlock = performance.now();
      while (performance.now() - startBlock < artificialLoad) {
        // Block main thread
      }
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Push new frame time
    frameTimesRef.current.push(deltaTime);
    if (frameTimesRef.current.length > MAX_HISTORY) {
      frameTimesRef.current.shift();
    }

    // Draw high-frequency graph every frame
    drawGraph(frameTimesRef.current);

    // Update React state at a lower frequency (e.g., 4 times a second)
    if (time - lastStateUpdateTimeRef.current > 250) {
      updateStats(frameTimesRef.current);
      lastStateUpdateTimeRef.current = time;
    }

    requestRef.current = requestAnimationFrame(tick);
  }, [isPaused, artificialLoad, drawGraph, updateStats]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [tick]);

  // Handle canvas resize for sharp rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set actual size in memory (scaled for retina displays)
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }, []);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-mono select-none"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #171717 0%, #0a0a0a 100%)'
      }}
    >
      {/* Main HUD Panel */}
      <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-2xl w-full max-w-lg flex flex-col gap-6 relative overflow-hidden">
        
        {/* Decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-500"></div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'} shadow-[0_0_10px_currentColor]`}></div>
            <h2 className="text-neutral-200 font-bold tracking-widest text-sm uppercase">Fluid Engine Profiler</h2>
          </div>
          <div className="text-xs text-neutral-500 flex gap-2">
            <span>RES: 256x256</span>
            <span>|</span>
            <span>ITER: 40</span>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* FPS Box */}
          <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800/50 flex flex-col justify-center">
            <span className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Current FPS</span>
            <div className={`text-5xl font-black tracking-tighter ${getFpsColor(stats.fps)}`}>
              {stats.fps}
            </div>
            <div className="flex justify-between mt-3 text-xs">
              <span className="text-neutral-400">AVG: <span className="text-neutral-200">{stats.avgFps}</span></span>
              <span className="text-neutral-400">1% LOW: <span className="text-red-400">{stats.low1Percent}</span></span>
            </div>
          </div>

          {/* Frame Time Box */}
          <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800/50 flex flex-col justify-center">
            <span className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Frame Time</span>
            <div className="text-5xl font-black tracking-tighter text-cyan-400 flex items-baseline gap-1">
              {stats.frameTime.toFixed(1)} <span className="text-xl text-cyan-600">ms</span>
            </div>
            <div className="flex justify-between mt-3 text-xs">
              <span className="text-neutral-400">AVG: <span className="text-neutral-200">{stats.avgFrameTime} ms</span></span>
              <span className="text-neutral-400">TARGET: <span className="text-yellow-400">16.6 ms</span></span>
            </div>
          </div>
        </div>

        {/* Graph Section */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Performance Graph</span>
            <div className="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800">
              <button 
                onClick={() => setShowFrameTime(true)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${showFrameTime ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Time (ms)
              </button>
              <button 
                onClick={() => setShowFrameTime(false)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${!showFrameTime ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                FPS
              </button>
            </div>
          </div>
          
          <div className="relative w-full h-32 bg-neutral-950/50 rounded-xl border border-neutral-800/50 overflow-hidden">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full block"
              style={{ width: '100%', height: '100%' }}
            />
            {/* Y-axis labels mock */}
            <div className="absolute left-2 top-2 bottom-2 flex flex-col justify-between text-[10px] text-neutral-600 pointer-events-none">
              <span>{showFrameTime ? '50ms' : '120'}</span>
              <span>{showFrameTime ? '25ms' : '60'}</span>
              <span>0</span>
            </div>
          </div>
        </div>

        {/* System & Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800/50">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-neutral-500 text-[10px] uppercase">Memory Heap</span>
              <span className="text-neutral-300 text-sm">
                {stats.memoryUsage ? `${stats.memoryUsage} MB` : 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500 text-[10px] uppercase">Draw Calls</span>
              <span className="text-neutral-300 text-sm">142</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setArtificialLoad(prev => prev === 0 ? 20 : 0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                artificialLoad > 0 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
              title="Inject 20ms delay per frame to simulate heavy physics load"
            >
              {artificialLoad > 0 ? 'SIMULATING LOAD...' : 'INJECT LOAD'}
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-8 h-8 flex items-center justify-center bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white rounded-lg transition-colors"
            >
              {isPaused ? '▶' : 'II'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}