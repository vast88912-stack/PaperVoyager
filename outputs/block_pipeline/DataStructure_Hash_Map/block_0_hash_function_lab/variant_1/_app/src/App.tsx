import React, { useState, useMemo, useEffect } from 'react';

// --- Utility Functions ---

// Generate a deterministic base integer from a string (DJB2 variant)
const getBaseInt = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

// Hash Functions
const hashModulo = (key: string, size: number): number => {
  return getBaseInt(key) % size;
};

const hashMultiplicative = (key: string, size: number): number => {
  const A = 0.6180339887; // Fractional part of the golden ratio
  const k = getBaseInt(key);
  return Math.floor(size * ((k * A) % 1));
};

// Pastel Color Palette for Buckets
const PASTEL_PALETTE = [
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', tagBg: 'bg-pink-200' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', tagBg: 'bg-purple-200' },
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', tagBg: 'bg-blue-200' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', tagBg: 'bg-emerald-200' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', tagBg: 'bg-amber-200' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', tagBg: 'bg-rose-200' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', tagBg: 'bg-cyan-200' },
  { bg: 'bg-lime-100', border: 'border-lime-300', text: 'text-lime-800', tagBg: 'bg-lime-200' },
];

const DEFAULT_KEYS = [
  'Cupcake', 'Donut', 'Eclair', 'Froyo', 'Gingerbread', 
  'Honeycomb', 'IceCream', 'Jellybean', 'KitKat', 'Lollipop',
  'Marshmallow', 'Nougat', 'Oreo', 'Pie'
];

// --- Icons (Inline SVGs to avoid dependencies) ---
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
);

// --- Main Component ---
export default function App() {
  const [keys, setKeys] = useState<string[]>(DEFAULT_KEYS);
  const [newKey, setNewKey] = useState('');
  const [tableSize, setTableSize] = useState<number>(10);
  const [hashType, setHashType] = useState<'modulo' | 'multiplicative'>('modulo');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Compute Buckets
  const buckets = useMemo(() => {
    const newBuckets: string[][] = Array.from({ length: tableSize }, () => []);
    keys.forEach(key => {
      const index = hashType === 'modulo' 
        ? hashModulo(key, tableSize) 
        : hashMultiplicative(key, tableSize);
      if (index >= 0 && index < tableSize) {
        newBuckets[index].push(key);
      }
    });
    return newBuckets;
  }, [keys, tableSize, hashType]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const filledBuckets = buckets.filter(b => b.length > 0).length;
    const loadFactor = keys.length / tableSize;
    const maxCollisions = Math.max(0, ...buckets.map(b => b.length));
    
    // Simple variance calculation for distribution quality
    const mean = keys.length / tableSize;
    const variance = buckets.reduce((acc, b) => acc + Math.pow(b.length - mean, 2), 0) / tableSize;

    return { filledBuckets, loadFactor, maxCollisions, variance };
  }, [buckets, keys.length, tableSize]);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKey.trim() && !keys.includes(newKey.trim())) {
      setKeys([...keys, newKey.trim()]);
      setNewKey('');
    }
  };

  const removeKey = (keyToRemove: string) => {
    setKeys(keys.filter(k => k !== keyToRemove));
    if (hoveredKey === keyToRemove) setHoveredKey(null);
  };

  const clearKeys = () => setKeys([]);
  const resetKeys = () => setKeys(DEFAULT_KEYS);

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-800 font-sans p-4 md:p-8 selection:bg-pink-200">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-pink-300 to-purple-400 rounded-2xl shadow-sm text-white">
          <SparklesIcon />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Hash Function Lab</h1>
          <p className="text-slate-500 font-medium mt-1">Explore how different algorithms distribute data across buckets.</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Inspector */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Settings Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              Configuration
            </h2>
            
            <div className="space-y-5">
              {/* Hash Function Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hash Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHashType('modulo')}
                    className={`p-3 rounded-xl text-sm font-bold transition-all ${
                      hashType === 'modulo' 
                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-300 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    Modulo
                  </button>
                  <button
                    onClick={() => setHashType('multiplicative')}
                    className={`p-3 rounded-xl text-sm font-bold transition-all ${
                      hashType === 'multiplicative' 
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    Multiplicative
                  </button>
                </div>
              </div>

              {/* Table Size Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700">Table Size (Buckets)</label>
                  <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-lg text-xs font-bold">{tableSize}</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="30" 
                  value={tableSize} 
                  onChange={(e) => setTableSize(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Dataset Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Dataset</h2>
              <div className="flex gap-2">
                <button onClick={resetKeys} className="text-xs font-semibold text-slate-500 hover:text-purple-600 transition-colors">Reset</button>
                <button onClick={clearKeys} className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors">Clear</button>
              </div>
            </div>

            <form onSubmit={handleAddKey} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Add a new key..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
              <button 
                type="submit"
                disabled={!newKey.trim()}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {keys.length === 0 && <p className="text-sm text-slate-400 italic w-full text-center py-4">No keys in dataset.</p>}
              {keys.map((key) => (
                <div 
                  key={key}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-default
                    ${hoveredKey === key 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md scale-105' 
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {key}
                  <button 
                    onClick={() => removeKey(key)}
                    className={`p-0.5 rounded-full transition-colors ${hoveredKey === key ? 'text-slate-300 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Inspector Panel (Math Breakdown) */}
          <div className={`p-6 rounded-3xl border transition-all duration-300 ${hoveredKey ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 border-dashed'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <InfoIcon /> Math Inspector
            </h3>
            {hoveredKey ? (
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                  <span className="text-slate-500">Key</span>
                  <span className="font-bold text-indigo-900">"{hoveredKey}"</span>
                </div>
                <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg">
                  <span className="text-slate-500">Base Int (DJB2)</span>
                  <span className="font-bold text-indigo-900">{getBaseInt(hoveredKey)}</span>
                </div>
                
                {hashType === 'modulo' ? (
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
                    <div className="text-xs text-slate-500 mb-1 font-sans font-semibold">Modulo Calculation</div>
                    <div className="text-indigo-800">
                      {getBaseInt(hoveredKey)} <span className="text-indigo-400">%</span> {tableSize} <span className="text-indigo-400">=</span> <span className="font-bold text-lg">{hashModulo(hoveredKey, tableSize)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
                    <div className="text-xs text-slate-500 mb-1 font-sans font-semibold">Multiplicative Calculation</div>
                    <div className="text-indigo-800 text-xs leading-relaxed">
                      k = {getBaseInt(hoveredKey)}<br/>
                      A ≈ 0.618033...<br/>
                      index = floor({tableSize} * ((k * A) % 1))<br/>
                      <span className="text-sm mt-1 block">
                        = <span className="font-bold text-lg">{hashMultiplicative(hoveredKey, tableSize)}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic text-center py-6">
                Hover over a key to see how its hash is calculated.
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Visualization */}
        <div className="lg:col-span-8 flex flex-col">
          
          {/* Top Metrics Bar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex-1 min-w-[140px]">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Load Factor</div>
              <div className="text-2xl font-black text-slate-800">{metrics.loadFactor.toFixed(2)}</div>
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex-1 min-w-[140px]">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Max Collisions</div>
              <div className="text-2xl font-black text-rose-500">{metrics.maxCollisions}</div>
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex-1 min-w-[140px]">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Distribution Variance</div>
              <div className="text-2xl font-black text-indigo-500">{metrics.variance.toFixed(2)}</div>
            </div>
          </div>

          {/* Buckets Grid */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {buckets.map((bucketKeys, index) => {
                const palette = PASTEL_PALETTE[index % PASTEL_PALETTE.length];
                const isHoveredTarget = hoveredKey && bucketKeys.includes(hoveredKey);
                
                return (
                  <div 
                    key={index} 
                    className={`
                      relative flex flex-col rounded-2xl border-2 transition-all duration-300 min-h-[120px]
                      ${isHoveredTarget ? 'ring-4 ring-indigo-200 scale-105 z-10' : ''}
                      ${bucketKeys.length > 0 ? `${palette.bg} ${palette.border}` : 'bg-slate-50 border-slate-200 border-dashed'}
                    `}
                  >
                    {/* Bucket Index Badge */}
                    <div className={`
                      absolute -top-3 -left-3 w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-sm
                      ${bucketKeys.length > 0 ? `bg-white ${palette.text} border-2 ${palette.border}` : 'bg-slate-100 text-slate-400 border-2 border-slate-200'}
                    `}>
                      {index}
                    </div>

                    {/* Bucket Content */}
                    <div className="flex-1 p-3 pt-6 flex flex-col gap-2 justify-end">
                      {bucketKeys.map((k, i) => (
                        <div 
                          key={`${k}-${i}`}
                          className={`
                            px-2 py-1.5 rounded-lg text-xs font-bold text-center truncate shadow-sm transition-all
                            ${k === hoveredKey 
                              ? 'bg-slate-800 text-white scale-110 shadow-md z-20' 
                              : `bg-white/80 ${palette.text}`
                            }
                          `}
                          title={k}
                        >
                          {k}
                        </div>
                      ))}
                      {bucketKeys.length === 0 && (
                        <div className="text-center text-slate-300 text-xs font-medium pb-2">Empty</div>
                      )}
                    </div>
                    
                    {/* Collision Indicator */}
                    {bucketKeys.length > 1 && (
                      <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                        {bucketKeys.length}
                      </div>
                    )}
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