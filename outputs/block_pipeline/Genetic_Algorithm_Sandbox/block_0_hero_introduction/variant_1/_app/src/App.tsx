import React, { useEffect, useRef, useState } from 'react';

const DnaIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 15c6.667-6 13.333 0 20-6" />
    <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
    <path d="M17 18.5l-2.5-2.5" />
    <path d="M14 16.5l-2.5-2.5" />
    <path d="M7 5.5l2.5 2.5" />
    <path d="M10 7.5l2.5 2.5" />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Canvas background animation: "Primordial Soup / Gene Pool"
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = Math.min(window.innerWidth / 10, 100);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseColor: string;
      fitness: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 2.5 + 1;
        this.fitness = Math.random();
        
        // Organic greens and blues
        const colors = [
          'rgba(16, 185, 129,', // emerald
          'rgba(6, 182, 212,',  // cyan
          'rgba(52, 211, 153,'  // light green
        ];
        this.baseColor = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

        // Randomly "mutate" direction slightly
        if (Math.random() < 0.01) {
          this.vx += (Math.random() - 0.5) * 0.5;
          this.vy += (Math.random() - 0.5) * 0.5;
        }

        // Speed limit
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 1.5) {
          this.vx = (this.vx / speed) * 1.5;
          this.vy = (this.vy / speed) * 1.5;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${this.baseColor} ${this.fitness * 0.8 + 0.2})`;
        ctx.fill();
        
        // Glow effect for high fitness
        if (this.fitness > 0.8) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = this.baseColor.replace(',', ')').replace('rgba', 'rgb');
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Connect nearby particles ("Crossover" visualization)
          if (distance < 120) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            const opacity = 1 - distance / 120;
            ctx!.strokeStyle = `rgba(16, 185, 129, ${opacity * 0.2})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      drawConnections();
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    initParticles();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#020b14] overflow-hidden font-sans text-slate-200 flex flex-col items-center justify-center">
      {/* Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none opacity-80"
      />

      {/* Radial Gradient Overlay for depth */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,rgba(2,11,20,0.8)_100%)] pointer-events-none" />

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center text-center">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-sm font-medium tracking-wide mb-8 backdrop-blur-sm animate-fade-in-up">
          <DnaIcon className="w-4 h-4" />
          <span>Bio-Inspired Computing</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-lg">
          <span className="block text-slate-100 mb-2">Genetic Algorithm</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300">
            Sandbox
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          Visualize the power of evolution. Watch as populations undergo selection, crossover, and mutation to solve complex optimization problems in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full transition-all duration-300 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] hover:-translate-y-1"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <PlayIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span>Initialize Population</span>
          </button>
          
          <button className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 font-semibold rounded-full border border-slate-700 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm">
            Explore Theory
          </button>
        </div>

        {/* Feature Highlights / Problem Selectors Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {[
            { title: "Knapsack Problem", desc: "Optimize resource allocation under strict constraints.", icon: "🎒" },
            { title: "Travelling Salesman", desc: "Find the shortest route connecting a set of nodes.", icon: "🗺️" },
            { title: "Function Maximization", desc: "Navigate complex 3D landscapes to find the global peak.", icon: "📈" }
          ].map((feature, idx) => (
            <div 
              key={idx}
              className="group flex flex-col items-center p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/30 transition-colors duration-300 backdrop-blur-md"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 group-hover:bg-emerald-900/50 text-2xl mb-4 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-slate-200 font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

      </main>

      {/* Global Styles for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}