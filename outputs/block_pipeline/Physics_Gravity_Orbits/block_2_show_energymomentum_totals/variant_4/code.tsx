import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- TYPES ---
type Vector2 = { x: number; y: number };

type Body = {
  id: string;
  mass: number;
  pos: Vector2;
  vel: Vector2;
  color: string;
  radius: number;
  trail: Vector2[];
};

type SystemStats = {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentum: Vector2;
  angularMomentum: number;
  energyError: number;
};

// --- CONSTANTS ---
const G = 1000; // Gravitational constant (scaled for visual simulation)
const SOFTENING = 2.0; // Prevents extreme forces at close ranges
const TRAIL_LENGTH = 150;
const STEPS_PER_FRAME = 4; // Sub-stepping for integration stability
const DT = 0.005; // Time step per sub-step

// --- PRESETS ---
const PRESETS = {
  twoBody: (): Body[] => [
    {
      id: 'sun',
      mass: 1000,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: -20 },
      color: '#facc15',
      radius: 12,
      trail: [],
    },
    {
      id: 'planet',
      mass: 100,
      pos: { x: 300, y: 0 },
      vel: { x: 0, y: 200 },
      color: '#38bdf8',
      radius: 6,
      trail: [],
    },
  ],
  figure8: (): Body[] => {
    // Classic stable 3-body figure-8 configuration
    const p = { x: 0.97000436 * 150, y: -0.24308753 * 150 };
    const v = { x: 0.466203685 * 180, y: 0.43236573 * 180 };
    return [
      {
        id: 'b1',
        mass: 100,
        pos: { x: p.x, y: p.y },
        vel: { x: v.x, y: v.y },
        color: '#f43f5e',
        radius: 8,
        trail: [],
      },
      {
        id: 'b2',
        mass: 100,
        pos: { x: -p.x, y: -p.y },
        vel: { x: v.x, y: v.y },
        color: '#a855f7',
        radius: 8,
        trail: [],
      },
      {
        id: 'b3',
        mass: 100,
        pos: { x: 0, y: 0 },
        vel: { x: -2 * v.x, y: -2 * v.y },
        color: '#10b981',
        radius: 8,
        trail: [],
      },
    ];
  },
  chaotic: (): Body[] => [
    {
      id: 'c1',
      mass: 300,
      pos: { x: -100, y: -50 },
      vel: { x: 20, y: 40 },
      color: '#fb923c',
      radius: 10,
      trail: [],
    },
    {
      id: 'c2',
      mass: 400,
      pos: { x: 100, y: 50 },
      vel: { x: -10, y: -30 },
      color: '#2dd4bf',
      radius: 11,
      trail: [],
    },
    {
      id: 'c3',
      mass: 250,
      pos: { x: 0, y: 150 },
      vel: { x: -40, y: 10 },
      color: '#c084fc',
      radius: 9,
      trail: [],
    },
    {
      id: 'c4',
      mass: 150,
      pos: { x: 50, y: -150 },
      vel: { x: 60, y: 0 },
      color: '#f472b6',
      radius: 7,
      trail: [],
    },
  ],
};

// --- ICONS ---
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef<number>();

  const bodiesRef = useRef<Body[]>(PRESETS.figure8());
  const initialEnergyRef = useRef<number | null>(null);

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS>('figure8');

  // Load a preset
  const loadPreset = useCallback((presetName: keyof typeof PRESETS) => {
    bodiesRef.current = PRESETS[presetName]();
    initialEnergyRef.current = null; // Reset initial energy baseline
    setActivePreset(presetName);
  }, []);

  // Compute System Invariants (Energy, Momentum)
  const computeStats = useCallback((bodies: Body[]): SystemStats => {
    let ke = 0;
    let pe = 0;
    let px = 0;
    let py = 0;
    let Lz = 0;

    for (let i = 0; i < bodies.length; i++) {
      const b1 = bodies[i];
      // Kinetic Energy: 1/2 m v^2
      ke += 0.5 * b1.mass * (b1.vel.x * b1.vel.x + b1.vel.y * b1.vel.y);

      // Linear Momentum: m * v
      px += b1.mass * b1.vel.x;
      py += b1.mass * b1.vel.y;

      // Angular Momentum: m * (x * vy - y * vx)
      Lz += b1.mass * (b1.pos.x * b1.vel.y - b1.pos.y * b1.vel.x);

      // Potential Energy: -G * m1 * m2 / r
      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq + SOFTENING * SOFTENING);
        pe -= (G * b1.mass * b2.mass) / dist;
      }
    }

    const te = ke + pe;
    
    // Set baseline energy to calculate conservation error
    if (initialEnergyRef.current === null) {
      initialEnergyRef.current = te;
    }
    
    const energyError = Math.abs((te - initialEnergyRef.current) / initialEnergyRef.current) * 100;

    return {
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: te,
      momentum: { x: px, y: py },
      angularMomentum: Lz,
      energyError: isNaN(energyError) ? 0 : energyError,
    };
  }, []);

  // Core Physics Engine (Semi-Implicit Euler integration)
  const stepPhysics = useCallback(() => {
    const bodies = bodiesRef.current;
    const n = bodies.length;
    
    // Arrays to accumulate accelerations
    const ax = new Array(n).fill(0);
    const ay = new Array(n).fill(0);

    // Calculate forces
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const b1 = bodies[i];
        const b2 = bodies[j];

        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq + SOFTENING * SOFTENING);
        
        const f = G / (distSq * dist); // G * m1 * m2 / r^3 (masses applied below)

        const fx = f * dx;
        const fy = f * dy;

        ax[i] += fx * b2.mass;
        ay[i] += fy * b2.mass;
        ax[j] -= fx * b1.mass;
        ay[j] -= fy * b1.mass;
      }
    }

    // Update velocities and positions
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vel.x += ax[i] * DT;
      b.vel.y += ay[i] * DT;
      b.pos.x += b.vel.x * DT;
      b.pos.y += b.vel.y * DT;
    }
  }, []);

  // Main Render and Update Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let frameCount = 0;

    const loop = () => {
      if (isRunning) {
        // Physics sub-stepping for better energy conservation
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
          stepPhysics();
        }
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw Background
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 1;
      const gridSize = 100;
      ctx.beginPath();
      for (let x = (cx % gridSize); x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
      }
      for (let y = (cy % gridSize); y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      const bodies = bodiesRef.current;

      // Update trails and draw them
      bodies.forEach((b) => {
        if (isRunning && frameCount % 3 === 0) {
          b.trail.push({ ...b.pos });
          if (b.trail.length > TRAIL_LENGTH) {
            b.trail.shift();
          }
        }

        if (b.trail.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = `${b.color}99`; // Semi-transparent
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(cx + b.trail[0].x, cy + b.trail[0].y);
          for (let i = 1; i < b.trail.length; i++) {
            ctx.lineTo(cx + b.trail[i].x, cy + b.trail[i].y);
          }
          ctx.stroke();
        }
      });

      // Draw bodies
      bodies.forEach((b) => {
        // Glow effect
        const gradient = ctx.createRadialGradient(
          cx + b.pos.x, cy + b.pos.y, b.radius * 0.2,
          cx + b.pos.x, cy + b.pos.y, b.radius * 2.5
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.4, b.color);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(cx + b.pos.x, cy + b.pos.y, b.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(cx + b.pos.x, cy + b.pos.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // Update UI Telemetry periodically to prevent React re-render lag
      if (frameCount % 6 === 0) {
        setStats(computeStats(bodies));
      }

      frameCount++;
      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [isRunning, stepPhysics, computeStats]);

  // UI Helpers
  const formatExp = (num: number) => {
    if (Math.abs(num) < 0.01 && num !== 0) return '0.00e+0';
    return num.toExponential(2).replace('+', '');
  };

  const formatFixed = (num: number) => num.toFixed(2);

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans" ref={containerRef}>
      {/* Simulation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* TOP LEFT: Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-4 max-w-sm w-full z-10 pointer-events-none">
        <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ActivityIcon />
              Orbit Playground
            </h1>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isRunning ? "Pause" : "Play"}
            >
              {isRunning ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-semibold">Presets</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((preset) => (
              <button
                key={preset}
                onClick={() => loadPreset(preset)}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                  activePreset === preset
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
                }`}
              >
                <RefreshIcon />