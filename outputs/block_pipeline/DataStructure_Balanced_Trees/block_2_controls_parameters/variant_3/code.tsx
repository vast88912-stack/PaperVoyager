import React, { useState, useEffect, FormEvent } from 'react';

// --- Inline Icons ---
const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconPause = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const IconStepFwd = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const IconStepBack = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"></polygon>
    <line x1="5" y1="19" x2="5" y2="5"></line>
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const IconDatabase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const IconMinus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// --- Types ---
type TreeType = 'AVL' | 'RED_BLACK' | 'TREAP';
type Operation = { id: string; type: 'INS' | 'DEL'; val: number };

export default function App() {
  // State
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('0x1F4A');
  const [opValue, setOpValue] = useState<string>('');
  const [queue, setQueue] = useState<Operation[]>([
    { id: '1', type: 'INS', val: 42 },
    { id: '2', type: 'INS', val: 17 },
    { id: '3', type: 'DEL', val: 42 },
  ]);
  const [activeOpIndex, setActiveOpIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [challengeMode, setChallengeMode] = useState<boolean>(false);

  // Handlers
  const handleAddOp = (type: 'INS' | 'DEL', e?: FormEvent) => {
    e?.preventDefault();
    const val = parseInt(opValue, 10);
    if (!isNaN(val)) {
      setQueue([...queue, { id: Math.random().toString(36).substring(7), type, val }]);
      setOpValue('');
    }
  };

  const handleClearQueue = () => {
    setQueue([]);
    setActiveOpIndex(0);
    setIsPlaying(false);
  };

  // Simulated Playback Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && activeOpIndex < queue.length) {
      const ms = 2000 / playbackSpeed;
      interval = setInterval(() => {
        setActiveOpIndex((prev) => {
          if (prev + 1 >= queue.length) {
            setIsPlaying(false);
            return prev + 1;
          }
          return prev + 1;
        });
      }, ms);
    } else if (activeOpIndex >= queue.length) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeOpIndex, queue.length, playbackSpeed]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 flex items-center justify-center">
      {/* Main Console Container */}
      <div className="w-full max-w-5xl bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <IconDatabase />
              Balanced BST Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">Systems-Aware Mutation Console</p>
          </div>
          
          {/* Global Status Badges */}
          <div className="flex gap-3 text-xs font-mono">
            <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 flex items-center gap-2">
              <span className="text-slate-400">NODES:</span>
              <span className="text-emerald-400 font-bold">14/31</span>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 flex items-center gap-2">
              <span className="text-slate-400">STATE:</span>
              <span className={isPlaying ? "text-amber-400 font-bold" : "text-blue-400 font-bold"}>
                {isPlaying ? 'MUTATING' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          
          {/* Left Column: Architecture & Data */}
          <div className="col-span-1 md:col-span-4 border-r border-slate-100 p-6 flex flex-col gap-8 bg-slate-50/50">
            
            {/* Section: Architecture */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <IconSettings /> Architecture
              </h2>
              <div className="space-y-2">
                {(['AVL', 'RED_BLACK', 'TREAP'] as TreeType[]).map((type) => (
                  <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${treeType === type ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-100 hover:bg-slate-50'}`}>
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="treeType" 
                        className="sr-only" 
                        checked={treeType === type}
                        onChange={() => setTreeType(type)}
                      />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${treeType === type ? 'border-indigo-600' : 'border-slate-300'}`}>
                        {treeType === type && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${treeType === type ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {type === 'RED_BLACK' ? 'Red-Black Tree' : type === 'AVL' ? 'AVL Tree' : 'Treap'}
                    </span>
                    {treeType === type && (
                      <span className="ml-auto text-[10px] font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </section>

            {/* Section: Dataset Initialization */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Dataset Seed
              </h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Enter seed..."
                />
                <button className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Reset
                </button>
              </div>
            </section>

            {/* Section: Challenge Mode */}
            <section className="mt-auto pt-4 border-t border-slate-200">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${challengeMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    <IconShield />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Challenge Mode</h3>
                    <p className="text-xs text-slate-500">Manual rotation fixing</p>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={challengeMode}
                    onChange={() => setChallengeMode(!challengeMode)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${challengeMode ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${challengeMode ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </section>

          </div>

          {/* Right Column: Operations & Playback */}
          <div className="col-span-1 md:col-span-8 p-6 flex flex-col gap-8">
            
            {/* Section: Mutation Injection */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Mutation Injection
              </h2>
              <form onSubmit={(e) => handleAddOp('INS', e)} className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">val=</span>
                  <input 
                    type="number" 
                    value={opValue}
                    onChange={(e) => setOpValue(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button 
                  type="button"
                  onClick={(e) => handleAddOp('INS', e)}
                  disabled={!opValue}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconPlus /> INS
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleAddOp('DEL', e)}
                  disabled={!opValue}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconMinus /> DEL
                </button>
              </form>
            </section>

            {/* Section: Execution Queue */}
            <section className="flex-1 flex flex-col">
              <div className="flex justify-between items-end mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Execution Queue
                </h2>
                <button onClick={handleClearQueue} className="text-xs text-slate-400 hover:text-slate-600 underline">
                  Clear Queue
                </button>
              </div>
              
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-2 overflow-x-auto items-center min-h-[120px]">
                {queue.length === 0 ? (
                  <div className="w-full text-center text-sm text-slate-400 font-mono italic">
                    Queue is empty. Inject mutations above.
                  </div>
                ) : (
                  queue.map((op, idx) => {
                    const isPast = idx < activeOpIndex;
                    const isActive = idx === activeOpIndex;
                    
                    let bgClass = "bg-white border-slate-200 text-slate-400";
                    if (isActive) bgClass = "bg-indigo-600 border-indigo-700 text-white shadow-md transform scale-105";
                    else if (!isPast) bgClass = "bg-white border-slate-300 text-slate-700 shadow-sm";

                    return (
                      <div key={op.id} className={`flex-shrink-0 flex flex-col w-20 h-20 rounded-lg border justify-center items-center transition-all duration-300 ${bgClass}`}>
                        <span className={`text-[10px] font-bold tracking-wider mb-1 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {op.type}
                        </span>
                        <span className="font-mono text-lg font-bold">
                          {op.val}
                        </span>
                        {isActive && isPlaying && (
                          <span className="absolute -bottom-2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
                        )}
                      </div>
                    );
                  })
                )}
                
                {/* Simulated Tail */}
                {queue.length > 0 && activeOpIndex < queue.length && (
                   <div className="flex-shrink-0 w-8 flex justify-center text-slate-300">
                     <span className="font-mono text-xl">...</span>
                   </div>
                )}
              </div>
            </section>

            {/* Section: Transport Controls */}
            <section className="bg-slate-900 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
              
              {/* Speed Slider */}
              <div className="flex items-center gap-4 w-full sm:w-1/3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tick Rate</span>
                <input 
                  type="range" 
                  min="1" max="10" 
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-xs font-mono text-slate-300 w-8">{playbackSpeed}x</span>
              </div>

              {/* Playback Buttons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveOpIndex(Math.max(0, activeOpIndex - 1))}
                  disabled={activeOpIndex === 0}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <IconStepBack />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={activeOpIndex >= queue.length}
                  className="flex items-center justify-center w-12 h-12 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isPlaying ? <IconPause /> : <IconPlay />}
                </button>
                <button 
                  onClick={() => setActiveOpIndex(Math.min(queue.length, activeOpIndex + 1))}
                  disabled={activeOpIndex >= queue.length}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <IconStepFwd />
                </button>
              </div>

            </section>

          </div>
        </div>
      </div>
    </div>
  );
}