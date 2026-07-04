import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Math & Simulation Logic ---

type Point2D = [number, number];

const lorenz = (x: number, y: number, z: number, sigma: number, rho: number, beta: number) => [
  sigma * (y - x),
  x * (rho - z) - y,
  x * y - beta * z
];

const rk4Step = (x: number, y: number, z: number, dt: number, sigma: number, rho: number, beta: number) => {
  const [dx1, dy1, dz1] = lorenz(x, y, z, sigma, rho, beta);
  const [dx2, dy2, dz2] = lorenz(x + dx1 * dt / 2, y + dy1 * dt / 2, z + dz1 * dt / 2, sigma, rho, beta);
  const [dx3, dy3, dz3] = lorenz(x + dx2 * dt / 2, y + dy2 * dt / 2, z + dz2 * dt / 2, sigma, rho, beta);
  const [dx4, dy4, dz4] = lorenz(x + dx3 * dt, y + dy3 * dt, z + dz3 * dt, sigma, rho, beta);

  return [
    x + (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4),
    y + (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4),
    z + (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4)
  ];
};

const generatePoincareSection = (
  sigma: number,
  rho: number,
  beta: number,
  zPlane: number,
  direction: 'up' | 'down' | 'both',
  steps = 150000
): Point2D[] => {
  let x = 1, y = 1, z = 1;
  const dt = 0.005; 
  
  // Transient phase to settle onto attractor
  for (let i = 0; i < 5000; i++) {
    [x, y, z] = rk4Step(x, y, z, dt, sigma, rho, beta);
  }

  const points: Point2D[] = [];
  let prevX = x, prevY = y, prevZ = z;

  for (let i = 0; i < steps; i++) {
    [x, y, z] = rk4Step(x, y, z, dt, sigma, rho, beta);

    let crossed = false;
    if (direction === 'down' || direction === 'both') {
      if (prevZ > zPlane && z <= zPlane) crossed = true;
    }
    if (direction === 'up' || direction === 'both') {
      if (prevZ < zPlane && z >= zPlane) crossed = true;
    }

    if (crossed) {
      // Linear interpolation for precise intersection point
      const t = (zPlane - prevZ) / (z - prevZ);
      const crossX = prevX + t * (x - prevX);
      const crossY = prevY + t * (y - prevY);
      points.push([crossX, crossY]);
    }

    prevX = x; prevY = y; prevZ = z;
  }

  return points;
};

// --- Components ---

const Slider = ({ label, min, max, step, value, onChange }: any) => (
  <div className="flex flex-col gap-1 mb-4">
    <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
      <span>{label}</span>
      <span className="text-cyan-400">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
    />
  </div>
);

export default function App() {
  // Parameters
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(8 / 3);
  
  // Section Config
  const [zPlane, setZPlane] = useState(27);
  const [direction, setDirection] = useState<'down'>('down');
  
  // State
  const [points, setPoints] = useState<Point2D[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Recompute points when parameters change
  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => {
      const newPoints = generatePoincareSection(sigma, rho, beta, zPlane, direction);
      setPoints(newPoints);
      setIsCalculating(false);
    }, 10); // Small delay to allow UI to render calculation state
    return () => clearTimeout(timer);
  }, [sigma, rho, beta, zPlane, direction]);

  // Draw points on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background (Midnight theme)
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // Grid & Axes
    ctx.strokeStyle = '#0f172a'; // slate-900
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<width; i+=50) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
    for(let i=0; i<height; i+=50) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
    ctx.stroke();

    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.beginPath();
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height);
    ctx.stroke();

    if (points.length === 0) return;

    // Calculate dynamic bounds to center and scale the section
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(([px, py]) => {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    });

    const padding = 20;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    
    // Maintain aspect ratio
    const scale = Math.min(
      (width - padding * 2) / rangeX,
      (height - padding * 2) / rangeY
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Draw glowing points
    ctx.fillStyle = '#22d3ee'; // cyan-400
    ctx.shadowColor = '#06b6d4'; // cyan-500
    ctx.shadowBlur = 6;

    points.forEach(([x, y]) => {
      const cx = width / 2 + (x - centerX) * scale;
      const cy = height / 2 - (y - centerY) * scale; // invert Y for cartesian
      
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [points]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            Lorenz Attractor Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Poincaré Section View</p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-slate-500">
          <div>RK4 Steps: <span className="text-slate-300">150k</span></div>
          <div>Intersections: <span className="text-cyan-400">{points.length}</span></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex relative">
        
        {/* Controls Sidebar */}
        <aside className="w-80 border-r border-slate-800/60 bg-slate-900/30 backdrop-blur-sm p-6 flex flex-col gap-6 overflow-y-auto z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
          
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              System Parameters
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Adjust the chaotic flow. Standard values are σ=10, ρ=28, β=2.67.
            </p>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
            <Slider label="Sigma (σ)" min={1} max={30} step={0.1} value={sigma} onChange={setSigma} />
            <Slider label="Rho (ρ)" min={1} max={100} step={0.1} value={rho} onChange={setRho} />
            <Slider label="Beta (β)" min={0.1} max={10} step={0.01} value={beta} onChange={setBeta} />
          </div>

          <hr className="border-slate-800/60" />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Section Plane
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Define the Z-plane to slice the attractor. Points are plotted when the trajectory passes through this plane.
            </p>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 flex flex-col gap-4">
            <Slider label="Slice Height (Z)" min={1} max={60} step={0.5} value={zPlane} onChange={setZPlane} />
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Crossing Direction</span>
              <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                {(['down', 'up', 'both'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setDirection(dir)}
                    className={`flex-1 text-xs py-1.5 rounded-md capitalize transition-colors ${
                      direction === dir 
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </aside>

        {/* Canvas Area */}
        <section className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 flex items-center justify-center p-8">
          
          {/* Status Indicator */}
          {isCalculating && (
            <div className="absolute top-8 right-8 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-md z-20">
              <svg className="animate-spin h-3 w-3 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs font-mono text-slate-300">Computing Trajectory...</span>
            </div>
          )}

          {/* Visualization Container */}
          <div className="relative w-full h-full max-w-5xl max-h-[800px] flex items-center justify-center">
             
             {/* Decorative Corners */}
             <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-700/50 rounded-tl-lg"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-700/50 rounded-tr-lg"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-700/50 rounded-bl-lg"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-700/50 rounded-br-lg"></div>

            <canvas
              ref={canvasRef}
              width={1000}
              height={800}
              className="w-full h-full object-contain rounded-lg shadow-[0_0_60px_-15px_rgba(6,182,212,0.15)] bg-slate-950"
            />
            
            {/* Axis Labels Overlay */}
            <div className="absolute bottom-4 right-4 text-xs font-mono text-slate-600">X-Axis</div>
            <div className="absolute top-4 left-4 text-xs font-mono text-slate-600 -rotate-90 origin-top-left translate-y-full">Y-Axis</div>
          </div>
        </section>

      </main>
    </div>
  );
}