import React, { useState, useEffect } from 'react';
import { Terminal, Zap, ChevronRight, Activity, Network } from 'lucide-react';

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [textIndex, setTextIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  const missionLines = [
    "> INITIALIZING PATHFINDING PROTOCOLS...",
    "> LOADING GRID ENVIRONMENT...",
    "> CALIBRATING HEURISTICS (MANHATTAN, EUCLIDEAN)...",
    "> SYSTEM READY. AWAITING DIRECTIVE."
  ];

  useEffect(() => {
    if (textIndex < missionLines.length) {
      const timer = setTimeout(() => {
        setTextIndex(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setIsBooting(false), 800);
    }
  }, [textIndex]);

  const handleStart = () => {
    setIsStarted(true);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 overflow-hidden font-mono selection:bg-cyan-500/30">
      <style>{`
        @keyframes grid-flow {
          0% { transform: perspective(800px) rotateX(70deg) translateY(0px) scale(2.5); }
          100% { transform: perspective(800px) rotateX(70deg) translateY(4rem) scale(2.5); }
        }
        .animate-grid-flow {
          animation: grid-flow 2s linear infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px 2px rgba(34, 211, 238, 0.4); }
          50% { box-shadow: 0 0 25px 5px rgba(34, 211, 238, 0.7); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
      `}</style>

      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0)_0%,rgba(2,6,23,1)_80%)] z-10 pointer-events-none"></div>
      
      {/* 3D Moving Grid Floor */}
      <div className="absolute bottom-0 left-0 right-0 h-[70vh] overflow-hidden opacity-40 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#22d3ee_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee_1px,transparent_1px)] bg-[size:4rem_4rem] animate-grid-flow origin-bottom [mask-image:linear-gradient(to_top,black,transparent)]"></div>
      </div>

      {/* Subtle Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-10">
        <div className="w-full h-32 bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-scanline"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-30 flex flex-col items-center justify-center min-h-screen px-6">
        
        {/* Top Decorative Header */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center text-xs font-bold tracking-widest text-cyan-500/50">
          <div className="flex items-center gap-2">
            <Activity size={16} className="animate-pulse" />
            <span>SYS.OP.CORE // V2.0.4</span>
          </div>
          <div className="flex items-center gap-2">
            <span>SEED: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            <Network size={16} />
          </div>
        </div>

        {/* Hero Container */}
        <div className={`transition-all duration-1000 transform ${isBooting ? 'scale-95 opacity-80' : 'scale-100 opacity-100'} max-w-3xl w-full flex flex-col items-center text-center`}>
          
          {/* Icon / Logo */}
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full"></div>
            <div className="relative bg-slate-900/80 p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15)] backdrop-blur-sm">
              <Zap size={48} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-400 to-fuchsia-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            PATHFINDING <br />
            <span className="text-4xl md:text-6xl text-slate-100 drop-shadow-none">PLAYGROUND</span>
          </h1>

          {/* Terminal / Mission Text */}
          <div className="w-full max-w-lg bg-slate-900/80 border border-slate-700 rounded-lg p-5 mb-10 text-left shadow-2xl backdrop-blur-md min-h-[140px]">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-700/50 pb-2">
              <Terminal size={14} className="text-fuchsia-400" />
              <span className="text-xs text-slate-400 tracking-wider">TERMINAL // MISSION_BRIEF</span>
            </div>
            <div className="space-y-2 text-sm md:text-base text-cyan-100/80">
              {missionLines.slice(0, textIndex).map((line, i) => (
                <div key={i} className="animate-fade-in">
                  {line}
                </div>
              ))}
              {isBooting && (
                <div className="w-2 h-4 bg-cyan-400 animate-pulse inline-block ml-1 align-middle"></div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <div className={`transition-all duration-700 delay-300 ${!isBooting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={handleStart}
              disabled={isBooting || isStarted}
              className="group relative px-8 py-4 bg-slate-900/50 border border-cyan-400 text-cyan-400 font-bold tracking-[0.2em] rounded-sm overflow-hidden animate-pulse-glow hover:bg-cyan-950/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              
              <span className="relative flex items-center gap-3">
                {isStarted ? 'INITIALIZING...' : 'COMMENCE SEARCH'}
                <ChevronRight size={20} className={`transition-transform duration-300 ${isStarted ? 'translate-x-4 opacity-0' : 'group-hover:translate-x-1'}`} />
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Shimmer Keyframe needed for button hover */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}