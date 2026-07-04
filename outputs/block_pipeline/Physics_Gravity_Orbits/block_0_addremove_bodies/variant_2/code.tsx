import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
interface Point {
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
  trail: Point[];
}

type Integrator = 'Euler' | 'Verlet';

interface SystemStats {
  energy: number;
  momentum: number;
}

// --- Constants & Helpers ---
const G = 100; // Gravitational constant for visual scale
const MAX_TRAIL = 60;
const TRAIL_STEP = 3;

const generateId = () => Math.random().toString(36).substr(2, 9);

const getRandomColor = () => {
  const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#eab308', '#f97316'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const calculateRadius = (mass: number) => Math.max(2, Math.pow(mass, 0.333) * 2);

// --- Presets ---
const getPresets = (width: number, height: number): Record<string, Body[]> => {
  const cx = width / 2;
  const cy = height / 2;
  return {
    'Two-Body Orbit': [
      { id: generateId(), x: cx - 150, y: cy, vx: 0, vy: 4, mass: 200, radius: calculateRadius(200), color: '#3b82f6', trail: [] },
      { id: generateId(), x: cx + 150, y: cy, vx: 0, vy: -4, mass: 200, radius: calculateRadius(200), color: '#f43f5e', trail: [] }
    ],
    'Three-Body (Chaotic)': [
      { id: generateId(), x: cx - 100, y: cy + 50, vx: 2, vy: 2, mass: 300, radius: calculateRadius(300), color: '#10b981', trail: [] },
      { id: generateId(), x: cx + 100, y: cy + 50, vx: -2, vy: 2, mass: 300, radius: calculateRadius(300), color: '#f97316', trail: [] },
      { id: generateId(), x: cx, y: cy - 100, vx: 0, vy: -4, mass: 300, radius: calculateRadius(300), color: '#a855f7', trail: [] }
    ],
    'Swirl (Star & Planets)': [
      { id: generateId(), x: cx, y: cy, vx: 0, vy: 0, mass: 2000, radius: calculateRadius(2000), color: '#eab308', trail: [] },
      ...Array.from({ length: 20 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 300;
        const speed = Math.sqrt(G * 2000 / dist);
        return {
          id: generateId(),
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: -Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
          mass: 5 + Math.random() * 20,
          radius: calculateRadius(5 + Math.random() * 20),
          color: getRandomColor(),
          trail: []
        };
      })
    ]
  };
};

// --- Main Component ---
export default function App() {
  // Refs for animation and canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>([]);
  const frameCountRef = useRef<number>(0);

  // UI State
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [uiBodies, setUiBodies] = useState<Body[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [integrator, setIntegrator] = useState<Integrator>('Euler');
  const [mergeCollisions, setMergeCollisions] = useState(true);
  const [stats, setStats] = useState<SystemStats>({ energy: 0, momentum: 0 });

  // Add Body Form State
  const [newMass, setNewMass] = useState<number>(100);
  const [newVx, setNewVx] = useState<number>(0);
  const [newVy, setNewVy] = useState<number>(0);
  const [newColor, setNewColor] = useState<string>(getRandomColor());

  // Initialization & Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Load initial preset
    const presets = getPresets(window.innerWidth, window.innerHeight);
    bodiesRef.current = presets['Two-Body Orbit'];
    syncUI();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync refs to UI state for panels
  const syncUI = useCallback(() => {
    setUiBodies([...bodiesRef.current]);
  }, []);

  // --- Physics Engine ---
  const updatePhysics = () => {
    const dt = 0.1; // Fixed time step for stability
    let bodies = bodiesRef.current;

    // Forces array
    const ax = new Float64Array(bodies.length);
    const ay = new Float64Array(bodies.length);

    // Calculate gravitational forces
    for (let i = 0; i < bodies.length; i++) {
      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        // Softening parameter to prevent infinite forces
        const softening = 10;
        const force = (G * bodies[j].mass) / (distSq + softening);

        ax[i] += force * (dx / dist);
        ay[i] += force * (dy / dist);
      }
    }

    // Integrate
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (integrator === 'Euler') {
        // Symplectic Euler
        b.vx += ax[i] * dt;
        b.vy += ay[i] * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      } else {
        // Simple Verlet implementation (Velocity Verlet approximation)
        const nextX = b.x + b.vx * dt + 0.5 * ax[i] * dt * dt;
        const nextY = b.y + b.vy * dt + 0.5 * ay[i] * dt * dt;
        b.vx += ax[i] * dt;
        b.vy += ay[i] * dt;
        b.x = nextX;
        b.y = nextY;
      }

      // Update trails
      if (frameCountRef.current % TRAIL_STEP === 0) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > MAX_TRAIL) {
          b.trail.shift();
        }
      }
    }

    // Handle Collisions
    if (mergeCollisions) {
      const newBodies: Body[] = [];
      const merged = new Set<string>();

      for (let i = 0; i < bodies.length; i++) {
        if (merged.has(bodies[i].id)) continue;
        let current = bodies[i];

        for (let j = i + 1; j < bodies.length; j++) {
          if (merged.has(bodies[j].id)) continue;
          const target = bodies[j];
          
          const dx = target.x - current.x;
          const dy = target.y - current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < current.radius + target.radius) {
            // Merge
            merged.add(target.id);
            const newMass = current.mass + target.mass;
            current = {
              ...current,
              mass: newMass,
              radius: calculateRadius(newMass),
              vx: (current.vx * current.mass + target.vx * target.mass) / newMass,
              vy: (current.vy * current.mass + target.vy * target.mass) / newMass,
              x: (current.x * current.mass + target.x * target.mass) / newMass,
              y: (current.y * current.mass + target.y * target.mass) / newMass,
            };
          }
        }
        newBodies.push(current);
      }

      if (merged.size > 0) {
        bodiesRef.current = newBodies;
        syncUI();
      }
    }

    frameCountRef.current++;
  };

  const calculateStats = () => {
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;
    const bodies = bodiesRef.current;

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
        const dist = Math.sqrt(dx * dx + dy * dy);
        pe -= (G * b.mass * b2.mass) / dist;
      }
    }

    setStats({
      energy: ke + pe,
      momentum: Math.sqrt(px * px + py * py)
    });
  };

  // --- Render Loop ---
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid/stars (static background approximation)
    ctx.fillStyle = '#ffffff';
    for(let i=0; i<100; i++) {
      // Very simple stable pseudo-random stars based on index
      const sx = (Math.sin(i * 123) * 0.5 + 0.5) * canvas.width;
      const sy = (Math.cos(i * 321) * 0.5 + 0.5) * canvas.height;
      ctx.globalAlpha = (Math.sin(i + frameCountRef.current * 0.01) * 0.5 + 0.5) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Gradient for fading trail
      const gradient = ctx.createLinearGradient(
        b.trail[0].x, b.trail[0].y, 
        b.trail[b.trail.length - 1].x, b.trail[b.trail.length - 1].y
      );
      gradient.addColorStop(0, `${b.color}00`);
      gradient.addColorStop(1, `${b.color}aa`);
      ctx.strokeStyle = gradient;
      
      ctx.stroke();
    });

    // Draw Bodies
    bodies.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    });
  };

  const tick = useCallback(() => {
    if (isRunning) {
      updatePhysics();
      if (frameCountRef.current % 10 === 0) calculateStats();
    }
    renderCanvas();
    requestRef.current = requestAnimationFrame(tick);
  }, [isRunning, integrator, mergeCollisions]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [tick]);


  // --- Actions ---
  const loadPreset = (name: string) => {
    const presets = getPresets(dimensions.width, dimensions.height);
    if (presets[name]) {
      bodiesRef.current = presets[name];
      syncUI();
    }
  };

  const removeBody = (id: string) => {
    bodiesRef.current = bodiesRef.current.filter(b => b.id !== id);
    syncUI();
  };

  const clearBodies = () => {
    bodiesRef.current = [];
    syncUI();
  };

  const addBodyCenter = () => {
    const newBody: Body = {
      id: generateId(),
      x: dimensions.width / 2 + (Math.random() * 40 - 20),
      y: dimensions.height / 2 + (Math.random() * 40 - 20),
      vx: newVx,
      vy: newVy,
      mass: newMass,
      radius: calculateRadius(newMass),
      color: newColor,
      trail: []
    };
    bodiesRef.current = [...bodiesRef.current, newBody];
    setNewColor(getRandomColor()); // cycle color for next add
    syncUI();
  };

  const exportJSON = () => {
    const data = JSON.stringify(bodiesRef.current.map(b => ({
      ...b, trail: [] // Clear trails to save space
    })), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbit-preset.json';
    a.click();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Simulation Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 z-0 cursor-crosshair"
        onClick={(e) => {
          // Interactive add on click
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const newBody: Body = {
            id: generateId(),
            x, y,
            vx: newVx, vy: newVy,
            mass: newMass,
            radius: calculateRadius(newMass),
            color: newColor,
            trail: []
          };
          bodiesRef.current = [...bodiesRef.current, newBody];
          setNewColor(getRandomColor());
          syncUI();
        }}
      />

      {/* Top Bar - Stats & Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-start gap-4">
          
          {/* Left Panel - Simulation Controls */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl pointer-events-auto w-80 flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Orbit Playground
              </h1>
              <p className="text-xs text-slate-400 mt-1">N-Body Gravity Simulator</p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${isRunning ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
              >
                {isRunning ? 'Pause' : 'Play'}
              </button>
              <button 
                onClick={exportJSON}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Export Initial Conditions"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Load Preset</label>
              <select 
                onChange={(e) => loadPreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Two-Body Orbit">Two-Body Orbit</option>
                <option value="Three-Body (Chaotic)">Three-Body (Chaotic)</option>
                <option value="Swirl (Star & Planets)">Swirl (Star & Planets)</option>
              </select>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">Integrator</label>
                <select 
                  value={integrator}
                  onChange={(e) => setIntegrator(e.target.value as Integrator)}
                  className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200"
                >
                  <option value="Euler">Symplectic Euler</option>
                  <option value="Verlet">Verlet (Approx)</option>
                </select>
              </div>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Merge on Collision</span>
                <div className="relative">
                  <input