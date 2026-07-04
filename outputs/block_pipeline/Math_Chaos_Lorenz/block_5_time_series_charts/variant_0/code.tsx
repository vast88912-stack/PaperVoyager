import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types & Constants ---
type Point3D = { x: number; y: number; z: number; t: number };
type LorenzParams = { sigma: number; rho: number; beta: number };

const MAX_HISTORY = 600; // Cap step count for performance
const DT = 0.005; // Time step
const STEPS_PER_FRAME = 3; // Speed up simulation

const DEFAULT_PARAMS: LorenzParams = { sigma: 10, rho: 28, beta: 8 / 3 };
const INITIAL_STATE: Point3D = { x: 0.1, y: 0.1, z: 0.1, t: 0 };

// --- RK4 Integrator ---
const rk4Step = (state: Point3D, params: LorenzParams, dt: number): Point3D => {
  const { x, y, z, t } = state;
  const { sigma, rho, beta } = params;

  const dx = (cx: number, cy: number, cz: number) => sigma * (cy - cx);
  const dy = (cx: number, cy: number, cz: number) => cx * (rho - cz) - cy;
  const dz = (cx: number, cy: number, cz: number) => cx * cy - beta * cz;

  const k1x = dx(x, y, z);
  const k1y = dy(x, y, z);
  const k1z = dz(x, y, z);

  const k2x = dx(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z);
  const k2y = dy(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z);
  const k2z = dz(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z);

  const k3x = dx(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z);
  const k3y = dy(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z);
  const k3z = dz(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z);

  const k4x = dx(x + dt * k3x, y + dt * k3y, z + dt * k3z);
  const k4y = dy(x + dt * k3x, y + dt * k3y, z + dt * k3z);
  const k4z = dz(x + dt * k3x, y + dt * k3y, z + dt * k3z);

  return {
    x: x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y: y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
    z: z + (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z),
    t: t + dt,
  };
};

// --- Main Component ---
export default function App() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [params, setParams] = useState<LorenzParams>(DEFAULT_PARAMS);

  // Refs for animation and state to avoid React re-render overhead on every frame
  const requestRef = useRef<number>();
  const stateRef = useRef<Point3D>(INITIAL_STATE);
  const historyRef = useRef<Point3D[]>([]);
  
  // Canvas refs
  const canvasXRef = useRef<HTMLCanvasElement>(null);
  const canvasYRef = useRef<HTMLCanvasElement>(null);
  const canvasZRef = useRef<HTMLCanvasElement>(null);

  // --- Drawing Logic ---
  const drawChart = useCallback((
    canvas: HTMLCanvasElement, 
    data: number[], 
    color: string, 
    minVal: number, 
    maxVal: number,
    label: string
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with slight fade for trail effect (if we weren't redrawing full history)
    // Here we redraw full history for clean resize/pan, so we clear completely
    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < height; i += height / 4) {
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
    }
    for (let i = 0; i < width; i += width / 10) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
    }
    ctx.stroke();

    // Draw Center Line
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.beginPath();
    const zeroY = height - ((0 - minVal) / (maxVal - minVal)) * height;
    if (zeroY > 0 && zeroY < height) {
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
    }

    if (data.length === 0) return;

    // Draw Data Path
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Glow effect
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;

    const stepX = width / MAX_HISTORY;
    
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      // Normalize value to canvas height
      const normalizedY = (val - minVal) / (maxVal - minVal);
      const y = height - normalizedY * height;
      const x = i * stepX + (MAX_HISTORY - data.length) * stepX; // Right-align

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowBlur = 0;
    
    // Draw Label & Current Value
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.font = '14px monospace';
    ctx.fillText(`${label}(t)`, 10, 20);
    
    const currentVal = data[data.length - 1];
    if (currentVal !== undefined) {
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(currentVal.toFixed(3), width - 10, 20);
      ctx.textAlign = 'left'; // reset
    }
  }, []);

  // --- Animation Loop ---
  const animate = useCallback(() => {
    if (!isPlaying) return;

    // Update state multiple times per frame for speed
    let currentState = stateRef.current;
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      currentState = rk4Step(currentState, params, DT);
    }
    stateRef.current = currentState;

    // Update history
    const history = historyRef.current;
    history.push(currentState);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Extract arrays for plotting
    const xData = history.map(p => p.x);
    const yData = history.map(p => p.y);
    const zData = history.map(p => p.z);

    // Render charts
    if (canvasXRef.current) drawChart(canvasXRef.current, xData, '#06b6d4', -30, 30, 'X'); // Cyan
    if (canvasYRef.current) drawChart(canvasYRef.current, yData, '#d946ef', -30, 30, 'Y'); // Fuchsia
    if (canvasZRef.current) drawChart(canvasZRef.current, zData, '#eab308', 0, 60, 'Z');  // Yellow

    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, params, drawChart]);

  // --- Lifecycle ---
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // --- Handlers ---
  const handleReset = () => {
    stateRef.current = INITIAL_STATE;
    historyRef.current = [];
    // Clear canvases immediately
    [canvasXRef, canvasYRef, canvasZRef].forEach(ref => {
      if (ref.current) {
        const ctx = ref.current.getContext('2d');
        ctx?.clearRect(0, 0, ref.current.width, ref.current.height);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-900 selection:text-cyan-50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              Time Series Analysis
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Real-time oscilloscope view of the Lorenz attractor's state variables. 
              Observe the chaotic, non-periodic oscillation and sensitive dependence on initial conditions.
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-300 border ${
                isPlaying 
                  ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-md font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              ↺ Reset
            </button>
          </div>
        </header>

        {/* Main Content - Charts */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* X Chart */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
                X-Axis Trajectory
              </h2>
              <span className="text-xs text-slate-500 font-mono">Range: [-30, 30]</span>
            </div>
            <div className="w-full h-[180px] bg-slate-950 rounded-lg border border-slate-800/80 relative">
              <canvas 
                ref={canvasXRef} 
                width={1000} 
                height={180} 
                className="w-full h-full object-fill"
              />
            </div>
          </div>

          {/* Y Chart */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#d946ef]"></span>
                Y-Axis Trajectory
              </h2>
              <span className="text-xs text-slate-500 font-mono">Range: [-30, 30]</span>
            </div>
            <div className="w-full h-[180px] bg-slate-950 rounded-lg border border-slate-800/80 relative">
              <canvas 
                ref={canvasYRef} 
                width={1000} 
                height={180} 
                className="w-full h-full object-fill"
              />
            </div>
          </div>

          {/* Z Chart */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_#eab308]"></span>
                Z-Axis Trajectory
              </h2>
              <span className="text-xs text-slate-500 font-mono">Range: [0, 60]</span>
            </div>
            <div className="w-full h-[180px] bg-slate-950 rounded-lg border border-slate-800/80 relative">
              <canvas 
                ref={canvasZRef} 
                width={1000} 
                height={180} 
                className="w-full h-full object-fill"
              />
            </div>
          </div>

        </div>

        {/* Footer / Parameter Info */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-400 border-t border-slate-800 pt-6">
          <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 italic">σ (Sigma):</span>
            <span className="font-mono text-slate-200">{params.sigma.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 italic">ρ (Rho):</span>
            <span className="font-mono text-slate-200">{params.rho.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 italic">β (Beta):</span>
            <span className="font-mono text-slate-200">{params.beta.toFixed(2)}</span>
          </div>
          <div className="ml-auto bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 italic">Integration:</span>
            <span className="font-mono text-slate-200">RK4 (dt={DT})</span>
          </div>
        </div>

      </div>
    </div>
  );
}