import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Math Utilities ---
type Vector2 = [number, number];
type Matrix2x2 = [[number, number], [number, number]];

const multiply = (m: Matrix2x2, v: Vector2): Vector2 => [
  m[0][0] * v[0] + m[0][1] * v[1],
  m[1][0] * v[0] + m[1][1] * v[1],
];

const magnitude = (v: Vector2): number => Math.sqrt(v[0] * v[0] + v[1] * v[1]);

const normalize = (v: Vector2): Vector2 => {
  const mag = magnitude(v);
  if (mag < 1e-10 || isNaN(mag)) throw new Error("Numeric instability: Vector magnitude is zero or NaN.");
  return [v[0] / mag, v[1] / mag];
};

const rayleighQuotient = (m: Matrix2x2, v: Vector2): number => {
  const mv = multiply(m, v);
  const dotNumerator = v[0] * mv[0] + v[1] * mv[1];
  const dotDenominator = v[0] * v[0] + v[1] * v[1];
  return dotNumerator / dotDenominator;
};

// --- Presets ---
const PRESETS: Record<string, Matrix2x2> = {
  "Stretch & Squeeze": [[2, 1], [1, 2]],
  "Rotation (Complex)": [[0, -1], [1, 0]],
  "Shear": [[1, 1], [0, 1]],
  "Sink (Stable)": [[0.5, 0], [0, 0.8]],
  "Source (Unstable)": [[1.5, 0.5], [0.2, 1.2]],
};

export default function App() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS["Stretch & Squeeze"]);
  const [vector, setVector] = useState<Vector2>([1, 0.2]); // Initial guess
  const [history, setHistory] = useState<Vector2[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Math Properties
  const trace = matrix[0][0] + matrix[1][1];
  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const discriminant = trace * trace - 4 * det;
  const hasComplex = discriminant < 0;
  const currentEigenvalEst = rayleighQuotient(matrix, vector);

  const performStep = useCallback(() => {
    try {
      setErrorMsg(null);
      const nextUnnormalized = multiply(matrix, vector);
      const nextNormalized = normalize(nextUnnormalized);
      
      // Check for convergence (dot product close to 1 or -1)
      const dot = Math.abs(vector[0] * nextNormalized[0] + vector[1] * nextNormalized[1]);
      if (dot > 0.999999 && !hasComplex) {
        setIsPlaying(false); // Auto-pause on convergence
      }

      setHistory((prev) => [...prev, vector].slice(-20)); // Keep last 20
      setVector(nextNormalized);
      setIteration((prev) => prev + 1);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsPlaying(false);
    }
  }, [matrix, vector, hasComplex]);

  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      timer = window.setInterval(performStep, 600);
    }
    return () => clearInterval(timer);
  }, [isPlaying, performStep]);

  const reset = () => {
    setIsPlaying(false);
    setVector([1, 0.2]);
    setHistory([]);
    setIteration(0);
    setErrorMsg(null);
  };

  const handleMatrixChange = (r: number, c: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix2x2;
    newMatrix[r][c] = num;
    setMatrix(newMatrix);
    reset();
  };

  const loadPreset = (name: string) => {
    setMatrix(PRESETS[name]);
    reset();
  };

  return (
    <div 
      className="min-h-screen font-sans text-slate-800 flex flex-col items-center py-10 px-4"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="max-w-5xl w-full bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <header className="px-8 py-6 border-b border-slate-200 bg-white">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Eigen Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualizing Power Iteration Convergence & Linear Stability
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          
          {/* Left Panel: Controls & Math */}
          <div className="md:col-span-5 p-8 border-r border-slate-200 bg-slate-50/50 flex flex-col gap-8">
            
            {/* Matrix Editor */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Matrix Definition</h2>
              <div className="flex gap-4 items-center">
                <div className="text-4xl font-light text-slate-300">[</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.1" value={matrix[0][0]} onChange={(e) => handleMatrixChange(0, 0, e.target.value)} className="w-16 h-10 text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input type="number" step="0.1" value={matrix[0][1]} onChange={(e) => handleMatrixChange(0, 1, e.target.value)} className="w-16 h-10 text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input type="number" step="0.1" value={matrix[1][0]} onChange={(e) => handleMatrixChange(1, 0, e.target.value)} className="w-16 h-10 text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input type="number" step="0.1" value={matrix[1][1]} onChange={(e) => handleMatrixChange(1, 1, e.target.value)} className="w-16 h-10 text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="text-4xl font-light text-slate-300">]</div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.keys(PRESETS).map(name => (
                  <button 
                    key={name} 
                    onClick={() => loadPreset(name)}
                    className="text-xs px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>

            {/* Properties */}
            <section className="text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Properties</h2>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-slate-500">Trace (τ):</span>
                <span className="font-mono">{trace.toFixed(2)}</span>
                <span className="text-slate-500">Determinant (Δ):</span>
                <span className="font-mono">{det.toFixed(2)}</span>
                <span className="text-slate-500">Eigenvalues:</span>
                <span className={`font-mono ${hasComplex ? 'text-amber-600 font-bold' : ''}`}>
                  {hasComplex ? 'Complex' : 'Real'}
                </span>
              </div>
              
              {hasComplex && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs leading-relaxed">
                  <strong>Complex Eigenvalues Detected!</strong><br />
                  Because the discriminant is negative, this matrix represents a rotation. 
                  Power iteration will not converge to a single vector, as there is no real dominant direction.
                </div>
              )}
            </section>

            {/* Power Iteration Controls */}
            <section className="mt-auto">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Power Iteration</h2>
              
              <div className="flex items-center justify-between mb-4 text-sm font-mono bg-white border border-slate-200 p-3 rounded">
                <div>
                  <span className="text-slate-400 block text-xs">Iteration</span>
                  {iteration}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-xs">Est. λ (Rayleigh)</span>
                  {currentEigenvalEst.toFixed(4)}
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs text-red-600 mb-4 bg-red-50 p-2 rounded">{errorMsg}</div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 py-2 px-4 rounded font-medium text-white transition-colors ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isPlaying ? 'Pause' : 'Auto-Play'}
                </button>
                <button 
                  onClick={performStep}
                  disabled={isPlaying}
                  className="py-2 px-4 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 rounded font-medium transition-colors"
                >
                  Step
                </button>
                <button 
                  onClick={reset}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </section>

          </div>

          {/* Right Panel: Visualization */}
          <div className="md:col-span-7 bg-white p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative w-full max-w-[400px] aspect-square">
              <svg viewBox="-1.5 -1.5 3 3" className="w-full h-full overflow-visible">
                {/* Grid and Axes */}
                <defs>
                  <pattern id="smallGrid" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
                    <path d="M 0.25 0 L 0 0 0 0.25" fill="none" stroke="#f1f5f9" strokeWidth="0.01" />
                  </pattern>
                  <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                    <rect width="1" height="1" fill="url(#smallGrid)" />
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#e2e8f0" strokeWidth="0.02" />
                  </pattern>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#2563eb" />
                  </marker>
                  <marker id="arrowhead-trail" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
                  </marker>
                </defs>

                <rect x="-1.5" y="-1.5" width="3" height="3" fill="url(#grid)" />
                <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke="#cbd5e1" strokeWidth="0.02" />
                <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#cbd5e1" strokeWidth="0.02" />
                
                {/* Unit Circle */}
                <circle cx="0" cy="0" r="1" fill="none" stroke="#e2e8f0" strokeWidth="0.01" strokeDasharray="0.05, 0.05" />

                {/* History Trail */}
                {history.map((v, i) => {
                  const opacity = (i + 1) / history.length * 0.5;
                  return (
                    <line 
                      key={i}
                      x1="0" y1="0" 
                      x2={v[0]} y2={-v[1]} 
                      stroke="#94a3b8" 
                      strokeWidth="0.02"
                      opacity={opacity}
                      markerEnd="url(#arrowhead-trail)"
                    />
                  );
                })}

                {/* Current Vector */}
                <line 
                  x1="0" y1="0" 
                  x2={vector[0]} y2={-vector[1]} 
                  stroke="#2563eb" 
                  strokeWidth="0.04"
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-500 ease-in-out"
                />

                {/* Labels */}
                <text x="1.4" y="0.1" fontSize="0.1" fill="#64748b" className="font-sans">x</text>
                <text x="0.05" y="-1.4" fontSize="0.1" fill="#64748b" className="font-sans">y</text>
              </svg>
            </div>
            
            <div className="mt-8 text-center max-w-sm text-slate-500 text-sm">
              <p>
                <strong>Power Iteration</strong> repeatedly multiplies a vector by the matrix and normalizes it. 
                If a strictly dominant real eigenvalue exists, the vector will align with its corresponding eigenvector.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}