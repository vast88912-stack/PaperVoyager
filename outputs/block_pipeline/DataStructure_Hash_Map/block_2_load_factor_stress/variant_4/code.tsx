import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Layers, 
  ArrowRightLeft, 
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react';

// --- Math & Theory Helpers ---
// Alpha (α) is the Load Factor (N / M)

// Separate Chaining: Expected probes for successful search = 1 + α/2
const calcSeparateChaining = (alpha: number) => 1 + alpha / 2;

// Linear Probing: Expected probes for successful search ≈ 1/2 * (1 + 1/(1-α))
const calcLinearProbing = (alpha: number) => {
  if (alpha >= 1) return Infinity;
  return 0.5 * (1 + 1 / (1 - alpha));
};

// Double/Quadratic Probing (Uniform assumption): Expected probes for successful search ≈ (1/α) * ln(1/(1-α))
const calcUniformHashing = (alpha: number) => {
  if (alpha === 0) return 1;
  if (alpha >= 1) return Infinity;
  return (1 / alpha) * Math.log(1 / (1 - alpha));
};

// Cuckoo Hashing (2 hash functions): Expected O(1) mostly 1, but fails if α > ~0.5.
// For visualization, we'll keep it at 1.something until 0.49, then show failure.
const calcCuckoo = (alpha: number) => {
  if (alpha > 0.49) return Infinity; 
  return 1 + (alpha * 0.1); // Slight increase just for visual feedback, theoretically very close to 1
};

// --- Palette & Visual Helpers ---
const PASTEL_COLORS = [
  'bg-rose-300', 'bg-pink-300', 'bg-fuchsia-300', 'bg-purple-300', 
  'bg-violet-300', 'bg-indigo-300', 'bg-blue-300', 'bg-sky-300', 
  'bg-cyan-300', 'bg-teal-300', 'bg-emerald-300', 'bg-green-300', 
  'bg-lime-300', 'bg-yellow-300', 'bg-amber-300', 'bg-orange-300'
];

// Seeded random for stable rendering
const cyrb128 = (str: string) => {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}
const sfc32 = (a: number, b: number, c: number, d: number) => {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      let t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

const TABLE_SIZE = 100;

export default function App() {
  const [loadFactor, setLoadFactor] = useState<number>(0.50);

  // Generate a stable shuffled array of indices 0-99 to represent which buckets fill up
  // and assign them a random pastel color.
  const bucketFillOrder = useMemo(() => {
    const seed = cyrb128("hash-map-stress-test");
    const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
    
    const indices = Array.from({ length: TABLE_SIZE }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Map to an object for easy O(1) lookup during render: index -> color
    const bucketMap = new Map<number, string>();
    indices.forEach((originalIndex, orderFilled) => {
      const color = PASTEL_COLORS[Math.floor(rand() * PASTEL_COLORS.length)];
      bucketMap.set(originalIndex, { order: orderFilled, color });
    });
    return bucketMap;
  }, []);

  const numItems = Math.floor(loadFactor * TABLE_SIZE);

  // Calculate stats
  const sepChainingProbes = calcSeparateChaining(loadFactor);
  const linearProbes = calcLinearProbing(loadFactor);
  const uniformProbes = calcUniformHashing(loadFactor);
  const cuckooProbes = calcCuckoo(loadFactor);

  // Helper to render the progress bars for probes
  const ProbeGauge = ({ value, max = 5, inverseColor = false }: { value: number, max?: number, inverseColor?: boolean }) => {
    const isInfinity = !isFinite(value);
    const percentage = isInfinity ? 100 : Math.min((value / max) * 100, 100);
    
    let colorClass = 'bg-emerald-400';
    if (isInfinity) {
      colorClass = 'bg-rose-500 animate-pulse';
    } else if (value > 3) {
      colorClass = 'bg-rose-400';
    } else if (value > 2) {
      colorClass = 'bg-amber-400';
    }

    if (inverseColor && !isInfinity) {
      colorClass = 'bg-sky-400';
    }

    return (
      <div className="w-full bg-slate-100 rounded-full h-3 mt-3 overflow-hidden border border-slate-200 shadow-inner">
        <div 
          className={`h-full ${colorClass} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800 flex flex-col items-center">
      
      {/* Header */}
      <div className="max-w-5xl w-full mb-8 text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-purple-100 mb-2">
          <Activity className="w-8 h-8 text-purple-400 mr-3" />
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            Load Factor Stress Test
          </h1>
        </div>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Push the limits of different collision resolution strategies. Watch how expected probe counts 
          (the number of buckets checked to find an item) skyrocket as the table gets full.
        </p>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Visualization */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          
          {/* Slider Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Table Pressure (α)
                </h2>
                <p className="text-sm text-slate-400">Items / Table Size</p>
              </div>
              <div className="text-4xl font-black text-slate-700 tabular-nums tracking-tighter">
                {loadFactor.toFixed(2)}
              </div>
            </div>

            <input 
              type="range" 
              min="0.01" 
              max="0.95" 
              step="0.01" 
              value={loadFactor}
              onChange={(e) => setLoadFactor(parseFloat(e.target.value))}
              className="w-full h-4 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-shadow"
            />
            
            <div className="flex justify-between mt-3 text-xs font-semibold text-slate-400 px-1">
              <span>Empty (0.01)</span>
              <span>Packed (0.95)</span>
            </div>
          </div>

          {/* Grid Visualization */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                Hash Table Grid
              </h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100">
                {numItems} / {TABLE_SIZE} filled
              </span>
            </div>
            
            <div className="flex-grow flex items-center justify-center">
              <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner w-full max-w-sm aspect-square">
                {Array.from({ length: TABLE_SIZE }).map((_, i) => {
                  const bucketInfo = bucketFillOrder.get(i);
                  const isFilled = bucketInfo && bucketInfo.order < numItems;
                  return (
                    <div 
                      key={i}
                      className={`
                        rounded-sm transition-all duration-300 ease-out border
                        ${isFilled 
                          ? `${bucketInfo.color} border-black/10 scale-100 shadow-sm` 
                          : 'bg-white border-slate-200 scale-95 opacity-60'
                        }
                      `}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Strategy Metrics */}
        <div className="col-span-1 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Strategy: Separate Chaining */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-700">Separate Chaining</h3>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-md border border-emerald-100">Stable</span>
              </div>
              <p className="text-sm text-slate-500 mb-4 h-10">
                Items share buckets via linked lists. Probes grow slowly and linearly.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:border-emerald-200 transition-colors">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-slate-500">Expected Probes</span>
                <span className="text-2xl font-black text-slate-800 tabular-nums">
                  {sepChainingProbes.toFixed(2)}
                </span>
              </div>
              <ProbeGauge value={sepChainingProbes} max={5} />
              <div className="mt-2 text-xs text-slate-400 text-right font-mono">1 + α/2</div>
            </div>
          </div>

          {/* Strategy: Double Hashing */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-700">Double / Quadratic</h3>
                <span className="px-2 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-md border border-amber-100">Moderate</span>
              </div>
              <p className="text-sm text-slate-500 mb-4 h-10">
                Skips around collisions. Resists clustering better than linear probing.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:border-amber-200 transition-colors">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-slate-500">Expected Probes</span>
                <span className="text-2xl font-black text-slate-800 tabular-nums">
                  {uniformProbes.toFixed(2)}
                </span>
              </div>
              <ProbeGauge value={uniformProbes} max={5} />
              <div className="mt-2 text-xs text-slate-400 text-right font-mono">(1/α) * ln(1/(1-α))</div>
            </div>
          </div>

          {/* Strategy: Linear Probing */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-700">Linear Probing</h3>
                <span className="px-2 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-md border border-rose-100">Volatile</span>
              </div>
              <p className="text-sm text-slate-500 mb-4 h-10">
                Checks next adjacent bucket. Highly susceptible to primary clustering.
              </p>
            </div>
            
            <div className={`bg-slate-50 p-4 rounded-2xl border transition-colors ${loadFactor > 0.8 ? 'border-rose-300 bg-rose-50' : 'border-slate-100 group-hover:border-rose-200'}`}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-slate-500">Expected Probes</span>
                <span className={`text-2xl font-black tabular-nums ${loadFactor > 0.8 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {linearProbes.toFixed(2)}
                </span>
              </div>
              <ProbeGauge value={linearProbes} max={5} />
              <div className="mt-2 text-xs text-slate-400 text-right font-mono">1/2 * (1 + 1/(1-α))</div>
            </div>
          </div>

          {/* Strategy: Cuckoo Hashing */}
          <div className={`p-6 rounded-3xl shadow-sm border transition-all duration-500 flex flex-col justify-between group
            ${loadFactor > 0.49 
              ? 'bg-rose-50 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
              : 'bg-white border-slate-200 hover:shadow-md'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-lg ${loadFactor > 0.49 ? 'text-rose-700' : 'text-slate-700'}`}>Cuckoo Hashing</h3>
                {loadFactor > 0.49 ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-md shadow-sm animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Rehash!
                  </span>
                ) : (
                   <span className="px-2 py-1 bg-sky-50 text-sky-600 text-xs font-bold rounded-md border border-sky-100">Fast</span>
                )}
              </div>
              <p className={`text-sm mb-4 h-10 ${loadFactor > 0.49 ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                {loadFactor > 0.49 
                  ? "Infinite displacement loop likely! Max safe load factor (α) is 0.5."
                  : "Evicts items to alternative locations. Keeps lookups strictly O(1)."
                }
              </p>
            </div>
            
            <div className={`p-4 rounded-2xl border transition-colors ${loadFactor > 0.49 ? 'bg-rose-100/50 border-rose-200' : 'bg-slate-50 border-slate-100 group-hover:border-sky-200'}`}>
              <div className="flex justify-between items-baseline mb-1">
                <span className={`text-sm font-semibold ${loadFactor > 0.49 ? 'text-rose-700' : 'text-slate-500'}`}>Expected Probes</span>
                <span className={`text-2xl font-black tabular-nums ${loadFactor > 0.49 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {loadFactor > 0.49 ? '∞' : cuckooProbes.toFixed(2)}
                </span>
              </div>
              <ProbeGauge value={cuckooProbes} max={2} inverseColor={true} />
              <div className={`mt-2 text-xs text-right font-mono ${loadFactor > 0.49 ? 'text-rose-500' : 'text-slate-400'}`}>
                {loadFactor > 0.49 ? 'Cycle Detected' : '≈ 1.0 (Worst case 2)'}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer Info */}
      <div className="max-w-5xl w-full mt-6 flex items-start gap-3 p-4 bg-sky-50 text-sky-800 rounded-2xl border border-sky-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Why does Linear Probing suffer so much?</strong> As the table fills, contiguous blocks of occupied buckets (clusters) form. 
          New items hashing into these clusters must probe sequentially to the end, making the cluster even larger. This positive feedback loop 
          causes probe counts to spike dramatically when α {'>'} 0.7.
        </p>
      </div>

    </div>
  );
}