import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & Function Definitions ---
type Point = { x: number; y: number };

interface FuncDef {
  id: string;
  name: string;
  equation: string;
  desc: string;
  domain: number; // The coordinate range [-domain, domain]
  fn: (x: number, y: number) => number;
  grad: (x: number, y: number) => Point;
}

const FUNCTIONS: FuncDef[] = [
  {
    id: 'bowl',
    name: 'The Bowl (Convex)',
    equation: 'f(x,y) = x² + y²',
    desc: 'A simple convex paraboloid. Gradient descent easily finds the global minimum from any starting point.',
    domain: 2,
    fn: (x, y) => x * x + y * y,
    grad: (x, y) => ({ x: 2 * x, y: 2 * y }),
  },
  {
    id: 'saddle',
    name: 'Saddle Point (Minimax)',
    equation: 'f(x,y) = x² - y²',
    desc: 'Features a saddle point at the origin. It is a minimum along the x-axis but a maximum along the y-axis. Tricky for standard GD!',
    domain: 2,
    fn: (x, y) => x * x - y * y,
    grad: (x, y) => ({ x: 2 * x, y: -2 * y }),
  },
  {
    id: 'rastrigin',
    name: 'Rastrigin (Non-convex)',
    equation: 'f(x) = 20 + x² - 10cos(2πx) + y² - 10cos(2πy)',
    desc: 'A highly non-convex function with many local minima. Demonstrates where momentum or Adam is needed to escape traps.',
    domain: 2.5,
    fn: (x, y) => 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y)),
    grad: (x, y) => ({
      x: 2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      y: 2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    }),
  },
];

// --- Helper Functions ---
const interpolateColor = (val: number) => {
  // Map 0 (min) -> Teal (45, 212, 191)
  // Map 1 (max) -> Charcoal (17, 24, 39)
  const r = Math.round(45 + (17 - 45) * val);
  const g = Math.round(212 + (24 - 212) * val);
  const b = Math.round(191 + (39 - 191) * val);
  return [r, g, b];
};

export default function App() {
  const [activeFuncId, setActiveFuncId] = useState<string>('bowl');
  const [hoverData, setHoverData] = useState<{ p: Point; z: number; grad: Point } | null>(null);
  
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeFunc = FUNCTIONS.find((f) => f.id === activeFuncId)!;

  // Draw the contour map
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const { domain, fn } = activeFunc;

    // Pass 1: compute Z values and find min/max
    const zs = new Float32Array(width * height);
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Map pixel to domain
        const x = (px / width) * (domain * 2) - domain;
        const y = -((py / height) * (domain * 2) - domain); // Invert Y for standard Cartesian
        
        const z = fn(x, y);
        const idx = py * width + px;
        zs[idx] = z;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    // Pass 2: Map to colors and draw contours
    for (let i = 0; i < zs.length; i++) {
      const normZ = (zs[i] - minZ) / (maxZ - minZ);
      
      // Create discrete steps for contour bands
      const bands = 15;
      const steppedNormZ = Math.floor(normZ * bands) / bands;
      
      // Check if we are on a contour line edge
      const isContourLine = (normZ * bands) % 1 < 0.08;

      const [r, g, b] = interpolateColor(steppedNormZ);

      const dataIdx = i * 4;
      if (isContourLine) {
        // Draw dark contour lines
        data[dataIdx] = 17;
        data[dataIdx + 1] = 24;
        data[dataIdx + 2] = 39;
        data[dataIdx + 3] = 150; // slightly transparent
      } else {
        data[dataIdx] = r;
        data[dataIdx + 1] = g;
        data[dataIdx + 2] = b;
        data[dataIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [activeFunc]);

  // Handle Mouse Move for Interactive Gradient Vectors
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const { domain, fn, grad } = activeFunc;

    // Map pixel to domain
    const x = (px / width) * (domain * 2) - domain;
    const y = -((py / height) * (domain * 2) - domain);

    const z = fn(x, y);
    const g = grad(x, y);

    setHoverData({ p: { x, y }, z, grad: g });

    // Draw the gradient vector
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw dot at cursor
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#f87171'; // red-400 for contrast
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw negative gradient vector (direction of steepest descent)
    // Scale vector for visualization
    const mag = Math.sqrt(g.x * g.x + g.y * g.y);
    if (mag > 0.001) {
      const visualScale = 40; // Fixed length for visibility
      const dx = -(g.x / mag) * visualScale;
      // Invert Y back for canvas coordinates
      const dy = (g.y / mag) * visualScale; 

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx, py + dy);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(px + dx, py + dy);
      ctx.lineTo(px + dx - 10 * Math.cos(angle - Math.PI / 6), py + dy - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(px + dx - 10 * Math.cos(angle + Math.PI / 6), py + dy - 10 * Math.sin(angle + Math.PI / 6));
      ctx.lineTo(px + dx, py + dy);
      ctx.fillStyle = '#f87171';
      ctx.fill();
    }
  }, [activeFunc]);

  const handleMouseLeave = () => {
    setHoverData(null);
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6 md:p-12 selection:bg-teal-500/30">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </span>
          Optimization Landscapes
        </h1>
        <p className="text-gray-400 max-w-2xl text-lg">
          Select a mathematical function to explore its topography. Hover over the contour map to visualize the gradient vector (steepest descent) at any given point.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Function Selector */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">Select Function</h2>
          
          {FUNCTIONS.map((func) => {
            const isActive = activeFuncId === func.id;
            return (
              <button
                key={func.id}
                onClick={() => setActiveFuncId(func.id)}
                className={`text-left p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'border-teal-400 bg-gray-800 shadow-[0_0_20px_rgba(45,212,191,0.15)]' 
                    : 'border-gray-700 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-teal-400/10 blur-2xl rounded-full -mr-8 -mt-8" />
                )}
                <h3 className={`text-lg font-bold mb-1 ${isActive ? 'text-teal-300' : 'text-gray-200'}`}>
                  {func.name}
                </h3>
                <code className="block text-sm font-mono text-gray-400 mb-3 bg-gray-900/50 px-2 py-1 rounded w-max">
                  {func.equation}
                </code>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {func.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Area: Interactive Visualization */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="relative bg-gray-800 border-2 border-gray-700 rounded-xl overflow-hidden shadow-2xl group">
            
            {/* Top Bar Info */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
              <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 px-4 py-2 rounded-lg shadow-lg">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Domain</span>
                <span className="text-sm font-mono text-teal-300">
                  [{ -activeFunc.domain }, { activeFunc.domain }]²
                </span>
              </div>

              {/* Live Hover Stats */}
              <div className={`bg-gray-900/90 backdrop-blur-md border border-gray-700 p-4 rounded-lg shadow-lg transition-opacity duration-200 min-w-[180px] ${hoverData ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Live Telemetry</div>
                {hoverData && (
                  <div className="flex flex-col gap-1.5 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">x, y:</span>
                      <span className="text-gray-200">{hoverData.p.x.toFixed(2)}, {hoverData.p.y.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">f(x,y):</span>
                      <span className="text-teal-300 font-bold">{hoverData.z.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between mt-1 pt-1 border-t border-gray-800">
                      <span className="text-gray-500">∇f:</span>
                      <span className="text-red-400">[{hoverData.grad.x.toFixed(1)}, {hoverData.grad.y.toFixed(1)}]</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-gray-900/80 backdrop-blur-md border border-gray-700 px-3 py-2 rounded-lg flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">Minima</span>
              <div className="w-24 h-3 rounded bg-gradient-to-r from-teal-400 to-gray-900"></div>
              <span className="text-xs text-gray-400 font-medium">Maxima</span>
            </div>

            {/* Canvas Layers */}
            <div className="relative w-full aspect-square md:aspect-[4/3] bg-gray-900 cursor-crosshair">
              {/* Base Contour Map */}
              <canvas
                ref={baseCanvasRef}
                width={800}
                height={600}
                className="absolute inset-0 w-full h-full object-fill"
              />
              {/* Interactive Overlay (Gradients) */}
              <canvas
                ref={overlayCanvasRef}
                width={800}
                height={600}
                className="absolute inset-0 w-full h-full object-fill z-10"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Hover over the map to see the direction of steepest descent (negative gradient).
          </div>
        </div>

      </div>
    </div>
  );
}