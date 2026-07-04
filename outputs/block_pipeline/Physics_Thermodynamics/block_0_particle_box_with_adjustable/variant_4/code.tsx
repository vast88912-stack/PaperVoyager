import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Helper Functions & Constants ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const NUM_PARTICLES = 250;
const BASE_RADIUS = 2.5;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSpeed: number;
}

// Map temperature [100, 1000] to a color (blue -> cyan -> yellow -> red)
const getTemperatureColor = (temp: number) => {
  // Normalize temp from 100-1000 to 0-1
  const t = Math.max(0, Math.min(1, (temp - 100) / 900));
  // Hue ranges from 240 (blue) to 0 (red)
  const hue = (1 - t) * 240;
  return `hsl(${hue}, 100%, ${60 + t * 20}%)`;
};

export default function App() {
  // --- State ---
  const [temperature, setTemperature] = useState<number>(300); // Kelvin
  const [volume, setVolume] = useState<number>(100); // Percentage 20 - 100
  
  // Derived state for physics
  // P = (n * R * T) / V. Let's use an arbitrary R scale for UI.
  const pressure = useMemo(() => {
    const p = (NUM_PARTICLES * 0.5 * temperature) / volume;
    return p.toFixed(1);
  }, [temperature, volume]);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const reqRef = useRef<number>();

  // Initialize Particles
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: Math.random() * CANVAS_WIDTH * 0.8 + CANVAS_WIDTH * 0.1, // Start near center
        y: Math.random() * CANVAS_HEIGHT * 0.8 + CANVAS_HEIGHT * 0.1,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        baseSpeed: Math.random() * 1.5 + 0.5,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = (time - lastTime) / 16; // Normalize to approx 60fps
      lastTime = time;

      // Trail effect: clear with slight opacity
      ctx.fillStyle = 'rgba(15, 10, 10, 0.25)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Current Box Boundaries
      const boxWidth = (volume / 100) * CANVAS_WIDTH;
      const boxHeight = CANVAS_HEIGHT;
      const boxX = (CANVAS_WIDTH - boxWidth) / 2;
      const boxY = 0;

      // Draw bounding box
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Speed multiplier based on Temperature (V_rms ~ sqrt(T))
      const speedMultiplier = Math.sqrt(temperature / 100) * 1.2;
      const particleColor = getTemperatureColor(temperature);

      ctx.fillStyle = particleColor;
      
      // Glow effect
      ctx.shadowBlur = Math.min(15, speedMultiplier * 5);
      ctx.shadowColor = particleColor;

      particlesRef.current.forEach(p => {
        // Move
        p.x += p.vx * p.baseSpeed * speedMultiplier * dt;
        p.y += p.vy * p.baseSpeed * speedMultiplier * dt;

        // Wall collisions
        // Left wall
        if (p.x - BASE_RADIUS < boxX) {
          p.x = boxX + BASE_RADIUS;
          p.vx *= -1;
        }
        // Right wall
        if (p.x + BASE_RADIUS > boxX + boxWidth) {
          p.x = boxX + boxWidth - BASE_RADIUS;
          p.vx *= -1;
        }
        // Top wall
        if (p.y - BASE_RADIUS < boxY) {
          p.y = boxY + BASE_RADIUS;
          p.vy *= -1;
        }
        // Bottom wall
        if (p.y + BASE_RADIUS > boxY + boxHeight) {
          p.y = boxY + boxHeight - BASE_RADIUS;
          p.vy *= -1;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, BASE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      // Reset shadow for next frame's rect
      ctx.shadowBlur = 0;

      reqRef.current = requestAnimationFrame(draw);
    };

    reqRef.current = requestAnimationFrame(draw);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [temperature, volume]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-neutral-950 text-slate-200 font-sans selection:bg-rose-500/30 overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Header */}
      <div className="max-w-6xl w-full mb-8 text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-orange-500">
          Ideal Gas Playground
        </h1>
        <p className="text-rose-200/70 text-lg max-w-2xl mx-auto">
          Explore the relationships between Temperature, Volume, and Pressure. 
          Watch how microscopic particle kinematics manifest as macroscopic physical properties.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Simulation Canvas */}
        <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden shadow-2xl shadow-rose-900/20 border border-white/10 bg-black/50 backdrop-blur-sm">
          <div className="absolute top-4 left-6 z-10 flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">Active Chamber</span>
          </div>
          
          <div className="w-full flex items-center justify-center p-8">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="max-w-full h-auto rounded-xl border border-white/5 bg-[#0a0505] shadow-inner"
              style={{ display: 'block' }}
            />
          </div>
        </div>

        {/* Right Col: Controls & Metrics */}
        <div className="flex flex-col gap-6">
          
          {/* Card: Pressure Gauge */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Internal Pressure</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-light text-amber-400 tabular-nums tracking-tighter">
                {pressure}
              </span>
              <span className="text-amber-500/60 font-medium">kPa</span>
            </div>
            
            {/* Visual Bar Gauge */}
            <div className="mt-6 h-2 w-full bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, (parseFloat(pressure) / 2000) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/30 font-medium">
              <span>0 kPa</span>
              <span>2000 kPa</span>
            </div>
          </div>

          {/* Card: Controls */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-8">System Controls</h3>
            
            {/* Temperature Slider */}
            <div className="mb-10">
              <div className="flex justify-between items-end mb-3">
                <label className="text-rose-100 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Temperature (T)
                </label>
                <span className="text-xl font-semibold text-rose-300 tabular-nums">{temperature} K</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="1000" 
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-black/40 accent-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-shadow"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #10b981 30%, #f59e0b 60%, #ef4444 100%)`
                }}
              />
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>100 K (Cold)</span>
                <span>1000 K (Hot)</span>
              </div>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-indigo-100 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Volume (V)
                </label>
                <span className="text-xl font-semibold text-indigo-300 tabular-nums">{volume}%</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="100" 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-shadow"
              />
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>Compressed</span>
                <span>Expanded</span>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Footer info */}
      <div className="mt-8 text-white/30 text-sm max-w-4xl text-center">
        <p>Boyle's Law: <strong>P ∝ 1/V</strong> (At constant T, decreasing volume increases pressure).</p>
        <p className="mt-1">Gay-Lussac's Law: <strong>P ∝ T</strong> (At constant V, increasing temperature increases pressure).</p>
      </div>
    </div>
  );
}