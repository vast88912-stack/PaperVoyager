import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types & Interfaces ---
type Mode = 'wave' | 'particle' | 'quantum';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

interface SimulationState {
  mode: Mode;
  slitDistance: number;
  wavelength: number;
  particles: Particle[];
  hits: number[];
  time: number;
  isPlaying: boolean;
}

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const SOURCE_X = 100;
const SOURCE_Y = 250;
const BARRIER_X = 400;
const SCREEN_X = 700;
const SLIT_WIDTH = 20;
const PARTICLE_SPEED = 5;

export default function App() {
  // --- React State ---
  const [mode, setMode] = useState<Mode>('wave');
  const [slitDistance, setSlitDistance] = useState<number>(120);
  const [wavelength, setWavelength] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  // Mutable simulation state for the animation loop
  const sim = useRef<SimulationState>({
    mode: 'wave',
    slitDistance: 120,
    wavelength: 30,
    particles: [],
    hits: new Array(CANVAS_HEIGHT).fill(0),
    time: 0,
    isPlaying: true,
  });

  // --- Sync React State to Simulation Ref ---
  useEffect(() => {
    // If mode changed, clear hits and particles
    if (sim.current.mode !== mode) {
      sim.current.hits.fill(0);
      sim.current.particles = [];
    }
    sim.current.mode = mode;
    sim.current.slitDistance = slitDistance;
    sim.current.wavelength = wavelength;
    sim.current.isPlaying = isPlaying;
  }, [mode, slitDistance, wavelength, isPlaying]);

  const clearScreen = useCallback(() => {
    sim.current.hits.fill(0);
    sim.current.particles = [];
  }, []);

  // --- Animation Loop ---
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const state = sim.current;

    if (state.isPlaying) {
      state.time += 1;
    }

    const slit1Y = SOURCE_Y - state.slitDistance / 2;
    const slit2Y = SOURCE_Y + state.slitDistance / 2;

    // --- Draw Environment ---
    // Emitter
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(SOURCE_X, SOURCE_Y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(SOURCE_X, SOURCE_Y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Barrier
    ctx.fillStyle = '#334155';
    ctx.fillRect(BARRIER_X - 5, 0, 10, slit1Y - SLIT_WIDTH / 2); // Top
    ctx.fillRect(BARRIER_X - 5, slit1Y + SLIT_WIDTH / 2, 10, state.slitDistance - SLIT_WIDTH); // Middle
    ctx.fillRect(BARRIER_X - 5, slit2Y + SLIT_WIDTH / 2, 10, CANVAS_HEIGHT - (slit2Y + SLIT_WIDTH / 2)); // Bottom

    // Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(SCREEN_X, 0, 4, CANVAS_HEIGHT);

    // --- Mode Specific Drawing ---

    if (state.mode === 'wave') {
      // Draw Waves
      ctx.lineWidth = 2;
      const waveSpeed = 2;
      const maxRadiusSource = BARRIER_X - SOURCE_X;

      // Source Waves
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      for (let r = (state.time * waveSpeed) % state.wavelength; r < maxRadiusSource; r += state.wavelength) {
        ctx.beginPath();
        ctx.arc(SOURCE_X, SOURCE_Y, r, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }

      // Slit Waves (Huygens Principle)
      const maxRadiusSlits = SCREEN_X - BARRIER_X;
      // Delay phase based on distance from source to barrier
      const phaseDelay = maxRadiusSource % state.wavelength;
      
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
      for (let r = ((state.time * waveSpeed) - phaseDelay) % state.wavelength; r < maxRadiusSlits; r += state.wavelength) {
        if (r > 0) {
          // Slit 1
          ctx.beginPath();
          ctx.arc(BARRIER_X, slit1Y, r, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          // Slit 2
          ctx.beginPath();
          ctx.arc(BARRIER_X, slit2Y, r, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }
      }

      // Draw Interference Pattern on Screen
      for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
        const d1 = Math.hypot(SCREEN_X - BARRIER_X, y - slit1Y);
        const d2 = Math.hypot(SCREEN_X - BARRIER_X, y - slit2Y);
        const pathDiff = Math.abs(d1 - d2);
        const phase = (pathDiff / state.wavelength) * Math.PI * 2;
        // Intensity I = I0 * cos^2(phase / 2)
        const intensity = Math.pow(Math.cos(phase / 2), 2);
        
        ctx.fillStyle = `rgba(14, 165, 233, ${intensity})`;
        ctx.fillRect(SCREEN_X + 10, y, 60 * intensity, 2);
      }

    } else if (state.mode === 'particle' || state.mode === 'quantum') {
      // Emit Particles
      if (state.isPlaying && state.time % 2 === 0) {
        // Emit 3 particles per frame for faster accumulation
        for(let i=0; i<3; i++) {
            const angleSpread = state.mode === 'particle' ? 0.4 : 0.6;
            const angle = (Math.random() - 0.5) * angleSpread;
            state.particles.push({
            x: SOURCE_X,
            y: SOURCE_Y,
            vx: Math.cos(angle) * PARTICLE_SPEED,
            vy: Math.sin(angle) * PARTICLE_SPEED,
            active: true,
            });
        }
      }

      // Update & Draw Particles
      ctx.fillStyle = state.mode === 'particle' ? '#ef4444' : '#8b5cf6';
      
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        if (!p.active) continue;

        const nextX = p.x + p.vx;
        const nextY = p.y + p.vy;

        // Collision with Barrier
        if (p.x < BARRIER_X && nextX >= BARRIER_X) {
          const inSlit1 = nextY > slit1Y - SLIT_WIDTH / 2 && nextY < slit1Y + SLIT_WIDTH / 2;
          const inSlit2 = nextY > slit2Y - SLIT_WIDTH / 2 && nextY < slit2Y + SLIT_WIDTH / 2;
          
          if (!inSlit1 && !inSlit2) {
            p.active = false; // Blocked
            continue;
          } else if (state.mode === 'quantum') {
             // Quantum particles diffract (random scatter at slit)
             const scatterAngle = (Math.random() - 0.5) * (state.wavelength / 15);
             const currentAngle = Math.atan2(p.vy, p.vx);
             const newAngle = currentAngle + scatterAngle;
             p.vx = Math.cos(newAngle) * PARTICLE_SPEED;
             p.vy = Math.sin(newAngle) * PARTICLE_SPEED;
          }
        }

        // Collision with Screen
        if (p.x < SCREEN_X && nextX >= SCREEN_X) {
          p.active = false;
          const hitY = Math.floor(nextY);
          if (hitY >= 0 && hitY < CANVAS_HEIGHT) {
            // In quantum mode, we bias the hits based on the interference probability 
            // to simulate the quantum probability wave guiding the particle.
            if (state.mode === 'quantum') {
                const d1 = Math.hypot(SCREEN_X - BARRIER_X, hitY - slit1Y);
                const d2 = Math.hypot(SCREEN_X - BARRIER_X, hitY - slit2Y);
                const phase = ((Math.abs(d1 - d2)) / state.wavelength) * Math.PI * 2;
                const prob = Math.pow(Math.cos(phase / 2), 2);
                if (Math.random() < prob + 0.05) { // Add slight noise
                    state.hits[hitY] += 1;
                } else {
                    // Particle didn't hit here due to destructive interference
                    // We just let it disappear to keep simulation simple, 
                    // though technically it would land elsewhere.
                }
            } else {
                state.hits[hitY] += 1; // Classical: just hit where it lands
            }
          }
          continue;
        }

        p.x = nextX;
        p.y = nextY;

        // Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cleanup inactive particles periodically
      if (state.particles.length > 2000) {
        state.particles = state.particles.filter(p => p.active);
      }

      // Draw Histogram on Screen
      const maxHit = Math.max(...state.hits, 1);
      ctx.fillStyle = state.mode === 'particle' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(139, 92, 246, 0.8)';
      
      // Group hits into bins for smoother drawing
      const BIN_SIZE = 4;
      for (let y = 0; y < CANVAS_HEIGHT; y += BIN_SIZE) {
        let sum = 0;
        for (let b = 0; b < BIN_SIZE; b++) {
            if (y + b < CANVAS_HEIGHT) sum += state.hits[y + b];
        }
        if (sum > 0) {
          const width = (sum / (maxHit * BIN_SIZE)) * 80;
          ctx.fillRect(SCREEN_X + 10, y, width, BIN_SIZE - 1);
        }
      }
    }

    // --- Draw Labels ---
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('Source', SOURCE_X - 20, SOURCE_Y - 20);
    ctx.fillText('Double Slit', BARRIER_X - 35, 20);
    ctx.fillText('Screen', SCREEN_X - 20, 20);

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // --- UI Render ---
  return (
    <div 
      className="min-h-screen p-8 flex flex-col items-center font-sans text-slate-800"
      style={{
        backgroundColor: '#fdfbf7',
        backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <header className="mb-8 text-center max-w-2xl bg-white p-6 rounded-lg border-2 border-slate-300 shadow-[4px_4px_0px_rgba(148,163,184,0.3)]">
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2 tracking-tight">Wave-Particle Duality Lab</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Observe the classic double-slit experiment. Toggle between classical particles (like marbles), continuous waves (like water), and quantum particles (electrons building an interference pattern).
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-6xl">
        
        {/* Canvas Container */}
        <div className="relative bg-white border-2 border-slate-300 shadow-[8px_8px_0px_rgba(148,163,184,0.3)] rounded-xl overflow-hidden flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block"
          />
          
          {/* Play/Pause Overlay */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute bottom-4 left-4 bg-white border-2 border-slate-300 px-4 py-2 rounded-md shadow-[2px_2px_0px_rgba(148,163,184,0.5)] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>

        {/* Control Panel */}
        <div className="flex-1 bg-white border-2 border-slate-300 p-6 rounded-xl shadow-[8px_8px_0px_rgba(148,163,184,0.3)] flex flex-col gap-6">
          
          {/* Mode Selection */}
          <div>
            <h2 className="text-lg font-bold font-serif mb-3 border-b-2 border-slate-100 pb-2">Experiment Mode</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="radio" 
                  name="mode" 
                  checked={mode === 'wave'} 
                  onChange={() => setMode('wave')}
                  className="w-5 h-5 accent-sky-500"
                />
                <span className="flex flex-col">