import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Activity, 
  Database, 
  Network, 
  Sliders, 
  Zap,
  PowerOff
} from 'lucide-react';

// --- Helper Components ---

const NeonSlider = ({ label, value, min, max, step, onChange, unit = '' }) => (
  <div className="flex flex-col space-y-2 w-full my-4">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider">{label}</label>
      <span className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
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
      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]"
    />
  </div>
);

const NeonSelect = ({ label, value, options, onChange, icon: Icon }) => (
  <div className="flex flex-col space-y-2 w-full my-4">
    <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2">
      {Icon && <Icon size={14} className="text-cyan-500" />}
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-900/50 border border-cyan-900 text-cyan-300 text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 appearance-none outline-none transition-all hover:border-cyan-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900 text-cyan-300">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-cyan-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
);

const DatasetSelector = ({ selected, onSelect }) => {
  const datasets = [
    { id: 'spiral', name: 'Spiral', icon: '🌀' },
    { id: 'xor', name: 'XOR', icon: '✖️' },
    { id: 'blobs', name: 'Blobs', icon: '🫧' }
  ];

  return (
    <div className="flex flex-col space-y-2 w-full my-4">
      <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2">
        <Database size={14} className="text-cyan-500" />
        Dataset
      </label>
      <div className="flex gap-2">
        {datasets.map((ds) => (
          <button
            key={ds.id}
            onClick={() => onSelect(ds.id)}
            className={`flex-1 py-2 px-1 rounded-md text-xs font-bold transition-all duration-300 flex flex-col items-center gap-1 border ${
              selected === ds.id
                ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-cyan-900 hover:text-cyan-700'
            }`}
          >
            <span className="text-lg">{ds.icon}</span>
            {ds.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  // State for Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [epoch, setEpoch] = useState(0);
  
  // Data Params
  const [dataset, setDataset] = useState('spiral');
  const [noise, setNoise] = useState(10);
  const [batchSize, setBatchSize] = useState(16);
  
  // Architecture Params
  const [hiddenNeurons, setHiddenNeurons] = useState(5);
  const [activation, setActivation] = useState('relu');
  const [frozenNeurons, setFrozenNeurons] = useState<number[]>([]);
  
  // Training Params
  const [learningRate, setLearningRate] = useState(0.03);
  const [regularization, setRegularization] = useState(0);

  // Simulate training epochs when playing
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setEpoch(prev => prev + 1);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const toggleNeuronAblation = (index: number) => {
    setFrozenNeurons(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleReset = () => {
    setIsPlaying(false);
    setEpoch(0);
    setFrozenNeurons([]);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 font-sans text-gray-200 selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* Main Control Panel Container */}
      <div className="w-full max-w-4xl bg-gray-950 border border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col">
        
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 opacity-70"></div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 flex justify-between items-center bg-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-800/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <Network className="text-cyan-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-wide">
                NEURAL_NET_VIEWER
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Control Module v1.0</p>
            </div>
          </div>

          {/* Global Playback Controls */}
          <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-xl border border-gray-800">
            <button 
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all"
              title="Reset Network"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={() => { setIsPlaying(false); setEpoch(e => e + 1); }}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-all"
              title="Step Forward"
            >
              <SkipForward size={16} />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                isPlaying 
                  ? 'bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-800/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]' 
                  : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-900/60'
              }`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              {isPlaying ? 'PAUSE' : 'TRAIN'}
            </button>
            
            {/* Epoch Counter */}
            <div className="ml-2 px-3 py-1 bg-black/50 rounded-lg border border-gray-800 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-[9px] text-gray-500 uppercase">Epoch</span>
              <span className="text-sm font-mono text-cyan-300">{epoch.toString().padStart(5, '0')}</span>
            </div>
          </div>
        </div>

        {/* Grid Layout for Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-800/50">
          
          {/* Column 1: Data & Features */}
          <div className="bg-gray-950 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-gray-800 pb-2">
              <Database size={16} />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Data Source</h2>
            </div>
            
            <DatasetSelector selected={dataset} onSelect={setDataset} />
            
            <div className="mt-4 space-y-2">
              <NeonSlider 
                label="Noise Level" 
                value={noise} min={0} max={50} step={1} 
                onChange={setNoise} unit="%" 
              />
              <NeonSlider 
                label="Batch Size" 
                value={batchSize} min={1} max={64} step={1} 
                onChange={setBatchSize} 
              />
            </div>
          </div>

          {/* Column 2: Architecture & Ablation */}
          <div className="bg-gray-950 p-6 flex flex-col relative">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-900/20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-gray-800 pb-2">
              <Network size={16} />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Architecture</h2>
            </div>

            <NeonSlider 
              label="Hidden Neurons" 
              value={hiddenNeurons} min={1} max={8} step={1} 
              onChange={(val) => {
                setHiddenNeurons(val);
                setFrozenNeurons(prev => prev.filter(i => i < val));
              }} 
            />

            <NeonSelect 
              label="Activation" 
              icon={Activity}
              value={activation} 
              onChange={setActivation}
              options={[
                { value: 'relu', label: 'ReLU' },
                { value: 'tanh', label: 'Tanh' },
                { value: 'sigmoid', label: 'Sigmoid' },
                { value: 'linear', label: 'Linear' }
              ]} 
            />

            {/* Ablation Controls */}
            <div className="mt-6 p-4 bg-gray-900/40 rounded-xl border border-gray-800/80">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-medium text-fuchsia-300 uppercase tracking-wider flex items-center gap-2">
                  <PowerOff size={12} />
                  Neuron Ablation
                </label>
                <span className="text-[10px] text-gray-500">Click to freeze</span>
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                {Array.from({ length: hiddenNeurons }).map((_, i) => {
                  const isFrozen = frozenNeurons.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleNeuronAblation(i)}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isFrozen 
                          ? 'bg-gray-900 border-2 border-fuchsia-900/50 text-fuchsia-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]' 
                          : 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-cyan-900 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                      }`}
                      title={isFrozen ? `Unfreeze Neuron ${i+1}` : `Freeze Neuron ${i+1}`}
                    >
                      <span className="text-xs font-mono font-bold">{i + 1}</span>
                      {isFrozen && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-full h-0.5 bg-fuchsia-600 rotate-45 shadow-[0_0_5px_rgba(217,70,239,0.8)]"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 3: Hyperparameters */}
          <div className="bg-gray-950 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-cyan-400 border-b border-gray-800 pb-2">
              <Sliders size={16} />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Hyperparameters</h2>
            </div>

            <div className="space-y-6 mt-2">
              <div className="flex flex-col space-y-2 w-full">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-cyan-100 uppercase tracking-wider flex items-center gap-2">
                    <Zap size={12} className="text-cyan-500" />
                    Learning Rate
                  </label>
                  <span className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                    {learningRate.toFixed(4)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="0"
                  step="0.1"
                  value={Math.log10(learningRate)}
                  onChange={(e) => setLearningRate(Math.pow(10, parseFloat(e.target.value)))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                />
                <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                  <span>0.0001</span>
                  <span>1.0</span>
                </div>
              </div>

              <NeonSelect 
                label="Regularization" 
                value={regularization.toString()} 
                onChange={(val) => setRegularization(parseFloat(val))}
                options={[
                  { value: '0', label: 'None' },
                  { value: '0.001', label: 'L1 (0.001)' },
                  { value: '0.003', label: 'L1 (0.003)' },
                  { value: '0.01', label: 'L2 (0.01)' },
                  { value: '0.03', label: 'L2 (0.03)' }
                ]} 
              />
            </div>
            
            {/* Status Readout (Decorative/Contextual) */}
            <div className="mt-auto pt-6">
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800/50 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-mono font-bold ${isPlaying ? 'text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]' : 'text-gray-400'}`}>
                    {isPlaying ? 'TRAINING...' : 'IDLE'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Active Nodes</span>
                  <span className="font-mono text-cyan-400">
                    {hiddenNeurons - frozenNeurons.length} / {hiddenNeurons}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}