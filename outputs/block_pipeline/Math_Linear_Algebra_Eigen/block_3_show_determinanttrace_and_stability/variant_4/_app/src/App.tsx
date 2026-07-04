import React, { useState, useMemo } from 'react';

// --- Numeric Helpers ---
const EPSILON = 1e-6;
const isZero = (v: number) => Math.abs(v) < EPSILON;

// --- Types ---
type Matrix2x2 = [[number, number], [number, number]];

interface Preset {
  name: string;
  matrix: Matrix2x2;
  description: string;
}

const PRESETS: Preset[] = [
  { name: 'Saddle', matrix: [[1, 2], [3, 0]], description: 'Real roots, opposite signs.' },
  { name: 'Stable Sink', matrix: [[-2, 0], [0, -3]], description: 'Real roots, both negative.' },
  { name: 'Unstable Source', matrix: [[2, 1], [0, 2]], description: 'Real roots, both positive.' },
  { name: 'Stable Spiral', matrix: [[-1, -2], [2, -1]], description: 'Complex roots, negative real part.' },
  { name: 'Unstable Spiral', matrix: [[1, -2], [2, 1]], description: 'Complex roots, positive real part.' },
  { name: 'Center', matrix: [[0, -2], [2, 0]], description: 'Purely imaginary roots.' },
];

export default function App() {
  // State for matrix elements (strings to allow intermediate typing like "-")
  const [a, setA] = useState<string>('0');
  const [b, setB] = useState<string>('-2');
  const [c, setC] = useState<string>('2');
  const [d, setD] = useState<string>('0');

  // Parse safely
  const pa = parseFloat(a) || 0;
  const pb = parseFloat(b) || 0;
  const pc = parseFloat(c) || 0;
  const pd = parseFloat(d) || 0;

  // Compute Trace & Determinant
  const trace = pa + pd;
  const det = pa * pd - pb * pc;

  // Discriminant of characteristic equation: λ^2 - τλ + Δ = 0
  const discriminant = trace * trace - 4 * det;

  // Stability classification
  const classification = useMemo(() => {
    let type = '';
    let color = '';
    let guarded = false;

    // Numeric guard checks
    const safeDet = isZero(det) ? 0 : det;
    const safeTrace = isZero(trace) ? 0 : trace;
    const safeDisc = isZero(discriminant) ? 0 : discriminant;

    if (Math.abs(det) < EPSILON && det !== 0) guarded = true;
    if (Math.abs(trace) < EPSILON && trace !== 0) guarded = true;

    if (safeDet < 0) {
      type = 'Saddle (Unstable)';
      color = 'text-amber-600 bg-amber-50 border-amber-200';
    } else if (safeDet === 0) {
      if (safeTrace === 0) {
        type = 'Origin (Non-isolated)';
        color = 'text-slate-600 bg-slate-50 border-slate-200';
      } else {
        type = 'Line of Fixed Points';
        color = 'text-slate-600 bg-slate-50 border-slate-200';
      }
    } else {
      // det > 0
      if (safeTrace === 0) {
        type = 'Center (Marginally Stable)';
        color = 'text-blue-600 bg-blue-50 border-blue-200';
      } else if (safeTrace < 0) {
        // Stable
        if (safeDisc > 0) type = 'Stable Node (Sink)';
        else if (safeDisc < 0) type = 'Stable Spiral (Sink)';
        else type = 'Stable Degenerate Node';
        color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      } else {
        // Unstable
        if (safeDisc > 0) type = 'Unstable Node (Source)';
        else if (safeDisc < 0) type = 'Unstable Spiral (Source)';
        else type = 'Unstable Degenerate Node';
        color = 'text-rose-700 bg-rose-50 border-rose-200';
      }
    }

    return { type, color, guarded };
  }, [trace, det, discriminant]);

  // Eigenvalues string
  const eigenvaluesText = useMemo(() => {
    const safeDisc = isZero(discriminant) ? 0 : discriminant;
    if (safeDisc >= 0) {
      const root = Math.sqrt(safeDisc);
      const l1 = ((trace + root) / 2).toFixed(3);
      const l2 = ((trace - root) / 2).toFixed(3);
      return `λ₁ = ${l1},  λ₂ = ${l2}`;
    } else {
      const real = (trace / 2).toFixed(3);
      const imag = (Math.sqrt(-safeDisc) / 2).toFixed(3);
      return `λ = ${real} ± ${imag}i`;
    }
  }, [trace, discriminant]);

  // Load preset
  const loadPreset = (mat: Matrix2x2) => {
    setA(mat[0][0].toString());
    setB(mat[0][1].toString());
    setC(mat[1][0].toString());
    setD(mat[1][1].toString());
  };

  // --- SVG Coordinate Mapping ---
  // We use a 500x500 grid. Trace from -5 to 5, Det from -5 to 5.
  const mapX = (t: number) => 250 + t * 50;
  const mapY = (d: number) => 250 - d * 50;

  // Generate Parabola Path (Δ = τ²/4)
  const parabolaPoints = useMemo(() => {
    let pts = '';
    for (let t = -5; t <= 5; t += 0.1) {
      const x = mapX(t);
      const y = mapY((t * t) / 4);
      pts += `${x},${y} `;
    }
    return pts.trim();
  }, []);

  // Handle clicking on the chart to set companion matrix
  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Reverse map to trace and determinant
    const newTrace = (x - 250) / 50;
    const newDet = (250 - y) / 50;

    // Use Companion Matrix: [[trace, -det], [1, 0]]
    setA(newTrace.toFixed(2));
    setB((-newDet).toFixed(2));
    setC('1');
    setD('0');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full w-max text-xs font-semibold tracking-wide uppercase text-slate-500 shadow-sm">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Eigen Explorer
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Stability & Trace-Determinant</h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Understand dynamic systems by visualizing the relationship between a matrix's trace ($\tau$), determinant ($\Delta$), and the resulting stability of the origin.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Controls & Metrics */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Matrix Editor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Matrix Editor</h2>
              
              <div className="flex justify-center mb-6">
                <div className="relative inline-flex items-center gap-4">
                  <div className="w-2 h-24 border-l-2 border-t-2 border-b-2 border-slate-800 rounded-l-md"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      value={a}
                      onChange={(e) => setA(e.target.value)}
                      className="w-20 text-center text-xl font-mono bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <input
                      type="number"
                      value={b}
                      onChange={(e) => setB(e.target.value)}
                      className="w-20 text-center text-xl font-mono bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <input
                      type="number"
                      value={c}
                      onChange={(e) => setC(e.target.value)}
                      className="w-20 text-center text-xl font-mono bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <input
                      type="number"
                      value={d}
                      onChange={(e) => setD(e.target.value)}
                      className="w-20 text-center text-xl font-mono bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="w-2 h-24 border-r-2 border-t-2 border-b-2 border-slate-800 rounded-r-md"></div>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 mt-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => loadPreset(p.matrix)}
                    title={p.description}
                    className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trace (τ = a+d)</span>
                <span className="text-2xl font-mono font-medium text-slate-800">{trace.toFixed(2)}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Det (Δ = ad-bc)</span>
                <span className="text-2xl font-mono font-medium text-slate-800">{det.toFixed(2)}</span>
              </div>
            </div>

            {/* Characteristic Equation & Eigenvalues */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Characteristic Equation</h2>
              <div className="font-mono text-lg mb-4 text-slate-700">
                λ² {trace < 0 ? '+' : '-'} {Math.abs(trace).toFixed(2)}λ {det < 0 ? '-' : '+'} {Math.abs(det).toFixed(2)} = 0
              </div>
              
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Eigenvalues</h2>
              <div className="font-mono text-lg text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {eigenvaluesText}
              </div>

              {classification.guarded && (
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Numeric Stability Guard Active (Near Zero)
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Visualization */}
          <div className="lg:col-span-7">
            <div className={`p-6 rounded-3xl border-2 transition-colors duration-500 ${classification.color} relative bg-white`}>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider opacity-70 mb-1">Stability Region</h2>
                  <div className="text-2xl font-bold">{classification.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-60">Discriminant (D)</div>
                  <div className="text-xl font-mono mt-1 opacity-90">{discriminant.toFixed(2)}</div>
                </div>
              </div>

              {/* Trace-Determinant Diagram (SVG) */}
              <div className="relative w-full aspect-square bg-white rounded-2xl border border-black/5 shadow-inner overflow-hidden cursor-crosshair">
                <svg
                  viewBox="0 0 500 500"
                  className="w-full h-full"
                  onClick={handleChartClick}
                >
                  {/* Grid Lines */}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <line x1={0} y1={i * 50} x2={500} y2={i * 50} stroke="#e2e8f0" strokeWidth="1" />
                      <line x1={i * 50} y1={0} x2={i * 50} y2={500} stroke="#e2e8f0" strokeWidth="1" />
                    </React.Fragment>
                  ))}

                  {/* Regions Backgrounds */}
                  {/* Saddle (Det < 0) */}
                  <rect x="0" y="250" width="500" height="250" fill="#fef3c7" opacity="0.4" />
                  {/* Stable (Det > 0, Trace < 0) */}
                  <rect x="0" y="0" width="250" height="250" fill="#ecfdf5" opacity="0.4" />
                  {/* Unstable (Det > 0, Trace > 0) */}
                  <rect x="250" y="0" width="250" height="250" fill="#fff1f2" opacity="0.4" />

                  {/* Parabola Fill (Complex Region D < 0) */}
                  <path
                    d={`M 0,0 L ${parabolaPoints} L 500,0 Z`}
                    fill="#000000"
                    opacity="0.04"
                  />

                  {/* Axes */}
                  <line x1="0" y1="250" x2="500" y2="250" stroke="#94a3b8" strokeWidth="2" />
                  <line x1="250" y1="0" x2="250" y2="500" stroke="#94a3b8" strokeWidth="2" />

                  {/* Parabola Line (D = 0) */}
                  <polyline
                    points={parabolaPoints}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />

                  {/* Axis Labels */}
                  <text x="480" y="240" fontSize="12" fill="#64748b" textAnchor="end">Trace (τ)</text>
                  <text x="260" y="20" fontSize="12" fill="#64748b">Det (Δ)</text>

                  {/* Plot current point */}
                  <g transform={`translate(${mapX(trace)}, ${mapY(det)})`}>
                    {/* Ripple animation */}
                    <circle r="12" fill="currentColor" className="opacity-20 animate-ping" />
                    <circle r="6" fill="currentColor" stroke="#fff" strokeWidth="2" className="drop-shadow-md" />
                  </g>
                </svg>

                {/* Overlay Hint */}
                <div className="absolute bottom-4 left-4 pointer-events-none bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 shadow-sm">
                  Click anywhere on the chart to generate a companion matrix
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}