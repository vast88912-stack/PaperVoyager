import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  RefreshCw, Plus, Trash2, Search, 
  Settings2, Dna, Swords, FastForward,
  Hash, ShieldAlert
} from 'lucide-react';

type TreeType = 'AVL' | 'Red-Black' | 'Treap';

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('42');
  const [nodeCount, setNodeCount] = useState<number>(15);
  const [inputValue, setInputValue] = useState<string>('');
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);
  const [actionLog, setActionLog] = useState<string[]>(['System initialized.']);

  const logAction = (msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 4));
  };

  const handleGenerate = () => {
    logAction(`Generated ${treeType} tree with ${nodeCount} nodes (Seed: ${seed})`);
  };

  const handleOperation = (op: 'Insert' | 'Delete' | 'Find') => {
    if (!inputValue) return;
    logAction(`${op} key [${inputValue}] in ${treeType} tree.`);
    setInputValue('');
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    logAction(isPlaying ? 'Simulation paused.' : 'Simulation playing...');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center font-sans text-slate-900">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-indigo-400" />
              Balanced BST Studio
            </h1>
            <p className="text-slate-400 text-sm mt-1">Controls & Parameters Configuration</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-mono text-slate-300">System Ready</span>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Tree Config & Generation */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Tree Type Selection */}
            <section>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Dna className="w-4 h-4" /> Structure Type
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTreeType(type);
                      logAction(`Switched to ${type} tree.`);
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      treeType === type 
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>

            {/* Dataset Parameters */}
            <section className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-5">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-4 h-4" /> Dataset Parameters
              </h2>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Initial Nodes</label>
                  <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {nodeCount} / 31
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="31" 
                  value={nodeCount}
                  onChange={(e) => setNodeCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Random Seed</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter seed..."
                  />
                  <button 
                    onClick={() => setSeed(Math.floor(Math.random() * 10000).toString())}
                    className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                    title="Randomize Seed"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Generate Tree
              </button>
            </section>
          </div>

          {/* Right Column: Operations & Playback */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Operations */}
            <section>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Operations
              </h2>
              <div className="flex gap-3">
                <input 
                  type="number" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Key (e.g. 42)"
                  className="w-32 bg-white border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleOperation('Insert')}
                    className="flex flex-col items-center justify-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Insert</span>
                  </button>
                  <button 
                    onClick={() => handleOperation('Delete')}
                    className="flex flex-col items-center justify-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Delete</span>
                  </button>
                  <button 
                    onClick={() => handleOperation('Find')}
                    className="flex flex-col items-center justify-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                  >
                    <Search className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Find</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Playback & Animation */}
            <section className="bg-slate-900 text-white p-5 rounded-xl shadow-inner space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FastForward className="w-4 h-4" /> Simulator Controls
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Speed:</span>
                  <span className="text-sm font-mono text-indigo-400">{animationSpeed.toFixed(1)}x</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <input 
                  type="range" 
                  min="0.5" 
                  max="5" 
                  step="0.5"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                
                <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className={`p-3 rounded-lg transition-colors shadow-lg ${
                      isPlaying 
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' 
                        : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Challenge Mode & Logs */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-center ${
                  challengeMode 
                    ? 'bg-amber-50 border-amber-400 text-amber-900' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                onClick={() => {
                  setChallengeMode(!challengeMode);
                  logAction(`Challenge mode ${!challengeMode ? 'enabled' : 'disabled'}.`);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Swords className={`w-5 h-5 ${challengeMode ? 'text-amber-600' : 'text-slate-400'}`} />
                    Challenge Mode
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${challengeMode ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${challengeMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
                <p className="text-xs opacity-80">
                  {challengeMode 
                    ? "Fix broken trees by selecting the correct rotation sequences." 
                    : "Enable to test your knowledge of tree invariants and rotations."}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Actions</h3>
                <div className="flex-1 flex flex-col justify-end gap-1 overflow-hidden">
                  {actionLog.map((log, i) => (
                    <div 
                      key={i} 
                      className={`text-xs font-mono truncate ${
                        i === 0 ? 'text-indigo-600 font-medium' : 'text-slate-400'
                      }`}
                      style={{ opacity: 1 - i * 0.25 }}
                    >
                      &gt; {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}