import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHoveringCTA, setIsHoveringCTA] = useState(false);

  // Biological/Organic Canvas Particle System
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseSize: number;
      color: string;
      angle: number;
      spin: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.baseSize = Math.random() * 2 + 1.5;
        this.size = this.baseSize;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.05;
        
        // Organic greens and blues
        const colors = ['#34d399', '#10b981', '#059669', '#38bdf8', '#0284c7'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.spin;

        // Gentle pulsing effect simulating breathing/living cells
        this.size = this.baseSize + Math.sin(this.angle) * 0.5;

        // Wrap around screen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
      }
    }

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((window.innerWidth * window.innerHeight) / 12000);
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Connect nearby particles simulating "crossover" or DNA links
          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            // Simulate curved organic bonds instead of straight lines
            ctx.quadraticCurveTo(
              particles[i].x + dx / 2 + Math.sin(Date.now() * 0.001) * 10, 
              particles[i].y + dy / 2 + Math.cos(Date.now() * 0.001) * 10, 
              particles[j].x, 
              particles[j].y
            );
            
            const opacity = 1 - distance / 120;
            ctx.strokeStyle = `rgba(16, 185, 129, ${opacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Deep organic gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#020617'); // Slate 950
      gradient.addColorStop(0.5, '#064e3b'); // Emerald 900
      gradient.addColorStop(1, '#082f49'); // Sky 900
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      drawConnections();

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col items-center justify-center">
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-6xl mx-auto">
        
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/40 border border-emerald-500/30 backdrop-blur-md mb-8 animate-fade-in-up">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-300 tracking-wide uppercase">Interactive Bio-Computing</span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-center tracking-tighter leading-tight mb-6 drop-shadow-2xl">
          Genetic Algorithm <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500">
            Sandbox
          </span>
        </h1>

        {/* Subtitle / Educator Text */}
        <p className="max-w-2xl text-lg md:text-xl text-center text-slate-300 mb-12 leading-relaxed drop-shadow-md font-light">
          Step into the primordial digital soup. Watch populations evolve in real-time as they solve complex optimization problems using the principles of natural selection.
        </p>

        {/* Educational Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full max-w-4xl">
          {[
            {
              title: "Selection",
              desc: "Survival of the fittest. The best solutions are chosen to breed the next generation.",
              icon: "🧬",
              color: "from-emerald-500/20 to-emerald-900/20",
              border: "border-emerald-500/30"
            },
            {
              title: "Crossover",
              desc: "Combining traits from parents to create offspring with potentially superior genes.",
              icon: "🔀",
              color: "from-cyan-500/20 to-cyan-900/20",
              border: "border-cyan-500/30"
            },
            {
              title: "Mutation",
              desc: "Random genetic alterations that introduce necessary diversity to the population.",
              icon: "⚡",
              color: "from-blue-500/20 to-blue-900/20",
              border: "border-blue-500/30"
            }
          ].map((card, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col items-center p-6 rounded-2xl bg-gradient-to-b ${card.color} border ${card.border} backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:shadow-emerald-500/20`}
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-center text-slate-300">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button 
            onMouseEnter={() => setIsHoveringCTA(true)}
            onMouseLeave={() => setIsHoveringCTA(false)}
            className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-lg tracking-wide transition-all duration-300 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)]"
          >
            {/* Bio-pulse background effect */}
            <div className={`absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0`}></div>
            <span className="relative z-10 flex items-center gap-2">
              Start Evolution
              <svg 
                className={`w-5 h-5 transition-transform duration-300 ${isHoveringCTA ? 'translate-x-1' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </button>
          
          <button className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-full font-semibold text-lg tracking-wide border border-slate-600/50 hover:border-slate-400 transition-all duration-300 backdrop-blur-md">
            View Source Code
          </button>
        </div>

      </div>

      {/* Decorative organic foreground blur */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none"></div>
    </div>
  );
}