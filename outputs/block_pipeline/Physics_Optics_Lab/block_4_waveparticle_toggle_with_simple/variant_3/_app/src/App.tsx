import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Helper Functions ---

// Convert wavelength (400-700nm) to RGB color
function wavelengthToColor(wavelength: number): string {
  let r = 0, g = 0, b = 0;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }
  let factor = 1;
  if (wavelength >= 380 && wavelength < 420) factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  else if (wavelength >= 420 && wavelength <= 700) factor = 1.0;
  else if (wavelength > 700 && wavelength <= 780) factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);

  const gamma = 0.8;
  const R = Math.pow(r * factor, gamma) * 255;
  const G = Math.pow(g * factor, gamma) * 255;
  const B = Math.pow(b * factor, gamma) * 255;
  return `rgb(${Math.round(R)}, ${Math.round(G)}, ${Math.round(B)})`;
}

// --- Interfaces ---

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  passedSlit: boolean;
}

export default function App() {
  // --- State ---
  const [mode, setMode] = useState<'wave' | 'particle'>('wave');
  const [wavelength, setWavelength] = useState<number>(550); // nm
  const [slitSeparation, setSlitSeparation] = useState<number>(60); // px
  const [slitWidth] = useState<number>(10); // px
  
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const timeRef = useRef<number>(0);
  
  // Simulation geometry
  const width = 800;
  const height = 500;
  const sourceX = 50;
  const barrierX = 350;
  const screenX = 750;
  
  // Particles & Hits state kept in refs for animation loop
  const particlesRef = useRef<Particle[]>([]);
  const screenHitsRef = useRef<number[]>(new Array(height).fill(0));
  const maxHitsRef = useRef<number>(1);

  // Clear hits when parameters change
  useEffect(() => {
    screenHitsRef.current = new Array(height).fill(0);
    maxHitsRef.current = 1;
    particlesRef.current = [];
  }, [mode, wavelength, slitSeparation]);

  // --- Animation Loop ---
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current += 1;
    const t = timeRef.current;

    // Clear frame
    ctx.clearRect(0, 0, width, height);
    
    // Derived visual params
    const color = wavelengthToColor(wavelength);
    const simWavelength = wavelength / 15; // Scaled for visual representation
    const k = (2 * Math.PI) / simWavelength;
    const L = screenX - barrierX;

    // Calculate intensity function at a given y on the screen
    const getTheoreticalIntensity = (y: number) => {
      const deltaY = y - height / 2;
      // Path difference approx: d * sin(theta)
      const theta = Math.atan2(deltaY, L);
      const pathDiff = slitSeparation * Math.sin(theta);
      const phaseDiff = k * pathDiff;
      // Interference term: cos^2(delta/2)
      // Single slit diffraction envelope: sinc^2(beta)
      const beta = (Math.PI * slitWidth * Math.sin(theta)) / simWavelength;
      const sinc = beta === 0 ? 1 : Math.sin(beta) / beta;
      
      return Math.pow(Math.cos(phaseDiff / 2), 2) * Math.pow(sinc, 2);
    };

    // 1. Draw Environment (Barrier and Screen)
    ctx.fillStyle = '#334155'; // Slate 700
    // Top part of barrier
    ctx.fillRect(barrierX - 4, 0, 8, height / 2 - slitSeparation / 2 - slitWidth / 2);
    // Middle part
    ctx.fillRect(barrierX - 4, height / 2 - slitSeparation / 2 + slitWidth / 2, 8, slitSeparation - slitWidth);
    // Bottom part
    ctx.fillRect(barrierX - 4, height / 2 + slitSeparation / 2 + slitWidth / 2, 8, height / 2 - slitSeparation / 2 - slitWidth / 2);
    
    // Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(screenX, 0, 10, height);

    // 2. Draw Theoretical Intensity Curve (faintly on screen)
    ctx.beginPath();
    for (let y = 0; y < height; y++) {
      const intensity = getTheoreticalIntensity(y);
      const x = screenX + 10 + intensity * 60; // Extend to the right
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${color.match(/\d+/g)?.join(',')}, 0.3)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Render Mode Specifics
    if (mode === 'wave') {
      const waveSpeed = 1.5;
      const waveSpacing = simWavelength;
      const maxRadiusSource = barrierX - sourceX;
      
      ctx.lineWidth = 2;

      // Draw Source Waves
      for (let r = (t * waveSpeed) % waveSpacing; r < maxRadiusSource; r += waveSpacing) {
        ctx.beginPath();
        ctx.arc(sourceX, height / 2, r, -Math.PI/2, Math.PI/2);
        const alpha = 1 - (r / maxRadiusSource);
        ctx.strokeStyle = `rgba(${color.match(/\d+/g)?.join(',')}, ${alpha * 0.5})`;
        ctx.stroke();
      }

      // Draw Slit Waves (Secondary sources)
      const slits = [
        height / 2 - slitSeparation / 2,
        height / 2 + slitSeparation / 2
      ];
      
      slits.forEach(slitY => {
        // Phase link: source to slit takes some time
        const phaseOffset = maxRadiusSource % waveSpacing;
        for (let r = (t * waveSpeed - phaseOffset) % waveSpacing; r < width; r += waveSpacing) {
          if (r < 0) continue;
          ctx.beginPath();
          // Arc pointing towards screen
          ctx.arc(barrierX, slitY, r, -Math.PI/2, Math.PI/2);
          const alpha = Math.max(0, 1 - (r / (width - barrierX + 100)));
          ctx.strokeStyle = `rgba(${color.match(/\d+/g)?.join(',')}, ${alpha * 0.4})`;
          ctx.stroke();
        }
      });

      // Draw an intensity gradient on the screen itself
      for (let y = 0; y < height; y+=2) {
        const intensity = getTheoreticalIntensity(y);
        ctx.fillStyle = `rgba(${color.match(/\d+/g)?.join(',')}, ${intensity * 0.8})`;
        ctx.fillRect(screenX - 4, y, 4, 2);
      }

    } else if (mode === 'particle') {
      // Spawn new particles
      if (t % 2 === 0) {
        particlesRef.current.push({
          x: sourceX,
          y: height / 2 + (Math.random() - 0.5) * 5, // slight spread
          vx: 4 + Math.random(),
          vy: 0,
          active: true,
          passedSlit: false
        });
      }

      ctx.fillStyle = color;
      
      // Update and draw particles
      particlesRef.current.forEach(p => {
        if (!p.active) return;
        
        const oldX = p.x;
        p.x += p.vx;
        p.y += p.vy;

        // Check barrier collision
        if (oldX < barrierX && p.x >= barrierX) {
          const inTopSlit = Math.abs(p.y - (height / 2 - slitSeparation / 2)) <= slitWidth / 2;
          const inBotSlit = Math.abs(p.y - (height / 2 + slitSeparation / 2)) <= slitWidth / 2;
          
          if (inTopSlit || inBotSlit) {
            p.passedSlit = true;
            // Diffraction / Quantum Scattering:
            // Rejection sampling based on theoretical interference intensity
            let targetY = 0;
            let accepted = false;
            let attempts = 0;
            while (!accepted && attempts < 50) {
              targetY = height / 2 + (Math.random() - 0.5) * 400; // random y on screen
              const prob = getTheoreticalIntensity(targetY);
              if (Math.random() < prob) accepted = true;
              attempts++;
            }
            // Aim particle at targetY
            const timeToScreen = (screenX - p.x) / p.vx;
            p.vy = (targetY - p.y) / timeToScreen;
          } else {
            p.active = false; // hit wall
          }
        }

        // Check screen collision
        if (p.active && p.passedSlit && p.x >= screenX) {
          p.active = false;
          const hitY = Math.floor(p.y);
          if (hitY >= 0 && hitY < height) {
            // Smear hit over a small kernel
            for (let dy = -2; dy <= 2; dy++) {
              if (hitY + dy >= 0 && hitY + dy < height) {
                screenHitsRef.current[hitY + dy] += (3 - Math.abs(dy));
                if (screenHitsRef.current[hitY + dy] > maxHitsRef.current) {
                  maxHitsRef.current = screenHitsRef.current[hitY + dy];
                }
              }
            }
          }
        }

        // Draw particle
        if (p.active) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Remove inactive particles to prevent memory leak
      if (t % 120 === 0) {
         particlesRef.current = particlesRef.current.filter(p => p.active);
      }

      // Draw particle accumulation histogram
      ctx.fillStyle = `rgba(${color.match(/\d+/g)?.join(',')}, 0.8)`;
      for (let y = 0; y < height; y++) {
        const hits = screenHitsRef.current[y];
        if (hits > 0) {
          const barLength = (hits / maxHitsRef.current) * 60;
          ctx.fillRect(screenX + 10, y, barLength, 1);
        }
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [mode, wavelength, slitSeparation, slitWidth]);

  // Handle animation lifecycle
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans p-6" style={{
      backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
      backgroundSize: '20px 20px'
    }}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header / Lab Title */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/90 backdrop-blur border border-slate-300 shadow-sm p-5 rounded-lg">
          <div>
            <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">Optics Lab</h1>
            <p className="text-sm font-mono text-slate-500 mt-1">Exp 04: Young's Double Slit & Wave-Particle Duality</p>
          </div>
          
          {/* Mode Toggle */}
          <div className="mt-4 md:mt-0 flex items-center bg-slate-100 p-1 rounded-md border border-slate-200 shadow-inner">
            <button
              onClick={() => setMode('wave')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${mode === 'wave' ? 'bg-white shadow border-slate-200 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Wave Interference
            </button>
            <button
              onClick={() => setMode('particle')}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${mode === 'particle' ? 'bg-white shadow border-slate-200 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Quantum Particles
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls Panel */}
          <div className="lg:col-span-1 flex flex-col gap-6 bg-white/90 backdrop-blur border border-slate-300 shadow-sm p-5 rounded-lg">
            
            <div className="space-y-4">
              <label className="block">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold text-slate-700">Wavelength (λ)</span>
                  <span className="text-xs font-mono text-slate-500">{wavelength} nm</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="700"
                  value={wavelength}
                  onChange={(e) => setWavelength(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                  style={{ accentColor: wavelengthToColor(wavelength) }}
                />
                <div className="h-2 w-full mt-2 rounded" style={{
                  background: 'linear-gradient(to right, rgb(138,43,226), rgb(0,0,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))'
                }}/>
              </label>
            </div>

            <hr className="border-slate-200" />

            <div className="space-y-4">
              <label className="block">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold text-slate-700">Slit Separation (d)</span>
                  <span className="text-xs font-mono text-slate-500">{slitSeparation} µm</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="2"
                  value={slitSeparation}
                  onChange={(e) => setSlitSeparation(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </label>
            </div>

            <hr className="border-slate-200" />

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 font-mono leading-relaxed shadow-inner">
              <strong className="block text-slate-800 font-sans mb-1">Observations:</strong>
              {mode === 'wave' ? (
                <span>Continuous expanding wavefronts overlap to create constructive & destructive interference patterns.</span>
              ) : (
                <span>Individual particles (photons/electrons) build up an interference pattern probabilistically over time.</span>
              )}
              <br/><br/>
              <em>d sin(θ) = nλ</em>
            </div>

            {mode === 'particle' && (
               <button 
                  onClick={() => {
                     screenHitsRef.current = new Array(height).fill(0);
                     maxHitsRef.current = 1;
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-sm font-medium transition-colors"
               >
                 Clear Screen
               </button>
            )}

          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3 bg-white border border-slate-300 shadow-sm rounded-lg overflow-hidden flex justify-center items-center p-4">
            <div className="relative border border-slate-200 rounded bg-[#f8fafc] shadow-inner w-full max-w-[800px] aspect-[8/5]">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-full block"
              />
              
              {/* Overlay Labels */}
              <div className="absolute top-2 left-4 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Source</div>
              <div className="absolute top-2 left-[350px] -translate-x-1/2 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Double Slit Barrier</div>
              <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Detector Screen</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}