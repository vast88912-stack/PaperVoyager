import React, { useState, useEffect } from 'react';

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 overflow-hidden font-sans text-slate-100 flex flex-col justify-center items-center selection:bg-cyan-500/30">
      
      {/* Dynamic Background Glows */}
      <div 
        className="absolute inset-0 z-0 opacity-40 transition-opacity duration-1000"
        style={{ opacity: mounted ? 0.6 : 0 }}
      >
        <div 
          className="absolute w-[800px] h-[800px] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen transition-transform duration-700 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.5 - 20}%, ${mousePos.y * 0.5 - 20}%)` }}
        />
        <div 
          className="absolute right-0 bottom-0 w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[100px] mix-blend-screen transition-transform duration-1000 ease-out"
          style={{ transform: `translate(-${mousePos.x * 0.3}%, -${mousePos.y * 0.3}%)` }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] bg-indigo-900/30 rounded-full blur-[150px] mix-blend-screen animate-pulse"
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-6xl px-6 py-20 mx-auto text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-sm font-medium border rounded-full text-cyan-400 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-cyan-400"></span>
            <span className="relative inline-flex w-2 h-2 rounded-full bg-cyan-500"></span>
          </span>
          ChatGPT Edition
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 drop-shadow-[0_0_30px_rgba(167,139,250,0.3)]">
          Lorenz Attractor Studio
        </h1>

        {/* Summary */}
        <p className="max-w-2xl mb-10 text-lg md:text-xl text-slate-400 leading-relaxed">
          Dive into the beautiful chaos of the Lorenz system. Discover how tiny perturbations in initial conditions lead to vastly different trajectories—the heart of the <span className="text-slate-200 font-semibold">Butterfly Effect</span>. 
        </p>

        {/* Equations Card */}
        <div className="relative group mb-12">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="relative flex flex-col md:flex-row gap-8 items-center justify-center px-8 py-6 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
            <div className="flex flex-col items-start gap-2 font-mono text-lg md:text-xl text-slate-300">
              <div className="flex items-center gap-4">
                <span className="text-cyan-400 font-bold">dx/dt</span>
                <span>=</span>
                <span>σ(y - x)</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-indigo-400 font-bold">dy/dt</span>
                <span>=</span>
                <span>x(ρ - z) - y</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-fuchsia-400 font-bold">dz/dt</span>
                <span>=</span>
                <span>xy - βz</span>
              </div>
            </div>
            
            <div className="hidden md:block w-px h-24 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
            
            <div className="flex flex-col items-start text-sm text-slate-500 font-mono gap-1">
              <p>Default Parameters:</p>
              <p>σ (Prandtl) = <span className="text-cyan-300">10.0</span></p>
              <p>ρ (Rayleigh) = <span className="text-indigo-300">28.0</span></p>
              <p>β (Geometric) = <span className="text-fuchsia-300">8/3</span></p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button className="relative inline-flex group">
            <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
            <div className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-slate-950 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 gap-3">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Initialize Simulation
            </div>
          </button>
          
          <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-slate-300 transition-all duration-200 bg-transparent border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 focus:ring-offset-slate-950 gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Copy Share URL
          </button>
        </div>

      </main>

      {/* Decorative Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-20 pointer-events-none" />
    </div>
  );
}