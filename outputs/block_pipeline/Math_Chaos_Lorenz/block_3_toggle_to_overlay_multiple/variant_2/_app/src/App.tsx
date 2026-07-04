import React, { useEffect, useRef, useState, useMemo } from 'react';

// --- Types & Constants ---
type Point3D = { x: number; y: number; z: number };

const LORENZ_PARAMS = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
};

const SIMULATION_STEPS = 6000;
const DT = 0.008;

// Colors for the trajectories
const COLORS = [
  { hex: '#00f3ff', rgb: '0, 243, 255', name: 'Base Trajectory' },
  { hex: '#ff003c', rgb: '255, 0, 60', name: 'Δρ = +0.01' },
  { hex: '#b026ff', rgb: '176, 38, 255', name: 'Δρ = -0.01' },
  { hex: '#00ff88', rgb: '0, 255, 136', name: 'Δρ = +0.02' },
];

// --- Math & Simulation Helpers ---

// Runge-Kutta 4th Order Integrator
const computeTrajectory = (
  x0: number,
  y0: number,
  z0: number,
  sigma: number,
  rho: number,
  beta: number,
  steps: number,
  dt: number
): Point3D[] => {
  const pts: Point3D[] = new Array(steps);
  let x = x0,
    y = y0,
    z = z0;

  for (let i = 0; i < steps; i++) {
    pts[i] = { x, y, z };

    const dx1 = sigma * (y - x);
    const dy1 = x * (rho - z) - y;
    const dz1 = x * y - beta * z;

    const x2 = x + (dx1 * dt) / 2;
    const y2 = y + (dy1 * dt) / 2;
    const z2 = z + (dz1 * dt) / 2;

    const dx2 = sigma * (y2 - x2);
    const dy2 = x2 * (rho - z2) - y2;
    const dz2 = x2 * y2 - beta * z2;

    const x3 = x + (dx2 * dt) / 2;
    const y3 = y + (dy2 * dt) / 2;
    const z3 = z + (dz2 * dt) / 2;

    const dx3 = sigma * (y3 - x3);
    const dy3 = x3 * (rho - z3) - y3;
    const dz3 = x3 * y3 - beta * z3;

    const x4 = x + dx3 * dt;
    const y4 = y + dy3 * dt;
    const z4 = z + dz3 * dt;

    const dx4 = sigma * (y4 - x4);
    const dy4 = x4 * (rho - z4) - y4;
    const dz4 = x4 * y4 - beta * z4;

    x += ((dx1 + 2 * dx2 + 2 * dx3 + dx4) * dt) / 6;
    y += ((dy1 + 2 * dy2 + 2 * dy3 + dy4) * dt) / 6;
    z += ((dz1 + 2 * dz2 + 2 * dz3 + dz4) * dt) / 6;
  }
  return pts;
};

// 3D to 2D Projection
const project = (
  p: Point3D,
  width: number,
  height: number,
  time: number
): { x: number; y: number } => {
  const scale = Math.min(width, height) / 70;
  
  // Slowly rotating camera
  const angleY = time * 0.0002;
  const angleX = 0.3; // Fixed slight tilt

  // Rotate Y
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  // Rotate X
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const y1 = p.y * cosX - z1 * sinX;

  // Center on screen (Lorenz Z is roughly 0 to 50, so offset it)
  return {
    x: width / 2 + x1 * scale,
    y: height / 2 + (y1 - 25) * scale * -1,
  };
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(false);
  const [progress, setProgress] = useState(0);

  // Precompute trajectories
  const trajectories = useMemo(() => {
    const base = computeTrajectory(
      0.1, 0, 0,
      LORENZ_PARAMS.sigma, LORENZ_PARAMS.rho, LORENZ_PARAMS.beta,
      SIMULATION_STEPS, DT
    );
    
    if (!isOverlayEnabled) return [base];

    // Perturbations in parameter Rho to demonstrate chaos/butterfly effect
    const p1 = computeTrajectory(0.1, 0, 0, LORENZ_PARAMS.sigma, LORENZ_PARAMS.rho + 0.01, LORENZ_PARAMS.beta, SIMULATION_STEPS, DT);
    const p2 = computeTrajectory(0.1, 0, 0, LORENZ_PARAMS.sigma, LORENZ_PARAMS.rho - 0.01, LORENZ_PARAMS.beta, SIMULATION_STEPS, DT);
    const p3 = computeTrajectory(0.1, 0, 0, LORENZ_PARAMS.sigma, LORENZ_PARAMS.rho + 0.02, LORENZ_PARAMS.beta, SIMULATION_STEPS, DT);

    return [base, p1, p2, p3];
  }, [isOverlayEnabled]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = performance.now();
    let drawnSteps = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = (time: number) => {
      const elapsed = time - startTime;
      
      // Reveal more of the trajectory over time
      drawnSteps = Math.min(SIMULATION_STEPS, Math.floor(elapsed * 0.5));
      setProgress(Math.floor((drawnSteps / SIMULATION_STEPS) * 100));

      const { width, height } = canvas;

      // Dark midnight background
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw each active trajectory
      trajectories.forEach((traj, tIndex) => {
        const color = COLORS[tIndex];
        
        ctx.beginPath();
        for (let i = 0; i < drawnSteps; i++) {
          const pt = project(traj[i], width, height, time);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }

        // Core line
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${color.rgb}, 0.8)`;
        ctx.stroke();

        // Glow effect
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(${color.rgb}, 0.15)`;
        ctx.stroke();
      });

      // Draw the leading points (the "particles")
      trajectories.forEach((traj, tIndex) => {
        if (drawnSteps === 0) return;
        const color = COLORS[tIndex];
        const pt = project(traj[drawnSteps - 1], width, height, time);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.rgb}, 0.5)`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [trajectories]);

  // Restart animation when toggled
  const handleToggle = () => {
    setIsOverlayEnabled(!isOverlayEnabled);
    setProgress(0); // Optional: resets visual cue, useEffect restarts time implicitly
  };

  return (
    <div className="relative w-full h-screen bg-[#050608] overflow-hidden font-sans text-slate-200">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Header Overlay */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1 drop-shadow-lg">
          Lorenz Attractor
        </h1>
        <p className="text-sm text-cyan-400/80 font-mono tracking-wider uppercase">
          Sensitivity & Divergence Module
        </p>
      </div>

      {/* Control Panel (Bottom Center) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
        <div className="bg-[#0b0f19]/80 backdrop-blur-xl border border-[#1e293b] rounded-2xl p-6 shadow-[0_0_40px_rgba(0,243,255,0.05)] flex flex-col gap-6">
          
          {/* Module Description */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Parameter Perturbations</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Observe the butterfly effect. Toggling the overlay introduces microscopic variations (Δρ = ±0.01) to the base system parameters. Watch how seemingly identical initial states diverge into entirely chaotic, unpredictable paths over time.
            </p>
          </div>

          {/* Custom Toggle Switch */}
          <button
            onClick={handleToggle}
            className="group relative flex items-center justify-between w-full bg-[#131b2c] border border-[#2a3a5a] rounded-xl p-3 cursor-pointer transition-all hover:border-cyan-500/50"
          >
            <div className="flex flex-col items-start">
              <span className={`text-sm font-bold transition-colors ${isOverlayEnabled ? 'text-cyan-400' : 'text-slate-300'}`}>
                Overlay Perturbations
              </span>
              <span className="text-xs text-slate-500 font-mono mt-0.5">
                {isOverlayEnabled ? '4 Active Trajectories' : '1 Active Trajectory'}
              </span>
            </div>

            {/* Switch UI */}
            <div className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${isOverlayEnabled ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'bg-slate-800'}`}>
              <div className={`w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${isOverlayEnabled ? 'translate-x-7 bg-cyan-400' : 'translate-x-0 bg-slate-400'}`} />
            </div>
          </button>

          {/* Legend & Progress */}
          <div className={`transition-all duration-500 overflow-hidden flex flex-col gap-3 ${isOverlayEnabled ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {COLORS.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: c.hex, boxShadow: `0 0 8px ${c.hex}` }} />
                  <span className="text-xs font-mono text-slate-300">{c.name}</span>
                </div>
              ))}
            </div>
            
            <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden mt-2 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              <span>Time: t=0</span>
              <span>t={SIMULATION_STEPS * DT}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}