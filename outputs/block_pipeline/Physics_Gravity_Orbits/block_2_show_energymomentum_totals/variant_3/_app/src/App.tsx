import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- TYPES ---
type Vector2 = { x: number; y: number };
type Body = {
  id: string;
  m: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  history: Vector2[];
};

type Integrator = 'euler' | 'verlet';

type Settings = {
  G: number;
  dt: number;
  integrator: Integrator;
  collisionMerge: boolean;
  scale: number;
};

type Stats = {
  kinetic: number;
  potential: number;
  total: number;
  px: number;
  py: number;
};

// --- CONSTANTS & HELPERS ---
const MAX_TRAIL = 100;
const SOFTENING = 0.01;

const generateId = () => Math.random().toString(36).substring(2, 9);
const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;

const computeStats = (bodies: Body[], G: number): Stats => {
  let kinetic = 0;
  let potential = 0;
  let px = 0;
  let py = 0;

  for (let i = 0; i < bodies.length; i++) {
    const bi = bodies[i];
    const speedSq = bi.vx * bi.vx + bi.vy * bi.vy;
    kinetic += 0.5 * bi.m * speedSq;
    px += bi.m * bi.vx;
    py += bi.m * bi.vy;

    for (let j = i + 1; j < bodies.length; j++) {
      const bj = bodies[j];
      const dx = bj.x - bi.x;
      const dy = bj.y - bi.y;
      const dist = Math.sqrt(dx * dx + dy * dy + SOFTENING);
      potential -= (G * bi.m * bj.m) / dist;
    }
  }

  return { kinetic, potential, total: kinetic + potential, px, py };
};

// --- PRESETS ---
const PRESETS = {
  twoBody: (): { bodies: Body[]; settings: Partial<Settings> } => {
    return {
      settings: { G: 1, dt: 0.1, scale: 1 },
      bodies: [
        { id: generateId(), m: 1000, x: 0, y: 0, vx: 0, vy: -0.5, radius: 20, color: '#f59e0b', history: [] },
        { id: generateId(), m: 10, x: 200, y: 0, vx: 0, vy: 2.5, radius: 6, color: '#3b82f6', history: [] }
      ]
    };
  },
  figure8: (): { bodies: Body[]; settings: Partial<Settings> } => {
    // Classic stable Figure-8
    const v3x = -0.93240737;
    const v3y = -0.86473146;
    const p1x = 0.97000436;
    const p1y = -0.24308753;
    return {
      settings: { G: 1, dt: 0.005, scale: 200 },
      bodies: [
        { id: generateId(), m: 1, x: p1x, y: p1y, vx: -v3x / 2, vy: -v3y / 2, radius: 8, color: '#ef4444', history: [] },
        { id: generateId(), m: 1, x: -p1x, y: -p1y, vx: -v3x / 2, vy: -v3y / 2, radius: 8, color: '#10b981', history: [] },
        { id: generateId(), m: 1, x: 0, y: 0, vx: v3x, vy: v3y, radius: 8, color: '#8b5cf6', history: [] }
      ]
    };
  },
  swirl: (): { bodies: Body[]; settings: Partial<Settings> } => {
    const bodies: Body[] = [
      { id: generateId(), m: 5000, x: 0, y: 0, vx: 0, vy: 0, radius: 25, color: '#a855f7', history: [] }
    ];
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 300;
      const v = Math.sqrt((1 * 5000) / r) * 0.9; // orbital velocity
      bodies.push({
        id: generateId(),
        m: Math.random() * 2 + 0.1,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: -Math.sin(angle) * v,
        vy: Math.cos(angle) * v,
        radius: 2,
        color: randomColor(),
        history: []
      });
    }
    return { settings: { G: 1, dt: 0.05, scale: 1 }, bodies };
  }
};

// --- MAIN APP ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // App State
  const [isRunning, setIsRunning] = useState(true);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [hoveredBodyId, setHoveredBodyId] = useState<string | null>(null);
  
  // Physics & Body State (Managed via refs for simulation loop performance, synced to React for UI)
  const bodiesRef = useRef<Body[]>([]);
  const settingsRef = useRef<Settings>({ G: 1, dt: 0.05, integrator: 'verlet', collisionMerge: false, scale: 1 });
  const initialEnergyRef = useRef<number>(0);
  
  // UI State mirrors
  const [uiSettings, setUiSettings] = useState<Settings>(settingsRef.current);
  const [uiBodies, setUiBodies] = useState<Body[]>([]);
  const [stats, setStats] = useState<Stats>({ kinetic: 0, potential: 0, total: 0, px: 0, py: 0 });

  // Update React UI state from Refs (throttled visually)
  const syncUI = useCallback(() => {
    setUiBodies([...bodiesRef.current]);
    const currentStats = computeStats(bodiesRef.current, settingsRef.current.G);
    setStats(currentStats);
  }, []);

  // --- PHYSICS ENGINE ---
  const computeAccelerations = (bodies: Body[], G: number): Vector2[] => {
    const acc = bodies.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distSq = dx * dx + dy * dy + SOFTENING;
        const f = G / (distSq * Math.sqrt(distSq));
        
        const fx = f * dx;
        const fy = f * dy;
        
        acc[i].x += fx * bodies[j].m;
        acc[i].y += fy * bodies[j].m;
        
        acc[j].x -= fx * bodies[i].m;
        acc[j].y -= fy * bodies[i].m;
      }
    }
    return acc;
  };

  const handleCollisions = (bodies: Body[]): Body[] => {
    const newBodies = [...bodies];
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < newBodies.length; i++) {
        for (let j = i + 1; j < newBodies.length; j++) {
          const b1 = newBodies[i];
          const b2 = newBodies[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Scale collision distance for UI scale to make it feel right
          if (dist * settingsRef.current.scale < (b1.radius + b2.radius)) {
            // Inelastic collision merge
            const m = b1.m + b2.m;
            const vx = (b1.m * b1.vx + b2.m * b2.vx) / m;
            const vy = (b1.m * b1.vy + b2.m * b2.vy) / m;
            const x = (b1.m * b1.x + b2.m * b2.x) / m;
            const y = (b1.m * b1.y + b2.m * b2.y) / m;
            const radius = Math.sqrt(b1.radius * b1.radius + b2.radius * b2.radius); // Area preserving
            
            newBodies[i] = { ...b1, m, x, y, vx, vy, radius };
            newBodies.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
    return newBodies;
  };

  const stepPhysics = () => {
    let currentBodies = bodiesRef.current;
    const { dt, G, integrator, collisionMerge } = settingsRef.current;

    if (collisionMerge) {
      currentBodies = handleCollisions(currentBodies);
    }

    if (integrator === 'euler') {
      // Semi-implicit Euler
      const acc = computeAccelerations(currentBodies, G);
      for (let i = 0; i < currentBodies.length; i++) {
        const b = currentBodies[i];
        b.vx += acc[i].x * dt;
        b.vy += acc[i].y * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
    } else {
      // Velocity Verlet
      const acc1 = computeAccelerations(currentBodies, G);
      for (let i = 0; i < currentBodies.length; i++) {
        const b = currentBodies[i];
        b.x += b.vx * dt + 0.5 * acc1[i].x * dt * dt;
        b.y += b.vy * dt + 0.5 * acc1[i].y * dt * dt;
      }
      
      const acc2 = computeAccelerations(currentBodies, G);
      for (let i = 0; i < currentBodies.length; i++) {
        const b = currentBodies[i];
        b.vx += 0.5 * (acc1[i].x + acc2[i].x) * dt;
        b.vy += 0.5 * (acc1[i].y + acc2[i].y) * dt;
      }
    }

    // Update trails
    for (let b of currentBodies) {
      b.history.push({ x: b.x, y: b.y });
      if (b.history.length > MAX_TRAIL) {
        b.history.shift();
      }
    }

    bodiesRef.current = currentBodies;
  };

  // --- RENDER LOOP ---
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#0f172a'; // tailwind slate-900
    ctx.fillRect(0, 0, w, h);
    
    // Draw grid or stars here if desired...
    ctx.fillStyle = '#ffffff';
    for(let i=0; i<100; i++) {
      // Static starfield
      const sx = (Math.sin(i*13.2) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i*7.1) * 0.5 + 0.5) * h;
      ctx.globalAlpha = (Math.sin(Date.now()*0.001 + i) * 0.5 + 0.5) * 0.5 + 0.1;
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    const { scale } = settingsRef.current;
    const cx = w / 2;
    const cy = h / 2;

    for (const b of bodiesRef.current) {
      // Trail
      if (b.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(cx + b.history[0].x * scale, cy + b.history[0].y * scale);
        for (let i = 1; i < b.history.length; i++) {
          ctx.lineTo(cx + b.history[i].x * scale, cy + b.history[i].y * scale);
        }
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
      }

      // Body
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(cx + b.x * scale, cy + b.y * scale, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();

      // Highlight if selected/hovered
      if (b.id === selectedBodyId || b.id === hoveredBodyId) {
        ctx.beginPath();
        ctx.arc(cx + b.x * scale, cy + b.y * scale, b.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3ee'; // cyan-400
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [selectedBodyId,