import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
type Vector2 = { x: number; y: number };

interface Body {
  id: string;
  mass: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  color: string;
  radius: number;
  trail: Vector2[];
}

interface SimulationState {
  bodies: Body[];
  isPlaying: boolean;
  integrator: 'euler' | 'verlet';
  collisions: boolean;
  G: number;
  softening: number;
  trailLength: number;
}

interface Stats {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentum: number;
}

// --- Constants & Helpers ---
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const calculateRadius = (mass: number) => Math.max(2, Math.pow(mass, 1 / 3) * 2);

// --- Presets ---
const PRESETS = {
  twoBody: (): Body[] => [
    { id: generateId(), mass: 1000, pos: { x: 400, y: 300 }, vel: { x: 0, y: 20 }, acc: { x: 0, y: 0 }, color: '#f59e0b', radius: calculateRadius(1000), trail: [] },
    { id: generateId(), mass: 1000, pos: { x: 600, y: 300 }, vel: { x: 0, y: -20 }, acc: { x: 0, y: 0 }, color: '#3b82f6', radius: calculateRadius(1000), trail: [] },
  ],
  threeBody: (): Body[] => [
    { id: generateId(), mass: 500, pos: { x: 400, y: 300 }, vel: { x: 10, y: 20 }, acc: { x: 0, y: 0 }, color: '#ef4444', radius: calculateRadius(500), trail: [] },
    { id: generateId(), mass: 500, pos: { x: 600, y: 300 }, vel: { x: -10, y: -20 }, acc: { x: 0, y: 0 }, color: '#10b981', radius: calculateRadius(500), trail: [] },
    { id: generateId(), mass: 500, pos: { x: 500, y: 400 }, vel: { x: -20, y: 10 }, acc: { x: 0, y: 0 }, color: '#8b5cf6', radius: calculateRadius(500), trail: [] },
  ],
  swirl: (): Body[] => {
    const bodies: Body[] = [
      { id: generateId(), mass: 5000, pos: { x: 500, y: 300 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, color: '#ffffff', radius: calculateRadius(5000), trail: [] }
    ];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 300;
      const speed = Math.sqrt(100 * 5000 / dist); // Orbital velocity approx
      bodies.push({
        id: generateId(),
        mass: 10 + Math.random() * 40,
        pos: { x: 500 + Math.cos(angle) * dist, y: 300 + Math.sin(angle) * dist },
        vel: { x: -Math.sin(angle) * speed, y: Math.cos(angle) * speed },
        acc: { x: 0, y: 0 },
        color: getRandomColor(),
        radius: calculateRadius(10 + Math.random() * 40),
        trail: []
      });
    }
    return bodies;
  }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const starsRef = useRef<{ x: number; y: number; size: number; opacity: number }[]>([]);

  // Engine state kept in ref for performance in animation loop
  const engine = useRef<SimulationState>({
    bodies: PRESETS.twoBody(),
    isPlaying: true,
    integrator: 'verlet',
    collisions: false,
    G: 100,
    softening: 100,
    trailLength: 100,
  });

  // UI State
  const [uiTrigger, setUiTrigger] = useState(0);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ kineticEnergy: 0, potentialEnergy: 0, totalEnergy: 0, momentum: 0 });

  // Initialize stars
  useEffect(() => {
    starsRef.current = Array.from({ length: 200 }).map(() => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      size: Math.random() * 1.5,
      opacity: Math.random()
    }));
  }, []);

  // --- Physics Engine ---
  const computeForces = (bodies: Body[]) => {
    const { G, softening } = engine.current;
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
        const distSq = dx * dx + dy * dy + softening;
        const dist = Math.sqrt(distSq);
        const force = (G * b1.mass * b2.mass) / distSq;
        
        const ax = (force * dx) / dist;
        const ay = (force * dy) / dist;

        b1.acc.x += ax / b1.mass;
        b1.acc.y += ay / b1.mass;
        b2.acc.x -= ax / b2.mass;
        b2.acc.y -= ay / b2.mass;
      }
    }
  };

  const handleCollisions = (bodies: Body[]) => {
    if (!engine.current.collisions) return bodies;
    const newBodies = [...bodies];
    let i = 0;
    while (i < newBodies.length) {
      let j = i + 1;
      let merged = false;
      while (j < newBodies.length) {
        const b1 = newBodies[i];
        const b2 = newBodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < b1.radius + b2.radius) {
          // Merge b2 into b1
          const totalMass = b1.mass + b2.mass;
          b1.vel.x = (b1.vel.x * b1.mass + b2.vel.x * b2.mass) / totalMass;
          b1.vel.y = (b1.vel.y * b1.mass + b2.vel.y * b2.mass) / totalMass;
          b1.pos.x = (b1.pos.x * b1.mass + b2.pos.x * b2.mass) / totalMass;
          b1.pos.y = (b1.pos.y * b1.mass + b2.pos.y * b2.mass) / totalMass;
          b1.mass = totalMass;
          b1.radius = calculateRadius(totalMass);
          
          newBodies.splice(j, 1);
          if (selectedBodyId === b2.id) setSelectedBodyId(b1.id);
          merged = true;
        } else {
          j++;
        }
      }
      if (!merged) i++;
    }
    return newBodies;
  };

  const stepPhysics = () => {
    const dt = 0.016; // Fixed timestep for stability
    let bodies = engine.current.bodies;

    if (engine.current.integrator === 'euler') {
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
      const oldAcc = bodies.map(b => ({ ...b.acc }));
      computeForces(bodies);
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.vel.x += 0.5 * (oldAcc[i].x + b.acc.x) * dt;
        b.vel.y += 0.5 * (oldAcc[i].y + b.acc.y) * dt;
      }
    }

    // Update trails
    for (const b of bodies) {
      b.trail.push({ x: b.pos.x, y: b.pos.y });
      if (b.trail.length > engine.current.trailLength) {
        b.trail.shift();
      }
    }

    engine.current.bodies = handleCollisions(bodies);
  };

  // --- Rendering ---
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear & Background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.beginPath();
      ctx.arc(star.x % canvas.width, star.y % canvas.height, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Trails
    engine.current.bodies.forEach(b => {
      if (b.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
      }
      ctx.strokeStyle = `${b.color}66`; // 40% opacity
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw Bodies
    engine.current.bodies.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      
      // Highlight selected
      if (b.id === selectedBodyId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, b.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.stroke();
      }
    });
  };

  // --- Main Loop ---
  const loop = useCallback(() => {
    if (engine.current.isPlaying) {
      stepPhysics();
    }
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [selectedBodyId]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  // --- Resize Handler ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        draw(); // Redraw immediately on resize
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- UI Sync & Stats Calculation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setUiTrigger(t => t + 1); // Force UI update for sliders

      // Calculate Stats
      const bodies = engine.current.bodies;
      let ke = 0;
      let pe = 0;
      let px = 0;
      let py = 0;

      for (let i = 0; i < bodies.length; i++) {
        const b1 = bodies[i];
        const vSq = b1.vel.x * b1.vel.x + b1.vel.y * b1.vel.y;
        ke += 0.5 * b1.mass * vSq;
        px += b1.mass * b1.vel.x;
        py += b1.mass * b1.vel.y;

        for (let j = i + 1; j < bodies.length; j++) {
          const b2 = bodies[j];
          const dx = b2.pos.x - b1.pos.x;
          const dy = b2.pos.y - b1.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy + engine.current.softening);
          pe -= (engine.current.G * b1.mass * b2.mass) / dist;
        }
      }

      setStats({
        kineticEnergy: ke,
        potentialEnergy: pe,
        totalEnergy: ke + pe,
        momentum: Math.sqrt(px * px + py * py)
      });

    }, 100); // 10fps UI update
    return () => clearInterval(interval);
  }, []);

  // --- Actions ---
  const loadPreset = (presetName: keyof typeof PRESETS) => {
    engine.current.bodies = PRESETS[presetName]();
    setSelectedBodyId(null);
    if (!engine.current.isPlaying) draw();
  };

  const addBody = () => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1000;
    const h = canvas ? canvas.height : 800;
    const mass = 100 + Math.random() * 900;
    const newBody: Body = {
      id: generateId(),
      mass,
      pos: { x: w / 2 + (Math.random() - 0.5) * 400, y: h / 2 + (Math.random() - 0.5) * 400 },
      vel: { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 },
      acc: { x: 0, y: 0 },
      color: getRandomColor(),
      radius: calculateRadius(mass),
      trail: []
    };
    engine.current.bodies.push(newBody);
    setSelectedBodyId(newBody.id);
    if (!engine.current.isPlaying) draw();
  };

  const removeSelectedBody = () => {
    if (!selectedBodyId) return;
    engine.current.bodies = engine.current.bodies.filter(b => b.id !== selectedBodyId);
    setSelectedBodyId(null);
    if (!engine.current.isPlaying) draw();
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(engine.current.bodies, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "orbit_preset.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- UI Handlers for Sliders ---
  const updateSelectedBody = (updates: Partial<Body>) => {
    const body = engine.current.bodies.find(b => b.id === selectedBodyId);
    if (body) {
      Object.assign(body, updates);
      if (updates.mass) body.radius = calculateRadius(body.mass);
      if (!engine.current.isPlaying) draw();
      setUiTrigger(t => t + 1);
    }
  };

  const selectedBody =