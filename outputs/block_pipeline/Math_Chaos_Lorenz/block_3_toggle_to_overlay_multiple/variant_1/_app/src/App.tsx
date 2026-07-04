import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Settings2, RefreshCw, Layers, Info } from 'lucide-react';

// --- Math & Physics Constants ---
const DT = 0.003;
const STEPS_PER_FRAME = 6;
const SCALE = 14;
const ROTATION_SPEED = 0.001;

// Colors for the midnight palette glow trails
const TRAJECTORY_COLORS = [
  '#00f3ff', // Neon Cyan
  '#ff00ea', // Neon Magenta
  '#ffb300', // Neon Yellow
  '#00ff66', // Neon Green
  '#ff3333', // Neon Red
];

// Tiny perturbations for the butterfly effect (10^-4)
const PERTURBATIONS = [0, 0.0001, -0.0001, 0.0002, -0.0002];

// --- Types ---
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Trajectory {
  current: Point3D;
  color: string;
}

interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
}

// --- RK4 Integrator ---
const rk4Step = (p: Point3D, params: LorenzParams, dt: number): Point3D => {
  const { sigma: s, rho: r, beta: b } = params;
  
  const dx1 = s * (p.y - p.x);
  const dy1 = p.x * (r - p.z) - p.y;
  const dz1 = p.x * p.y - b * p.z;

  const x2 = p.x + 0.5 * dt * dx1;
  const y2 = p.y + 0.5 * dt * dy1;
  const z2 = p.z + 0.5 * dt * dz1;
  const dx2 = s * (y2 - x2);
  const dy2 = x2 * (r - z2) - y2;
  const dz2 = x2 * y2 - b * z2;

  const x3 = p.x + 0.5 * dt * dx2;
  const y3 = p.y + 0.5 * dt * dy2;
  const z3 = p.z + 0.5 * dt * dz2;
  const dx3 = s * (y3 - x3);
  const dy3 = x3 * (r - z3) - y3;
  const dz3 = x3 * y3 - b * z3;

  const x4 = p.x + dt * dx3;
  const y4 = p.y + dt * dy3;
  const z4 = p.z + dt * dz3;
  const dx4 = s * (y4 - x4);
  const dy4 = x4 * (r - z4) - y4;
  const dz4 = x4 * y4 - b * z4;

  return {
    x: p.x + (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4),
    y: p.y + (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4),
    z: p.z + (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4),
  };
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const trajectoriesRef = useRef<Trajectory[]>([]);
  const angleRef = useRef<number>(0);

  // --- State ---
  const [params, setParams] = useState<LorenzParams>({ sigma: 10, rho: 28, beta: 2.667 });
  const [multiMode, setMultiMode] = useState<boolean>(false);
  const [isHoveringInfo, setIsHoveringInfo] = useState<boolean>(false);

  // --- Initialization ---
  const initTrajectories = useCallback(() => {
    const basePoint = { x: 0.1, y: 0.1, z: 0.1 };
    const numTraj = multiMode ? 5 : 1;
    
    trajectoriesRef.current = Array.from({ length: numTraj }).map((_, i) => ({
      current: {
        x: basePoint.x + PERTURBATIONS[i],
        y: basePoint.y,
        z: basePoint.z,
      },
      color: TRAJECTORY_COLORS[i],
    }));

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#020617'; // slate-950
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [multiMode]);

  // Reset when params or mode changes
  useEffect(() => {
    initTrajectories();
  }, [params, multiMode, initTrajectories]);

  // --- Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(2, 6, 23, 0.04)'; // slate-950 with opacity
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update rotation angle
      angleRef.current += ROTATION_SPEED;
      const cosA = Math.cos(angleRef.current);
      const sinA = Math.sin(angleRef.current);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 150; // Offset Y to center the attractor (z goes up to ~50)

      // Set blend mode for glowing effect
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < trajectoriesRef.current.length; i++) {
        const traj = trajectoriesRef.current[i];
        
        ctx.beginPath();
        
        // Project initial point
        let rotX = traj.current.x * cosA - traj.current.y * sinA;
        let screenX = cx + rotX * SCALE;
        let screenY = cy - traj.current.z * SCALE;
        ctx.moveTo(screenX, screenY);

        // Perform multiple RK4 steps per frame for speed
        for (let step = 0; step < STEPS_PER_FRAME; step++) {
          traj.current = rk4Step(traj.current, params, DT);
          
          rotX = traj.current.x * cosA - traj.current.y * sinA;
          screenX = cx + rotX * SCALE;
          screenY = cy - traj.current.z * SCALE;
          
          ctx.lineTo(screenX, screenY);
        }

        // Draw trail segment
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = traj.color;
        ctx.stroke();
      }

      // Reset blend mode
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [params]); // Re-bind if params change, though refs handle mutability

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initTrajectories();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    return () => window.removeEventListener('resize', handleResize);
  }, [initTrajectories]);

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* Header / Info */}
      <div className="absolute top-6 left-6 z-10 flex items-start gap-4 pointer-events-none">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-lg tracking-tight">
            Lorenz Attractor
          </h1>
          <p className="text-slate-400 font-medium tracking-wide text-sm mt-1 flex items-center gap-2">
            Perturbation Overlay Module
            <span 
              className="pointer-events-auto cursor-help text-slate-500 hover:text-cyan-400 transition-colors"
              onMouseEnter={() => setIsHoveringInfo(true)}
              onMouseLeave={() => setIsHoveringInfo(false)}
            >
              <Info size={16} />
            </span>
          </p>
        </div>

        {/* Tooltip */}
        <div className={`transition-all duration-300 transform ${isHoveringInfo ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl w-80 pointer-events-none mt-10 ml-[-20px]`}>
          <h3 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
            <Layers size={16} /> The Butterfly Effect
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Toggle "Multiple Trajectories" to spawn 5 points with initial X-coordinates differing by only <span className="text-fuchsia-400 font-mono">0.0001</span>. Watch how deterministic chaos causes them to rapidly diverge over time.
          </p>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-8 items-center justify-between">
          
          {/* Sliders */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Sigma (σ)</span>
                <span className="text-cyan-400">{params.sigma.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1" max="30" step="0.1"
                value={params.sigma}
                onChange={(e) => setParams(p => ({ ...p, sigma: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Rho (ρ)</span>
                <span className="text-fuchsia-400">{params.rho.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1" max="50" step="0.1"
                value={params.rho}
                onChange={(e) => setParams(p => ({ ...p, rho: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Beta (β)</span>
                <span className="text-yellow-400">{params.beta.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.5" max="5" step="0.001"
                value={params.beta}
                onChange={(e) => setParams(p => ({ ...p, beta: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-6 md:pt-0 md:pl-8">
            
            {/* Toggle Multi */}
            <button
              onClick={() => setMultiMode(!multiMode)}
              className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                multiMode ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-slate-800 border border-slate-700'
              }`}
              title="Toggle Multiple Trajectories"
            >
              <div className={`absolute left-1 w-6 h-6 rounded-full transition-transform duration-300 flex items-center justify-center ${
                multiMode ? 'translate-x-6 bg-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.8)]' : 'translate-x-0 bg-slate-400'
              }`}>
                <Layers size={12} className={multiMode ? 'text-slate-900' : 'text-slate-800'} />
              </div>
            </button>
            <span className="text-sm font-medium text-slate-300 hidden md:block w-16 leading-tight">
              {multiMode ? 'Multi Overlay' : 'Single Path'}
            </span>

            {/* Restart */}
            <button
              onClick={initTrajectories}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 hover:border-slate-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 group"
              title="Restart Simulation"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}