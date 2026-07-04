import React, { useState, useEffect, useRef } from 'react';
import { Settings2, BookOpen, Info, AlertTriangle, RefreshCcw } from 'lucide-react';

// --- Math & Physics Helpers ---
const deg2rad = (deg: number) => (deg * Math.PI) / 180;
const rad2deg = (rad: number) => (rad * 180) / Math.PI;

const MATERIALS = [
  { name: 'Vacuum / Air', n: 1.0 },
  { name: 'Water', n: 1.33 },
  { name: 'Olive Oil', n: 1.47 },
  { name: 'Crown Glass', n: 1.52 },
  { name: 'Flint Glass', n: 1.62 },
  { name: 'Diamond', n: 2.42 },
];

export default function App() {
  // --- State ---
  const [n1, setN1] = useState<number>(1.0);
  const [n2, setN2] = useState<number>(1.52);
  const [theta1Deg, setTheta1Deg] = useState<number>(45);

  // --- Derived Values ---
  const theta1Rad = deg2rad(theta1Deg);
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  const isTIR = sinTheta2 > 1 || sinTheta2 < -1;
  const theta2Rad = isTIR ? 0 : Math.asin(sinTheta2);
  const theta2Deg = isTIR ? 0 : rad2deg(theta2Rad);

  // --- Canvas Dimensions ---
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const rayLength = 220;
  const arcRadius = 45;

  // --- Ray Coordinates ---
  // Incident Ray (comes from top left)
  const incX = cx - rayLength * Math.sin(theta1Rad);
  const incY = cy - rayLength * Math.cos(theta1Rad);

  // Refracted Ray (goes to bottom right)
  const refX = cx + rayLength * Math.sin(theta2Rad);
  const refY = cy + rayLength * Math.cos(theta2Rad);

  // Reflected Ray (goes to top right)
  const reflX = cx + rayLength * Math.sin(theta1Rad);
  const reflY = cy - rayLength * Math.cos(theta1Rad);

  // --- Arc Paths ---
  // Incident Arc (from Normal Top to Incident Ray)
  const incArcX = cx - arcRadius * Math.sin(theta1Rad);
  const incArcY = cy - arcRadius * Math.cos(theta1Rad);
  const incArcPath = `M ${cx} ${cy - arcRadius} A ${arcRadius} ${arcRadius} 0 0 0 ${incArcX} ${incArcY}`;

  // Refracted Arc (from Normal Bottom to Refracted Ray)
  const refArcX = cx + arcRadius * Math.sin(theta2Rad);
  const refArcY = cy + arcRadius * Math.cos(theta2Rad);
  const refArcPath = `M ${cx} ${cy + arcRadius} A ${arcRadius} ${arcRadius} 0 0 0 ${refArcX} ${refArcY}`;

  // Reflected Arc (from Normal Top to Reflected Ray)
  const reflArcX = cx + arcRadius * Math.sin(theta1Rad);
  const reflArcY = cy - arcRadius * Math.cos(theta1Rad);
  const reflArcPath = `M ${cx} ${cy - arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${reflArcX} ${reflArcY}`;

  // --- Handlers ---
  const handleSwapMediums = () => {
    setN1(n2);
    setN2(n1);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans p-4 md:p-8 flex items-center justify-center selection:bg-blue-200">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- Header & Title (Spans full width on mobile, top left on desktop) --- */}
        <div className="lg:col-span-12 flex items-center gap-3 mb-2">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Optics Lab</h1>
            <p className="text-sm font-medium text-slate-500">Experiment 3: Snell's Law & Refraction</p>
          </div>
        </div>

        {/* --- Left Column: Interactive Diagram --- */}
        <div className="lg:col-span-7 relative group">
          {/* Lab Notebook Canvas Container */}
          <div className="relative bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden aspect-square flex items-center justify-center">
            
            {/* SVG Canvas */}
            <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="block">
              <defs>
                {/* Grid Pattern */}
                <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                {/* Arrowhead Marker */}
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
                <marker id="arrow-faded" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#fca5a5" />
                </marker>
              </defs>

              {/* Background Grid */}
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Medium 2 Background (Bottom Half) */}
              <rect 
                x="0" y={cy} width={size} height={size / 2} 
                fill="#3b82f6" fillOpacity={0.05 + (n2 - 1) * 0.1} // Darkens slightly with higher n
                className="transition-all duration-300 ease-in-out"
              />

              {/* Boundary Line */}
              <line x1="0" y1={cy} x2={size} y2={cy} stroke="#cbd5e1" strokeWidth="3" />
              
              {/* Normal Line (Dashed) */}
              <line x1={cx} y1="20" x2={cx} y2={size - 20} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 6" />

              {/* --- Rays --- */}
              {/* Reflected Ray (Faded, always present) */}
              <line 
                x1={cx} y1={cy} x2={reflX} y2={reflY} 
                stroke="#fca5a5" strokeWidth="3" 
                markerEnd="url(#arrow-faded)"
                className="transition-all duration-300 ease-out"
              />

              {/* Refracted Ray (Only if not TIR) */}
              {!isTIR && (
                <line 
                  x1={cx} y1={cy} x2={refX} y2={refY} 
                  stroke="#ef4444" strokeWidth="4" 
                  markerEnd="url(#arrow)"
                  className="transition-all duration-300 ease-out"
                />
              )}

              {/* Incident Ray (Drawn last to be on top) */}
              <line 
                x1={incX} y1={incY} x2={cx} y2={cy} 
                stroke="#ef4444" strokeWidth="4" 
                className="transition-all duration-300 ease-out"
              />
              {/* Arrowhead on Incident Ray (placed midway for visual balance) */}
              <polygon 
                points="-5,-5 5,0 -5,5" 
                fill="#ef4444"
                transform={`translate(${cx - (cx - incX)/2}, ${cy - (cy - incY)/2}) rotate(${theta1Deg - 90})`}
                className="transition-all duration-300 ease-out"
              />

              {/* --- Angles & Arcs --- */}
              {/* Incident Angle Arc */}
              <path d={incArcPath} fill="none" stroke="#64748b" strokeWidth="2" className="transition-all duration-300 ease-out" />
              <text 
                x={cx - arcRadius * Math.sin(theta1Rad/2) - 15} 
                y={cy - arcRadius * Math.cos(theta1Rad/2) - 10} 
                fill="#475569" fontSize="14" fontFamily="serif" fontStyle="italic"
                className="transition-all duration-300 ease-out"
              >
                θ₁
              </text>

              {/* Refracted Angle Arc */}
              {!isTIR && (
                <>
                  <path d={refArcPath} fill="none" stroke="#64748b" strokeWidth="2" className="transition-all duration-300 ease-out" />
                  <text 
                    x={cx + arcRadius * Math.sin(theta2Rad/2) + 10} 
                    y={cy + arcRadius * Math.cos(theta2Rad/2) + 20} 
                    fill="#475569" fontSize="14" fontFamily="serif" fontStyle="italic"
                    className="transition-all duration-300 ease-out"
                  >
                    θ₂
                  </text>
                </>
              )}

              {/* --- Labels --- */}
              <text x="20" y="30" fill="#64748b" fontSize="14" fontWeight="600" className="uppercase tracking-wider">Medium 1 (n₁ = {n1.toFixed(2)})</text>
              <text x="20" y={size - 20} fill="#3b82f6" fontSize="14" fontWeight="600" className="uppercase tracking-wider">Medium 2 (n₂ = {n2.toFixed(2)})</text>
              
              {/* Origin Point */}
              <circle cx={cx} cy={cy} r="4" fill="#1e293b" />
            </svg>

            {/* TIR Overlay Warning */}
            {isTIR && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-12 bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold text-sm">Total Internal Reflection</span>
              </div>
            )}
          </div>
        </div>

        {/* --- Right Column: Controls & Math --- */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Math Breakdown Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info className="w-4 h-4" /> The Math
            </h2>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500">Snell's Law</span>
                <span className="font-bold text-slate-800">n₁ · sin(θ₁) = n₂ · sin(θ₂)</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500">Calculation</span>
                <div className="text-right">
                  <div className="text-slate-600">
                    {n1.toFixed(2)} · sin({theta1Deg.toFixed(1)}°) = {n2.toFixed(2)} · sin(θ₂)
                  </div>
                  <div className="text-slate-600 mt-1">
                    {(n1 * Math.sin(theta1Rad)).toFixed(4)} = {n2.toFixed(2)} · sin(θ₂)
                  </div>
                </div>
              </div>

              <div className={`flex justify-between items-center p-3 rounded-lg border ${isTIR ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                <span className={`font-semibold ${isTIR ? 'text-rose-700' : 'text-indigo-700'}`}>Result (θ₂)</span>
                <span className={`font-bold text-lg ${isTIR ? 'text-rose-700' : 'text-indigo-700'}`}>
                  {isTIR ? 'Undefined (TIR)' : `${theta2Deg.toFixed(1)}°`}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 flex-grow">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Parameters
            </h2>

            <div className="space-y-8">
              {/* Incident Angle Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Incident Angle (θ₁)</label>
                  <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{theta1Deg.toFixed(1)}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="89.9" step="0.1" 
                  value={theta1Deg} 
                  onChange={(e) => setTheta1Deg(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <hr className="border-slate-100" />

              {/* Medium 1 Control */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Medium 1 Index (n₁)</label>
                  <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{n1.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" max="3.0" step="0.01" 
                  value={n1} 
                  onChange={(e) => setN1(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 mb-3"
                />
                <div