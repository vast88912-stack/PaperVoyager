import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Math & Function Definitions ---
type LandscapeFunction = {
  id: string;
  name: string;
  description: string;
  domain: [number, number]; // [min, max] assumed symmetric for X and Y
  zRange: [number, number]; // [minZ, maxZ] for color normalization
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
};

const FUNCTIONS: Record<string, LandscapeFunction> = {
  bowl: {
    id: 'bowl',
    name: 'Convex Bowl',
    description: 'A simple quadratic function. Easy to optimize; a great starting point for standard Gradient Descent.',
    domain: [-2, 2],
    zRange: [0, 8],
    f: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
  },
  saddle: {
    id: 'saddle',
    name: 'Saddle Point',
    description: 'Curves upwards in one direction and downwards in another. Standard GD often slows down or gets stuck here.',
    domain: [-2, 2],
    zRange: [-4, 4],
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
  },
  rastrigin: {
    id: 'rastrigin',
    name: 'Rastrigin',
    description: 'Highly non-convex with many local minima. A classic trap that requires Momentum or Adam to escape.',
    domain: [-3, 3], // Zoomed in slightly from the standard 5.12 for better visualization
    zRange: [0, 60],
    f: (x, y) => 20 + (x * x - 10 * Math.cos(2 * Math.PI * x)) + (y * y - 10 * Math.cos(2 * Math.PI * y)),
    grad: (x, y) => [
      2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    ],
  },
};

// --- Helper: Draw Arrow on Canvas ---
const drawArrow = (
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
) => {
  const headlen = 10; // length of head in pixels
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
};

export default function App() {
  const [activeFuncId, setActiveFuncId] = useState<string>('bowl');
  const [mousePos, setMousePos] = useState<{ px: number; py: number } | null>(null);
  
  const surfaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeFunc = useMemo(() => FUNCTIONS[activeFuncId], [activeFuncId]);

  // Render the contour background (expensive, run only when function changes)
  useEffect(() => {
    const canvas = surfaceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const [minD, maxD] = activeFunc.domain;
    const [minZ, maxZ] = activeFunc.zRange;
    const rangeD = maxD - minD;
    const rangeZ = maxZ - minZ || 1;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Map pixel to domain (Y is inverted in canvas)
        const x = minD + (px / width) * rangeD;
        const y = maxD - (py / height) * rangeD;

        const z = activeFunc.f(x, y);
        let normZ = (z - minZ) / rangeZ;
        normZ = Math.max(0, Math.min(1, normZ)); // Clamp 0-1

        // Teal (45, 212, 191) to Charcoal (17, 24, 39)
        // High Z = Charcoal, Low Z (Minimum) = Bright Teal
        const invZ = 1 - normZ; 
        
        let r = 17 + (45 - 17) * invZ;
        let g = 24 + (212 - 24) * invZ;
        let b = 39 + (191 - 39) * invZ;

        // Add contour banding
        const bands = 12;
        const isContour = (normZ * bands) % 1 < 0.1;
        if (isContour) {
          r *= 0.8; g *= 0.8; b *= 0.8; // Darken contours slightly
        }

        const idx = (py * width + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255; // Alpha
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [activeFunc]);

  // Render the interactive gradient overlay (cheap, run on mouse move)
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!mousePos) return;

    const [minD, maxD] = activeFunc.domain;
    const rangeD = maxD - minD;

    // Convert mouse pixel to domain coordinates
    const x = minD + (mousePos.px / width) * rangeD;
    const y = maxD - (mousePos.py / height) * rangeD; // Y inverted

    // Get gradient
    const [gx, gy] = activeFunc.grad(x, y);

    // We want to draw the NEGATIVE gradient (direction of steepest descent)
    const dirX = -gx;
    const dirY = -gy; // In domain coordinates

    // Scale the vector for visualization
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);
    const maxMag = 40; // Max pixels long
    const scale = mag === 0 ? 0 : Math.min(maxMag / mag, 5); // visually pleasing scale

    // Convert vector back to pixel space (Note: +Y in domain is -Y in pixels)
    const pxToX = mousePos.px + dirX * scale * (width / rangeD);
    const pxToY = mousePos.py - dirY * scale * (height / rangeD); // Minus because canvas Y is down

    // Draw the gradient vector
    drawArrow(ctx, mousePos.px, mousePos.py, pxToX, pxToY, '#fcd34d'); // Amber-300 for contrast

    // Draw point
    ctx.beginPath();
    ctx.arc(mousePos.px, mousePos.py, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fcd34d';
    ctx.fill();

  }, [mousePos, activeFunc]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        px: e.clientX - rect.left,
        py: e.clientY - rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar / Function Selector */}
      <aside className="w-full md:w-80 bg-gray-800 border-b md:border-b-0 md:border-r border-gray-700 p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-400 mb-2">Topology</h1>
          <p className="text-sm text-gray-400">
            Select a function to explore its landscape. The geometry dictates how easily Gradient Descent finds the minimum.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {Object.values(FUNCTIONS).map((func) => {
            const isActive = activeFuncId === func.id;
            return (
              <button
                key={func.id}
                onClick={() => setActiveFuncId(func.id)}
                className={`text-left p-4 rounded-xl transition-all duration-300 border-2 ${
                  isActive 
                    ? 'bg-gray-900 border-teal-500 shadow-[0_0_15px_rgba(45,212,191,0.2)]' 
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`font-semibold ${isActive ? 'text-teal-300' : 'text-gray-200'}`}>
                    {func.name}
                  </h2>
                  {isActive && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {func.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-teal-400 rounded-sm"></div>
            <span className="text-xs text-gray-300">Global Minimum</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-gray-900 border border-gray-600 rounded-sm"></div>
            <span className="text-xs text-gray-300">High Elevation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-amber-300 relative">
              <div className="absolute -right-1 -top-1 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-amber-300"></div>
            </div>
            <span className="text-xs text-gray-300">Negative Gradient Vector</span>
          </div>
        </div>
      </aside>

      {/* Main Visualization Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900 relative overflow-hidden">
        
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative group">
          {/* Canvas Container */}
          <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-900">
            
            {/* Surface Canvas (Contours) */}
            <canvas
              ref={surfaceCanvasRef}
              width={500}
              height={500}
              className="absolute top-0 left-0 w-full h-full"
            />
            
            {/* Overlay Canvas (Interactive Vectors) */}
            <canvas
              ref={overlayCanvasRef}
              width={500}
              height={500}
              className="absolute top-0 left-0 w-full h-full cursor-crosshair z-10"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </div>

          {/* Interactive Hint */}
          <div className="absolute -bottom-12 left-0 right-0 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="bg-gray-800 text-teal-300 text-xs px-3 py-1.5 rounded-full border border-teal-500/30 shadow-lg">
              Hover to reveal the gradient field
            </span>
          </div>
        </div>

        {/* Math Display */}
        <div className="mt-16 text-center">
          <h3 className="text-gray-400 font-mono text-sm mb-2">f(x, y)</h3>
          <div className="text-xl md:text-2xl font-serif tracking-wider text-gray-200 bg-gray-800/50 px-6 py-3 rounded-lg border border-gray-700/50 inline-block">
            {activeFuncId === 'bowl' && <span>x² + y²</span>}
            {activeFuncId === 'saddle' && <span>x² - y²</span>}
            {activeFuncId === 'rastrigin' && (
              <span className="text-lg md:text-xl">
                20 + [x² - 10cos(2πx)] + [y² - 10cos(2πy)]
              </span>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}