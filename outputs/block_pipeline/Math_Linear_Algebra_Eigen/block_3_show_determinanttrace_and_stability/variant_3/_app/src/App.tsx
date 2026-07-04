import React, { useState, useMemo } from 'react';

// Type definitions
type Matrix = [[number, number], [number, number]];
type SystemType = 'continuous' | 'discrete';
type Complex = { re: number; im: number };

// Presets
const PRESETS: Record<string, Matrix> = {
  'Stable Spiral (Cont.)': [[-0.5, -1], [1, -0.5]],
  'Unstable Spiral (Cont.)': [[0.5, -1], [1, 0.5]],
  'Saddle': [[1, 0], [0, -1]],
  'Stable Node (Cont.)': [[-2, 0], [0, -3]],
  'Stable (Discrete)': [[0.5, -0.2], [0.2, 0.5]],
  'Center (Pure Complex)': [[0, -2], [2, 0]],
};

export default function App() {
  const [matrix, setMatrix] = useState<Matrix>(PRESETS['Stable Spiral (Cont.)']);
  const [systemType, setSystemType] = useState<SystemType>('continuous');

  // Input handler with numeric stability guard
  const handleMatrixChange = (r: number, c: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    
    // Numeric stability guard: clamp values between -20 and 20
    const clamped = Math.max(-20, Math.min(20, num));
    
    setMatrix(prev => {
      const next = [[...prev[0]], [...prev[1]]] as Matrix;
      next[r][c] = clamped;
      return next;
    });
  };

  // Math Calculations
  const calcMath = useMemo(() => {
    const [[a, b], [c, d]] = matrix;
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;
    
    let eig1: Complex, eig2: Complex;
    let isComplex = false;

    if (discriminant >= 0) {
      eig1 = { re: (trace + Math.sqrt(discriminant)) / 2, im: 0 };
      eig2 = { re: (trace - Math.sqrt(discriminant)) / 2, im: 0 };
    } else {
      isComplex = true;
      const imPart = Math.sqrt(-discriminant) / 2;
      eig1 = { re: trace / 2, im: imPart };
      eig2 = { re: trace / 2, im: -imPart };
    }

    // Stability checks
    let isStable = false;
    let stabilityReason = '';

    if (systemType === 'continuous') {
      // Re(lambda) < 0
      isStable = eig1.re < 0 && eig2.re < 0;
      if (isStable) {
        stabilityReason = 'Both eigenvalues have negative real parts.';
      } else {
        stabilityReason = 'At least one eigenvalue has a non-negative real part.';
      }
    } else {
      // |lambda| < 1
      const mag1 = Math.sqrt(eig1.re * eig1.re + eig1.im * eig1.im);
      const mag2 = Math.sqrt(eig2.re * eig2.re + eig2.im * eig2.im);
      isStable = mag1 < 1 && mag2 < 1;
      if (isStable) {
        stabilityReason = 'Both eigenvalues have magnitude < 1.';
      } else {
        stabilityReason = 'At least one eigenvalue has magnitude ≥ 1.';
      }
    }

    // Classification based on Trace-Determinant plane
    let classification = '';
    if (det < 0) classification = 'Saddle Point';
    else if (discriminant === 0) classification = 'Degenerate Node';
    else if (discriminant > 0) classification = trace > 0 ? 'Unstable Node' : 'Stable Node';
    else if (trace === 0) classification = 'Center';
    else classification = trace > 0 ? 'Unstable Spiral' : 'Stable Spiral';

    return { trace, det, discriminant, eig1, eig2, isComplex, isStable, stabilityReason, classification };
  }, [matrix, systemType]);

  const { trace, det, discriminant, eig1, eig2, isComplex, isStable, stabilityReason, classification } = calcMath;

  // SVG Trace-Det Plane Helpers
  const SVG_SIZE = 400;
  const RANGE = 5; // -5 to 5
  const mapCoord = (t: number, d: number) => {
    const x = (t + RANGE) / (2 * RANGE) * SVG_SIZE;
    const y = SVG_SIZE - ((d + RANGE) / (2 * RANGE) * SVG_SIZE);
    return { x, y };
  };

  // Parabola Path: det = trace^2 / 4
  const parabolaPath = useMemo(() => {
    return Array.from({ length: 101 }, (_, i) => {
      const t = -RANGE + (i * 2 * RANGE) / 100;
      const d = (t * t) / 4;
      const { x, y } = mapCoord(t, d);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, []);

  // Discrete Stability Triangle: det < 1, det > trace - 1, det > -trace - 1
  const discretePoly = useMemo(() => {
    const p1 = mapCoord(2, 1);
    const p2 = mapCoord(-2, 1);
    const p3 = mapCoord(0, -1);
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
  }, []);

  // Continuous Stability Rect: trace < 0, det > 0
  const continuousRect = useMemo(() => {
    const topLeft = mapCoord(-RANGE, RANGE);
    const bottomRight = mapCoord(0, 0);
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }, []);

  const formatComplex = (c: Complex) => {
    if (Math.abs(c.im) < 0.0001) return c.re.toFixed(3);
    const sign = c.im >= 0 ? '+' : '-';
    return `${c.re.toFixed(3)} ${sign} ${Math.abs(c.im).toFixed(3)}i`;
  };

  const currentPt = mapCoord(trace, det);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 md:p-8 relative overflow-hidden">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Eigen Explorer</h1>
          <p className="text-slate-500 mt-1">Trace-Determinant Plane & Stability Analysis</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Editor & Stats */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Matrix Editor */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Matrix Editor</h2>
                <select 
                  className="bg-slate-100 border-none text-sm rounded-lg py-1 px-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(e) => setMatrix(PRESETS[e.target.value])}
                >
                  <option value="" disabled selected>Presets...</option>
                  {Object.keys(PRESETS).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="relative inline-block border-l-2 border-r-2 border-slate-800 px-3 py-1">
                  <div className="absolute top-0 left-0 w-2 h-0.5 bg-slate-800" />
                  <div className="absolute bottom-0 left-0 w-2 h-0.5 bg-slate-800" />
                  <div className="absolute top-0 right-0 w-2 h-0.5 bg-slate-800" />
                  <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-slate-800" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[0, 1].map(r => (
                      [0, 1].map(c => (
                        <input
                          key={`${r}-${c}`}
                          type="number"
                          step="0.1"
                          value={matrix[r][c]}
                          onChange={(e) => handleMatrixChange(r, c, e.target.value)}
                          className="w-16 h-12 text-center text-lg font-mono bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ))
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Properties Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">System Properties</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 font-semibold uppercase">Trace (T)</div>
                    <div className="text-xl font-mono mt-1">{trace.toFixed(3)}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 font-semibold uppercase">Determinant (Δ)</div>
                    <div className="text-xl font-mono mt-1">{det.toFixed(3)}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold uppercase mb-2">Eigenvalues (λ)</div>
                  <div className="font-mono flex flex-col gap-1">
                    <div>λ₁ = <span className={isComplex ? "text-indigo-600 font-bold" : ""}>{formatComplex(eig1)}</span></div>
                    <div>λ₂ = <span className={isComplex ? "text-indigo-600 font-bold" : ""}>{formatComplex(eig2)}</span></div>
                  </div>
                </div>

                {/* Complex Explanation Block */}
                {isComplex && (
                  <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg text-sm text-indigo-900">
                    <p><strong>Complex Eigenvalues Detected:</strong> Because the discriminant <code className="bg-indigo-100 px-1 rounded">T² - 4Δ &lt; 0</code>, the eigenvalues are complex conjugates. This indicates the vector field has a rotational component (spirals or centers).</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stability Card */}
            <div className={`p-6 rounded-2xl shadow-sm border transition-colors duration-300 ${isStable ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${isStable ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {isStable ? 'System is Stable' : 'System is Unstable'}
                </h2>
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                  <button
                    onClick={() => setSystemType('continuous')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${systemType === 'continuous' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Continuous
                  </button>
                  <button
                    onClick={() => setSystemType('discrete')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${systemType === 'discrete' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Discrete
                  </button>
                </div>
              </div>
              <p className={`text-sm ${isStable ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stabilityReason}
              </p>
              <div className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isStable ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                Classification: {classification}
              </div>
            </div>

          </div>

          {/* Right Column: Trace-Determinant Diagram */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-grow flex flex-col">
              <h2 className="text-lg font-bold mb-2">Trace-Determinant Plane (Poincaré Diagram)</h2>
              <p className="text-sm text-slate-500 mb-6">Visualizing the roots of the characteristic equation <code className="bg-slate-100 px-1 rounded text-slate-700">λ² - Tλ + Δ = 0</code></p>
              
              <div className="flex-grow flex items-center justify-center relative">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} 
                  className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden"
                  style={{ maxHeight: '500px', maxWidth: '500px' }}
                >
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                    </pattern>
                  </defs>

                  {/* Grid */}
                  <rect width={SVG_SIZE} height={SVG_SIZE} fill="url(#grid)" />

                  {/* Stability Regions */}
                  {systemType === 'continuous' ? (
                    <rect 
                      x={continuousRect.x} 
                      y={continuousRect.y} 
                      width={continuousRect.width} 
                      height={continuousRect.height} 
                      fill="#10b981" 
                      opacity="0.15" 
                    />
                  ) : (
                    <polygon 
                      points={discretePoly} 
                      fill="#10b981" 
                      opacity="0.15" 
                    />
                  )}

                  {/* Axes */}
                  <line x1={SVG_SIZE/2} y1="0" x2={SVG_SIZE/2} y2={SVG_SIZE} stroke="#94a3b8" strokeWidth="2" />
                  <line x1="0" y1={SVG_SIZE/2} x2={SVG_SIZE} y2={SVG_SIZE/2} stroke="#94a3b8" strokeWidth="2" />
                  
                  {/* Axis Labels */}
                  <text x={SVG_SIZE - 40} y={SVG_SIZE/2 - 10} fill="#64748b" fontSize="12" fontWeight="bold">Trace (T)</text>
                  <text x={SVG_SIZE/2 + 10} y="20" fill="#64748b" fontSize="12" fontWeight="bold">Det (Δ)</text>

                  {/* Parabola T^2 = 4*Det */}
                  <path d={parabolaPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6,4" />

                  {/* Static Labels for Regions */}
                  <text x={SVG_SIZE/2 - 60} y="40" fill="#6366f1" fontSize="10" fontWeight="bold" opacity="0.6">Complex Roots</text>
                  <text x={SVG_SIZE/2 - 120} y={SVG_SIZE/2 - 40} fill="#475569" fontSize="10" fontWeight="bold" opacity="0.6">Real Roots</text>
                  <text x={SVG_SIZE/2 + 60} y={SVG_SIZE/2 - 40} fill="#475569" fontSize="10" fontWeight="bold" opacity="0.6">Real Roots</text>
                  <text x={SVG_SIZE/2 + 40} y={SVG_SIZE - 40} fill="#ef4444" fontSize="10" fontWeight="bold" opacity="0.6">Saddles (Δ &lt; 0)</text>

                  {/* Crosshairs to current point */}
                  <line 
                    x1={currentPt.x} 
                    y1={SVG_SIZE/2} 
                    x2={currentPt.x} 
                    y2={currentPt.y} 
                    stroke="#cbd5e1" 
                    strokeWidth="1" 
                    strokeDasharray="4,2" 
                  />
                  <line 
                    x1={SVG_SIZE/2} 
                    y1={currentPt.y} 
                    x2={currentPt.x} 
                    y2={currentPt.y} 
                    stroke="#cbd5e1" 
                    strokeWidth="1" 
                    strokeDasharray="4,2" 
                  />

                  {/* Current Point */}
                  <circle 
                    cx={currentPt.x} 
                    cy={currentPt.y} 
                    r="6" 
                    fill={isStable ? '#10b981' : '#f43f5e'} 
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />

                  {/* Tooltip near current point */}
                  <g transform={`translate(${currentPt.x < SVG_SIZE - 100 ? currentPt.x + 12 : currentPt.x - 110}, ${currentPt.y < 40 ? currentPt.y + 20 : currentPt.y - 12})`}>
                    <rect x="0" y="0" width="100" height="24" fill="white" rx="4" stroke="#e2e8f0" />
                    <text x="50" y="16" fill="#334155" fontSize="10" fontWeight="bold" textAnchor="middle">
                      ({trace.toFixed(1)}, {det.toFixed(1)})
                    </text>
                  </g>

                </svg>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-500"></div>
                  <span>Stable Region</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0 border-t-2 border-dashed border-indigo-500"></div>
                  <span>Δ = T²/4 (Repeated Roots)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rose-500 border border-white"></div>
                  <span>Unstable Point</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
                  <span>Stable Point</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}