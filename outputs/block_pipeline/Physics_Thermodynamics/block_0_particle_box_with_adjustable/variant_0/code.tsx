import React, { useState, useEffect, useRef } from 'react';
import { Thermometer, Maximize, Gauge, Activity, Info } from 'lucide-react';

// --- Types & Interfaces ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

// --- Constants ---
const NUM_PARTICLES = 80;
const PARTICLE_RADIUS = 4;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const MIN_TEMP = 50;
const MAX_TEMP = 1000;
const MIN_VOL = 20;
const MAX_VOL = 100;

// --- Helper Functions ---
// Map temperature to a color (Blue for cold, Red for hot)
const getTemperatureColor = (temp: number) => {
  const ratio = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  const g = Math.floor(50 + 100 * ratio); // Slight green curve for warmer middle colors
  return `rgb(${r}, ${g}, ${b})`;
};

export default function App() {
  // --- State ---
  const [temperature, setTemperature] = useState<number>(300); // Kelvin
  const [volume, setVolume] = useState<number>(100); // Percentage of max width
  const [pressure, setPressure] = useState<number>(1.0); // atm

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  // --- Initialization ---
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: Math.random() * (CANVAS_WIDTH - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS,
        y: Math.random() * (CANVAS_HEIGHT - PARTICLE_RADIUS * 2) + PARTICLE_RADIUS,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        radius: PARTICLE_RADIUS,
        mass: 1,
      });
    }
    particlesRef.current = particles;
  }, []);

  // --- Physics & Animation Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const deltaTime = (time - lastTime) / 16.66; // Normalize to ~60fps
      lastTime = time;

      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Calculate current active width based on volume
      const activeWidth = (volume / 100) * CANVAS_WIDTH;

      // Draw container background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // Slate 900 with opacity
      ctx.fillRect(0, 0, activeWidth, CANVAS_HEIGHT);

      // Draw container border
      ctx.strokeStyle = '#cbd5e1'; // Slate 300
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, activeWidth, CANVAS_HEIGHT);

      // Draw piston (right wall)
      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.fillRect(activeWidth, 0, CANVAS_WIDTH - activeWidth, CANVAS_HEIGHT);
      
      // Piston handle/texture
      ctx.fillStyle = '#475569'; // Slate 600
      ctx.fillRect(activeWidth + 10, CANVAS_HEIGHT / 2 - 40, 20, 80);
      ctx.fillRect(activeWidth + 30, CANVAS_HEIGHT / 2 - 10, CANVAS_WIDTH - activeWidth, 20);

      const particles = particlesRef.current;
      
      // Speed multiplier based on temperature (Kinetic Energy ~ T -> v ~ sqrt(T))
      // Base speed at 300K is ~2px per frame.
      const speedMultiplier = Math.sqrt(temperature / 300) * 2.5;
      const particleColor = getTemperatureColor(temperature);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move particle
        p.x += p.vx * speedMultiplier * deltaTime;
        p.y += p.vy * speedMultiplier * deltaTime;

        // Wall Collisions
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.vx *= -1;
        }
        if (p.x + p.radius > activeWidth) {
          p.x = activeWidth - p.radius;
          p.vx *= -1;
        }
        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.vy *= -1;
        }
        if (p.y + p.radius > CANVAS_HEIGHT) {
          p.y = CANVAS_HEIGHT - p.radius;
          p.vy *= -1;
        }

        // Particle-Particle Collisions (Elastic)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const dist = Math.hypot(dx, dy);
          const minDist = p.radius + p2.radius;

          if (dist < minDist) {
            // Resolve overlap
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            
            p.x -= (nx * overlap) / 2;
            p.y -= (ny * overlap) / 2;
            p2.x += (nx * overlap) / 2;
            p2.y += (ny * overlap) / 2;

            // Swap velocities along the normal
            const kx = p.vx - p2.vx;
            const ky = p.vy - p2.vy;
            const dotProduct = nx * kx + ny * ky;
            
            p.vx -= dotProduct * nx;
            p.vy -= dotProduct * ny;
            p2.vx += dotProduct * nx;
            p2.vy += dotProduct * ny;
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
        
        // Add a slight glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = particleColor;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [temperature, volume]);

  // --- Calculate Pressure ---
  // Ideal Gas Law: P = nRT / V
  // We'll use a simplified proportional calculation for the UI
  // Let's say at T=300, V=100, P=1.0 atm
  useEffect(() => {
    const k = 100 / 300; // Constant to make P=1 at baseline
    const calculatedPressure = k * (temperature / volume);
    setPressure(calculatedPressure);
  }, [temperature, volume]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-yellow-100 p-4 md:p-8 flex items-center justify-center font-sans text-slate-800">
      
      <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden w-full max-w-6xl border border-white/40">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Thermo Playground
            </h1>
            <p className="text-orange-100 mt-1 font-medium">Ideal Gas Law: Particle Box</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
            <Info className="w-5 h-5" />
            <span className="font-mono text-sm">PV = nRT</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Canvas */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-4 border-slate-800 flex items-center justify-center" style={{ height: CANVAS_HEIGHT }}>
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="max-w-full h-auto"
              />
              {/* Overlay Labels */}
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md text-sm font-mono backdrop-blur-md border border-white/10">
                V = {volume.toFixed(0)} L
              </div>
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md text-sm font-mono backdrop-blur-md border border-white/10">
                T = {temperature.toFixed(0)} K
              </div>
            </div>
            <p className="text-sm text-slate-500 text-center italic">
              Particles represent gas molecules. Watch how their speed changes with temperature and how they interact with the container volume.
            </p>
          </div>

          {/* Right Column: Controls & Readouts */}
          <div className="flex flex-col gap-6">
            
            {/* Readout Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -z-0"></div>
              <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 relative z-10">
                <Gauge className="w-5 h-5 text-blue-500" />
                System Pressure
              </h2>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-5xl font-black text-slate-800 tracking-tighter">
                  {pressure.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-slate-500 mb-1">atm</span>
              </div>
              
              {/* Pressure Bar */}
              <div className="mt-4 h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-red-500 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min((pressure / 5) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Pressure increases with higher temperature or lower volume.
              </p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-1 flex flex-col gap-8">
              
              {/* Temperature Slider */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-red-500" />
                    Temperature
                  </label>
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                    {temperature} K
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_TEMP}
                  max={MAX_TEMP}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Cold ({MIN_TEMP}K)</span>
                  <span>Hot ({MAX_TEMP}K)</span>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-2">
                    <Maximize className="w-5 h-5 text-emerald-500" />
                    Volume
                  </label>
                  <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    {volume} L
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_VOL}
                  max={MAX_VOL}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Compressed</span>
                  <span>Expanded</span>
                </div>
              </div>

              {/* Concept Card */}
              <div className="mt-auto bg-orange-50 p-4 rounded-xl border border-orange-100">
                <h3 className="text-sm font-bold text-orange-800 mb-2">Key Concept</h3>
                <p className="text-sm text-orange-700 leading-relaxed">
                  According to the <strong>Ideal Gas Law</strong>, pressure is directly proportional to temperature and inversely proportional to volume.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}