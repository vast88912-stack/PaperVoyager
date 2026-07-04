import React, { useState, useEffect } from 'react';
import { Terminal, Play, Cpu, Waypoints, ChevronRight, Activity } from 'lucide-react';

// Custom hook for typewriter effect
const useTypewriter = (text: string, speed: number = 30, delay: number = 0) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (started && count < text.length) {
      const timeout = setTimeout(() => setCount((c) => c + 1), speed);
      return () => clearTimeout(timeout);
    }
  }, [count, text, speed, started]);

  return text.slice(0, count);
};

export default function App() {
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [systemReady, setSystemReady] = useState(false);

  const missionText = "MISSION: Visualize and analyze advanced pathfinding algorithms. Compare BFS, Dijkstra, A*, and Bidirectional Search in real-time. Map the unknown. Optimize the frontier.";
  const typedMission = useTypewriter(missionText, 25, 800);

  // Handle the start sequence
  useEffect(() => {
    if (isBooting) {
      const interval = setInterval(() => {
        setBootProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setSystemReady(true), 400);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isBooting]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden relative flex items-center justify-center selection:bg-cyan-500/30">
      {/* Inject custom styles for animations */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scanline {
          animation: scanline 6s linear infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px -5px rgba(34, 211, 238, 0.4); }
          50% { box-shadow: 0 0 30px 5px rgba(34, 211, 238, 0.7); }
        }
        .neon-box {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* Futuristic Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #06b6d4 1px, transparent 1px),
            linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(circle at center, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 80%)'
        }}
      />

      {/* Scanning Line Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="w-full h-32 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-scanline" />
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Main Hero Content */}
      <div className={`relative z-10 w-full max-w-3xl p-8 transition-all duration-1000 ${isBooting && systemReady ? 'scale-105 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
        
        {/* Top Status Bar */}
        <div className="flex items-center justify-between mb-12 text-xs font-mono tracking-widest text-cyan-500/70">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>SYS.STATUS: <span className="text-cyan-400">ONLINE</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span>SEED: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        {/* Title Section */}
        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm font-mono mb-4">
            <Cpu className="w-4 h-4" />
            <span>ALGORITHM VISUALIZER v2.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-600 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            PATHFINDING <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">PLAYGROUND</span>
          </h1>
        </div>

        {/* Mission Text (Typewriter) */}
        <div className="h-24 mb-12">
          <p className="text-lg md:text-xl text-slate-400 font-mono leading-relaxed border-l-2 border-cyan-500/50 pl-6">
            {typedMission}
            <span className="inline-block w-2 h-5 ml-1 bg-cyan-400 animate-pulse align-middle" />
          </p>
        </div>

        {/* Interactive Start Section */}
        <div className="relative">
          {!isBooting ? (
            <button
              onClick={() => setIsBooting(true)}
              className="group relative inline-flex items-center gap-4 px-8 py-4 bg-slate-900/80 border border-cyan-500/50 rounded-none overflow-hidden transition-all hover:bg-cyan-950/50 neon-box"
            >
              {/* Button Hover Background Effect */}
              <div className="absolute inset-0 w-0 bg-cyan-500/20 transition-all duration-500 ease-out group-hover:w-full" />
              
              <div className="relative flex items-center gap-3 text-cyan-400 font-mono text-lg font-bold tracking-widest uppercase">
                <Waypoints className="w-6 h-6 group-hover:animate-spin" style={{ animationDuration: '3s' }} />
                <span>Initialize Grid</span>
                <ChevronRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </div>
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
            </button>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <div className="flex justify-between text-sm font-mono text-cyan-400">
                <span>BOOTING ENVIRONMENT...</span>
                <span>{Math.min(bootProgress, 100)}%</span>
              </div>
              <div className="h-1 w-full bg-slate-800 overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-150 ease-out"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-slate-500 h-4">
                {bootProgress < 30 && "> Loading heuristics..."}
                {bootProgress >= 30 && bootProgress < 70 && "> Generating coordinate matrix..."}
                {bootProgress >= 70 && bootProgress < 100 && "> Calibrating weights..."}
                {bootProgress >= 100 && "> System Ready. Transferring control."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Side Elements */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 opacity-30">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-1 h-8 border-l border-cyan-500" />
        ))}
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 opacity-30 items-end">
        <div className="text-xs font-mono text-cyan-500 rotate-90 origin-right translate-x-4 mb-12">
          SEQ-01 // HERO_MODULE
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-1 h-2 bg-cyan-500" />
        ))}
      </div>
    </div>
  );
}