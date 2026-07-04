import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Types ---
type Matrix = [number, number, number, number]; // [a, b, c, d] for a 2x2 matrix
type Vector = [number, number]; // [x, y]

// --- Math Utilities ---
const EPSILON = 1e-9;

const multMatVec = (m: Matrix, v: Vector): Vector => {
  return [
    m[0] * v[0] + m[1] * v[1],
    m[2] * v[0] + m[3] * v[1]
  ];
};

const dotProduct = (v1: Vector, v2: Vector): number => {
  return v1[0] * v2[0] + v1[1] * v2[1];
};

const getNorm = (v: Vector): number => {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
};

const normalize = (v: Vector): Vector => {
  const norm = getNorm(v);
  // Numeric stability guard: prevent divide by zero
  if (norm < EPSILON) return [0, 0];
  return [v[0] / norm, v[1] / norm];
};

const getDet = (m: Matrix) => m[0] * m[3] - m[1] * m[2];
const getTrace = (m: Matrix) => m[0] + m[3];

// Generate the power iteration sequence
const generateSequence = (m: Matrix, start: Vector, steps: number) => {
  const seq: { v: Vector; rayleigh: number; isZero: boolean }[] = [];
  let current = normalize(start);
  
  for (let i = 0; i < steps; i++) {
    const Av = multMatVec(m, current);
    const rayleigh = dotProduct(current, Av); // v^T A v (since v is normalized)
    const norm = getNorm(Av);
    
    seq.push({ v: current, rayleigh, isZero: norm < EPSILON });
    
    if (norm < EPSILON) {
      current = [0, 0]; // Collapsed to zero
    } else {
      current = [Av[0] / norm, Av[1] / norm];
    }
  }
  return seq;
};

// --- Presets ---
const PRESETS: Record<string, Matrix> = {
  'Scaling': [1.2, 0, 0, 0.8],
  'Shear': [1, 1.5, 0, 1],
  'Rotation (Complex)': [0.5, -0.866, 0.866, 0.5],
  'Markov': [0.8, 0.3, 0.2, 0.7],
  'Saddle': [1.5, 0, 0, -0.5]
};

export default function App() {
  // --- State ---
  const [matrix, setMatrix] = useState<Matrix>([1.2, 0.3, 0.2, 0.9]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const MAX_STEPS = 50;

  // Initial random-ish vector for power iteration
  const v0: Vector = useMemo(() => normalize([1, 1]), []);

  // Compute sequence whenever matrix changes
  const sequence = useMemo(() => generateSequence(matrix, v0, MAX_STEPS), [matrix, v0]);

  // Derived Matrix Properties
  const det = getDet(matrix);
  const trace = getTrace(matrix);
  const discriminant = trace * trace - 4 * det;
  const hasComplex = discriminant < -EPSILON;
  
  // Discrete Stability Region: |lambda| < 1
  // For 2x2, max(|lambda|) < 1 iff |trace| < 1 + det AND det < 1
  const isStable = Math.abs(trace) < 1 + det && det < 1;

  // Current iteration stats
  const currentIteration = sequence[step] || sequence[0];

  // --- Animation Effect ---
  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      timer = window.setInterval(() => {
        setStep((s) => {
          if (s >= MAX_STEPS - 1) {
            setIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 400); // 400ms per step
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Handle matrix input changes
  const handleMatrixChange = (index: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix;
    newMatrix[index] = num;
    setMatrix(newMatrix);
    setStep(0);
    setIsPlaying(false);
  };

  const loadPreset = (m: Matrix) => {
    setMatrix(m);
    setStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-6xl mb-6">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Eigen<span className="font-semibold text-emerald-400">Explorer</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Visualize dominant eigenvector discovery through Power Iteration.
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Information */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Matrix Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4">Matrix Input (A)</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="number"
                  step="0.1"
                  value={matrix[i]}
                  onChange={(e) => handleMatrixChange(i, e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded text-center py-2 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors outline-none"
                />
              ))}
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Presets</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([name, m]) => (
                <button
                  key={name}
                  onClick={() => loadPreset(m)}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 hover:border-slate-500"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Determinant</span>
              <span className="font-mono text-emerald-300">{det.toFixed(4)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Trace</span>
              <span className="font-mono text-emerald-300">{trace.toFixed(4)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Discriminant (Δ)</span>
              <span className="font-mono text-emerald-300">{discriminant.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Discrete Stability</span>
              <span className={`font-mono ${isStable ? 'text-blue-400' : 'text-rose-400'}`}>
                {isStable ? 'Convergent (Sink)' : 'Divergent (Source/Saddle)'}
              </span>
            </div>
          </div>

          {/* Complex Eigenvalues Explanation Card */}
          <div className={`transition-all duration-500 border rounded-xl p-5 ${hasComplex ? 'bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
            <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${hasComplex ? 'text-indigo-300' : 'text-slate-500'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Complex Eigenvalues
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              When Δ &lt; 0, the matrix incorporates a rotational component, resulting in complex eigenvalues. Power iteration seeks a single dominant stretch direction. Without real eigenvalues, the sequence will not converge to a steady vector but will perpetually orbit or jump.
            </p>
            {hasComplex && (
              <div className="mt-3 text-xs font-mono text-indigo-400 bg-indigo-950/50 p-2 rounded border border-indigo-900/50 inline-block">
                Rotation detected!
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Visualization & Animation Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Visualization Stage */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative aspect-square max-h-[600px] flex items-center justify-center">
            
            {/* SVG Canvas */}
            <svg
              className="w-full h-full"
              viewBox="-1.5 -1.5 3 3"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Grid Pattern */}
                <pattern id="grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
                  <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#1e293b" strokeWidth="0.01" />
                </pattern>
                
                {/* Arrowhead marker for vectors */}
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#34d399" />
                </marker>
                <marker id="arrowhead-ghost" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#334155" />
                </marker>
              </defs>

              {/* Grid Background */}
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="url(#grid)" />

              {/* Axes */}
              <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke="#334155" strokeWidth="0.01" />
              <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#334155" strokeWidth="0.01" />

              {/* Unit Circle */}
              <circle cx="0" cy="0" r="1" fill="none" stroke="#334155" strokeWidth="0.01" strokeDasharray="0.05 0.05" />

              {/* Coordinate System Transformation (Y up) */}
              <g transform="scale(1, -1)">
                
                {/* Historical Trail (Polyline connecting vector tips) */}
                <polyline
                  points={sequence.slice(0, step + 1).map(s => `${s.v[0]},${s.v[1]}`).join(' ')}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="0.015"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Draw previous vectors lightly */}
                {sequence.slice(Math.max(0, step - 5), step).map((s, i) => (
                  <line
                    key={i}
                    x1="0" y1="0"
                    x2={s.v[0]} y2={s.v[1]}
                    stroke="#334155"
                    strokeWidth="0.015"
                    markerEnd="url(#arrowhead-ghost)"
                    opacity={0.2 + (i / 5) * 0.5}
                  />
                ))}

                {/* Current Vector (Animated transition) */}
                {!currentIteration.isZero && (
                  <line
                    x1="0" y1="0"
                    x2={currentIteration.v[0]} y2={currentIteration.v[1]}
                    stroke="#34d399"
                    strokeWidth="0.03"
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-300 ease-out"
                  />
                )}
                
                {/* Current Vector Tip Dot */}
                {!currentIteration.isZero && (
                  <circle
                    cx={currentIteration.v[0]}
                    cy={currentIteration.v[1]}
                    r="0.04"
                    fill="#10b981"
                    className="transition-all duration-300 ease-out"
                  />
                )}
              </g>
            </svg>

            {/* Zero-collapse warning overlay */}
            {currentIteration.isZero && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <div className="bg-rose-950/50 border border-rose-900 text-rose-300 px-6 py-4 rounded-xl text-center shadow-2xl">
                  <p className="font-semibold mb-1">Null Space Reached</p>
                  <p className="text-sm opacity-80">Vector collapsed to zero (eigenvalue 0).</p>
                </div>
              </div>
            )}
          </div>

          {/* Animation Controls & Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row gap-6 items-center justify-between">
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (step >= MAX_STEPS - 1) setStep(0);
                  setIsPlaying(!isPlaying);
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                  isPlaying 
                    ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                }`}
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                )}
              </button>
              
              <button
                onClick={() => { setIsPlaying(false); setStep(Math.max(0, step - 1)); }}
                className="p-2 rounded hover:bg-slate-800 text-slate-400 transition-colors disabled:opacity-30"
                disabled={step === 0}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>

              <button
                onClick={() => { setIsPlaying(false); setStep(Math.min(MAX_STEPS - 1, step + 1)); }}
                className="p-2 rounded hover:bg-slate-800 text-slate-400 transition-colors disabled:opacity-30"
                disabled={step >= MAX_STEPS - 1}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              
              <button
                onClick={() => { setIsPlaying(false); setStep(0); }}
                className="text-xs uppercase tracking-wider font-semibold text-slate-500 hover:text-slate-300 ml-2"
              >
                Reset
              </button>
            </div>

            <div className="flex-1 w-full bg-slate-950 rounded-lg p-3 border border-slate-800 flex justify-around items-center text-sm">
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Iteration</span>
                <span className="font-mono text-white">{step} / {MAX_STEPS - 1}</span>
              </div>
              <div className="w-px h-8 bg-slate-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Estimated λ</span>
                <span className="font-mono text-emerald-400">
                  {currentIteration.isZero ? '0.0000' : currentIteration.rayleigh.toFixed(4)}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-800 hidden md:block"></div>
              <div className="flex flex-col items-center hidden md:flex">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Vector vₖ</span>
                <span className="font-mono text-slate-300">
                  [{currentIteration.v[0].toFixed(2)}, {currentIteration.v[1].toFixed(2)}]
                </span>
              </div>
            </div>