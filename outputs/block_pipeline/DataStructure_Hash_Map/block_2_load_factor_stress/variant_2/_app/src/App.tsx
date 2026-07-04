import React, { useState, useMemo } from 'react';

// --- Constants & Deterministic Helpers ---
const TABLE_SIZE = 100;

// Deterministic pseudo-random shuffle for grid fill order
const PRECOMPUTED_FILL_ORDER = Array.from({ length: TABLE_SIZE }, (_, i) => i).sort((a, b) => {
  const hashA = Math.sin(a * 12.9898) * 43758.5453;
  const hashB = Math.sin(b * 12.9898) * 43758.5453;
  return (hashA - Math.floor(hashA)) - (hashB - Math.floor(hashB));
});

const PASTEL_COLORS = [
  'bg-pink-300',
  'bg-purple-300',
  'bg-indigo-300',
  'bg-sky-300',
  'bg-emerald-300',
  'bg-amber-300',
  'bg-rose-300'
];

// Assign a fixed random color to each slot for visual consistency
const SLOT_COLORS = Array.from({ length: TABLE_SIZE }, (_, i) => {
  const hash = Math.sin(i * 54.321) * 43758.5453;
  const index = Math.floor((hash - Math.floor(hash)) * PASTEL_COLORS.length);
  return PASTEL_COLORS[index];
});

// --- Main Component ---
export default function App() {
  const [loadFactor, setLoadFactor] = useState<number>(0.5);

  // --- Calculations ---
  const filledSlotsCount = Math.floor(loadFactor * TABLE_SIZE);
  
  // Determine which slots are currently filled based on our deterministic order
  const filledIndices = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < filledSlotsCount; i++) {
      set.add(PRECOMPUTED_FILL_ORDER[i]);
    }
    return set;
  }, [filledSlotsCount]);

  // Expected Probe Formulas
  // Separate Chaining
  const chainingSuccess = 1 + loadFactor / 2;
  const chainingUnsuccess = 1 + loadFactor;

  // Linear Probing
  // Prevent division by exactly zero, though slider max is 0.95
  const safeAlpha = Math.min(loadFactor, 0.99);
  const linearSuccess = 0.5 * (1 + 1 / (1 - safeAlpha));
  const linearUnsuccess = 0.5 * (1 + 1 / Math.pow(1 - safeAlpha, 2));

  // Cuckoo Hashing (2-choice)
  const cuckooFails = loadFactor > 0.5;
  const cuckooSuccess = cuckooFails ? 'N/A' : '≤ 2.00';
  const cuckooUnsuccess = cuckooFails ? 'N/A' : '≤ 2.00';

  // Stress Level indicator
  let stressLevel = { text: "Relaxed 😌", color: "text-emerald-500", bg: "bg-emerald-100" };
  if (loadFactor > 0.75) stressLevel = { text: "High Stress! 🥵", color: "text-rose-600", bg: "bg-rose-100" };
  else if (loadFactor > 0.5) stressLevel = { text: "Getting Crowded 😬", color: "text-amber-500", bg: "bg-amber-100" };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col items-center">
      
      {/* Header */}
      <header className="max-w-4xl w-full mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-900 mb-3 tracking-tight">
          Load Factor Stress Test
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Explore how the load factor (<span className="font-mono bg-indigo-100 text-indigo-800 px-1 rounded">α</span>) 
          impacts the expected number of probes to find or insert a key across different collision resolution strategies.
        </p>
      </header>

      <main className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Grid */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Control Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-end mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Adjust Load Factor (α)
                </label>
                <div className="text-3xl font-black text-indigo-600">
                  {loadFactor.toFixed(2)}
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full font-bold text-sm ${stressLevel.bg} ${stressLevel.color} transition-colors duration-300`}>
                {stressLevel.text}
              </div>
            </div>
            
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.01"
              value={loadFactor}
              onChange={(e) => setLoadFactor(parseFloat(e.target.value))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
            />
            
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
              <span>Empty (0.0)</span>
              <span>Optimal (0.5)</span>
              <span>Critical (0.95)</span>
            </div>
          </div>

          {/* Visual Grid */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
              Hash Table Visualization ({filledSlotsCount} / {TABLE_SIZE} buckets filled)
            </h3>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: TABLE_SIZE }).map((_, i) => {
                const isFilled = filledIndices.has(i);
                return (
                  <div
                    key={i}
                    className={`
                      aspect-square rounded-xl transition-all duration-300 ease-out border-2
                      ${isFilled 
                        ? `${SLOT_COLORS[i]} border-black/5 shadow-inner scale-100 opacity-100` 
                        : 'bg-slate-50 border-slate-100 scale-95 opacity-60 hover:bg-slate-100'
                      }
                    `}
                    title={`Bucket ${i} ${isFilled ? '(Filled)' : '(Empty)'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Stats Cards */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-800 px-2">Expected Probes</h2>
          
          {/* Separate Chaining Card */}
          <div className="bg-[#fdf4ff] border-2 border-[#f0abfc] p-5 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#fae8ff] rounded-full opacity-50 pointer-events-none" />
            <h3 className="font-extrabold text-xl text-[#86198f] mb-4">Separate Chaining</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatBox label="Successful" value={chainingSuccess.toFixed(2)} color="text-[#a21caf]" />
              <StatBox label="Unsuccessful" value={chainingUnsuccess.toFixed(2)} color="text-[#a21caf]" />
            </div>
            <p className="text-xs text-[#a21caf] mt-4 font-medium opacity-80">
              Gracefully degrades. Probes scale linearly with load factor.
            </p>
          </div>

          {/* Linear Probing Card */}
          <div className="bg-[#eff6ff] border-2 border-[#93c5fd] p-5 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#dbeafe] rounded-full opacity-50 pointer-events-none" />
            <h3 className="font-extrabold text-xl text-[#1e3a8a] mb-4">Linear Probing</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatBox 
                label="Successful" 
                value={linearSuccess > 50 ? "> 50" : linearSuccess.toFixed(2)} 
                color={linearSuccess > 5 ? "text-rose-600" : "text-[#1d4ed8]"} 
              />
              <StatBox 
                label="Unsuccessful" 
                value={linearUnsuccess > 50 ? "> 50" : linearUnsuccess.toFixed(2)} 
                color={linearUnsuccess > 10 ? "text-rose-600" : "text-[#1d4ed8]"} 
              />
            </div>
            <p className="text-xs text-[#1e40af] mt-4 font-medium opacity-80">
              Suffers from primary clustering. Performance collapses as α → 1.
            </p>
          </div>

          {/* Cuckoo Hashing Card */}
          <div className={`border-2 p-5 rounded-3xl shadow-sm relative overflow-hidden transition-colors ${cuckooFails ? 'bg-rose-50 border-rose-300' : 'bg-[#f0fdf4] border-[#86efac]'}`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-50 pointer-events-none ${cuckooFails ? 'bg-rose-100' : 'bg-[#dcfce3]'}`} />
            <h3 className={`font-extrabold text-xl mb-4 ${cuckooFails ? 'text-rose-800' : 'text-[#14532d]'}`}>
              Cuckoo Hashing <span className="text-sm font-normal opacity-75">(2-choice)</span>
            </h3>
            
            {cuckooFails ? (
              <div className="bg-rose-100 text-rose-700 p-4 rounded-xl font-bold text-center border border-rose-200">
                🚨 Rehash Required!
                <div className="text-sm font-medium mt-1 opacity-90">
                  Standard 2-choice Cuckoo frequently fails to build when α > 0.5.
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <StatBox label="Successful" value={cuckooSuccess} color="text-[#15803d]" />
                  <StatBox label="Unsuccessful" value={cuckooUnsuccess} color="text-[#15803d]" />
                </div>
                <p className="text-xs text-[#166534] mt-4 font-medium opacity-80">
                  O(1) worst-case lookup. Insertions may require displacing existing keys.
                </p>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

// --- Helper Components ---
function StatBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/40">
      <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">{label}</div>
      <div className={`text-3xl font-black ${color}`}>
        {value}
      </div>
    </div>
  );
}