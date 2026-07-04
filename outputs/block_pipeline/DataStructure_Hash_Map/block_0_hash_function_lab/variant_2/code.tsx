import React, { useState, useMemo } from 'react';

type HashFunctionType = 'modulo' | 'multiplicative';

const PASTEL_COLORS = [
  'bg-rose-200 text-rose-800 border-rose-400',
  'bg-blue-200 text-blue-800 border-blue-400',
  'bg-emerald-200 text-emerald-800 border-emerald-400',
  'bg-amber-200 text-amber-800 border-amber-400',
  'bg-violet-200 text-violet-800 border-violet-400',
  'bg-cyan-200 text-cyan-800 border-cyan-400',
  'bg-fuchsia-200 text-fuchsia-800 border-fuchsia-400',
  'bg-lime-200 text-lime-800 border-lime-400',
];

const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

export default function App() {
  const [keys, setKeys] = useState<number[]>([42, 17, 99, 23, 8, 105, 73]);
  const [tableSize, setTableSize] = useState<number>(12);
  const [hashType, setHashType] = useState<HashFunctionType>('modulo');
  const [inputValue, setInputValue] = useState<string>('');

  // Hash functions
  const computeHash = (key: number, size: number, type: HashFunctionType) => {
    if (type === 'modulo') {
      return key % size;
    } else {
      const fractionalPart = (key * GOLDEN_RATIO) % 1;
      return Math.floor(size * fractionalPart);
    }
  };

  // Derive buckets
  const buckets = useMemo(() => {
    const result: number[][] = Array.from({ length: tableSize }, () => []);
    keys.forEach((key) => {
      const idx = computeHash(key, tableSize, hashType);
      if (idx >= 0 && idx < tableSize) {
        result[idx].push(key);
      }
    });
    return result;
  }, [keys, tableSize, hashType]);

  // Stats
  const collisions = useMemo(() => {
    return buckets.reduce((acc, bucket) => acc + (bucket.length > 1 ? bucket.length - 1 : 0), 0);
  }, [buckets]);

  const maxBucketSize = Math.max(...buckets.map((b) => b.length), 1);
  const loadFactor = (keys.length / tableSize).toFixed(2);

  // Handlers
  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val >= 0) {
      setKeys((prev) => [...prev, val]);
      setInputValue('');
    }
  };

  const handleAddRandom = () => {
    const randomKeys = Array.from({ length: 5 }, () => Math.floor(Math.random() * 1000));
    setKeys((prev) => [...prev, ...randomKeys]);
  };

  const handleClear = () => {
    setKeys([]);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans text-slate-800 selection:bg-pink-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border-4 border-indigo-100 shadow-[8px_8px_0px_0px_rgba(224,231,255,1)]">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-indigo-900 mb-2">
              Hash Function Lab 🧪
            </h1>
            <p className="text-indigo-600 font-medium">
              Experiment with hash functions and watch how keys distribute across buckets!
            </p>
          </div>
          <div className="flex gap-4 text-sm font-bold">
            <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-2xl">{keys.length}</span>
              <span className="uppercase text-xs tracking-wider">Total Keys</span>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 text-amber-700 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-2xl">{collisions}</span>
              <span className="uppercase text-xs tracking-wider">Collisions</span>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl flex flex-col items-center">
              <span className="text-2xl">{loadFactor}</span>
              <span className="uppercase text-xs tracking-wider">Load Factor</span>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Panel */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border-4 border-pink-100 shadow-[8px_8px_0px_0px_rgba(252,231,243,1)] space-y-6">
              
              {/* Table Size Slider */}
              <div className="space-y-3">
                <label className="flex justify-between font-bold text-slate-700">
                  <span>Table Size (M)</span>
                  <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded-md">{tableSize}</span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="32"
                  value={tableSize}
                  onChange={(e) => setTableSize(parseInt(e.target.value, 10))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              {/* Hash Function Selector */}
              <div className="space-y-3">
                <label className="font-bold text-slate-700 block">Hash Function</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setHashType('modulo')}
                    className={`py-3 px-2 rounded-xl font-bold border-2 transition-all ${
                      hashType === 'modulo'
                        ? 'bg-indigo-500 text-white border-indigo-700 shadow-[4px_4px_0px_0px_rgba(67,56,202,1)] translate-y-[-2px]'
                        : 'bg-indigo-50 text-indigo-400 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    Modulo
                  </button>
                  <button
                    onClick={() => setHashType('multiplicative')}
                    className={`py-3 px-2 rounded-xl font-bold border-2 transition-all ${
                      hashType === 'multiplicative'
                        ? 'bg-indigo-500 text-white border-indigo-700 shadow-[4px_4px_0px_0px_rgba(67,56,202,1)] translate-y-[-2px]'
                        : 'bg-indigo-50 text-indigo-400 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    Multiplicative
                  </button>
                </div>
                
                {/* Math Explanation */}
                <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-mono text-slate-600 text-center">
                  {hashType === 'modulo' ? (
                    <p>h(k) = k <span className="text-indigo-500 font-bold">mod</span> {tableSize}</p>
                  ) : (
                    <p>h(k) = ⌊{tableSize} × ((k × <span className="text-indigo-500 font-bold">A</span>) mod 1)⌋<br/><span className="text-xs text-slate-400">A ≈ 0.618033 (Golden Ratio)</span></p>
                  )}
                </div>
              </div>

              <hr className="border-pink-100 border-2 rounded-full" />

              {/* Add Keys */}
              <form onSubmit={handleAddKey} className="space-y-3">
                <label className="font-bold text-slate-700 block">Insert Key</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 42"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-bold focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue}
                    className="bg-emerald-400 text-emerald-950 font-bold px-4 py-2 rounded-xl border-2 border-emerald-600 shadow-[3px_3px_0px_0px_rgba(5,150,105,1)] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(5,150,105,1)] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddRandom}
                  className="bg-amber-300 text-amber-900 font-bold px-4 py-3 rounded-xl border-2 border-amber-500 shadow-[3px_3px_0px_0px_rgba(217,119,6,1)] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(217,119,6,1)] active:translate-y-[3px] active:shadow-none transition-all"
                >
                  +5 Random
                </button>
                <button
                  onClick={handleClear}
                  className="bg-rose-300 text-rose-900 font-bold px-4 py-3 rounded-xl border-2 border-rose-500 shadow-[3px_3px_0px_0px_rgba(225,29,72,1)] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(225,29,72,1)] active:translate-y-[3px] active:shadow-none transition-all"
                >
                  Clear All
                </button>
              </div>

            </div>
          </aside>

          {/* Visualization Panel */}
          <section className="lg:col-span-8 bg-white p-6 rounded-3xl border-4 border-cyan-100 shadow-[8px_8px_0px_0px_rgba(207,250,254,1)] flex flex-col">
            <h2 className="text-xl font-bold text-cyan-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🪣</span> Bucket Distribution
            </h2>
            
            <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-slate-100 p-4 md:p-6 overflow-y-auto">
              {/* Bucket Grid */}
              <div 
                className="grid gap-3"
                style={{ 
                  gridTemplateColumns: `repeat(auto-fill, minmax(${tableSize > 16 ? '60px' : '80px'}, 1fr))` 
                }}
              >
                {buckets.map((bucketKeys, index) => {
                  const isCollision = bucketKeys.length > 1;
                  // Calculate height intensity based on max bucket size
                  const intensity = Math.max(0.1, bucketKeys.length / maxBucketSize);
                  
                  return (
                    <div 
                      key={index} 
                      className={`relative flex flex-col-reverse items-center justify-start rounded-xl border-2 transition-all duration-300 ${
                        bucketKeys.length > 0 
                          ? isCollision 
                            ? 'bg-rose-50 border-rose-200 shadow-[0_4px_0_0_rgba(254,205,211,1)]' 
                            : 'bg-indigo-50 border-indigo-200 shadow-[0_4px_0_0_rgba(199,210,254,1)]'
                          : 'bg-white border-dashed border-slate-200'
                      }`}
                      style={{ minHeight: '160px', paddingBottom: '32px' }}
                    >
                      {/* Bucket Index Badge */}
                      <div className="absolute bottom-1 w-full text-center">
                        <span className="text-xs font-bold text-slate-400 bg-white/80 px-2 py-0.5 rounded-full">
                          {index}
                        </span>
                      </div>

                      {/* Stacked Keys */}
                      <div className="flex flex-col-reverse w-full px-1 gap-1 pb-1 z-10">
                        {bucketKeys.map((k, i) => {
                          const colorClass = PASTEL_COLORS[k % PASTEL_COLORS.length];
                          return (
                            <div 
                              key={`${k}-${i}`}
                              className={`w-full text-center py-1.5 rounded-lg border-2 text-sm font-black shadow-sm transform transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${colorClass}`}
                              title={`Key: ${k} -> Hash: ${index}`}
                            >
                              {k}
                            </div>
                          );
                        })}
                      </div>

                      {/* Empty state visual filler */}
                      {bucketKeys.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-slate-600 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-indigo-50 border-2 border-indigo-200"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-rose-50 border-2 border-rose-200"></div>
                <span>Collision Detected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border-2 border-dashed border-slate-200"></div>
                <span>Empty Bucket</span>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}