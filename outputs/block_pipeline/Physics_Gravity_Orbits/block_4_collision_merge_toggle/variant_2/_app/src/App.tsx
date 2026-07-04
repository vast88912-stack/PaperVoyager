import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types & Interfaces ---
interface Vector2 {
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
  trail: Vector2[];
}

interface Flash {
  x: number;
  y: number;
  maxRadius: number;
  life: number; // 1.0 down to 0.0
  color: string;
}

// --- Constants ---
const G = 0.8; // Gravitational constant for simulation
const DT = 0.5; // Time step
const MAX_TRAIL = 60;
const SOFTENING = 2.0; // Prevents infinite forces at near-zero distances

// --- Helpers ---
const generateId = () => Math.random().toString(36).substring(2, 9);

const randomColor = () => {
  const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb923c', '#34d399', '#facc15'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const createBody = (x: number, y: number, vx: number, vy: number, mass: number): Body => {
  const radius = Math.max(3, Math.sqrt(mass) * 1.5);
  return {
    id: generateId(),
    x, y, vx, vy, mass, radius,
    color: randomColor(),
    trail: []
  };
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Simulation State (Refs for performance in RAF)
  const bodiesRef = useRef<Body[]>([]);
  const flashesRef = useRef<Flash[]>([]);
  const mergeEnabledRef = useRef<boolean>(true);
  
  // UI State
  const [mergeEnabled, setMergeEnabled] = useState<boolean>(true);
  const [stats, setStats] = useState({ count: 0, totalMass: 0, kineticEnergy: 0 });

  // Sync ref with state
  useEffect(() => {
    mergeEnabledRef.current = mergeEnabled;
  }, [mergeEnabled]);

  // --- Physics Engine ---
  const updatePhysics = useCallback(() => {
    const bodies = bodiesRef.current;
    const flashes = flashesRef.current;
    const toRemove = new Set<string>();
    let totalKinetic = 0;

    // 1. Calculate Gravity & Collisions
    for (let i = 0; i < bodies.length; i++) {
      if (toRemove.has(bodies[i].id)) continue;
      
      for (let j = i + 1; j < bodies.length; j++) {
        if (toRemove.has(bodies[j].id)) continue;
        
        const b1 = bodies[i];
        const b2 = bodies[j];
        
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        const minDist = b1.radius + b2.radius;

        // Collision Detected
        if (dist < minDist) {
          if (mergeEnabledRef.current) {
            // --- INELASTIC MERGE ---
            const totalMass = b1.mass + b2.mass;
            // Conservation of momentum
            const newVx = (b1.vx * b1.mass + b2.vx * b2.mass) / totalMass;
            const newVy = (b1.vy * b1.mass + b2.vy * b2.mass) / totalMass;
            
            // Conservation of area for new radius
            const newRadius = Math.sqrt(b1.radius * b1.radius + b2.radius * b2.radius);
            
            // Visual Flash Effect
            flashes.push({
              x: (b1.x + b2.x) / 2,
              y: (b1.y + b2.y) / 2,
              maxRadius: newRadius * 4,
              life: 1.0,
              color: b1.mass > b2.mass ? b1.color : b2.color
            });

            // Merge into b1, remove b2
            b1.mass = totalMass;
            b1.vx = newVx;
            b1.vy = newVy;
            b1.radius = newRadius;
            if (b2.mass > b1.mass) b1.color = b2.color; // Keep color of larger body
            
            toRemove.add(b2.id);
            continue; // Skip gravity calc for this pair
          } else {
            // --- ELASTIC BOUNCE ---
            // Normal vector
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Relative velocity
            const rvx = b1.vx - b2.vx;
            const rvy = b1.vy - b2.vy;
            
            // Velocity along the normal
            const velAlongNormal = rvx * nx + rvy * ny;
            
            // Do not resolve if velocities are separating
            if (velAlongNormal > 0) continue;
            
            // Restitution (elasticity)
            const e = 0.8; 
            
            // Impulse scalar
            let jImpulse = -(1 + e) * velAlongNormal;
            jImpulse /= (1 / b1.mass + 1 / b2.mass);
            
            // Apply impulse
            const impulseX = jImpulse * nx;
            const impulseY = jImpulse * ny;
            
            b1.vx += impulseX / b1.mass;
            b1.vy += impulseY / b1.mass;
            b2.vx -= impulseX / b2.mass;
            b2.vy -= impulseY / b2.mass;

            // Positional correction to prevent sinking
            const percent = 0.2; // Penetration allowance
            const slop = 0.1; 
            const penetration = minDist - dist;
            const correction = Math.max(penetration - slop, 0) / (1 / b1.mass + 1 / b2.mass) * percent;
            
            const cx = nx * correction;
            const cy = ny * correction;
            
            b1.x -= cx / b1.mass;
            b1.y -= cy / b1.mass;
            b2.x += cx / b2.mass;
            b2.y += cy / b2.mass;
          }
        }

        // Gravity Force
        const force = (G * b1.mass * b2.mass) / (distSq + SOFTENING);
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;

        b1.vx += (ax / b1.mass) * DT;
        b1.vy += (ay / b1.mass) * DT;
        b2.vx -= (ax / b2.mass) * DT;
        b2.vy -= (ay / b2.mass) * DT;
      }
    }

    // 2. Update Positions & Trails
    const survivingBodies = bodies.filter(b => !toRemove.has(b.id));
    let totalMass = 0;

    for (const b of survivingBodies) {
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      
      // Update trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > MAX_TRAIL) {
        b.trail.shift();
      }

      // Stats
      totalMass += b.mass;
      const speedSq = b.vx * b.vx + b.vy * b.vy;
      totalKinetic += 0.5 * b.mass * speedSq;
    }

    // 3. Update Flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].life -= 0.05;
      if (flashes[i].life <= 0) flashes.splice(i, 1);
    }

    bodiesRef.current = survivingBodies;

    // 4. Periodically update React state for UI (throttle to avoid excessive re-renders)
    if (Math.random() < 0.1) {
      setStats({
        count: survivingBodies.length,
        totalMass: Math.round(totalMass),
        kineticEnergy: Math.round(totalKinetic)
      });
    }
  }, []);

  // --- Rendering Engine ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Clear background with slight fade for motion blur effect
    ctx.fillStyle = '#0b0f19'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid/starfield subtle background
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
       const sx = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
       const sy = (Math.cos(i * 321.12) * 0.5 + 0.5) * canvas.height;
       ctx.globalAlpha = 0.2;
       ctx.beginPath();
       ctx.arc(sx, sy, 1, 0, Math.PI * 2);
       ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Draw Trails
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of bodiesRef.current) {
      if (b.trail.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      // Gradient trail opacity
      ctx.strokeStyle = b.color;
      ctx.lineWidth = Math.max(1, b.radius * 0.4);
      ctx.globalAlpha = 0.3;
      ctx.stroke();
    }

    // Draw Flashes
    for (const f of flashesRef.current) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.maxRadius * (1 - f.life), 0, Math.PI * 2);
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 4 * f.life;
      ctx.globalAlpha = f.life;
      ctx.stroke();
    }

    // Draw Bodies
    ctx.globalAlpha = 1.0;
    for (const b of bodiesRef.current) {
      // Glow
      const gradient = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * 2.5);
      gradient.addColorStop(0, b.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }, []);

  // --- Main Loop ---
  useEffect(() => {
    let animationFrameId: number;
    
    const loop = () => {
      updatePhysics();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    
    loop();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [updatePhysics, render]);

  // --- Resize Handler ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Interactions ---
  const spawnScenario = (type: 'head-on' | 'cluster') => {
    if (!canvasRef.current) return;
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    
    if (type === 'head-on') {
      bodiesRef.current = [
        createBody(cx - 300, cy, 3, 0, 80),
        createBody(cx + 300, cy, -3, 0, 80),
        createBody(cx, cy - 300, 0, 3, 40),
        createBody(cx, cy + 300, 0, -3, 40),
      ];
    } else {
      const newBodies: Body[] = [];
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 300 + 50;
        const speed = Math.random() * 2 + 1;
        newBodies.push(
          createBody(
            cx + Math.cos(angle) * dist,
            cy + Math.sin(angle) * dist,
            -Math.sin(angle) * speed,
            Math.cos(angle) * speed,
            Math.random() * 10 + 2
          )
        );
      }
      // Add a heavy center star
      newBodies.push(createBody(cx, cy, 0, 0, 500));
      bodiesRef.current = newBodies;
    }
    flashesRef.current = [];
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    bodiesRef.current.push(createBody(x, y, (Math.random()-0.5)*2, (Math.random()-0.5)*2, Math.random() * 30 + 10));
  };

  // Initial Scenario
  useEffect(() => {
    setTimeout(() => spawnScenario('cluster'), 100);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-[#0b0f19] overflow-hidden font-sans selection:bg-indigo-500/30">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block w-full h-full cursor-crosshair"
      />

      {/* --- UI Overlay --- */}
      <div className="absolute top-6 right-6 w-80 flex flex-col gap-6 pointer-events-none">
        
        {/* Module 5: Collision Merge Toggle (Focus) */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-2xl pointer-events-auto transition-all">
          <div className="mb-6 text-center">
            <h2 className="text-slate-200 text-sm font-bold tracking-widest uppercase opacity-80 mb-1">Collision Engine</h2>
            <p className="text-slate-500 text-xs">Determine how bodies interact on impact.</p>
          </div>

          <div 
            onClick={() => setMergeEnabled(!mergeEnabled)}
            className="relative flex items-center w-full h-16 bg-slate-950 rounded-2xl p-1.5 cursor-pointer overflow-hidden shadow-inner border border-slate-800"
          >
            {/* Sliding Background Indicator */}
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-xl transition-all duration-500 ease-out shadow-lg ${
                mergeEnabled 
                  ? 'translate-x-[100%] bg-gradient-to-br from-rose-500 to-orange-600 shadow-orange-500/40' 
                  : 'translate-x-0 bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/40'
              }`}
            />
            
            {/* Labels */}
            <div className="relative z-10 flex w-full h-full">
              <div className={`flex-1 flex items-center justify-center font-semibold text-sm transition-colors duration-300 ${!mergeEnabled ? 'text-white' : 'text-slate-500'}`}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Elastic Bounce
              </div>
              <div className={`flex-1 flex items-center justify-center font-semibold text-sm transition-colors duration-300 ${mergeEnabled ? 'text-white' : 'text-slate-500'}`}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Inelastic Merge
              </div>
            </div>
          </div>

          {/* Contextual Description */}
          <div className="mt-5 text-xs text-slate-400 leading-relaxed min-h-[40px]">
            {mergeEnabled 
              ? <span className="text-orange-300">Bodies fuse upon contact, conserving momentum and combining mass.</span>
              : <span className="text-cyan-300">Bodies deflect upon contact, preserving individual masses and transferring kinetic energy.</span>
            }
          </div>
        </div>

        {/* Supporting UI: Stats & Controls */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-5 rounded-3xl shadow-xl pointer-events-auto