import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Subcomponents ---

// SVG Sparkline Component for visualizing metric history
const Sparkline = ({
  data,
  maxVal,
  color,
  label,
  currentValue,
  unit,
  gradientId
}: {
  data: number[];
  maxVal: number;
  color: string;
  label: string;
  currentValue: string | number;
  unit: string;
  gradientId: string;
}) => {
  const width = 240;
  const height = 48;
  const strokeWidth = 2;

  // Normalize data and build SVG paths
  const pts = data.length > 0 ? data : [0];
  const max = maxVal || Math.max(...pts, 1);
  const pathPoints = pts
    .map((val, i) => {
      const x = (i / (Math.max(pts.length - 1, 1))) * width;
      const y = height - (Math.min(val, max) / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const fillPoints = `0,${height} ${pathPoints} ${width},${height}`;

  return (
    <div className="flex flex-col mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 shadow-inner relative overflow-hidden group hover:border-gray-500 transition-colors">
      <div className="flex justify-between items-end mb-2 relative z-10">
        <span className="text-xs font-bold tracking-widest text-gray-400 group-hover:text-gray-200 transition-colors">
          {label}
        </span>
        <div className="text-right">
          <span className="text-xl font-mono font-bold" style={{ color }}>
            {currentValue}
          </span>
          <span className="text-xs ml-1 text-gray-500 font-mono">{unit}</span>
        </div>
      </div>

      <div className="relative w-full h-12">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20 pointer-events-none">
          <div className="border-t border-dashed border-gray-500 w-full h-px"></div>
          <div className="border-t border-dashed border-gray-500 w-full h-px"></div>
          <div className="border-t border-dashed border-gray-500 w-full h-px"></div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 w-full h-full overflow-visible drop-shadow-md"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polygon points={fillPoints} fill={`url(#${gradientId})`} />
          <polyline
            points={pathPoints}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const MAX_HISTORY = 40;
  
  // State for metrics
  const [fpsData, setFpsData] = useState<number[]>(Array(MAX_HISTORY).fill(60));
  const [msData, setMsData] = useState<number[]>(Array(MAX_HISTORY).fill(16));
  const [memData, setMemData] = useState<number[]>(Array(MAX_HISTORY).fill(0));
  
  // State for interactive sandbox controls
  const [isTracking, setIsTracking] = useState(true);
  const [simulatedLoadLevel, setSimulatedLoadLevel] = useState(0); // 0 = normal, 1 = medium, 2 = heavy
  const [fluidResolution, setFluidResolution] = useState(128);

  // Mutable refs for the RAF loop to avoid dependency cycles
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const loadLevelRef = useRef(simulatedLoadLevel);

  // History buffers
  const fpsBuffer = useRef<number[]>(Array(MAX_HISTORY).fill(60));
  const msBuffer = useRef<number[]>(Array(MAX_HISTORY).fill(16));
  const memBuffer = useRef<number[]>(Array(MAX_HISTORY).fill(0));

  useEffect(() => {
    loadLevelRef.current = simulatedLoadLevel;
  }, [simulatedLoadLevel]);

  const updateBuffers = (fps: number, ms: number, mem: number) => {
    fpsBuffer.current.push(fps);
    if (fpsBuffer.current.length > MAX_HISTORY) fpsBuffer.current.shift();

    msBuffer.current.push(ms);
    if (msBuffer.current.length > MAX_HISTORY) msBuffer.current.shift();

    memBuffer.current.push(mem);
    if (memBuffer.current.length > MAX_HISTORY) memBuffer.current.shift();

    setFpsData([...fpsBuffer.current]);
    setMsData([...msBuffer.current]);
    setMemData([...memBuffer.current]);
  };

  const loop = useCallback((time: number) => {
    if (!isTracking) {
      requestRef.current = requestAnimationFrame(loop);
      return;
    }

    // Frame Time Calculation (MS)
    const ms = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // --- Artificial Load Simulation (mocking fluid solver math) ---
    if (loadLevelRef.current > 0) {
      const iterations = loadLevelRef.current === 1 ? 2000000 : 8000000;
      let dummy = 0;
      for (let i = 0; i < iterations; i++) {
        dummy += Math.sqrt(i) * Math.sin(i);
      }
      // Prevent optimizer from removing the loop
      if (dummy === 0) console.log(dummy);
    }
    // --------------------------------------------------------------

    // FPS Calculation (update every 250ms for stable reading)
    framesRef.current++;
    if (time - lastFpsTimeRef.current >= 250) {
      const elapsed = time - lastFpsTimeRef.current;
      const currentFps = (framesRef.current * 1000) / elapsed;
      
      // Memory Calculation (if supported)
      const performanceObj = performance as any;
      const memoryUsed = performanceObj.memory 
        ? performanceObj.memory.usedJSHeapSize / 1048576 
        : Math.random() * 20 + 40; // fallback mock data

      updateBuffers(currentFps, ms, memoryUsed);

      framesRef.current = 0;
      lastFpsTimeRef.current = time;
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [isTracking]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  // Derived current metrics
  const currentFps = fpsData[fpsData.length - 1] || 0;
  const currentMs = msData[msData.length - 1] || 0;
  const currentMem = memData[memData.length - 1] || 0;

  // Dynamic colors based on performance
  const getFpsColor = (fps: number) => (fps >= 50 ? '#10B981' : fps >= 30 ? '#F59E0B' : '#EF4444');
  const getMsColor = (ms: number) => (ms <= 16.7 ? '#3B82F6' : ms <= 33.3 ? '#F59E0B' : '#EF4444');
  const getMemColor = (mem: number) => (mem < 80 ? '#8B5CF6' : mem < 150 ? '#F59E0B' : '#EF4444');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Mock Fluid Sandbox Background (Visual flair) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950"></div>
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '4s' }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '7s' }}
        ></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Side: Mock Controls for Sandbox */}
        <div className="flex-1 w-full bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
          <div className="mb-6 border-b border-slate-700 pb-4">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              2D Fluid Sandbox
            </h1>
            <p className="text-slate-400 text-sm mt-1">Diagnostics & Performance Benchmarking</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Solver Stress Test
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Idle', level: 0 },
                  { label: 'Vortex Street', level: 1 },
                  { label: 'Turbulence', level: 2 }
                ].map(mode => (
                  <button
                    key={mode.label}
                    onClick={() => setSimulatedLoadLevel(mode.level)}
                    className={`py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                      simulatedLoadLevel === mode.level
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid Resolution
              </h3>
              <input 
                type="range" 
                min="64" 
                max="512" 
                step="64"
                value={fluidResolution}
                onChange={(e) => setFluidResolution(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>64x64</span>
                <span className="text-indigo-300 font-bold">{fluidResolution} x {fluidResolution}</span>
                <span>512x512</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Performance Meter HUD */}
        <div className="w-full md:w-[320px] bg-black/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Sys_Metrics</h2>
            </div>
            <button 
              onClick={() => setIsTracking(!isTracking)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors border border-slate-700"
            >
              {isTracking ? 'PAUSE' : 'RESUME'}
            </button>
          </div>

          {/* Metrics Body */}
          <div className="p-4 flex-1">
            <Sparkline 
              label="FRAMES PER SEC" 
              data={fpsData} 
              maxVal={75} 
              color={getFpsColor(currentFps)} 
              currentValue={currentFps.toFixed(1)} 
              unit="FPS" 
              gradientId="grad-fps"
            />
            
            <Sparkline 
              label="FRAME TIME" 
              data={msData} 
              maxVal={60} 
              color={getMsColor(currentMs)} 
              currentValue={currentMs.toFixed(1)} 
              unit="MS" 
              gradientId="grad-ms"
            />
            
            <Sparkline 
              label="HEAP MEMORY" 
              data={memData} 
              maxVal={200} 
              color={getMemColor(currentMem)} 
              currentValue={currentMem.toFixed(1)} 
              unit="MB" 
              gradientId="grad-mem"
            />

            {/* Hardware / Engine Stats Footer */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Cells Active</p>
                <p className="text-sm font-mono text-slate-300">{(fluidResolution * fluidResolution).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Renderer</p>
                <p className="text-sm font-mono text-slate-300">Canvas2D</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}