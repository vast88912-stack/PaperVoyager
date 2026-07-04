import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Math & Simulation Logic ---

interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
}

interface Point2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// RK4 Integrator for Lorenz System
const lorenzDerivative = (x: number, y: number, z: number, params: LorenzParams) => {
  return {
    dx: params.sigma * (y - x),
    dy: x * (params.rho - z) - y,
    dz: x * y - params.beta * z,
  };
};

const rk4Step = (x: number, y: number, z: number, dt: number, params: LorenzParams) => {
  const k1 = lorenzDerivative(x, y, z, params);
  
  const x2 = x + 0.5 * dt * k1.dx;
  const y2 = y + 0.5 * dt * k1.dy;
  const z2 = z + 0.5 * dt * k1.dz;
  const k2 = lorenzDerivative(x2, y2, z2, params);
  
  const x3 = x + 0.5 * dt * k2.dx;
  const y3 = y + 0.5 * dt * k2.dy;
  const z3 = z + 0.5 * dt * k2.dz;
  const k3 = lorenzDerivative(x3, y3, z3, params);
  
  const x4 = x + dt * k3.dx;
  const y4 = y + dt * k3.dy;
  const z4 = z + dt * k3.dz;
  const k4 = lorenzDerivative(x4, y4, z4, params);
  
  return {
    x: x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    z: z + (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz),
  };
};

// --- Components ---

const Slider = ({ label, value, min, max, step, onChange }: any) => (
  <div className="flex flex-col space-y-1 mb-4">
    <div className="flex justify-between text-xs font-medium text-cyan-300">
      <span>{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
    />
  </div>
);

export default function App() {
  // Parse URL params for initial state
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { s: 10, r: 28, b: 2.667, z: 27 };
    const sp = new URLSearchParams(window.location.search);
    return {
      s: parseFloat(sp.get('s') || '10'),
      r: parseFloat(sp.get('r') || '28'),
      b: parseFloat(sp.get('b') || '2.667'),
      z: parseFloat(sp.get('z') || '27'),
    };
  };

  const init = getInitialParams();
  const [sigma, setSigma] = useState(init.s);
  const [rho, setRho] = useState(init.r);
  const [beta, setBeta] = useState(init.b);
  const [planeZ, setPlaneZ] = useState(init.z);
  
  const [pointCount, setPointCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>();
  const simState = useRef({ x: 1, y: 1, z: 1, points: [] as Point2D[] });

  // Reset simulation when parameters change
  useEffect(() => {
    simState.current = { x: 1, y: 1, z: 1, points: [] };
    setPointCount(0);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [sigma, rho, beta, planeZ]);

  // Main Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Fill background
    if (simState.current.points.length === 0) {
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const dt = 0.005;
    const stepsPerFrame = 2500;
    const maxPoints = 50000;

    const scale = Math.min(canvas.width, canvas.height) / 60;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const drawPoints = (newPoints: Point2D[]) => {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      newPoints.forEach((p) => {
        const px = cx + p.x * scale;
        // Invert Y so positive is up
        const py = cy - p.y * scale;

        // Dynamic coloring based on velocity across the plane
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const hue = 180 + Math.min(speed * 2, 120); // Cyan to purple

        ctx.beginPath();
        ctx.arc(px, py, 0.8, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.6)`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.fill();
      });
      
      ctx.restore();
    };

    const loop = () => {
      if (simState.current.points.length >= maxPoints) {
        reqRef.current = requestAnimationFrame(loop);
        return;
      }

      let { x, y, z } = simState.current;
      const params = { sigma, rho, beta };
      const newIntersections: Point2D[] = [];

      for (let i = 0; i < stepsPerFrame; i++) {
        const next = rk4Step(x, y, z, dt, params);
        
        // Detect crossing of the plane Z = planeZ
        // We look for crossings in one direction (e.g., negative to positive relative to plane)
        // to get a clean, single-sided Poincare section.
        if (z < planeZ && next.z >= planeZ) {
          // Linear interpolation to find exact crossing coordinates
          const fraction = (planeZ - z) / (next.z - z);
          const crossX = x + fraction * (next.x - x);
          const crossY = y + fraction * (next.y - y);
          
          const derivs = lorenzDerivative(crossX, crossY, planeZ, params);

          newIntersections.push({
            x: crossX,
            y: crossY,
            vx: derivs.dx,
            vy: derivs.dy
          });
        }
        
        x = next.x;
        y = next.y;
        z = next.z;
      }

      simState.current.x = x;
      simState.current.y = y;
      simState.current.z = z;

      if (newIntersections.length > 0) {
        simState.current.points.push(...newIntersections);
        setPointCount(simState.current.points.length);
        drawPoints(newIntersections);
      }

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [sigma, rho, beta, planeZ]);

  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('s', sigma.toString());
    url.searchParams.set('r', rho.toString());
    url.searchParams.set('b', beta.toString());
    url.searchParams.set('z', planeZ.toString());
    window.history.replaceState({}, '', url.toString());
    
    navigator.clipboard.writeText(url.toString());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [sigma, rho, beta, planeZ]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-900 overflow-hidden flex flex-col md:flex-row">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 p-6 flex flex-col z-10 shadow-2xl relative">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400 mb-2 tracking-tight">
            Poincaré Section
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Visualizing the intersection of the chaotic Lorenz attractor trajectories with a chosen 2D plane.
          </p>
        </div>

        <div className="flex-1 space-y-6">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 shadow-inner">
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-semibold">System Parameters</h2>
            <Slider label="Sigma (σ)" value={sigma} min={1} max={30} step={0.1} onChange={setSigma} />
            <Slider label="Rho (ρ)" value={rho} min={1} max={100} step={0.1} onChange={setRho} />
            <Slider label="Beta (β)" value={beta} min={0.1} max={10} step={0.01} onChange={setBeta} />
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 shadow-inner">
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-semibold">Intersection Plane</h2>
            <Slider label="Z-Plane" value={planeZ} min={0} max={60} step={0.5} onChange={setPlaneZ} />
            <div className="mt-2 text-xs text-slate-500 flex justify-between">
              <span>Standard: Z = ρ - 1</span>
              <button 
                onClick={() => setPlaneZ(rho - 1)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Set Default
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button 
            onClick={handleShare}
            className="w-full py-3 px-4 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center space-x-2"
          >
            {isCopied ? (
              <span>Copied to Clipboard!</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                <span>Share Parameters</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 relative flex items-center justify-center p-4 min-h-[50vh]">
        {/* HUD Elements */}
        <div className="absolute top-6 right-6 z-10 flex flex-col items-end pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Fractal Intersections</span>
              <span className="text-xl font-mono text-cyan-300 tabular-nums">
                {pointCount > 49900 ? "50,000 MAX" : pointCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Axis Labels (Visual flair) */}
        <div className="absolute bottom-6 right-6 z-10 text-xs font-mono text-slate-500 pointer-events-none flex space-x-4">
          <div className="flex items-center space-x-1"><span className="w-3 h-[1px] bg-slate-500"></span><span>X-Axis</span></div>
          <div className="flex items-center space-x-1"><span className="w-[1px] h-3 bg-slate-500"></span><span>Y-Axis</span></div>
        </div>

        <div className="relative w-full h-full max-w-[800px] max-h-[800px] aspect-square rounded-2xl overflow-hidden border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#020617]">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          
          <canvas
            ref={canvasRef}
            width={1600}
            height={1600}
            className="w-full h-full object-contain"
          />
        </div>
      </main>
    </div>
  );
}