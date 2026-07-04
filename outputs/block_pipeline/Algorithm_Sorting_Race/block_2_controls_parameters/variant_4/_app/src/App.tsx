import React, { useState } from 'react';

// --- Icons ---
const ShuffleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// --- Helper Components ---
const MiniBarChart = ({ heights, active }: { heights: number[], active: boolean }) => (
  <div className="flex items-end justify-between h-12 w-full gap-[2px] mt-2 mb-1 p-1 bg-slate-50 rounded">
    {heights.map((h, i) => (
      <div
        key={i}
        style={{ height: `${h}%` }}
        className={`w-full rounded-t-sm transition-colors duration-300 ${
          active ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      />
    ))}
  </div>
);

// --- Constants ---
const DATASETS = [
  {
    id: 'random',
    label: 'Random',
    desc: 'Completely shuffled elements.',
    preview: [40, 80, 20, 100, 60, 30, 90, 50, 70, 10]
  },
  {
    id: 'nearly_sorted',
    label: 'Nearly Sorted',
    desc: 'Mostly ordered with a few swaps.',
    preview: [10, 20, 40, 30, 50, 60, 80, 70, 90, 100]
  },
  {
    id: 'reversed',
    label: 'Reversed',
    desc: 'Sorted in descending order.',
    preview: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]
  },
  {
    id: 'few_uniques',
    label: 'Few Uniques',
    desc: 'Many duplicate values.',
    preview: [30, 30, 80, 30, 80, 80, 50, 50, 30, 50]
  }
];

export default function App() {
  const [arraySize, setArraySize] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(75);
  const [dataset, setDataset] = useState<string>('random');
  const [isStable, setIsStable] = useState<boolean>(true);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Mock handler for interaction feedback
  const handleShuffle = () => {
    const btn = document.getElementById('shuffle-btn');
    if (btn) {
      btn.classList.add('rotate-180');
      setTimeout(() => btn.classList.remove('rotate-180'), 300);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8 font-sans text-slate-900">
      
      {/* Main Control Panel Card */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 md:px-8 flex items-center gap-4">
          <div className="p-2 bg-indigo-500 rounded-lg shadow-inner">
            <SettingsIcon />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase text-indigo-50">
              Sorting Race 2.0
            </h1>
            <p className="text-sm text-indigo-200 font-medium">
              Controls & Parameters Configuration
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Data Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Dataset Presets */}
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Dataset Distribution</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Preset</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DATASETS.map((ds) => {
                  const isActive = dataset === ds.id;
                  return (
                    <button
                      key={ds.id}
                      onClick={() => setDataset(ds.id)}
                      className={`relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
                        isActive 
                          ? 'border-indigo-600 bg-indigo-50 shadow-md transform -translate-y-1' 
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full mb-1">
                        <h3 className={`font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {ds.label}
                        </h3>
                        {isActive && (
                          <span className="h-3 w-3 rounded-full bg-indigo-600 animate-pulse"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-2 h-8 leading-tight">
                        {ds.desc}
                      </p>
                      <MiniBarChart heights={ds.preview} active={isActive} />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Stability Toggle & Explanation */}
            <section className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    Algorithm Stability
                    <button 
                      onMouseEnter={() => setShowInfo(true)}
                      onMouseLeave={() => setShowInfo(false)}
                      onClick={() => setShowInfo(!showInfo)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      aria-label="Stability Info"
                    >
                      <InfoIcon />
                    </button>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Preserve original order of equal elements</p>
                </div>
                
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isStable}
                    onChange={() => setIsStable(!isStable)}
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Expandable Info Card */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showInfo ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 bg-indigo-100 border-l-4 border-indigo-500 rounded text-sm text-indigo-900">
                  <strong>Stable Sort:</strong> A sorting algorithm is stable if it preserves the relative order of items with equal keys. Merge Sort and Bubble Sort are typically stable, while Quick Sort and Heap Sort are not.
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sliders & Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            
            <div className="space-y-8">
              {/* Array Size Slider */}
              <section className="bg-white p-1">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Array Size</h2>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Number of Elements</p>
                  </div>
                  <div className="bg-slate-900 text-white font-mono text-xl font-bold px-3 py-1 rounded-md shadow-inner">
                    {arraySize}
                  </div>
                </div>
                <div className="relative w-full h-8 flex items-center">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={arraySize}
                    onChange={(e) => setArraySize(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-1">
                  <span>10</span>
                  <span>200</span>
                </div>
              </section>

              {/* Simulation Speed Slider */}
              <section className="bg-white p-1">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Simulation Speed</h2>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Operations / Sec</p>
                  </div>
                  <div className="bg-slate-100 text-slate-800 border border-slate-300 font-mono text-xl font-bold px-3 py-1 rounded-md">
                    {speed}x
                  </div>
                </div>
                <div className="relative w-full h-8 flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </section>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <button
                onClick={handleShuffle}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <div id="shuffle-btn" className="transition-transform duration-300">
                  <ShuffleIcon />
                </div>
                Shuffle Dataset
              </button>

              <button
                className="w-full flex items-center justify-center gap-3 py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all duration-200 hover:shadow-[0_12px_24px_-8px_rgba(79,70,229,0.6)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-indigo-300"
              >
                <PlayIcon />
                START RACE
              </button>
            </div>

          </div>
        </div>
      </div>
      
    </div>
  );
}