import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Constants & Helpers ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const NUM_PARTICLES = 150;
const BASE_TEMP = 300; // Kelvin
const BASE_VOLUME = 100; // Liters (Arbitrary scale)

// Map temperature (100-1000) to a Hue (240 Blue -> 0 Red)
const getTemperatureColor = (temp: number) => {
  const t = Math.max(100, Math.min(1000, temp));
  const hue = 240 - ((t - 100) / 900) * 240;
  return `hsl(${hue}, 90%, 60%)`;
};

// --- Interfaces ---
interface Particle {
  x: number;
  y: number;
  baseVx: number;
  baseVy: number;
  radius: number;
}

export default function App() {
  // --- State ---
  const [temperature, setTemperature] = useState<number>(300); // 100K to 1000K
  const [volume, setVolume] = useState<number>(100); // 20L to 100L
  
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  // --- Derived Physics ---
  // Ideal Gas Law: P = (nRT)/V. We use a simplified proportional constant.
  // If T=300, V=100 -> P = 1.0 atm. Constant = 100/300 = 1/3
  const pressure = useMemo(() => {
    return ((temperature / 300) * (100 / volume)).toFixed(2);
  }, [temperature, volume]);

  // --- Initialization ---
  useEffect(() => {
    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push({
        x: Math.random() * (CANVAS_WIDTH - 20) + 10,
        y: Math.random() * (CANVAS_HEIGHT - 20) + 10,
        baseVx: (Math.random() - 0.5) * 6,
        baseVy: (Math.random() - 0.5) * 6,
        radius: 4 + Math.random() * 2,
      });
    }
    particlesRef.current = particles;
  }, []);

  // --- Animation Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Active volume width
      const activeWidth = CANVAS_WIDTH * (volume / 100);

      // Draw Piston (unavailable volume)
      ctx.fillStyle = '#cbd5e1'; // slate-300
      ctx.fillRect(activeWidth, 0, CANVAS_WIDTH - activeWidth, CANVAS_HEIGHT);
      
      // Draw Piston Face/Wall
      ctx.fillStyle = '#475569'; // slate-600
      ctx.fillRect(activeWidth, 0, 10, CANVAS_HEIGHT);

      // Draw Piston Rod
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.fillRect(activeWidth + 10, CANVAS_HEIGHT / 2 - 15, CANVAS_WIDTH - activeWidth, 30);

      // Speed multiplier based on kinetic energy (v is proportional to sqrt(T))
      const speedMultiplier = Math.sqrt(temperature / BASE_TEMP);
      const particleColor = getTemperatureColor(temperature);

      // Draw and update particles
      ctx.fillStyle = particleColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = particleColor;

      particlesRef.current.forEach((p) => {
        // Update position
        p.x += p.baseVx * speedMultiplier;
        p.y += p.baseVy * speedMultiplier;

        // Collision with left wall
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.baseVx *= -1;
        }
        // Collision with right wall (piston)
        if (p.x + p.radius > activeWidth) {
          p.x = activeWidth - p.radius;
          p.baseVx *= -1;
        }
        // Collision with top wall
        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.baseVy *= -1;
        }
        // Collision with bottom wall
        if (p.y + p.radius > CANVAS_HEIGHT) {
          p.y = CANVAS_HEIGHT - p.radius;
          p.baseVy *= -1;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Reset shadow for next frame elements
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [temperature, volume]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center justify-center">
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600 drop-shadow-sm mb-3">
          Thermo Playground
        </h1>
        <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
          Explore the Ideal Gas Law visually. Adjust the temperature and volume to see how kinetic energy and container size affect internal pressure.
        </p>
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-6xl bg-white/70 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/60 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Panel: Controls & Stats */}
        <div className="w-full lg:w-1/3 p-8 bg-white/40 border-b lg:border-b-0 lg:border-r border-white/60 flex flex-col gap-8">
          
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              System Controls
            </h2>

            {/* Temperature Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Temperature (T)
                </label>
                <span className="text-xl font-mono font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded-lg">
                  {temperature} K
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="10"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-3 bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500 rounded-lg appearance-none cursor-pointer accent-white drop-shadow-md"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                <span>100 K (Cold)</span>
                <span>1000 K (Hot)</span>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  Volume (V)
                </label>
                <span className="text-xl font-mono font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">
                  {volume} L
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="1"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 drop-shadow-md"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                <span>20 L (Compressed)</span>
                <span>100 L (Expanded)</span>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <h3 className="text-sm text-slate-300 font-semibold uppercase tracking-wider mb-1">System Pressure</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-mono font-bold tracking-tight">{pressure}</span>
                <span className="text-xl text-slate-400 font-medium">atm</span>
              </div>
              
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Formula</span>
                  <span className="font-mono text-amber-300">P ∝ T / V</span>
                </div>
                <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, (Number(pressure) / 5) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel: Simulation Canvas */}
        <div className="w-full lg:w-2/3 p-4 md:p-8 flex items-center justify-center bg-slate-900/5 relative">
          <div className="relative w-full aspect-[8/5] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>
            
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-full block"
            />

            {/* Overlay Labels */}
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="bg-slate-800/80 text-white text-xs font-bold px-3 py-1.5 rounded-md backdrop-blur-sm border border-slate-600">
                Particle Box Simulation
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Concept Cards */}
      <div className="w-full max-w-6xl mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-lg">
          <h4 className="font-bold text-slate-800 mb-2">Boyle's Law</h4>
          <p className="text-sm text-slate-600">At a constant temperature, pressure is inversely proportional to volume. Try keeping T constant and moving the V slider.</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-lg">
          <h4 className="font-bold text-slate-800 mb-2">Charles's Law</h4>
          <p className="text-sm text-slate-600">At a constant pressure, volume is directly proportional to temperature. (In this sim, watch how P spikes if you raise T without increasing V).</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-lg">
          <h4 className="font-bold text-slate-800 mb-2">Kinetic Theory</h4>
          <p className="text-sm text-slate-600">Temperature is a measure of average kinetic energy. Notice how particles move faster and strike the walls harder as T increases.</p>
        </div>
      </div>

    </div>
  );
}