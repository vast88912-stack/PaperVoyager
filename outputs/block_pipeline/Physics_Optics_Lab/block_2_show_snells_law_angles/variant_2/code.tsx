import React, { useState, useRef, useEffect, useMemo } from 'react';

// Predefined mediums for the lab
const MEDIUMS = [
  { name: 'Vacuum / Air', n: 1.00 },
  { name: 'Ice', n: 1.31 },
  { name: 'Water', n: 1.33 },
  { name: 'Olive Oil', n: 1.47 },
  { name: 'Crown Glass', n: 1.52 },
  { name: 'Flint Glass', n: 1.62 },
  { name: 'Diamond', n: 2.42 },
];

export default function App() {
  const [n1, setN1] = useState<number>(1.00);
  const [n2, setN2] = useState<number>(1.52);
  const [theta1, setTheta1] = useState<number>(45); // Degrees
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Math Calculations
  const { theta2, isTIR, reflectionAngle } = useMemo(() => {
    const rad1 = (theta1 * Math.PI) / 180;
    const sin2 = (n1 / n2) * Math.sin(rad1);
    const isTIR = sin2 > 1 || sin2 < -1;
    const rad2 = isTIR ? 0 : Math.asin(sin2);
    const theta2 = isTIR ? null : (rad2 * 180) / Math.PI;
    return { theta2, isTIR, reflectionAngle: theta1 };
  }, [n1, n2, theta1]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateAngleFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateAngleFromEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const updateAngleFromEvent = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cx = 200;
    const cy = 200;
    
    // Incident ray comes from top-left quadrant
    let dx = cx - x;
    let dy = cy - y;
    
    if (dy < 10) dy = 10; // Prevent going below boundary
    if (dx < 0) dx = 0;   // Prevent going to right side

    let angle = (Math.atan2(dx, dy) * 180) / Math.PI;
    
    // Constrain angle
    if (angle < 0) angle = 0;
    if (angle > 89.9) angle = 89.9;
    
    setTheta1(Number(angle.toFixed(1)));
  };

  // SVG Drawing Helpers
  const cx = 200;
  const cy = 200;
  const rayLength = 250;

  const getRayCoords = (angleDeg: number, quadrant: 'TL' | 'TR' | 'BR') => {
    const rad = (angleDeg * Math.PI) / 180;
    let x, y;
    if (quadrant === 'TL') {
      x = cx - rayLength * Math.sin(rad);
      y = cy - rayLength * Math.cos(rad);
    } else if (quadrant === 'TR') {
      x = cx + rayLength * Math.sin(rad);
      y = cy - rayLength * Math.cos(rad);
    } else { // BR
      x = cx + rayLength * Math.sin(rad);
      y = cy + rayLength * Math.cos(rad);
    }
    return { x, y };
  };

  const incident = getRayCoords(theta1, 'TL');
  const reflected = getRayCoords(reflectionAngle, 'TR');
  const refracted = isTIR ? null : getRayCoords(theta2!, 'BR');

  // Helper to draw arcs for angles
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number, quadrant: 'TL'|'TR'|'BR') => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    let startX, startY, endX, endY;

    if (quadrant === 'TL') {
      startX = x - radius * Math.sin(startRad);
      startY = y - radius * Math.cos(startRad);
      endX = x - radius * Math.sin(endRad);
      endY = y - radius * Math.cos(endRad);
    } else if (quadrant === 'TR') {
      startX = x + radius * Math.sin(startRad);
      startY = y - radius * Math.cos(startRad);
      endX = x + radius * Math.sin(endRad);
      endY = y - radius * Math.cos(endRad);
    } else { // BR
      startX = x + radius * Math.sin(startRad);
      startY = y + radius * Math.cos(startRad);
      endX = x + radius * Math.sin(endRad);
      endY = y + radius * Math.cos(endRad);
    }

    // SVG arc path
    const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
    // Sweep flag depends on quadrant and direction
    const sweepFlag = quadrant === 'TL' ? "1" : "0"; 

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-slate-800 p-4 md:p-8 font-sans selection:bg-blue-200">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-slate-300 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Optics Lab</h1>
            <p className="text-slate-500 font-mono text-sm mt-1">Experiment 03: Snell's Law & Refraction</p>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm font-mono text-slate-500">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <span>Laser Active</span>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Col: Canvas (Lab Notebook Aesthetic) */}
          <div className="lg:col-span-7 relative bg-[#fdfbf7] border-2 border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            
            {/* Notebook Lines Background */}
            <div className="absolute inset-0 pointer-events-none" 
                 style={{
                   backgroundImage: 'linear-gradient(transparent 95%, #e2e8f0 95%)',
                   backgroundSize: '100% 24px'
                 }}>
            </div>
            {/* Margin Line */}
            <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-red-200 pointer-events-none z-0"></div>

            <div className="relative z-10 p-4 pl-16 flex-grow flex flex-col items-center justify-center">
              <h2 className="text-lg font-mono font-semibold mb-4 text-slate-700 self-start">Interactive Ray Diagram</h2>
              
              <div className="relative border border-slate-300 shadow-inner bg-white cursor-crosshair touch-none rounded-md overflow-hidden" 
                   style={{ width: 400, height: 400 }}>
                <svg 
                  ref={svgRef}
                  width="400" 
                  height="400" 
                  viewBox="0 0 400 400"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="block"
                >
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="medium1Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.8"/>
                    </linearGradient>
                    <linearGradient id="medium2Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9"/>
                      <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.9"/>
                    </linearGradient>
                  </defs>

                  {/* Medium 1 Background */}
                  <rect x="0" y="0" width="400" height="200" fill="url(#medium1Grad)" />
                  <text x="10" y="20" className="font-mono text-xs fill-slate-500 pointer-events-none">Medium 1: n = {n1.toFixed(2)}</text>
                  
                  {/* Medium 2 Background */}
                  <rect x="0" y="200" width="400" height="200" fill="url(#medium2Grad)" opacity={n2 > 1 ? 1 : 0.5}/>
                  <text x="10" y="385" className="font-mono text-xs fill-slate-500 pointer-events-none">Medium 2: n = {n2.toFixed(2)}</text>

                  {/* Boundary Line */}
                  <line x1="0" y1="200" x2="400" y2="200" stroke="#475569" strokeWidth="2" />
                  
                  {/* Normal Line */}
                  <line x1="200" y1="20" x2="200" y2="380" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" />
                  <text x="205" y="30" className="font-mono text-[10px] fill-slate-400 pointer-events-none">Normal</text>

                  {/* Angle Arcs */}
                  {/* Theta 1 (Incident) */}
                  <path d={describeArc(cx, cy, 40, 0, theta1, 'TL')} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x={cx - 20 - 25 * Math.sin((theta1*Math.PI/180)/2)} 
                        y={cy - 20 - 25 * Math.cos((theta1*Math.PI/180)/2)} 
                        className="font-mono text-xs fill-blue-600 pointer-events-none">θ₁</text>

                  {/* Theta Reflected */}
                  <path d={describeArc(cx, cy, 45, 0, reflectionAngle, 'TR')} fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
                  
                  {/* Theta 2 (Refracted) */}
                  {!isTIR && theta2 !== null && (
                    <>
                      <path d={describeArc(cx, cy, 40, 0, theta2, 'BR')} fill="none" stroke="#16a34a" strokeWidth="1.5" />
                      <text x={cx + 10 + 30 * Math.sin((theta2*Math.PI/180)/2)} 
                            y={cy + 10 + 30 * Math.cos((theta2*Math.PI/180)/2)} 
                            className="font-mono text-xs fill-green-600 pointer-events-none">θ₂</text>
                    </>
                  )}

                  {/* Incident Ray */}
                  <line x1={incident.x} y1={incident.y} x2={cx} y2={cy} stroke="#ef4444" strokeWidth="3" filter="url(#glow)" strokeLinecap="round" />
                  
                  {/* Reflected Ray (faint) */}
                  <line x1={cx} y1={cy} x2={reflected.x} y2={reflected.y} stroke="#ef4444" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
                  
                  {/* Refracted Ray */}
                  {!isTIR && refracted && (
                    <line x1={cx} y1={cy} x2={refracted.x} y2={refracted.y} stroke="#ef4444" strokeWidth="3" filter="url(#glow)" strokeLinecap="round" />
                  )}

                  {/* Origin Point */}
                  <circle cx={cx} cy={cy} r="4" fill="#0f172a" />

                  {/* Interactive Drag Handle (Invisible, on top of incident ray) */}
                  <circle cx={incident.x} cy={incident.y} r="20" fill="transparent" className="cursor-grab hover:fill-red-500/20 transition-colors" />
                </svg>
                
                {/* Overlay Hint */}
                <div className="absolute top-2 right-2 pointer-events-none bg-white/80 px-2 py-1 rounded text-[10px] font-mono text-slate-500 border border-slate-200">
                  Drag ray to change angle
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Controls & Math */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Controls Panel */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 border-b pb-2">Variables Setup</h3>
              
              <div className="space-y-5">
                {/* Medium 1 Select */}
                <div>
                  <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Medium 1 (Incident)</span>
                    <span className="font-mono text-blue-600">n₁ = {n1.toFixed(2)}</span>
                  </label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
                    value={n1}
                    onChange={(e) => setN1(Number(e.target.value))}
                  >
                    {MEDIUMS.map(m => (
                      <option key={`m1-${m.name}`} value={m.n}>{m.name} (n={m.n.toFixed(2)})</option>
                    ))}
                  </select>
                </div>

                {/* Medium 2 Select */}
                <div>
                  <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Medium 2 (Refracted)</span>
                    <span className="font-mono text-green-600">n₂ = {n2.toFixed(2)}</span>
                  </label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-green-500 focus:border-green-500 block p-2"
                    value={n2}
                    onChange={(e) => setN2(Number(e.target.value))}
                  >
                    {MEDIUMS.map(m => (
                      <option key={`m2-${m.name}`} value={m.n}>{m.name} (n={m.n.toFixed(2)})</option>
                    ))}
                  </select>
                </div>

                {/* Angle Slider */}
                <div>
                  <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Angle of Incidence</span>
                    <span className="font-mono text-slate-900">θ₁ = {theta1.toFixed(1)}°</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="89.9" 
                    step="0.1" 
                    value={theta1}
                    onChange={(e) => setTheta1(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Math / Notes Panel */}
            <div className="bg-amber-50 p-6 rounded-lg border border-amber-200 shadow-sm flex-grow font-mono relative overflow-hidden">
              {/* Tape decoration */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm border border-white/50 rotate-[-2deg] shadow-sm"></div>
              
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 mb-4">Lab Notes: Snell's Law</h3>
              
              <div className="text-sm space-y-4 text-slate-800">
                <div className="bg-white/60 p-3 rounded border border-amber-200/50">
                  <p className="text-center text-base font-semibold mb-2">n₁ · sin(θ₁) = n₂ · sin(θ₂)</p>
                  
                  <div className="space-y-1 text-slate-600 mt-4 border-t border-amber-200/50 pt-2">
                    <p className="flex justify-between">
                      <span>{n1.toFixed(2)} · sin({theta1.toFixed(1)}°)</span>
                      <span>= {n2.toFixed(2)} · sin(θ₂)</span>
                    </p>
                    <p className="flex justify-between">
                      <span>{n1.toFixed(2)} · {(Math.sin(theta1 * Math.PI / 180)).toFixed(4)}</span>
                      <span>= {n2.toFixed(2)} · sin(θ₂)</span>
                    </p>
                    <p className="flex justify-between">
                      <span>{((n1 * Math.sin(theta1 * Math.PI / 180))).toFixed(4)}</span>
                      <span>= {n2.toFixed(2)} · sin(θ₂)</span>
                    </p>
                    <p className="flex justify-between text-amber-900 font-medium pt-2">
                      <span>sin(θ₂)</span>
                      <span>= {((n1 / n2) * Math.sin(theta1 * Math.PI / 180)).toFixed(4)}</span>
                    </p>
                  </div>
                </div>

                {isTIR ? (
                  <div className="bg-red-100 text-red-800 p-3 rounded border border-red-200 animate-pulse">
                    <p className="font-bold flex items-center gap-2">
                      <span>⚠️</span> Total Internal Reflection
                    </p>
                    <p className="text-xs mt-1">sin(θ₂) &gt; 1. Light cannot refract and is entirely reflected.</p>
                  </div>
                ) : (
                  <div className="bg-green-100 text-green-900 p-4 rounded border border-green-200 text-center shadow-inner">
                    <span className="block text-xs uppercase tracking-wider mb-1 opacity-70">Resulting Refraction Angle</span>
                    <span className="text-3xl font-bold">θ₂ = {theta2?.toFixed(1)}°</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}