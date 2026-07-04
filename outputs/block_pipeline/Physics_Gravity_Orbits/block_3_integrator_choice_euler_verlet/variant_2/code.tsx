import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types & Interfaces ---
type Vector2D = { x: number; y: number };

interface Body {
  id: string;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  trail: Vector2D[];
}

type IntegratorType = 'euler' | 'verlet';

interface PhysicsConfig {
  G: number;
  dt: number;
  softening: number;
  mergeCollisions: boolean;
  integrator: IntegratorType;
}

interface SystemStats {
  ke: number;
  pe: number;
  te: number;
  px: number;
  py: number;
}

// --- Constants & Helpers ---
const COLORS = ['#00F0FF', '#FF003C', '#FFE600', '#00FF66', '#B000FF', '#FF8A00'];
const MAX_TRAIL = 150;

const generateId = () => Math.random().toString(36).substr(2, 9);
const calcRadius = (mass: number) => Math.max(2, Math.sqrt(mass) * 1.5);

const PRESETS = {
  twoBody: [
    { id: '1', mass: 1000, x: 0, y: 0, vx: 0, vy: -0.5, color: '#FFE600', radius: calcRadius(1000), trail: [] },
    { id: '2', mass: 100, x: 200, y: 0, vx: 0, vy: 2.5, color: '#00F0FF', radius: calcRadius(100), trail: [] },
  ],
  figure8: [
    { id: '1', mass: 100, x: 97.0, y: -24.3, vx: 0.466, vy: 0.432, color: '#FF003C', radius: calcRadius(100), trail: [] },
    { id: '2', mass: 100, x: -97.0, y: 24.3, vx: 0.466, vy: 0.432, color: '#00F0FF', radius: calcRadius(100), trail: [] },
    { id: '3', mass: 100, x: 0, y: 0, vx: -0.932, vy: -0.864, color: '#00FF66', radius: calcRadius(100), trail: [] },
  ],
  swarm: Array.from({ length: 30 }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 300;
    const speed = Math.sqrt(1000 / dist);
    return {
      id: generateId(),
      mass: Math.random() * 10 + 1,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.2,
      vy: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.2,
      color: COLORS[i % COLORS.length],
      radius: calcRadius(Math.random() * 10 + 1),
      trail: []
    };
  }).concat([{ id: 'core', mass: 2000, x: 0, y: 0, vx: 0, vy: 0, color: '#FFFFFF', radius: calcRadius(2000), trail: [] }])
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Physics State (Refs for performance in animation loop)
  const bodiesRef = useRef<Body[]>([]);
  const configRef = useRef<PhysicsConfig>({
    G: 1,
    dt: 0.2,
    softening: 0.1,
    mergeCollisions: true,
    integrator: 'verlet'
  });
  
  // UI State
  const [integrator, setIntegrator] = useState<IntegratorType>('verlet');
  const [isRunning, setIsRunning] = useState(true);
  const [stats, setStats] = useState<SystemStats>({ ke: 0, pe: 0, te: 0, px: 0, py: 0 });
  const [timeSteps, setTimeSteps] = useState(0);

  // --- Physics Engine Core ---
  const calculateAccelerations = (bodies: Body[], G: number, softening: number) => {
    const accels = bodies.map(() => ({ ax: 0, ay: 0 }));
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distSq = dx * dx + dy * dy + softening;
        const dist = Math.sqrt(distSq);
        const f = G / distSq;
        
        const ax_i = f * bodies[j].mass * (dx / dist);
        const ay_i = f * bodies[j].mass * (dy / dist);
        const ax_j = f * bodies[i].mass * (-dx / dist);
        const ay_j = f * bodies[i].mass * (-dy / dist);

        accels[i].ax += ax_i;
        accels[i].ay += ay_i;
        accels[j].ax += ax_j;
        accels[j].ay += ay_j;
      }
    }
    return accels;
  };

  const handleCollisions = (bodies: Body[], mergeCollisions: boolean): Body[] => {
    if (!mergeCollisions) return bodies;
    const toRemove = new Set<string>();
    const newBodies = [...bodies];

    for (let i = 0; i < newBodies.length; i++) {
      if (toRemove.has(newBodies[i].id)) continue;
      for (let j = i + 1; j < newBodies.length; j++) {
        if (toRemove.has(newBodies[j].id)) continue;
        
        const b1 = newBodies[i];
        const b2 = newBodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < b1.radius + b2.radius) {
          // Merge
          const totalMass = b1.mass + b2.mass;
          b1.x = (b1.x * b1.mass + b2.x * b2.mass) / totalMass;
          b1.y = (b1.y * b1.mass + b2.y * b2.mass) / totalMass;
          b1.vx = (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass;
          b1.vy = (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass;
          b1.mass = totalMass;
          b1.radius = calcRadius(totalMass);
          // Keep b1's color and trail
          toRemove.add(b2.id);
        }
      }
    }
    return newBodies.filter(b => !toRemove.has(b.id));
  };

  const calculateStats = (bodies: Body[], G: number) => {
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const v2 = b.vx * b.vx + b.vy * b.vy;
      ke += 0.5 * b.mass * v2;
      px += b.mass * b.vx;
      py += b.mass * b.vy;

      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        const dx = b.x - b2.x;
        const dy = b.y - b2.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        pe -= (G * b.mass * b2.mass) / dist;
      }
    }
    return { ke, pe, te: ke + pe, px, py };
  };

  const updatePhysics = useCallback(() => {
    if (!isRunning) return;
    
    const config = configRef.current;
    let bodies = bodiesRef.current;
    
    if (bodies.length === 0) return;

    // 1. Integrator Step
    if (config.integrator === 'euler') {
      // Forward Euler (Simple, but gains energy over time)
      const accels = calculateAccelerations(bodies, config.G, config.softening);
      bodies.forEach((b, i) => {
        b.vx += accels[i].ax * config.dt;
        b.vy += accels[i].ay * config.dt;
        b.x += b.vx * config.dt;
        b.y += b.vy * config.dt;
      });
    } else {
      // Velocity Verlet (Symplectic, conserves energy better)
      const accels1 = calculateAccelerations(bodies, config.G, config.softening);
      
      // Update position and half-step velocity
      bodies.forEach((b, i) => {
        b.x += b.vx * config.dt + 0.5 * accels1[i].ax * config.dt * config.dt;
        b.y += b.vy * config.dt + 0.5 * accels1[i].ay * config.dt * config.dt;
        b.vx += 0.5 * accels1[i].ax * config.dt;
        b.vy += 0.5 * accels1[i].ay * config.dt;
      });

      // Update acceleration with new positions
      const accels2 = calculateAccelerations(bodies, config.G, config.softening);
      
      // Finish velocity step
      bodies.forEach((b, i) => {
        b.vx += 0.5 * accels2[i].ax * config.dt;
        b.vy += 0.5 * accels2[i].ay * config.dt;
      });
    }

    // 2. Trail Update
    bodies.forEach(b => {
      if (timeSteps % 3 === 0) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > MAX_TRAIL) {
          b.trail.shift();
        }
      }
    });

    // 3. Collisions
    bodiesRef.current = handleCollisions(bodies, config.mergeCollisions);

    // 4. Stats Update (Throttle UI updates)
    setTimeSteps(prev => {
      const next = prev + 1;
      if (next % 10 === 0) {
        setStats(calculateStats(bodiesRef.current, config.G));
      }
      return next;
    });

  }, [isRunning, timeSteps]);

  // --- Render Loop ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with trailing effect
    ctx.fillStyle = 'rgba(5, 5, 10, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw trails
    bodiesRef.current.forEach(b => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      ctx.strokeStyle = `${b.color}40`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw bodies
    bodiesRef.current.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });

    ctx.restore();
  }, []);

  // --- Main Loop ---
  useEffect(() => {
    let animationId: number;
    const loop = () => {
      updatePhysics();
      render();
      animationId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationId);
  }, [updatePhysics, render]);

  // --- Resize Handler ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Actions ---
  const loadPreset = (presetName: keyof typeof PRESETS) => {
    // Deep copy preset
    bodiesRef.current = JSON.parse(JSON.stringify(PRESETS[presetName]));
    setTimeSteps(0);
    setStats(calculateStats(bodiesRef.current, configRef.current.G));
  };

  const handleIntegratorChange = (type: IntegratorType) => {
    setIntegrator(type);
    configRef.current.integrator = type;
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bodiesRef.current));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "orbit_preset.json");
    dlAnchorElem.click();
  };

  // Load initial preset
  useEffect(() => {
    loadPreset('figure8');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#05050A] overflow-hidden font-sans select-none">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 block" />

      {/* UI Overlay */}
      <div className="absolute top-0 right-0 h-full w-96 p-6 z-10 pointer-events-none flex flex-col justify-start">
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl pointer-events-auto text-slate-200 flex flex-col gap-6">
          
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
              Orbit Playground
            </h1>
            <p className="text-xs text-slate-400 mt-1">N-Body Gravity Simulator</p>
          </div>

          {/* Integrator Choice Module */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
              Integrator Choice
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30">
                Core Physics
              </span>
            </h2>
            
            <div className="flex bg-black/40 p-1 rounded-lg mb-3">
              <button
                onClick={() => handleIntegratorChange('euler')}
                className={`flex-1 text-xs py-2 rounded-md transition-all ${
                  integrator === 'euler' 
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-300 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Forward Euler
              </button>
              <button
                onClick={() => handleIntegratorChange('verlet')}
                className={`flex-1 text-xs py-2 rounded-md transition-all ${
                  integrator === 'verlet' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Velocity Verlet
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400 min-h-[40px]">
              {integrator === 'euler' 
                ? "Euler is simple but not symplectic. It accumulates error, causing stable orbits to gain energy and spiral outward over time."
                : "Verlet is symplectic. It conserves energy far better, making it ideal for simulating stable, long-term orbital mechanics."}
            </p>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Presets</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => loadPreset('twoBody')} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded py-2 transition-colors">
                Binary
              </button>
              <button onClick={() => loadPreset('figure8')} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded py-2 transition-colors">
                Figure-8
              </button>
              <button onClick={() => loadPreset('swarm')} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded py-2 transition-colors">
                Swarm
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              *Try Figure-8 with Euler to see immediate instability.
            </p>
          </div>

          {/* Stats Panel */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 font-mono text-[11px]">
            <h3 className="text-xs font-semibold text-slate-400 font-sans uppercase tracking-wider mb-2">System Analytics</h3>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Kinetic Energy</span>
              <span className="text-cyan-400">{stats.ke.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Potential Energy</span>
              <span className="text-pink-400">{stats.pe.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-white/10 mt-1">
              <span className="text-slate-300">Total Energy</span>
              <span className={`${Math.abs(stats.te - stats.ke - stats.pe) > 100 ? 'text-red-400' : 'text-emerald-400'} font-bold`}>
                {stats.te.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-slate-500">
              <span>Momentum (X)</span>
              <span>{stats.px.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Momentum (Y)</span>
              <span>{stats.py.toFixed(3)}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-500">
              <span>Bodies</span>
              <span>{bodiesRef.current.length}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {isRunning ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={exportJSON}
              className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Export JSON
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}