import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
type Vector = { x: number; y: number };

interface Body {
  id: string;
  pos: Vector;
  vel: Vector;
  acc: Vector;
  mass: number;
  radius: number;
  color: string;
  trail: Vector[];
}

interface SimulationSettings {
  G: number;
  dt: number;
  integrator: 'Euler' | 'Verlet';
  collisionMerge: boolean;
  trailLength: number;
  isRunning: boolean;
}

interface Stats {
  kineticEnergy: number;
  potentialEnergy: number;
  totalMomentum: number;
  bodyCount: number;
}

// --- Constants ---
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const DEFAULT_SETTINGS: SimulationSettings = {
  G: 50,
  dt: 0.05,
  integrator: 'Verlet',
  collisionMerge: true,
  trailLength: 60,
  isRunning: true,
};

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// --- Physics Engine ---
function computeForces(bodies: Body[], G: number) {
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
      
      const softening = 2.0; 
      const dist = Math.sqrt(distSq + softening);
      
      const force = (G * b1.mass * b2.mass) / (distSq + softening);
      const ax = force * dx / dist;
      const ay = force * dy / dist;

      b1.acc.x += ax / b1.mass;
      b1.acc.y += ay / b1.mass;
      b2.acc.x -= ax / b2.mass;
      b2.acc.y -= ay / b2.mass;
    }
  }
}

function computeEnergyAndMomentum(bodies: Body[], G: number): Stats {
  let ke = 0;
  let pe = 0;
  let px = 0;
  let py = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const v2 = b.vel.x * b.vel.x + b.vel.y * b.vel.y;
    ke += 0.5 * b.mass * v2;
    px += b.mass * b.vel.x;
    py += b.mass * b.vel.y;

    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];
      const dx = b2.pos.x - b.pos.x;
      const dy = b2.pos.y - b.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pe -= (G * b.mass * b2.mass) / (dist + 0.1);
    }
  }

  return {
    kineticEnergy: ke,
    potentialEnergy: pe,
    totalMomentum: Math.sqrt(px * px + py * py),
    bodyCount: bodies.length,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const settingsRef = useRef<SimulationSettings>({ ...DEFAULT_SETTINGS });
  const animationRef = useRef<number>(0);

  // UI State
  const [stats, setStats] = useState<Stats>({ kineticEnergy: 0, potentialEnergy: 0, totalMomentum: 0, bodyCount: 0 });
  const [settingsUI, setSettingsUI] = useState<SimulationSettings>({ ...DEFAULT_SETTINGS });
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  
  // Update ref when UI settings change
  useEffect(() => {
    settingsRef.current = { ...settingsUI };
  }, [settingsUI]);

  // --- Presets ---
  const loadPreset = useCallback((type: 'two-body' | 'three-body' | 'swirl') => {
    const newBodies: Body[] = [];
    if (type === 'two-body') {
      newBodies.push({
        id: generateId(), pos: { x: -150, y: 0 }, vel: { x: 0, y: 3 }, acc: { x: 0, y: 0 },
        mass: 1000, radius: 15, color: '#f59e0b', trail: []
      });
      newBodies.push({
        id: generateId(), pos: { x: 150, y: 0 }, vel: { x: 0, y: -3 }, acc: { x: 0, y: 0 },
        mass: 1000, radius: 15, color: '#3b82f6', trail: []
      });
    } else if (type === 'three-body') {
      // Figure-8 approx
      newBodies.push({
        id: generateId(), pos: { x: -100, y: 0 }, vel: { x: 0.5, y: 2 }, acc: { x: 0, y: 0 },
        mass: 500, radius: 12, color: '#ef4444', trail: []
      });
      newBodies.push({
        id: generateId(), pos: { x: 100, y: 0 }, vel: { x: 0.5, y: 2 }, acc: { x: 0, y: 0 },
        mass: 500, radius: 12, color: '#10b981', trail: []
      });
      newBodies.push({
        id: generateId(), pos: { x: 0, y: 0 }, vel: { x: -1, y: -4 }, acc: { x: 0, y: 0 },
        mass: 500, radius: 12, color: '#8b5cf6', trail: []
      });
    } else if (type === 'swirl') {
      newBodies.push({
        id: generateId(), pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 },
        mass: 10000, radius: 25, color: '#f59e0b', trail: []
      });
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 300;
        const v = Math.sqrt((settingsRef.current.G * 10000) / dist);
        newBodies.push({
          id: generateId(),
          pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
          vel: { x: -Math.sin(angle) * v, y: Math.cos(angle) * v },
          acc: { x: 0, y: 0 },
          mass: 5 + Math.random() * 20,
          radius: 2 + Math.random() * 3,
          color: randomColor(),
          trail: []
        });
      }
    }
    bodiesRef.current = newBodies;
    setSelectedBodyId(null);
  }, []);

  // Initialize
  useEffect(() => {
    loadPreset('swirl');
  }, [loadPreset]);

  // --- Main Simulation Loop ---
  useEffect(() => {
    let frameCount = 0;

    const tick = () => {
      const { G, dt, integrator, collisionMerge, trailLength, isRunning } = settingsRef.current;
      let bodies = bodiesRef.current;

      if (isRunning) {
        // Handle Collisions FIRST if merging is enabled
        if (collisionMerge) {
          let merged = false;
          let i = 0;
          while (i < bodies.length) {
            let j = i + 1;
            let mergedThisStep = false;
            while (j < bodies.length) {
              const b1 = bodies[i];
              const b2 = bodies[j];
              const dx = b2.pos.x - b1.pos.x;
              const dy = b2.pos.y - b1.pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < b1.radius + b2.radius) {
                // Perform Merge
                const totalMass = b1.mass + b2.mass;
                const pos = {
                  x: (b1.pos.x * b1.mass + b2.pos.x * b2.mass) / totalMass,
                  y: (b1.pos.y * b1.mass + b2.pos.y * b2.mass) / totalMass
                };
                const vel = {
                  x: (b1.vel.x * b1.mass + b2.vel.x * b2.mass) / totalMass,
                  y: (b1.vel.y * b1.mass + b2.vel.y * b2.mass) / totalMass
                };
                
                const heavier = b1.mass > b2.mass ? b1 : b2;
                
                bodies[i] = {
                  id: generateId(), // Create new identity
                  pos, vel, acc: { x: 0, y: 0 },
                  mass: totalMass,
                  radius: Math.pow(totalMass, 1/3) * 1.5, // Density approx
                  color: heavier.color,
                  trail: heavier.trail // inherit trail from heavier
                };
                
                bodies.splice(j, 1);
                merged = true;
                mergedThisStep = true;
                break;
              } else {
                j++;
              }
            }
            if (!mergedThisStep) i++;
          }
          if (merged) {
             bodiesRef.current = bodies;
             // Update selected body if it was destroyed (simplified: deselect)
             // Not strictly needed since id changes, it just unselects in UI
          }
        }

        computeForces(bodies, G);

        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          
          if (integrator === 'Euler') {
            b.vel.x += b.acc.x * dt;
            b.vel.y += b.acc.y * dt;
            b.pos.x += b.vel.x * dt;
            b.pos.y += b.vel.y * dt;
          } else {
            // Verlet (simplified velocity verlet handling)
            b.pos.x += b.vel.x * dt + 0.5 * b.acc.x * dt * dt;
            b.pos.y += b.vel.y * dt + 0.5 * b.acc.y * dt * dt;
            b.vel.x += b.acc.x * dt; // Using previous acc for vel update 
            b.vel.y += b.acc.y * dt;
          }

          // Update Trail
          if (frameCount % 3 === 0) {
            b.trail.push({ ...b.pos });
            if (b.trail.length > trailLength) b.trail.shift();
          }
        }
      }

      // Render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width = canvas.clientWidth;
          const height = canvas.height = canvas.clientHeight;
          const cx = width / 2;
          const cy = height / 2;

          ctx.clearRect(0, 0, width, height);

          // Draw Starfield Background
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, width, height);

          for (const b of bodies) {
            // Draw Trail
            if (b.trail.length > 1) {
              ctx.beginPath();
              ctx.moveTo(cx + b.trail[0].x, cy + b.trail[0].y);
              for (let i = 1; i < b.trail.length; i++) {
                ctx.lineTo(cx + b.trail[i].x, cy + b.trail[i].y);
              }
              ctx.strokeStyle = `${b.color}66`; // 40% opacity hex
              ctx.lineWidth = 2;
              ctx.stroke();
            }

            // Draw Body
            ctx.beginPath();
            ctx.arc(cx + b.pos.x, cy + b.pos.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = b.color;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            
            // Highlight selected
            if (b.id === selectedBodyId) {
              ctx.beginPath();
              ctx.arc(cx + b.pos.x, cy + b.pos.y, b.radius + 4, 0, Math.PI * 2);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }
      }

      // Update UI Stats periodically
      if (frameCount % 10 === 0) {
        setStats(computeEnergyAndMomentum(bodies, G));
      }

      frameCount++;
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [selectedBodyId]);


  // --- Event Handlers ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const mouseX = e.clientX - rect.left - cx;
    const mouseY = e.clientY - rect.top - cy;

    const clicked = bodiesRef.current.find(b => {
      const dx = b.pos.x - mouseX;
      const dy = b.pos.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) < b.radius + 5;
    });

    setSelectedBodyId(clicked ? clicked.id : null);
  };

  const addBody = () => {
    const newBody: Body = {
      id: generateId(),
      pos: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 },
      vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 },
      acc: { x: 0, y: 0 },
      mass: 500,
      radius: 10,
      color: randomColor(),
      trail: []
    };
    bodiesRef.current.push(newBody);
    setSelectedBodyId(newBody.id);
  };

  const removeSelectedBody = () => {
    bodiesRef.current = bodiesRef.current.filter(b => b.id !== selectedBodyId);
    setSelectedBodyId(null);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bodiesRef.current