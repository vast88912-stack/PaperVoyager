import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Utility & Math Functions ---
const EPSILON = 1e-7;

// Numeric stability guard for floating point comparisons
const isZero = (val: number) => Math.abs(val) < EPSILON;

// Calculate Eigen properties for a 2x2 matrix
const computeEigenProps = (a: number, b: number, c: number, d: number) => {
  const tr = a + d;
  const det = a * d - b * c;
  const delta = tr * tr - 4 * det;

  // Stability for continuous-time linear systems (dx/dt = Ax)
  const isStableContinuous = tr < 0 && det > 0;
  // Stability for discrete-time linear systems (x_k+1 = Ax_k) -> max(|lambda|) < 1
  
  if (delta < -EPSILON) {
    const realPart = tr / 2;
    const imagPart = Math.sqrt(-delta) / 2;
    const maxMag = Math.hypot(realPart, imagPart);
    return {
      type: 'complex',
      tr,
      det,
      realPart,
      imagPart,
      isStableContinuous,
      isStableDiscrete: maxMag < 1,
      maxMag
    };
  }

  // Real eigenvalues
  const l1 = (tr + Math.sqrt(Math.max(0, delta))) / 2;
  const l2 = (tr - Math.sqrt(Math.max(0, delta))) / 2;
  
  const calcEigenvector = (lam: number) => {
    // Solve (A - lam*I)v = 0
    // => (a - lam)x + by = 0
    // => cx + (d - lam)y = 0
    let v1 = { x: b, y: lam - a };
    let v2 = { x: lam - d, y: c };
    
    let norm1 = Math.hypot(v1.x, v1.y);
    let norm2 = Math.hypot(v2.x, v2.y);
    
    if (isZero(norm1) && isZero(norm2)) {
      // Degenerate case (e.g., identity matrix)
      return { x: 1, y: 0 };
    }
    
    // Choose the most numerically stable equation
    if (norm1 > norm2) {
      return { x: v1.x / norm1, y: v1.y / norm1 };
    } else {
      return { x: v2.x / norm2, y: v2.y / norm2 };
    }
  };

  const v1 = calcEigenvector(l1);
  const v2 = calcEigenvector(l2);

  return {
    type: 'real',
    tr,
    det,
    l1,
    l2,
    v1,
    v2,
    isStableContinuous,
    isStableDiscrete: Math.max(Math.abs(l1), Math.abs(l2)) < 1,
    maxMag: Math.max(Math.abs(l1), Math.abs(l2))
  };
};

const PRESETS = [
  { name: 'Identity', m: { a: 1, b: 0, c: 0, d: 1 } },
  { name: 'Rotation (90°)', m: { a: 0, b: -1, c: 1, d: 0 } },
  { name: 'Shear', m: { a: 1, b: 1, c: 0, d: 1 } },
  { name: 'Stretch X', m: { a: 2, b: 0, c: 0, d: 1 } },
  { name: 'Saddle', m: { a: 1, b: 0, c: 0, d: -1 } },
  { name: 'Spiral Sink', m: { a: 0.5, b: -0.5, c: 0.5, d: 0.5 } },
];

export default function App() {
  const [matrix, setMatrix] = useState({ a: 1, b: 0.5, c: 0.2, d: 1 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [powerVec, setPowerVec] = useState({ x: 1, y: 1 }); // Starts at (1,1) normalized visually
  const [stepCount, setStepCount] = useState(0);

  const eigenProps = useMemo(() => computeEigenProps(matrix.a, matrix.b, matrix.c, matrix.d), [matrix]);

  // Power Iteration Animation Step
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPowerVec(prev => {
        const nx = matrix.a * prev.x + matrix.b * prev.y;
        const ny = matrix.c * prev.x + matrix.d * prev.y;
        const mag = Math.hypot(nx, ny);
        if (isZero(mag)) return { x: 1, y: 0 }; // Stability guard
        return { x: nx / mag, y: ny / mag };
      });
      setStepCount(s => s + 1);
    }, 600);
    return () => clearInterval(interval);
  }, [isAnimating, matrix]);

  // Reset animation when matrix changes
  useEffect(() => {
    if (isAnimating) {
      setPowerVec({ x: 1, y: 1 });
      setStepCount(0);
    }
  }, [matrix, isAnimating]);

  const handleInputChange = (field: keyof typeof matrix, value: string) => {
    const num = parseFloat(value);
    setMatrix(prev => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" />
              <path d="M4 12h16" />
              <path d="M12 4v16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Eigen Explorer</h1>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
          Rank 2 Matrix Visualization
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 relative">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.3 }} />

        {/* Left Column: Controls & Analysis */}
        <div className="w-full lg:w-80 flex flex-col gap-6 z-10">
          
          {/* Matrix Editor */}
          <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Transformation Matrix A</h2>
            
            <div className="flex justify-center mb-6">
              <div className="relative flex flex-col gap-2 p-3 border-l-2 border-r-2 border-slate-600 rounded-lg">
                <div className="flex gap-2">
                  <input type="number" step="0.1" value={matrix.a} onChange={(e) => handleInputChange('a', e.target.value)}
                    className="w-16 h-12 bg-slate-950 border border-slate-700 rounded-md text-center text-lg font-mono text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                  <input type="number" step="0.1" value={matrix.b} onChange={(e) => handleInputChange('b', e.target.value)}
                    className="w-16 h-12 bg-slate-950 border border-slate-700 rounded-md text-center text-lg font-mono text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.1" value={matrix.c} onChange={(e) => handleInputChange('c', e.target.value)}
                    className="w-16 h-12 bg-slate-950 border border-slate-700 rounded-md text-center text-lg font-mono text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                  <input type="number" step="0.1" value={matrix.d} onChange={(e) => handleInputChange('d', e.target.value)}
                    className="w-16 h-12 bg-slate-950 border border-slate-700 rounded-md text-center text-lg font-mono text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setMatrix(p.m)}
                  className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 hover:border-slate-500 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          {/* Properties Panel */}
          <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">System Analysis</h2>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-500">Determinant</span>
                <span className="text-white font-semibold">{eigenProps.det.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-500">Trace</span>
                <span className="text-white font-semibold">{eigenProps.tr.toFixed(3)}</span>
              </div>
              
              <div className="pt-2">
                <div className="text-slate-500 mb-2">Eigenvalues (λ)</div>
                {eigenProps.type === 'real' ? (
                  <div className="flex flex-col gap-1">
                    <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-cyan-400">
                      λ₁ = {eigenProps.l1.toFixed(3)}
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-pink-400">
                      λ₂ = {eigenProps.l2.toFixed(3)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-amber-400">
                    λ = {eigenProps.realPart.toFixed(3)} ± {eigenProps.imagPart.toFixed(3)}i
                  </div>
                )}
              </div>

              {/* Stability Badge */}
              <div className="pt-2">
                <div className="text-slate-500 mb-2">Continuous-Time Stability</div>
                {eigenProps.isStableContinuous ? (
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded border border-emerald-400/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Stable (Sink)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-3 py-2 rounded border border-rose-400/20">
                    <span className="