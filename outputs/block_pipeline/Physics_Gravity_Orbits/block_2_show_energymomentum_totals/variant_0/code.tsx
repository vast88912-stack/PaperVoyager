import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
interface Vector2 {
  x: number;
  y: number;
}

interface Body {
  id: string;
  mass: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  color: string;
  radius: number;
  trail: Vector2[];
}

interface Metrics {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentumX: number;
  momentumY: number;
  totalMomentum: number;
  angularMomentum: number;
}

// --- Constants ---
const G = 1000; // Gravitational constant (scaled for visual simulation)
const DT = 0.015; // Time step
const TRAIL_LENGTH = 100;
const METRICS_UPDATE_INTERVAL = 5; // Update React state every N frames

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateDistance = (p1: Vector2, p2: Vector2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const calculateMetrics = (bodies: Body[]): Metrics => {
  let ke = 0;
  let pe = 0;
  let px = 0;
  let py = 0;
  let l = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b1 = bodies[i];
    const v2 = b1.vel.x * b1.vel.x + b1.vel.y * b1.vel.y;
    
    // Kinetic Energy: 1/2 m v^2
    ke += 0.5 * b1.mass * v2;
    
    // Linear Momentum: m * v
    px += b1.mass * b1.vel.x;
    py += b1.mass * b1.vel.y;

    // Angular Momentum: r x p = m * (x*vy - y*vx)
    // Relative to origin (0,0) which we'll set as center of screen later, 
    // but for absolute metrics, using raw coordinates is fine.
    l += b1.mass * (b1.pos.x * b1.vel.y - b1.pos.y * b1.vel.x);

    // Potential Energy: -G * m1 * m2 / r
    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];
      const dist = calculateDistance(b1.pos, b2.pos);
      if (dist > 0.1) { // Avoid division by zero
        pe -= (G * b1.mass * b2.mass) / dist;
      }
    }
  }

  return {
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalEnergy: ke + pe,
    momentumX: px,
    momentumY: py,
    totalMomentum: Math.sqrt(px * px + py * py),
    angularMomentum: l,
  };
};

// --- Presets ---
const PRESETS = {
  figure8: (width: number, height: number): Body[] => {
    const cx = width / 2;
    const cy = height / 2;
    const scale = 150;
    const m = 100;
    const vScale = 100;

    return [
      {
        id: generateId(),
        mass: m,
        pos: { x: cx + 0.97000436 * scale, y: cy + -0.24308753 * scale },
        vel: { x: 0.466203685 * vScale, y: 0.43236573 * vScale },
        acc: { x: 0, y: 0 },
        color: '#3b82f6', // blue-500
        radius: 8,
        trail: [],
      },
      {
        id: generateId(),
        mass: m,
        pos: { x: cx + -0.97000436 * scale, y: cy + 0.24308753 * scale },
        vel: { x: 0.466203685 * vScale, y: 0.43236573 * vScale },
        acc: { x: 0, y: 0 },
        color: '#ef4444', // red-500
        radius: 8,
        trail: [],
      },
      {
        id: generateId(),
        mass: m,
        pos: { x: cx, y: cy },
        vel: { x: -2 * 0.466203685 * vScale, y: -2 * 0.43236573 * vScale },
        acc: { x: 0, y: 0 },
        color: '#eab308', // yellow-500
        radius: 8,
        trail: [],
      },
    ];
  },
  binary: (width: number, height: number): Body[] => {
    const cx = width / 2;
    const cy = height / 2;
    return [
      {
        id: generateId(),
        mass: 500,
        pos: { x: cx - 100, y: cy },
        vel: { x: 0, y: 150 },
        acc: { x: 0, y: 0 },
        color: '#a855f7', // purple-500
        radius: 12,
        trail: [],
      },
      {
        id: generateId(),
        mass: 500,
        pos: { x: cx + 100, y: cy },
        vel: { x: 0, y: -150 },
        acc: { x: 0, y: 0 },
        color: '#10b981', // emerald-500
        radius: 12,
        trail: [],
      },
    ];
  },
};

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>([]);
  const frameCountRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const [metrics, setMetrics] = useState<Metrics>({
    kineticEnergy: 0,
    potentialEnergy: 0,
    totalEnergy: 0,
    momentumX: 0,
    momentumY: 0,
    totalMomentum: 0,
    angularMomentum: 0,
  });

  const [initialEnergy, setInitialEnergy] = useState<number | null>(null);

  // Initialize Simulation
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    
    // Load default preset
    loadPreset('figure8');

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPreset = (presetName: keyof typeof PRESETS) => {
    const newBodies = PRESETS[presetName](window.innerWidth, window.innerHeight);
    bodiesRef.current = newBodies;
    const initialMetrics = calculateMetrics(newBodies);
    setMetrics(initialMetrics);
    setInitialEnergy(initialMetrics.totalEnergy);
    
    // Reset trails
    bodiesRef.current.forEach(b => b.trail = []);
  };

  // Physics Engine (Velocity Verlet Integrator for better energy conservation)
  const updatePhysics = useCallback(() => {
    const bodies = bodiesRef.current;
    const n = bodies.length;

    // 1. Calculate current accelerations if not already done
    const calculateAccelerations = (currentBodies: Body[]) => {
      const accels = currentBodies.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const b1 = currentBodies[i];
          const b2 = currentBodies[j];
          const dx = b2.pos.x - b1.pos.x;
          const dy = b2.pos.y - b1.pos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          if (dist > 5) { // Softening parameter to prevent infinite forces
            const force = (G * b1.mass * b2.mass) / distSq;
            const ax = (force * dx) / dist;
            const ay = (force * dy) / dist;
            
            accels[i].x += ax / b1.mass;
            accels[i].y += ay / b1.mass;
            accels[j].x -= ax / b2.mass;
            accels[j].y -= ay / b2.mass;
          }
        }
      }
      return accels;
    };

    let currentAccels = calculateAccelerations(bodies);

    // 2. Update positions and half-step velocities
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.pos.x += b.vel.x * DT + 0.5 * currentAccels[i].x * DT * DT;
      b.pos.y += b.vel.y * DT + 0.5 * currentAccels[i].y * DT * DT;
      
      b.vel.x += 0.5 * currentAccels[i].x * DT;
      b.vel.y += 0.5 * currentAccels[i].y * DT;
    }

    // 3. Calculate new accelerations
    const newAccels = calculateAccelerations(bodies);

    // 4. Finish velocity update
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vel.x += 0.5 * newAccels[i].x * DT;
      b.vel.y += 0.5 * newAccels[i].y * DT;
      b.acc = newAccels[i];

      // Update trails
      if (frameCountRef.current % 3 === 0) {
        b.trail.push({ ...b.pos });
        if (b.trail.length > TRAIL_LENGTH) {
          b.trail.shift();
        }
      }
    }

    // Update Metrics UI periodically
    frameCountRef.current++;
    if (frameCountRef.current % METRICS_UPDATE_INTERVAL === 0) {
      setMetrics(calculateMetrics(bodies));
    }
  }, []);

  // Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with slight fade for motion blur effect
    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)'; // slate-950 with opacity
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
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
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
      ctx.shadowBlur = 0;
    });

  }, []);

  const tick = useCallback(() => {
    updatePhysics();
    render();
    requestRef.current = requestAnimationFrame(tick);
  }, [updatePhysics, render]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);

  // Add random body on click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newBody: Body = {
      id: generateId(),
      mass: Math.random() * 100 + 50,
      pos: { x, y },
      vel: { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 },
      acc: { x: 0, y: 0 },
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      radius: Math.random() * 6 + 4,
      trail: [],
    };
    
    bodiesRef.current.push(newBody);
    
    // Update initial energy reference to prevent "drift" warning when adding bodies
    const newMetrics = calculateMetrics(bodiesRef.current);
    setInitialEnergy(newMetrics.totalEnergy);
  };

  // Formatting helpers
  const formatSci = (num: number) => {
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(2);
    if (Math.abs(num) > 100000) return num.toExponential(2);
    return num.toFixed(2);
  };

  const energyDrift = initialEnergy ? Math.abs((metrics.totalEnergy - initialEnergy) / initialEnergy) * 100 : 0;

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        className="absolute inset-0 cursor-crosshair"
      />

      {/* UI Overlay: Energy & Momentum Dashboard */}
      <div className="absolute top-6 left-6 w-80 flex flex-col gap-4 pointer-events-none">
        
        {/* Header / Controls */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl pointer-events-auto">
          <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Orbit Playground
          </h1>
          <p className="text-xs text-slate-400 mb-4">Click anywhere to add a celestial body.</p>
          
          <div className="flex gap-2">
            <button 
              onClick={() => loadPreset('figure8')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 px-3 rounded border border-slate-600 transition-colors"
            >
              Figure-8
            </button>
            <button 
              onClick={() => loadPreset('binary')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 px-3 rounded border border-slate-600 transition-colors"
            >
              Binary
            </button>
            <button 
              onClick={() => { bodiesRef.current = []; setInitialEnergy(0); }}
              className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-semibold py-2 px-3 rounded border border-red-800/50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Physics Metrics Panel */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-5 rounded-xl shadow-2xl flex flex-col gap-5 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              System Totals
            </h2>
            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
              n = {bodiesRef.current.length}
            </span>
          </div>

          {/* Energy Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Energy (E = K + U)</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                <div className="text-[10px] text-slate-500 mb-1">Kinetic (K)</div>
                <div className="font-mono text-sm text-blue-400">{formatSci(metrics.kineticEnergy)}</div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                <div className="text-[10px] text-slate-500 mb-1">Potential (U)</div>
                <div className="font-mono text-sm text-red-400">{formatSci(metrics.potentialEnergy)}</div>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-slate-400 mb-1">Total Energy (E)</div>
                <div className="font-mono text-lg font-bold text-white">{formatSci(metrics.totalEnergy)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 mb-1">Conservation</div>
                <div className={`font-mono text-xs ${energyDrift < 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  Δ {energyDrift.toFixed(3)}%
                </div>
              </div>
            </div>
          </div>

          {/* Momentum Section */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Momentum</h3>
            
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[10px] text-slate-500">Linear (P)</div>
                <div className="font-mono text-sm text-purple-400">{formatSci(metrics.totalMomentum)}</div>
              </div>
              <div className="flex gap-4 text-[10px] font-mono text-slate-500">
                <span>Px: {formatSci(metrics.momentumX)}</span>
                <span>Py: {formatSci(metrics.momentumY)}</span>
              </div>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 flex justify-between items-center">
              <div className="text-[10px] text-slate-500">Angular (L)</div>
              <div className="font-mono text-sm text-amber-400">{formatSci(metrics.angularMomentum)}</div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Instructions / Footer */}
      <div className="absolute bottom-6 right-6 text-right pointer-events-none">
        <p className="text-xs text-slate-500 font-mono">Velocity Verlet Integrator</p>
        <p