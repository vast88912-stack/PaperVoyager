import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Inline SVGs for zero external dependencies) ---
const IconPlay = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const IconPause = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const IconSkipForward = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>;
const IconSkipBack = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

type TreeType = 'AVL' | 'Red-Black' | 'Treap';
type Operation = { id: string; type: 'INSERT' | 'DELETE'; key: number; status: 'PENDING' | 'ACTIVE' | 'COMPLETED' };

export default function App() {
  // Environment State
  const [treeType, setTreeType] = useState<TreeType>('AVL');
  const [seed, setSeed] = useState<string>('42');
  const [nodeLimit, setNodeLimit] = useState<number>(15);
  
  // Playback & Animation State
  const [speed, setSpeed] = useState<number>(3); // 1 (slow) to 5 (fast)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Operations State
  const [inputValue, setInputValue] = useState<string>('');
  const [operationsQueue, setOperationsQueue] = useState<Operation[]>([]);
  const [activeLog, setActiveLog] = useState<string>('System initialized. Ready for operations.');

  // Simulation effect for queue processing
  useEffect(() => {
    if (!isPlaying || operationsQueue.length === 0) return;

    const currentOpIndex = operationsQueue.findIndex(op => op.status !== 'COMPLETED');
    if (currentOpIndex === -1) {
      setIsPlaying(false);
      setActiveLog('All operations completed.');
      return;
    }

    const delay = 2000 / speed;
    
    const timer = setTimeout(() => {
      setOperationsQueue(prev => {
        const next = [...prev];
        const op = next[currentOpIndex];
        
        if (op.status === 'PENDING') {
          op.status = 'ACTIVE';
          setActiveLog(`Executing: ${op.type} key ${op.key}... Checking invariants.`);
        } else if (op.status === 'ACTIVE') {
          op.status = 'COMPLETED';
          setActiveLog(`Completed: ${op.type} key ${op.key}. Tree balanced.`);
        }
        return next;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, operationsQueue, speed]);

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputValue);
    if (isNaN(val)) return;
    
    setOperationsQueue(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'INSERT', 
      key: val, 
      status: 'PENDING' 
    }]);
    setInputValue('');
  };

  const handleDelete = () => {
    const val = parseInt(inputValue);
    if (isNaN(val)) return;
    
    setOperationsQueue(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'DELETE', 
      key: val, 
      status: 'PENDING' 
    }]);
    setInputValue('');
  };

  const handleRandomize = () => {
    const randomKey = Math.floor(Math.random() * 999);
    setInputValue(randomKey.toString());
  };

  const clearQueue = () => {
    setOperationsQueue([]);
    setIsPlaying(false);
    setActiveLog('Queue cleared.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12 flex items-center justify-center">
      
      {/* Main Studio Container */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Controls & Parameters */}
        <div className="w-full md:w-5/12 bg-slate-100/50 border-r border-slate-200 p-6 flex flex-col gap-8">
          
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <IconSettings /> Balanced BST Studio
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Controls & Parameters</p>
          </div>

          {/* Section: Environment */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Environment</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tree Architecture</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['AVL', 'Red-Black', 'Treap'] as TreeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTreeType(type)}
                      className={`py-2 px-1 text-xs font-semibold rounded-md border transition-colors ${
                        treeType === type 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dataset Seed</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex justify-between">
                    <span>Node Limit</span>
                    <span className="font-mono text-indigo-600">{nodeLimit}</span>
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="31" 
                    value={nodeLimit}
                    onChange={(e) => setNodeLimit(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Operations */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Operations</h2>
            
            <form onSubmit={handleInsert} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Key</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 42"
                    className="flex-1 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button 
                    type="button"
                    onClick={handleRandomize}
                    className="p-2 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition-colors"
                    title="Random Key"
                  >
                    <IconRefresh />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="submit"
                  disabled={!inputValue}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                >
                  <IconPlus /> Insert
                </button>
                <button 
                  type="button"
                  onClick={handleDelete}
                  disabled={!inputValue}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                >
                  <IconTrash /> Delete
                </button>
              </div>
            </form>
          </section>

          {/* Section: Playback */}
          <section className="space-y-4 mt-auto">
            <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Simulator Playback</h2>
            
            <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <IconSkipBack />
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                  isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isPlaying ? <IconPause /> : <IconPlay />}
              </button>

              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <IconSkipForward />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex justify-between">
                <span>Animation Speed</span>
                <span className="font-mono text-indigo-600">{speed}x</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1"
              />
            </div>
          </section>

        </div>

        {/* Right Column: Active Status & Queue Viewer (Mock Context) */}
        <div className="w-full md:w-7/12 bg-white p-6 flex flex-col">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">System Status</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              </span>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                {isPlaying ? 'Running' : 'Idle'}
              </span>
            </div>
          </div>

          {/* Active Log Console */}
          <div className="bg-slate-900 rounded-lg p-4 mb-6 shadow-inner">
            <div className="font-mono text-sm text-emerald-400 flex items-start gap-3">
              <span className="text-slate-500 select-none">&gt;</span>
              <span className="typing-animation break-words">{activeLog}</span>
            </div>
          </div>

          {/* Operation Queue */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Operation Queue</h3>
              <button 
                onClick={clearQueue}
                className="text-xs font-medium text-slate-500 hover:text-rose-500 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {operationsQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-mono opacity-50">∅</span>
                  </div>
                  <p className="text-sm">Queue is empty</p>
                </div>
              ) : (
                operationsQueue.map((op, idx) => (
                  <div 
                    key={op.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      op.status === 'ACTIVE' 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-[1.02]' 
                        : op.status === 'COMPLETED'
                          ? 'bg-slate-50 border-slate-100 opacity-60'
                          : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 w-4">{idx + 1}.</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        op.type === 'INSERT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {op.type}
                      </span>
                      <span className="font-mono text-slate-700">Key: {op.key}</span>
                    </div>
                    <div>
                      {op.status === 'PENDING' && <span className="text-xs font-medium text-slate-400">Pending</span>}
                      {op.status === 'ACTIVE' && <span className="text-xs font-bold text-indigo-600 animate-pulse">Processing...</span>}
                      {op.status === 'COMPLETED' && <span className="text-xs font-medium text-emerald-600">Done</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decorative Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>MODE: {treeType.toUpperCase()}</span>
            <span>CAPACITY: {operationsQueue.filter(op => op.status === 'COMPLETED' && op.type === 'INSERT').length} / {nodeLimit}</span>
          </div>

        </div>
      </div>
    </div>
  );
}