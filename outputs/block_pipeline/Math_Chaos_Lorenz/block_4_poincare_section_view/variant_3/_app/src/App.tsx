import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
  zPlane: number;
}

interface SimState {
  x: number;
  y: number;
  z: number;
}

// --- RK4 Math ---
const rk4Step = (
  state: SimState,
  params: LorenzParams,
  dt: number
): SimState => {
  const { x, y, z } = state;
  const { sigma: s, rho: r, beta: b } = params;

  const dx1 = s * (y - x);
  const dy1 = x * (r - z) - y;
  const dz1 = x * y - b * z;

  const x2 = x + 0.5 * dt * dx1;
  const y2 = y + 0.5 * dt * dy1;
  const z2 = z + 0.5 * dt * dz1;

  const dx2 = s * (y2 - x2);
  const dy2 = x2 * (r - z2) - y2;
  const dz2 = x2 * y2 - b * z2;

  const x3 = x + 0.5 * dt * dx2;
  const y3 = y + 0.5 * dt * dy2;
  const z3 = z + 0.5 * dt * dz2;

  const dx3 = s * (y3 - x3);
  const dy3 = x3 * (r - z3) - y3;
  const dz3 = x3 * y3 - b * z3;

  const x4 = x + dt * dx3;
  const y4 = y + dt * dy3;
  const z4 = z + dt * dz3;

  const dx4_ = s * (y4 - x4);
  const dy4_ = x4 * (r - z4) - y4;
  const dz4_ = x4 * y4 - b * z4;

  return {
    x: x + (dt / 6.0) * (dx1 + 2.0 * dx2 + 2.0 * dx3 + dx4_),
    y: y + (dt / 6.0) * (dy1 + 2.0 * dy2 + 2.0 * dy3 + dy4_),
    z: z + (dt / 6.0) * (dz1 + 2.0 * dz2 + 2.0 * dz3 + dz4_),
  };
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Simulation refs to decouple from React rendering cycle for performance
  const sim1Ref = useRef<SimState>({ x: 0.1, y: 0.1, z: 0.1 });
  const sim2Ref = useRef<SimState>({ x: 0.10001, y: 0.1, z: 0.1 }); // Perturbed initial state
  const timeRef = useRef<number>(0);

  const [params, setParams] = useState<LorenzParams>({
    sigma: 10,
    rho: 28,
    beta: 2.6667,
    zPlane: 27,
  });

  const [showPerturbation, setShowPerturbation] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [pointCount, setPointCount] = useState(0);

  // Use a ref for params inside the animation loop to ensure latest values
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const showPertRef = useRef(showPerturbation);
  useEffect(() => {
    showPertRef.current = showPerturbation;
  }, [showPerturbation]);

  // Clear canvas and reset simulation
  const resetSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050510'; // Midnight background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    sim1Ref.current = { x: 0.1, y: 0.1, z: 0.1 };
    sim2Ref.current = { x: 0.10001, y: 0.1, z: 0.1 };
    timeRef.current = 0;
    setPointCount(0);
  }, []);

  // Handle URL parsing on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const s = urlParams.get('s');
    const r = urlParams.get('r');
    const b = urlParams.get('b');
    const z = urlParams.get('z');
    
    if (s || r || b || z) {
      setParams({
        sigma: s ? parseFloat(s) : 10,
        rho: r ? parseFloat(r) : 28,
        beta: b ? parseFloat(b) : 2.6667,
        zPlane: z ? parseFloat(z) : 27,
      });
    }
    resetSimulation();
  }, [resetSimulation]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Initial fill
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const dt = 0.005;
    const stepsPerFrame = 800; // Cap step count for perf
    const scale = Math.min(canvas.width, canvas.height) / 60;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const drawCrossings = (
      oldState: SimState,
      newState: SimState,
      color: string,
      glowColor: string
    ) => {
      const zPlane = paramsRef.current.zPlane;
      // Detect crossing plane from below
      if (oldState.z < zPlane && newState.z >= zPlane) {
        // Linear interpolation for exact crossing point
        const t = (zPlane - oldState.z) / (newState.z - oldState.z);
        const crossX = oldState.x + t * (newState.x - oldState.x);
        const crossY = oldState.y + t * (newState.y - oldState.y);

        // Map to canvas
        const px = cx + crossX * scale;
        const py = cy - crossY * scale; // Invert Y for standard Cartesian

        // Draw point
        ctx.globalCompositeOperation = 'screen';
        
        // Inner core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;

        return true;
      }
      return false;
    };

    let localPointCount = pointCount;

    const animate = () => {
      if (!isSimulating) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      let crossingsFound = 0;

      for (let i = 0; i < stepsPerFrame; i++) {
        // Sim 1 (Primary)
        const nextSim1 = rk4Step(sim1Ref.current, paramsRef.current, dt);
        if (drawCrossings(sim1Ref.current, nextSim1, 'rgba(0, 255, 200, 0.6)', '#00ffc8')) {
          crossingsFound++;
        }
        sim1Ref.current = nextSim1;

        // Sim 2 (Perturbed)
        if (showPertRef.current) {
          const nextSim2 = rk4Step(sim2Ref.current, paramsRef.current, dt);
          drawCrossings(sim2Ref.current, nextSim2, 'rgba(255, 0, 200, 0.4)', '#ff00c8');
          sim2Ref.current = nextSim2;
        }

        timeRef.current += dt;
      }

      if (crossingsFound > 0) {
        localPointCount += crossingsFound;
        setPointCount(localPointCount);
      }

      // Very subtle fade effect to create trails over long periods
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 5, 16, 0.005)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating]); // Re-bind only if simulating state changes

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = canvas?.parentElement;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        resetSimulation();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing
    return () => window.removeEventListener('resize', handleResize);
  }, [resetSimulation]);

  const handleExportURL = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('s', params.sigma.toString());
    url.searchParams.set('r', params.rho.toString());
    url.searchParams.set('b', params.beta.toString());
    url.searchParams.set('z', params.zPlane.toString());
    navigator.clipboard.writeText(url.toString());
    alert('Shareable URL copied to clipboard!');
  };

  return (
    <div className="flex h-screen w-screen bg-[#050510] text-gray-200 font-sans overflow-hidden selection:bg-cyan-900">
      
      {/* Canvas Area */}
      <div className="flex-grow relative">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 cursor-crosshair"
        />
        
        {/* Overlays */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-3xl font-light tracking-wider text-cyan-50">
            Poincaré <span className="text-cyan-400 font-semibold">Section</span>
          </h1>
          <p className="text-sm text-cyan-200/60 mt-1 uppercase tracking-widest">
            Lorenz Attractor Deep Scan
          </p>
          <div className="mt-4 flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00ffc8]" />
             <span className="text-xs font-mono text-cyan-300/80">
               Recording Intersections: {pointCount.toLocaleString()}
             </span>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 pointer-events-none flex gap-6 font-mono text-xs text-gray-500">
           <div>X-AXIS: <span className="text-cyan-600">STATE X</span></div>
           <div>Y-AXIS: <span className="text-cyan-600">STATE Y</span></div>
           <div>SLICE: <span className="text-fuchsia-600">Z = {params.zPlane.toFixed(1)}</span></div>
        </div>
      </div>

      {/* Control Panel (Glassmorphism) */}
      <div className="w-80 lg:w-96 bg-[#0a0d1a]/80 backdrop-blur-xl border-l border-cyan-900/30 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-10 relative">
        
        <div className="p-6 border-b border-cyan-900/30 bg-gradient-to-b from-cyan-950/20 to-transparent">
          <h2 className="text-lg font-medium text-cyan-100 flex items-center justify-between">
            Control Parameters
            <button 
              onClick={handleExportURL}
              className="text-xs px-3 py-1.5 rounded bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 transition-colors border border-cyan-800/50"
              title="Copy URL with current params"
            >
              Export URL
            </button>
          </h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Adjust the Lorenz system parameters and the intersecting Z-plane to reveal hidden chaotic structures.
          </p>
        </div>

        <div className="p-6 space-y-8 flex-grow overflow-y-auto custom-scrollbar">
          
          {/* Sliders */}
          <SliderControl 
            label="Sigma (σ)" value={params.sigma} min={1} max={30} step={0.1}
            onChange={(val) => { setParams(p => ({...p, sigma: val})); resetSimulation(); }}
          />
          <SliderControl 
            label="Rho (ρ)" value={params.rho} min={1} max={100} step={0.1}
            onChange={(val) => { setParams(p => ({...p, rho: val})); resetSimulation(); }}
          />
          <SliderControl 
            label="Beta (β)" value={params.beta} min={0.1} max={10} step={0.01}
            onChange={(val) => { setParams(p => ({...p, beta: val})); resetSimulation(); }}
          />
          
          <div className="h-px bg-cyan-900/30 w-full my-4" />

          <SliderControl 
            label="Z-Plane Slice" value={params.zPlane} min={1} max={60} step={0.5}
            color="fuchsia"
            onChange={(val) => { setParams(p => ({...p, zPlane: val})); resetSimulation(); }}
          />

          {/* Toggles */}
          <div className="pt-4 space-y-4">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-300 group-hover:text-cyan-200 transition-colors">
                Overlay Perturbation (Chaos)
              </span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={showPerturbation}
                  onChange={(e) => setShowPerturbation(e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${showPerturbation ? 'bg-fuchsia-900' : 'bg-gray-800'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showPerturbation ? 'transform translate-x-4 bg-fuchsia-400 shadow-[0_0_8px_#ff00c8]' : 'bg-gray-400'}`}></div>
              </div>
            </label>
            <p className="text-xs text-gray-500 leading-tight">
              Injects a tiny ($10^{-5}$) perturbation to initial conditions, tracing a secondary trajectory (magenta) to visualize sensitivity.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-cyan-900/30 bg-[#080b14] flex gap-3">
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex-1 py-2.5 rounded text-sm font-medium tracking-wide transition-all ${
              isSimulating 
                ? 'bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50' 
                : 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/50'
            }`}
          >
            {isSimulating ? 'PAUSE SCAN' : 'RESUME SCAN'}
          </button>
          <button 
            onClick={resetSimulation}
            className="flex-none px-4 py-2.5 rounded bg-gray-800/50 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-all text-sm font-medium"