import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Types & Constants ---
type Point = { x: number; y: number };
type Edge = { id: string; from: Point; to: Point; active: boolean; magnitude: number; isBackward: boolean };
type Node = { id: string; label: string; pos: Point; type: 'input' | 'hidden' | 'output'; ablated?: boolean };

const MAX_HISTORY = 100;
const TRAINING_SPEED_MS = 100;

// --- Helper: SVG Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>;

// --- Main Component ---
export default function App() {
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [epoch, setEpoch] = useState<number>(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [ablatedNeurons, setAblatedNeurons] = useState<boolean[]>([false, false, false, false]);
  
  // Ref for animation frame / interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Mock ML Logic ---
  // We simulate a training process where ablating neurons reduces the network's capacity,
  // leading to a higher minimum loss and slower convergence.
  const activeNeuronRatio = useMemo(() => {
    const activeCount = ablatedNeurons.filter(a => !a).length;
    return activeCount / ablatedNeurons.length;
  }, [ablatedNeurons]);

  const stepTraining = () => {
    setEpoch(prev => {
      const nextEpoch = prev + 1;
      setLossHistory(prevLoss => {
        // Base loss curve: exponential decay
        const baseLoss = Math.exp(-nextEpoch / 30);
        // Penalty for ablated neurons (less capacity = higher floor)
        const penalty = (1 - activeNeuronRatio) * 0.4;
        // Add some noise
        const noise = (Math.random() * 0.05) - 0.025;
        
        let newLoss = baseLoss + penalty + noise;
        newLoss = Math.max(0.01, Math.min(1.0, newLoss)); // Clamp between 0.01 and 1.0
        
        const nextHistory = [...prevLoss, newLoss];
        if (nextHistory.length > MAX_HISTORY) nextHistory.shift();
        return nextHistory;
      });
      return nextEpoch;
    });
  };

  useEffect(() => {
    if (isTraining) {
      timerRef.current = setInterval(stepTraining, TRAINING_SPEED_MS);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTraining, activeNeuronRatio]);

  const reset = () => {
    setIsTraining(false);
    setEpoch(0);
    setLossHistory([]);
    setAblatedNeurons([false, false, false, false]);
  };

  const toggleAblation = (index: number) => {
    setAblatedNeurons(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // --- Network Visualization Data ---
  const width = 500;
  const height = 400;
  
  const nodes: Node[] = [
    { id: 'i1', label: 'X1', pos: { x: 50, y: 150 }, type: 'input' },
    { id: 'i2', label: 'X2', pos: { x: 50, y: 250 }, type: 'input' },
    { id: 'h1', label: 'H1', pos: { x: 250, y: 80 }, type: 'hidden', ablated: ablatedNeurons[0] },
    { id: 'h2', label: 'H2', pos: { x: 250, y: 160 }, type: 'hidden', ablated: ablatedNeurons[1] },
    { id: 'h3', label: 'H3', pos: { x: 250, y: 240 }, type: 'hidden', ablated: ablatedNeurons[2] },
    { id: 'h4', label: 'H4', pos: { x: 250, y: 320 }, type: 'hidden', ablated: ablatedNeurons[3] },
    { id: 'o1', label: 'Y', pos: { x: 450, y: 200 }, type: 'output' },
  ];

  const edges: Edge[] = [];
  
  // Input -> Hidden
  nodes.filter(n => n.type === 'input').forEach(input => {
    nodes.filter(n => n.type === 'hidden').forEach((hidden, idx) => {
      const isAblated = ablatedNeurons[idx];
      edges.push({
        id: `${input.id}-${hidden.id}`,
        from: input.pos,
        to: hidden.pos,
        active: !isAblated,
        magnitude: isAblated ? 0 : Math.random() * 0.5 + 0.5,
        isBackward: false
      });
    });
  });

  // Hidden -> Output
  nodes.filter(n => n.type === 'hidden').forEach((hidden, idx) => {
    const isAblated = ablatedNeurons[idx];
    nodes.filter(n => n.type === 'output').forEach(output => {
      edges.push({
        id: `${hidden.id}-${output.id}`,
        from: hidden.pos,
        to: output.pos,
        active: !isAblated,
        magnitude: isAblated ? 0 : Math.random() * 0.8 + 0.2,
        isBackward: true // We'll animate gradients flowing backward here
      });
    });
  });

  // Current Loss
  const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1] : 1.0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 selection:bg-fuchsia-500/30">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Analysis & Output Viewer
          </h1>
          <p className="text-slate-400 text-sm mt-1 tracking-wide">
            Live Forward/Backward Pass & Ablation Analysis
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800/50 backdrop-blur-sm shadow-xl">
          <button 
            onClick={() => setIsTraining(!isTraining)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isTraining 
                ? 'bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.2)]' 
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            }`}
          >
            {isTraining ? <PauseIcon /> : <PlayIcon />}
            {isTraining ? 'Pause Training' : 'Start Training'}
          </button>
          
          <button 
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <ResetIcon />
            Reset
          </button>

          <div className="px-4 py-2 border-l border-slate-700/50 flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Epoch</span>
            <span className="font-mono font-bold text-cyan-400">{epoch.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Network & Gradient Flow */}
        <section className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6 z-10">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Gradient Flow & Ablation
            </h2>
            <div className="text-xs text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-full border border-slate-800">
              Click hidden nodes to toggle ablation
            </div>
          </div>

          <div className="flex-1 relative min-h-[400px] bg-slate-950/50 rounded-xl border border-slate-800/80 overflow-hidden">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="absolute inset-0">
              <defs>
                {/* Neon Glow Filters */}
                <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-fuchsia" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                
                {/* Gradient for forward pass */}
                <linearGradient id="edge-forward" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d946ef" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Draw Edges */}
              {edges.map(edge => {
                const isAblated = !edge.active;
                const strokeColor = isAblated ? '#1e293b' : 'url(#edge-forward)';
                const strokeWidth = isAblated ? 1 : 1.5 + edge.magnitude * 2;
                
                return (
                  <g key={edge.id}>
                    {/* Base Edge */}
                    <line
                      x1={edge.from.x}
                      y1={edge.from.y}
                      x2={edge.to.x}
                      y2={edge.to.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      opacity={isAblated ? 0.3 : 0.6}
                      className="transition-all duration-300"
                    />
                    {/* Gradient Flow Animation (Backward Pass) */}
                    {!isAblated && isTraining && edge.isBackward && (
                      <line
                        x1={edge.to.x}
                        y1={edge.to.y}
                        x2={edge.from.x}
                        y2={edge.from.y}
                        stroke="#d946ef"
                        strokeWidth={strokeWidth * 1.5}
                        strokeDasharray="4 12"
                        opacity="0.8"
                        filter="url(#glow-fuchsia)"
                        className="animate-[flow_1s_linear_infinite]"
                      />
                    )}
                    {/* Forward Pass Animation */}
                    {!isAblated && isTraining && !edge.isBackward && (
                      <line
                        x1={edge.from.x}
                        y1={edge.from.y}
                        x2={edge.to.x}
                        y2={edge.to.y}
                        stroke="#06b6d4"
                        strokeWidth={strokeWidth * 1.5}
                        strokeDasharray="4 12"
                        opacity="0.8"
                        filter="url(#glow-cyan)"
                        className="animate-[flow-reverse_1s_linear_infinite]"
                      />
                    )}
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {nodes.map((node, i) => {
                const isAblated = node.ablated;
                const isHidden = node.type === 'hidden';
                
                let fillColor = '#0f172a';
                let strokeColor = '#334155';
                let glow = '';

                if (!isAblated) {
                  if (node.type === 'input') { strokeColor = '#06b6d4'; glow = 'url(#glow-cyan)'; }
                  if (node.type === 'hidden') { strokeColor = '#8b5cf6'; glow = 'url(#glow-fuchsia)'; fillColor = '#2e1065'; }
                  if (node.type === 'output') { strokeColor = '#d946ef'; glow = 'url(#glow-fuchsia)'; fillColor = '#4a044e'; }
                }

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.pos.x}, ${node.pos.y})`}
                    onClick={() => isHidden && toggleAblation(i - 2)}
                    className={isHidden ? 'cursor-pointer' : ''}
                  >
                    {/* Node Circle */}
                    <circle
                      r={isHidden ? 22 : 18}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={3}
                      filter={glow}
                      className={`transition-all duration-300 ${isHidden && !isAblated ? 'hover:stroke-fuchsia-400 hover:scale-110' : ''} ${isAblated ? 'opacity-40' : ''}`}
                    />
                    
                    {/* Node Label */}
                    <text
                      textAnchor="middle"
                      dy=".3em"
                      fill={isAblated ? '#475569' : '#e2e8f0'}
                      className="font-mono text-xs font-bold pointer-events-none select-none"
                    >
                      {node.label}
                    </text>

                    {/* Ablation Indicator */}
                    {isAblated && (
                      <line x1="-12" y1="-12" x2="12" y2="12" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" className="opacity-80" />
                    )}
                  </g>
                );
              })}
            </svg>
            
            <style>{`
              @keyframes flow {
                from { stroke-dashoffset: 16; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes flow-reverse {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: 16; }
              }
            `}</style>
          </div>
        </section>

        {/* Right Column: Analysis Output & Charts */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-1">Current Loss</h3>
              <div className="text-3xl font-mono font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">
                {currentLoss.toFixed(4)}
              </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-1">Active Capacity</h3>
              <div className="text-3xl font-mono font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                {Math.round(activeNeuronRatio * 100)}%
              </div>
            </div>
          </div>

          {/* Loss Curve Chart */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              Loss Curve
            </h2>
            
            <div className="flex-1 relative bg-slate-950/50 rounded-xl border border-slate-800/80 p-4">
              {/* Y Axis Labels */}
              <div className="absolute left-2 top-4 bottom-4 flex flex-col justify-between text-[10px] text-slate-500 font-mono">
                <span>1.0</span>
                <span>0.5</span>
                <span>0.0</span>
              </div>
              
              <div className="ml-6 h-full relative">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-t border-slate-600 w-full"></div>
                  <div className="border-t border-slate-600 w-full"></div>
                  <div className="border-t border-slate-600 w-full"></div>
                </div>

                {/* SVG Chart */}
                <svg width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible">
                  <defs>
                    <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {lossHistory.length > 1 && (() => {
                    const width = 100; // percentages
                    const height = 100;
                    
                    const points = lossHistory.map((val, i) => {
                      const x = (i / (MAX_HISTORY - 1)) * width;
                      const y = height - (val * height); // val is 0 to 1
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        filter="url(#chart-glow)"
                      />
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>

          {/* Output Map (Mock 2D Decision Boundary) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl h-48 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Decision Boundary (Mock Output)</h2>
            <div className="flex-1 rounded-xl overflow-hidden relative border border-slate-800/80">
              {/* Generate a mock CSS gradient representing a decision boundary that degrades with ablation */}
              <div 
                className="absolute inset-0 opacity-80 transition-all duration-1000"
                style={{
                  background: `radial-gradient(circle at ${50 + Math.sin(epoch/10)*20}% ${50 + Math.cos(epoch/10)*20}%, 
                    rgba(6,182,212,${0.2 + activeNeuronRatio*0.6}) 0%, 
                    rgba(15,23,42,1) ${40 + activeNeuronRatio*40}%, 
                    rgba(217,70,239,${0.2 + activeNeuronRatio*0.6}) 100%)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {activeNeuronRatio < 0.5 && (
                  <span className="text-red-400/80 text-xs font-mono bg-red-950/50 px-2 py-1 rounded border border-red-900/50 backdrop-blur-sm">
                    Underfitting Detected
                  </span>
                )}
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}