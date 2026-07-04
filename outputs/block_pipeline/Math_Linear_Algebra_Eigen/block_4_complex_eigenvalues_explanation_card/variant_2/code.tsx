import React, { useState, useMemo } from 'react';

// --- Numeric Stability Guards ---
// Prevents floating point errors (e.g., 1.0000000000000002) and normalizes -0 to 0
const clean = (val: number): number => {
  const rounded = Math.round(val * 10000) / 10000;
  return rounded === 0 ? 0 : rounded;
};

const formatComplex = (real: number, imag: number): string => {
  const r = clean(real);
  const i = clean(imag);
  if (i === 0) return `${r}`;
  if (r === 0) return i === 1 ? `i` : i === -1 ? `-i` : `${i}i`;
  const sign = i > 0 ? '+' : '-';
  const absI = Math.abs(i);
  return `${r} ${sign} ${absI === 1 ? 'i' : absI + 'i'}`;
};

export default function App() {
  // We parameterize the 2x2 matrix via a rotation angle and a scale factor 
  // to guarantee complex eigenvalues (when angle % 180 !== 0).
  const [angleDeg, setAngleDeg] = useState<number>(45);
  const [scale, setScale] = useState<number>(1.0);

  // Derived mathematical properties
  const mathData = useMemo(() => {
    const theta = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    // Matrix elements: [a, b]
    //                  [c, d]
    const a = scale * cos;
    const b = scale * -sin;
    const c = scale * sin;
    const d = scale * cos;

    const trace = a + d;
    const det = a * d - b * c;

    // Characteristic equation: λ² - Tr(A)λ + Det(A) = 0
    // Discriminant: Δ = Tr(A)² - 4*Det(A)
    const discriminant = trace * trace - 4 * det;
    
    // For a pure rotation/scale, Δ will be <= 0.
    const isComplex = discriminant < 0;
    
    let eigen1 = '', eigen2 = '';
    
    if (isComplex) {
      const realPart = trace / 2;
      const imagPart = Math.sqrt(-discriminant) / 2;
      eigen1 = formatComplex(realPart, imagPart);
      eigen2 = formatComplex(realPart, -imagPart);
    } else {
      const root1 = (trace + Math.sqrt(discriminant)) / 2;
      const root2 = (trace - Math.sqrt(discriminant)) / 2;
      eigen1 = `${clean(root1)}`;
      eigen2 = `${clean(root2)}`;
    }

    // Generate points for the rotation arc visualization
    const arcRadius = 0.4;
    const arcPoints = Array.from({ length: 31 }).map((_, i) => {
      const currentAngle = (theta * i) / 30;
      return `${clean(arcRadius * Math.cos(currentAngle))},${clean(arcRadius * Math.sin(currentAngle))}`;
    }).join(' ');

    return {
      a: clean(a), b: clean(b), c: clean(c), d: clean(d),
      trace: clean(trace), det: clean(det), discriminant: clean(discriminant),
      eigen1, eigen2, isComplex, arcPoints, theta
    };
  }, [angleDeg, scale]);

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-200 font-sans flex items-center justify-center p-4 lg:p-8"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}
    >
      <div className="max-w-5xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Column: Controls & Math Breakdown */}
        <div className="flex-1 p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col gap-8">
          
          <header>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2">
              Complex Eigenvalues
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              When a matrix rotates space, vectors are knocked off their original span. 
              Because no real vector stays pointing in its original direction, the matrix has no <em className="text-slate-300">real</em> eigenvalues. 
              Instead, they emerge in the complex plane as conjugate pairs.
            </p>
          </header>

          {/* Interactive Controls */}
          <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rotation Angle (θ)
                </label>
                <span className="text-sm font-mono text-cyan-400">{angleDeg}°</span>
              </div>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                value={angleDeg} 
                onChange={(e) => setAngleDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Scale Factor (r)
                </label>
                <span className="text-sm font-mono text-fuchsia-400">{scale.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.05"
                value={scale} 
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
              />
            </div>
          </div>

          {/* Math Output */}
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="text-slate-400 text-sm">Matrix <span className="text-white font-serif italic">A</span></div>
              <div className="relative font-mono text-sm inline-block text-center border-l-2 border-r-2 border-slate-600 px-2 py-1">
                <div className="flex gap-4 mb-1">
                  <span className="w-12 text-right">{mathData.a}</span>
                  <span className="w-12 text-right">{mathData.b}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-12 text-right">{mathData.c}</span>
                  <span className="w-12 text-right">{mathData.d}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Trace (Sum of diag)</div>
                <div className="font-mono text-slate-300">{mathData.trace}</div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Determinant (Area scale)</div>
                <div className="font-mono text-slate-300">{mathData.det}</div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${mathData.isComplex ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-950/50 border-slate-800/50'}`}>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Eigenvalues (λ)</div>
              <div className="font-mono text-lg text-indigo-300 space-y-1">
                <div>λ₁ = {mathData.eigen1}</div>
                <div>λ₂ = {mathData.eigen2}</div>
              </div>
              {mathData.isComplex && (
                <div className="mt-3 text-xs text-indigo-400/80">
                  Notice the <span className="font-semibold text-indigo-300">±i</span>. The imaginary component represents the rotation, while the real component relates to scaling.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-auto flex items-center justify-center p-6 bg-slate-950/30">
          
          {/* Stability Indicator */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Stability:</span>
            <span className={`text-xs px-2 py-1 rounded border ${
              scale < 1 ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' :
              scale > 1 ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' :
              'bg-amber-950/30 border-amber-500/30 text-amber-400'
            }`}>
              {scale < 1 ? 'Spirals In (Stable)' : scale > 1 ? 'Spirals Out (Unstable)' : 'Circular (Marginal)'}
            </span>
          </div>

          <div className="relative w-full max-w-[320px] aspect-square">
            {/* SVG Vector Field / Plot */}
            <svg 
              viewBox="-2 -2 4 4" 
              className="w-full h-full overflow-visible drop-shadow-2xl"
            >
              {/* Note: In standard SVG, +y is down. We scale(1, -1) to make +y up (standard math coordinates) */}
              <g transform="scale(1, -1)">
                
                {/* Axes */}
                <line x1="-2" y1="0" x2="2" y2="0" stroke="#1e293b" strokeWidth="0.02" />
                <line x1="0" y1="-2" x2="0" y2="2" stroke="#1e293b" strokeWidth="0.02" />
                
                {/* Grid Lines */}
                {[-1, 1].map(tick => (
                  <React.Fragment key={tick}>
                    <line x1={tick} y1="-0.05" x2={tick} y2="0.05" stroke="#334155" strokeWidth="0.02" />
                    <line x1="-0.05" y1={tick} x2="0.05" y2={tick} stroke="#334155" strokeWidth="0.02" />
                  </React.Fragment>
                ))}

                {/* Unit Circle (dashed) */}
                <circle cx="0" cy="0" r="1" stroke="#334155" strokeWidth="0.015" fill="none" strokeDasharray="0.05 0.05" />

                {/* Scaled Circle (shows area determinant expansion/contraction) */}
                {scale !== 1 && (
                  <circle cx="0" cy="0" r={scale} stroke="#86198f" strokeWidth="0.01" fill="none" strokeDasharray="0.02 0.04" opacity="0.5" />
                )}

                {/* Rotation Arc */}
                {angleDeg !== 0 && (
                  <polyline 
                    points={mathData.arcPoints} 
                    stroke="#22d3ee" 
                    fill="none" 
                    strokeWidth="0.015" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8"
                  />
                )}

                {/* Original Basis Vector i (1, 0) */}
                <g opacity="0.4">
                  <line x1="0" y1="0" x2="1" y2="0" stroke="#94a3b8" strokeWidth="0.03" strokeLinecap="round" />
                  <polygon points="1,0 0.9,-0.04 0.9,0.04" fill="#94a3b8" />
                </g>

                {/* Transformed Vector A*i (a, c) */}
                <g>
                  <line x1="0" y1="0" x2={mathData.a} y2={mathData.c} stroke="#22d3ee" strokeWidth="0.04" strokeLinecap="round" />
                  {/* Arrowhead calculated manually based on angle */}
                  <g transform={`translate(${mathData.a}, ${mathData.c}) rotate(${angleDeg})`}>
                    <polygon points="0,0 -0.15,-0.06 -0.15,0.06" fill="#22d3ee" />
                  </g>
                </g>
                
              </g>
            </svg>

            {/* Overlay labels (using standard coordinates, hence independent of SVG scale(1,-1)) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* We can position absolute tooltips here if needed, but the visual is clean enough */}
            </div>
          </div>
          
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Vector <span className="text-slate-400 font-mono">[1, 0]</span> mapped to <span className="text-cyan-400 font-mono">[{mathData.a}, {mathData.c}]</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}