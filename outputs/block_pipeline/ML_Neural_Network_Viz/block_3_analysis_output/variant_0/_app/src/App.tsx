import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Types & Constants ---
type Point = { x: number; y: number };
const HIDDEN_NEURONS = 4;
const MAX_HISTORY = 100;

// --- Helper: SVG Glow Filter ---
const GlowFilter = ({ id, color }: { id: string; color: string }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="3" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

// --- Main Component ---
export default function App() {
  // --- State ---
  const [isRunning, setIsRunning] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [ablated, setAblated] = useState<boolean[]>(Array(HIDDEN_NEURONS).fill(false));
  const [gradients, setGradients] = useState<{ w1: number[]; w2: number[] }>({
    w1: Array(HIDDEN_NEURONS).fill(0),
    w2: Array(HIDDEN_NEURONS).fill(0),
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Simulation Loop ---
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setEpoch((prev) => prev + 1);

      setLossHistory((prev) => {
        const activeNeurons = ablated.filter((a) => !a).length;
        const capacityPenalty = (HIDDEN_NEURONS - activeNeurons) * 0.15;
        
        // Base loss decays over time, but is bottlenecked by ablated neurons
        const baseLoss = Math.exp(-epoch / 50) * 0.8;
        const noise = Math.random() * 0.05;
        const currentLoss = Math.min(1, Math.max(0, baseLoss + capacityPenalty + noise));

        const newHistory = [...prev, currentLoss];
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        return newHistory;
      });

      // Simulate gradient magnitudes (higher when loss is changing rapidly, zero if ablated)
      setGradients({
        w1: ablated.map((isAblated) => (isAblated ? 0 : Math.random() * 0.5 + 0.1)),
        w2: ablated.map((isAblated) => (isAblated ? 0 : Math.random() * 0.8 + 0.2)),
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, epoch, ablated]);

  // --- Render Decision Boundary (Canvas) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const currentLoss = lossHistory[lossHistory.length - 1] || 1;

    const imageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Normalize coordinates to [-1, 1]
        const nx = (x / width) * 2 - 1;
        const ny = (y / height) * 2 - 1;

        // Target pattern: XOR
        const target = nx * ny > 0 ? 1 : 0;
        
        // Simulate network output based on loss and ablation
        let prediction = target;
        
        // High loss = more noise/blur
        if (Math.random() < currentLoss) {
          prediction = Math.random();
        }

        // Ablation effects (destroying specific quadrants' accuracy)
        if (ablated[0] && nx < 0 && ny > 0) prediction = 0.5;
        if (ablated[1] && nx > 0 && ny > 0) prediction = 0.5;
        if (ablated[2] && nx < 0 && ny < 0) prediction = 0.5;
        if (ablated[3] && nx > 0 && ny < 0) prediction = 0.5;

        const idx = (y * width + x) * 4;
        
        // Color mapping: Neon Cyan (0) to Neon Pink (1)
        const r = Math.floor(prediction * 236 + (1 - prediction) * 6);
        const g = Math.floor(prediction * 72 + (1 - prediction) * 182);
        const b = Math.floor(prediction * 153 + (1 - prediction) * 212);

        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [lossHistory, ablated]);

  // --- SVG Path Generator for Loss Curve ---
  const lossPath = useMemo(() => {
    if (lossHistory.length === 0) return '';
    const width = 400;
    const height = 150;
    const dx = width / MAX_HISTORY;
    
    return lossHistory.reduce((path, loss, i) => {
      const x = i * dx;
      const y = height - loss * height;
      return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');
  }, [lossHistory]);

  const toggleAblation = (index: number) => {
    setAblated((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : '1.0000';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6 font-mono selection:bg-pink-500/30">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
            Analysis & Output
          </h1>
          <p className="text-gray-400 text-sm mt-1">Live Forward/Backward Pass Visualization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Epoch</div>
            <div className="text-xl text-cyan-400 font-bold">{epoch.toString().padStart(5, '0')}</div>
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-2 rounded border ${
              isRunning 
                ? 'border-pink-500 text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]' 
                : 'border-green-400 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
            } transition-all hover:bg-gray-900`}
          >
            {isRunning ? 'PAUSE' : 'RESUME'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- Left Column: Gradient Flow & Ablation --- */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Gradient Flow Panel */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50"></div>
            <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
              Gradient Flow (Backprop)
            </h2>
            
            <div className="w-full h-64 relative flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 600 200">
                <defs>
                  <GlowFilter id="glow-pink" color="#ec4899" />
                  <GlowFilter id="glow-cyan" color="#06b6d4" />
                  <GlowFilter id="glow-green" color="#4ade80" />
                </defs>

                {/* Edges W1 (Input to Hidden) */}
                {[0, 1].map((inputIdx) =>
                  [0, 1, 2, 3].map((hiddenIdx) => {
                    const isAblated = ablated[hiddenIdx];
                    const gradMag = gradients.w1[hiddenIdx];
                    return (
                      <path
                        key={`w1-${inputIdx}-${hiddenIdx}`}
                        d={`M 100 ${75 + inputIdx * 50} C 200 ${75 + inputIdx * 50}, 200 ${25 + hiddenIdx * 50}, 300 ${25 + hiddenIdx * 50}`}
                        fill="none"
                        stroke={isAblated ? '#1f2937' : '#ec4899'}
                        strokeWidth={isAblated ? 1 : 1 + gradMag * 4}
                        strokeOpacity={isAblated ? 0.3 : 0.4 + gradMag * 0.6}
                        filter={!isAblated && gradMag > 0.2 ? 'url(#glow-pink)' : ''}
                        strokeDasharray="5, 5"
                        className={!isAblated && isRunning ? 'animate-[dash_1s_linear_infinite_reverse]' : ''}
                      />
                    );
                  })
                )}

                {/* Edges W2 (Hidden to Output) */}
                {[0, 1, 2, 3].map((hiddenIdx) => {
                  const isAblated = ablated[hiddenIdx];
                  const gradMag = gradients.w2[hiddenIdx];
                  return (
                    <path
                      key={`w2-${hiddenIdx}`}
                      d={`M 300 ${25 + hiddenIdx * 50} C 400 ${25 + hiddenIdx * 50}, 400 100, 500 100`}
                      fill="none"
                      stroke={isAblated ? '#1f2937' : '#06b6d4'}
                      strokeWidth={isAblated ? 1 : 1 + gradMag * 5}
                      strokeOpacity={isAblated ? 0.3 : 0.5 + gradMag * 0.5}
                      filter={!isAblated && gradMag > 0.2 ? 'url(#glow-cyan)' : ''}
                      strokeDasharray="8, 8"
                      className={!isAblated && isRunning ? 'animate-[dash_1s_linear_infinite_reverse]' : ''}
                    />
                  );
                })}

                {/* Input Nodes */}
                {[0, 1].map((i) => (
                  <g key={`in-${i}`} transform={`translate(100, ${75 + i * 50})`}>
                    <circle r="12" fill="#111827" stroke="#4ade80" strokeWidth="2" filter="url(#glow-green)" />
                    <text x="-25" y="4" fill="#4ade80" fontSize="10" className="opacity-70">X{i}</text>
                  </g>
                ))}

                {/* Hidden Nodes */}
                {[0, 1, 2, 3].map((i) => {
                  const isAblated = ablated[i];
                  return (
                    <g key={`h-${i}`} transform={`translate(300, ${25 + i * 50})`}>
                      <circle 
                        r="14" 
                        fill="#111827" 
                        stroke={isAblated ? '#374151' : '#eab308'} 
                        strokeWidth="2" 
                        filter={isAblated ? '' : 'url(#glow-cyan)'} 
                      />
                      {isAblated && (
                        <line x1="-10" y1="-10" x2="10" y2="10" stroke="#ef4444" strokeWidth="3" />
                      )}
                    </g>
                  );
                })}

                {/* Output Node */}
                <g transform="translate(500, 100)">
                  <circle r="16" fill="#111827" stroke="#06b6d4" strokeWidth="3" filter="url(#glow-cyan)" />
                  <text x="25" y="4" fill="#06b6d4" fontSize="12" className="opacity-90">Y</text>
                </g>
              </svg>
            </div>
            <style>{`
              @keyframes dash {
                to { stroke-dashoffset: 20; }
              }
            `}</style>
          </div>

          {/* Ablation Controls */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Ablation Controls</h2>
            <p className="text-xs text-gray-500 mb-4">Freeze specific neurons to observe the impact on gradient flow and decision boundary.</p>
            <div className="flex gap-4">
              {ablated.map((isAblated, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleAblation(idx)}
                  className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    isAblated 
                      ? 'bg-red-950/30 border-red-900 text-red-500' 
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider mb-1">Neuron {idx}</span>
                  <span className={`text-sm font-bold ${isAblated ? 'text-red-500' : 'text-green-400'}`}>
                    {isAblated ? 'FROZEN' : 'ACTIVE'}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* --- Right Column: Output & Loss --- */}
        <div className="flex flex-col gap-6">
          
          {/* Decision Boundary Output */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex flex-col">
            <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Decision Boundary
            </h2>
            <div className="flex-1 flex items-center justify-center bg-black rounded-lg border border-gray-800 p-2 relative">
              <canvas 
                ref={canvasRef} 
                width={80} 
                height={80} 
                className="w-full aspect-square rounded image-rendering-pixelated shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                style={{ imageRendering: 'pixelated' }}
              />
              {/* Overlay grid lines */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/10 absolute"></div>
                <div className="h-full w-[1px] bg-white/10 absolute"></div>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-400 rounded-sm"></div> Class 0</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-pink-500 rounded-sm"></div> Class 1</span>
            </div>
          </div>

          {/* Loss Curve Chart */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-sm uppercase tracking-widest text-gray-400">Loss Curve</h2>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">Current Loss</div>
                <div className="text-lg text-pink-500 font-bold drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]">
                  {currentLoss}
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative w-full min-h-[150px] bg-black/50 rounded border border-gray-800 overflow-hidden">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-0 pointer-events-none opacity-20">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-b border-gray-500 h-0"></div>
                ))}
              </div>
              
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                <defs>
                  <GlowFilter id="glow-loss" color="#ec4899" />
                  <linearGradient id="loss-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* Area under curve */}
                {lossHistory.length > 0 && (
                  <path
                    d={`${lossPath} L 400 150 L 0 150 Z`}
                    fill="url(#loss-grad)"
                  />
                )}
                
                {/* Main line */}
                <path
                  d={lossPath}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2"
                  filter="url(#glow-loss)"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}