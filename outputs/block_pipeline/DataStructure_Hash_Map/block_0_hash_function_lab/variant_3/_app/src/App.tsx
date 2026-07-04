import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { 
  FlaskConical, 
  Hash, 
  Plus, 
  Trash2, 
  Dices, 
  Info,
  BarChart3,
  Sparkles
} from 'lucide-react';

// --- Hash Algorithms ---
type HashAlgo = 'modulo' | 'multiplicative' | 'djb2' | 'length';

const HASH_FUNCTIONS: Record<HashAlgo, { name: string, desc: string, compute: (k: string, s: number) => number }> = {
  modulo: {
    name: 'ASCII Modulo',
    desc: 'Sums the ASCII values of all characters and takes modulo table size. Simple but prone to collisions for anagrams.',
    compute: (key, size) => {
      let sum = 0;
      for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
      return sum % size;
    }
  },
  multiplicative: {
    name: 'Multiplicative (Knuth)',
    desc: 'Uses the fractional part of multiplying the ASCII sum by a constant (A ≈ 0.618). Better distribution.',
    compute: (key, size) => {
      let sum = 0;
      for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
      const A = 0.6180339887;
      return Math.floor(size * ((sum * A) % 1));
    }
  },
  djb2: {
    name: 'DJB2',
    desc: 'A classic string hashing algorithm by Dan Bernstein using bit shifting and a magic number (5381).',
    compute: (key, size) => {
      let hash = 5381;
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) + hash) + key.charCodeAt(i);
      }
      return Math.abs(hash) % size;
    }
  },
  length: {
    name: 'String Length',
    desc: 'A terrible hash function that just uses the length of the string modulo table size. Great for demonstrating collisions!',
    compute: (key, size) => {
      return key.length % size;
    }
  }
};

const SAMPLE_WORDS = [
  'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew',
  'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'papaya', 'quince', 'raspberry',
  'strawberry', 'tangerine', 'ugli', 'vanilla', 'watermelon', 'xigua', 'yam', 'zucchini'
];

export default function App() {
  const [keys, setKeys] = useState<string[]>(['apple', 'banana', 'orange', 'grape', 'melon']);
  const [tableSize, setTableSize] = useState<number>(16);
  const [algo, setAlgo] = useState<HashAlgo>('djb2');
  const [inputVal, setInputVal] = useState('');

  // Compute distribution
  const buckets = useMemo(() => {
    const grid: string[][] = Array.from({ length: tableSize }, () => []);
    keys.forEach(key => {
      const idx = HASH_FUNCTIONS[algo].compute(key, tableSize);
      if (idx >= 0 && idx < tableSize) {
        grid[idx].push(key);
      }
    });
    return grid;
  }, [keys, tableSize, algo]);

  // Stats
  const totalKeys = keys.length;
  const occupiedBuckets = buckets.filter(b => b.length > 0).length;
  const collisions = buckets.reduce((acc, b) => acc + (b.length > 1 ? b.length - 1 : 0), 0);
  const loadFactor = (totalKeys / tableSize).toFixed(2);

  const handleAddKey = (e: FormEvent) => {
    e.preventDefault();
    const cleanKey = inputVal.trim();
    if (cleanKey && !keys.includes(cleanKey)) {
      setKeys(prev => [...prev, cleanKey]);
      setInputVal('');
    }
  };

  const handleRandomize = () => {
    const randomCount = Math.floor(Math.random() * 5) + 5;
    const shuffled = [...SAMPLE_WORDS].sort(() => 0.5 - Math.random());
    const newKeys = shuffled.slice(0, randomCount);
    // Merge without duplicates
    setKeys(prev => Array.from(new Set([...prev, ...newKeys])));
  };

  const clearAll = () => setKeys([]);

  const removeKey = (keyToRemove: string) => {
    setKeys(prev => prev.filter(k => k !== keyToRemove));
  };

  // Helper to determine bucket color based on items
  const getBucketColor = (count: number) => {
    if (count === 0) return 'bg-[#F9F9FB] border-[#E5E7EB] text-slate-400'; // Empty (Soft gray)
    if (count === 1) return 'bg-[#A8E6CF] border-[#8CD1BA] text-emerald-900 shadow-sm'; // 1 item (Mint)
    if (count === 2) return 'bg-[#FFD3B6] border-[#E8BC9F] text-orange-900 shadow-md scale-[1.02]'; // 2 items (Peach)
    return 'bg-[#FF8B94] border-[#E67881] text-red-950 shadow-lg scale-[1.05]'; // 3+ items (Pink/Collisions)
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-800 font-sans p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#FFD3B6] to-[#FFAAA5] rounded-2xl shadow-sm text-white">
            <FlaskConical size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hash Function Lab</h1>
            <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
              <Sparkles size={16} className="text-[#FFAAA5]" />
              Explore how different algorithms distribute keys.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Left Sidebar - Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Algorithm Selection */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A8E6CF] opacity-10 rounded-bl-full pointer-events-none" />
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Hash size={20} className="text-[#A8E6CF]" />
              Algorithm
            </h2>
            <div className="flex flex-col gap-3">
              {(Object.keys(HASH_FUNCTIONS) as HashAlgo[]).map(key => (
                <button
                  key={key}
                  onClick={() => setAlgo(key)}
                  className={`px-4 py-3 rounded-xl text-left font-semibold transition-all duration-200 border-2 ${
                    algo === key 
                      ? 'border-[#FFAAA5] bg-[#FFF5F5] text-slate-900 shadow-sm' 
                      : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {HASH_FUNCTIONS[key].name}
                </button>
              ))}
            </div>
            <div className="mt-4 p-4 bg-[#F8FAFC] rounded-xl text-sm text-slate-600 leading-relaxed border border-slate-100 flex gap-2 items-start">
              <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{HASH_FUNCTIONS[algo].desc}</span>
            </div>
          </div>

          {/* Table Size Slider */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 flex justify-between items-center">
              Table Size
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">{tableSize}</span>
            </h2>
            <input 
              type="range" 
              min="4" 
              max="32" 
              step="1"
              value={tableSize} 
              onChange={(e) => setTableSize(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#FFAAA5]"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
              <span>4</span>
              <span>16</span>
              <span>32</span>
            </div>
          </div>

          {/* Key Input */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4">Add Keys</h2>
            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Type a word..." 
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-[#A8E6CF] text-slate-700 placeholder:text-slate-400 font-medium"
              />
              <button 
                type="submit"
                disabled={!inputVal.trim()}
                className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Plus size={20} />
              </button>
            </form>
            <div className="flex gap-2">
              <button 
                onClick={handleRandomize}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#E0F4FF] hover:bg-[#C9E9FF] text-[#006699] font-bold rounded-xl transition-colors text-sm"
              >
                <Dices size={16} /> Random
              </button>
              <button 
                onClick={clearAll}
                className="flex items-center justify-center py-3 px-4 bg-[#FFF0F0] hover:bg-[#FFE5E5] text-[#CC0000] rounded-xl transition-colors"
                title="Clear All"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Main Content - Visualization */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
              <span className="text-slate-500 text-sm font-semibold z-10">Total Keys</span>
              <span className="text-3xl font-black text-slate-800 z-10">{totalKeys}</span>
              <div className="absolute -right-4 -bottom-4 opacity-5 z-0"><BarChart3 size={80} /></div>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-500 text-sm font-semibold">Load Factor</span>
              <span className="text-3xl font-black text-slate-800">{loadFactor}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <span className="text-slate-500 text-sm font-semibold">Occupied Buckets</span>
              <span className="text-3xl font-black text-slate-800">
                {occupiedBuckets} <span className="text-lg font-medium text-slate-400">/ {tableSize}</span>
              </span>
            </div>
            <div className={`p-5 rounded-3xl shadow-sm border transition-colors duration-300 flex flex-col justify-center ${
              collisions > 0 ? 'bg-[#FFF5F5] border-[#FFE5E5]' : 'bg-white border-slate-100'
            }`}>
              <span className={`${collisions > 0 ? 'text-[#CC0000]' : 'text-slate-500'} text-sm font-semibold transition-colors`}>
                Collisions
              </span>
              <span className={`text-3xl font-black transition-colors ${collisions > 0 ? 'text-[#CC0000]' : 'text-slate-800'}`}>
                {collisions}
              </span>
            </div>
          </div>

          {/* Buckets Grid */}
          <div className="bg-white flex-1 rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Hash Table Array</h2>
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#A8E6CF]"></div> Perfect</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#FFD3B6]"></div> Warning</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#FF8B94]"></div> Collision</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-4">
              {buckets.map((bucketKeys, index) => {
                const count = bucketKeys.length;
                const styleClass = getBucketColor(count);
                
                return (
                  <div 
                    key={index} 
                    className={`relative flex flex-col rounded-2xl border-2 p-3 min-h-[120px] transition-all duration-500 ease-out ${styleClass}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black opacity-60">
                        {index}
                      </span>
                      {count > 1 && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white/40 shadow-sm backdrop-blur-sm">
                          {count}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1.5 justify-end">
                      {bucketKeys.map((k, i) => (
                        <div 
                          key={`${k}-${i}`} 
                          className="bg-white/70 backdrop-blur-md px-2 py-1.5 rounded-lg text-sm font-bold truncate flex justify-between items-center group shadow-sm hover:bg-white transition-colors"
                          title={k}
                        >
                          <span className="truncate">{k}</span>
                          <button 
                            onClick={() => removeKey(k)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity ml-1 shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {count === 0 && (
                        <div className="text-center opacity-30 text-sm font-medium pb-2">
                          empty
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}