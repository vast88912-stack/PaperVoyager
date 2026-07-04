import React, { useState } from 'react';

export default function App() {
  const [dataset, setDataset] = useState<'random' | 'nearly-sorted' | 'reversed' | 'few-uniques'>('random');
  const [arraySize, setArraySize] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(50);
  const [isStable, setIsStable] = useState<boolean>(true);
  const [selectedAlgos, setSelectedAlgos] = useState<string[]>(['bubble', 'merge', 'quick']);

  const datasetOptions = [
    { id: 'random', label: 'Random', icon: '🔀', desc: 'Completely randomized array. Good for testing average-case performance.' },
    { id: 'nearly-sorted', label: 'Nearly Sorted', icon: '📶', desc: '90% of elements are in order. Highly efficient for adaptive algorithms like Insertion Sort.' },
    { id: 'reversed', label: 'Reversed', icon: '🔽', desc: 'Elements in descending order. Often triggers the worst-case time complexity.' },
    { id: 'few-uniques', label: 'Few Uniques', icon: '🧱', desc: 'Contains many duplicate values. Tests how algorithms handle redundancy and stability.' },
  ];

  const algorithms = [
    { id: 'bubble', label: 'Bubble Sort' },
    { id: 'insertion', label: 'Insertion Sort' },
    { id: 'merge', label: 'Merge Sort' },
    { id: 'quick', label: 'Quick Sort' },
    { id: 'heap', label: 'Heap Sort' },
    { id: 'radix', label: 'Radix Sort' },
  ];

  const handleAlgoToggle = (id: string) => {
    setSelectedAlgos(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const activeDatasetDesc = datasetOptions.find(d => d.id === dataset)?.desc;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12 font-sans selection:bg-blue-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b-2 border-slate-200">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Sorting Race 2.0
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Configure parameters before starting the algorithm race.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-bold text-slate-700">System Ready</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Dataset Selection */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                Dataset Preset
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {datasetOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDataset(opt.id as any)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                      dataset === opt.id 
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-md scale-[1.02]' 
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <span className="text-2xl mb-2">{opt.icon}</span>
                    <span className="text-sm font-bold text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Sliders & Toggles */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-8">
              
              {/* Array Size Slider */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                    Array Size
                  </label>
                  <span className="text-2xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{arraySize}</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  value={arraySize} 
                  onChange={(e) => setArraySize(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
                  <span>10 (Fast)</span>
                  <span>500 (Heavy)</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Animation Speed
                  </label>
                  <span className="text-2xl font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{speed}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={speed} 
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
                  <span>Slow Step</span>
                  <span>Light Speed</span>
                </div>
              </div>

            </section>

            {/* Competitors Selection */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Select Competitors
              </h2>
              <div className="flex flex-wrap gap-3">
                {algorithms.map(algo => {
                  const isSelected = selectedAlgos.includes(algo.id);
                  return (
                    <button
                      key={algo.id}
                      onClick={() => handleAlgoToggle(algo.id)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                        isSelected 
                          ? 'border-slate-800 bg-slate-800 text-white shadow-md' 
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {algo.label}
                    </button>
                  )
                })}
              </div>
            </section>

          </div>

          {/* Side Panel: Explanations & Actions */}
          <div className="space-y-6">
            
            {/* Action Buttons */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl text-white flex flex-col gap-4">
              <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-xl shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                START RACE
              </button>
              <button className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-md rounded-xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Shuffle Data
              </button>
            </div>

            {/* Stability Toggle & Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Enforce Stability</h3>
                <button 
                  onClick={() => setIsStable(!isStable)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isStable ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isStable ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm text-amber-900 font-medium">
                  {isStable 
                    ? "Stable sorting maintains the relative order of records with equal keys. (e.g., Merge Sort, Insertion Sort)" 
                    : "Unstable sorting may change the relative order of records with equal keys. (e.g., Quick Sort, Heap Sort)"}
                </p>
              </div>
            </div>

            {/* Explanation Card */}
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-sm font-black text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Current Configuration
              </h3>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">
                {activeDatasetDesc}
              </p>
              <ul className="space-y-2 text-sm font-medium text-slate-600">
                <li className="flex justify-between border-b border-blue-200/50 pb-1">
                  <span>Elements:</span>
                  <span className="text-blue-800 font-bold">{arraySize}</span>
                </li>
                <li className="flex justify-between border-b border-blue-200/50 pb-1">
                  <span>Speed Multiplier:</span>
                  <span className="text-blue-800 font-bold">{speed}x</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span>Competitors:</span>
                  <span className="text-blue-800 font-bold">{selectedAlgos.length}</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}