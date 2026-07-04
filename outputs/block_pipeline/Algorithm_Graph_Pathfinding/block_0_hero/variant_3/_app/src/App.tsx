import React, { useState, useEffect } from 'react';
import { Play, Cpu, Network, ChevronRight } from 'lucide-react';

export default function App() {
  const [missionText, setMissionText] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const fullText = "Navigate the digital frontier. Visualize and explore A*, Dijkstra, BFS, and Bidirectional search algorithms in real-time across a dynamic neural grid.";

  useEffect(() => {
    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const typeWriter = () => {
      if (currentIndex < fullText.length) {
        setMissionText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(typeWriter, 30 + Math.random() * 40); // Variable typing speed
      }
    };

    timeoutId = setTimeout(typeWriter, 500); // Initial delay

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-mono selection:bg-fuchsia-500/30">
      
      {/* Dynamic Background: Dark Grid with Neon Glow */}
      <div className="absolute inset-0 z-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.07)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_20%,transparent_100%)]" />
        
        {/* Ambient Neon Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-fuchsia-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      {/* Decorative Corner Markers */}
      <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 z-10" />
      <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 z-10" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-cyan-500/50 z-10" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-cyan-500/50 z-10" />

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-4xl px-6 pt-12 text-center">
        
        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 mb-8 border rounded-full border-cyan-500/30 bg-cyan-950/40 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-fade-in-down">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-cyan-300">
            ChatGPT Edition // V4
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="relative mb-6 text-5xl font-black tracking-tighter text-transparent uppercase md:text-7xl lg:text-8xl bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          Pathfinding
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 drop-shadow-[0_0_25px_rgba(217,70,239,0.4)]">
            Playground
          </span>
        </h1>

        {/* Mission Text (Typewriter) */}
        <div className="min-h-[5rem] md:min-h-[4rem] max-w-2xl mb-12">
          <p className="text-base leading-relaxed tracking-wide md:text-lg text-cyan-100/70">
            <span className="text-fuchsia-400 mr-2">{'>'}</span>
            {missionText}
            <span className="inline-block w-2 h-5 ml-1 align-middle bg-cyan-400 animate-pulse" />
          </p>
        </div>

        {/* Start Button */}
        <div className="relative group">
          {/* Outer glow ring on hover */}
          <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-none blur-xl transition-opacity duration-500 ${isHovering ? 'opacity-60' : 'opacity-20'}`} />
          
          <button 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="relative flex items-center gap-4 px-10 py-4 overflow-hidden transition-all duration-300 bg-black border-2 border-cyan-500/80 hover:border-fuchsia-500 group-hover:bg-cyan-950/20"
          >
            {/* Geometric Button Decor */}
            <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-cyan-500/50" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-cyan-500/50" />
            
            {/* Button Content */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 group-hover:bg-fuchsia-500/20 transition-colors duration-300">
              <Play className={`w-4 h-4 transition-all duration-300 ${isHovering ? 'text-fuchsia-400 fill-fuchsia-400 scale-110' : 'text-cyan-400 fill-cyan-400'}`} />
            </div>
            
            <span className={`text-lg font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${isHovering ? 'text-white' : 'text-cyan-50'}`}>
              Initialize Grid
            </span>

            <ChevronRight className={`w-5 h-5 transition-all duration-300 ${isHovering ? 'text-fuchsia-400 translate-x-1' : 'text-cyan-500/50'}`} />
            
            {/* Scanline effect over button */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none opacity-50" />
          </button>
        </div>

        {/* Decorative Data Stream Footer */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[10px] text-cyan-500/40 tracking-widest uppercase opacity-70">
          <div className="flex items-center gap-2">
            <Network className="w-3 h-3" />
            <span>SYS.ONLINE</span>
          </div>
          <span className="w-1 h-1 bg-fuchsia-500/50 rounded-full animate-ping" />
          <span>SEED: {Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
          <span className="w-1 h-1 bg-cyan-500/50 rounded-full" />
          <span>LATENCY: 12ms</span>
        </div>

      </main>
    </div>
  );
}