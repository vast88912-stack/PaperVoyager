import React, { useState, useMemo } from 'react';

// --- Helper Components & Icons ---
const RocketIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const CrosshairIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h-1.5m12 0h-1.5m-6-4.5v-1.5m0 12v-1.5m0-10.5a9 9 0 110 18 9 9 0 010-18z" />
  </svg>
);

// --- Main Application Component ---
export default function App() {
  // Body State
  const [mass, setMass] = useState<number>(250);
  const [vx, setVx] = useState<number>(40);
  const [vy, setVy] = useState<number>(-30);

  // Derived Physics Metrics
  const velocityMag = Math.sqrt(vx * vx + vy * vy);
  const velocityAngle = Math.atan2(vy, vx) * (180 / Math.PI);
  const kineticEnergy = 0.5 * mass * (velocityMag * velocityMag);
  const momentum = mass * velocityMag;
  const radius = Math.sqrt(mass) * 1.5; // Visual scaling

  // Generate static starfield to prevent re-rendering layout jumps
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      flickerDelay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden flex items-center justify-center selection:bg-cyan-500/30">
      
      {/* Deep Space Background / Starfield */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.flickerDelay}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
        {/* Subtle coordinate grid */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>
      </div>

      {/* Main UI Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 h-[90vh]">
        
        {/* Header (Spans full width) */}
        <div className="col-span-1 lg:col-span-12 flex justify-between items-end border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.8)]"></span>
              Orbit Playground <span className="text-slate-500 text-lg font-mono tracking-normal mt-1">:: Vector & Mass Calibration</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">Module 2 / Configuration HUD</p>
          </div>
          <div className="hidden md:flex gap-4 font-mono text-xs text-slate-500">
            <div className="flex flex-col items-end">
              <span className="text-cyan-400">SYS_STATUS</span>
              <span>ONLINE</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-cyan-400">INTEGRATOR</span>
              <span>RK4_READY</span>
            </div>
          </div>
        </div>

        {/* Left Panel: Visualizer */}
        <div className="col-span-1 lg:col-span-8 relative bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[400px]">
          {/* Internal Grid for visualizer */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '50px 50px', backgroundPosition: 'center center' }}
          ></div>

          {/* Crosshair Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="w-full h-[1px] bg-cyan-500/50"></div>
            <div className="h-full w-[1px] bg-cyan-500/50 absolute"></div>
            <div className="w-12 h-12 rounded-full border border-cyan-500/50 absolute"></div>
          </div>

          <svg className="w-full h-full overflow-visible drop-shadow-2xl">
            <defs>
              {/* Glow filter for body */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Arrow Marker for velocity vector */}
              <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#06b6d4" />
              </marker>
            </defs>

            {/* Viewport Center is 50%, 50% */}
            <g transform="translate(50%, 50%) scale(1)">
              {/* Velocity Vector Line */}
              <line 
                x1="0" 
                y1="0" 
                x2={`${vx * 2.5}`} 
                y2={`${vy * 2.5}`} 
                stroke="#06b6d4" 
                strokeWidth="3" 
                strokeLinecap="round"
                markerEnd="url(#arrowHead)"
                className="transition-all duration-75 ease-out"
              />
              
              {/* Trajectory Prediction Curve (Stylized dash) */}
              <path 
                d={`M 0 0 Q ${vx * 3} ${vy * 3} ${vx * 5} ${(vy * 5) + (mass * 0.2)}`} 
                fill="none" 
                stroke="#06b6d4" 
                strokeWidth="1.5" 
                strokeDasharray="4 6" 
                className="opacity-40"
              />

              {/* Central Celestial Body */}
              <circle 
                cx="0" 
                cy="0" 
                r={radius} 
                fill="url(#bodyGradient)" 
                filter="url(#glow)"
                className="transition-all duration-200 ease-out"
              />
              <radialGradient id="bodyGradient" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </radialGradient>
            </g>
          </svg>

          {/* Real-time Overlay HUD */}
          <div className="absolute top-4 left-4 font-mono text-xs text-cyan-400 bg-slate-950/60 p-3 rounded border border-cyan-900/50 backdrop-blur-sm">
            <div><span className="text-slate-500">POS:</span> [ 0.00, 0.00 ]</div>
            <div><span className="text-slate-500">VEL:</span> [ {vx.toFixed(2)}, {vy.toFixed(2)} ]</div>
            <div><span className="text-slate-500">MASS:</span> {mass.toFixed(2)} M⊕</div>
          </div>
          <div className="absolute bottom-4 right-4 font-mono text-xs text-emerald-400 bg-slate-950/60 p-3 rounded border border-emerald-900/50 backdrop-blur-sm text-right">
            <div><span className="text-slate-500">KE:</span> {(kineticEnergy / 1000).toFixed(2)} kJ</div>
            <div><span className="text-slate-500">p:</span> {(momentum).toFixed(2)} kg·m/s</div>
            <div><span className="text-slate-500">|v|:</span> {velocityMag.toFixed(2)} m/s</div>
          </div>
        </div>

        {/* Right Panel: Controls */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl flex-1">
            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <CrosshairIcon className="w-5 h-5 text-cyan-500" />
              Telemetry Controls
            </h2>

            {/* Mass Slider */}
            <div className="mb-8 group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">Mass (M)</label>
                <span className="font-mono text-sm text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">
                  {mass}
                </span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10"
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                <span>10</span>
                <span>Log Scale</span>
                <span>1000</span>
              </div>
            </div>

            {/* Velocity X Slider */}
            <div className="mb-8 group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">Velocity X (v_x)</label>
                <span className="font-mono text-sm text-fuchsia-400 bg-fuchsia-950/50 px-2 py-0.5 rounded">
                  {vx > 0 ? `+${vx}` : vx}
                </span>
              </div>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={vx}
                onChange={(e) => setVx(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                <span>-100</span>
                <span>0</span>
                <span>+100</span>
              </div>
            </div>

            {/* Velocity Y Slider */}
            <div className="mb-8 group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">Velocity Y (v_y)</label>
                <span className="font-mono text-sm text-fuchsia-400 bg-fuchsia-950/50 px-2 py-0.5 rounded">
                  {vy > 0 ? `+${vy}` : vy}
                </span>
              </div>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={vy}
                onChange={(e) => setVy(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                <span>-100</span>
                <span>0</span>
                <span>+100</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 block">Vector Presets</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setVx(0); setVy(0); }}
                  className="px-3 py-2 text-xs font-mono text-slate-300 bg-slate-800/50 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                >
                  [ 0, 0 ] Static
                </button>
                <button 
                  onClick={() => { setVx(75); setVy(0); }}
                  className="px-3 py-2 text-xs font-mono text-slate-300 bg-slate-800/50 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                >
                  Prograde
                </button>
                <button 
                  onClick={() => { setVx(-50); setVy(50); }}
                  className="px-3 py-2 text-xs font-mono text-slate-300 bg-slate-800/50 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                >
                  Retrograde
                </button>
                <button 
                  onClick={() => { setVx(0); setVy(-80); }}
                  className="px-3 py-2 text-xs font-mono text-slate-300 bg-slate-800/50 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                >
                  Escape Vel
                </button>
              </div>
            </div>

          </div>

          {/* Action Button */}
          <button className="w-full group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95">
            <div className="absolute inset-0 w-full h-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
            Inject Body to Simulation
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}