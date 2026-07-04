import React, { useState, useMemo, useEffect } from 'react';

// Runtime Dependencies: react (standard)
// Tailwind CSS is assumed to be available in the environment.

interface CelestialBody {
  id: string;
  name: string;
  mass: number;
  vx: number;
  vy: number;
  color: string;
}

export default function App() {
  const [body, setBody] = useState<CelestialBody>({
    id: 'body-1',
    name: 'Alpha Centauri Mock',
    mass: 500,
    vx: 25,
    vy: -15,
    color: '#8b5cf6', // Violet-500
  });

  // Derived physics calculations
  const velocityMagnitude = useMemo(() => {
    return Math.sqrt(body.vx ** 2 + body.vy ** 2);
  }, [body.vx, body.vy]);

  const kineticEnergy = useMemo(() => {
    return 0.5 * body.mass * (velocityMagnitude ** 2);
  }, [body.mass, velocityMagnitude]);

  const momentum = useMemo(() => {
    return body.mass * velocityMagnitude;
  }, [body.mass, velocityMagnitude]);

  // Visual scaling
  // Mass determines radius (volume scales with mass -> r scales with mass^(1/3))
  const displayRadius = useMemo(() => {
    return Math.max(8, Math.pow(body.mass, 1 / 3) * 3.5);
  }, [body.mass]);

  // Starfield background generation
  const [stars, setStars] = useState<{ x: number; y: number; size: number; opacity: number }[]>([]);
  useEffect(() => {
    const generatedStars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.1,
    }));
    setStars(generatedStars);
  }, []);

  const handleSliderChange = (field: keyof CelestialBody, value: number) => {
    setBody((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden flex items-center justify-center p-4 lg:p-8">
      {/* Starfield Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-100 tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Vector Telemetry
              </h2>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                SCALE: 1px = 1km/s
              </span>
            </div>

            <div className="relative flex-grow min-h-[400px] bg-slate-950/50 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
              {/* Grid Lines */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                  backgroundPosition: 'center center'
                }}
              />
              
              {/* Axis Labels */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-mono">+Y</div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-mono">-Y</div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">+X</div>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">-X</div>

              <svg className="absolute inset-0 w-full h-full overflow-visible">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill={body.color} />
                  </marker>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <g transform="translate(50%, 50%)" style={{ transformOrigin: 'center', transform: 'translate(calc(50%), calc(50%))' }}>
                  {/* Origin Crosshair */}
                  <line x1="-10" y1="0" x2="10" y2="0" stroke="#475569" strokeWidth="1" />
                  <line x1="0" y1="-10" x2="0" y2="10" stroke="#475569" strokeWidth="1" />

                  {/* Velocity Vector (Note: SVG Y is inverted relative to standard Cartesian, so we negate vy) */}
                  {(body.vx !== 0 || body.vy !== 0) && (
                    <line
                      x1="0"
                      y1="0"
                      x2={body.vx * 2}
                      y2={-body.vy * 2}
                      stroke={body.color}
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                      className="transition-all duration-100 ease-out"
                    />
                  )}

                  {/* Celestial Body */}
                  <circle
                    cx="0"
                    cy="0"
                    r={displayRadius}
                    fill={body.color}
                    filter="url(#glow)"
                    className="transition-all duration-300 ease-out"
                  />
                  {/* Body Core */}
                  <circle
                    cx="0"
                    cy="0"
                    r={displayRadius * 0.4}
                    fill="#ffffff"
                    opacity="0.8"
                    className="transition-all duration-300 ease-out"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Control Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-8">
            
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-1">
                Body Parameters
              </h1>
              <p className="text-sm text-slate-400">Adjust mass and velocity vectors for N-body initialization.</p>
            </div>

            {/* Mass Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Mass (m)</label>
                <div className="text-right">
                  <span className="text-xl font-mono text-indigo-400">{body.mass.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 ml-1">10²⁴ kg</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="2000"
                step="1"
                value={body.mass}
                onChange={(e) => handleSliderChange('mass', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1</span>
                <span>2000</span>
              </div>
            </div>

            {/* Velocity X Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Velocity X (v<sub className="lowercase">x</sub>)</label>
                <div className="text-right">
                  <span className="text-xl font-mono text-cyan-400">{body.vx > 0 ? '+' : ''}{body.vx.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 ml-1">km/s</span>
                </div>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="0.5"
                value={body.vx}
                onChange={(e) => handleSliderChange('vx', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-100</span>
                <span>0</span>
                <span>+100</span>
              </div>
            </div>

            {/* Velocity Y Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-slate-300 uppercase tracking-wider">Velocity Y (v<sub className="lowercase">y</sub>)</label>
                <div className="text-right">
                  <span className="text-xl font-mono text-emerald-400">{body.vy > 0 ? '+' : ''}{body.vy.toFixed(1)}</span>
                  <span className="text-xs text-slate-500 ml-1">km/s</span>
                </div>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="0.5"
                value={body.vy}
                onChange={(e) => handleSliderChange('vy', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-100</span>
                <span>0</span>
                <span>+100</span>
              </div>
            </div>

            {/* Physics Diagnostics Panel */}
            <div className="mt-4 pt-6 border-t border-slate-800/80">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Live Diagnostics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <div className="text-[10px] text-slate-400 mb-1 uppercase">Net Velocity (|v|)</div>
                  <div className="font-mono text-sm text-slate-200">{velocityMagnitude.toFixed(2)} <span className="text-slate-500 text-xs">km/s</span></div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <div className="text-[10px] text-slate-400 mb-1 uppercase">Momentum (p)</div>
                  <div className="font-mono text-sm text-slate-200">{(momentum / 1000).toFixed(2)}k <span className="text-slate-500 text-xs">units</span></div>
                </div>
                <div className="col-span-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <div className="text-[10px] text-slate-400 mb-1 uppercase">Kinetic Energy (E<sub className="lowercase">k</sub>)</div>
                  <div className="font-mono text-sm text-slate-200">{(kineticEnergy / 10000).toFixed(2)}e4 <span className="text-slate-500 text-xs">Joules (scaled)</span></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}