import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
interface Vector2 {
  x: number;
  y: number;
}

interface BodyData {
  id: string;
  pos: Vector2;
  vel: Vector2;
  mass: number;
  color: string;
  radius: number;
  trail: Vector2[];
}

// --- Constants & Helpers ---
const G = 0.5; // Gravitational constant for simulation
const SOFTENING = 2.0; // Prevent infinite forces at distance 0
const MAX_TRAIL_LENGTH = 150;
const PHYSICS_STEPS_PER_FRAME = 2; // Improve Euler stability slightly

const generateId = () => Math.random().toString(36).substr(2, 9);

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const generateRandomColor = () => {
  const hue = Math.floor(randomRange(0, 360));
  return `hsl(${hue}, 80%, 65%)`;
};

const calculateRadius = (mass: number) => {
  return Math.max(3, Math.pow(mass, 0.33) * 2);
};

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  // -- State --
  // Initial preset: 3-body system
  const [bodies, setBodies] = useState<BodyData[]>([
    {
      id: 'star1',
      pos: { x: 0, y: 0 },
      vel: { x: 0.5, y: -0.5 },
      mass: 800,
      color: '#fcd34d', // amber-300
      radius: calculateRadius(800),
      trail: [],
    },
    {
      id: 'star2',
      pos: { x: -200, y: 0 },
      vel: { x: -0.5, y: 2.5 },
      mass: 400,
      color: '#60a5fa', // blue-400
      radius: calculateRadius(400),
      trail: [],
    },
    {
      id: 'planet1',
      pos: { x: 200, y: 100 },
      vel: { x: -2.0, y: -1.0 },
      mass: 50,
      color: '#34d399', // emerald-400
      radius: calculateRadius(50),
      trail: [],
    }
  ]);

  const [isPaused, setIsPaused] = useState(false);
  const [showTrails, setShowTrails] = useState(true);

  // New Body Form State
  const [newMass, setNewMass] = useState<number>(100);
  const [newVelX, setNewVelX] = useState<number>(0);
  const [newVelY, setNewVelY] = useState<number>(0);

  // Use refs for physics state to avoid dependency cycles in requestAnimationFrame
  const bodiesRef = useRef(bodies);
  const isPausedRef = useRef(isPaused);
  
  // Center offset for rendering
  const offsetRef = useRef<Vector2>({ x: 0, y: 0 });

  // Sync state to refs
  useEffect(() => {
    bodiesRef.current = bodies;
  }, [bodies]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // --- Physics Engine ---
  const updatePhysics = useCallback(() => {
    if (isPausedRef.current) return;

    let currentBodies = [...bodiesRef.current];

    for (let step = 0; step < PHYSICS_STEPS_PER_FRAME; step++) {
      const dt = 1 / PHYSICS_STEPS_PER_FRAME;
      const forces: Vector2[] = currentBodies.map(() => ({ x: 0, y: 0 }));

      // Calculate gravitational forces (O(N^2))
      for (let i = 0; i < currentBodies.length; i++) {
        for (let j = i + 1; j < currentBodies.length; j++) {
          const b1 = currentBodies[i];
          const b2 = currentBodies[j];

          const dx = b2.pos.x - b1.pos.x;
          const dy = b2.pos.y - b1.pos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) + SOFTENING;

          const forceMag = (G * b1.mass * b2.mass) / (dist * dist);
          
          const fx = forceMag * (dx / dist);
          const fy = forceMag * (dy / dist);

          forces[i].x += fx;
          forces[i].y += fy;
          forces[j].x -= fx;
          forces[j].y -= fy;
        }
      }

      // Update Velocities and Positions
      currentBodies = currentBodies.map((body, i) => {
        const ax = forces[i].x / body.mass;
        const ay = forces[i].y / body.mass;

        const newVx = body.vel.x + ax * dt;
        const newVy = body.vel.y + ay * dt;

        return {
          ...body,
          vel: { x: newVx, y: newVy },
          pos: { 
            x: body.pos.x + newVx * dt, 
            y: body.pos.y + newVy * dt 
          }
        };
      });
    }

    // Update trails (only once per visual frame, not physics step)
    currentBodies = currentBodies.map(body => {
      const newTrail = [...body.trail, { ...body.pos }];
      if (newTrail.length > MAX_TRAIL_LENGTH) {
        newTrail.shift();
      }
      return { ...body, trail: newTrail };
    });

    setBodies(currentBodies);
  }, []);

  // --- Rendering Loop ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background (Starfield base)
    ctx.fillStyle = '#0f172a'; // tailwind slate-900
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < width; i += 100) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
    for (let i = 0; i < height; i += 100) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
    ctx.stroke();

    const cx = width / 2 + offsetRef.current.x;
    const cy = height / 2 + offsetRef.current.y;

    // Draw Trails
    if (showTrails) {
      bodiesRef.current.forEach(body => {
        if (body.trail.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = body.color;
        ctx.lineWidth = 1.5;
        // Fade out older trail segments
        body.trail.forEach((p, idx) => {
          const alpha = idx / body.trail.length;
          ctx.globalAlpha = alpha * 0.6;
          if (idx === 0) ctx.moveTo(p.x + cx, p.y + cy);
          else ctx.lineTo(p.x + cx, p.y + cy);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });
    }

    // Draw Bodies
    bodiesRef.current.forEach(body => {
      // Glow effect
      const gradient = ctx.createRadialGradient(
        body.pos.x + cx, body.pos.y + cy, body.radius * 0.1,
        body.pos.x + cx, body.pos.y + cy, body.radius * 2.5
      );
      gradient.addColorStop(0, body.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(body.pos.x + cx, body.pos.y + cy, body.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.fillStyle = body.color;
      ctx.arc(body.pos.x + cx, body.pos.y + cy, body.radius, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [showTrails]);

  const tick = useCallback(() => {
    updatePhysics();
    render();
    requestRef.current = requestAnimationFrame(tick);
  }, [updatePhysics, render]);

  // --- Lifecycle ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);


  // --- Event Handlers (Add/Remove Module Focus) ---

  const handleAddRandomBody = () => {
    const mass = Math.random() > 0.8 ? randomRange(300, 1000) : randomRange(10, 100);
    const newBody: BodyData = {
      id: generateId(),
      pos: { 
        x: randomRange(-300, 300), 
        y: randomRange(-300, 300) 
      },
      vel: { 
        x: randomRange(-2, 2), 
        y: randomRange(-2, 2) 
      },
      mass: mass,
      color: generateRandomColor(),
      radius: calculateRadius(mass),
      trail: [],
    };
    setBodies(prev => [...prev, newBody]);
  };

  const handleAddCustomBody = (e: React.FormEvent) => {
    e.preventDefault();
    const newBody: BodyData = {
      id: generateId(),
      // Spawn near center for custom adds
      pos: { x: randomRange(-50, 50), y: randomRange(-50, 50) },
      vel: { x: newVelX, y: newVelY },
      mass: newMass,
      color: generateRandomColor(),
      radius: calculateRadius(newMass),
      trail: [],
    };
    setBodies(prev => [...prev, newBody]);
  };

  const removeBody = (idToRemove: string) => {
    setBodies(prev => prev.filter(b => b.id !== idToRemove));
  };

  const clearBodies = () => setBodies([]);

  // --- UI Render ---
  return (
    <div ref={containerRef} className="w-screen h-screen overflow-hidden bg-slate-900 font-sans text-slate-200 relative">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 cursor-crosshair"
      />

      {/* Top Bar - Controls Overview */}
      <div className="absolute top-4 left-4 flex gap-3">
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-2xl shadow-xl flex items-center gap-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mr-4">
            Orbit Playground
          </h1>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
            title={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? (
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            )}
          </button>
          <button 
            onClick={() => setShowTrails(!showTrails)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${showTrails ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-700/50 text-slate-400 border-transparent'}`}
          >
            Trails
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm font-mono text-emerald-400">
            N = {bodies.length}
          </div>
        </div>
      </div>

      {/* Right Panel - Add/Remove Bodies Module */}
      <div className="absolute top-4 right-4 w-80 max-h-[calc(100vh-2rem)] flex flex-col gap-4 z-10 pointer-events-none">
        
        {/* Module 1: Add Bodies */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 shadow-2xl pointer-events-auto">
          <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Add Body
          </h2>
          
          <form onSubmit={handleAddCustomBody} className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <label>Mass</label>
                <span>{newMass.toFixed(0)}</span>
              </div>
              <input 
                type="range" min="1" max="1500" value={newMass} 
                onChange={(e) => setNewMass(Number(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Initial Vx</label>
                <input 
                  type="number" step="0.1" value={newVelX}
                  onChange={(e) => setNewVelX(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Initial Vy</label>
                <input 
                  type="number" step="0.1" value={newVelY}
                  onChange={(e) => setNewVelY(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                Add Custom
              </button>
              <button 
                type="button"
                onClick={handleAddRandomBody}
                className="flex-none bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 px-4 rounded-xl transition-all"
                title="Add Random Body"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </button>
            </div>
          </form>
        </div>

        {/* Module 1: Manage/Remove Bodies */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 shadow-2xl flex-1 overflow-hidden flex flex-col pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
              Active Bodies
            </h2>
            <button 
              onClick={clearBodies}
              className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {bodies.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm italic">
                Universe is empty.<br/>Add some bodies!
              </div>
            )}
            {bodies.map(body => (
              <div 
                key={body.id} 
                className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-700/50 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: body.color, boxShadow: `0 0 8px ${body.color}` }}
                  />
                  <div>
                    <div className="text-xs font-mono text-slate-300">m: {Math.round(body.mass)}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      v: {Math.abs(body.vel.x).toFixed(1)}, {Math.abs(body.vel.y).toFixed(1)}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeBody(body.id)}
                  className="opacity-40 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all text-slate-400"
                  title="Remove body"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Decorative hints */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono pointer-events-none">
        Variant #5: Direct Add/Remove Interface Focus
      </div>
    </div>
  );
}