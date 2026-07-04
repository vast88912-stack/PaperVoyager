import React, { useState, useEffect } from 'react';

export default function App() {
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    // Random glitch effect interval
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 150);
      }
    }, 2000);

    return () => clearInterval(glitchInterval);
  }, []);

  useEffect(() => {
    let progressInterval: number;
    if (isBooting) {
      progressInterval = window.setInterval(() => {
        setBootProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 150);
    }
    return () => clearInterval(progressInterval);
  }, [isBooting]);

  const handleStart = () => {
    setIsBooting(true);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 font-mono text-slate-300 overflow-hidden flex flex-col items-center justify-center selection:bg-cyan-500/30">
      
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Animated Grid Lines */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #06b6d4 1px, transparent 1px),
              linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
            animation: 'grid-scroll 10s linear infinite'
          }}
        />
        {/* Radial fade to hide edges */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_70%)]" />
        {/* Glow orb behind text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* Embedded Styles for custom animations */}
      <style>{`
        @keyframes grid-scroll {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0px) translateZ(-200px); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(40px) translateZ(-200px); }
        }
        .glitch-text {
          position: relative;
        }
        .glitch-text::before, .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #f0f;
          clip: rect(24px, 550px, 90px, 0);
          animation: glitch-anim-2 3s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 #0ff;
          clip: rect(85px, 550px, 140px, 0);
          animation: glitch-anim 2.5s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim {
          0% { clip: rect(10px, 9999px, 44px, 0); }
          20% { clip: rect(85px, 9999px, 14px, 0); }
          40% { clip: rect(33px, 9999px, 88px, 0); }
          60% { clip: rect(66px, 9999px, 22px, 0); }
          80% { clip: rect(11px, 9999px, 77px, 0); }
          100% { clip: rect(55px, 9999px, 33px, 0); }
        }
      `}</style>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center max-w-3xl w-full px-6">
        
        {/* Top Decorative Elements */}
        <div className="w-full flex justify-between text-xs text-cyan-500/50 mb-12 tracking-[0.2em] font-bold">
          <span>SYS.V.2.4.9</span>
          <span className="animate-pulse">AWAITING_INPUT</span>
          <span>S_ID: 9481X</span>
        </div>

        {/* Hero Title */}
        <div className="text-center mb-8 relative">
          <h1 
            data-text="PATHFINDING PLAYGROUND" 
            className={`text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] ${glitch ? 'glitch-text' : ''}`}
          >
            PATHFINDING PLAYGROUND
          </h1>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 shadow-[0_0_10px_#22d3ee]"></div>
        </div>

        {/* Mission Text */}
        <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-md p-6 rounded-lg mb-12 shadow-[0_0_30px_rgba(0,0,0,0.5)] max-w-xl text-center">
          <p className="text-slate-400 text-lg leading-relaxed">
            <span className="text-fuchsia-400 font-semibold">{'>'} MISSION:</span> Initiate sequence. Map the unknown grid. Optimize the route using advanced traversal algorithms.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 rounded">BFS</span>
            <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 rounded">Dijkstra</span>
            <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 rounded">A* Search</span>
            <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 rounded">Bidirectional</span>
          </div>
        </div>

        {/* Interactive Start Area */}
        <div className="h-24 flex items-center justify-center w-full">
          {!isBooting ? (
            <button
              onClick={handleStart}
              className="group relative px-8 py-4 bg-transparent text-cyan-400 font-bold text-xl tracking-widest uppercase overflow-hidden transition-all duration-300 hover:text-slate-950 focus:outline-none"
            >
              <div className="absolute inset-0 border-2 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all duration-300"></div>
              <div className="absolute inset-0 bg-cyan-400 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"></div>
              
              <span className="relative z-10 flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                INITIALIZE_ENGINE
              </span>
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-fuchsia-500 group-hover:border-slate-900 z-10 transition-colors"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-fuchsia-500 group-hover:border-slate-900 z-10 transition-colors"></div>
            </button>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center gap-4">
              <div className="flex justify-between w-full text-sm font-bold text-cyan-400 tracking-wider">
                <span>ESTABLISHING_UPLINK</span>
                <span>{bootProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 border border-cyan-900/50 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-150 ease-linear"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 animate-pulse">
                {bootProgress < 30 ? 'Loading heuristic modules...' : bootProgress < 70 ? 'Generating grid vectors...' : 'Calibrating neon overdrive...'}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-20"></div>
    </div>
  );
}