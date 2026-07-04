import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Math & Physics Helpers ---

// Lorenz system derivatives
const lorenzDerivatives = (x: number, y: number, z: number, sigma: number, rho: number, beta: number) => {
  return [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z
  ];
};

// RK4 Integrator Step
const rk4Step = (x: number, y: number, z: number, sigma: number, rho: number, beta: number, dt: number) => {
  const [dx1, dy1, dz1] = lorenzDerivatives(x, y, z, sigma, rho, beta);
  const [dx2, dy2, dz2] = lorenzDerivatives(x + dx1 * dt / 2, y + dy1 * dt / 2, z + dz1 * dt / 2, sigma, rho, beta);
  const [dx3, dy3, dz3] = lorenzDerivatives(x + dx2 * dt / 2, y + dy2 * dt / 2, z + dz2 * dt / 2, sigma, rho, beta);
  const [dx4, dy4, dz4] = lorenzDerivatives(x + dx3 * dt, y + dy3 * dt, z + dz3 * dt, sigma, rho, beta);

  return [
    x + (dx1 + 2 * dx2 + 2 * dx3 + dx4) * dt / 6,
    y + (dy1 + 2 * dy2 + 2 * dy3 + dy4) * dt / 6,
    z + (dz1 + 2 * dz2 + 2 * dz3 + dz4) * dt / 6
  ];
};

type ViewType = 'zmax' | 'plane';

export default function App() {
  // --- State ---
  const [sigma, setSigma] = useState<number>(10);
  const [rho, setRho] = useState<number>(28);
  const [beta, setBeta] = useState<number>(8 / 3);
  const [viewType, setViewType] = useState<ViewType>('zmax');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Initialization from URL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('s')) setSigma(parseFloat(params.get('s')!));
    if (params.has('r')) setRho(parseFloat(params.get('r')!));
    if (params.has('b')) setBeta(parseFloat(params.get('b')!));
  }, []);

  // --- Computation Engine ---
  useEffect(() => {
    setIsComputing(true);

    // Use a timeout to allow UI to render the loading state
    const timer = setTimeout(() => {
      const dt = 0.01;
      const steps = 150000; // Capped for performance
      const burnIn = 2000;
      
      let x = 0.1, y = 0.1, z = 0.1;
      
      // Burn-in period to settle onto the attractor
      for (let i = 0; i < burnIn; i++) {
        [x, y, z] = rk4Step(x, y, z, sigma, rho, beta, dt);
      }

      const generatedPoints: [number, number][] = [];
      let prevZ = z;
      let prevPrevZ = z;
      let prevX = x;
      let prevY = y;
      let lastZMax: number | null = null;

      for (let i = 0; i < steps; i++) {
        const [nx, ny, nz] = rk4Step(x, y, z, sigma, rho, beta, dt);

        if (viewType === 'zmax') {
          // Lorenz Map: Z_{n+1} vs Z_n (Local maxima of Z)
          if (prevZ > prevPrevZ && prevZ > nz) {
            if (lastZMax !== null) {
              generatedPoints.push([lastZMax, prevZ]);
            }
            lastZMax = prevZ;
          }
        } else {
          // Poincare Section: Plane crossing z = rho - 1 (downward)
          const planeZ = rho - 1;
          if (prevZ > planeZ && nz <= planeZ) {
            // Linear interpolation for precise crossing point
            const t = (planeZ - prevZ) / (nz - prevZ);
            const ix = prevX + t * (nx - prevX);
            const iy = prevY + t * (ny - prevY);
            generatedPoints.push([ix, iy]);
          }
        }

        prevPrevZ = prevZ;
        prevZ = nz;
        prevX = nx;
        prevY = ny;
        x = nx;
        y = ny;
        z = nz;
      }

      setPoints(generatedPoints);
      setIsComputing(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [sigma, rho, beta, viewType]);

  // --- Rendering Engine ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with midnight background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const [px, py] of points) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    // Add a small margin to bounds
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    minX -= dx * 0.05;
    maxX += dx * 0.05;
    minY -= dy * 0.05;
    maxY += dy * 0.05;

    const padding = 40;
    const scaleX = (width - padding * 2) / (maxX - minX);
    const scaleY = (height - padding * 2) / (maxY - minY);

    // Draw axes
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // X Axis (if 0 is in view)
    if (minY <= 0 && maxY >= 0) {
      const y0 = height - padding - (0 - minY) * scaleY;
      ctx.moveTo(padding, y0);
      ctx.lineTo(width - padding, y0);
    }
    // Y Axis (if 0 is in view)
    if (minX <= 0 && maxX >= 0) {
      const x0 = padding + (0 - minX) * scaleX;
      ctx.moveTo(x0, padding);
      ctx.lineTo(x0, height - padding);
    }
    ctx.stroke();

    // Setup glow and colors based on view type
    const isZMax = viewType === 'zmax';
    ctx.fillStyle = isZMax ? 'rgba(14, 165, 233, 0.7)' : 'rgba(168, 85, 247, 0.7)'; // cyan-500 or purple-500
    ctx.shadowColor = isZMax ? '#0ea5e9' : '#a855f7';
    ctx.shadowBlur = 6;

    // Draw points
    for (const [px, py] of points) {
      const cx = padding + (px - minX) * scaleX;
      const cy = height - padding - (py - minY) * scaleY;
      
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw labels
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    
    if (isZMax) {
      ctx.fillText('Z_n', width / 2, height - 10);
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Z_{n+1}', 0, 0);
      ctx.restore();
    } else {
      ctx.fillText('X', width / 2, height - 10);
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Y', 0, 0);
      ctx.restore();
    }

  }, [points, viewType]);

  // --- Handlers ---
  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('s', sigma.toString());
    url.searchParams.set('r', rho.toString());
    url.searchParams.set('b', beta.toFixed(3));
    window.history.replaceState({}, '', url.toString());
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-cyan-900 selection:text-cyan-50">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-slate-900/80 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col z-10 shadow-2xl backdrop-blur-md shrink-0 h-auto md:h-screen overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
            Poincaré Section
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Analyze the chaotic topology of the Lorenz attractor by taking a lower-dimensional slice of its trajectory.
          </p>
        </div>

        <div className="space-y-6 flex-1">
          {/* View Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Section Type</label>
            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setViewType('zmax')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  viewType === 'zmax' 
                    ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(14,165,233,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Z-Maxima Map
              </button>
              <button
                onClick={() => setViewType('plane')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  viewType === 'plane' 
                    ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Plane Intersect
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              {viewType === 'zmax' 
                ? "Plots successive local maxima of Z against each other, revealing the classic tent map."
                : `Plots the X-Y intersection when the trajectory crosses Z = ρ - 1 downwards.`}
            </p>
          </div>

          <hr className="border-slate-800" />

          {/* Parameters */}
          <div className="space-y-5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Parameters</label>
            
            {/* Sigma Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-slate-300">σ (Sigma)</span>
                <span className="text-xs font-mono text-cyan-400">{sigma.toFixed(1)}</span>
              </div>
              <input 
                type="range" min="1" max="30" step="0.1" 
                value={sigma} onChange={(e) => setSigma(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Rho Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-slate-300">ρ (Rho)</span>
                <span className="text-xs font-mono text-cyan-400">{rho.toFixed(1)}</span>
              </div>
              <input 
                type="range" min="1" max="100" step="0.1" 
                value={rho} onChange={(e) => setRho(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Beta Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-slate-300">β (Beta)</span>
                <span className="text-xs font-mono text-cyan-400">{beta.toFixed(3)}</span>
              </div>
              <input 
                type="range" min="0.5" max="5" step="0.01" 
                value={beta} onChange={(e) => setBeta(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Points extracted:</span>
            <span className="font-mono text-slate-300">{isComputing ? '...' : points.length}</span>
          </div>
          <button
            onClick={handleShare}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied URL
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share Parameters
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Visualization Area */}
      <main className="flex-1 relative flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwaDIwdjIwSDIwdi0yMHptLTIwIDBoMjB2MjBIMHYtMjB6bTIwLTIwaDIwdjIwSDIwdjIweiIgZmlsbD0iIzFGMjkzNyIgZmlsbC1vcGFjaXR5PSIwLjA1IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>

        <div className="relative w-full max-w-4xl aspect-square md:aspect-auto md:h-full max-h-[800px] bg-slate-950/50 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col">
          
          {/* Canvas Header */}
          <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-slate-950/80 to-transparent pointer-events-none">
            <h2 className="text-sm font-medium text-slate-300 tracking-wide flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${viewType === 'zmax' ? 'bg-cyan-500 shadow-[0_0_8px_#0ea5e9]' : 'bg-purple-500 shadow-[0_0_8px_#a855f7]'}`}></span>
              {viewType === 'zmax' ? 'Lorenz Map (Z Maxima)' : 'Poincaré Section (Z = ρ - 1)'}
            </h2>
            {isComputing && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Computing RK4...
              </div>
            )}
          </div>

          {/* The Canvas */}
          <div className="flex-1 w-full h-full relative">
            <canvas 
              ref={canvasRef}
              width={800}
              height={800}
              className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
            />