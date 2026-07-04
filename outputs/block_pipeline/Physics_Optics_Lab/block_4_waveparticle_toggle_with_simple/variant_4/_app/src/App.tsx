import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for UI
  const [mode, setMode] = useState<'wave' | 'particle'>('wave');
  const [wavelength, setWavelength] = useState<number>(30);
  const [slitSeparation, setSlitSeparation] = useState<number>(80);

  // Mutable state for the animation loop to avoid dependency cycles
  const simParams = useRef({
    mode: 'wave',
    wavelength: 30,
    slitSeparation: 80,
    time: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number }[],
    histogram: new Array(400).fill(0)
  });

  // Sync state to mutable ref
  useEffect(() => {
    // If mode changed, clear particles and histogram
    if (simParams.current.mode !== mode) {
      simParams.current.particles = [];
      simParams.current.histogram = new Array(400).fill(0);
    }
    simParams.current.mode = mode;
    simParams.current.wavelength = wavelength;
    simParams.current.slitSeparation = slitSeparation;
  }, [mode, wavelength, slitSeparation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const width = canvas.width;
    const height = canvas.height;
    
    // Geometry
    const sourceX = 50;
    const sourceY = height / 2;
    const barrierX = 300;
    const screenX = 700;
    const slitWidth = 10;

    const render = () => {
      const p = simParams.current;
      p.time += 1;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Draw Grid (Notebook aesthetic)
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
      for (let i = 0; i < height; i += 20) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
      }

      // Draw Source
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px monospace';
      ctx.fillText('Source', sourceX - 20, sourceY - 15);

      // Slit Coordinates
      const slit1Y = sourceY - p.slitSeparation / 2;
      const slit2Y = sourceY + p.slitSeparation / 2;

      // Draw Barrier
      ctx.fillStyle = '#374151';
      ctx.fillRect(barrierX - 5, 0, 10, slit1Y - slitWidth / 2);
      ctx.fillRect(barrierX - 5, slit1Y + slitWidth / 2, 10, p.slitSeparation - slitWidth);
      ctx.fillRect(barrierX - 5, slit2Y + slitWidth / 2, 10, height - (slit2Y + slitWidth / 2));
      ctx.fillText('Double Slit', barrierX - 35, 20);

      // Draw Screen
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(screenX, 0, 10, height);
      ctx.fillStyle = '#1f2937';
      ctx.fillText('Detection Screen', screenX - 45, 20);

      if (p.mode === 'wave') {
        // Draw Wave Fronts from Source
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 2;
        for (let r = (p.time % p.wavelength); r < barrierX - sourceX; r += p.wavelength) {
          ctx.beginPath();
          ctx.arc(sourceX, sourceY, r, -Math.PI / 4, Math.PI / 4);
          ctx.stroke();
        }

        // Draw Expanding Interference Waves from Slits
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        for (let r = (p.time % p.wavelength); r < screenX - barrierX + 100; r += p.wavelength) {
          // Slit 1
          ctx.beginPath();
          ctx.arc(barrierX, slit1Y, r, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          // Slit 2
          ctx.beginPath();
          ctx.arc(barrierX, slit2Y, r, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        }

        // Draw Theoretical Interference Pattern on Screen
        ctx.beginPath();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        for (let y = 0; y < height; y++) {
          const l1 = Math.sqrt(Math.pow(screenX - barrierX, 2) + Math.pow(y - slit1Y, 2));
          const l2 = Math.sqrt(Math.pow(screenX - barrierX, 2) + Math.pow(y - slit2Y, 2));
          const delta = Math.abs(l1 - l2);
          // Intensity formula: I = cos^2(pi * delta / lambda)
          const intensity = Math.pow(Math.cos((Math.PI * delta) / p.wavelength), 2);
          
          const graphX = screenX + 10 + intensity * 60; // Max amplitude 60px
          if (y === 0) ctx.moveTo(graphX, y);
          else ctx.lineTo(graphX, y);
        }
        ctx.stroke();

        // Fill under the intensity curve
        ctx.lineTo(screenX + 10, height);
        ctx.lineTo(screenX + 10, 0);
        ctx.fillStyle = 'rgba(220, 38, 38, 0.1)';
        ctx.fill();

      } else {
        // PARTICLE MODE
        
        // Emit Particles
        for (let i = 0; i < 5; i++) {
          // Random angle to cover the slits
          const angle = (Math.random() - 0.5) * 1.5; 
          const speed = 6;
          p.particles.push({
            x: sourceX,
            y: sourceY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
          });
        }

        // Update and Draw Particles
        ctx.fillStyle = '#d97706';
        for (let i = p.particles.length - 1; i >= 0; i--) {
          const pt = p.particles[i];
          const nextX = pt.x + pt.vx;
          const nextY = pt.y + pt.vy;

          // Barrier Collision
          if (pt.x < barrierX && nextX >= barrierX - 5) {
            const hitSlit1 = nextY > slit1Y - slitWidth/2 && nextY < slit1Y + slitWidth/2;
            const hitSlit2 = nextY > slit2Y - slitWidth/2 && nextY < slit2Y + slitWidth/2;
            if (!hitSlit1 && !hitSlit2) {
              p.particles.splice(i, 1);
              continue;
            }
          }

          // Screen Collision
          if (nextX >= screenX) {
            const hitY = Math.floor(nextY);
            if (hitY >= 0 && hitY < height) {
              p.histogram[hitY] += 1;
            }
            p.particles.splice(i, 1);
            continue;
          }

          pt.x = nextX;
          pt.y = nextY;

          // Draw Particle
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Histogram (Accumulated Particle Hits)
        ctx.beginPath();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.moveTo(screenX + 10, 0);
        
        // Smooth histogram visually
        for (let y = 0; y < height; y++) {
          // average over nearby bins for smoother lab data look
          let sum = 0;
          let count = 0;
          for(let dy = -3; dy <= 3; dy++) {
            if(y+dy >= 0 && y+dy < height) {
              sum += p.histogram[y+dy];
              count++;
            }
          }
          const avg = sum / count;
          const graphX = screenX + 10 + Math.min(avg * 2, 80); // scale factor
          ctx.lineTo(graphX, y);
        }
        ctx.stroke();
        ctx.lineTo(screenX + 10, height);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.2)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f6] p-8 font-mono text-gray-800 flex flex-col items-center">
      
      {/* Notebook Header */}
      <div className="max-w-4xl w-full mb-6 border-b-2 border-gray-400 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-blue-900 uppercase">Optics Lab</h1>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>Experiment 05: Wave-Particle Duality & Interference</span>
          <span>Date: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Controls Panel */}
        <div className="lg:col-span-1 bg-white p-5 rounded border-2 border-gray-300 shadow-sm relative">
          {/* Decorative tape/pin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-yellow-200/80 rotate-2 border border-yellow-300 shadow-sm"></div>
          
          <h2 className="text-lg font-bold mb-4 border-b border-gray-200 pb-2">Parameters</h2>
          
          {/* Toggle Switch */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Nature of Light</label>
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setMode('wave')}
                className={`px-4 py-2 text-sm font-medium border rounded-l-md transition-colors ${
                  mode === 'wave' 
                    ? 'bg-blue-100 border-blue-600 text-blue-700 z-10' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Wave
              </button>
              <button
                type="button"
                onClick={() => setMode('particle')}
                className={`px-4 py-2 text-sm font-medium border rounded-r-md transition-colors -ml-px ${
                  mode === 'particle' 
                    ? 'bg-amber-100 border-amber-600 text-amber-800 z-10' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Particle
              </button>
            </div>
          </div>

          {/* Wavelength Slider */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              Wavelength (λ): <span className="text-gray-900">{wavelength} nm</span>
            </label>
            <input 
              type="range" 
              min="15" 
              max="60" 
              value={wavelength} 
              onChange={(e) => setWavelength(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Slit Separation Slider */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              Slit Distance (d): <span className="text-gray-900">{slitSeparation} µm</span>
            </label>
            <input 
              type="range" 
              min="30" 
              max="150" 
              value={slitSeparation} 
              onChange={(e) => setSlitSeparation(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 italic">
              {mode === 'wave' 
                ? "Observation: Coherent waves passing through two slits create an interference pattern of bright and dark fringes."
                : "Observation: Classical particles passing through slits create two distinct bands, lacking interference fringes."}
            </p>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3 bg-white border-2 border-gray-300 shadow-sm p-2 rounded relative">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="w-full h-auto border border-gray-200 bg-[#fdfdfc]"
          />
          <div className="absolute bottom-4 left-4 text-xs text-gray-400 opacity-70">
            Fig 1. Simulation Canvas
          </div>
        </div>

      </div>

      {/* Lab Notes / Footer */}
      <div className="max-w-4xl w-full mt-6 bg-[#fffdf0] p-4 border border-yellow-200 rounded shadow-inner text-sm text-gray-700">
        <h3 className="font-bold border-b border-yellow-300 inline-block mb-2 text-yellow-800">Lab Notes</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Adjust <strong>Wavelength (λ)</strong> to see how the spacing of the interference fringes changes (∆y = λL/d).</li>
          <li>Adjust <strong>Slit Distance (d)</strong> to observe its inverse relationship with fringe spacing.</li>
          <li>Toggle between <strong>Wave</strong> and <strong>Particle</strong> mode to contrast the Thomas Young double-slit experiment predictions.</li>
        </ul>
      </div>

    </div>
  );
}