import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

type Vector2 = { x: number; y: number };

interface Body {
  id: string;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  mass: number;
  radius: number;
  color: string;
  trail: Vector2[];
}

const G = 1;
const DT = 0.01;
const TRAIL_LENGTH = 150;
const TRAIL_SKIP = 3; // Save trail point every N frames
const SUBSTEPS = 5;
const SOFTENING = 0.01;

// --- Physics Engine Utilities ---
const calculateAccelerations = (bodies: Body[]): Vector2[] => {
  const accs: Vector2[] = bodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].pos.x - bodies[i].pos.x;
      const dy = bodies[j].pos.y - bodies[i].pos.y;
      const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const dist = Math.sqrt(distSq);
      const force = (G * bodies[i].mass * bodies[j].mass) / distSq;
      
      const ax = (force * dx) / dist;
      const ay = (force * dy) / dist;

      accs[i].x += ax / bodies[i].mass;
      accs[i].y += ay / bodies[i].mass;
      
      accs[j].x -= ax / bodies[j].mass;
      accs[j].y -= ay / bodies[j].mass;
    }
  }
  return accs;
};

const stepVerlet = (bodies: Body[], dt: number) => {
  // 1. Position update
  for (let b of bodies) {
    b.pos.x += b.vel.x * dt + 0.5 * b.acc.x * dt * dt;
    b.pos.y += b.vel.y * dt + 0.5 * b.acc.y * dt * dt;
  }
  
  // 2. New accelerations
  const newAccs = calculateAccelerations(bodies);
  
  // 3. Velocity update
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vel.x += 0.5 * (bodies[i].acc.x + newAccs[i].x) * dt;
    bodies[i].vel.y += 0.5 * (bodies[i].acc.y + newAccs[i].y) * dt;
    bodies[i].acc = newAccs[i];
  }
};

const stepEuler = (bodies: Body[], dt: number) => {
  const accs = calculateAccelerations(bodies);
  for (let i = 0; i < bodies.length; i++) {
    // Explicit Euler (intentionally divergent for demonstration)
    bodies[i].pos.x += bodies[i].vel.x * dt;
    bodies[i].pos.y += bodies[i].vel.y * dt;
    bodies[i].vel.x += accs[i].x * dt;
    bodies[i].vel.y += accs[i].y * dt;
    bodies[i].acc = accs[i];
  }
};

const handleCollisions = (bodies: Body[]): Body[] => {
  const toRemove = new Set<string>();
  const nextBodies = [...bodies];

  for (let i = 0; i < nextBodies.length; i++) {
    if (toRemove.has(nextBodies[i].id)) continue;
    for (let j = i + 1; j < nextBodies.length; j++) {
      if (toRemove.has(nextBodies[j].id)) continue;
      
      const dx = nextBodies[j].pos.x - nextBodies[i].pos.x;
      const dy = nextBodies[j].pos.y - nextBodies[i].pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < nextBodies[i].radius + nextBodies[j].radius) {
        // Inelastic collision merge
        const b1 = nextBodies[i];
        const b2 = nextBodies[j];
        
        const newMass = b1.mass + b2.mass;
        const newVel = {
          x: (b1.mass * b1.vel.x + b2.mass * b2.vel.x) / newMass,
          y: (b1.mass * b1.vel.y + b2.mass * b2.vel.y) / newMass,
        };
        const newPos = {
          x: (b1.mass * b1.pos.x + b2.mass * b2.pos.x) / newMass,
          y: (b1.mass * b1.pos.y + b2.mass * b2.pos.y) / newMass,
        };
        
        b1.mass = newMass;
        b1.vel = newVel;
        b1.pos = newPos;
        b1.radius = Math.max(b1.radius, b2.radius) + 0.05;
        // Keep the color of the heavier body
        if (b2.mass > b1.mass) b1.color = b2.color;
        
        toRemove.add(b2.id);
      }
    }
  }
  
  return nextBodies.filter(b => !toRemove.has(b.id));
};

// --- Presets ---
const PRESETS = {
  figure8: () => {
    const v = 0.466203685;
    const vy = 0.43236573;
    const x = 0.97000436;
    const y = -0.24308753;
    return [
      { id: '1', mass: 1, pos: { x, y }, vel: { x: -v, y: -vy }, acc: { x: 0, y: 0 }, radius: 0.15, color: '#fca5a5', trail: [] },
      { id: '2', mass: 1, pos: { x: -x, y: -y }, vel: { x: -v, y: -vy }, acc: { x: 0, y: 0 }, radius: 0.15, color: '#93c5fd', trail: [] },
      { id: '3', mass: 1, pos: { x: 0, y: 0 }, vel: { x: 2 * v, y: 2 * vy }, acc: { x: 0, y: 0 }, radius: 0.15, color: '#fcd34d', trail: [] }
    ];
  },
  twoBody: () => [
    { id: 'star', mass: 1000, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0.5 }, acc: { x: 0, y: 0 }, radius: 0.6, color: '#fef08a', trail: [] },
    { id: 'planet', mass: 10, pos: { x: 3, y: 0 }, vel: { x: 0, y: -18 }, acc: { x: 0, y: 0 }, radius: 0.2, color: '#86efac', trail: [] },
  ],
  swirl: () => {
    const central: Body = { id: 'center', mass: 2500, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, radius: 0.8, color: '#a78bfa', trail: [] };
    const bodies: Body[] = [central];
    const colors = ['#67e8f9', '#f9a8d4', '#d8b4fe', '#fde047', '#bef264'];
    for (let i = 0; i < 60; i++) {
      const r = 1.5 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const speed = Math.sqrt((G * 2500) / r);
      bodies.push({
        id: `m_${i}`,
        mass: Math.random() * 2 + 0.1,
        pos: { x: r * Math.cos(theta), y: r * Math.sin(theta) },
        vel: { x: -speed * Math.sin(theta), y: speed * Math.cos(theta) },
        acc: { x: 0, y: 0 },
        radius: 0.05 + Math.random() * 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
        trail: []
      });
    }
    return bodies;
  }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>(PRESETS.figure8());
  const requestRef = useRef<number>();
  const frameCountRef = useRef(0);
  
  const [integrator, setIntegrator] = useState<'verlet' | 'euler'>('verlet');
  const [isPaused, setIsPaused] = useState(false);
  const [mergeCollisions, setMergeCollisions] = useState(true);
  const [scale, setScale] = useState(120);
  const [stats, setStats] = useState({ ke: 0, pe: 0, pX: 0, pY: 0, count: 0 });
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);

  // --- Calculations ---
  const updateStats = useCallback(() => {
    let ke = 0;
    let pe = 0;
    let pX = 0;
    let pY = 0;
    const bodies = bodiesRef.current;
    
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const vSq = b.vel.x * b.vel.x + b.vel.y * b.vel.y;
      ke += 0.5 * b.mass * vSq;
      pX += b.mass * b.vel.x;
      pY += b.mass * b.vel.y;
      
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].pos.x - b.pos.x;
        const dy = bodies[j].pos.y - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy + SOFTENING * SOFTENING);
        pe -= (G * b.mass * bodies[j].mass) / dist;
      }
    }
    setStats({ ke, pe, pX, pY, count: bodies.length });
  }, []);

  // --- Rendering Loop ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    const toScreen = (v: Vector2) => ({
      x: cx + v.x * scale,
      y: cy + v.y * scale
    });

    // Draw trails
    bodiesRef.current.forEach(b => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      const start = toScreen(b.trail[0]);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < b.trail.length; i++) {
        const p = toScreen(b.trail[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = b.color + '66'; // 40% opacity
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw bodies
    bodiesRef.current.forEach(b => {
      const pos = toScreen(b.pos);
      ctx.beginPath();