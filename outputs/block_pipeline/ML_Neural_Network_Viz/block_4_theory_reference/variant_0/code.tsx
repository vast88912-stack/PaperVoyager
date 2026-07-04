import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Activity, GitMerge, Calculator, ChevronRight, Info, Play } from 'lucide-react';

// --- Helper Math Functions ---
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const relu = (x: number) => Math.max(0, x);
const tanh = (x: number) => Math.tanh(x);

// --- Components ---

const MathBlock = ({ children, neon = false, color = 'cyan' }: { children: React.ReactNode, neon?: boolean, color?: 'cyan' | 'pink' }) => {
  const colors = {
    cyan: 'text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]',
    pink: 'text-pink-300 drop-shadow-[0_0_5px_rgba(249,168,212,0.8)]'
  };
  
  return (
    <div className={`font-mono text-lg bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex items-center justify-center overflow-x-auto ${neon ? colors[color] : 'text-slate-300'}`}>
      {children}
    </div>
  );
};

const InteractiveNeuron = () => {
  const [x1, setX1] = useState(1.0);
  const [x2, setX2] = useState(-0.5);
  const [w1, setW1] = useState(0.8);
  const [w2, setW2] = useState(-1.2);
  const [b, setB] = useState(0.5);
  const [act, setAct] = useState<'ReLU' | 'Sigmoid' | 'Tanh'>('ReLU');

  const z = x1 * w1 + x2 * w2 + b;
  const a = act === 'ReLU' ? relu(z) : act === 'Sigmoid' ? sigmoid(z) : tanh(z);

  const getGlow = (val: number, max: number = 2) => {
    const intensity = Math.min(Math.abs(val) / max, 1);
    return `rgba(34, 211, 238, ${intensity * 0.8})`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900/50 rounded-xl border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] flex items-center gap-2">
          <Play size={20} /> Interactive Forward Pass
        </h3>
        <select 
          value={act} 
          onChange={(e) => setAct(e.target.value as any)}
          className="bg-slate-800 text-cyan-300 border border-cyan-500/50 rounded px-3 py-1 outline-none focus:border-cyan-400"
        >
          <option value="ReLU">ReLU</option>
          <option value="Sigmoid">Sigmoid</option>
          <option value="Tanh">Tanh</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* SVG Visualization */}
        <div className="relative w-full aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Connections */}
            <path d="M 100 50 L 250 100" stroke={w1 >= 0 ? '#22d3ee' : '#f43f5e'} strokeWidth={Math.max(1, Math.abs(w1) * 3)} opacity={0.6} />
            <path d="M 100 150 L 250 100" stroke={w2 >= 0 ? '#22d3ee' : '#f43f5e'} strokeWidth={Math.max(1, Math.abs(w2) * 3)} opacity={0.6} />
            
            {/* Bias Connection */}
            <path d="M 250 30 L 250 80" stroke="#a78bfa" strokeWidth={Math.max(1, Math.abs(b) * 3)} strokeDasharray="4,4" opacity={0.6} />

            {/* Input Nodes */}
            <circle cx="100" cy="50" r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" style={{ boxShadow: `0 0 10px ${getGlow(x1)}` }} filter="url(#glow)" />
            <text x="100" y="55" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">x₁</text>
            
            <circle cx="100" cy="150" r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" filter="url(#glow)" />
            <text x="100" y="155" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">x₂</text>

            {/* Bias Node */}
            <circle cx="250" cy="20" r="15" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" filter="url(#glow)" />
            <text x="250" y="24" fill="#fff" fontSize="10" textAnchor="middle" className="font-mono">b</text>

            {/* Hidden Node */}
            <circle cx="250" cy="100" r="30" fill="#0f172a" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth="3" filter="url(#glow)" />
            <text x="250" y="95" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">Σ</text>
            <text x="250" y="115" fill="#94a3b8" fontSize="10" textAnchor="middle" className="font-mono">f(z)</text>

            {/* Output Connection */}
            <path d="M 280 100 L 360 100" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth={Math.max(1, Math.abs(a) * 4)} opacity={0.8} filter="url(#glow)" />
            
            {/* Output Node */}
            <circle cx="360" cy="100" r="15" fill="#0f172a" stroke={a > 0 ? '#22d3ee' : '#475569'} strokeWidth="2" filter="url(#glow)" />
            <text x="360" y="104" fill="#fff" fontSize="12" textAnchor="middle" className="font-mono">a</text>

            {/* Weight Labels */}
            <text x="160" y="65" fill={w1 >= 0 ? '#67e8f9' : '#fda4af'} fontSize="10" className="font-mono">w₁={w1.toFixed(1)}</text>
            <text x="160" y="145" fill={w2 >= 0 ? '#67e8f9' : '#fda4af'} fontSize="10" className="font-mono">w₂={w2.toFixed(1)}</text>
          </svg>
        </div>

        {/* Controls & Math */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono flex justify-between"><span>x₁ (Input 1)</span> <span className="text-cyan-300">{x1.toFixed(2)}</span></label>
              <input type="range" min="-2" max="2" step="0.1" value={x1} onChange={(e) => setX1(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono flex justify-between"><span>w₁ (Weight 1)</span> <span className={w1 >= 0 ? 'text-cyan-300' : 'text-pink-300'}>{w1.toFixed(2)}</span></label>
              <input type="range" min="-2" max="2" step="0.1" value={w1} onChange={(e) => setW1(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono flex justify-between"><span>x₂ (Input 2)</span> <span className="text-cyan-300">{x2.toFixed(2)}</span></label>
              <input type="range" min="-2" max="2" step="0.1" value={x2} onChange={(e) => setX2(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono flex justify-between"><span>w₂ (Weight 2)</span> <span className={w2 >= 0 ? 'text-cyan-300' : 'text-pink-300'}>{w2.toFixed(2)}</span></label>
              <input type="range" min="-2" max="2" step="0.1" value={w2} onChange={(e) => setW2(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-slate-400 font-mono flex justify-between"><span>b (Bias)</span> <span className="text-purple-300">{b.toFixed(2)}</span></label>
              <input type="range" min="-2" max="2" step="0.1" value={b} onChange={(e) => setB(parseFloat(e.target.value))} className="w-full accent-purple-400" />
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-950 rounded border border-slate-800 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">1. Linear Combination (z):</span>
              <span className="text-slate-300">z = (x₁·w₁) + (x₂·w₂) + b</span>
            </div>
            <div className="flex justify-between text-cyan-200">
              <span></span>
              <span>z = ({x1.toFixed(1)}·{w1.toFixed(1)}) + ({x2.toFixed(1)}·{w2.toFixed(1)}) + {b.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-cyan-400 font-bold border-b border-slate-800 pb-2">
              <span></span>
              <span>z = {z.toFixed(3)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-400">2. Activation (a):</span>
              <span className="text-slate-300">a = {act}(z)</span>
            </div>
            <div className="flex justify-between text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
              <span></span>
              <span>a = {a.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivationCard = ({ name, formula, derivative, pathD, color }: { name: string, formula: string, derivative: string, pathD: string, color: string }) => (
  <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors flex flex-col gap-4">
    <h4 className="text-lg font-bold text-slate-200">{name}</h4>
    <div className="w-full aspect-square bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
      <div className="absolute w-full h-[1px] bg-slate-600 top-1/2"></div>
      <div className="absolute h-full w-[1px] bg-slate-600 left-1/2"></div>
      
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible">
        <defs>
          <filter id={`glow-${name}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" filter={`url(#glow-${name})`} />
      </svg>
    </div>
    <div className="font-mono text-sm space-y-2">
      <div className="flex justify-between">
        <span className="text-slate-500">f(x)</span>
        <span className="text-slate-300">{formula}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">f'(x)</span>
        <span className="text-slate-300">{derivative}</span>
      </div>
    </div>
  </div>
);

const BackpropAnimation = () => {
  return (
    <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 shadow-[0_0_20px_rgba(244,114,182,0.1)] overflow-hidden relative">
      <style>{`
        @keyframes flow-reverse {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .animate-flow-reverse {
          animation: flow-reverse 1s linear infinite;
        }
      `}</style>
      <h3 className="text-xl font-bold text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)] mb-4 flex items-center gap-2">
        <GitMerge size={20} /> The Chain Rule in Action
      </h3>
      <p className="text-slate-300 mb-6">
        Backpropagation computes the gradient of the loss function with respect to every weight by applying the chain rule backwards from the output.
      </p>
      
      <div className="w-full h-48 bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center">
        <svg viewBox="0 0 600 150" className="w-full h-full">
          <defs>
            <filter id="glow-pink">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Nodes */}
          <rect x="50" y="50" width="80" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <text x="90" y="80" fill="#fff" fontSize="14" textAnchor="middle" className="font-mono">Weight (w)</text>

          <rect x="250" y="50" width="80" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <text x="290" y="80" fill="#fff" fontSize="14" textAnchor="middle" className="font-mono">Neuron (a)</text>

          <rect x="450" y="50" width="80" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <text x="490" y="80" fill="#fff" fontSize="14" textAnchor="middle" className="font-mono">Loss (L)</text>

          {/* Forward Pass Arrows (Faded) */}
          <path d="M 130 65 L 250 65" stroke="#334155" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <path d="M 330 65 L 450 65" stroke="#334155" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Backward Pass Arrows (Glowing Pink, Dashed, Animated) */}
          <path d="M 450 85 L 330 85" stroke="#f472b6" strokeWidth="3" strokeDasharray="10,10" className="animate-flow-reverse" filter="url(#glow-pink)" />
          <path d="M 250 85 L 130 85" stroke="#f472b6" strokeWidth="3" strokeDasharray="10,10" className="animate-flow-reverse" filter="url(#glow-pink)" />

          {/* Math Labels */}
          <text x="390" y="115" fill="#f9a8d4" fontSize="14" textAnchor="middle" className="font-mono">∂L / ∂a</text>
          <text x="190" y="115" fill="#f9a8d4" fontSize="14" textAnchor="middle" className="font-mono">∂a / ∂w</text>

          {/* Final Gradient Equation */}
          <rect x="150" y="10" width="300" height="30" rx="4" fill="#1e293b" stroke="#f472b6" strokeWidth="1" opacity="0.8" />
          <text x="300" y="30" fill="#fbcfe8" fontSize="14" textAnchor="middle" className="font-mono">∂L/∂w = (∂L/∂a) × (∂a/∂w)</text>
        </svg>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('forward');

  const TABS = [
    { id: 'forward', label: 'Forward Pass', icon: ChevronRight },
    { id: 'activations', label: 'Activations', icon: Activity },
    { id: 'loss', label: 'Loss & Gradients', icon: Calculator },
    { id: 'backprop', label: 'Backpropagation', icon: GitMerge },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-900 selection:text-cyan-100">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800/50 text-cyan-400 text-sm font-mono mb-4">
            <BookOpen size={16} />
            <span>Theory & Reference Module</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            Neural Network Internals
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Explore the mathematics that power multi-layer perceptrons. Interact with the formulas, visualize activation functions, and trace the flow of gradients.
          </p>
        </header>

        {/* Navigation */}
        <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' 
                    : 'bg-slate-900/50 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <main className="min-h-[600px]">
          
          {/* FORWARD PASS TAB */}
          {activeTab === 'forward' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-100">The Forward Pass</h2>
                  <p className="text-slate-300 leading-relaxed">
                    The forward pass is how a neural network makes predictions. Data flows from the input layer, through hidden layers, to the output layer.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Inside each artificial neuron, two operations occur:
                  </p>
                  <ul className="space-y-4 mt-4">
                    <li className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold">1</div>
                      <div>
                        <strong className="text-slate-200 block mb-1">Linear Combination</strong>
                        <span className="text-slate-