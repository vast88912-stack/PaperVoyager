import React, { useState, useMemo, useEffect } from 'react';
import { Swords, ShieldAlert, Trophy, RotateCcw, AlertTriangle, ArrowRight, Zap, Info } from 'lucide-react';

const TABLE_SIZE = 8;
const TARGET_COLLISIONS = 4;
const MAX_KEYS = 8;

// Deterministic hash function: h(x) = (x * 3) % 8
const hashFunction = (key: number) => (key * 3) % TABLE_SIZE;

export default function App() {
  const [keys, setKeys] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  // Derived state
  const buckets = useMemo(() => {
    const b = Array.from({ length: TABLE_SIZE }, () => [] as number[]);
    keys.forEach((k) => {
      const h = hashFunction(k);
      b[h].push(k);
    });
    return b;
  }, [keys]);

  const maxCollisions = Math.max(0, ...buckets.map((b) => b.length));
  const isBroken = maxCollisions >= TARGET_COLLISIONS;
  const isGameOver = !isBroken && keys.length >= MAX_KEYS;

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBroken || isGameOver) return;

    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val >= 0 && !keys.includes(val)) {
      setKeys([...keys, val]);
    }
    setInputValue('');
    setShowHint(false);
  };

  const resetChallenge = () => {
    setKeys([]);
    setInputValue('');
    setShowHint(false);
  };

  // Generate a hint based on the first key entered, or just a generic hint
  const hintText = useMemo(() => {
    if (keys.length === 0) return "Try entering numbers that are exactly 8 apart (e.g., 1, 9, 17...).";
    const firstKey = keys[0];
    const nextKey = firstKey + 8;
    return `Since h(x) uses modulo 8, adding 8 to your key gives the same hash! Try ${nextKey}.`;
  }, [keys]);

  return (
    <div className="min-h-screen bg-indigo-50 p-4 md:p-8 font-sans text-slate-800 selection:bg-pink-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-white rounded-3xl p-6 shadow-sm border-4 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
              <Swords size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Mis-hash Challenge</h1>
              <p className="text-slate-500 font-medium">Craft adversarial keys to break the hash map!</p>
            </div>
          </div>
          
          <div className="flex gap-4 text-sm font-bold">
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl flex items-center gap-2">
              <Zap size={18} />
              <span>Target: {TARGET_COLLISIONS} Collisions</span>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl flex items-center gap-2">
              <ShieldAlert size={18} />
              <span>Max Keys: {MAX_KEYS}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Controls & Rules */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border-4 border-indigo-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="text-indigo-400" size={20} />
                The Strategy
              </h2>
              <div className="bg-indigo-50 rounded-2xl p-4 mb-6 border-2 border-indigo-100 text-center">
                <p className="text-sm text-indigo-400 font-bold uppercase tracking-wider mb-1">Hash Function</p>
                <code className="text-xl font-mono font-black text-indigo-700">
                  h(x) = (x * 3) % 8
                </code>
              </div>

              <form onSubmit={handleAddKey} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">
                    Enter a positive integer:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isBroken || isGameOver}
                      placeholder="e.g. 42"
                      className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-mono text-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue || isBroken || isGameOver}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm font-bold text-slate-500">
                  <span>Keys Used:</span>
                  <span className={keys.length === MAX_KEYS ? 'text-rose-500' : ''}>
                    {keys.length} / {MAX_KEYS}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-400 transition-all duration-500 ease-out"
                    style={{ width: `${(keys.length / MAX_KEYS) * 100}%` }}
                  />
                </div>
              </div>

              {/* Hint System */}
              <div className="mt-6 pt-6 border-t-2 border-slate-100">
                {!showHint ? (
                  <button 
                    onClick={() => setShowHint(true)}
                    className="text-sm font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    Stuck? Need a hint?
                  </button>
                ) : (
                  <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    {hintText}
                  </div>
                )}
              </div>
            </div>

            {/* Math Log */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-4 border-indigo-100 flex-1">
              <h2 className="text-lg font-bold mb-4 text-slate-700">Execution Log</h2>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {keys.length === 0 && (
                  <p className="text-slate-400 text-sm italic text-center py-4">No keys added yet.</p>
                )}
                {[...keys].reverse().map((k, idx) => {
                  const step1 = k * 3;
                  const step2 = step1 % 8;
                  return (
                    <div key={`${k}-${idx}`} className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-mono flex flex-col gap-1 animate-in slide-in-from-left-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-600">Key: {k}</span>
                        <span className="text-indigo-500 font-bold">Bucket {step2}</span>
                      </div>
                      <div className="text-slate-400 text-xs">
                        ({k} * 3) = {step1} → {step1} % 8 = <span className="text-indigo-400 font-bold">{step2}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Hash Table Visualization */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            
            {/* Damage Meter */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-4 border-rose-100 relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={20} />
                  Damage Meter (Max Collisions)
                </h2>
                <span className="font-black text-2xl text-rose-600">{maxCollisions} / {TARGET_COLLISIONS}</span>
              </div>
              <div className="relative z-10 h-6 bg-rose-50 rounded-full overflow-hidden border-2 border-rose-200 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${isBroken ? 'bg-rose-500 animate-pulse' : 'bg-rose-400'}`}
                  style={{ width: `${Math.min(100, (maxCollisions / TARGET_COLLISIONS) * 100)}%` }}
                >
                  {isBroken && <Zap size={14} className="text-white fill-white" />}
                </div>
              </div>
            </div>

            {/* Buckets Grid */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-4 border-indigo-100 flex-1 flex flex-col">
              <h2 className="text-lg font-bold mb-6 text-slate-700 text-center">Hash Map (Separate Chaining)</h2>
              
              <div className="flex-1 flex items-end justify-center gap-2 sm:gap-4">
                {buckets.map((bucket, i) => {
                  const isTargetBucket = bucket.length === maxCollisions && maxCollisions > 1;
                  return (
                    <div key={i} className="flex flex-col items-center w-16 sm:w-20">
                      {/* Keys Stack */}
                      <div className="flex flex-col-reverse gap-2 mb-2 w-full min-h-[240px] justify-start pb-2">
                        {bucket.map((k, idx) => (
                          <div 
                            key={`${k}-${idx}`}
                            className="bg-gradient-to-br from-pink-300 to-rose-400 text-white font-black font-mono text-lg py-2 rounded-xl shadow-sm border-b-4 border-rose-500 flex items-center justify-center animate-in slide-in-from-top-4 fade-in"
                          >
                            {k}
                          </div>
                        ))}
                      </div>
                      
                      {/* Bucket Container */}
                      <div className={`w-full h-12 rounded-b-2xl border-x-4 border-b-4 flex items-center justify-center font-black text-xl transition-colors ${
                        isTargetBucket 
                          ? 'border-rose-400 bg-rose-50 text-rose-600' 
                          : 'border-indigo-200 bg-indigo-50 text-indigo-400'
                      }`}>
                        {i}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Game Over / Win Overlays */}
        {(isBroken || isGameOver) && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-8 border-white text-center transform animate-in zoom-in-95 duration-300">
              {isBroken ? (
                <>
                  <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Trophy size={48} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2">Map Broken!</h2>
                  <p className="text-slate-500 mb-8 font-medium">
                    You successfully exploited the hash function to cause {maxCollisions} collisions in a single bucket.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <ShieldAlert size={48} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2">Out of Keys!</h2>
                  <p className="text-slate-500 mb-8 font-medium">
                    You used all {MAX_KEYS} keys but couldn't reach {TARGET_COLLISIONS} collisions. The hash map survived.
                  </p>
                </>
              )}
              
              <button
                onClick={resetChallenge}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RotateCcw size={24} />
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}