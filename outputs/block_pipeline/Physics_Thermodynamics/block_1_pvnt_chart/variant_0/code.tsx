import React, { useState, useMemo } from 'react';

const R = 8.314; // Ideal gas constant in L⋅kPa/(mol⋅K)

export default function App() {
  // State for independent variables
  const [volume, setVolume] = useState<number>(50); // L
  const [temperature, setTemperature] = useState<number>(300); // K
  const [moles, setMoles] = useState<number>(2); // mol

  // Derived variables
  const pressure = (moles * R * temperature) / volume; // kPa
  const pv = pressure * volume; // L⋅kPa (or Joules)
  const nt = moles * temperature; // mol⋅K

  // Chart dimensions
  const chartWidth = 400;
  const chartHeight = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // --- PV vs nT Chart Scales ---
  const maxNt = 10 * 1000; // max moles * max temp
  const maxPv = maxNt * R;
  
  const mapNtToX = (val: number) => padding.left + (val / maxNt) * innerWidth;
  const mapPvToY = (val: number) => padding.top + innerHeight - (val / maxPv) * innerHeight;

  // --- P vs V Chart Scales ---
  const maxV = 100;
  // Dynamic max pressure based on current isotherm to keep it visible, but with a minimum scale
  const maxP = Math.max(1000, Math.ceil(((moles * R * temperature) / 10) / 500) * 500);
  
  const mapVToX = (val: number) => padding.left + (val / maxV) * innerWidth;
  const mapPToY = (val: number) => padding.top + innerHeight - (val / maxP) * innerHeight;

  // Generate Isotherm path (P vs V for current n and T)
  const isothermPath = useMemo(() => {
    let path = '';
    for (let v = 10; v <= maxV; v += 2) {
      const p = (moles * R * temperature) / v;
      const x = mapVToX(v);
      const y = Math.max(padding.top, mapPToY(p)); // Clip at top
      if (v === 10) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    return path;
  }, [moles, temperature, maxP]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
            Thermo Playground
          </h1>
          <p className="text-lg text-orange-800/70 font-medium">
            PV/nT Chart Explorer &bull; Ideal Gas Law
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls & State Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-orange-900/10 rounded-3xl p-6 border border-white">
              <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                System Controls
              </h2>
              
              <div className="space-y-6">
                {/* Volume Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Volume (V)</label>
                    <span className="text-lg font-bold text-orange-600">{volume.toFixed(1)} L</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="1" 
                    value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>

                {/* Temperature Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Temperature (T)</label>
                    <span className="text-lg font-bold text-red-600">{temperature.toFixed(0)} K</span>
                  </div>
                  <input 
                    type="range" min="100" max="1000" step="10" 
                    value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>

                {/* Moles Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Moles (n)</label>
                    <span className="text-lg font-bold text-amber-600">{moles.toFixed(1)} mol</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" step="0.1" 
                    value={moles} onChange={(e) => setMoles(Number(e.target.value))}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl text-white shadow-inner">
                <div className="text-sm font-medium text-orange-100 uppercase tracking-wider mb-1">Resulting Pressure (P)</div>
                <div className="text-4xl font-black tracking-tight">
                  {pressure.toFixed(1)} <span className="text-xl font-semibold text-orange-200">kPa</span>
                </div>
                <div className="mt-4 text-xs text-orange-100/80 font-mono bg-black/10 p-2 rounded-lg">
                  P = (n × R × T) / V<br/>
                  P = ({moles} × 8.314 × {temperature}) / {volume}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Area */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PV vs nT Chart */}
            <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-orange-900/5 rounded-3xl p-6 border border-white flex flex-col">
              <h3 className="text-lg font-bold text-slate-700 mb-1">PV vs nT Relationship</h3>
              <p className="text-xs text-slate-500 mb-4">The slope of this line is the Ideal Gas Constant (R ≈ 8.314)</p>
              
              <div className="flex-grow flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100">
                <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-y-${tick}`}>
                      <line 
                        x1={padding.left} y1={padding.top + innerHeight * tick} 
                        x2={chartWidth - padding.right} y2={padding.top + innerHeight * tick} 
                        stroke="#e2e8f0" strokeDasharray="4 4" 
                      />
                      <text x={padding.left - 10} y={padding.top + innerHeight * tick + 4} fontSize="10" fill="#64748b" textAnchor="end">
                        {Math.round(maxPv * (1 - tick))}
                      </text>
                    </g>
                  ))}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-x-${tick}`}>
                      <line 
                        x1={padding.left + innerWidth * tick} y1={padding.top} 
                        x2={padding.left + innerWidth * tick} y2={chartHeight - padding.bottom} 
                        stroke="#e2e8f0" strokeDasharray="4 4" 
                      />
                      <text x={padding.left + innerWidth * tick} y={chartHeight - padding.bottom + 20} fontSize="10" fill="#64748b" textAnchor="middle">
                        {Math.round(maxNt * tick)}
                      </text>
                    </g>
                  ))}

                  {/* Axes */}
                  <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#334155" strokeWidth="2" />
                  <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#334155" strokeWidth="2" />
                  
                  {/* Axis Labels */}
                  <text x={padding.left + innerWidth / 2} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#334155" textAnchor="middle">nT (mol·K)</text>
                  <text x={15} y={padding.top + innerHeight / 2} fontSize="12" fontWeight="bold" fill="#334155" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}>PV (L·kPa)</text>

                  {/* Theoretical Line (y = Rx) */}
                  <line 
                    x1={mapNtToX(0)} y1={mapPvToY(0)} 
                    x2={mapNtToX(maxNt)} y2={mapPvToY(maxNt * R)} 
                    stroke="#f97316" strokeWidth="3" strokeLinecap="round"
                  />

                  {/* Current State Point */}
                  <circle cx={mapNtToX(nt)} cy={mapPvToY(pv)} r="6" fill="#ef4444" className="transition-all duration-300 ease-out" />
                  <circle cx={mapNtToX(nt)} cy={mapPvToY(pv)} r="12" fill="#ef4444" opacity="0.3" className="transition-all duration-300 ease-out animate-pulse" />
                  
                  {/* Tooltip-like label */}
                  <g transform={`translate(${mapNtToX(nt) - 40}, ${mapPvToY(pv) - 15})`} className="transition-all duration-300 ease-out">
                    <rect x="0" y="-15" width="80" height="20" rx="4" fill="#1e293b" opacity="0.8" />
                    <text x="40" y="-2" fontSize="10" fill="white" textAnchor="middle">PV = {Math.round(pv)}</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* P vs V Chart */}
            <div className="bg-white/80 backdrop-blur-xl shadow-xl shadow-orange-900/5 rounded-3xl p-6 border border-white flex flex-col">
              <h3 className="text-lg font-bold text-slate-700 mb-1">P vs V Isotherm</h3>
              <p className="text-xs text-slate-500 mb-4">Inverse relationship (Boyle's Law) at constant T and n</p>
              
              <div className="flex-grow flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100">
                <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-y-pv-${tick}`}>
                      <line 
                        x1={padding.left} y1={padding.top + innerHeight * tick} 
                        x2={chartWidth - padding.right} y2={padding.top + innerHeight * tick} 
                        stroke="#e2e8f0" strokeDasharray="4 4" 
                      />
                      <text x={padding.left - 10} y={padding.top + innerHeight * tick + 4} fontSize="10" fill="#64748b" textAnchor="end">
                        {Math.round(maxP * (1 - tick))}
                      </text>
                    </g>
                  ))}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <g key={`grid-x-pv-${tick}`}>
                      <line 
                        x1={padding.left + innerWidth * tick} y1={padding.top} 
                        x2={padding.left + innerWidth * tick} y2={chartHeight - padding.bottom} 
                        stroke="#e2e8f0" strokeDasharray="4 4" 
                      />
                      <text x={padding.left + innerWidth * tick} y={chartHeight - padding.bottom + 20} fontSize="10" fill="#64748b" textAnchor="middle">
                        {Math.round(maxV * tick)}
                      </text>
                    </g>
                  ))}

                  {/* Axes */}
                  <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#334155" strokeWidth="2" />
                  <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#334155" strokeWidth="2" />
                  
                  {/* Axis Labels */}
                  <text x={padding.left + innerWidth / 2} y={chartHeight - 5} fontSize="12" fontWeight="bold" fill="#334155" textAnchor="middle">Volume (L)</text>
                  <text x={15} y={padding.top + innerHeight / 2} fontSize="12" fontWeight="bold" fill="#334155" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + innerHeight / 2})`}>Pressure (kPa)</text>

                  {/* Isotherm Curve */}
                  <path 
                    d={isothermPath} 
                    fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    className="transition-all duration-300 ease-out"
                  />

                  {/* Current State Point */}
                  <circle cx={mapVToX(volume)} cy={mapPToY(pressure)} r="6" fill="#ef4444" className="transition-all duration-300 ease-out" />
                  <circle cx={mapVToX(volume)} cy={mapPToY(pressure)} r="12" fill="#ef4444" opacity="0.3" className="transition-all duration-300 ease-out animate-pulse" />
                  
                  {/* Tooltip-like label */}
                  <g transform={`translate(${mapVToX(volume) + 15}, ${mapPToY(pressure) - 15})`} className="transition-all duration-300 ease-out">
                    <rect x="0" y="-15" width="70" height="32" rx="4" fill="#1e293b" opacity="0.8" />
                    <text x="35" y="-2" fontSize="10" fill="white" textAnchor="middle">V: {volume.toFixed(1)}</text>
                    <text x="35" y="10" fontSize="10" fill="white" textAnchor="middle">P: {pressure.toFixed(1)}</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Concept Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm">
                <h4 className="font-bold text-orange-700 mb-2">Boyle's Law</h4>
                <p className="text-sm text-slate-600">At constant <span className="font-semibold">T</span> and <span className="font-semibold">n</span>, Pressure is inversely proportional to Volume (<span className="italic font-serif">P ∝ 1/V</span>).</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm">
                <h4 className="font-bold text-red-700 mb-2">Charles's Law</h4>
                <p className="text-sm text-slate-600">At constant <span className="font-semibold">P</span> and <span className="font-semibold">n</span>, Volume is directly proportional to Temperature (<span className="italic font-serif">V ∝ T</span>).</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm">
                <h4 className="font-bold text-amber-700 mb-2">Avogadro's Law</h4>
                <p className="text-sm text-slate-600">At constant <span className="font-semibold">P</span> and <span className="font-semibold">T</span>, Volume is directly proportional to Moles (<span className="italic font-serif">V ∝ n</span>).</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}