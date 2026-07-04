import React, { useState, useMemo, useEffect } from 'react';
import { AlertCircle, BarChart3, Info, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

const TABLE_SIZE = 100;
const PASTEL_COLORS = [
  'bg-[#FFB3BA]', // pastel pink
  'bg-[#FFDFBA]', // pastel orange
  'bg-[#FFFFBA]', // pastel yellow
  'bg-[#BAFFC9]', // pastel green
  'bg-[#BAE1FF]', // pastel blue
  'bg-[#E8BAFF]', // pastel purple
];

// Helper to generate a stable random fill order and color for the grid
const generateGridData = () => {
  const cells = Array.from({ length: TABLE_SIZE }, (_, i) => ({
    id: i,
    order: 0,
    color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
  }));
  
  // Shuffle to create a random fill order
  const shuffled = [...cells].sort(() => Math.random() - 0.5);
  shuffled.forEach((cell, index) => {
    cells[cell.id].order = index;
  });
  
  return cells;
};

export default function App() {
  const [loadFactor, setLoadFactor] = useState<number>(0.5);
  const [gridData, setGridData] = useState<any[]>([]);

  useEffect(() => {
    setGridData(generateGridData());
  }, []);

  // Calculate Expected Probes based on Load Factor (alpha)
  const alpha = loadFactor;
  
  const stats = useMemo(() => {
    // Avoid division by zero at exactly 1.0, though max is 0.95
    const safeAlpha = Math.min(alpha, 0.99);

    // Separate Chaining
    const chainSucc = 1 + safeAlpha / 2;
    const chainUnsucc = safeAlpha; // expected length of a chain

    // Linear Probing
    const linSucc = 0.5 * (1 + 1 / (1 - safeAlpha));
    const linUnsucc = 0.5 * (1 + 1 / Math.pow(1 - safeAlpha, 2));

    // Quadratic Probing (Approximation)
    const quadSucc = 1 - Math.log(1 - safeAlpha) - safeAlpha / 2;
    const quadUnsucc = 1 / (1 - safeAlpha) - safeAlpha - Math.log(1 - safeAlpha);

    // Cuckoo Hashing (Simplified: max 2 probes for 2-way cuckoo)
    // Note: Cuckoo hashing fails to insert well before 0.95 without a stash, 
    // but lookups remain strictly bounded.
    const cuckooSucc = 1.5; 
    const cuckooUnsucc = 2.0;

    return {
      chaining: { succ: chainSucc, unsucc: chainUnsucc },
      linear: { succ: linSucc, unsucc: linUnsucc },
      quadratic: { succ: quadSucc, unsucc: quadUnsucc },
      cuckoo: { succ: cuckooSucc, unsucc: cuckooUnsucc }
    };
  }, [alpha]);

  const filledCount = Math.round(alpha * TABLE_SIZE);

  // Status indicators based on load factor
  let statusColor = "text-green-500";
  let statusBg = "bg-green-100";
  let statusText = "Healthy";
  let statusIcon = <CheckCircle2 className="w-6 h-6 text-green-600" />;
  
  if (alpha >= 0.75) {
    statusColor = "text-orange-500";
    statusBg = "bg-orange-100";
    statusText = "Degrading";
    statusIcon = <AlertCircle className="w-6 h-6 text-orange-600" />;
  }
  if (alpha >= 0.9) {
    statusColor = "text-red-500";
    statusBg = "bg-red-100";
    statusText = "Critical Stress";
    statusIcon = <ShieldAlert className="w-6 h-6 text-red-600" />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 p-6 md:p-10 font-sans selection:bg-[#BAE1FF]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-4 border-slate-200 border-dashed">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Zap className="w-10 h-10 text-[#FFDFBA] fill-[#FFDFBA] stroke-slate-800 stroke-2" />
              Load Factor Stress
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-medium max-w-2xl">
              Push the limits of your hash map. Observe how different collision resolution strategies degrade as the table fills up toward <span className="font-bold text-slate-700">α = 0.95</span>.
            </p>
          </div>
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_rgba(30,41,59,1)] transition-colors ${statusBg}`}>
            {statusIcon}
            <span className="font-bold text-lg text-slate-800 uppercase tracking-wide">{statusText}</span>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Controls & Grid */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Slider Control */}
            <div className="bg-white p-8 rounded-3xl border-4 border-slate-800 shadow-[8px_8px_0px_rgba(30,41,59,1)]">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
                    Load Factor (<span className="font-serif italic">α</span>)
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Elements / Table Size</p>
                </div>
                <div className="text-4xl font-black text-slate-800 bg-[#E8BAFF] px-4 py-2 rounded-xl border-2 border-slate-800">
                  {alpha.toFixed(2)}
                </div>
              </div>

              <input
                type="range"
                min="0.01"
                max="0.95"
                step="0.01"
                value={loadFactor}
                onChange={(e) => setLoadFactor(parseFloat(e.target.value))}
                className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer border-2 border-slate-800 accent-[#BAE1FF] focus:outline-none focus:ring-4 focus:ring-[#BAE1FF]/50"
              />
              
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-1">
                <span>0.01 (Empty)</span>
                <span>0.5 (Ideal)</span>
                <span>0.95 (Stressed)</span>
              </div>
            </div>

            {/* Visual Grid */}
            <div className="bg-white p-8 rounded-3xl border-4 border-slate-800 shadow-[8px_8px_0px_rgba(30,41,59,1)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-slate-800" />
                  Bucket Visualization
                </h3>
                <span className="bg-slate-800 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {filledCount} / 100 Filled
                </span>
              </div>
              
              <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                {gridData.map((cell) => {
                  const isFilled = cell.order < filledCount;
                  return (
                    <div
                      key={cell.id}
                      className={`
                        aspect-square rounded-md border-2 transition-all duration-300
                        ${isFilled 
                          ? `${cell.color} border-slate-800 scale-100 opacity-100 shadow-[2px_2px_0px_rgba(30,41,59,1)]` 
                          : `bg-slate-50 border-slate-200 scale-95 opacity-50`
                        }
                      `}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Analytics & Probes */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-3xl font-black text-slate-800 mb-2">Expected Probes</h2>
            <p className="text-slate-600 font-medium mb-6">
              Average number of table accesses required to find an element or verify it doesn't exist.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Linear Probing */}
              <StrategyCard 
                title="Linear Probing" 
                colorClass="bg-[#FFB3BA]"
                succ={stats.linear.succ}
                unsucc={stats.linear.unsucc}
                description="Checks contiguous buckets. Suffers heavily from primary clustering."
              />

              {/* Quadratic Probing */}
              <StrategyCard 
                title="Quadratic Probing" 
                colorClass="bg-[#FFDFBA]"
                succ={stats.quadratic.succ}
                unsucc={stats.quadratic.unsucc}
                description="Checks buckets at quadratically increasing intervals. Mild secondary clustering."
              />

              {/* Separate Chaining */}
              <StrategyCard 
                title="Separate Chaining" 
                colorClass="bg-[#BAFFC9]"
                succ={stats.chaining.succ}
                unsucc={stats.chaining.unsucc}
                description="Stores elements in linked lists. Graceful degradation, but extra memory."
              />

              {/* Cuckoo Hashing */}
              <StrategyCard 
                title="Cuckoo Hashing" 
                colorClass="bg-[#BAE1FF]"
                succ={stats.cuckoo.succ}
                unsucc={stats.cuckoo.unsucc}
                description="Constant O(1) lookups bounded strictly to 2 probes. High insert cost near limits."
              />

            </div>

            {/* Explainer Box */}
            <div className="mt-8 bg-[#FFFFBA] p-6 rounded-3xl border-4 border-slate-800 shadow-[6px_6px_0px_rgba(30,41,59,1)] flex gap-4 items-start">
              <Info className="w-8 h-8 text-slate-800 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-lg text-slate-800 mb-2">Why does Open Addressing fail at α → 1?</h4>
                <p className="text-slate-700 font-medium leading-relaxed">
                  As the table fills, contiguous blocks of occupied buckets merge (clustering). A new insertion or an unsuccessful search must scan past these entire blocks. Notice how <strong>Linear Probing</strong> expected probes skyrocket exponentially after α = 0.7. This is why hash maps automatically rehash (resize) well before becoming completely full!
                </p>
              </div>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}

// Subcomponent for displaying strategy metrics
function StrategyCard({ 
  title, 
  colorClass, 
  succ, 
  unsucc, 
  description 
}: { 
  title: string; 
  colorClass: string; 
  succ: number; 
  unsucc: number; 
  description: string;
}) {
  
  // Visual limit for the bar charts
  const MAX_PROBES_CHART = 50; 
  
  const getWidth = (val: number) => {
    if (!isFinite(val)) return '100%';
    const pct = (val / MAX_PROBES_CHART) * 100;
    return `${Math.min(pct, 100)}%`;
  };

  const isExploding = unsucc > MAX_PROBES_CHART;

  return (
    <div className="bg-white p-6 rounded-3xl border-4 border-slate-800 shadow-[6px_6px_0px_rgba(30,41,59,1)] flex flex-col h-full relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(30,41,59,1)] transition-all">
      
      {/* Decorative background blob */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-20 transition-transform group-hover:scale-150 ${colorClass}`} />

      <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">{title}</h3>
      <p className="text-xs text-slate-500 font-medium mb-5 min-h-[40px] relative z-10">{description}</p>
      
      <div className="space-y-4 mt-auto relative z-10">
        
        {/* Successful Search */}
        <div>
          <div className="flex justify-between text-sm font-bold mb-1">
            <span className="text-slate-700">Successful Hit</span>
            <span className="text-slate-900">{succ.toFixed(2)}</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full border border-slate-300 overflow-hidden">
            <div 
              className={`h-full border-r border-slate-800 transition-all duration-300 ${colorClass}`}
              style={{ width: getWidth(succ) }}
            />
          </div>
        </div>

        {/* Unsuccessful Search */}
        <div>
          <div className="flex justify-between text-sm font-bold mb-1">
            <span className="text-slate-700">Unsuccessful / Miss</span>
            <span className={`transition-colors ${isExploding ? 'text-red-500 font-black' : 'text-slate-900'}`}>
              {!isFinite(unsucc) || unsucc > 999 ? "∞" : unsucc.toFixed(2)}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full border border-slate-300 overflow-hidden relative">
            <div 
              className={`h-full border-r border-slate-800 transition-all duration-300 ${isExploding ? 'bg-red-400' : colorClass}`}
              style={{ width: getWidth(unsucc) }}
            />
            {isExploding && (
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiI+PC9wYXRoPgo8L3N2Zz4=')] opacity-30 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}