import React, { useState, useMemo, useEffect } from 'react';

// --- Types ---
type Vector2 = { x: number; y: number };

// --- Constants ---
const R = 0.08206; // Ideal gas constant in L·atm/(mol·K)
const V_MAX = 60;  // Liters
const P_MAX = 50;  // Atmospheres
const GRAPH_W = 600;
const GRAPH_H = 400;
const PAD_X = 60;
const PAD_Y = 50;

// --- Helper Components ---
const RangeSlider = ({ 
  label, value, min, max, step, unit, onChange, colorClass 
}: { 
  label: string, value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void, colorClass: string 
}) => (
  <div className="mb-6">
    <div className="flex justify-between items-end mb-2">
      <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{label}</label>
      <span className={`text-xl font-bold ${colorClass}`}>
        {value.toFixed(1)} <span className="text-sm font-medium text-slate-500">{unit}</span>
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${colorClass.replace('text-', 'bg-').replace('600', '200')}`}
      style={{
        background: `linear-gradient(to right, currentColor ${(value - min) / (max - min) * 100}%, transparent ${(value - min) / (max - min) * 100}%)`
      }}
    />
  </div>
);

const MetricCard = ({ label, value, unit, icon, highlight }: { label: string, value: string, unit: string, icon: React.ReactNode, highlight?: boolean }) => (
  <div className={`p-4 rounded-2xl flex items-center space-x-4 border ${highlight ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/60 border-white/50 shadow-sm'}`}>
    <div className={`p-3 rounded-xl ${highlight ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline space-x-1">
        <span className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-slate-800'}`}>{value}</span>
        <span className="text-sm font-medium text-slate-500">{unit}</span>
      </div>
    </div>
  </div>
);

// --- Main Application ---
export default function App() {
  // State variables
  const [moles, setMoles] = useState<number>(1.0);
  const [temperature, setTemperature] = useState<number>(300);
  const [volume, setVolume] = useState<number>(22.4);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Derived state
  const pressure = useMemo(() => (moles * R * temperature) / volume, [moles, temperature, volume]);

  // SVG Mapping functions
  const mapX = (v: number) => PAD_X + (v / V_MAX) * (GRAPH_W - PAD_X * 2);
  const mapY = (p: number) => GRAPH_H - PAD_Y - (p / P_MAX) * (GRAPH_H - PAD_Y * 2);

  // Generate main curve path (Isotherm)
  const curvePath = useMemo(() => {
    let path = '';
    const startV = Math.max(0.5, (moles * R * temperature) / P_MAX); // Avoid going off top
    
    for (let v = startV; v <= V_MAX; v += 0.5) {
      const p = (moles * R * temperature) / v;
      const x = mapX(v);
      const y = mapY(p);
      if (path === '') path = `M ${x} ${y}`;
      else path += ` L ${x} ${y}`;
    }
    return path;
  }, [moles, temperature]);

  // Generate background isotherms (constant n, different T)
  const bgIsotherms = useMemo(() => {
    const paths = [];
    const temps = [100, 500, 900];
    for (const t of temps) {
      let path = '';
      const startV = Math.max(0.5, (moles * R * t) / P_MAX);
      for (let v = startV; v <= V_MAX; v += 1) {
        const p = (moles * R * t) / v;
        const x = mapX(v);
        const y = mapY(p);
        if (path === '') path = `M ${x} ${y}`;
        else path += ` L ${x} ${y}`;
      }
      paths.push(path);
    }
    return paths;
  }, [moles]);

  // Current state point
  const currentPoint = { x: mapX(volume), y: mapY(pressure) };

  // Optional: Auto-animate temperature to show shifting curve
  useEffect(() => {
    if (!isAnimating) return;
    let t = temperature;
    let dir = 1;
    const interval = setInterval(() => {
      t += dir * 2;
      if (t >= 800) dir = -1;
      if (t <= 200) dir = 1;
      setTemperature(t);
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating, temperature]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-rose-100 p-4 md:p-8 flex items-center justify-center font-sans text-slate-800 selection:bg-orange-200">
      
      <div className="max-w-6xl w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white flex flex-col xl:flex-row">
        
        {/* Left Side: Graph Area */}
        <div className="flex-1 p-8 xl:p-12 relative flex flex-col">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600 mb-2">
                Ideal Gas Law Explorer
              </h1>
              <p className="text-slate-500 font-medium">Visualize the relationship between P, V, n, and T.</p>
            </div>
            <button 
              onClick={() => setIsAnimating(!isAnimating)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${isAnimating ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isAnimating ? 'Stop Animation' : 'Auto-Animate T'}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="relative w-full max-w-[600px] aspect-[3/2] bg-slate-50/50 rounded-3xl border border-slate-200 shadow-inner overflow-hidden">
              <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} className="w-full h-full drop-shadow-sm">
                
                {/* Grid Lines */}
                {[10, 20, 30, 40, 50].map(v => (
                  <line key={`g-v-${v}`} x1={mapX(v)} y1={PAD_Y} x2={mapX(v)} y2={GRAPH_H - PAD_Y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                ))}
                {[10, 20, 30, 40].map(p => (
                  <line key={`g-p-${p}`} x1={PAD_X} y1={mapY(p)} x2={GRAPH_W - PAD_X} y2={mapY(p)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                ))}

                {/* Axes */}
                <line x1={PAD_X} y1={GRAPH_H - PAD_Y} x2={GRAPH_W - PAD_X + 20} y2={GRAPH_H - PAD_Y} stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                <line x1={PAD_X} y1={GRAPH_H - PAD_Y} x2={PAD_X} y2={PAD_Y - 20} stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                
                {/* Axes Labels */}
                <text x={GRAPH_W / 2} y={GRAPH_H - 10} textAnchor="middle" fill="#64748b" className="text-sm font-semibold tracking-widest uppercase">Volume (Liters)</text>
                <text x={20} y={GRAPH_H / 2} textAnchor="middle" fill="#64748b" className="text-sm font-semibold tracking-widest uppercase" transform={`rotate(-90 20 ${GRAPH_H / 2})`}>Pressure (atm)</text>

                {/* Axis Ticks */}
                {[0, 20, 40, 60].map(v => (
                  <text key={`tx-${v}`} x={mapX(v)} y={GRAPH_H - PAD_Y + 20} textAnchor="middle" fill="#94a3b8" fontSize="12">{v}</text>
                ))}
                {[0, 25, 50].map(p => (
                  <text key={`ty-${p}`} x={PAD_X - 10} y={mapY(p) + 4} textAnchor="end" fill="#94a3b8" fontSize="12">{p}</text>
                ))}

                {/* Background Isotherms */}
                {bgIsotherms.map((path, i) => (
                  <path key={`bg-${i}`} d={path} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="8 8" />
                ))}

                {/* Shaded Area (Work done conceptually if expanding from 0, but here just styling) */}
                <path 
                  d={`${curvePath} L ${mapX(V_MAX)} ${GRAPH_H - PAD_Y} L ${mapX(Math.max(0.5, (moles * R * temperature) / P_MAX))} ${GRAPH_H - PAD_Y} Z`} 
                  fill="url(#curveGradient)" 
                  opacity="0.2" 
                />

                {/* Main Curve */}
                <path d={curvePath} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />

                {/* Current State Point */}
                <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
                  {/* Dashed lines to axes */}
                  <line x1={0} y1={0} x2={-currentPoint.x + PAD_X} y2={0} stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" opacity="0.6"/>
                  <line x1={0} y1={0} x2={0} y2={GRAPH_H - PAD_Y - currentPoint.y} stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" opacity="0.6"/>
                  
                  {/* Point */}
                  <circle cx={0} cy={0} r={8} fill="#fff" stroke="#ea580c" strokeWidth="3" className="drop-shadow-lg" />
                  <circle cx={0} cy={0} r={16} fill="#f97316" opacity="0.2" className="animate-ping" style={{ animationDuration: '3s' }}/>
                </g>

                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>
                </defs>

              </svg>
            </div>
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full xl:w-96 bg-gradient-to-b from-orange-50 to-rose-50 border-l border-white/60 p-8 xl:p-12 flex flex-col justify-between shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
          
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              State Controls
            </h2>

            <div className="space-y-2">
              <RangeSlider 
                label="Volume (V)" value={volume} min={5} max={60} step={0.5} unit="L" 
                onChange={setVolume} colorClass="text-blue-600"
              />
              <RangeSlider 
                label="Temperature (T)" value={temperature} min={100} max={1000} step={10} unit="K" 
                onChange={setTemperature} colorClass="text-rose-600"
              />
              <RangeSlider 
                label="Amount (n)" value={moles} min={0.5} max={5.0} step={0.1} unit="mol" 
                onChange={setMoles} colorClass="text-emerald-600"
              />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-orange-200/50">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Live Readings</h2>
            <div className="space-y-3">
              <MetricCard 
                label="Pressure (P)" 
                value={pressure.toFixed(2)} 
                unit="atm" 
                highlight={true}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  label="Vol" 
                  value={volume.toFixed(1)} 
                  unit="L" 
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                />
                <MetricCard 
                  label="Temp" 
                  value={temperature.toString()} 
                  unit="K" 
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                />
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white/50 rounded-xl border border-white text-center">
              <p className="text-sm font-mono text-slate-600">
                P = <span className="text-orange-600 font-bold">{(moles * R * temperature).toFixed(1)}</span> / V
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}