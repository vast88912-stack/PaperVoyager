import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Fluid Particle System for Reset Effect ---
class FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.maxLife = Math.random() * 60 + 40;
    this.size = Math.random() * 15 + 5;
    this.color = color;
    this.drag = 0.92;
  }

  update() {
    // Add pseudo-fluid turbulence
    this.vx += Math.sin(this.y * 0.02) * 0.8;
    this.vy += Math.cos(this.x * 0.02) * 0.8;
    
    // Apply drag
    this.vx *= this.drag;
    this.vy *= this.drag;
    
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1 / this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.fill();
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const particlesRef = useRef<FluidParticle[]>([]);
  const animationFrameRef = useRef<number>();

  // Colors for the "dye" reset explosion
  const dyeColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981'];

  // Initialize and handle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      // Fade background slightly for fluid motion blur effect
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#030712'; // Tailwind gray-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';
      
      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const triggerReset = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isResetting) return;
    
    setIsResetting(true);
    setResetCount(prev => prev + 1);

    // Get button coordinates for the explosion origin
    const rect = e.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    // Spawn fluid particles
    const newParticles: FluidParticle[] = [];
    for (let i = 0; i < 150; i++) {
      const color = dyeColors[Math.floor(Math.random() * dyeColors.length)];
      newParticles.push(new FluidParticle(originX, originY, color));
    }
    particlesRef.current.push(...newParticles);

    // Reset state after animation
    setTimeout(() => {
      setIsResetting(false);
    }, 1200);
  }, [isResetting]);

  return (
    <div className="relative flex h-screen w-full bg-gray-950 text-gray-100 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* Background Canvas for Fluid Reset Effect */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Main Sandbox Area (Mocked for context) */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center border-r border-gray-800/60 bg-gray-900/20 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 border border-gray-700/50 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <svg className="w-10 h-10 text-cyan-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-gray-200">2D FLUID SANDBOX</h1>
            <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest">Stable Fluids on Grid</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-80 relative z-10 bg-gray-900/90 backdrop-blur-md p-6 flex flex-col gap-8 shadow-2xl border-l border-gray-800/60">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <h2 className="text-lg font-semibold tracking-wide text-gray-100">CONTROLS</h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>

        {/* Mock Settings */}
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-400 uppercase">
              <span>Viscosity</span>
              <span className="text-cyan-400">0.02</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-1/3 rounded-full" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-400 uppercase">
              <span>Diffusion</span>
              <span className="text-purple-400">0.001</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-1/5 rounded-full" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-400 uppercase">
              <span>Timestep</span>
              <span className="text-emerald-400">0.16</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-2/3 rounded-full" />
            </div>
          </div>
        </div>

        {/* --- THE RESET BUTTON MODULE --- */}
        <div className="mt-auto pt-6 border-t border-gray-800">
          <div className="mb-4 flex justify-between items-end">
            <span className="text-xs text-gray-500 uppercase tracking-wider">System Status</span>
            <span className="text-[10px] text-gray-600 font-mono">RESETS: {resetCount.toString().padStart(3, '0')}</span>
          </div>

          <button
            onClick={triggerReset}
            disabled={isResetting}
            className="group relative w-full flex items-center justify-center p-[1px] rounded-xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {/* Animated Gradient Border */}
            <span 
              className={`absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,1)_360deg)] transition-all duration-500
                ${isResetting ? 'animate-[spin_0.5s_linear_infinite] opacity-100' : 'animate-[spin_3s_linear_infinite] opacity-40 group-hover:opacity-100'}`} 
            />
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl group-hover:opacity-100 opacity-0 transition-opacity duration-500" />
            
            {/* Button Inner Content */}
            <div className="relative w-full bg-gray-900/90 backdrop-blur-sm rounded-xl px-6 py-4 flex items-center justify-center gap-3 transition-colors duration-300 group-hover:bg-gray-800/90">
              <svg 
                className={`w-5 h-5 transition-all duration-500 ${isResetting ? 'text-cyan-400 animate-spin' : 'text-gray-400 group-hover:text-cyan-400 group-hover:-rotate-90'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className={`font-bold tracking-widest text-sm transition-colors duration-300 ${isResetting ? 'text-cyan-400' : 'text-gray-300 group-hover:text-white'}`}>
                {isResetting ? 'RESETTING...' : 'RESET SCENE'}
              </span>
            </div>

            {/* Click Ripple Overlay */}
            <div className={`absolute inset-0 bg-cyan-500/20 rounded-xl transition-opacity duration-300 ${isResetting ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}