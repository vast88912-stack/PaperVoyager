import React, { useState, useEffect, useRef } from 'react';

// --- Helper Components for UI ---

const NeonBox = ({ children, title, color = 'cyan' }: { children: React.ReactNode, title: string, color?: 'cyan' | 'fuchsia' | 'emerald' }) => {
  const colorMap = {
    cyan: 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    fuchsia: 'border-fuchsia-500/50 shadow-[0_0_15px_rgba(232,121,249,0.15)]',
    emerald: 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  };
  
  const textMap = {
    cyan: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]',
    fuchsia: 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]',
    emerald: 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]',
  };

  return (
    <div className={`relative p-5 rounded-xl border bg-gray-900/80 backdrop-blur-md ${colorMap[color]} transition-all duration-300`}>
      <h3 className={`absolute -top-3 left-4 bg-gray-950 px-2 text-xs font-bold tracking-wider uppercase ${textMap[color]}`}>
        {title}
      </h3>
      {children}
    </div>
  );
};

const Slider = ({ label, value, min, max, step, onChange, format = (v: number) => v.toString() }: any) => (
  <div className="flex flex-col space-y-2 w-full my-3">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      <span className="text-xs font-mono text-cyan-300 bg-cyan-950/50 px-2 py-1 rounded border border-cyan-800/50">
        {format(value)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
    />
  </div>
);

const RadioGroup = ({ options, selected, onChange, color = 'cyan' }: any) => {
  const activeColor = color === 'cyan' 
    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
    : 'bg-fuchsia-950/80 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_10px_rgba(232,121,249,0.3)]';
    
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((opt: string) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border transition-all duration-200 ${
            selected === opt 
              ? activeColor 
              : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  // State
  const [dataset, setDataset] = useState('spiral');
  const [neurons, setNeurons] = useState(4);
  const [activation, setActivation] = useState('relu');
  const [learningRate, setLearningRate] = useState(0.01);
  const [batchSize, setBatchSize] = useState(16);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState(0.984);
  const [frozenNeurons, setFrozenNeurons] = useState<Record<number, boolean>>({});
  const [logs, setLogs] = useState<string[]>(['System initialized.', 'Awaiting forward pass...']);

  // Refs for auto-scrolling logs
  const logEndRef = useRef<HTMLDivElement>(null);

  // Simulation Effect
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setEpoch(e => e + 1);
        setLoss(l => Math.max(0.01, l * 0.995 + (Math.random() * 0.01 - 0.005)));
        if (Math.random() > 0.8) {
          addLog(`Epoch ${epoch}: Loss = ${loss.toFixed(4)}`);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, epoch, loss]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-19), msg]);
  };

  const toggleFreeze = (index: number) => {
    setFrozenNeurons(prev => {
      const next = { ...prev, [index]: !prev[index] };
      addLog(`Neuron ${index + 1} ${next[index] ? 'ablated (frozen)' : 'reactivated'}.`);
      return next;
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    setEpoch(0);
    setLoss(0.984);
    setFrozenNeurons({});
    addLog('Model reset to random weights.');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-6 flex justify-center items-start selection:bg-cyan-900 selection:text-cyan-100">
      
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Header */}
        <div className="md:col-span-12 flex items-center justify-between border-b border-gray-800 pb-4 mb-2">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              NEURAL_NET VISUALIZER
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Interactive ML Educator // Controls Module</p>
          </div>
          
          <div className="flex items-center space-x-4 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 shadow-inner">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Epoch</div>
              <div className="text-lg font-mono text-cyan-400">{epoch.toString().padStart(5, '0')}</div>
            </div>
            <div className="w-px h-8 bg-gray-800"></div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Loss</div>
              <div className="text-lg font-mono text-fuchsia-400">{loss.toFixed(4)}</div>
            </div>
          </div>
        </div>

        {/* Left Column: Data & Arch */}
        <div className="md:col-span-5 space-y-6">
          
          <NeonBox title="Dataset" color="cyan">
            <RadioGroup 
              options={['spiral', 'xor', 'blobs']} 
              selected={dataset} 
              onChange={(v: string) => { setDataset(v); addLog(`Dataset changed to ${v.toUpperCase()}`); }} 
            />
            <div className="mt-4 h-24 w-full bg-gray-950 rounded border border-gray-800 flex items-center justify-center relative overflow-hidden">
              {/* Mock Dataset Preview */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent"></div>
              <span className="text-gray-600 text-xs font-mono italic">[{dataset} preview canvas]</span>
            </div>
          </NeonBox>

          <NeonBox title="Architecture" color="fuchsia">
            <Slider 
              label="Hidden Layer Neurons" 
              value={neurons} min={1} max={10} step={1} 
              onChange={(v: number) => {
                setNeurons(v);
                setFrozenNeurons({});
                addLog(`Architecture updated: 2 → ${v} → 1`);
              }} 
            />
            
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Activation Function</label>
              <RadioGroup 
                options={['relu', 'sigmoid', 'tanh']} 
                selected={activation} 
                onChange={(v: string) => { setActivation(v); addLog(`Activation set to ${v.toUpperCase()}`); }}
                color="fuchsia"
              />
            </div>
          </NeonBox>

        </div>

        {/* Right Column: Hyperparams, Execution, Ablation */}
        <div className="md:col-span-7 space-y-6">
          
          <div className="grid grid-cols-2 gap-6">
            <NeonBox title="Hyperparameters" color="emerald">
              <Slider 
                label="Learning Rate" 
                value={learningRate} min={0.001} max={0.1} step={0.001} 
                format={(v: number) => v.toFixed(3)}
                onChange={setLearningRate} 
              />
              <Slider 
                label="Batch Size" 
                value={batchSize} min={1} max={64} step={1} 
                onChange={setBatchSize} 
              />
            </NeonBox>

            <NeonBox title="Execution" color="cyan">
              <div className="flex flex-col h-full justify-center space-y-3">
                <button 
                  onClick={() => { setIsPlaying(!isPlaying); addLog(isPlaying ? 'Training paused.' : 'Training started.'); }}
                  className={`w-full py-3 rounded-lg font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isPlaying 
                      ? 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(232,121,249,0.4)] hover:bg-fuchsia-900/80' 
                      : 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-900/80'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                      <span>Train</span>
                    </>
                  )}
                </button>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => { if(!isPlaying) { setEpoch(e => e + 1); addLog('Step forward.'); } }}
                    disabled={isPlaying}
                    className="flex-1 py-2 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase font-bold"
                  >
                    Step &rarr;
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex-1 py-2 bg-gray-900 text-red-400 rounded border border-red-900/50 hover:bg-red-950/50 text-xs uppercase font-bold transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </NeonBox>
          </div>

          <NeonBox title="Ablation / Inspect" color="fuchsia">
            <p className="text-xs text-gray-400 mb-3">Click a neuron to freeze its weights and zero its output. Simulates dropout/lesioning.</p>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: neurons }).map((_, i) => {
                const isFrozen = frozenNeurons[i];
                return (
                  <button
                    key={i}
                    onClick={() => toggleFreeze(i)}
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 group ${
                      isFrozen 
                        ? 'bg-gray-900 border-red-900/50 text-red-500/50 shadow-none' 
                        : 'bg-gray-800 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_15px_rgba(232,121,249,0.4)] hover:shadow-[0_0_25px_rgba(232,121,249,0.6)] hover:bg-fuchsia-900/30'
                    }`}
                  >
                    <span className="font-mono text-sm font-bold z-10">N{i+1}</span>
                    {/* Glow effect */}
                    {!isFrozen && (
                      <div className="absolute inset-0 rounded-full bg-fuchsia-500/20 animate-pulse"></div>
                    )}
                    {/* Cross out for frozen */}
                    {isFrozen && (
                      <svg className="absolute inset-0 w-full h-full text-red-900/50 p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </NeonBox>

          {/* Activity Log */}
          <div className="bg-black/50 border border-gray-800 rounded-xl p-4 h-40 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
            <h4 className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-bold">System Log</h4>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400 flex">
                  <span className="text-gray-600 mr-2">[{new Date().toISOString().split('T')[1].slice(0,-1)}]</span>
                  <span className={log.includes('Loss') ? 'text-cyan-300' : log.includes('ablated') ? 'text-red-400' : ''}>
                    {log}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

        </div>
      </div>

      {/* Inline styles for custom scrollbar to keep it self-contained */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}