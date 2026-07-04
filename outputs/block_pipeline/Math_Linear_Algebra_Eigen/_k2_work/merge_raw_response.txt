import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// --- Shared Types & Math Helpers ---

type Vector2 = [number, number];
type Matrix2x2 = [[number, number], [number, number]];

const EPSILON = 1e-9;
const cleanZero = (val: number) => (Math.abs(val) < EPSILON ? 0 : val);

function getTrace(m: Matrix2x2): number {
  return cleanZero(m[0][0] + m[1][1]);
}

function getDeterminant(m: Matrix2x2): number {
  return cleanZero(m[0][0] * m[1][1] - m[0][1] * m[1][0]);
}

function multiply(m: Matrix2x2, v: Vector2): Vector2 {
  const x = m[0][0] * v[0] + m[0][1] * v[1];
  const y = m[1][0] * v[0] + m[1][1] * v[1];
  return [
    isNaN(x) || !isFinite(x) ? 0 : Math.max(-1000, Math.min(1000, x)),
    isNaN(y) || !isFinite(y) ? 0 : Math.max(-1000, Math.min(1000, y))
  ];
}

function magnitude(v: Vector2): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function normalize(v: Vector2): Vector2 {
  const mag = magnitude(v);
  if (mag < EPSILON) return [0, 0];
  return [v[0] / mag, v[1] / mag];
}

function getEigen(m: Matrix2x2) {
  const tr = getTrace(m);
  const det = getDeterminant(m);
  const discriminant = cleanZero(tr * tr - 4 * det);

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
    if (Math.abs(b) > 1e-6) return [b, lambda - a];
    if (Math.abs(c) > 1e-6) return [lambda - d, c];
    return [1, 0];
  };

  return {
    type: 'real',
    l1,
    l2,
    v1: getVector(l1),
    v2: getVector(l2),
  };
}

// --- Module 1: Matrix Editor ---

const PRESETS_M1 = [
  { label: 'Identity', value: [1, 0, 0, 1], description: 'No transformation. Leaves space unchanged.' },
  { label: 'Scaling (2x)', value: [2, 0, 0, 2], description: 'Expands space uniformly by a factor of 2.' },
  { label: 'Rotation (90°)', value: [0, -1, 1, 0], description: 'Rotates space 90 degrees counter-clockwise.' },
  { label: 'Shear X', value: [1, 1, 0, 1], description: 'Skews space along the X axis.' },
  { label: 'Projection X', value: [1, 0, 0, 0], description: 'Collapses 2D space onto the X axis.' },
  { label: 'Complex Eigen', value: [1, -2, 2, 1], description: 'Produces complex eigenvalues (rotation + scaling).' },
  { label: 'Saddle Point', value: [2, 1, 1, -2], description: 'Stretches in one direction, squishes in another.' },
];

function MatrixEditorModule() {
  const [matrixStr, setMatrixStr] = useState<[string, string, string, string]>(['1', '0', '0', '1']);
  const [activePreset, setActivePreset] = useState<string>('Identity');

  const matrixNum = useMemo<[number, number, number, number]>(() => {
    return matrixStr.map((s) => {
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }) as [number, number, number, number];
  }, [matrixStr]);

  const handleInputChange = (index: number, value: string) => {
    const newMatrix = [...matrixStr] as [string, string, string, string];
    newMatrix[index] = value;
    setMatrixStr(newMatrix);
    setActivePreset('Custom');
  };

  const applyPreset = (preset: typeof PRESETS_M1[0]) => {
    setMatrixStr(preset.value.map(String) as [string, string, string, string]);
    setActivePreset(preset.label);
  };

  const analysis = useMemo(() => {
    const [a, b, c, d] = matrixNum;
    const formatNum = (val: number) => Number(cleanZero(val).toFixed(3));
    const trace = cleanZero(a + d);
    const det = cleanZero(a * d - b * c);
    const discriminant = cleanZero(trace * trace - 4 * det);

    let eigenvalues: string[] = [];
    let isComplex = false;

    if (discriminant < 0) {
      isComplex = true;
      const realPart = formatNum(trace / 2);
      const imagPart = formatNum(Math.sqrt(-discriminant) / 2);
      eigenvalues = [`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`];
    } else {
      const l1 = formatNum((trace + Math.sqrt(discriminant)) / 2);
      const l2 = formatNum((trace - Math.sqrt(discriminant)) / 2);
      eigenvalues = [l1.toString(), l2.toString()];
    }

    return {
      trace: formatNum(trace),
      det: formatNum(det),
      discriminant: formatNum(discriminant),
      eigenvalues,
      isComplex,
      charEq: `λ² ${trace >= 0 ? '-' : '+'} ${Math.abs(trace)}λ ${det >= 0 ? '+' : '-'} ${Math.abs(det)} = 0`
    };
  }, [matrixNum]);

  const cssTransform = `matrix(${matrixNum[0]}, ${matrixNum[2]}, ${matrixNum[1]}, ${matrixNum[3]}, 0, 0)`;

  return (
    <div className="relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full">
      <div className="max-w-5xl w-full z-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">Matrix Editor</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Adjust the components of the 2x2 matrix to see how it transforms space and alters its fundamental properties.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 rounded-3xl shadow-xl shadow-black/50 border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Matrix Editor</h2>
                <span className="px-3 py-1 bg-indigo-900/30 text-indigo-400 text-xs font-semibold rounded-full">
                  {activePreset}
                </span>
              </div>
              
              <div className="p-8 flex flex-col items-center justify-center min-h-[320px] relative">
                <div className="flex items-center justify-center group">
                  <div className="text-[120px] font-light text-slate-700 leading-none mr-6 select-none transition-colors group-hover:text-indigo-500/50">[</div>
                  <div className="grid grid-cols-2 gap-6">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type="text"
                        value={matrixStr[index]}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        className="w-24 h-24 text-center text-4xl font-semibold text-slate-100 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all hover:bg-slate-900"
                        placeholder="0"
                      />
                    ))}
                  </div>
                  <div className="text-[120px] font-light text-slate-700 leading-none ml-6 select-none transition-colors group-hover:text-indigo-500/50">]</div>
                </div>

                <div className="absolute bottom-6 right-6 w-24 h-24 border-2 border-slate-700 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                  <div 
                    className="w-8 h-8 bg-indigo-500/80 border-2 border-indigo-400 origin-center transition-transform duration-500 ease-out"
                    style={{ transform: cssTransform }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2">Presets</h3>
              <div className="flex flex-wrap gap-2">
                {PRESETS_M1.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    title={preset.description}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activePreset === preset.label
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/20 hover:text-indigo-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 rounded-3xl shadow-xl shadow-black/50 border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800 bg-slate-800/50">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Live Analysis</h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Trace (T)</div>
                    <div className="text-2xl font-semibold text-slate-100">{analysis.trace}</div>
                    <div className="text-xs text-slate-600 mt-1 font-mono">a + d</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Determinant (D)</div>
                    <div className="text-2xl font-semibold text-slate-100">{analysis.det}</div>
                    <div className="text-xs text-slate-600 mt-1 font-mono">ad - bc</div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Characteristic Equation</div>
                  <div className="text-lg font-mono tracking-wide text-indigo-300">
                    {analysis.charEq}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eigenvalues (λ)</div>
                    {analysis.isComplex && (
                      <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 border border-amber-800/50 text-[10px] font-bold uppercase tracking-wider rounded">Complex</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {analysis.eigenvalues.map((val, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${analysis.isComplex ? 'bg-amber-900/10 border-amber-900/50' : 'bg-indigo-900/10 border-indigo-900/50'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${analysis.isComplex ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-900/50 text-indigo-300'}`}>
                            λ{idx + 1}
                          </div>
                          <div className="text-xl font-mono font-semibold text-slate-200">
                            {val}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {analysis.isComplex 
                      ? "This matrix produces complex eigenvalues, indicating a rotational component in the transformation. It does not have real eigenvectors."
                      : "Real eigenvalues indicate directions (eigenvectors) that are only scaled, not rotated, by the transformation."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 2: Vector Field ---

const PRESETS_M2: Record<string, Matrix2x2> = {
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

function VectorFieldModule() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS_M2['Rotation (45°)']);
  const [animating, setAnimating] = useState(false);
  const [particle, setParticle] = useState<Vector2>([2, 0]);
  
  const eigen = useMemo(() => getEigen(matrix), [matrix]);
  const det = useMemo(() => getDeterminant(matrix), [matrix]);
  const trace = useMemo(() => getTrace(matrix), [matrix]);

  useEffect(() => {
    if (!animating) return;
    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (time - lastTime > 500) {
        setParticle(prev => {
          const next = multiply(matrix, prev);
          const mag = magnitude(next);
          if (mag > 20) return normalize(next).map(n => n * 20) as Vector2;
          if (mag < 0.1) return [2, 0];
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
    <div className="flex flex-col items-center p-4 md:p-8 w-full">
      <header className="w-full max-w-6xl mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-100">Vector Field Plot</h1>
        <p className="text-slate-400 mt-1">Visualize linear transformations and vector fields</p>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Transformation Matrix</h2>
            <div className="grid grid-cols-2 gap-3 mb-6 relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 border-l-2 border-t-2 border-b-2 border-slate-700 rounded-l-md"></div>
              <div className="absolute -right-2 top-0 bottom-0 w-1 border-r-2 border-t-2 border-b-2 border-slate-700 rounded-r-md"></div>
              
              <input type="number" step="0.1" value={matrix[0][0]} onChange={e => handleMatrixChange(0, 0, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
              <input type="number" step="0.1" value={matrix[0][1]} onChange={e => handleMatrixChange(0, 1, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
              <input type="number" step="0.1" value={matrix[1][0]} onChange={e => handleMatrixChange(1, 0, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
              <input type="number" step="0.1" value={matrix[1][1]} onChange={e => handleMatrixChange(1, 1, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Presets</label>
              <select 
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-100"
                onChange={(e) => {
                  if (PRESETS_M2[e.target.value]) setMatrix(PRESETS_M2[e.target.value]);
                }}
              >
                <option value="">Select a preset...</option>
                {Object.keys(PRESETS_M2).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Matrix Properties</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Determinant</div>
                <div className="font-mono text-lg text-slate-100">{det.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-1">{det === 0 ? 'Singular' : det < 0 ? 'Reverses orientation' : 'Preserves orientation'}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Trace</div>
                <div className="font-mono text-lg text-slate-100">{trace.toFixed(2)}</div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <div className="text-xs text-slate-500 mb-2">Eigenvalues & Eigenvectors</div>
              {eigen.type === 'real' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-indigo-900/20 p-2 rounded border border-indigo-800/50">
                    <span className="font-mono text-sm text-indigo-300">λ₁ = {eigen.l1.toFixed(2)}</span>
                    <span className="font-mono text-xs text-indigo-400">v₁ = [{eigen.v1[0].toFixed(2)}, {eigen.v1[1].toFixed(2)}]</span>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-900/20 p-2 rounded border border-emerald-800/50">
                    <span className="font-mono text-sm text-emerald-300">λ₂ = {eigen.l2.toFixed(2)}</span>
                    <span className="font-mono text-xs text-emerald-400">v₂ = [{eigen.v2[0].toFixed(2)}, {eigen.v2[1].toFixed(2)}]</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-900/20 p-3 rounded border border-amber-800/50">
                  <div className="font-mono text-sm text-amber-300 mb-1">
                    λ = {eigen.real.toFixed(2)} ± {eigen.imag.toFixed(2)}i
                  </div>
                  <p className="text-xs text-amber-500/80 leading-relaxed">
                    Complex eigenvalues indicate a rotational component. No real eigenvectors.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-800 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Vector Field Plot</h2>
            <button 
              onClick={() => {
                if (!animating) setParticle([2, 0]);
                setAnimating(!animating);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${animating ? 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50' : 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50'}`}
            >
              {animating ? 'Stop Iteration' : 'Animate Power Iteration'}
            </button>
          </div>
          <div className="flex-grow relative overflow-hidden bg-slate-950 rounded-b-xl flex items-center justify-center p-4">
            <VectorFieldSVG matrix={matrix} eigen={eigen} particle={animating ? particle : null} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VectorFieldSVG({ matrix, eigen, particle }: { matrix: Matrix2x2, eigen: ReturnType<typeof getEigen>, particle: Vector2 | null }) {
  const size = 600;
  const center = size / 2;
  const range = 10;
  const scale = size / (range * 2);

  const mapX = (x: number) => center + x * scale;
  const mapY = (y: number) => center - y * scale;

  const gridPoints = useMemo(() => {
    const points: Vector2[] = [];
    const step = 1.5;
    for (let x = -range + 1; x <= range - 1; x += step) {
      for (let y = -range + 1; y <= range - 1; y += step) {
        if (x !== 0 || y !== 0) points.push([x, y]);
      }
    }
    return points;
  }, [range]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[600px] aspect-square drop-shadow-sm">
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
        </marker>
        <marker id="arrowhead-particle" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#f43f5e" />
        </marker>
      </defs>

      <g className="text-slate-800" strokeWidth="1">
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

      <g className="text-slate-600" strokeWidth="2">
        <line x1={center} y1={0} x2={center} y2={size} stroke="currentColor" />
        <line x1={0} y1={center} x2={size} y2={center} stroke="currentColor" />
      </g>

      {eigen.type === 'real' && (
        <g strokeWidth="2" strokeDasharray="6,6" opacity="0.6">
          {(() => {
            const v1 = normalize(eigen.v1);
            if (v1[0] === 0 && v1[1] === 0) return null;
            const ext = range * 2;
            return <line x1={mapX(-v1[0] * ext)} y1={mapY(-v1[1] * ext)} x2={mapX(v1[0] * ext)} y2={mapY(v1[1] * ext)} className="text-indigo-500" stroke="currentColor" />;
          })()}
          {(() => {
            const v2 = normalize(eigen.v2);
            if (v2[0] === 0 && v2[1] === 0) return null;
            const ext = range * 2;
            return <line x1={mapX(-v2[0] * ext)} y1={mapY(-v2[1] * ext)} x2={mapX(v2[0] * ext)} y2={mapY(v2[1] * ext)} className="text-emerald-500" stroke="currentColor" />;
          })()}
        </g>
      )}

      <g>
        {gridPoints.map((pt, i) => {
          const transformed = multiply(matrix, pt);
          const dx = transformed[0] - pt[0];
          const dy = transformed[1] - pt[1];
          const arrowScale = 0.25;
          const startX = mapX(pt[0]);
          const startY = mapY(pt[1]);
          const endX = mapX(pt[0] + dx * arrowScale);
          const endY = mapY(pt[1] + dy * arrowScale);
          const mag = Math.sqrt(dx*dx + dy*dy);
          const intensity = Math.min(1, mag / (range * 2));
          
          const r = Math.round(59 + intensity * 100);
          const g = Math.round(130 + intensity * 100);
          const b = Math.round(246 + intensity * 9);

          if (mag < 0.1) return <circle key={i} cx={startX} cy={startY} r="1.5" fill={`rgb(${r},${g},${b})`} />;

          return (
            <line 
              key={i} x1={startX} y1={startY} x2={endX} y2={endY} 
              stroke={`rgb(${r},${g},${b})`} strokeWidth="1.5" markerEnd="url(#arrowhead)"
              className="transition-all duration-300 ease-out"
            />
          );
        })}
      </g>

      <g fill="none" strokeWidth="2" opacity="0.4">
        <circle cx={center} cy={center} r={scale * 2} stroke="#64748b" strokeDasharray="4,4" />
        <polygon 
          points={Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const [tx, ty] = multiply(matrix, [Math.cos(angle) * 2, Math.sin(angle) * 2]);
            return `${mapX(tx)},${mapY(ty)}`;
          }).join(' ')}
          stroke="#818cf8" fill="rgba(129, 140, 248, 0.05)"
          className="transition-all duration-300 ease-out"
        />
      </g>

      {particle && (
        <g>
          <line 
            x1={center} y1={center} x2={mapX(particle[0])} y2={mapY(particle[1])} 
            stroke="#f43f5e" strokeWidth="2.5" markerEnd="url(#arrowhead-particle)"
            className="transition-all duration-500 ease-in-out"
          />
          <circle cx={mapX(particle[0])} cy={mapY(particle[1])} r="4" fill="#e11d48" className="transition-all duration-500 ease-in-out" />
        </g>
      )}
    </svg>
  );
}

// --- Module 3: Power Iteration ---

const INITIAL_VECTOR: Vector2 = [1, 0.5];
const PRESETS_M3: Record<string, Matrix2x2> = {
  'Stretch (Real)': [[1.05, 0.1], [0.1, 1.02]],
  'Rotation (Complex)': [[0.95, -0.2], [0.2, 0.95]],
  'Shear': [[1, 0.1], [0, 1]],
  'Saddle (Unstable)': [[1.05, 0], [0, 0.95]],
  'Convergence': [[0.8, 0.1], [0.1, 0.7]],
};

function PowerIterationModule() {
  const [matrix, setMatrix] = useState<Matrix2x2>(PRESETS_M3['Stretch (Real)']);
  const [vector, setVector] = useState<Vector2>(INITIAL_VECTOR);
  const [history, setHistory] = useState<Vector2[]>([INITIAL_VECTOR]);
  const [isPlaying, setIsPlaying] = useState(false);
  const speed = 500;

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
      
      const dominantLambda = Math.abs(l1) > Math.abs(l2) ? l1 : l2;
      if (Math.abs(b) > 1e-6) dominantEigenvector = normalize([b, dominantLambda - a]);
      else if (Math.abs(c) > 1e-6) dominantEigenvector = normalize([dominantLambda - d, c]);
      else dominantEigenvector = dominantLambda === a ? [1, 0] : [0, 1];
    } else {
      isComplex = true;
      const real = (trace / 2).toFixed(3);
      const imag = (Math.sqrt(-discriminant) / 2).toFixed(3);
      eigenvalues = [`${real} + ${imag}i`, `${real} - ${imag}i`];
      maxMagnitude = Math.sqrt((trace/2)**2 + (-discriminant/4));
    }

    let stability = 'Neutral';
    if (maxMagnitude < 0.99) stability = 'Stable (Converges to 0)';
    else if (maxMagnitude > 1.01) stability = 'Unstable (Diverges)';

    return { trace, det, discriminant, eigenvalues, isComplex, dominantEigenvector, stability, maxMagnitude };
  }, [matrix]);

  const step = useCallback(() => {
    setVector(prev => {
      const nextRaw = multiply(matrix, prev);
      const nextNorm = normalize(nextRaw);
      setHistory(h => [...h.slice(-50), nextNorm]);
      return nextNorm;
    });
  }, [matrix]);

  const reset = useCallback(() => {
    setVector(INITIAL_VECTOR);
    setHistory([INITIAL_VECTOR]);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    let interval: number;
    if (isPlaying) interval = window.setInterval(step, speed);
    return () => clearInterval(interval);
  }, [isPlaying, step, speed]);

  const handleMatrixChange = (row: number, col: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix2x2;
    newMatrix[row][col] = num;
    setMatrix(newMatrix);
    reset();
  };

  const scale = 120;
  const center = 200;
  const mapX = (x: number) => center + x * scale;
  const mapY = (y: number) => center - y * scale;

  const vectorField = useMemo(() => {
    const lines = [];
    for (let x = -1.5; x <= 1.5; x += 0.3) {
      for (let y = -1.5; y <= 1.5; y += 0.3) {
        if (x === 0 && y === 0) continue;
        const [nx, ny] = multiply(matrix, [x, y]);
        const mag = magnitude([nx, ny]);
        const drawLen = 0.08; 
        const dx = (nx / mag) * drawLen;
        const dy = (ny / mag) * drawLen;
        lines.push(
          <line
            key={`vf-${x}-${y}`} x1={mapX(x)} y1={mapY(y)} x2={mapX(x + dx)} y2={mapY(y + dy)}
            stroke="#475569" strokeWidth="1" opacity="0.5"
          />
        );
      }
    }
    return lines;
  }, [matrix]);

  return (
    <div className="flex flex-col items-center p-4 md:p-8 w-full">
      <header className="w-full max-w-6xl mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-100">Power Iteration</h1>
        <p className="text-slate-400 mt-1">Visualize power iteration and linear transformations</p>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Matrix Editor</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <input type="number" step="0.1" value={matrix[0][0]} onChange={e => handleMatrixChange(0, 0, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
              <input type="number" step="0.1" value={matrix[0][1]} onChange={e => handleMatrixChange(0, 1, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
              <input type="number" step="0.1" value={matrix[1][0]} onChange={e => handleMatrixChange(1, 0, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
              <input type="number" step="0.1" value={matrix[1][1]} onChange={e => handleMatrixChange(1, 1, e.target.value)} className="w-full text-center p-3 bg-slate-950 border border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-lg text-slate-100" />
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(PRESETS_M3).map(([name, mat]) => (
                <button
                  key={name} onClick={() => { setMatrix(mat); reset(); }}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex gap-2">
                <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${isPlaying ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                  {isPlaying ? 'Pause' : 'Animate'}
                </button>
                <button onClick={step} disabled={isPlaying} className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg font-medium disabled:opacity-50 transition-colors">
                  Step
                </button>
                <button onClick={reset} className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors">
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Properties</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Determinant</span>
                <span className="font-mono font-medium text-slate-200">{stats.det.toFixed(3)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Trace</span>
                <span className="font-mono font-medium text-slate-200">{stats.trace.toFixed(3)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Eigenvalues (λ)</span>
                <div className="text-right font-mono font-medium text-indigo-400">
                  <div>λ₁ = {stats.eigenvalues[0]}</div>
                  <div>λ₂ = {stats.eigenvalues[1]}</div>
                </div>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">System Stability</span>
                <span className={`font-medium ${stats.stability.includes('Stable') ? 'text-emerald-400' : stats.stability.includes('Unstable') ? 'text-rose-400' : 'text-amber-400'}`}>
                  {stats.stability}
                </span>
              </div>
            </div>

            {stats.isComplex && (
              <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-800/50 rounded-lg text-xs text-indigo-300 leading-relaxed">
                <strong>Complex Eigenvalues:</strong> This matrix induces a rotation. Power iteration will not converge to a single real vector, but will orbit continuously.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden relative flex items-center justify-center min-h-[500px]">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <svg width="400" height="400" className="overflow-visible">
            <line x1="0" y1="200" x2="400" y2="200" stroke="#334155" strokeWidth="2" />
            <line x1="200" y1="0" x2="200" y2="400" stroke="#334155" strokeWidth="2" />
            <circle cx="200" cy="200" r={scale} fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
            
            {vectorField}

            {stats.dominantEigenvector && !stats.isComplex && (
              <line 
                x1={mapX(-stats.dominantEigenvector[0] * 2)} y1={mapY(-stats.dominantEigenvector[1] * 2)} 
                x2={mapX(stats.dominantEigenvector[0] * 2)} y2={mapY(stats.dominantEigenvector[1] * 2)} 
                stroke="#10b981" strokeWidth="2" strokeDasharray="6 6" opacity="0.4"
              />
            )}

            {history.length > 1 && (
              <polyline
                points={history.map(v => `${mapX(v[0])},${mapY(v[1])}`).join(' ')}
                fill="none" stroke="#818cf8" strokeWidth="2" opacity="0.4" strokeLinejoin="round"
              />
            )}

            {history.map((v, i) => (
              <circle key={i} cx={mapX(v[0])} cy={mapY(v[1])} r="3" fill="#6366f1" opacity={0.1 + (i / history.length) * 0.5} />
            ))}

            <line x1="200" y1="200" x2={mapX(vector[0])} y2={mapY(vector[1])} stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
            <polygon 
              points="0,-5 10,0 0,5" fill="#818cf8"
              transform={`translate(${mapX(vector[0])}, ${mapY(vector[1])}) rotate(${Math.atan2(-vector[1], vector[0]) * 180 / Math.PI})`}
            />
          </svg>

          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-700 text-xs text-slate-300 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-0.5 bg-indigo-400"></div> Current Vector (Normalized)</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-0.5 bg-indigo-800"></div> Iteration History</div>
            {!stats.isComplex && (
              <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-500"></div> Dominant Eigenvector</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 4: Stability ---

const PRESETS_M4: Record<string, Matrix2x2> = {
  'Stable Spiral': [[-0.5, -2], [2, -0.5]],
  'Stable Node': [[-2, 0], [0, -3]],
  'Unstable Spiral': [[0.5, -2], [2, 0.5]],
  'Saddle': [[1, 2], [3, 0]],
  'Center': [[0, -2], [2, 0]],
};

function StabilityModule() {
  const [matrix, setMatrix] = useState<Matrix2x2>([[-0.5, -2], [2, -0.5]]);

  const stats = useMemo(() => {
    const a = matrix[0][0], b = matrix[0][1], c = matrix[1][0], d = matrix[1][1];
    const trace = cleanZero(a + d);
    const det = cleanZero(a * d - b * c);
    const discriminant = cleanZero(trace * trace - 4 * det);

    let isComplex = false, val1 = '', val2 = '';
    if (discriminant >= 0) {
      val1 = cleanZero((trace + Math.sqrt(discriminant)) / 2).toFixed(2);
      val2 = cleanZero((trace - Math.sqrt(discriminant)) / 2).toFixed(2);
    } else {
      isComplex = true;
      const real = cleanZero(trace / 2).toFixed(2);
      const imag = cleanZero(Math.sqrt(-discriminant) / 2).toFixed(2);
      val1 = `${real} + ${imag}i`;
      val2 = `${real} - ${imag}i`;
    }

    let classification = '';
    let stability: 'stable' | 'unstable' | 'marginal' | 'saddle' = 'unstable';

    if (det < 0) {
      classification = 'Saddle Point'; stability = 'saddle';
    } else if (det > 0) {
      if (trace > 0) { classification = discriminant >= 0 ? 'Unstable Node' : 'Unstable Spiral'; stability = 'unstable'; }
      else if (trace < 0) { classification = discriminant >= 0 ? 'Stable Node' : 'Stable Spiral'; stability = 'stable'; }
      else { classification = 'Center'; stability = 'marginal'; }
    } else {
      if (trace > 0) { classification = 'Unstable Line of Equilibria'; stability = 'unstable'; }
      else if (trace < 0) { classification = 'Stable Line of Equilibria'; stability = 'stable'; }
      else { classification = 'Plane of Equilibria'; stability = 'marginal'; }
    }

    return { trace, det, discriminant, eigenvalues: { isComplex, val1, val2 }, classification, stability };
  }, [matrix]);

  const handleMatrixChange = (row: number, col: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newMatrix = [...matrix] as Matrix2x2;
    newMatrix[row][col] = num;
    setMatrix(newMatrix);
  };

  const SVG_SIZE = 400;
  const DOMAIN = 8;
  const mapX = (t: number) => (SVG_SIZE / 2) + (t * (SVG_SIZE / (2 * DOMAIN)));
  const mapY = (d: number) => (SVG_SIZE / 2) - (d * (SVG_SIZE / (2 * DOMAIN)));

  const parabolaPath = useMemo(() => {
    let path = `M ${mapX(-DOMAIN)} ${mapY(Math.pow(-DOMAIN, 2) / 4)}`;
    for (let t = -DOMAIN; t <= DOMAIN; t += 0.2) {
      path += ` L ${mapX(t)} ${mapY((t * t) / 4)}`;
    }
    return path;
  }, []);

  const stabilityColors = {
    stable: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    unstable: 'bg-rose-900/30 text-rose-400 border-rose-800',
    marginal: 'bg-amber-900/30 text-amber-400 border-amber-800',
    saddle: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="flex flex-col items-center p-4 md:p-8 w-full relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" 
        style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="max-w-6xl w-full mx-auto relative z-10">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">Trace-Determinant Plane</h1>
          <p className="text-slate-400 max-w-2xl">
            Explore the stability of 2x2 linear systems. The trace (τ) and determinant (Δ) completely determine the nature of its eigenvalues and the stability of the origin.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Matrix Editor</h2>
              <div className="flex items-center justify-center mb-6">
                <div className="relative flex flex-col gap-2 p-4 border-l-2 border-r-2 border-slate-700 rounded-lg">
                  <div className="flex gap-2">
                    <input type="number" step="0.1" value={matrix[0][0]} onChange={(e) => handleMatrixChange(0, 0, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    <input type="number" step="0.1" value={matrix[0][1]} onChange={(e) => handleMatrixChange(0, 1, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div className="flex gap-2">
                    <input type="number" step="0.1" value={matrix[1][0]} onChange={(e) => handleMatrixChange(1, 0, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    <input type="number" step="0.1" value={matrix[1][1]} onChange={(e) => handleMatrixChange(1, 1, e.target.value)} className="w-20 text-center font-mono text-lg bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(PRESETS_M4).map(([name, mat]) => (
                  <button key={name} onClick={() => setMatrix(mat)} className="text-xs font-medium px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors">
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 space-y-4">
              <div className={`p-4 rounded-xl border ${stabilityColors[stats.stability]} flex items-center justify-between`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">System Classification</p>
                  <p className="text-lg font-semibold">{stats.classification}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-400 mb-1">Trace (τ)</p>
                  <p className="text-2xl font-mono font-medium text-slate-100">{stats.trace.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">λ₁ + λ₂</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-400 mb-1">Determinant (Δ)</p>
                  <p className="text-2xl font-mono font-medium text-slate-100">{stats.det.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">λ₁ × λ₂</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-sm text-slate-400 mb-2">Eigenvalues (λ)</p>
                <div className="font-mono text-slate-200 space-y-1">
                  {stats.eigenvalues.isComplex ? (
                    <p>λ = {stats.eigenvalues.val1.replace('+', '±')}</p>
                  ) : (
                    <>
                      <p>λ₁ = {stats.eigenvalues.val1}</p>
                      <p>λ₂ = {stats.eigenvalues.val2}</p>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-3 border-t border-slate-800 pt-2">
                  Discriminant (τ² - 4Δ) = {stats.discriminant.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex-grow flex flex-col items-center justify-center relative">
              <div className="absolute top-6 left-6 flex flex-col gap-2 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-900/50 border border-emerald-500 rounded-sm"></div> Stable (Sink)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-900/50 border border-rose-500 rounded-sm"></div> Unstable (Source)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-800 border border-slate-500 rounded-sm"></div> Saddle</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-900/50 border border-amber-500 rounded-sm"></div> Center / Marginal</div>
              </div>
              
              <svg width={SVG_SIZE} height={SVG_SIZE} className="w-full h-auto max-w-[400px] aspect-square overflow-visible">
                <line x1={0} y1={SVG_SIZE/2} x2={SVG_SIZE} y2={SVG_SIZE/2} stroke="#475569" strokeWidth="2" />
                <line x1={SVG_SIZE/2} y1={0} x2={SVG_SIZE/2} y2={SVG_SIZE} stroke="#475569" strokeWidth="2" />
                <path d={parabolaPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx={mapX(stats.trace)} cy={mapY(stats.det)} r="6" fill="#818cf8" className="transition-all duration-300" />
                <text x={SVG_SIZE - 40} y={SVG_SIZE/2 - 10} fill="#94a3b8" fontSize="12">Trace (τ)</text>
                <text x={SVG_SIZE/2 + 10} y={20} fill="#94a3b8" fontSize="12">Det (Δ)</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Module 5: Complex Eigenvalues ---

function ComplexEigenModule() {
  const [a, setA] = useState<number>(0.95);
  const [b, setB] = useState<number>(0.3);
  const [animStep, setAnimStep] = useState<number>(0);

  const mag = Math.sqrt(a * a + b * b);
  const angleRad = Math.atan2(b, a);
  const angleDeg = angleRad * (180 / Math.PI);

  const trajectory = useMemo(() => {
    const points = [];
    let cx = 2, cy = 0;
    for (let i = 0; i < 60; i++) {
      points.push({ x: cx, y: cy });
      const nx = a * cx - b * cy;
      const ny = b * cx + a * cy;
      cx = nx; cy = ny;
      if (Math.abs(cx) > 100 || Math.abs(cy) > 100) break;
    }
    return points;
  }, [a, b]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep((prev) => {
        if (trajectory.length === 0) return 0;
        return (prev + 1) % trajectory.length;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [trajectory.length]);

  const svgSize = 300;
  const center = svgSize / 2;
  const scale = 20;
  const mapX = (x: number) => center + x * scale;
  const mapY = (y: number) => center - y * scale;

  let behaviorTitle = "", behaviorDesc = "", statusColor = "", statusBg = "";
  if (b === 0) {
    behaviorTitle = "Purely Real"; behaviorDesc = "No imaginary component. The system scales without rotation."; statusColor = "text-slate-400"; statusBg = "bg-slate-900 border-slate-800";
  } else if (Math.abs(mag - 1) < 0.01) {
    behaviorTitle = "Pure Rotation (Center)"; behaviorDesc = "Magnitude is exactly 1. The system rotates continuously without growing or shrinking."; statusColor = "text-blue-400"; statusBg = "bg-blue-900/20 border-blue-800/50";
  } else if (mag < 1) {
    behaviorTitle = "Spiral Sink (Stable)"; behaviorDesc = "Magnitude < 1. The system rotates and contracts towards the origin."; statusColor = "text-emerald-400"; statusBg = "bg-emerald-900/20 border-emerald-800/50";
  } else {
    behaviorTitle = "Spiral Source (Unstable)"; behaviorDesc = "Magnitude > 1. The system rotates and expands away from the origin."; statusColor = "text-rose-400"; statusBg = "bg-rose-900/20 border-rose-800/50";
  }

  return (
    <div className="flex items-center justify-center p-4 w-full relative overflow-hidden min-h-full">
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div className="bg-slate-900/90 backdrop-blur-md shadow-2xl rounded-3xl border border-slate-800 w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative z-10">
        <div className="bg-slate-950 p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-800 w-full md:w-1/2">
          <h2 className="text-slate-100 text-xl font-semibold mb-6 tracking-wide">Phase Portrait</h2>
          <div className="relative bg-slate-900 rounded-2xl shadow-inner p-4 border border-slate-800">
            <svg width={svgSize} height={svgSize} className="overflow-visible">
              <line x1={0} y1={center} x2={svgSize} y2={center} stroke="#334155" strokeWidth="1" />
              <line x1={center} y1={0} x2={center} y2={svgSize} stroke="#334155" strokeWidth="1" />
              {[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map(tick => (
                <React.Fragment key={tick}>
                  <line x1={mapX(tick)} y1={center - 3} x2={mapX(tick)} y2={center + 3} stroke="#334155" strokeWidth="1" />
                  <line x1={center - 3} y1={mapY(tick)} x2={center + 3} y2={mapY(tick)} stroke="#334155" strokeWidth="1" />
                </React.Fragment>
              ))}
              {trajectory.length > 1 && (
                <polyline points={trajectory.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {trajectory[animStep] && (
                <g>
                  <line x1={center} y1={center} x2={mapX(trajectory[animStep].x)} y2={mapY(trajectory[animStep].y)} stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />
                  <circle cx={mapX(trajectory[animStep].x)} cy={mapY(trajectory[animStep].y)} r="5" fill="#60a5fa" />
                </g>
              )}
            </svg>
          </div>
          <div className="mt-6 text-slate-500 text-sm text-center">Tracing the path of a vector under repeated multiplication by the matrix.</div>
        </div>

        <div className="p-8 flex flex-col w-full md:w-1/2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Complex Eigenvalues</h1>
            <p className="text-slate-400 leading-relaxed">
              When a 2x2 matrix has complex eigenvalues <span className="font-mono bg-slate-800 px-1 rounded text-sm text-slate-300">λ = a ± bi</span>, it implies the transformation includes a <strong>rotation</strong>.
            </p>
          </div>

          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 mb-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Matrix Form</div>
              <div className="font-mono text-lg text-slate-200 flex items-center gap-2">
                <span className="text-2xl font-light text-slate-600">[</span>
                <div className="flex flex-col items-center leading-tight">
                  <span>{a.toFixed(2)} &nbsp; {(-b).toFixed(2)}</span>
                  <span>{b.toFixed(2)} &nbsp; {a.toFixed(2)}</span>
                </div>
                <span className="text-2xl font-light text-slate-600">]</span>
              </div>
            </div>
            <div className="h-px w-full bg-slate-800"></div>
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Eigenvalues</div>
              <div className="font-mono text-lg text-indigo-400 font-medium">λ = {a.toFixed(2)} ± {Math.abs(b).toFixed(2)}i</div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Real Part (a) - <span className="text-slate-500 font-normal">Scaling</span></label>
                <span className="font-mono text-sm text-slate-400">{a.toFixed(2)}</span>
              </div>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={a} onChange={(e) => setA(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Imaginary Part (b) - <span className="text-slate-500 font-normal">Rotation</span></label>
                <span className="font-mono text-sm text-slate-400">{b.toFixed(2)}</span>
              </div>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={b} onChange={(e) => setB(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
          </div>

          <div className={`mt-auto rounded-xl p-5 border ${statusBg}`}>
            <div className="flex justify-between items-end mb-2">
              <h3 className={`font-bold text-lg ${statusColor}`}>{behaviorTitle}</h3>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-semibold">Magnitude (|λ|)</div>
                <div className={`font-mono font-bold ${statusColor}`}>{mag.toFixed(3)}</div>
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              {behaviorDesc} The rotation angle per step is roughly <strong>{Math.abs(angleDeg).toFixed(1)}°</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

const TABS = [
  { id: 'editor', label: 'Matrix Editor' },
  { id: 'vector-field', label: 'Vector Field' },
  { id: 'power-iteration', label: 'Power Iteration' },
  { id: 'stability', label: 'Stability Region' },
  { id: 'complex', label: 'Complex Eigenvalues' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row selection:bg-indigo-500/30">
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-indigo-400">Eigen Explorer</h1>
          <p className="text-xs text-slate-500 mt-1">Linear Algebra Visualizer</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto flex flex-row md:flex-col gap-2 md:gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap md:whitespace-normal ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto flex">
        {activeTab === 'editor' && <MatrixEditorModule />}
        {activeTab === 'vector-field' && <VectorFieldModule />}
        {activeTab === 'power-iteration' && <PowerIterationModule />}
        {activeTab === 'stability' && <StabilityModule />}
        {activeTab === 'complex' && <ComplexEigenModule />}
      </main>
    </div>
  );
}