import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Activity, Settings2, Info } from 'lucide-react';

// --- Physics Constants & Types ---
const G = 1;
const SOFTENING = 100; // Prevents infinite forces on collision
const TRAIL_LENGTH = 150;

type Body = {
  id: string;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  trail: { x: number; y: number }[];
};

type IntegratorType = 'euler' | 'verlet';

type EnergyStats = {
  kinetic: number;
  potential: number;
  total: number;
  initialTotal: number;
};

// --- Presets ---
const getStableOrbit = (): Body[] => [
  {
    id: 'star',
    mass: 2000,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: '#fbbf24', // Amber-400
    trail: [],
  },
  {
    id: 'planet1',
    mass: 10,
    x: 250,
    y: 0,
    vx: 0,
    vy: 2.828, // sqrt(G * 2000 / 250)
    color: '#38bdf8', // Sky-400
    trail: [],
  },
  {
    id: 'planet2',
    mass: 5,
    x: -400,
    y: 0,
    vx: 0,
    vy: -2.236, // sqrt(G * 2000 / 400)
    color: '#a78bfa', // Violet-400
    trail: [],
  },
];

export default function App() {
  // --- State ---
  const [integrator, setIntegrator] = useState<IntegratorType>('verlet');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [dt, setDt] = useState<number>(0.5);
  const [energy, setEnergy] = useState<EnergyStats>({
    kinetic: 0,
    potential: 0,
    total: 0,
    initialTotal: 0,
  });

  // Refs for animation and physics state to avoid dependency cycles
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>(getStableOrbit());
  const initialEnergySet = useRef<boolean>(false);

  // --- Physics Engine ---

  const computeAccelerations = (bodies: Body[]) => {
    const acc = bodies.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        const f = (G * bodies[i].mass * bodies[j].mass) / (distSq + SOFTENING);

        const fx = f * (dx / dist);
        const fy = f * (dy / dist);

        acc[i].x += fx / bodies[i].mass;
        acc[i].y += fy / bodies[i].mass;
        acc[j].x -= fx / bodies[j].mass;
        acc[j].y -= fy / bodies[j].mass;
      }
    }
    return acc;
  };

  const calculateEnergy = (bodies: Body[]): { kinetic: number; potential: number; total: number } => {
    let kinetic = 0;
    let potential = 0;

    for (let i = 0; i < bodies.length; i++) {
      const vSq = bodies[i].vx ** 2 + bodies[i].vy ** 2;
      kinetic += 0.5 * bodies[i].mass * vSq;

      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        potential -= (G * bodies[i].mass * bodies[j].mass) / dist;
      }
    }
    return { kinetic, potential, total: kinetic + potential };
  };

  const stepPhysics = useCallback(() => {
    const bodies = bodiesRef.current;
    
    // Explicit Euler Integration (Notoriously unstable for orbits, spirals out)
    if (integrator === 'euler') {
      const acc = computeAccelerations(bodies);
      bodies.forEach((b, i) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx += acc[i].x * dt;
        b.vy += acc[i].y * dt;
      });
    } 
    // Velocity Verlet Integration (Symplectic, preserves energy much better)
    else if (integrator === 'verlet') {
      const acc1 = computeAccelerations(bodies);
      bodies.forEach((b, i) => {
        b.x += b.vx * dt + 0.5 * acc1[i].x * dt * dt;
        b.y += b.vy * dt + 0.5 * acc1[i].y * dt * dt;
      });
      
      const acc2 = computeAccelerations(bodies);
      bodies.forEach((b, i) => {
        b.vx += 0.5 * (acc1[i].x + acc2[i].x) * dt;
        b.vy += 0.5 * (acc1[i].y + acc2[i].y) * dt;
      });
    }

    // Update trails
    bodies.forEach((b) => {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > TRAIL_LENGTH) b.trail.shift();
    });

    // Update Energy Stats
    const currentEnergy = calculateEnergy(bodies);
    setEnergy((prev) => {
      if (!initialEnergySet.current) {
        initialEnergySet.current = true;
        return { ...currentEnergy, initialTotal: currentEnergy.total };
      }
      return { ...currentEnergy, initialTotal: prev.initialTotal };
    });

  }, [dt, integrator]);

  // --- Rendering ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw deep space background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center coordinate system
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    const bodies = bodiesRef.current;

    // Draw trails
    bodies.forEach((b) => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      ctx.strokeStyle = b.color + '66'; // 40% opacity
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw bodies
    bodies.forEach((b) => {
      ctx.beginPath();
      // Scale visual radius logarithmically based on mass for aesthetics
      const radius = Math.max(3, Math.log10(b.mass) * 4);
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });

    ctx.restore();
  }, []);

  // --- Animation Loop ---
  const loop = useCallback(() => {
    if (isPlaying) {
      stepPhysics();
    }
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [isPlaying, stepPhysics, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  // --- Window Resize Handling ---
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
        }
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Controls ---
  const resetSimulation = () => {
    bodiesRef.current = getStableOrbit();
    initialEnergySet.current = false;
    if (!isPlaying) {
      draw(); // Force a draw if paused
    }
  };

  // Calculate energy drift percentage
  const drift = energy.initialTotal !== 0 
    ? Math.abs((energy.total - energy.initialTotal) / energy.initialTotal) * 100 
    : 0;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* Simulation Viewport */}
      <div className="relative flex-1 h-full">
        <canvas 
          ref={canvasRef} 
          className="block w-full h-full"
        />
        
        {/* Holographic Overlay Title */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500 uppercase flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            Orbit Playground
          </h1>
          <p className="text-slate-500 mt-1 text-sm uppercase tracking-wider font-semibold">Integrator Engine v1.0</p>
        </div>

        {/* Energy Drift Warning (if high) */}
        {drift > 5 && (
          <div className="absolute top-24 left-6 pointer-events-none animate-pulse">
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-md flex items-center gap-2 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide">HIGH ENERGY DRIFT DETECTED</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel (Right Side) */}
      <div className="w-96 h-full bg-slate-900/80 backdrop-blur-xl border-l border-slate-800 flex flex-col p-6 shadow-2xl z-10 overflow-y-auto">
        
        <div className="flex items-center gap-2 mb-8 text-slate-300">
          <Settings2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold uppercase tracking-wider">Engine Controls</h2>
        </div>

        {/* Integration Method Choice - The Hero Feature */}
        <div className="mb-8">
          <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 block">
            Numerical Integrator
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIntegrator('euler')}
              className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                integrator === 'euler' 
                  ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] text-rose-300' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="font-bold tracking-wide mb-1">Explicit Euler</span>
              <span className="text-[10px] text-center opacity-70">Fast, but drifts outward</span>
            </button>

            <button
              onClick={() => setIntegrator('verlet')}
              className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                integrator === 'verlet' 
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-emerald-300' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="font-bold tracking-wide mb-1">Velocity Verlet</span>
              <span className="text-[10px] text-center opacity-70">Symplectic, preserves energy</span>
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 flex gap-3 items-start">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              {integrator === 'euler' 
                ? "Euler calculates the next position using the current velocity. Over time, errors accumulate rapidly, causing orbits to spiral outwards."
                : "Verlet takes acceleration into account when updating positions, significantly reducing numerical drift and keeping orbits stable."}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mb-8">
          <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 block">
            Simulation State
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <button
              onClick={resetSimulation}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-semibold transition-colors border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              RESET
            </button>
          </div>
        </div>

        {/* Time Step Slider */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs uppercase tracking-widest text-slate-500 font-bold block">
              Time Step (dt)
            </label>
            <span className="text-xs font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded">
              {dt.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={dt}
            onChange={(e) => setDt(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium">
            <span>Precise</span>
            <span>Fast</span>
          </div>
        </div>

        {/* Energy Statistics Monitor */}
        <div className="mt-auto">
          <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 flex justify-between items-center">
            Energy Monitor
            {drift > 1 && (
              <span className={`text-[10px] px-2 py-0.5 rounded ${drift > 5 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                DRIFT: {drift.toFixed(2)}%
              </span>
            )}
          </label>
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-sm shadow-inner relative overflow-hidden">
            {/* Grid lines decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
            
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-500">Kinetic:</span>
                <span className="text-emerald-400">{energy.kinetic.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-500">Potential:</span>
                <span className="text-rose-400">{energy.potential.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400 font-bold">Total (E):</span>
                <span className={`font-bold ${drift > 5 ? 'text-red-500' : 'text-blue-400'}`}>
                  {energy.total.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}