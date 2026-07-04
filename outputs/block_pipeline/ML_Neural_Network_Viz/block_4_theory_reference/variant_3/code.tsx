import React, { useState, useEffect } from 'react';

// Custom CSS for animations and glowing effects to maintain the neon/cyberpunk aesthetic
const styles = `
  @keyframes dash-forward {
    to { stroke-dashoffset: -20; }
  }
  @keyframes dash-backward {
    to { stroke-dashoffset: 20; }
  }
  @keyframes pulse-glow {
    0%, 100% { filter: drop-shadow(0 0 5px currentColor); }
    50% { filter: drop-shadow(0 0 15px currentColor) brightness(1.2); }
  }
  .animate-forward {
    stroke-dasharray: 8 4;
    animation: dash-forward 1s linear infinite;
  }
  .animate-backward {
    stroke-dasharray: 8 4;
    animation: dash-backward 1.5s linear infinite;
  }
  .glow-node {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  .math-font {
    font-family: 'Cambria Math', 'Times New Roman', serif;
  }
`;

// Types for our content structure
type Topic = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  glowClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
};

const TOPICS: Topic[] = [
  {
    id: 'forward',
    title: 'Forward Pass',
    subtitle: 'Data -> Predictions',
    color: '#00f3ff',
    glowClass: 'hover:shadow-[0_0_15px_rgba(0,243,255,0.4)]',
    bgClass: 'bg-[#00f3ff]/10',
    borderClass: 'border-[#00f3ff]/50',
    textClass: 'text-[#00f3ff]',
  },
  {
    id: 'activations',
    title: 'Activations',
    subtitle: 'Adding Non-Linearity',
    color: '#ff00ea',
    glowClass: 'hover:shadow-[0_0_15px_rgba(255,0,234,0.4)]',
    bgClass: 'bg-[#ff00ea]/10',
    borderClass: 'border-[#ff00ea]/50',
    textClass: 'text-[#ff00ea]',
  },
  {
    id: 'loss',
    title: 'Loss Function',
    subtitle: 'Measuring Error',
    color: '#ffea00',
    glowClass: 'hover:shadow-[0_0_15px_rgba(255,234,0,0.4)]',
    bgClass: 'bg-[#ffea00]/10',
    borderClass: 'border-[#ffea00]/50',
    textClass: 'text-[#ffea00]',
  },
  {
    id: 'backprop',
    title: 'Backpropagation',
    subtitle: 'Error -> Gradients',
    color: '#39ff14',
    glowClass: 'hover:shadow-[0_0_15px_rgba(57,255,20,0.4)]',
    bgClass: 'bg-[#39ff14]/10',
    borderClass: 'border-[#39ff14]/50',
    textClass: 'text-[#39ff14]',
  },
  {
    id: 'tensors',
    title: 'Tensor Shapes',
    subtitle: 'Matrix Dimensions',
    color: '#b026ff',
    glowClass: 'hover:shadow-[0_0_15px_rgba(176,38,255,0.4)]',
    bgClass: 'bg-[#b026ff]/10',
    borderClass: 'border-[#b026ff]/50',
    textClass: 'text-[#b026ff]',
  }
];

export default function App() {
  const [activeTopic, setActiveTopic] = useState<string>('forward');
  const [hoveredEq, setHoveredEq] = useState<string | null>(null);

  // Render content based on active topic
  const renderContent = () => {
    switch (activeTopic) {
      case 'forward':
        return <ForwardPassView hoveredEq={hoveredEq} setHoveredEq={setHoveredEq} />;
      case 'activations':
        return <ActivationsView />;
      case 'loss':
        return <LossView />;
      case 'backprop':
        return <BackpropView hoveredEq={hoveredEq} setHoveredEq={setHoveredEq} />;
      case 'tensors':
        return <TensorsView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-300 font-sans p-4 md:p-8 flex flex-col items-center selection:bg-fuchsia-900 selection:text-white">
      <style>{styles}</style>
      
      {/* Header */}
      <header className="max-w-6xl w-full mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="glow-node">
              <path d="M2 12h4l3-9 5 18 3-9h5" />
            </svg>
            <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">ML Theory Base</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Interactive Reference Guide & Math Explorer</p>
        </div>
        <div className="hidden md:flex gap-2">
          {['Z', 'A', 'W', 'b', 'L'].map((sym, i) => (
            <div key={i} className="w-8 h-8 rounded border border-slate-700 bg-slate-900 flex items-center justify-center font-serif italic text-slate-400">
              {sym}
            </div>
          ))}
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-6xl w-full flex flex-col lg:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <nav className="flex flex-col gap-3 w-full lg:w-64 shrink-0">
          {TOPICS.map((topic) => {
            const isActive = activeTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic.id)}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? `${topic.bgClass} ${topic.borderClass} shadow-[0_0_20px_rgba(0,0,0,0.5)] scale-105 z-10` 
                    : `border-slate-800 bg-slate-900/50 hover:bg-slate-800 ${topic.glowClass}`
                }`}
              >
                <span className={`font-bold tracking-wide ${isActive ? topic.textClass : 'text-slate-300'} drop-shadow-[0_0_5px_currentColor]`}>
                  {topic.title}
                </span>
                <span className={`text-xs mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {topic.subtitle}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <section className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex-1 transition-opacity duration-500 animate-in fade-in zoom-in-95">
              {renderContent()}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

// --- Specific Views for Each Topic ---

const ForwardPassView = ({ hoveredEq, setHoveredEq }: any) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 border-b border-[#00f3ff]/20 pb-4">
      <div className="p-2 bg-[#00f3ff]/10 rounded border border-[#00f3ff]/30 text-[#00f3ff]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4 M12 8h.01" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">Forward Propagation</h2>
        <p className="text-slate-400 text-sm">Computing the network's prediction from input data.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      {/* Math Explanation */}
      <div className="space-y-4 text-slate-300 leading-relaxed">
        <p>In the forward pass, data flows from the input layer through the hidden layers to the output. For each layer <span className="math-font italic text-[#00f3ff]">l</span>, we perform two operations:</p>
        
        <div 
          className={`p-4 rounded-lg border transition-colors ${hoveredEq === 'linear' ? 'border-[#00f3ff] bg-[#00f3ff]/5' : 'border-slate-800 bg-slate-900/50'}`}
          onMouseEnter={() => setHoveredEq('linear')}
          onMouseLeave={() => setHoveredEq(null)}
        >
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">1. Linear Transformation</div>
          <div className="math-font text-xl text-center tracking-widest text-[#00f3ff] drop-shadow-[0_0_5px_rgba(0,243,255,0.4)]">
            Z<sup className="text-xs">(l)</sup> = W<sup className="text-xs">(l)</sup>A<sup className="text-xs">(l-1)</sup> + b<sup className="text-xs">(l)</sup>
          </div>
        </div>

        <div 
          className={`p-4 rounded-lg border transition-colors ${hoveredEq === 'act' ? 'border-[#ff00ea] bg-[#ff00ea]/5' : 'border-slate-800 bg-slate-900/50'}`}
          onMouseEnter={() => setHoveredEq('act')}
          onMouseLeave={() => setHoveredEq(null)}
        >
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">2. Non-Linear Activation</div>
          <div className="math-font text-xl text-center tracking-widest text-[#ff00ea] drop-shadow-[0_0_5px_rgba(255,0,234,0.4)]">
            A<sup className="text-xs">(l)</sup> = σ(Z<sup className="text-xs">(l)</sup>)
          </div>
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="flex justify-center items-center h-64 bg-slate-900/30 rounded-xl border border-slate-800/50 relative overflow-hidden">
        <svg viewBox="0 0 300 200" className="w-full h-full drop-shadow-xl">
          {/* Edges */}
          <g strokeWidth="2" fill="none" className="transition-all duration-300" stroke={hoveredEq === 'linear' ? '#00f3ff' : '#334155'}>
            <path d="M 50 50 L 150 100" className={hoveredEq === 'linear' || !hoveredEq ? 'animate-forward' : ''} />
            <path d="M 50 150 L 150 100" className={hoveredEq === 'linear' || !hoveredEq ? 'animate-forward' : ''} />
            <path d="M 150 100 L 250 100" className={hoveredEq === 'act' || !hoveredEq ? 'animate-forward' : ''} stroke={hoveredEq === 'act' ? '#ff00ea' : (hoveredEq === 'linear' ? '#00f3ff' : '#334155')} />
          </g>

          {/* Nodes */}
          {/* Input Nodes */}
          <circle cx="50" cy="50" r="15" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <text x="50" y="55" fill="#94a3b8" fontSize="12" textAnchor="middle" className="math-font">x₁</text>
          
          <circle cx="50" cy="150" r="15" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <text x="50" y="155" fill="#94a3b8" fontSize="12" textAnchor="middle" className="math-font">x₂</text>

          {/* Hidden Node */}
          <circle cx="150" cy="100" r="20" fill="#0f172a" stroke={hoveredEq === 'linear' ? '#00f3ff' : '#64748b'} strokeWidth="2" className={hoveredEq === 'linear' ? 'glow-node' : ''} />
          <text x="150" y="105" fill={hoveredEq === 'linear' ? '#00f3ff' : '#94a3b8'} fontSize="14" textAnchor="middle" className="math-font">∑</text>

          {/* Output Node (Activation) */}
          <circle cx="250" cy="100" r="15" fill="#0f172a" stroke={hoveredEq === 'act' ? '#ff00ea' : '#64748b'} strokeWidth="2" className={hoveredEq === 'act' ? 'glow-node' : ''} />
          <text x="250" y="105" fill={hoveredEq === 'act' ? '#ff00ea' : '#94a3b8'} fontSize="14" textAnchor="middle" className="math-font">σ</text>

          {/* Labels */}
          <text x="100" y="65" fill={hoveredEq === 'linear' ? '#00f3ff' : '#64748b'} fontSize="10" className="math-font">w₁</text>
          <text x="100" y="145" fill={hoveredEq === 'linear' ? '#00f3ff' : '#64748b'} fontSize="10" className="math-font">w₂</text>
          <text x="200" y="90" fill={hoveredEq === 'act' ? '#ff00ea' : (hoveredEq === 'linear' ? '#00f3ff' : '#64748b')} fontSize="12" className="math-font">z</text>
          <text x="280" y="105" fill={hoveredEq === 'act' ? '#ff00ea' : '#64748b'} fontSize="12" className="math-font">a</text>
        </svg>
      </div>
    </div>
  </div>
);

const ActivationsView = () => {
  const [hoverAct, setHoverAct] = useState<string | null>(null);

  const acts = [
    {
      id: 'relu',
      name: 'ReLU',
      math: 'max(0, x)',
      color: '#39ff14',
      path: 'M 10 90 L 50 90 L 90 10',
      desc: 'Rectified Linear Unit. Fast to compute, prevents vanishing gradients, but can suffer from "dying ReLUs".'
    },
    {
      id: 'sigmoid',
      name: 'Sigmoid',
      math: '1 / (1 + e⁻ˣ)',
      color: '#ff00ea',
      path: 'M 10 90 C 40 90, 60 10, 90 10',
      desc: 'S-curve mapping values to (0, 1). Useful for binary classification output layers, but suffers from vanishing gradients.'
    },
    {
      id: 'tanh',
      name: 'Tanh',
      math: '(eˣ - e⁻ˣ)/(eˣ + e⁻ˣ)',
      color: '#00f3ff',
      path: 'M 10 90 C 30 90, 45 50, 50 50 C 55 50, 70 10, 90 10',
      desc: 'Zero-centered S-curve mapping to (-1, 1). Generally preferred over Sigmoid for hidden layers.'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-[#ff00ea]/20 pb-4">
        <div className="p-2 bg-[#ff00ea]/10 rounded border border-[#ff00ea]/30 text-[#ff00ea]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,0,234,0.5)]">Activation Functions</h2>
          <p className="text-slate-400 text-sm">Introducing non-linearity to learn complex patterns.</p>
        </div>
      </div>

      <p className="text-slate-300">Without activation functions, a neural network is just a linear regression model, no matter how many layers it has. Activations allow the network to warp and fold space to solve non-linear problems (like XOR).</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {acts.map((act) => (
          <div 
            key={act.id}
            className={`p-5 rounded-xl border bg-slate-900/50 flex flex-col items-center gap-4 transition-all duration-300 cursor-default ${
              hoverAct === act.id ? `border-[${act.color}] shadow-[0_0_15px_${act.color}40] scale-105` : 'border-slate-800'
            }`}
            onMouseEnter={() => setHoverAct(act.id)}
            onMouseLeave={() => setHoverAct(null)}
            style={{ borderColor: hoverAct === act.id ? act.color : '' }}
          >
            {/* SVG Graph */}
            <div className="w-24 h-24 relative rounded border border-slate-700 bg-slate-950/80 p-2">
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* Grid/Axes */}
                <line x1="50" y1="0" x2="50" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="2" />
                {/* Curve */}
                <path 
                  d={act.path} 
                  fill="none" 
                  stroke={act.color} 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  className={hoverAct === act.id ? 'glow-node' : ''}
                />
              </svg>
            </div>
            
            <div className="text-center w-full">
              <h3 className="font-bold text-lg text-white mb-1" style={{ color: hoverAct === act.id ? act.color : '#f8fafc', textShadow: hoverAct === act.id ? `0 0 8px ${act.color}` : 'none' }}>
                {act.name}
              </h3>
              <div className="math-font text-sm text-slate-400 mb-3 bg-slate-950 rounded py-1 border border-slate-800">
                f(x) = {act.math}
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                {act.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LossView = () => (
  <div className="space-y-6 h-full flex flex-col">
    <div className="flex items-center gap-3 border-b border-[#ffea00]/20 pb-4">
      <div className="p-2 bg-[#ffea00]/10 rounded border border-[#ffea00]/30 text-[#ffea00]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,234,0,0.5)]">Loss Function</h2>
        <p className="text-slate-400 text-sm">Quantifying the network's prediction error.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
      <div className="space-y-4">
        <p className="text-slate-300">
          The goal of training is to minimize the <strong>Loss</strong> (or Cost). It calculates the "distance" between the network's prediction <span className="math-font text-[#ffea00]">ŷ</span> and the actual true label <span className="math-font text-[#00f3ff]">y</span>.
        </p>
        
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-[#ffea00]/50 transition-colors group">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 group-hover:text-[#ffea00] transition-colors">Mean Squared Error (MSE)</h3>
          <p className="text-xs text-slate-500 mb-3">Best for regression tasks. Penalizes large errors heavily.</p>
          <div className="math-font text-lg text-center text-white">
            L = <span className="text-slate-400">1/N</span> ∑ <span className="text-slate-500">(</span><span className="text-[#ffea00]">ŷ</span> - <span className="text-[#00f3ff]">y</span><span className="text-slate-500">)²</span>
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-[#ffea00]/50 transition-colors group">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2 group-hover:text-[#ffea00] transition-colors">Cross-Entropy Loss</h3>
          <p className="text-xs text-slate-500 mb-3">Best for classification. Measures divergence between probabilities.</p>
          <div className="math-font text-lg text-center text-white">
            L = -<span className="text-slate-400">1/N</span> ∑ <span className="text-[#00f3ff]">y</span> log(<span className="text-[#ffea00]">ŷ</span>) + (1-<span className="text-[#00f3ff]">y</span>) log(1-<