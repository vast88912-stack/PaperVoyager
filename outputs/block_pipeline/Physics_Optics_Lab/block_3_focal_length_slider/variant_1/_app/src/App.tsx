import React, { useState, useEffect, useMemo } from 'react';

export default function App() {
  // Focal length state: positive for convex, negative for concave
  const [focalLength, setFocalLength] = useState<number>(120);

  // Prevent focal length from being exactly 0 to avoid division by zero
  const safeFocalLength = Math.abs(focalLength) < 10 ? (focalLength < 0 ? -10 : 10) : focalLength;

  // Ray generation
  const rayYPositions = [-100, -60, -20, 20, 60, 100];
  const canvasWidth = 800;
  const canvasHeight = 400;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Generate dynamic SVG path for the lens based on focal length
  const getLensPath = (f: number) => {
    const height = 140;
    const isConvex = f > 0;
    const absF = Math.abs(f);
    
    // Curvature factor based on focal length (stronger curve for shorter focal length)
    const curve = Math.min(60, 4000 / Math.max(20, absF));

    if (isConvex) {
      return `M 0 ${-height} Q ${curve} 0 0 ${height} Q ${-curve} 0 0 ${-height} Z`;
    } else {
      const edge = 15;
      return `M ${-edge} ${-height} L ${edge} ${-height} Q ${edge - curve} 0 ${edge} ${height} L ${-edge} ${height} Q ${-edge + curve} 0 ${-edge} ${-height} Z`;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-4 md:p-8 font-mono text-slate-800 flex flex-col items-center justify-center selection:bg-blue-200">
      
      {/* Lab Notebook Container */}
      <div className="w-full max-w-5xl bg-white rounded-sm shadow-xl border-l-4 border-l-blue-400 relative overflow-hidden ring-1 ring-slate-900/5">
        
        {/* Notebook Header */}
        <div className="border-b-2 border-slate-200 bg-[#faf9f6] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Optics Lab</h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Experiment 04: Thin Lens & Focal Length
            </p>
          </div>
          
          <div className="flex gap-6 text-sm bg-white px-4 py-2 rounded border border-slate-200 shadow-sm">
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs">Lens Type</span>
              <span className="font-semibold text-blue-600">
                {focalLength > 0 ? 'Biconvex (Converging)' : 'Biconcave (Diverging)'}
              </span>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs">Focal Length (ƒ)</span>
              <span className="font-semibold">{safeFocalLength > 0 ? '+' : ''}{safeFocalLength} mm</span>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-xs">Power (P)</span>
              <span className="font-semibold">{(1000 / safeFocalLength).toFixed(2)} D</span>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full aspect-video md:aspect-[21/9] bg-[#fdfdfc] overflow-hidden cursor-crosshair">
          
          {/* SVG Ray Tracing Canvas */}
          <svg 
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} 
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid Pattern */}
            <defs>
              <pattern id="notebook-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e7ff" strokeWidth="0.5" />
              </pattern>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
              <marker id="arrow-virtual" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#notebook-grid)" />

            {/* Principal Axis */}
            <line x1="0" y1={centerY} x2={canvasWidth} y2={centerY} stroke="#64748b" strokeWidth="1" strokeDasharray="8 4" />
            
            {/* Focal Points */}
            <g transform={`translate(${centerX}, ${centerY})`}>
              {/* F1 */}
              <circle cx={-safeFocalLength} cy="0" r="3" fill="#3b82f6" />
              <text x={-safeFocalLength} y="15" fontSize="12" fill="#3b82f6" textAnchor="middle" className="font-serif italic">F</text>
              
              {/* F2 */}
              <circle cx={safeFocalLength} cy="0" r="3" fill="#3b82f6" />
              <text x={safeFocalLength} y="15" fontSize="12" fill="#3b82f6" textAnchor="middle" className="font-serif italic">F'</text>

              {/* 2F1 */}
              <circle cx={-safeFocalLength * 2} cy="0" r="2" fill="#94a3b8" />
              <text x={-safeFocalLength * 2} y="15" fontSize="10" fill="#94a3b8" textAnchor="middle" className="font-serif italic">2F</text>
              
              {/* 2F2 */}
              <circle cx={safeFocalLength * 2} cy="0" r="2" fill="#94a3b8" />
              <text x={safeFocalLength * 2} y="15" fontSize="10" fill="#94a3b8" textAnchor="middle" className="font-serif italic">2F'</text>
            </g>

            {/* Rays */}
            <g transform={`translate(${centerX}, ${centerY})`}>
              {rayYPositions.map((y, i) => {
                // Ray math
                const startX = -centerX;
                const lensX = 0;
                const endX = centerX;
                
                // Slope after passing through lens: m = -y / f
                const slope = -y / safeFocalLength;
                
                // End Y position at the right edge of the canvas
                const endY = y + slope * endX;

                return (
                  <g key={`ray-${i}`}>
                    {/* Incoming Ray */}
                    <line 
                      x1={startX} y1={y} 
                      x2={lensX} y2={y} 
                      stroke="#ef4444" strokeWidth="1.5" 
                      opacity="0.8"
                      markerMid="url(#arrow)"
                    />
                    {/* Add an arrow in the middle of the incoming ray */}
                    <path d={`M ${startX/2 - 5} ${y - 4} L ${startX/2 + 5} ${y} L ${startX/2 - 5} ${y + 4} Z`} fill="#ef4444" opacity="0.8"/>

                    {/* Outgoing Ray */}
                    <line 
                      x1={lensX} y1={y} 
                      x2={endX} y2={endY} 
                      stroke="#ef4444" strokeWidth="1.5" 
                      opacity="0.8"
                    />
                    {/* Add an arrow in the middle of the outgoing ray */}
                    <path 
                      d={`M -5 -4 L 5 0 L -5 4 Z`} 
                      fill="#ef4444" 
                      opacity="0.8"
                      transform={`translate(${endX/2}, ${y + slope * (endX/2)}) rotate(${Math.atan(slope) * 180 / Math.PI})`}
                    />

                    {/* Virtual Ray (for concave lenses or tracing back) */}
                    {safeFocalLength < 0 && (
                      <line 
                        x1={lensX} y1={y} 
                        x2={safeFocalLength} y2={0} 
                        stroke="#94a3b8" strokeWidth="1" 
                        strokeDasharray="4 4"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* The Lens */}
            <g transform={`translate(${centerX}, ${centerY})`}>
              <path 
                d={getLensPath(safeFocalLength)} 
                fill="rgba(186, 230, 253, 0.3)" 
                stroke="#0284c7" 
                strokeWidth="2"
                className="transition-all duration-300 ease-out"
              />
              {/* Optical Center */}
              <circle cx="0" cy="0" r="2" fill="#0284c7" />
            </g>

          </svg>

          {/* Equation Overlay */}
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm p-3 rounded border border-slate-200 shadow-sm pointer-events-none">
            <p className="text-xs text-slate-500 mb-1">Lens Equation</p>
            <div className="font-serif italic text-sm text-slate-700 flex items-center gap-2">
              <span>1/f</span>
              <span>=</span>
              <span>1/d<sub>o</sub></span>
              <span>+</span>
              <span>1/d<sub>i</sub></span>
            </div>
          </div>
        </div>

        {/* Controls Area */}
        <div className="bg-[#f8f9fa] border-t border-slate-200 p-6 md:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-4">
              <div>
                <label htmlFor="focal-slider" className="block text-sm font-bold text-slate-700 mb-1">
                  Adjust Focal Length
                </label>
                <p className="text-xs text-slate-500">Drag to change between convex (+) and concave (-)</p>
              </div>
              <div className="text-right">
                <button 
                  onClick={() => setFocalLength(120)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                >
                  Reset to Default
                </button>
              </div>
            </div>
            
            <div className="relative flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-500 w-12 text-right">-300</span>
              
              <div className="relative flex-1">
                {/* Custom slider track background with zero-marker */}
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-2 bg-slate-200 rounded-full pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-slate-400 rounded-full pointer-events-none z-0"></div>
                
                <input
                  id="focal-slider"
                  type="range"
                  min="-300"
                  max="300"
                  step="5"
                  value={focalLength}
                  onChange={(e) => setFocalLength(Number(e.target.value))}
                  className="w-full h-2 appearance-none bg-transparent cursor-ew-resize relative z-10 
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                             [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
                             hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95"
                />
              </div>

              <span className="text-sm font-semibold text-slate-500 w-12 text-left">+300</span>
            </div>

            {/* Interactive feedback annotations */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50/50 p-4 rounded border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-1">Observation Notes</h4>
                <p className="text-blue-800/80 leading-relaxed text-xs">
                  {focalLength > 0 
                    ? "Parallel incident rays refract and converge at the principal focus (F') on the opposite side of the lens."
                    : "Parallel incident rays refract and diverge. Their virtual extensions converge at the principal focus (F) on the incident side."}
                </p>
              </div>
              <div className="bg-amber-50/50 p-4 rounded border border-amber-100">
                <h4 className="font-bold text-amber-900 mb-1">Lens Shape</h4>
                <p className="text-amber-800/80 leading-relaxed text-xs">
                  {focalLength > 0 
                    ? "Thicker at the center than at the edges. A shorter focal length requires a higher curvature (thicker lens)."
                    : "Thinner at the center than at the edges. A shorter focal length requires deeper concave curves."}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer / Signature */}
      <div className="mt-6 text-center text-slate-400 text-xs flex items-center gap-2">
        <span>Optics Lab Interactive Module</span>
        <span>•</span>
        <span>Generated for STEM Visualization</span>
      </div>
    </div>
  );
}