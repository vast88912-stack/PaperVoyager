import React, { useState, useMemo } from 'react';

export default function App() {
  const [lr, setLr] = useState<number>(0.15);

  // SVG Coordinate System Setup
  const width = 600;
  const height = 300;
  const padding = 20;
  
  const xMin = -5;
  const xMax = 5;
  const yMin = 0;
  const yMax = 25;

  // Scale functions to map math coordinates to SVG coordinates
  const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  // Generate the background parabola path (f(x) = x^2)
  const parabolaPath = useMemo(() => {
    const points = [];
    for (let x = xMin; x <= xMax; x += 0.1) {
      points.push(`${scaleX(x)},${scaleY(x * x)}`);
    }
    return `M ${points.join(' L ')}`;
  }, []);

  // Generate Gradient Descent Trajectory
  // f(x) = x^2  =>  f'(x) = 2x
  // Update: x_{n+1} = x_n - lr * 2 * x_n = x_n * (1 - 2 * lr)
  const trajectory = useMemo(() => {
    const steps = [];
    let currentX = -4.5; // Starting position
    
    for (let i = 0; i < 15; i++) {
      steps.push({ x: currentX, y: currentX * currentX });
      currentX = currentX * (1 - 2 * lr);
      
      // Stop calculating if it diverges wildly out of bounds
      if (Math.abs(currentX) > 20) {
        steps.push({ x: currentX, y: currentX * currentX });
        break;
      }
    }
    return steps;
  }, [lr]);

  // Determine the status of the current learning rate
  const getStatus = () => {
    if (lr <= 0.05) return { label: 'Crawling (Too Slow)', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    if (lr > 0.05 && lr < 0.6) return { label: 'Converging (Optimal)', color: 'text-teal-400', bg: 'bg-teal-400/10' };
    if (lr >= 0.6 && lr <= 0.99) return { label: 'Overshooting (Oscillating)', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    if (lr === 1.0) return { label: 'Trapped (Perfect Oscillation)', color: 'text-orange-400', bg: 'bg-orange-400/10' };
    return { label: 'Diverging (Exploding)', color: 'text-red-400', bg: 'bg-red-400/10' };
  };

  const status = getStatus();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans text-slate-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Learning Rate <span className="text-teal-400 italic font-serif">(α)</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-md">
              The learning rate controls how big of a step we take down the gradient. 
              Too small, and it takes forever. Too large, and we overshoot or explode!
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-full border border-slate-700/50 ${status.bg} ${status.color} font-medium text-sm whitespace-nowrap shadow-inner`}>
            Status: {status.label}
          </div>
        </div>

        {/* Visualization Section */}
        <div className="relative bg-slate-950/50 p-6 flex justify-center items-center overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.2 }}></div>
          
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${width} ${height}`} 
            className="overflow-visible drop-shadow-xl z-10"
          >
            {/* Axes */}
            <line x1={scaleX(xMin)} y1={scaleY(0)} x2={scaleX(xMax)} y2={scaleY(0)} stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <line x1={scaleX(0)} y1={scaleY(yMin)} x2={scaleX(0)} y2={scaleY(yMax)} stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

            {/* Parabola */}
            <path 
              d={parabolaPath} 
              fill="none" 
              stroke="#475569" 
              strokeWidth="3" 
              strokeLinecap="round"
            />

            {/* Trajectory Lines */}
            {trajectory.map((step, i) => {
              if (i === trajectory.length - 1) return null;
              const nextStep = trajectory[i + 1];
              return (
                <line
                  key={`line-${i}`}
                  x1={scaleX(step.x)}
                  y1={scaleY(step.y)}
                  x2={scaleX(nextStep.x)}
                  y2={scaleY(nextStep.y)}
                  stroke={lr > 1.0 ? '#f87171' : '#2dd4bf'}
                  strokeWidth="2"
                  strokeOpacity={Math.max(0.2, 1 - i * 0.08)}
                  strokeDasharray="4 2"
                />
              );
            })}

            {/* Trajectory Points */}
            {trajectory.map((step, i) => {
              const isFirst = i === 0;
              const isLast = i === trajectory.length - 1;
              const pointColor = lr > 1.0 ? '#f87171' : '#2dd4bf';
              
              // Don't render points that flew off the screen
              if (step.x < xMin * 2 || step.x > xMax * 2) return null;

              return (
                <g key={`point-${i}`}>
                  <circle
                    cx={scaleX(step.x)}
                    cy={scaleY(step.y)}
                    r={isFirst ? 6 : isLast ? 5 : 4}
                    fill={isFirst ? '#facc15' : '#0f172a'}
                    stroke={isFirst ? '#facc15' : pointColor}
                    strokeWidth={isFirst ? 0 : 2}
                    className="transition-all duration-300 ease-out"
                    style={{ filter: `drop-shadow(0 0 6px ${pointColor}80)` }}
                  />
                  {isFirst && (
                    <text x={scaleX(step.x) - 10} y={scaleY(step.y) - 15} fill="#facc15" fontSize="12" fontWeight="bold">
                      Start
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Controls Section */}
        <div className="p-8 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <label htmlFor="lr-slider" className="text-lg font-semibold text-slate-300">
              Adjust Learning Rate
            </label>
            <div className="text-2xl font-mono text-teal-400 bg-slate-950 px-4 py-1 rounded-lg border border-slate-800 shadow-inner">
              α = {lr.toFixed(3)}
            </div>
          </div>

          <div className="relative flex items-center w-full h-12 mb-8">
            <input
              id="lr-slider"
              type="range"
              min="0.01"
              max="1.08"
              step="0.01"
              value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-teal-400 hover:accent-teal-300 focus:outline-none focus:ring-4 focus:ring-teal-500/30 transition-all z-10"
            />
            
            {/* Custom Track Markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              <div className="w-1 h-3 bg-slate-600 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-600 rounded-full"></div>
              <div className="w-1 h-3 bg-slate-600 rounded-full"></div>
              <div className="w-1 h-4 bg-red-500/50 rounded-full" style={{ left: '92.5%', position: 'absolute' }}></div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Too Small', value: 0.02 },
              { label: 'Just Right', value: 0.35 },
              { label: 'Oscillating', value: 0.85 },
              { label: 'Diverging', value: 1.05 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setLr(preset.value)}
                className={`py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 border 
                  ${lr === preset.value 
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]' 
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}