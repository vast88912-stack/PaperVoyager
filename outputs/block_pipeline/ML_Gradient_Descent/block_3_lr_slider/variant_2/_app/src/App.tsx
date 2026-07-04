import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- Icons (Inlined to remain dependency-free) ---
const ZapIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const AlertTriangleIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
  </svg>
);

const CheckCircleIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const SnailIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 13a6 6 0 1 0 12 0 4 4 0 1 0-8 0 2 2 0 0 0 4 0"></path>
    <circle cx="10" cy="13" r="8"></circle>
    <path d="M2 21h12c4.4 0 8-3.6 8-8V7a2 2 0 1 0-4 0v6"></path>
    <path d="M18 3 19.1 5.2"></path>
    <path d="M22 3 20.9 5.2"></path>
  </svg>
);

// --- Math & Visualization Helpers ---
const START_X = -1.2;
const MIN_LR = 0.01;
const MAX_LR = 1.15; // Allow slight divergence for educational purposes

const mapX = (x: number) => 200 + x * 100;
const mapY = (y: number) => 260 - y * 100;

const getStatus = (lr: number) => {
  if (lr < 0.15) return { text: "Too Slow", color: "text-blue-400", icon: SnailIcon };
  if (lr >= 0.15 && lr < 0.7) return { text: "Optimal", color: "text-teal-400", icon: CheckCircleIcon };
  if (lr >= 0.7 && lr <= 1.0) return { text: "Overshooting", color: "text-yellow-400", icon: AlertTriangleIcon };
  return { text: "Diverging", color: "text-red-400", icon: ZapIcon };
};

export default function LrSliderModule() {
  const [lr, setLr] = useState<number>(0.15);
  const trackRef = useRef<HTMLDivElement>(null);

  // Custom slider logic
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    
    // Non-linear mapping to give more precision to smaller values
    // Using a simple square curve for the slider mapping
    const mappedLr = MIN_LR + Math.pow(percentage, 1.5) * (MAX_LR - MIN_LR);
    setLr(Number(mappedLr.toFixed(3)));
  }, []);

  const handlePointerUp = useCallback(() => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent text selection during drag
    e.preventDefault();
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const mappedLr = MIN_LR + Math.pow(percentage, 1.5) * (MAX_LR - MIN_LR);
    setLr(Number(mappedLr.toFixed(3)));

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Calculate descent steps
  const steps = [];
  let currentX = START_X;
  for (let i = 0; i < 5; i++) {
    steps.push({ x: currentX, y: currentX * currentX });
    const gradient = 2 * currentX;
    currentX = currentX - lr * gradient;
  }

  // Generate background parabola path
  const parabolaPoints = [];
  for (let x = -2; x <= 2; x += 0.1) {
    parabolaPoints.push(`${mapX(x)},${mapY(x * x)}`);
  }
  const parabolaPath = `M ${parabolaPoints.join(' L ')}`;

  // Slider visual percentage (inverse of the power function used for value)
  const sliderPercentage = Math.pow((lr - MIN_LR) / (MAX_LR - MIN_LR), 1 / 1.5) * 100;
  
  const StatusIcon = getStatus(lr).icon;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-gray-800 rounded-3xl shadow-2xl shadow-teal-900/20 border border-gray-700 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-8 pb-6 border-b border-gray-700/50 bg-gradient-to-b from-gray-800 to-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                <ZapIcon />
              </span>
              Learning Rate
            </h2>
            <div className={`px-4 py-1.5 rounded-full bg-gray-900 border border-gray-700 font-mono text-lg ${getStatus(lr).color} flex items-center gap-2 shadow-inner`}>
              <StatusIcon className="w-4 h-4" />
              α = {lr.toFixed(3)}
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Adjust the step size of gradient descent. Too small takes forever, too large overshoots the minimum.
          </p>
        </div>

        {/* Visualization Canvas */}
        <div className="relative w-full h-72 bg-gray-900 flex items-center justify-center overflow-hidden border-b border-gray-700/50">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#14b8a6" />
              </marker>
              <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#f87171" />
              </marker>
              
              <linearGradient id="bg-grid" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="0%" stopColor="#1f2937" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#111827" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            <rect width="400" height="300" fill="url(#bg-grid)" />

            {/* Grid Lines */}
            <line x1="200" y1="0" x2="200" y2="300" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="260" x2="400" y2="260" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />

            {/* Parabola */}
            <path d={parabolaPath} fill="none" stroke="#4b5563" strokeWidth="3" strokeLinecap="round" />

            {/* Steps Rendering */}
            {steps.map((step, i) => {
              if (i === steps.length - 1) return null;
              const nextStep = steps[i + 1];
              
              const isDiverging = Math.abs(nextStep.x) > Math.abs(step.x) + 0.01;
              const strokeColor = isDiverging ? "#f87171" : "#14b8a6";
              const markerId = isDiverging ? "url(#arrowhead-red)" : "url(#arrowhead)";

              // Don't draw if it flew off to infinity to avoid SVG rendering issues
              if (Math.abs(step.x) > 10 || Math.abs(nextStep.x) > 10) return null;

              return (
                <g key={i}>
                  <line
                    x1={mapX(step.x)}
                    y1={mapY(step.y)}
                    x2={mapX(nextStep.x)}
                    y2={mapY(nextStep.y)}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    markerEnd={markerId}
                    strokeDasharray={isDiverging ? "4 2" : "none"}
                    className="transition-all duration-300 ease-out"
                  />
                  <circle
                    cx={mapX(step.x)}
                    cy={mapY(step.y)}
                    r="5"
                    fill={strokeColor}
                    stroke="#1f2937"
                    strokeWidth="2"
                    className="transition-all duration-300 ease-out"
                  />
                </g>
              );
            })}
            
            {/* Final Point */}
            {Math.abs(steps[steps.length - 1].x) <= 10 && (
              <circle
                cx={mapX(steps[steps.length - 1].x)}
                cy={mapY(steps[steps.length - 1].y)}
                r="6"
                fill={Math.abs(steps[steps.length - 1].x) > Math.abs(steps[steps.length - 2].x) ? "#f87171" : "#14b8a6"}
                stroke="#1f2937"
                strokeWidth="2"
                className="transition-all duration-300 ease-out"
              />
            )}
          </svg>
          
          {/* Status Overlay */}
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-md bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-sm font-medium flex items-center gap-2">
            <span className="text-gray-400">Status:</span>
            <span className={getStatus(lr).color}>{getStatus(lr).text}</span>
          </div>
        </div>

        {/* Interactive Slider Section */}
        <div className="p-8 bg-gray-800">
          <div className="relative h-12 flex items-center" 
               onPointerDown={handlePointerDown}
               ref={trackRef}
               style={{ touchAction: 'none' }}>
            
            {/* Track Background */}
            <div className="absolute left-0 right-0 h-3 bg-gray-900 rounded-full overflow-hidden shadow-inner border border-gray-700">
              {/* Colored Fill */}
              <div 
                className={`h-full rounded-full transition-colors duration-200 ${
                  lr >= 1.0 ? 'bg-red-500' : lr >= 0.7 ? 'bg-yellow-500' : 'bg-teal-500'
                }`}
                style={{ width: `${sliderPercentage}%` }}
              />
            </div>

            {/* Tick Marks */}
            <div className="absolute left-0 right-0 h-3 pointer-events-none flex justify-between px-1">
              {[0, 25, 50, 75, 100].map(tick => (
                <div key={tick} className="w-0.5 h-full bg-gray-800/50 z-10" />
              ))}
            </div>

            {/* Thumb */}
            <div 
              className={`absolute w-8 h-8 rounded-full border-4 shadow-lg shadow-black/50 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform ${
                lr >= 1.0 ? 'border-red-500 bg-gray-900' : 
                lr >= 0.7 ? 'border-yellow-500 bg-gray-900' : 
                'border-teal-500 bg-gray-900'
              }`}
              style={{ 
                left: `${sliderPercentage}%`, 
                transform: `translateX(-50%)`,
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                lr >= 1.0 ? 'bg-red-500' : lr >= 0.7 ? 'bg-yellow-500' : 'bg-teal-500'
              }`} />
            </div>
          </div>

          <div className="flex justify-between text-xs font-mono text-gray-500 mt-4 px-1">
            <span>0.01</span>
            <span>0.5</span>
            <span>1.0</span>
            <span className="text-red-500/70">1.15</span>
          </div>
        </div>
      </div>
    </div>
  );
}