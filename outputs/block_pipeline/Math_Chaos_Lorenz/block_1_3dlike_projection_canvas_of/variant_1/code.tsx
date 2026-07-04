import React, { useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction and animation state
  const interaction = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const rotation = useRef({ yaw: 0.5, pitch: 0.3 });
  const animationRef = useRef<number>();

  // Lorenz system parameters
  const params = useRef({
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
    dt: 0.008,
  });

  // State of the system
  const state = useRef({
    x: 0.1,
    y: 0,
    z: 0,
    points: [] as { x: number; y: number; z: number }[],
    maxPoints: 4000,
  });

  // Runge-Kutta 4th Order Integration
  const rk4Step = () => {
    const { x, y, z } = state.current;
    const { sigma, rho, beta, dt } = params.current;

    const dx1 = sigma * (y - x);
    const dy1 = x * (rho - z) - y;
    const dz1 = x * y - beta * z;

    const x2 = x + 0.5 * dx1 * dt;
    const y2 = y + 0.5 * dy1 * dt;
    const z2 = z + 0.5 * dz1 * dt;

    const dx2 = sigma * (y2 - x2);
    const dy2 = x2 * (rho - z2) - y2;
    const dz2 = x2 * y2 - beta * z2;

    const x3 = x + 0.5 * dx2 * dt;
    const y3 = y + 0.5 * dy2 * dt;
    const z3 = z + 0.5 * dz2 * dt;

    const dx3 = sigma * (y3 - x3);
    const dy3 = x3 * (rho - z3) - y3;
    const dz3 = x3 * y3 - beta * z3;

    const x4 = x + dx3 * dt;
    const y4 = y + dy3 * dt;
    const z4 = z + dz3 * dt;

    const dx4 = sigma * (y4 - x4);
    const dy4 = x4 * (rho - z4) - y4;
    const dz4 = x4 * y4 - beta * z4;

    state.current.x += (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
    state.current.y += (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4);
    state.current.z += (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4);

    state.current.points.push({
      x: state.current.x,
      y: state.current.y,
      z: state.current.z,
    });

    if (state.current.points.length > state.current.maxPoints) {
      state.current.points.shift();
    }
  };

  // 3D to 2D Projection
  const project = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number
  ) => {
    // Center the attractor (Z usually ranges from 0 to 50)
    const cx = x;
    const cy = y;
    const cz = z - 25;

    const { yaw, pitch } = rotation.current;

    // Rotate around Y axis (Yaw)
    const x1 = cx * Math.cos(yaw) - cz * Math.sin(yaw);
    const z1 = cx * Math.sin(yaw) + cz * Math.cos(yaw);

    // Rotate around X axis (Pitch)
    const y1 = cy * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = cy * Math.sin(pitch) + z1 * Math.cos(pitch);

    // Perspective projection
    const distance = 100;
    const scale = distance / (distance + z2);

    // Screen coordinates
    const zoom = Math.min(width, height) * 0.012;
    const px = width / 2 + x1 * scale * zoom * 10;
    const py = height / 2 - y1 * scale * zoom * 10;

    return { px, py, pz: z2 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      // Compute multiple steps per frame for faster drawing
      for (let i = 0; i < 5; i++) {
        rk4Step();
      }

      // Clear with midnight palette background
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const projected = state.current.points.map((p) =>
        project(p.x, p.y, p.z, canvas.width, canvas.height)
      );

      // Draw the glowing trail
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Global glow settings
      ctx.globalCompositeOperation = 'screen';

      for (let i = 1; i < projected.length; i++) {
        const p1 = projected[i - 1];
        const p2 = projected[i];

        // Fade tail and color map based on position in array
        const progress = i / projected.length;
        
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);

        // Dynamic neon color map (Cyan to Purple to Pink)
        const hue = 190 + progress * 130;
        const alpha = Math.pow(progress, 1.5); // non-linear fade for better tail
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${alpha})`;
        ctx.lineWidth = 1.5 + progress * 2;
        
        // Add shadow only to the leading edge for performance
        if (i > projected.length - 100) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.8)`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Mouse / Touch Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    interaction.current.isDragging = true;
    interaction.current.lastX = e.clientX;
    interaction.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction.current.isDragging) return;

    const deltaX = e.clientX - interaction.current.lastX;
    const deltaY = e.clientY - interaction.current.lastY;

    rotation.current.yaw += deltaX * 0.005;
    rotation.current.pitch += deltaY * 0.005;

    // Clamp pitch to avoid flipping
    rotation.current.pitch = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, rotation.current.pitch)
    );

    interaction.current.lastX = e.clientX;
    interaction.current.lastY = e.clientY;
  };

  const handlePointerUp = () => {
    interaction.current.isDragging = false;
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 p-6 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 drop-shadow-md">
          Lorenz Attractor
        </h1>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          A 3D projection of the chaotic system. The glowing trail visualizes the
          trajectory over time.
        </p>
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-900/50 backdrop-blur-sm w-max">
          <svg
            className="w-4 h-4 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          Click and drag to rotate
        </div>
      </div>

      {/* Parameter Info Overlay */}
      <div className="absolute bottom-0 right-0 p-6 pointer-events-none text-right">
        <div className="flex flex-col gap-1 text-sm font-mono text-slate-500">
          <div className="flex justify-end gap-4">
            <span>σ (sigma)</span>
            <span className="text-slate-300 w-12">10.0</span>
          </div>
          <div className="flex justify-end gap-4">
            <span>ρ (rho)</span>
            <span className="text-slate-300 w-12">28.0</span>
          </div>
          <div className="flex justify-end gap-4">
            <span>β (beta)</span>
            <span className="text-slate-300 w-12">2.66</span>
          </div>
        </div>
      </div>
    </div>
  );
}