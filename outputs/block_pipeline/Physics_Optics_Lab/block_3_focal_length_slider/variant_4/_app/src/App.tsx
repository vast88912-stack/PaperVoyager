import React, { useState, useEffect, useRef } from 'react';

// Dependencies: None (pure React + Tailwind)
// Tailwind classes used require a standard Tailwind setup.

export default function App() {
  const [focalLength, setFocalLength] = useState<number>(150);
  const [showVirtualRays, setShowVirtualRays] = useState<boolean>(true);

  // Prevent slider from going too close to 0 (infinite power/flat lens)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (val > -40 && val < 0) val = -40;
    if (val < 40 && val >= 0) val = 40;
    setFocalLength(val);
  };

  const isConvex = focalLength > 0;
  const absFocal = Math.abs(focalLength);

  // SVG Canvas dimensions
  const width = 800;
  const height = 400;
  const lensX = width / 2;
  const centerY = height / 2;

  // Rays entering the lens
  const rayYPositions = [80, 140, 200, 260, 320];

  // Lens Path Calculation
  const getLensPath = () => {
    const lensHeight = 280;
    const topY = centerY - lensHeight / 2;
    const bottomY = centerY + lensHeight / 2;

    if (isConvex) {
      // Steeper curve for shorter focal length
      const curve = 12000 / absFocal;
      return `M ${lensX} ${topY} 
              Q ${lensX - curve} ${centerY} ${lensX} ${bottomY} 
              Q ${lensX + curve} ${centerY} ${lensX} ${topY}`;
    } else {
      const curve = 12000 / absFocal;
      const hw = Math.max(15, curve * 0.4); // half-width of the concave edges
      return `M ${lensX - hw} ${topY} 
              L ${lensX + hw} ${topY} 
              Q ${lensX} ${centerY} ${lensX + hw} ${bottomY} 
              L ${lensX - hw} ${bottomY} 
              Q ${lensX} ${centerY} ${lensX - hw} ${topY} Z`;
    }
  };

  // Optical power in diopters (assuming SVG unit = mm for this mock calculation)
  const diopters = (1000 / focalLength).toFixed(2);

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-800 font-mono p-4 md:p-8 flex items-center justify-center">
      {/* Notebook Paper Styling */}
      <div 
        className="w-full max-w-5xl bg-white shadow-xl rounded-sm overflow-hidden relative border border-slate-200"
        style={{
          backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px)',
          backgroundSize: '100% 24px',
          backgroundPosition: '0 2px'
        }}
      >
        {/* Notebook Margin Line */}
        <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-red-300/70 pointer-events-none z-0" />

        <div className="relative z-10 pl-16 pr-8 py-8 flex flex-col gap-8">
          
          {/* Header */}
          <header className="border-b-2 border-slate-800 pb-2 mb-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Optics Lab</h1>
            <p className="text-slate-500 mt-1 text-sm">Experiment 04: Focal Length & Thin Lenses</p>
          </header>

          {/* Interactive Canvas */}
          <div className="bg-slate-50/80 border-2 border-slate-300 rounded-lg shadow-inner overflow-hidden relative">
            
            {/* Legend / Info Overlay */}
            <div className="absolute top-4 left-4 bg-white/90 px-3 py-2 border border-slate-300 shadow-sm text-xs rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
                <span>Incident / Refracted Rays</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-orange-400 border-dashed border-b inline-block"></span>
                <span>Virtual Extensions</span>
              </div>
            </div>

            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-auto drop-shadow-sm"
              style={{ backgroundColor: 'transparent' }}
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2,2"/>
                </pattern>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
              </defs>

              {/* Grid */}
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Optical Axis */}
              <line x1="0" y1={centerY} x2={width} y2={centerY} stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" />
              <text x={width - 80} y={centerY - 10} fill="#64748b" fontSize="12" className="font-sans">Optical Axis</text>

              {/* Focal Points */}
              <circle cx={lensX + focalLength} cy={centerY} r="4" fill="#0f172a" />
              <text x={lensX + focalLength - 5} y={centerY + 20} fill="#0f172a" fontSize="14" fontWeight="bold">F</text>
              
              <circle cx={lensX - focalLength} cy={centerY} r="4" fill="#64748b" />
              <text x={lensX - focalLength - 8} y={centerY + 20} fill="#64748b" fontSize="14" fontWeight="bold">F'</text>

              {/* Lens */}
              <path 
                d={getLensPath()} 
                fill="rgba(56, 189, 248, 0.2)" 
                stroke="#0284c7" 
                strokeWidth="2" 
                className="transition-all duration-300 ease-in-out"
              />

              {/* Rays */}
              {rayYPositions.map((y, i) => {
                const dy = centerY - y;
                // Thin lens approximation: m = dy / f
                const slope = dy / focalLength;
                
                // End Y at the right edge of the canvas (x = width)
                const endY = y + slope * (width - lensX);

                return (
                  <g key={i}>
                    {/* Incoming Ray */}
                    <line 
                      x1="0" 
                      y1={y} 
                      x2={lensX} 
                      y2={y} 
                      stroke="#ef4444" 
                      strokeWidth="2"
                      markerEnd={i === 2 ? "" : "url(#arrow)"} 
                    />
                    
                    {/* Refracted Ray */}
                    <line 
                      x1={lensX} 
                      y1={y} 
                      x2={width} 
                      y2={endY} 
                      stroke="#ef4444" 
                      strokeWidth="2" 
                    />

                    {/* Virtual Ray (for concave lenses or convex divergence tracing) */}
                    {showVirtualRays && !isConvex && (
                      <line 
                        x1={lensX} 
                        y1={y} 
                        x2={lensX + focalLength} 
                        y2={centerY} 
                        stroke="#f97316" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,4" 
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Controls Panel */}
          <div className="bg-slate-100/50 border border-slate-300 p-6 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Slider Section */}
              <div className="col-span-1 md:col-span-2 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Focal Length Slider</h2>
                    <p className="text-xs text-slate-500">Drag to adjust lens curvature and type</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">{focalLength}</span>
                    <span className="text-sm text-slate-500 ml-1">mm</span>
                  </div>
                </div>

                <div className="relative pt-4 pb-2">
                  {/* Custom Slider Track Background */}
                  <div className="absolute top-1/2 left-0 right-0 h-2 bg-slate-300 rounded-full -translate-y-1/2" />
                  <div 
                    className="absolute top-1/2 left-1/2 h-2 bg-blue-500 rounded-full -translate-y-1/2 origin-left transition-all duration-75"
                    style={{ 
                      width: `${Math.abs(focalLength) / 300 * 50}%`,
                      transform: focalLength < 0 ? `translate(-100%, -50%)` : `translate(0%, -50%)`
                    }}
                  />
                  
                  {/* Zero Marker */}
                  <div className="absolute top-1/2 left-1/2 w-1 h-4 bg-slate-600 -translate-x-1/2 -translate-y-1/2 rounded-sm" />

                  <input 
                    type="range" 
                    min="-300" 
                    max="300" 
                    step="1" 
                    value={focalLength} 
                    onChange={handleSliderChange}
                    className="w-full absolute top-1/2 left-0 -translate-y-1/2 h-2 opacity-0 cursor-ew-resize z-20"
                    title="Adjust focal length"
                  />
                  
                  {/* Custom Thumb (Visual only, follows input) */}
                  <div 
                    className="absolute top-1/2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md -translate-y-1/2 pointer-events-none z-10"
                    style={{ left: `calc(${(focalLength + 300) / 600 * 100}% - 10px)` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-sans font-medium uppercase tracking-wider">
                  <span>Concave (-)</span>
                  <span>Planar</span>
                  <span>Convex (+)</span>
                </div>
              </div>

              {/* Data Output Section */}
              <div className="col-span-1 border-t md:border-t-0 md:border-l border-slate-300 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center gap-3">
                <div className="bg-white border border-slate-200 p-3 rounded shadow-sm flex items-center justify-between">
                  <span className="text-sm text-slate-500">Lens Type</span>
                  <span className={`font-bold uppercase text-xs px-2 py-1 rounded ${isConvex ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isConvex ? 'Convex (Converging)' : 'Concave (Diverging)'}
                  </span>
                </div>
                
                <div className="bg-white border border-slate-200 p-3 rounded shadow-sm flex items-center justify-between">
                  <span className="text-sm text-slate-500">Optical Power</span>
                  <span className="font-mono font-bold text-slate-800">{diopters} D</span>
                </div>

                <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={showVirtualRays} 
                    onChange={(e) => setShowVirtualRays(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Show Virtual Rays</span>
                </label>
              </div>

            </div>
          </div>
          
          {/* Notes area */}
          <div className="mt-4 pb-8">
            <h3 className="text-xl font-bold border-b-2 border-slate-200 pb-1 inline-block mb-3">Observations</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2 marker:text-red-400">
              <li>{isConvex ? 'Parallel rays converge at the focal point (F) on the opposite side.' : 'Parallel rays diverge. Their virtual extensions converge at the focal point (F\') on the incident side.'}</li>
              <li>As focal length decreases, the lens becomes thicker and bends light more sharply.</li>
              <li>Optical power ($P = 1/f$) is {isConvex ? 'positive' : 'negative'} ({diopters} Diopters).</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}