import React, { useEffect, useState } from 'react';

const NetworkBackground = () => {
  const inputs = [
    { id: 'i1', x: 150, y: 150 },
    { id: 'i2', x: 150, y: 300 },
    { id: 'i3', x: 150, y: 450 },
  ];
  
  const hiddens = [
    { id: 'h1', x: 500, y: 100 },
    { id: 'h2', x: 500, y: 233 },
    { id: 'h3', x: 500, y: 366 },
    { id: 'h4', x: 500, y: 500 },
  ];

  const outputs = [
    { id: 'o1', x: 850, y: 225 },
    { id: 'o2', x: 850, y: 375 },
  ];

  const [phase, setPhase] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p === 'forward' ? 'backward' : 'forward'));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-950">
      <style>
        {`
          @keyframes dash-forward {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes dash-backward {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 40; }
          }
          @keyframes pulse-node {
            0%, 100% { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.4)); transform: scale(1); }
            50% { filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.9)); transform: scale(1.1); }
          }
          @keyframes pulse-node-back {
            0%, 100% { filter: drop-shadow(0 0 8px rgba(217, 70, 239, 0.4)); transform: scale(1); }
            50% { filter: drop-shadow(0 0 20px rgba(217, 70, 239, 0.9)); transform: scale(1.1); }
          }
          .synapse-fwd {
            stroke-dasharray: 8 12;
            animation: dash-forward 1s linear infinite;
            stroke: rgba(34, 211, 238, 0.3);
          }
          .synapse-fwd.active {
            stroke: rgba(34, 211, 238, 0.8);
            stroke-width: 2.5;
          }
          .synapse-bwd {
            stroke-dasharray: 8 12;
            animation: dash-backward 1.5s linear infinite;
            stroke: rgba(217, 70, 239, 0.3);
          }
          .synapse-bwd.active {
            stroke: rgba(217, 70, 239, 0.8);
            stroke-width: 2.5;
          }
          .node {
            transition: all 0.5s ease;
            transform-origin: center;
          }
          .node-fwd {
            fill: #0891b2;
            stroke: #22d3ee;
            animation: pulse-node 2s infinite;
          }
          .node-bwd {
            fill: #a21caf;
            stroke: #d946ef;
            animation: pulse-node-back 2s infinite;
          }
        `}
      </style>
      
      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/80 to-slate-950 z-10"></div>

      <svg 
        className="w-full h-full opacity-60" 
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid slice"
      >
        <g>
          {/* Input to Hidden Connections */}
          {inputs.map((inNode) =>
            hiddens.map((hNode) => {
              const isActive = Math.random() > 0.5;
              const isFwd = phase === 'forward';
              return (
                <line
                  key={`${inNode.id}-${hNode.id}`}
                  x1={inNode.x}
                  y1={inNode.y}
                  x2={hNode.x}
                  y2={hNode.y}
                  strokeWidth={1.5}
                  className={isFwd ? `synapse-fwd ${isActive ? 'active' : ''}` : `synapse-bwd ${isActive ? 'active' : ''}`}
                />
              );
            })
          )}

          {/* Hidden to Output Connections */}
          {hiddens.map((hNode) =>
            outputs.map((outNode) => {
              const isActive = Math.random() > 0.5;
              const isFwd = phase === 'forward';
              return (
                <line
                  key={`${hNode.id}-${outNode.id}`}
                  x1={hNode.x}
                  y1={hNode.y}
                  x2={outNode.x}
                  y2={outNode.y}
                  strokeWidth={1.5}
                  className={isFwd ? `synapse-fwd ${isActive ? 'active' : ''}` : `synapse-bwd ${isActive ? 'active' : ''}`}
                />
              );
            })
          )}
        </g>

        <g>
          {/* Nodes */}
          {[...inputs, ...hiddens, ...outputs].map((node) => {
            const isFwd = phase === 'forward';
            return (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={12}
                strokeWidth={3}
                className={`node ${isFwd ? 'node-fwd' : 'node-bwd'}`}
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default function App() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col justify-center">
      <NetworkBackground />

      {/* Hero Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-center text-center">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-700/50 backdrop-blur-md mb-8 animate-fade-in-up">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-sm font-medium text-slate-300 tracking-wide uppercase">
            ChatGPT Edition • Interactive ML
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl">
          Demystify the <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500">
            Black Box.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          A live, interactive playground for a single hidden-layer MLP. Watch node activations glow, freeze neurons to see ablation effects, and trace gradient flows in real-time during backpropagation.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-slate-950 bg-cyan-400 rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.8)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900">
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -ml-4 w-1/2"></div>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Initialize Network
          </button>
          
          <button className="inline-flex items-center justify-center px-8 py-4 font-semibold text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Select Dataset
          </button>
        </div>

        {/* Feature Highlights Footer */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full border-t border-slate-800 pt-10">
          <div className="flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 group-hover:border-cyan-500/50 transition-colors">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Architecture Editor</h3>
            <p className="text-sm text-slate-500">Tweak neurons, swap activations, and instantly see structural changes.</p>
          </div>

          <div className="flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 group-hover:border-blue-500/50 transition-colors">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Live Forward Pass</h3>
            <p className="text-sm text-slate-500">Watch data flow through the network with glowing neon activations.</p>
          </div>

          <div className="flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 group-hover:border-fuchsia-500/50 transition-colors">
              <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Gradient Flow</h3>
            <p className="text-sm text-slate-500">Visualize backprop in real-time alongside dynamic loss curve charts.</p>
          </div>
        </div>

      </div>
    </div>
  );
}