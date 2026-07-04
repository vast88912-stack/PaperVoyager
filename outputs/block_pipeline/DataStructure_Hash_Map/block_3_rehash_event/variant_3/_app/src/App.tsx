import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, ArrowRight, Zap, Info, Database } from 'lucide-react';

// --- Constants & Types ---
const OLD_CAPACITY = 8;
const NEW_CAPACITY = 16;
// Dataset specifically chosen to show collisions in old (cap 8) resolving or changing in new (cap 16)
const INITIAL_KEYS = [10, 18, 26, 7, 15]; 

type Phase = 'IDLE' | 'SCANNING' | 'EXTRACTING' | 'HASHING' | 'INSERTING' | 'DONE';

interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'action' | 'success';
}

export default function App() {
  // --- State ---
  const [oldTable, setOldTable] = useState<number[][]>([]);
  const [newTable, setNewTable] = useState<number[][]>([]);
  
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [currentOldBucketIdx, setCurrentOldBucketIdx] = useState<number>(0);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [calculatedNewIdx, setCalculatedNewIdx] = useState<number | null>(null);
  
  const [autoPlay, setAutoPlay] = useState(false);
  const [logs, setLogQueue] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);

  // --- Initialization ---
  const initialize = useCallback(() => {
    const initialOld = Array.from({ length: OLD_CAPACITY }, () => [] as number[]);
    INITIAL_KEYS.forEach(k => {
      initialOld[k % OLD_CAPACITY].push(k);
    });
    setOldTable(initialOld);
    setNewTable(Array.from({ length: NEW_CAPACITY }, () => [] as number[]));
    setPhase('IDLE');
    setCurrentOldBucketIdx(0);
    setActiveKey(null);
    setCalculatedNewIdx(null);
    setAutoPlay(false);
    
    logIdCounter.current = 0;
    setLogQueue([{
      id: logIdCounter.current++,
      message: `Load factor exceeded! Triggering rehash. Capacity growing: ${OLD_CAPACITY} → ${NEW_CAPACITY}.`,
      type: 'info'
    }]);
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const addLog = useCallback((message: string, type: 'info' | 'action' | 'success' = 'info') => {
    setLogQueue(prev => {
      const newLogs = [{ id: logIdCounter.current++, message, type }, ...prev];
      return newLogs.slice(0, 4); // Keep only last 4
    });
  }, []);

  // --- Core Logic ---
  const performStep = useCallback(() => {
    setPhase((currentPhase) => {
      // 1. IDLE or SCANNING: Find next non-empty bucket
      if (currentPhase === 'IDLE' || currentPhase === 'SCANNING') {
        let nextIdx = currentOldBucketIdx;
        
        // If we are coming from IDLE, we start at 0.
        // If from SCANNING, we are already looking.
        while (nextIdx < OLD_CAPACITY && oldTable[nextIdx].length === 0) {
          nextIdx++;
        }

        if (nextIdx >= OLD_CAPACITY) {
          addLog("All items rehashed! Old table discarded.", 'success');
          setAutoPlay(false);
          return 'DONE';
        }

        setCurrentOldBucketIdx(nextIdx);
        addLog(`Found items in Old Bucket [${nextIdx}].`, 'info');
        return 'EXTRACTING';
      }

      // 2. EXTRACTING: Take first item from current old bucket
      if (currentPhase === 'EXTRACTING') {
        const bucket = oldTable[currentOldBucketIdx];
        if (bucket.length === 0) {
          // Bucket is empty, scan next
          setCurrentOldBucketIdx(prev => prev + 1);
          return 'SCANNING';
        }

        const keyToMove = bucket[0];
        setActiveKey(keyToMove);
        
        // Remove from old table immediately for visual feedback
        setOldTable(prev => {
          const next = [...prev];
          next[currentOldBucketIdx] = bucket.slice(1);
          return next;
        });

        addLog(`Extracting key ${keyToMove}. Preparing to re-calculate hash.`, 'action');
        return 'HASHING';
      }

      // 3. HASHING: Calculate new index based on new capacity
      if (currentPhase === 'HASHING') {
        if (activeKey === null) return currentPhase; // Safety
        
        const newIdx = activeKey % NEW_CAPACITY;
        setCalculatedNewIdx(newIdx);
        addLog(`Calculated: ${activeKey} % ${NEW_CAPACITY} = ${newIdx}.`, 'info');
        return 'INSERTING';
      }

      // 4. INSERTING: Place into new table
      if (currentPhase === 'INSERTING') {
        if (activeKey === null || calculatedNewIdx === null) return currentPhase;

        setNewTable(prev => {
          const next = [...prev];
          next[calculatedNewIdx] = [...next[calculatedNewIdx], activeKey];
          return next;
        });

        addLog(`Inserted ${activeKey} into New Bucket [${calculatedNewIdx}].`, 'success');
        
        // Reset active items and loop back to extracting
        setActiveKey(null);
        setCalculatedNewIdx(null);
        return 'EXTRACTING';
      }

      return currentPhase;
    });
  }, [currentOldBucketIdx, oldTable, activeKey, calculatedNewIdx, addLog]);

  // --- AutoPlay Effect ---
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (autoPlay && phase !== 'DONE') {
      // Slower delay for Hashing phase so user can read the math
      const delay = phase === 'HASHING' ? 1200 : 800;
      timerId = setTimeout(() => {
        performStep();
      }, delay);
    }
    return () => clearTimeout(timerId);
  }, [autoPlay, phase, performStep]);

  // --- Helper Components ---
  const ItemPill = ({ val, colorClass, isMoving = false }: { val: number, colorClass: string, isMoving?: boolean }) => (
    <div className={`
      w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-all duration-300
      ${colorClass}
      ${isMoving ? 'scale-110 shadow-md ring-4 ring-opacity-50' : ''}
    `}>
      {val}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center gap-3">
              <Zap className="w-8 h-8 text-indigo-500" />
              Rehash Event
            </h1>
            <p className="text-slate-500 mt-1">Step-by-step visualization of a hash map resizing process.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <button 
              onClick={() => setAutoPlay(!autoPlay)}
              disabled={phase === 'DONE'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                autoPlay 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50'
              }`}
            >
              {autoPlay ? <Pause size={18} /> : <Play size={18} />}
              {autoPlay ? 'Pause' : 'Auto Play'}
            </button>
            <button 
              onClick={performStep}
              disabled={autoPlay || phase === 'DONE'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition-colors"
            >
              <SkipForward size={18} /> Next Step
            </button>
            <button 
              onClick={initialize}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Tables */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Old Table */}
            <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-colors duration-500 ${phase !== 'DONE' ? 'border-rose-100' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-4 text-rose-600 font-semibold">
                <Database size={20} />
                <h2>Old Array (Capacity: {OLD_CAPACITY})</h2>
                {phase === 'DONE' && <span className="ml-auto text-sm bg-slate-100 text-slate-500 px-3 py-1 rounded-full">Deallocated</span>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {oldTable.map((bucket, idx) => (
                  <div key={`old-${idx}`} className={`
                    flex flex-col items-center p-2 rounded-xl min-w-[72px] min-h-[90px] border-2 transition-all
                    ${phase !== 'DONE' && currentOldBucketIdx === idx ? 'bg-rose-50 border-rose-300 shadow-sm' : 'bg-slate-50 border-slate-200'}
                  `}>
                    <span className="text-xs font-mono text-slate-400 mb-2">[{idx}]</span>
                    <div className="flex flex-col gap-1">
                      {bucket.map((val, vIdx) => (
                        <ItemPill key={`old-val-${vIdx}`} val={val} colorClass="bg-rose-100 text-rose-700 border border-rose-200" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Central Processing Hub (Only visible when doing work) */}
            <div className={`relative h-32 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center shadow-inner overflow-hidden transition-opacity duration-300 ${activeKey ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiM2MzY2RjEiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-50" />
              
              {activeKey !== null && (
                <div className="z-10 flex items-center gap-6 bg-white p-4 rounded-2xl shadow-lg border border-indigo-100 animate-in zoom-in-95 duration-200">
                  <ItemPill val={activeKey} colorClass="bg-indigo-100 text-indigo-700 border-2 border-indigo-300 ring-indigo-400" isMoving />
                  
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">Hash Function</span>
                    <div className="font-mono text-lg text-slate-700 flex items-center gap-2">
                      <span>{activeKey}</span>
                      <span className="text-indigo-400 font-bold">%</span>
                      <span>{NEW_CAPACITY}</span>
                      {calculatedNewIdx !== null && (
                        <>
                          <ArrowRight className="text-slate-300" size={16} />
                          <span className="font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">{calculatedNewIdx}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* New Table */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-emerald-100">
              <div className="flex items-center gap-2 mb-4 text-emerald-600 font-semibold">
                <Database size={20} />
                <h2>New Array (Capacity: {NEW_CAPACITY})</h2>
                {phase === 'DONE' && <span className="ml-auto text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full animate-pulse">Active Table</span>}
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {newTable.map((bucket, idx) => (
                  <div key={`new-${idx}`} className={`
                    flex flex-col items-center p-2 rounded-xl min-h-[90px] border-2 transition-all duration-300
                    ${phase === 'INSERTING' && calculatedNewIdx === idx ? 'bg-emerald-50 border-emerald-400 shadow-md ring-4 ring-emerald-50' : 'bg-slate-50 border-slate-200'}
                  `}>
                    <span className="text-xs font-mono text-slate-400 mb-2">[{idx}]</span>
                    <