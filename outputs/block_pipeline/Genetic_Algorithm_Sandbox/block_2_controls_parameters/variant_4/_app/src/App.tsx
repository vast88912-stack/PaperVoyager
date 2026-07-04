import React, { useState, useEffect } from 'react';
import { Play, Pause, StepForward, RotateCcw, Dna, Route, Briefcase, Activity, Settings2, Sparkles, ChevronRight } from 'lucide-react';

const ControlSlider = ({ label, value, min, max, step, onChange, unit = "", highlight = false }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 mb-6 group">
      <div className="flex justify-between items-center">
        <label className={`text-sm font-medium tracking-wide transition-colors ${highlight ? 'text-teal-300' : 'text-slate-300 group-hover:text-teal-200'}`}>
          {label}
        </label>
        <div className={`px-2 py-0.5 rounded text-xs font-mono shadow-inner ${highlight ? 'bg-teal-900/50 text-teal-200 border border-teal-500/30' : 'bg-slate-900/50 text-slate-300 border border-slate-700'}`}>
          {value}{unit}
        </div>
      </div>
      <div className="relative w-full h-2 rounded-full bg-slate-900 border border-slate-700 shadow-inner">
        <div 
          className="absolute h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-150 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Thumb indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-teal-500 shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none transition-transform group-hover:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
        ></div>
      </div>
    </div>
  );
};

const ProblemSelector = ({ selected, onSelect }) => {
  const problems = [
    { id: 'tsp', label: 'Travelling Salesman', icon: Route, desc: 'Find shortest path' },
    { id: 'knapsack', label: 'Knapsack', icon: Briefcase, desc: 'Optimize capacity' },
    { id: 'func', label: 'Function Max', icon: Activity, desc: 'Peak finding' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
      {problems.map(({ id, label, icon: Icon, desc }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`relative flex items-center gap-3 p-3 text-left rounded-xl transition-all duration-300 border overflow-hidden ${
            selected === id 
              ? 'bg-teal-900/40 border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.2)]' 
              : 'bg-slate-800/40 border-slate-700 hover:border-slate-500 hover:bg-slate-700/40'
          }`}
        >
          {selected === id && (
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none" />
          )}
          <div className={`p-2 rounded-lg ${selected === id ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'}`}>
            <Icon size={20} />
          </div>
          <div>
            <div className={`font-medium ${selected === id ? 'text-teal-100' : 'text-slate-200'}`}>{label}</div>
            <div className="text-xs text-slate-500">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default function App() {
  const [problem, setProblem] = useState('tsp');
  const [popSize, setPopSize] = useState(100);
  const [mutRate, setMutRate] = useState(0.05);
  const [elitism, setElitism] = useState(2);
  const [maxGenerations, setMaxGenerations] = useState(500);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentGen, setCurrentGen] = useState(0);

  // Mock progression for the sake of interactive feel
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setCurrentGen(prev => {
          if (prev >= maxGenerations) {
            setIsRunning(false);
            return prev;
          }
          return prev + 1;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning, maxGenerations]);

  const handleStep = () => {
    if (currentGen < maxGenerations) {
      setCurrentGen(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentGen(0);
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-slate-200 font-sans selection:bg-teal-500/30 flex items-center justify-center p-4 md:p-8">
      
      {/* Bioluminescent Background Effect */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 backdrop-blur-xl bg-slate-900/40 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        
        {/* Header & Main Controls (Left Column) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl shadow-[0_0_15px_rgba(45,212,191,0.1)]">
              <Dna className="text-teal-400" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-emerald-400">
                Genetic Algorithm Sandbox
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Settings2 size={14} /> Configure Evolutionary Parameters
              </p>
            </div>
          </div>

          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Target Objective</h2>
          <ProblemSelector selected={problem} onSelect={setProblem} />

          <div className="flex-grow">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-500" /> Bio-Parameters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-6 rounded-2xl bg-slate-950/50 border border-slate-800/80 shadow-inner">
              <ControlSlider 
                label="Population Size" 
                value={popSize} min={10} max={1000} step={10} 
                onChange={setPopSize} 
                highlight={isRunning}
              />
              <ControlSlider 
                label="Mutation Rate" 
                value={mutRate} min={0} max={0.2} step={0.01} 
                onChange={setMutRate} 
                unit="" 
              />
              <ControlSlider 
                label="Elitism Count" 
                value={elitism} min={0} max={50} step={1} 
                onChange={setElitism} 
              />
              <ControlSlider 
                label="Max Generations" 
                value={maxGenerations} min={10} max={2000} step={10} 
                onChange={setMaxGenerations} 
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-8 flex items-center gap-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 backdrop-blur-md">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all duration-300 shadow-lg ${
                isRunning 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                  : 'bg-teal-500 text-slate-900 border border-teal-400 hover:bg-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)]'
              }`}
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} className="fill-current" />}
              {isRunning ? 'Pause Evolution' : 'Start Evolution'}
            </button>
            
            <button
              onClick={handleStep}
              disabled={isRunning || currentGen >= maxGenerations}
              className="p-3 rounded-xl bg-slate-800 text-teal-300 border border-slate-700 hover:border-teal-500/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Step Forward"
            >
              <StepForward size={20} />
            </button>

            <button
              onClick={handleReset}
              className="p-3 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:text-rose-400 hover:border-rose-400/50 hover:bg-slate-700 transition-all"
              title="Reset Sandbox"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Status & Preview (Right Column Mockup) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 flex flex-col relative overflow-hidden group">
            {/* Ambient run glow */}
            {isRunning && (
              <div className="absolute inset-0 bg-teal-500/5 animate-pulse pointer-events-none" />
            )}
            
            <div className="flex justify-between items-center mb-6 z-10">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                Simulation Status
                {isRunning && <span className="flex h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,1)] animate-ping" />}
              </h3>
              <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-teal-400 flex items-center gap-2">
                Gen {currentGen} <span className="text-slate-600">/</span> {maxGenerations}
              </div>
            </div>

            {/* Abstract Visual Representation of the "DNA/Evolution Output" */}
            <div className="flex-1 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent opacity-50"></div>
              
              <div className="w-full flex items-end justify-between gap-1 h-32 px-4 z-10">
                {/* Mock bar chart mapping to population diversity */}
                {[...Array(20)].map((_, i) => {
                  // Simulate some math pattern for the bars
                  const isRunningMod = isRunning ? Math.sin((currentGen + i) * 0.5) * 20 : 0;
                  const baseHeight = 20 + Math.sin(i * 0.4) * 15;
                  const height = Math.max(10, Math.min(100, baseHeight + isRunningMod + (currentGen/maxGenerations)*60));
                  
                  return (
                    <div 
                      key={i} 
                      className="w-full bg-gradient-to-t from-teal-900 to-teal-500/50 rounded-t-sm transition-all duration-200"
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900">
                <div 
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-200"
                  style={{ width: `${(currentGen / maxGenerations) * 100}%` }}
                />
              </div>
            </div>

            {/* Parameter summary snippet */}
            <div className="mt-6 pt-4 border-t border-slate-800 z-10">
              <div className="text-xs font-mono text-slate-500 leading-relaxed">
                <span className="text-purple-400">const</span> <span className="text-blue-400">config</span> = {'{'} <br/>
                &nbsp;&nbsp;problem: <span className="text-amber-300">'{problem}'</span>,<br/>
                &nbsp;&nbsp;population: <span className="text-emerald-400">{popSize}</span>,<br/>
                &nbsp;&nbsp;mutationRate: <span className="text-emerald-400">{mutRate}</span>,<br/>
                &nbsp;&nbsp;elitism: <span className="text-emerald-400">{elitism}</span><br/>
                {'}'};
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between hover:bg-slate-800/50 transition-colors cursor-pointer group">
             <div>
               <div className="text-sm font-medium text-slate-300 group-hover:text-teal-300 transition-colors">Advanced DNA Operators</div>
               <div className="text-xs text-slate-500 mt-0.5">Configure Crossover & Selection methods</div>
             </div>
             <ChevronRight size={18} className="text-slate-600 group-hover:text-teal-400 transition-colors" />
          </div>
        </div>

      </div>
    </div>
  );
}