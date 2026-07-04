import React, { useState, useMemo } from 'react';

// Numeric stability guard
const EPSILON = 1e-10;
const cleanZero = (val: number) => (Math.abs(val) < EPSILON ? 0 : val);
const formatNum = (val: number, decimals: number = 2) => cleanZero(val).toFixed(decimals);

export default function App() {
  // State for the interactive rotation and scaling
  const [angleDeg, setAngleDeg] = useState<number>(45);
  const [scale, setScale] = useState<number>(1.2);

  // Derived matrix components for a rotation + scaling matrix
  // A = [ r*cos(θ)  -r*sin(θ) ]
  //     [ r*sin(θ)   r*cos(θ) ]
  const angleRad = (angleDeg * Math.PI) / 180;
  const a = scale * Math.cos(angleRad);
  const b = -scale * Math.sin(angleRad);
  const c = scale * Math.sin(angleRad);
  const d = scale * Math.cos(angleRad);

  // Matrix Properties
  const trace = cleanZero(a + d);
  const determinant = cleanZero(a * d - b * c);
  const discriminant = cleanZero(trace * trace - 4 * determinant);

  // Eigenvalues calculation
  const isComplex = discriminant < 0;
  const realPart = cleanZero(trace / 2);
  const imagPart = isComplex ? cleanZero(Math.sqrt(Math.abs(discriminant)) / 2) : 0;
  const lambda1Real = isComplex ? realPart : cleanZero((trace + Math.sqrt(discriminant)) / 2);
  const lambda2Real = isComplex ? realPart : cleanZero((trace - Math.sqrt(discriminant)) / 2);

  // SVG dimensions
  const SVG_SIZE = 300;
  const CENTER = SVG_SIZE / 2;
  const SCALER = 60; // scale factor for drawing

  // Generate vectors for the vector field visualization
  const vectors = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const ang = (i * Math.PI) / 4;
      const x = Math.cos(ang);
      const y = Math.sin(ang);
      // Apply matrix transformation
      const tx = cleanZero(a * x + b * y);
      const ty = cleanZero(c * x + d * y);
      return { x, y, tx, ty };
    });
  }, [a, b, c, d]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 z-10 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-slate-900 text-white p-8 border-b border-slate-800">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-light tracking-tight mb-2">Complex Eigenvalues</h1>
              <p className="text-slate-400 font-medium">When matrices rotate space, real eigenvectors vanish.</p>
            </div>
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-300">Eigen Explorer</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* Left Column: Interactive Editor & Math */}
          <div className="p-8 border-r border-slate-100 flex flex-col gap-8 bg-slate-50/50">
            
            {/* Controls */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rotation Angle (θ)</label>
                  <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{angleDeg}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="360" step="1" 
                  value={angleDeg} 
                  onChange={(e) => setAngleDeg(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Scaling Factor (r)</label>
                  <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{scale.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="2.0" step="0.1" 
                  value={scale} 
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Matrix Display */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Transformation Matrix (A)</h3>
              <div className="flex justify-center items-center font-mono text-xl">
                <div className="text-slate-300 text-5xl font-light mr-2">[</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-center">
                  <div className="text-slate-800">{formatNum(a)}</div>
                  <div className="text-slate-800">{formatNum(b)}</div>
                  <div className="text-slate-800">{formatNum(c)}</div>
                  <div className="text-slate-800">{formatNum(d)}</div>
                </div>
                <div className="text-slate-300 text-5xl font-light ml-2">]</div>
              </div>
            </div>

            {/* Properties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Trace (Tr)</div>
                <div className="font-mono text-lg text-slate-700">{formatNum(trace)}</div>
                <div className="text-[10px] text-slate-400 mt-1">Sum of diagonal (a + d)</div>
              </div>
              <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Determinant (Det)</div>
                <div className="font-mono text-lg text-slate-700">{formatNum(determinant)}</div>
                <div className="text-[10px] text-slate-400 mt-1">Area scaling (ad - bc)</div>
              </div>
            </div>

          </div>

          {/* Right Column: Explanation & Visualization */}
          <div className="p-8 flex flex-col">
            
            {/* Eigenvalue Results Card */}
            <div className={`p-6 rounded-2xl border mb-8 transition-colors duration-500 ${isComplex ? 'bg-indigo-50 border-indigo-200 shadow-indigo-100/50 shadow-lg' : 'bg-emerald-50 border-emerald-200 shadow-emerald-100/50 shadow-lg'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold uppercase tracking-widest ${isComplex ? 'text-indigo-800' : 'text-emerald-800'}`}>
                  Eigenvalues (λ)
                </h3>
                {isComplex ? (
                  <span className="px-3 py-1 bg-indigo-200 text-indigo-900 text-xs font-bold rounded-full">Complex Conjugates</span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-200 text-emerald-900 text-xs font-bold rounded-full">Real Roots</span>
                )}
              </div>
              
              <div className="space-y-3 font-mono text-lg">
                <div className="flex justify-between items-center border-b border-black/5 pb-2">
                  <span className="text-slate-500 text-sm">Discriminant (Δ)</span>
                  <span className={discriminant < 0 ? 'text-red-500 font-semibold' : 'text-slate-800'}>
                    {formatNum(discriminant)}
                  </span>
                </div>
                
                {isComplex ? (
                  <div className="pt-2 text-center text-indigo-900 text-xl font-medium tracking-wide">
                    λ = {formatNum(realPart)} ± <span className="text-indigo-600 font-bold">{formatNum(imagPart)}i</span>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-around text-emerald-900 text-xl font-medium tracking-wide">
                    <span>λ₁ = {formatNum(lambda1Real)}</span>
                    <span>λ₂ = {formatNum(lambda2Real)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vector Field Visualization */}
            <div className="flex-grow flex flex-col items-center justify-center relative bg-white border border-slate-100 rounded-2xl shadow-inner overflow-hidden group">
              <div className="absolute top-4 left-4 text-xs font-semibold text-slate-400 uppercase tracking-widest z-10">
                Vector Field Rotation
              </div>
              <svg 
                width={SVG_SIZE} 
                height={SVG_SIZE} 
                className="overflow-visible"
              >
                {/* Axes */}
                <line x1={0} y1={CENTER} x2={SVG_SIZE} y2={CENTER} stroke="#e2e8f0" strokeWidth="2" />
                <line x1={CENTER} y1={0} x2={CENTER} y2={SVG_SIZE} stroke="#e2e8f0" strokeWidth="2" />
                
                {/* Vectors */}
                {vectors.map((v, i) => {
                  const startX = CENTER;
                  const startY = CENTER;
                  const origX = CENTER + v.x * SCALER;
                  const origY = CENTER - v.y * SCALER; // Y is inverted in SVG
                  const transX = CENTER + v.tx * SCALER;
                  const transY = CENTER - v.ty * SCALER;

                  return (
                    <g key={i}>
                      {/* Original Vector */}
                      <line 
                        x1={startX} y1={startY} 
                        x2={origX} y2={origY} 
                        stroke="#94a3b8" strokeWidth="2" 
                        strokeDasharray="4 4"
                      />
                      <circle cx={origX} cy={origY} r="3" fill="#94a3b8" />

                      {/* Transformed Vector */}
                      <line 
                        x1={startX} y1={startY} 
                        x2={transX} y2={transY} 
                        stroke="#4f46e5" strokeWidth="2" 
                      />
                      <circle cx={transX} cy={transY} r="4" fill="#4f46e5" />
                      
                      {/* Connection line indicating movement */}
                      <path 
                        d={`M ${origX} ${origY} Q ${CENTER + (v.x+v.tx)*SCALER*0.6} ${CENTER - (v.y+v.ty)*SCALER*0.6} ${transX} ${transY}`}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        className="transition-all duration-300"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
                
                {/* Define Arrowhead */}
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#818cf8" opacity="0.6" />
                  </marker>
                </defs>

                {/* Stability Region Guide (Unit Circle) */}
                <circle cx={CENTER} cy={CENTER} r={SCALER} fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
              </svg>

              {/* Intuition Text */}
              <div className="mt-6 text-center px-8 text-sm text-slate-600 leading-relaxed">
                {isComplex ? (
                  <>
                    Because <strong className="text-indigo-600">Δ &lt; 0</strong>, the matrix purely rotates and scales space. 
                    No real vector simply stretches along its own span; they are all knocked off their original lines.
                  </>
                ) : (
                  <>
                    When <strong className="text-emerald-600">Δ ≥ 0</strong>, the transformation is a pure scaling or reflection.
                    Certain real vectors (eigenvectors) remain strictly on their original lines!
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}