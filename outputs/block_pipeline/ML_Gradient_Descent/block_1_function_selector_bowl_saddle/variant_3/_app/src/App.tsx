import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Math & Function Definitions ---

type Point2D = [number, number];

interface SurfaceFunction {
  id: string;
  name: string;
  formula: string;
  desc: string;
  domain: [number, number];
  compute: (x: number, y: number) => number;
  gradient: (x: number, y: number) => Point2D;
}

const FUNCTIONS: Record<string, SurfaceFunction> = {
  bowl: {
    id: 'bowl',
    name: 'Convex Bowl',
    formula: 'f(x, y) = x² + y²',
    desc: 'A perfectly convex optimization landscape. Gradient Descent converges easily.',
    domain: [-3, 3],
    compute: (x, y) => x * x + y * y,
    gradient: (x, y) => [2 * x, 2 * y],
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle Point',
    formula: 'f(x, y) = x² - y²',
    desc: 'A minimax point at the origin. Standard momentum can overshoot or get deflected.',
    domain: [-3, 3],
    compute: (x, y) => x * x - y * y,
    gradient: (x, y) => [2 * x, -2 * y],
  },
  rastrigin: {
    id: 'rastrigin',
    name: 'Rastrigin',
    formula: 'f(x, y) = A·n + Σ(xᵢ² - A·cos(2πxᵢ))',
    desc: 'Highly non-convex minefield. Tests an optimizer\'s ability to escape local minima.',
    domain: [-5.12, 5.12],
    compute: (x, y) => {
      const A = 10;
      return 2 * A + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y));
    },
    gradient: (x, y) => {
      const A = 10;
      return [
        2 * x + 2 * Math.PI * A * Math.sin(2 * Math.PI * x),
        2 * y + 2 * Math.PI * A * Math.sin(2 * Math.PI * y),
      ];
    },
  },
};

// --- Helper to interpolate colors (Charcoal to Bright Teal) ---
const getHeatmapColor = (
  val: number,
  min: number,
  max: number,
  isContour: boolean
): [number, number, number, number] => {
  // Normalize value to 0-1
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));

  // Contour line styling (topographical map effect)
  // Create distinct bands
  const bands = 15;
  const bandT = Math.floor(t * bands) / bands;
  
  // Base colors
  // Charcoal: rgb(24, 24, 27)
  // Bright Teal: rgb(45, 212, 191)
  const r = 24 + bandT * (45 - 24);
  const g = 24 + bandT * (212 - 24);
  const b = 27 + bandT * (191 - 27);

  if (isContour) {
    // Highlight contour boundaries
    const contourThickness = 0.05;
    const isBoundary = (t * bands) % 1 < contourThickness;
    if (isBoundary) {
      return [45, 212, 191, 255]; // Pure bright teal for lines
    }
  }

  return [r, g, b, 255];
};

export default function GradientPlaygroundFunctionSelector() {
  const [activeFuncId, setActiveFuncId] = useState<string>('bowl');
  const [resolution, setResolution] = useState<number>(150); // Heatmap resolution
  
  const activeFunc = FUNCTIONS[activeFuncId];

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      
      {/* Sidebar - Function Selector & Hyperparams */}
      <div className="w-96 bg-zinc-900 border-r border-zinc-800 flex flex-col shadow-2xl z-10">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-2xl font-black text-teal-400 tracking-tight uppercase">
            Optimization
            <br />
            <span className="text-zinc-100">Surfaces</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            Select a 2D function to visualize its loss landscape. Hover over the surface to analyze analytical gradients.
          </p>
        </div>

        {/* Function Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Landscape Topologies</h2>
          
          {Object.values(FUNCTIONS).map((func) => {
            const isActive = activeFuncId === func.id;
            return (
              <button
                key={func.id}
                onClick={() => setActiveFuncId(func.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group
                  ${isActive 
                    ? 'bg-zinc-800/50 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.15)]' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30'
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold text-lg ${isActive ? 'text-teal-400' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                    {func.name}
                  </h3>
                  {isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-zinc-500 mb-3 bg-zinc-950 p-2 rounded border border-zinc-800/50">
                  {func.formula}
                </div>
                <p className={`text-sm leading-relaxed ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {func.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Mock Hyperparameters to fit design spec */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Display Settings</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-zinc-400">Contour Resolution</label>
                <span className="text-teal-400 font-mono">{resolution}px</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={resolution}
                onChange={(e) => setResolution(parseInt(e.target.value))}
                className="w-full accent-teal-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-3 h-3 rounded-full bg-teal-400"></div>
              <span className="text-xs text-zinc-400">Hover canvas to view −∇f</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-8">
        <SurfaceViewer activeFunc={activeFunc} resolution={resolution} />
      </div>

    </div>
  );
}

// --- Surface Viewer Component (Canvas & Interactions) ---
function SurfaceViewer({ activeFunc, resolution }: { activeFunc: SurfaceFunction, resolution: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

  // Precompute min/max for the current function to normalize colors
  const { minZ, maxZ } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    const [dMin, dMax] = activeFunc.domain;
    const step = (dMax - dMin) / 50; // coarse grid for min/max
    for (let x = dMin; x <= dMax; x += step) {
      for (let y = dMin; y <= dMax; y += step) {
        const z = activeFunc.compute(x, y);
        if (z < min) min = z;
        if (z > max) max = z;
      }
    }
    return { minZ: min, maxZ: max };
  }, [activeFunc]);

  // Draw Heatmap and Contours
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution
    canvas.width = resolution;
    canvas.height = resolution;

    const [dMin, dMax] = activeFunc.domain;
    const domainRange = dMax - dMin;

    const imgData = ctx.createImageData(resolution, resolution);
    const data = imgData.data;

    for (let py = 0; py < resolution; py++) {
      for (let px = 0; px < resolution; px++) {
        // Map pixel to domain
        const x = dMin + (px / resolution) * domainRange;
        // Flip Y so positive is up
        const y = dMin + ((resolution - 1 - py) / resolution) * domainRange;
        
        const z = activeFunc.compute(x, y);
        
        // true for topographical contour lines overlay
        const [r, g, b, a] = getHeatmapColor(z, minZ, maxZ, true);
        
        const idx = (py * resolution + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }

    ctx.putImageData(imgData, 0, 0);

  }, [activeFunc, resolution, minZ, maxZ]);

  // Handle Mouse Interaction for Gradient Vector Overlay
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Convert pixel coordinate back to math domain coordinate
  const pxToDomain = (px: number, py: number, width: number, height: number) => {
    const [dMin, dMax] = activeFunc.domain;
    const domainRange = dMax - dMin;
    const x = dMin + (px / width) * domainRange;
    const y = dMin + ((height - py) / height) * domainRange;
    return { x, y };
  };

  // Render Overlay (Gradients)
  const renderOverlay = () => {
    if (!mousePos || !containerRef.current) return null;

    const { clientWidth, clientHeight } = containerRef.current;
    const { x, y } = mousePos;

    // Convert mouse to math coordinates
    const mathCoords = pxToDomain(x, y, clientWidth, clientHeight);
    
    // Compute gradient [dx, dy]
    const grad = activeFunc.gradient(mathCoords.x, mathCoords.y);
    const z = activeFunc.compute(mathCoords.x, mathCoords.y);
    
    // We want to visualize the *negative* gradient (direction of steepest descent)
    // Scale it for visual purposes
    const gradMagnitude = Math.sqrt(grad[0]*grad[0] + grad[1]*grad[1]);
    const maxPixelLen = 60; 
    
    // Normalize and scale for rendering
    let renderDx = 0;
    let renderDy = 0;
    
    if (gradMagnitude > 0.001) {
      // Note: Math Y is up, Pixel Y is down.
      // Negative gradient means -grad[0], -grad[1]
      renderDx = (-grad[0] / gradMagnitude) * maxPixelLen;
      renderDy = (grad[1] / gradMagnitude) * maxPixelLen; // Flip Y for DOM
    }

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl shadow-inner">
        {/* Crosshair at mouse */}
        <div 
          className="absolute w-4 h-4 rounded-full border-2 border-white/50 bg-teal-400/20 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ left: x, top: y }}
        >
          <div className="w-1 h-1 bg-white rounded-full"></div>
        </div>

        {/* Gradient Vector Arrow */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#2dd4bf" />
            </marker>
          </defs>
          <line 
            x1={x} 
            y1={y} 
            x2={x + renderDx} 
            y2={y + renderDy} 
            stroke="#2dd4bf" 
            strokeWidth="3"
            markerEnd="url(#arrowhead)"
            strokeLinecap="round"
          />
        </svg>

        {/* Info Tooltip */}
        <div 
          className="absolute bg-zinc-900/90 backdrop-blur-md border border-zinc-700 text-xs p-3 rounded-lg shadow-xl text-zinc-300 pointer-events-none transform translate-x-4 -translate-y-4 whitespace-nowrap"
          style={{ left: x, top: y }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Position (x,y):</span>
              <span className="font-mono text-zinc-100">{mathCoords.x.toFixed(2)}, {mathCoords.y.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Loss f(x,y):</span>
              <span className="font-mono text-teal-400 font-bold">{z.toFixed(3)}</span>
            </div>
            <div className="w-full h-px bg-zinc-700 my-1"></div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Gradient ∇f:</span>
              <span className="font-mono text-rose-400">[{grad[0].toFixed(2)}, {grad[1].toFixed(2)}]</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl">
      <div 
        ref={containerRef}
        className="relative w-full aspect-square bg-black rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800 overflow-hidden cursor-crosshair group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas 
          ref={canvasRef}
          className="w-full h-full object-fill opacity-90 transition-opacity duration-300 group-hover:opacity-100"
          style={{ imageRendering: 'pixelated' }} // keep sharp contours
        />
        {renderOverlay()}
      </div>

      <div className="mt-8 text-center max-w-md">
        <h3 className="text-lg font-bold text-zinc-200 mb-2">{activeFunc.name} Landscape</h3>
        <p className="text-sm text-zinc-500">
          The bright teal regions represent topological contours of the surface. 
          When minimizing loss, optimization algorithms follow the negative gradient towards darker (lower) regions.
        </p>
      </div>
    </div>
  );
}