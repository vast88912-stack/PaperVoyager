import React, { useState, useMemo } from 'react';

const EPSILON = 1e-6;
const isZero = (v: number) => Math.abs(v) < EPSILON;

type Matrix = [[number, number], [number, number]];

const PRESETS: { name: string; matrix: Matrix }[] = [
  { name: 'Saddle Point', matrix: [[1, 2], [3, -1]] },
  { name: 'Stable Node', matrix: [[-2, 0], [0, -3]] },
  { name: 'Unstable Node', matrix: [[2, 1], [0, 3]] },
  { name: 'Stable Spiral', matrix: [[-1, -2], [2, -1]] },
  { name: 'Unstable Spiral', matrix: [[1, -2], [2, 1]] },
  { name: 'Center', matrix: [[0, -2], [2, 0]] },
];

export default function App() {
  const [matrix, setMatrix] = useState<Matrix>([[1, -2], [2, 1]]);

  const updateMatrix = (row: number, col: number, val: number) => {
    const newMatrix = [...matrix] as Matrix;
    newMatrix[row] = [...newMatrix[row]] as [number, number];
    newMatrix[row][col] = isNaN(val) ? 0 : val;
    setMatrix(newMatrix);
  };

  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1];

  // Calculations
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;

  const eigenvalues = useMemo(() => {
    if (isZero(discriminant)) {
      return [{ real: trace / 2, imag: 0 }, { real: trace / 2, imag: 0 }];
    } else if (discriminant > 0) {
      const sqrtD = Math.sqrt(discriminant);
      return [
        { real: (trace + sqrtD) / 2, imag: 0 },
        { real: (trace - sqrtD) / 2, imag: 0 }
      ];
    } else {
      const sqrtD = Math.sqrt(-discriminant);
      return [
        { real: trace / 2, imag: sqrtD / 2 },
        { real: trace / 2, imag: -sqrtD / 2 }
      ];
    }
  }, [trace, discriminant]);

  const stabilityInfo = useMemo(() => {
    if (det < -EPSILON) return { label: 'Saddle Point', color: 'text-rose-600', bg: 'bg-rose-100' };
    if (isZero(det)) return { label: 'Zero Eigenvalue (Line of Equilibria)', color: 'text-slate-600', bg: 'bg-slate-200' };
    
    if (isZero(discriminant)) {
      if (isZero(trace)) return { label: 'Degenerate Center', color: 'text-slate-600', bg: 'bg-slate-200' };
      return trace < 0 
        ? { label: 'Stable Degenerate Node', color: 'text-emerald-600', bg: 'bg-emerald-100' }
        : { label: 'Unstable Degenerate Node', color: 'text-amber-600', bg: 'bg-amber-100' };
    }
    
    if (discriminant > 0) {
      return trace < 0
        ? { label: 'Stable Node', color: 'text-emerald-600', bg: 'bg-emerald-100' }
        : { label: 'Unstable Node', color: 'text-amber-600', bg: 'bg-amber-100' };
    } else {
      if (isZero(trace)) return { label: 'Center', color: 'text-indigo-600', bg: 'bg-indigo-100' };
      return trace < 0
        ? { label: 'Stable Spiral', color: 'text-teal-600', bg: 'bg-teal-100' }
        : { label: 'Unstable Spiral', color: 'text-orange-600', bg: 'bg-orange-100' };
    }
  }, [trace, det, discriminant]);

  // SVG Plot Configuration
  const plotSize = 400;
  const range = 6; 
  const scale = plotSize / (range * 2);
  const center = plotSize / 2;

  const toX = (tr: number) => center + tr * scale;
  const toY = (dt: number) => center - dt * scale;

  // Generate Parabola Path (det = trace^2 / 4)
  const parabolaPoints = useMemo(() => {
    let pts = [];
    for (let x = -range; x <= range; x += 0.1) {
      pts.push(`${toX(x)},${toY((x * x) / 4)}`);
    }
    return pts.join(' ');
  }, [range, scale, center]);

  const formatNumber = (num: number) => {
    return isZero(num) ? "0.00" : num.toFixed(2);
  };

  return (
    <div 
      className="min-h-screen font-sans text-slate-800 p-8 flex flex-col items-center"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}
    >
      <div className="max-w-6xl w-full mb-8 text-center">
        <h1 className="text-4xl font-light tracking-tight text-slate-900 mb-2">
          Trace-Determinant <span className="font-semibold text-indigo-600">Stability Plane</span>
        </h1>
        <p className="text-slate-500">
          Visualize how the trace (τ) and determinant (Δ) of a 2x2 matrix dictate the stability of its origin.
        </p>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Editor & Metrics */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Matrix Editor Card */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Matrix Editor
              </h2>
              <select 
                className="text-sm bg-slate-100 border-none rounded-md px-3 py-1.5 font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                onChange={(e) => {
                  const preset = PRESETS.find(p => p.name === e.target.value);
                  if (preset) setMatrix(preset.matrix);
                }}
              >
                <option value="" disabled selected>Presets...</option>
                {PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex justify-center mb-8">
              <div className="relative inline-block border-l-2 border-r-2 border-slate-800 px-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1].map(row => 
                    [0, 1].map(col => (
                      <input
                        key={`${row}-${col}`}
                        type="number"
                        step="0.1"
                        value={matrix[row][col]}
                        onChange={(e) => updateMatrix(row, col, parseFloat(e.target.value))}
                        className="w-20 text-center text-lg font-mono bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'a', r: 0, c: 0, color: 'text-blue-600' },
                { label: 'b', r: 0, c: 1, color: 'text-emerald-600' },
                { label: 'c', r: 1, c: 0, color: 'text-amber-600' },
                { label: 'd', r: 1, c: 1, color: 'text-rose-600' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <span className={`font-mono font-bold w-4 ${item.color}`}>{item.label}</span>
                  <input 
                    type="range" 
                    min="-5" max="5" step="0.1" 
                    value={matrix[item.r][item.c]}
                    onChange={(e) => updateMatrix(item.r, item.c, parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="font-mono text-sm w-12 text-right text-slate-500">
                    {matrix[item.r][item.c].toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Card */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">System Metrics</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Trace (τ = a + d)</div>
                <div className="text-2xl font-mono text-slate-800">{formatNumber(trace)}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Determinant (Δ)</div>
                <div className="text-2xl font-mono text-slate-800">{formatNumber(det)}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Eigenvalues (λ₁, λ₂)</div>
              <div className="flex flex-col gap-2">
                {eigenvalues.map((eig, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 font-mono text-sm">
                    <span className="text-slate-500">λ{idx + 1}</span>
                    <span>
                      {formatNumber(eig.real)}
                      {!isZero(eig.imag) && (
                        <span className="text-indigo-500">
                          {eig.imag > 0 ? ' + ' : ' - '}
                          {formatNumber(Math.abs(eig.imag))}i
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-center text-center font-medium ${stabilityInfo.bg} ${stabilityInfo.color} border-current/20`}>
              {stabilityInfo.label}
            </div>
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold w-full mb-6 text-center flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Stability Region Map
          </h2>
          
          <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
            <svg width={plotSize} height={plotSize} className="block">
              <defs>
                <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                
                {/* Region Patterns/Gradients for minimal look */}
                <linearGradient id="saddleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fee2e2" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#fee2e2" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Grid */}
              <rect width={plotSize} height={plotSize} fill="url(#grid)" />

              {/* Regions */}
              {/* Saddle (Det < 0) */}
              <rect x="0" y={center} width={plotSize} height={center} fill="url(#saddleGrad)" />
              
              {/* Stable Node (Det > 0, Det < Trace^2 / 4, Trace < 0) */}
              <path 
                d={`M ${center} ${center} L 0 ${center} L 0 ${toY(range*range/4)} L ${parabolaPoints.split(' ').slice(0, parabolaPoints.split(' ').length/2).join(' ')} Z`} 
                fill="#d1fae5" fillOpacity="0.3" 
              />
              
              {/* Unstable Node (Det > 0, Det < Trace^2 / 4, Trace > 0) */}
              <path 
                d={`M ${center} ${center} L ${plotSize} ${center} L ${plotSize} ${toY(range*range/4)} L ${parabolaPoints.split(' ').slice(parabolaPoints.split(' ').length/2).reverse().join(' ')} Z`} 
                fill="#fef3c7" fillOpacity="0.4" 
              />

              {/* Stable Spiral (Det > Trace^2 / 4, Trace < 0) */}
              <path 
                d={`M ${center} ${center} L ${parabolaPoints.split(' ').slice(0, parabolaPoints.split(' ').length/2).reverse().join(' ')} L 0 0 L ${center} 0 Z`} 
                fill="#ccfbf1" fillOpacity="0.4" 
              />

              {/* Unstable Spiral (Det > Trace^2 / 4, Trace > 0) */}
              <path 
                d={`M ${center} ${center} L ${parabolaPoints.split(' ').slice(parabolaPoints.split(' ').length/2).join(' ')} L ${plotSize} 0 L ${center} 0 Z`} 
                fill="#ffedd5" fillOpacity="0.4" 
              />

              {/* Axes */}
              <line x1="0" y1={center} x2={plotSize} y2={center} stroke="#94a3b8" strokeWidth="1.5" />
              <line x1={center} y1="0" x2={center} y2={plotSize} stroke="#94a3b8" strokeWidth="1.5" />
              
              {/* Axis Labels */}
              <text x={plotSize - 15} y={center - 10} fontSize="12" fill="#64748b" fontWeight="bold">τ</text>
              <text x={center + 10} y={15} fontSize="12" fill="#64748b" fontWeight="bold">Δ</text>

              {/* Parabola: Det = Trace^2 / 4 */}
              <polyline 
                points={parabolaPoints} 
                fill="none" 
                stroke="#64748b" 
                strokeWidth="2" 
                strokeDasharray="4 4"
              />

              {/* Region Text Labels (Subtle) */}
              <text x={center / 2} y={center + center / 2} fontSize="12" fill="#ef4444" opacity="0.6" textAnchor="middle" fontWeight="bold">Saddle</text>
              <text x={center / 2} y={center - 15} fontSize="11" fill="#059669" opacity="0.6" textAnchor="middle" fontWeight="bold">Stable Node</text>
              <text x={center + center / 2} y={center - 15} fontSize="11" fill="#d97706" opacity="0.6" textAnchor="middle" fontWeight="bold">Unstable Node</text>
              <text x={center / 2} y={40} fontSize="11" fill="#0d9488" opacity="0.6" textAnchor="middle" fontWeight="bold">Stable Spiral</text>
              <text x={center + center / 2} y={40} fontSize="11" fill="#ea580c" opacity="0.6" textAnchor="middle" fontWeight="bold">Unstable Spiral</text>

              {/* Current Point Marker */}
              {Math.abs(trace) <= range && Math.abs(det) <= range && (
                <g transform={`translate(${toX(trace)}, ${to