import React, { useState, useMemo } from 'react';
import { Beaker, Plus, Shuffle, Trash2, Info, Hash, ListOrdered, Settings2, PlayCircle } from 'lucide-react';

// -- Helpers & Hash Functions --

// Pre-hash string to a 32-bit unsigned integer
const stringToInt = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
};

// Modulo Hashing: h(k) = k mod m
const hashModulo = (keyInt: number, m: number): number => {
  return keyInt % m;
};

// Multiplicative Hashing: h(k) = floor(m * (k * A mod 1))
const A = 0.6180339887; // Knuth's suggested constant: (sqrt(5) - 1) / 2
const hashMultiplicative = (keyInt: number, m: number): number => {
  const fractionalPart = (keyInt * A) % 1;
  return Math.floor(m * fractionalPart);
};

// Random cute word generator for playful vibe
const CUTE_WORDS = [
  'apple', 'bunny', 'cloud', 'donut', 'elf', 'fairy', 'grape', 'honey',
  'igloo', 'jelly', 'koala', 'lemon', 'mango', 'ninja', 'ocean', 'panda',
  'quill', 'robin', 'star', 'tulip', 'umbra', 'venus', 'waffle', 'yuzu'
];

const PASTEL_COLORS = [
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-indigo-100 border-indigo-300 text-indigo-800',
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-cyan-100 border-cyan-300 text-cyan-800',
  'bg-teal-100 border-teal-300 text-teal-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-yellow-100 border-yellow-300 text-yellow-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-rose-100 border-rose-300 text-rose-800',
];

type HashAlgorithm = 'modulo' | 'multiplicative';

export default function App() {
  const [keys, setKeys] = useState<string[]>(['apple', 'bunny', 'cloud', 'donut']);
  const [inputValue, setInputValue] = useState('');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('modulo');
  const [bucketCount, setBucketCount] = useState<number>(8);

  // Compute distribution based on current settings
  const { buckets, stats } = useMemo(() => {
    const newBuckets: string[][] = Array.from({ length: bucketCount }, () => []);
    let collisions = 0;

    keys.forEach(key => {
      const keyInt = stringToInt(key);
      const index = algorithm === 'modulo' 
        ? hashModulo(keyInt, bucketCount) 
        : hashMultiplicative(keyInt, bucketCount);
      
      if (newBuckets[index].length > 0) {
        collisions++;
      }
      newBuckets[index].push(key);
    });

    const maxDepth = Math.max(...newBuckets.map(b => b.length), 0);
    const occupied = newBuckets.filter(b => b.length > 0).length;
    
    // Variance calculation to see how "even" the distribution is
    const mean = keys.length / bucketCount;
    const variance = newBuckets.reduce((acc, b) => acc + Math.pow(b.length - mean, 2), 0) / bucketCount;

    return { 
      buckets: newBuckets, 
      stats: { collisions, maxDepth, occupied, variance: variance.toFixed(2) } 
    };
  }, [keys, algorithm, bucketCount]);

  const handleAddKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !keys.includes(trimmed)) {
      setKeys([...keys, trimmed]);
      setInputValue('');
    }
  };

  const handleAddRandom = () => {
    const available = CUTE_WORDS.filter(w => !keys.includes(w));
    if (available.length > 0) {
      const randomWord = available[Math.floor(Math.random() * available.length)];
      // Also mix in some numbers sometimes
      const isNumber = Math.random() > 0.7;
      const keyToAdd = isNumber ? Math.floor(Math.random() * 1000).toString() : randomWord;
      setKeys([...keys, keyToAdd]);
    } else {
      setKeys([...keys, `key-${Math.floor(Math.random() * 10000)}`]);
    }
  };

  const handleClear = () => setKeys([]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans selection:bg-pink-200">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex items-center gap-4 border-b-2 border-pink-100 pb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-pink-300 to-purple-400 rounded-2xl flex items-center justify-center shadow-sm">
          <Beaker className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
            Hash Function Lab
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Experiment with deterministic hashing & visualize bucket distribution.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Lab Inputs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Settings Card */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-5 text-slate-700">
              <Settings2 className="w-5 h-5 text-indigo-400" />
              Algorithm Setup
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Hash Function</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAlgorithm('modulo')}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      algorithm === 'modulo' 
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Modulo
                  </button>
                  <button
                    onClick={() => setAlgorithm('multiplicative')}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      algorithm === 'multiplicative' 
                        ? 'border-purple-400 bg-purple-50 text-purple-700 shadow-sm' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Multiplicative
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 flex justify-between">
                  <span>Array Size (Buckets)</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs">{bucketCount}</span>
                </label>
                <input 
                  type="range" 
                  min="4" 
                  max="32" 
                  step="2"
                  value={bucketCount} 
                  onChange={(e) => setBucketCount(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1 font-medium">
                  <span>4</span>
                  <span>16</span>
                  <span>32</span>
                </div>
              </div>
            </div>

            {/* Formula Explainer */}
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm">
              <h3 className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                How it works
              </h3>
              {algorithm === 'modulo' ? (
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-indigo-600 block mb-1 font-mono">h(k) = k mod m</strong>
                  Divides the integer key <span className="font-mono text-xs">k</span> by the number of buckets <span className="font-mono text-xs">m</span> and takes the remainder.
                </p>
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-purple-600 block mb-1 font-mono">h(k) = ⌊m * (k * A mod 1)⌋</strong>
                  Multiplies the key <span className="font-mono text-xs">k</span> by constant <span className="font-mono text-xs">A ≈ 0.618</span>, extracts the fractional part, and scales it by <span className="font-mono text-xs">m</span>.
                </p>
              )}
            </div>
          </div>

          {/* Key Input Card */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-5 text-slate-700">
              <ListOrdered className="w-5 h-5 text-pink-400" />
              Dataset
            </h2>
            
            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a key..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-sm font-medium"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="bg-pink-500 hover:bg-pink-600 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="flex gap-2">
              <button 
                onClick={handleAddRandom}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                <Shuffle className="w-4 h-4" />
                Random +1
              </button>
              <button 
                onClick={handleClear}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                title="Clear all keys"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
        </div>

        {/* Right Column: Visualization & Stats */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Keys</span>
              <span className="text-2xl font-black text-slate-700">{keys.length}</span>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Collisions</span>
              <span className={`text-2xl font-black ${stats.collisions > 0 ? 'text-orange-500' : 'text-slate-700'}`}>
                {stats.collisions}
              </span>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Max Depth</span>
              <span className="text-2xl font-black text-slate-700">{stats.maxDepth}</span>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Variance</span>
              <span className="text-2xl font-black text-slate-700">{stats.variance}</span>
            </div>
          </div>

          {/* Bucket Grid */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 opacity-50"></div>
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-slate-700 flex items-center gap-2">
                <Hash className="w-6 h-6 text-pink-400" />
                Bucket Array
              </h2>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                Capacity: {bucketCount}
              </span>
            </div>

            {keys.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <PlayCircle className="w-12 h-12 text-slate-200" />
                <p className="font-medium text-center max-w-sm">
                  The hash map is empty. Add some keys from the lab controls to see how they are distributed!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
                {buckets.map((bucketKeys, idx) => {
                  const colorClass = PASTEL_COLORS[idx % PASTEL_COLORS.length];
                  const isEmpty = bucketKeys.length === 0;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`relative min-h-[100px] rounded-2xl border-2 p-3 transition-all duration-300 ${
                        isEmpty 
                          ? 'bg-slate-50 border-slate-200 border-dashed' 
                          : `${colorClass} shadow-sm hover:shadow-md hover:-translate-y-1`
                      }`}
                    >
                      {/* Bucket Index Badge */}
                      <div className={`absolute -top-3 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                        isEmpty ? 'bg-white border-slate-200 text-slate-400' : 'bg-white border-inherit text-inherit'
                      }`}>
                        {idx}
                      </div>

                      {/* Items */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {bucketKeys.map((k, itemIdx) => (
                          <div 
                            key={`${k}-${itemIdx}`}
                            className="bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-sm font-bold shadow-[0_2px_4px_rgb(0,0,0,0.05)] border border-white/40 break-all w-full animate-in zoom-in duration-200"
                          >
                            <span className="opacity-60 mr-1 text-xs">#</span>
                            {k}
                          </div>
                        ))}
                      </div>

                      {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm font-medium">
                          Empty
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}