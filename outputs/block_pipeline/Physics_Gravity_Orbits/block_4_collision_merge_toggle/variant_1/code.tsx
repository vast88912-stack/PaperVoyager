import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
interface Vector2D {
  x: number;
  y: number;
}

interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  trail: Vector2D[];
}

interface SystemStats {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentumX: number;
  momentumY: number;
  totalMass: number;
  bodyCount: number;
}

// --- Constants & Helpers ---
const G = 0.5; // Gravitational constant
const TRAIL_LENGTH = 60;
const SOFTENING = 2.0; // Prevents infinite forces when bodies are extremely close

const generateId = () => Math.random().toString(36).substr(2, 9);

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

const blendColors = (color1: string, color2: string, weight1: number, weight2: number) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const total = weight1 + weight2;
  const r = (c1.r * weight1 + c2.r * weight2) / total;
  const g = (c1.g * weight1 + c2.g * weight2) / total;
  const b = (c1.b * weight1 + c2.b * weight2) / total;
  return rgbToHex(r, g, b);
};

// --- Presets ---
const getTwoBodyPreset = (width: number, height: number): Body[] => {
  const cx = width / 2;
  const cy = height / 2;
  return [
    { id: generateId(), x: cx - 150, y: cy, vx: 0, vy: 1.2, mass: 1000, radius: 15, color: '#3b82f6', trail: [] },
    { id: generateId(), x: cx + 150, y: cy, vx: 0, vy: -1.2, mass: 1000, radius: 15, color: '#ef4444', trail: [] },
  ];
};

const getThreeBodyPreset = (width: number, height: number): Body[] => {
  const cx = width / 2;
  const cy = height / 2;
  // Figure-8 approximate initial conditions
  return [
    { id: generateId(), x: cx - 100, y: cy, vx: 0.5, vy: 1, mass: 800, radius: 12, color: '#10b981', trail: [] },
    { id: generateId(), x: cx, y: cy, vx: -1, vy: -2, mass: 800, radius: 12, color: '#f59e0b', trail: [] },
    { id: generateId(), x: cx + 100, y: cy, vx: 0.5, vy: 1, mass: 800, radius: 12, color: '#8b5cf6', trail: [] },
  ];
};

const getSwirlPreset = (width: number, height: number): Body[] => {
  const cx = width / 2;
  const cy = height / 2;
  const bodies: Body[] = [
    { id: generateId(), x: cx, y: cy, vx: 0, vy: 0, mass: 5000, radius: 25, color: '#fbbf24', trail: [] },
  ];
  
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 300;
    const velocity = Math.sqrt((G * 5000) / dist);
    
    bodies.push({
      id: generateId(),
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: -Math.sin(angle) * velocity,
      vy: Math.cos(angle) * velocity,
      mass: 10 + Math.random() * 40,
      radius: 3 + Math.random() * 3,
      color: ['#60a5fa', '#34d399', '#a78bfa', '#f472b6'][Math.floor(Math.random() * 4)],
      trail: [],
    });
  }
  return bodies;
};

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Physics State (using refs for performance in animation loop)
  const bodiesRef = useRef<Body[]>([]);
  const mergeCollisionsRef = useRef<boolean>(true);
  const isPausedRef = useRef<boolean>(false);
  
  // UI State
  const [isPaused, setIsPaused] = useState(false);
  const [mergeCollisions, setMergeCollisions] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Sync refs with state
  useEffect(() => { mergeCollisionsRef.current = mergeCollisions; }, [mergeCollisions]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Preset
  const loadPreset = useCallback((presetFn: (w: number, h: number) => Body[]) => {
    bodiesRef.current = presetFn(window.innerWidth, window.innerHeight);
    if (isPausedRef.current) {
      draw(canvasRef.current?.getContext('2d')!);
    }
  }, []);

  useEffect(() => {
    loadPreset(getSwirlPreset);
  }, [loadPreset]);

  // Physics Engine
  const updatePhysics = () => {
    const bodies = bodiesRef.current;
    const dt = 1; // Time step

    // 1. Calculate accelerations (O(N^2) gravity)
    const ax = new Float64Array(bodies.length);
    const ay = new Float64Array(bodies.length);

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        // Force magnitude (with softening to prevent infinite forces)
        const f = (G * bodies[i].mass * bodies[j].mass) / (distSq + SOFTENING);
        
        const fx = f * (dx / dist);
        const fy = f * (dy / dist);

        ax[i] += fx / bodies[i].mass;
        ay[i] += fy / bodies[i].mass;
        ax[j] -= fx / bodies[j].mass;
        ay[j] -= fy / bodies[j].mass;
      }
    }

    // 2. Update velocities and positions (Semi-implicit Euler)
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vx += ax[i] * dt;
      bodies[i].vy += ay[i] * dt;
      bodies[i].x += bodies[i].vx * dt;
      bodies[i].y += bodies[i].vy * dt;

      // Update trails
      if (Math.random() < 0.3) { // Sample rate to save memory
        bodies[i].trail.push({ x: bodies[i].x, y: bodies[i].y });
        if (bodies[i].trail.length > TRAIL_LENGTH) {
          bodies[i].trail.shift();
        }
      }
    }

    // 3. Collision Detection & Merging (The Core Feature Focus)
    if (mergeCollisionsRef.current) {
      const mergedIndices = new Set<number>();
      const newBodies: Body[] = [];

      for (let i = 0; i < bodies.length; i++) {
        if (mergedIndices.has(i)) continue;
        
        let currentBody = { ...bodies[i] };
        
        for (let j = i + 1; j < bodies.length; j++) {
          if (mergedIndices.has(j)) continue;

          const dx = bodies[j].x - currentBody.x;
          const dy = bodies[j].y - currentBody.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if bodies overlap
          if (dist < currentBody.radius + bodies[j].radius) {
            // Perfectly Inelastic Collision
            const b2 = bodies[j];
            const totalMass = currentBody.mass + b2.mass;
            
            // Conservation of momentum for velocity
            const nvx = (currentBody.vx * currentBody.mass + b2.vx * b2.mass) / totalMass;
            const nvy = (currentBody.vy * currentBody.mass + b2.vy * b2.mass) / totalMass;
            
            // Center of mass for position
            const nx = (currentBody.x * currentBody.mass + b2.x * b2.mass) / totalMass;
            const ny = (currentBody.y * currentBody.mass + b2.y * b2.mass) / totalMass;
            
            // Area conservation for radius: r_new^2 = r1^2 + r2^2
            const nRadius = Math.sqrt(currentBody.radius ** 2 + b2.radius ** 2);
            
            // Color blending weighted by mass
            const nColor = blendColors(currentBody.color, b2.color, currentBody.mass, b2.mass);

            currentBody = {
              ...currentBody,
              mass: totalMass,
              x: nx,
              y: ny,
              vx: nvx,
              vy: nvy,
              radius: nRadius,
              color: nColor,
              trail: currentBody.mass > b2.mass ? currentBody.trail : b2.trail, // Keep trail of larger body
            };
            
            mergedIndices.add(j);
          }
        }
        newBodies.push(currentBody);
      }
      bodiesRef.current = newBodies;
    }
  };

  const calculateStats = () => {
    const bodies = bodiesRef.current;
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;
    let mass = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const vSq = b.vx * b.vx + b.vy * b.vy;
      ke += 0.5 * b.mass * vSq;
      px += b.mass * b.vx;
      py += b.mass * b.vy;
      mass += b.mass;

      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - b.x;
        const dy = bodies[j].y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pe -= (G * b.mass * bodies[j].mass) / dist;
      }
    }

    setStats({
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
      momentumX: px,
      momentumY: py,
      totalMass: mass,
      bodyCount: bodies.length,
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear background with slight fade for motion blur effect
    ctx.fillStyle = 'rgba(2, 6, 23, 0.3)'; // Tailwind slate-950 with opacity
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const bodies = bodiesRef.current;

    // Draw Trails
    bodies.forEach(body => {
      if (body.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(body.trail[0].x, body.trail[0].y);
        for (let i = 1; i < body.trail.length; i++) {
          ctx.lineTo(body.trail[i].x, body.trail[i].y);
        }
        ctx.strokeStyle = `${body.color}66`; // 40% opacity
        ctx.lineWidth = Math.max(1, body.radius * 0.3);
        ctx.stroke();
      }
    });

    // Draw Bodies
    bodies.forEach(body => {
      // Glow effect
      const gradient = ctx.createRadialGradient(body.x, body.y, body.radius * 0.1, body.x, body.y, body.radius * 2);
      gradient.addColorStop(0, body.color);
      gradient.addColorStop(0.4, `${body.color}88`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(body.x, body.y, body.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
    });
  };

  const loop = useCallback(() => {
    if (!isPausedRef.current) {
      updatePhysics();
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    // Throttle stats update to avoid React overhead
    if (Math.random() < 0.1) {
      calculateStats();
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [dimensions]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  // --- UI Components ---
  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 z-0"
      />

      {/* Top Left: Controls & Presets */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 w-72">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl shadow-2xl">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            Orbit Playground
          </h1>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600"
            >
              {isPaused ? (
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              )}
              <span className="text-sm font-medium">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              onClick={() => loadPreset(getSwirlPreset)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600"
              title="Reset Simulation"
            >
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Presets</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => loadPreset(getTwoBodyPreset)} className="py-1.5 px-2 text-xs bg-slate-800/50 hover:bg-blue-500/20 hover:text-blue-300 border border-slate-700 rounded transition-all">Two-Body</button>
              <button onClick={() => loadPreset(getThreeBodyPreset)} className="py-1.5 px-2 text-xs bg-slate-800/50 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 rounded transition-all">Three-Body</button>
              <button onClick={() => loadPreset(getSwirlPreset)} className="col-span-2 py-1.5 px-2 text-xs bg-slate-800/50 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700 rounded transition-all">Many-Body Swirl</button>
            </div>
          </div>
        </div>

        {/* FEATURE FOCUS: Collision Merge Toggle */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl shadow-2xl relative overflow-hidden group">
          {/* Animated background glow based on toggle state */}
          <div className={`absolute inset-0 opacity-20 transition-opacity duration-500 ${mergeCollisions ? 'bg-gradient-to-br from-rose-500 to-fuchsia-600' : 'bg-transparent'}`} />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <svg className={`w-4 h-4 ${mergeCollisions ? 'text-rose-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Merge Collisions
              </span>
              <span className="text-xs text-slate-400 mt-1">Inelastic mass fusion</span>
            </div>
            
            {/* Custom Stylish Toggle Switch */}
            <button
              onClick={() => setMergeCollisions(!mergeCollisions)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                mergeCollisions ? 'bg-rose-500' : 'bg-slate-700'
              }`}
            >
              <span className="sr-only">Toggle Merge Collisions</span>
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-300 ease-in-out ${
                  mergeCollisions ? 'translate-x-8' : 'translate-x-1'
                }`}
              >
                {/* Inner dot for extra detail */}
                <span className={`absolute inset-0 m-auto h-2 w-2 rounded-full transition-colors duration-300 ${mergeCollisions ? 'bg-rose-500' : 'bg-slate-400'}`} />
              </span>
            </button>
          </div>
          
          {/* Physics Note */}
          <div className={`mt-3 text-[10px] leading-tight transition-all duration-300 ${mergeCollisions ? 'text-rose-200/70 h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
            When active, colliding bodies merge. Momentum is conserved, but kinetic energy is lost to the fusion process.
          </div>
        </div>
      </div>

      {/* Bottom Right: System Stats */}
      {stats && (
        <div className="absolute bottom-6 right-6 z-10 w-64 bg-slate-900/80 backdrop-blur-md border border-slate-