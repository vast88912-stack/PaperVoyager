import React, { useEffect, useState } from 'react';
import { Play, Activity, Sparkles, BrainCircuit, ChevronRight, Zap } from 'lucide-react';

export default function App() {
  const [activeLayer, setActiveLayer] = useState(0);

  // Simulate forward/backward pass phases
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLayer((prev) => (prev + 1) % 4); // 0: Input, 1: Hidden, 2: Output, 3: Backprop
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const inputNodes = [
    { id: 'i1', cx: '15%', cy: '35%' },
    { id: 'i2', cx: '15%', cy: '65%' }
  ];

  const hiddenNodes = [
    { id: 'h1', cx: '50%', cy: '20%' },
    { id: 'h2', cx: '50%', cy: '40%' },
    { id: 'h3', cx: '50%', cy: '60%' },
    { id: 'h4', cx: '50%', cy: '80%' }
  ];

  const outputNodes = [
    { id: 'o1', cx: '85%', cy: '50%' }
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white overflow-hidden font-sans flex items-center justify-center selection:bg-cyan-500/30">
      
      {/* Inline styles for custom neon animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes reverse-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 1000; }
        }
        .animate-flow {
          stroke-dasharray: 10 20;
          animation: flow 2s linear infinite;
        }
        .animate-reverse-flow {
          stroke-dasharray: 10 20;
          animation: reverse-flow 2s linear infinite;
        }
        .glow-cyan { filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.8)); }
        .glow-purple { filter: drop-shadow(0 0 12px rgba(168, 85, 247, 0.8)); }
        .glow-pink { filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.8)); }
        
        .bg-grid-pattern {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
        }
      `}} />

      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]"></div>

      {/* Background Radial Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Animated Neural Network Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 md:opacity-60" preserveAspectRatio="none">
        <defs>
          <filter id="neon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connections: Input -> Hidden */}
        {inputNodes.map((inode, iIdx) => 
          hiddenNodes.map((hnode, hIdx) => (
            <line 
              key={`i-h-${iIdx}-${hIdx}`}
              x1={inode.cx} y1={inode.cy} 
              x2={hnode.cx} y2={hnode.cy}
              stroke={activeLayer === 3 ? "#ec4899" : "#06b6d4"}
              strokeWidth={activeLayer === 0 || activeLayer === 3 ? "2" : "1"}
              className={`transition-colors duration-500 opacity-40 ${activeLayer === 0 ? 'animate-flow glow-cyan opacity-80' : activeLayer === 3 ? 'animate-reverse-flow glow-pink opacity-80' : ''}`}
            />
          ))
        )}

        {/* Connections: Hidden -> Output */}
        {hiddenNodes.map((hnode, hIdx) => 
          outputNodes.map((onode, oIdx) => (
            <line 
              key={`h-o-${hIdx}-${oIdx}`}
              x1={hnode.cx} y1={hnode.cy} 
              x2={onode.cx} y2={onode.cy}
              stroke={activeLayer === 3 ? "#ec4899" : "#a855f7"}
              strokeWidth={activeLayer === 1 || activeLayer === 3 ? "2" : "1"}
              className={`transition-colors duration-500 opacity-40 ${activeLayer === 1 ? 'animate-flow glow-purple opacity-80' : activeLayer === 3 ? 'animate-reverse-flow glow-pink opacity-80' : ''}`}
            />
          ))
        )}

        {/* Input Nodes */}
        {inputNodes.map((node, idx) => (
          <circle 
            key={node.id} 
            cx={node.cx} cy={node.cy} r="8"
            fill="#0a0a0f"
            stroke="#06b6d4" strokeWidth="3"
            filter="url(#neon)"
            className={`transition-all duration-300 ${activeLayer === 0 ? 'scale-150 fill-cyan-500' : ''}`}
          />
        ))}

        {/* Hidden Nodes */}
        {hiddenNodes.map((node, idx) => (
          <circle 
            key={node.id} 
            cx={node.cx} cy={node.cy} r="10"
            fill="#0a0a0f"
            stroke="#a855f7" strokeWidth="3"
            filter="url(#neon)"
            className={`transition-all duration-300 ${activeLayer === 1 ? 'scale-[1.6] fill-purple-500' : activeLayer === 3 ? 'scale-125 stroke-pink-500 fill-pink-500/30' : ''}`}
          />
        ))}

        {/* Output Nodes */}
        {outputNodes.map((node, idx) => (
          <circle 
            key={node.id} 
            cx={node.cx} cy={node.cy} r="12"
            fill="#0a0a0f"
            stroke={activeLayer === 2 || activeLayer === 3 ? "#ec4899" : "#a855f7"} 
            strokeWidth="4"
            filter="url(#neon)"
            className={`transition-all duration-300 ${activeLayer === 2 ? 'scale-[1.8] fill-pink-500' : activeLayer === 3 ? 'scale-125 fill-pink-500/50' : ''}`}
          />
        ))}
      </svg>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeLayer === 3 ? 'bg-pink-400' : 'bg-cyan-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${activeLayer === 3 ? 'bg-pink-500' : 'bg-cyan-500'}`}></span>
          </div>
          <span className="text-sm font-medium tracking-wide text-gray-300 uppercase">
            {activeLayer === 3 ? 'Backpropagation Active' : 'Forward Pass Active'}
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
          <span className="block text-white mb-2">Demystify the</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            Black Box.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">
          Interactive Forward & Backprop Visualization. Build, train, and dissect a single hidden-layer MLP in real-time. Watch the math spark to life.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-transparent text-white font-bold text-lg rounded-xl overflow-hidden transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-30 blur-md bg-cyan-400 transition-opacity"></div>
            <Zap className="relative z-10 w-5 h-5 text-cyan-100 group-hover:text-white transition-colors" />
            <span className="relative z-10">Initialize Network</span>
          </button>

          <button className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 text-white font-bold text-lg rounded-xl transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]">
            <Activity className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            <span>Explore Datasets</span>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/10 pt-10 text-left">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <Play className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Live Forward Pass</h3>
              <p className="text-sm text-gray-400">Watch inputs multiply by weights and activate through neurons instantly.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
              <Sparkles className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Visual Backprop</h3>
              <p className="text-sm text-gray-400">See gradients flow backward. Understand exactly how weights update.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <BrainCircuit className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Neuron Ablation</h3>
              <p className="text-sm text-gray-400">Freeze or disable individual neurons to observe their impact on the loss surface.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}