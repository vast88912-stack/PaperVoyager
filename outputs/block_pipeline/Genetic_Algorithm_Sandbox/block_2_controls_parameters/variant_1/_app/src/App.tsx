import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Dna, 
  Settings2, 
  Briefcase, 
  Map, 
  TrendingUp,
  Activity
} from 'lucide-react';

// Reusable Slider Component with Organic Styling
const ParamSlider = ({ 
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
  description?: string;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col gap-2 mb-6 group">
      <div className="flex justify-between items-end">
        <div>
          <label className="text-sm font-medium text-emerald-200 group-hover:text-emerald-100 transition-colors">
            {label}
          </label>
          {description && (
            <p className="text-xs text-emerald-600/70 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-lg font-bold text-teal-400 font-mono">
          {value}{unit}
        </span>
      </div>
      
      <div className="relative h-2 rounded-full bg-emerald-950/50 border border-emerald-900/30 overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-150 ease-out"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default function App() {
  // State for Controls & Parameters
  const [problem, setProblem] = useState<'knapsack' | 'tsp' | 'function'>('tsp');
  const [popSize, setPopSize] = useState<number>(150);
  const [mutationRate, setMutationRate] = useState<number>(0.05);
  const [elitism, setElitism] = useState<number>(5);
  const [generations, setGenerations] = useState<number>(1000);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentGen, setCurrentGen] = useState<number>(0);

  // Handlers for playback simulation
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleStep = () => setCurrentGen(prev => prev + 1);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentGen(0);
  };

  return (
    <div className="min-h-screen bg-[#040D0A] text-emerald-50 font-sans flex flex-col items-center justify-center p-4 sm:p-8 selection:bg-teal-500/30">
      
      {/* Main Control Dashboard */}
      <div className="w-full max-w-5xl bg-[#071712] border border-emerald-900/40 rounded-3xl shadow-[0_0_40px_rgba(4,47,36,0.5)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Parameters Panel */}
        <div className="w-full md:w-80 bg-[#0A1F18] p-6 border-b md:border-b-0 md:border-r border-emerald-900/40 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-900/30 rounded-xl border border-emerald-800/50 text-teal-400">
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-emerald-100">Parameters</h2>
              <p className="text-xs text-emerald-500/70">Evolutionary Constraints</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <ParamSlider
              label="Population Size"
              description="Number of individuals per generation"
              value={popSize}
              min={10}
              max={500}
              step={10}
              onChange={setPopSize}
            />
            
            <ParamSlider
              label="Mutation Rate"
              description="Probability of random genetic changes"
              value={mutationRate}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={setMutationRate}
              unit="%"
            />
            
            <ParamSlider
              label="Elitism Count"
              description="Top individuals carried over unchanged"
              value={elitism}
              min={0}
              max={20}
              step={1}
              onChange={setElitism}
            />
            
            <ParamSlider
              label="Max Generations"
              description="Termination condition"
              value={generations}
              min={100}
              max={5000}
              step={100}
              onChange={setGenerations}
            />
          </div>
        </div>

        {/* Right Side: Problem Selection & Playback */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col relative">
          
          {/* Ambient Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-900/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-3">
              <Dna className="text-teal-500 animate-pulse" size={28} />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-500">
                Genetic Algorithm Sandbox
              </h1>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A1F18] border border-emerald-900/50">
              <Activity size={14} className={isPlaying ? "text-teal-400 animate-pulse" : "text-emerald-700"} />
              <span className="text-xs font-medium text-emerald-300">
                {isPlaying ? 'Evolving...' : 'Idle'}
              </span>
            </div>
          </div>

          {/* Problem Selector */}
          <div className="mb-10 relative z-10">
            <h3 className="text-sm font-medium text-emerald-400 mb-4 uppercase tracking-wider">Select Environment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <button
                onClick={() => setProblem('knapsack')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                  problem === 'knapsack' 
                    ? 'bg-emerald-900/40 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.15)] text-teal-300' 
                    : 'bg-[#0A1F18] border-emerald-900/30 text-emerald-600 hover:border-emerald-700/50 hover:text-emerald-400'
                }`}
              >
                <Briefcase size={24} className="mb-2" />
                <span className="font-medium text-sm">0/1 Knapsack</span>
              </button>

              <button
                onClick={() => setProblem('tsp')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                  problem === 'tsp' 
                    ? 'bg-emerald-900/40 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.15)] text-teal-300' 
                    : 'bg-[#0A1F18] border-emerald-900/30 text-emerald-600 hover:border-emerald-700/50 hover:text-emerald-400'
                }`}
              >
                <Map size={24} className="mb-2" />
                <span className="font-medium text-sm">Travelling Salesman</span>
              </button>

              <button
                onClick={() => setProblem('function')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                  problem === 'function' 
                    ? 'bg-emerald-900/40 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.15)] text-teal-300' 
                    : 'bg-[#0A1F18] border-emerald-900/30 text-emerald-600 hover:border-emerald-700/50 hover:text-emerald-400'
                }`}
              >
                <TrendingUp size={24} className="mb-2" />
                <span className="font-medium text-sm">Function Max</span>
              </button>
              
            </div>
          </div>

          {/* Spacer for layout */}
          <div className="flex-1" />

          {/* Playback Controls Area */}
          <div className="bg-[#0A1F18]/80 backdrop-blur-sm p-6 rounded-3xl border border-emerald-900/30 relative z-10">
            
            {/* Generation Counter */}
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-xs text-emerald-500 uppercase tracking-widest mb-1">Current Generation</p>
                <div className="text-4xl font-light font-mono text-emerald-100">
                  {currentGen.toString().padStart(4, '0')}
                  <span className="text-emerald-800 text-2xl"> / {generations}</span>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handlePlayPause}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold transition-all duration-300 ${
                  isPlaying 
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/50' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] border border-transparent hover:scale-[1.02]'
                }`}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                {isPlaying ? 'PAUSE EVOLUTION' : 'START EVOLUTION'}
              </button>

              <button 
                onClick={handleStep}
                disabled={isPlaying}
                className="p-4 rounded-2xl bg-[#071712] border border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/30 hover:text-teal-300 hover:border-teal-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Step Forward (1 Gen)"
              >
                <StepForward size={20} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button 
                onClick={handleReset}
                className="p-4 rounded-2xl bg-[#071712] border border-emerald-900/50 text-emerald-600 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/30 transition-all group"
                title="Reset Population"
              >
                <RotateCcw size={20} className="group-hover:-rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #064e3b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #047857;
        }
      `}} />
    </div>
  );
}