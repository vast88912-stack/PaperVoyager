import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Info, BarChart2, AlertCircle, Hash, Layers, ArrowRight } from 'lucide-react';

// --- Types & Constants ---
type Strategy = 'linear' | 'quadratic' | 'chaining';

interface StrategyInfo {
  id: Strategy;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const STRATEGIES: StrategyInfo[] = [
  {
    id: 'chaining',
    name: 'Separate Chaining',
    icon: <Layers className="w-5 h-5" />,
    color: 'bg-[#bae1ff] text-blue-800 border-blue-200',
    description: 'Collisions are stored in a linked list at the bucket. Degrades gracefully.',
  },
  {
    id: 'linear',
    name: 'Linear Probing',
    icon: <ArrowRight className="w-5 h-5" />,
    color: 'bg-[#ffb3ba] text-red-800 border-red-200',
    description: 'Probes consecutive slots. Suffers heavily from primary clustering at high loads.',
  },
  {
    id: 'quadratic',
    name: 'Quadratic Probing',
    icon: <Activity className="w-5 h-5" />,
    color: 'bg-[#baffc9] text-green-800 border-green-200',
    description: 'Probes with quadratically increasing intervals. Avoids primary clustering.',
  },
];

const TABLE_SIZE = 144; // 12x12 grid for nice visualization

// --- Helper Functions ---
// Deterministic shuffle for stable grid visualization
const generateFillSequence = (size: number) => {
  const seq = Array.from({ length: size }, (_, i) => i);
  let seed = 12345;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq;
};

// --- Main Component ---
export default function App() {
  const [loadFactor, setLoadFactor] = useState<number>(0.5);
  const [strategy, setStrategy] = useState<Strategy>('linear');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stable sequence to determine which cells fill up first as slider moves
  const fillSequence = useMemo(() => generateFillSequence(TABLE_SIZE), []);

  // Calculate Expected Probes based on Knuth's formulas
  const stats = useMemo(() => {
    const a = loadFactor;
    let successful = 0;
    let unsuccessful = 0;

    // Prevent division by zero or negative near 1.0
    const safeA = Math.min(a, 0.999); 

    switch (strategy) {
      case 'chaining':
        // Unsuccessful: length of chain = alpha
        unsuccessful = a;
        // Successful: 1 + alpha/2
        successful = 1 + a / 2;
        break;
      case 'linear':
        // Unsuccessful: 1/2 * (1 + 1/(1-alpha)^2)
        unsuccessful = 0.5 * (1 + 1 / Math.pow(1 - safeA, 2));
        // Successful: 1/2 * (1 + 1/(1-alpha))
        successful = 0.5 * (1 + 1 / (1 - safeA));
        break;
      case 'quadratic':
        // Approximation for uniform hashing / quadratic
        // Unsuccessful: 1 / (1-alpha)
        unsuccessful = 1 / (1 - safeA);
        // Successful: (1/alpha) * ln(1/(1-alpha))
        successful = safeA > 0 ? (1 / safeA) * Math.log(1 / (1 - safeA)) : 1;
        break;
    }

    return {
      successful: successful.toFixed(2),
      unsuccessful: unsuccessful.toFixed(2),
      dangerLevel: unsuccessful > 50 ? 'high' : unsuccessful > 10 ? 'medium' : 'low',
    };
  }, [loadFactor, strategy]);

  const activeStrategyInfo = STRATEGIES.find((s) => s.id === strategy)!;
  const filledCount = Math.round(loadFactor * TABLE_SIZE);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-800 font-sans p-6 md:p-12 selection:bg-pink-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#ffdfba] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#ffffba] rounded-xl shadow-sm border border-yellow-200">
                <BarChart2 className="w-6 h-6 text-yellow-700" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                Load Factor Stress Test
              </h1>
            </div>
            <p className="text-slate-500 max-w-xl text-lg">
              Observe how the table's fullness (<span className="font-mono bg-slate-100 px-1 rounded">α = N/M</span>) impacts performance. Push the load factor to the limit and watch open addressing strategies break down.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls & Stats */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Strategy Selector */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">1. Choose Strategy</h2>
              <div className="flex flex-col gap-3">
                {STRATEGIES.map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => setStrategy(strat.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-left border-2 ${
                      strategy === strat.id
                        ? `${strat.color} shadow-md scale-[1.02]`
                        : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${strategy === strat.id ? 'bg-white/50' : 'bg-white shadow-sm'}`}>
                      {strat.icon}
                    </div>
                    <div>
                      <h3 className="font-bold">{strat.name}</h3>
                      {strategy === strat.id && (
                        <p className="text-xs mt-1 opacity-90 leading-snug">{strat.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Load Factor Slider */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">2. Stress the Table</h2>
                <div className="text-3xl font-black font-mono text-slate-700">
                  α = {loadFactor.toFixed(2)}
                </div>
              </div>
              
              <div className="relative pt-2 pb-6">
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  value={loadFactor}
                  onChange={(e) => setLoadFactor(parseFloat(e.target.value))}
                  className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#ffb3ba] hover:accent-[#ff9eaa] transition-all"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-1">
                  <span>Empty (0.05)</span>
                  <span>Optimal (0.50)</span>
                  <span className="text-red-400">Critical (0.95)</span>
                </div>
              </div>
            </section>

            {/* Expected Probes Display */}
            <section className={`p-6 rounded-3xl shadow-sm border-2 transition-colors duration-500 ${
              stats.dangerLevel === 'high' ? 'bg-[#ffb3ba]/20 border-[#ffb3ba]' :
              stats.dangerLevel === 'medium' ? 'bg-[#ffdfba]/20 border-[#ffdfba]' :
              'bg-[#baffc9]/20 border-[#baffc9]'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`w-5 h-5 ${
                  stats.dangerLevel === 'high' ? 'text-red-500' :
                  stats.dangerLevel === 'medium' ? 'text-orange-500' :
                  'text-green-500'
                }`} />
                <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Expected Probes</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
                  <div className="text-xs font-bold text-slate-500 mb-1">Successful Search</div>
                  <div className="text-3xl font-black font-mono text-slate-800">
                    {stats.successful}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase">Avg. steps to find</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/50 relative overflow-hidden">
                  <div className="text-xs font-bold text-slate-500 mb-1">Unsuccessful Search</div>
                  <div className={`text-3xl font-black font-mono ${
                    stats.dangerLevel === 'high' ? 'text-red-600' : 'text-slate-800'
                  }`}>
                    {stats.unsuccessful}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase">Avg. steps to fail</div>
                  
                  {/* Warning overlay for extreme values */}
                  {stats.dangerLevel === 'high' && (
                    <div className="absolute top-2 right-2 animate-pulse">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
              </div>
              
              {stats.dangerLevel === 'high' && strategy === 'linear' && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p><strong>Primary Clustering detected!</strong> As clusters merge, probe counts skyrocket exponentially. A resize is desperately needed.</p>
                </div>
              )}
            </section>

          </div>

          {/* Right Column: Visualizer */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex-grow flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#bae1ff]" />
                  Hash Table Visualization
                </h2>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
                  {filledCount} / {TABLE_SIZE} Slots Filled
                </div>
              </div>

              {/* Grid Container */}
              <div className="flex-grow flex items-center justify-center bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200">
                <div className="grid grid-cols-12 gap-1.5 sm:gap-2 w-full max-w-md aspect-square">
                  {Array.from({ length: TABLE_SIZE }).map((_, i) => {
                    // Determine if this cell should be filled based on the stable shuffle sequence
                    const sequenceIndex = fillSequence.indexOf(i);
                    const isFilled = sequenceIndex < filledCount;
                    
                    // Determine color based on strategy and fill status
                    let cellColor = 'bg-white border-slate-200 shadow-sm';
                    if (isFilled) {
                      if (strategy === 'linear') cellColor = 'bg-[#ffb3ba] border-[#ff9eaa] shadow-inner';
                      else if (strategy === 'quadratic') cellColor = 'bg-[#baffc9] border-[#9ee8af] shadow-inner';
                      else if (strategy === 'chaining') cellColor = 'bg-[#bae1ff] border-[#9ecfff] shadow-inner';
                    }

                    return (
                      <div
                        key={i}
                        className={`rounded-md border transition-all duration-300 ease-in-out ${cellColor} ${
                          isFilled ? 'scale-100 opacity-100' : 'scale-95 opacity-60 hover:scale-100 hover:opacity-100'
                        }`}
                        // Add a subtle stagger effect to the transition based on index
                        style={{ transitionDelay: `${(sequenceIndex % 20) * 10}ms` }}
                      />
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6 flex justify-center gap-6 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white border border-slate-300"></div>
                  Empty Slot
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border ${
                     strategy === 'linear' ? 'bg-[#ffb3ba] border-[#ff9eaa]' :
                     strategy === 'quadratic' ? 'bg-[#baffc9] border-[#9ee8af]' :
                     'bg-[#bae1ff] border-[#9ecfff]'
                  }`}></div>
                  Filled Slot
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}