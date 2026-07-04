import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Optics & Math Helpers ---
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const calculateSnellsLaw = (n1: number, n2: number, theta1Deg: number) => {
  const theta1Rad = theta1Deg * DEG_TO_RAD;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  
  if (Math.abs(sinTheta2) > 1) {
    return { theta2Deg: null, isTIR: true };
  }
  
  const theta2Deg = Math.asin(sinTheta2) * RAD_TO_DEG;
  return { theta2Deg, isTIR: false };
};

const MEDIUMS = [
  { name: 'Vacuum / Air', n: 1.00 },
  { name: 'Ice', n: 1.31 },
  { name: 'Water', n: 1.33 },
  { name: 'Fused Quartz', n: 1.46 },
  { name: 'Crown Glass', n: 1.52 },
  { name: 'Flint Glass', n: 1.62 },
  { name: 'Sapphire', n: 1.77 },
  { name: 'Cubic Zirconia', n: 2.15 },
  { name: 'Diamond', n: 2.42 },
];

export default function App() {
  // --- State ---
  const [n1, setN1] = useState<number>(1.00);
  const [n2, setN2] = useState<number>(1.52);
  const [theta1, setTheta1] = useState<number>(45); // Incident angle in degrees (0 to 89.9)
  const [isDragging, setIsDragging] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // --- Derived Values ---
  const { theta2Deg, isTIR } = useMemo(() => calculateSnellsLaw(n1, n2, theta1), [n1, n2, theta1]);

  // --- Interaction Handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    // Calculate angle from the negative Y axis (Normal)
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    
    // We restrict the laser to the top-left quadrant for simplicity
    // so x is negative, y is negative. Incident angle is measured from normal (up)
    let angle = Math.atan2(-dx, -dy) * RAD_TO_DEG;
    
    // Clamp angle to valid physical ranges [0, 89.9]
    if (angle < 0) angle = 0;
    if (angle > 89.9) angle = 89.9;
    
    setTheta1(angle);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);


  // --- Render Helpers ---
  // Coordinates based on center (0,0)
  const R = 250; // Ray length
  const arcR = 60; // Arc radius for angles
  
  // Incident ray
  const x1 = -R * Math.sin(theta1 * DEG_TO_RAD);
  const y1 = -R * Math.cos(theta1 * DEG_TO_RAD);
  
  // Reflected ray
  const xReflect = R * Math.sin(theta1 * DEG_TO_RAD);
  const yReflect = -R * Math.cos(theta1 * DEG_TO_RAD);
  
  // Refracted ray
  let x2 = 0, y2 = 0;
  if (!isTIR && theta2Deg !== null) {
    x2 = R * Math.sin(theta2Deg * DEG_TO_RAD);
    y2 = R * Math.cos(theta2Deg * DEG_TO_RAD);
  }

  // Visual mapping for medium density (opacity based on n)
  const getMediumColor = (n: number) => `rgba(14, 165, 233, ${Math.min((n - 1) * 0.25, 0.8)})`;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-serif flex flex-col selection:bg-blue-200">
      
      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-300 bg-white/50 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Optics Lab Notebook
          </h1>
          <p className="text-slate-500 font-sans mt-1">Experiment 04: Refraction & Snell's Law</p>
        </div>
        <div className="bg-amber-100 text-amber-800 font-mono text-sm px-4 py-2 rounded-md shadow-inner border border-amber-200">
          n₁ sin(θ₁) = n₂ sin(θ₂)
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-6 gap-8">
        
        {/* Controls Panel */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 font-sans">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Medium 1 (Incident)</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1">Preset Material</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  value={n1}
                  onChange={(e) => setN1(parseFloat(e.target.value))}
                >
                  {MEDIUMS.map(m => <option key={`n1-${m.name}`} value={m.n}>{m.name} (n={m.n.toFixed(2)})</option>)}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-600">Refractive Index (n₁)</label>
                  <span className="font-mono text-sm font-bold text-blue-600">{n1.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="1.0" max="3.0" step="0.01" value={n1}
                  onChange={(e) => setN1(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Medium 2 (Refracted)</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1">Preset Material</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                  value={n2}
                  onChange={(e) => setN2(parseFloat(e.target.value))}
                >
                  {MEDIUMS.map(m => <option key={`n2-${m.name}`} value={m.n}>{m.name} (n={m.n.toFixed(2)})</option>)}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-600">Refractive Index (n₂)</label>
                  <span className="font-mono text-sm font-bold text-emerald-600">{n2.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="1.0" max="3.0" step="0.01" value={n2}
                  onChange={(e) => setN2(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-bold mb-4 border-b border-slate-600 pb-2">Laser Source</h2>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-slate-300">Angle of Incidence (θ₁)</label>
                <span className="font-mono text-sm font-bold text-red-400">{theta1.toFixed(1)}°</span>
              </div>
              <input 
                type="range" min="0" max="89.9" step="0.1" value={theta1}
                onChange={(e) => setTheta1(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              * Drag the red laser emitter in the diagram or use the slider above to change the angle of incidence.
            </p>
          </div>

        </aside>

        {/* Diagram Area */}
        <section className="flex-1 flex flex-col relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Canvas Container */}
          <div className="flex-1 relative cursor-crosshair touch-none">
            
            {/* Background Grid & SVG */}
            <svg 
              ref={svgRef}
              className="absolute inset-0 w-full h-full" 
              viewBox="-300 -300 600 600" 
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Graph Paper Pattern */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                
                {/* Laser Glow */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <rect x="-600" y="-600" width="1200" height="1200" fill="url(#grid)" />

              {/* Medium 1 (Top) */}
              <rect x="-600" y="-600" width="1200" height="600" fill={getMediumColor(n1)} transition="fill 0.3s ease" />
              
              {/* Medium 2 (Bottom) */}
              <rect x="-600" y="0" width="1200" height="600" fill={getMediumColor(n2)} transition="fill 0.3s ease" />

              {/* Interface boundary */}
              <line x1="-600" y1="0" x2="600" y2="0" stroke="#475569" strokeWidth="2" />
              
              {/* Normal line */}
              <line x1="0" y1="-300" x2="0" y2="300" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,6" />

              {/* --- Rays --- */}
              
              {/* Reflected Ray (Faint) */}
              <g opacity="0.4">
                <line x1="0" y1="0" x2={xReflect} y2={yReflect} stroke="#ef4444" strokeWidth="3" filter="url(#glow)" />
                {/* Reflected Arc */}
                <path 
                  d={`M 0 -${arcR} A ${arcR} ${arcR} 0 0 1 ${arcR * Math.sin(theta1 * DEG_TO_RAD)} ${-arcR * Math.cos(theta1 * DEG_TO_RAD)}`} 
                  fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" 
                />
              </g>

              {/* Refracted Ray */}
              {!isTIR && theta2Deg !== null && (
                <g>
                  <line x1="0" y1="0" x2={x2} y2={y2} stroke="#ef4444" strokeWidth="3" filter="url(#glow)" />
                  {/* Refracted Angle Arc */}
                  <path 
                    d={`M 0 ${arcR} A ${arcR} ${arcR} 0 0 0 ${arcR * Math.sin(theta2Deg * DEG_TO_RAD)} ${arcR * Math.cos(theta2Deg * DEG_TO_RAD)}`} 
                    fill="none" stroke="#10b981" strokeWidth="2" 
                  />
                  {/* Refracted Angle Label */}
                  <g transform={`translate(${ (arcR + 30) * Math.sin((theta2Deg/2) * DEG_TO_RAD) }, ${ (arcR + 30) * Math.cos((theta2Deg/2) * DEG_TO_RAD) })`}>
                    <rect x="-24" y="-12" width="48" height="24" fill="white" rx="4" opacity="0.8" />
                    <text x="0" y="4" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#059669" className="font-sans">
                      {theta2Deg.toFixed(1)}°
                    </text>
                  </g>
                </g>
              )}

              {/* Incident Ray */}
              <g>
                <line x1={x1} y1={y1} x2="0" y2="0" stroke="#ef4444" strokeWidth="4" filter="url(#glow)" />
                
                {/* Arrowhead / Ray Direction Marker */}
                <polygon 
                  points="-6,-10 6,-10 0,2" 
                  fill="#ef4444" 
                  transform={`translate(${x1/2}, ${y1/2}) rotate(${180 - theta1})`} 
                />

                {/* Incident Angle Arc */}
                <path 
                  d={`M 0 -${arcR} A ${arcR} ${arcR} 0 0 0 ${arcR * Math.sin(-theta1 * DEG_TO_RAD)} ${-arcR * Math.cos(-theta1 * DEG_TO_RAD)}`} 
                  fill="none" stroke="#3b82f6" strokeWidth="2" 
                />
                
                {/*