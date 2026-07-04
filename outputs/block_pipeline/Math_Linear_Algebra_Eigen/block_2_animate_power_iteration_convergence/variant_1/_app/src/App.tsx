import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- Math Helpers ---
type Vector2 = [number, number];
type Matrix2x2 = [[number, number], [number, number]];

const matMul = (A: Matrix2x2, v: Vector2): Vector2 => [
  A[0][0] * v[0] + A[0][1] * v[1],
  A[1][0] * v[0] + A[1][1] * v[1]
];

const norm = (v: Vector2): number => Math.sqrt(v[0] * v[0] + v[1] * v[1]);

const normalize = (v: Vector2): Vector2 => {
  const n = norm(v);
  // Numeric stability guard: prevent division by zero
  if (n < 1e-10) return [0, 0];
  return [v[0] / n, v[1] / n];
};

const rayleighQuotient = (A: Matrix2x2, v: Vector2): number => {
  const Av = matMul(A, v);
  const num = v[0] * Av[0] + v[1] * Av[1];
  const den = v[0] * v[0] + v[1] * v[1];
  if (den < 1e-10) return 0;
  return num / den;
};

// Calculate exact eigenvalues for comparison
const getExactEigenvalues = (A: Matrix2x2) => {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const disc = tr * tr - 4 * det;
  
  if (disc < 0) {
    return { type: 'complex', val: `${(tr/2).toFixed(2)} ± ${(Math.sqrt(-disc)/2).toFixed(2)}i` };
  }
  const l1 = (tr + Math.sqrt(disc)) / 2;
  const l2 = (tr - Math.sqrt(disc)) / 2;
  return { type: 'real', max: Math.max(Math.abs(l1), Math.abs(l2)) === Math.abs(l1) ? l1 : l2, l1, l2 };
};

// --- Presets ---
const PRESETS: Record<string, Matrix2x2> = {
  'Distinct Real (Fast)': [[2, 1], [1, 3]],
  'Close Real (Slow)': [[3, 1], [0, 2.9]],
  'Complex (Rotates)': [[1, -2], [2, 1]],
  'Negative Eigenvalue': [[-2, 0], [0, 1]],
  'Shear': [[1, 1], [0, 1]],
};

export default function App() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS['Distinct Real (Fast)']);
  const [history, setHistory] = useState<Vector2[]>([[1, 0]]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(400);
  
  const timerRef = useRef<number | null>(null);

  const currentVector = history[history.length - 1];
  const iteration = history.length - 1;
  const currentEigenval = rayleighQuotient(matrix, currentVector);
  const exactEig = useMemo(() => getExactEigenvalues(matrix), [matrix]);

  const step = useCallback(() => {
    setHistory(prev => {
      const v = prev[prev.length - 1];
      const nextUnnormalized = matMul(matrix, v);
      const nextV = normalize(nextUnnormalized);
      
      // Limit history to prevent performance issues and visual clutter
      const newHistory = [...prev, nextV];
      if (newHistory.length > 100) return newHistory.slice(newHistory.length - 100);
      return newHistory;
    });
  }, [matrix]);

  const reset = useCallback(() => {
    setHistory([[1, 0]]);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(step, speedMs);
    } else if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isPlaying, step, speedMs]);

  const handleMatrixChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix2x2;
    newMatrix[row][col] = num;
    setMatrix(newMatrix);
    reset();
  };

  const loadPreset = (name: string) => {
    setMatrix(PRESETS[name]);
    reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center py-8 px-4">
      <div className="max-w-6xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Eigen Explorer</h1>
          <p className="text-slate-600 max-w-2xl">
            Visualize <strong>Power Iteration</strong>: an algorithm that repeatedly multiplies a vector by a matrix and normalizes it. 
            For most matrices, this sequence converges to the principal eigenvector (the one associated with the largest absolute eigenvalue).
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Controls */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Matrix Editor */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Matrix Editor (A)</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="number" step="0.1" value={matrix[0][0]} onChange={e => handleMatrixChange(0, 0, e.target.value)} className="w-full p-2 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono" />
                <input type="number" step="0.1" value={matrix[0][1]} onChange={e => handleMatrixChange(0, 1, e.target.value)} className="w-full p-2 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono" />
                <input type="number" step="0.1" value={matrix[1][0]} onChange={e => handleMatrixChange(1, 0, e.target.value)} className="w-full p-2 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono" />
                <input type="number" step="0.1" value={matrix[1][1]} onChange={e => handleMatrixChange(1, 1, e.target.value)} className="w-full p-2 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono" />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESETS).map(name => (
                  <button 
                    key={name} 
                    onClick={() => loadPreset(name)}
                    className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation Controls */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Animation Controls</h2>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${isPlaying ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {isPlaying ? 'Pause' : 'Play Auto'}
                </button>
                <button 
                  onClick={step}
                  disabled={isPlaying}
                  className="flex-1 py-2 px-4 rounded-md font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  Step +1
                </button>
                <button 
                  onClick={reset}
                  className="py-2 px-4 rounded-md font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                  title="Reset to initial vector"
                >
                  ↺
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 flex justify-between">
                  <span>Speed</span>
                  <span>{speedMs}ms / step</span>
                </label>
                <input 
                  type="range" 
                  min="50" max="1000" step="50" 
                  value={speedMs} 
                  onChange={e => setSpeedMs(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Stats & Info */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Convergence Stats</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">Iteration (k)</span>
                  <span className="font-mono text-lg font-medium">{iteration}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">Est. Eigenvalue (λ)</span>
                  <span className="font-mono text-lg font-medium text-indigo-600">
                    {currentEigenval.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col mt-2">
                <span className="text-slate-500 text-xs mb-1">Current Vector (v_k)</span>
                <span className="font-mono bg-slate-50 p-2 rounded border border-slate-100 text-center">
                  [{currentVector[0].toFixed(4)}, {currentVector[1].toFixed(4)}]
                </span>
              </div>

              <div className={`mt-2 p-3 rounded-md text-sm ${exactEig.type === 'complex' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-green-50 text-green-800 border border-green-100'}`}>
                <strong>Target Check:</strong><br/>
                {exactEig.type === 'complex' ? (
                  <>Matrix has complex eigenvalues ({exactEig.val}). Power iteration will typically rotate and <strong>not converge</strong>.</>
                ) : (
                  <>Principal Eigenvalue is exactly <strong>{(exactEig as any).max.toFixed(4)}</strong>.</>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Visualization */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[500px] flex items-center justify-center">
            
            {/* SVG Plot */}
            <svg 
              viewBox="-1.5 -1.5 3 3" 
              className="w-full h-full max-h-[600px]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Grid Pattern */}
                <pattern id="grid" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
                  <path d="M 0.25 0 L 0 0 0 0.25" fill="none" stroke="#e2e8f0" strokeWidth="0.005"/>
                </pattern>
                
                {/* Arrowhead Marker */}
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#4f46e5" />
                </marker>
              </defs>

              {/* Background Grid */}
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="url(#grid)" />

              {/* Axes */}
              <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke="#cbd5e1" strokeWidth="0.01" />
              <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#cbd5e1" strokeWidth="0.01" />

              {/* Unit Circle (since vectors are normalized) */}
              <circle cx="0" cy="0" r="1" fill="none" stroke="#94a3b8" strokeWidth="0.01" strokeDasharray="0.05 0.05" />

              {/* History Trail */}
              {history.length > 1 && (
                <polyline 
                  points={history.map(v => `${v[0]},${-v[1]}`).join(' ')} 
                  fill="none" 
                  stroke="#93c5fd" 
                  strokeWidth="0.015"
                  strokeLinejoin="round"
                />
              )}

              {/* History Points */}
              {history.map((v, i) => {
                const isLast = i === history.length - 1;
                const opacity = Math.max(0.1, i / history.length);
                return (
                  <circle 
                    key={i}
                    cx={v[0]} 
                    cy={-v[1]} 
                    r={isLast ? 0.04 : 0.02} 
                    fill={isLast ? '#4f46e5' : '#60a5fa'}
                    opacity={isLast ? 1 : opacity}
                  />
                );
              })}

              {/* Current Vector Line */}
              <line 
                x1="0" y1="0" 
                x2={currentVector[0] * 0.95} // Pull back slightly for arrowhead
                y2={-currentVector[1] * 0.95} 
                stroke="#4f46e5" 
                strokeWidth="0.02" 
                markerEnd="url(#arrowhead)"
              />

              {/* Origin Point */}
              <circle cx="0" cy="0" r="0.03" fill="#1e293b" />
            </svg>

            {/* Overlay Labels */}
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="bg-white/80 px-2 py-1 rounded text-xs font-semibold text-slate-600 border border-slate-200 backdrop-blur-sm">
                Unit Circle Projection
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}