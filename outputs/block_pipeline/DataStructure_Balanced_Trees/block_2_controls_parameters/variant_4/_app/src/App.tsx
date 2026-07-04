import React, { useState, useEffect, useRef } from 'react';

type TreeType = 'AVL' | 'RBT' | 'TREAP';
type Operation = { id: string; type: 'INS' | 'DEL'; key: number };

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('0x4A1F');
  const [challengeMode, setChallengeMode] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [queue, setQueue] = useState<Operation[]>([
    { id: '1', type: 'INS', key: 42 },
    { id: '2', type: 'INS', key: 15 },
    { id: '3', type: 'DEL', key: 8 },
  ]);
  const [tickRate, setTickRate] = useState<number>(1000);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Auto-play mock logic
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setQueue((prev) => (prev.length > 0 ? prev.slice(1) : prev));
      if (queue.length <= 1) setIsPlaying(false);
    }, tickRate);
    return () => clearInterval(interval);
  }, [isPlaying, tickRate, queue.length]);

  const handleEnqueue = (type: 'INS' | 'DEL') => {
    const val = parseInt(keyInput);
    if (isNaN(val)) return;
    setQueue([...queue, { id: Math.random().toString(36).substr(2, 5), type, key: val }]);
    setKeyInput('');
  };

  const generateSeed = () => {
    const hex = Math.floor(Math.random() * 65535)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    setSeed(`0x${hex}`);
  };

  const getThemeStyles = () => {
    switch (treeType) {
      case 'AVL':
        return {
          accent: 'bg-blue-600',
          text: 'text-blue-700',
          border: 'border-blue-600',
          ring: 'focus:ring-blue-500',
          bgSubtle: 'bg-blue-50',
          invariant: 'Height invariant: |h(L) - h(R)| ≤ 1',
        };
      case 'RBT':
        return {
          accent: 'bg-rose-600',
          text: 'text-rose-700',
          border: 'border-rose-600',
          ring: 'focus:ring-rose-500',
          bgSubtle: 'bg-rose-50',
          invariant: 'Black-height balanced, no red-red edges',
        };
      case 'TREAP':
        return {
          accent: 'bg-teal-600',
          text: 'text-teal-700',
          border: 'border-teal-600',
          ring: 'focus:ring-teal-500',
          bgSubtle: 'bg-teal-50',
          invariant: 'Heap priority & BST key ordering',
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
      {/* Main Control Console Panel */}
      <div className="w-full max-w-5xl bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Engine Config */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-100/50 p-6 flex flex-col gap-8">
          <div>
            <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">
              Invariant Engine
            </h2>
            <div className="space-y-4">
              {/* Tree Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Algorithm</label>
                <div className="flex bg-slate-200 p-1 rounded-lg">
                  {(['AVL', 'RBT', 'TREAP'] as TreeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTreeType(type)}
                      className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                        treeType === type
                          ? `${theme.accent} text-white shadow-sm`
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className={`mt-2 text-[11px] font-mono ${theme.text} px-1`}>
                  {theme.invariant}
                </p>
              </div>

              {/* Seed Generator */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Dataset Seed</label>
                <div className="flex rounded-md shadow-sm">
                  <div className="relative flex-grow focus-within:z-10">
                    <input
                      type="text"
                      className={`block w-full rounded-none rounded-l-md border-slate-300 font-mono text-sm py-2 px-3 border focus:outline-none focus:ring-1 ${theme.ring} focus:border-transparent`}
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={generateSeed}
                    className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>

              {/* Challenge Mode Toggle */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium text-slate-900">Challenge Mode</span>
                    <span className="block text-xs text-slate-500 mt-1">
                      Identify the missing rotation
                    </span>
                  </div>
                  <button
                    onClick={() => setChallengeMode(!challengeMode)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.ring} ${
                      challengeMode ? theme.accent : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        challengeMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulator & Controls */}
        <div className="w-full md:w-2/3 p-6 flex flex-col justify-between gap-8">
          
          {/* Operation Simulator */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4 flex items-center justify-between">
              <span>Transaction Pipeline</span>
              <span className="font-mono text-slate-400 normal-case bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                {queue.length} PENDING
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input & Actions */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-600">Node Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 42"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className={`block w-full rounded-md border-slate-300 font-mono text-lg py-2 px-3 border shadow-sm focus:outline-none focus:ring-2 ${theme.ring} focus:border-transparent`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEnqueue('INS')}
                    className={`flex-1 border ${theme.border} ${theme.text} ${theme.bgSubtle} hover:${theme.accent} hover:text-white transition-colors font-bold text-sm py-2 px-4 rounded-md shadow-sm`}
                  >
                    + INSERT
                  </button>
                  <button
                    onClick={() => handleEnqueue('DEL')}
                    className="flex-1 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors font-bold text-sm py-2 px-4 rounded-md shadow-sm"
                  >
                    - DELETE
                  </button>
                </div>
              </div>

              {/* Queue Visualization */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 h-32 overflow-y-auto flex flex-col gap-2">
                {queue.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400 font-mono">
                    [QUEUE EMPTY]
                  </div>
                ) : (
                  queue.map((op, idx) => (
                    <div
                      key={op.id}
                      className={`flex items-center justify-between p-2 rounded border text-sm font-mono ${
                        idx === 0
                          ? 'bg-white border-slate-300 shadow-sm opacity-100'
                          : 'bg-transparent border-slate-200 opacity-60'
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          op.type === 'INS' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {op.type}
                      </span>
                      <span className="text-slate-700 text-base">{op.key}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Playback & Stepper Controls */}
          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">
              Stepper & Animation
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* Transport Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {}}
                  className="p-3 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
                  title="Step Backward"
                >
                  <StepBackIcon />
                </button>
                
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-4 rounded-full text-white shadow-md transition-all focus:outline-none ${
                    isPlaying ? 'bg-slate-800 hover:bg-slate-700' : `${theme.accent} hover:opacity-90`
                  }`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                <button
                  onClick={() => {
                    if (queue.length > 0) {
                      setQueue(queue.slice(1));
                    }
                  }}
                  className="p-3 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
                  title="Step Forward"
                >
                  <StepFwdIcon />
                </button>
              </div>

              {/* Tick Rate Slider */}
              <div className="flex-grow w-full flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>Fast</span>
                  <span>{((2000 - tickRate) / 1000).toFixed(2)}x</span>
                  <span>Slow</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={tickRate}
                  onChange={(e) => setTickRate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Minimal inline SVG icons to prevent external dependencies
const RefreshIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PlayIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const StepFwdIcon = () => (
  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const StepBackIcon = () => (
  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);