import React, { useState } from 'react';
import { 
  Dna, 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Settings2, 
  Activity,
  Briefcase,
  Map,
  TrendingUp
} from 'lucide-react';

// --- Types ---
type ProblemType = 'knapsack' | 'tsp' | 'function_max';

interface GAState {
  problem: ProblemType;
  populationSize: number;
  mutationRate: number;
  elitismCount: number;
  maxGenerations: number;
  isRunning: boolean;
  currentGeneration: number;
}

// --- Helper Components ---
const SliderControl = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  onChange, 
  unit = '',
  description
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (val: number) => void;
  unit?: string;
  description: string;
}) => (
  <div className="flex flex-col space-y-2 mb-6 group">
    <div className="flex justify-between items-end">
      <div>
        <label className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">
          {label}
        </label>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <span className="text-lg font-mono text-cyan-400 bg-slate-900/50 px-2 py-1 rounded border border-cyan-900/30">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
    />
  </div>
);

const ProblemSelector = ({ 
  active, 
  onSelect 
}: { 
  active: ProblemType; 
  onSelect: (p: ProblemType) => void 
}) => {
  const problems = [
    { id: 'knapsack', name: 'Knapsack', icon: Briefcase, desc: 'Combinatorial Optimization' },
    { id: 'tsp', name: 'Travelling Salesman', icon: Map, desc: 'Pathfinding & Routing' },
    { id: 'function_max', name: 'Function Max', icon: TrendingUp, desc: 'Continuous Landscape' },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {problems.map((p) => {
        const Icon = p.icon;
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
              isActive 
                ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : 'bg-slate-900/40 border-slate-800 hover:border-emerald-700/50 hover:bg-slate-800/50'
            }`}
          >
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50 pointer-events-none" />
            )}
            <Icon className={`w-8 h-8 mb-3 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className={`font-semibold text-sm mb-1 ${isActive ? 'text-emerald-100' : 'text-slate-300'}`}>
              {p.name}
            </span>
            <span className="text-xs text-slate-500 text-center">{p.desc}</span>
          </button>
        );
      })}
    </div>
  );
};

// --- Main Component ---
export default function App() {
  const [gaState, setGaState] = useState<GAState>({
    problem: 'knapsack',
    populationSize: 100,
    mutationRate: 0.05,
    elitismCount: 2,
    maxGenerations: 500,
    isRunning: false,
    currentGeneration: 0,
  });

  const updateState = (updates: Partial<GAState>) => {
    setGaState(prev => ({ ...prev, ...updates }));
  };

  const togglePlay = () => updateState({ isRunning: !gaState.isRunning });
  
  const handleStep = () => {
    updateState({ 
      isRunning: false, 
      currentGeneration: gaState.currentGeneration + 1 
    });
  };

  const handleReset = () => {
    updateState({ isRunning: false, currentGeneration: 0 });
  };

  return (
    <div className="min-h-screen bg-[#020817] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-[#020817] to-[#020817] text-slate-200 p-4 md:p-8 font-sans flex items-center justify-center">
      
      <div className="max-w-5xl w-full bg-slate-900/60 backdrop-blur-xl border border-emerald-900/30 rounded-3xl shadow-2xl shadow-emerald-900/10 overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-emerald-900/30 bg-slate-900/40 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-950/50 rounded-2xl border border-emerald-800/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Dna className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                Evolutionary Sandbox
              </h1>
              <p className="text-sm text-emerald-600/80 font-medium tracking-wide uppercase mt-1">
                Bio-Inspired Computing Engine
              </p>
            </div>
          </div>
          
          {/* Live Status Badge */}
          <div className="flex items-center space-x-3 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
            <Activity className={`w-4 h-4 ${gaState.isRunning ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
            <span className="text-sm font-mono text-slate-300">
              Gen: <span className="text-cyan-400 font-bold">{gaState.currentGeneration.toString().padStart(4, '0')}</span>
            </span>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Problem & Controls */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Settings2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-emerald-100">Environment Selection</h2>
              </div>
              <ProblemSelector 
                active={gaState.problem} 
                onSelect={(p) => updateState({ problem: p, currentGeneration: 0, isRunning: false })} 
              />
            </div>

            {/* Execution Controls */}
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/80 mt-8">
              <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Execution Controls</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl font-bold transition-all duration-300 ${
                    gaState.isRunning 
                      ? 'bg-amber-900/20 text-amber-400 border border-amber-700/50 hover:bg-amber-900/40' 
                      : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                  }`}
                >
                  {gaState.isRunning ? (
                    <><Pause className="w-5 h-5" /> <span>Pause Evolution</span></>
                  ) : (
                    <><Play className="w-5 h-5" /> <span>Start Evolution</span></>
                  )}
                </button>
                
                <button
                  onClick={handleStep}
                  disabled={gaState.isRunning}
                  className="p-4 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Step Forward (1 Generation)"
                >
                  <StepForward className="w-5 h-5" />
                </button>

                <button
                  onClick={handleReset}
                  className="p-4 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-900/30 hover:text-rose-400 hover:border-rose-800/50 transition-colors"
                  title="Reset Population"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Parameters */}
          <div className="lg:col-span-5 bg-slate-950/40 rounded-2xl p-6 border border-emerald-900/20">
            <div className="flex items-center space-x-2 mb-6">
              <Dna className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-semibold text-cyan-100">Genetic Parameters</h2>
            </div>

            <div className="space-y-2">
              <SliderControl
                label="Population Size"
                description="Number of individuals per generation"
                value={gaState.populationSize}
                min={10}
                max={500}
                step={10}
                onChange={(v) => updateState({ populationSize: v })}
              />
              
              <SliderControl
                label="Mutation Rate"
                description="Probability of random gene alteration"
                value={gaState.mutationRate}
                min={0.01}
                max={1.0}
                step={0.01}
                unit="%"
                onChange={(v) => updateState({ mutationRate: v })}
              />
              
              <SliderControl
                label="Elitism Count"
                description="Top individuals preserved unchanged"
                value={gaState.elitismCount}
                min={0}
                max={20}
                step={1}
                onChange={(v) => updateState({ elitismCount: v })}
              />
              
              <SliderControl
                label="Max Generations"
                description="Termination condition for the algorithm"
                value={gaState.maxGenerations}
                min={10}
                max={2000}
                step={10}
                onChange={(v) => updateState({ maxGenerations: v })}
              />
            </div>

            {/* Visual feedback of parameter intensity */}
            <div className="mt-8 p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/30">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span>Diversity Pressure</span>
                <span>Convergence Speed</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-500" 
                  style={{ width: `${(gaState.mutationRate / 1.0) * 100}%` }}
                />
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(gaState.elitismCount / 20) * 100}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}