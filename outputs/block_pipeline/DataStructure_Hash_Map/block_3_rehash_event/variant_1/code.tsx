import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, StepForward, RotateCcw, ArrowRight, Database, Hash, Info } from 'lucide-react';

// --- Initial Data Setup ---
// We start with a capacity of 8 and a load factor of 1.0 (8 items).
// Keys: 25, 33, 42, 18, 3, 19, 12, 7
const INITIAL_CAPACITY = 8;
const NEW_CAPACITY = 16;

const initialOldTable: number[][] = [
  [],          // 0
  [25, 33],    // 1: 25 % 8 = 1, 33 % 8 = 1
  [42, 18],    // 2: 42 % 8 = 2, 18 % 8 = 2
  [3, 19],     // 3: 3 % 8 = 3, 19 % 8 = 3
  [12],        // 4: 12 % 8 = 4
  [],          // 5
  [],          // 6
  [7]          // 7: 7 % 8 = 7
];

type Status = 'IDLE' | 'ALLOCATED' | 'REHASHING' | 'DONE';
type Phase = 'SELECT' | 'MOVE';

interface RehashState {
  status: Status;
  phase: Phase;
  oldTable: number[][];
  newTable: number[][];
  activeKey: number | null;
  activeOldIdx: number | null;
  activeNewIdx: number | null;
  logs: string[];
}

const getInitialState = (): RehashState => ({
  status: 'IDLE',
  phase: 'SELECT',
  oldTable: JSON.parse(JSON.stringify(initialOldTable)),
  newTable: Array.from({ length: NEW_CAPACITY }, () => []),
  activeKey: null,
  activeOldIdx: null,
  activeNewIdx: null,
  logs: ["⚠️ Hash table at 100% capacity. Rehash required!"],
});

export default function App() {
  const [state, setState] = useState<RehashState>(getInitialState());
  const [autoPlay, setAutoPlay] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs]);

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay) return;
    if (state.status === 'DONE') {
      setAutoPlay(false);
      return;
    }
    const timer = setTimeout(() => {
      advanceStep();
    }, 1200); // 1.2s per step for comfortable viewing
    return () => clearTimeout(timer);
  }, [autoPlay, state]);

  const advanceStep = () => {
    setState((prev) => {
      if (prev.status === 'IDLE') {
        return {
          ...prev,
          status: 'ALLOCATED',
          logs: [...prev.logs, `✨ Allocated new table with capacity ${NEW_CAPACITY}.`]
        };
      }

      if (prev.status === 'ALLOCATED' || (prev.status === 'REHASHING' && prev.phase === 'MOVE')) {
        // Find next element to move
        let foundKey: number | null = null;
        let foundOldIdx: number | null = null;
        for (let i = 0; i < prev.oldTable.length; i++) {
          if (prev.oldTable[i].length > 0) {
            foundKey = prev.oldTable[i][0];
            foundOldIdx = i;
            break;
          }
        }

        if (foundKey !== null && foundOldIdx !== null) {
          const newIdx = foundKey % NEW_CAPACITY;
          return {
            ...prev,
            status: 'REHASHING',
            phase: 'SELECT',
            activeKey: foundKey,
            activeOldIdx: foundOldIdx,
            activeNewIdx: newIdx,
            logs: [...prev.logs, `🔍 Selected key ${foundKey}. New hash: ${foundKey} % ${NEW_CAPACITY} = ${newIdx}`]
          };
        } else {
          return {
            ...prev,
            status: 'DONE',
            activeKey: null,
            activeOldIdx: null,
            activeNewIdx: null,
            logs: [...prev.logs, "✅ All keys transferred! Old table discarded."]
          };
        }
      }

      if (prev.status === 'REHASHING' && prev.phase === 'SELECT') {
        // Move the element
        const nextOld = prev.oldTable.map(bucket => [...bucket]);
        if (prev.activeOldIdx !== null) {
          nextOld[prev.activeOldIdx] = nextOld[prev.activeOldIdx].slice(1);
        }

        const nextNew = prev.newTable.map(bucket => [...bucket]);
        if (prev.activeNewIdx !== null && prev.activeKey !== null) {
          nextNew[prev.activeNewIdx] = [...nextNew[prev.activeNewIdx], prev.activeKey];
        }

        return {
          ...prev,
          phase: 'MOVE',
          oldTable: nextOld,
          newTable: nextNew,
          logs: [...prev.logs, `➡️ Moved key ${prev.activeKey} to bucket ${prev.activeNewIdx}.`]
        };
      }

      return prev;
    });
  };

  const reset = () => {
    setAutoPlay(false);
    setState(getInitialState());
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-800 font-sans p-6 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border-2 border-orange-100">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-2xl text-orange-500">
            <Database size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-700 tracking-tight">Rehash Event</h1>
            <p className="text-slate-500 font-medium">Step-by-step capacity expansion</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            disabled={state.status === 'DONE'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all ${
              state.status === 'DONE'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : autoPlay
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {autoPlay ? <Pause size={20} /> : <Play size={20} />}
            {autoPlay ? 'Pause' : 'Auto-Play'}
          </button>
          
          <button
            onClick={advanceStep}
            disabled={state.status === 'DONE' || autoPlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StepForward size={20} />
            Next Step
          </button>

          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <RotateCcw size={20} />
            Reset
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Tables */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Old Table */}
          <div className={`transition-all duration-700 ${state.status === 'DONE' ? 'opacity-30 grayscale scale-95' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 mb-3 px-2">
              <h2 className="text-lg font-bold text-orange-600">Old Table</h2>
              <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-md font-bold">Capacity: {INITIAL_CAPACITY}</span>
            </div>
            <div className="grid grid-cols-8 gap-3">
              {state.oldTable.map((bucket, idx) => {
                const isActive = state.activeOldIdx === idx && state.status !== 'DONE';
                return (
                  <div
                    key={`old-${idx}`}
                    className={`relative h-32 rounded-2xl border-4 flex flex-col-reverse items-center justify-start p-2 gap-2 transition-all ${
                      isActive 
                        ? 'border-pink-400 bg-pink-50 shadow-md transform -translate-y-1' 
                        : 'border-orange-200 bg-white'
                    }`}
                  >
                    <div className="absolute top-1 left-2 text-xs font-black text-slate-300">{idx}</div>
                    {bucket.map((key, i) => {
                      const isTargetKey = isActive && key === state.activeKey && i === 0;
                      return (
                        <div
                          key={key}
                          className={`w-full py-1.5 rounded-lg font-bold text-center transition-all ${
                            isTargetKey
                              ? 'bg-pink-400 text-white shadow-lg scale-110 animate-pulse'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {key}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow Divider */}
          <div className="flex justify-center text-slate-300">
            <ArrowRight size={32} className="transform rotate-90" />
          </div>

          {/* New Table */}
          <div className={`transition-all duration-700 ${state.status === 'IDLE' ? 'opacity-30 grayscale' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 mb-3 px-2">
              <h2 className="text-lg font-bold text-teal-600">New Table</h2>
              <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-md font-bold">Capacity: {NEW_CAPACITY}</span>
            </div>
            <div className="grid grid-cols-8 gap-3">
              {state.newTable.map((bucket, idx) => {
                const isActive = state.activeNewIdx === idx && state.status !== 'DONE';
                return (
                  <div
                    key={`new-${idx}`}
                    className={`relative h-28 rounded-2xl border-4 flex flex-col-reverse items-center justify-start p-2 gap-2 transition-all ${
                      isActive 
                        ? 'border-pink-400 bg-pink-50 shadow-md transform scale-105' 
                        : 'border-teal-200 bg-white'
                    }`}
                  >
                    <div className="absolute top-1 left-2 text-xs font-black text-slate-300">{idx}</div>
                    {bucket.map((key) => (
                      <div
                        key={key}
                        className={`w-full py-1.5 rounded-lg font-bold text-center transition-all ${
                          key === state.activeKey && state.phase === 'MOVE'
                            ? 'bg-pink-400 text-white shadow-lg scale-110'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Info & Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Math / Current Operation Card */}
          <div className="bg-yellow-50 border-4 border-yellow-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[200px] transition-all relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] text-yellow-200 opacity-50">
              <Hash size={120} />
            </div>
            
            <h3 className="text-yellow-800 font-bold mb-4 uppercase tracking-wider text-sm z-10">Current Operation</h3>
            
            <div className="z-10 w-full">
              {state.status === 'IDLE' && (
                <div className="text-slate-500 font-medium">Waiting to start rehash...</div>
              )}
              {state.status === 'ALLOCATED' && (
                <div className="text-teal-6