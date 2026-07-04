import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  ax: number;
  ay: number;
  mass: number;
  radius: number;
  color: string;
  trail: Vector2D[];
}

interface SimulationStats {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentumX: number;
  momentumY: number;
  totalMomentum: number;
  bodyCount: number;
}

// --- Constants ---
const G = 0.5; // Gravitational constant for simulation
const DT = 0.1; // Time step
const MAX_TRAIL_LENGTH = 60;

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const getRandomColor = () => {
  const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 80%, 60%)`;
};

const calculateRadius = (mass: number) => Math.max(2, Math.sqrt(mass) * 1.5);

// --- Main Component ---
export default function App() {
  // --- Refs for Simulation State (Avoids React re-renders on every frame) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // --- UI State ---
  const [mergeOnCollision, setMergeOnCollision] = useState<boolean>(true);
  const [integrator, setIntegrator] = useState<'Verlet' | 'Euler'>('Verlet');
  const [stats, setStats] = useState<SimulationStats>({
    kineticEnergy: 0, potentialEnergy: 0, totalEnergy: 0, momentumX: 0, momentumY: 0, totalMomentum: 0, bodyCount: 0
  });
  const [nextMass, setNextMass] = useState<number>(10);
  const [nextVelocity, setNextVelocity] = useState<number>(2);

  // --- Physics Engine ---
  const computeAccelerations = (bodies: Body[]) => {
    // Reset accelerations
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].ax = 0;
      bodies[i].ay = 0;
    }

    // Calculate pairwise gravitational forces
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Softening parameter to prevent infinite forces at zero distance
        const softening = 2.0;
        const force = (G * b1.mass * b2.mass) / (distSq + softening);

        const fx = force * (dx / dist);
        const fy = force * (dy / dist);

        b1.ax += fx / b1.mass;
        b1.ay += fy / b1.mass;
        b2.ax -= fx / b2.mass;
        b2.ay -= fy / b2.mass;
      }
    }
  };

  const handleCollisions = (bodies: Body[], merge: boolean) => {
    const toRemove = new Set<string>();
    const newBodies: Body[] = [];

    for (let i = 0; i < bodies.length; i++) {
      if (toRemove.has(bodies[i].id)) continue;

      for (let j = i + 1; j < bodies.length; j++) {
        if (toRemove.has(bodies[j].id)) continue;

        const b1 = bodies[i];
        const b2 = bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b1.radius + b2.radius) {
          if (merge) {
            // Inelastic Collision (Merge)
            const totalMass = b1.mass + b2.mass;
            const mergedBody: Body = {
              id: generateId(),
              x: (b1.x * b1.mass + b2.x * b2.mass) / totalMass,
              y: (b1.y * b1.mass + b2.y * b2.mass) / totalMass,
              vx: (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass,
              vy: (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass,
              ax: 0, ay: 0,
              mass: totalMass,
              radius: calculateRadius(totalMass),
              color: b1.mass > b2.mass ? b1.color : b2.color,
              trail: []
            };
            toRemove.add(b1.id);
            toRemove.add(b2.id);
            newBodies.push(mergedBody);
            break; // b1 is merged, move to next i
          } else {
            // Elastic Collision (Bounce)
            const nx = dx / dist;
            const ny = dy / dist;
            const p = 2 * (b1.vx * nx + b1.vy * ny - b2.vx * nx - b2.vy * ny) / (b1.mass + b2.mass);
            
            b1.vx = b1.vx - p * b2.mass * nx;
            b1.vy = b1.vy - p * b2.mass * ny;
            b2.vx = b2.vx + p * b1.mass * nx;
            b2.vy = b2.vy + p * b1.mass * ny;

            // Separate to prevent sticking
            const overlap = (b1.radius + b2.radius - dist) + 0.1;
            b1.x -= nx * overlap / 2;
            b1.y -= ny * overlap / 2;
            b2.x += nx * overlap / 2;
            b2.y += ny * overlap / 2;
          }
        }
      }
    }

    if (merge && (toRemove.size > 0 || newBodies.length > 0)) {
      bodiesRef.current = bodies.filter(b => !toRemove.has(b.id)).concat(newBodies);
    }
  };

  const updatePhysics = () => {
    const bodies = bodiesRef.current;
    if (bodies.length === 0) return;

    if (integrator === 'Euler') {
      computeAccelerations(bodies);
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.vx += b.ax * DT;
        b.vy += b.ay * DT;
        b.x += b.vx * DT;
        b.y += b.vy * DT;
        
        // Update trail
        if (Math.random() < 0.3) {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > MAX_TRAIL_LENGTH) b.trail.shift();
        }
      }
    } else if (integrator === 'Verlet') {
      // Velocity Verlet Step 1: Update positions and half-step velocities
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.x += b.vx * DT + 0.5 * b.ax * DT * DT;
        b.y += b.vy * DT + 0.5 * b.ay * DT * DT;
        b.vx += 0.5 * b.ax * DT;
        b.vy += 0.5 * b.ay * DT;
      }

      // Step 2: Compute new accelerations
      computeAccelerations(bodies);

      // Step 3: Complete velocity update
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.vx += 0.5 * b.ax * DT;
        b.vy += 0.5 * b.ay * DT;

        // Update trail
        if (Math.random() < 0.3) {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > MAX_TRAIL_LENGTH) b.trail.shift();
        }
      }
    }

    handleCollisions(bodiesRef.current, mergeOnCollision);
  };

  const calculateStats = () => {
    const bodies = bodiesRef.current;
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b1 = bodies[i];
      const vSq = b1.vx * b1.vx + b1.vy * b1.vy;
      ke += 0.5 * b1.mass * vSq;
      px += b1.mass * b1.vx;
      py += b1.mass * b1.vy;

      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pe -= (G * b1.mass * b2.mass) / dist;
      }
    }

    setStats({
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
      momentumX: px,
      momentumY: py,
      totalMomentum: Math.sqrt(px * px + py * py),
      bodyCount: bodies.length
    });
  };

  // --- Rendering ---
  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas with slight opacity for motion blur effect on stars
    ctx.fillStyle = 'rgba(2, 6, 23, 1)'; // Tailwind slate-950
    ctx.fillRect(0, 0, width, height);

    // Draw grid/starfield (static representation)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 678.9) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

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
      // Glow
      const gradient = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * 2);
      gradient.addColorStop(0, b.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  };

  const loop = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;

    // Run physics multiple steps per frame for stability
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      updatePhysics();
    }

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx, canvas.width, canvas.height);
      }
    }

    // Throttle stats calculation
    if (time % 500 < 20) {
      calculateStats();
    }

    lastTimeRef.current = time;
    animationRef.current = requestAnimationFrame(loop);
  }, [mergeOnCollision, integrator]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);
      
      animationRef.current = requestAnimationFrame(loop);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [loop]);

  // --- Interactions ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Random tangential velocity based on center
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let vx = 0;
    let vy = 0;
    if (dist > 0) {
      vx = -(dy / dist) * nextVelocity;
      vy = (dx / dist) * nextVelocity;
    }

    const newBody: Body = {
      id: generateId(),
      x, y, vx, vy, ax: 0, ay: 0,
      mass: nextMass,
      radius: calculateRadius(nextMass),
      color: getRandomColor(),
      trail: []
    };

    bodiesRef.current.push(newBody);
  };

  const clearBodies = () => {
    bodiesRef.current = [];
    setStats({ kineticEnergy: 0, potentialEnergy: 0, totalEnergy: 0, momentumX: 0, momentumY: 0, totalMomentum: 0, bodyCount: 0 });
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bodiesRef.current, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "orbit_preset.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- Presets ---
  const loadPreset = (type: 'two-body' | 'three-body' | 'swirl') => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    let newBodies: Body[] = [];

    if (type === 'two-body') {
      newBodies = [
        { id: generateId(), x: cx - 150, y: cy, vx: 0, vy: 1.5, ax: 0, ay: 0, mass: 200, radius: calculateRadius(200), color: '#3b82f6', trail: [] },
        { id: generateId(), x: cx + 150, y: cy, vx: 0, vy: -1.5, ax: 0, ay: 0, mass: 200, radius: calculateRadius(200), color: '#ef4444', trail: [] }
      ];
    } else if (type === 'three-body') {
      // Figure 8 approximation
      newBodies = [
        { id: generateId(), x: cx - 200, y: cy, vx: 0.5, vy: 1, ax: 0, ay: 0, mass: 150, radius: calculateRadius(150), color: '#10b981', trail: [] },
        { id: generateId(), x: cx, y: cy, vx: -1, vy: -2, ax: 0, ay: 0, mass: 150, radius: calculateRadius(150), color: '#f59e0b', trail: [] },
        { id: generateId(), x: cx + 200, y: cy, vx: 0.5, vy: 1, ax: 0, ay: 0, mass: 150, radius: calculateRadius(150), color: '#8b5cf6', trail: [] }
      ];
    } else if (type === 'swirl') {
      newBodies.push({ id: generateId(), x: cx, y: cy, vx: 0, vy: 0, ax: 0, ay: 0, mass: 1000, radius: calculateRadius(1000), color: '#fbbf24', trail: [] });
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 400;
        const v = Math.sqrt((G * 1000) / dist);
        newBodies.push({
          id: generateId(),
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: -Math.sin(angle) * v,
          vy: Math.cos(angle) * v,
          ax: 0, ay: 0,
          mass: 2 + Math.random() * 5,
          radius: calculateRadius(2),
          color: getRandomColor(),
          trail: []
        });
      }
    }
    bodiesRef.current = newBodies;
  };

  // Initialize with swirl on mount
  useEffect(() => {
    loadPreset('swirl');
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans text-slate-200">
      {/* Simulation Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 cursor-crosshair"
      />

      {/* UI Overlay */}
      <div className="absolute top-4 right-4 w-80 max-h-[95vh] overflow-y-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl flex flex-col gap-6 custom-scrollbar">
        
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Orbit Playground
          </h1>
          <p className