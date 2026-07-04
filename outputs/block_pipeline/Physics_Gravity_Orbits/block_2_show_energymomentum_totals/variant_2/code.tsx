import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- TYPES ---
type Vector = { x: number; y: number };
type Body = {
  id: string;
  mass: number;
  pos: Vector;
  vel: Vector;
  acc: Vector;
  color: string;
  radius: number;
  trail: Vector[];
};
type Stats = {
  kineticE: number;
  potentialE: number;
  totalE: number;
  momentumX: number;
  momentumY: number;
  totalMomentum: number;
  angularMomentum: number;
};
type Integrator = 'euler' | 'verlet';

// --- CONSTANTS & HELPERS ---
const G_CONST = 100;
const SOFTENING = 50; // Prevents infinite forces
const TRAIL_LENGTH = 150;
const DT = 0.05;

const generateId = () => Math.random().toString(36).substr(2, 9);
const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
const calcRadius = (mass: number) => Math.max(2, Math.pow(mass, 1 / 3) * 1.5);

// --- PRESETS ---
const PRESETS: Record<string, () => Body[]> = {
  'Two-Body': () => [
    {
      id: generateId(),
      mass: 5000,
      pos: { x: -150, y: 0 },
      vel: { x: 0, y: -2 },
      acc: { x: 0, y: 0 },
      color: '#3b82f6',
      radius: calcRadius(5000),
      trail: [],
    },
    {
      id: generateId(),
      mass: 5000,
      pos: { x: 150, y: 0 },
      vel: { x: 0, y: 2 },
      acc: { x: 0, y: 0 },
      color: '#ef4444',
      radius: calcRadius(5000),
      trail: [],
    },
  ],
  'Figure-8 (Three-Body)': () => {
    // Standard figure-8 initial conditions scaled for our G and screen
    const p1 = { x: 97.000436, y: -24.308753 };
    const p2 = { x: -97.000436, y: 24.308753 };
    const p3 = { x: 0, y: 0 };
    const v1 = { x: 0.466203685 * 2.5, y: 0.43236573 * 2.5 };
    const v2 = { x: 0.466203685 * 2.5, y: 0.43236573 * 2.5 };
    const v3 = { x: -2 * v1.x, y: -2 * v1.y };

    return [
      { id: generateId(), mass: 1000, pos: p1, vel: v1, acc: { x: 0, y: 0 }, color: '#10b981', radius: calcRadius(1000), trail: [] },
      { id: generateId(), mass: 1000, pos: p2, vel: v2, acc: { x: 0, y: 0 }, color: '#f59e0b', radius: calcRadius(1000), trail: [] },
      { id: generateId(), mass: 1000, pos: p3, vel: v3, acc: { x: 0, y: 0 }, color: '#8b5cf6', radius: calcRadius(1000), trail: [] },
    ];
  },
  'Swirl (Many-Body)': () => {
    const bodies: Body[] = [];
    bodies.push({
      id: generateId(),
      mass: 20000,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      acc: { x: 0, y: 0 },
      color: '#ffffff',
      radius: calcRadius(20000),
      trail: [],
    });
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 300;
      const speed = Math.sqrt((G_CONST * 20000) / dist);
      bodies.push({
        id: generateId(),
        mass: 10 + Math.random() * 50,
        pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
        vel: { x: -Math.sin(angle) * speed, y: Math.cos(angle) * speed },
        acc: { x: 0, y: 0 },
        color: randomColor(),
        radius: calcRadius(30),
        trail: [],
      });
    }
    return bodies;
  },
};

// --- MAIN COMPONENT ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<number>();
  
  // Physics State (Refs for performance in animation loop)
  const bodiesRef = useRef<Body[]>(PRESETS['Two-Body']());
  const integratorRef = useRef<Integrator>('verlet');
  const mergeRef = useRef<boolean>(false);
  const starsRef = useRef<{x: number, y: number, r: number, alpha: number}[]>([]);

  // UI State
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [integratorUI, setIntegratorUI] = useState<Integrator>('verlet');
  const [mergeUI, setMergeUI] = useState<boolean>(false);
  const [selectedBodyData, setSelectedBodyData] = useState<Body | null>(null);

  // Initialize stars once
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        r: Math.random() * 1.5,
        alpha: Math.random(),
      });
    }
    starsRef.current = stars;
  }, []);

  const computeAccelerations = (currentBodies: Body[]): Vector[] => {
    const accels: Vector[] = currentBodies.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < currentBodies.length; i++) {
      for (let j = i + 1; j < currentBodies.length; j++) {
        const b1 = currentBodies[i];
        const b2 = currentBodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        // F = G * m1 * m2 / (r^2 + softening^2)
        const force = (G_CONST * b1.mass * b2.mass) / (distSq + SOFTENING);
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;

        accels[i].x += ax / b1.mass;
        accels[i].y += ay / b1.mass;
        accels[j].x -= ax / b2.mass;
        accels[j].y -= ay / b2.mass;
      }
    }
    return accels;
  };

  const handleCollisions = (currentBodies: Body[]): Body[] => {
    if (!mergeRef.current) return currentBodies;
    const toRemove = new Set<string>();
    const newBodies: Body[] = [];

    for (let i = 0; i < currentBodies.length; i++) {
      if (toRemove.has(currentBodies[i].id)) continue;
      for (let j = i + 1; j < currentBodies.length; j++) {
        if (toRemove.has(currentBodies[j].id)) continue;
        
        const b1 = currentBodies[i];
        const b2 = currentBodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b1.radius + b2.radius) {
          toRemove.add(b1.id);
          toRemove.add(b2.id);
          
          const totalMass = b1.mass + b2.mass;
          // Inelastic collision: perfectly merge
          const vx = (b1.mass * b1.vel.x + b2.mass * b2.vel.x) / totalMass;
          const vy = (b1.mass * b1.vel.y + b2.mass * b2.vel.y) / totalMass;
          const px = (b1.pos.x * b1.mass + b2.pos.x * b2.mass) / totalMass;
          const py = (b1.pos.y * b1.mass + b2.pos.y * b2.mass) / totalMass;

          newBodies.push({
            id: generateId(),
            mass: totalMass,
            pos: { x: px, y: py },
            vel: { x: vx, y: vy },
            acc: { x: 0, y: 0 },
            color: b1.mass > b2.mass ? b1.color : b2.color,
            radius: calcRadius(totalMass),
            trail: [],
          });
          break; // b1 is merged, move to next i
        }
      }
    }

    if (toRemove.size > 0) {
      if (selectedBodyId && toRemove.has(selectedBodyId)) {
        setSelectedBodyId(null);
      }
      return currentBodies.filter((b) => !toRemove.has(b.id)).concat(newBodies);
    }
    return currentBodies;
  };

  const updatePhysics = () => {
    let currentBodies = bodiesRef.current;
    if (currentBodies.length === 0) return;

    if (integratorRef.current === 'euler') {
      // Semi-implicit Euler
      const accels = computeAccelerations(currentBodies);
      for (let i = 0; i < currentBodies.length; i++) {
        const b = currentBodies[i];
        b.acc = accels[i];
        b.vel.x += b.acc.x * DT;
        b.vel.y += b.acc.y * DT;
        b.pos.x += b.vel.x * DT;
        b.pos.y += b.vel.y * DT;
      }
    } else {
      // Velocity Verlet
      // 1. x(t+dt) = x(t) + v(t)dt + 0.5*a(t)dt^2
      for (let i = 0; i < currentBodies.length; i++) {
        const b = currentBodies[i];
        b.pos.x += b.vel.x * DT + 0.5 * b.acc.x * DT * DT;
        b.pos.y += b.vel.y * DT + 0.5 * b.acc.y * DT * DT;
      }
      
      // 2. Compute a(t+dt)
      const nextAccels = computeAccelerations(currentBodies);
      
      // 3. v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))dt
      for (let i = 0; i < currentBodies.length; i++) {
        const b = currentBodies[i];
        b.vel.x += 0.5 * (b.acc.x + nextAccels[i].x) * DT;
        b.vel.y += 0.5 * (b.acc.y + nextAccels[i].y) * DT;
        b.acc = nextAccels[i];
      }
    }

    // Update trails
    for (const b of currentBodies) {
      b.trail.push({ x: b.pos.x, y: b.pos.y });
      if (b.trail.length > TRAIL_LENGTH) {
        b.trail.shift();
      }
    }

    // Handle Collisions
    bodiesRef.current = handleCollisions(currentBodies);
  };

  const calculateStats = () => {
    const bodies = bodiesRef.current;
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;
    let angM = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const speedSq = b.vel.x * b.vel.x + b.vel.y * b.vel.y;
      ke += 0.5 * b.mass * speedSq;
      px += b.mass * b.vel.x;
      py += b.mass * b.vel.y;
      // L = r x p = m * (x*vy - y*vx)
      angM += b.mass * (b.pos.x * b.vel.y - b.pos.y * b.vel.x);

      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        const dx = b2.pos.x - b.pos.x;
        const dy = b2.pos.y - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          pe -= (G_CONST * b.mass * b2.mass) / dist;
        }
      }
    }

    setStats({
      kineticE: ke,
      potentialE: pe,
      totalE: ke + pe,
      momentumX: px,
      momentumY: py,
      totalMomentum: Math.sqrt(px * px + py * py),
      angularMomentum: angM,
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Draw Stars
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const bodies = bodiesRef.current;

    // Draw Trails
    for (const b of bodies) {
      if (b.trail.length < 2) continue;
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
    }

    // Draw Bodies
    for (const b of bodies) {
      // Glow effect
      const gradient = ctx.createRadialGradient(b.pos.x, b.pos.y, b.radius * 0.2, b.pos.x, b.pos.y, b.radius * 2.5);
      gradient.addColorStop(0, b.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Selection Ring
      if (b.id === selectedBodyId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, b.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  };

  const loop = useCallback(() => {
    updatePhysics();

    if (canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
          canvas.width = clientWidth;
          canvas.height = clientHeight;
        }
        draw(ctx, canvas.width, canvas.height);
      }
    }

    // Throttle UI stats update
    if (Math.random() < 0.1) {
      calculateStats();
      if (selectedBodyId) {
        const b = bodiesRef.current.find(x => x.id === selectedBodyId);
        setSelectedBodyData(b ? {