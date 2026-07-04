import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
interface Point {
  t: number;
  x: number;
  y: number;
  z: number;
}

interface Params {
  sigma: number;
  rho: number;
  beta: number;
}

// --- Constants ---
const COLORS = {
  x: '#00f3ff', // Cyan
  y: '#ff00e6', // Magenta
  z: '#39ff14', // Neon Green
  bg: '#05050A',
  grid: '#1e293b',
  panel: '#0f172a'
};

const INITIAL_PARAMS: Params = { sigma: 10, rho: 28, beta: 2.667 };
const INITIAL_STATE = { x: 0.1, y: 0.1, z: 0.1 };
const DT = 0.005;
const STEPS_PER_FRAME = 5;
const MAX_POINTS = 1000;
const TIME_WINDOW = 15; // Represents the visible time span in the charts

// --- Math: RK4 Integrator ---
const lorenzDerivatives = (x: number, y: number, z: number, p: Params) => ({
  dx: p.sigma * (y - x),
  dy: x * (p.rho - z) - y,
  dz: x * y - p.beta * z
});

const stepRK4 = (state: { x: number; y: number; z: number }, p: Params, dt: number) => {
  const { x, y, z } = state;
  const k1 = lorenzDerivatives(x, y, z, p);
  const k2 = lorenzDerivatives(x + 0.5 * dt * k1.dx, y + 0.5 * dt * k1.dy, z + 0.5 * dt * k1.dz, p);
  const k3 = lorenzDerivatives(x + 0.5 * dt * k2.dx, y + 0.5 * dt * k2.dy, z + 0.5 * dt * k2.dz, p);
  const k4 = lorenzDerivatives(x + dt * k3.dx, y + dt * k3.dy, z + dt * k3.dz, p);

  return {
    x: x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    z: z + (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz)
  };
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for UI
  const [params, setParams] = useState<Params>(INITIAL_PARAMS);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Refs for Animation Loop (to avoid stale closures without dependency churn)
  const paramsRef = useRef(params);
  const isPlayingRef = useRef(isPlaying);
  const historyRef = useRef<Point[]>([]);
  const currentStateRef = useRef({ ...INITIAL_STATE, t: 0 });
  const reqRef = useRef<number>();

  // Keep refs in sync with state
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Main simulation and render loop
  const loop = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // 1. Simulation Step
    if (isPlayingRef.current) {
      let { x, y, z, t } = currentStateRef.current;
      
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        const nextState = stepRK4({ x, y, z }, paramsRef.current, DT);
        x = nextState.x;
        y = nextState.y;
        z = nextState.z;
        t += DT;
        
        // Push every step or every N steps to history
        historyRef.current.push({ t, x, y, z });
      }
      
      // Trim history
      const timeThreshold = t - TIME_WINDOW;
      while (historyRef.current.length > 0 && historyRef.current[0].t < timeThreshold) {
        historyRef.current.shift();
      }
      
      currentStateRef.current = { x, y, z, t };
    }

    // 2. Clear Canvas
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // 3. Draw Grid & Tracks
    const trackHeight = height / 3;
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.grid;
    
    // Track Dividers
    ctx.beginPath();
    ctx.moveTo(0, trackHeight);
    ctx.lineTo(width, trackHeight);
    ctx.moveTo(0, trackHeight * 2);
    ctx.lineTo(width, trackHeight * 2);
    ctx.stroke();

    // Time Grid Lines
    const currentT = currentStateRef.current.t;
    const startT = currentT - TIME_WINDOW;
    ctx.beginPath();
    for (let i = Math.ceil(startT); i <= currentT; i++) {
      const px = ((i - startT) / TIME_WINDOW) * width;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
    }
    ctx.stroke();

    // 4. Draw Time Series Lines
    const drawSeries = (
      key: 'x' | 'y' | 'z',
      trackIndex: number,
      color: string,
      minVal: number,
      maxVal: number
    ) => {
      const history = historyRef.current;
      if (history.length < 2) return;

      const trackYOffset = trackIndex * trackHeight;
      const valRange = maxVal - minVal;

      const getX = (t: number) => ((t - startT) / TIME_WINDOW) * width;
      const getY = (val: number) => trackYOffset + trackHeight - ((val - minVal) / valRange) * trackHeight;

      // Render Glow (Outer thick stroke)
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.25;
      ctx.moveTo(getX(history[0].t), getY(history[0][key]));
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(getX(history[i].t), getY(history[i][key]));
      }
      ctx.stroke();

      // Render Core (Inner thin stroke)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 1.0;
      ctx.moveTo(getX(history[0].t), getY(history[0][key]));
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(getX(history[i].t), getY(history[i][key]));
      }
      ctx.stroke();
    };

    // Typical bounding ranges for standard Lorenz
    drawSeries('x', 0, COLORS.x, -25, 25);
    drawSeries('y', 1, COLORS.y, -30, 30);
    drawSeries('z', 2, COLORS.z, 0, 60);

    reqRef.current = requestAnimationFrame(loop);
  }, []);

  // Initialization & Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    reqRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [loop]);

  const handleReset = () => {
    currentStateRef.current = { ...INITIAL_STATE, t: 0 };
    historyRef.current = [];
    setParams(INITIAL_PARAMS);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-300 font-mono overflow-hidden">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-[#0a0f18] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-slate-800 bg-[#0f172a]/50">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            Temporal Studio
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Time Series Oscillations
          </p>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-8 overflow-y-auto">
          {/* Controls */}
          <div className="space-y-6">
            <ControlSlider
              label="Sigma (σ)"
              value={params.sigma}
              min={0} max={30} step={0.1}
              color={COLORS.x}
              onChange={(val) => setParams(p => ({ ...p, sigma: val }))}
              desc="Prandtl number - ratio of momentum to thermal diffusivity."
            />
            
            <ControlSlider
              label="Rho (ρ)"
              value={params.rho}
              min={0} max={60} step={0.1}
              color={COLORS.y}
              onChange={(val) => setParams(p => ({ ...p, rho: val }))}
              desc="Rayleigh number - temperature difference across layer."
            />

            <ControlSlider
              label="Beta (β)"
              value={params.beta}
              min={0} max={10} step={0.01}
              color={COLORS.z}
              onChange={(val) => setParams(p => ({ ...p, beta: val }))}
              desc="Geometric factor of the fluid cell."
            />
          </div>

          <div className="mt-auto space-y-3 pt-6 border-t border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full py-3 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  PAUSE SIMULATION
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  RESUME SIMULATION
                </>
              )}
            </button>
            
            <button
              onClick={handleReset}
              className="w-full py-2 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Reset State
            </button>
          </div>
        </div>
      </aside>

      {/* Main Visualization Area */}
      <main className="flex-1 relative flex flex-col bg-[#05050A]">
        
        {/* Track Overlays */}
        <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
          <TrackOverlay title="X(t) // Rate of Convection" color={COLORS.x} />
          <TrackOverlay title="Y(t) // Temperature Variation" color={COLORS.y} />
          <TrackOverlay title="Z(t) // Vertical Temperature Gradient" color={COLORS.z} />
        </div>

        {/* Canvas Layer */}
        <div className="flex-1 w-full relative">
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full block"
          />
        </div>

        {/* Bottom HUD */}
        <div className="absolute bottom-4 right-6 text-xs text-slate-600 pointer-events-none z-20 flex gap-4">
          <span>RK4 INTEGRATOR</span>
          <span>DT = {DT}</span>
          <span>WINDOW = {TIME_WINDOW}s</span>
        </div>
      </main>
    </div>
  );
}

// --- Subcomponents ---

function ControlSlider({
  label, value, min, max, step, color, onChange, desc
}: {
  label: string; value: number; min: number; max: number; step: number; color: string;
  onChange: (v: number) => void; desc: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-semibold text-slate-300" style={{ color }}>{label}</label>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none"
        style={{
          accentColor: color,
          backgroundImage: `linear-gradient(${color}, ${color})`,
          backgroundSize: `${((value - min) * 100) / (max - min)}% 100%`,
          backgroundRepeat: 'no-repeat'
        }}
      />
      <p className="text-[10px] text-slate-500 leading-tight mt-1">{desc}</p>
    </div>
  );
}

function TrackOverlay({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex-1 relative border-b border-slate-800/50 last:border-b-0">
      <div className="absolute top-4 left-6 flex items-center gap-3 bg-[#05050A]/60 px-3 py-1.5 rounded backdrop-blur-sm border border-slate-800/80">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="text-xs font-bold tracking-widest uppercase text-slate-200" style={{ textShadow: `0 0 10px ${color}80` }}>
          {title}
        </span>
      </div>
      {/* Minimal grid labels */}
      <div className="absolute right-4 top-4 text-[10px] text-slate-600 font-mono">MAX</div>
      <div className="absolute right-4 bottom-4 text-[10px] text-slate-600 font-mono">MIN</div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-700 font-mono">0</div>
    </div>
  );
}