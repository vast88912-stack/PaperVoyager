import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Constants & Physics Parameters ---
const V0 = 10; // Initial Volume
const P0 = 10; // Initial Pressure
const T0 = 100; // Base Temperature (Arbitrary units)
const GAMMA = 1.4; // Heat capacity ratio (diatomic gas)
const C_ISO = P0 * V0; // Constant for Isothermal (PV = C)
const C_ADIA = P0 * Math.pow(V0, GAMMA); // Constant for Adiabatic (PV^gamma = C)

const MIN_V = 4;
const MAX_V = 20;
const MAX_P = 30; // Max pressure for graph scaling

// --- Helper Types & Interfaces ---
type ProcessType = 'isothermal' | 'adiabatic';

interface GasState {
  p: number;
  v: number;
  t: number;
  w: number;
  q: number;
  du: number;
}

// --- Icons (Inline SVGs to avoid dependencies) ---
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const ResetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
);
const FlameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
);
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

export default function App() {
  // --- State ---
  const [volume, setVolume] = useState<number>(V0);
  const [process, setProcess] = useState<ProcessType>('isothermal');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animDirection, setAnimDirection] = useState<1 | -1>(1);

  // --- Physics Calculations ---
  const currentStats = useMemo<GasState>(() => {
    const v = volume;
    if (process === 'isothermal') {
      const p = C_ISO / v;
      const t = T0;
      // W = \int P dV = \int (C/V) dV = C * ln(V/V0)
      const w = C_ISO * Math.log(v / V0);
      return { p, v, t, w, q: w, du: 0 };
    } else {
      const p = C_ADIA / Math.pow(v, GAMMA);
      // PV = nRT -> T is proportional to PV. If V0, P0 -> T0.
      const t = (p * v / (P0 * V0)) * T0;
      // W = (P0V0 - PV) / (gamma - 1)
      const w = (P0 * V0 - p * v) / (GAMMA - 1);
      return { p, v, t, w, q: 0, du: -w };
    }
  }, [volume, process]);

  // --- Animation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isAnimating) return;
      
      const deltaTime = time - lastTime;
      lastTime = time;

      // Speed: units of volume per millisecond
      const speed = 0.005; 
      
      setVolume((prev) => {
        let nextV = prev + (speed * deltaTime * animDirection);
        let nextDir = animDirection;

        // Bounce at edges
        if (nextV >= MAX_V) {
          nextV = MAX_V;
          nextDir = -1;
          setAnimDirection(-1);
        } else if (nextV <= MIN_V) {
          nextV = MIN_V;
          nextDir = 1;
          setAnimDirection(1);
        }
        return nextV;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    if (isAnimating) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isAnimating, animDirection]);

  // --- SVG Graph Helpers ---
  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 350;
  const PADDING = 40;

  const mapX = (v: number) => PADDING + ((v - MIN_V) / (MAX_V - MIN_V)) * (SVG_WIDTH - PADDING * 2);
  const mapY = (p: number) => SVG_HEIGHT - PADDING - (Math.min(p, MAX_P) / MAX_P) * (SVG_HEIGHT - PADDING * 2);

  const generatePath = (type: ProcessType) => {
    let d = "";
    for (let v = MIN_V; v <= MAX_V; v += 0.2) {
      let p = type === 'isothermal' ? C_ISO / v : C_ADIA / Math.pow(v, GAMMA);
      const x = mapX(v);
      const y = mapY(p);
      if (v === MIN_V) d += `M ${x} ${y} `;
      else d += `L ${x} ${y} `;
    }
    return d;
  };

  // --- Visual Mapping ---
  // Returns a CSS color based on temperature (Blue=Cold, Red=Hot)
  const getPistonColor = (t: number) => {
    if (t > T0) {
      // Heating up (Adiabatic compression)
      const intensity = Math.min((t - T0) / 60, 1);
      return `rgba(255, ${150 - intensity * 100}, ${100 - intensity * 100}, 0.6)`;
    } else if (t < T0) {
      // Cooling down (Adiabatic expansion)
      const intensity = Math.min((T0 - t) / 30, 1);
      return `rgba(${150 - intensity * 100}, ${200 - intensity * 50}, 255, 0.6)`;
    }
    // Neutral (Isothermal)
    return 'rgba(250, 204, 21, 0.3)'; // yellow-400 with opacity
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950 to-orange-950 text-slate-200 font-sans p-4 md:p-8 flex items-center justify-center">
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* HEADER SECTION */}
        <div className="lg:col-span-12 mb-2">
          <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-rose-400 mb-2 tracking-tight">
            Thermo Playground
          </h1>
          <p className="text-slate-400 text-lg">
            Module 3: <span className="text-white font-medium">Isothermal vs Adiabatic Paths</span>
          </p>
        </div>

        {/* LEFT COLUMN: Controls & Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Controls Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <ActivityIcon /> System Controls
            </h2>

            {/* Process Toggle */}
            <div className="flex bg-slate-900/50 rounded-lg p-1 mb-6 border border-white/5">
              <button
                onClick={() => setProcess('isothermal')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  process === 'isothermal' 
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Isothermal (T=const)
              </button>
              <button
                onClick={() => setProcess('adiabatic')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  process === 'adiabatic' 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Adiabatic (Q=0)
              </button>
            </div>

            {/* Volume Slider */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2 text-slate-300">
                <span>Compression</span>
                <span className="font-mono text-orange-300">Volume: {volume.toFixed(1)} L</span>
                <span>Expansion</span>
              </div>
              <input 
                type="range" 
                min={MIN_V} 
                max={MAX_V} 
                step="0.1" 
                value={volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsAnimating(false);
                }}
                className="w-full accent-orange-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex gap-3">
              <button 
                onClick={() => setIsAnimating(!isAnimating)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white py-2.5 rounded-lg transition-colors"
              >
                {isAnimating ? <PauseIcon /> : <PlayIcon />}
                {isAnimating ? 'Pause' : 'Auto Animate'}
              </button>
              <button 
                onClick={() => {
                  setVolume(V0);
                  setIsAnimating(false);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white rounded-lg transition-colors"
                title="Reset to initial state"
              >
                <ResetIcon />
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background glow based on process */}
            <div className={`absolute -inset-4 opacity-20 blur-2xl transition-colors duration-1000 ${process === 'isothermal' ? 'bg-orange-500' : 'bg-purple-500'}`} />
            
            <h2 className="text-xl font-bold mb-4 relative z-10 text-white">Thermodynamic State</h2>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <StatBox label="Pressure (P)" value={currentStats.p} unit="atm" color="text-blue-400" />
              <StatBox label="Volume (V)" value={currentStats.v} unit="L" color="text-green-400" />
              <StatBox 
                label="Temperature (T)" 
                value={currentStats.t} 
                unit="K" 
                color={currentStats.t > T0 + 1 ? "text-red-400" : currentStats.t < T0 - 1 ? "text-cyan-400" : "text-yellow-400"} 
              />
              <StatBox label="Int. Energy (ΔU)" value={currentStats.du} unit="J" color="text-purple-400" />
              
              <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-white/10">
                <StatBox label="Work Done (W)" value={currentStats.w} unit="J" color="text-orange-400" />
                <StatBox label="Heat Added (Q)" value={currentStats.q} unit="J" color="text-rose-400" />
              </div>
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN: Visuals */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* PV Diagram Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col relative">
            <h3 className="text-lg font-semibold text-slate-300 mb-4 absolute top-6 left-6">P-V Diagram</h3>
            
            <div className="w-full aspect-[4/3] relative flex items-center justify-center mt-6">
              <svg width="100%" height="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="overflow-visible">
                {/* Axes */}
                <line x1={PADDING} y1={PADDING} x2={PADDING} y2={SVG_HEIGHT - PADDING} stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
                <line x1={PADDING} y1={SVG_HEIGHT - PADDING} x2={SVG_WIDTH - PADDING} y2={SVG_HEIGHT - PADDING} stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
                
                {/* Labels */}
                <text x={PADDING - 15} y={PADDING - 10} fill="#94a3b8" fontSize="14" textAnchor="middle">P</text>
                <text x={SVG_WIDTH - PADDING + 15} y={SVG_HEIGHT - PADDING + 5} fill="#94a3b8" fontSize="14" textAnchor="start">V</text>

                {/* Grid lines (subtle) */}
                {[...Array(5)].map((_, i) => (
                  <line key={`hx-${i}`} x1={PADDING} y1={mapY((i+1)*6)} x2={SVG_WIDTH - PADDING} y2={mapY((i+1)*6)} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                ))}
                {[...Array(4)].map((_, i) => (
                  <line key={`vx-${i}`} x1={mapX(MIN_V + (i+1)*4)} y1={PADDING} x2={mapX(MIN_V + (i+1)*4)} y2={SVG_HEIGHT - PADDING} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                ))}

                {/* Paths */}
                {/* Isothermal Background Path */}
                <path 
                  d={generatePath('isothermal')} 
                  fill="none" 
                  stroke="rgba(245, 158, 11, 0.3)" 
                  strokeWidth={process === 'isothermal' ? 4 : 2} 
                  strokeDasharray={process === 'isothermal' ? "none" : "4 4"}
                />
                
                {/* Adiabatic Background Path */}
                <path 
                  d={generatePath('adiabatic')} 
                  fill="none" 
                  stroke="rgba(139, 92, 246, 0.3)" 
                  strokeWidth={process === 'adiabatic' ? 4 : 2}
                  strokeDasharray={process === 'adiabatic' ? "none" : "4 4"}
                />

                {/* Active Path Trace (Highlighting from V0 to current V) */}
                {/* This requires slightly more complex SVG generation, simulating it by drawing the full path but emphasizing the active curve */}
                <path 
                  d={generatePath(process)} 
                  fill="none" 
                  stroke={process === 'isothermal' ? "#f59e0b" : "#8b5cf6"} 
                  strokeWidth="4" 
                  style={{ filter: `drop-shadow(0 0 8px ${process === 'isothermal' ? "#f59e0b" : "#8b5cf6"})` }}
                />

                {/* Initial State Point */}
                <circle cx={mapX(V0)} cy={mapY(P0)} r="5" fill="#fff"