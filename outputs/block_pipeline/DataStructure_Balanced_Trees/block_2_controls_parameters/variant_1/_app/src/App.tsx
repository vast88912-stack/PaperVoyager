import React, { useState, useEffect } from 'react';

// --- Icons ---
const PlayIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PauseIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StepForwardIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ShieldIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SettingsIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// --- Components ---

export default function App() {
  // State
  const [treeType, setTreeType] = useState<'AVL' | 'Red-Black' | 'Treap'>('AVL');
  const [seed, setSeed] = useState<string>('0x4F2A');
  const [maxNodes, setMaxNodes] = useState<number>(15);
  const [inputValue, setInputValue] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [speed, setSpeed] = useState<number>(1.5);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);
  const [pendingOps, setPendingOps] = useState<string[]>([]);

  // Handlers
  const handleRandomizeSeed = () => {
    const newSeed = '0x' + Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
    setSeed(newSeed);
  };

  const handleOperation = (type: 'Insert' | 'Delete') => {
    if (!inputValue.trim()) return;
    setPendingOps([...pendingOps, `${type}(${inputValue})`]);
    setInputValue('');
  };

  const togglePlayback = () => {
    if (playbackState === 'playing') setPlaybackState('paused');
    else setPlaybackState('playing');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      
      {/* Left Sidebar: Controls & Parameters */}
      <aside className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-screen overflow-y-auto shadow-sm z-10">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-600" />
            BST Studio
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Controls & Parameters</p>
        </div>

        <div className="p-6 space-y-8 flex-1">
          
          {/* Section 1: Tree Configuration */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Configuration</h2>
            
            {/* Tree Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Tree Structure</label>
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                {['AVL', 'Red-Black', 'Treap'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTreeType(type as any)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      treeType === type 
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dataset Seed */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Dataset Seed</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button 
                  onClick={handleRandomizeSeed}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  title="Randomize Seed"
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>

            {/* Max Nodes Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500">Max Nodes Limit</label>
                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{maxNodes}</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="31" 
                value={maxNodes}
                onChange={(e) => setMaxNodes(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>3</span>
                <span>31</span>
              </div>
            </div>
          </section>

          {/* Section 2: Simulator Controls */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Simulator</h2>
            
            {/* Insert / Delete */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Operation</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Key..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOperation('Insert')}
                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button 
                  onClick={() => handleOperation('Insert')}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm"
                >
                  Insert
                </button>
                <button 
                  onClick={() => handleOperation('Delete')}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Animation Control</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {playbackState === 'playing' ? 'Running' : 'Ready'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={togglePlayback}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                    playbackState === 'playing' 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200' 
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {playbackState === 'playing' ? <PauseIcon /> : <PlayIcon />}
                  {playbackState === 'playing' ? 'Pause' : 'Play'}
                </button>
                <button 
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                  title="Step Forward"
                >
                  <StepForwardIcon />
                  Step
                </button>
              </div>

              {/* Speed Slider */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Speed</label>
                  <span className="text-xs font-mono text-slate-600">{speed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3.0" 
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Challenge Mode */}
          <section className="space-y-4 pt-2">
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              challengeMode ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldIcon className={challengeMode ? 'text-indigo-600' : 'text-slate-400'} />
                  <h2 className={`text-sm font-bold ${challengeMode ? 'text-indigo-900' : 'text-slate-700'}`}>Challenge Mode</h2>
                </div>
                {/* Toggle Switch */}
                <button 
                  onClick={() => setChallengeMode(!challengeMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    challengeMode ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    challengeMode ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className={`text-xs leading-relaxed ${challengeMode ? 'text-indigo-700/80' : 'text-slate-500'}`}>
                {challengeMode 
                  ? "Fix the broken tree by selecting the correct sequence of rotations to restore invariants." 
                  : "Enable to test your knowledge of rotations and tree invariants."}
              </p>
              
              {challengeMode && (
                <div className="mt-4 space-y-2">
                  <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all shadow-sm">
                    Generate Broken Tree
                  </button>
                </div>
              )}
            </div>
          </section>

        </div>
      </aside>

      {/* Right Area: Mock Visualization Canvas to give context to the controls */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        {/* Top Info Bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shadow-sm z-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Tree</span>
              <span className="text-sm font-semibold text-slate-800">{treeType}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nodes</span>
              <span className="text-sm font-mono font-medium text-slate-800">12 / {maxNodes}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Height</span>
              <span className="text-sm font-mono font-medium text-slate-800">4</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {pendingOps.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Queue:</span>
                <div className="flex gap-1">
                  {pendingOps.slice(0, 3).map((op, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded border border-slate-200">
                      {op}
                    </span>
                  ))}
                  {pendingOps.length > 3 && (
                    <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs font-mono rounded border border-slate-200">
                      +{pendingOps.length - 3}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setPendingOps([])}
                  className="text-xs text-slate-400 hover:text-red-500 underline ml-2"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Canvas Area Placeholder */}
        <div className="flex-1 p-8 flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>
          
          <div className="text-center space-y-4 z-10">
            <div className="w-24 h-24 mx-auto border-4 border-dashed border-slate-300 rounded-full flex items-center justify-center bg-white shadow-sm">
              <span className="text-slate-400 font-mono text-xl">BST</span>
            </div>
            <h3 className="text-lg font-medium text-slate-600">Visualization Canvas</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Tree nodes, animated rotation arrows, and structural invariants will be rendered here via SVG based on the control parameters.
            </p>
          </div>
        </div>
      </main>

    </div>
  );
}