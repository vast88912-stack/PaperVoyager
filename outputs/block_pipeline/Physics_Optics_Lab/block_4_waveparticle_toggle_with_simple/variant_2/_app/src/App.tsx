import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- Types & Interfaces ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  color: string;
}

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const BARRIER_X = 250;
const SCREEN_X = 700;

export default function App() {
  // --- State ---
  const [mode, setMode] = useState<'wave' | 'particle'>('wave');
  const [wavelength, setWavelength] = useState<number>(40);
  const [slitDistance, setSlitDistance] = useState<number>(100);
  const [slitWidth, setSlitWidth] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const timeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const hitsRef = useRef<number[]>(new Array(CANVAS_HEIGHT).fill(0));

  // --- Reset Simulation ---
  const clearScreen = useCallback(() => {
    hitsRef.current = new Array(CANVAS_HEIGHT).fill(0);
    particlesRef.current = [];
    timeRef.current = 0;
  }, []);

  // Clear screen when parameters change
  useEffect(() => {
    clearScreen();
  }, [mode, slitDistance, slitWidth, clearScreen]);

  // --- Main Animation Loop ---
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Notebook Grid (subtle)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
    }

    const centerY = CANVAS_HEIGHT / 2;
    const slit1Y = centerY - slitDistance / 2;
    const slit2Y = centerY + slitDistance / 2;

    // Advance time if playing
    if (isPlaying) {
      timeRef.current += mode === 'wave' ? 1.5 : 2.5; // Speed
    }
    const t = timeRef.current;

    // Draw Source Area (Left)
    ctx.fillStyle = mode === 'wave' ? 'rgba(37, 99, 235, 0.05)' : 'rgba(249, 115, 22, 0.05)';
    ctx.fillRect(0, 0, BARRIER_X, CANVAS_HEIGHT);

    // --- WAVE MODE RENDERING ---
    if (mode === 'wave') {
      // Draw incident plane waves
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.3)';
      ctx.lineWidth = 2;
      for (let x = (t % wavelength) - wavelength; x < BARRIER_X; x += wavelength) {
        if (x > 0) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
      }

      // Draw outgoing circular waves from slits
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
      for (let r = (t % wavelength); r < (SCREEN_X - BARRIER_X + 100); r += wavelength) {
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

      // Draw Theoretical Interference Pattern on Screen
      ctx.fillStyle = 'rgba(37, 99, 235, 0.8)';
      ctx.beginPath();
      ctx.moveTo(SCREEN_X, 0);
      for (let y = 0; y <= CANVAS_HEIGHT; y++) {
        const dy = y - centerY;
        const L = SCREEN_X - BARRIER_X;
        const theta = Math.atan2(dy, L);
        const pathDiff = slitDistance * Math.sin(theta);
        const phaseDiff = (2 * Math.PI / wavelength) * pathDiff;
        // Intensity I = I0 * cos^2(phaseDiff / 2) * sinc^2(beta) [ignoring sinc for simple view]
        const intensity = Math.pow(Math.cos(phaseDiff / 2), 2);
        
        // Modulate with a gaussian to simulate beam width
        const envelope = Math.exp(-(dy * dy) / (200 * 200));
        const finalIntensity = intensity * envelope;
        
        const drawX = SCREEN_X + finalIntensity * 60; // Max amplitude 60px
        ctx.lineTo(drawX, y);
      }
      ctx.lineTo(SCREEN_X, CANVAS_HEIGHT);
      ctx.fill();
    } 
    
    // --- PARTICLE MODE RENDERING ---
    else if (mode === 'particle') {
      const particles = particlesRef.current;
      const hits = hitsRef.current;

      // Spawn particles
      if (isPlaying) {
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: 0,
            y: centerY + (Math.random() - 0.5) * 300,
            vx: 5 + Math.random() * 2,
            vy: 0,
            active: true,
            color: Math.random() > 0.5 ? '#f97316' : '#ea580c'
          });
        }
      }

      // Update and Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.active) continue;

        const prevX = p.x;
        p.x += p.vx;
        p.y += p.vy;

        // Collision with Barrier
        if (prevX <= BARRIER_X && p.x > BARRIER_X) {
          const inSlit1 = Math.abs(p.y - slit1Y) < slitWidth / 2;
          const inSlit2 = Math.abs(p.y - slit2Y) < slitWidth / 2;

          if (!inSlit1 && !inSlit2) {
            p.active = false; // Blocked
            continue;
          } else {
            // Passed through slit - Classic particle scatter (diffraction)
            // Particles scatter slightly at the edges
            const slitCenter = inSlit1 ? slit1Y : slit2Y;
            const offset = p.y - slitCenter;
            p.vy = (offset / (slitWidth / 2)) * (Math.random() * 1.5);
          }
        }

        // Collision with Screen
        if (p.x >= SCREEN_X) {
          p.active = false;
          p.x = SCREEN_X;
          // Record hit
          const hitY = Math.floor(p.y);
          if (hitY >= 0 && hitY < CANVAS_HEIGHT) {
            // Spread hit slightly for smoother histogram
            for(let dy=-2; dy<=2; dy++) {
              if(hitY+dy >= 0 && hitY+dy < CANVAS_HEIGHT) {
                 hits[hitY+dy] += (3 - Math.abs(dy)) * 0.2;
              }
            }
          }
          continue;
        }

        // Draw Particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw trail
        ctx.strokeStyle = `rgba(249, 115, 22, 0.3)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // Clean up dead particles periodically to prevent memory leaks
      if (particles.length > 1000) {
        particlesRef.current = particles.filter(p => p.active);
      }

      // Draw Histogram on Screen
      ctx.fillStyle = 'rgba(249, 115, 22, 0.8)';
      ctx.beginPath();
      ctx.moveTo(SCREEN_X, 0);
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        const count = hits[y];
        const drawX = SCREEN_X + Math.min(count, 80); // Max width 80
        ctx.lineTo(drawX, y);
      }
      ctx.lineTo(SCREEN_X, CANVAS_HEIGHT);
      ctx.fill();
    }

    // --- DRAW HARDWARE (Barrier & Screen) ---
    ctx.fillStyle = '#334155'; // Slate 700
    
    // Barrier Top
    ctx.fillRect(BARRIER_X - 4, 0, 8, slit1Y - slitWidth / 2);
    // Barrier Middle
    ctx.fillRect(BARRIER_X - 4, slit1Y + slitWidth / 2, 8, slitDistance - slitWidth);
    // Barrier Bottom
    ctx.fillRect(BARRIER_X - 4, slit2Y + slitWidth / 2, 8, CANVAS_HEIGHT - (slit2Y + slitWidth / 2));

    // Screen
    ctx.fillRect(SCREEN_X, 0, 6, CANVAS_HEIGHT);

    // Annotations
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText('BARRIER', BARRIER_X - 25, CANVAS_HEIGHT - 10);
    ctx.fillText('DETECTOR SCREEN', SCREEN_X + 15, CANVAS_HEIGHT - 10);
    if (mode === 'wave') {
      ctx.fillText('INTENSITY PATTERN', SCREEN_X + 15, 20);
    } else {
      ctx.fillText('PARTICLE HITS', SCREEN_X + 15, 20);
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [mode, wavelength, slitDistance, slitWidth, isPlaying]);

  // Handle Animation Lifecycle
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div className="min-h-screen bg-[#F4F1EA] p-8 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header / Title */}
      <div className="max-w-5xl w-full mb-6 flex justify-between items-end border-b-2 border-slate-300 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-serif">
            Optics Lab <span className="text-slate-400 font-normal">| Experiment 04</span>
          </h1>
          <p className="text-slate-500 mt-1 font-mono text-sm uppercase tracking-wider">
            Wave-Particle Duality & Double Slit Interference
          </p>
        </div>
        
        {/* Play/Pause Controls */}
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-white border border-slate-300 shadow-sm rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {isPlaying ? (
              <><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Pause</>
            ) : (
              <><span className="w-2 h-2 bg-green-500 rounded-full"></span> Play</>
            )}
          </button>
          <button 
            onClick={clearScreen}
            className="px-4 py-2 bg-white border border-slate-300 shadow-sm rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Controls Sidebar */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* Mode Toggle */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Observation Mode</h2>
            
            <div className="flex bg-slate-100 p-1 rounded-md">
              <button
                onClick={() => setMode('wave')}
                className={`flex-1 py-2 text-sm font-medium rounded-sm transition-all ${
                  mode === 'wave' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Wave
              </button>
              <button
                onClick={() => setMode('particle')}
                className={`flex-1 py-2 text-sm font-medium rounded-sm transition-all ${
                  mode === 'particle' 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Particle
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              {mode === 'wave' 
                ? "In wave mode, light passes through both slits simultaneously, creating an interference pattern of bright and dark fringes."
                : "In classical particle mode, discrete photons travel straight paths, forming two distinct bands without interference."}
            </p>
          </div>

          {/* Parameters */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-5">Apparatus Setup</h2>
            
            <div className="space-y-6">
              {/* Slit Distance */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Slit Separation (d)</label>
                  <span className="text-xs font-mono text-slate-500">{slitDistance} nm</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="200" 
                  value={slitDistance} 
                  onChange={(e) => setSlitDistance(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>

              {/* Slit Width */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Slit Width (a)</label>
                  <span className="text-xs font-mono text-slate-500">{slitWidth} nm</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="40" 
                  value={slitWidth} 
                  onChange={(e) => setSlitWidth(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>

              {/* Wavelength (Only relevant for wave) */}
              <div className={`transition-opacity duration-300 ${mode === 'wave' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Wavelength (λ)</label>
                  <span className="text-xs font-mono text-slate-500">{wavelength} nm</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={wavelength} 
                  onChange={(e) => setWavelength(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
          
          {/* Lab Notes */}
          <div className="mt-auto bg-[#FEFCE8] p-4 rounded-lg border border-[#FEF08A] shadow-sm transform rotate-1">
            <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24