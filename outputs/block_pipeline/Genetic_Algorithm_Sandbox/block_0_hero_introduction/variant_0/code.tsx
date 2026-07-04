import React, { useEffect, useRef, useState } from 'react';

const DnaIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 15c6.667-6 13.333 0 20-6" />
    <path d="M9 22c1.798-1.998 2.518-3.995 2.808-5.993" />
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.808 5.993" />
    <path d="m17 6-2.5-2.5" />
    <path d="m14 8-1-1" />
    <path d="m7 18 2.5 2.5" />
    <path d="m3.5 14.5.5.5" />
    <path d="m20 9 .5.5" />
    <path d="m6.5 12.5 1 1" />
    <path d="m16.5 10.5 1 1" />
    <path d="m10 16 1.5 1.5" />
  </svg>
);

const PlayIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const NetworkIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
    <path d="M12 12V8" />
  </svg>
);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generation, setGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(0.0);

  // Simulated generation ticker for the hero visual
  useEffect(() => {
    const interval = setInterval(() => {
      setGeneration((prev) => prev + 1);
      setBestFitness((prev) => Math.min(99.99, prev + Math.random() * 2));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Bio-inspired Canvas Background Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseX: number;
      baseY: number;

      constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
        const colors = ['#10b981', '#06b6d4', '#3b82f6', '#047857'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(width: number, height: number) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction (repel)
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          this.x -= dx * 0.02;
          this.y -= dy * 0.02;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000);
      particles = Array.from({ length: particleCount }, () => new Particle(canvas.width, canvas.height));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections (Crossover simulation)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Opacity based on distance
            const opacity = 1 - distance / 80;
            ctx.strokeStyle = `rgba(16, 185, 129, ${opacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      particles.forEach((particle) => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />

      {/* Radial Gradient Overlay for depth */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80" />

      {/* Navigation / Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl tracking-tight">
          <DnaIcon className="w-8 h-8" />
          <span>EvoSandbox</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
          <a href="#problems" className="hover:text-emerald-400 transition-colors">Problems</a>
          <a href="#docs" className="hover:text-emerald-400 transition-colors">Documentation</a>
        </nav>
        <button className="px-4 py-2 text-sm font-semibold text-slate-900 bg-emerald-500 rounded-full hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]">
          Launch App
        </button>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 text-center">
        
        {/* Live Stats Badge */}
        <div className="inline-flex items-center gap-4 px-4 py-2 mb-8 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono text-slate-300">Generation: {generation}</span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="text-xs font-mono text-emerald-400">
            Best Fitness: {bestFitness.toFixed(2)}%
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Explore the Power of <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient-x">
            Evolution Through Code
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          An interactive Genetic Algorithm Sandbox. Visualize selection, crossover, and mutation as they solve complex optimization problems in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1">
            <PlayIcon className="w-5 h-5 fill-slate-950" />
            Start Evolving
          </button>
          <button className="flex items-center gap-2 px-8 py-4 text-base font-bold text-slate-300 bg-slate-900/50 border border-slate-700 rounded-full hover:bg-slate-800 hover:text-white transition-all backdrop-blur-sm hover:-translate-y-1">
            <NetworkIcon className="w-5 h-5" />
            View Algorithms
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
          {[
            { title: 'Knapsack Problem', desc: 'Optimize resource allocation with weight constraints.', color: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20' },
            { title: 'Travelling Salesman', desc: 'Find the shortest possible route connecting multiple cities.', color: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20' },
            { title: 'Function Maximization', desc: 'Navigate complex 2D landscapes to find global peaks.', color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/20' },
          ].map((feature, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-2xl bg-gradient-to-b ${feature.color} border ${feature.border} backdrop-blur-md text-left hover:-translate-y-2 transition-transform duration-300 cursor-default`}
            >
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom fade out */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none" />
    </div>
  );
}