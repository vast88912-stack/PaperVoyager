import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types & Interfaces ---
type Vector2 = { x: number; y: number };

interface Body {
  id: string;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  mass: number;
  radius: number;
  color: string;
  trail: Vector2[];
}

interface SystemMetrics {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentumX: number;
  momentumY: number;
  totalMomentum: number;
  energyError: number;
}

// --- Constants ---
const G = 0.5; // Gravitational constant for the simulation
const SOFTENING = 2.0; // Prevents infinite forces on close approaches
const TRAIL_LENGTH = 100;
const DT = 0.1;
const SUB_STEPS = 4; // Multiple steps per frame for better energy conservation

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateMetrics = (bodies: Body[], initialEnergy: number | null): SystemMetrics => {
  let ke = 0;
  let pe = 0;
  let px = 0;
  let py = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b1 = bodies[i];
    const speedSq = b1.vel.x * b1.vel.x + b1.vel.y * b1.vel.y;
    ke += 0.5 * b1.mass * speedSq;
    px += b1.mass * b1.vel.x;
    py += b1.mass * b1.vel.y;

    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];
      const dx = b2.pos.x - b1.pos.x;
      const dy = b2.pos.y - b1.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pe -= (G * b1.mass * b2.mass) / Math.sqrt(dist * dist + SOFTENING * SOFTENING);
    }
  }

  const totalEnergy = ke + pe;
  const totalMomentum = Math.sqrt(px * px + py * py);
  
  let energyError = 0;
  if (initialEnergy !== null && initialEnergy !== 0) {
    energyError = Math.abs((totalEnergy - initialEnergy) / initialEnergy) * 100;
  }

  return {
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalEnergy,
    momentumX: px,
    momentumY: py,
    totalMomentum,
    energyError,
  };
};

// --- Presets ---
const PRESETS = {
  twoBody: (): Body[] => [
    { id: generateId(), pos: { x: 400, y: 300 }, vel: { x: 0, y: 1.5 }, acc: { x: 0, y: 0 }, mass: 1000, radius: 15, color: '#facc15', trail: [] },
    { id: generateId(), pos: { x: 600, y: 300 }, vel: { x: 0, y: -7.5 }, acc: { x: 0, y: 0 }, mass: 200, radius: 8, color: '#38bdf8', trail: [] },
  ],
  figure8: (): Body[] => {
    // Classic stable 3-body figure-8
    const p = 0.347111;
    const v = 0.532728;
    const mass = 500;
    return [
      { id: generateId(), pos: { x: 500 + 200 * p, y: 300 + 200 * p }, vel: { x: -v * 3, y: -v * 3 }, acc: { x: 0, y: 0 }, mass, radius: 10, color: '#fb7185', trail: [] },
      { id: generateId(), pos: { x: 500 - 200 * p, y: 300 - 200 * p }, vel: { x: -v * 3, y: -v * 3 }, acc: { x: 0, y: 0 }, mass, radius: 10, color: '#34d399', trail: [] },
      { id: generateId(), pos: { x: 500, y: 300 }, vel: { x: 2 * v * 3, y: 2 * v * 3 }, acc: { x: 0, y: 0 }, mass, radius: 10, color: '#818cf8', trail: [] },
    ];
  },
  galaxy: (): Body[] => {
    const bodies: Body[] = [];
    // Supermassive black hole
    bodies.push({ id: generateId(), pos: { x: 500, y: 300 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 5000, radius: 20, color: '#ffffff', trail: [] });
    
    // Stars
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 300;
      const speed = Math.sqrt((G * 5000) / dist);
      bodies.push({
        id: generateId(),
        pos: { x: 500 + Math.cos(angle) * dist, y: 300 + Math.sin(angle) * dist },
        vel: { x: -Math.sin(angle) * speed, y: Math.cos(angle) * speed },
        acc: { x: 0, y: 0 },
        mass: 1 + Math.random() * 5,
        radius: 2,
        color: `hsl(${Math.random() * 60 + 200}, 80%, 70%)`,
        trail: []
      });
    }
    return bodies;
  }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Physics state (kept in refs for performance, avoiding React re-renders on every frame)
  const bodiesRef = useRef<Body[]>(PRESETS.figure8());
  const initialEnergyRef = useRef<number | null>(null);
  
  // UI State
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(true);

  // Initialize initial energy for error tracking
  useEffect(() => {
    const initialMetrics = calculateMetrics(bodiesRef.current, null);
    initialEnergyRef.current = initialMetrics.totalEnergy;
  }, []);

  // --- Physics Engine (Velocity Verlet Integrator) ---
  const computeAccelerations = useCallback((bodies: Body[]) => {
    // Reset accelerations
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].acc.x = 0;
      bodies[i].acc.y = 0;
    }

    // Compute pairwise forces
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];
        
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        const forceMag = (G * b1.mass * b2.mass) / (distSq + SOFTENING * SOFTENING);
        const fx = forceMag * (dx / dist);
        const fy = forceMag * (dy / dist);

        b1.acc.x += fx / b1.mass;
        b1.acc.y += fy / b1.mass;
        b2.acc.x -= fx / b2.mass;
        b2.acc.y -= fy / b2.mass;
      }
    }
  }, []);

  const updatePhysics = useCallback(() => {
    const bodies = bodiesRef.current;
    const dt = DT / SUB_STEPS;

    for (let step = 0; step < SUB_STEPS; step++) {
      // 1. Update positions and half-step velocities
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.pos.x += b.vel.x * dt + 0.5 * b.acc.x * dt * dt;
        b.pos.y += b.vel.y * dt + 0.5 * b.acc.y * dt * dt;
        b.vel.x += 0.5 * b.acc.x * dt;
        b.vel.y += 0.5 * b.acc.y * dt;
      }

      // 2. Compute new accelerations based on new positions
      computeAccelerations(bodies);

      // 3. Complete velocity step
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.vel.x += 0.5 * b.acc.x * dt;
        b.vel.y += 0.5 * b.acc.y * dt;
      }
    }

    // Update trails occasionally
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (Math.random() < 0.2) {
        b.trail.push({ x: b.pos.x, y: b.pos.y });
        if (b.trail.length > TRAIL_LENGTH) {
          b.trail.shift();
        }
      }
    }
  }, [computeAccelerations]);

  // --- Render Loop ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background with slight opacity for starfield depth
    ctx.fillStyle = '#020617'; // tailwind slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bodies = bodiesRef.current;

    // Draw Trails
    bodies.forEach(b => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      ctx.strokeStyle = b.color + '66'; // 40% opacity
      ctx.lineWidth = Math.max(1, b.radius / 3);
      ctx.stroke();
    });

    // Draw Bodies
    bodies.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      
      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });

  }, []);

  // --- Main Loop ---
  const tick = useCallback(() => {
    if (isRunning) {
      updatePhysics();
    }
    render();
    
    // Throttle UI updates to ~10fps for readability
    if (Math.random() < 0.15) {
       setMetrics(calculateMetrics(bodiesRef.current, initialEnergyRef.current));
    }

    requestRef.current = requestAnimationFrame(tick);
  }, [isRunning, updatePhysics, render]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [tick]);

  // --- Handlers ---
  const loadPreset = (presetName: keyof typeof PRESETS) => {
    bodiesRef.current = PRESETS[presetName]();
    computeAccelerations(bodiesRef.current);
    const initialM = calculateMetrics(bodiesRef.current, null);
    initialEnergyRef.current = initialM.totalEnergy;
    setMetrics(initialM);
  };

  // --- Formatting Helpers ---
  const formatSci = (num: number) => {
    if (Math.abs(num) < 0.001 && num !== 0) return '0.00e+0';
    return num.toExponential(2).replace('e', ' x 10^');
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'contrast(1.1)' }}
      />

      {/* Top Header */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-sm">
            Orbit Playground
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide mt-1">N-Body Symplectic Integrator</p>
        </div>
      </div>

      {/* Left Control Panel */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-4 pointer-events-auto">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Simulation Controls</h2>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isRunning 
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
              }`}
            >
              {isRunning ? 'PAUSE' : 'RESUME'}
            </button>
          </div>

          <div className="h-px w-full bg-slate-700/50 my-1" />
          
          <div className="flex flex-col gap-2">
            <button onClick={() => loadPreset('twoBody')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-left transition-colors border border-slate-700/50">
              Binary System
            </button>
            <button onClick={() => loadPreset('figure8')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-left transition-colors border border-slate-700/50">
              Figure-8 (Stable 3-Body)
            </button>
            <button onClick={() => loadPreset('galaxy')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-left transition-colors border border-slate-700/50">
              Galactic Swirl (150+ Bodies)
            </button>
          </div>
        </div>
      </div>

      {/* Right HUD: Energy & Momentum Totals (FOCUS AREA) */}
      <div className="absolute top-6 right-6 w-80 pointer-events-auto">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 p-5 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col gap-5">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Conservation HUD
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRunning ? 'bg-cyan-400' : 'bg-slate-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-cyan-500' : 'bg-slate-500'}`}></span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">{isRunning ? 'Live' : 'Halted'}</span>
            </div>
          </div>

          {metrics ? (
            <div className="flex flex-col gap-6">
              
              {/* Energy Section */}
              <div className="space-y-3">
                <h3 className="text-[10px] text-slate-500 font-bold tracking-widest border-b border-slate-700/50 pb-1">System Energy (Joules)</h3>
                
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400">Kinetic (T)</span>
                  <span className="font-mono text-emerald-400 text-sm">{formatSci(metrics.kineticEnergy)}</span>
                </div>
                
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400">Potential (V)</span>
                  <span className="font-mono text-rose-400 text-sm">{formatSci(metrics.potentialEnergy)}</span>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  {/* Visual representation of T vs V ratio */}
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300" 
                    style={{ width: `${(metrics.kineticEnergy / (metrics.kineticEnergy + Math.abs(metrics.potentialEnergy))) * 100}%` }}
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all duration-300" 
                    style={{ width: `${(Math.abs(metrics.potentialEnergy) / (metrics.kineticEnergy + Math.abs(metrics.potentialEnergy))) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Total Energy (E)</span>
                  <span className="font-mono font-bold text-cyan-300 text-base">{formatSci(metrics.totalEnergy)}</span>
                </div>

                {/* Energy Drift Indicator */}
                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Integrator Drift</span>
                  <span className={`font-mono text-[11px] ${metrics.energyError < 1 ? 'text-emerald-500' : metrics.energyError < 5 ? 'text-yellow-500' : 'text-rose-500'}`}>
                    Δ {metrics.energyError.toFixed(4)}%
                  </span>
                </div>
              </div>

              {/* Momentum Section */}
              <div className="space-y-3">
                <h3 className="text-[10px] text-slate-500 font-bold tracking-widest border-b border-slate-700/50 pb-1">Linear Momentum (kg·m/s)</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                    <span className="block text-[10px] text-slate-400 mb-1">P_x</span>
                    <span className="font-mono text-xs text-slate-200">{formatSci(metrics.momentumX)}</span>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/30">
                    <span className="block text-[10px] text-slate-400 mb-1">P_y</span>
                    <span className="font-mono text-xs text-slate-200">{formatSci(metrics.momentumY)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-1">
                  <span className="text-xs font-bold text-slate-300">Total |P|</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">{formatSci(metrics.totalMomentum)}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <span className="text-slate-500 text-sm animate-pulse">Calculating tensors...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}