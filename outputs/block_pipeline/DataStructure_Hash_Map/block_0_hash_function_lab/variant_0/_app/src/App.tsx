import React, { useState, useMemo, FormEvent } from 'react';

// --- Types & Constants ---

type HashType = 'mod' | 'mult';

interface KeyItem {
  id: string;
  val: string;
  color: string;
}

const PASTEL_COLORS = [
  'bg-rose-200 text-rose-900 border-rose-300',
  'bg-orange-200 text-orange-900 border-orange-300',
  'bg-amber-200 text-amber-900 border-amber-300',
  'bg-green-200 text-green-900 border-green-300',
  'bg-emerald-200 text-emerald-900 border-emerald-300',
  'bg-teal-200 text-teal-900 border-teal-300',
  'bg-cyan-200 text-cyan-900 border-cyan-300',
  'bg-blue-200 text-blue-900 border-blue-300',
  'bg-indigo-200 text-indigo-900 border-indigo-300',
  'bg-violet-200 text-violet-900 border-violet-300',
  'bg-purple-200 text-purple-900 border-purple-300',
  'bg-fuchsia-200 text-fuchsia-900 border-fuchsia-300',
  'bg-pink-200 text-pink-900 border-pink-300',
];

const SAMPLE_WORDS = [
  'Apple', 'Banana', 'Cherry', 'Dolphin', 'Elephant', 'Fox', 'Giraffe', 'Hippo',
  'Igloo', 'Jelly', 'Kiwi', 'Llama', 'Mango', 'Noodle', 'Octopus', 'Penguin',
  'Quasar', 'Rabbit', 'Star', 'Turtle', 'Unicorn', 'Volcano', 'Waffle', 'Xenon',
  'Yoyo', 'Zebra', 'Bubble', 'Cactus', 'Daisy', 'Echo', 'Falcon', 'Galaxy'
];

// --- Helper Functions ---

// Convert string to a numeric value (sum of char codes) for hashing
const getNumericValue = (str: string): number => {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
};

// Compute hash based on selected strategy
const computeHash = (val: string, type: HashType, buckets: number): number => {
  const num = getNumericValue(val);
  if (type === 'mod') {
    return num % buckets;
  } else {
    // Multiplicative hashing using the fractional part of (k * A)
    const A = 0.6180339887; // Golden ratio
    return Math.floor(buckets * ((num * A) % 1));
  }
};

const getRandomColor = () => PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];

// --- Main Component ---

export default function App() {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [hashType, setHashType] = useState<HashType>('mod');
  const [bucketCount, setBucketCount] = useState<number>(16);

  // Distribute keys into buckets
  const distributedBuckets = useMemo(() => {
    const b = Array.from({ length: bucketCount }, () => [] as KeyItem[]);
    keys.forEach((k) => {
      const idx = computeHash(k.val, hashType, bucketCount);
      // Safety check in case of weird float math
      const safeIdx = Math.max(0, Math.min(idx, bucketCount - 1));
      b[safeIdx].push(k);
    });
    return b;
  }, [keys, hashType, bucketCount]);

  // Stats
  const totalKeys = keys.length;
  const usedBuckets = distributedBuckets.filter((b) => b.length > 0).length;
  const collisions = totalKeys > 0 ? totalKeys - usedBuckets : 0;
  const loadFactor = (totalKeys / bucketCount).toFixed(2);

  // Handlers
  const handleAddKey = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    setKeys((prev) => [
      ...prev,
      { id: crypto.randomUUID(), val: trimmed, color: getRandomColor() },
    ]);
    setInputValue('');
  };

  const handleAddRandom = () => {
    const randomWord = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
    // Add a random number to make it unique if we pick the same word
    const suffix = Math.floor(Math.random() * 100);
    const val = `${randomWord}${suffix}`;
    
    setKeys((prev) => [
      ...prev,
      { id: crypto.randomUUID(), val, color: getRandomColor() },
    ]);
  };

  const handleClear = () => setKeys([]);

  return (
    <div className="min-h-screen bg-indigo-50 p-6 font-sans text-slate-800 selection:bg-indigo-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-white rounded-3xl p-8 shadow-sm border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-900 tracking-tight mb-2">
              Hash Function Lab 🧪
            </h1>
            <p className="text-indigo-600/80 max-w-xl leading-relaxed">
              Explore how different hash functions distribute keys across buckets. 
              Add keys manually or generate random ones to visualize collisions and load factors in real-time!
            </p>
          </div>
          <div className="flex gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div className="text-center px-4 border-r border-indigo-200">
              <div className="text-2xl font-black text-indigo-600">{totalKeys}</div>
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mt-1">Keys</div>
            </div>
            <div className="text-center px-4 border-r border-indigo-200">
              <div className="text-2xl font-black text-rose-500">{collisions}</div>
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mt-1">Collisions</div>
            </div>
            <div className="text-center px-4">
              <div className="text-2xl font-black text-teal-600">{loadFactor}</div>
              <div className="text-xs font-semibold text-teal-500 uppercase tracking-wider mt-1">Load Factor</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Input Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100">
              <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                Add Keys
              </h2>
              <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a key..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm"
                >
                  Add
                </button>
              </form>
              <div className="flex gap-2">
                <button
                  onClick={handleAddRandom}
                  className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-800 py-2 rounded-xl font-semibold transition-colors border border-teal-200"
                >
                  + Random Key
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 py-2 rounded-xl font-semibold transition-colors border border-rose-200"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Strategy Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100">
              <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                Configure Hash
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Hash Function</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setHashType('mod')}
                      className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${
                        hashType === 'mod' 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Modulo
                    </button>
                    <button
                      onClick={() => setHashType('mult')}
                      className={`py-3 px-2 rounded-xl border-2 font-semibold transition-all ${
                        hashType === 'mult' 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Multiplicative
                    </button>
                  </div>
                  
                  {/* Formula Display */}
                  <div className="mt-3 bg-slate-800 text-emerald-400 font-mono text-sm p-3 rounded-xl overflow-x-auto">
                    {hashType === 'mod' 
                      ? 'h(k) = k mod m' 
                      : 'h(k) = floor(m * ((k * A) mod 1))'}
                  </div>
                  {hashType === 'mult' && (
                    <p className="text-xs text-slate-400 mt-2 ml-1">
                      * A ≈ 0.618033 (Golden Ratio)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex justify-between">
                    <span>Buckets (m)</span>
                    <span className="text-indigo-600 bg-indigo-100 px-2 rounded-md">{bucketCount}</span>
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    step="4"
                    value={bucketCount}
                    onChange={(e) => setBucketCount(Number(e.target.value))}
                    className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                    <span>4</span>
                    <span>16</span>
                    <span>32</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Visualization Panel */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-indigo-100 flex flex-col">
            <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Bucket Distribution
            </h2>
            
            <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 overflow-y-auto">
              {keys.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 min-h-[300px]">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center rotate-12">
                    <span className="text-3xl">🪣</span>
                  </div>
                  <p className="font-medium">Add some keys to see them fall into buckets!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {distributedBuckets.map((bucket, i) => {
                    const isCollision = bucket.length > 1;
                    return (
                      <div 
                        key={i} 
                        className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 min-h-[120px] ${
                          isCollision 
                            ? 'border-rose-200 bg-rose-50/30' 
                            : bucket.length === 1 
                              ? 'border-indigo-200 bg-white' 
                              : 'border-slate-100 bg-slate-50/50'
                        }`}
                      >
                        {/* Bucket Header */}
                        <div className={`text-xs font-bold px-3 py-2 border-b-2 rounded-t-xl flex justify-between items-center ${
                          isCollision 
                            ? 'border-rose-100 bg-rose-100/50 text-rose-700' 
                            : bucket.length === 1
                              ? 'border-indigo-50 bg-indigo-50/50 text-indigo-700'
                              : 'border-slate-100 text-slate-400'
                        }`}>
                          <span>Bucket {i}</span>
                          {bucket.length > 0 && (
                            <span className="bg-white/60 px-2 py-0.5 rounded-full shadow-sm">
                              {bucket.length}
                            </span>
                          )}
                        </div>
                        
                        {/* Bucket Contents */}
                        <div className="p-2 flex flex-wrap gap-1.5 content-start flex-1">
                          {bucket.map((k) => (
                            <div
                              key={k.id}
                              className={`text-xs font-bold px-2 py-1 rounded-lg border shadow-sm animate-in fade-in zoom-in duration-300 ${k.color}`}
                              title={`Numeric value: ${getNumericValue(k.val)}`}
                            >
                              {k.val}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}