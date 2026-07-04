import React, { useState, useMemo } from 'react';

export default function App() {
  // Ideal Gas Constant
  const R = 8.314; // L⋅kPa/(K⋅mol)

  // State variables
  const [T, setT] = useState<number>(400); // Temperature in Kelvin
  const [n, setN] = useState<number>(1.0); // Moles
  const [V, setV] = useState<number>(20);  // Volume in Liters

  // Derived Pressure (kPa)
  const P = (n * R * T) / V;

  // Chart Configuration
  const width = 600;
  const height = 400;
  const padding = 60;
  const maxV = 50;
  const maxP = 3000; // Fixed max pressure for stable axes

  // Scale functions
  const getX = (v: number) => padding + (v / maxV) * (width - 2 * padding);
  const getY = (p: number) => height - padding - (p / maxP) * (height - 2 * padding);

  // Generate SVG path for an isotherm
  const generateIsotherm = (temp: number, moles: number) => {
    let path = "";
    for (let v = 2; v <= maxV; v += 0.5) {
      const p = (moles * R * temp) / v;
      const x = getX(v);
      const y = getY(p);
      if (v === 2) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    return path;
  };

  // Reference isotherms for the background
  const referenceTemps = [200, 400, 600, 800, 1000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-100 p-6 font-sans text-slate-800 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header & Chart Section */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-orange-900/10 border border-white/50">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-2">
                PV/nT Chart
              </h1>
              <p className="text-slate-500 font-medium">
                Explore the Ideal Gas Law visually. Adjust the parameters to see how pressure relates to volume, temperature, and moles.
              </p>
            </div>

            {/* SVG Chart */}
            <div className="relative w-full aspect-[3/2] bg-white rounded-2xl shadow-inner border border-slate-100 overflow-hidden">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-sm">
                <defs>
                  <clipPath id="chart-area">
                    <rect x={padding} y={10} width={width - 2 * padding} height={height - padding - 10} />
                  </clipPath>
                  <linearGradient id="activeLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[...Array(6)].map((_, i) => {
                  const y = getY((maxP / 5) * i);
                  const x = getX((maxV / 5) * i);
                  return (
                    <g key={`grid-${i}`}>
                      {/* Horizontal grid */}
                      <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="2" />
                      <text x={padding - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                        {((maxP / 5) * i).toFixed(0)}
                      </text>
                      {/* Vertical grid */}
                      <line x1={x} y1={10} x2={x} y2={height - padding} stroke="#f1f5f9" strokeWidth="2" />
                      <text x={x} y={height - padding + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">
                        {((maxV / 5) * i).toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Axes */}
                <line x1={padding} y1={10} x2={padding} y2={height - padding} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                
                {/* Axes Labels */}
                <text x={padding - 45} y={height / 2} transform={`rotate(-90, ${padding - 45}, ${height / 2})`} textAnchor="middle" className="text-xs font-bold fill-slate-500 tracking-widest uppercase">
                  Pressure (kPa)
                </text>
                <text x={width / 2} y={height - 10} textAnchor="middle" className="text-xs font-bold fill-slate-500 tracking-widest uppercase">
                  Volume (L)
                </text>

                {/* Chart Area (Clipped) */}
                <g clipPath="url(#chart-area)">
                  {/* Reference Isotherms */}
                  {referenceTemps.map((refT) => (
                    <path
                      key={`ref-${refT}`}
                      d={generateIsotherm(refT, n)}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="transition-all duration-300"
                    />
                  ))}

                  {/* Active Isotherm */}
                  <path
                    d={generateIsotherm(T, n)}
                    fill="none"
                    stroke="url(#activeLine)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="transition-all duration-300 drop-shadow-md"
                  />

                  {/* Current State Point */}
                  <circle
                    cx={getX(V)}
                    cy={getY(P)}
                    r="6"
                    className="fill-red-500 stroke-white stroke-[3px] transition-all duration-300 drop-shadow-lg"
                  />
                  
                  {/* Dotted lines to axes for current point */}
                  <line x1={padding} y1={getY(P)} x2={getX(V)} y2={getY(P)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" className="transition-all duration-300" />
                  <line x1={getX(V)} y1={height - padding} x2={getX(V)} y2={getY(P)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" className="transition-all duration-300" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Controls & Math Section */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Equation Dashboard */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-white/50">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Equation Balance</h2>
            
            <div className="flex items-center justify-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-xl font-mono text-slate-700">
                  <span className="text-blue-600 font-bold">P</span>
                  <span>×</span>
                  <span className="text-emerald-600 font-bold">V</span>
                </div>
                <div className="w-full h-px bg-slate-300 my-2"></div>
                <div className="flex items-center gap-2 text-xl font-mono text-slate-700">
                  <span className="text-purple-600 font-bold">n</span>
                  <span>×</span>
                  <span className="text-orange-600 font-bold">T</span>
                </div>
              </div>
              
              <div className="mx-6 text-2xl font-bold text-slate-400">=</div>
              
              <div className="flex flex-col items-center">
                <div className="text-3xl font-mono font-bold text-red-500">R</div>
                <div className="text-xs text-slate-400 font-mono mt-1">Constant</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center bg-orange-50/50 rounded-xl p-3 border border-orange-100/50">
              <div className="font-mono text-sm text-slate-600 flex items-center gap-3">
                <span className="flex flex-col items-center">
                  <span>{(P * V).toFixed(1)}</span>
                  <span className="w-full h-px bg-slate-300 my-1"></span>
                  <span>{(n * T).toFixed(1)}</span>
                </span>
                <span>=</span>
                <span className="font-bold text-orange-600">{((P * V) / (n * T)).toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-orange-900/5 border border-white/50 flex-1 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">State Variables</h2>

            {/* Pressure (Read-only) */}
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <div className="flex justify-between items-end mb-1">
                <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Pressure (P)
                </label>
                <span className="text-lg font-mono font-bold text-blue-700">{P.toFixed(1)} <span className="text-xs text-blue-500">kPa</span></span>
              </div>
              <div className="w-full h-2 bg-blue-200/50 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(P / maxP) * 100}%` }}></div>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <div className="flex justify-between items-end mb-3">
                <label className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Volume (V)
                </label>
                <span className="text-lg font-mono font-bold text-emerald-700">{V.toFixed(1)} <span className="text-xs text-emerald-500">L</span></span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="0.5"
                value={V}
                onChange={(e) => setV(parseFloat(e.target.value))}
                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Temperature Slider */}
            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
              <div className="flex justify-between items-end mb-3">
                <label className="text-sm font-bold text-orange-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Temperature (T)
                </label>
                <span className="text-lg font-mono font-bold text-orange-700">{T.toFixed(0)} <span className="text-xs text-orange-500">K</span></span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="10"
                value={T}
                onChange={(e) => setT(parseFloat(e.target.value))}
                className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>

            {/* Moles Slider */}
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex justify-between items-end mb-3">
                <label className="text-sm font-bold text-purple-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Moles (n)
                </label>
                <span className="text-lg font-mono font-bold text-purple-700">{n.toFixed(2)} <span className="text-xs text-purple-500">mol</span></span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={n}
                onChange={(e) => setN(parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}