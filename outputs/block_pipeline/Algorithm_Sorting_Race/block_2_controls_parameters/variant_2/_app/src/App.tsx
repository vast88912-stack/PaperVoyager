import React, { useState, useEffect, useCallback } from 'react';

// --- Helper Functions ---
const generateArray = (size: number, type: string): number[] => {
  let arr = Array.from({ length: size }, (_, i) => i + 1);
  
  switch (type) {
    case 'nearly-sorted':
      for (let i = 0; i < arr.length; i += 5) {
        if (i + 1 < arr.length) {
          const temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
        }
      }
      break;
    case 'reversed':
      arr.reverse();
      break;
    case 'few-uniques':
      const uniques = [10, 25, 50, 75, 90];
      arr = Array.from({ length: size }, () => uniques[Math.floor(Math.random() * uniques.length)]);
      break;
    case 'random':
    default:
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      break;
  }
  return arr;
};

// --- Main Component ---
export default function App() {
  const [arraySize, setArraySize] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(5);
  const [datasetType, setDatasetType] = useState<string>('random');
  const [isStable, setIsStable] = useState<boolean>(false);
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>(['merge', 'quick']);
  const [previewData, setPreviewData] = useState<number[]>([]);

  // Regenerate preview data when parameters change
  const handleShuffle = useCallback(() => {
    setPreviewData(generateArray(arraySize, datasetType));
  }, [arraySize, datasetType]);

  useEffect(() => {
    handleShuffle();
  }, [handleShuffle]);

  const toggleAlgo = (algo: string) => {
    setSelectedAlgos(prev => 
      prev.includes(algo) ? prev.filter(a => a !== algo) : [...prev, algo]
    );
  };

  const algos = [
    { id: 'bubble', name: 'Bubble Sort' },
    { id: 'insertion', name: 'Insertion Sort' },
    { id: 'merge', name: 'Merge Sort' },
    { id: 'quick', name: 'Quick Sort' },
    { id: 'heap', name: 'Heap Sort' },
    { id: 'radix', name: 'Radix Sort' },
  ];

  const datasets = [
    { id: 'random', label: 'Random' },
    { id: 'nearly-sorted', label: 'Nearly Sorted' },
    { id: 'reversed', label: 'Reversed' },
    { id: 'few-uniques', label: 'Few Uniques' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans selection:bg-indigo-200">
      
      {/* Header */}
      <header className="mb-8 border-b-4 border-slate-900 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Sorting Race 2.0</h1>
          <p className="text-lg font-medium text-slate-600 mt-1">ChatGPT Edition • Control Center</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleShuffle}
            className="flex items-center gap-2 bg-white border-2 border-slate-900 text-slate-900 px-5 py-2.5 font-bold shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Shuffle Data
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 border-2 border-slate-900 text-white px-6 py-2.5 font-bold shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Start Race
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Dataset Presets */}
          <section className="bg-white p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              Dataset Configuration
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {datasets.map(ds => (
                <button
                  key={ds.id}
                  onClick={() => setDatasetType(ds.id)}
                  className={`py-3 px-2 border-2 font-bold text-sm transition-colors ${
                    datasetType === ds.id 
                      ? 'bg-indigo-600 border-indigo-900 text-white shadow-inner' 
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {ds.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sliders */}
          <section className="bg-white p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Race Parameters
            </h2>
            
            <div className="space-y-8">
              {/* Array Size Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="arraySize" className="font-bold text-slate-700">Array Size (Elements)</label>
                  <span className="bg-slate-900 text-white font-mono px-3 py-1 text-sm font-bold rounded-sm">{arraySize}</span>
                </div>
                <input 
                  id="arraySize"
                  type="range" 
                  min="10" 
                  max="200" 
                  value={arraySize} 
                  onChange={(e) => setArraySize(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-1">
                  <span>10</span>
                  <span>200</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="speed" className="font-bold text-slate-700">Animation Speed</label>
                  <span className="bg-slate-900 text-white font-mono px-3 py-1 text-sm font-bold rounded-sm">{speed}x</span>
                </div>
                <input 
                  id="speed"
                  type="range" 
                  min="1" 
                  max="10" 
                  value={speed} 
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          </section>

          {/* Competitors (Algorithms) */}
          <section className="bg-white p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Select Competitors
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {algos.map(algo => {
                const isSelected = selectedAlgos.includes(algo.id);
                return (
                  <label 
                    key={algo.id} 
                    className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className={`w-5 h-5 flex items-center justify-center border-2 ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400 bg-white'}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-600'}`}>
                      {algo.name}
                    </span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isSelected}
                      onChange={() => toggleAlgo(algo.id)}
                    />
                  </label>
                )
              })}
            </div>
          </section>

        </div>

        {/* Right Column: Pedagogy & Preview */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Stability Card */}
          <section className="bg-amber-50 border-2 border-amber-900 p-6 shadow-[4px_4px_0px_0px_rgba(120,53,15,1)]">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-black text-amber-900 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Algorithm Stability
              </h2>
              
              {/* Toggle Switch */}
              <button 
                onClick={() => setIsStable(!isStable)}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer border-2 border-amber-900 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 ${isStable ? 'bg-amber-600' : 'bg-amber-200'}`}
                role="switch"
                aria-checked={isStable}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform bg-white shadow ring-0 transition duration-200 ease-in-out border-2 border-amber-900 ${isStable ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>
            
            <div className="space-y-3 text-amber-900/80 font-medium text-sm leading-relaxed">
              <p>
                <strong className="text-amber-950">What is stability?</strong> A stable sorting algorithm maintains the relative order of records with equal keys.
              </p>
              <p>
                Imagine sorting a list of students first by <em>Name</em>, and then by <em>Grade</em>. If you use a stable sort for the grades, students with the same grade will remain sorted alphabetically by name!
              </p>
              <div className="mt-4 bg-amber-200/50 p-3 border border-amber-300 rounded text-xs font-mono">
                <span className="block text-amber-950 font-bold mb-1">Stable Algos:</span>
                Bubble, Insertion, Merge, Radix
                <span className="block text-amber-950 font-bold mt-2 mb-1">Unstable Algos:</span>
                Quick, Heap
              </div>
            </div>
          </section>

          {/* Live Data Preview */}
          <section className="bg-slate-900 border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-white">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Dataset Preview
              </h2>
              <span className="text-xs font-mono text-slate-400">N={arraySize}</span>
            </div>
            
            <div className="h-48 w-full flex items-end gap-[1px] bg-slate-800 p-2 rounded border border-slate-700">
              {previewData.map((val, idx) => {
                // Normalize height relative to max value possible
                const maxVal = Math.max(...previewData, 1);
                const heightPct = (val / maxVal) * 100;
                
                return (
                  <div 
                    key={idx} 
                    className="flex-1 bg-indigo-500 hover:bg-indigo-400 transition-colors"
                    style={{ height: `${heightPct}%` }}
                    title={`Value: ${val}`}
                  />
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-between text-xs text-slate-400 font-mono">
              <span>0</span>
              <span>Index</span>
              <span>{arraySize - 1}</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}