import React, { useState, useMemo } from 'react';
import { Activity, Thermometer, Box, PlusCircle, Trash2, Wind, CheckCircle2 } from 'lucide-react';

// Ideal Gas Constant (L·atm / mol·K)
const R = 0.08206;

type DataPoint = {
  id: string;
  n: number;
  T: number;
  V: number;
  P: number;
  nT: number;
  PV: number;
};

export default function App() {
  // State for variables
  const [n, setN] = useState<number>(1.0); // moles
  const [T, setT] = useState<number>(300); // Kelvin
  const [V, setV] = useState<number>(20);  // Liters

  // History of recorded points
  const [history, setHistory] = useState<DataPoint[]>([]);

  // Derived calculations for current state
  const P = (n * R * T) / V;
  const current_nT = n * T;
  const current_PV = P * V;

  // Chart Constants
  const viewBoxWidth = 600;
  const viewBoxHeight = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const plotWidth = viewBoxWidth - margin.left - margin.right;
  const plotHeight = viewBoxHeight - margin.top - margin.bottom;

  // Scales
  const MAX_NT = 5000; // max n (5) * max T (1000)
  const MAX_PV = 500;  // slightly above MAX_NT * R (~410)

  const getX = (nT: number) => margin.left + (nT / MAX_NT) * plotWidth;
  const getY = (PV: number) => margin.top + plotHeight - (PV / MAX_PV) * plotHeight;

  // Handlers
  const handleRecordPoint = () => {
    const newPoint: DataPoint = {
      id: Math.random().toString(36).substr(2, 9),
      n,
      T,
      V,
      P,
      nT: current_nT,
      PV: current_PV,
    };
    setHistory([...history, newPoint]);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-4 md:p-8 font-sans text-white selection:bg-white/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-2xl">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-amber-300" />
              PV / nT Chart
            </h1>
            <p className="text-orange-100 mt-2 opacity-90 max-w-xl">
              Explore the Ideal Gas Law (<code className="bg-black/20 px-2 py-0.5 rounded text-amber-200 font-mono">PV = nRT</code>). 
              Adjust the moles, temperature, and volume to see how pressure reacts. Plot points to visualize the linear relationship where the slope is the ideal gas constant (R).
            </p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/10 text-center min-w-[160px]">
            <div className="text-sm text-amber-200/80 uppercase tracking-wider font-semibold mb-1">Gas Constant (R)</div>
            <div className="text-2xl font-mono text-amber-300">0.08206</div>
            <div className="text-xs text-white/60">L·atm / mol·K</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl flex flex-col gap-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-white/10 pb-4">
                <Wind className="w-5 h-5 text-amber-300" />
                System Controls
              </h2>

              {/* Moles (n) Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-amber-100 flex items-center gap-2">
                    <span className="bg-amber-500/20 p-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-amber-300" /></span>
                    Moles (n)
                  </label>
                  <span className="text-lg font-mono font-semibold">{n.toFixed(1)} <span className="text-sm text-white/60">mol</span></span>
                </div>
                <input 
                  type="range" min="0.1" max="5.0" step="0.1" value={n} 
                  onChange={(e) => setN(parseFloat(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* Temperature (T) Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-orange-100 flex items-center gap-2">
                    <span className="bg-orange-500/20 p-1.5 rounded-lg"><Thermometer className="w-4 h-4 text-orange-300" /></span>
                    Temperature (T)
                  </label>
                  <span className="text-lg font-mono font-semibold">{T.toFixed(0)} <span className="text-sm text-white/60">K</span></span>
                </div>
                <input 
                  type="range" min="100" max="1000" step="10" value={T} 
                  onChange={(e) => setT(parseFloat(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-orange-400"
                />
              </div>

              {/* Volume (V) Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-rose-100 flex items-center gap-2">
                    <span className="bg-rose-500/20 p-1.5 rounded-lg"><Box className="w-4 h-4 text-rose-300" /></span>
                    Volume (V)
                  </label>
                  <span className="text-lg font-mono font-semibold">{V.toFixed(1)} <span className="text-sm text-white/60">L</span></span>
                </div>
                <input 
                  type="range" min="5" max="100" step="1" value={V} 
                  onChange={(e) => setV(parseFloat(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-rose-400"
                />
              </div>

              {/* Live Result: Pressure (P) */}
              <div className="mt-4 bg-gradient-to-br from-black/40 to-black/20 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-16 h-16" />
                </div>
                <div className="text-sm text-white/60 uppercase tracking-wider font-semibold mb-2">Resulting Pressure (P)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-bold text-white">{P.toFixed(2)}</span>
                  <span className="text-lg text-white/60">atm</span>
                </div>
                <div className="mt-3 text-xs text-white/40 font-mono">
                  P = ({n.toFixed(1)} × {R} × {T.toFixed(0)}) / {V.toFixed(1)}
                </div>
              </div>

              <button 
                onClick={handleRecordPoint}
                className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
              >
                <PlusCircle className="w-5 h-5" />
                Record Data Point
              </button>
            </div>
          </div>

          {/* Chart Section */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl flex-grow flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-300" />
                  PV vs nT Relationship
                </h2>
                {history.length > 0 && (
                  <button 
                    onClick={handleClearHistory}
                    className="text-sm flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg transition-colors border border-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Plot
                  </button>
                )}
              </div>

              {/* SVG Chart Container */}
              <div className="w-full bg-black/20 rounded-2xl border border-white/10 overflow-hidden relative" style={{ paddingBottom: '66.66%' }}>
                <svg 
                  viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
                  className="absolute top-0 left-0 w-full h-full"
                >
                  {/* Grid Lines */}
                  {[0, 1000, 2000, 3000, 4000, 5000].map((val) => (
                    <line 
                      key={`grid-x-${val}`}
                      x1={getX(val)} y1={margin.top} 
                      x2={getX(val)} y2={viewBoxHeight - margin.bottom} 
                      stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4"
                    />
                  ))}
                  {[0, 100, 200, 300, 400, 500].map((val) => (
                    <line 
                      key={`grid-y-${val}`}
                      x1={margin.left} y1={getY(val)} 
                      x2={viewBoxWidth - margin.right} y2={getY(val)} 
                      stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4"
                    />
                  ))}

                  {/* Axes */}
                  <line 
                    x1={margin.left} y1={getY(0)} 
                    x2={viewBoxWidth - margin.right + 10} y2={getY(0)} 
                    stroke="rgba(255,255,255,0.5)" strokeWidth="2"
                  />
                  <line 
                    x1={getX(0)} y1={margin.top - 10} 
                    x2={getX(0)} y2={getY(0)} 
                    stroke="rgba(255,255,255,0.5)" strokeWidth="2"
                  />

                  {/* Axis Labels */}
                  <text x={viewBoxWidth / 2} y={viewBoxHeight - 15} fill="rgba(255,255,255,0.8)" fontSize="14" textAnchor="middle" className="font-mono">
                    nT (moles × Kelvin)
                  </text>
                  <text x={-viewBoxHeight / 2} y={25} fill="rgba(255,255,255,0.8)" fontSize="14" textAnchor="middle" transform="rotate(-90)" className="font-mono">
                    PV (atm × Liters)
                  </text>

                  {/* Axis Ticks */}
                  {[0, 1000, 2000, 3000, 4000, 5000].map((val) => (
                    <text key={`tick-x-${val}`} x={getX(val)} y={getY(0) + 20} fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="middle" className="font-mono">
                      {val}
                    </text>
                  ))}
                  {[0, 100, 200, 300, 400, 500].map((val) => (
                    <text key={`tick-y-${val}`} x={margin.left - 10} y={getY(val) + 4} fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="end" className="font-mono">
                      {val}
                    </text>
                  ))}

                  {/* Theoretical Ideal Gas Line (y = Rx) */}
                  <line 
                    x1={getX(0)} y1={getY(0)} 
                    x2={getX(MAX_NT)} y2={getY(MAX_NT * R)} 
                    stroke="rgba(251, 191, 36, 0.4)" strokeWidth="3" strokeDasharray="8 8"
                  />
                  <text x={getX(MAX_NT) - 20} y={getY(MAX_NT * R) - 10} fill="rgba(251, 191, 36, 0.8)" fontSize="14" textAnchor="end" className="font-mono italic">
                    Slope = R
                  </text>

                  {/* Historical Points */}
                  {history.map((pt, i) => (
                    <g key={pt.id}>
                      <line 
                        x1={getX(pt.nT)} y1={getY(0)} 
                        x2={getX(pt.nT)} y2={getY(pt.PV)} 
                        stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                      />
                      <line 
                        x1={getX(0)} y1={getY(pt.PV)} 
                        x2={getX(pt.nT)} y2={getY(pt.PV)} 
                        stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                      />
                      <circle 
                        cx={getX(pt.nT)} cy={getY(pt.PV)} 
                        r="5" fill="#facc15" opacity="0.8"
                      />
                    </g>
                  ))}

                  {/* Current State Point (Pulsing) */}
                  <g>
                    <line 
                      x1={getX(current_nT)} y1={getY(0)} 
                      x2={getX(current_nT)} y2={getY(current_PV)} 
                      stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 3"
                    />
                    <line 
                      x1={getX(0)} y1={getY(current_PV)} 
                      x2={getX(current_nT)} y2={getY(current_PV)} 
                      stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 3"
                    />
                    <circle 
                      cx={getX(current_nT)} cy={getY(current_PV)} 
                      r="12" fill="rgba(255, 255, 255, 0.2)" className="animate-ping"
                    />
                    <circle 
                      cx={getX(current_nT)} cy={getY(current_PV)} 
                      r="8" fill="#ffffff" className="shadow-[0_0_15px_rgba(255,255,255,1)]"
                    />
                  </g>
                </svg>
              </div>
            </div>

            {/* Experiment Log Table */}
            {history.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-xl overflow-x-auto">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-300" />
                  Experiment Log
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 text-sm text-white/70">
                      <th className="pb-3 px-2 font-medium">Point</th>
                      <th className="pb-3 px-2 font-medium">n (mol)</th>
                      <th className="pb-3 px-2 font-medium">T (K)</th>
                      <th className="pb-3 px-2 font-medium">V (L)</th>
                      <th className="pb-3 px-2 font-medium">P (atm)</th>
                      <th className="pb-3 px-2 font-medium bg-white/5 rounded-tl-lg">nT</th>
                      <th className="pb-3 px-2 font-medium bg-white/5 rounded-tr-lg">PV</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-mono">
                    {history.map((pt, index) => (
                      <tr key={pt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-2 text-amber-300">#{index + 1}</td>
                        <td className="py-2 px-2">{pt.n.toFixed(1)}</td>
                        <td className="py-2 px-2">{pt.T.toFixed(0)}</td>
                        <td className="py-2 px-2">{pt.V.toFixed(1)}</td>
                        <td className="py-2 px-2">{pt.P.toFixed(2)}</td>
                        <td className="py-2 px-2 bg-white/5 text-orange-200">{pt.nT.toFixed(0)}</td>
                        <td className="py-2 px-2 bg-white/5 text-orange-200">{pt.PV.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}