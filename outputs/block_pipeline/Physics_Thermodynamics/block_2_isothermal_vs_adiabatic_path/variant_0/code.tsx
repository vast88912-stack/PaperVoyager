import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Physics Constants & Helpers ---
const GAMMA = 1.4; // Heat capacity ratio for diatomic gas (e.g., air)
const V_MIN = 1;
const V_MAX = 5;
const P_INITIAL = 1;

const calculatePressure = (v: number, process: 'isothermal' | 'adiabatic') => {
  if (process === 'isothermal') {
    return P_INITIAL * (V_MIN / v);
  } else {
    return P_INITIAL * Math.pow(V_MIN / v, GAMMA);
  }
};

const calculateTemperature = (p: number, v: number) => {
  // Ideal gas law: PV = nRT. Normalized so T_initial = 1
  return p * v;
};

const calculateWork = (v: number, process: 'isothermal' | 'adiabatic') => {
  if (process === 'isothermal') {
    return Math.log(v / V_MIN);
  } else {
    return (P_INITIAL * V_MIN - calculatePressure(v, 'adiabatic') * v) / (GAMMA - 1);
  }
};

const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

// --- SVG Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

export default function App() {
  const [volume, setVolume] = useState<number>(V_MIN);
  const [process, setProcess] = useState<'isothermal' | 'adiabatic'>('isothermal');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(1); // 1 for expansion, -1 for compression

  const currentPressure = calculatePressure(volume, process);
  const currentTemperature = calculateTemperature(currentPressure, volume);
  const currentWork = calculateWork(volume, process);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isPlaying) return;
      
      const deltaTime = time - lastTime;
      lastTime = time;

      setVolume((prevV) => {
        const speed = 0.002; // volume units per ms
        let nextV = prevV + direction * speed * deltaTime;
        
        if (nextV >= V_MAX) {
          nextV = V_MAX;
          setDirection(-1);
          setIsPlaying(false); // Auto-pause at ends
        } else if (nextV <= V_MIN) {
          nextV = V_MIN;
          setDirection(1);
          setIsPlaying(false); // Auto-pause at ends
        }
        return nextV;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, direction]);

  // Handle manual slider change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setVolume(parseFloat(e.target.value));
  };

  // --- Chart Rendering Helpers ---
  const chartWidth = 400;
  const chartHeight = 300;
  const padding = 50;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  const mapVToX = (v: number) => padding + ((v - 0) / (V_MAX + 0.5)) * innerWidth;
  const mapPToY = (p: number) => chartHeight - padding - ((p - 0) / 1.2) * innerHeight;

  const generateCurvePath = (proc: 'isothermal' | 'adiabatic') => {
    let path = '';
    for (let v = V_MIN; v <= V_MAX; v += 0.1) {
      const p = calculatePressure(v, proc);
      const x = mapVToX(v);
      const y = mapPToY(p);
      if (v === V_MIN) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    return path;
  };

  const generateAreaPath = () => {
    let path = '';
    for (let v = V_MIN; v <= volume; v += 0.05) {
      const p = calculatePressure(v, process);
      const x = mapVToX(v);
      const y = mapPToY(p);
      if (v === V_MIN) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    // Close the path down to the x-axis
    path += `L ${mapVToX(volume)} ${mapPToY(0)} L ${mapVToX(V_MIN)} ${mapPToY(0)} Z`;
    return path;
  };

  // Gas color based on temperature (Blue = cold, Red = hot)
  // T ranges from ~0.52 (adiabatic max expansion) to 1.0 (initial/isothermal)
  const gasHue = mapRange(currentTemperature, 0.5, 1.0, 220, 0);
  const gasColor = `hsla(${gasHue}, 80%, 60%, 0.6)`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-5xl w-full mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-3">
          Isothermal vs Adiabatic Paths
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Explore how ideal gases behave during expansion and compression. Compare a process with perfect heat exchange (Isothermal) to one with zero heat exchange (Adiabatic).
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Controls & Piston */}
        <div className="flex flex-col gap-6">
          
          {/* Process Selector Card */}
          <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-3xl p-6 border border-white/40">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <InfoIcon /> Select Process
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => setProcess('isothermal')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 border-2 ${
                  process === 'isothermal' 
                    ? 'bg-orange-100 border-orange-500 text-orange-700 shadow-md scale-105' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Isothermal (T = const)
              </button>
              <button
                onClick={() => setProcess('adiabatic')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 border-2 ${
                  process === 'adiabatic' 
                    ? 'bg-red-100 border-red-500 text-red-700 shadow-md scale-105' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Adiabatic (Q = 0)
              </button>
            </div>
            <div className="mt-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {process === 'isothermal' ? (
                <p><strong>Isothermal:</strong> The gas expands slowly, absorbing heat from the surroundings to maintain a constant temperature. Pressure drops inversely with volume (Boyle's Law).</p>
              ) : (
                <p><strong>Adiabatic:</strong> The gas expands rapidly in an insulated container. No heat enters or leaves. The gas does work at the expense of its internal energy, causing the temperature to drop.</p>
              )}
            </div>
          </div>

          {/* Piston Visualization Card */}
          <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-3xl p-6 border border-white/40 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-6 w-full text-left">Gas Chamber</h2>
            
            {/* Piston SVG */}
            <svg width="100%" height="140" viewBox="0 0 300 140" className="overflow-visible">
              {/* Cylinder Body */}
              <rect x="20" y="20" width="260" height="100" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="4" rx="4" />
              
              {/* Gas Volume */}
              <rect 
                x="22" 
                y="22" 
                width={mapRange(volume, V_MIN, V_MAX, 40, 240)} 
                height="96" 
                fill={gasColor} 
                className="transition-colors duration-200"
              />
              
              {/* Particles (Decorative) */}
              <g opacity="0.5">
                {Array.from({ length: 20 }).map((_, i) => {
                  // Pseudo-random positions based on index
                  const px = 25 + ((i * 37) % mapRange(volume, V_MIN, V_MAX, 30, 230));
                  const py = 25 + ((i * 19) % 90);
                  return <circle key={i} cx={px} cy={py} r="2" fill="#fff" />;
                })}
              </g>

              {/* Piston Head */}
              <rect 
                x={22 + mapRange(volume, V_MIN, V_MAX, 40, 240)} 
                y="18" 
                width="12" 
                height="104" 
                fill="#475569" 
                rx="2" 
              />
              
              {/* Piston Rod */}
              <rect 
                x={34 + mapRange(volume, V_MIN, V_MAX, 40, 240)} 
                y="66" 
                width={260 - mapRange(volume, V_MIN, V_MAX, 40, 240)} 
                height="8" 
                fill="#cbd5e1" 
              />

              {/* Heat indicator (Isothermal only) */}
              {process === 'isothermal' && isPlaying && direction === 1 && (
                <g className="animate-pulse">
                  <path d="M 60 130 Q 70 110 80 130" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M 100 130 Q 110 110 120 130" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M 140 130 Q 150 110 160 130" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                  <text x="110" y="145" fontSize="10" fill="#ef4444" textAnchor="middle" fontWeight="bold">Heat Entering (Q &gt; 0)</text>
                </g>
              )}
              {process === 'adiabatic' && (
                <rect x="16" y="16" width="268" height="108" fill="none" stroke="#fbbf24" strokeWidth="6" strokeDasharray="8 4" rx="6" />
              )}
            </svg>
            {process === 'adiabatic' && <div className="text-xs text-amber-600 font-bold mt-2">Insulated Walls (Q = 0)</div>}

            {/* Controls */}
            <div className="w-full mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center justify-center w-12 h-12 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors shadow-lg"
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button 
                  onClick={() => { setIsPlaying(false); setVolume(V_MIN); setDirection(1); }}
                  className="flex items-center justify-center w-12 h-12 bg-white border-2 border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ResetIcon />
                </button>
                
                <div className="flex-1 px-4">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                    <span>V = 1.0</span>
                    <span>Volume</span>
                    <span>V = 5.0</span>
                  </div>
                  <input 
                    type="range" 
                    min={V_MIN} 
                    max={V_MAX} 
                    step="0.01" 
                    value={volume} 
                    onChange={handleVolumeChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: P-V Diagram & Stats */}
        <div className="flex flex-col gap-6">
          
          {/* P-V Diagram Card */}
          <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-3xl p-6 border border-white/40 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2 w-full text-left">P-V Diagram</h2>
            
            <div className="relative w-full max-w-[400px] aspect-[4/3] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
              <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                
                {/* Grid Lines */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <g key={`grid-${i}`}>
                    <line x1={padding} y1={mapPToY(i * 0.2)} x2={chartWidth - padding} y2={mapPToY(i * 0.2)} stroke="#e2e8f0" strokeWidth="1" />
                    <line x1={mapVToX(i)} y1={padding} x2={mapVToX(i)} y2={chartHeight - padding} stroke="#e2e8f0" strokeWidth="1" />
                  </g>
                ))}

                {/* Axes */}
                <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding + 20} y2={chartHeight - padding} stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
                <line x1={padding} y1={chartHeight - padding} x2={padding} y2={padding - 20} stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
                
                <text x={chartWidth - padding + 10} y={chartHeight - padding + 20} fontSize="14" fill="#334155" fontWeight="bold">V</text>
                <text x={padding - 20} y={padding - 10} fontSize="14" fill="#334155" fontWeight="bold">P</text>

                {/* Area under curve (Work) */}
                <path 
                  d={generateAreaPath()} 
                  fill={process === 'isothermal' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 
                />

                {/* Isothermal Curve */}
                <path 
                  d={generateCurvePath('isothermal')} 
                  fill="none" 
                  stroke="#f97316" 
                  strokeWidth={process === 'isothermal' ? 4 : 2} 
                  strokeDasharray={process === 'isothermal' ? 'none' : '4 4'}
                  opacity={process === 'isothermal' ? 1 : 0.4}
                />
                <text x={mapVToX(4.5)} y={mapPToY(calculatePressure(4.5, 'isothermal')) - 10} fontSize="12" fill="#f97316" fontWeight="bold" opacity={process === 'isothermal' ? 1 : 0.4}>Isothermal</text>

                {/* Adiabatic Curve */}
                <path 
                  d={generateCurvePath('adiabatic')} 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth={process === 'adiabatic' ? 4 : 2}
                  strokeDasharray={process === 'adiabatic' ? 'none' : '4 4'}
                  opacity={process === 'adiabatic' ? 1 : 0.4}
                />
                <text x={mapVToX(3.5)} y={mapPToY(calculatePressure(3.5, 'adiabatic')) - 10} fontSize="12" fill="#ef4444" fontWeight="bold" opacity={process === 'adiabatic' ? 1 : 0.4}>Adiabatic</text>

                {/* Current State Dot */}
                <circle 
                  cx={mapVToX(volume)} 
                  cy={mapPToY(currentPressure)} 
                  r="6" 
                  fill={process === 'isothermal' ? '#f97316' : '#ef4444'} 
                  stroke="#fff" 
                  strokeWidth="2" 
                  className="transition-all duration-75"
                />

                {/* Defs for markers */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>

          {/* Live Stats Card */}
          <div className="bg-slate-800 text-white shadow-xl rounded-3xl p-6 border border-slate-700 grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-2xl">
              <div className="text-slate-400 text-sm font-semibold mb-1">Volume (V)</div>
              <div className="text-3xl font-mono font-light