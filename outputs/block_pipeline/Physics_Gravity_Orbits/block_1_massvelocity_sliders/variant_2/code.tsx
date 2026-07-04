import React, { useState, useEffect, useMemo } from 'react';

// --- Helper Components & Hooks ---

const Starfield = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map(() => ({
      id: Math.random().toString(36).substring(2, 9),
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random(),
      blinkSpeed: Math.random() * 3 + 1,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animation: `twinkle ${star.blinkSpeed}s infinite alternate`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(2,6,23,1)_100%)]" />
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 4px rgba(255,255,255,0.8); }
        }
        
        /* Custom Range Slider Styling */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          margin-top: -8px;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
          border: 2px solid #fff;
          transition: transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #334155;
          border-radius: 2px;
        }
        input[type=range]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 15px rgba(6, 182, 212, 1);
        }
      `}</style>
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  // State for the edited celestial body
  const [mass, setMass] = useState<number>(50);
  const [vx, setVx] = useState<number>(15);
  const [vy, setVy] = useState<number>(-20);
  const [color, setColor] = useState<string>('#06b6d4');
  
  // Derived telemetry
  const speed = Math.sqrt(vx * vx + vy * vy).toFixed(2);
  const angle = ((Math.atan2(vy, vx) * 180) / Math.PI).toFixed(1);
  const momentum = (mass * parseFloat(speed)).toFixed(0);
  const kineticEnergy = (0.5 * mass * (vx * vx + vy * vy)).toFixed(0);

  // Visual scaling
  const visualRadius = Math.max(8, Math.sqrt(mass) * 3);
  const centerX = 150;
  const centerY = 150;
  
  // Vector arrow endpoints
  const arrowScale = 2;
  const endX = centerX + vx * arrowScale;
  const endY = centerY + vy * arrowScale;

  const colors = [
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#10b981', // Emerald
  ];

  return (
    <div className="min-h-screen text-slate-200 font-sans flex items-center justify-center p-4 relative selection:bg-cyan-900 selection:text-cyan-50">
      <Starfield />

      <main className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Visualizer */}
        <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-cyan-900/20 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
            <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Vector Visualizer</h2>
            <div className="flex gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono">Live</span>
            </div>
          </div>

          <div className="relative w-[300px] h-[300px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            {/* Grid Background */}
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-20">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* Axes */}
              <line x1="150" y1="0" x2="150" y2="300" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="300" y2="150" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
            </svg>

            {/* Entity & Vector */}
            <svg width="300" height="300" className="absolute inset-0 overflow-visible">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Velocity Vector Arrow */}
              {(vx !== 0 || vy !== 0) && (
                <line 
                  x1={centerX} 
                  y1={centerY} 
                  x2={endX} 
                  y2={endY} 
                  stroke={color} 
                  strokeWidth="2" 
                  markerEnd="url(#arrowhead)"
                  opacity="0.8"
                />
              )}
              
              {/* Planet/Body */}
              <circle 
                cx={centerX} 
                cy={centerY} 
                r={visualRadius} 
                fill={color} 
                filter="url(#glow)"
                className="transition-all duration-300 ease-out"
              />
              
              {/* Orbit Trail Simulation (Decorative) */}
              <path 
                d={`M ${centerX} ${centerY} Q ${centerX - vx * 4} ${centerY - vy * 2} ${centerX - vx * 6} ${centerY - vy * 6}`} 
                fill="none" 
                stroke={color} 
                strokeWidth="1" 
                strokeDasharray="2 4" 
                opacity="0.3"
              />
            </svg>
          </div>

          {/* Telemetry Readout */}
          <div className="w-full mt-6 grid grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 mb-1">SPEED (|v|)</div>
              <div className="text-cyan-400 text-lg">{speed} <span className="text-[10px] text-slate-500">m/s</span></div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 mb-1">HEADING (θ)</div>
              <div className="text-cyan-400 text-lg">{angle}°</div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 mb-1">MOMENTUM (p)</div>
              <div className="text-emerald-400 text-lg">{momentum} <span className="text-[10px] text-slate-500">kg·m/s</span></div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-500 mb-1">KINETIC (Ek)</div>
              <div className="text-emerald-400 text-lg">{kineticEnergy} <span className="text-[10px] text-slate-500">J</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-cyan-900/20">
          <div className="mb-8">
            <h1 className="text-2xl font-light tracking-tight text-white flex items-center gap-3">
              <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
              Orbital Mechanics <span className="font-bold text-cyan-400">Editor</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">Adjust physical properties to simulate N-body interactions.</p>
          </div>

          <div className="space-y-8">
            
            {/* Mass Slider */}
            <div className="group">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  Mass (m)
                </label>
                <div className="bg-slate-950 border border-slate-700 rounded px-3 py-1 font-mono text-cyan-300 w-20 text-right">
                  {mass}
                </div>
              </div>
              <input 
                type="range" 
                min="1" 
                max="200" 
                value={mass} 
                onChange={(e) => setMass(Number(e.target.value))}
                className="w-full appearance-none bg-transparent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>1 kg</span>
                <span>200 kg</span>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* Velocity X Slider */}
            <div className="group">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Velocity X (vₓ)
                </label>
                <div className="bg-slate-950 border border-slate-700 rounded px-3 py-1 font-mono text-cyan-300 w-20 text-right">
                  {vx}
                </div>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={vx} 
                onChange={(e) => setVx(Number(e.target.value))}
                className="w-full appearance-none bg-transparent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>-50 m/s</span>
                <span>0 m/s</span>
                <span>+50 m/s</span>
              </div>
            </div>

            {/* Velocity Y Slider */}
            <div className="group">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: 'rotate(-90deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Velocity Y (vₗ)
                </label>
                <div className="bg-slate-950 border border-slate-700 rounded px-3 py-1 font-mono text-cyan-300 w-20 text-right">
                  {vy}
                </div>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={vy} 
                onChange={(e) => setVy(Number(e.target.value))}
                className="w-full appearance-none bg-transparent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>-50 m/s</span>
                <span>0 m/s</span>
                <span>+50 m/s</span>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* Color Selector */}
            <div>
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 block">
                Entity Signature (Color)
              </label>
              <div className="flex gap-3">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${color === c ? 'scale-125 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 15px ${c}` : 'none' }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex gap-4">
              <button 
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-cyan-900/50 flex justify-center items-center gap-2"
                onClick={() => alert("Body properties updated in engine.")}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply Changes
              </button>
              <button 
                className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors border border-slate-700"
                onClick={() => { setMass(50); setVx(0); setVy(0); setColor('#06b6d4'); }}
              >
                Reset
              </button>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}