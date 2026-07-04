import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Types ---
interface BodyData {
  id: string;
  name: string;
  mass: number;
  vx: number;
  vy: number;
  color: string;
}

// --- Icons (Inline SVGs to avoid dependencies) ---
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const IconMinus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

const IconCrosshair = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    <circle cx="12" cy="12" r="8" opacity="0.4" />
  </svg>
);

// --- Components ---

// High-quality custom slider specifically designed for physics values
const PhysicsSlider = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  centerMark = false,
  colorHex = '#3b82f6'
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
  centerMark?: boolean;
  colorHex?: string;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Handlers for fine-tuning
  const handleDecrement = () => onChange(Math.max(min, Number((value - step).toFixed(4))));
  const handleIncrement = () => onChange(Math.min(max, Number((value + step).toFixed(4))));

  return (
    <div className="flex flex-col gap-2 w-full select-none group">
      <div className="flex justify-between items-end">
        <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(Math.max(min, Math.min(max, val)));
            }}
            className="w-16 bg-slate-900 border border-slate-700 text-slate-100 text-right text-sm rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 font-mono"
          />
          <span className="text-xs text-slate-500 font-mono w-6">{unit}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={handleDecrement}
          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
        >
          <IconMinus />
        </button>

        <div className="relative flex-1 h-6 flex items-center group-hover:cursor-ew-resize">
          {/* Track Background */}
          <div className="absolute w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            {/* Active Fill */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-opacity-80 transition-all duration-75"
              style={{ 
                width: `${percentage}%`, 
                backgroundColor: colorHex,
                boxShadow: `0 0 8px ${colorHex}`
              }}
            />
          </div>

          {/* Center Zero Mark (for velocity) */}
          {centerMark && (
            <div className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-slate-500 -translate-x-1/2 -translate-y-1/2 z-0" />
          )}

          {/* Native Range Input (Overlay) */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-ew-resize z-10"
          />

          {/* Custom Thumb */}
          <div 
            className="absolute w-3 h-4 bg-white rounded-sm shadow-md pointer-events-none transition-all duration-75 z-0 border border-slate-300"
            style={{ 
              left: `calc(${percentage}% - 6px)`,
              boxShadow: `0 0 10px ${colorHex}`
            }}
          />
        </div>

        <button 
          onClick={handleIncrement}
          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
        >
          <IconPlus />
        </button>
      </div>
    </div>
  );
};

const Starfield = () => {
  // Generate stable random stars
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.1
    }));
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-950 overflow-hidden z-0 pointer-events-none">
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
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [bodies, setBodies] = useState<BodyData[]>([
    { id: '1', name: 'Alpha Centauri', mass: 120, vx: 15, vy: -5, color: '#fca5a5' },
    { id: '2', name: 'Proxima', mass: 12, vx: -25, vy: 40, color: '#93c5fd' },
    { id: '3', name: 'Rogue Planet', mass: 45, vx: 0, vy: 0, color: '#d8b4fe' },
  ]);

  const [activeId, setActiveId] = useState<string>(bodies[0].id);

  const activeBody = bodies.find((b) => b.id === activeId) || bodies[0];

  const updateActiveBody = (field: keyof BodyData, value: number | string) => {
    setBodies((prev) =>
      prev.map((b) => (b.id === activeId ? { ...b, [field]: value } : b))
    );
  };

  const handleResetVelocity = () => {
    updateActiveBody('vx', 0);
    updateActiveBody('vy', 0);
  };

  // Derived Physics calculations for the UI
  const velocityMagnitude = Math.sqrt(activeBody.vx ** 2 + activeBody.vy ** 2);
  const kineticEnergy = 0.5 * activeBody.mass * (velocityMagnitude ** 2);
  const momentumX = activeBody.mass * activeBody.vx;
  const momentumY = activeBody.mass * activeBody.vy;
  const momentumMagnitude = Math.sqrt(momentumX ** 2 + momentumY ** 2);

  return (
    <div className="min-h-screen flex text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      <Starfield />

      {/* LEFT: Velocity & Mass Visualizer (Context Area) */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-8 z-10">
        <h1 className="absolute top-8 left-8 text-2xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-lg">
          <span className="text-blue-500">Orbit</span>Playground
        </h1>

        <div className="relative w-[400px] h-[400px] border border-slate-700/50 bg-slate-900/40 rounded-full flex items-center justify-center shadow-2xl shadow-black/50 backdrop-blur-sm">
          {/* Axis guides */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-full h-[1px] bg-slate-400" />
            <div className="h-full w-[1px] bg-slate-400 absolute" />
          </div>

          {/* Body Visualization */}
          <div className="relative flex items-center justify-center">
            {/* The Mass (circle size) */}
            <div 
              className="rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out z-20 flex items-center justify-center"
              style={{
                width: `${Math.max(10, Math.sqrt(activeBody.mass) * 8)}px`,
                height: `${Math.max(10, Math.sqrt(activeBody.mass) * 8)}px`,
                backgroundColor: activeBody.color,
                boxShadow: `0 0 40px ${activeBody.color}66`
              }}
            >
               {activeBody.mass > 50 && <div className="w-1/2 h-1/2 bg-black/20 rounded-full" />}
            </div>

            {/* Velocity Vector Arrow */}
            {velocityMagnitude > 0 && (
              <svg 
                className="absolute overflow-visible pointer-events-none z-10" 
                style={{ width: 0, height: 0 }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill={activeBody.color} opacity="0.8" />
                  </marker>
                </defs>
                <line 
                  x1="0" 
                  y1="0" 
                  x2={activeBody.vx * 2} // Scale factor for visualization
                  y2={-activeBody.vy * 2} // Invert Y for standard Cartesian visual
                  stroke={activeBody.color} 
                  strokeWidth="3" 
                  strokeDasharray="4 2"
                  opacity="0.8"
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-100 ease-linear"
                />
              </svg>
            )}
          </div>
        </div>
        
        <div className="mt-8 text-center backdrop-blur-md bg-slate-900/60 border border-slate-700 p-4 rounded-xl shadow-xl">
          <p className="text-slate-400 text-sm font-mono mb-1">Live Telemetry Visualization</p>
          <div className="flex gap-6 justify-center">
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase">Mass Scale</p>
              <p className="text-lg font-mono text-white">{(Math.sqrt(activeBody.mass) * 8).toFixed(1)}px</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase">Vector Length</p>
              <p className="text-lg font-mono text-white">{(velocityMagnitude * 2).toFixed(1)}px</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Mass/Velocity Control Panel (Focus Area) */}
      <div className="w-[420px] bg-slate-900/80 backdrop-blur-xl border-l border-slate-700/80 p-6 flex flex-col shadow-2xl z-20 overflow-y-auto">
        
        {/* Entity Selector */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Target Entity</h2>
          <div className="flex gap-2">
            {bodies.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveId(b.id)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  activeId === b.id 
                    ? 'bg-slate-700 text-white shadow-inner border-t border-slate-600' 
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
                style={activeId === b.id ? { borderBottom: `3px solid ${b.color}` } : {}}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Container */}
        <div className="flex-1 space-y-10">
          
          {/* --- MASS SLIDER MODULE --- */}
          <section className="bg-slate-950/50 p-5 rounded-xl border border-slate-800/80 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <h3 className="text-lg font-semibold text-white">Mass Controls</h3>
            </div>
            
            <PhysicsSlider
              label="Stellar Mass"
              value={activeBody.mass}
              min={1}
              max={500}
              step={1}
              unit="M⊕"
              colorHex={activeBody.color}
              onChange={(v) => updateActiveBody('mass', v)}
            />
            
            <div className="mt-4 flex justify-between items-center text-xs text-slate-500 font-mono">
              <span>Gravity Well Depth:</span>
              <span className="text-emerald-400">{(activeBody.mass * 9.81).toFixed(0)} μGal</span>
            </div>
          </section>

          {/* --- VELOCITY SLIDERS MODULE --- */}
          <section className="bg-slate-950/50 p-5 rounded-xl border border-slate-800/80 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                <h3 className="text-lg font-semibold text-white">Initial Velocity</h3>
              </div>
              <button 
                onClick={handleResetVelocity}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded transition-colors"
                title="Halt Object"
              >
                <IconCrosshair />
                Halt
              </button>
            </div>
            
            <div className="space-y-6">
              <PhysicsSlider
                label="Velocity (X-Axis)"
                value={activeBody.vx}
                min={-100}
                max={100}
                step={0.5}
                unit="km/s"
                centerMark={true}
                colorHex="#60a5fa"
                onChange={(v) => updateActiveBody('vx', v)}
              />

              <PhysicsSlider
                label="Velocity (Y-Axis)"
                value={activeBody.vy}
                min={-100}
                max={100}
                step={0.5}
                unit="km/s"
                centerMark={true}
                colorHex="#a78bfa"
                onChange={(v) => updateActiveBody('vy', v)}
              />
            </div>
          </section>

          {/* --- LIVE PHYSICS READOUT --- */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
              State Vectors (Derived)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-lg flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Velocity Magnitude</span>
                <span className="text-xl font-mono text-blue-200">
                  {velocityMagnitude.toFixed(2)} <span className="text-xs text-slate-500">km/s</span>
                </span>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-lg flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Kinetic Energy</span>
                <span className="text-xl font-mono text-orange-200">
                  {kineticEnergy > 10000 ? (kineticEnergy/1000).toFixed(1) + 'k' : kineticEnergy.toFixed(0)} <span className="text-xs text-slate-500">TJ</span>
                </span>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-lg flex flex-col col-span-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total Momentum (P)</span>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-mono text-purple-200">
                    {momentumMagnitude.toFixed(0)} <span className="text-xs text-slate-500">kg·km/s</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    [{momentumX.toFixed(0)}, {momentumY.toFixed(0)}]
                  </span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Action Bar */}
        <div className="mt-8 pt-4 border-t border-slate-800">
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all active:scale-95">
            <IconRefresh />
            Apply Initial Conditions
          </button>
        </div>
      </div>
    </div>
  );
}