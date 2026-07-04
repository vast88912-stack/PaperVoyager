import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
type Vector2D = { x: number; y: number };

interface Body {
  id: string;
  mass: number;
  radius: number;
  pos: Vector2D;
  vel: Vector2D;
  acc: Vector2D;
  color: string;
  trail: Vector2D[];
}

interface SimulationState {
  integrator: 'euler' | 'verlet';
  collisionMerge: boolean;
  G: number;
  softening: number;
  trailLength: number;
}

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateRadius = (mass: number) => Math.max(2, Math.pow(mass, 1 / 3) * 2);

const randomColor = () => {
  const hues = [0, 30, 60, 120, 200, 280, 320];
  const hue = hues[Math.floor(Math.random() * hues.length)] + (Math.random() * 20 - 10);
  return `hsl(${hue}, 80%, 60%)`;
};

// --- Presets ---
const PRESETS: Record<string, () => Body[]> = {
  'Two-Body': () => [
    { id: generateId(), mass: 1000, radius: calculateRadius(1000), pos: { x: -150, y: 0 }, vel: { x: 0, y: 1.5 }, acc: { x: 0, y: 0 }, color: '#fbbf24', trail: [] },
    { id: generateId(), mass: 1000, radius: calculateRadius(1000), pos: { x: 150, y: 0 }, vel: { x: 0, y: -1.5 }, acc: { x: 0, y: 0 }, color: '#38bdf8', trail: [] },
  ],
  'Three-Body (Figure 8)': () => {
    // Approximate stable figure-8 initial conditions
    const p = { x: 97.000436, y: -24.308753 };
    const v = { x: 0.4662036850, y: 0.4323657300 };
    return [
      { id: generateId(), mass: 500, radius: calculateRadius(500), pos: { x: p.x, y: p.y }, vel: { x: v.x, y: v.y }, acc: { x: 0, y: 0 }, color: '#f87171', trail: [] },
      { id: generateId(), mass: 500, radius: calculateRadius(500), pos: { x: -p.x, y: -p.y }, vel: { x: v.x, y: v.y }, acc: { x: 0, y: 0 }, color: '#60a5fa', trail: [] },
      { id: generateId(), mass: 500, radius: calculateRadius(500), pos: { x: 0, y: 0 }, vel: { x: -2 * v.x, y: -2 * v.y }, acc: { x: 0, y: 0 }, color: '#34d399', trail: [] },
    ];
  },
  'Solar System (Mini)': () => [
    { id: generateId(), mass: 5000, radius: calculateRadius(5000), pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, color: '#facc15', trail: [] },
    { id: generateId(), mass: 10, radius: calculateRadius(10), pos: { x: 100, y: 0 }, vel: { x: 0, y: 5 }, acc: { x: 0, y: 0 }, color: '#94a3b8', trail: [] },
    { id: generateId(), mass: 50, radius: calculateRadius(50), pos: { x: 200, y: 0 }, vel: { x: 0, y: 3.5 }, acc: { x: 0, y: 0 }, color: '#38bdf8', trail: [] },
    { id: generateId(), mass: 100, radius: calculateRadius(100), pos: { x: 350, y: 0 }, vel: { x: 0, y: 2.6 }, acc: { x: 0, y: 0 }, color: '#f87171', trail: [] },
  ],
  'Random Swirl': () => {
    const bodies: Body[] = [];
    bodies.push({ id: generateId(), mass: 3000, radius: calculateRadius(3000), pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, color: '#facc15', trail: [] });
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 400;
      const speed = Math.sqrt(3000 / dist) * 0.8; // Approximate orbital velocity
      bodies.push({
        id: generateId(),
        mass: Math.random() * 20 + 1,
        radius: calculateRadius(Math.random() * 20 + 1),
        pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
        vel: { x: -Math.sin(angle) * speed, y: Math.cos(angle) * speed },
        acc: { x: 0, y: 0 },
        color: randomColor(),
        trail: []
      });
    }
    return bodies;
  }
};

// --- Main Component ---
export default function App() {
  // --- Refs for Animation & Canvas ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>(PRESETS['Solar System (Mini)']());
  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number }[]>([]);
  
  // --- State ---
  const [isRunning, setIsRunning] = useState(true);
  const [uiTrigger, setUiTrigger] = useState(0); // Used to force React re-renders for UI updates
  const [stats, setStats] = useState({ ke: 0, pe: 0, px: 0, py: 0 });
  
  const [simState, setSimState] = useState<SimulationState>({
    integrator: 'verlet',
    collisionMerge: true,
    G: 0.5,
    softening: 2,
    trailLength: 100,
  });

  // Add Body Form State
  const [newBody, setNewBody] = useState({
    mass: 100,
    x: 0,
    y: 200,
    vx: 1.5,
    vy: 0,
    color: '#a855f7'
  });

  // --- Physics Engine ---
  const computeForces = (bodies: Body[]) => {
    // Reset accelerations
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].acc = { x: 0, y: 0 };
    }

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];
        
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        // Force magnitude (with softening to avoid infinity)
        const f = (simState.G * b1.mass * b2.mass) / (distSq + simState.softening * simState.softening);
        
        const fx = f * (dx / dist);
        const fy = f * (dy / dist);
        
        b1.acc.x += fx / b1.mass;
        b1.acc.y += fy / b1.mass;
        b2.acc.x -= fx / b2.mass;
        b2.acc.y -= fy / b2.mass;
      }
    }
  };

  const handleCollisions = (bodies: Body[]): boolean => {
    if (!simState.collisionMerge) return false;
    let merged = false;
    const toRemove = new Set<string>();

    for (let i = 0; i < bodies.length; i++) {
      if (toRemove.has(bodies[i].id)) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        if (toRemove.has(bodies[j].id)) continue;
        
        const b1 = bodies[i];
        const b2 = bodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < b1.radius + b2.radius) {
          // Merge b2 into b1
          const newMass = b1.mass + b2.mass;
          // Conservation of momentum
          b1.vel.x = (b1.vel.x * b1.mass + b2.vel.x * b2.mass) / newMass;
          b1.vel.y = (b1.vel.y * b1.mass + b2.vel.y * b2.mass) / newMass;
          // Center of mass position
          b1.pos.x = (b1.pos.x * b1.mass + b2.pos.x * b2.mass) / newMass;
          b1.pos.y = (b1.pos.y * b1.mass + b2.pos.y * b2.mass) / newMass;
          
          b1.mass = newMass;
          b1.radius = calculateRadius(newMass);
          // Mix colors roughly
          b1.color = b1.mass > b2.mass ? b1.color : b2.color;
          
          toRemove.add(b2.id);
          merged = true;
        }
      }
    }

    if (merged) {
      bodiesRef.current = bodies.filter(b => !toRemove.has(b.id));
    }
    return merged;
  };

  const stepPhysics = () => {
    const bodies = bodiesRef.current;
    const dt = 1; // Fixed timestep for simplicity

    if (simState.integrator === 'euler') {
      computeForces(bodies);
      for (const b of bodies) {
        b.vel.x += b.acc.x * dt;
        b.vel.y += b.acc.y * dt;
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
      }
    } else {
      // Velocity Verlet
      for (const b of bodies) {
        b.pos.x += b.vel.x * dt + 0.5 * b.acc.x * dt * dt;
        b.pos.y += b.vel.y * dt + 0.5 * b.acc.y * dt * dt;
      }
      computeForces(bodies);
      for (const b of bodies) {
        b.vel.x += b.acc.x * dt; // Simplified verlet velocity update
        b.vel.y += b.acc.y * dt;
      }
    }

    // Update trails
    for (const b of bodies) {
      // Only add trail point every few frames to save memory/rendering
      if (Math.random() < 0.3) {
        b.trail.push({ x: b.pos.x, y: b.pos.y });
        if (b.trail.length > simState.trailLength) {
          b.trail.shift();
        }
      }
    }

    const didMerge = handleCollisions(bodies);
    if (didMerge) setUiTrigger(prev => prev + 1);
  };

  const calculateStats = () => {
    const bodies = bodiesRef.current;
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const vSq = b.vel.x * b.vel.x + b.vel.y * b.vel.y;
      ke += 0.5 * b.mass * vSq;
      px += b.mass * b.vel.x;
      py += b.mass * b.vel.y;

      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        const dx = b2.pos.x - b.pos.x;
        const dy = b2.pos.y - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pe -= (simState.G * b.mass * b2.mass) / (dist + simState.softening);
      }
    }
    setStats({ ke, pe, px, py });
  };

  // --- Render Loop ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    // Clear background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // Draw Starfield
    ctx.save();
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);

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
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // Draw Bodies
    bodies.forEach(b => {
      // Glow effect
      const gradient = ctx.createRadialGradient(b.pos.x, b.pos.y, b.radius * 0.1, b.pos.x, b.pos.y, b.radius * 2);
      gradient.addColorStop(0, b.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    ctx.restore();
  }, []);

  const tick = useCallback(() => {
    if (isRunning) {
      stepPhysics();
    }
    render();
    requestRef.current = requestAnimationFrame(tick);
  }, [isRunning, render, simState]);

  // --- Effects ---
  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [tick]);

  useEffect(() => {
    // Initialize Starfield
    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.5,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
    starsRef.current = stars;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth - 384; // Subtract sidebar width (w-96 = 384px)
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Periodic stats update
  useEffect(() => {
    const interval = setInterval(() => {
      calculateStats();
      setUiTrigger(prev => prev + 1); // Refresh UI list
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleAddBody = () => {
    const body: Body = {
      id: generateId(),
      mass: newBody.mass,
      radius: calculateRadius(newBody.mass),
      pos: { x: newBody.x, y: newBody.y },
      vel: { x: newBody.vx, y: newBody.vy },
      acc: { x: 0, y: 0 },
      color: newBody.color,
      trail: []
    };
    bodiesRef.current.push(body);
    setUiTrigger(prev => prev + 1);
  };

  const handleRemoveBody = (id: string) => {
    bodiesRef.current = bodiesRef.current.filter(b => b.id !== id);
    setUiTrigger(prev => prev + 1);
  };

  const handleClearAll = () => {
    bodiesRef.current = [];
    setUiTrigger(prev => prev + 1);
  };

  const loadPreset = (name: string) => {
    if (PRESETS[name]) {
      bodiesRef.current = PRESETS[name]();
      setUiTrigger(prev => prev + 1);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bodiesRef.current, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "orbit_preset.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair">
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Overlay Stats */}
        <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur p-4 rounded-lg border border-slate-800 text-xs font-mono space-y-1 pointer-events-none">
          <div className="text-slate-400 mb-2 uppercase tracking-wider font-bold">System Stats</div>
          <div className="flex justify-between gap-4"><span>Bodies:</span> <span className="text-white">{bodiesRef.current.length}</span></div>
          <div className="flex justify-between gap-4"><span>Kinetic Energy:</span> <span className="text-emerald-400">{stats.ke.toExponential(2)}</span></div>
          <div className="flex justify-between gap-4"><span>Potential Energy:</span> <span className="text-rose-400">{stats.pe.toExponential(2)}</span>