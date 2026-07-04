import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// --- MATH UTILITIES & NUMERIC GUARDS ---

const EPSILON = 1e-9;

function isZero(val: number) {
  return Math.abs(val) < EPSILON;
}

function solveEigensystem(a: number, b: number, c: number, d: number) {
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;
  
  const result = {
    trace,
    det,
    isComplex: discriminant < -EPSILON,
    eigenvalues: [] as number[],
    eigenvectors: [] as {x: number, y: number}[],
    lambdaComplex: null as { real: number, imag: number } | null
  };

  if (result.isComplex) {
    result.lambdaComplex = {
      real: trace / 2,
      imag: Math.sqrt(-discriminant) / 2
    };
  } else {
    // Real eigenvalues
    const sqrtDisc = Math.sqrt(Math.max(0, discriminant));
    const l1 = (trace + sqrtDisc) / 2;
    const l2 = (trace - sqrtDisc) / 2;
    
    // Only keep distinct or repeated (will push l2 if diff, or just l1 if repeated)
    result.eigenvalues.push(l1);
    if (Math.abs(l1 - l2) > EPSILON) {
      result.eigenvalues.push(l2);
    }

    // Compute eigenvectors robustly
    result.eigenvalues.forEach(lambda => {
      // Matrix (A - lambda*I)
      const a11 = a - lambda;
      const a12 = b;
      const a21 = c;
      const a22 = d - lambda;

      // The rows of (A - lambda*I) are linearly dependent. 
      // The eigenvector is orthogonal to the rows.
      // We pick the row with the larger magnitude for numerical stability.
      let vx, vy;
      if (Math.abs(a11) + Math.abs(a12) > Math.abs(a21) + Math.abs(a22)) {
        vx = -a12;
        vy = a11;
      } else {
        vx = -a22;
        vy = a21;
      }

      // If vx, vy are both close to 0, it means A is a multiple of Identity.
      if (isZero(vx) && isZero(vy)) {
        result.eigenvectors.push({ x: 1, y: 0 }); // Any vector is an eigenvector
      } else {
        const mag = Math.sqrt(vx * vx + vy * vy);
        result.eigenvectors.push({ x: vx / mag, y: vy / mag });
      }
    });
  }

  return result;
}

// Map a stretch factor to a color (cool colors for shrinking, warm for stretching)
function getStretchColor(stretch: number) {
  if (stretch < 1) {
    // Shrink: Blue to Teal
    const t = Math.max(0, stretch); // 0 to 1
    return `rgb(14, ${Math.floor(165 * t)}, ${Math.floor(255 * (1 - t * 0.5))})`;
  } else {
    // Stretch: Yellow to Red
    const t = Math.min(1, (stretch - 1) / 3); // 1 to 4 maps to 0 to 1
    return `rgb(255, ${Math.floor(200 * (1 - t))}, ${Math.floor(50 * (1 - t))})`;
  }
}

// --- COMPONENTS ---

export default function App() {
  // State: Matrix [a, b, c, d]
  const [matrix, setMatrix] = useState<[number, number, number, number]>([1, 0.5, 0.5, 1]);
  const [a, b, c, d] = matrix;

  // State: Power Iteration Path
  const [powerPath, setPowerPath] = useState<{x: number, y: number}[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // SVG Coordinate System
  const svgSize = 600;
  const mathRange = 8; // -8 to 8
  const scale = svgSize / (mathRange * 2);
  const center = svgSize / 2;

  const toSvgX = (x: number) => center + x * scale;
  const toSvgY = (y: number) => center - y * scale;
  
  const fromSvgX = (sx: number) => (sx - center) / scale;
  const fromSvgY = (sy: number) => -(sy - center) / scale;

  // Math derivations
  const eigensystem = useMemo(() => solveEigensystem(a, b, c, d), [a, b, c, d]);

  // Generate Vector Field
  const vectorField = useMemo(() => {
    const vectors = [];
    const step = 1;
    for (let x = -mathRange; x <= mathRange; x += step) {
      for (let y = -mathRange; y <= mathRange; y += step) {
        if (x === 0 && y === 0) continue;
        
        const ux = a * x + b * y;
        const uy = c * x + d * y;
        
        const magOriginal = Math.sqrt(x * x + y * y);
        const magTransformed = Math.sqrt(ux * ux + uy * uy);
        
        // Numeric stability: prevent division by zero or massive stretch
        if (magOriginal < EPSILON) continue;
        
        const stretch = magTransformed / magOriginal;
        const color = getStretchColor(stretch);

        // Normalize direction for drawing uniform arrows
        const dirX = magTransformed > EPSILON ? ux / magTransformed : 0;
        const dirY = magTransformed > EPSILON ? uy / magTransformed : 0;
        
        const arrowLength = 0.65; // fixed length in math units

        vectors.push({
          x, y,
          tx: x + dirX * arrowLength,
          ty: y + dirY * arrowLength,
          color,
          stretch
        });
      }
    }
    return vectors;
  }, [a, b, c, d]);

  // Handlers
  const handleMatrixChange = (index: number, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const newMatrix = [...matrix] as [number, number, number, number];
      newMatrix[index] = num;
      setMatrix(newMatrix);
      setPowerPath([]); // Reset path on matrix change
    }
  };

  const applyPreset = (preset: [number, number, number, number]) => {
    setMatrix(preset);
    setPowerPath([]);
  };

  // Power Iteration Interaction
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    
    const mx = fromSvgX(sx);
    const my = fromSvgY(sy);
    
    generatePowerPath(mx, my);
  };

  const generatePowerPath = (startX: number, startY: number) => {
    setIsAnimating(true);
    let path = [{ x: startX, y: startY }];
    let cx = startX;
    let cy = startY;
    
    for (let i = 0; i < 15; i++) {
      const nx = a * cx + b * cy;
      const ny = c * cx + d * cy;
      
      // Stop if it blows up beyond reasonable bounds
      if (Math.abs(nx) > 1000 || Math.abs(ny) > 1000) break;
      // Stop if it collapses to zero
      if (Math.abs(nx) < EPSILON && Math.abs(ny) < EPSILON) {
        path.push({ x: 0, y: 0 });
        break;
      }
      
      path.push({ x: nx, y: ny });
      cx = nx;
      cy = ny;
    }
    
    // Animate the path reveal
    setPowerPath([]);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setPowerPath(path.slice(0, step));
      if (step >= path.length) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 150);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* LEFT PANEL: Controls & Information */}
      <div className="w-96 bg-white border-r border-slate-200 shadow-xl z-10 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Eigen Explorer</h1>
          <p className="text-sm text-slate-500">Linear Algebra Communicator</p>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-8">
          
          {/* Matrix Editor */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Transformation Matrix</h2>
            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
              <div className="absolute left-2 top-2 bottom-2 w-2 border-l-2 border-t-2 border-b-2 border-slate-300 rounded-l"></div>
              <div className="absolute right-2 top-2 bottom-2 w-2 border-r-2 border-t-2 border-b-2 border-slate-300 rounded-r"></div>
              
              <input type="number" step="0.1" value={a} onChange={(e) => handleMatrixChange(0, e.target.value)}
                className="w-full text-center text-lg font-mono bg-white border border-slate-200 rounded py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none z-10" />
              <input type="number" step="0.1" value={b} onChange={(e) => handleMatrixChange(1, e.target.value)}
                className="w-full text-center text-lg font-mono bg-white border border-slate-200 rounded py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none z-10" />
              <input type="number" step="0.1" value={c} onChange={(e) => handleMatrixChange(2, e.target.value)}
                className="w-full text-center text-lg font-mono bg-white border border-slate-200 rounded py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none z-10" />
              <input type="number" step="0.1" value={d} onChange={(e) => handleMatrixChange(3, e.target.value)}
                className="w-full text-center text-lg font-mono bg-white border border-slate-200 rounded py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none z-10" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyPreset([1, 0, 0, 1])} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors font-medium text-slate-600">Identity</button>
              <button onClick={() => applyPreset([0, -1, 1, 0])} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors font-medium text-slate-600">Rotation 90°</button>
              <button onClick={() => applyPreset([1, 1, 0, 1])} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors font-medium text-slate-600">Shear X</button>
              <button onClick={() => applyPreset([1.5, 0, 0, 0.5])} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors font-medium text-slate-600">Saddle</button>
              <button onClick={() => applyPreset([0.8, -0.5, 0.5, 0.8])} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors font-medium text-slate-600">Spiral</button>
            </div>
          </section>

          {/* Eigensystem Info Card */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Eigensystem Properties</h2>
            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-inner">
              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-700">
                <div>
                  <div className="text-slate-400 text-xs mb-1">Determinant</div>
                  <div className="font-mono text-lg">{eigensystem.det.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Trace</div>
                  <div className="font-mono text-lg">{eigensystem.trace.toFixed(2)}</div>
                </div>
              </div>

              {eigensystem.isComplex ? (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <h3 className="text-sm font-semibold text-purple-300">Complex Eigenvalues</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    The matrix produces rotation. There are no real eigenvectors because vectors are rotated off their original span.
                  </p>
                  <div className="font-mono text-sm bg-slate-800 p-2 rounded">
                    λ = {eigensystem.lambdaComplex?.real.toFixed(2)} ± {eigensystem.lambdaComplex?.imag.toFixed(2)}i
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <h3 className="text-sm font-semibold text-emerald-300">Real Eigenvalues</h3>
                  </div>
                  <div className="space-y-3 mt-3">
                    {eigensystem.eigenvalues.map((lam, idx) => (
                      <div key={idx} className="bg-slate-800 p-2 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-sm text-emerald-200">λ<sub className="text-[10px]">{idx+1}</sub> = {lam.toFixed(2)}</span>
                        </div>
                        {eigensystem.eigenvectors[idx] && (
                          <div className="text-xs text-slate-400 font-mono">
                            v = [{eigensystem.eigenvectors[idx].x.toFixed(2)}, {eigensystem.eigenvectors[idx].y.toFixed(2)}]
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Instructions */}
          <section className="mt-auto">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
              <strong className="block mb-1">Interactive Vector Field</strong>
              Arrows show the direction of $Av$. Color indicates stretch (warm) or shrink (cool).
              <br/><br/>
              <strong>Click anywhere</strong> on the grid to animate the Power Iteration convergence.
            </div>
          </section>

        </div>
      </div>

      {/* RIGHT PANEL: Visualization */}
      <div className="flex-1 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100 to-slate-200 relative p-8">
        
        <div className="relative shadow-2xl rounded-2xl bg-white overflow-hidden border border-slate-200">
          <svg 
            width={svgSize} 
            height={svgSize} 
            className="cursor-crosshair block"
            onClick={handleSvgClick}
          >
            <defs>
              {/* Arrowhead Marker */}
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="context-stroke" />
              </marker>
              
              {/* Arrowhead Marker for Power Path */}
              <marker id="arrowhead-path" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0, 5 2.5, 0 5" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Grid Lines */}
            <g className="text-slate-100 stroke-current" strokeWidth="1">
              {Array.from({ length: mathRange * 2 + 1 }).map((_, i) => {