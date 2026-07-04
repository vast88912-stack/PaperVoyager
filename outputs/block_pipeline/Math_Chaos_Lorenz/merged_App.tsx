import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Activity, ChevronDown, Sparkles, Share2, Settings2, RotateCcw, Info, Home, Box, Sliders, Layers, Target, LineChart } from 'lucide-react';

// --- Shared Math & Helpers ---

function rk4(x: number, y: number, z: number, sigma: number, rho: number, beta: number, dt: number) {
  const dx1 = sigma * (y - x);
  const dy1 = x * (rho - z) - y;
  const dz1 = x * y - beta * z;

  const x2 = x + 0.5 * dt * dx1;
  const y2 = y + 0.5 * dt * dy1;
  const z2 = z + 0.5 * dt * dz1;
  const dx2 = sigma * (y2 - x2);
  const dy2 = x2 * (rho - z2) - y2;
  const dz2 = x2 * y2 - beta * z2;

  const x3 = x + 0.5 * dt * dx2;
  const y3 = y + 0.5 * dt * dy2;
  const z3 = z + 0.5 * dt * dz2;
  const dx3 = sigma * (y3 - x3);
  const dy3 = x3 * (rho - z3) - y3;
  const dz3 = x3 * y3 - beta * z3;

  const x4 = x + dt * dx3;
  const y4 = y + dt * dy3;
  const z4 = z + dt * dz3;
  const dx4 = sigma * (y4 - x4);
  const dy4 = x4 * (rho - z4) - y4;
  const dz4 = x4 * y4 - beta * z4;

  return {
    x: x + (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4),
    y: y + (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4),
    z: z + (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4)
  };
}

// --- Shared Components ---

const ParameterSlider = ({
  label, symbol, value, min, max, step, onChange, colorClass, thumbColorClass, glowClass, desc
}: {
  label: string; symbol: string; value: number; min: number; max: number; step: number;
  onChange: (val: number) => void; colorClass: string; thumbColorClass: string; glowClass: string; desc: string;
}) => {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-3 mb-8 group">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-slate-200 tracking-wide">{label}</span>
            <span className={`font-serif italic text-xl ${thumbColorClass} drop-shadow-[0_0_8px_currentColor]`}>
              {symbol}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 group-hover:text-slate-400 transition-colors">
            {desc}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number" value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="w-20 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-sm font-mono text-slate-200 focus:outline-none focus:border-slate-500 transition-colors"
            step={step}
          />
        </div>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`absolute top-0 left-0 h-full ${colorClass} transition-all duration-75 ease-out`} style={{ width: `${percent}%` }} />
        </div>
        <div className={`absolute w-4 h-4 rounded-full bg-white border-2 ${thumbColorClass} ${glowClass} pointer-events-none transition-all duration-75 ease-out z-10`} style={{ left: `calc(${percent}% - 8px)` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute w-full h-full opacity-0 cursor-pointer z-20" />
      </div>
    </div>
  );
};

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${enabled ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'bg-slate-700'}`}
  >
    <span className="sr-only">Toggle perturbations</span>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
  </button>
);

// --- Views ---

function HeroView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const lorenzPath = useMemo(() => {
    let x = 0.1, y = 0, z = 0;
    const dt = 0.006;
    const pts = [];
    for (let i = 0; i < 500; i++) {
      const next = rk4(x, y, z, 10, 28, 8/3, dt);
      x = next.x; y = next.y; z = next.z;
    }
    for (let i = 0; i < 3500; i++) {
      const next = rk4(x, y, z, 10, 28, 8/3, dt);
      x = next.x; y = next.y; z = next.z;
      pts.push(`${500 + x * 18},${850 - z * 14}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <div className="relative min-h-full bg-[#05050a] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30 flex flex-col">
      <div className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out" style={{ background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(45, 212, 191, 0.07), transparent 40%)` }} />
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 pointer-events-none">
        <svg viewBox="0 0 1000 1000" className="w-full h-full max-w-[1200px] object-contain animate-[pulse_8s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))' }}>
          <defs>
            <linearGradient id="lorenz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <polyline points={lorenzPath} fill="none" stroke="url(#lorenz-grad)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" className="opacity-60" />
        </svg>
      </div>
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 mask-image:linear-gradient(to_bottom,transparent,black,transparent)" />
      
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20 mx-auto max-w-7xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium tracking-wider uppercase border rounded-full text-cyan-400 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ChatGPT Edition</span>
        </div>
        <div className="max-w-4xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 drop-shadow-sm">
            Lorenz Attractor <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 drop-shadow-[0_0_25px_rgba(139,92,246,0.4)]">Studio</span>
          </h1>
          <p className="max-w-2xl mx-auto mt-8 text-lg leading-relaxed text-slate-400 sm:text-xl">
            Explore the deterministic non-periodic flow of the Lorenz system. Discover how microscopic perturbations in initial conditions lead to vastly divergent chaotic trajectories—the essence of the <strong className="font-semibold text-slate-200">Butterfly Effect</strong>.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 mt-12 sm:grid-cols-3 w-full max-w-3xl">
          {[
            { label: 'Prandtl Number', symbol: 'σ', value: '10.0', color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5' },
            { label: 'Rayleigh Number', symbol: 'ρ', value: '28.0', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5' },
            { label: 'Physical Proportions', symbol: 'β', value: '8/3', color: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bg: 'bg-fuchsia-500/5' }
          ].map((param, idx) => (
            <div key={idx} className={`flex flex-col items-center p-4 border rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] ${param.border} ${param.bg}`}>
              <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">{param.label}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`font-serif text-2xl italic ${param.color}`}>{param.symbol}</span>
                <span className="text-xl font-mono text-slate-200">= {param.value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-6 mt-16 sm:flex-row">
          <button 
            onClick={() => onNavigate('3d')}
            onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
            className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white transition-all duration-300 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#05050a] shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] group"
          >
            <Activity className={`w-5 h-5 transition-transform duration-300 ${isHovering ? 'animate-pulse' : ''}`} />
            Initialize Simulation
            <div className="absolute inset-0 rounded-full opacity-0 ring-1 ring-white/50 group-hover:animate-ping" />
          </button>
          <div className="flex gap-4">
            <button onClick={() => onNavigate('params')} className="inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors border rounded-full text-slate-300 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white backdrop-blur-sm">
              <Settings2 className="w-4 h-4" /> Parameters
            </button>
          </div>
        </div>
      </main>
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-[#05050a] to-transparent z-10" />
    </div>
  );
}

function ProjectionView({ sigma, rho, beta, setSigma, setRho, setBeta }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const pointsRef = useRef<{x:number, y:number, z:number}[]>([]);
  const drawCountRef = useRef<number>(0);
  const rotationRef = useRef({ yaw: 0.5, pitch: 0.3 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const MAX_STEPS = 12000;
  const DT = 0.008;

  const generateTrajectory = useCallback(() => {
    const pts = [];
    let current = { x: 0.1, y: 0, z: 0 };
    for (let i = 0; i < MAX_STEPS; i++) {
      pts.push(current);
      current = rk4(current.x, current.y, current.z, sigma, rho, beta, DT);
    }
    pointsRef.current = pts;
    drawCountRef.current = 0;
  }, [sigma, rho, beta]);

  useEffect(() => { generateTrajectory(); }, [generateTrajectory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, width, height);

      const pts = pointsRef.current;
      if (pts.length === 0) return;

      if (isPlaying && drawCountRef.current < MAX_STEPS) {
        drawCountRef.current += 40;
        if (drawCountRef.current > MAX_STEPS) drawCountRef.current = MAX_STEPS;
      }

      const { yaw, pitch } = rotationRef.current;
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const cx = 0, cy = 0, cz = 25;
      const scale = Math.min(width, height) / 60;
      const focalLength = 800, cameraZ = 100;

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.2;

      for (let i = 1; i < drawCountRef.current; i++) {
        const p1 = pts[i - 1], p2 = pts[i];
        let x1 = p1.x - cx, y1 = p1.y - cy, z1 = p1.z - cz;
        let x2 = p2.x - cx, y2 = p2.y - cy, z2 = p2.z - cz;

        let tx1 = x1 * cosY - z1 * sinY, tz1 = z1 * cosY + x1 * sinY;
        let tx2 = x2 * cosY - z2 * sinY, tz2 = z2 * cosY + x2 * sinY;

        let ty1 = y1 * cosP - tz1 * sinP, ttz1 = tz1 * cosP + y1 * sinP;
        let ty2 = y2 * cosP - tz2 * sinP, ttz2 = tz2 * cosP + y2 * sinP;

        const zScale1 = focalLength / (focalLength + ttz1 + cameraZ);
        const zScale2 = focalLength / (focalLength + ttz2 + cameraZ);

        const px1 = width / 2 + tx1 * scale * zScale1;
        const py1 = height / 2 + ty1 * scale * zScale1;
        const px2 = width / 2 + tx2 * scale * zScale2;
        const py2 = height / 2 + ty2 * scale * zScale2;

        const hue = (i / MAX_STEPS) * 120 + 180;
        const alpha = Math.min(1, (i / drawCountRef.current) + 0.1);
        
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha * 0.6})`;
        ctx.stroke();
      }

      if (drawCountRef.current > 0 && drawCountRef.current < MAX_STEPS) {
        const headP = pts[drawCountRef.current - 1];
        let hx = headP.x - cx, hy = headP.y - cy, hz = headP.z - cz;
        let thx = hx * cosY - hz * sinY, thz = hz * cosY + hx * sinY;
        let thy = hy * cosP - thz * sinP, tthz = thz * cosP + hy * sinP;
        const hzScale = focalLength / (focalLength + tthz + cameraZ);
        const hpx = width / 2 + thx * scale * hzScale;
        const hpy = height / 2 + thy * scale * hzScale;

        ctx.beginPath(); ctx.arc(hpx, hpy, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.arc(hpx, hpy, 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'; ctx.fill();
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => { isDraggingRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    rotationRef.current.yaw += (e.clientX - lastMouseRef.current.x) * 0.01;
    rotationRef.current.pitch += (e.clientY - lastMouseRef.current.y) * 0.01;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = () => { isDraggingRef.current = false; };

  return (
    <div className="relative w-full h-full bg-[#02040a] text-slate-200 font-sans overflow-hidden flex flex-col">
      <header className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          3D Projection
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-md">Interactive 3D projection of chaotic trajectories. Drag to rotate the manifold.</p>
      </header>
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center"><label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Sigma (σ)</label><span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-cyan-100">{sigma.toFixed(1)}</span></div>
            <input type="range" min="1" max="30" step="0.1" value={sigma} onChange={(e) => setSigma(parseFloat(e.target.value))} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center"><label className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Rho (ρ)</label><span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-purple-100">{rho.toFixed(1)}</span></div>
            <input type="range" min="1" max="100" step="0.5" value={rho} onChange={(e) => setRho(parseFloat(e.target.value))} className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center"><label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Beta (β)</label><span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-blue-100">{beta.toFixed(3)}</span></div>
            <input type="range" min="0.5" max="5" step="0.01" value={beta} onChange={(e) => setBeta(parseFloat(e.target.value))} className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center">
          <button onClick={() => { setSigma(10); setRho(28); setBeta(8/3); }} className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-800">Reset to Classic</button>
          <button onClick={() => setIsPlaying(!isPlaying)} className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg ${isPlaying ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-cyan-900/50' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20'}`}>
            {isPlaying ? 'Pause Animation' : 'Resume Animation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ParametersView({ sigma, rho, beta, setSigma, setRho, setBeta }: any) {
  const [copied, setCopied] = useState(false);
  const handleReset = () => { setSigma(10); setRho(28); setBeta(8/3); };
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="min-h-full bg-[#030712] flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-cyan-500/30">
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-0.5 bg-gradient-to-b from-cyan-500/20 via-fuchsia-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-50 pointer-events-none" />
        <div className="relative bg-[#0B1120]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50"><Settings2 className="w-5 h-5 text-cyan-400" /></div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">System Parameters</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Activity className="w-3 h-3" /> Real-time chaotic tuning</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all duration-200 group" title="Reset to standard chaos"><RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" /></button>
              <button onClick={handleShare} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all duration-200 relative" title="Copy shareable URL">
                <Share2 className="w-4 h-4" />
                {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">Copied!</span>}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <ParameterSlider label="Prandtl Number" symbol="σ" desc="Ratio of momentum diffusivity to thermal diffusivity." value={sigma} min={0} max={50} step={0.1} onChange={setSigma} colorClass="bg-gradient-to-r from-cyan-600 to-cyan-400" thumbColorClass="border-cyan-400 text-cyan-400" glowClass="shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
            <ParameterSlider label="Rayleigh Number" symbol="ρ" desc="Proportional to the temperature difference." value={rho} min={0} max={100} step={0.1} onChange={setRho} colorClass="bg-gradient-to-r from-fuchsia-600 to-fuchsia-400" thumbColorClass="border-fuchsia-400 text-fuchsia-400" glowClass="shadow-[0_0_15px_rgba(232,121,249,0.6)]" />
            <ParameterSlider label="Geometric Factor" symbol="β" desc="Physical proportions of the convection cell." value={beta} min={0} max={10} step={0.001} onChange={setBeta} colorClass="bg-gradient-to-r from-emerald-600 to-emerald-400" thumbColorClass="border-emerald-400 text-emerald-400" glowClass="shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start gap-3 bg-slate-900/30 p-3 rounded-xl">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">Adjusting these parameters alters the differential equations governing the system. Standard chaos occurs at <span className="text-cyan-400 font-mono">σ=10</span>, <span className="text-fuchsia-400 font-mono">ρ=28</span>, <span className="text-emerald-400 font-mono">β=2.667</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ButterflyView({ sigma, rho, beta }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPerturbations, setShowPerturbations] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const rotationRef = useRef(0);

  const trajectories = useMemo(() => {
    const gen = (init: {x:number, y:number, z:number}) => {
      const pts = [init];
      let curr = init;
      for (let i = 0; i < 3500; i++) {
        curr = rk4(curr.x, curr.y, curr.z, sigma, rho, beta, 0.008);
        pts.push(curr);
      }
      return pts;
    };
    return [
      { points: gen({x: 0.1, y: 0.1, z: 0.1}), color: '#06b6d4', label: 'Base Trajectory' },
      { points: gen({x: 0.10001, y: 0.1, z: 0.1}), color: '#ec4899', label: 'Δx₀ = +0.00001' },
      { points: gen({x: 0.1, y: 0.10001, z: 0.1}), color: '#eab308', label: 'Δy₀ = +0.00001' },
    ];
  }, [sigma, rho, beta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width, height = rect.height;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      const scale = Math.min(width, height) / 65;
      const centerX = width / 2, centerY = height / 2 + 100;
      rotationRef.current += 0.002;
      const cosT = Math.cos(rotationRef.current), sinT = Math.sin(rotationRef.current);

      const drawTrajectory = (traj: typeof trajectories[0], maxIdx: number) => {
        if (maxIdx <= 0) return;
        ctx.beginPath(); ctx.strokeStyle = traj.color; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 8; ctx.shadowColor = traj.color; ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < maxIdx; i++) {
          const {x, y, z} = traj.points[i];
          const rotX = x * cosT - y * sinT, rotY = x * sinT + y * cosT;
          const screenX = centerX + rotX * scale, screenY = centerY - z * scale - rotY * scale * 0.3;
          if (i === 0) ctx.moveTo(screenX, screenY); else ctx.lineTo(screenX, screenY);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
      };

      const currentStep = Math.floor(progressRef.current);
      drawTrajectory(trajectories[0], currentStep);
      if (showPerturbations) { drawTrajectory(trajectories[1], currentStep); drawTrajectory(trajectories[2], currentStep); }

      if (isAnimating) {
        progressRef.current += 12;
        if (progressRef.current > 3500) { progressRef.current = 3500; setIsAnimating(false); }
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [trajectories, showPerturbations, isAnimating]);

  useEffect(() => { progressRef.current = 0; setIsAnimating(true); }, [showPerturbations, sigma, rho, beta]);

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-900/50 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-80 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/80 z-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">Butterfly Effect</h2>
            <p className="text-sm text-slate-400 leading-relaxed">The Lorenz system is highly sensitive to initial conditions. Even microscopic changes in the starting coordinates lead to vastly different trajectories over time.</p>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50 mb-8">
            <div className="flex items-center justify-between mb-4"><span className="text-sm font-medium text-slate-300">Overlay Perturbations</span><ToggleSwitch enabled={showPerturbations} onChange={setShowPerturbations} /></div>
            <p className="text-xs text-slate-500">Toggle to simulate two additional trajectories with initial positions shifted by just <code className="text-cyan-400 bg-slate-800 px-1 py-0.5 rounded">0.00001</code>.</p>
          </div>
          <div className="mt-auto space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Active Trajectories</h3>
            {trajectories.map((t, i) => (
              <div key={i} className={`flex items-center space-x-3 transition-opacity duration-300 ${(!showPerturbations && i > 0) ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                <span className="text-sm font-mono text-slate-300">{t.label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { progressRef.current = 0; setIsAnimating(true); }} className="mt-8 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700 hover:border-slate-600 flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Replay Simulation</span>
          </button>
        </div>
        <div className="flex-1 relative min-h-[400px] md:min-h-[600px] bg-[#020617]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" />
          <div className="absolute top-4 right-4 flex space-x-4 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Parameters</div>
              <div className="text-xs font-mono text-cyan-400">σ={sigma.toFixed(1)} ρ={rho.toFixed(1)} β={beta.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PoincareView({ sigma, rho, beta, setSigma, setRho, setBeta }: any) {
  const [debouncedParams, setDebouncedParams] = useState({ sigma, rho, beta });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => setDebouncedParams({ sigma, rho, beta }), 150);
    return () => clearTimeout(timer);
  }, [sigma, rho, beta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { sigma: s, rho: r, beta: b } = debouncedParams;
    const dt = 0.005, warmupSteps = 5000, computeSteps = 250000;
    let x = 1.0, y = 1.0, z = 1.0;
    const points: {x: number, z: number}[] = [];

    for (let i = 0; i < warmupSteps; i++) {
      const next = rk4(x, y, z, s, r, b, dt);
      x = next.x; y = next.y; z = next.z;
    }

    for (let i = 0; i < computeSteps; i++) {
      const next = rk4(x, y, z, s, r, b, dt);
      const nx = next.x, ny = next.y, nz = next.z;
      if (y < 0 && ny >= 0) {
        const fraction = (0 - y) / (ny - y);
        const cx = x + (nx - x) * fraction;
        const cz = z + (nz - z) * fraction;
        if (isFinite(cx) && isFinite(cz)) points.push({ x: cx, z: cz });
      }
      x = nx; y = ny; z = nz;
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) break;
    }

    const width = canvas.width, height = canvas.height;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    if (points.length === 0) { setIsGenerating(false); return; }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
    const padX = (maxX - minX) * 0.1 || 1, padZ = (maxZ - minZ) * 0.1 || 1;
    minX -= padX; maxX += padX; minZ -= padZ; maxZ += padZ;
    const scaleX = width / (maxX - minX), scaleZ = height / (maxZ - minZ);

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)'; ctx.lineWidth = 1; ctx.beginPath();
    if (minZ < 0 && maxZ > 0) { const z0 = height - (0 - minZ) * scaleZ; ctx.moveTo(0, z0); ctx.lineTo(width, z0); }
    if (minX < 0 && maxX > 0) { const x0 = (0 - minX) * scaleX; ctx.moveTo(x0, 0); ctx.lineTo(x0, height); }
    ctx.stroke();

    ctx.fillStyle = 'rgba(34, 211, 238, 0.8)'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 6;
    for (const p of points) {
      const cx = (p.x - minX) * scaleX, cz = height - (p.z - minZ) * scaleZ;
      ctx.beginPath(); ctx.arc(cx, cz, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    setIsGenerating(false);
  }, [debouncedParams]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 selection:text-cyan-50 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 p-6 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 tracking-tight">Poincaré Section</h1>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">Exploring chaos through the Poincaré Section. This view slices the 3D trajectory at the plane <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">y = 0</code>, revealing the underlying fractal structure.</p>
          </div>
          <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-all text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
            {copied ? <>Copied URL</> : <><Share2 className="w-4 h-4" /> Share Params</>}
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500"></div>
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2"><Settings2 className="w-5 h-5 text-cyan-400" /> System Parameters</h2>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-end"><label className="text-sm font-medium text-slate-300 flex items-center gap-2"><span className="text-cyan-400 font-serif italic text-lg">σ</span> Prandtl Number</label><span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-cyan-300 border border-slate-800">{sigma.toFixed(2)}</span></div>
                <input type="range" min="1" max="30" step="0.1" value={sigma} onChange={(e) => setSigma(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end"><label className="text-sm font-medium text-slate-300 flex items-center gap-2"><span className="text-fuchsia-400 font-serif italic text-lg">ρ</span> Rayleigh Number</label><span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-fuchsia-300 border border-slate-800">{rho.toFixed(2)}</span></div>
                <input type="range" min="1" max="100" step="0.5" value={rho} onChange={(e) => setRho(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end"><label className="text-sm font-medium text-slate-300 flex items-center gap-2"><span className="text-lime-400 font-serif italic text-lg">β</span> Geometric Factor</label><span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-lime-300 border border-slate-800">{beta.toFixed(3)}</span></div>
                <input type="range" min="0.5" max="10" step="0.01" value={beta} onChange={(e) => setBeta(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="text-xs text-slate-500 space-y-2"><p><strong>RK4 Integration:</strong> 250,000 steps</p><p><strong>Time Step (dt):</strong> 0.005</p><p><strong>Section Plane:</strong> y = 0 (dy/dt &gt; 0)</p></div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 flex flex-col">
          <div className="relative w-full aspect-square md:aspect-video lg:aspect-square bg-[#020617] rounded-xl border border-slate-800 shadow-2xl overflow-hidden group">
            <div className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 z-10 ${isGenerating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                <span className="text-cyan-400 text-sm font-medium tracking-widest uppercase">Computing Trajectories...</span>
              </div>
            </div>
            <canvas ref={canvasRef} width={800} height={800} className="w-full h-full object-contain" />
          </div>
        </div>
      </main>
    </div>
  );
}

function TimeSeriesView({ sigma, rho, beta }: any) {
  const [isPlaying, setIsPlaying] = useState(true);
  const requestRef = useRef<number>();
  const stateRef = useRef({ x: 0.1, y: 0.1, z: 0.1, t: 0 });
  const historyRef = useRef<{x:number, y:number, z:number, t:number}[]>([]);
  const canvasXRef = useRef<HTMLCanvasElement>(null);
  const canvasYRef = useRef<HTMLCanvasElement>(null);
  const canvasZRef = useRef<HTMLCanvasElement>(null);

  const MAX_HISTORY = 600, DT = 0.005, STEPS_PER_FRAME = 3;

  const drawChart = useCallback((canvas: HTMLCanvasElement, data: number[], color: string, minVal: number, maxVal: number, label: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < height; i += height / 4) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
    for (let i = 0; i < width; i += width / 10) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
    ctx.stroke();

    ctx.strokeStyle = '#334155'; ctx.beginPath();
    const zeroY = height - ((0 - minVal) / (maxVal - minVal)) * height;
    if (zeroY > 0 && zeroY < height) { ctx.moveTo(0, zeroY); ctx.lineTo(width, zeroY); ctx.stroke(); }

    if (data.length === 0) return;

    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = color;
    const stepX = width / MAX_HISTORY;
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      const y = height - ((val - minVal) / (maxVal - minVal)) * height;
      const x = i * stepX + (MAX_HISTORY - data.length) * stepX;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#f8fafc'; ctx.font = '14px monospace'; ctx.fillText(`${label}(t)`, 10, 20);
    const currentVal = data[data.length - 1];
    if (currentVal !== undefined) { ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.fillText(currentVal.toFixed(3), width - 10, 20); ctx.textAlign = 'left'; }
  }, []);

  const animate = useCallback(() => {
    if (!isPlaying) return;
    let currentState = stateRef.current;
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      const next = rk4(currentState.x, currentState.y, currentState.z, sigma, rho, beta, DT);
      currentState = { ...next, t: currentState.t + DT };
    }
    stateRef.current = currentState;
    const history = historyRef.current;
    history.push(currentState);
    if (history.length > MAX_HISTORY) history.shift();

    if (canvasXRef.current) drawChart(canvasXRef.current, history.map(p => p.x), '#06b6d4', -30, 30, 'X');
    if (canvasYRef.current) drawChart(canvasYRef.current, history.map(p => p.y), '#d946ef', -30, 30, 'Y');
    if (canvasZRef.current) drawChart(canvasZRef.current, history.map(p => p.z), '#eab308', 0, 60, 'Z');
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, sigma, rho, beta, drawChart]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  const handleReset = () => {
    stateRef.current = { x: 0.1, y: 0.1, z: 0.1, t: 0 };
    historyRef.current = [];
    [canvasXRef, canvasYRef, canvasZRef].forEach(ref => {
      if (ref.current) ref.current.getContext('2d')?.clearRect(0, 0, ref.current.width, ref.current.height);
    });
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-900 selection:text-cyan-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-yellow-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">Time Series Analysis</h1>
            <p className="text-slate-400 mt-2 max-w-2xl">Real-time oscilloscope view of the Lorenz attractor's state variables. Observe the chaotic, non-periodic oscillation and sensitive dependence on initial conditions.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(!isPlaying)} className={`px-4 py-2 rounded-md font-medium transition-all duration-300 border ${isPlaying ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={handleReset} className="px-4 py-2 rounded-md font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">↺ Reset</button>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center mb-2"><h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>X-Axis Trajectory</h2><span className="text-xs text-slate-500 font-mono">Range: [-30, 30]</span></div>
            <div className="w-full h-[180px] bg-slate-950 rounded-lg border border-slate-800/80 relative"><canvas ref={canvasXRef} width={1000} height={180} className="w-full h-full object-fill" /></div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center mb-2"><h2 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#d946ef]"></span>Y-Axis Trajectory</h2><span className="text-xs text-slate-500 font-mono">Range: [-30, 30]</span></div>
            <div className="w-full h-[180px] bg-slate-950 rounded-lg border border-slate-800/80 relative"><canvas ref={canvasYRef} width={1000} height={180} className="w-full h-full object-fill" /></div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center mb-2"><h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_#eab308]"></span>Z-Axis Trajectory</h2><span className="text-xs text-slate-500 font-mono">Range: [0, 60]</span></div>
            <div className="w-full h-[180px] bg-slate-950 rounded-lg border border-slate-800/80 relative"><canvas ref={canvasZRef} width={1000} height={180} className="w-full h-full object-fill" /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-400 border-t border-slate-800 pt-6">
          <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2"><span className="text-slate-500 italic">σ (Sigma):</span><span className="font-mono text-slate-200">{sigma.toFixed(2)}</span></div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2"><span className="text-slate-500 italic">ρ (Rho):</span><span className="font-mono text-slate-200">{rho.toFixed(2)}</span></div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2"><span className="text-slate-500 italic">β (Beta):</span><span className="font-mono text-slate-200">{beta.toFixed(2)}</span></div>
          <div className="ml-auto bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 flex items-center gap-2"><span className="text-slate-500 italic">Integration:</span><span className="font-mono text-slate-200">RK4 (dt={DT})</span></div>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('hero');
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(8/3);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s') || params.get('sigma');
    const r = params.get('r') || params.get('rho');
    const b = params.get('b') || params.get('beta');
    if (s && !isNaN(parseFloat(s))) setSigma(parseFloat(s));
    if (r && !isNaN(parseFloat(r))) setRho(parseFloat(r));
    if (b && !isNaN(parseFloat(b))) setBeta(parseFloat(b));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('s', sigma.toString());
    params.set('r', rho.toString());
    params.set('b', beta.toString());
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [sigma, rho, beta]);

  const TABS = [
    { id: 'hero', label: 'Overview', icon: Home },
    { id: '3d', label: '3D Projection', icon: Box },
    { id: 'params', label: 'Parameters', icon: Sliders },
    { id: 'butterfly', label: 'Butterfly Effect', icon: Layers },
    { id: 'poincare', label: 'Poincaré Section', icon: Target },
    { id: 'timeseries', label: 'Time Series', icon: LineChart },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <nav className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Lorenz Studio</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {TABS.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${activeTab === tab.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-slate-950">
        {activeTab === 'hero' && <HeroView onNavigate={setActiveTab} />}
        {activeTab === '3d' && <ProjectionView sigma={sigma} rho={rho} beta={beta} setSigma={setSigma} setRho={setRho} setBeta={setBeta} />}
        {activeTab === 'params' && <ParametersView sigma={sigma} rho={rho} beta={beta} setSigma={setSigma} setRho={setRho} setBeta={setBeta} />}
        {activeTab === 'butterfly' && <ButterflyView sigma={sigma} rho={rho} beta={beta} />}
        {activeTab === 'poincare' && <PoincareView sigma={sigma} rho={rho} beta={beta} setSigma={setSigma} setRho={setRho} setBeta={setBeta} />}
        {activeTab === 'timeseries' && <TimeSeriesView sigma={sigma} rho={rho} beta={beta} />}
      </main>
    </div>
  );
}