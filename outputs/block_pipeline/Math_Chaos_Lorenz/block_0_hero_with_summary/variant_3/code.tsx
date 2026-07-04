import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle subtle 3D tilt effect on the card based on mouse movement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  // Lorenz Attractor Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Lorenz parameters
    const sigma = 10;
    const rho = 28;
    const beta = 8 / 3;
    const dt = 0.004;

    // Initialize 3 particles with tiny perturbations to show chaos/butterfly effect
    const particles = [
      { x: 0.1, y: 0, z: 0, color: '#22d3ee', shadow: 'rgba(34, 211, 238, 0.8)' },      // Cyan
      { x: 0.1001, y: 0, z: 0, color: '#c084fc', shadow: 'rgba(192, 132, 252, 0.8)' },   // Purple
      { x: 0.1002, y: 0, z: 0, color: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.8)' }     // Blue
    ];

    // Warm up the system so it starts in the attractor rather than at the origin
    for (let p of particles) {
      for (let i = 0; i < 500; i++) {
        const dx = sigma * (p.y - p.x) * dt;
        const dy = (p.x * (rho - p.z) - p.y) * dt;
        const dz = (p.x * p.y - beta * p.z) * dt;
        p.x += dx; p.y += dy; p.z += dz;
      }
    }

    // Projection variables
    let scale = Math.min(width, height) / 60;
    let angle = 0;

    const draw = () => {
      // Midnight background with fade for glow trails
      ctx.fillStyle = 'rgba(5, 5, 15, 0.08)';
      ctx.fillRect(0, 0, width, height);

      // Rotate projection slightly over time
      angle += 0.002;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      particles.forEach((p) => {
        // RK4-like or simple Euler update (using simple Euler for high FPS visual)
        const dx = sigma * (p.y - p.x) * dt;
        const dy = (p.x * (rho - p.z) - p.y) * dt;
        const dz = (p.x * p.y - beta * p.z) * dt;

        const nextX = p.x + dx;
        const nextY = p.y + dy;
        const nextZ = p.z + dz;

        // 3D to 2D Projection with rotation around Z axis
        const rotX1 = p.x * cosA - p.y * sinA;
        const rotY1 = p.x * sinA + p.y * cosA;
        
        const rotX2 = nextX * cosA - nextY * sinA;
        const rotY2 = nextX * sinA + nextY * cosA;

        // Screen mapping
        const screenX1 = width / 2 + rotX1 * scale * 1.5;
        const screenY1 = height - (height * 0.2) - p.z * scale * 1.2;
        
        const screenX2 = width / 2 + rotX2 * scale * 1.5;
        const screenY2 = height - (height * 0.2) - nextZ * scale * 1.2;

        ctx.beginPath();
        ctx.moveTo(screenX1, screenY1);
        ctx.lineTo(screenX2, screenY2);
        
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.shadow;
        ctx.stroke();

        // Update state
        p.x = nextX;
        p.y = nextY;
        p.z = nextZ;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section 
      className="relative min-h-screen bg-[#05050f] overflow-hidden flex items-center text-slate-200 font-sans"
      onMouseMove={handleMouseMove}
    >
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Decorative ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/20 blur-[120px] rounded-full z-0 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full z-0 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left column: Hero Text & Summary */}
        <div className="lg:col-span-7 flex flex-col space-y-8">
          <div className="inline-flex items-center space-x-2 border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md px-4 py-1.5 rounded-full w-fit">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">Interactive Math Visualizer</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[1.1]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
              Lorenz Attractor
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              Studio
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
            Dive into the delicate beauty of chaos theory. Visualize chaotic trajectories in a 3D-projected space, tweak system parameters in real-time, and witness the butterfly effect through beautiful, glowing midnight projections.
          </p>

          {/* Quick Summary Features */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            {[
              "Real-time RK4 Integration",
              "Parameter Sensitivity",
              "Poincaré Section Views",
              "Shareable URL Configurations"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-slate-300">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]">
              <span className="relative z-10 flex items-center justify-center">
                Launch Studio
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </span>
            </button>
            <button className="px-8 py-4 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold rounded-lg transition-colors duration-300 backdrop-blur-sm">
              View Equations
            </button>
          </div>
        </div>

        {/* Right column: Interactive Visual Info Card */}
        <div 
          ref={containerRef}
          className="lg:col-span-5 hidden lg:block perspective-1000"
        >
          <div 
            className="p-8 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl transition-transform duration-200 ease-out"
            style={{ 
              transform: `rotateX(${mousePos.y * 10}deg) rotateY(${mousePos.x * 10}deg)` 
            }}
          >
            <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
              </svg>
              System Parameters
            </h3>
            
            <div className="space-y-6">
              {/* Mock sliders for the hero visual */}
              {[
                { label: "Prandtl Number (σ)", value: "10.0", color: "bg-cyan-400", pct: "30%" },
                { label: "Rayleigh Number (ρ)", value: "28.0", color: "bg-blue-400", pct: "50%" },
                { label: "Physical Proportion (β)", value: "8/3", color: "bg-purple-400", pct: "20%" }
              ].map((param, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">{param.label}</span>
                    <span className="text-slate-200 font-mono">{param.value}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${param.color} shadow-[0_0_10px_currentColor]`} 
                      style={{ width: param.pct }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                <span className="text-pink-400">dx/dt</span> = σ(y - x)<br/>
                <span className="text-pink-400">dy/dt</span> = x(ρ - z) - y<br/>
                <span className="text-pink-400">dz/dt</span> = xy - βz
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}