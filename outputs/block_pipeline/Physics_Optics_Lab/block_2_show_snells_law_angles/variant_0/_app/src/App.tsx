import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

export default function App() {
  // State for the physics simulation
  const [theta1Deg, setTheta1Deg] = useState<number>(45);
  const [n1, setN1] = useState<number>(1.0); // Medium 1 (e.g., Air)
  const [n2, setN2] = useState<number>(1.5); // Medium 2 (e.g., Glass)
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Physics Calculations
  const theta1Rad = (theta1Deg * Math.PI) / 180;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  const isTIR = Math.abs(sinTheta2) > 1.0; // Total Internal Reflection
  const theta2Rad = isTIR ? 0 : Math.asin(sinTheta2);
  const theta2Deg = isTIR ? 0 : (theta2Rad * 180) / Math.PI;

  // Constants for drawing
  const RAY_LENGTH = 250;
  const ARC_RADIUS = 50;

  // Handlers for dragging the incident ray
  const handlePointerDown = (e: ReactPointerEvent<SVGCircleElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    // Calculate angle from the negative y-axis (normal line pointing up)
    // We restrict the light source to the top-left quadrant for simplicity
    let angleRad = Math.atan2(Math.abs(dx), -dy);
    let angleDeg = (angleRad * 180) / Math.PI;

    // Clamp angle between 0 and 89.9 degrees to avoid visual glitches at exactly 90
    if (angleDeg < 0) angleDeg = 0;
    if (angleDeg > 89.9) angleDeg = 89.9;

    setTheta1Deg(angleDeg);
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    setIsDragging(false);
  };

  // Helper to get medium name based on index
  const getMediumName = (n: number) => {
    if (n === 1.0) return 'Vacuum / Air';
    if (n === 1.33) return 'Water';
    if (n === 1.5) return 'Crown Glass';
    if (n === 2.42) return 'Diamond';
    return 'Custom Medium';
  };

  // Helper to calculate medium background color based on density (n)
  const getMediumColor = (n: number, isTop: boolean) => {
    const baseOpacity = Math.min(0.8, (n - 1) * 0.3);
    return `rgba(148, 163, 184, ${baseOpacity})`;
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center selection:bg-blue-200">
      {/* Lab Notebook Container */}
      <div className="w-full max-w-6xl bg-[#fdfcf8] shadow-2xl rounded-sm border border-slate-300 overflow-hidden flex flex-col relative">
        
        {/* Notebook Header */}
        <div className="border-b-2 border-slate-800/10 bg-[#fdfcf8] p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 tracking-tight">Optics Lab</h1>
            <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">Experiment 03: Snell's Law & Refraction</p>
          </div>
          <div className="flex gap-6 font-mono text-sm text-slate-500">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Date</span>
              <span className="border-b border-slate-300 w-24 inline-block h-5"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase">Observer</span>
              <span className="border-b border-slate-300 w-32 inline-block h-5"></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1">
          
          {/* Interactive Canvas Area */}
          <div className="w-full lg:w-2/3 relative border-b lg:border-b-0 lg:border-r border-slate-200 bg-white overflow-hidden min-h-[500px]">
            {/* Grid Pattern Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Main Physics SVG */}
            <svg 
              ref={svgRef}
              className="w-full h-full touch-none"
              viewBox="-300 -300 600 600"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Medium 1 (Top) */}
              <rect x="-300" y="-300" width="600" height="300" fill={getMediumColor(n1, true)} />
              
              {/* Medium 2 (Bottom) */}
              <rect x="-300" y="0" width="600" height="300" fill={getMediumColor(n2, false)} />
              
              {/* Boundary Line */}
              <line x1="-300" y1="0" x2="300" y2="0" stroke="#1e293b" strokeWidth="3" />
              
              {/* Normal Line (Dashed) */}
              <line x1="0" y1="-280" x2="0" y2="280" stroke="#64748b" strokeWidth="2" strokeDasharray="8 8" />
              <text x="10" y="-270" className="font-mono text-xs fill-slate-500">Normal</text>

              {/* Incident Angle Arc */}
              <path 
                d={`M 0 -${ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${-ARC_RADIUS * Math.sin(theta1Rad)} ${-ARC_RADIUS * Math.cos(theta1Rad)}`}
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="2" 
              />
              <text 
                x={-ARC_RADIUS * Math.sin(theta1Rad / 2) - 15} 
                y={-ARC_RADIUS * Math.cos(theta1Rad / 2) - 10} 
                className="font-serif italic text-sm fill-red-600 font-bold"
              >
                θ₁
              </text>

              {/* Refracted Angle Arc (if not TIR) */}
              {!isTIR && (
                <>
                  <path 
                    d={`M 0 ${ARC_RADIUS} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${ARC_RADIUS * Math.sin(theta2Rad)} ${ARC_RADIUS * Math.cos(theta2Rad)}`}
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="2" 
                  />
                  <text 
                    x={ARC_RADIUS * Math.sin(theta2Rad / 2) + 10} 
                    y={ARC_RADIUS * Math.cos(theta2Rad / 2) + 20} 
                    className="font-serif italic text-sm fill-blue-600 font-bold"
                  >
                    θ₂
                  </text>
                </>
              )}

              {/* Incident Ray */}
              <line 
                x1={-RAY_LENGTH * Math.sin(theta1Rad)} 
                y1={-RAY_LENGTH * Math.cos(theta1Rad)} 
                x2="0" 
                y2="0" 
                stroke="#ef4444" 
                strokeWidth="4" 
                strokeLinecap="round"
              />
              
              {/* Draggable Light Source Handle */}
              <g 
                transform={`translate(${-RAY_LENGTH * Math.sin(theta1Rad)}, ${-RAY_LENGTH * Math.cos(theta1Rad)})`}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
              >
                <circle r="16" fill="#fef2f2" stroke="#ef4444" strokeWidth="3" className="hover:scale-110 transition-transform" />
                <circle r="6" fill="#ef4444" />
                {/* Ray direction arrow */}
                <polygon points="-4,-6 4,-6 0,8" fill="#ef4444" transform={`rotate(${180 - theta1Deg}) translate(0, 25)`} />
              </g>

              {/* Reflected Ray */}
              <line 
                x1="0" 
                y1="0" 
                x2={RAY_LENGTH * Math.sin(theta1Rad)} 
                y2={-RAY_LENGTH * Math.cos(theta1Rad)} 
                stroke="#f97316" 
                strokeWidth={isTIR ? 4 : 2} 
                strokeDasharray={isTIR ? "none" : "6 4"}
                strokeLinecap="round"
                opacity={isTIR ? 1 : 0.6}
              />

              {/* Refracted Ray */}
              {!isTIR && (
                <line 
                  x1="0" 
                  y1="0" 
                  x2={RAY_LENGTH * Math.sin(theta2Rad)} 
                  y2={RAY_LENGTH * Math.cos(theta2Rad)} 
                  stroke="#3b82f6" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                />
              )}

              {/* TIR Warning Text */}
              {isTIR && (
                <text x="0" y="150" textAnchor="middle" className="font-mono text-lg fill-red-500 font-bold tracking-widest">
                  TOTAL INTERNAL REFLECTION
                </text>
              )}
            </svg>

            {/* Floating Labels */}
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded border border-slate-200 shadow-sm pointer-events-none">
              <p className="font-mono text-xs text-slate-600">Medium 1: <span className="font-bold text-slate-800">{getMediumName(n1)}</span> (n₁ = {n1.toFixed(2)})</p>
            </div>
            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded border border-slate-200 shadow-sm pointer-events-none">
              <p className="font-mono text-xs text-slate-600">Medium 2: <span className="font-bold text-slate-800">{getMediumName(n2)}</span> (n₂ = {n2.toFixed(2)})</p>
            </div>
          </div>

          {/* Controls & Readout Panel */}
          <div className="w-full lg:w-1/3 bg-[#faf9f6] p-6 flex flex-col gap-8">
            
            {/* Controls Section */}
            <div className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">Parameters</h2>
              
              {/* Incident Angle Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                    Incident Angle (θ₁)
                  </label>
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200 shadow-sm w-16 text-right">
                    {theta1Deg.toFixed(1)}°
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="89.9" 
                  step="0.1" 
                  value={theta1Deg} 
                  onChange={(e) => setTheta1Deg(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Medium 1 Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">Refractive Index (n₁)</label>
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200 shadow-sm w-16 text-right">
                    {n1.toFixed(2)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="3.0" 
                  step="0.01" 
                  value={n1} 
                  onChange={(e) => setN1(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono uppercase">
                  <span>Air (1.0)</span>
                  <span>Glass (1.5)</span>
                  <span>Diamond (2.4)</span>
                </div>
              </div>

              {/* Medium 2 Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">Refractive Index (n₂)</label>
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-slate-200 shadow-sm w-16 text-right">
                    {n2.toFixed(2)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="3.0" 
                  step="0.01" 
                  value={n2} 
                  onChange={(e) => setN2(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* Math Readout Section */}
            <div className="mt-auto space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">Observation Notes</h2>
              
              <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm font-serif text-lg text-center relative overflow-hidden">
                {/* Decorative tape */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-500/20 rotate-2"></div>
                
                <div className="mb-2 text-slate-500 text-sm italic">Snell's Law</div>
                <div className="flex items-center justify-center gap-2 text-slate-800">
                  <span>n₁</span>
                  <span className="text-red-500">sin(θ₁)</span>
                  <span>=</span>
                  <span>n₂</span>
                  <span className="text-blue-500">sin(θ₂)</span>
                </div>
                
                <div className="my-3 border-t border-slate-100"></div>
                
                <div className="flex flex-col gap-1 font-mono text-sm text-slate-600 text-left">
                  <div className="flex justify-between">
                    <span>{n1.toFixed(2)} × sin({theta1Deg.toFixed(1)}°)</span>
                    <span>= {(n1 * Math.sin(theta1Rad)).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{n2.toFixed(2)} × sin({isTIR ? 'ERR' : theta2Deg.toFixed(1)}°)</span>
                    <span>= {isTIR ? '> 1.0 (TIR)' : (n2 * Math.sin(theta2Rad)).toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Result Highlight */}
              <div className={`p-4 rounded-md border font-mono text-sm flex flex-col items-center justify-center text-center transition-colors ${isTIR ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                <span className="uppercase text-xs font-bold opacity-70 mb-1">Resulting Angle</span>
                <span className="text-2xl font-bold">
                  {isTIR ? 'T.I.R.' : `θ₂ = ${theta2Deg.toFixed(1)}°`}
                </span>
                {!isTIR && n1 > n2 && (
                  <span className="text-xs mt-2 opacity-80">
                    Critical Angle: {(Math.asin(n2/n1) * 180 / Math.PI).toFixed(1)}°
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}