import React, { useState, useEffect } from 'react';
import { Activity, ArrowRight, BookOpen, Orbit, Sparkles } from 'lucide-react';

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState({ x: 1.0, y: 1.0, z: 1.0 });

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Mock chaotic coordinate fluctuations for the hero background effect
    const interval = setInterval(() => {
      setMetrics({
        x: Number((Math.random() * 20 - 10).toFixed(4)),
        y: Number((Math.random() * 30 - 15).toFixed(4)),
        z: Number((Math.random() * 40).toFixed(4)),
      });
    }, 150);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans selection:bg-cyan-900 selection:text-cyan-50">
      
      {/* Background Glow Trails (Midnight Palette) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      >
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        
        {/* Floating Top Nav / Readout */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start text-xs font-mono text-cyan-400/60 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2"><Activity size={14} className="animate-pulse" /> SYS_ONLINE</span>
            <span>RK4_STEPS: MAX_CAP</span>
          </div>
          <div className="text-right flex flex-col gap-1">
            <span>x: {metrics.x > 0 ? '+' : ''}{metrics.x.toFixed(4)}</span>
            <span>y: {metrics.y > 0 ? '+' : ''}{metrics.y.toFixed(4)}</span>
            <span>z: {metrics.z > 0 ? '+' : ''}{metrics.z.toFixed(4)}</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className={`max-w-4xl w-full flex flex-col items-center text-center transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-cyan-950/30 border border-cyan-800/50 backdrop-blur-md shadow-[0_0_15px_rgba(8,145,178,0.2)]">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-xs font-medium text-cyan-300 tracking-wider uppercase">ChatGPT Edition • Variant V</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 drop-shadow-sm">
            Lorenz Attractor <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400">
               Studio
            </span>
          </h1>

          <p className="max-w-2xl text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed font-light">
            Explore the delicate balance of deterministic chaos. Adjust parameters, visualize 3D trajectories in real-time, and uncover the beautiful mathematical anomalies discovered by Edward Lorenz.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-cyan-600 text-white font-semibold rounded-lg overflow-hidden transition-all hover:scale-105 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#030712] shadow-[0_0_40px_rgba(8,145,178,0.4)]">
              <div className="absolute inset-0 w-full h-full -x-translate-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              <Orbit size={20} className="group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
              <span>Initialize Simulation</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900/50 text-slate-300 font-semibold rounded-lg border border-slate-800 backdrop-blur-sm transition-all hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2 focus:ring-offset-[#030712]">
              <BookOpen size={20} />
              <span>Review Theory</span>
            </button>
          </div>

          {/* Quick Param preview */}
          <div className="mt-16 grid grid-cols-3 gap-4 w-full max-w-lg border-t border-slate-800/50 pt-8">
            <div className="flex flex-col items-center">
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">Prandtl (σ)</span>
              <span className="text-2xl font-light text-slate-300">10.0</span>
            </div>
            <div className="flex flex-col items-center border-l border-r border-slate-800/50">
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">Rayleigh (ρ)</span>
              <span className="text-2xl font-light text-slate-300">28.0</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">Beta (β)</span>
              <span className="text-2xl font-light text-slate-300">8/3</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}