import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Math & RK4 Integrator ---

const lorenz = (x: number, y: number, z: number, sigma: number, rho: number, beta: number) => {
  return [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z
  ];
};

const rk4 = (x: number, y: number, z: number, sigma: number, rho: number, beta: number, dt: number) => {
  const [k1x, k1y, k1z] = lorenz(x, y, z, sigma, rho, beta);
  const [k2x, k2y, k2z] = lorenz(x + k1x * dt / 2, y + k1y * dt / 2, z + k1z * dt / 2, sigma, rho, beta);
  const [k3x, k3y, k3z] = lorenz(x + k2x * dt / 2, y + k2y * dt / 2, z + k2z * dt / 2, sigma, rho, beta);
  const [k4x, k4y, k4z] = lorenz(x + k3x * dt, y + k3y * dt, z + k3z * dt, sigma, rho, beta);

  return [
    x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
    z + (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z)
  ];
};

// --- Main Component ---

export default function App() {
  // State for parameters
  const [sigma, setSigma] = useState<number>(10);
  const [rho, setRho] = useState<number>(28);
  const [beta, setBeta] = useState<number>(8 / 3);
  
  // Debounced state for heavy calculations
  const [debouncedParams, setDebouncedParams] = useState({ sigma: 10, rho: 28, beta: 8 / 3 });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('sigma');
    const r = params.get('rho');
    const b = params.get('beta');
    
    if (s && !isNaN(parseFloat(s))) setSigma(parseFloat(s));
    if (r && !isNaN(parseFloat(r))) setRho(parseFloat(r));
    if (b && !isNaN(parseFloat(b))) setBeta(parseFloat(b));
  }, []);

  // Debounce slider changes
  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => {
      setDebouncedParams({ sigma, rho, beta });
    }, 150);
    return () => clearTimeout(timer);
  }, [sigma, rho, beta]);

  // Generate Poincaré Section and Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { sigma: s, rho: r, beta: b } = debouncedParams;
    
    // Computation parameters
    const dt = 0.005;
    const warmupSteps = 5000;
    const computeSteps = 250000; // Capped step count for performance
    
    let x = 1.0, y = 1.0, z = 1.0;
    const points: {x: number, z: number}[] = [];

    // Warm-up phase (settle onto the attractor)
    for (let i = 0; i < warmupSteps; i++) {
      const [nx, ny, nz] = rk4(x, y, z, s, r, b, dt);
      x = nx; y = ny; z = nz;
    }

    // Computation phase (record crossings of y=0)
    for (let i = 0; i < computeSteps; i++) {
      const [nx, ny, nz] = rk4(x, y, z, s, r, b, dt);
      
      // Check for crossing y=0 plane from negative to positive
      if (y < 0 && ny >= 0) {
        // Linear interpolation to find exact crossing point
        const fraction = (0 - y) / (ny - y);
        const cx = x + (nx - x) * fraction;
        const cz = z + (nz - z) * fraction;
        
        // Prevent NaNs or Infinity from escaping trajectories
        if (isFinite(cx) && isFinite(cz)) {
          points.push({ x: cx, z: cz });
        }
      }
      
      x = nx; y = ny; z = nz;
      
      // Bail out if trajectory diverges
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) break;
    }

    // --- Rendering ---
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with midnight background
    ctx.fillStyle = '#020617'; // tailwind slate-950
    ctx.fillRect(0, 0, width, height);

    if (points.length === 0) {
      setIsGenerating(false);
      return;
    }

    // Find bounding box for auto-scaling
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    // Add padding (10%)
    const padX = (maxX - minX) * 0.1 || 1;
    const padZ = (maxZ - minZ) * 0.1 || 1;
    minX -= padX; maxX += padX;
    minZ -= padZ; maxZ += padZ;

    const scaleX = width / (maxX - minX);
    const scaleZ = height / (maxZ - minZ);

    // Draw axes
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)'; // slate-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    // X axis (z=0)
    if (minZ < 0 && maxZ > 0) {
      const z0 = height - (0 - minZ) * scaleZ;
      ctx.moveTo(0, z0);
      ctx.lineTo(width, z0);
    }
    // Z axis (x=0)
    if (minX < 0 && maxX > 0) {
      const x0 = (0 - minX) * scaleX;
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, height);
    }
    ctx.stroke();

    // Draw points with neon glow
    ctx.fillStyle = 'rgba(34, 211, 238, 0.8)'; // cyan-400
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 6;

    for (const p of points) {
      const cx = (p.x - minX) * scaleX;
      const cz = height - (p.z - minZ) * scaleZ; // Invert Z for standard Cartesian view
      
      ctx.beginPath();
      ctx.arc(cx, cz, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsGenerating(false);
  }, [debouncedParams]);

  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('sigma', sigma.toFixed(2));
    url.searchParams.set('rho', rho.toFixed(2));
    url.searchParams.set('beta', beta.toFixed(3));
    
    window.history.replaceState(null, '', url.toString());
    navigator.clipboard.writeText(url.toString());
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sigma, rho, beta]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 selection:text-cyan-50 flex flex-col">
      {/* Header / Hero */}
      <header className="border-b border-slate-800 bg-slate-900/50 p-6 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 tracking-tight">
              Lorenz Attractor Studio
            </h1>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">
              Exploring chaos through the Poincaré Section. This view slices the 3D trajectory at the plane <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">y = 0</code>, revealing the underlying fractal structure of the strange attractor.
            </p>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-all text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied URL
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share Params
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500"></div>
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              System Parameters
            </h2>
            
            <div className="space-y-8">
              {/* Sigma Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <span className="text-cyan-400 font-serif italic text-lg">σ</span> Prandtl Number
                  </label>
                  <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-cyan-300 border border-slate-800">
                    {sigma.toFixed(2)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" max="30" step="0.1" 
                  value={sigma} 
                  onChange={(e) => setSigma(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Rho Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <span className="text-fuchsia-400 font-serif italic text-lg">ρ</span> Rayleigh Number
                  </label>
                  <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-fuchsia-300 border border-slate-800">
                    {rho.toFixed(2)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" max="100" step="0.5" 
                  value={rho} 
                  onChange={(e) => setRho(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
                />
              </div>

              {/* Beta Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <span className="text-lime-400 font-serif italic text-lg">β</span> Geometric Factor
                  </label>
                  <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-lime-300 border border-slate-800">
                    {beta.toFixed(3)}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="10" step="0.01" 
                  value={beta} 
                  onChange={(e) => setBeta(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="text-xs text-slate-500 space-y-2">
                <p><strong>RK4 Integration:</strong> 250,000 steps</p>
                <p><strong>Time Step (dt):</strong> 0.005</p>
                <p><strong>Section Plane:</strong> y = 0 (dy/dt &gt; 0)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="relative w-full aspect-square md:aspect-video lg:aspect-square bg-[#020617] rounded-xl border border-slate-800 shadow-2xl overflow-hidden group">
            
            {/* Loading Overlay */}
            <div className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 z-10 ${isGenerating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                <span className="text-cyan-400 text-sm font-medium tracking-widest uppercase">Computing Trajectories...</span>
              </div>
            </div>

            {/* Canvas */}
            <canvas 
              ref={canvasRef}
              width={800}
              height={800}
              className="w-full h-full