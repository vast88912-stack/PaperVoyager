import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Types & Interfaces ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface SimulationSettings {
  temperature: number; // Kelvin
  volume: number;      // Liters (maps to width)
}

// --- Icons (Inline SVGs to ensure zero dependencies) ---
const ThermometerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    <line x1="12" y1="12" x2="12" y2="12.01" />
  </svg>
);

const VolumeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const GaugeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);

// --- Main Component ---
export default function App() {
  // --- State ---
  const [temperature, setTemperature] = useState<number>(300); // 100K to 1000K
  const [volume, setVolume] = useState<number>(100);           // 30L to 100L
  
  // Ref to hold settings for the animation loop without stale closures
  const settingsRef = useRef<SimulationSettings>({ temperature, volume });
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  // Constants
  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 400;
  const MIN_TEMP = 100;
  const MAX_TEMP = 1000;
  const MIN_VOL = 30;
  const MAX_VOL = 100;
  const NUM_PARTICLES = 150;

  // --- Derived Values ---
  // Ideal Gas Law: P = (nRT)/V. We normalize so at T=300, V=100, P=1.0 atm
  // k = P * V / T = 1.0 * 100 / 300 = 1/3
  const pressure = useMemo(() => {
    const p = (1 / 3) * (temperature / volume);
    return p.toFixed(2);
  }, [temperature, volume]);

  // Sync settings ref when state changes
  useEffect(() => {
    settingsRef.current = { temperature, volume };
  }, [temperature, volume]);

  // --- Initialization & Animation Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Initialize particles
    if (particlesRef.current.length === 0) {
      const initialParticles: Particle[] = [];
      for (let i = 0; i < NUM_PARTICLES; i++) {
        initialParticles.push({
          x: Math.random() * (CANVAS_WIDTH - 20) + 10,
          y: Math.random() * (CANVAS_HEIGHT - 20) + 10,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          r: 3 + Math.random() * 2, // varying radii
        });
      }
      particlesRef.current = initialParticles;
    }

    // Color mapper based on Temperature
    const getParticleColor = (temp: number) => {
      // Map 100K-400K from Blue (240) to Red (0)
      // Map 400K-1000K from Red (0) to Yellow (60)
      let hue = 0;
      if (temp <= 400) {
        hue = 240 - ((temp - 100) / 300) * 240;
      } else {
        hue = ((temp - 400) / 600) * 60;
      }
      return `hsl(${hue}, 100%, 65%)`;
    };

    // Animation Loop
    const render = () => {
      const { temperature: currentTemp, volume: currentVol } = settingsRef.current;
      
      // Calculate current container width based on volume percentage
      const containerWidth = (currentVol / MAX_VOL) * CANVAS_WIDTH;
      
      // Speed multiplier based on Kinetic Energy proportional to Temperature
      // Base temp is 300K, v is proportional to sqrt(T)
      const speedMult = Math.sqrt(currentTemp / 300);

      // 1. Draw Background / Fade effect for trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)'; // Dark slate with opacity for trails
      ctx.fillRect(0, 0, containerWidth, CANVAS_HEIGHT);

      // 2. Draw Piston & Exterior
      ctx.fillStyle = '#0f172a'; // Deep background for outside area
      ctx.fillRect(containerWidth, 0, CANVAS_WIDTH - containerWidth, CANVAS_HEIGHT);
      
      // Piston face
      const gradient = ctx.createLinearGradient(containerWidth, 0, containerWidth + 15, 0);
      gradient.addColorStop(0, '#94a3b8');
      gradient.addColorStop(1, '#475569');
      ctx.fillStyle = gradient;
      ctx.fillRect(containerWidth, 0, 15, CANVAS_HEIGHT);
      
      // Piston rod
      ctx.fillStyle = '#64748b';
      ctx.fillRect(containerWidth + 15, CANVAS_HEIGHT / 2 - 10, CANVAS_WIDTH, 20);

      // 3. Update & Draw Particles
      ctx.globalCompositeOperation = 'lighter';
      const pColor = getParticleColor(currentTemp);
      ctx.fillStyle = pColor;

      const particles = particlesRef.current;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Move
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Bounce off walls
        if (p.x - p.r < 0) {
          p.x = p.r;
          p.vx *= -1;
        }
        // Right wall is the piston
        if (p.x + p.r > containerWidth) {
          p.x = containerWidth - p.r;
          p.vx *= -1;
        }
        if (p.y - p.r < 0) {
          p.y = p.r;
          p.vy *= -1;
        }
        if (p.y + p.r > CANVAS_HEIGHT) {
          p.y = CANVAS_HEIGHT - p.r;
          p.vy *= -1;
        }

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw container borders
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, containerWidth - 2, CANVAS_HEIGHT - 2);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Run once, reads from refs

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900 via-red-950 to-slate-950 flex items-center justify-center p-6 font-sans text-slate-100">
      
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Header Section */}
        <div className="lg:col-span-12 mb-4">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-rose-400 drop-shadow-sm">
            Kinetic Theory & Ideal Gas
          </h1>
          <p className="text-slate-400 mt-2 text-lg max-w-2xl">
            Explore the relationship between Temperature, Volume, and Pressure. 
            Adjust the sliders to see how particle kinetic energy and container size affect the system's pressure.
          </p>
        </div>

        {/* Canvas / Visualization */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.15)] border border-white/10 bg-slate-900 p-2 backdrop-blur-sm">
            <canvas 
              ref={canvasRef} 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT}
              className="rounded-xl bg-slate-950 w-full max-w-[500px] h-auto object-contain block"
            />
            {/* Absolute overlay for visual flair */}
            <div className="absolute inset-0 pointer-events-none rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>
          </div>
          <div className="mt-4 text-sm text-slate-500 font-medium tracking-widest uppercase">
            Particle Simulation Chamber
          </div>
        </div>

        {/* Controls & Stats Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Stats Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <GaugeIcon />
            </div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <GaugeIcon /> System Pressure
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-mono font-bold text-white tracking-tighter">
                {pressure}
              </span>
              <span className="text-rose-400 font-medium">atm</span>
            </div>
            
            {/* Pressure Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full mt-6 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.min((parseFloat(pressure) / 10) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
              <span>0 atm</span>
              <span>10+ atm</span>
            </div>
          </div>

          {/* Controls Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-8">
            
            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-orange-400"><ThermometerIcon /></span>
                  Temperature
                </label>
                <span className="text-lg font-mono font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
                  {temperature} K
                </span>
              </div>
              <input 
                type="range" 
                min={MIN_TEMP} 
                max={MAX_TEMP} 
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>{MIN_TEMP} K (Cold)</span>
                <span>{MAX_TEMP} K (Hot)</span>
              </div>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-blue-400"><VolumeIcon /></span>
                  Volume
                </label>
                <span className="text-lg font-mono font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                  {volume} L
                </span>
              </div>
              <input 
                type="range" 
                min={MIN_VOL} 
                max={MAX_VOL} 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>{MIN_VOL} L (Compressed)</span>
                <span>{MAX_VOL} L (Expanded)</span>
              </div>
            </div>

          </div>

          {/* Equation Card */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-center shadow-inner">
            <div className="text-center">
              <span className="text-slate-400 text-sm block mb-1">Ideal Gas Law</span>
              <span className="text-2xl font-serif italic text-white tracking-widest">
                P <span className="text-blue-400">V</span> = n R <span className="text-orange-400">T</span>
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}