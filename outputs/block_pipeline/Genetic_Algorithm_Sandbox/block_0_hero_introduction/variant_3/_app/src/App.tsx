import React, { useEffect, useRef, useState } from 'react';

// --- Types & Interfaces ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isMutating: boolean;
  mutationTimer: number;
}

// --- Helper Functions ---
const getRandomColor = () => {
  const colors = [
    '#10b981', // emerald-500
    '#34d399', // emerald-400
    '#0ea5e9', // sky-500
    '#38bdf8', // sky-400
    '#06b6d4', // cyan-500
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const createParticle = (width: number, height: number): Particle => ({
  x: Math.random() * width,
  y: Math.random() * height,
  vx: (Math.random() - 0.5) * 1.5,
  vy: (Math.random() - 0.5) * 1.5,
  radius: Math.random() * 2.5 + 1,
  color: getRandomColor(),
  isMutating: Math.random() > 0.95,
  mutationTimer: Math.random() * 100,
});

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // --- Canvas Animation Logic ---
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
      // Re-initialize particles on resize to ensure good distribution
      particles = Array.from({ length: Math.floor((window.innerWidth * window.innerHeight) / 12000) }, () =>
        createParticle(canvas.width, canvas.height)
      );
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Organic background gradient fill (subtle)
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
      );
      gradient.addColorStop(0, 'rgba(6, 41, 43, 0)');
      gradient.addColorStop(1, 'rgba(2, 17, 27, 0.4)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((p, i) => {
        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls organically
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mutation simulation (brief flashes of brightness)
        p.mutationTimer -= 1;
        if (p.mutationTimer <= 0) {
          p.isMutating = Math.random() > 0.98;
          p.mutationTimer = p.isMutating ? 50 : Math.random() * 200 + 100;
        }

        // Draw connections (crossover representation)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 120;
          if (distance < maxDist) {
            ctx.beginPath();
            ctx.strokeStyle = p.isMutating || p2.isMutating 
              ? `rgba(52, 211, 153, ${0.4 * (1 - distance / maxDist)})` 
              : `rgba(14, 165, 233, ${0.15 * (1 - distance / maxDist)})`;
            ctx.lineWidth = p.isMutating || p2.isMutating ? 1.5 : 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw particle (Gene)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.isMutating ? p.radius * 2 : p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isMutating ? '#fff' : p.color;
        
        // Glow effect
        ctx.shadowBlur = p.isMutating ? 15 : 5;
        ctx.shadowColor = p.color;
        ctx.fill();
        
        // Reset shadow for next operations
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#02111b] via-[#041a2f] to-[#01141a] font-sans">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Hero Content Container */}
      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-emerald-500/20 backdrop-blur-md mb-8 animate-fade-in-down shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium tracking-wide text-emerald-200">
            ChatGPT Edition • Interactive Sandbox
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
          Evolve Solutions Through <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 animate-gradient-x">
            Natural Selection
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-300 mb-10 leading-relaxed drop-shadow">
          An AI-assisted, bio-inspired computing visualizer. Watch digital chromosomes crossover, mutate, and survive to solve complex optimization challenges like the Knapsack Problem and TSP.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Primary CTA */}
          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-slate-900 transition-all duration-300 bg-emerald-400 rounded-full hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] overflow-hidden w-full sm:w-auto"
          >
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <svg
              className={`w-5 h-5 mr-2 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span className="relative">Start Evolving</span>
          </button>

          {/* Secondary CTA */}
          <button className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-emerald-300 transition-all duration-300 bg-slate-900/50 border border-emerald-500/30 rounded-full hover:bg-slate-800/80 hover:text-emerald-200 hover:border-emerald-400/50 backdrop-blur-md focus:outline-none focus:ring-4 focus:ring-emerald-500/20 w-full sm:w-auto">
            <svg 
              className="w-5 h-5 mr-2 opacity-70" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Configure Parameters
          </button>
        </div>
      </div>

      {/* Floating Info Cards (Decorative Hero Elements) */}
      <div className="absolute bottom-10 left-0 right-0 hidden lg:flex justify-center gap-6 px-10 z-10 pointer-events-none">
        
        <div className="bg-[#041a2f]/60 backdrop-blur-lg border border-cyan-900/50 rounded-2xl p-4 w-64 shadow-xl transform -rotate-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Mutation Rate</h3>
          </div>
          <p className="text-xs text-slate-400">Introduce random genetic changes to maintain population diversity.</p>
        </div>

        <div className="bg-[#041a2f]/60 backdrop-blur-lg border border-cyan-900/50 rounded-2xl p-4 w-64 shadow-xl transform translate-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Crossover</h3>
          </div>
          <p className="text-xs text-slate-400">Combine traits from elite parents to produce superior offspring.</p>
        </div>

        <div className="bg-[#041a2f]/60 backdrop-blur-lg border border-cyan-900/50 rounded-2xl p-4 w-64 shadow-xl transform rotate-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Fitness Graph</h3>
          </div>
          <p className="text-xs text-slate-400">Monitor live performance as the population converges on optimums.</p>
        </div>

      </div>

      {/* Global CSS for Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 6s ease infinite;
        }
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }
      `}} />
    </div>
  );
}