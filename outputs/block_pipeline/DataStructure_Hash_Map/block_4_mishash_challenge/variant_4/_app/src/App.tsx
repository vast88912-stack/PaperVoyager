import React, { useState, useMemo, useEffect } from 'react';

// --- Types & Constants ---
type Strategy = 'chaining' | 'linear' | 'quadratic';
type HashFunc = 'mod' | 'mult';

const TABLE_SIZE = 10;
const MAX_PROBES_ALLOWED = 15;

const STRATEGY_CONFIG: Record<Strategy, { name: string; target: number; unit: string; desc: string }> = {
  chaining: {
    name: 'Separate Chaining',
    target: 5,
    unit: 'chain length',
    desc: 'Force multiple keys to hash to the exact same bucket, creating a long linked list.',
  },
  linear: {
    name: 'Linear Probing',
    target: 6,
    unit: 'probe sequence',
    desc: 'Create a cluster of collisions to force a new key to check many consecutive buckets.',
  },
  quadratic: {
    name: 'Quadratic Probing',
    target: 5,
    unit: 'probe sequence',
    desc: 'Cause collisions that force the probing algorithm (i², 2², 3²...) to search far and wide.',
  },
};

const HASH_FUNCTIONS: Record<HashFunc, { name: string; formula: string; calc: (k: number) => number }> = {
  mod: {
    name: 'Modulo 10',
    formula: 'h(k) = k % 10',
    calc: (k: number) => k % TABLE_SIZE,
  },
  mult: {
    name: 'Multiplicative',
    formula: 'h(k) = (k * 7) % 10',
    calc: (k: number) => (k * 7) % TABLE_SIZE,
  },
};

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('chaining');
  const [hashFunc, setHashFunc] = useState<HashFunc>('mod');
  const [keys, setKeys] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset keys when strategy or hash changes
  useEffect(() => {
    setKeys([]);
    setErrorMsg(null);
  }, [strategy, hashFunc]);

  // --- Simulation Logic ---
  const simulation = useMemo(() => {
    const table = Array.from({ length: TABLE_SIZE }, (_, i) => ({
      index: i,
      values: [] as number[],
      probes: 0,
    }));

    let maxScore = 0;
    let failedToInsert = false;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const baseHash = Math.abs(HASH_FUNCTIONS[hashFunc].calc(k));

      if (strategy === 'chaining') {
        table[baseHash].values.push(k);
        maxScore = Math.max(maxScore, table[baseHash].values.length);
      } else if (strategy === 'linear') {
        let h = baseHash;
        let probes = 1;
        while (table[h].values.length > 0 && probes <= MAX_PROBES_ALLOWED) {
          h = (h + 1) % TABLE_SIZE;
          probes++;
        }
        if (probes <= MAX_PROBES_ALLOWED && table[h].values.length === 0) {
          table[h].values.push(k);
          table[h].probes = Math.max(table[h].probes, probes);
          maxScore = Math.max(maxScore, probes);
        } else {
          failedToInsert = true;
        }
      } else if (strategy === 'quadratic') {
        let probes = 1;
        let h = baseHash;
        while (table[h].values.length > 0 && Math.abs(table[h].values[0]) !== k && probes <= MAX_PROBES_ALLOWED) {
          // quadratic step: h + i^2
          h = (baseHash + Math.pow(probes, 2)) % TABLE_SIZE;
          probes++;
        }
        if (probes <= MAX_PROBES_ALLOWED && table[h].values.length === 0) {
          table[h].values.push(k);
          table[h].probes = Math.max(table[h].probes, probes);
          maxScore = Math.max(maxScore, probes);
        } else {
          failedToInsert = true;
        }
      }
    }

    return { table, maxScore, failedToInsert };
  }, [keys, strategy, hashFunc]);

  const config = STRATEGY_CONFIG[strategy];
  const hasWon = simulation.maxScore >= config.target;
  const isFull = strategy !== 'chaining' && keys.length >= TABLE_SIZE;

  // --- Handlers ---
  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (hasWon) return;

    const val = parseInt(inputValue.trim(), 10);
    if (isNaN(val) || val < 0) {
      setErrorMsg('Please enter a valid positive integer.');
      return;
    }
    if (keys.includes(val)) {
      setErrorMsg('Key already exists! Choose a different adversarial key.');
      return;
    }
    if (isFull) {
      setErrorMsg('Table is full!');
      return;
    }

    setKeys([...keys, val]);
    setInputValue('');
  };

  const handleReset = () => {
    setKeys([]);
    setInputValue('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#5E5A66] p-6 font-sans flex flex-col items-center">
      {/* Inline styles for custom animations to avoid tailwind config dependencies */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-pop { animation: pop 0.3s ease-in-out; }
      `}</style>

      {/* Header */}
      <header className="max-w-4xl w-full flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#4A4754] flex items-center gap-2">
            <span className="text-4xl">😈</span> Mis-hash Challenge
          </h1>
          <p className="text-[#898593] mt-2 max-w-xl">
            Play the role of an attacker! Craft adversarial keys to break the hash map's performance. 
            Force a worst-case scenario where keys constantly collide.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-white border-2 border-[#E1DEE6] rounded-xl text-sm font-semibold text-[#898593] hover:bg-[#F4F2F7] hover:text-[#4A4754] transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Reset Lab
        </button>
      </header>

      <main className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Mission */}
        <div className="md:col-span-1 flex flex-col gap-6">
          
          {/* Mission Card */}
          <div className="bg-white border-2 border-[#E1DEE6] rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FFB7B2]" />
            <h2 className="font-bold text-[#4A4754] mb-3 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB7B2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Your Mission
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#A4A0AD] uppercase tracking-wider mb-1 block">1. Choose Victim Strategy</label>
                <div className="flex bg-[#F4F2F7] rounded-lg p-1">
                  {(['chaining', 'linear', 'quadratic'] as Strategy[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setStrategy(s)}
                      className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                        strategy === s ? 'bg-white shadow-sm text-[#4A4754]' : 'text-[#A4A0AD] hover:text-[#5E5A66]'
                      }`}
                    >
                      {s.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#A4A0AD] uppercase tracking-wider mb-1 block">2. Choose Hash Function</label>
                <div className="flex bg-[#F4F2F7] rounded-lg p-1">
                  {(['mod', 'mult'] as HashFunc[]).map(hf => (
                    <button
                      key={hf}
                      onClick={() => setHashFunc(hf)}
                      className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${
                        hashFunc === hf ? 'bg-white shadow-sm text-[#4A4754]' : 'text-[#A4A0AD] hover:text-[#5E5A66]'
                      }`}
                    >
                      {HASH_FUNCTIONS[hf].name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-center text-sm font-mono bg-[#FFF3E0] text-[#E65100] py-1 rounded-md border border-[#FFE0B2]">
                  {HASH_FUNCTIONS[hashFunc].formula}
                </div>
              </div>

              <div className="pt-2 border-t border-[#F4F2F7]">
                <p className="text-sm text-[#5E5A66] mb-2">
                  <span className="font-semibold text-[#4A4754]">Target:</span> {config.desc}
                </p>
                <div className="bg-[#FDFBF7] border border-[#E1DEE6] rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-[#A4A0AD] uppercase">Goal</span>
                  <span className="font-mono font-bold text-[#FF6B6B]">
                    {config.target} {config.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Adversarial Input */}
          <div className="bg-white border-2 border-[#E1DEE6] rounded-2xl p-5 shadow-sm">
             <h2 className="font-bold text-[#4A4754] mb-4">Adversarial Injection</h2>
             <form onSubmit={handleInsert} className="flex gap-2">
               <input
                 type="number"
                 placeholder="Enter key..."
                 value={inputValue}
                 onChange={e => setInputValue(e.target.value)}
                 disabled={hasWon || isFull}
                 className="w-full bg-[#F4F2F7] border border-[#E1DEE6] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FFB7B2] disabled:opacity-50"
               />
               <button 
                 type="submit" 
                 disabled={hasWon || isFull || !inputValue.trim()}
                 className="bg-[#FFB7B2] text-white font-bold px-4 py-2 rounded-lg hover:bg-[#FF9B94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
               >
                 Add
               </button>
             </form>
             {errorMsg && (
               <div className="mt-3 text-xs font-semibold text-[#FF6B6B] bg-[#FFF0F0] p-2 rounded-md flex items-start gap-2">
                 <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                 </svg>
                 {errorMsg}
               </div>
             )}
             {simulation.failedToInsert && (
               <div className="mt-3 text-xs font-semibold text-[#FFB020] bg-[#FFF9E6] p-2 rounded-md">
                 ⚠️ Insertion failed (probe limit exceeded). The hash table is broken!
               </div>
             )}
          </div>

        </div>

        {/* Right Column: Visualization */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Progress Banner */}
          <div className={`border-2 rounded-2xl p-5 flex items-center justify-between transition-all duration-500 ${
            hasWon ? 'bg-[#E2F0CB] border-[#C5DDA8]' : 'bg-white border-[#E1DEE6] shadow-sm'
          }`}>
            <div>
              <h3 className="font-bold text-[#4A4754] text-lg">
                {hasWon ? '🎉 Challenge Completed!' : 'Current Score'}
              </h3>
              <p className={`text-sm ${hasWon ? 'text-[#5C8528]' : 'text-[#898593]'}`}>
                {hasWon ? 'You successfully brought the hash map to its knees.' : `Max ${config.unit} achieved so far.`}
              </p>
            </div>
            <div className="flex items-end gap-1">
              <span className={`text-5xl font-black font-mono transition-colors ${
                hasWon ? 'text-[#5C8528] animate-pop' : 'text-[#4A4754]'
              }`}>
                {simulation.maxScore}
              </span>
              <span className="text-xl font-bold text-[#A4A0AD] mb-1">/ {config.target}</span>
            </div>
          </div>

          {/* Hash Table Grid */}
          <div className="bg-white border-2 border-[#E1DEE6] rounded-2xl p-6 shadow-sm overflow-hidden flex-1 flex flex-col">
            <h3 className="font-bold text-[#4A4754] mb-6 flex items-center justify-between">
              <span>Victim Hash Table</span>
              <span className="text-xs font-medium text-[#A4A0AD] bg-[#F4F2F7] px-2 py-1 rounded-md">
                Size M = {TABLE_SIZE}
              </span>
            </h3>

            {/* Grid Container */}
            <div className="flex-1 flex items-end justify-center gap-2 sm:gap-4 overflow-x-auto pb-4">
              {simulation.table.map((bucket) => {
                const isEmpty = bucket.values.length === 0;
                
                return (
                  <div key={bucket.index} className="flex flex-col items-center w-12 sm:w-16">
                    {/* Items Stack (For Chaining) or Single Item (For Probing) */}
                    <div className={`w-full min-h-[5rem] rounded-xl border-2 flex flex-col-reverse items-center justify-start p-1.5 transition-all duration-300 relative
                      ${!isEmpty ? 'border-[#B5EAD7] bg-[#EAF7F2]' : 'border-[#E1DEE6] bg-[#FDFBF7] border-dashed'}
                    `}>
                      {isEmpty && (
                         <span className="text-xs text-[#D1CED8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono">
                           empty
                         </span>
                      )}

                      {strategy === 'chaining' ? (
                        // Separate Chaining Stack
                        bucket.values.map((val, idx) => (
                          <div 
                            key={`${val}-${idx}`} 
                            className="w-full bg-white border-2 border-[#81D4B5] rounded-lg py-2 mb-1.5 text-center text-sm font-bold text-[#2C6E52] shadow-sm animate-fade-in-up last:mb-0"
                            style={{ zIndex: 10 - idx }}
                          >
                            {val}
                          </div>
                        ))
                      ) : (
                        // Open Addressing Single Slot
                        !isEmpty && (
                          <div className="w-full bg-white border-2 border-[#81D4B5] rounded-lg py-3 text-center text-sm font-bold text-[#2C6E52] shadow-sm animate-fade-in-up absolute top-1/