import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Constants & Math Setup ---
const SVG_WIDTH = 800;
const SVG_HEIGHT = 450;
const X_MIN = -5;
const X_MAX = 5;
const Y_MIN = 0;
const Y_MAX = 25;
const MAX_STEPS = 20;
const START_X = -4.8;

// Maps math coordinates to SVG coordinates
const mapX = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * SVG_WIDTH;
const mapY = (y: number) => SVG_HEIGHT - 30 - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (SVG_HEIGHT - 60);

// The objective function and its derivative
const f = (x: number) => x * x;
const df = (x: number) => 2 * x;

export default function App() {
  const [lr, setLr] = useState<number>(0.15);
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  // Generate the background curve (Parabola)
  const bgCurvePath = useMemo(() => {
    let path = '';
    const resolution = 100;
    for (let i = 0; i <= resolution; i++) {
      const x = X_MIN + (i / resolution) * (X_MAX - X_MIN);
      const y = f(x);
      const px = mapX(x);
      const py = mapY(y);
      path += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }
    return path;
  }, []);

  // Generate Gradient Descent points based on current Learning Rate
  const gdPoints = useMemo(() => {
    const pts = [];
    let currentX = START_X;
    
    pts.push({ x: currentX, y: f(currentX) });
    
    for (let i = 0; i < MAX_STEPS; i++) {
      // Gradient Descent Step: x_{t+1} = x_t - lr * df(x_t)
      currentX = currentX - lr * df(currentX);
      pts.push({ x: currentX, y: f(currentX) });
    }
    
    return pts;
  }, [lr]);

  // Animation Loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) return;

    const DURATION_PER_STEP = 200; // ms

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const currentProgress = elapsed / DURATION_PER_STEP;

      if (currentProgress < MAX_STEPS) {
        setAnimProgress(currentProgress);
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setAnimProgress(MAX_STEPS);
        setIsPlaying(false);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, lr]);

  // Restart animation whenever LR changes
  useEffect(() => {
    setAnimProgress(0);
    startTimeRef.current = 0;
    setIsPlaying(true);
  }, [lr]);

  // Handle manual replay
  const handleReplay = () => {
    setAnimProgress(0);
    startTimeRef.current = 0;
    setIsPlaying(true);
  };

  // Build the animated path and current point coordinates
  const currentStepIdx = Math.floor(animProgress);
  const fraction = animProgress - currentStepIdx;

  let animatedPath = '';
  let activeX = mapX(START_X);
  let activeY = mapY(f(START_X));

  if (gdPoints.length > 0) {
    // Draw completed segments
    for (let i = 0; i <= currentStepIdx && i < gdPoints.length; i++) {
      const px = mapX(gdPoints[i].x);
      const py = mapY(gdPoints[i].y);
      animatedPath += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }

    // Interpolate the active segment for smooth animation
    if (currentStepIdx < gdPoints.length - 1) {
      const p1 = gdPoints[currentStepIdx];
      const p2 = gdPoints[currentStepIdx + 1];
      
      const interpX = p1.x + (p2.x - p1.x) * fraction;
      // We interpolate the Y strictly on the curve to make it "slide" down the bowl
      const interpY = f(interpX); 

      activeX = mapX(interpX);
      activeY = mapY(interpY);
      
      animatedPath += ` L ${activeX} ${activeY}`;
    } else {
      const lastPt = gdPoints[gdPoints.length - 1];
      activeX = mapX(lastPt.x);
      activeY = mapY(lastPt.y);
    }
  }

  // Determine behavior analysis based on LR
  let analysisLabel = "";
  let analysisColor = "";
  
  if (lr <= 0.05) {
    analysisLabel = "Sluggish / Extremely Slow";
    analysisColor = "text-slate-400 border-slate-400 bg-slate-400/10";
  } else if (lr > 0.05 && lr <= 0.3) {
    analysisLabel = "Smooth Convergence";
    analysisColor = "text-teal-200 border-teal-200 bg-teal-200/10";
  } else if (lr > 0.3 && lr < 0.49) {
    analysisLabel = "Fast Convergence";
    analysisColor = "text-teal-400 border-teal-400 bg-teal-400/10";
  } else if (lr >= 0.49 && lr <= 0.51) {
    analysisLabel = "Optimal (Dead-beat in 1 step)";
    analysisColor = "text-emerald-400 border-emerald-400 bg-emerald-400/10";
  } else if (lr > 0.51 && lr < 1.0) {
    analysisLabel = "Oscillating Convergence";
    analysisColor = "text-yellow-400 border-yellow-400 bg-yellow-400/10";
  } else {
    analysisLabel = "Diverging! (Overshooting bounds)";
    analysisColor = "text-rose-500 border-rose-500 bg-rose-500/10";
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 md:p-8 flex flex-col items-center justify-center">
      
      {/* Header */}
      <div className="w-full max-w-5xl mb-6 flex flex-col items-center text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Learning Rate <span className="text-teal-400">Explorer</span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Adjust the learning rate (η) to see how it affects Gradient Descent on a simple 1D bowl <code className="text-teal-300 bg-slate-800 px-1 py-0.5 rounded">f(x) = x²</code>.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-5xl bg-slate-800 rounded-3xl shadow-2xl shadow-teal-900/20 border border-slate-700 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Side: Visualization */}
        <div className="flex-1 bg-slate-900/50 relative border-b lg:border-b-0 lg:border-r border-slate-700 p-4 flex items-center justify-center min-h-[400px]">
          <svg 
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
            className="w-full h-auto drop-shadow-lg"
            style={{ overflow: 'hidden' }}
          >
            {/* Grid Lines */}
            <g stroke="#334155" strokeWidth="1" opacity="0.4">
              {[...Array(11)].map((_, i) => (
                <line key={`v-${i}`} x1={mapX(-5 + i)} y1={0} x2={mapX(-5 + i)} y2={SVG_HEIGHT} />
              ))}
              {[...Array(6)].map((_, i) => (
                <line key={`h-${i}`} x1={0} y1={mapY(i * 5)} x2={SVG_WIDTH} y2={mapY(i * 5)} />
              ))}
            </g>

            {/* Axes */}
            <line x1={mapX(X_MIN)} y1={mapY(0)} x2={mapX(X_MAX)} y2={mapY(0)} stroke="#475569" strokeWidth="2" />
            <line x1={mapX(0)} y1={mapY(Y_MIN)} x2={mapX(0)} y2={mapY(Y_MAX)} stroke="#475569" strokeWidth="2" />

            {/* Parabola Background Curve */}
            <path 
              d={bgCurvePath} 
              stroke="#64748b" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round" 
              opacity="0.5"
            />

            {/* Gradient Descent Animated Path */}
            <path 
              d={animatedPath} 
              stroke="#2dd4bf" 
              strokeWidth="3" 
              fill="none" 
              strokeLinecap="round" 
              strokeDasharray="6 4"
              className="drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
            />

            {/* Completed Steps Dots */}
            {gdPoints.slice(0, currentStepIdx + 1).map((pt, i) => {
              // Hide the active step dot because we draw a bigger one for the active ball
              if (i === currentStepIdx && currentStepIdx < MAX_STEPS && isPlaying) return null;
              return (
                <circle 
                  key={i} 
                  cx={mapX(pt.x)} 
                  cy={mapY(pt.y)} 
                  r="5" 
                  fill="#14b8a6"
                  className="drop-shadow-[0_0_4px_rgba(20,184,166,0.8)]"
                />
              );
            })}

            {/* Active Rolling Ball */}
            <circle 
              cx={activeX} 
              cy={activeY} 
              r="8" 
              fill="#fff"
              stroke="#2dd4bf"
              strokeWidth="4"
              className="drop-shadow-[0_0_12px_rgba(45,212,191,0.9)] transition-all"
            />

            {/* Start Label */}
            <text x={mapX(START_X) - 20} y={mapY(f(START_X)) - 20} fill="#94a3b8" fontSize="14" fontWeight="bold">Start</text>
          </svg>

          {/* Floating Replay Button */}
          <button 
            onClick={handleReplay}
            className="absolute bottom-6 right-6 bg-slate-800 hover:bg-slate-700 text-teal-400 p-3 rounded-full shadow-lg border border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            title="Replay Animation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full lg:w-[400px] p-8 flex flex-col justify-center bg-slate-800 space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Hyperparameter Control</h2>
            <p className="text-sm text-slate-400 mb-6">Fine-tune the step size of the optimizer.</p>
            
            {/* Slider Container */}
            <div className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
              <div className="flex justify-between items-end">
                <label htmlFor="lr-slider" className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Learning Rate (η)
                </label>
                <span className="text-2xl font-mono font-bold text-teal-400 bg-teal-400/10 px-3 py-1 rounded-lg border border-teal-500/20">
                  {lr.toFixed(3)}
                </span>
              </div>
              
              <input 
                id="lr-slider"
                type="range" 
                min="0.01" 
                max="1.1" 
                step="0.01" 
                value={lr}
                onChange={(e) => setLr(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
              />
              
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>0.01</span>
                <span>0.5</span>
                <span>1.10</span>
              </div>
            </div>
          </div>

          {/* Behavior Analysis Badge */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Descent Behavior</h3>
            <div className={`px-4 py-3 rounded-xl border font-medium flex items-center space-x-3 transition-colors duration-300 ${analysisColor}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>{analysisLabel}</span>
            </div>
          </div>

          {/* Math Info */}
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Mathematical Update</h3>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 font-mono text-sm text-slate-300 flex flex-col space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Function:</span>
                <span className="text-teal-300">f(x) = x²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gradient:</span>
                <span className="text-teal-300">∇f(x) = 2x</span>
              </div>
              <div className="w-full h-px bg-slate-700 my-1" />
              <div className="flex justify-between font-bold text-white">
                <span>x<sub className="text-xs">t+1</sub> =</span>
                <span>x<sub className="text-xs">t</sub> - <span className="text-teal-400">{lr.toFixed(2)}</span> · ∇f(x<sub className="text-xs">t</sub>)</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}