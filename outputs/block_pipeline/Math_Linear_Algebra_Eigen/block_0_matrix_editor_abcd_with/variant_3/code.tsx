import React, { useState, useEffect } from 'react';

type MatrixValues = {
  a: string;
  b: string;
  c: string;
  d: string;
};

const PRESETS = [
  { id: 'identity', name: 'Identity', desc: 'Leaves space unchanged', vals: { a: '1', b: '0', c: '0', d: '1' } },
  { id: 'scale', name: 'Uniform Scale', desc: 'Expands space by 2x', vals: { a: '2', b: '0', c: '0', d: '2' } },
  { id: 'shear_x', name: 'Shear X', desc: 'Skews X based on Y', vals: { a: '1', b: '1', c: '0', d: '1' } },
  { id: 'rotation', name: 'Rotation 90°', desc: 'Counter-clockwise turn', vals: { a: '0', b: '-1', c: '1', d: '0' } },
  { id: 'reflection', name: 'Reflection', desc: 'Flips across Y-axis', vals: { a: '-1', b: '0', c: '0', d: '1' } },
  { id: 'projection', name: 'Projection', desc: 'Collapses to 1D line', vals: { a: '1', b: '0', c: '0', d: '0' } },
];

export default function App() {
  const [matrix, setMatrix] = useState<MatrixValues>(PRESETS[0].vals);
  const [activePreset, setActivePreset] = useState<string>(PRESETS[0].id);

  // Parse numerical values for math properties, defaulting to 0 for invalid inputs
  const numMatrix = {
    a: parseFloat(matrix.a) || 0,
    b: parseFloat(matrix.b) || 0,
    c: parseFloat(matrix.c) || 0,
    d: parseFloat(matrix.d) || 0,
  };

  const det = numMatrix.a * numMatrix.d - numMatrix.b * numMatrix.c;
  const trace = numMatrix.a + numMatrix.d;
  const discriminant = trace * trace - 4 * det;
  const isComplex = discriminant < 0;

  const handleInputChange = (key: keyof MatrixValues, value: string) => {
    // Allow valid partial number formats like "-", ".", "-0." 
    if (/^-?[0-9]*\.?[0-9]*$/.test(value)) {
      setMatrix(prev => ({ ...prev, [key]: value }));
      setActivePreset('custom');
    }
  };

  const applyPreset = (id: string, vals: MatrixValues) => {
    setMatrix(vals);
    setActivePreset(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative flex items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Decorative Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #94a3b8 1px, transparent 1px),
            linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />
      
      {/* Radial fade for focus */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 via-transparent to-slate-50 pointer-events-none" />

      <main className="relative z-10 w-full max-w-5xl">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
            Eigen <span className="text-indigo-600">Explorer</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg">
            Interactive Linear Algebra Communicator
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* MATRIX EDITOR SECTION */}
          <div className="w-full lg:w-3/5 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-slate-800">Transformation Matrix</h2>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-semibold tracking-wide border border-indigo-100">
                EDITABLE
              </div>
            </div>

            <div className="flex justify-center items-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100 mb-8">
              <div className="flex items-stretch">
                {/* Left Matrix Bracket */}
                <div className="w-6 border-l-4 border-t-4 border-b-4 border-slate-800 rounded-l-2xl"></div>
                
                {/* Inputs */}
                <div className="grid grid-cols-2 gap-6 px-6">
                  {(['a', 'b', 'c', 'd'] as const).map((key) => (
                    <input
                      key={key}
                      value={matrix[key]}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="w-24 h-24 md:w-32 md:h-32 text-center text-4xl md:text-5xl font-light text-slate-700 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
                      placeholder="0"
                      autoComplete="off"
                    />
                  ))}
                </div>

                {/* Right Matrix Bracket */}
                <div className="w-6 border-r-4 border-t-4 border-b-4 border-slate-800 rounded-r-2xl"></div>
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center transition-all hover:bg-slate-100/80">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Determinant</span>
                <span className="text-2xl font-mono text-slate-800">{det.toFixed(2).replace(/\.00$/, '')}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center transition-all hover:bg-slate-100/80">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Trace</span>
                <span className="text-2xl font-mono text-slate-800">{trace.toFixed(2).replace(/\.00$/, '')}</span>
              </div>
            </div>
            
            {/* Stability / Eigen Info Guard */}
            <div className={`mt-4 p-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              isComplex 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isComplex ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
              {isComplex 
                ? 'Complex Eigenvalues detected (Rotation involved)' 
                : 'Real Eigenvalues detected (Stretch/Shear/Flip)'}
            </div>
          </div>

          {/* PRESETS SECTION */}
          <div className="w-full lg:w-2/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 pt-2">
              Quick Presets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id, preset.vals)}
                    className={`
                      relative overflow-hidden text-left p-4 rounded-2xl border transition-all duration-200 group
                      ${isActive 
                        ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/30 text-white' 
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-base">{preset.name}</span>
                      {isActive && (
                        <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-sm ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {preset.desc}
                    </p>
                    
                    {/* Mini matrix visual inside button */}
                    <div className={`
                      absolute right -right-4 -bottom-4 opacity-10 font-mono text-5xl font-black leading-none tracking-tighter
                      ${isActive ? 'text-white' : 'text-slate-900'}
                    `}>
                      [A]
                    </div>
                  </button>
                );
              })}
              
              <div className={`
                p-4 rounded-2xl border transition-all duration-200 
                ${activePreset === 'custom' 
                  ? 'bg-slate-800 border-slate-800 shadow-lg text-white' 
                  : 'bg-transparent border-dashed border-slate-300 text-slate-400'
                }
              `}>
                <div className="font-bold text-base mb-1">Custom</div>
                <p className="text-sm opacity-70">Manually edited matrix</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}