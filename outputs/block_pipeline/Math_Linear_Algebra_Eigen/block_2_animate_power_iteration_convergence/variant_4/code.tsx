import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Math & Linear Algebra Helpers --- //
const norm = (v: [number, number]) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
const dot = (v1: [number, number], v2: [number, number]) => v1[0] * v2[0] + v1[1] * v2[1];
const mult = (m: [number, number, number, number], v: [number, number]): [number, number] => [
  m[0] * v[0] + m[1] * v[1],
  m[2] * v[0] + m[3] * v[1],
];
const normalize = (v: [number, number]): [number, number] => {
  const n = norm(v);
  if (n < 1e-12) return [0, 0]; // Numeric stability guard
  return [v[0] / n, v[1] / n];
};

// Calculate analytical properties of the 2x2 matrix
const getMatrixProperties = (m: [number, number, number, number]) => {
  const [a, b, c, d] = m;
  const tr = a + d;
  const det = a * d - b * c;
  const discriminant = tr * tr - 4 * det;
  
  let lambda1: number | null = null;
  let lambda2: number | null = null;
  let isComplex = discriminant < 0;
  let dominantEigenvector: [number, number] | null = null;

  if (!isComplex) {
    lambda1 = (tr + Math.sqrt(discriminant)) / 2;
    lambda2 = (tr - Math.sqrt(discriminant)) / 2;
    
    // Determine dominant eigenvalue
    const domLambda = Math.abs(lambda1) > Math.abs(lambda2) ? lambda1 : lambda2;
    
    // Find corresponding eigenvector (A - lambda*I)v = 0
    // [a-lambda, b]
    // [c, d-lambda]
    if (Math.abs(c) > 1e-9) {
      dominantEigenvector = normalize([domLambda - d, c]);
    } else if (Math.abs(b) > 1e-9) {
      dominantEigenvector = normalize([b, domLambda - a]);
    } else {
      dominantEigenvector = Math.abs(lambda1) > Math.abs(lambda2) ? [1, 0] : [0, 1];
    }
  }

  return { tr, det, discriminant, isComplex, lambda1, lambda2, dominantEigenvector };
};

const PRESETS: Record<string, [number, number, number, number]> = {
  'Symmetric (Clear Convergence)': [1.5, 0.5, 0.5, 1.5],
  'Shear (Slower Convergence)': [1.0, 1.5, 0.0, 1.0],
  'Rotation (Complex - Cycles)': [0.5, -1.0, 1.0, 0.5],
  'Markov (Stochastic)': [0.8, 0.3, 0.2, 0.7],
  'Scaling (Diagonal)': [2.0, 0.0, 0.0, 0.5]
};

export default function App() {
  const [matrix, setMatrix] = useState<[number, number, number, number]>(PRESETS['Symmetric (Clear Convergence)']);
  const [vector, setVector] = useState<[number, number]>([1, 0]);
  const [history, setHistory] = useState<[number, number][]>([[1, 0]]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);

  const stats = useMemo(() => getMatrixProperties(matrix), [matrix]);

  // Current iteration's data
  const iteration = history.length - 1;
  const transformed = mult(matrix, vector);
  const currentNorm = norm(transformed);
  const rayleighQuotient = dot(vector, transformed) / dot(vector, vector);
  
  // Guard against explosion or collapse
  const isUnstable = currentNorm < 1e-12 || !isFinite(currentNorm);

  const handleStep = useCallback(() => {
    if (isUnstable) {
      setIsPlaying(false);
      return;
    }
    const nextVector = normalize(transformed);
    setVector(nextVector);
    setHistory((prev) => [...prev, nextVector]);
  }, [transformed, isUnstable]);

  const handleReset = () => {
    setVector([1, 0]);
    setHistory([[1, 0]]);
    setIsPlaying(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        handleStep();
      }, speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, handleStep, speed]);

  const updateMatrix = (idx: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMat = [...matrix] as [number, number, number, number];
    newMat[idx] = num;
    setMatrix(newMat);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col relative">
      {/* Grid Background Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03] z-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />
      </svg>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white flex items-center gap-3">
            <span className="text-cyan-400 font-serif italic">Eigen</span> Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">Power Iteration Convergence Visualizer</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(PRESETS).map(([name, mat]) => (
            <button
              key={name}
              onClick={() => { setMatrix(mat); handleReset(); }}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                matrix.join() === mat.join() 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {name.split(' ')[0]}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row relative z-10 w-full max-w-7xl mx-auto p-4 lg:p-8 gap-8">
        
        {/* Left Sidebar: Controls & Stats */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          {/* Matrix Editor */}
          <section className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-4 font-semibold">Matrix A</h2>
            <div className="grid grid-cols-2 gap-3 mb-6 relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 border-t-2 border-b-2 border-l-2 border-slate-600 rounded-l-sm opacity-50"></div>
              <div className="absolute -right-2 top-0 bottom-0 w-1 border-t-2 border-b-2 border-r-2 border-slate-600 rounded-r-sm opacity-50"></div>
              
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="number"
                  step="0.1"
                  value={matrix[i]}
                  onChange={(e) => updateMatrix(i, e.target.value)}
                  className="bg-slate-950/50 border border-slate-700 text-center rounded-lg py-2 text-white font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all"
                />
              ))}
            </div>

            {/* Animation Controls */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => isUnstable ? handleReset() : setIsPlaying(!isPlaying)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  isPlaying 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' 
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
              >
                {isPlaying ? 'Pause' : isUnstable ? 'Reset' : 'Auto Play'}
              </button>
              <button
                onClick={handleStep}
                disabled={isPlaying || isUnstable}
                className="px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 border border-slate-700 transition-colors"
                title="Step Forward"
              >
                Step
              </button>
              <button
                onClick={handleReset}
                className="px-4 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Reset"
              >
                ⟲
              </button>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Speed:</span>
              <input 
                type="range" min="100" max="2000" step="100" 
                value={2100 - speed} 
                onChange={(e) => setSpeed(2100 - parseInt(e.target.value))}
                className="flex-1 accent-cyan-500"
              />
            </div>
          </section>

          {/* Properties Panel */}
          <section className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex-1">
            <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-4 font-semibold">Properties</h2>
            
            <div className="space-y-4 text-sm font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Determinant</span>
                <span className={stats.det < 0 ? "text-rose-400" : "text-emerald-400"}>{stats.det.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Trace</span>
                <span className="text-white">{stats.tr.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Stability</span>
                <span className={isUnstable ? "text-rose-400" : "text-emerald-400"}>
                  {isUnstable ? 'Diverging / Zero' : 'Stable'}
                </span>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <h3 className="text-xs uppercase text-slate-500 mb-2 font-sans">Eigenvalues</h3>
                {stats.isComplex ? (
                  <div className="text-rose-300 text-xs bg-rose-950/30 p-3 rounded border border-rose-900/50 leading-relaxed font-sans">
                    <strong>Complex Conjugates:</strong> Power iteration will not settle on a single vector. The vector field rotates.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                      <span className="text-cyan-400">λ₁ (Dom)</span>
                      <span>{stats.lambda1?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                      <span className="text-slate-500">λ₂</span>
                      <span className="text-slate-400">{stats.lambda2?.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>

        {/* Main Graph Area */}
        <section className="flex-1 bg-slate-900/40 backdrop-blur border border-slate-800 rounded-2xl flex flex-col relative shadow-2xl overflow-hidden min-h-[500px]">
          
          {/* Iteration Overlay */}
          <div className="absolute top-6 left-6 z-20 pointer-events-none">
            <div className="text-5xl font-light text-white/90 drop-shadow-md">k = {iteration}</div>
            <div className="mt-2 text-sm font-mono flex items-center gap-3">
              <div className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded border border-cyan-500/30">
                v_k = [{vector[0].toFixed(3)}, {vector[1].toFixed(3)}]
              </div>
              <div className="bg-magenta-500/20 text-fuchsia-300 px-2 py-1 rounded border border-fuchsia-500/30">
                λ^(k) ≈ {isUnstable ? 'NaN' : rayleighQuotient.toFixed(4)}
              </div>
            </div>
          </div>

          {/* SVG Coordinate System */}
          <div className="flex-1 w-full h-full p-4 relative">
            <svg 
              className="w-full h-full drop-shadow-lg" 
              viewBox="-3 -3 6 6" 
              preserveAspectRatio="xMidYMid meet"
              style={{ transform: 'scale(1, -1)' }} // Math coordinates (y goes up)
            >
              <g className="text-slate-700" strokeWidth="0.02" stroke="currentColor">
                {/* Grid Lines */}
                {Array.from({length: 11}).map((_, i) => {
                  const pos = i - 5;
                  return (
                    <React.Fragment key={pos}>
                      <line x1={pos} y1="-5" x2={pos} y2="5" />
                      <line x1="-5" y1={pos} x2="5" y2={pos} />
                    </React.Fragment>
                  );
                })}
              </g>

              {/* Axes */}
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#475569" strokeWidth="0.04" />
              <line x1="0" y1="-5" x2="0" y2="5" stroke="#475569" strokeWidth="0.04" />

              {/* Unit Circle */}
              <circle cx="0" cy="0" r="1" fill="none" stroke="#64748b" strokeWidth="0.03" strokeDasharray="0.1 0.1" />

              {/* True Dominant Eigenvector Line (Ghost Line) */}
              {!stats.isComplex && stats.dominantEigenvector && (
                <g stroke="#ffffff" strokeWidth="0.03" opacity="0.3" strokeDasharray="0.1 0.1">
                  <line 
                    x1={-stats.dominantEigenvector[0] * 5} 
                    y1={-stats.dominantEigenvector[1] * 5} 
                    x2={stats.dominantEigenvector[0] * 5} 
                    y2={stats.dominantEigenvector[1] * 5} 
                  />
                </g>
              )}

              {/* History Path */}
              {history.length > 1 && (
                <polyline 
                  points={history.map(v => `${v[0]},${v[1]}`).join(' ')} 
                  fill="none" 
                  stroke="#14b8a6" 
                  strokeWidth="0.02" 
                  opacity="0.4"
                  strokeLinejoin="round"
                />
              )}

              {/* History Points */}
              {history.map((v, i) => (
                <circle 
                  key={i} 
                  cx={v[0]} cy={v[1]} 
                  r="0.04" 
                  fill={i === history.length - 1 ? "none" : "#14b8a6"} 
                  opacity={i === history.length - 1 ? 0 : 0.3 + (i / history.length) * 0.5} 
                />
              ))}

              {/* Transformed Vector (Av) */}
              <line 
                x1="0" y1="0" 
                x2={transformed[0]} y2={transformed[1]} 
                stroke="#d946ef" 
                strokeWidth="0.06" 
                strokeLinecap="round"
                style={{ transition: 'all 0.5s ease' }}
                opacity="0.6"
              />
              <circle 
                cx={transformed[0]} cy={transformed[1]} r="0.08" 
                fill="#d946ef" 
                style={{ transition: 'all 0.5s ease' }}
              />

              {/* Current Vector (v_k) */}
              <line 
                x1="0" y1="0" 
                x2={vector[0]} y2={vector[1]} 
                stroke="#22d3ee" 
                strokeWidth="0.08" 
                strokeLinecap="round"
                style={{ transition: 'all 0.5s ease' }}
              />
              <circle 
                cx={vector[0]} cy={vector[1]} r="0.1" 
                fill="#22d3ee" 
                style={{ transition: 'all 0.5s ease' }}
              />

              {/* Vector Labels (Un-inverted for reading) */}
              <g style={{ transform: 'scale(1, -1)' }}>
                {/* Av Label */}
                <text 
                  x={transformed[0] + 0.15} y={-(transformed[1] + 0.15)} 
                  fill="#d946ef" fontSize="0.15" 
                  style={{ transition: 'all 0.5s ease' }}
                  className="font-mono font-bold pointer-events-none drop-shadow-md"
                >
                  A·v
                </text>
                {/* v Label */}
                <text 
                  x={vector[0] + 0.15} y={-(vector[1] + 0.15)} 
                  fill="#22d3ee" fontSize="0.18" 
                  style={{ transition: 'all 0.5s ease' }}
                  className="font-mono font-bold pointer-events-none drop-shadow-md"
                >
                  v
                </text>
              </g>

            </svg>
          </div>

          {/* Explanation Footer inside graph */}
          <div className="bg-slate-950/80 p-4 border-t border-slate-800 text-sm text-slate-400">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
              <strong>v_{iteration}</strong>: The normalized vector on the unit circle.
              <span className="w-3 h-3 rounded-full bg-fuchsia-500 inline-block ml-4 shadow-[0_0_8px_rgba(217,70,239,0.5)]"></span>
              <strong>A·v</strong>: The vector stretched/rotated by matrix A. 
              {!stats.isComplex && <span className="ml-2 text-white/50 border-b border-white/30 border-dashed">White dashed line is the true dominant eigenvector.</span>}
            </p>
          </div>
        </section>
        
      </main>
    </div>
  );
}