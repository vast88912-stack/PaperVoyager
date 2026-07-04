import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Inline to ensure zero external dependencies required for render) ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const StepForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="4" x2="6" y2="20"></line><polygon points="10,4 20,12 10,20"></polygon></svg>;
const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

// --- Constants & Types ---
const OLD_SIZE = 7;
const NEW_SIZE = 17;

// Using a specific set of keys that cluster heavily in modulo 7 but distribute well in modulo 17
// Keys: 12 (mod 7 = 5), 26 (mod 7 = 5), 33 (mod 7 = 5), 5 (mod 7 = 5), 19 (mod 7 = 5)
const INITIAL_KEYS = [12, 26, 33, 5, 19]; 

type BucketState = {
  key: number;
  status: 'idle' | 'moving' | 'newly_placed' | 'collided';
} | null;

type Phase = 'ready' | 'rehashing' | 'done';

type LogEntry = {
  id: number;
  text: string;
  type: 'info' | 'action' | 'success';
};

export default function RehashEventLab() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [oldTable, setOldTable] = useState<BucketState[]>(Array(OLD_SIZE).fill(null));
  const [newTable, setNewTable] = useState<BucketState[]>(Array(NEW_SIZE).fill(null));
  const [scanIndex, setScanIndex] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  const addLog = (text: string, type: 'info' | 'action' | 'success' = 'info') => {
    setLogs(prev => [...prev, { id: logIdCounter.current++, text, type }]);
  };

  // Scroll to bottom of logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Initialization
  const initLab = () => {
    const initialTable: BucketState[] = Array(OLD_SIZE).fill(null);
    let insertions = 0;
    
    INITIAL_KEYS.forEach(key => {
      let idx = key % OLD_SIZE;
      while (initialTable[idx] !== null) {
        idx = (idx + 1) % OLD_SIZE; // Linear probing
      }
      initialTable[idx] = { key, status: 'idle' };
      insertions++;
    });

    setOldTable(initialTable);
    setNewTable(Array(NEW_SIZE).fill(null));
    setPhase('ready');
    setScanIndex(0);
    setIsAutoPlaying(false);
    setLogs([]);
    addLog(`Table initialized with ${insertions} items in ${OLD_SIZE} slots.`, 'info');
    addLog(`Load Factor is ${(insertions / OLD_SIZE).toFixed(2)}. Critical cluster detected!`, 'info');
    addLog(`Ready to rehash to new capacity: ${NEW_SIZE}.`, 'action');
  };

  useEffect(() => {
    initLab();
  }, []);

  // Step Logic
  const performStep = () => {
    if (phase === 'done') return;

    // 1. Find the next item to move in the old table
    let currentIndex = scanIndex;
    while (currentIndex < OLD_SIZE && oldTable[currentIndex] === null) {
      currentIndex++;
    }

    // 2. If no items left, we are done
    if (currentIndex >= OLD_SIZE) {
      setPhase('done');
      setIsAutoPlaying(false);
      setOldTable(Array(OLD_SIZE).fill(null)); // Clear old table visually
      
      // Clean up newly_placed statuses
      setNewTable(prev => prev.map(b => b ? { ...b, status: 'idle' } : null));
      
      addLog('Rehash Complete! All items successfully migrated.', 'success');
      addLog('Notice how the previously clustered keys are now distributed.', 'info');
      return;
    }

    // 3. Process the found item
    const itemToMove = oldTable[currentIndex]!;
    const nextOldTable = [...oldTable];
    nextOldTable[currentIndex] = null; // Remove from old

    const nextNewTable = [...newTable];
    
    // Clear previous 'newly_placed' statuses for visual clarity
    for(let i=0; i<NEW_SIZE; i++){
        if(nextNewTable[i]?.status === 'newly_placed') {
            nextNewTable[i]!.status = 'idle';
        }
    }

    // Calculate new hash
    const idealNewIndex = itemToMove.key % NEW_SIZE;
    let actualInsertIndex = idealNewIndex;
    let probes = 0;

    // Linear probe in new table
    while (nextNewTable[actualInsertIndex] !== null) {
      actualInsertIndex = (actualInsertIndex + 1) % NEW_SIZE;
      probes++;
    }

    nextNewTable[actualInsertIndex] = { 
        key: itemToMove.key, 
        status: probes > 0 ? 'collided' : 'newly_placed' 
    };

    // Update state
    setOldTable(nextOldTable);
    setNewTable(nextNewTable);
    setScanIndex(currentIndex + 1);
    setPhase('rehashing');

    // Logging
    let logMsg = `Moved Key ${itemToMove.key}. Hash: ${itemToMove.key} % ${NEW_SIZE} = ${idealNewIndex}.`;
    if (probes > 0) {
        logMsg += ` Collided! Probed ${probes} times to index ${actualInsertIndex}.`;
    } else {
        logMsg += ` Placed perfectly.`;
    }
    addLog(logMsg, probes > 0 ? 'action' : 'info');
  };

  // Auto-play effect
  useEffect(() => {
    let timer: number;
    if (isAutoPlaying && phase !== 'done') {
      timer = window.setTimeout(() => {
        performStep();
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isAutoPlaying, phase, scanIndex]);

  const toggleAutoPlay = () => {
    if (phase === 'done') return;
    if (!isAutoPlaying && phase === 'ready') setPhase('rehashing');
    setIsAutoPlaying(!isAutoPlaying);
  };

  const handleManualStep = () => {
    setIsAutoPlaying(false);
    if (phase === 'ready') setPhase('rehashing');
    performStep();
  };

  // --- Rendering Helpers ---
  const getLogColor = (type: string) => {
    switch(type) {
      case 'action': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'success': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-5xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <span className="bg-gradient-to-br from-pink-400 to-rose-500 text-white p-2 rounded-xl shadow-sm">
               <RefreshCwIcon />
            </span>
            Rehash Event Lab
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Watch the hash map resize and redistribute keys to resolve clustering.</p>
        </div>

        {/* Controls */}
        <div className="flex bg-white rounded-2xl shadow-sm p-2 border border-slate-200 gap-2">
           <button 
            onClick={toggleAutoPlay}
            disabled={phase === 'done'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              phase === 'done' ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' :
              isAutoPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            {isAutoPlaying ? <div className="w-4 h-4 rounded-sm bg-amber-700" /> : <PlayIcon />}
            {isAutoPlaying ? 'Pause' : 'Auto-Play'}
          </button>
          
          <button 
            onClick={handleManualStep}
            disabled={phase === 'done' || isAutoPlaying}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              (phase === 'done' || isAutoPlaying) ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            }`}
          >
            <StepForwardIcon />
            Next Step
          </button>

          <button 
            onClick={initLab}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Visualizations */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Old Table */}
          <div className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-200 transition-opacity duration-500 ${phase === 'done' ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                Old Table
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-full text-slate-500">Size {OLD_SIZE}</span>
              </h2>
              {phase === 'ready' && (
                <span className="text-sm font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full animate-pulse border border-rose-200">
                  High Load Factor!
                </span>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {oldTable.map((bucket, i) => (
                <div key={`old-${i}`} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all duration-300 relative
                    ${bucket ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-sm' : 'bg-slate-50 border-slate-200 border-dashed text-transparent'}
                    ${scanIndex === i && phase === 'rehashing' ? 'ring-4 ring-rose-300 scale-110 z-10' : ''}
                  `}>
                    {bucket?.key}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 font-mono">{i}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Table */}
          <div className="bg-white rounded-3xl p-6 shadow-lg shadow-emerald-500/5 border border-emerald-100">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                New Table
                <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 rounded-full text-emerald-600 border border-emerald-200">Size {NEW_SIZE}</span>
              </h2>
              {phase === 'rehashing' && (
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                  <RefreshCwIcon /> Rehashing in progress...
                </span>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {newTable.map((bucket, i) => (
                <div key={`new-${i}`} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all duration-500 relative
                    ${!bucket ? 'bg-slate-50 border-slate-200 border-dashed text-transparent' : ''}
                    ${bucket?.status === 'idle' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : ''}
                    ${bucket?.status === 'newly_placed' ? 'bg-emerald-300 border-emerald-500 text-emerald-900 scale-110 shadow-md ring-4 ring-emerald-200 z-10' : ''}
                    ${bucket?.status === 'collided' ? 'bg-amber-200 border-amber-400 text-amber-900 scale-110 shadow-md ring-4 ring-amber-200 z-10' : ''}
                  `}>
                    {bucket?.key}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 font-mono">{i}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Information & Logs */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col h-[600px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <InfoIcon /> Process Log
          </h3>
          
          <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100 text-sm text-slate-600 leading-relaxed">
            <p className="mb-2"><strong>Why Rehash?</strong> When a hash table gets too full (high load factor), collisions increase, slowing down operations.</p>
            <p>We create a new, larger array and recalculate the hash for <em>every</em> item: <code className="bg-slate-200 px-1 rounded text-slate-800 font-mono">key % new_size</code>.</p>
          </div>

          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 scroll-smooth"
          >
            {logs.map(log => (
              <div 
                key={log.id} 
                className={`p-3 rounded-xl text-sm border font-medium animate-in fade-in slide-in-from-bottom-2 ${getLogColor(log.type)}`}
              >
                {log.text}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-400 text-center mt-10 italic">
                Logs will appear here as the process begins...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}