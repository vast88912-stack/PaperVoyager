import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Math & RK4 Integration ---

interface Point3D {
  x: number;
  y: number;
  z: number;
}

const RK4_STEP = (
  p: Point3D,
  sigma: number,
  rho: number,
  beta: number,
  dt: number
): Point3D => {
  const { x, y, z } = p;

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
    z: z + (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4),
  };
};

// --- Main Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parameters
  const [sigma, setSigma] = useState<number>(10);
  const [rho, setRho] = useState<number>(28);
  const [beta, setBeta] = useState<number>(8 / 3);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Simulation State
  const pointsRef = useRef<Point3D[]>([]);
  const drawCountRef = useRef<number>(0);
  const MAX_STEPS = 12000;
  const DT = 0.008;

  // Camera / Interaction State
  const rotationRef = useRef({ yaw: 0.5, pitch: 0.3 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Generate Trajectory
  const generateTrajectory = useCallback(() => {
    const pts: Point3D[] = [];
    let current: Point3D = { x: 0.1, y: 0, z: 0 }; // Initial slight perturbation

    for (let i = 0; i < MAX_STEPS; i++) {
      pts.push(current);
      current = RK4_STEP(current, sigma, rho, beta, DT);
    }
    pointsRef.current = pts;
    drawCountRef.current = 0; // Reset drawing animation
  }, [sigma, rho, beta]);

  // Re-generate when params change
  useEffect(() => {
    generateTrajectory();
  }, [generateTrajectory]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Midnight palette background with slight fade for motion blur effect
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, width, height);

      const pts = pointsRef.current;
      if (pts.length === 0) return;

      // Animate drawing
      if (isPlaying && drawCountRef.current < MAX_STEPS) {
        drawCountRef.current += 40; // Speed of drawing
        if (drawCountRef.current > MAX_STEPS) drawCountRef.current = MAX_STEPS;
      }

      const { yaw, pitch } = rotationRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Center of Lorenz Attractor roughly
      const cx = 0;
      const cy = 0;
      const cz = 25;

      const scale = Math.min(width, height) / 60;
      const focalLength = 800;
      const cameraZ = 100;

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.2;

      // We draw in segments to allow color gradients based on Z-depth or speed
      for (let i = 1; i < drawCountRef.current; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];

        // Translate to center
        let x1 = p1.x - cx;
        let y1 = p1.y - cy;
        let z1 = p1.z - cz;

        let x2 = p2.x - cx;
        let y2 = p2.y - cy;
        let z2 = p2.z - cz;

        // Rotate Y (Yaw)
        let tx1 = x1 * cosY - z1 * sinY;
        let tz1 = z1 * cosY + x1 * sinY;
        let tx2 = x2 * cosY - z2 * sinY;
        let tz2 = z2 * cosY + x2 * sinY;

        // Rotate X (Pitch)
        let ty1 = y1 * cosP - tz1 * sinP;
        let ttz1 = tz1 * cosP + y1 * sinP;
        let ty2 = y2 * cosP - tz2 * sinP;
        let ttz2 = tz2 * cosP + y2 * sinP;

        // Project to 2D
        const zScale1 = focalLength / (focalLength + ttz1 + cameraZ);
        const zScale2 = focalLength / (focalLength + ttz2 + cameraZ);

        const px1 = width / 2 + tx1 * scale * zScale1;
        const py1 = height / 2 + ty1 * scale * zScale1;
        const px2 = width / 2 + tx2 * scale * zScale2;
        const py2 = height / 2 + ty2 * scale * zScale2;

        // Color mapping based on position and index
        const hue = (i / MAX_STEPS) * 120 + 180; // Cyan to Purple/Blue
        const alpha = Math.min(1, (i / drawCountRef.current) + 0.1);
        
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha * 0.6})`;
        ctx.stroke();
      }

      // Draw a glowing head at the current leading point
      if (drawCountRef.current > 0 && drawCountRef.current < MAX_STEPS) {
        const headIdx = drawCountRef.current - 1;
        const headP = pts[headIdx];
        
        let hx = headP.x - cx;
        let hy = headP.y - cy;
        let hz = headP.z - cz;

        let thx = hx * cosY - hz * sinY;
        let thz = hz * cosY + hx * sinY;
        let thy = hy * cosP - thz * sinP;
        let tthz = thz * cosP + hy * sinP;

        const hzScale = focalLength / (focalLength + tthz + cameraZ);
        const hpx = width / 2 + thx * scale * hzScale;
        const hpy = height / 2 + thy * scale * hzScale;

        ctx.beginPath();
        ctx.arc(hpx, hpy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(hpx, hpy, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Handle Resize
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

  // Mouse / Touch Interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    
    rotationRef.current.yaw += dx * 0.01;
    rotationRef.current.pitch += dy * 0.01;
    
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full h-screen bg-[#02040a] text-slate-200 font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          Lorenz Attractor Studio
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          Interactive 3D projection of chaotic trajectories. Drag to rotate the manifold.
        </p>
      </header>

      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Sigma Control */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Sigma (σ)</label>
              <span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-cyan-100">{sigma.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="1" max="30" step="0.1" 
              value={sigma} 
              onChange={(e) => setSigma(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 leading-tight">Prandtl number. Controls the rate of heat transfer.</p>
          </div>

          {/* Rho Control */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Rho (ρ)</label>
              <span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-purple-100">{rho.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              min="1" max="100" step="0.5" 
              value={rho} 
              onChange={(e) => setRho(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 leading-tight">Rayleigh number. Drives the chaotic convection.</p>
          </div>

          {/* Beta Control */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Beta (β)</label>
              <span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-blue-100">{beta.toFixed(3)}</span>
            </div>
            <input 
              type="range" 
              min="0.5" max="5" step="0.01" 
              value={beta} 
              onChange={(e) => setBeta(parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 leading-tight">Physical proportions of the convection cell.</p>
          </div>

        </div>

        {/* Action Bar */}
        <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center">
          <button 
            onClick={() => {
              setSigma(10);
              setRho(28);
              setBeta(8/3);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-800"
          >
            Reset to Classic
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg ${
              isPlaying 
                ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-cyan-900/50' 
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-cyan-500/20'
            }`}
          >
            {isPlaying ? 'Pause Animation' : 'Resume Animation'}
          </button>
        </div>
      </div>
    </div>
  );
}