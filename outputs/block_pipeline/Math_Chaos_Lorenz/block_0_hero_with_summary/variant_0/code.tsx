import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ChevronDown, Sparkles, GitMerge, Share2, Settings2 } from 'lucide-react';

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Track mouse for dynamic glow effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generate authentic Lorenz attractor points for the background hero graphic
  const lorenzPath = useMemo(() => {
    let x = 0.1, y = 0, z = 0;
    const dt = 0.006;
    const sigma = 10, rho = 28, beta = 8 / 3;
    const pts = [];
    
    // Warm up to get onto the attractor
    for (let i = 0; i < 500; i++) {
      x += sigma * (y - x) * dt;
      y += (x * (rho - z) - y) * dt;
      z += (x * y - beta * z) * dt;
    }

    // Generate path points
    for (let i = 0; i < 3500; i++) {
      x += sigma * (y - x) * dt;
      y += (x * (rho - z) - y) * dt;
      z += (x * y - beta * z) * dt;
      
      // Scale and translate to fit a 1000x1000 viewBox
      // x range is approx [-20, 20], z range is approx [0, 50]
      const svgX = 500 + x * 18;
      const svgY = 850 - z * 14;
      pts.push(`${svgX},${svgY}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <div className="relative min-h-screen bg-[#05050a] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* Dynamic Mouse Glow */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(45, 212, 191, 0.07), transparent 40%)`,
        }}
      />

      {/* Abstract Lorenz Attractor Background Graphic */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 pointer-events-none">
        <svg 
          viewBox="0 0 1000 1000" 
          className="w-full h-full max-w-[1200px] object-contain animate-[pulse_8s_ease-in-out_infinite]"
          style={{ filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))' }}
        >
          <defs>
            <linearGradient id="lorenz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <polyline 
            points={lorenzPath} 
            fill="none" 
            stroke="url(#lorenz-grad)" 
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#glow)"
            className="opacity-60"
          />
        </svg>
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 mask-image:linear-gradient(to_bottom,transparent,black,transparent)" />

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-12 mx-auto max-w-7xl">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium tracking-wider uppercase border rounded-full text-cyan-400 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ChatGPT Edition</span>
        </div>

        {/* Hero Typography */}
        <div className="max-w-4xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 drop-shadow-sm">
            Lorenz Attractor <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 drop-shadow-[0_0_25px_rgba(139,92,246,0.4)]">
              Studio
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto mt-8 text-lg leading-relaxed text-slate-400 sm:text-xl">
            Explore the deterministic non-periodic flow of the Lorenz system. 
            Discover how microscopic perturbations in initial conditions lead to vastly divergent chaotic trajectories—the essence of the <strong className="font-semibold text-slate-200">Butterfly Effect</strong>.
          </p>
        </div>

        {/* Parameter Summary Cards */}
        <div className="grid grid-cols-1 gap-4 mt-12 sm:grid-cols-3 w-full max-w-3xl">
          {[
            { label: 'Prandtl Number', symbol: 'σ', value: '10.0', color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5' },
            { label: 'Rayleigh Number', symbol: 'ρ', value: '28.0', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5' },
            { label: 'Physical Proportions', symbol: 'β', value: '8/3', color: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bg: 'bg-fuchsia-500/5' }
          ].map((param, idx) => (
            <div 
              key={idx}
              className={`flex flex-col items-center p-4 border rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] ${param.border} ${param.bg}`}
            >
              <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">{param.label}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`font-serif text-2xl italic ${param.color}`}>{param.symbol}</span>
                <span className="text-xl font-mono text-slate-200">= {param.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-6 mt-16 sm:flex-row">
          <button 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white transition-all duration-300 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#05050a] shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] group"
          >
            <Activity className={`w-5 h-5 transition-transform duration-300 ${isHovering ? 'animate-pulse' : ''}`} />
            Initialize Simulation
            <div className="absolute inset-0 rounded-full opacity-0 ring-1 ring-white/50 group-hover:animate-ping" />
          </button>
          
          <div className="flex gap-4">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors border rounded-full text-slate-300 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white backdrop-blur-sm">
              <Settings2 className="w-4 h-4" />
              Parameters
            </button>
            <button className="inline-flex items-center justify-center w-12 h-12 transition-colors border rounded-full text-slate-300 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white backdrop-blur-sm">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute flex flex-col items-center gap-2 bottom-8 animate-bounce text-slate-500">
          <span className="text-xs font-medium tracking-widest uppercase">Scroll to explore</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </main>
      
      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-[#05050a] to-transparent z-10" />
    </div>
  );
}