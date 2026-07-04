import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- Math & Types ---

type Matrix2x2 = [[number, number], [number, number]];
type Vector2 = [number, number];

const PRESETS: Record<string, Matrix2x2> = {
  'Identity': [[1, 0], [0, 1]],
  'Rotation (90°)': [[0, -1], [1, 0]],
  'Rotation (45°)': [[0.707, -0.707], [0.707, 0.707]],
  'Stretch X': [[2, 0], [0, 1]],
  'Squash Y': [[1, 0], [0, 0.5]],
  'Shear X': [[1, 1], [0, 1]],
  'Projection X': [[1, 0], [0, 0]],
  'Complex (Spiral)': [[0.8, -0.5], [0.5, 0.8]],
  'Saddle': [[1.5, 0], [0, 0.5]],
};

function getDeterminant(m: Matrix2x2): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

function getTrace(m: Matrix2x2): number {
  return m[0][0] + m[1][1];
}

function getEigen(m: Matrix2x2) {
  const tr = getTrace(m);
  const det = getDeterminant(m);
  const discriminant = tr * tr - 4 * det;

  if (discriminant < 0) {
    return {
      type: 'complex',
      real: tr / 2,
      imag: Math.sqrt(-discriminant) / 2,
    };
  }

  const l1 = (tr + Math.sqrt(discriminant)) / 2;
  const l2 = (tr - Math.sqrt(discriminant)) / 2;

  const getVector = (lambda: number): Vector2 => {
    const [a, b] = m[0];
    const [c, d] = m[1];
    
    // Numeric stability guard
    if (Math.abs(b) > 1e-6) return [b, lambda - a];
    if (Math.abs(c) > 1e-6) return [lambda - d, c];
    return [1, 0]; // Diagonal matrix fallback
  };

  return {
    type: 'real',
    l1,
    l2,
    v1: getVector(l1),
    v2: getVector(l2),
  };
}

function normalize(v: Vector2): Vector2 {
  const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (mag < 1e-6) return [0, 0];
  return [v[0] / mag, v[1] / mag];
}

function applyMatrix(m: Matrix2x2, v: Vector2): Vector2 {
  const x = m[0][0] * v[0] + m[0][1] * v[1];
  const y = m[1][0] * v[0] + m[1][1] * v[1];
  // Numeric stability guard
  return [
    isNaN(x) || !isFinite(x) ? 0 : Math.max(-1000, Math.min(1000, x)),
    isNaN(y) || !isFinite(y) ? 0 : Math.max(-1000, Math.min(1000, y))
  ];
}

// --- Components ---

export default function App() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS['Rotation (45°)']);
  const [animating, setAnimating] = useState(false);
  const [particle, setParticle] = useState<Vector2>([2, 0]);
  
  const eigen = useMemo(() => getEigen(matrix), [matrix]);
  const det = useMemo(() => getDeterminant(matrix), [matrix]);
  const trace = useMemo(() => getTrace(matrix), [matrix]);

  // Animation loop for power iteration
  useEffect(() => {
    if (!animating) return;
    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (time - lastTime > 500) { // Update every 500ms
        setParticle(prev => {
          const next = applyMatrix(matrix, prev);
          // Prevent exploding to infinity visually
          const mag = Math.sqrt(next[0]*next[0] + next[1]*next[1]);
          if (mag > 20) return normalize(next).map(n => n * 20) as Vector2;
          if (mag < 0.1) return [2, 0]; // Reset if it vanishes
          return next;
        });
        lastTime = time;
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [animating, matrix]);

  const handleMatrixChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix2x2;
    newMatrix[row][col] = num;
    setMatrix(newMatrix);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-900">Eigen Explorer</h1>
        <p className="text-slate-500 mt-1">Visualize linear transformations and vector fields</p>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel: Controls */}
        <div className="flex flex-col gap-6">
          
          {/* Matrix Editor */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Transformation Matrix</h2>
            <div className="grid grid-cols-2 gap-3 mb-6 relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 border-l-2 border-t-2 border-b-2 border-slate-300 rounded-l-md"></div>
              <div className="absolute -right-2 top-0 bottom-0 w-1 border-r-2 border-t-2 border-b-2 border-slate-300 rounded-r-md"></div>
              
              <input type="number" step="0.1" value={matrix[0][0]} onChange={e => handleMatrixChange(0, 0, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
              <input type="number" step="0.1" value={matrix[0][1]} onChange={e => handleMatrixChange(0, 1, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
              <input type="number" step="0.1" value={matrix[1][0]} onChange={e => handleMatrixChange(1, 0, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
              <input type="number" step="0.1" value={matrix[1][1]} onChange={e => handleMatrixChange(1, 1, e.target.value)} className="w-full text-center p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Presets</label>
              <select 
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => {
                  if (PRESETS[e.target.value]) setMatrix(PRESETS[e.target.value]);
                }}
              >
                <option value="">Select a preset...</option>
                {Object.keys(PRESETS).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Properties Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Matrix Properties</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Determinant</div>
                <div className="font-mono text-lg">{det.toFixed(2)}</div>
                <div className="text-[10px] text-slate-400 mt-1">{det === 0 ? 'Singular (Collapses space)' : det < 0 ? 'Reverses orientation' : 'Preserves orientation'}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Trace</div>
                <div className="font-mono text-lg">{trace.toFixed(2)}</div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-500 mb-2">Eigenvalues & Eigenvectors</div>
              {eigen.type === 'real' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded border border-indigo-100">
                    <span className="font-mono text-sm text-indigo-700">λ₁ = {eigen.l1.toFixed(2)}</span>
                    <span className="font-mono text-xs text-indigo-500">v₁ = [{eigen.v1[0].toFixed(2)}, {eigen.v1[1].toFixed(2)}]</span>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-50/50 p-2 rounded border border-emerald-100">
                    <span className="font-mono text-sm text-emerald-700">λ₂ = {eigen.l2.toFixed(2)}</span>
                    <span className="font-mono text-xs text-emerald-500">v₂ = [{eigen.v2[0].toFixed(2)}, {eigen.v2[1].toFixed(2)}]</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/50 p-3 rounded border border-amber-100">
                  <div className="font-mono text-sm text-amber-700 mb-1">
                    λ = {eigen.real.toFixed(2)} ± {eigen.imag.toFixed(2)}i
                  </div>
                  <p className="text-xs text-amber-600 leading-relaxed">
                    Complex eigenvalues indicate a rotational component. The space is being rotated and scaled, so there are no real eigenvectors (invariant directions).
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Panel: Vector Field Visualization */}
        <div className="lg:col-span-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Vector Field Plot</h2>
            <button 
              onClick={() => {
                if (!animating) setParticle([2, 0]);
                setAnimating(!animating);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${animating ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
            >
              {animating ? 'Stop Iteration' : 'Animate Power Iteration'}
            </button>
          </div>
          
          <div className="flex-grow relative overflow-hidden bg-[#fafafa] rounded-b-xl flex items-center justify-center p-4">
            <VectorFieldPlot matrix={matrix} eigen={eigen} particle={animating ? particle : null} />
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Vector Field Plot Component ---

interface VectorFieldPlotProps {
  matrix: Matrix2x2;
  eigen: ReturnType<typeof getEigen>;
  particle: Vector2 | null;
}

function VectorFieldPlot({ matrix, eigen, particle }: VectorFieldPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Coordinate system setup
  const size = 600;
  const center = size / 2;
  const range = 10; // -10 to 10
  const scale = size / (range * 2);

  // Map logical coordinates to SVG coordinates
  const mapX = (x: number) => center + x * scale;
  const mapY = (y: number) => center - y * scale; // Y is inverted in SVG

  // Generate grid points for the vector field
  const gridPoints = useMemo(() => {
    const points: Vector2[] = [];
    const step = 1.5;
    for (let x = -range + 1; x <= range - 1; x += step) {
      for (let y = -range + 1; y <= range - 1; y += step) {
        if (x !== 0 || y !== 0) {
          points.push([x, y]);
        }
      }
    }
    return points;
  }, [range]);

  return (
    <svg 
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`} 
      className="w-full h-auto max-w-[600px] aspect-square drop-shadow-sm"
      style={{ touchAction: 'none' }}
    >
      <defs>
        {/* Arrowhead marker for vector field */}
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
        </marker>
        <marker id="arrowhead-particle" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#e11d48" />
        </marker>
      </defs>

      {/* Grid Lines */}
      <g className="text-slate-200" strokeWidth="1">
        {Array.from({ length: range * 2 + 1 }).map((_, i) => {
          const pos = mapX(i - range);
          return (
            <React.Fragment key={i}>
              <line x1={pos} y1={0} x2={pos} y2={size} stroke="currentColor" />
              <line x1={0} y1={pos} x2={size} y2={pos} stroke="currentColor" />
            </React.Fragment>
          );
        })}
      </g>

      {/* Axes */}
      <g className="text-slate-400" strokeWidth="2">
        <line x1={center} y1={0} x2={center} y2={size} stroke="currentColor" />
        <line x1={0} y1={center} x2={size} y2={center} stroke="currentColor" />
      </g>

      {/* Eigenvectors (if real) */}
      {eigen.type === 'real' && (
        <g strokeWidth="2" strokeDasharray="6,6" opacity="0.6">
          {/* Eigenvector 1 */}
          {(() => {
            const v1 = normalize(eigen.v1);
            if (v1[0] === 0 && v1[1] === 0) return null;
            const ext = range * 2;
            return (
              <line 
                x1={mapX(-v1[0] * ext)} y1={mapY(-v1[1] * ext)} 
                x2={mapX(v1[0] * ext)} y2={mapY(v1[1] * ext)} 
                className="text-indigo-500" stroke="currentColor" 
              />
            );
          })()}
          {/* Eigenvector 2 */}
          {(() => {
            const v2 = normalize(eigen.v2);
            if (v2[0] === 0 && v2[1] === 0) return null;
            const ext = range * 2;
            return (
              <line 
                x1={mapX(-v2[0] * ext)} y1={mapY(-v2[1] * ext)} 
                x2={mapX(v2[0] * ext)} y2={mapY(v2[1] * ext)} 
                className="text-emerald-500" stroke="currentColor" 
              />
            );
          })()}
        </g>
      )}

      {/* Vector Field */}
      <g>
        {gridPoints.map((pt, i) => {
          const transformed = applyMatrix(matrix, pt);
          
          // We plot the displacement vector (transformed - original) scaled down for visibility
          const dx = transformed[0] - pt[0];
          const dy = transformed[1] - pt[1];
          
          // Visual scaling factor for the arrows to prevent too much overlap
          const arrowScale = 0.25;
          
          const startX = mapX(pt[0]);
          const startY = mapY(pt[1]);
          const endX = mapX(pt[0] + dx * arrowScale);
          const endY = mapY(pt[1] + dy * arrowScale);

          // Calculate magnitude of transformation to color code
          const mag = Math.sqrt(dx*dx + dy*dy);
          const maxExpectedMag = range * 2;
          const intensity = Math.min(1, mag / maxExpectedMag);
          
          // Color gradient from slate to blue based on intensity
          const r = Math.round(148 - intensity * 100);
          const g = Math.round(163 - intensity * 50);
          const b = Math.round(184 + intensity * 71);

          // Skip drawing if the vector is extremely small
          if (mag < 0.1) {
            return <circle key={i} cx={startX} cy={startY} r="1.5" fill={`rgb(${r},${g},${b})`} />;
          }

          return (
            <line 
              key={i}
              x1={startX} 
              y1={startY} 
              x2={endX} 
              y2={endY} 
              stroke={`rgb(${r},${g},${b})`}
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
              className="transition-all duration-300 ease-out"
            />
          );
        })}
      </g>

      {/* Unit Circle Transformation */}
      <g fill="none" strokeWidth="2" opacity="0.4">
        {/* Original Unit Circle */}
        <circle cx={center} cy={center} r={scale * 2} stroke="#94a3b8" strokeDasharray="4,4" />
        
        {/* Transformed Unit Circle (Ellipse) */}
        <polygon 
          points={Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const x = Math.cos(angle) * 2;
            const y = Math.sin(angle) * 2;
            const [tx, ty] = applyMatrix(matrix, [x, y]);
            return `${mapX(tx)},${mapY(ty)}`;
          }).join(' ')}
          stroke="#6366f1"
          fill="rgba(99, 102, 241, 0.05)"
          className="transition-all duration-300 ease-out"
        />
      </g>

      {/* Particle Animation (Power Iteration) */}
      {particle && (
        <g>
          <line 
            x1={center} 
            y1={center} 
            x2={mapX(particle[0])} 
            y2={mapY(particle[1])} 
            stroke="#e11d48" 
            strokeWidth="2.5"
            markerEnd="url(#arrowhead-particle)"
            className="transition-all duration-500 ease-in-out"
          />
          <circle 
            cx={mapX(particle[0])} 
            cy={mapY(particle[1])} 
            r="4" 
            fill="#be123c" 
            className="transition-all duration-500 ease-in-out"
          />
        </g>
      )}
    </svg>
  );
}