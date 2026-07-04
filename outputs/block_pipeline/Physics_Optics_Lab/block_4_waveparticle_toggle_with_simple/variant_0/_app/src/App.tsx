import React, { useState, useEffect, useRef } from 'react';

// --- Types & Interfaces ---
type Mode = 'wave' | 'particle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Simulation State
  const [mode, setMode] = useState<Mode>('wave');
  const [slitSeparation, setSlitSeparation] = useState<number>(80);
  const [wavelength, setWavelength] = useState<number>(25);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);

  // Mutable refs for animation state to avoid re-renders
  const timeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const histogramRef = useRef<number[]>(new Array(150).fill(0)); // Binned histogram

  // Reset histogram when mode or parameters change
  useEffect(() => {
    histogramRef.current = new Array(150).fill(0);
    particlesRef.current = [];
  }, [mode, slitSeparation]);

  // --- Animation Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    // Simulation Geometry
    const sourceX = 50;
    const sourceY = H / 2;
    const barrierX = W / 2;
    const screenX = W - 100;
    const slitWidth = 15;

    const render = () => {
      if (!isAnimating) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      timeRef.current += 1;
      const t = timeRef.current;

      // Clear Canvas
      ctx.clearRect(0, 0, W, H);

      const slit1Y = H / 2 - slitSeparation / 2;
      const slit2Y = H / 2 + slitSeparation / 2;

      // Draw Source
      ctx.fillStyle = mode === 'wave' ? '#2563eb' : '#dc2626';
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Source Label
      ctx.font = '12px monospace';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Source', sourceX - 20, sourceY - 15);

      // Draw Barrier
      ctx.fillStyle = '#1f2937';
      // Top segment
      ctx.fillRect(barrierX - 5, 0, 10, slit1Y - slitWidth / 2);
      // Middle segment
      ctx.fillRect(barrierX - 5, slit1Y + slitWidth / 2, 10, slitSeparation - slitWidth);
      // Bottom segment
      ctx.fillRect(barrierX - 5, slit2Y + slitWidth / 2, 10, H - (slit2Y + slitWidth / 2));

      // Barrier Label
      ctx.fillText('Double Slit', barrierX - 35, 20);

      // Draw Screen
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(screenX, 0, 4, H);
      ctx.fillText('Detector', screenX - 25, 20);

      if (mode === 'wave') {
        // --- WAVE SIMULATION ---
        const waveSpeed = 1.5;
        const phaseOffset = t * waveSpeed;

        ctx.lineWidth = 1.5;

        // 1. Waves from Source to Barrier
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.3)'; // Blue
        for (let r = phaseOffset % wavelength; r < (barrierX - sourceX); r += wavelength) {
          ctx.beginPath();
          ctx.arc(sourceX, sourceY, r, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
        }

        // 2. Waves from Slits to Screen
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
        const maxRadius = Math.hypot(screenX - barrierX, H);
        
        for (let r = phaseOffset % wavelength; r < maxRadius; r += wavelength) {
          // Slit 1
          ctx.beginPath();
          ctx.arc(barrierX, slit1Y, r, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          // Slit 2
          ctx.beginPath();
          ctx.arc(barrierX, slit2Y, r, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }

        // 3. Interference Pattern on Screen
        for (let y = 0; y < H; y += 2) {
          const d1 = Math.hypot(screenX - barrierX, y - slit1Y);
          const d2 = Math.hypot(screenX - barrierX, y - slit2Y);
          const delta = Math.abs(d1 - d2);
          
          // Intensity formula: I = I0 * cos^2(pi * delta / lambda)
          const phase = (delta / wavelength) * Math.PI;
          const intensity = Math.pow(Math.cos(phase), 2);

          ctx.fillStyle = `rgba(37, 99, 235, ${intensity * 0.9})`;
          ctx.fillRect(screenX + 4, y, intensity * 60, 2);
        }

      } else {
        // --- PARTICLE SIMULATION ---
        
        // Emit new particles
        for (let i = 0; i < 3; i++) {
          // Aim roughly towards the slits with some spread
          const targetY = H/2 + (Math.random() - 0.5) * (slitSeparation + 60);
          const angle = Math.atan2(targetY - sourceY, barrierX - sourceX);
          const speed = 4 + Math.random() * 2;

          particlesRef.current.push({
            x: sourceX,
            y: sourceY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            active: true
          });
        }

        ctx.fillStyle = '#dc2626'; // Red particles
        const binSize = H / histogramRef.current.length;

        // Update and draw particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          if (!p.active) continue;

          p.x += p.vx;
          p.y += p.vy;

          // Check Barrier Collision
          if (p.x >= barrierX - 5 && p.x <= barrierX + 5) {
            const inSlit1 = Math.abs(p.y - slit1Y) < slitWidth / 2;
            const inSlit2 = Math.abs(p.y - slit2Y) < slitWidth / 2;
            if (!inSlit1 && !inSlit2) {
              p.active = false; // Hit the wall
              continue;
            }
          }

          // Check Screen Collision
          if (p.x >= screenX) {
            p.active = false;
            const binIndex = Math.floor(p.y / binSize);
            if (binIndex >= 0 && binIndex < histogramRef.current.length) {
              histogramRef.current[binIndex] += 1;
            }
            continue;
          }

          // Draw Particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Clean up inactive particles periodically to save memory
        if (t % 60 === 0) {
          particlesRef.current = particlesRef.current.filter(p => p.active);
        }

        // Draw Histogram on Screen
        ctx.fillStyle = 'rgba(220, 38, 38, 0.6)';
        for (let i = 0; i < histogramRef.current.length; i++) {
          const count = histogramRef.current[i];
          if (count > 0) {
            // Scale count visually
            const barLength = Math.min(count * 0.5, 80); 
            ctx.fillRect(screenX + 4, i * binSize, barLength, binSize + 0.5);
          }
        }
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mode, slitSeparation, wavelength, isAnimating]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-800 font-mono p-4 md:p-8 selection:bg-blue-200">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="mb-8 border-b-2 border-gray-300 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            Optics Lab: Wave-Particle Duality
          </h1>
          <p className="text-gray-600 text-sm max-w-2xl">
            Investigate the nature of light using the classic double-slit experiment. 
            Toggle between wave and particle models to observe how interference patterns emerge 
            from waves, while particles create distinct scattering bands.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6 bg-white p-5 rounded-sm border border-gray-300 shadow-sm relative">
            {/* Tape effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/50 border border-gray-200 shadow-sm rotate-[-2deg] backdrop-blur-sm"></div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Model Toggle</h2>
              <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200">
                <button
                  onClick={() => setMode('wave')}
                  className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
                    mode === 'wave' 
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Wave
                </button>
                <button
                  onClick={() => setMode('particle')}
                  className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
                    mode === 'particle' 
                      ? 'bg-white text-red-600 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Particle
                </button>
              </div>
            </div>

            <div className="space-y-5 pt-4 border-t border-gray-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Parameters</h2>
              
              {/* Slit Separation Slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Slit Separation</label>
                  <span className="text-xs text-gray-500">{slitSeparation} nm</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="120" 
                  value={slitSeparation}
                  onChange={(e) => setSlitSeparation(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700"
                />
              </div>

              {/* Wavelength Slider (Only relevant for waves visually in this simple sim) */}
              <div className={`transition-opacity duration-300 ${mode === 'particle' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Wavelength (λ)</label>
                  <span className="text-xs text-gray-500">{wavelength} nm</span>
                </div>
                <input 
                  type="range" 
                  min="15" 
                  max="50" 
                  value={wavelength}
                  onChange={(e) => setWavelength(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button 
                onClick={() => setIsAnimating(!isAnimating)}
                className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded transition-colors"
              >
                {isAnimating ? 'Pause Simulation' : 'Resume Simulation'}
              </button>
              
              {mode === 'particle' && (
                <button 
                  onClick={() => { histogramRef.current = new Array(150).fill(0); }}
                  className="w-full mt-2 py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded transition-colors"
                >
                  Clear Detector
                </button>
              )}
            </div>

            {/*