import React, { useState, useEffect, useMemo } from 'react';

export default function App() {
  const [lr, setLr] = useState<number>(0.15);
  const [dotT, setDotT] = useState<number>(0);

  // Math constants for the visualization
  const START_X = 8;
  const MAX_STEPS = 12;
  const X_MIN = -10;
  const X_MAX = 10;
  const Y_MIN = -10;
  const Y_MAX = 100;

  // Compute gradient descent steps
  const steps = useMemo(() => {
    const computedSteps = [];
    let currX = START_X;
    computedSteps.push(currX);

    for (let i = 0; i < MAX_STEPS; i++) {
      // f(x) = x^2, f'(x) = 2x
      // x_new = x - lr * f'(x)
      currX = currX - lr * (2 * currX);
      
      // Cap values to prevent SVG rendering issues on divergence
      if (currX > 25) currX = 25;
      if (currX < -25) currX = -25;
      
      computedSteps.push(currX);
    }
    return computedSteps;
  }, [lr]);

  // Animate a dot traveling along the computed steps
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      setDotT((prev) => {
        // Speed of animation
        const newT = prev + dt * 0.003;
        // Loop back to start when reaching the end of the steps
        return newT >= MAX_STEPS ? 0 : newT;
      });
      
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Coordinate mapping functions for SVG
  const mapX = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * 600;
  const mapY = (y: number) => 380 - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * 360;

  // Generate the background parabola path
  const parabolaPath = useMemo(() => {
    let d = '';
    for (let x = X_MIN; x <= X_MAX; x += 0.5) {
      const px = mapX(x);
      const py = mapY(x * x);
      d += `${x === X_MIN ? 'M' : 'L'} ${px} ${py} `;
    }
    return d;
  }, []);

  // Calculate current animated dot position
  const idx = Math.floor(dotT);
  const nextIdx = Math.min(idx + 1, MAX_STEPS);
  const frac = dotT - idx;
  const currentX = steps[idx] * (1 - frac) + steps[nextIdx] * frac;
  const currentY = currentX * currentX;

  // Determine status based on learning rate
  let statusText = '';
  let statusColor = '';
  
  if (lr < 0.05) {
    statusText = 'Crawling (Too Slow)';
    statusColor = 'text-blue-400';
  } else if (lr >= 0.05 && lr <= 0.45) {
    statusText = 'Converging (Optimal)';
    statusColor = 'text-teal-400';
  } else if (lr > 0.45 && lr <= 0.95) {
    statusText = 'Oscillating (High)';
    statusColor = 'text-yellow-400';
  } else if (lr > 0.95 && lr <= 1.0) {
    statusText = 'Bouncing (Critical)';
    statusColor = 'text-orange-400';
  } else {
    statusText = 'Diverging (Too High)';
    statusColor = 'text-red-500';
  }

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col items-center justify-center p-6 font-sans selection:bg-teal-500/30">
      
      {/* Header Section */}
      <div className="max-w-4xl w-full mb-8 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
          The Learning Rate
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          The learning rate (α) determines the size of the steps we take down the gradient. 
          Adjust the slider below to see how it affects convergence on a simple 2D bowl function.
        </p>
      </div>

      {/* Main Interactive Card */}
      <div className="max-w-4xl w-full bg-[#1e1e1e] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Controls & Stats */}
        <div className="w-full md:w-1/3 p-8 bg-[#1a1a1a] border-r border-gray-800 flex flex-col justify-center space-y-8">
          
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Learning Rate
              </label>
              <span className="text-2xl font-mono font-bold text-teal-400">
                {lr.toFixed(2)}
              </span>
            </div>
            
            <input
              type="range"
              min="0.01"
              max="1.08"
              step="0.01"
              value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-all"
            />
            <div className="flex justify-between text-xs text-gray-500 font-mono mt-1">
              <span>0.01</span>
              <span>0.50</span>
              <span>1.08</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</h3>
            <div className={`text-lg font-bold ${statusColor} transition-colors duration-300`}>
              {statusText}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {lr < 0.05 && "Steps are tiny. It will take many iterations to reach the minimum."}
              {lr >= 0.05 && lr <= 0.45 && "Smooth and steady descent towards the minimum."}
              {lr > 0.45 && lr <= 0.95 && "Overshooting the minimum, causing the path to zig-zag."}
              {lr > 0.95 && lr <= 1.0 && "Trapped in an endless bounce between two points."}
              {lr > 1.0 && "Steps are too large! The error is growing with each iteration."}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Math</h3>
            <div className="font-mono text-sm text-gray-300 bg-gray-900 p-3 rounded-lg border border-gray-800">
              <div className="text-teal-400/70 mb-1"># Update Rule</div>
              <div>x = x - α * ∇f(x)</div>
            </div>
          </div>

        </div>

        {/* Right Panel: Visualization */}
        <div className="w-full md:w-2/3 p-6 relative flex items-center justify-center bg-[#1e1e1e] min-h-[400px]">
          
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#14b8a6 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          <svg 
            viewBox="0 0 600 400" 
            className="w-full h-full max-h-[500px] drop-shadow-xl overflow-visible"
          >
            {/* Axes */}
            <line x1="0" y1={mapY(0)} x2="600" y2={mapY(0)} stroke="#333" strokeWidth="2" />
            <line x1={mapX(0)} y1="0" x2={mapX(0)} y2="400" stroke="#333" strokeWidth="2" />

            {/* Parabola */}
            <path 
              d={parabolaPath} 
              fill="none" 
              stroke="#4b5563" 
              strokeWidth="4" 
              strokeLinecap="round"
              className="opacity-50"
            />

            {/* Gradient Descent Path (Lines) */}
            {steps.map((stepX, i) => {
              if (i === steps.length - 1) return null;
              const nextX = steps[i + 1];
              // Don't draw lines that fly off to infinity
              if (Math.abs(stepX) > 15 || Math.abs(nextX) > 15) return null;

              return (
                <line
                  key={`line-${i}`}
                  x1={mapX(stepX)}
                  y1={mapY(stepX * stepX)}
                  x2={mapX(nextX)}
                  y2={mapY(nextX * nextX)}
                  stroke="#14b8a6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="opacity-60"
                />
              );
            })}

            {/* Gradient Descent Path (Points) */}
            {steps.map((stepX, i) => {
              if (Math.abs(stepX) > 15) return null;
              return (
                <circle
                  key={`point-${i}`}
                  cx={mapX(stepX)}
                  cy={mapY(stepX * stepX)}
                  r="4"
                  fill="#14b8a6"
                  className="opacity-50"
                />
              );
            })}

            {/* Animated Current Position Dot */}
            {Math.abs(currentX) <= 15 && (
              <g transform={`translate(${mapX(currentX)}, ${mapY(currentY)})`}>
                <circle 
                  r="12" 
                  fill="#14b8a6" 
                  className="opacity-20 animate-ping"
                />
                <circle 
                  r="8" 
                  fill="#2dd4bf" 
                  className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}