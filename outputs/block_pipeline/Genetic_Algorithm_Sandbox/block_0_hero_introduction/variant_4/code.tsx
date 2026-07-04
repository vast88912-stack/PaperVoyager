import React, { useEffect, useState } from 'react';
import { Dna, Play, GitMerge, Activity, Network, ChevronRight } from 'lucide-react';

const FloatingParticles = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const generated = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-emerald-500/20 blur-[1px]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `float ${p.duration}s infinite ease-in-out ${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, -30px) scale(1.2); opacity: 0.6; }
          50% { transform: translate(-10px, -50px) scale(0.9); opacity: 0.2; }
          75% { transform: translate(-30px, -20px) scale(1.1); opacity: 0.5; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px 2px rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 30px 5px rgba(20, 184, 166, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30 overflow-hidden flex flex-col">
      {/* Bioluminescent organic background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(13,148,136,0.15),rgba(15,23,42,1)_60%)] z-0" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyMCwgMTg0LCAxNjYsIDAuMDUpIi8+PC9zdmc+')] opacity-50 z-0" />
      
      <FloatingParticles />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-emerald-400">
          <Dna className="w-8 h-8 animate-pulse" />
          <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            GenAlgo.io
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#" className="hover:text-emerald-400 transition-colors">Sandbox</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Algorithms</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
          <button className="px-5 py-2 rounded-full border border-teal-500/30 hover:bg-teal-500/10 text-teal-300 transition-all duration-300">
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-6 py-12 w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          
          {/* Left Column: Text & CTAs */}
          <div className="flex flex-col items-start gap-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
              <Activity className="w-3 h-3" />
              <span>Interactive Evolution Sandbox</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight text-white">
              Simulate <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                Nature's Code.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-xl">
              Harness the power of bio-inspired computing. Watch as populations evolve in real-time through selection, crossover, and mutation to solve complex optimization problems.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full mt-4">
              <button className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <Play className="w-5 h-5 fill-current" />
                Initialize Population
              </button>
              
              <button className="group w-full sm:w-auto px-8 py-4 rounded-full font-bold text-slate-300 border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-900/20 transition-all duration-300 flex items-center justify-center gap-2">
                <Network className="w-5 h-5 text-emerald-400" />
                View Logic
              </button>
            </div>

            {/* Quick Stats / Features */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800 w-full mt-4">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black text-white">3</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Scenarios</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black text-white">∞</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Generations</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black text-white">60fps</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visualization</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Graphic */}
          <div className="relative w-full aspect-square max-w-lg mx-auto lg:ml-auto">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
            
            {/* Decorative Grid Container */}
            <div className="relative w-full h-full border border-teal-500/20 rounded-3xl bg-slate-900/50 backdrop-blur-md overflow-hidden flex items-center justify-center shadow-2xl p-8" style={{ animation: 'pulse-glow 4s infinite' }}>
              
              {/* Internal abstract visualization of crossover/mutation */}
              <div className="relative w-full h-full flex flex-col justify-center items-center gap-6">
                
                {/* Simulated Chromosome A */}
                <div className="flex gap-2 p-4 bg-slate-950/80 rounded-xl border border-emerald-900 shadow-lg transform -rotate-6 w-full opacity-80 animate-pulse">
                  {[1,0,1,1,0,0,1,0].map((gene, i) => (
                    <div key={`a-${i}`} className={`h-8 flex-1 rounded-md flex items-center justify-center text-xs font-mono border ${gene ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      {gene}
                    </div>
                  ))}
                </div>

                {/* Crossover Node */}
                <div className="flex items-center justify-center w-12 h-12 bg-teal-900/50 rounded-full border border-teal-400/50 relative z-10">
                  <GitMerge className="w-6 h-6 text-teal-300" />
                  <div className="absolute inset-0 border border-teal-400 rounded-full animate-ping opacity-20" />
                </div>

                {/* Simulated Chromosome B */}
                <div className="flex gap-2 p-4 bg-slate-950/80 rounded-xl border border-cyan-900 shadow-lg transform rotate-3 w-full opacity-80">
                  {[0,1,0,1,1,1,0,1].map((gene, i) => (
                    <div key={`b-${i}`} className={`h-8 flex-1 rounded-md flex items-center justify-center text-xs font-mono border ${gene ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                      {gene}
                    </div>
                  ))}
                </div>

                {/* Simulated Offspring (Result) */}
                <div className="mt-4 flex flex-col gap-2 w-full">
                  <div className="text-center text-xs text-teal-400/70 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
                    Generation N+1 <ChevronRight className="w-3 h-3" />
                  </div>
                  <div className="flex gap-2 p-4 bg-slate-900 rounded-xl border border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.2)] w-full">
                    {/* Crossover Result - Half A, Half B + 1 Mutation */}
                    {[1,0,1,1, 1,1,0,1].map((gene, i) => (
                      <div key={`child-${i}`} className={`relative h-10 flex-1 rounded-md flex items-center justify-center text-sm font-mono border transition-all duration-500
                        ${i === 6 ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 scale-110 shadow-[0_0_10px_rgba(244,63,94,0.4)]' // Mutation highlight
                        : gene ? 'bg-teal-500/30 border-teal-400 text-teal-200 shadow-[0_0_10px_rgba(45,212,191,0.2)]' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                        {i === 6 ? '1' : gene}
                        {i === 6 && <span className="absolute -top-6 text-[10px] text-rose-400 animate-bounce">MUT</span>}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}