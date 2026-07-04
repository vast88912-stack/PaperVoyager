import React, { useState, useEffect, useRef, useCallback } from 'react';

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

interface SimulationStats {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentumX: number;
  momentumY: number;
}

// --- Constants ---
const G = 1500; // Gravitational constant for visual scale
const SOFTENING = 50; // Prevents infinite forces at zero distance
const TRAIL_LENGTH = 80;
const DT = 0.05; // Time step

const COLORS = [
  '#FF3366', '#33CCFF', '#FFCC00', '#33FF99', 
  '#CC66FF', '#FF6633', '#00FFFF', '#FF00FF'
];

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateAccelerations = (bodies: Body[]): Vector2[] => {
  const accelerations: Vector2[] = bodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const distSq = dx * dx + dy * dy + SOFTENING;
      const dist = Math.sqrt(distSq);
      const force = G / distSq;

      const ax = force * (dx / dist);
      const ay = force * (dy / dist);

      accelerations[i].x += ax * bodies[j].mass;
      accelerations[i].y += ay * bodies[j].mass;
      accelerations[j].x -= ax * bodies[i].mass;
      accelerations[j].y -= ay * bodies[i].mass;
    }
  }
  return accelerations;
};

const calculateStats = (bodies: Body[]): SimulationStats => {
  let ke = 0;
  let pe = 0;
  let px = 0;
  let py = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const v2 = b.vx * b.vx + b.vy * b.vy;
    ke += 0.5 * b.mass * v2;
    px += b.mass * b.vx;
    py += b.mass * b.vy;

    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];
      const dx = b2.x - b.x;
      const dy = b2.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy + SOFTENING);
      pe -= (G * b.mass * b2.mass) / dist;
    }
  }

  return {
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalEnergy: ke + pe,
    momentumX: px,
    momentumY: py,
  };
};

// --- Presets ---
const PRESETS = {
  twoBody: (w: number, h: number): Body[] => [
    { id: generateId(), x: w / 2 - 150, y: h / 2, vx: 0, vy: 60, mass: 200, radius: 12, color: COLORS[0], trail: [] },
    { id: generateId(), x: w / 2 + 150, y: h / 2, vx: 0, vy: -60, mass: 200, radius: 12, color: COLORS[1], trail: [] }
  ],
  threeBody: (w: number, h: number): Body[] => [
    { id: generateId(), x: w / 2 - 200, y: h / 2, vx: 30, vy: 50, mass: 150, radius: 10, color: COLORS[2], trail: [] },
    { id: generateId(), x: w / 2 + 200, y: h / 2, vx: -30, vy: -50, mass: 150, radius: 10, color: COLORS[3], trail: [] },
    { id: generateId(), x: w / 2, y: h / 2, vx: 0, vy: 0, mass: 300, radius: 16, color: COLORS[4], trail: [] }
  ],
  swirl: (w: number, h: number): Body[] => {
    const bodies: Body[] = [{ id: generateId(), x: w / 2, y: h / 2, vx: 0, vy: 0, mass: 1000, radius: 25, color: '#FFFFFF', trail: [] }];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 300;
      const speed = Math.sqrt((G * 1000) / dist) * 0.8; // slightly sub-orbital for swirling in
      bodies.push({
        id: generateId(),
        x: w / 2 + Math.cos(angle) * dist,
        y: h / 2 + Math.sin(angle) * dist,
        vx: -Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
        mass: 5 + Math.random() * 10,
        radius: 3 + Math.random() * 3,
        color: COLORS[i % COLORS.length],
        trail: []
      });
    }
    return bodies;
  }
};

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const bodiesRef = useRef<Body[]>([]);
  const starsRef = useRef<{x: number, y: number, r: number, alpha: number}[]>([]);
  
  const [isRunning, setIsRunning] = useState(true);
  const [integrator, setIntegrator] = useState<'euler' | 'verlet'>('verlet');
  const [collisionMerge, setCollisionMerge] = useState(true);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  // Initialize stars once
  useEffect(() => {
    if (starsRef.current.length === 0) {
      const stars = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.5,
          alpha: Math.random()
        });
      }
      starsRef.current = stars;
    }
  }, []);

  // Load initial preset
  useEffect(() => {
    bodiesRef.current = PRESETS.twoBody(window.innerWidth, window.innerHeight);
  }, []);

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Physics Step
  const stepPhysics = useCallback(() => {
    let bodies = bodiesRef.current;

    // Handle Collisions First
    if (collisionMerge) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const dx = bodies[j].x - bodies[i].x;
          const dy = bodies[j].y - bodies[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < bodies[i].radius + bodies[j].radius) {
            const m1 = bodies[i].mass;
            const m2 = bodies[j].mass;
            const totalM = m1 + m2;
            
            // Inelastic collision merge
            bodies[i].vx = (bodies[i].vx * m1 + bodies[j].vx * m2) / totalM;
            bodies[i].vy = (bodies[i].vy * m1 + bodies[j].vy * m2) / totalM;
            bodies[i].x = (bodies[i].x * m1 + bodies[j].x * m2) / totalM;
            bodies[i].y = (bodies[i].y * m1 + bodies[j].y * m2) / totalM;
            bodies[i].mass = totalM;
            bodies[i].radius = Math.min(Math.max(bodies[i].radius, bodies[j].radius) + 2, 40);
            
            // Remove body j
            bodies.splice(j, 1);
            j--;
            
            // Deselect if merged
            if (selectedBodyId === bodies[j]?.id) setSelectedBodyId(null);
          }
        }
      }
    }

    if (integrator === 'euler') {
      // Forward Euler (Simple but accumulates energy error)
      const accels = calculateAccelerations(bodies);
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].x += bodies[i].vx * DT;
        bodies[i].y += bodies[i].vy * DT;
        bodies[i].vx += accels[i].x * DT;
        bodies[i].vy += accels[i].y * DT;
      }
    } else {
      // Velocity Verlet (Symplectic, conserves energy much better)
      const a1 = calculateAccelerations(bodies);
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].x += bodies[i].vx * DT + 0.5 * a1[i].x * DT * DT;
        bodies[i].y += bodies[i].vy * DT + 0.5 * a1[i].y * DT * DT;
      }
      const a2 = calculateAccelerations(bodies);
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].vx += 0.5 * (a1[i].x + a2[i].x) * DT;
        bodies[i].vy += 0.5 * (a1[i].y + a2[i].y) * DT;
      }
    }

    // Update trails
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].trail.unshift({ x: bodies[i].x, y: bodies[i].y });
      if (bodies[i].trail.length > TRAIL_LENGTH) {
        bodies[i].trail.pop();
      }
    }

    bodiesRef.current = bodies;
  }, [integrator, collisionMerge, selectedBodyId]);

  // Main Loop
  const tick = useCallback(() => {
    if (isRunning) {
      stepPhysics();
    }

    // Render
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      // Clear background with slight opacity for motion blur effect on stars
      ctx.fillStyle = '#05050A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Stars
      starsRef.current.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();
      });

      // Draw Trails
      bodiesRef.current.forEach(body => {
        if (body.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(body.trail[0].x, body.trail[0].y);
          for (let i = 1; i < body.trail.length; i++) {
            ctx.lineTo(body.trail[i].x, body.trail[i].y);
          }
          ctx.strokeStyle = body.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      });

      // Draw Bodies
      bodiesRef.current.forEach(body => {
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
        
        // Highlight selected
        if (body.id === selectedBodyId) {
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Throttled UI Updates (every 10 frames)
    setFrameCount(prev => {
      if (prev % 10 === 0) {
        setStats(calculateStats(bodiesRef.current));
      }
      return prev + 1;
    });

    requestRef.current = requestAnimationFrame(tick);
  }, [isRunning, stepPhysics, selectedBodyId]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [tick]);

  // --- UI Handlers ---
  const loadPreset = (presetName: keyof typeof PRESETS) => {
    bodiesRef.current = PRESETS[presetName](window.innerWidth, window.innerHeight);
    setStats(calculateStats(bodiesRef.current));
    setSelectedBodyId(null);
  };

  const addRandomBody = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const newBody: Body = {
      id: generateId(),
      x: w / 2 + (Math.random() - 0.5) * 400,
      y: h / 2 + (Math.random() - 0.5) * 400,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
      mass: 50 + Math.random() * 200,
      radius: 8 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      trail: []
    };
    bodiesRef.current.push(newBody);
  };

  const removeBody = (id: string) => {
    bodiesRef.current = bodiesRef.current.filter(b => b.id !== id);
    if (selectedBodyId === id) setSelectedBodyId(null);
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

  const selectedBody = bodiesRef.current.find(b => b.id === selectedBodyId);

  return (
    <div className="w-screen h-screen bg-[#05050A] overflow-hidden relative font-sans text-slate-200">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 cursor-crosshair"
        onClick={(e) => {
          // Simple click detection for selection
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          let clickedId = null;
          for (const b of bodiesRef.current) {
            const dx = b.x - x;
            const dy = b.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < b.radius + 10) {
              clickedId = b.id;
              break;
            }
          }
          setSelectedBodyId(clickedId);
        }}
      />

      {/* LEFT PANEL: Simulation Controls & Integrator */}
      <div className="absolute top-6 left-6 z-10 w-80 flex flex-col gap-4">
        
        {/* Header */}