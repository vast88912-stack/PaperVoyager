import React, { useState, useMemo } from 'react';

export default function App() {
  const [focalLength, setFocalLength] = useState<number>(150);

  // Canvas dimensions
  const width = 800;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;

  // Ray offsets from the optical axis
  const rayOffsets = [-120, -60, 0, 60, 120];

  // Calculate lens path based on focal length
  const lensPath = useMemo(() => {
    if (focalLength === 0) {
      // Flat glass
      return `M ${cx - 10} 50 L ${cx + 10} 50 L ${cx + 10} 450 L ${cx - 10} 450 Z`;
    } else if (focalLength > 0) {
      // Convex lens
      const curve = Math.min(120, 15000 / focalLength);
      return `M ${cx} 50 Q ${cx + curve} ${cy} ${cx} 450 Q ${cx - curve} ${cy} ${cx} 50`;
    } else {
      // Concave lens
      const w = Math.min(40, 15000 / Math.abs(focalLength));
      return `M ${cx - w} 50 L ${cx + w} 50 Q ${cx} ${cy} ${cx + w} 450 L ${cx - w} 450 Q ${cx} ${cy} ${cx - w} 50`;
    }
  }, [focalLength, cx, cy]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-800 font-sans p-8 flex flex-col items-center justify-center">
      
      {/* Lab Notebook Container */}
      <div className="w-full max-w-5xl bg-white border-2 border-slate-800 shadow-[8px_8px_0px_rgba(30,41,59,1)] rounded-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="border-b-2 border-slate-800 bg-amber-50 p-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase flex items-center gap-3">
              <span className="bg-slate-800 text-white px-2 py-1 rounded-sm text-xl">Lab 04</span>
              Focal Length Slider
            </h1>
            <p className="text-slate-600 font-mono text-sm mt-1">Experiment: Refraction & Lens Behavior</p>
          </div>
          <div className="text-right font-mono text-sm text-slate-500 flex flex-col items-end">
            <span>Date: {new Date().toLocaleDateString()}</span>
            <span>Subject: Geometric Optics</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col md:flex-row">
          
          {/* Left Column: Controls & Observations */}
          <div className="w-full md:w-1/3 border-r-2 border-slate-800 p-6 bg-[#faf8f5] flex flex-col gap-8">
            
            {/* Control Panel */}
            <div className="bg-white border-2 border-slate-800 p-4 shadow-[4px_4px_0px_rgba(30,41,59,1)] rounded-md">
              <h2 className="font-bold text-lg mb-4 border-b-2 border-slate-200 pb-2">Lens Parameters</h2>
              
              <div className="flex flex-col gap-2">
                <label className="flex justify-between font-mono text-sm font-semibold">
                  <span>Focal Length (f)</span>
                  <span className="text-blue-600">{focalLength > 0 ? '+' : ''}{focalLength} mm</span>
                </label>
                <input 
                  type="range" 
                  min="-300" 
                  max="300" 
                  step="10" 
                  value={focalLength} 
                  onChange={(e) => setFocalLength(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs font-mono text-slate-500 mt-1">
                  <span>Concave (-)</span>
                  <span>Flat</span>
                  <span>Convex (+)</span>
                </div>
              </div>
            </div>

            {/* Observations Panel */}
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Lab Notes
              </h2>
              <div className="font-mono text-sm text-slate-700 space-y-3 bg-amber-50/50 p-4 border border-amber-200 rounded-md h-full">
                <p>
                  <strong>Lens Type:</strong> {focalLength > 0 ? 'Convex (Converging)' : focalLength < 0 ? 'Concave (Diverging)' : 'Planar (Neutral)'}
                </p>
                <p>
                  <strong>Behavior:</strong> Parallel incident rays are refracted {focalLength > 0 ? 'towards' : focalLength < 0 ? 'away from' : 'straight through'} the optical axis.
                </p>
                {focalLength !== 0 && (
                  <p>
                    <strong>Focal Point:</strong> Rays {focalLength > 0 ? 'intersect at' : 'appear to originate from'} f = {focalLength}mm.
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <span className="block text-xs text-slate-400 mb-1">Lens Maker's Equation:</span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-xs">
                    1/f = (n-1)(1/R₁ - 1/R₂)
                  </code>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Canvas */}
          <div className="w-full md:w-2/3 relative bg-white overflow-hidden" style={{ minHeight: '500px' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="block">
              <defs>
                {/* Grid Pattern */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                </pattern>
                
                {/* Arrowhead Marker */}
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
                
                {/* Virtual Arrowhead Marker */}
                <marker id="arrowhead-virtual" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Background Grid */}
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Optical Axis */}
              <line x1="0" y1={cy} x2={width} y2={cy} stroke="#64748b" strokeWidth="2" strokeDasharray="10 5" />
              <text x="10" y={cy - 10} className="font-mono text-xs fill-slate-500">Optical Axis</text>

              {/* Focal Points */}
              {focalLength !== 0 && (
                <>
                  {/* Primary Focal Point */}
                  <circle cx={cx + focalLength} cy={cy} r="4" fill="#0284c7" />
                  <text x={cx + focalLength - 5} y={cy + 20} className="font-mono text-sm font-bold fill-slate-800">F</text>
                  
                  {/* Secondary Focal Point */}
                  <circle cx={cx - focalLength} cy={cy} r="4" fill="#0284c7" />
                  <text x={cx - focalLength - 5} y={cy + 20} className="font-mono text-sm font-bold fill-slate-800">F'</text>
                </>
              )}

              {/* Lens */}
              <path 
                d={lensPath} 
                fill="#bae6fd" 
                fillOpacity="0.4" 
                stroke="#0284c7" 
                strokeWidth="3" 
                className="transition-all duration-300 ease-in-out"
              />
              <line x1={cx} y1="20" x2={cx} y2={height - 20} stroke="#0284c7" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

              {/* Light Rays */}
              {rayOffsets.map((offset, index) => {
                const yi = cy + offset;
                const m = focalLength === 0 ? 0 : -offset / focalLength;
                
                // Refracted ray calculations
                const xMid = cx + (width - cx) / 2;
                const yMid = yi + m * (xMid - cx);
                const yEnd = yi + m * (width - cx);

                return (
                  <g key={`ray-${index}`}>
                    {/* Incident Ray (Split to ensure arrow is visible) */}
                    <line x1="0" y1={yi} x2={cx / 2} y2={yi} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    <line x1={cx / 2} y1={yi} x2={cx} y2={yi} stroke="#ef4444" strokeWidth="2" />

                    {/* Refracted Ray */}
                    <line x1={cx} y1={yi} x2={xMid} y2={yMid} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)" />
                    <line x1={xMid} y1={yMid} x2={width} y2={yEnd} stroke="#ef4444" strokeWidth="2" />

                    {/* Virtual Ray (for concave lenses) */}
                    {focalLength < 0 && offset !== 0 && (
                      <line 
                        x1={cx} 
                        y1={yi} 
                        x2={cx + focalLength} 
                        y2={cy} 
                        stroke="#94a3b8" 
                        strokeWidth="2" 
                        strokeDasharray="6 4" 
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Overlay Badge */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="font-mono text-xs font-semibold text-slate-700">Ray Tracing Active</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Instructions */}
      <div className="mt-6 text-slate-500 font-mono text-sm max-w-3xl text-