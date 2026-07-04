import React, { useState, useEffect } from 'react';

// --- Types & Interfaces ---
interface NodeData {
  id: number;
  state: 'follower' | 'candidate' | 'leader';
  x: number;
  y: number;
}

// --- Helper Components ---
const TypewriterText = ({ text, delay = 50, onComplete }: { text: string; delay?: number; onComplete?: () => void }) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay, onComplete]);

  return <span>{displayed}</span>;
};

// --- Main Hero Application ---
export default function App() {
  const [bootPhase, setBootPhase] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // Layout for a 5-node cluster in a circular pattern
  const radius = 120;
  const nodes: NodeData[] = Array.from({ length: 5 }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; // Start at top
    return {
      id: i + 1,
      state: hoveredNode === i + 1 ? 'leader' : 'follower',
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  // Boot sequence logic
  useEffect(() => {
    if (bootPhase === 0) {
      const timer = setTimeout(() => setBootPhase(1), 1000);
      return () => clearTimeout(timer);
    }
  }, [bootPhase]);

  return (
    <div className="min-h-screen bg-neutral-950 text-green-500 font-mono flex flex-col relative overflow-hidden selection:bg-green-900 selection:text-green-100">
      
      {/* Background Grid / Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Top Navigation / Status Bar */}
      <header className="w-full p-4 border-b border-green-900/50 flex justify-between items-center text-xs sm:text-sm z-10 bg-neutral-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="animate-pulse bg-green-500 w-2 h-2 inline-block rounded-full"></span>
          <span>SYSTEM.STATUS: ONLINE</span>
        </div>
        <div className="hidden sm:block text-green-700">
          [ RAFT PROTOCOL EDU-SIM v1.0.0 ]
        </div>
        <div>
          <span>NODES: 5/5</span>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-6xl mx-auto relative">
        
        {/* Abstract Cluster Visualizer */}
        <div className="relative w-80 h-80 mb-12 flex items-center justify-center border border-green-900/30 rounded-full shadow-[0_0_60px_rgba(0,255,0,0.05)]">
          {/* Central Hub Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            {nodes.map(node => (
              <line 
                key={`line-${node.id}`}
                x1="160" y1="160" 
                x2={160 + node.x} y2={160 + node.y} 
                stroke={node.state === 'leader' ? '#10b981' : '#059669'} 
                strokeWidth={node.state === 'leader' ? "2" : "1"}
                strokeDasharray="4 4"
              />
            ))}
          </svg>

          {/* Render Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="absolute transition-all duration-300 ease-out cursor-pointer flex items-center justify-center"
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
              }}
            >
              {/* Leader Ping Effect */}
              {node.state === 'leader' && (
                <div className="absolute w-16 h-16 bg-green-500/20 rounded-full animate-ping"></div>
              )}
              
              {/* Node Body */}
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg shadow-lg transition-colors duration-300 z-10 ${
                node.state === 'leader' 
                  ? 'bg-green-900 border-green-400 text-green-300 scale-110 shadow-[0_0_20px_rgba(74,222,128,0.5)]' 
                  : 'bg-neutral-900 border-green-800 text-green-700 hover:border-green-600'
              }`}>
                N{node.id}
              </div>
              
              {/* State Label */}
              <div className={`absolute -bottom-6 text-xs tracking-wider transition-opacity duration-300 ${
                node.state === 'leader' ? 'text-green-400 opacity-100 font-bold' : 'text-green-800 opacity-0'
              }`}>
                LEADER
              </div>
            </div>
          ))}

          {/* Central Data Core */}
          <div className="absolute w-8 h-8 bg-neutral-950 border border-green-700/50 rounded flex items-center justify-center z-0">
            <div className="w-2 h-2 bg-green-500/50 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="text-center max-w-3xl flex flex-col items-center">
          <div className="text-sm text-green-600 mb-4 flex items-center gap-2 font-semibold tracking-widest uppercase">
            <span>&gt;</span>
            {bootPhase >= 1 ? <TypewriterText text="./init_animator.sh" delay={30} onComplete={() => setBootPhase(2)} /> : <span className="opacity-0">.</span>}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-green-300 to-green-700 drop-shadow-[0_0_10px_rgba(34,197,94,0.2)]">
            RAFT CONSENSUS<br/>ANIMATOR
          </h1>
          <h2 className="text-xl sm:text-2xl text-green-600 mb-8 tracking-widest uppercase font-light border-b border-green-900/50 pb-4 inline-block">
            [ ChatGPT Edition ]
          </h2>

          <div className="text-green-500/80 mb-10 text-sm sm:text-base leading-relaxed max-w-2xl h-20">
            {bootPhase >= 2 && (
              <TypewriterText 
                text="Visualize the distributed systems algorithms powering modern infrastructure. Observe leader election, simulate network partitions, and track log replication in real-time."
                delay={15}
                onComplete={() => setBootPhase(3)}
              />
            )}
          </div>

          {/* Feature Matrix */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-12 transition-all duration-1000 transform ${bootPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              { id: '01', title: 'Leader Election', desc: 'Terms & Timeouts' },
              { id: '02', title: 'Log Replication', desc: 'AppendEntries RPC' },
              { id: '03', title: 'Partition Sandbox', desc: 'Split-Brain Tests' },
              { id: '04', title: 'Safety Checks', desc: 'Protocol Invariants' }
            ].map(feat => (
              <div key={feat.id} className="border border-green-900/30 p-4 bg-neutral-900/30 hover:bg-green-900/20 hover:border-green-500/50 transition-colors text-left group cursor-crosshair relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 text-xs text-green-800 font-bold opacity-30 group-hover:opacity-100">{feat.id}</div>
                <div className="text-green-400 font-bold mb-1 group-hover:text-green-300">{feat.title}</div>
                <div className="text-xs text-green-700 group-hover:text-green-500">{feat.desc}</div>
              </div>
            ))}
          </div>

          {/* Action Area */}
          <div className={`transition-opacity duration-1000 ${bootPhase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
            <button className="relative group px-8 py-4 bg-transparent border border-green-500 text-green-400 font-bold uppercase tracking-widest hover:bg-green-500 hover:text-neutral-950 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-neutral-950">
              <span className="absolute -inset-0.5 bg-green-500 blur opacity-0 group-hover:opacity-30 transition duration-300"></span>
              <span className="relative flex items-center gap-3">
                Initialize Cluster
                <span className="inline-block w-2 h-4 bg-current animate-pulse"></span>
              </span>
            </button>
            <p className="mt-4 text-xs text-green-800 uppercase tracking-widest">Interactive mode ready</p>
          </div>

        </div>
      </main>

      {/* Footer Terminal Output */}
      <footer className="w-full p-4 border-t border-green-900/50 text-xs text-green-800 z-10 bg-neutral-950 font-mono">
        <div className="max-w-6xl mx-auto flex justify-between items-center opacity-70">
          <div>$ cat ./disclaimer.txt | grep "educational"</div>
          <div className="hidden sm:block">No external simulation libraries imported. Lightweight JS engine active.</div>
          <div>SEED: {Math.floor(Math.random() * 999999).toString().padStart(6, '0')}</div>
        </div>
      </footer>
    </div>
  );
}