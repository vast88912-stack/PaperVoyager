import React, { useEffect, useState } from 'react';

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Neural network nodes coordinates (x, y)
  const networkLayers = [
    [ { id: 'i1', x: 150, y: 200 }, { id: 'i2', x: 150, y: 400 }, { id: 'i3', x: 150, y: 600 } ],
    [ { id: 'h1', x: 600, y: 100 }, { id: 'h2', x: 600, y: 300 }, { id: 'h3', x: 600, y: 500 }, { id: 'h4', x: 600, y: 700 } ],
    [ { id: 'o1', x: 1050, y: 300 }, { id: 'o2', x: 1050, y: 500 } ]
  ];

  // Generate edges between layers
  const edges = [];
  for (let l = 0; l < networkLayers.length - 1; l++) {
    const currentLayer = networkLayers[l];
    const nextLayer = networkLayers[l + 1];
    
    currentLayer.forEach((nodeA, i) => {
      nextLayer.forEach((nodeB, j) => {
        edges.push({
          id: `${nodeA.id}-${nodeB.id}`,
          x1: nodeA.x,
          y1: nodeA.y,
          x2: nodeB.x,
          y2: nodeB.y,
          // Assign random phase and colors to make it look alive
          delay: (i + j) * 0.2,
          isBackward: (i + j) % 3 === 0, 
        });
      });
    });
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans text-slate-200">
      
      {/* Inline Styles for SVG Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flowForward {
          0% { stroke-dashoffset: 100; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: -100; opacity: 0; }
        }
        @keyframes flowBackward {
          0% { stroke-dashoffset: -100; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 100; opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.8)); transform: scale(1.1); }
        }
        .anim-forward {
          stroke-dasharray: 40 160;
          animation: flowForward 3s linear infinite;
        }
        .anim-backward {
          stroke-dasharray: 40 160;
          animation: flowBackward 3.5s linear infinite;
        }
        .node-pulse {
          animation: pulseGlow 4s ease-in-out infinite;
          transform-origin: center;
        }
      `}} />

      {/* SVG Background Animation */}
      <div className="absolute inset-0 z-0 opacity-40 md:opacity-60 flex items-center justify-center pointer-events-none">
        <svg 
          viewBox="0 0 1200 800" 
          className="w-full h-full object-cover max-w-[1400px]"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="neon-cyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neon-fuchsia" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base lines */}
          {edges.map(edge => (
            <line 
              key={`base-${edge.id}`}
              x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
              stroke="#1e293b" strokeWidth="2"
            />
          ))}

          {/* Animated lines (Forward & Backward) */}
          {edges.map((edge, idx) => (
            <line 
              key={`anim-${edge.id}`}
              x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
              stroke={edge.isBackward ? "#d946ef" : "#22d3ee"} 
              strokeWidth={edge.isBackward ? "3" : "2"}
              strokeLinecap="round"
              filter={edge.isBackward ? "url(#neon-fuchsia)" : "url(#neon-cyan)"}
              className={edge.isBackward ? "anim-backward" : "anim-forward"}
              style={{ animationDelay: `${edge.delay}s` }}
            />
          ))}

          {/* Nodes */}
          {networkLayers.flat().map((node, i) => (
            <g key={node.id} className="node-pulse" style={{ animationDelay: `${i * 0.3}s`, transformOrigin: `${node.x}px ${node.y}px` }}>
              <circle 
                cx={node.x} 
                cy={node.y} 
                r="16" 
                fill="#0f172a" 
                stroke="#38bdf8" 
                strokeWidth="4"
                filter="url(#neon-cyan)"
              />
              <circle cx={node.x} cy={node.y} r="6" fill="#e0f2fe" />
            </g>
          ))}
        </svg>
      </div>

      {/* Hero Content */}
      <div className={`relative z-10 max-w-5xl mx-auto px-6 text-center transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/50 backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:shadow-[0_0_25px_rgba(34,211,238,0.3)] transition-shadow cursor-default">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
          <span className="text-sm font-medium text-cyan-300 tracking-wide uppercase">ChatGPT Edition</span>
        </div>

        {/* Headlines */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Demystify the <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 animate-gradient-x">
            Black Box
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed font-light">
          An interactive, single hidden-layer MLP playground. Watch forward passes in real-time, visualize backpropagation gradients, and ablate neurons to understand how AI truly learns.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)]">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="relative flex items-center gap-2">
              Launch Viewer
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </button>
          
          <button className="px-8 py-4 bg-slate-900/50 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-700 hover:border-slate-500 transition-all duration-300 backdrop-blur-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Explore Architecture
          </button>
        </div>

        {/* Feature Teasers */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm text-slate-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
            </div>
            <span>Live Forward Pass</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-fuchsia-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <span>Gradient Flow</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <span>Loss Curves</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span>Neuron Ablation</span>
          </div>
        </div>
      </div>
      
      {/* Decorative gradient orb */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-[100%] pointer-events-none"></div>
    </div>
  );
}