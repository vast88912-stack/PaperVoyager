import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- SVGs ---
const ThermometerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const VolumeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const GaugeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 14 4-4" />
    <path d="M3.34 16A10 10 0 1 1 20.66 16" />
  </svg>
);

// --- Constants & Types ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const NUM_PARTICLES = 250;
const BASE_TEMP = 300; // Kelvin
const MAX_TEMP = 1000;
const MIN_TEMP = 100;
const MIN_VOL = 20; // %
const MAX_VOL = 100; // %

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseSpeed: number;
};

export default function App() {
  // UI State
  const [temperature, setTemperature] = useState<number>(300);
  const [volume, setVolume] = useState<number>(80);

  // Refs for animation loop (avoiding closure staleness)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tempRef = useRef<number>(temperature);
  const volRef = useRef<number>(volume);
  const requestRef = useRef<number>();

  // Derived physics
  // P = k * (T/V). Let's set k such that T=300, V=80 -> P=1.0 atm
  // 1.0 = k * (300/80) -> k = 80 / 300 = 0.2666...
  const pressureConst = 80 / 300;
  const currentPressure = useMemo(() => {
    return (pressureConst * (temperature / volume)).toFixed(2);
  }, [temperature, volume]);

  // Sync state to refs for the animation loop
  useEffect(() => { tempRef.current = temperature; }, [temperature]);
  useEffect(() => { volRef.current = volume; }, [volume]);

  // Initialize Particles
  useEffect(() => {
    const initParticles = () => {
      const p: Particle[] = [];
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Speeds follow a rough distribution
        const baseSpeed = 1.0 + Math.random() * 1.5; 
        p.push({
          x: Math.random() * (CANVAS_WIDTH * (volRef.current / 100)) * 0.9,
          y: Math.random() * CANVAS_HEIGHT * 0.9,
          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
          radius: 3,
          baseSpeed: baseSpeed
        });
      }
      particlesRef.current = p;
    };
    initParticles();
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      // 1. Calculate current constraints
      const currentTemp = tempRef.current;
      const currentVol = volRef.current;
      const activeWidth = CANVAS_WIDTH * (currentVol / 100);
      
      // Speed multiplier based on temperature (v ∝ sqrt(T))
      const speedMult = Math.sqrt(currentTemp / BASE_TEMP);

      // 2. Draw Background
      // Dark slate background for active area
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, activeWidth, CANVAS_HEIGHT);
      
      // Lighter, hatched background for inactive area (outside volume)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(activeWidth, 0, CANVAS_WIDTH - activeWidth, CANVAS_HEIGHT);
      
      // Draw Piston (moving wall)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(activeWidth, 0, 6, CANVAS_HEIGHT);
      
      // Draw cylinder walls (top/bottom/left)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 3. Update & Draw Particles
      const particles = particlesRef.current;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Apply velocity mapped by temperature
        const currentVx = p.vx * speedMult;
        const currentVy = p.vy * speedMult;
        
        p.x += currentVx;
        p.y += currentVy;

        // --- Collision Detection ---
        // Left Wall
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.vx *= -1;
        }
        // Top Wall
        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.vy *= -1;
        }
        // Bottom Wall
        if (p.y + p.radius > CANVAS_HEIGHT) {
          p.y = CANVAS_HEIGHT - p.radius;
          p.vy *= -1;
        }
        // Piston (Right Wall)
        if (p.x + p.radius > activeWidth) {
          p.x = activeWidth - p.radius - 0.1; // force slightly inside to avoid sticking
          // Reverse velocity, ensure it's moving left
          p.vx = -Math.abs(p.vx);
        }

        // --- Drawing ---
        // Calculate color based on individual kinetic energy
        // Speed ranges approx 1.0 to 5.0. Map to Hue 240 (Blue) to 0 (Red)
        const currentSpeed = p.baseSpeed * speedMult;
        let hue = 240 - ((currentSpeed - 0.5) / 4) * 240;
        hue = Math.max(0, Math.min(240, hue)); // clamp

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
        
        // Subtle glow
        ctx.shadowBlur = 4;
        ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
        
        ctx.fill();
        
        // Reset shadow for performance on next draw if not needed
        ctx.shadowBlur = 0;
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-rose-50 to-amber-100 p-4 md:p-8 flex items-center justify-center font-sans text-slate-800 selection:bg-rose-200">
      
      {/* Main Container */}
      <div className="max-w-6xl w-full bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row relative">
        
        {/* Decorative background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-rose-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />

        {/* Simulation Area (Left) */}
        <div className="w-full lg:w-[60%] p-6 lg:p-8 flex flex-col">
          <header className="mb-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
              <ThermometerIcon />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Particle Box</h1>
              <p className="text-sm text-slate-500 font-medium">Ideal Gas Law Visualization</p>
            </div>
          </header>

          {/* Canvas Container */}
          <div className="relative w-full aspect-[3/2] rounded-3xl overflow-hidden shadow-inner border-[6px] border-slate-100/50 bg-slate-900 group">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-full block"
            />
            {/* Interactive hint overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
              <p className="text-white/80 font-medium tracking-wide bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
                Adjust controls to see physical changes
              </p>
            </div>
          </div>
        </div>

        {/* Controls Area (Right) */}
        <div className="w-full lg:w-[40%] bg-white/40 border-l border-white/60 p-6 lg:p-10 flex flex-col gap-8 z-10 relative">
          
          {/* Real-time Readouts */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/80 rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><GaugeIcon /></div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Pressure</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-800">{currentPressure}</span>
                  <span className="text-sm font-medium text-slate-500">atm</span>
                </div>
             </div>
             <div className="bg-white/80 rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><ThermometerIcon /></div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">State</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold ${temperature > 600 ? 'text-rose-500' : temperature < 200 ? 'text-blue-500' : 'text-amber-500'}`}>
                    {temperature > 600 ? 'Hot Gas' : temperature < 200 ? 'Cold Gas' : 'Normal'}
                  </span>
                </div>
             </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2" />

          {/* Sliders */}
          <div className="flex flex-col gap-10">
            {/* Temperature Control */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2 text-slate-700">
                  <ThermometerIcon />
                  <label htmlFor="temp-slider" className="font-bold text-lg">Temperature</label>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-lg">
                  <span className="font-mono font-bold text-rose-600">{temperature} K</span>
                </div>
              </div>
              <div className="relative">
                <input
                  id="temp-slider"
                  type="range"
                  min={MIN_TEMP}
                  max={MAX_TEMP}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-3 appearance-none bg-slate-200 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-rose-400 cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #ef4444 100%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-400 px-1">
                <span>{MIN_TEMP} K</span>
                <span>{MAX_TEMP} K</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                <div className="flex items-center gap-2 text-slate-700">
                  <VolumeIcon />
                  <label htmlFor="vol-slider" className="font-bold text-lg">Volume</label>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-lg">
                  <