import React, { useState } from 'react';

// --- Types ---
type TabId = 'architecture' | 'forward' | 'activations' | 'backprop' | 'loss';

interface Tab {
  id: TabId;
  title: string;
  icon: string;
}

// --- Data ---
const TABS: Tab[] = [
  { id: 'architecture', title: 'Architecture', icon: '🧠' },
  { id: 'forward', title: 'Forward Pass', icon: '➡️' },
  { id: 'activations', title: 'Activations', icon: '⚡' },
  { id: 'backprop', title: 'Backpropagation', icon: '⬅️' },
  { id: 'loss', title: 'Loss & Gradients', icon: '📉' }
];

// --- Helper Components ---
const MathBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg font-mono text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] my-4 overflow-x-auto text-sm md:text-base">
    {children}
  </div>
);

const NeonGlowFilter = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-pink" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

// --- SVG Diagrams ---
const ArchitectureSVG = () => (
  <svg viewBox="0 0 400 200" className="w-full h-48 md:h-64 mb-6">
    {/* Connections */}
    <g stroke="#334155" strokeWidth="2">
      {/* Input to Hidden */}
      <line x1="80" y1="60" x2="200" y2="40" className="stroke-cyan-500/30" />
      <line x1="80" y1="60" x2="200" y2="100" className="stroke-cyan-500/30" />
      <line x1="80" y1="60" x2="200" y2="160" className="stroke-cyan-500/30" />
      <line x1="80" y1="140" x2="200" y2="40" className="stroke-cyan-500/30" />
      <line x1="80" y1="140" x2="200" y2="100" className="stroke-cyan-500/30" />
      <line x1="80" y1="140" x2="200" y2="160" className="stroke-cyan-500/30" />
      {/* Hidden to Output */}
      <line x1="200" y1="40" x2="320" y2="100" className="stroke-purple-500/30" />
      <line x1="200" y1="100" x2="320" y2="100" className="stroke-purple-500/30" />
      <line x1="200" y1="160" x2="320" y2="100" className="stroke-purple-500/30" />
    </g>
    
    {/* Nodes */}
    <g filter="url(#glow-cyan)">
      <circle cx="80" cy="60" r="16" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
      <circle cx="80" cy="140" r="16" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
      <text x="80" y="65" fill="#06b6d4" fontSize="14" textAnchor="middle" className="font-mono">X1</text>
      <text x="80" y="145" fill="#06b6d4" fontSize="14" textAnchor="middle" className="font-mono">X2</text>
    </g>
    
    <g filter="url(#glow-purple)">
      <circle cx="200" cy="40" r="16" fill="#0f172a" stroke="#a855f7" strokeWidth="3" />
      <circle cx="200" cy="100" r="16" fill="#0f172a" stroke="#a855f7" strokeWidth="3" />
      <circle cx="200" cy="160" r="16" fill="#0f172a" stroke="#a855f7" strokeWidth="3" />
      <text x="200" y="45" fill="#a855f7" fontSize="14" textAnchor="middle" className="font-mono">H1</text>
      <text x="200" y="105" fill="#a855f7" fontSize="14" textAnchor="middle" className="font-mono">H2</text>
      <text x="200" y="165" fill="#a855f7" fontSize="14" textAnchor="middle" className="font-mono">H3</text>
    </g>

    <g filter="url(#glow-pink)">
      <circle cx="320" cy="100" r="16" fill="#0f172a" stroke="#ec4899" strokeWidth="3" />
      <text x="320" y="105" fill="#ec4899" fontSize="14" textAnchor="middle" className="font-mono">Y</text>
    </g>
  </svg>
);

const ActivationSVG = () => (
  <svg viewBox="0 0 400 200" className="w-full h-48 md:h-64 mb-6 bg-slate-900 rounded-lg border border-slate-800">
    {/* Grid and Axes */}
    <g stroke="#334155" strokeWidth="1" strokeDasharray="4,4">
      <line x1="0" y1="100" x2="400" y2="100" />
      <line x1="200" y1="0" x2="200" y2="200" />
    </g>
    
    {/* ReLU */}
    <path d="M 50 100 L 200 100 L 350 20" fill="none" stroke="#06b6d4" strokeWidth="3" filter="url(#glow-cyan)" />
    <text x="360" y="30" fill="#06b6d4" fontSize="14" className="font-mono drop-shadow-md">ReLU</text>

    {/* Sigmoid */}
    <path d="M 50 180 C 150 180, 150 20, 350 20" fill="none" stroke="#ec4899" strokeWidth="3" filter="url(#glow-pink)" />
    <text x="360" y="60" fill="#ec4899" fontSize="14" className="font-mono drop-shadow-md">Sigmoid</text>

    {/* Tanh */}
    <path d="M 50 180 C 150 180, 250 20, 350 20" fill="none" stroke="#a855f7" strokeWidth="3" filter="url(#glow-purple)" strokeDasharray="6,4" />
    <text x="360" y="90" fill="#a855f7" fontSize="14" className="font-mono drop-shadow-md">Tanh</text>
  </svg>
);

const BackpropSVG = () => (
  <svg viewBox="0 0 400 200" className="w-full h-48 md:h-64 mb-6">
    {/* Forward nodes ghosted */}
    <circle cx="80" cy="100" r="16" fill="#0f172a" stroke="#475569" strokeWidth="2" />
    <circle cx="200" cy="100" r="16" fill="#0f172a" stroke="#475569" strokeWidth="2" />
    <circle cx="320" cy="100" r="16" fill="#0f172a" stroke="#475569" strokeWidth="2" />
    
    {/* Error gradients flowing backward */}
    <g filter="url(#glow-pink)">
      <path d="M 300 90 L 220 90" fill="none" stroke="#ec4899" strokeWidth="4" strokeDasharray="8,4" />
      <polygon points="220,90 230,85 230,95" fill="#ec4899" />
      <text x="260" y="80" fill="#ec4899" fontSize="14" textAnchor="middle" className="font-mono">∂L/∂W2</text>
    </g>

    <g filter="url(#glow-cyan)">
      <path d="M 180 110 L 100 110" fill="none" stroke="#06b6d4" strokeWidth="4" strokeDasharray="8,4" />
      <polygon points="100,110 110,105 110,115" fill="#06b6d4" />
      <text x="140" y="130" fill="#06b6d4" fontSize="14" textAnchor="middle" className="font-mono">∂L/∂W1</text>
    </g>
  </svg>
);

// --- Main Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('architecture');

  const renderContent = () => {
    switch (activeTab) {
      case 'architecture':
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              Multi-Layer Perceptron (MLP)
            </h2>
            <ArchitectureSVG />
            <p className="text-slate-300 leading-relaxed mb-4">
              A single hidden-layer MLP is the simplest form of a deep neural network. It consists of three parts:
            </p>
            <ul className="space-y-3 text-slate-400">
              <li>
                <span className="text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">Input Layer:</span> Features fed into the network (e.g., x, y coordinates for toy datasets).
              </li>
              <li>
                <span className="text-purple-400 font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">Hidden Layer:</span> Neurons that apply linear transformations followed by non-linear activations, allowing the network to learn complex boundaries.
              </li>
              <li>
                <span className="text-pink-400 font-bold drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]">Output Layer:</span> Produces the final prediction (e.g., a probability between 0 and 1).
              </li>
            </ul>
          </div>
        );

      case 'forward':
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              The Forward Pass
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Data flows from left to right. Each neuron computes a weighted sum of its inputs, adds a bias, and passes the result through an activation function.
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg text-purple-400 font-semibold mb-2">1. Hidden Layer Calculation</h3>
                <MathBlock>
                  <div className="mb-2 text-slate-400"># Linear Step</div>
                  Z<sup className="text-xs">(1)</sup> = W<sup className="text-xs">(1)</sup> · X + b<sup className="text-xs">(1)</sup>
                  <br /><br />
                  <div className="mb-2 text-slate-400"># Activation Step</div>
                  A<sup className="text-xs">(1)</sup> = f(Z<sup className="text-xs">(1)</sup>)
                </MathBlock>
              </div>

              <div>
                <h3 className="text-lg text-pink-400 font-semibold mb-2">2. Output Layer Calculation</h3>
                <MathBlock>
                  <div className="mb-2 text-slate-400"># Linear Step</div>
                  Z<sup className="text-xs">(2)</sup> = W<sup className="text-xs">(2)</sup> · A<sup className="text-xs">(1)</sup> + b<sup className="text-xs">(2)</sup>
                  <br /><br />
                  <div className="mb-2 text-slate-400"># Final Prediction</div>
                  Y<sub className="text-xs">pred</sub> = σ(Z<sup className="text-xs">(2)</sup>)
                </MathBlock>
              </div>
            </div>
          </div>
        );

      case 'activations':
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              Activation Functions
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Without activation functions, neural networks would just be linear regression models. Non-linearities allow them to warp space and solve complex problems like XOR or Spirals.
            </p>
            
            <ActivationSVG />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/30">
                <h4 className="text-cyan-400 font-bold mb-2">ReLU</h4>
                <p className="text-xs text-slate-400 font-mono mb-2">f(x) = max(0, x)</p>
                <p className="text-sm text-slate-300">Standard for hidden layers. Fast to compute, prevents vanishing gradients, but can suffer from "dead neurons".</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded border border-pink-500/30">
                <h4 className="text-pink-400 font-bold mb-2">Sigmoid</h4>
                <p className="text-xs text-slate-400 font-mono mb-2">f(x) = 1 / (1 + e^-x)</p>
                <p className="text-sm text-slate-300">Squashes values to [0, 1]. Great for binary classification outputs, but gradients vanish at extremes.</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded border border-purple-500/30">
                <h4 className="text-purple-400 font-bold mb-2">Tanh</h4>
                <p className="text-xs text-slate-400 font-mono mb-2">f(x) = (e^x - e^-x)/(e^x + e^-x)</p>
                <p className="text-sm text-slate-300">Squashes to [-1, 1]. Often performs better than sigmoid in hidden layers as it centers data around zero.</p>
              </div>
            </div>
          </div>
        );

      case 'backprop':
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              Backpropagation
            </h2>
            <BackpropSVG />
            <p className="text-slate-300 leading-relaxed mb-4">
              Backprop is how the network learns. It propagates the error backwards from the output layer to the input layer using the <span className="text-cyan-400 font-mono">Chain Rule of Calculus</span>, computing how much each weight contributed to the error.
            </p>
            
            <MathBlock>
              <div className="mb-2 text-pink-400"># 1. Error at Output</div>
              δ<sup className="text-xs">(2)</sup> = dL/dZ<sup className="text-xs">(2)</sup> = Y<sub className="text-xs">pred</sub> - Y<sub className="text-xs">true</sub>
              <br /><br />
              <div className="mb-2 text-purple-400"># 2. Output Gradients</div>
              ∂L/∂W<sup className="text-xs">(2)</sup> = δ<sup className="text-xs">(2)</sup> · (A<sup className="text-xs">(1)</sup>)<sup className="text-xs">T</sup>
              <br /><br />
              <div className="mb-2 text-cyan-400"># 3. Error at Hidden</div>
              δ<sup className="text-xs">(1)</sup> = (W<sup className="text-xs">(2)T</sup> · δ<sup className="text-xs">(2)</sup>) ⊙ f'(Z<sup className="text-xs">(1)</sup>)
              <br /><br />
              <div className="mb-2 text-cyan-300"># 4. Hidden Gradients</div>
              ∂L/∂W<sup className="text-xs">(1)</sup> = δ<sup className="text-xs">(1)</sup> · X<sup className="text-xs">T</sup>
            </MathBlock>
          </div>
        );

      case 'loss':
        return (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              Loss Functions & Optimization
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              The Loss Function defines "how wrong" the network is. The optimizer (like Gradient Descent) adjusts the weights to minimize this loss over time.
            </p>

            <h3 className="text-lg text-pink-400 font-semibold mt-6 mb-2">Binary Cross-Entropy Loss</h3>
            <p className="text-sm text-slate-400 mb-2">Used for binary classification tasks (like predicting orange vs. blue dots).</p>
            <MathBlock>
              L = - [ y · log(ŷ) + (1 - y) · log(1 - ŷ) ]
            </MathBlock>

            <h3 className="text-lg text-cyan-400 font-semibold mt-6 mb-2">Gradient Descent Update</h3>
            <p className="text-sm text-slate-400 mb-2">Weights are nudged in the opposite direction of the gradient by a factor of the Learning Rate (η).</p>
            <MathBlock>
              W<sub className="text-xs">new</sub> = W<sub className="text-xs">old</sub> - η · (∂L/∂W)
              <br />
              b<sub className="text-xs">new</sub> = b<sub className="text-xs">old</sub> - η · (∂L/∂b)
            </MathBlock>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans flex justify-center">
      <NeonGlowFilter />
      
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Header spanning full width */}
        <div className="md:col-span-12 border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-tight">
              Theory & Reference
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-mono">
              Neural Net Forward/Backward Viewer
            </p>
          </div>
          <div className="hidden md:flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse delay-75 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
            <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse delay-150 shadow-[0_0_10px_rgba(236,72,153,0.8)]"></div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="md:col-span-3 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-300 min-w-max md:min-w-full
                  ${isActive 
                    ? 'bg-slate-800/80 border-l-4 border-cyan-400 text-cyan-300 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
                    : 'bg-slate-900/50 border-l-4 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }
                `}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-semibold text-sm tracking-wide">{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-9 bg-slate-900/40 border border-slate-800 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
          {/* Decorative background grid */}
          <div className="absolute inset-0 pointer-events-none opacity-10" 
               style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>
          
          <div className="relative z-10">
            {renderContent()}
          </div>
        </div>

      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}