import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  Layers, 
  Database, 
  Settings2, 
  Cpu, 
  Zap,
  Lock
} from 'lucide-react';

export default function App() {
  const [dataset, setDataset] = useState<'spiral' | 'xor' | 'blobs'>('spiral');
  const [activation, setActivation] = useState<'relu' | 'sigmoid' | 'tanh'>('relu');
  const [hiddenNeurons, setHiddenNeurons] = useState<number>(4);
  const [learningRate, setLearningRate] = useState<number>(0.03);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [freezeNeuron, setFreezeNeuron] = useState<boolean>(false);
  
  // Mock state for visual feedback
  const [epoch, setEpoch] = useState<number>(0);
  const [loss, setLoss] = useState<number>(1.243);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setEpoch(prev => prev + 1);
        setLoss(prev => Math.max(0.01, prev - (prev * learningRate * 0.5) + (Math.random() * 0.02 - 0.01)));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, learningRate]);

  const handleReset = () => {
    setIsPlaying(false);
    setEpoch(0);
    setLoss(1.243);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-300 font-sans p-6 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#050508] to-[#050508]">
      
      {/* Main Control Panel Container */}
      <div className="w-full max-w-4xl border border-cyan-900/40 rounded-2xl bg-slate-950/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(8,145,178,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-900/40 bg-gradient-to-r from-cyan-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                ML CONTROL MATRIX <span className="text-xs font-mono text-cyan-500 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800">V.5</span>
              </h1>
              <p className="text-xs text-slate-500 font-mono">NEURAL NET FORWARD/BACKWARD VIEWER</p>
            </div>
          </div>
          
          {/* Live Metrics mini-display */}
          <div className="flex gap-4 font-mono text-xs">
            <div className="flex flex-col items-end">
              <span className="text-slate-500">EPOCH</span>
              <span className="text-cyan-400 glow-text">{epoch.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-slate-500">LOSS</span>
              <span className="text-fuchsia-400 glow-text">{loss.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-cyan-900/30">
          
          {/* COLUMN 1: Data & Architecture */}
          <div className="p-6 space-y-8">
            
            {/* Dataset Picker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <Database className="w-4 h-4 text-cyan-500" /> DATASET
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['spiral', 'xor', 'blobs'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDataset(d)}
                    className={`relative py-2 px-1 rounded-md text-xs font-mono font-bold transition-all duration-300 overflow-hidden ${
                      dataset === d 
                        ? 'text-cyan-300 border border-cyan-400/50 bg-cyan-950/30 shadow-[0_0_15px_-3px_rgba(34,211,238,0.3)]' 
                        : 'text-slate-500 border border-slate-800 hover:border-cyan-800/50 hover:text-cyan-600'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Hidden Neurons Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-fuchsia-500" /> HIDDEN NEURONS
                </div>
                <span className="font-mono text-fuchsia-400 bg-fuchsia-950/30 px-2 py-0.5 rounded border border-fuchsia-900/50">
                  {hiddenNeurons}
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={hiddenNeurons}
                onChange={(e) => setHiddenNeurons(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                <span>1</span>
                <span>4</span>
                <span>8</span>
              </div>
            </div>

          </div>

          {/* COLUMN 2: Network Parameters */}
          <div className="p-6 space-y-8">
            
            {/* Activation Function */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-emerald-500" /> ACTIVATION
              </div>
              <div className="flex flex-col gap-2">
                {(['relu', 'sigmoid', 'tanh'] as const).map(act => (
                  <button
                    key={act}
                    onClick={() => setActivation(act)}
                    className={`flex items-center justify-between px-3 py-2 border rounded-md transition-all duration-300 ${
                      activation === act
                        ? 'border-emerald-500/50 text-emerald-300 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'border-slate-800 text-slate-500 hover:border-emerald-800/50 hover:text-emerald-600'
                    }`}
                  >
                    <span className="font-mono text-xs uppercase font-bold">{act}</span>
                    <div className={`w-2 h-2 rounded-full ${activation === act ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]' : 'bg-slate-800'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Rate Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-amber-500" /> LEARNING RATE
                </div>
                <span className="font-mono text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50">
                  {learningRate.toFixed(3)}
                </span>
              </div>
              <input 
                type="range" 
                min="0.001" 
                max="0.1" 
                step="0.001"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              />
            </div>

          </div>

          {/* COLUMN 3: Execution & Ablation */}
          <div className="p-6 space-y-8 bg-slate-900/20 relative">
            
            {/* Ablation Toggle */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-red-500" /> ABLATION
              </div>
              
              <button 
                onClick={() => setFreezeNeuron(!freezeNeuron)}
                className={`w-full group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-300 ${
                  freezeNeuron 
                    ? 'border-red-500/50 bg-red-950/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md transition-colors ${freezeNeuron ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-xs font-bold font-mono transition-colors ${freezeNeuron ? 'text-red-300' : 'text-slate-400'}`}>FREEZE NEURON #1</span>
                    <span className="text-[10px] text-slate-500">Zero out gradients & weights</span>
                  </div>
                </div>
                
                {/* Custom Toggle Switch */}
                <div className={`w-10 h-5 rounded-full p-1 transition-colors duration-300 ${freezeNeuron ? 'bg-red-500' : 'bg-slate-700'}`}>
                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${freezeNeuron ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            {/* Execution Controls */}
            <div className="pt-4 border-t border-cyan-900/30">
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 border ${
                    isPlaying 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" /> PAUSE
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> TRAIN
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                  title="Reset Network"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/50">
                  <span className="relative flex h-2 w-2">
                    {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {isPlaying ? 'BACKPROP IN PROGRESS...' : 'SYSTEM IDLE'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Decorative background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-fuchsia-600/5 blur-[100px] rounded-full pointer-events-none -z-10" />
    </div>
  );
}