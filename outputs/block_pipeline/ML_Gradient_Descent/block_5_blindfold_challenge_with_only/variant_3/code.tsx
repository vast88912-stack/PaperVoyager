import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Landscape Definitions ---
// Elliptical bowl: f(x,y) = 0.5 * x^2 + 2 * y^2
// Minimum at (0,0) with value 0.
const evaluateLoss = (x: number, y: number) => 0.5 * x * x + 2 * y * y;
const evaluateGradient = (x: number, y: number) => ({ dx: x, dy: 4 * y });

const START_POS = { x: 7, y: 6 };
const MAX_STEPS = 25;
const WIN_THRESHOLD = 0.5;
const MAP_DOMAIN = 12; // x,y range from -12 to 12

export default function App() {
  const [pos, setPos] = useState(START_POS);
  const [path, setPath] = useState([{ ...START_POS, loss: evaluateLoss(START_POS.x, START_POS.y) }]);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [hoverStep, setHoverStep] = useState<{ dx: number, dy: number } | null>(null);

  const currentLoss = evaluateLoss(pos.x, pos.y);
  const currentGrad = evaluateGradient(pos.x, pos.y);
  const stepCount = path.length - 1;

  // Coordinate mapping for the main blind map
  const mapSize = 500;
  const mapCenter = mapSize / 2;
  const mapScale = mapSize / (MAP_DOMAIN * 2);
  const toSVG = (x: number, y: number) => ({
    cx: mapCenter + x * mapScale,
    cy: mapCenter - y * mapScale
  });

  const handleReset = () => {
    setPos(START_POS);
    setPath([{ ...START_POS, loss: evaluateLoss(START_POS.x, START_POS.y) }]);
    setStatus('playing');
    setHoverStep(null);
  };

  const takeStep = (dx: number, dy: number) => {
    if (status !== 'playing') return;

    const nextX = pos.x + dx;
    const nextY = pos.y + dy;
    const nextLoss = evaluateLoss(nextX, nextY);
    
    setPos({ x: nextX, y: nextY });
    setPath(prev => [...prev, { x: nextX, y: nextY, loss: nextLoss }]);

    if (nextLoss <= WIN_THRESHOLD) {
      setStatus('won');
    } else if (stepCount + 1 >= MAX_STEPS) {
      setStatus('lost');
    }
  };

  // --- Control Pad Logic ---
  const padSize = 240;
  const padCenter = padSize / 2;
  const maxStepSize = 4; // Max distance in coordinate units per step
  const padScale = padCenter / maxStepSize;

  const handlePadPointer = (e: React.PointerEvent<SVGSVGElement>, isClick: boolean = false) => {
    if (status !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    // Convert pad pixels to coordinate deltas
    let dx = (px - padCenter) / padScale;
    let dy = -(py - padCenter) / padScale;

    // Cap at max radius
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > maxStepSize) {
      dx = (dx / dist) * maxStepSize;
      dy = (dy / dist) * maxStepSize;
    }

    if (isClick) {
      takeStep(dx, dy);
      setHoverStep(null);
    } else {
      setHoverStep({ dx, dy });
    }
  };

  // --- Gradient Sensor Drawing ---
  // Normalize gradient for visual compass
  const gradMag = Math.sqrt(currentGrad.dx**2 + currentGrad.dy**2);
  const sensorNormDx = gradMag === 0 ? 0 : currentGrad.dx / gradMag;
  const sensorNormDy = gradMag === 0 ? 0 : currentGrad.dy / gradMag;
  const sensorLineLength = 40;

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-teal-500/30">
      
      {/* Left Panel: The Blindfold Arena */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-zinc-950 border-r border-teal-900/40 shadow-[inset_-20px_0_40px_-20px_rgba(20,184,166,0.1)]">
        <div className="absolute top-8 left-8">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-600 tracking-tight">
            Blindfold Descent
          </h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-sm leading-relaxed">
            The landscape is hidden. Find the minimum using only the gradient sensor. 
            Remember: the gradient points <strong className="text-rose-400">uphill</strong>.
          </p>
        </div>

        {/* The Map */}
        <div className="relative border border-zinc-800 rounded-xl bg-zinc-900/50 shadow-2xl overflow-hidden mt-12">
          {/* Subtle grid lines */}
          <svg width={mapSize} height={mapSize} className="absolute inset-0 opacity-20 pointer-events-none">
            <defs>
              <pattern id="grid" width={mapScale} height={mapScale} patternUnits="userSpaceOnUse">
                <path d={`M ${mapScale} 0 L 0 0 0 ${mapScale}`} fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-teal-900" />
            {/* Axes */}
            <line x1={mapCenter} y1={0} x2={mapCenter} y2={mapSize} stroke="currentColor" strokeWidth="1" className="text-teal-900/50"/>
            <line x1={0} y1={mapCenter} x2={mapSize} y2={mapCenter} stroke="currentColor" strokeWidth="1" className="text-teal-900/50"/>
          </svg>

          {/* Path Drawing */}
          <svg width={mapSize} height={mapSize} className="relative z-10 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]">
            {/* Draw lines */}
            {path.map((p, i) => {
              if (i === 0) return null;
              const prev = toSVG(path[i-1].x, path[i-1].y);
              const curr = toSVG(p.x, p.y);
              return (
                <line 
                  key={`line-${i}`} 
                  x1={prev.cx} y1={prev.cy} x2={curr.cx} y2={curr.cy} 
                  stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" 
                  className="opacity-80"
                />
              );
            })}

            {/* Draw nodes */}
            {path.map((p, i) => {
              const { cx, cy } = toSVG(p.x, p.y);
              const isLast = i === path.length - 1;
              return (
                <circle 
                  key={`node-${i}`} 
                  cx={cx} cy={cy} 
                  r={isLast ? 5 : 3} 
                  fill={isLast ? "#fff" : "#14b8a6"} 
                  className={isLast ? "animate-pulse" : ""}
                />
              );
            })}

            {/* Hover projection */}
            {hoverStep && status === 'playing' && (
              <line 
                x1={toSVG(pos.x, pos.y).cx} y1={toSVG(pos.x, pos.y).cy}
                x2={toSVG(pos.x + hoverStep.dx, pos.y + hoverStep.dy).cx} 
                y2={toSVG(pos.x + hoverStep.dx, pos.y + hoverStep.dy).cy}
                stroke="#2dd4bf" strokeWidth="2" strokeDasharray="4 4" className="opacity-50"
              />
            )}

            {/* Revealed Target (Win/Loss State) */}
            {status !== 'playing' && (
              <g transform={`translate(${toSVG(0, 0).cx}, ${toSVG(0, 0).cy})`}>
                <circle cx="0" cy="0" r="15" fill="none" stroke="#fbbf24" strokeWidth="2" className="animate-ping opacity-75"/>
                <circle cx="0" cy="0" r="6" fill="#fbbf24"/>
                <path d="M -10 -10 L 10 10 M -10 10 L 10 -10" stroke="#fbbf24" strokeWidth="2"/>
              </g>
            )}
          </svg>

          {/* Overlays */}
          {status === 'won' && (
            <div className="absolute inset-0 bg-teal-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-4xl font-black text-teal-400 mb-2 drop-shadow-md">Minimum Found!</h2>
              <p className="text-teal-100 mb-6 font-medium">You navigated the dark in {stepCount} steps.</p>
              <button onClick={handleReset} className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-full transition-all active:scale-95 shadow-[0_0_15px_rgba(45,212,191,0.5)]">
                Try Again
              </button>
            </div>
          )}
          {status === 'lost' && (
            <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-4xl font-black text-rose-400 mb-2 drop-shadow-md">Lost in the dark</h2>
              <p className="text-rose-100 mb-6 font-medium">Max steps reached. The minimum was at (0,0).</p>
              <button onClick={handleReset} className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-rose-950 font-bold rounded-full transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                Retry Challenge
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Instruments & Controls */}
      <div className="w-[400px] bg-zinc-900 p-8 flex flex-col relative z-10 shadow-2xl">
        
        {/* Telemetry Dashboard */}
        <div className="mb-10">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4">Telemetry</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <div className="text-zinc-500 text-xs font-mono mb-1">CURRENT LOSS</div>
              <div className="text-2xl font-mono text-teal-300 drop-shadow-[0_0_5px_rgba(45,212,191,0.3)]">
                {currentLoss.toFixed(3)}
              </div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <div className="text-zinc-500 text-xs font-mono mb-1">STEPS</div>
              <div className="text-2xl font-mono text-zinc-300">
                {stepCount} <span className="text-sm text-zinc-600">/ {MAX_STEPS}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient Sensor */}
        <div className="mb-10 flex flex-col items-center">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4 w-full text-left">Gradient Sensor</h3>
          <div className="relative w-32 h-32 bg-zinc-950 rounded-full border-2 border-zinc-800 flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 rounded-full border border-teal-500/10 m-4"></div>
            <div className="absolute inset-0 rounded-full border border-teal-500/5 m-8"></div>
            
            {/* Compass rose markings */}
            <div className="absolute top-2 text-[10px] text-zinc-600 font-mono">+Y</div>
            <div className="absolute bottom-2 text-[10px] text-zinc-600 font-mono">-Y</div>
            <div className="absolute right-2 text-[10px] text-zinc-600 font-mono">+X</div>
            <div className="absolute left-2 text-[10px] text-zinc-600 font-mono">-X</div>

            {/* Gradient Vector Arrow */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#f43f5e" />
                </marker>
              </defs>
              <line 
                x1={64} y1={64} 
                x2={64 + sensorNormDx * sensorLineLength} 
                y2={64 - sensorNormDy * sensorLineLength} 
                stroke="#f43f5e" strokeWidth="3" 
                markerEnd="url(#arrowhead)"
                className="transition-all duration-300 ease-out"
              />
              <