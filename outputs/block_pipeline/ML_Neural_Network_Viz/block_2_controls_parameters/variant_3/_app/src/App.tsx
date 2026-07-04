import React, { useState } from 'react';
import { 
  Play, Pause, RotateCcw, Settings2, Activity, Layers, 
  Network, Database, Zap, Sparkles, Snowflake, Cpu
} from 'lucide-react';

export default function App() {
  // Application State
  const [dataset, setDataset] = useState<'spiral' | 'xor' | 'blobs'>('spiral');
  const [activation, setActivation] = useState<'relu' | 'sigmoid' | 'tanh'>('relu');
  const [learningRate, setLearningRate] = useState(0.03);
  const [batchSize, setBatchSize] = useState(16);
  const [epochs, setEpochs] = useState(0);
  const [noise, setNoise] = useState(0.1);
  const [hiddenNeurons, setHiddenNeurons] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frozenNeurons, setFrozenNeurons] = useState<number[]>([]);

  // Handlers
  const togglePlay = () => setIsPlaying(!isPlaying);
  const reset = () => { setIsPlaying(false); setEpochs(0); };
  const toggleFrozen = (idx: number) => {
    setFrozenNeurons(prev => 
      prev.includes(idx) ? prev.filter(n => n !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-300 p-6 font-sans selection:bg-cyan-900/50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/30">
              <Network className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                NEURAL_CTRL <span className="text-xs font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded">v4.0.1</span>
              </h1>
              <p className="text-xs text-slate-500 font-mono">Parameters & Backprop Configuration</p>
            </div>
          </div>

          {/* Master Controls */}
          <div className="flex items-center space-x-4 bg-white/5 p-1.5 rounded-xl border border-white/5">
            <div className="px-4 font-mono text-sm text-cyan-300">
              EPOCH: {epochs.toString().padStart(5, '0')}
            </div>
            <div className="h-6 w-px bg-white/10" />
            <button 
              onClick={togglePlay}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                isPlaying 
                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50 hover:bg-fuchsia-500/30 shadow-[0_0_15px_-3px_rgba(217,70,239,0.3)]' 
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 shadow-[0_0_15px_-3px_rgba(34,211,238,0.3)]'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'TRAIN'}</span>
            </button>
            <button 
              onClick={reset}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Column 1: Data & Features */}
          <div className="md:col-span-4 space-y-6">
            <ControlSection icon={<Database />} title="DATASET TOPOLOGY">
              <div className="grid grid-cols-3 gap-3">
                <DatasetBtn 
                  active={dataset === 'spiral'} 
                  onClick={() => setDataset('spiral')}
                  label="Spiral" 
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z" />
                </DatasetBtn>
                <DatasetBtn 
                  active={dataset === 'xor'} 
                  onClick={() => setDataset('xor')}
                  label="XOR" 
                >
                  <rect x="4" y="4" w="6" h="6" fill="currentColor" />
                  <rect x="14" y="14" w="6" h="6" fill="currentColor" />
                  <rect x="14" y="4" w="6" h="6" fill="none" stroke="currentColor" />
                  <rect x="4" y="14" w="6" h="6" fill="none" stroke="currentColor" />
                </DatasetBtn>
                <DatasetBtn 
                  active={dataset === 'blobs'} 
                  onClick={() => setDataset('blobs')}
                  label="Blobs" 
                >
                  <circle cx="8" cy="8" r="3" fill="currentColor" />
                  <circle cx="16" cy="16" r="4" fill="currentColor" />
                </DatasetBtn>
              </div>

              <div className="mt-6 space-y-4">
                <SliderControl 
                  label="Noise Variance" 
                  value={noise} 
                  min={0} max={0.5} step={0.01} 
                  onChange={setNoise} 
                />
                <SliderControl 
                  label="Batch Size" 
                  value={batchSize} 
                  min={1} max={64} step={1} 
                  onChange={setBatchSize} 
                />
              </div>
            </ControlSection>

            <ControlSection icon={<Activity />} title="ACTIVATION">
              <div className="flex flex-col space-y-2">
                {['relu', 'sigmoid', 'tanh'].map((act) => (
                  <button
                    key={act}
                    onClick={() => setActivation(act as any)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      activation === act 
                        ? 'bg-fuchsia-950/30 border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_10px_-2px_rgba(217,70,239,0.3)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <span className="font-mono text-sm uppercase">{act}</span>
                    <Sparkles className={`w-4 h-4 ${activation === act ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                ))}
              </div>
            </ControlSection>
          </div>

          {/* Column 2: Architecture & Ablation */}
          <div className="md:col-span-4 space-y-6">
            <ControlSection icon={<Layers />} title="ARCHITECTURE">
              <div className="bg-[#050508] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center space-y-6">
                
                <div className="text-center w-full">
                  <div className="text-xs text-slate-500 font-mono mb-2 uppercase">Hidden Neurons</div>
                  <div className="flex items-center justify-center space-x-4">
                    <button 
                      onClick={() => setHiddenNeurons(Math.max(1, hiddenNeurons - 1))}
                      className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xl text-cyan-500"
                    >-</button>
                    <div className="text-3xl font-mono text-white w-12 text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                      {hiddenNeurons}
                    </div>
                    <button 
                      onClick={() => setHiddenNeurons(Math.min(10, hiddenNeurons + 1))}
                      className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xl text-cyan-500"
                    >+</button>
                  </div>
                </div>

                {/* Node visualization / Ablation Toggles */}
                <div className="w-full">
                  <div className="text-xs text-slate-500 font-mono mb-3 uppercase text-center flex items-center justify-center gap-2">
                    <Cpu className="w-3 h-3" /> Ablation Control
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {Array.from({ length: hiddenNeurons }).map((_, idx) => {
                      const isFrozen = frozenNeurons.includes(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleFrozen(idx)}
                          title={`Toggle Neuron ${idx + 1}`}
                          className={`group relative flex flex-col items-center justify-center w-12 h-14 rounded-lg border transition-all duration-300 ${
                            isFrozen 
                              ? 'bg-slate-900 border-slate-700 opacity-50' 
                              : 'bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_10px_-2px_rgba(34,211,238,0.2)]'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full mb-1 transition-all ${
                            isFrozen ? 'bg-slate-600' : 'bg-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,1)] group-hover:bg-cyan-300'
                          }`} />
                          <span className="text-[10px] font-mono text-slate-400">{isFrozen ? 'FRZ' : `N${idx+1}`}</span>
                          {isFrozen && <Snowflake className="absolute inset-0 m-auto w-5 h-5 text-blue-300/30" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
              </div>
            </ControlSection>
          </div>

          {/* Column 3: Hyperparameters & Training Setup */}
          <div className="md:col-span-4 space-y-6">
            <ControlSection icon={<Settings2 />} title="HYPERPARAMETERS">
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-fuchsia-500" /> Learning Rate
                    </label>
                    <span className="text-sm font-mono text-fuchsia-400">{learningRate.toFixed(4)}</span>
                  </div>
                  <div className="relative pt-1">
                    {/* Custom Range Track */}
                    <input 
                      type="range" 
                      min="-4" 
                      max="-0.3" 
                      step="0.1"
                      value={Math.log10(learningRate)}
                      onChange={(e) => setLearningRate(Math.pow(10, parseFloat(e.target.value)))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 hover:accent-fuchsia-400 outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                      <span>1e-4</span>
                      <span>1e-2</span>
                      <span>0.5</span>
                    </div>
                  </div>
                </div>

                {/* Additional gradient flow toggles */}
                <div className="bg-white/5 rounded-lg border border-white/5 p-4 space-y-3">
                  <div className="text-xs text-slate-500 font-mono uppercase border-b border-white/5 pb-2">Visualization</div>
                  <ToggleRow label="Show Forward Pass Glow" defaultOn />
                  <ToggleRow label="Animate Gradient Flow" defaultOn />
                  <ToggleRow label="Show Weight Values" defaultOn={false} />
                  <ToggleRow label="Discretize Output Map" defaultOn={false} />
                </div>

              </div>

            </ControlSection>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// Subcomponents

function ControlSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
      <div className="flex items-center space-x-2 mb-5 text-slate-300">
        <div className="p-1.5 bg-white/5 rounded-md text-cyan-500">
          {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        </div>
        <h2 className="text-sm font-bold tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DatasetBtn({ active, onClick, label, children }: { active: boolean, onClick: () => void, label: string, children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
        active 
          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_-3px_rgba(34,211,238,0.2)]' 
          : 'bg-[#050508] border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'
      }`}
    >
      <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        {children}
      </svg>
      <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
    </button>
  );
}

function SliderControl({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <label className="text-xs font-mono text-slate-400">{label}</label>
        <span className="text-sm font-mono text-cyan-400">{value}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 outline-none"
      />
    </div>
  );
}

function ToggleRow({ label, defaultOn }: { label: string, defaultOn: boolean }) {
  const [isOn, setIsOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOn(!isOn)}>
      <span className="text-sm text-slate-400 font-sans">{label}</span>
      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${isOn ? 'bg-cyan-500' : 'bg-slate-700'}`}>
        <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isOn ? 'translate-x-4 shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}