import React, { useState, useMemo, useRef, useEffect } from 'react';

const EPSILON = 1e-9;

// --- Math & Linear Algebra Helpers ---
function computeEigen(a: number, b: number, c: number, d: number) {
  const trace = a + d;
  const det = a * d - b * c;
  let discriminant = trace * trace - 4 * det;

  // Numeric stability guard
  if (Math.abs(discriminant) < EPSILON) discriminant = 0;

  if (discriminant < 0) {
    return { type: 'complex', trace, det };
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const l1 = (trace + sqrtDisc) / 2;
  const l2 = (trace - sqrtDisc) / 2;

  const getEigenvector = (lambda: number) => {
    if (Math.abs(c) > EPSILON) return [lambda - d, c];
    if (Math.abs(b) > EPSILON) return [b, lambda - a];
    return [lambda === a ? 1 : 0, lambda === d ? 1 : 0];
  };

  let v1 = getEigenvector(l1);
  let v2 = getEigenvector(l2);

  const normalize = (v: number[]) => {
    const mag = Math.hypot(v[0], v[1]);
    return mag > EPSILON ? [v[0] / mag, v[1] / mag] : [0, 0];
  };

  return {
    type: 'real',
    trace,
    det,
    l1,
    l2,
    v1: normalize(v1),
    v2: normalize(v2)
  };
}

// --- Drawing Helpers ---
function buildArrowPath(x1: number, y1: number, x2: number, y2: number, headLen = 0.4) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const w1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const w1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const w2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const w2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
  return `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${w1x} ${w1y} M ${x2} ${y2} L ${w2x} ${w2y}`;
}

const PRESETS = {
  'Identity': [1, 0, 0, 1],
  'Stretch X': [2, 0, 0, 1],
  'Shear X': [1, 1, 0, 1],
  'Rotation (90°)': [0, -1, 1, 0],
  'Saddle': [1, 1, 1, -1],
  'Complex Spiral': [0.5, -1, 1, 0.5],
};

export default function App() {
  const [matrix, setMatrix] = useState<[number, number, number, number]>([1, 0.5, 0.5, 1]);
  const [a, b, c, d] = matrix;
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const eigen = useMemo(() => computeEigen(a, b, c, d), [a, b, c, d]);

  // Handle Mouse Interaction for the SVG Grid
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setHoveredPos({ x: cursorPt.x, y: cursorPt.y });
  };

  const handleMouseLeave = () => setHoveredPos(null);

  // Generate Vector Field Grid
  const vectorField = useMemo(() => {
    const arrows = [];
    for (let x = -10; x <= 10; x += 2) {
      for (let y = -10; y <= 10; y += 2) {
        if (x === 0 && y === 0) continue;
        const tx = a * x + b * y;
        const ty = c * x + d * y;
        const mag = Math.hypot(tx, ty);
        
        if (mag > EPSILON) {
          // Normalize to a fixed short length for the field visualization
          const nx = (tx / mag) * 0.8;
          const ny = (ty / mag) * 0.8;
          
          // Color based on rotation relative to original vector
          const cross = x * ty - y * tx;
          const dot = x * tx + y * ty;
          const angle = Math.abs(Math.atan2(cross, dot));
          // Hue mapping: 0 rad -> 180 (Cyan), PI rad -> 300 (Magenta)
          const hue = 180 + (angle / Math.PI) * 120;
          
          arrows.push(
            <path
              key={`${x},${y}`}
              d={buildArrowPath(x, y, x + nx, y + ny, 0.25)}
              fill="none"
              stroke={`hsl(${hue}, 80%, 60%)`}
              strokeWidth="0.1"
              strokeOpacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
      }
    }
    return arrows;
  }, [a, b, c, d]);

  return (
    <div className="flex h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 p-6 flex flex-col gap-8 z-10 shadow-2xl">
        
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent mb-1">
            Eigen Explorer
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Vector Field Analysis
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Matrix A</h2>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <input
                key={idx}
                type="number"
                step="0.1"
                value={matrix[idx]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const newMat = [...matrix] as [number, number, number, number];
                  newMat[idx] = val;
                  setMatrix(newMat);
                }}
                className="bg-slate-950 border border-slate-700 rounded p-2 text-center text-lg font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-300">Presets</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([name, mat]) => (
              <button
                key={name}
                onClick={() => setMatrix(mat as [number, number, number, number])}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Determinant</span>
            <span className="font-mono">{eigen.det.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Trace</span>
            <span className="font-mono">{eigen.trace.toFixed(2)}</span>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 mt-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Eigenvalues</h3>
            {eigen.type === 'complex' ? (
              <div className="text-sm text-pink-400 font-mono">
                Complex Pair (Rotation)
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 font-mono text-sm">λ₁ = {eigen.l1.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-400 font-mono text-sm">λ₂ = {eigen.l2.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-auto text-xs text-slate-500">
          Hover over the grid to visualize $A\vec{v}$ transformation.
        </div>
      </div>

      {/* Main Vector Field Plot */}
      <div className="flex-1 relative bg-slate-950 cursor-crosshair">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="-12 -12 24 24"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Defs for gradients/markers */}
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="cyan" stopOpacity="0.2" />
              <stop offset="100%" stopColor="cyan" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* SVG coordinate system puts +y down. We wrap everything in a group that flips Y so it matches standard math (+y up) */}
          <g transform="scale(1, -1)">
            
            {/* Grid Lines */}
            <g stroke="#1e293b" strokeWidth="0.05">
              {Array.from({ length: 25 }).map((_, i) => {
                const pos = i - 12;
                return (
                  <React.Fragment key={i}>
                    <line x1="-12" y1={pos} x2="12" y2={pos} />
                    <line x1={pos} y1="-12" x2={pos} y2="12" />
                  </React.Fragment>
                );
              })}
            </g>

            {/* Axes */}
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#334155" strokeWidth="0.1" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#334155" strokeWidth="0.1" />

            {/* Vector Field Background */}
            {vectorField}

            {/* Eigenvector Lines (Real