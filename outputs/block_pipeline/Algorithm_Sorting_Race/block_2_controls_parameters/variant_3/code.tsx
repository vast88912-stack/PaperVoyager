import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Shuffle, 
  Settings2, 
  BarChart, 
  Info, 
  ShieldCheck, 
  ArrowDownUp, 
  ListOrdered, 
  Minimize2 
} from 'lucide-react';

// --- DATASETS & PEDAGOGY ---
const DATASETS = [
  { 
    id: 'random', 
    label: 'Random', 
    icon: Shuffle, 
    color: 'bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-400',
    activeColor: 'bg-blue-600 text-white border-blue-600',
    tip: 'A perfectly shuffled array. Good for testing average-case time complexity.'
  },
  { 
    id: 'nearly_sorted', 
    label: 'Nearly Sorted', 
    icon: ListOrdered, 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-400',
    activeColor: 'bg-emerald-600 text-white border-emerald-600',
    tip: 'Only a few elements are out of place. Insertion sort shines here with O(N) time!'
  },
  { 
    id: 'reversed', 
    label: 'Reversed', 
    icon: ArrowDownUp, 
    color: 'bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-400',
    activeColor: 'bg-rose-600 text-white border-rose-600',
    tip: 'Strictly descending. The ultimate worst-case scenario for Bubble and Insertion sort.'
  },
  { 
    id: 'few_uniques', 
    label: 'Few Uniques', 
    icon: Minimize2, 
    color: 'bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-400',
    activeColor: 'bg-purple-600 text-white border-purple-600',
    tip: 'Many duplicate values. Great for observing stability and 3-way Quick Sort efficiency.'
  }
];

export default function App() {
  // State
  const [arraySize, setArraySize] = useState(50);
  const [speed, setSpeed] = useState(50);
  const [dataset, setDataset] = useState('random');
  const [isStable, setIsStable] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Derived
  const activeDataset = DATASETS.find(d => d.id === dataset);

  // Handlers
  const handleToggleRun = () => setIsRunning(!isRunning);
  const handleShuffle = () => {
    setIsRunning(false);
    // Logic to shuffle would go here
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      
      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <BarChart className="w-8 h-8 text-indigo-600" />
            Sorting Race 2.0
            <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-wider align-middle ml-2">
              ChatGPT Edition
            </span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Configure parameters to explore algorithm behaviors.</p>
        </div>
      </header>

      {/* MAIN DASHBOARD */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Bento Box 1: Dataset Presets */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800">1. Select Dataset</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DATASETS.map((d) => {
                const Icon = d.icon;
                const isActive = dataset === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDataset(d.id)}
                    disabled={isRunning}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isActive ? d.activeColor : d.color}
                    `}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
                    <span className="font-semibold text-sm text-center">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Bento Box 2: Sliders */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-slate-400" />
              2. Tune Parameters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Array Size Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="font-semibold text-slate-700">Array Size</label>
                  <span className="text-2xl font-black text-indigo-600">{arraySize}</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="200" step="10"
                  value={arraySize}
                  onChange={(e) => setArraySize(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
                />
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <span>10 (Fast)</span>
                  <span>200 (Dense)</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="font-semibold text-slate-700">Animation Speed</label>
                  <span className="text-2xl font-black text-indigo-600">{speed}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="100"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <span>Slow</span>
                  <span>Instant</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Actions & Pedagogy */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* Primary Action Card */}
          <section className="bg-slate-900 p-6 rounded-3xl shadow-lg border border-slate-800 flex-shrink-0 flex flex-col justify-center">
            <div className="flex gap-4">
              <button 
                onClick={handleToggleRun}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-transform active:scale-95
                  ${isRunning 
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' 
                    : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                  }
                `}
              >
                {isRunning ? (
                  <><Pause className="w-6 h-6 fill-current" /> Pause Race</>
                ) : (
                  <><Play className="w-6 h-6 fill-current" /> Start Race</>
                )}
              </button>
              <button 
                onClick={handleShuffle}
                disabled={isRunning}
                className="p-4 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-2xl disabled:opacity-50 transition-colors"
                title="Shuffle Data"
              >
                <Shuffle className="w-6 h-6" />
              </button>
            </div>

            {/* Stability Toggle embedded in Action Card */}
            <div className="mt-6 pt-6 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className={`w-5 h-5 ${isStable ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="font-semibold text-sm">Require Stable Sorts</span>
              </div>
              <button
                onClick={() => setIsStable(!isStable)}
                disabled={isRunning}
                className={`w-12 h-6 rounded-full p-1 transition-colors disabled:opacity-50
                  ${isStable ? 'bg-emerald-500' : 'bg-slate-600'}
                `}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isStable ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>

          {/* Pedagogy / Info Card */}
          <section className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-indigo-900">Pedagogy Corner</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Current Dataset</h4>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {activeDataset?.tip}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Stability Mode</h4>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {isStable 
                    ? "Stable algorithms preserve the relative order of equal elements. Merge Sort and Insertion Sort naturally do this." 
                    : "Unstable algorithms are allowed. Quick Sort and Heap Sort are faster but might mix up equal elements."}
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* VISUALIZATION PLACEHOLDER (To ground the context of controls) */}
      <div className="max-w-6xl mx-auto mt-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm opacity-60 pointer-events-none flex flex-col items-center justify-center min-h-[200px] border-dashed">
        <BarChart className="w-12 h-12 text-slate-300 mb-2" />
        <p className="text-slate-400 font-semibold text-center">Race Track Visualization Area</p>
        <p className="text-slate-400 text-sm text-center max-w-md">Lanes for Bubble, Insertion, Merge, Quick, Heap, and Radix will render here, bound to the {arraySize} elements.</p>
      </div>

    </div>
  );
}

// Optional dependencies:
// npm install lucide-react