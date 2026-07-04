import React, { useState } from 'react';

// --- Icons ---
const IconRandom = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const IconNearlySorted = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h4" />
  </svg>
);

const IconReversed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
);

const IconFewUniques = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const IconInfo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconShuffle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// --- Types ---
type DatasetType = 'random' | 'nearly-sorted' | 'reversed' | 'few-uniques';

interface PresetOption {
  id: DatasetType;
  label: string;
  description: string;
  icon: React.FC;
}

const PRESETS: PresetOption[] = [
  { id: 'random', label: 'Random', description: 'Completely chaotic data', icon: IconRandom },
  { id: 'nearly-sorted', label: 'Nearly Sorted', description: 'Only a few elements out of place', icon: IconNearlySorted },
  { id: 'reversed', label: 'Reversed', description: 'Sorted in descending order', icon: IconReversed },
  { id: 'few-uniques', label: 'Few Uniques', description: 'Many repeating values', icon: IconFewUniques },
];

export default function App() {
  const [dataset, setDataset] = useState<DatasetType>('random');
  const [arraySize, setArraySize] = useState<number>(100);
  const [speed, setSpeed] = useState<number>(50);
  const [isStable, setIsStable] = useState<boolean>(false);
  const [showStabilityInfo, setShowStabilityInfo] = useState<boolean>(true);

  const handleShuffle = () => {
    console.log(`Shuffling dataset: ${dataset} with size ${arraySize}`);
    // Trigger shuffle logic here
  };

  const handleStartRace = () => {
    console.log(`Starting race! Size: ${arraySize}, Speed: ${speed}, Stable: ${isStable}`);
    // Trigger race start logic here
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="bg-white max-w-5xl w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col md:flex-row">
        
        {/* Left Column: Sliders & Toggles */}
        <div className="w-full md:w-1/2 p-8 bg-white flex flex-col justify-between">
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
                Sorting Race 2.0
              </h1>
              <p className="text-slate-500 font-medium">Configure your algorithmic race parameters.</p>
            </div>

            {/* Array Size Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="font-bold text-slate-700 text-sm uppercase tracking-wider">Array Size</label>
                <span className="text-2xl font-black text-indigo-600">{arraySize}</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={arraySize}
                onChange={(e) => setArraySize(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                <span>10 (Fast)</span>
                <span>500 (Heavy)</span>
              </div>
            </div>

            {/* Speed Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="font-bold text-slate-700 text-sm uppercase tracking-wider">Animation Speed</label>
                <span className="text-2xl font-black text-emerald-600">{speed}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                <span>1% (Step-by-step)</span>
                <span>100% (Instant)</span>
              </div>
            </div>

            {/* Stability Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowStabilityInfo(!showStabilityInfo)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                    aria-label="Toggle stability info"
                  >
                    <IconInfo />
                  </button>
                  <div>
                    <span className="font-bold text-slate-700 block">Enforce Stability</span>
                    <span className="text-xs text-slate-500">Use stable variants of algorithms</span>
                  </div>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  onClick={() => setIsStable(!isStable)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    isStable ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-300 ${
                      isStable ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Stability Explanation Card */}
              {showStabilityInfo && (
                <div className="mt-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900 animate-fade-in">
                  <strong className="block mb-1 text-indigo-700">What is a Stable Sort?</strong>
                  A stable sorting algorithm maintains the relative order of records with equal keys. 
                  If two items have the same value, the one that appeared first in the original array will appear first in the sorted array.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleShuffle}
              className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors border border-slate-200"
            >
              <IconShuffle />
              Shuffle Data
            </button>
            <button
              onClick={handleStartRace}
              className="flex-[2] flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-slate-900/20"
            >
              <IconPlay />
              Start Race
            </button>
          </div>
        </div>

        {/* Right Column: Dataset Presets */}
        <div className="w-full md:w-1/2 bg-slate-100 p-8 border-l border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wider">Dataset Presets</h2>
          <div className="grid grid-cols-1 gap-4">
            {PRESETS.map((preset) => {
              const isActive = dataset === preset.id;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => setDataset(preset.id)}
                  className={`relative flex items-center p-5 rounded-2xl text-left transition-all duration-200 border-2 ${
                    isActive 
                      ? 'bg-white border-indigo-600 shadow-md transform scale-[1.02]' 
                      : 'bg-white border-transparent shadow-sm hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className={`p-3 rounded-xl mr-4 ${
                    isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {preset.label}
                    </h3>
                    <p className={`text-sm mt-0.5 ${isActive ? 'text-indigo-600/80' : 'text-slate-500'}`}>
                      {preset.description}
                    </p>
                  </div>
                  
                  {/* Active Indicator Dot */}
                  {isActive && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mini Preview Visualization (Mock) */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Preview</h3>
            <div className="h-24 flex items-end gap-1 bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
              {/* Generate some mock bars based on selected dataset */}
              {Array.from({ length: 30 }).map((_, i) => {
                let height = 10;
                if (dataset === 'random') height = Math.random() * 100;
                if (dataset === 'nearly-sorted') height = (i / 30) * 100 + (Math.random() > 0.8 ? (Math.random() * 40 - 20) : 0);
                if (dataset === 'reversed') height = 100 - (i / 30) * 100;
                if (dataset === 'few-uniques') height = [20, 50, 80][Math.floor(Math.random() * 3)];
                
                // Clamp height
                height = Math.max(5, Math.min(100, height));

                return (
                  <div 
                    key={i} 
                    className="flex-1 bg-slate-800 rounded-t-sm transition-all duration-500 ease-in-out"
                    style={{ height: `${height}%`, opacity: 0.7 + (height/300) }}
                  />
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}