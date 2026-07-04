import React, { useState } from 'react';

export default function App() {
  const [focalLength, setFocalLength] = useState<number>(60);

  // Avoid division by zero by snapping 0 to a very large number (flat glass)
  const effectiveF = focalLength === 0 ? 10000 : focalLength;
  const isConvex = focalLength > 0;
  
  const canvasWidth = 600;
  const canvasHeight = 300;
  const lensX = canvasWidth / 2;
  const axisY = canvasHeight / 2;

  // Incident ray y-coordinates
  const rayYs = [50, 90, 130, 170, 210, 250];

  return (
    <div className="min-h-screen bg-[#fdfcf8] text-slate-800 font-sans p-8 flex items-center justify-center selection:bg-blue-200">
      <div className="max-w-3xl w-full bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden flex flex-col">
        
        {/* Header - Lab Notebook Style */}
        <div className="bg-[#f4f1ea] border-b border-slate-200 px-6 py-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-serif text-slate-700 tracking-wide font-bold">
              Optics Lab <span className="text-slate-400 font-normal text-sm ml-2">Exp. 03</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">MODULE: FOCAL_LENGTH_SLIDER</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono text-slate-600">
              f = {focalLength > 0 ? '+' : ''}{focalLength} mm
            </p>
            <p className="text-xs text-slate-400 font-mono uppercase">
              {focalLength === 0 ? 'Planar' : isConvex ? 'Converging Lens' : 'Diverging Lens'}
            </p>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full bg-blue-50/30 overflow-hidden flex justify-center p-6">
          <svg 
            width={canvasWidth} 
            height={canvasHeight} 
            className="border border-slate-300 bg-white shadow-inner rounded-sm"
            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)', backgroundSize: '20px 20px' }}
          >
            {/* Principal Axis */}
            <line 
              x1="0" y1={axisY} 
              x2={canvasWidth} y2={axisY} 
              stroke="#94a3b8" 
              strokeWidth="1.5" 
              strokeDasharray="6 4" 
            />

            {/* Focal Points */}
            {focalLength !== 0 && Math.abs(focalLength) < 300 && (
              <>
                <circle cx={lensX + focalLength} cy={axisY} r="3" fill="#ef4444" />
                <text x={lensX + focalLength} y={axisY - 10} fontSize="12" fill="#ef4444" textAnchor="middle" className="font-mono font-bold">F</text>
                
                <circle cx={lensX - focalLength} cy={axisY} r="3" fill="#ef4444" />
                <text x={lensX - focalLength} y={axisY - 10} fontSize="12" fill="#ef4444" textAnchor="middle" className="font-mono font-bold">F'</text>
              </>
            )}

            {/* Light Rays */}
            {rayYs.map((y, i) => {
              // Calculate refraction slope
              const slope = (axisY - y) / effectiveF;
              const endX = canvasWidth;
              const endY = y + slope * (endX - lensX);
              
              // For concave lenses, draw virtual rays backwards to the focal point
              const virtualStartX = lensX;
              const virtualStartY = y;
              const virtualEndX = lensX + focalLength; // focalLength is negative here
              const virtualEndY = axisY;

              return (
                <g key={i}>
                  {/* Incident Ray */}
                  <line 
                    x1="0" y1={y} 
                    x2={lensX} y2={y} 
                    stroke="#f59e0b" 
                    strokeWidth="2" 
                  />
                  {/* Refracted Ray */}
                  <line 
                    x1={lensX} y1={y} 
                    x2={endX} y2={endY} 
                    stroke="#f59e0b" 
                    strokeWidth="2" 
                  />
                  {/* Virtual Ray (Dashed) for Concave */}
                  {!isConvex && focalLength !== 0 && (
                    <line 
                      x1={virtualStartX} y1={virtualStartY} 
                      x2={virtualEndX} y2={virtualEndY} 
                      stroke="#f59e0b" 
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  )}
                </g>
              );
            })}

            {/* Lens Representation */}
            {/* Draw stylized lens shape based on focal length */}
            <path 
              d={
                isConvex 
                ? `M ${lensX} 30 Q ${lensX + Math.min(60, 2000/Math.abs(effectiveF))} ${axisY} ${lensX} 270 Q ${lensX - Math.min(60, 2000/Math.abs(effectiveF))} ${axisY} ${lensX} 30`
                : `M ${lensX - Math.min(20, 1000/Math.abs(effectiveF))} 30 L ${lensX + Math.min(20, 1000/Math.abs(effectiveF))} 30 Q ${lensX} ${axisY} ${lensX + Math.min(20, 1000/Math.abs(effectiveF))} 270 L ${lensX - Math.min(20, 1000/Math.abs(effectiveF))} 270 Q ${lensX} ${axisY} ${lensX - Math.min(20, 1000/Math.abs(effectiveF))} 30`
              } 
              fill="rgba(186, 230, 253, 0.4)" 
              stroke="#0ea5e9" 
              strokeWidth="2" 
            />
            {/* Center line of lens */}
            <line 
              x1={lensX} y1="30" 
              x2={lensX} y2="270" 
              stroke="#0ea5e9" 
              strokeWidth="1" 
              strokeDasharray="2 2" 
              opacity="0.6"
            />
          </svg>
        </div>

        {/* Controls - Focal Length Slider */}
        <div className="bg-[#fdfcf8] p-6 border-t border-slate-200">
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-end mb-4">
              <label htmlFor="focal-slider" className="block text-sm font-semibold text-slate-700 font-serif">
                Adjust Focal Length (f)
              </label>
              <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono border border-slate-200 shadow-sm">
                f = {focalLength}
              </span>
            </div>
            
            <div className="relative flex items-center">
              <span className="text-xs font-mono text-slate-400 mr-4 w-12 text-right">-150</span>
              <input
                id="focal-slider"
                type="range"
                min="-150"
                max="150"
                step="5"
                value={focalLength}
                onChange={(e) => setFocalLength(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
              />
              <span className="text-xs font-mono text-slate-400 ml-4 w-12">+150</span>
            </div>

            <div className="flex justify-between mt-2 px-16 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Concave</span>
              <span>Planar</span>
              <span>Convex</span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex justify-center gap-3 mt-6">
              <button 
                onClick={() => setFocalLength(-100)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
              >
                Strong Concave
              </button>
              <button 
                onClick={() => setFocalLength(60)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
              >
                Standard Convex
              </button>
              <button 
                onClick={() => setFocalLength(120)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
              >
                Weak Convex
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}