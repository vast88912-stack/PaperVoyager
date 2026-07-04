import React, { useState, useEffect } from 'react';
import { Terminal, Activity, ArrowRight, Cpu, Sparkles } from 'lucide-react';

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [glitchText, setGlitchText] = useState('PATHFINDING_NEXUS');
  const [isHovering, setIsHovering] = useState(false);

  // Simulated terminal boot sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Glitch effect on hover
  useEffect(() => {
    if (!isHovering) {
      setGlitchText('PATHFINDING_NEXUS');
      return;
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    let iterations = 0;
    const interval = setInterval(() => {
      setGlitchText((prev) =>
        prev
          .split('')
          .map((char, index) => {
            if (index < iterations) return 'PATHFINDING_NEXUS'[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );
      if (iterations >= 'PATHFINDING_NEXUS'.length) clearInterval(interval);
      iterations += 1;
    }, 50);

    return () => clearInterval(interval);
  }, [isHovering]);

  return (
    <div className="relative min-h-screen bg-[#030712] flex items-center justify-center overflow-hidden selection:bg-cyan-500/30 font-sans">
      {/* Futuristic Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #22d3ee 1px, transparent 1px),
            linear-gradient(to bottom, #22d3ee 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
        }}
      />

      {/* Ambient Neon Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/3 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

      <main 
        className={`relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center text-center transition-all duration-1000 transform ${
          isBooting ? 'translate-y-12 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 text-sm font-mono mb-8 shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur-md">
          <Terminal className="w-4 h-4" />
          <span>SYS.VER_4.0.9 // ONLINE</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-1" />
        </div>

        {/* Hero Title */}
        <h1 
          className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-default"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {glitchText}
        </h1>

        {/* Mission Text */}
        <p className="text-lg md:text-xl text-cyan-100/70 max-w-2xl font-light leading-relaxed mb-12 backdrop-blur-sm">
          Initialize quantum routing algorithms. Navigate the cyber-grid. Analyze <span className="text-cyan-400 font-medium">BFS</span>, <span className="text-fuchsia-400 font-medium">Dijkstra</span>, and <span className="text-green-400 font-medium">A*</span> efficiency in real-time. Uncover the optimal path through the digital frontier.
        </p>

        {/* Action Button */}
        <div className="relative group">
          {/* Button Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-500 group-hover:duration-200" />
          
          <button className="relative flex items-center gap-4 px-8 py-4 bg-[#0a0f1c] border border-cyan-500/50 rounded-lg font-mono text-cyan-300 font-semibold tracking-widest hover:text-white hover:bg-[#0d1425] transition-all overflow-hidden">
            {/* Scanline effect over button */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent -translate-y-full group-hover:animate-[scan_1.5s_ease-in-out_infinite]" />
            
            <Activity className="w-5 h-5 text-cyan-500 group-hover:text-fuchsia-400 transition-colors" />
            <span className="relative z-10 mt-0.5">INITIALIZE_RUN</span>
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Feature Highlights (Bottom stats) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full border-t border-cyan-900/30 pt-10">
          {[
            { icon: Cpu, label: "Deterministic Seed", desc: "Reproducible graph states" },
            { icon: Sparkles, label: "Live Visualization", desc: "Frontier expansion animation" },
            { icon: Activity, label: "Heuristic Analysis", desc: "Manhattan vs Euclidean" }
          ].map((feature, idx) => (
            <div key={idx} className="flex flex-col items-center text-center p-4 rounded-xl bg-cyan-950/10 border border-transparent hover:border-cyan-900/50 transition-colors">
              <feature.icon className="w-6 h-6 text-cyan-600 mb-3" />
              <h3 className="text-cyan-300 font-mono text-sm mb-1">{feature.label}</h3>
              <p className="text-cyan-500/60 text-xs">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Inline styles for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}} />
    </div>
  );
}