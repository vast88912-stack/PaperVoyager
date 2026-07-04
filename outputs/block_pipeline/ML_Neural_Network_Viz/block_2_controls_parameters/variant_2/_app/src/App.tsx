import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Activity, 
  Database, 
  Settings2, 
  Layers, 
  Cpu,
  Zap
} from 'lucide-react';

export default function App() {
  // --- State ---
  const [dataset, setDataset] = useState<'spiral' | 'xor' | 'blobs'>('spiral');
  const [hiddenNeurons, setHiddenNeurons] = useState<number>(4);
  const [activation, setActivation] = useState<'relu' | 'sigmoid' | 'tanh'>('relu');
  const [learningRate, setLearningRate] = useState<number>(0.03);
  const [batchSize, setBatchSize] = useState<number>(16);
  const [frozenNeurons, setFrozenNeurons] = useState<Set<number>>(new Set());
  
  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [epoch, setEpoch] = useState<number>(0);
  const [lossHistory, setLossHistory] = useState<number[]>([0.95]);
  const [forwardPassActive, setForwardPassActive] = useState<boolean>(false);

  // --- Handlers ---
  const toggleFrozenNeuron = (index: number) => {
    setFrozenNeurons(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setEpoch(0);
    setLossHistory([0.95]);
    setForwardPassActive(false);
  }, []);

  // Handle hidden neuron count changes (cleanup frozen out-of-bounds)
  useEffect(() => {
    setFrozenNeurons(prev => {
      const next = new Set(prev);
      for (let i = hiddenNeurons; i < 8; i++) {
        next.delete(i);
      }
      return next;
    });
  }, [hiddenNeurons]);

  // Simulation Loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setEpoch(e => e + 1);
      setForwardPassActive(prev => !prev); // Toggle animation state
      
      setLossHistory(prev => {
        const lastLoss = prev[prev.length - 1];
        // Penalty for frozen neurons (reduces capacity)
        const capacityPenalty = (frozenNeurons.size / hiddenNeurons) * 0.4;
        
        // Base learning curve calculation
        const idealReduction = (learningRate * 2) / (1 + prev.length * 0.05);
        const noise = (Math.random() * 0.02) - 0.01;
        
        // Calculate new loss with a floor based on capacity
        const floorLoss = 0.05 + capacityPenalty;
        let newLoss = lastLoss - idealReduction + noise;
        
        if (newLoss < floorLoss) {
          newLoss = floorLoss + Math.abs(noise); // Bounce around the floor
        }
        
        const newHistory = [...prev, newLoss];
        if (newHistory.length > 50) newHistory.shift(); // Keep last 50 epochs for the chart
        return newHistory;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying, learningRate, frozenNeurons.size, hiddenNeurons]);

  // --- Render Helpers ---
  const currentLoss = lossHistory[lossHistory.length - 1].toFixed(4);
  const progressToPerfect = Math.max(0, 100 - (lossHistory[lossHistory.length - 1] * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-900 flex flex-col">
      {/* Top Navigation / Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/50 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <Zap className="w-5 h-5 text-cyan-400" />
            {isPlaying && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-fuchsia-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">Neural Net Viewer</h1>
            <p className="text-xs text-cyan-400/80 font-medium">ChatGPT Edition • Forward/Backward Interactive</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Epoch</span>
            <span className="font-mono text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/50 min-w-[5rem] text-right">
              {epoch.toString().padStart(5, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Loss</span>
            <span className="font-mono text-fuchsia-300 bg-fuchsia-950/30 px-2 py-1 rounded border border-fuchsia-900/50 min-w-[5rem] text-right transition-colors duration-200">
              {currentLoss}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Controls & Parameters */}
        <aside className="w-80 border-r border-slate-800/60 bg-slate-900/30 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-8">
            
            {/* Control: Dataset */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-100 font-medium">
                <Database className="w-4 h-4 text-cyan-400" />
                <h2>Dataset</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['spiral', 'xor', 'blobs'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => { setDataset(d); resetSimulation(); }}
                    className={`px-2 py-2 text-xs font-semibold rounded border transition-all ${
                      dataset === d 
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                        : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>

            {/* Control: Architecture */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-100 font-medium">
                <Layers className="w-4 h-4 text-fuchsia-400" />
                <h2>Architecture</h2>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Hidden Neurons</span>
                  <span className="text-fuchsia-300 font-mono">{hiddenNeurons}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="8" 
                  value={hiddenNeurons}
                  onChange={(e) => { setHiddenNeurons(parseInt(e.target.value)); resetSimulation(); }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Activation</span>
                </div>
                <div className="relative">
                  <select 
                    value={activation}
                    onChange={(e) => { setActivation(e.target.value as any); resetSimulation(); }}
                    className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 text-sm rounded-md focus:ring-fuchsia-500 focus:border-fuchsia-500 block p-2.5 appearance-none outline-none"
                  >
                    <option value="relu">ReLU</option>
                    <option value="sigmoid">Sigmoid</option>
                    <option value="tanh">Tanh</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            {/* Control: Hyperparameters */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-100 font-medium">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <h2>Hyperparameters</h2>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Learning Rate</span>
                  <span className="text-emerald-300 font-mono">{learningRate.toFixed(3)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.001" max="0.1" step="0.001"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Batch Size</span>
                  <span className="text-emerald-300 font-mono">{batchSize}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="64" step="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </section>

            {/* Control: Ablation */}
            <section className="space-y-3 p-4 rounded-xl bg-slate-900 border border-rose-900/30">
              <div className="flex items-center gap-2 text-slate-100 font-medium">
                <Cpu className="w-4 h-4 text-rose-400" />
                <h2>Ablation Controls</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click a hidden neuron to freeze its weights and drop its activations to zero. Observe how gradient flow adapts.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({ length: hiddenNeurons }).map((_, i) => {
                  const isFrozen = frozenNeurons.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleFrozenNeuron(i)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border transition-all ${
                        isFrozen 
                          ? 'bg-rose-950/50 border-rose-800 text-rose-500 shadow-[inset_0_0_10px_rgba(225,29,72,0.2)]' 
                          : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400'
                      }`}
                      title={`Toggle Neuron ${i + 1}`}
                    >
                      {isFrozen ? 'X' : i + 1}
                    </button>
                  );
                })}
              </div>
            </section>

          </div>
        </aside>

        {/* RIGHT PANEL: Visualization & Execution */}
        <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
          
          {/* Execution Toolbar */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-full shadow-lg z-10">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button 
              onClick={() => {
                if(!isPlaying) {
                  setEpoch(e => e + 1);
                  setForwardPassActive(prev => !prev);
                }
              }}
              disabled={isPlaying}
              className="w-10 h-10 rounded-full text-slate-300 hover:bg-slate-700/50 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <StepForward className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button 
              onClick={resetSimulation}
              className="w-10 h-10 rounded-full text-slate-300 hover:bg-slate-700/50 flex items-center justify-center hover:text-rose-400 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Network Visualization */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] pointer-events-none opacity-50"></div>

            <div className="w-full max-w-3xl aspect-[16/9] relative z-0">
              <svg width="100%" height="100%" viewBox="0 0 800 450" className="overflow-visible">
                <defs>
                  <filter id="neon-glow-cyan">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="neon-glow-fuchsia">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="synapse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#e879f9" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Draw Synapses (Lines) */}
                <g className="synapses">
                  {/* Input to Hidden */}
                  {[0, 1].map(i => {
                    const y1 = 225 + (i - 0.5) * 120;
                    return Array.from({ length: hiddenNeurons }).map((_, h) => {
                      const y2 = 225 + (h - (hiddenNeurons - 1) / 2) * 50;
                      const isFrozen = frozenNeurons.has(h);
                      return (
                        <line 
                          key={`in-${i}-h-${h}`}
                          x1="150" y1={y1} x2="400" y2={y2}
                          stroke={isFrozen ? '#334155' : 'url(#synapse-grad)'}
                          strokeWidth={isFrozen ? 1 : (forwardPassActive ? 2.5 : 1.5)}
                          className={forwardPassActive && !isFrozen ? 'animate-pulse' : ''}
                          opacity={isFrozen ? 0.3 : 1}
                        />
                      );
                    });
                  })}

                  {/* Hidden to Output */}
                  {Array.from({ length: hiddenNeurons }).map((_, h) => {
                    const y1 = 225 + (h - (hiddenNeurons - 1) / 2) * 50;
                    const isFrozen = frozenNeurons.has(h);
                    return (
                      <line 
                        key={`h-${h}-out`}
                        x1="400" y1={y1} x2="650" y2="225"
                        stroke={isFrozen ? '#334155' : 'url(#synapse-grad)'}
                        strokeWidth={isFrozen ? 1 : (forwardPassActive ? 2.5 : 1.5)}
                        className={forwardPassActive && !isFrozen ? 'animate-pulse delay-75' : ''}
                        opacity={isFrozen ? 0.3 : 1}
                      />
                    );
                  })}
                </g>

                {/* Draw Nodes */}
                <g className="nodes">
                  {/* Input Layer */}
                  <g className="layer-input">
                    <text x="150" y="110" fill="#94a3b8" fontSize="12" textAnchor="middle" className="uppercase tracking-widest">Input</text>
                    {[0, 1].map(i => (
                      <g key={`in-${i}`} transform={`translate(150, ${225 + (i - 0.5) * 120})`}>
                        <circle r="20" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" filter="url(#neon-glow-cyan)" />
                        <text fill="#22d3ee" fontSize="10" textAnchor="middle" dy=".3em">{i === 0 ? 'X₁' : 'X₂'}</text>
                      </g>
                    ))}
                  </g>

                  {/* Hidden Layer */}
                  <g className="layer-hidden">
                    <text x="400" y="110" fill="#94a3b8" fontSize="12" textAnchor="middle" className="uppercase tracking-widest">Hidden ({activation})</text>
                    {Array.from({ length: hiddenNeurons }).map((_, h) => {
                      const isFrozen = frozenNeurons.has(h);
                      return (
                        <g 
                          key={`hidden-${h}`} 
                          transform={`translate(400, ${225 + (h - (hiddenNeurons - 1) / 2) * 50})`}
                          onClick={() => toggleFrozenNeuron(h)}
                          className="cursor-pointer"
                        >
                          <circle 
                            r="16" 
                            fill={isFrozen ? '#1e1b4b' : '#0f172a'} 
                            stroke={isFrozen ? '#e11d48' : '#e879f9'} 
                            strokeWidth={isFrozen ? '1' : '2'} 
                            filter={isFrozen ? '' : 'url(#neon-glow-fuchsia)'}
                            className={`transition-all duration-300 ${forwardPassActive && !isFrozen ? 'brightness-150' : ''}`}
                          />
                          {isFrozen && (
                            <path d="M-6,-6 L6,6 M-6,6 L6,-6" stroke="#e11d48" strokeWidth="2" />
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* Output Layer */}
                  <g className="layer-output">
                    <text x="650" y="110" fill="#94a3b8" fontSize="12" textAnchor="middle" className="uppercase tracking-widest">Output</text>
                    <g transform="translate(650, 225)">
                      <circle 
                        r="24" 
                        fill="#0f172a" 
                        stroke="#10b981" 
                        strokeWidth="2" 
                        filter={isPlaying ? 'url(#neon-glow-cyan)' : ''}
                        className={`transition-all duration-300 ${forwardPassActive ? 'scale-110 stroke-[3px]' : 'scale-100'}`}
                      />
                      <text fill="#10b981" fontSize="12" textAnchor="middle" dy=".3em" fontWeight="bold">Y</text>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Loss Curve Chart (Bottom Panel) */}
          <div className="h-40 border-t border-slate-800/60 bg-slate-900/40 p-4 flex gap-6">
            <div