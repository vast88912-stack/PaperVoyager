import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- RK4 Math Helpers ---
const lorenzDerivatives = (x: number, y: number, z: number, sigma: number, rho: number, beta: number) => {
  return {
    dx: sigma * (y - x),
    dy: x * (rho - z) - y,
    dz: x * y - beta * z,
  };
};

const stepRK4 = (
  x: number, y: number, z: number,
  sigma: number, rho: number, beta: number,
  dt: number
) => {
  const k1 = lorenzDerivatives(x, y, z, sigma, rho, beta);
  
  const x2 = x + 0.5 * dt * k1.dx;
  const y2 = y + 0.5 * dt * k1.dy;
  const z2 = z + 0.5 * dt * k1.dz;
  const k2 = lorenzDerivatives(x2, y2, z2, sigma, rho, beta);
  
  const x3 = x + 0.5 * dt * k2.dx;
  const y3 = y + 0.5 * dt * k2.dy;
  const z3 = z + 0.5 * dt * k2.dz;
  const k3 = lorenzDerivatives(x3, y3, z3, sigma, rho, beta);
  
  const x4 = x + dt * k3.dx;
  const y4 = y + dt * k3.dy;
  const z4 = z + dt * k3.dz;
  const k4 = lorenzDerivatives(x4, y4, z4, sigma, rho, beta);

  return {
    x: x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    z: z + (dt / 6) * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz),
  };
};

// --- Types ---
interface Particle {
  x: number;
  y: number;
  z: number;
  color: string;
  history: [number, number, number][];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Lorenz Parameters
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(8 / 3);
  
  // 3D View State
  const rotationRef = useRef({ x: 0.3, y: -0.5 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  
  // Simulation State
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const autoRotateRef = useRef(true);

  // Initialize Particles
  const initParticles = useCallback((perturb: boolean = false) => {
    const base = { x: 0.1, y: 0.1, z: 0.1 };
    
    if (perturb) {
      // Multiple particles with tiny perturbations to show chaos
      particlesRef.current = [
        { ...base, color: '#00f3ff', history: [] }, // Cyan
        { x: base.x + 1e-4, y: base.y, z: base.z, color: '#ff00ea', history: [] }, // Magenta
        { x: base.x, y: base.y + 1e-4, z: base.z, color: '#fbff00', history: [] }, // Yellow
      ];
    } else {
      // Single particle
      particlesRef.current = [
        { ...base, color: '#00f3ff', history: [] }
      ];
    }
    
    // Clear canvas if it exists
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#05050A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Set up interaction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Resize handler
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.fillStyle = '#05050A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    initParticles(true);

    const dt = 0.006;
    const stepsPerFrame = 4;
    const focalLength = 400;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Fade effect for glow trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5, 5, 10, 0.08)';
      ctx.fillRect(0, 0, width, height);

      if (autoRotateRef.current) {
        rotationRef.current.y += 0.002;
      }

      const { x: rotX, y: rotY } = rotationRef.current;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project 3D to 2D
      const project = (px: number, py: number, pz: number) => {
        // Center attractor
        const cx = px;
        const cy = py;
        const cz = pz - 25;

        // Rotate Y
        const x1 = cx * cosY - cz * sinY;
        const z1 = cx * sinY + cz * cosY;

        // Rotate X
        const y1 = cy * cosX - z1 * sinX;
        const z2 = cy * sinX + z1 * cosX;

        // Perspective
        const scale = focalLength / (focalLength + z2 + 80);
        
        return {
          x: width / 2 + x1 * scale * 25,
          y: height / 2 + y1 * scale * 25,
          scale
        };
      };

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.5;

      particlesRef.current.forEach(p => {
        ctx.beginPath();
        
        let currX = p.x;
        let currY = p.y;
        let currZ = p.z;

        const startProj = project(currX, currY, currZ);
        ctx.moveTo(startProj.x, startProj.y);

        for (let i = 0; i < stepsPerFrame; i++) {
          const next = stepRK4(currX, currY, currZ, sigma, rho, beta, dt);
          currX = next.x;
          currY = next.y;
          currZ = next.z;
          
          const proj = project(currX, currY, currZ);
          ctx.lineTo(proj.x, proj.y);
        }

        p.x = currX;
        p.y = currY;
        p.z = currZ;

        ctx.strokeStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [sigma, rho, beta, initParticles]);

  return (
    <div className="relative w-full h-screen bg-[#05050A] overflow-hidden font-sans text-slate-200" ref={containerRef}>
      
      {/* 3D Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 w-80 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
            Lorenz Attractor
          </h1>
          <p className="text-xs text-slate-400 mt-1">3D Projection & Chaotic Trajectories</p>
        </div>

        <div className="space-y-5">
          {/* Sigma Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-cyan-400">Sigma (σ)</span>
              <span>{sigma.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="1" max="30" step="0.1" 
              value={sigma} onChange={(e) => setSigma(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Rho Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-fuchsia-400">Rho (ρ)</span>
              <span>{rho.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="1" max="50" step="0.1" 
              value={rho} onChange={(e) => setRho(parseFloat(e.target.value))}
              className="w-full accent-fuchsia-400 cursor-pointer"
            />
          </div>

          {/* Beta Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-yellow-400">Beta (β)</span>
              <span>{beta.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.5" max="10" step="0.01" 
              value={beta} onChange={(e) => setBeta(parseFloat(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col gap-3">
          <button 
            onClick={() => initParticles(true)}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff]" />
            <div className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#ff00ea]" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_#fbff00]" />
            Restart Chaos (3 Paths)
          </button>
          
          <button 
            onClick={() => initParticles(false)}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all"
          >
            Single Trajectory
          </button>
        </div>
      </div>

      {/* Interaction Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-500 tracking-widest uppercase pointer-events-none">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}