import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Types & Interfaces ---
type HashEntry = {
  key: string;
  originalHash: number;
  isMoved: boolean;
} | null;

type Phase = 'idle' | 'scanning' | 'calculating' | 'moving' | 'done';

interface AppState {
  oldTable: HashEntry[];
  newTable: HashEntry[];
  phase: Phase;
  scanIndex: number;
  targetIndex: number | null;
  baseHash: number | null;
  probes: number;
  message: string;
  isPlaying: boolean;
}

// --- Constants & Helpers ---
const OLD_CAPACITY = 8;
const NEW_CAPACITY = 16;
const INITIAL_KEYS = ["Fox", "Cat", "Dog", "Pig", "Cow", "Ape"];

// Deterministic simple hash function
const getBaseHash = (key: string, capacity: number) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash += key.charCodeAt(i);
  }
  return hash % capacity;
};

// Helper to find placement using Linear Probing
const findPlacement = (table: HashEntry[], key: string, capacity: number) => {
  const baseHash = getBaseHash(key, capacity);
  let idx = baseHash;
  let probes = 0;
  while (table[idx] !== null && probes < capacity) {
    idx = (idx + 1) % capacity;
    probes++;
  }
  return { index: idx, probes, baseHash };
};

// Initialize the old table with some collisions
const createInitialState = (): AppState => {
  const oldTable: HashEntry[] = Array(OLD_CAPACITY).fill(null);
  const newTable: HashEntry[] = Array(NEW_CAPACITY).fill(null);

  INITIAL_KEYS.forEach(key => {
    const { index, baseHash } = findPlacement(oldTable, key, OLD_CAPACITY);
    if (index !== -1) {
      oldTable[index] = { key, originalHash: baseHash, isMoved: false };
    }
  });

  return {
    oldTable,
    newTable,
    phase: 'idle',
    scanIndex: 0,
    targetIndex: null,
    baseHash: null,
    probes: 0,
    message: "Hash map load factor exceeded 75%. Rehash triggered!",
    isPlaying: false,
  };
};

// --- Main Component ---
export default function App() {
  const [state, setState] = useState<AppState>(createInitialState());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- State Machine Logic ---
  const stepForward = useCallback(() => {
    setState(prev => {
      const { oldTable, newTable, phase, scanIndex } = prev;

      // 1. Idle -> Scanning
      if (phase === 'idle') {
        return { ...prev, phase: 'scanning', message: `Scanning old table for keys...` };
      }

      // 2. Scanning -> Calculating (or Done)
      if (phase === 'scanning') {
        if (scanIndex >= OLD_CAPACITY) {
          return { ...prev, phase: 'done', message: "Rehash complete! New table is ready.", isPlaying: false };
        }

        const entry = oldTable[scanIndex];
        if (!entry || entry.isMoved) {
          // Skip empty or already moved buckets
          return { ...prev, scanIndex: scanIndex + 1, message: `Bucket ${scanIndex} is empty. Skipping.` };
        }

        // Found a key, prepare to calculate its new position
        const { index, probes, baseHash } = findPlacement(newTable, entry.key, NEW_CAPACITY);
        return {
          ...prev,
          phase: 'calculating',
          targetIndex: index,
          baseHash,
          probes,
          message: `Found '${entry.key}' at index ${scanIndex}. Calculating new hash: hash('${entry.key}') % 16 = ${baseHash}.`
        };
      }

      // 3. Calculating -> Moving
      if (phase === 'calculating') {
        const entry = oldTable[scanIndex]!;
        let msg = `Moving '${entry.key}' to index ${prev.targetIndex}.`;
        if (prev.probes > 0) {
          msg = `Collision at ${prev.baseHash}! Linear probing found empty slot at index ${prev.targetIndex}. Moving '${entry.key}'.`;
        }
        return { ...prev, phase: 'moving', message: msg };
      }

      // 4. Moving -> Scanning (Next)
      if (phase === 'moving') {
        const entry = oldTable[scanIndex]!;
        const updatedOldTable = [...oldTable];
        updatedOldTable[scanIndex] = { ...entry, isMoved: true };

        const updatedNewTable = [...newTable];
        updatedNewTable[prev.targetIndex!] = { key: entry.key, originalHash: prev.baseHash!, isMoved: false };

        return {
          ...prev,
          oldTable: updatedOldTable,
          newTable: updatedNewTable,
          phase: 'scanning',
          scanIndex: scanIndex + 1,
          targetIndex: null,
          baseHash: null,
          probes: 0,
          message: `Successfully moved '${entry.key}'. Continuing scan...`
        };
      }

      return prev;
    });
  }, []);

  // --- Auto-Play Effect ---
  useEffect(() => {
    if (state.isPlaying && state.phase !== 'done') {
      // Adjust speed based on phase for better visual rhythm
      let delay = 800;
      if (state.phase === 'scanning' && !state.oldTable[state.scanIndex]) delay = 300; // Fast forward empty slots
      
      timerRef.current = setTimeout(stepForward, delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.isPlaying, state.phase, state.scanIndex, stepForward, state.oldTable]);

  // --- Handlers ---
  const togglePlay = () => setState(p => ({ ...p, isPlaying: !p.isPlaying }));
  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(createInitialState());
  };

  // --- Render Helpers ---
  const getOldBucketClass = (index: number, entry: HashEntry) => {
    let base = "relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all duration-300 ";
    
    if (state.phase !== 'done' && state.scanIndex === index) {
      base += "ring-4 ring-[#FFDF85] ring-offset-2 scale-105 z-10 "; // Active scan highlight
    }

    if (!entry) return base + "bg-[#F3F4F6] border-[#E5E7EB] text-transparent";
    if (entry.isMoved) return base + "bg-[#F3F4F6] border-[#E5E7EB] opacity-40 grayscale";
    
    return base + "bg-[#FFD6C9] border-[#FFAEA5] text-[#4A4A4A] shadow-sm";
  };

  const getNewBucketClass = (index: number, entry: HashEntry) => {
    let base = "relative flex flex-col items-center justify-center h-20 rounded-xl border-2 transition-all duration-300 ";
    
    if ((state.phase === 'calculating' || state.phase === 'moving') && state.targetIndex === index) {
      base += "ring-4 ring-[#FFDF85] ring-offset-2 scale-105 z-10 bg-[#FEF08A] border-[#FDE047] "; // Target highlight
    } else if (!entry) {
      base += "bg-[#F3F4F6] border-[#E5E7EB] text-transparent";
    } else {
      base += "bg-[#C1E1C1] border-[#98C9A3] text-[#4A4A4A] shadow-sm";
    }
    return base;
  };

  return (
    <div className="min-h-screen bg-[#FDF8F5] font-sans text-[#4A4A4A] p-6 md:p-12 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-4xl w-full mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#2D3748] mb-3">
          Rehash Event <span className="text-[#FFAEA5]">Explorer</span>
        </h1>
        <p className="text-lg text-[#718096] max-w-2xl mx-auto">
          When a hash map gets too full, it creates a larger array and moves all existing keys over. 
          Watch how the indices are recalculated based on the new capacity!
        </p>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl border border-[#F0EBE1] overflow-hidden flex flex-col">
        
        {/* Controls & Status Bar */}
        <div className="bg-[#FAFAFA] border-b border-[#F0EBE1] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay}
              disabled={state.phase === 'done'}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-colors ${
                state.phase === 'done' 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : state.isPlaying 
                    ? 'bg-[#FFD6C9] text-[#C53030] hover:bg-[#FFAEA5]' 
                    : 'bg-[#C1E1C1] text-[#276749] hover:bg-[#98C9A3]'
              }`}
            >
              {state.isPlaying ? (
                <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg> Pause</>
              ) : (
                <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg> Auto-Play</>
              )}
            </button>
            <button 
              onClick={stepForward}
              disabled={state.isPlaying || state.phase === 'done'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold bg-[#E2E8F0] text-[#4A5568] hover:bg-[#CBD5E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Step Forward <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button 
              onClick={handleReset}
              className="p-2.5 rounded-full text-[#A0AEC0] hover:bg-[#EDF2F7] hover:text-[#4A5568] transition-colors"
              title="Reset"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>

          <div className="flex-1 w-full bg-white border border-[#E2E8F0] rounded-xl p-3 px-5 shadow-inner flex items-center min-h-[3rem]">
            <p className="text-[15px] font-medium text-[#2D3748] animate-fade-in">
              {state.message}
            </p>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="p-8 flex flex-col gap-12 bg-[#FAFAFA]">
          
          {/* Old Table */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-lg font-bold text-[#4A5568] flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FFAEA5]"></span>
                Old Table <span className="text-sm font-normal text-[#A0AEC0]">(Capacity: 8)</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-600 rounded-md">Load: 75% (Full)</span>
            </div>
            
            <div className="grid grid-cols-8 gap-3">
              {state.oldTable.map((entry, idx) => (
                <div key={`old-${idx}`} className={getOldBucketClass(idx, entry)}>
                  <span className="absolute top-1 left-2 text-[10px] font-bold text-[#A0AEC0]">{idx}</span>
                  {entry && (
                    <>
                      <span className="text-lg font-black tracking-wide">{entry.key}</span>
                      <span className="text-[10px] opacity-70 font-mono mt-1">h:{entry.originalHash}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Connection / Math Area (Visual spacer) */}
          <div className="flex justify-center items-center h-8 relative">
             <div className="absolute w-full h-px bg-dashed bg-[#E2E8F0]"></div>
             {(state.phase === 'calculating' || state.phase === 'moving') && state.oldTable[state.scanIndex] && (
                <div className="z-10 bg-white px-4 py-1.5 rounded-full border-2 border-[#FFDF85] shadow-sm text-sm font-mono font-bold text-[#D69E2E] animate-bounce">
                  {state.oldTable[state.scanIndex]?.key} % 16 = {state.baseHash}
                </div>
             )}
          </div>

          {/* New Table */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-lg font-bold text-[#4A5568] flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#98C9A3]"></span>
                New Table <span className="text-sm font-normal text-[#A0AEC0]">(Capacity: 16)</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-600 rounded-md">
                Load: {Math.round((state.newTable.filter(Boolean).