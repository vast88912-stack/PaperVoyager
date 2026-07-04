import React, { useEffect, useRef, useState, useCallback } from 'react';

type SystemParams = {
  sigma: number;
  rho: number;
  beta: number;
};

type Point3D = {
  x: number;
  y: number;
  z: number;
};

type Particle = {
  current: Point3D;
  history: Point3D[];
  color: string;
};

const RK4_DT = 0.008;
const MAX_HISTORY = 1200;
const BASE_ZOOM = 12;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const angles = useRef({ rx: 0.3, ry: 0.4 });
  const zoom = useRef(BASE_ZOOM);

  const [params, setParams] = useState<SystemParams>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return {
        sigma: parseFloat(sp.get('s') || '10'),
        rho: parseFloat(sp.get('r') || '28'),
        beta: parseFloat(sp.get('b') || (8 / 3).toString()),
      };
    }
    return { sigma: 10, rho: 28, beta: 8 / 3 };
  });

  const [showMulti, setShowMulti] = useState(true);

  const particlesRef = useRef<Particle[]>([]);

  const initParticles = useCallback((p: SystemParams, multi: boolean) => {
    particlesRef.current = [
      { current: { x: 0.1, y: 0.1, z: 0.1 }, history: [], color: '#00f3ff' },
      ...(multi ? [
        { current: { x: 0.1001, y: 0.1, z: 0.1 }, history: [], color: '#ff00a0' },
        { current: { x: 0.1, y: 0.1001, z: 0.1 }, history: [], color: '#e1ff00' }
      ] : [])
    ];
  }, []);

  // Initialize particles on mount or when toggle changes
  useEffect(() => {
    initParticles(params, showMulti);
  }, [showMulti, initParticles]);

  // Sync params to URL
  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set('s', params.sigma.toFixed(2));
    sp.set('r', params.rho.toFixed(2));
    sp.set('b', params.beta.toFixed(3));
    window.history.replaceState(null, '', '?' + sp.toString());
  }, [params]);

  // RK4 Integration
  const lorenzDerivative = (p: Point3D, s: number, r: number, b: number) => ({
    dx: s * (p.y - p.x),
    dy: p.x * (r - p.z) - p.y,
    dz: p.x * p.y - b * p.z
  });

  const rk4Step = (p: Point3D, s: number, r: number, b: number, dt: number): Point3D => {
    const k1 = lorenzDerivative(p, s, r, b);
    const k2 = lorenzDerivative({ x: p.x + k1.dx * dt / 2, y: p.y + k1.dy * dt / 2, z: p.z + k1.dz * dt / 2 }, s, r, b);
    const k3 = lorenzDerivative({ x: p.x + k2.dx * dt / 2, y: p.y + k2.dy * dt / 2, z: p.z + k2.dz * dt / 2 }, s, r, b);
    const k4 = lorenzDerivative({ x: p.x + k3.dx * dt, y: p.y + k3.dy * dt, z: p.z + k3.dz * dt }, s, r, b);

    return {
      x: p.x + (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) * dt / 6,
      y: p.y + (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) * dt / 6,
      z: p.z + (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz) * dt / 6
    };
  };

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();

    const project = (x: number, y: number, z: number, rho: number) => {
      // Center the attractor (Z center is typically around rho - 1)
      const cz = z - (rho - 1);
      
      // Rotate X
      const y1 = y * Math.cos(angles.current.rx) - cz * Math.sin(angles.current.rx);
      const z1 = y * Math.sin(angles.current.rx) + cz * Math.cos(angles.current.rx);
      
      // Rotate Y
      const x2 = x * Math.cos(angles.current.ry) + z1 * Math.sin(angles.current.ry);
      const z2 = -x * Math.sin(angles.current.ry) + z1 * Math.cos(angles.current.ry);
      
      // Perspective
      const fov = 800;
      const distance = fov + z2 * zoom.current;
      const scale = distance > 0 ? fov / distance : 0.01;
      
      return {
        px: width / 2 + x2 * scale * zoom.current * 1.5,
        py: height / 2 + y1 * scale * zoom.current * 1.5,
        scale
      };
    };

    const render = () => {
      // Clear with dark midnight blue
      ctx.fillStyle = '#050914';
      ctx.fillRect(0, 0, width, height);

      // Grid/Axis hints (optional, adds to 3D feel)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const origin = project(0, 0, 0, params.rho);
      ctx.moveTo(origin.px - 100, origin.py); ctx.lineTo(origin.px + 100, origin.py);
      ctx.moveTo(origin.px, origin.py - 100); ctx.lineTo(origin.px, origin.py + 100);
      ctx.stroke();

      // Step physics
      particlesRef.current.forEach(particle => {
        // Run multiple sub-steps per frame for faster drawing without instability
        for(let i=0; i<3; i++){
            particle.current = rk4Step(particle.current, params.sigma, params.rho, params.beta, RK4_DT);
            particle.history.push(particle.current);
            if (particle.history.length > MAX_HISTORY) {
            particle.history.shift();
            }
        }
      });

      // Setup Glow
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw trails
      particlesRef.current.forEach(particle => {
        if (particle.history.length < 2) return;

        ctx.beginPath();
        const start = project(particle.history[0].x, particle.history[0].y, particle.history[0].z, params.rho);
        ctx.moveTo(start.px, start.py);

        for (let i = 1; i < particle.history.length; i++) {
          const pt = particle.history[i];
          const proj = project(pt.x, pt.y, pt.z, params.rho);
          ctx.lineTo(proj.px, proj.py);
        }

        ctx.shadowBlur = 12;
        ctx.shadowColor = particle.color;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Draw head particle
        const head = project(particle.current.x, particle.current.y, particle.current.z, params.rho);
        ctx.beginPath();
        ctx.arc(head.px, head.py, 2 * head.scale, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [params.sigma, params.rho, params.beta]); // Rebind if params change, though we use refs for physics to avoid remounts. Actually, let's keep params in dependency so project() uses latest rho.


  // Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    angles.current.ry -= dx * 0.005;
    angles.current.rx -= dy * 0.005;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (canvasRef.current) canvasRef.current.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoom.current = Math.max(2, Math.min(50, zoom.current - e.deltaY * 0.01));
  };

  const handleParamChange = (key: keyof SystemParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
    // Clear history to avoid teleportation artifacts
    particlesRef.current.forEach(p => p.history = []);
  };

  const resetView = () => {
    angles.current = { rx: 0.3, ry: 0.4 };
    zoom.current = BASE_ZOOM;
    initParticles(params, showMulti);
  };

  return (
    <div className="min-h-screen bg-[#050914] text-slate-200 font-sans overflow-hidden flex flex-col relative selection:bg-cyan-500/30">
      
      {/* Header / Hero */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 drop-shadow-md flex items-center gap-3">
              Lorenz Attractor Studio
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                RK4 Engine
              </span>
            </h1>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed drop-shadow-sm">
              Explore chaos theory in a 3D projection canvas. Adjust parameters to see how deterministic non-linear systems exhibit unpredictable, chaotic trajectories over time.
            </p>
          </div>
        </div>
      </header>

      {/* 3D Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <canvas 
          ref={canvasRef}
          className="block w-full h-full outline-none"
        />
        
        {/* Interaction Hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none text-xs text-slate-500 flex items-center gap-4 bg-slate-900/40 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-800/50">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
            Drag to rotate
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Scroll to zoom
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="absolute top-24 right-6 z-10 w-80 bg-[#0a1020]/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-5 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Parameters</h2>
          <button 
            onClick={resetView}
            className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
            title="Reset View & Particles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Sigma Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-400 font-mono">σ (Sigma) : PRANDTL</label>
              <span className="text-cyan-400 font-mono">{params.sigma.toFixed(1)}</span>
            </div>
            <input 
              type="range" min="0" max="30" step="0.1" 
              value={params.sigma} 
              onChange={(e) => handleParamChange('sigma', parseFloat(e.