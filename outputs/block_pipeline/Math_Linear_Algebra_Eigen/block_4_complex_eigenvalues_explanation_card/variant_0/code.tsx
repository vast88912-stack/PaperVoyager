import React, { useState, useEffect, useMemo } from 'react';

export default function App() {
  // State for the real (a) and imaginary (b) parts of the eigenvalue
  const [a, setA] = useState<number>(0.95);
  const [b, setB] = useState<number>(0.3);
  const [animStep, setAnimStep] = useState<number>(0);

  // Derived mathematical properties
  const magnitude = Math.sqrt(a * a + b * b);
  const angleRad = Math.atan2(b, a);
  const angleDeg = angleRad * (180 / Math.PI);

  // Generate trajectory points for the vector field visualization
  const trajectory = useMemo(() => {
    const points = [];
    let cx = 2; // Starting x
    let cy = 0; // Starting y
    
    for (let i = 0; i < 60; i++) {
      points.push({ x: cx, y: cy });
      
      // Apply the transformation matrix [a, -b; b, a]
      const nx = a * cx - b * cy;
      const ny = b * cx + a * cy;
      
      cx = nx;
      cy = ny;

      // Numeric stability guard: prevent infinite expansion from breaking SVG
      if (Math.abs(cx) > 100 || Math.abs(cy) > 100) {
        break;
      }
    }
    return points;
  }, [a, b]);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep((prev) => {
        if (trajectory.length === 0) return 0;
        return (prev + 1) % trajectory.length;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [trajectory.length]);

  // SVG Coordinate mapping helpers
  const svgSize = 300;
  const center = svgSize / 2;
  const scale = 20; // 20px per unit

  const mapX = (x: number) => center + x * scale;
  const mapY = (y: number) => center - y * scale; // Invert Y for standard Cartesian

  // Determine system behavior text
  let behaviorTitle = "";
  let behaviorDesc = "";
  let statusColor = "";

  if (b === 0) {
    behaviorTitle = "Purely Real";
    behaviorDesc = "No imaginary component. The system scales without rotation.";
    statusColor = "text-slate-500";
  } else if (Math.abs(magnitude - 1) < 0.01) {
    behaviorTitle = "Pure Rotation (Center)";
    behaviorDesc = "Magnitude is exactly 1. The system rotates continuously without growing or shrinking.";
    statusColor = "text-blue-500";
  } else if (magnitude < 1) {
    behaviorTitle = "Spiral Sink (Stable)";
    behaviorDesc = "Magnitude < 1. The system rotates and contracts towards the origin.";
    statusColor = "text-emerald-500";
  } else {
    behaviorTitle = "Spiral Source (Unstable)";
    behaviorDesc = "Magnitude > 1. The system rotates and expands away from the origin.";
    statusColor = "text-rose-500";
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main Card */}
      <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl border border-slate-200 w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Column: Visualization */}
        <div className="bg-slate-900 p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-700 w-full md:w-1/2">
          <h2 className="text-white text-xl font-semibold mb-6 tracking-wide">Phase Portrait</h2>
          
          <div className="relative bg-slate-800 rounded-2xl shadow-inner p-4 border border-slate-700">
            <svg width={svgSize} height={svgSize} className="overflow-visible">
              {/* Axes */}
              <line x1={0} y1={center} x2={svgSize} y2={center} stroke="#475569" strokeWidth="1" />
              <line x1={center} y1={0} x2={center} y2={svgSize} stroke="#475569" strokeWidth="1" />
              
              {/* Grid ticks */}
              {[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map(tick => (
                <React.Fragment key={tick}>
                  <line x1={mapX(tick)} y1={center - 3} x2={mapX(tick)} y2={center + 3} stroke="#475569" strokeWidth="1" />
                  <line x1={center - 3} y1={mapY(tick)} x2={center + 3} y2={mapY(tick)} stroke="#475569" strokeWidth="1" />
                </React.Fragment>
              ))}

              {/* Trajectory Path */}
              {trajectory.length > 1 && (
                <polyline
                  points={trajectory.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeOpacity="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Animated Vector */}
              {trajectory[animStep] && (
                <g>
                  <line 
                    x1={center} 
                    y1={center} 
                    x2={mapX(trajectory[animStep].x)} 
                    y2={mapY(trajectory[animStep].y)} 
                    stroke="#60a5fa" 
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle 
                    cx={mapX(trajectory[animStep].x)} 
                    cy={mapY(trajectory[animStep].y)} 
                    r="5" 
                    fill="#60a5fa" 
                    className="shadow-glow"
                  />
                </g>
              )}
            </svg>
          </div>

          <div className="mt-6 text-slate-400 text-sm text-center">
            Tracing the path of a vector under repeated multiplication by the matrix.
          </div>
        </div>

        {/* Right Column: Explanation & Controls */}
        <div className="p-8 flex flex-col w-full md:w-1/2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Complex Eigenvalues</h1>
            <p className="text-slate-600 leading-relaxed">
              When a 2x2 matrix has complex eigenvalues <span className="font-mono bg-slate-100 px-1 rounded text-sm text-slate-700">λ = a ± bi</span>, it implies the transformation includes a <strong>rotation</strong>.
            </p>
          </div>

          {/* Math Display Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Matrix Form</div>
              <div className="font-mono text-lg text-slate-800 flex items-center gap-2">
                <span className="text-2xl font-light">[</span>
                <div className="flex flex-col items-center leading-tight">
                  <span>{a.toFixed(2)} &nbsp; {(-b).toFixed(2)}</span>
                  <span>{b.toFixed(2)} &nbsp; {a.toFixed(2)}</span>
                </div>
                <span className="text-2xl font-light">]</span>
              </div>
            </div>
            
            <div className="h-px w-full bg-slate-200"></div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Eigenvalues</div>
              <div className="font-mono text-lg text-indigo-600 font-medium">
                λ = {a.toFixed(2)} ± {Math.abs(b).toFixed(2)}i
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6 mb-8">
            {/* Real Part Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Real Part (a) - <span className="text-slate-500 font-normal">Scaling</span></label>
                <span className="font-mono text-sm text-slate-600">{a.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="-1.5" 
                max="1.5" 
                step="0.01" 
                value={a} 
                onChange={(e) => setA(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Imaginary Part Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Imaginary Part (b) - <span className="text-slate-500 font-normal">Rotation</span></label>
                <span className="font-mono text-sm text-slate-600">{b.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="-1.5" 
                max="1.5" 
                step="0.01" 
                value={b} 
                onChange={(e) => setB(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Dynamic Explanation */}
          <div className={`mt-auto rounded-xl p-5 border ${magnitude > 1 ? 'bg-rose-50 border-rose-200' : magnitude < 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex justify-between items-end mb-2">
              <h3 className={`font-bold text-lg ${statusColor}`}>{behaviorTitle}</h3>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-semibold">Magnitude (|λ|)</div>
                <div className={`font-mono font-bold ${statusColor}`}>{magnitude.toFixed(3)}</div>
              </div>
            </div>
            <p className="text-slate-700 text-sm">
              {behaviorDesc} The rotation angle per step is roughly <strong>{Math.abs(angleDeg).toFixed(1)}°</strong>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}