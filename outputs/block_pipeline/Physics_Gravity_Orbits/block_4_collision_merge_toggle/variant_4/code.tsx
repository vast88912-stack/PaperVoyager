import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types ---
type Vector2 = { x: number; y: number };

type Body = {
  id: string;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  trail: Vector2[];
};

type MergeEffect = {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
};

// --- Constants & Helpers ---
const G = 0.5; // Gravitational constant
const TRAIL_LENGTH = 80;
const PHYSICS_SUBSTEPS = 2; // Run physics at higher precision

const generateId = () => Math.random().toString(36).substr(2, 9);

const getRandomColor = () => {
  const hues = [0, 60, 120, 180, 240, 300, 30, 210, 270];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${h}, 80%, 70%)`;
};

const getRadius = (mass: number) => Math.max(2, Math.sqrt(mass) * 1.5);

// --- Presets ---
const PRESETS = {
  twoBody: (width: number, height: number): Body[] => {
    const cx = width / 2;
    const cy = height / 2;
    return [
      { id: generateId(), mass: 800, x: cx - 100, y: cy, vx: 0, vy: -1.2, color: '#fca5a5', trail: [] },
      { id: generateId(), mass: 800, x: cx + 100, y: cy, vx: 0, vy: 1.2, color: '#93c5fd', trail: [] }
    ];
  },
  threeBody: (width: number, height: number): Body[] => {
    // A classic stable figure-8 approximation
    const cx = width / 2;
    const cy = height / 2;
    const p = 150;
    const v = 0.8;
    return [
      { id: generateId(), mass: 500, x: cx - p, y: cy, vx: v, vy: v, color: '#fcd34d', trail: [] },
      { id: generateId(), mass: 500, x: cx + p, y: cy, vx: v, vy: v, color: '#6ee7b7', trail: [] },
      { id: generateId(), mass: 500, x: cx, y: cy, vx: -2 * v, vy: -2 * v, color: '#c4b5fd', trail: [] }
    ];
  },
  swirl: (width: number, height: number): Body[] => {
    const cx = width / 2;
    const cy = height / 2;
    const bodies: Body[] = [
      { id: generateId(), mass: 3000, x: cx, y: cy, vx: 0, vy: 0, color: '#ffffff', trail: [] } // Supermassive center
    ];
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * Math.min(width, height) * 0.4;
      const speed = Math.sqrt((G * 3000) / dist) * 0.9; // orbital velocity
      bodies.push({
        id: generateId(),
        mass: 10 + Math.random() * 20,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: -Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
        color: getRandomColor(),
        trail: []
      });
    }
    return bodies;
  }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Simulation State (stored in refs for performance in rAF loop)
  const bodiesRef = useRef<Body[]>([]);
  const effectsRef = useRef<MergeEffect[]>([]);
  const animationFrameId = useRef<number>();

  // UI State
  const [integrator, setIntegrator] = useState<'euler' | 'verlet'>('verlet');
  const [collisionMerge, setCollisionMerge] = useState<boolean>(true);
  const [stats, setStats] = useState({ ke: 0, pe: 0, totalE: 0, pTotal: 0, count: 0 });
  
  // Spawner Settings
  const [spawnMass, setSpawnMass] = useState(100);
  const [spawnVx, setSpawnVx] = useState(0);
  const [spawnVy, setSpawnVy] = useState(0);

  // Load a preset
  const loadPreset = useCallback((presetName: keyof typeof PRESETS) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    bodiesRef.current = PRESETS[presetName](width, height);
    effectsRef.current = [];
  }, []);

  // Initialization & Resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    loadPreset('swirl');

    return () => window.removeEventListener('resize', handleResize);
  }, [loadPreset]);

  // Main Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const loop = () => {
      // Background clear
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let bodies = bodiesRef.current;
      const dt = 1 / PHYSICS_SUBSTEPS;

      // --- PHYSICS SUBSTEPS ---
      for (let step = 0; step < PHYSICS_SUBSTEPS; step++) {
        const accelerations = new Array(bodies.length).fill(0).map(() => ({ x: 0, y: 0 }));

        // 1. Calculate Gravity Forces
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const b1 = bodies[i];
            const b2 = bodies[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) + 0.1; // softening

            const force = (G * b1.mass * b2.mass) / (distSq + 1); // softened force
            const ax = (force * dx) / dist;
            const ay = (force * dy) / dist;

            accelerations[i].x += ax / b1.mass;
            accelerations[i].y += ay / b1.mass;
            accelerations[j].x -= ax / b2.mass;
            accelerations[j].y -= ay / b2.mass;
          }
        }

        // 2. Integration
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (integrator === 'euler') {
            // Standard Euler
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vx += accelerations[i].x * dt;
            b.vy += accelerations[i].y * dt;
          } else {
            // Symplectic Euler (Often grouped with Verlet for simple 1st order symplectic)
            b.vx += accelerations[i].x * dt;
            b.vy += accelerations[i].y * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
          }
        }

        // 3. Collision Merge Logic (The Core Focus Feature)
        if (collisionMerge) {
          const mergedIndices = new Set<number>();
          const nextBodies: Body[] = [];

          for (let i = 0; i < bodies.length; i++) {
            if (mergedIndices.has(i)) continue;
            let currentBody = bodies[i];

            for (let j = i + 1; j < bodies.length; j++) {
              if (mergedIndices.has(j)) continue;
              const targetBody = bodies[j];

              const dx = targetBody.x - currentBody.x;
              const dy = targetBody.y - currentBody.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              const r1 = getRadius(currentBody.mass);
              const r2 = getRadius(targetBody.mass);

              if (dist < (r1 + r2) * 0.8) { // 0.8 factor for slight overlap before merge
                // MERGE HAPPENS
                mergedIndices.add(j);
                
                const totalMass = currentBody.mass + targetBody.mass;
                
                // Conservation of momentum
                const newVx = (currentBody.vx * currentBody.mass + targetBody.vx * targetBody.mass) / totalMass;
                const newVy = (currentBody.vy * currentBody.mass + targetBody.vy * targetBody.mass) / totalMass;
                
                // Center of mass position
                const newX = (currentBody.x * currentBody.mass + targetBody.x * targetBody.mass) / totalMass;
                const newY = (currentBody.y * currentBody.mass + targetBody.y * targetBody.mass) / totalMass;

                // Spawn beautiful shockwave effect
                effectsRef.current.push({
                  id: generateId(),
                  x: newX,
                  y: newY,
                  radius: r1 + r2,
                  maxRadius: (r1 + r2) * 3 + 20,
                  life: 1.0,
                  maxLife: 1.0,
                  color: currentBody.mass > targetBody.mass ? currentBody.color : targetBody.color
                });

                currentBody = {
                  ...currentBody,
                  mass: totalMass,
                  x: newX,
                  y: newY,
                  vx: newVx,
                  vy: newVy,
                  color: currentBody.mass > targetBody.mass ? currentBody.color : targetBody.color,
                  // Keep trail of the larger body
                };
              }
            }
            nextBodies.push(currentBody);
          }
          bodies = nextBodies;
          bodiesRef.current = bodies;
        }
      }

      // --- STATS CALCULATION (Throttled) ---
      if (frameCount % 10 === 0) {
        let ke = 0;
        let pe = 0;
        let px = 0;
        let py = 0;

        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          const vSq = b.vx * b.vx + b.vy * b.vy;
          ke += 0.5 * b.mass * vSq;
          px += b.mass * b.vx;
          py += b.mass * b.vy;

          for (let j = i + 1; j < bodies.length; j++) {
            const b2 = bodies[j];
            const dx = b2.x - b.x;
            const dy = b2.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
            pe -= (G * b.mass * b2.mass) / dist;
          }
        }
        
        const pTotal = Math.sqrt(px * px + py * py);
        setStats({
          ke,
          pe,
          totalE: ke + pe,
          pTotal,
          count: bodies.length
        });
      }

      // --- RENDERING ---
      
      // Update Trails
      if (frameCount % 3 === 0) {
        bodies.forEach(b => {
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > TRAIL_LENGTH) {
            b.trail.shift();
          }
        });
      }

      // Draw Trails
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      bodies.forEach(b => {
        if (b.trail.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
        }
        ctx.strokeStyle = `${b.color}66`; // 40% opacity hex
        ctx.lineWidth = Math.min(2, getRadius(b.mass) / 2);
        ctx.stroke();
      });

      // Draw Bodies
      bodies.forEach(b => {
        const radius = getRadius(b.mass);
        
        // Glow effect
        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius * 2.5);
        gradient.addColorStop(0, `${b.color}ff`);
        gradient.addColorStop(0.3, `${b.color}aa`);
        gradient.addColorStop(1, `${b.color}00`);

        ctx.beginPath();
        ctx.arc(b.x, b.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // Draw Collision Effects
      const activeEffects: MergeEffect[] = [];
      effectsRef.current.forEach(eff => {
        eff.life -= 0.03;
        if (eff.life > 0) {
          const progress = 1 - (eff.life / eff.maxLife);
          const currentRadius = eff.radius + (eff.maxRadius - eff.radius) * Math.pow(progress, 0.5);
          
          ctx.beginPath();
          ctx.arc(eff.x, eff.y, currentRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `${eff.color}${Math.floor(eff.life * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 3 * eff.life;
          ctx.stroke();
          
          activeEffects.push(eff);
        }
      });
      effectsRef.current = activeEffects;

      frameCount++;
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [integrator, collisionMerge]);

  // Handle Canvas Click to Spawn Body
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    bodiesRef.current.push({
      id: generateId(),
      mass: spawnMass,
      x,
      y,
      vx: spawnVx,
      vy: spawnVy,
      color: getRandomColor(),
      trail: []
    });
  };

  // Export JSON
  const handleExport = () => {
    // Strip trails to keep JSON clean
    const cleanBodies = bodiesRef.current.map(({ trail, ...rest }) => rest);
    const data = JSON.stringify(cleanBodies, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbit_preset.json';
    a.click();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050510] font-mono text-xs text-slate-300 select-none">
      {/* Simulation Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 cursor-crosshair z-0"
      />

      {/* Main Control Panel */}
      <div className="absolute top-4 right-4 w-72 bg-black/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-2xl z-10 flex flex-col gap-6">
        
        {/* Title */}
        <div>
          <h1 className="text-lg font-bold text-white tracking-widest uppercase mb-1 flex items-center gap-2">
            Orbit Playground
          </h1>
          <p className