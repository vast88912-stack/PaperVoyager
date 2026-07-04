import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, StepForward, RotateCcw, ArrowDown, CheckCircle2, AlertCircle } from 'lucide-react';

// --- Types & Constants ---
type Table = (number | null)[];
type Phase = 'idle' | 'allocating' | 'scanning' | 'hashing' | 'moving' | 'done';

const OLD_CAPACITY = 8;
const NEW_CAPACITY = 16;

// A dataset designed to have collisions in the old table (cap 8) 
// and some new collisions in the new table (cap 16) to show robustness.
// Keys: 10, 18, 26, 5, 13, 21
// In Cap 8:
// 10%8=2
// 18%8=2 (col->3)
// 26%8=2 (col->4)
// 5%8=5
// 13%8=5 (col->6)
// 21%8=5 (col->7)
const INITIAL_OLD_TABLE: Table = [null, null, 10, 18, 26, 5, 13, 21];

// --- Helper Functions ---
const getBaseHash = (key: number, cap: number) => key % cap;

const findTargetSlot = (table: Table, key: number, cap: number) => {
  let idx = getBaseHash(key, cap);
  let probes = 0;
  while (table[idx] !== null) {
    idx = (idx + 1) % cap;
    probes++;
  }
  return { finalIdx: idx, probes };
};

// --- Main Component ---
export default function App() {
  // State
  const [phase, setPhase] = useState<Phase>('idle');
  const [oldTable, setOldTable] = useState<Table>(INITIAL_OLD_TABLE);
  const [newTable, setNewTable] = useState<Table>(Array(NEW_CAPACITY).fill(null));
  
  const [scanIdx, setScanIdx] = useState<number>(0);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [targetIdx, setTargetIdx] = useState<number | null>(null);
  const [probeCount, setProbeCount] = useState<number>(0);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>(['System initialized. Load factor critical (6/8 = 75%). Rehash recommended.']);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  // --- State Machine Engine ---
  const performStep = () => {
    switch (phase) {
      case 'idle':
        setPhase('allocating');
        addLog(`Allocating new memory block... Capacity increased to ${NEW_CAPACITY}.`);
        break;

      case 'allocating':
        setPhase('scanning');
        setScanIdx(0);
        addLog('Beginning transfer process. Scanning old table...');
        break;

      case 'scanning':
        if (scanIdx >= OLD_CAPACITY) {
          setPhase('done');
          addLog('Transfer complete! Old table memory freed.');
          setIsPlaying(false);
          return;
        }

        const currentKey = oldTable[scanIdx];
        if (currentKey === null) {
          // Skip empty slots
          setScanIdx(prev => prev + 1);
        } else {
          // Found a key to move
          setActiveKey(currentKey);
          setPhase('hashing');
          addLog(`Found key [${currentKey}] at old index ${scanIdx}.`);
        }
        break;

      case 'hashing':
        if (activeKey === null) return;
        const { finalIdx, probes } = findTargetSlot(newTable, activeKey, NEW_CAPACITY);
        setTargetIdx(finalIdx);
        setProbeCount(probes);
        setPhase('moving');
        if (probes > 0) {
          addLog(`Hash ${activeKey} % ${NEW_CAPACITY} = ${getBaseHash(activeKey, NEW_CAPACITY)}. Collisions avoided: ${probes}. Target index: ${finalIdx}.`);
        } else {
          addLog(`Hash ${activeKey} % ${NEW_CAPACITY} = ${finalIdx}. Target index: ${finalIdx}.`);
        }
        break;

      case 'moving':
        if (activeKey === null || targetIdx === null) return;
        
        // Move item
        setNewTable(prev => {
          const next = [...prev];
          next[targetIdx] = activeKey;
          return next;
        });
        
        setOldTable(prev => {
          const next = [...prev];
          next[scanIdx] = null;
          return next;
        });

        // Reset tracking vars and go back to scanning
        setActiveKey(null);
        setTargetIdx(null);
        setProbeCount(0);
        setScanIdx(prev => prev + 1);
        setPhase('scanning');
        break;

      case 'done':
        setIsPlaying(false);
        break;
    }
  };

  // --- Auto-play Effect ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      // Adjust speed based on phase for better visual rhythm
      let delay = 800;
      if (phase === 'scanning' && oldTable[scanIdx] === null) delay = 300; // fast skip empty
      if (phase === 'hashing') delay = 1200; // pause to read the math
      
      timer = setTimeout(() => {
        performStep();
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, phase, scanIdx, oldTable]);

  // --- Controls ---
  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const reset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setOldTable(INITIAL_OLD_TABLE);
    setNewTable(Array(NEW_CAPACITY).fill(null));
    setScanIdx(0);
    setActiveKey(null);
    setTargetIdx(null);
    setProbeCount(0);
    setLogs(['System reset. Load factor critical (6/8 = 75%). Rehash recommended.']);
  };

  // --- UI Helpers ---
  const getOldBucketStyle = (index: number) => {
    const isScanning = phase !== 'idle' && phase !== 'allocating' && phase !== 'done' && scanIdx === index;
    const isEmpty = oldTable[index] === null;
    
    let base = "relative flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold transition-all duration-300 ";
    
    if (isScanning && !isEmpty && phase !== 'moving') {
      return base + "bg-yellow-200 border-4 border-yellow-400 text-yellow-900 scale-110 z-10 shadow-lg";
    }
    if (isScanning && isEmpty) {
      return base + "bg-slate-200 border-2 border-slate-400 text-slate-400 opacity-50";
    }
    if (!isEmpty) {
      return base + "bg-pink-100 border-2 border-pink-300 text-pink-800 shadow-sm";
    }
    return base + "bg-slate-50 border-2 border-slate-200 text-transparent";
  };

  const getNewBucketStyle = (index: number) => {
    const isTarget = targetIdx === index && (phase === 'hashing' || phase === 'moving');
    const isEmpty = newTable[index] === null;
    
    let base = "relative flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold transition-all duration-500 ";
    
    if (isTarget && phase === 'hashing') {
      return base + "bg-emerald-100 border-4 border-emerald-400 border-dashed text-transparent scale-110 z-10 animate-pulse";
    }
    if (isTarget && phase === 'moving') {
      return base + "bg-yellow-200 border-4 border-yellow-400 text-yellow-900 scale-110 z-10 shadow-lg";
    }
    if (!isEmpty) {
      return base + "bg-emerald-100 border-2 border-emerald-300 text-emerald-800 shadow-sm";
    }
    return base + "bg-slate-50 border-2 border-slate-200 text-transparent";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-8 font-sans flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-4xl w-full mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">The Rehash Event</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          When a hash map exceeds its load factor threshold, it must grow. Watch how keys are individually recalculated and migrated to a larger array.
        </p>
      </div>

      {/* Main Workspace */}
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visualization (Takes 2/3 width on large screens) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Old Table Section */}
          <div className={`bg-white p-6 rounded-3xl shadow-sm border-2 transition-colors duration-500 ${phase === 'done' ? 'border-slate-200 opacity-50' : 'border-pink-100'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-pink-900">
                <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                Old Array <span className="text-sm font-normal text-slate-400">(Capacity {OLD_CAPACITY})</span>
              </h2>
              {phase === 'done' && <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-md">DEALLOCATED</span>}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {oldTable.map((key, i) => (
                <div key={`old-${i}`} className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 mb-1 font-mono">{i}</span>
                  <div className={getOldBucketStyle(i)}>
                    {key !== null ? key : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Processor / Math Section */}
          <div className="flex justify-center my-[-10px] z-10 relative">
            <div className={`bg-white px-8 py-4 rounded-2xl shadow-lg border-2 border-indigo-100 flex flex-col items-center min-w-[300px] transition-all duration-300 ${phase === 'hashing' || phase === 'moving' ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4 pointer-events-none'}`}>
              <ArrowDown className="text-indigo-300 absolute -top-4 bg-white rounded-full" size={24} />
              
              {activeKey !== null && (
                <>
                  <div className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Re-hashing Key</div>
                  <div className="text-3xl font-black text-indigo-900 mb-1">{activeKey}</div>
                  <div className="font-mono bg-indigo-50 px-3 py-1 rounded text-indigo-700 text-sm mb-2">
                    {activeKey} % {NEW_CAPACITY} = {getBaseHash(activeKey, NEW_CAPACITY)}
                  </div>
                  {probeCount > 0 && (
                    <div className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                      <AlertCircle size={12} /> Linear probes: +{probeCount}
                    </div>
                  )}
                </>
              )}
              
              <ArrowDown className="text-indigo-300 absolute -bottom-4 bg-white rounded-full" size={24} />
            </div>
          </div>

          {/* New Table Section */}
          <div className={`bg-white p-6 rounded-3xl shadow-sm border-2 transition-all duration-700 ${phase === 'idle' ? 'opacity-30 border-slate-100 grayscale' : 'border-emerald-100'}`}>
             <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-900">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                New Array <span className="text-sm font-normal text-slate-400">(Capacity {NEW_CAPACITY})</span>
              </h2>
              {phase === 'done' && <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md flex items-center gap-1"><CheckCircle2 size={14}/> ACTIVE</span>}
            </div>
            
            <div className="grid grid-cols-8 gap-y-4 gap-x-2 justify-center">
              {newTable.map((key, i) => (
                <div key={`new-${i}`} className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 mb-1 font-mono">{i}</span>
                  <div className={getNewBucketStyle(i)}>
                    {key !== null ? key : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Controls & Logs */}
        <div className="flex flex-col gap-4">
          
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100 flex flex-col gap-4">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Controls</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={togglePlay}
                disabled={phase === 'done'}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${phase === 'done' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : isPlaying ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : 'Auto Play'}
              </button>
              
              <button 
                onClick={performStep}
                disabled={isPlaying || phase === 'done'}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${isPlaying || phase === 'done' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
              >
                <StepForward size={18} /> Step