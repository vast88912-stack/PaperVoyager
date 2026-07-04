import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Math & Simulation Helpers ---

type Point3D = [number, number, number];

const LORENZ_PARAMS = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
};

const SIM_SETTINGS = {
  dt: 0.008,
  maxSteps: 3500,
  baseInit: [0.1, 0.1, 0.1] as Point3D,
  perturbations: [
    [0.10001, 0.1, 0.1] as Point3D, // Tiny X perturbation
    [0.1, 0.10001, 0.1] as Point3D, // Tiny Y perturbation
  ],
};

// Runge-Kutta 4th Order Integration
function rk4Step(
  [x, y, z]: Point3D,
  sigma: number,
  rho: number,
  beta: number,
  dt: number
): Point3D {
  const dx1 = sigma * (y - x);
  const dy1 = x * (rho - z) - y;
  const dz1 = x * y - beta * z;

  const x2 = x + 0.5 * dx1 * dt;
  const y2 = y + 0.5 * dy1 * dt;
  const z2 = z + 0.5 * dz1 * dt;
  const dx2 = sigma * (y2 - x2);
  const dy2 = x2 * (rho - z2) - y2;
  const dz2 = x2 * y2 - beta * z2;

  const x3 = x + 0.5 * dx2 * dt;
  const y3 = y + 0.5 * dy2 * dt;
  const z3 = z + 0.5 * dz2 * dt;
  const dx3 = sigma * (y3 - x3);
  const dy3 = x3 * (rho - z3) - y3;
  const dz3 = x3 * y3 - beta * z3;

  const x4 = x + dx3 * dt;
  const y4 = y + dy3 * dt;
  const z4 = z + dz3 * dt;
  const dx4 = sigma * (y4 - x4);
  const dy4 = x4 * (rho - z4) - y4;
  const dz4 = x4 * y4 - beta * z4;

  return [
    x + (dt / 6.0) * (dx1 + 2 * dx2 + 2 * dx3 + dx4),
    y + (dt / 6.0) * (dy1 + 2 * dy2 + 2 * dy3 + dy4),
    z + (dt / 6.0) * (dz1 + 2 * dz2 + 2 * dz3 + dz4),
  ];
}

function generateTrajectory(initial: Point3D, steps: number): Point3D[] {
  const points: Point3D[] = [initial];
  let current = initial;
  for (let i = 0; i < steps; i++) {
    current = rk4Step(
      current,
      LORENZ_PARAMS.sigma,
      LORENZ_PARAMS.rho,
      LORENZ_PARAMS.beta,
      SIM_SETTINGS.dt
    );
    points.push(current);
  }
  return points;
}

// --- Components ---

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
      enabled ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'bg-slate-700'
    }`}
  >
    <span className="sr-only">Toggle perturbations</span>
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPerturbations, setShowPerturbations] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const rotationRef = useRef(0);

  // Pre-calculate trajectories
  const trajectories = useMemo(() => {
    const base = generateTrajectory(SIM_SETTINGS.baseInit, SIM_SETTINGS.maxSteps);
    const pert1 = generateTrajectory(SIM_SETTINGS.perturbations[0], SIM_SETTINGS.maxSteps);
    const pert2 = generateTrajectory(SIM_SETTINGS.perturbations[1], SIM_SETTINGS.maxSteps);
    return [
      { points: base, color: '#06b6d4', label: 'Base Trajectory' }, // Cyan
      { points: pert1, color: '#ec4899', label: 'Δx₀ = +0.00001' }, // Pink
      { points: pert2, color: '#eab308', label: 'Δy₀ = +0.00001' }, // Yellow
    ];
  }, []);

  // Handle Animation & Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Midnight background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Projection settings
      const scale = Math.min(width, height) / 65;
      const centerX = width / 2;
      const centerY = height / 2 + 100; // Offset for Z axis
      
      // Slow rotation
      rotationRef.current += 0.002;
      const cosT = Math.cos(rotationRef.current);
      const sinT = Math.sin(rotationRef.current);

      const drawTrajectory = (traj: typeof trajectories[0], maxIdx: number) => {
        if (maxIdx <= 0) return;
        
        ctx.beginPath();
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = traj.color;
        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < maxIdx; i++) {
          const [x, y, z] = traj.points[i];
          
          // Rotate around Z axis
          const rotX = x * cosT - y * sinT;
          const rotY = x * sinT + y * cosT;
          
          // Simple isometric-ish projection
          const screenX = centerX + rotX * scale;
          const screenY = centerY - z * scale - rotY * scale * 0.3;

          if (i === 0) {
            ctx.moveTo(screenX, screenY);
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }
        ctx.stroke();
        
        // Reset composite operation for next draws
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
      };

      // Draw active trajectories
      const currentStep = Math.floor(progressRef.current);
      
      // Always draw base
      drawTrajectory(trajectories[0], currentStep);
      
      // Draw perturbations if toggled
      if (showPerturbations) {
        drawTrajectory(trajectories[1], currentStep);
        drawTrajectory(trajectories[2], currentStep);
      }

      // Advance animation
      if (isAnimating) {
        progressRef.current += 12; // Speed of drawing
        if (progressRef.current > SIM_SETTINGS.maxSteps) {
          progressRef.current = SIM_SETTINGS.maxSteps;
          setIsAnimating(false);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [trajectories, showPerturbations, isAnimating]);

  // Reset animation when toggling to show the divergence clearly
  useEffect(() => {
    progressRef.current = 0;
    setIsAnimating(true);
  }, [showPerturbations]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center p-4">
      
      {/* Container */}
      <div className="w-full max-w-5xl bg-slate-900/50 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Controls & Info */}
        <div className="w-full md:w-80 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/80 z-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
              Butterfly Effect
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The Lorenz system is highly sensitive to initial conditions. Even microscopic changes in the starting coordinates lead to vastly different trajectories over time.
            </p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-300">Overlay Perturbations</span>
              <ToggleSwitch enabled={showPerturbations} onChange={setShowPerturbations} />
            </div>
            <p className="text-xs text-slate-500">
              Toggle to simulate two additional trajectories with initial positions shifted by just <code className="text-cyan-400 bg-slate-800 px-1 py-0.5 rounded">0.00001</code>.
            </p>
          </div>

          {/* Legend */}
          <div className="mt-auto space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Active Trajectories</h3>
            {trajectories.map((t, i) => (
              <div 
                key={i} 
                className={`flex items-center space-x-3 transition-opacity duration-300 ${
                  (!showPerturbations && i > 0) ? 'opacity-20 grayscale' : 'opacity-100'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full shadow-lg" 
                  style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }}
                />
                <span className="text-sm font-mono text-slate-300">{t.label}</span>
              </div>
            ))}
          </div>

          {/* Replay Button */}
          <button 
            onClick={() => {
              progressRef.current = 0;
              setIsAnimating(true);
            }}
            className="mt-8 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700 hover:border-slate-600 flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Replay Simulation</span>
          </button>
        </div>

        {/* Right Panel: Canvas */}
        <div className="flex-1 relative min-h-[400px] md:min-h-[600px] bg-[#020617]">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
          
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full cursor-crosshair"
          />

          {/* Overlay Stats */}
          <div className="absolute top-4 right-4 flex space-x-4 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Parameters</div>
              <div className="text-xs font-mono text-cyan-400">
                σ={LORENZ_PARAMS.sigma} ρ={LORENZ_PARAMS.rho} β={(LORENZ_PARAMS.beta).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}