import React, { useState, useMemo } from 'react';

type Matrix2x2 = [number, number, number, number];

const PRESETS: { label: string; value: Matrix2x2; description: string }[] = [
  { label: 'Identity', value: [1, 0, 0, 1], description: 'No transformation. Leaves space unchanged.' },
  { label: 'Scaling (2x)', value: [2, 0, 0, 2], description: 'Expands space uniformly by a factor of 2.' },
  { label: 'Rotation (90°)', value: [0, -1, 1, 0], description: 'Rotates space 90 degrees counter-clockwise.' },
  { label: 'Shear X', value: [1, 1, 0, 1], description: 'Skews space along the X axis.' },
  { label: 'Projection X', value: [1, 0, 0, 0], description: 'Collapses 2D space onto the X axis.' },
  { label: 'Complex Eigen', value: [1, -2, 2, 1], description: 'Produces complex eigenvalues (rotation + scaling).' },
  { label: 'Saddle Point', value: [2, 1, 1, -2], description: 'Stretches in one direction, squishes in another.' },
];

export default function App() {
  // Store as strings to allow typing '-' or '0.'
  const [matrixStr, setMatrixStr] = useState<[string, string, string, string]>(['1', '0', '0', '1']);
  const [activePreset, setActivePreset] = useState<string>('Identity');

  // Parse strings to numbers for math, fallback to 0 if invalid
  const matrixNum = useMemo<Matrix2x2>(() => {
    return matrixStr.map((s) => {
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }) as Matrix2x2;
  }, [matrixStr]);

  const handleInputChange = (index: number, value: string) => {
    const newMatrix = [...matrixStr] as [string, string, string, string];
    newMatrix[index] = value;
    setMatrixStr(newMatrix);
    setActivePreset('Custom');
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setMatrixStr(preset.value.map(String) as [string, string, string, string]);
    setActivePreset(preset.label);
  };

  // Math Analysis
  const analysis = useMemo(() => {
    const [a, b, c, d] = matrixNum;
    
    // Numeric stability guard
    const clean = (val: number) => (Math.abs(val) < 1e-9 ? 0 : val);
    const formatNum = (val: number) => Number(clean(val).toFixed(3));

    const trace = clean(a + d);
    const det = clean(a * d - b * c);
    const discriminant = clean(trace * trace - 4 * det);

    let eigenvalues: string[] = [];
    let isComplex = false;

    if (discriminant < 0) {
      isComplex = true;
      const realPart = formatNum(trace / 2);
      const imagPart = formatNum(Math.sqrt(-discriminant) / 2);
      eigenvalues = [
        `${realPart} + ${imagPart}i`,
        `${realPart} - ${imagPart}i`,
      ];
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

  // CSS Matrix for the visualizer: matrix(a, b, c, d, tx, ty)
  // Note: CSS matrix maps to [a c; b d] in standard math notation.
  // So standard [m00 m01; m10 m11] -> CSS matrix(m00, m10, m01, m11, 0, 0)
  const cssTransform = `matrix(${matrixNum[0]}, ${matrixNum[2]}, ${matrixNum[1]}, ${matrixNum[3]}, 0, 0)`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200 relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20zM20 0h20v20H20V0zM0 0h20v20H0V0z' fill='%23000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-5xl w-full z-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Eigen Explorer
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Interactive matrix editor. Adjust the components of the 2x2 matrix to see how it transforms space and alters its fundamental properties.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Editor & Presets */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Matrix Editor Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Matrix Editor</h2>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full">
                  {activePreset}
                </span>
              </div>
              
              <div className="p-8 flex flex-col items-center justify-center min-h-[320px] relative">
                
                {/* The Matrix Input */}
                <div className="flex items-center justify-center group">
                  <div className="text-[120px] font-light text-slate-200 leading-none mr-6 select-none transition-colors group-hover:text-indigo-200">[</div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type="text"
                        value={matrixStr[index]}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        className="w-24 h-24 text-center text-4xl font-semibold text-slate-700 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 transition-all hover:bg-slate-100"
                        placeholder="0"
                      />
                    ))}
                  </div>
                  
                  <div className="text-[120px] font-light text-slate-200 leading-none ml-6 select-none transition-colors group-hover:text-indigo-200">]</div>
                </div>

                {/* Mini Visualizer */}
                <div className="absolute bottom-6 right-6 w-24 h-24 border-2 border-slate-100 rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center pointer-events-none">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                  <div 
                    className="w-8 h-8 bg-indigo-500/80 border-2 border-indigo-600 origin-center transition-transform duration-500 ease-out"
                    style={{ transform: cssTransform }}
                  />
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 px-2">Presets</h3>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    title={preset.description}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activePreset === preset.label
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Analysis */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Live Analysis</h2>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* Trace & Determinant */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trace (T)</div>
                    <div className="text-2xl font-semibold text-slate-800">{analysis.trace}</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">a + d</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Determinant (D)</div>
                    <div className="text-2xl font-semibold text-slate-800">{analysis.det}</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">ad - bc</div>
                  </div>
                </div>

                {/* Characteristic Equation */}
                <div className="p-5 rounded-2xl bg-slate-800 text-white shadow-inner">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Characteristic Equation</div>
                  <div className="text-lg font-mono tracking-wide text-indigo-200">
                    {analysis.charEq}
                  </div>
                </div>

                {/* Eigenvalues */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eigenvalues (λ)</div>
                    {analysis.isComplex && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded">Complex</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {analysis.eigenvalues.map((val, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${analysis.isComplex ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${analysis.isComplex ? 'bg-amber-200 text-amber-800' : 'bg-indigo-200 text-indigo-800'}`}>
                            λ{idx + 1}
                          </div>
                          <div className="text-xl font-mono font-semibold text-slate-700">
                            {val}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stability Info */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 leading-relaxed">
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