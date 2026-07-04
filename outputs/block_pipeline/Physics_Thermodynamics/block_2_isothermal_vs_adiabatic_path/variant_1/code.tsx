import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Flame, Snowflake, Shield, Info, Activity } from 'lucide-react';

// --- Physics Constants ---
const GAMMA = 1.4; // Diatomic ideal gas
const P_INITIAL = 1000; // kPa
const V_INITIAL = 1; // L
const T_INITIAL = 300; // K
const V_MAX = 5; // L
const V_MIN = 1; // L
const nR = (P_INITIAL * V_INITIAL) / T_INITIAL;

export default function App() {
  const [process, setProcess] = useState<'isothermal' | 'adiabatic'>('isothermal');
  const [volume, setVolume] = useState<number>(V_INITIAL);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [direction, setDirection] = useState<'expand' | 'compress'>('expand');

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // --- Physics Calculations ---
  const currentP = useMemo(() => {
    if (process === 'isothermal') {
      return (P_INITIAL * V_INITIAL) / volume;
    } else {
      return P_INITIAL * Math.pow(V_INITIAL / volume, GAMMA);
    }
  }, [process, volume]);

  const currentT = (currentP * volume) / nR;

  const workDone = useMemo(() => {
    if (process === 'isothermal') {
      return P_INITIAL * V_INITIAL * Math.log(volume / V_INITIAL);
    } else {
      return (P_INITIAL * V_INITIAL - currentP * volume) / (GAMMA - 1);
    }
  }, [process, volume, currentP]);

  const heatAdded = process === 'isothermal' ? workDone : 0;
  const internalEnergy = process === 'isothermal' ? 0 : -workDone;

  // --- Animation Loop ---
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const delta = time - lastTimeRef.current;
        const speed = 0.0015; // Volume units per ms

        setVolume((prev) => {
          let nextV = prev;
          if (direction === 'expand') {
            nextV = prev + speed * delta;
            if (nextV >= V_MAX) {
              setIsPlaying(false);
              setDirection('compress');
              return V_MAX;
            }
          } else {
            nextV = prev - speed * delta;
            if (nextV <= V_MIN) {
              setIsPlaying(false);
              setDirection('expand');
              return V_MIN;
            }
          }
          return nextV;
        });
      }
      lastTimeRef.current = time;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = undefined;
    };
  }, [isPlaying, direction]);

  // --- Chart Helpers ---
  const mapX = (v: number) => 40 + ((v - 0) / 6) * 340;
  const mapY = (p: number) => 260 - ((p - 0) / 1100) * 240;

  const generatePath = (type: 'isothermal' | 'adiabatic', maxV: number = V_MAX) => {
    let d = '';
    for (let v = V_MIN; v <= maxV; v += 0.1) {
      const p = type === 'isothermal' ? (P_INITIAL * V_INITIAL) / v : P_INITIAL * Math.pow(V_INITIAL / v, GAMMA);
      const x = mapX(v);
      const y = mapY(p);
      d += v === V_MIN ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  };

  const areaPath = useMemo(() => {
    let d = generatePath(process, volume);
    d += ` L ${mapX(volume)} ${mapY(0)} L ${mapX(V_MIN)} ${mapY(0)} Z`;
    return d;
  }, [process, volume]);

  // --- Visual Helpers ---
  const getGasColor = (temp: number) => {
    // Map 150K to 300K to a color scale (blue -> red)
    const tNorm = Math.max(0, Math.min(1, (temp - 150) / 150));
    const r = Math.round(100 + 155 * tNorm);
    const g = Math.round(150 * (1 - Math.abs(tNorm - 0.5) * 2));
    const b = Math.round(255 * (1 - tNorm));
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-100 p-6 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <header className="mb-8 text-center max-w-3xl">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-3 flex items-center justify-center gap-3">
          <Activity className="w-8 h-8 text-orange-600" />
          Thermodynamic Paths
        </h1>
        <p className="text-slate-600 text-lg">
          Explore the difference between <strong>Isothermal</strong> (constant temperature) and <strong>Adiabatic</strong> (no heat exchange) expansion and compression.
        </p>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Piston */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Controls Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/50">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-500" /> Process Type
            </h2>
            
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                onClick={() => setProcess('isothermal')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  process === 'isothermal' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Isothermal
              </button>
              <button
                onClick={() => setProcess('adiabatic')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  process === 'adiabatic' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Adiabatic
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                <span>Volume (V)</span>
                <span>{volume.toFixed(2)} L</span>
              </div>
              <input
                type="range"
                min={V_MIN}
                max={V_MAX}
                step={0.01}
                value={volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? 'Pause' : direction === 'expand' ? 'Expand' : 'Compress'}
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setVolume(V_INITIAL);
                  setDirection('expand');
                }}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center justify-center transition-all active:scale-95"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Piston Visual Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/50 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-700 mb-6 w-full text-center">Gas Chamber</h3>
            
            {/* Environment Indicator */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {process === 'isothermal' ? (
                <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold border border-orange-200">
                  <Flame className="w-4 h-4" /> Heat Bath
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-bold border border-slate-200">
                  <Shield className="w-4 h-4" /> Insulated
                </div>
              )}
            </div>

            <div className="relative w-40 h-64 mt-4">
              {/* Cylinder walls */}
              <div className={`absolute inset-0 border-x-8 border-b-8 rounded-b-xl z-10 pointer-events-none transition-colors duration-500 ${process === 'adiabatic' ? 'border-slate-600 border-dashed' : 'border-slate-300'}`}></div>
              
              {/* Gas */}
              <div 
                className="absolute bottom-2 left-2 right-2 rounded-b-sm transition-all duration-75"
                style={{ 
                  height: `${(volume / V_MAX) * 100}%`,
                  backgroundColor: getGasColor(currentT),
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
                }}
              >
                {/* Particles effect (simplified CSS pattern) */}
                <div className="w-full h-full opacity-30 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              </div>

              {/* Piston Head */}
              <div 
                className="absolute left-0 right-0 h-6 bg-slate-700 rounded-sm z-20 flex justify-center transition-all duration-75"
                style={{ bottom: `calc(${(volume / V_MAX) * 100}% + 8px)` }}
              >
                {/* Piston Rod */}
                <div className="w-4 h-64 bg-slate-400 absolute bottom-full"></div>
              </div>

              {/* Heat exchange arrows (Isothermal only) */}
              {process === 'isothermal' && isPlaying && (
                <div className="absolute -left-8 bottom-10 flex flex-col gap-2 animate-pulse">
                  <span className="text-orange-500 font-bold text-xl">→</span>
                  <span className="text-orange-500 font-bold text-xl">→</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chart & Metrics */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* P-V Diagram */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/50 flex-1">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Pressure-Volume (P-V) Diagram</h2>
            <div className="w-full aspect-video bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-sm">
                {/* Grid Lines */}
                {[1, 2, 3, 4, 5].map(v => (
                  <line key={`gx-${v}`} x1={mapX(v)} y1={mapY(0)} x2={mapX(v)} y2={mapY(1100)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                ))}
                {[200, 400, 600, 800, 1000].map(p => (
                  <line key={`gy-${p}`} x1={mapX(0)} y1={mapY(p)} x2={mapX(6)} y2={mapY(p)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                ))}

                {/* Axes */}
                <line x1={mapX(0)} y1={mapY(0)} x2={mapX(6)} y2={mapY(0)} stroke="#64748b" strokeWidth="2" />
                <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(1100)} stroke="#64748b" strokeWidth="2" />
                <text x={mapX(5.8)} y={mapY(-60)} className="text-xs fill-slate-500 font-semibold">V (L)</text>
                <text x={mapX(-0.4)} y={mapY(1050)} className="text-xs fill-slate-500 font-semibold">P (kPa)</text>

                {/* Area under curve (Work) */}
                <path d={areaPath} fill={process === 'isothermal' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)'} />

                {/* Inactive Path (Faded) */}
                <path 
                  d={generatePath(process === 'isothermal' ? 'adiabatic' : 'isothermal')} 
                  fill="none" 
                  stroke="#cbd5e1" 
                  strokeWidth="2" 
                  strokeDasharray="6 6"
                />

                {/* Active Path */}
                <path 
                  d={generatePath(process)} 
                  fill="none" 
                  stroke={process === 'isothermal' ? '#ea580c' : '#2563eb'} 
                  strokeWidth="3" 
                />

                {/* Current State Marker */}
                <circle cx={mapX(volume)} cy={mapY(currentP)} r="6" fill={process === 'isothermal' ? '#ea580c' : '#2563eb'} className="drop-shadow-md" />
                <circle cx={mapX(volume)} cy={mapY(currentP)} r="12" fill={process === 'isothermal' ? '#ea580c' : '#2563eb'} opacity="0.3" className="animate-ping" />

                {/* Initial State Marker */}
                <circle cx={mapX(V_INITIAL)} cy={mapY(P_INITIAL)} r="4" fill="#475569" />
                <text x={mapX(V_INITIAL) + 10} y={mapY(P_INITIAL) - 10} className="text-xs fill-slate-600 font-bold">Start</text>
              </svg>

              {/* Legend */}
              <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg border border-slate-200 shadow-sm text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-orange-600 rounded-full"></div>
                  <span className="text-slate-600 font-medium">Isothermal (T=const)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-600 rounded-full"></div>
                  <span className="text-slate-600 font-medium">Adiabatic (Q=0)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <div className="w-4 h-4 bg-orange-500/20 border border-orange-500/30 rounded-sm"></div>
                  <span className="text-slate-600 font-medium">Work Done (W)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="Pressure (P)" 
              value={`${Math.round(currentP)}`} 
              unit="kPa" 
              color="bg-indigo-50 text-indigo-700 border-indigo-100" 
            />
            <MetricCard 
              label="Temperature (T)" 
              value={`${Math.round(currentT)}`} 
              unit="K" 
              color={currentT < 300 ? 'bg-blue-50 text-blue-700 border-blue-100' : currentT > 300 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-orange-50 text-orange-700 border-orange-100'} 
            />
            <MetricCard 
              label="Work Done (W)" 
              value={`${Math.round(workDone)}`} 
              unit="J" 
              color="bg-emerald-50 text-emerald-700 border-emerald-100" 
            />
            <MetricCard 
              label={process === 'isothermal' ? 'Heat Added (Q)' : 'Internal Energy (ΔU)'} 
              value={`${Math.round(process === 'isothermal' ? heatAdded : internalEnergy)}`} 
              unit="J" 
              color="bg-amber-50 text-amber-700 border-amber-100" 
            />
          </div>

          {/* Educational Note */}
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>{process === 'isothermal' ? 'Isothermal Expansion:' : 'Adiabatic Expansion:'}</strong> 
              {process === 'isothermal' 
                ? ' The gas is kept at a constant temperature by a heat bath. As it expands, heat (Q) flows in to do the work (W), so internal energy remains unchanged (ΔU = 0). The curve follows P = nRT/V.' 
                : ' The gas is perfectly insulated (Q = 0). As it expands, it does work (W) at the expense of its own internal energy, causing the temperature (T) to drop rapidly. The curve is steeper, following P ∝ 1/V^γ.'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---
function MetricCard({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color} flex flex-col justify-between shadow-sm`}>
      <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black">{value}</span>
        <span className="text-sm font-semibold opacity-80">{unit}</span>
      </div>
    </div>
  );
}