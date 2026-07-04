import React, { useState, useEffect } from 'react';

// --- Helper Components & Math ---

const MathBlock = ({ children, color = "text-cyan-400" }: { children: React.ReactNode, color?: string }) => (
  <div className={`font-mono text-lg bg-gray-950 border border-gray-800 p-4 rounded-lg shadow-inner ${color} drop-shadow-[0_0_5px_currentColor] overflow-x-auto`}>
    {children}
  </div>
);

const NeonCard = ({ children, title, glowColor = "cyan" }: { children: React.ReactNode, title?: string, glowColor?: string }) => {
  const glowMap: Record<string, string> = {
    cyan: "shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-900/50",
    fuchsia: "shadow-[0_0_15px_rgba(217,70,239,0.15)] border-fuchsia-900/50",
    emerald: "shadow-[0_0_15px_rgba(52,211,153,0.15)] border-emerald-900/50",
    amber: "shadow-[0_0_15px_rgba(251,191,36,0.15)] border-amber-900/50",
  };

  return (
    <div className={`bg-gray-900 border rounded-xl p-6 ${glowMap[glowColor] || glowMap.cyan} transition-all duration-300`}>
      {title && <h3 className={`text-xl font-bold mb-4 text-${glowColor}-400 drop-shadow-[0_0_8px_currentColor]`}>{title}</h3>}
      {children}
    </div>
  );
};

// --- SVG Visualizations ---

const NeuronSVG = () => {
  return (
    <div className="w-full flex justify-center my-8">
      <svg width="400" height="250" viewBox="0 0 400 250" className="max-w-full">
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-fuchsia" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Inputs */}
        <circle cx="50" cy="50" r="15" fill="#1e293b" stroke="#22d3ee" strokeWidth="2" filter="url(#glow-cyan)" />
        <text x="50" cy="55" fill="#22d3ee" fontSize="14" textAnchor="middle" fontFamily="monospace">x₁</text>
        
        <circle cx="50" cy="125" r="15" fill="#1e293b" stroke="#22d3ee" strokeWidth="2" filter="url(#glow-cyan)" />
        <text x="50" cy="130" fill="#22d3ee" fontSize="14" textAnchor="middle" fontFamily="monospace">x₂</text>
        
        <circle cx="50" cy="200" r="15" fill="#1e293b" stroke="#22d3ee" strokeWidth="2" filter="url(#glow-cyan)" />
        <text x="50" cy="205" fill="#22d3ee" fontSize="14" textAnchor="middle" fontFamily="monospace">x₃</text>

        {/* Weights (Lines) */}
        <line x1="65" y1="50" x2="180" y2="110" stroke="#475569" strokeWidth="2" className="animate-pulse" />
        <text x="110" y="70" fill="#94a3b8" fontSize="12" fontFamily="monospace">w₁</text>

        <line x1="65" y1="125" x2="180" y2="125" stroke="#475569" strokeWidth="2" className="animate-pulse" />
        <text x="110" y="120" fill="#94a3b8" fontSize="12" fontFamily="monospace">w₂</text>

        <line x1="65" y1="200" x2="180" y2="140" stroke="#475569" strokeWidth="2" className="animate-pulse" />
        <text x="110" y="180" fill="#94a3b8" fontSize="12" fontFamily="monospace">w₃</text>

        {/* Neuron Body */}
        <circle cx="220" cy="125" r="40" fill="#0f172a" stroke="#d946ef" strokeWidth="3" filter="url(#glow-fuchsia)" />
        <line x1="220" y1="85" x2="220" y2="165" stroke="#d946ef" strokeWidth="1" strokeDasharray="4 2" />
        
        <text x="200" y="130" fill="#d946ef" fontSize="16" textAnchor="middle" fontFamily="monospace">Σ</text>
        <text x="240" y="130" fill="#d946ef" fontSize="16" textAnchor="middle" fontFamily="monospace">f(z)</text>

        {/* Bias */}
        <circle cx="220" cy="40" r="12" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" filter="url(#glow-cyan)" />
        <text x="220" y="45" fill="#fbbf24" fontSize="12" textAnchor="middle" fontFamily="monospace">b</text>
        <line x1="220" y1="52" x2="220" y2="85" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 2" />

        {/* Output */}
        <line x1="260" y1="125" x2="340" y2="125" stroke="#d946ef" strokeWidth="3" filter="url(#glow-fuchsia)" />
        <circle cx="355" cy="125" r="15" fill="#1e293b" stroke="#d946ef" strokeWidth="2" filter="url(#glow-fuchsia)" />
        <text x="355" y="130" fill="#d946ef" fontSize="14" textAnchor="middle" fontFamily="monospace">y</text>
      </svg>
    </div>
  );
};

const BackpropSVG = () => {
  return (
    <div className="w-full flex justify-center my-8 overflow-hidden">
      <svg width="500" height="150" viewBox="0 0 500 150" className="max-w-full">
        <defs>
          <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker id="arrow-magenta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#d946ef" />
          </marker>
          <marker id="arrow-gray" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
          </marker>
        </defs>

        {/* Forward Pass (Faded) */}
        <path d="M 50 100 L 150 100 L 250 100 L 350 100 L 450 100" stroke="#475569" strokeWidth="2" fill="none" markerMid="url(#arrow-gray)" markerEnd="url(#arrow-gray)" strokeDasharray="5 5" />
        <text x="250" y="120" fill="#475569" fontSize="12" textAnchor="middle" fontFamily="monospace">Forward Pass</text>

        {/* Nodes */}
        <rect x="30" y="30" width="40" height="40" rx="8" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
        <text x="50" y="55" fill="#22d3ee" fontSize="16" textAnchor="middle" fontFamily="monospace">W</text>

        <rect x="130" y="30" width="40" height="40" rx="8" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
        <text x="150" y="55" fill="#22d3ee" fontSize="16" textAnchor="middle" fontFamily="monospace">Z</text>

        <rect x="230" y="30" width="40" height="40" rx="8" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
        <text x="250" y="55" fill="#22d3ee" fontSize="16" textAnchor="middle" fontFamily="monospace">A</text>

        <rect x="330" y="30" width="40" height="40" rx="8" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
        <text x="350" y="55" fill="#22d3ee" fontSize="16" textAnchor="middle" fontFamily="monospace">Y^</text>

        <rect x="430" y="30" width="40" height="40" rx="8" fill="#4c0519" stroke="#f43f5e" strokeWidth="2" />
        <text x="450" y="55" fill="#f43f5e" fontSize="16" textAnchor="middle" fontFamily="monospace">L</text>

        {/* Backward Pass (Glowing) */}
        <path d="M 420 50 L 380 50" stroke="#d946ef" strokeWidth="3" markerStart="url(#arrow-magenta)" filter="url(#glow-magenta)" className="animate-pulse" />
        <text x="400" y="25" fill="#d946ef" fontSize="14" textAnchor="middle" fontFamily="monospace">∂L/∂Y^</text>

        <path d="M 320 50 L 280 50" stroke="#d946ef" strokeWidth="3" markerStart="url(#arrow-magenta)" filter="url(#glow-magenta)" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
        <text x="300" y="25" fill="#d946ef" fontSize="14" textAnchor="middle" fontFamily="monospace">∂Y^/∂A</text>

        <path d="M 220 50 L 180 50" stroke="#d946ef" strokeWidth="3" markerStart="url(#arrow-magenta)" filter="url(#glow-magenta)" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
        <text x="200" y="25" fill="#d946ef" fontSize="14" textAnchor="middle" fontFamily="monospace">∂A/∂Z</text>

        <path d="M 120 50 L 80 50" stroke="#d946ef" strokeWidth="3" markerStart="url(#arrow-magenta)" filter="url(#glow-magenta)" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
        <text x="100" y="25" fill="#d946ef" fontSize="14" textAnchor="middle" fontFamily="monospace">∂Z/∂W</text>
      </svg>
    </div>
  );
};

const ActivationGraph = ({ type }: { type: 'relu' | 'sigmoid' | 'tanh' }) => {
  const width = 400;
  const height = 200;
  
  const getPath = () => {
    let d = "";
    for (let px = 0; px <= width; px += 2) {
      const x = (px / width) * 10 - 5; // Domain: -5 to 5
      let y = 0;
      
      if (type === 'relu') y = Math.max(0, x);
      if (type === 'sigmoid') y = 1 / (1 + Math.exp(-x));
      if (type === 'tanh') y = Math.tanh(x);

      // Range mapping:
      // relu: [0, 5] -> map to fit
      // sigmoid: [0, 1]
      // tanh: [-1, 1]
      
      let py = 0;
      if (type === 'relu') {
        py = height - ((y + 1) / 6) * height; 
      } else {
        py = height - ((y + 1.5) / 3) * height;
      }
      
      d += `${px === 0 ? 'M' : 'L'} ${px} ${py} `;
    }
    return d;
  };

  return (
    <div className="relative w-full max-w-[400px] mx-auto bg-gray-950 border border-gray-800 rounded-lg p-4 shadow-inner">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Grid & Axes */}
        <line x1="0" y1={type === 'relu' ? height - (1/6)*height : height/2} x2={width} y2={type === 'relu' ? height - (1/6)*height : height/2} stroke="#334155" strokeWidth="2" />
        <line x1={width/2} y1="0" x2={width/2} y2={height} stroke="#334155" strokeWidth="2" />
        
        {/* Function Path */}
        <path d={getPath()} fill="none" stroke="#34d399" strokeWidth="3" filter="url(#glow-emerald)" />
      </svg>
      <div className="absolute top-2 right-4 text-emerald-400 font-mono text-sm opacity-70">
        {type === 'relu' && 'f(x) = max(0, x)'}
        {type === 'sigmoid' && 'f(x) = 1 / (1 + e^(-x))'}
        {type === 'tanh' && 'f(x) = tanh(x)'}
      </div>
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'forward' | 'backward' | 'activations' | 'glossary'>('forward');
  const [activeFunc, setActiveFunc] = useState<'relu' | 'sigmoid' | 'tanh'>('relu');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-cyan-900 selection:text-cyan-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-6xl w-full flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              Neural Codex
            </h1>
            <p className="text-gray-400 text-sm mt-1 font-mono">Theory & Reference</p>
          </div>

          <nav className="flex flex-col gap-2 font-mono">
            {[
              { id: 'forward', label: 'Forward Pass', color: 'cyan' },
              { id: 'backward', label: 'Backpropagation', color: 'fuchsia' },
              { id: 'activations', label: 'Activations', color: 'emerald' },
              { id: 'glossary', label: 'Glossary', color: 'amber' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                  activeTab === tab.id
                    ? `bg-gray-900 border-${tab.color}-500 text-${tab.color}-400 shadow-[0_0_10px_rgba(var(--tw-colors-${tab.color}-500),0.3)]`
                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <span className="mr-2 opacity-50">&gt;</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative">
          
          {/* Forward Pass Tab */}
          {activeTab === 'forward' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <NeonCard title="The Forward Pass" glowColor="cyan">
                <p className="text-gray-300 mb-4 leading-relaxed">
                  The forward pass is how a neural network makes predictions. Data flows from the input layer, through the hidden layers, to the output layer. Each neuron computes a weighted sum of its inputs, adds a bias, and passes the result through an activation function.
                </p>
                
                <NeuronSVG />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-bold">1. Linear Transformation</h4>
                    <MathBlock color="text-cyan-400">
                      z = <span className="text-white">W</span> · <span className="text-white">x</span> + <span className="text-white">b</span>
                    </MathBlock>
                    <p className="text-xs text-gray-400 mt-2">
                      Where <span className="text-cyan-400">W</span> is the weight matrix, <span className="text-cyan-400">x</span> is the input vector, and <span className="text-cyan-400">b</span> is the bias.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-bold">2. Non-Linear Activation</h4>
                    <MathBlock color="text-fuchsia-400">
                      a = f(z)
                    </MathBlock>
                    <p className="text-xs text-gray-400 mt-2">
                      The activation function <span className="text-fuchsia-400">f()</span> introduces non-linearity, allowing the network to learn complex patterns.
                    </p>
                  </div>
                </div>
              </NeonCard>
            </div>
          )}

          {/* Backward Pass Tab */}
          {activeTab === 'backward' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <NeonCard title="Backpropagation & Gradient Descent" glowColor="fuchsia">
                <p className="text-gray-300 mb-4 leading-relaxed">
                  Backpropagation is the algorithm used to calculate the gradient of the loss function with respect to the network's weights. It uses the <strong>Chain Rule</strong> of calculus to propagate the error backward from the output to the inputs.
                </p>

                <BackpropSVG />

                <div className="space-y-4 mt-8">
                  <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-bold">The Chain Rule in Action</h4>
                  <MathBlock color="text-fuchsia-400">
                    <div className="flex items-center gap-2">
                      <span>∂L / ∂W</span>
                      <span className="text-gray-500">=</span>
                      <span className="text-cyan-400">(∂L / ∂Y^)</span>
                      <span className="text-gray-500">×</span>
                      <span className="text-emerald-400">(∂Y^ / ∂A)</span>
                      <span className="text-gray-500">×</span>
                      <span className="text-amber-400">(∂A / ∂Z)</span>
                      <span className="text-gray-500">×</span>
                      <span className="text-fuchsia-400">(∂Z / ∂W)</span>
                    </div>
                  </MathBlock>
                  
                  <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 mt-4">
                    <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-bold">Weight Update (Gradient Descent)</h4>
                    <MathBlock color="text-white">
                      W<sub>new</sub> = W<sub>old</sub> - <span className="text-fuchsia-500">η</span> · (∂L / ∂W)
                    </MathBlock>
                    <p className="text-xs text-gray-400 mt-2">
                      <span className="text-fuchsia-500 font-bold">η</span> (eta) is the learning rate, controlling how big of a step we take in the direction opposite to the gradient.
                    </p>
                  </div>
                </div>
              </NeonCard>
            </div>
          )}

          {/* Activations Tab */}
          {activeTab === 'activations' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <NeonCard title="Activation Functions" glowColor="emerald">
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Without activation functions, a neural network would just be a giant linear regression model, no matter how many layers it has. They squash or threshold the outputs of neurons.
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {(['relu', 'sigmoid', 'tanh'] as const).map((fn) => (
                    <button
                      key={fn}
                      onClick={() => setActiveFunc(fn)}
                      className={`px-4 py-2 rounded font-mono text-sm transition-colors ${
                        activeFunc === fn 
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]' 
                          : 'bg-gray-900 text-gray-400 border border-gray-700 hover:border-