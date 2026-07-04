import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Inline SVGs for no-dependency standalone run) ---
const IconDna = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 15c6.667-6 13.333 0 20-6" />
    <path d="M9 22c1.798-1.998 2.518-3.995 2.808-5.993" />
    <path d="M15 2c-1.798 1.998-2.518 3.995-2.808 5.993" />
    <path d="m17 6-2.5-2.5" />
    <path d="m14 8-1-1" />
    <path d="m7 18 2.5 2.5" />
    <path d="m3.5 14.5.5.5" />
    <path d="m20 9 .5.5" />
    <path d="m6.5 12.5 1 1" />
    <path d="m16.5 10.5 1 1" />
    <path d="m10 16 1.5 1.5" />
  </svg>
);

const IconPlay = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconPause = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const IconStep = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="5 4 15 12 5 20 5 4" />
    <rect x="17" y="4" width="3" height="16" />
  </svg>
);

const IconReset = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconInfo = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// --- Styled Bio-Slider Component ---
const BioSlider = ({ label, value, min, max, step, onChange, unit = "", description = "" }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col gap-2 group">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-teal-100 tracking-wide">{label}</label>
          {description && (
            <div className="relative flex items-center group/tooltip cursor-help text-teal-500 hover:text-teal-300 transition-colors">
              <IconInfo />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 border border-teal-800 text-xs text-teal-100 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl shadow-black/50">
                {description}
              </div>
            </div>
          )}
        </div>
        <span className="text-lg font-bold text-teal-400 font-mono bg-teal-950/50 px-3 py-1 rounded-lg border border-teal-800/50 shadow-[inset_0_0_10px_rgba(20,184,166,0.1)]">
          {value}{unit}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
          {/* Active Track */}
          <div 
            className="h-full bg-gradient-to-r from-teal-700 via-emerald-500 to-cyan-400 transition-all duration-150 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Actual Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="bio-range-input absolute w-full appearance-none bg-transparent cursor-pointer h-full z-10"
        />
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  // State: Problem Selection
  const [problem, setProblem] = useState('knapsack');
  
  // State: GA Parameters
  const [popSize, setPopSize] = useState(100);
  const [mutationRate, setMutationRate] = useState(0.05);
  const [elitism, setElitism] = useState(2);
  const [generations, setGenerations] = useState(250);
  
  // State: Simulation Status
  const [isRunning, setIsRunning] = useState(false);
  const [currentGen, setCurrentGen] = useState(0);

  // Mock Evolutionary Loop
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setCurrentGen((prev) => {
          if (prev >= generations) {
            setIsRunning(false);
            return prev;
          }
          // Bio-organic variable progression speed (faster at start, slower at end like real GA convergence)
          const step = Math.max(1, Math.floor((generations - prev) / 50));
          return Math.min(prev + step, generations);
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning, generations]);

  const handlePlayPause = () => {
    if (currentGen >= generations) setCurrentGen(0);
    setIsRunning(!isRunning);
  };

  const handleStep = () => {
    setIsRunning(false);
    if (currentGen < generations) setCurrentGen(prev => prev + 1);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentGen(0);
  };

  // Problems definition
  const problems = [
    { id: 'knapsack', label: '0/1 Knapsack', desc: 'Resource allocation optimization.' },
    { id: 'tsp', label: 'TSP', desc: 'Shortest path routing.' },
    { id: 'function_max', label: 'Function Max', desc: 'Peak finding in a fitness landscape.' }
  ];

  return (
    <>
      {/* Custom CSS for Range Thumb to look like a glowing biological cell */}
      <style>{`
        .bio-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #14b8a6;
          border: 2px solid #ccfbf1;
          box-shadow: 0 0 10px #14b8a6, 0 0 20px #0d9488;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .bio-range-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #34d399;
          box-shadow: 0 0 15px #34d399, 0 0 25px #10b981;
        }
        .bio-range-input::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #14b8a6;
          border: 2px solid #ccfbf1;
          box-shadow: 0 0 10px #14b8a6, 0 0 20px #0d9488;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .bio-range-input::-moz-range-thumb:hover {
          transform: scale(1.2);
          background: #34d399;
          box-shadow: 0 0 15px #34d399, 0 0 25px #10b981;
        }
      `}</style>

      <div className="min-h-screen bg-slate-950 font-sans text-slate-200 relative overflow-hidden flex items-center justify-center p-4 sm:p-8">
        {/* Background Biological Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-900/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjAsIDE4NCwgMTY2LCAwLjA1KSIvPjwvc3ZnPg==')] pointer-events-none opacity-50" />

        {/* Main Panel Container */}
        <div className="relative w-full max-w-5xl bg-slate-900/60 backdrop-blur-2xl border border-teal-500/20 shadow-[0_0_50px_rgba(20,184,166,0.1)] rounded-3xl p-6 sm:p-10 flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-teal-500/20 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 text-teal-400">
                <IconDna className="w-8 h-8 animate-pulse duration-2000" />
                <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400">
                  GA Sandbox
                </h1>
              </div>
              <p className="text-slate-400 text-sm font-medium">Evolutionary Computing Environment &middot; ChatGPT Edition</p>
            </div>

            {/* Live Progress HUD */}
            <div className="flex flex-col items-end bg-slate-950/50 p-3 rounded-xl border border-teal-900/50 w-full sm:w-auto">
              <span className="text-xs text-teal-500 uppercase tracking-widest font-bold mb-1">Evolution Progress</span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-emerald-400">{currentGen}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{generations}</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${(currentGen / generations) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Core Controls */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              
              {/* Problem Selector */}
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-teal-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_#14b8a6]" />
                  Select Environment
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {problems.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProblem(p.id)}
                      className={`relative overflow-hidden flex flex-col items-start p-4 rounded-xl border transition-all duration-300 ${
                        problem === p.id 
                          ? 'bg-teal-900/30 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.15)]' 
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-teal-700/50 text-slate-400'
                      }`}
                    >
                      {problem === p.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-50 pointer-events-none" />
                      )}
                      <span className={`font-bold ${problem === p.id ? 'text-teal-300' : 'text-slate-300'}`}>
                        {p.label}
                      </span>
                      <span className="text-xs mt-1 text-left opacity-80">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="bg-slate-900/80 rounded-2xl p-6 border border-teal-900/50 shadow-inner flex flex-col items-center gap-6 mt-auto">
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={handleReset}
                    className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-teal-400 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 active:scale-95"
                    title="Reset Evolution"
                  >
                    <IconReset />
                  </button>
                  
                  <button 
                    onClick={handlePlayPause}
                    className={`p-5 rounded-full text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-teal-500/30 ${
                      isRunning 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20 border border-orange-400/50' 
                        : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/30 border border-teal-400/50'
                    }`}
                  >
                    {isRunning ? <IconPause className="w-8 h-8" /> : <IconPlay className="w-8 h-8 ml-1" />}
                  </button>

                  <button 
                    onClick={handleStep}
                    disabled={isRunning}
                    className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95"
                    title="Step 1 Generation"
                  >
                    <IconStep />
                  </button>
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  {isRunning ? 'Synthesizing...' : 'Awaiting Commands'}
                </div>
              </div>

            </div>

            {/* Right Column: Genetic Parameters */}
            <div className="lg:col-span-7 bg-slate-900/40 rounded-2xl p-6 sm:p-8 border border-slate-700/50 shadow-xl flex flex-col gap-8 relative overflow-hidden">
              {/* Biological subtle background inside parameters */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-900/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-center justify-between z-10">
                <h2 className="text-xl font-semibold text-teal-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  Genetic Parameters
                </h2>
                <span className="px-3 py-1 bg-teal-950/50 border border-teal-800 text-teal-400 text-xs rounded-full font-medium tracking-wide">
                  Live Configuration
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 z-10">
                <BioSlider
                  label="Population Size"
                  description="Number of individuals (chromosomes) competing in each generation."
                  value={popSize}
                  min={10}
                  max={500}
                  step={10}
                  onChange={setPopSize}
                />
                
                <BioSlider
                  label="Mutation Rate"
                  description="Probability of random genetic changes to maintain diversity."
                  value={mutationRate}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  onChange={setMutationRate}
                />
                
                <BioSlider
                  label="Elitism Count"
                  description="Number of top-performing individuals guaranteed to survive to the next generation."
                  value={elitism}
                  min={0}
                  max={Math.floor(popSize * 0.2)} // Max 20% of population
                  step={1}
                  onChange={setElitism}
                />
                
                <BioSlider
                  label="Generations"
                  description="Maximum number of evolutionary cycles before termination."
                  value={generations}
                  min={10}
                  max={1000}
                  step={10}
                  onChange={setGenerations}
                />
              </div>

              {/* Data Visualization / Insight Card */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-teal-500">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="flex-1 relative z-10">
                  <h4 className="text-sm