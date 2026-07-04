import React, { useState, useMemo } from 'react';

// --- Types & Constants ---
type Matrix2x2 = [number, number, number, number];

interface Preset {
  name: string;
  matrix: Matrix2x2;
  description: string;
}

const PRESETS: Preset[] = [
  { name: 'Identity', matrix: [1, 0, 0, 1], description: 'Leaves space unchanged.' },
  { name: 'Scale (2x)', matrix: [2, 0, 0, 2], description: 'Uniformly scales space by 2.' },
  { name: 'Rotation (90°)', matrix: [0, -1, 1, 0], description: 'Rotates space 90 degrees counter-clockwise.' },
  { name: 'Shear (X)', matrix: [1, 1, 0, 1], description: 'Slants vertical lines horizontally.' },
  { name: 'Projection (X)', matrix: [1, 0, 0, 0], description: 'Collapses 2D space onto the X-axis.' },
  { name: 'Saddle', matrix: [1, 1, 1, -1], description: 'Stretches in one direction, squishes in another.' },
];

// --- Helper Functions ---
const formatNumber = (num: number): string => {
  // Numeric stability guard for floating point artifacts
  if (Math.abs(num) < 1e-10) return '0';
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

export default function App() {
  // State: [a, b, c, d] represents the matrix [a b; c d]
  const [matrix, setMatrix] = useState<Matrix2x2>([1, 0, 0, 1]);
  const [activePreset, setActivePreset] = useState<string>('Identity');

  // --- Math Calculations ---
  const [a, b, c, d] = matrix;
  
  const trace = useMemo(() => a + d, [a, d]);
  const determinant = useMemo(() => (a * d) - (b * c), [a, b, c, d]);
  
  const eigenvalues = useMemo(() => {
    // Characteristic equation: λ^2 - Tr(A)λ + Det(A) = 0
    const discriminant = (trace * trace) - (4 * determinant);
    
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      const lambda1 = (trace + sqrtDisc) / 2;
      const lambda2 = (trace - sqrtDisc) / 2;
      return {
        type: 'real',
        val1: formatNumber(lambda1),
        val2: formatNumber(lambda2)
      };
    } else {
      const realPart = trace / 2;
      const imagPart = Math.sqrt(-discriminant) / 2;
      return {
        type: 'complex',
        real: formatNumber(realPart),
        imag: formatNumber(imagPart)
      };
    }
  }, [trace, determinant]);

  // --- Handlers ---
  const handleInputChange = (index: number, value: string) => {
    const newMatrix = [...matrix] as Matrix2x2;
    // Numeric guard: fallback to 0 if NaN is parsed
    const parsed = parseFloat(value);
    newMatrix[index] = isNaN(parsed) ? 0 : parsed;
    setMatrix(newMatrix);
    setActivePreset('Custom');
  };

  const applyPreset = (preset: Preset) => {
    setMatrix(preset.matrix);
    setActivePreset(preset.name);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-800 font-sans relative flex items-center justify-center p-6">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header & Context */}
        <div className="lg:col-span-12 mb-4 text-center lg:text-left">
          <h1 className="text-4xl font-light tracking-tight text-slate-900 mb-2">
            Eigen <span className="font-semibold text-indigo-600">Explorer</span>
          </h1>
          <p className="text-slate-500 max-w-2xl">
            Edit the transformation matrix below. Observe how changing the basis vectors affects the fundamental properties of the linear transformation.
          </p>
        </div>

        {/* Left Column: Editor & Presets */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Matrix Editor Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl p-8">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-8 text-center">Transformation Matrix</h2>
            
            <div className="flex justify-center items-center">
              {/* Left Bracket */}
              <div className="w-6 h-40 border-l-4 border-t-4 border-b-4 border-slate-800 rounded-l-2xl mr-4 opacity-80" />
              
              {/* 2x2 Input Grid */}
              <div className="grid grid-cols-2 gap-6">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="relative group">
                    <input
                      type="number"
                      step="any"
                      value={matrix[idx]}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      className="w-24 h-24 text-center text-4xl font-light text-slate-800 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none transition-all duration-300 hover:bg-indigo-50 hover:border-indigo-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-inner"
                    />
                    {/* Basis vector indicators */}
                    {idx === 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-500">i-hat (x)</span>}
                    {idx === 1 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-500">j-hat (x)</span>}
                    {idx === 2 && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-500">i-hat (y)</span>}
                    {idx === 3 && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-500">j-hat (y)</span>}
                  </div>
                ))}
              </div>

              {/* Right Bracket */}
              <div className="w-6 h-40 border-r-4 border-t-4 border-b-4 border-slate-800 rounded-r-2xl ml-4 opacity-80" />
            </div>
          </div>

          {/* Presets Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-3xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-4">Quick Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  title={preset.description}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                    ${activePreset === preset.name 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Properties */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-8 shadow-2xl h-full flex flex-col">
            <h2 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-8">Matrix Properties</h2>
            
            <div className="space-y-8 flex-grow">
              
              {/* Trace */}
              <div className="group">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-slate-400 font-medium">Trace (Tr)</span>
                  <span className="text-2xl font-light text-white">{formatNumber(trace)}</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${Math.min(Math.abs(trace) * 10, 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Sum of main diagonal (a + d)</p>
              </div>

              {/* Determinant */}
              <div className="group">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-slate-400 font-medium">Determinant (Det)</span>
                  <span className="text-2xl font-light text-white">{formatNumber(determinant)}</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500/50 rounded-full" style={{ width: `${Math.min(Math.abs(determinant) * 10, 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Area scaling factor (ad - bc)</p>
              </div>

              <div className="my-6 border-t border-slate-800" />

              {/* Eigenvalues */}
              <div>
                <span className="text-slate-400 font-medium block mb-4">Eigenvalues (λ)</span>
                
                {eigenvalues.type === 'real' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                      <span className="block text-xs text-slate-400 mb-1">λ₁</span>
                      <span className="text-2xl font-mono text-emerald-400">{eigenvalues.val1}</span>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                      <span className="block text-xs text-slate-400 mb-1">λ₂</span>
                      <span className="text-2xl font-mono text-emerald-400">{eigenvalues.val2}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                    <span className="block text-xs text-slate-400 mb-2">Complex Conjugates</span>
                    <span className="text-xl font-mono text-amber-400">
                      {eigenvalues.real} ± {eigenvalues.imag}i
                    </span>
                    <p className="text-xs text-slate-500 mt-3">Indicates a rotational component.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}