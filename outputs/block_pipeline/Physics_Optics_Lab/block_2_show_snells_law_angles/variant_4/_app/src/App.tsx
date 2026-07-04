import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';

// --- Constants & Data ---
const MATERIALS = [
  { name: 'Vacuum / Air', n: 1.0 },
  { name: 'Water', n: 1.33 },
  { name: 'Fused Quartz', n: 1.46 },
  { name: 'Crown Glass', n: 1.52 },
  { name: 'Flint Glass', n: 1.62 },
  { name: 'Diamond', n: 2.42 },
];

export default function App() {
  // --- State ---
  const [angle1, setAngle1] = useState<number>(45); // Incident angle in degrees
  const [n1, setN1] = useState<number>(1.0); // Index of refraction 1
  const [n2, setN2] = useState<number>(1.52); // Index of refraction 2
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Physics Calculations ---
  const rad1 = (angle1 * Math.PI) / 180;
  const sin2 = (n1 / n2) * Math.sin(rad1);
  const isTIR = sin2 > 1; // Total Internal Reflection
  const angle2 = isTIR ? null : (Math.asin(sin2) * 180) / Math.PI;
  const rad2 = isTIR ? null : (angle2! * Math.PI) / 180;
  
  const criticalAngle = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;

  // --- Interaction Handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateAngleFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging) return;
    updateAngleFromEvent(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateAngleFromEvent = (e: React.PointerEvent | PointerEvent | ReactMouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;

    // We only care about the top-left quadrant for the incident ray drag,
    // but practically we calculate the angle from the negative Y axis.
    let angle = (Math.atan2(Math.abs(x), Math.abs(y)) * 180) / Math.PI;
    
    // Clamp between 0 and 89.9 to avoid visual glitches at exactly 90
    angle = Math.max(0, Math.min(89.9, angle));
    setAngle1(angle);
  };

  // Global event listeners for smooth dragging outside the SVG bounds
  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [isDragging]);

  // --- SVG Drawing Helpers ---
  const rayLength = 300;
  
  // Incident Ray (top left)
  const incX = -rayLength * Math.sin(rad1);
  const incY = -rayLength * Math.cos(rad1);

  // Reflected Ray (top right)
  const reflX = rayLength * Math.sin(rad1);
  const reflY = -rayLength * Math.cos(rad1);

  // Refracted Ray (bottom right)
  const refrX = isTIR ? 0 : rayLength * Math.sin(rad2!);
  const refrY = isTIR ? 0 : rayLength * Math.cos(rad2!);

  // Arc Radius
  const arcR = 40;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans p-4 md:p-8 flex flex-col items-center selection:bg-blue-200">
      
      {/* Header */}
      <div className="max-w-6xl w-full mb-6 flex flex-col md:flex-row justify-between items-end border-b-2 border-slate-300 pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <circle cx="12" cy="12" r="10" />
              <path d="m14 8-4 8" />
              <path d="M12 2v20" />
              <path d="M2 12h20" />
            </svg>
            Optics Lab Notebook
          </h1>
          <p className="text-slate-500 font-serif italic mt-1 text-lg">Experiment #5: Snell's Law & Refraction</p>
        </div>
        <div className="font-mono text-sm text-slate-400 mt-4 md:mt-0 bg-slate-100 px-3 py-1 rounded">
          n₁ sin(θ₁) = n₂ sin(θ₂)
        </div>
      </div>

      {/* Main Workspace */}
      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-6">
        
        {/* SVG Canvas Container */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
          
          {/* Lab Grid Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20" 
               style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <svg 
            ref={svgRef}
            className="w-full h-[500px] lg:h-[600px] cursor-crosshair touch-none select-none"
            viewBox="-250 -250 500 500"
            preserveAspectRatio="xMidYMid slice"
            onPointerDown={handlePointerDown}
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Medium Backgrounds */}
            <rect x="-500" y="-500" width="1000" height="500" fill="#ffffff" fillOpacity="0.8" />
            <rect x="-500" y="0" width="1000" height="500" fill="#e0f2fe" fillOpacity={Math.min(0.8, n2 * 0.3)} />

            {/* Axes */}
            <line x1="-500" y1="0" x2="500" y2="0" stroke="#94a3b8" strokeWidth="2" />
            <line x1="0" y1="-500" x2="0" y2="500" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 6" />

            {/* Labels for Mediums */}
            <text x="-230" y="-220" fill="#64748b" className="font-serif italic text-sm select-none">Medium 1 (n₁)</text>
            <text x="-230" y="230" fill="#0369a1" className="font-serif italic text-sm select-none">Medium 2 (n₂)</text>

            {/* Angle Arcs */}
            {/* Incident Arc */}
            <path 
              d={`M 0 ${-arcR} A ${arcR} ${arcR} 0 0 0 ${-arcR * Math.sin(rad1)} ${-arcR * Math.cos(rad1)}`} 
              fill="none" stroke="#ef4444" strokeWidth="2" 
            />
            <text x={-arcR * Math.sin(rad1/2) - 15} y={-arcR * Math.cos(rad1/2) - 10} fill="#ef4444" className="text-xs font-mono font-bold select-none text-center">
              θ₁
            </text>

            {/* Reflected Arc */}
            <path 
              d={`M 0 ${-arcR} A ${arcR} ${arcR} 0 0 1 ${arcR * Math.sin(rad1)} ${-arcR * Math.cos(rad1)}`} 
              fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="3 3"
            />

            {/* Refracted Arc */}
            {!isTIR && (
              <>
                <path 
                  d={`M 0 ${arcR} A ${arcR} ${arcR} 0 0 0 ${arcR * Math.sin(rad2!)} ${arcR * Math.cos(rad2!)}`} 
                  fill="none" stroke="#3b82f6" strokeWidth="2" 
                />
                <text x={arcR * Math.sin(rad2!/2) + 15} y={arcR * Math.cos(rad2!/2) + 15} fill="#3b82f6" className="text-xs font-mono font-bold select-none text-center">
                  θ₂
                </text>
              </>
            )}

            {/* Rays */}
            {/* Incident Ray */}
            <g>
              <line x1={incX} y1={incY} x2="0" y2="0" stroke="#ef4444" strokeWidth="3" filter="url(#glow)" />
              {/* Draggable Handle */}
              <circle cx={incX * 0.7} cy={incY * 0.7} r="15" fill="#ef4444" fillOpacity="0.2" className="cursor-grab hover:fill-opacity-40 transition-all" />
              <circle cx={incX * 0.7} cy={incY * 0.7} r="4" fill="#ef4444" className="pointer-events-none" />
            </g>

            {/* Reflected Ray */}
            <line x1="0" y1="0" x2={reflX} y2={reflY} stroke="#fca5a5" strokeWidth="2" strokeDasharray="4 4" />

            {/* Refracted Ray or TIR indicator */}
            {!isTIR ? (
              <line x1="0" y1="0" x2={refrX} y2={refrY} stroke="#3b82f6" strokeWidth="3" filter="url(#glow)" />
            ) : (
              <text x="0" y="40" textAnchor="middle" fill="#ef4444" className="font-mono text-xs font-bold bg-white px-2 py-1 select-none">
                Total Internal Reflection
              </text>
            )}

            {/* Origin Dot */}
            <circle cx="0" cy="0" r="4" fill="#1e293b" />
          </svg>

          {/* Overlay Instructions */}
          <div className="absolute top-4 right-4 bg-white/80 backdrop-blur text-slate-500 text-xs py-1 px-3 rounded-full border border-slate-200 pointer-events-none">
            Drag the red ray to change θ₁
          </div>
        </div>

        {/* Controls & Notebook Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Paper notes styling */}
          <div className="bg-[#fffdf8] border border-[#e2dfd2] rounded shadow-[2px_2px_8px_rgba(0,0,0,0.05)] relative p-6">
            {/* Tape effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-white/40 border border-white/60 shadow-sm transform -rotate-2 backdrop-blur-sm z-10"></div>
            
            <h2 className="font-serif font-bold text-lg text-slate-800 mb-4 border-b border-slate-200 pb-2">Lab Controls</h2>
            
            {/* Medium 1 Control */}
            <div className="mb-5">
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                <span>Medium 1 (n₁)</span>
                <span className="font-mono text-blue-600">{n1.toFixed(2)}</span>
              </label>
              <select 
                className="w-full bg-transparent border-b border-slate-300 py-1 text-sm font-serif mb-2 outline-none focus:border-blue-500"
                value={MATERIALS.find(m => m.n === n1)?.name || 'Custom'}
                onChange={(e) => {
                  const val = MATERIALS.find(m => m.name === e.target.value)?.n;
                  if (val) setN1(val);
                }}
              >
                {MATERIALS.map(m => <option key={`m1-${m.name}`} value={m.name}>{m.name}</option>)}
                <option value="Custom">Custom...</option>
              </select>
              <input 
                type="range" min="1" max="3" step="0.01" 
                value={n1} onChange={(e) => setN1(parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Medium 2 Control */}
            <div className="mb-5">
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                <span>Medium 2 (n₂)</span>
                <span className="font-mono text-blue-600">{n2.toFixed(2)}</span>
              </label>
              <select 
                className="w-full bg-transparent border-b border-slate-300 py-1 text-sm font-serif mb-2 outline-none focus:border-blue-500"
                value={MATERIALS.find(m => m.n === n2)?.name || 'Custom'}
                onChange={(e) => {
                  const val = MATERIALS.find(m => m.name === e.target.value)?.n;
                  if (val) setN2(val);
                }}
              >
                {MATERIALS.map(m => <option key={`m2-${m.name}`} value={m.name}>{m.name}</option>)}
                <option value="Custom">Custom...</option>
              </select>
              <input 
                type="range" min="1" max="3" step="0.01" 
                value={n2} onChange={(e) => setN2(parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Incident Angle Slider */}
            <div className="mb-2">
              <label className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                <span>Incident Angle (θ₁)</span>
                <span className="font-mono text-red-500">{angle1.toFixed(1)}°</span>
              </label>
              <input 
                type="range" min="0" max="89.9" step="0.1" 
                value={angle1} onChange={(e) => setAngle1(parseFloat(e.target.value))}
                className="w-full accent-red-500 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Calculations Panel */}
          <div className="bg-[#1e293b] rounded text-slate-300 p-5 font-mono text-sm shadow-lg border-l-4 border-blue-500">
            <h3 className="text-white font-bold mb-3 uppercase tracking-wider text-xs">Calculations</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-700 pb-1">
                <span>sin(θ₁)</span>
                <span className="text-red-400">{Math.sin(rad1).toFixed(4)}</span>
              </div>
              
              <div className="flex flex-col border-b border-slate-700 pb-2">
                <span className="text-slate-400 mb-1">Snell's Law:</span>
                <div className="bg-slate-800/50 p-2 rounded">
                  <span className="text-blue-300">sin(θ₂)</span> = ({n1.toFixed(2)} / {n2.toFixed(2)}) × {Math.sin(rad1).toFixed(4)}
                  <br/>
                  <span className="text-blue-300">sin(θ₂)</span> = <span className={isTIR ? 'text-orange-400 font-bold' : ''}>{sin2.toFixed(4)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-white text-base">θ₂ (Refracted)</span>
                {isTIR ? (
                  <span className="text-orange-400 font-bold bg-orange-400/10 px-2 py-1 rounded">TIR</span>
                ) : (
                  <span className="text-blue-400 font-bold text-base">{angle2?.toFixed(1)}°</span>
                )}
              </div>

              {criticalAngle && (
                <div className="mt-4 text-xs text-slate-400 bg-slate-800 p-2 rounded border border-slate-700">
                  <span className="block mb-1 text-slate-300 font-semibold">Critical Angle (θc):</span>
                  n₁ &gt; n₂ detected. TIR occurs at θ₁ &ge; <span className="text-orange-300 font-bold">{criticalAngle.toFixed(1)}°</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}