import React, { useState, useMemo, useEffect } from 'react';

// --- Types & Interfaces ---
type Matrix2x2 = [[number, number], [number, number]];
type StringMatrix2x2 = [[string, string], [string, string]];

interface Preset {
  name: string;
  matrix: StringMatrix2x2;
  description: string;
}

// --- Constants & Presets ---
const PRESETS: Preset[] = [
  { name: "Identity", matrix: [["1", "0"], ["0", "1"]], description: "No transformation" },
  { name: "Rotation 90°", matrix: [["0", "-1"], ["1", "0"]], description: "Counter-clockwise rotation" },
  { name: "Shear (X)", matrix: [["1", "1"], ["0", "1"]], description: "Horizontal shear" },
  { name: "Scale (2x)", matrix: [["2", "0"], ["0", "2"]], description: "Uniform scaling" },
  { name: "Reflection", matrix: [["1", "0"], ["0", "-1"]], description: "Reflect across X-axis" },
  { name: "Projection", matrix: [["1", "0"], ["0", "0"]], description: "Collapse onto X-axis" },
  { name: "Fibonacci", matrix: [["1", "1"], ["1", "0"]], description: "Golden ratio eigenvalues" },
  { name: "Singular", matrix: [["2", "4"], ["1", "2"]], description: "Determinant is zero" },
];

// --- Helper Functions ---
const parseMatrix = (strMat: StringMatrix2x2): Matrix2x2 => {
  return [
    [parseFloat(strMat[0][0]) || 0, parseFloat(strMat[0][1]) || 0],
    [parseFloat(strMat[1][0]) || 0, parseFloat(strMat[1][1]) || 0]
  ];
};

const getDeterminant = (m: Matrix2x2): number => m[0][0] * m[1][1] - m[0][1] * m[1][0];
const getTrace = (m: Matrix2x2): number => m[0][0] + m[1][1];

// Numeric stability guard
const sanitizeInput = (val: string): string => {
  // Allow intermediate typing like "-", ".", "-0."
  if (/^-?\.?$|^-?0\.$|^-?\d*\.?\d*$/.test(val)) {
    // Prevent massive numbers that break visualization
    const num = parseFloat(val);
    if (!isNaN(num) && (num > 100 || num < -100)) {
      return num > 0 ? "100" : "-100";
    }
    return val;
  }
  return "";
};

export default function App() {
  // --- State ---
  // We keep string state to allow users to type minus signs or decimals freely
  const [matrixStr, setMatrixStr] = useState<StringMatrix2x2>([["1", "0"], ["0", "1"]]);
  const [activePreset, setActivePreset] = useState<string>("Identity");

  // --- Derived Data ---
  const matrixNum = useMemo(() => parseMatrix(matrixStr), [matrixStr]);
  const det = useMemo(() => getDeterminant(matrixNum), [matrixNum]);
  const trace = useMemo(() => getTrace(matrixNum), [matrixNum]);
  
  // Numeric stability / singularity check
  const isSingular = Math.abs(det) < 1e-7;
  const isIdentity = matrixNum[0][0] === 1 && matrixNum[0][1] === 0 && matrixNum[1][0] === 0 && matrixNum[1][1] === 1;

  // --- Handlers ---
  const handleInputChange = (r: number, c: number, value: string) => {
    const sanitized = sanitizeInput(value);
    if (sanitized === "" && value !== "") return; // Reject invalid chars

    const newMat: StringMatrix2x2 = [
      [...matrixStr[0]],
      [...matrixStr[1]]
    ];
    newMat[r][c] = sanitized;
    setMatrixStr(newMat);
    setActivePreset("Custom");
  };

  const loadPreset = (preset: Preset) => {
    setMatrixStr(preset.matrix);
    setActivePreset(preset.name);
  };

  // --- Render Helpers ---
  // Coordinates for the mini visualization
  const SVG_SIZE = 240;
  const CENTER = SVG_SIZE / 2;
  const SCALE = 40; // pixels per unit

  const tX1 = CENTER + matrixNum[0][0] * SCALE;
  const tY1 = CENTER - matrixNum[1][0] * SCALE; // Y is inverted in SVG
  const tX2 = CENTER + matrixNum[0][1] * SCALE;
  const tY2 = CENTER - matrixNum[1][1] * SCALE;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
        
        {/* LEFT COLUMN: Editor & Presets */}
        <div className="flex-1 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
          <header className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              Eigen Explorer
            </h1>
            <p className="text-slate-500 font-medium">
              Interactive Matrix Editor & Visualizer
            </p>
          </header>

          {/* Matrix Input UI */}
          <div className="flex flex-col items-center mb-12">
            <div className="relative flex items-center justify-center p-6">
              {/* Large Brackets */}
              <div className="absolute left-0 top-0 bottom-0 w-6 border-l-4 border-t-4 border-b-4 border-slate-800 rounded-l-2xl opacity-80" />
              <div className="absolute right-0 top-0 bottom-0 w-6 border-r-4 border-t-4 border-b-4 border-slate-800 rounded-r-2xl opacity-80" />
              
              {/* 2x2 Grid */}
              <div className="grid grid-cols-2 gap-4 relative z-10">
                {[0, 1].map((r) => (
                  [0, 1].map((c) => (
                    <div key={`${r}-${c}`} className="relative group">
                      <input
                        type="text"
                        value={matrixStr[r][c]}
                        onChange={(e) => handleInputChange(r, c, e.target.value)}
                        className="w-24 h-24 text-center text-3xl font-mono font-semibold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all duration-200 text-slate-800 hover:bg-slate-100"
                        placeholder="0"
                      />
                      {/* Variable Labels (a, b, c, d) */}
                      <span className="absolute -top-3 -left-3 w-6 h-6 bg-slate-800 text-white text-xs font-bold flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {r === 0 ? (c === 0 ? 'a' : 'b') : (c === 0 ? 'c' : 'd')}
                      </span>
                    </div>
                  ))
                ))}
              </div>
            </div>
          </div>

          {/* Presets Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Transformation Presets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => loadPreset(preset)}
                  title={preset.description}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 border ${
                    activePreset === preset.name
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Analysis & Visualization */}
        <div className="flex-1 p-8 lg:p-12 bg-slate-50/50 flex flex-col">
          
          {/* Properties Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Determinant</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-slate-800">
                  {det.toFixed(2).replace(/\.00$/, '')}
                </span>
                {isSingular && (
                  <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                    Singular
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 mt-2">Area scaling factor</span>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trace</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-slate-800">
                  {trace.toFixed(2).replace(/\.00$/, '')}
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-2">Sum of eigenvalues</span>
            </div>
          </div>

          {/* Mini Visualization */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center relative min-h-[300px]">
            <h3 className="absolute top-6 left-6 text-sm font-bold text-slate-400 uppercase tracking-wider">
              Basis Transformation
            </h3>
            
            <svg width={SVG_SIZE} height={SVG_SIZE} className="overflow-visible mt-6">
              {/* Grid Lines */}
              <g className="text-slate-100" stroke="currentColor" strokeWidth="1">
                {Array.from({ length: 11 }).map((_, i) => {
                  const pos = (i - 5) * SCALE + CENTER;
                  return (
                    <React.Fragment key={i}>
                      <line x1={pos} y1="0" x2={pos} y2={SVG_SIZE} />
                      <line x1="0" y1={pos} x2={SVG_SIZE} y2={pos} />
                    </React.Fragment>
                  );
                })}
              </g>

              {/* Axes */}
              <line x1="0" y1={CENTER} x2={SVG_SIZE} y2={CENTER} stroke="#cbd5e1" strokeWidth="2" />
              <line x1={CENTER} y1="0" x2={CENTER} y2={SVG_SIZE} stroke="#cbd5e1" strokeWidth="2" />

              {/* Parallelogram (Determinant Area) */}
              {!isSingular && (
                <polygon 
                  points={`${CENTER},${CENTER} ${tX1},${tY1} ${tX1 + (tX2 - CENTER)},${tY1 + (tY2 - CENTER)} ${tX2},${tY2}`}
                  fill={det < 0 ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
                  stroke={det < 0 ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              )}

              {/* Original Basis Vectors (Ghosted) */}
              {!isIdentity && (
                <>
                  <line x1={CENTER} y1={CENTER} x2={CENTER + SCALE} y2={CENTER} stroke="#fca5a5" strokeWidth="2" strokeDasharray="2 2" />
                  <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - SCALE} stroke="#93c5fd" strokeWidth="2" strokeDasharray="2 2" />
                </>
              )}

              {/* Transformed i-hat (Red) */}
              <g>
                <line x1={CENTER} y1={CENTER} x2={tX1} y2={tY1} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                <circle cx={tX1} cy={tY1} r="4" fill="#ef4444" />
              </g>

              {/* Transformed j-hat (Blue) */}
              <g>
                <line x1={CENTER} y1={CENTER} x2={tX2} y2={tY2} stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                <circle cx={tX2} cy={tY2} r="4" fill="#3b82f6" />
              </g>
              
              {/* Origin */}
              <circle cx={CENTER} cy={CENTER} r="4" fill="#1e293b" />
            </svg>

            {/* Legend */}
            <div className="absolute bottom-6 flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-600">Transformed î</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-600">Transformed ĵ</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}