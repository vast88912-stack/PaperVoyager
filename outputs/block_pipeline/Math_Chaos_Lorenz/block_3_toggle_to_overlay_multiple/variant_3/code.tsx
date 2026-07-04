import React, { useState, useEffect, useRef } from 'react';

// --- Math & RK4 Integration ---

const SIGMA = 10.0;
const BETA = 8.0 / 3.0;
const BASE_RHO = 28.0;
const DT = 0.005;
const MAX_STEPS = 8000;
const STEPS_PER_FRAME = 15; // Speed up animation

// The Lorenz system equations
function lorenzDerivatives(x: number, y: number, z: number, sigma: number, rho: number, beta: number) {
  return [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z
  ];
}

// 4th Order Runge-Kutta Integrator
function stepRK4(state: [number, number, number], sigma: number, rho: number, beta: number, dt: number): [number, number, number] {
  const [x, y, z] = state;
  const [k1x, k1y, k1z] = lorenzDerivatives(x, y, z, sigma, rho, beta);
  const [k2x, k2y, k2z] = lorenzDerivatives(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z, sigma, rho, beta);
  const [k3x, k3y, k3z] = lorenzDerivatives(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z, sigma, rho, beta);
  const [k4x, k4y, k4z] = lorenzDerivatives(x + dt * k3x, y + dt * k3y, z + dt * k3z, sigma, rho, beta);

  return [
    x + (dt / 6.0) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6.0) * (k1y + 2 * k2y + 2 * k3y + k4y),
    z + (dt / 6.0) * (k1z + 2 * k2z + 2 * k3z + k4z)
  ];
}

// Simple 3D to 2D isometric-ish projection
function project3D(x: number, y: number, z: number, width: number, height: number) {
  const scale = Math.min(width, height) / 80;
  
  // Rotate around Z and X for a pleasing view angle
  const angle = Math.PI / 4;
  const rx = x * Math.cos(angle) - y * Math.sin(angle);
  const ry = x * Math.sin(angle) + y * Math.cos(angle);
  
  // Flatten to 2D
  const screenX = width / 2 + rx * scale;
  const screenY = height / 2 + (50 - z - ry * 0.3) * scale * 0.8; 

  return { cx: screenX, cy: screenY };
}


// --- React Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showMultiple, setShowMultiple] = useState(false);
  const [simulationId, setSimulationId] = useState(0);

  // Restart simulation when toggle changes
  useEffect(() => {
    setSimulationId(prev => prev + 1);
  }, [showMultiple]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#020617'; // tailwind slate-950
    ctx.fillRect(0, 0, width, height);

    // Setup rendering style
    ctx.globalCompositeOperation = 'screen';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Initial conditions
    const startState: [number, number, number] = [0.1, 0, 0];

    // Define trajectories: [state, rho_param, color, width]
    const trajectories = [
      { state: [...startState] as [number, number, number], rho: BASE_RHO, color: '#38bdf8', prev: null as any } // Sky blue (Base)
    ];

    if (showMultiple) {
      // Add perturbed trajectories (tiny changes to Rho)
      trajectories.push({ state: [...startState] as [number, number, number], rho: BASE_RHO + 0.001, color: '#f472b6', prev: null as any }); // Pink
      trajectories.push({ state: [...startState] as [number, number, number], rho: BASE_RHO - 0.001, color: '#a3e635', prev: null as any }); // Lime
      trajectories.push({ state: [...startState] as [number, number, number], rho: BASE_RHO + 0.002, color: '#fbbf24', prev: null as any }); // Amber
    }

    let currentStep = 0;
    let animationFrameId: number;

    const renderLoop = () => {
      if (currentStep >= MAX_STEPS) return;

      // Draw multiple steps per frame to speed up visuals
      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        if (currentStep >= MAX_STEPS) break;

        // Slight fade effect over time to create glowing trails
        if (currentStep % 50 === 0) {
           ctx.globalCompositeOperation = 'source-over';
           ctx.fillStyle = 'rgba(2, 6, 23, 0.01)'; // Very faint slate-950
           ctx.fillRect(0, 0, width, height);
           ctx.globalCompositeOperation = 'screen';
        }

        trajectories.forEach(t => {
          const nextState = stepRK4(t.state, SIGMA, t.rho, BETA, DT);
          const proj = project3D(nextState[0], nextState[1], nextState[2], width, height);

          if (t.prev) {
            ctx.beginPath();
            ctx.moveTo(t.prev.cx, t.prev.cy);
            ctx.lineTo(proj.cx, proj.cy);
            ctx.strokeStyle = t.color;
            ctx.lineWidth = showMultiple ? 1.2 : 1.5;
            
            // Add glow
            ctx.shadowBlur = 8;
            ctx.shadowColor = t.color;
            
            ctx.stroke();
          }

          t.prev = proj;
          t.state = nextState;
        });

        currentStep++;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [simulationId, showMultiple]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Canvas Container */}
      <div className="w-full max-w-5xl aspect-video relative rounded-2xl border border-slate-800/50 shadow-2xl shadow-black/50 overflow-hidden bg-slate-950 z-10">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        />
        
        {/* Overlay Data Readout */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Lorenz System <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">RK4</span>
          </h2>
          <div className="mt-2 font-mono text-xs text-slate-400 space-y-1">
            <p>σ (Prandtl) = {SIGMA.toFixed(2)}</p>
            <p>β = {(8/3).toFixed(3)}</p>
            <p>ρ (Rayleigh) = {BASE_RHO.toFixed(3)} {showMultiple && <span className="text-pink-400 ml-1">± 0.001</span>}</p>
          </div>
        </div>

      </div>

      {/* Specific Module: The Toggle Panel */}
      <div className="mt-8 z-20 w-full max-w-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        
        {/* Decorative corner accent */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br transition-colors duration-700 blur-[50px] opacity-20 ${showMultiple ? 'from-pink-500 to-amber-500' : 'from-sky-500 to-indigo-500'}`} />

        <div className="flex items-center justify-between gap-8 relative z-10">
          
          {/* Module Description */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              Parameter Sensitivity
              {showMultiple && (
                <span className="flex h-2 w-2 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {showMultiple 
                ? "Multiple trajectories are now running. Notice how a tiny parameter perturbation (Δρ = 0.001) causes paths to exponentially diverge over time, demonstrating the Butterfly Effect."
                : "Currently showing a single deterministic trajectory. Toggle to overlay multiple variations with microscopic differences in the ρ parameter."}
            </p>
          </div>

          {/* Interactive Toggle Switch */}
          <button 
            onClick={() => setShowMultiple(!showMultiple)}
            className="flex-shrink-0 flex items-center justify-center focus:outline-none group/btn"
            aria-pressed={showMultiple}
          >
            <div className={`relative w-16 h-8 rounded-full transition-colors duration-300 ease-in-out border border-slate-700/50 shadow-inner ${showMultiple ? 'bg-indigo-600' : 'bg-slate-800'}`}>
              <div 
                className={`absolute left-1 top-1 w-6 h-6 rounded-full transition-transform duration-300 ease-spring shadow-md flex items-center justify-center ${
                  showMultiple 
                    ? 'translate-x-8 bg-white' 
                    : 'translate-x-0 bg-slate-400'
                }`}
              >
                {/* Micro-icon inside the toggle knob */}
                {showMultiple ? (
                   <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                )}
              </div>
            </div>
            <span className="sr-only">Toggle multiple trajectories</span>
          </button>

        </div>

        {/* Legend (conditionally rendered) */}
        <div className={`mt-4 grid grid-cols-4 gap-2 text-xs font-mono transition-all duration-500 overflow-hidden ${showMultiple ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
              <span className="text-slate-300">Base</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-[#f472b6] shadow-[0_0_8px_#f472b6]" />
              <span className="text-slate-300">+0.001</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]" />
              <span className="text-slate-300">+0.002</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_#a3e635]" />
              <span className="text-slate-300">-0.001</span>
            </div>
        </div>
      </div>
    </div>
  );
}