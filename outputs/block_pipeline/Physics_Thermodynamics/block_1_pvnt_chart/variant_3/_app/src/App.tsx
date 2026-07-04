import React, { useState, useMemo } from 'react';

const R = 0.08206; // Ideal gas constant in L⋅atm/(mol⋅K)
const MAX_V = 50;  // Maximum Volume (L)
const MAX_P = 80;  // Maximum Pressure (atm)
const WIDTH = 600;
const HEIGHT = 400;

export default function App() {
  const [moles, setMoles] = useState<number>(2.5);
  const [temp, setTemp] = useState<number>(400);
  const [vol, setVol] = useState<number>(20);

  // Calculate Pressure: P = nRT/V
  const pressure = (moles * R * temp) / vol;

  // Map data values to SVG coordinates
  const mapX = (v: number) => (v / MAX_V) * WIDTH;
  const mapY = (p: number) => {
    const y = HEIGHT - (p / MAX_P) * HEIGHT;
    return Math.max(-50, Math.min(HEIGHT, y)); // Allow slight overflow for smooth curves
  };

  // Generate main isotherm path
  const currentIsothermPath = useMemo(() => {
    let points = [];
    for (let v = 1; v <= MAX_V; v += 0.5) {
      const p = (moles * R * temp) / v;
      points.push(`${mapX(v)},${mapY(p)}`);
    }
    return `M ${points.join(' L ')}`;
  }, [moles, temp]);

  // Generate background reference isotherms (different T values)
  const referenceIsotherms = useMemo(() => {
    const temps = [200, 600, 800, 1000];
    return temps.map(t => {
      let points = [];
      for (let v = 1; v <= MAX_V; v += 0.5) {
        const p = (moles * R * t) / v;
        points.push(`${mapX(v)},${mapY(p)}`);
      }
      return { t, path: `M ${points.join(' L ')}` };
    });
  }, [moles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-4 md:p-8 font-sans text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-6xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 bg-black/20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
              Ideal Gas Law Explorer
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Visualize the PV/nT relationship: <span className="font-mono text-orange-300">PV = nRT</span>
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Live Simulation</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 p-6 md:p-8 gap-8">
          
          {/* Left Column: Controls & Concepts */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6">
            
            {/* Concept Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Concept
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The state of an ideal gas is determined by its pressure (P), volume (V), temperature (T), and moles (n). 
                Adjust the variables below to see how the state moves along its <span className="text-yellow-400 font-medium">isotherm</span> (constant temperature curve).
              </p>
            </div>

            {/* Controls */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner flex flex-col gap-5">
              
              {/* Temperature Control */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-medium text-slate-300 group-hover:text-orange-300 transition-colors">
                    Temperature (T)
                  </label>
                  <span className="text-sm font-mono text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">
                    {temp} K
                  </span>
                </div>
                <input 
                  type="range" min="100" max="1000" step="10" 
                  value={temp} onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Moles Control */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-medium text-slate-300 group-hover:text-blue-300 transition-colors">
                    Amount (n)
                  </label>
                  <span className="text-sm font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                    {moles.toFixed(1)} mol
                  </span>
                </div>
                <input 
                  type="range" min="0.5" max="5.0" step="0.1" 
                  value={moles} onChange={(e) => setMoles(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Volume Control */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-medium text-slate-300 group-hover:text-green-300 transition-colors">
                    Volume (V)
                  </label>
                  <span className="text-sm font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                    {vol.toFixed(1)} L
                  </span>
                </div>
                <input 
                  type="range" min="5" max="50" step="0.5" 
                  value={vol} onChange={(e) => setVol(Number(e.target.value))}
                  className="w-full accent-green-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Math Readout */}
            <div className="bg-black/40 border border-rose-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <h3 className="text-xs uppercase tracking-wider text-rose-300 font-semibold mb-3">Calculated Pressure</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{pressure.toFixed(2)}</span>
                <span className="text-lg text-rose-200">atm</span>
              </div>
              <div className="mt-4 text-xs font-mono text-slate-400 border-t border-white/10 pt-3">
                P = ({moles.toFixed(1)} × 0.08206 × {temp}) / {vol.toFixed(1)}
              </div>
            </div>

          </div>

          {/* Right Column: Chart */}
          <div className="w-full lg:w-2/3 flex flex-col bg-black/40 border border-white/5 rounded-2xl p-4 md:p-6 relative">
            <h3 className="absolute top-6 left-8 text-sm font-semibold text-slate-300 tracking-wider">
              P-V Diagram
            </h3>
            
            <div className="flex-1 w-full relative mt-8">
              <svg 
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`} 
                className="w-full h-full drop-shadow-lg overflow-hidden rounded-xl bg-slate-900/50"
              >
                <defs>
                  <linearGradient id="grid-pattern" width="40" height="40" gradientUnits="userSpaceOnUse">
                    <rect width="40" height="40" fill="none" />
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  </linearGradient>
                  <clipPath id="chart-area">
                    <rect x="0" y="0" width={WIDTH} height={HEIGHT} />
                  </clipPath>
                  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(251, 191, 36, 0.4)" />
                    <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
                  </radialGradient>
                </defs>

                {/* Grid */}
                <rect width={WIDTH} height={HEIGHT} fill="url(#grid-pattern)" />

                {/* Axes */}
                <line x1="0" y1={HEIGHT} x2={WIDTH} y2={HEIGHT} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <line x1="0" y1="0" x2="0" y2={HEIGHT} stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

                {/* Chart Area */}
                <g clipPath="url(#chart-area)">
                  {/* Reference Isotherms */}
                  {referenceIsotherms.map((iso, i) => (
                    <g key={i}>
                      <path 
                        d={iso.path} 
                        fill="none" 
                        stroke="rgba(255,255,255,0.08)" 
                        strokeWidth="2" 
                        className="transition-all duration-500 ease-in-out"
                      />
                      {/* T labels on isotherms at V = MAX_V - 2 */}
                      <text 
                        x={mapX(MAX_V - 2)} 
                        y={mapY((moles * R * iso.t) / (MAX_V - 2)) - 5}
                        fill="rgba(255,255,255,0.2)"
                        fontSize="10"
                        className="font-mono transition-all duration-500"
                      >
                        {iso.t}K
                      </text>
                    </g>
                  ))}

                  {/* Current Isotherm */}
                  <path 
                    d={currentIsothermPath} 
                    fill="none" 
                    stroke="#fcd34d" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                  />

                  {/* Guides */}
                  <line 
                    x1={mapX(vol)} y1={HEIGHT} 
                    x2={mapX(vol)} y2={mapY(pressure)} 
                    stroke="#4ade80" strokeWidth="1.5" strokeDasharray="4 4" 
                    className="transition-all duration-300 ease-out opacity-80"
                  />
                  <line 
                    x1="0" y1={mapY(pressure)} 
                    x2={mapX(vol)} y2={mapY(pressure)} 
                    stroke="#fb7185" strokeWidth="1.5" strokeDasharray="4 4" 
                    className="transition-all duration-300 ease-out opacity-80"
                  />

                  {/* Current State Point Glow */}
                  <circle 
                    cx={mapX(vol)} 
                    cy={mapY(pressure)} 
                    r="24" 
                    fill="url(#glow)" 
                    className="transition-all duration-300 ease-out pointer-events-none"
                  />

                  {/* Current State Point */}
                  <circle 
                    cx={mapX(vol)} 
                    cy={mapY(pressure)} 
                    r="6" 
                    fill="#fff" 
                    stroke="#f59e0b"
                    strokeWidth="3"
                    className="transition-all duration-300 ease-out cursor-crosshair shadow-2xl"
                  />
                </g>

                {/* Axis Labels */}
                <text x={WIDTH / 2} y={HEIGHT - 10} fill="rgba(255,255,255,0.5)" fontSize="12" textAnchor="middle" className="font-semibold tracking-widest">
                  VOLUME (L)
                </text>
                <text x="-200" y="20" transform="rotate(-90)" fill="rgba(255,255,255,0.5)" fontSize="12" textAnchor="middle" className="font-semibold tracking-widest">
                  PRESSURE (atm)
                </text>

                {/* Max Value Markers */}
                <text x={WIDTH - 25} y={HEIGHT - 10} fill="rgba(255,255,255,0.3)" fontSize="10">{MAX_V}</text>
                <text x="5" y="15" fill="rgba(255,255,255,0.3)" fontSize="10">{MAX_P}</text>
              </svg>
            </div>
            
            {/* Legend / Info Footer */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-yellow-300 rounded-full"></div>
                <span className="text-slate-400">Current Isotherm (T={temp}K)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-white/20 rounded-full"></div>
                <span className="text-slate-400">Reference Isotherms</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-slate-500 font-mono">Point: ({vol.toFixed(1)} L, {pressure.toFixed(1)} atm)</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}