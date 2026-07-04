import React, { useState, useMemo } from 'react';

// --- Numeric Guard & Math Utilities ---
const EPSILON = 1e-9;
const clean = (val: number) => (Math.abs(val) < EPSILON ? 0 : val);

type Matrix2x2 = { a: number; b: number; c: number; d: number };

const PRESETS: Record<string, Matrix2x2> = {
  'Stable Node (Sink)': { a: -2, b: 0, c: 0, d: -3 },
  'Unstable Node (Source)': { a: 2, b: 1, c: 0, d: 3 },
  'Saddle Point': { a: 1, b: 2, c: 3, d: 1 },
  'Stable Spiral': { a: -1, b: -2, c: 2, d: -1 },
  'Unstable Spiral': { a: 1, b: -2, c: 2, d: 1 },
  'Center': { a: 0, b: -3, c: 3, d: 0 },
  'Degenerate Node': { a: -2, b: 1, c: 0, d: -2 },
};

export default function App() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS['Stable Spiral']);

  // --- Derived Math Calculations ---
  const stats = useMemo(() => {
    const { a, b, c, d } = matrix;
    const T = clean(a + d);
    const Det = clean(a * d - b * c);
    const Disc = clean(T * T - 4 * Det);

    let classification = '';
    let stability = '';
    let color = '';

    if (Det < 0) {
      classification = 'Saddle Point';
      stability = 'Unstable';
      color = 'text-rose-500';
    } else if (Det === 0) {
      classification = 'Line of Fixed Points';
      stability = 'Marginal';
      color = 'text-amber-500';
    } else {
      if (Disc > 0) {
        if (T < 0) {
          classification = 'Stable Node (Sink)';
          stability = 'Asymptotically Stable';
          color = 'text-emerald-500';
        } else if (T > 0) {
          classification = 'Unstable Node (Source)';
          stability = 'Unstable';
          color = 'text-rose-500';
        }
      } else if (Disc < 0) {
        if (T < 0) {
          classification = 'Stable Spiral (Sink)';
          stability = 'Asymptotically Stable';
          color = 'text-emerald-500';
        } else if (T > 0) {
          classification = 'Unstable Spiral (Source)';
          stability = 'Unstable';
          color = 'text-rose-500';
        } else {
          classification = 'Center';
          stability = 'Neutrally Stable';
          color = 'text-blue-500';
        }
      } else {
        if (T < 0) {
          classification = 'Degenerate Stable Node';
          stability = 'Asymptotically Stable';
          color = 'text-emerald-500';
        } else if (T > 0) {
          classification = 'Degenerate Unstable Node';
          stability = 'Unstable';
          color = 'text-rose-500';
        } else {
          classification = 'Origin';
          stability = 'Marginal';
          color = 'text-gray-500';
        }
      }
    }

    let eigsStr = '';
    if (Disc >= 0) {
      const l1 = clean((T + Math.sqrt(Disc)) / 2);
      const l2 = clean((T - Math.sqrt(Disc)) / 2);
      eigsStr = `λ₁ = ${l1.toFixed(2)}, λ₂ = ${l2.toFixed(2)}`;
    } else {
      const real = clean(T / 2);
      const imag = clean(Math.sqrt(-Disc) / 2);
      eigsStr = `λ = ${real.toFixed(2)} ± ${imag.toFixed(2)}i`;
    }

    return { T, Det, Disc, classification, stability, color, eigsStr };
  }, [matrix]);

  // --- Handlers ---
  const handleMatrixChange = (key: keyof Matrix2x2, value: string) => {
    const num = parseFloat(value);
    setMatrix((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  // --- SVG Plot Configuration ---
  const SVG_SIZE = 400;
  const DOMAIN = 8; // from -8 to 8
  const mapToSvg = (t: number, d: number) => {
    const x = (t / DOMAIN) * (SVG_SIZE / 2) + SVG_SIZE / 2;
    const y = SVG_SIZE / 2 - (d / DOMAIN) * (SVG_SIZE / 2);
    return { x, y };
  };

  // Generate Parabola Path (Det = T^2 / 4)
  const parabolaPoints = [];
  for (let t = -DOMAIN; t <= DOMAIN; t += 0.2) {
    const d = (t * t) / 4;
    const { x, y } = mapToSvg(t, d);
    parabolaPoints.push(`${x},${y}`);
  }
  const parabolaPath = `M ${parabolaPoints.join(' L ')}`;

  const currentPoint = mapToSvg(stats.T, stats.Det);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex items-center justify-center">
      {/* Background Grid Pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* LEFT COLUMN: Controls & Stats */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Stability & Trace-Determinant
            </h1>
            <p className="text-sm text-slate-600">
              Explore how a 2x2 matrix's trace (<span className="font-serif italic">T</span>) and determinant (<span className="font-serif italic">Δ</span>) completely classify the stability of its origin in a dynamic system.
            </p>
          </div>

          {/* Matrix Editor */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Matrix Editor</h2>
              <select
                className="text-sm bg-slate-100 border-none rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                onChange={(e) => setMatrix(PRESETS[e.target.value])}
                defaultValue="Stable Spiral"
              >
                {Object.keys(PRESETS).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center my-6">
              <div className="relative inline-block">
                <div className="absolute -left-3 top-0 bottom-0 w-2 border-t-2 border-b-2 border-l-2 border-slate-800 rounded-l-sm" />
                <div className="absolute -right-3 top-0 bottom-0 w-2 border-t-2 border-b-2 border-r-2 border-slate-800 rounded-r-sm" />
                
                <div className="grid grid-cols-2 gap-4 p-2">
                  {(['a', 'b', 'c', 'd'] as const).map((key) => (
                    <input
                      key={key}
                      type="number"
                      step="0.1"
                      value={matrix[key]}
                      onChange={(e) => handleMatrixChange(key, e.target.value)}
                      className="w-20 text-center text-lg font-mono bg-slate-50 border border-slate-200 rounded-md py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">System Properties</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Trace (T = a + d)</div>
                <div className="text-xl font-mono font-medium">{stats.T.toFixed(2)}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Determinant (Δ = ad - bc)</div>
                <div className="text-xl font-mono font-medium">{stats.Det.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Eigenvalues</div>
                <div className="text-md font-mono bg-slate-100 px-3 py-2 rounded-lg inline-block">
                  {stats.eigsStr}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-500 mb-1">Classification</div>
                <div className={`text-lg font-bold ${stats.color}`}>
                  {stats.classification}
                </div>
                <div className="text-sm text-slate-600 mt-0.5">
                  {stats.stability}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Trace-Determinant Plane */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-slate-800 mb-6 w-full text-center">Trace-Determinant Plane</h2>
          
          <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
            <svg width={SVG_SIZE} height={SVG_SIZE} className="overflow-visible">
              {/* Regions Shading */}
              {/* Saddle Region (Det < 0) */}
              <rect x="0" y={SVG_SIZE / 2} width={SVG_SIZE} height={SVG_SIZE / 2} fill="#ffe4e6" opacity="0.4" />
              
              {/* Nodes Region (Inside Parabola, Det > 0) */}
              <path d={`M 0 ${SVG_SIZE/2} L 0 0 L ${SVG_SIZE} 0 L ${SVG_SIZE} ${SVG_SIZE/2} Z`} fill="#dcfce7" opacity="0.3" />
              
              {/* Spirals Region (Under Parabola, Det > 0) */}
              <path d={`M 0 ${SVG_SIZE/2} L ${parabolaPoints.join(' L ')} L ${SVG_SIZE} ${SVG_SIZE/2} Z`} fill="#e0e7ff" opacity="0.6" />

              {/* Grid Lines */}
              {Array.from({ length: DOMAIN * 2 + 1 }).map((_, i) => {
                const val = i - DOMAIN;
                const pos = (i / (DOMAIN * 2)) * SVG_SIZE;
                const isAxis = val === 0;
                return (
                  <g key={`grid-${i}`}>
                    <line x1={pos} y1="0" x2={pos} y2={SVG_SIZE} stroke={isAxis ? "#94a3b8" : "#e2e8f0"} strokeWidth={isAxis ? 2 : 1} />
                    <line x1="0" y1={pos} x2={SVG_SIZE} y2={pos} stroke={isAxis ? "#94a3b8" : "#e2e8f0"} strokeWidth={isAxis ? 2 : 1} />
                  </g>
                );
              })}

              {/* Parabola Curve (Det = T^2 / 4) */}
              <path
                d={parabolaPath}
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="6 4"
              />

              {/* Axis Labels */}
              <text x={SVG_SIZE - 10} y={SVG_SIZE / 2 - 10} fontSize="12" fill="#64748b" textAnchor="end" className="font-serif italic font-bold">Trace (T)</text>
              <text x={SVG_SIZE / 2 + 10} y="15" fontSize="12" fill="#64748b" className="font-serif italic font-bold">Det (Δ)</text>
              <text x={SVG_SIZE / 2 + 10} y={SVG_SIZE / 2 - 10} fontSize="10" fill="#94a3b8">0</text>

              {/* Parabola Label */}
              <text x={SVG_SIZE * 0.8} y={SVG_SIZE * 0.15} fontSize="12" fill="#64748b" transform={`rotate(-45 ${SVG_SIZE * 0.8} ${SVG_SIZE * 0.15})`}>
                Δ = T² / 4
              </text>

              {/* Current Point Marker */}
              <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
                <circle r="12" fill="currentColor" className={`${stats.color} opacity-20 animate-ping`} />
                <circle r="6" fill="currentColor" className={`${stats.color} shadow-sm`} />
                <circle r="2" fill="#fff" />
                
                {/* Tooltip-like label */}
                <g transform="translate(10, -10)">
                  <rect x="0" y="-16" width="70" height="20" rx="4" fill="#1e293b" opacity="0.8" />
                  <text x="35" y="-3" fontSize="10" fill="#fff" textAnchor="middle" className="font-mono">
                    ({stats.T.toFixed(1)}, {stats.Det.toFixed(1)})
                  </text>
                </g>
              </g>
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div>
              <span>Stable Nodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300"></div>
              <span>Spirals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></div>
              <span>Saddles</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed border-slate-500"></div>
              <span>Degenerate Nodes</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}