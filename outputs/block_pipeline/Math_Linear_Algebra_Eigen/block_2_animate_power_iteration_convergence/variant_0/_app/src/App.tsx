import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Dependencies: React, Tailwind CSS (standard classes)
// No external math libraries used.

type Vector2 = [number, number];
type Matrix2x2 = [[number, number], [number, number]];

const INITIAL_VECTOR: Vector2 = [1, 0.5];

const PRESETS: Record<string, Matrix2x2> = {
  'Stretch (Real)': [[1.05, 0.1], [0.1, 1.02]],
  'Rotation (Complex)': [[0.95, -0.2], [0.2, 0.95]],
  'Shear': [[1, 0.1], [0, 1]],
  'Saddle (Unstable)': [[1.05, 0], [0, 0.95]],
  'Convergence': [[0.8, 0.1], [0.1, 0.7]],
};

export default function App() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS['Stretch (Real)']);
  const [vector, setVector] = useState<Vector2>(INITIAL_VECTOR);
  const [history, setHistory] = useState<Vector2[]>([INITIAL_VECTOR]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  // Math Helpers
  const multiply = useCallback((m: Matrix2x2, v: Vector2): Vector2 => {
    return [
      m[0][0] * v[0] + m[0][1] * v[1],
      m[1][0] * v[0] + m[1][1] * v[1]
    ];
  }, []);

  const magnitude = (v: Vector2) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);

  const normalize = useCallback((v: Vector2): Vector2 => {
    const mag = magnitude(v);
    // Numeric stability guard
    if (mag < 1e-10) return [1, 0];
    return [v[0] / mag, v[1] / mag];
  }, []);

  // Matrix Stats Calculation
  const stats = useMemo(() => {
    const [[a, b], [c, d]] = matrix;
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;
    
    let eigenvalues: string[] = [];
    let isComplex = false;
    let dominantEigenvector: Vector2 | null = null;
    let maxMagnitude = 0;

    if (discriminant >= 0) {
      const l1 = (trace + Math.sqrt(discriminant)) / 2;
      const l2 = (trace - Math.sqrt(discriminant)) / 2;
      eigenvalues = [l1.toFixed(3), l2.toFixed(3)];
      maxMagnitude = Math.max(Math.abs(l1), Math.abs(l2));
      
      // Calculate dominant eigenvector analytically for reference
      const dominantLambda = Math.abs(l1) > Math.abs(l2) ? l1 : l2;
      if (Math.abs(b) > 1e-6) {
        dominantEigenvector = normalize([b, dominantLambda - a]);
      } else if (Math.abs(c) > 1e-6) {
        dominantEigenvector = normalize([dominantLambda - d, c]);
      } else {
        dominantEigenvector = dominantLambda === a ? [1, 0] : [0, 1];
      }
    } else {
      isComplex = true;
      const real = (trace / 2).toFixed(3);
      const imag = (Math.sqrt(-discriminant) / 2).toFixed(3);
      eigenvalues = [`${real} + ${imag}i`, `${real} - ${imag}i`];
      maxMagnitude = Math.sqrt((trace/2)**2 + (-discriminant/4));
    }

    // Discrete time stability (Iterative multiplication)
    let stability = 'Neutral';
    if (maxMagnitude < 0.99) stability = 'Stable (Converges to 0)';
    else if (maxMagnitude > 1.01) stability = 'Unstable (Diverges)';

    return { trace, det, discriminant, eigenvalues, isComplex, dominantEigenvector, stability, maxMagnitude };
  }, [matrix, normalize]);

  // Power Iteration Step
  const step = useCallback(() => {
    setVector(prev => {
      const nextRaw = multiply(matrix, prev);
      const nextNorm = normalize(nextRaw);
      setHistory(h => [...h.slice(-50), nextNorm]); // Keep last 50 steps
      return nextNorm;
    });
  }, [matrix, multiply, normalize]);

  const reset = useCallback(() => {
    setVector(INITIAL_VECTOR);
    setHistory([INITIAL_VECTOR]);
    setIsPlaying(false);
  }, []);

  // Animation Loop
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(step, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, step, speed]);

  // Handle Matrix Input
  const handleMatrixChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix2x2;
    newMatrix[row][col] = num;
    setMatrix(newMatrix);
    reset();
  };

  // SVG Coordinate Mapping
  const scale = 120;
  const center = 200;
  const mapX = (x: number) => center + x * scale;
  const mapY = (y: number) => center - y * scale;

  // Generate Vector Field
  const vectorField = useMemo(() => {
    const lines = [];
    for (let x = -1.5; x <= 1.5; x += 0.3) {
      for (let y = -1.5; y <= 1.5; y += 0.3) {
        if (x === 0 && y === 0) continue;
        const [nx, ny] = multiply(matrix, [x, y]);
        const mag = magnitude([nx, ny]);
        // Scale down the field vectors for visualization
        const drawLen = 0.08; 
        const dx = (nx / mag) * drawLen;
        const dy = (ny / mag) * drawLen;
        lines.push(
          <line
            key={`vf-${x}-${y}`}
            x1={mapX(x)} y1={mapY(y)}
            x2={mapX(x + dx)} y2={mapY(y + dy)}
            stroke="#cbd5e1" strokeWidth="1"
            opacity="0.5"
          />
        );
      }
    }
    return lines;
  }, [matrix, multiply]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-900">Eigen Explorer</h1>
        <p className="text-slate-500 mt-1">Visualize power iteration and linear transformations</p>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls & Stats */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Matrix Editor */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Matrix Editor</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <input type="number" step="0.1" value={matrix[0][0]} onChange={e => handleMatrixChange(0, 0, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
              <input type="number" step="0.1" value={matrix[0][1]} onChange={e => handleMatrixChange(0, 1, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
              <input type="number" step="0.1" value={matrix[1][0]} onChange={e => handleMatrixChange(1, 0, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
              <input type="number" step="0.1" value={matrix[1][1]} onChange={e => handleMatrixChange(1, 1, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(PRESETS).map(([name, mat]) => (
                <button
                  key={name}
                  onClick={() => { setMatrix(mat); reset(); }}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${isPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {isPlaying ? 'Pause' : 'Animate'}
                </button>
                <button onClick={step} disabled={isPlaying} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium disabled:opacity-50 transition-colors">
                  Step
                </button>
                <button onClick={reset} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Properties</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Determinant</span>
                <span className="font-mono font-medium">{stats.det.toFixed(3)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Trace</span>
                <span className="font-mono font-medium">{stats.trace.toFixed(3)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Eigenvalues (λ)</span>
                <div className="text-right font-mono font-medium text-indigo-600">
                  <div>λ₁ = {stats.eigenvalues[0]}</div>
                  <div>λ₂ = {stats.eigenvalues[1]}</div>
                </div>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">System Stability</span>
                <span className={`font-medium ${stats.stability.includes('Stable') ? 'text-emerald-600' : stats.stability.includes('Unstable') ? 'text-rose-500' : 'text-amber-500'}`}>
                  {stats.stability}
                </span>
              </div>
            </div>

            {stats.isComplex && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 leading-relaxed">
                <strong>Complex Eigenvalues:</strong> This matrix induces a rotation. Power iteration will not converge to a single real vector, but will orbit continuously.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Visualization */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex items-center justify-center min-h-[500px]">
          
          {/* Grid Background Pattern (CSS) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <svg width="400" height="400" className="overflow-visible">
            {/* Axes */}
            <line x1="0" y1="200" x2="400" y2="200" stroke="#e2e8f0" strokeWidth="2" />
            <line x1="200" y1="0" x2="200" y2="400" stroke="#e2e8f0" strokeWidth="2" />
            
            {/* Unit Circle */}
            <circle cx="200" cy="200" r={scale} fill="none" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 4" />

            {/* Vector Field */}
            {vectorField}

            {/* Dominant Eigenvector Reference Line */}
            {stats.dominantEigenvector && !stats.isComplex && (
              <line 
                x1={mapX(-stats.dominantEigenvector[0] * 2)} 
                y1={mapY(-stats.dominantEigenvector[1] * 2)} 
                x2={mapX(stats.dominantEigenvector[0] * 2)} 
                y2={mapY(stats.dominantEigenvector[1] * 2)} 
                stroke="#10b981" strokeWidth="2" strokeDasharray="6 6" opacity="0.4"
              />
            )}

            {/* History Path */}
            {history.length > 1 && (
              <polyline
                points={history.map(v => `${mapX(v[0])},${mapY(v[1])}`).join(' ')}
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                opacity="0.4"
                strokeLinejoin="round"
              />
            )}

            {/* History Dots */}
            {history.map((v, i) => (
              <circle 
                key={i} 
                cx={mapX(v[0])} 
                cy={mapY(v[1])} 
                r="3" 
                fill="#6366f1" 
                opacity={0.1 + (i / history.length) * 0.5} 
              />
            ))}

            {/* Current Vector */}
            <line 
              x1="200" y1="200" 
              x2={mapX(vector[0])} y2={mapY(vector[1])} 
              stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"
            />
            
            {/* Arrow Head */}
            <polygon 
              points="0,-5 10,0 0,5" 
              fill="#4f46e5"
              transform={`translate(${mapX(vector[0])}, ${mapY(vector[1])}) rotate(${Math.atan2(-vector[1], vector[0]) * 180 / Math.PI})`}
            />
          </svg>

          {/* Legend Overlay */}
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-100 text-xs text-slate-500 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-0.5 bg-indigo-600"></div> Current Vector (Normalized)
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-0.5 bg-indigo-300"></div> Iteration History
            </div>
            {!stats.isComplex && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-500"></div> Dominant Eigenvector
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}