import React, { useState, useMemo } from 'react';

// --- Math & Utility Functions ---

const EPSILON = 1e-9;
const cleanZero = (val: number) => (Math.abs(val) < EPSILON ? 0 : val);

type Matrix = [[number, number], [number, number]];

interface SystemStats {
  trace: number;
  det: number;
  discriminant: number;
  eigenvalues: {
    isComplex: boolean;
    val1: string;
    val2: string;
  };
  classification: string;
  stability: 'stable' | 'unstable' | 'marginal' | 'saddle';
}

function analyzeMatrix(matrix: Matrix): SystemStats {
  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1];

  const trace = cleanZero(a + d);
  const det = cleanZero(a * d - b * c);
  const discriminant = cleanZero(trace * trace - 4 * det);

  let isComplex = false;
  let val1 = '';
  let val2 = '';

  if (discriminant >= 0) {
    const e1 = cleanZero((trace + Math.sqrt(discriminant)) / 2);
    const e2 = cleanZero((trace - Math.sqrt(discriminant)) / 2);
    val1 = e1.toFixed(2);
    val2 = e2.toFixed(2);
  } else {
    isComplex = true;
    const real = cleanZero(trace / 2);
    const imag = cleanZero(Math.sqrt(-discriminant) / 2);
    val1 = `${real.toFixed(2)} + ${imag.toFixed(2)}i`;
    val2 = `${real.toFixed(2)} - ${imag.toFixed(2)}i`;
  }

  let classification = '';
  let stability: 'stable' | 'unstable' | 'marginal' | 'saddle' = 'unstable';

  if (det < 0) {
    classification = 'Saddle Point';
    stability = 'saddle';
  } else if (det > 0) {
    if (trace > 0) {
      classification = discriminant >= 0 ? 'Unstable Node' : 'Unstable Spiral';
      stability = 'unstable';
    } else if (trace < 0) {
      classification = discriminant >= 0 ? 'Stable Node' : 'Stable Spiral';
      stability = 'stable';
    } else {
      classification = 'Center';
      stability = 'marginal';
    }
  } else {
    if (trace > 0) {
      classification = 'Unstable Line of Equilibria';
      stability = 'unstable';
    } else if (trace < 0) {
      classification = 'Stable Line of Equilibria';
      stability = 'stable';
    } else {
      classification = 'Plane of Equilibria';
      stability = 'marginal';
    }
  }

  return { trace, det, discriminant, eigenvalues: { isComplex, val1, val2 }, classification, stability };
}

// --- Components ---

const PRESETS: Record<string, Matrix> = {
  'Stable Spiral': [[-0.5, -2], [2, -0.5]],
  'Stable Node': [[-2, 0], [0, -3]],
  'Unstable Spiral': [[0.5, -2], [2, 0.5]],
  'Saddle': [[1, 2], [3, 0]],
  'Center': [[0, -2], [2, 0]],
};

export default function App() {
  const [matrix, setMatrix] = useState<Matrix>([[-0.5, -2], [2, -0.5]]);

  const stats = useMemo(() => analyzeMatrix(matrix), [matrix]);

  const handleMatrixChange = (row: number, col: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix;
    newMatrix[row][col] = num;
    setMatrix(newMatrix);
  };

  // SVG Coordinate Mapping
  const SVG_SIZE = 400;
  const DOMAIN = 8; // -8 to 8
  const mapX = (t: number) => (SVG_SIZE / 2) + (t * (SVG_SIZE / (2 * DOMAIN)));
  const mapY = (d: number) => (SVG_SIZE / 2) - (d * (SVG_SIZE / (2 * DOMAIN)));

  // Generate Parabola Path (Δ = τ²/4)
  const parabolaPath = useMemo(() => {
    let path = `M ${mapX(-DOMAIN)} ${mapY(Math.pow(-DOMAIN, 2) / 4)}`;
    for (let t = -DOMAIN; t <= DOMAIN; t += 0.2) {
      path += ` L ${mapX(t)} ${mapY((t * t) / 4)}`;
    }
    return path;
  }, []);

  const stabilityColors = {
    stable: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    unstable: 'bg-rose-100 text-rose-800 border-rose-300',
    marginal: 'bg-amber-100 text-amber-800 border-amber-300',
    saddle: 'bg-slate-200 text-slate-800 border-slate-300',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Trace-Determinant Plane
          </h1>
          <p className="text-slate-600 max-w-2xl">
            Explore the stability of 2x2 linear systems. The trace (τ) and determinant (Δ) of a matrix completely determine the nature of its eigenvalues and the stability of the origin.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls & Stats */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Matrix Editor */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Matrix Editor</h2>
              <div className="flex items-center justify-center mb-6">
                <div className="relative flex flex-col gap-2 p-4 border-l-2 border-r-2 border-slate-800 rounded-lg">
                  <div className="flex gap-2">
                    <input type="number" step="0.1" value={matrix[0][0]} onChange={(e) => handleMatrixChange(0, 0, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    <input type="number" step="0.1" value={matrix[0][1]} onChange={(e) => handleMatrixChange(0, 1, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div className="flex gap-2">
                    <input type="number" step="0.1" value={matrix[1][0]} onChange={(e) => handleMatrixChange(1, 0, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    <input type="number" step="0.1" value={matrix[1][1]} onChange={(e) => handleMatrixChange(1, 1, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-50 border border-slate-200 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(PRESETS).map(([name, mat]) => (
                  <button
                    key={name}
                    onClick={() => setMatrix(mat)}
                    className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className={`p-4 rounded-xl border ${stabilityColors[stats.stability]} flex items-center justify-between`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">System Classification</p>
                  <p className="text-lg font-semibold">{stats.classification}</p>
                </div>
                {stats.stability === 'stable' && (
                  <svg className="w-8 h-8 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                {stats.stability === 'unstable' && (
                  <svg className="w-8 h-8 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Trace (τ)</p>
                  <p className="text-2xl font-mono font-medium text-slate-800">{stats.trace.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-1">λ₁ + λ₂</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Determinant (Δ)</p>
                  <p className="text-2xl font-mono font-medium text-slate-800">{stats.det.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-1">λ₁ × λ₂</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-500 mb-2">Eigenvalues (λ)</p>
                <div className="font-mono text-slate-800 space-y-1">
                  {stats.eigenvalues.isComplex ? (
                    <p>λ = {stats.eigenvalues.val1.replace('+', '±')}</p>
                  ) : (
                    <>
                      <p>λ₁ = {stats.eigenvalues.val1}</p>
                      <p>λ₂ = {stats.eigenvalues.val2}</p>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-3 border-t border-slate-200 pt-2">
                  Discriminant (τ² - 4Δ) = {stats.discriminant.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-grow flex flex-col items-center justify-center relative">
              
              <div className="absolute top-6 left-6 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded-sm"></div> Stable (Sink)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-