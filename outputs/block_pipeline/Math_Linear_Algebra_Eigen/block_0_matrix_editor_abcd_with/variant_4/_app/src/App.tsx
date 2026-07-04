import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, RotateCcw, BoxSelect, BringToFront, SplitSquareHorizontal, FunctionSquare } from 'lucide-react';

// --- Constants & Math Helpers ---
const EPSILON = 1e-9;

const isStableZero = (val: number) => Math.abs(val) < EPSILON;

interface EigenData {
  trace: number;
  det: number;
  type: 'real-distinct' | 'real-repeated' | 'complex';
  val1: string;
  val2: string;
  stability: string;
}

const PRESETS = [
  { name: 'Identity', icon: LayoutGrid, matrix: [[1, 0], [0, 1]] },
  { name: 'Rotation 90°', icon: RotateCcw, matrix: [[0, -1], [1, 0]] },
  { name: 'Scale X', icon: BoxSelect, matrix: [[2, 0], [0, 1]] },
  { name: 'Shear X', icon: BringToFront, matrix: [[1, 1], [0, 1]] },
  { name: 'Reflection X', icon: SplitSquareHorizontal, matrix: [[1, 0], [0, -1]] },
  { name: 'Fibonacci', icon: FunctionSquare, matrix: [[1, 1], [1, 0]] },
];

export default function App() {
  // Store raw string inputs to allow fluid typing (e.g., "-0.5")
  const [inputs, setInputs] = useState<[[string, string], [string, string]]>([
    ['1', '0'],
    ['0', '1'],
  ]);

  // Parsed numeric matrix
  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>([
    [1, 0],
    [0, 1],
  ]);

  // Sync inputs to matrix
  useEffect(() => {
    const a = parseFloat(inputs[0][0]);
    const b = parseFloat(inputs[0][1]);
    const c = parseFloat(inputs[1][0]);
    const d = parseFloat(inputs[1][1]);

    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(d)) {
      setMatrix([[a, b], [c, d]]);
    }
  }, [inputs]);

  const handleInputChange = (row: 0 | 1, col: 0 | 1, value: string) => {
    // Allow numbers, negative signs, and decimals
    if (/^-?\d*\.?\d*$/.test(value) || value === '') {
      const newInputs = [...inputs] as [[string, string], [string, string]];
      newInputs[row][col] = value;
      setInputs(newInputs);
    }
  };

  const loadPreset = (presetMatrix: number[][]) => {
    setInputs([
      [presetMatrix[0][0].toString(), presetMatrix[0][1].toString()],
      [presetMatrix[1][0].toString(), presetMatrix[1][1].toString()],
    ]);
  };

  // Compute Properties
  const eigenData = useMemo<EigenData>(() => {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[1][0];
    const d = matrix[1][1];

    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;

    let type: EigenData['type'];
    let val1 = '';
    let val2 = '';

    if (isStableZero(discriminant)) {
      type = 'real-repeated';
      const root = trace / 2;
      val1 = isStableZero(root) ? '0' : root.toFixed(3);
      val2 = val1;
    } else if (discriminant > 0) {
      type = 'real-distinct';
      const root1 = (trace + Math.sqrt(discriminant)) / 2;
      const root2 = (trace - Math.sqrt(discriminant)) / 2;
      val1 = isStableZero(root1) ? '0' : root1.toFixed(3);
      val2 = isStableZero(root2) ? '0' : root2.toFixed(3);
    } else {
      type = 'complex';
      const real = trace / 2;
      const imag = Math.sqrt(-discriminant) / 2;
      const realStr = isStableZero(real) ? '0' : real.toFixed(3);
      const imagStr = imag.toFixed(3);
      val1 = `${realStr} + ${imagStr}i`;
      val2 = `${realStr} - ${imagStr}i`;
    }

    // Stability region logic for discrete time systems (e.g. |lambda| < 1)
    let stability = 'Unstable (Expands)';
    if (type === 'complex') {
      const magSq = (trace / 2) ** 2 + (-discriminant) / 4;
      if (magSq < 1 - EPSILON) stability = 'Stable (Spirals In)';
      else if (isStableZero(magSq - 1)) stability = 'Marginal (Orbit)';
      else stability = 'Unstable (Spirals Out)';
    } else {
      const r1 = parseFloat(val1);
      const r2 = parseFloat(val2);
      if (Math.abs(r1) < 1 && Math.abs(r2) < 1) stability = 'Stable (Contracts)';
      else if (Math.abs(r1) <= 1 && Math.abs(r2) <= 1) stability = 'Marginal';
    }

    return { trace, det, type, val1, val2, stability };
  }, [matrix]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, #94a3b8 1px, transparent 1px),
              linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            backgroundPosition: 'center center'
          }}
        />
        {/* Subtle radial fade for the grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#f8fafc_80%)]" />
      </div>

      <main className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Editor & Presets */}
        <section className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-100/50 rounded-3xl p-8 border border-white/60">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Matrix Editor</h1>
            <p className="text-sm text-slate-500">Define transformation parameters [a, b, c, d].</p>
          </header>

          {/* Matrix Input UI */}
          <div className="flex justify-center mb-10">
            <div className="relative group">
              {/* Decorative brackets */}
              <div className="absolute -inset-x-6 inset-y-0 border-x-[6px] border-slate-300 rounded-[20px] pointer-events-none transition-colors group-hover:border-indigo-400" />
              
              <div className="grid grid-cols-2 gap-4 relative bg-white/50 p-2 rounded-xl">
                {[0, 1].map((row) =>
                  [0, 1].map((col) => (
                    <div key={`${row}-${col}`} className="relative">
                      <input
                        type="text"
                        value={inputs[row as 0 | 1][col as 0 | 1]}
                        onChange={(e) => handleInputChange(row as 0 | 1, col as 0 | 1, e.target.value)}
                        className="w-24 h-24 text-center text-4xl font-light font-mono text-slate-800 bg-transparent border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all hover:bg-slate-50"
                        placeholder="0"
                      />
                      <span className="absolute bottom-2 right-3 text-xs font-bold text-slate-300 pointer-events-none select-none">
                        {row === 0 ? (col === 0 ? 'a' : 'b') : (col === 0 ? 'c' : 'd')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transform Presets</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => loadPreset(preset.matrix)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors group"
                >
                  <preset.icon className="w-5 h-5 mb-1.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-[10px] font-medium text-slate-600 group-hover:text-indigo-600 text-center leading-tight">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Properties & Math */}
        <section className="flex flex-col gap-4">
          
          {/* Top Info Card */}
          <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-900/20 text-slate-100 border border-slate-800">
            <h2 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-widest">Spectral Analysis</h2>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">Determinant (Det)</p>
                <p className="text-3xl font-light font-mono tracking-tight text-white">
                  {isStableZero(eigenData.det) ? '0' : eigenData.det.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">Trace (Tr)</p>
                <p className="text-3xl font-light font-mono tracking-tight text-white">
                  {isStableZero(eigenData.trace) ? '0' : eigenData.trace.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 mb-8" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate-500 font-medium">Eigenvalues (λ)</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                  ${eigenData.type === 'complex' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 
                    eigenData.type === 'real-repeated' ? 'bg-amber-500/20 text-amber-300' : 
                    'bg-emerald-500/20 text-emerald-300'}`}>
                  {eigenData.type.replace('-', ' ')}
                </span>
              </div>
              <div className="space-y-3 font-mono text-xl font-light">
                <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-700/50">
                  <span className="text-slate-500 text-sm">λ₁</span>
                  <span className="text-indigo-200">{eigenData.val1}</span>
                </div>
                <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-700/50">
                  <span className="text-slate-500 text-sm">λ₂</span>
                  <span className="text-indigo-200">{eigenData.val2}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation / Stability Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-white/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Dynamical Stability</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full animate-pulse
                ${eigenData.stability.includes('Stable') && !eigenData.stability.includes('Unstable') ? 'bg-emerald-400' : 
                  eigenData.stability.includes('Marginal') ? 'bg-amber-400' : 'bg-rose-400'}`} 
              />
              <span className="text-lg font-medium text-slate-800">{eigenData.stability}</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mt-2">
              {eigenData.type === 'complex' 
                ? "Complex eigenvalues induce rotation. The real part determines whether the system expands or contracts radially, creating spiraling vector fields."
                : "Real eigenvalues represent pure scaling along their respective eigenvectors. Magnitudes > 1 cause expansion; < 1 cause contraction."}
            </p>
          </div>

        </section>
      </main>
    </div>
  );
}