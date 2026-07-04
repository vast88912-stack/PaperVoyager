import React, { useState, useEffect, useMemo } from 'react';

// --- Types & Data ---

type TopicKey = 'architecture' | 'forward' | 'backprop' | 'activations' | 'ablation';

interface Topic {
  id: TopicKey;
  title: string;
  color: string;
  glow: string;
  icon: string;
}

const TOPICS: Topic[] = [
  { id: 'architecture', title: 'MLP Architecture', color: 'text-cyan-400', glow: 'shadow-cyan-500/50', icon: '⚄' },
  { id: 'forward', title: 'Forward Propagation', color: 'text-lime-400', glow: 'shadow-lime-500/50', icon: '⇛' },
  { id: 'backprop', title: 'Backpropagation', color: 'text-pink-500', glow: 'shadow-pink-500/50', icon: '⇚' },
  { id: 'activations', title: 'Activation Functions', color: 'text-purple-400', glow: 'shadow-purple-500/50', icon: '∿' },
  { id: 'ablation', title: 'Network Ablation', color: 'text-amber-400', glow: 'shadow-amber-500/50', icon: '✂' }
];

// --- Helper Components ---

const MathBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-md p-4 font-mono text-sm text-gray-300 shadow-inner overflow-x-auto">
    {children}
  </div>
);

const GlowText = ({ children, colorClass }: { children: React.ReactNode, colorClass: string }) => {
  const shadowColor = colorClass.includes('cyan') ? 'rgba(34, 211, 238, 0.8)' :
                      colorClass.includes('lime') ? 'rgba(163, 230, 53, 0.8)' :
                      colorClass.includes('pink') ? 'rgba(236, 72, 153, 0.8)' :
                      colorClass.includes('purple') ? 'rgba(192, 132, 252, 0.8)' :
                      colorClass.includes('amber') ? 'rgba(251, 191, 36, 0.8)' : 'rgba(255,255,255,0.8)';
  return (
    <span className={`${colorClass} font-bold`} style={{ textShadow: `0 0 8px ${shadowColor}` }}>
      {children}
    </span>
  );
};

// --- Interactive Topic Views ---

const ArchitectureView = () => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-cyan-400" style={{ textShadow: '0 0 10px cyan' }}>⚄</span> Multi-Layer Perceptron (MLP)
        </h2>
        <p className="text-gray-400 leading-relaxed">
          An MLP is a feedforward artificial neural network. It consists of at least three layers of nodes: an <GlowText colorClass="text-cyan-400">input layer</GlowText>, a <GlowText colorClass="text-purple-400">hidden layer</GlowText>, and an <GlowText colorClass="text-pink-400">output layer</GlowText>. Except for the input nodes, each node is a neuron that uses a nonlinear activation function.
        </p>
      </div>
      
      <div className="flex-grow flex items-center justify-center bg-gray-950/50 border border-cyan-900/50 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
        <svg width="100%" height="300" viewBox="0 0 600 300" className="drop-shadow-[0_0_5px_rgba(0,255,255,0.3)]">
          {/* Connections */}
          {[100, 200].map(y1 => 
            [50, 150, 250].map(y2 => (
              <path key={`c1-${y1}-${y2}`} d={`M 150 ${y1} L 300 ${y2}`} stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" fill="none" />
            ))
          )}
          {[50, 150, 250].map(y1 => 
            [150].map(y2 => (
              <path key={`c2-${y1}-${y2}`} d={`M 300 ${y1} L 450 ${y2}`} stroke="#c084fc" strokeWidth="1" strokeOpacity="0.3" fill="none" />
            ))
          )}
          
          {/* Input Nodes */}
          {[100, 200].map((y, i) => (
            <g key={`in-${i}`}>
              <circle cx="150" cy={y} r="15" fill="#082f49" stroke="#22d3ee" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px #22d3ee)' }} />
              <text x="150" y={y+4} textAnchor="middle" fill="#fff" fontSize="12" fontFamily="monospace">x{i+1}</text>
            </g>
          ))}
          
          {/* Hidden Nodes */}
          {[50, 150, 250].map((y, i) => (
            <g key={`h-${i}`}>
              <circle cx="300" cy={y} r="15" fill="#2e1065" stroke="#c084fc" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px #c084fc)' }} />
              <text x="300" y={y+4} textAnchor="middle" fill="#fff" fontSize="12" fontFamily="monospace">h{i+1}</text>
            </g>
          ))}

          {/* Output Node */}
          <g>
            <circle cx="450" cy="150" r="15" fill="#4c0519" stroke="#f472b6" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px #f472b6)' }} />
            <text x="450" y="154" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="monospace">y</text>
          </g>

          <text x="150" y="280" textAnchor="middle" fill="#22d3ee" fontSize="14" className="font-bold tracking-widest">INPUT</text>
          <text x="300" y="280" textAnchor="middle" fill="#c084fc" fontSize="14" className="font-bold tracking-widest">HIDDEN</text>
          <text x="450" y="280" textAnchor="middle" fill="#f472b6" fontSize="14" className="font-bold tracking-widest">OUTPUT</text>
        </svg>
      </div>
    </div>
  );
};

const ForwardPassView = () => {
  const [x1, setX1] = useState(1.0);
  const [x2, setX2] = useState(0.5);
  const [w1, setW1] = useState(0.8);
  const [w2, setW2] = useState(-0.6);
  const [b, setB] = useState(0.2);

  const z = (x1 * w1) + (x2 * w2) + b;
  const a = Math.max(0, z); // ReLU
  
  const glowIntensity = Math.min(1, Math.max(0, a / 2));
  const glowColor = `rgba(163, 230, 53, ${glowIntensity})`;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-lime-400" style={{ textShadow: '0 0 10px #a3e635' }}>⇛</span> Forward Propagation
        </h2>
        <p className="text-gray-400 leading-relaxed">
          Data flows from inputs to outputs. Each neuron computes a weighted sum of its inputs, adds a bias, and passes the result through an activation function (like ReLU). Play with the sliders to see how the neuron's activation changes!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        <div className="bg-gray-900/80 border border-lime-900/50 rounded-xl p-6 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-cyan-400 font-mono"><span>Input x₁: {x1.toFixed(2)}</span></div>
            <input type="range" min="-2" max="2" step="0.1" value={x1} onChange={(e) => setX1(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-cyan-400 font-mono"><span>Input x₂: {x2.toFixed(2)}</span></div>
            <input type="range" min="-2" max="2" step="0.1" value={x2} onChange={(e) => setX2(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-purple-400 font-mono"><span>Weight w₁: {w1.toFixed(2)}</span></div>
            <input type="range" min="-2" max="2" step="0.1" value={w1} onChange={(e) => setW1(parseFloat(e.target.value))} className="w-full accent-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-purple-400 font-mono"><span>Weight w₂: {w2.toFixed(2)}</span></div>
            <input type="range" min="-2" max="2" step="0.1" value={w2} onChange={(e) => setW2(parseFloat(e.target.value))} className="w-full accent-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-amber-400 font-mono"><span>Bias b: {b.toFixed(2)}</span></div>
            <input type="range" min="-2" max="2" step="0.1" value={b} onChange={(e) => setB(parseFloat(e.target.value))} className="w-full accent-amber-500" />
          </div>
        </div>

        <div className="relative flex items-center justify-center bg-gray-950/50 border border-lime-900/50 rounded-xl overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 300 300" className="absolute inset-0 m-auto">
            {/* W1 Line */}
            <path d="M 50 100 L 150 150" stroke={w1 > 0 ? '#10b981' : '#ef4444'} strokeWidth={Math.max(1, Math.abs(w1)*3)} strokeOpacity="0.7" />
            <text x="100" y="115" fill="#a855f7" fontSize="12" fontFamily="monospace">w₁</text>
            {/* W2 Line */}
            <path d="M 50 200 L 150 150" stroke={w2 > 0 ? '#10b981' : '#ef4444'} strokeWidth={Math.max(1, Math.abs(w2)*3)} strokeOpacity="0.7" />
            <text x="100" y="195" fill="#a855f7" fontSize="12" fontFamily="monospace">w₂</text>
            
            {/* Inputs */}
            <circle cx="50" cy="100" r="15" fill="#082f49" stroke="#22d3ee" strokeWidth="2" />
            <text x="50" y="104" textAnchor="middle" fill="#fff" fontSize="12">x₁</text>
            
            <circle cx="50" cy="200" r="15" fill="#082f49" stroke="#22d3ee" strokeWidth="2" />
            <text x="50" y="204" textAnchor="middle" fill="#fff" fontSize="12">x₂</text>

            {/* Neuron */}
            <circle cx="150" cy="150" r="25" fill="#064e3b" stroke="#a3e635" strokeWidth="2" 
                    style={{ filter: `drop-shadow(0 0 ${10 + a*10}px ${glowColor})`, transition: 'all 0.2s ease' }} />
            <text x="150" y="154" textAnchor="middle" fill="#fff" fontSize="12">∑</text>

            {/* Output Line */}
            <path d="M 175 150 L 250 150" stroke="#a3e635" strokeWidth={Math.max(1, a*2)} strokeOpacity="0.8" 
                  style={{ filter: `drop-shadow(0 0 5px ${glowColor})` }}/>
            <circle cx="250" cy="150" r="15" fill="#064e3b" stroke="#a3e635" strokeWidth="2" />
            <text x="250" y="154" textAnchor="middle" fill="#fff" fontSize="12">a</text>
          </svg>

          <div className="absolute bottom-4 left-4 right-4 text-center space-y-1">
            <MathBlock>
              z = ({x1.toFixed(2)} * {w1.toFixed(2)}) + ({x2.toFixed(2)} * {w2.toFixed(2)}) + {b.toFixed(2)} = <GlowText colorClass="text-white">{z.toFixed(2)}</GlowText>
              <br/>
              a = ReLU(z) = max(0, {z.toFixed(2)}) = <GlowText colorClass="text-lime-400">{a.toFixed(2)}</GlowText>
            </MathBlock>
          </div>
        </div>
      </div>
    </div>
  );
};

const BackpropView = () => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-pink-500" style={{ textShadow: '0 0 10px #ec4899' }}>⇚</span> Backpropagation
        </h2>
        <p className="text-gray-400 leading-relaxed">
          Backpropagation calculates the gradient of the loss function with respect to the weights using the <GlowText colorClass="text-pink-400">Chain Rule</GlowText>. This tells us how to adjust weights to minimize the error.
        </p>
      </div>

      <div className="flex-grow relative bg-gray-950/50 border border-pink-900/50 rounded-xl overflow-hidden flex items-center justify-center p-4">
        <svg width="100%" height="250" viewBox="0 0 600 250">
          <defs>
            <linearGradient id="gradFlow" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="1" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Forward Pass (dimmed) */}
          <path d="M 100 125 L 250 125 L 400 125 L 500 125" stroke="#334155" strokeWidth="4" fill="none" />
          
          <g transform="translate(100, 125)">
            <rect x="-30" y="-20" width="60" height="40" rx="4" fill="#1e293b" stroke="#475569" />
            <text x="0" y="5" textAnchor="middle" fill="#94a3b8" fontSize="14" fontFamily="monospace">w</text>
          </g>
          <g transform="translate(250, 125)">
            <rect x="-30" y="-20" width="60" height="40" rx="4" fill="#1e293b" stroke="#475569" />
            <text x="0" y="5" textAnchor="middle" fill="#94a3b8" fontSize="14" fontFamily="monospace">z</text>
          </g>
          <g transform="translate(400, 125)">
            <rect x="-30" y="-20" width="60" height="40" rx="4" fill="#1e293b" stroke="#475569" />
            <text x="0" y="5" textAnchor="middle" fill="#94a3b8" fontSize="14" fontFamily="monospace">a</text>
          </g>
          <g transform="translate(500, 125)">
            <circle cx="0" cy="0" r="20" fill="#4c0519" stroke="#be123c" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fill="#f43f5e" fontSize="14" fontFamily="monospace">L</text>
          </g>

          {/* Backward Pass Gradients */}
          <path d="M 500 160 L 400 160 L 250 160 L 100 160" stroke="url(#gradFlow)" strokeWidth="3" fill="none" strokeDasharray="10, 10">
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
          </path>

          <text x="450" y="185" textAnchor="middle" fill="#ec4899" fontSize="12" fontFamily="monospace">∂L/∂a</text>
          <text x="325" y="185" textAnchor="middle" fill="#ec4899" fontSize="12" fontFamily="monospace">∂L/∂a · ∂a/∂z</text>
          <text x="175" y="185" textAnchor="middle" fill="#ec4899" fontSize="12" fontFamily="monospace">∂L/∂z · ∂z/∂w</text>

        </svg>
      </div>

      <MathBlock>
        <span className="text-pink-400">Chain Rule for Weight Update:</span>
        <br/><br/>
        Δw = -η * <GlowText colorClass="text-pink-500">∂L / ∂w</GlowText>
        <br/><br/>
        <GlowText colorClass="text-pink-500">∂L / ∂w</GlowText> = (∂L / ∂a) * (∂a / ∂z) * (∂z / ∂w)
      </MathBlock>
    </div>
  );
};

const ActivationsView = () => {
  const [fn, setFn] = useState<'relu' | 'sigmoid' | 'tanh'>('relu');

  const funcs = {
    relu: { name: 'ReLU', eq: 'f(x) = max(0, x)', desc: 'Rectified Linear Unit. Fast, avoids vanishing gradients, but can suffer from "dying ReLU" problem.', path: 'M 50 200 L 150 200 L 250 50' },
    sigmoid: { name: 'Sigmoid', eq: 'f(x) = 1 / (1 + e⁻ˣ)', desc: 'Squashes output to [0, 1]. Historically popular, but suffers from vanishing gradients at extremes.', path: 'M 50 200 C 100 200, 125 200, 150 125 C 175 50, 200 50, 250 50' },
    tanh: { name: 'Tanh', eq: 'f(x) = (eˣ - e⁻ˣ) / (eˣ + e⁻ˣ)', desc: 'Squashes output to [-1, 1]. Zero-centered, generally preferred over sigmoid for hidden layers.', path: 'M 50 250 C 100 250, 125 250, 150 150 C 175 50, 200 50, 250 50' },
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white tracking-wider flex items-center gap-3">
          <span className="text-purple-400" style={{ textShadow: '0 0 10px #c084fc' }}>∿</span> Activation Functions
        </h2>
        <p className="text-gray-400 leading-relaxed">
          Without non-linear activation functions, a deep neural network would just be a complex linear regression model. Activations allow networks to learn complex, non-linear mappings.
        </p>
      </div>

      <div className="flex gap-4 mb-4">
        {(Object.keys(funcs) as Array<keyof typeof funcs>).map(k => (
          <button
            key={k}
            onClick={() => setFn(k)}
            className={`px-4 py-2 rounded-md border text-sm font-bold transition-all ${
              fn === k 
                ? 'bg-purple-900/50 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(192,132,252,0.5)]' 
                : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
            }`}
          >
            {funcs[k].name}
          </button>
        ))}
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-950/80 border border-purple-900/50 rounded-xl flex items-center justify-center p-4 relative">
          <svg width="100%" height="100%" viewBox="0 0 300 300" className="max-h-64">
            {/* Grid */}
            <line x1="150" y1="0" x2="150" y2="300" stroke="#334155" strokeWidth="1" />
            <line x1="0" y1="150" x2="300" y2="150" stroke="#334155" strokeWidth="1" />
            <text x="280" y="140" fill="#64748b" fontSize="12">x</text>
            <text x="160" y="20" fill="#64748b" fontSize="12">f(x)</text>

            <path d={funcs[fn].path} stroke="#c084fc" strokeWidth="4" fill="none" 
                  style={{ filter: 'drop-shadow(0 0 8px rgba(192,132,252,0.8))' }} />
          </svg>
        </div>

        <div className="flex flex-col justify-center space-