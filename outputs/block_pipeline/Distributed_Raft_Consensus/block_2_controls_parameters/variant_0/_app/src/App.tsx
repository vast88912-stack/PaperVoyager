import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, RefreshCw, Terminal, Settings, Activity, WifiOff, Users, Hash } from 'lucide-react';

// Helper to generate a random hex seed
const generateRandomSeed = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();

// Helper to render a terminal-style progress bar
const ProgressBar = ({ value, min = 0, max, width = 20, onChange, label, unit = '' }) => {
  const filled = Math.max(0, Math.min(width, Math.round(((value - min) / (max - min)) * width)));
  const empty = width - filled;
  const barString = '█'.repeat(filled) + '-'.repeat(empty);

  return (
    <div className="flex flex-col mb-4 group">
      <div className="flex justify-between text-green-400/80 text-xs mb-1 uppercase tracking-wider">
        <span>{label}</span>
        <span>{value}{unit}</span>
      </div>
      <div className="relative flex items-center">
        <span className="text-green-500 mr-2 font-bold">[</span>
        <span className="text-green-500 tracking-[0.2em] cursor-pointer select-none">{barString}</span>
        <span className="text-green-500 ml-1 font-bold">]</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default function App() {
  // Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [tick, setTick] = useState(0);
  const [term, setTerm] = useState(1);
  
  // Parameters
  const [nodeCount, setNodeCount] = useState(5);
  const [latency, setLatency] = useState(150);
  const [packetLoss, setPacketLoss] = useState(5);
  const [seed, setSeed] = useState(generateRandomSeed());
  
  // Terminal Logs
  const [logs, setLogs] = useState<string[]>(['SYSTEM INIT... READY.']);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0, -1)}] ${msg}`].slice(-10));
  };

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulation Loop (Mock)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTick(t => {
          const newTick = t + 1;
          if (newTick % 50 === 0) setTerm(term => term + 1);
          return newTick;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handlers
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    addLog(isPlaying ? 'SIMULATION PAUSED.' : 'SIMULATION RESUMED.');
  };

  const handleStep = () => {
    if (isPlaying) setIsPlaying(false);
    setTick(t => t + 1);
    addLog('STEPPED FORWARD 1 TICK.');
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTick(0);
    setTerm(1);
    addLog('CLUSTER RESET TO INITIAL STATE.');
  };

  const handleNewSeed = () => {
    const newSeed = generateRandomSeed();
    setSeed(newSeed);
    addLog(`NEW RANDOM SEED GENERATED: 0x${newSeed}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-green-500 font-mono p-4 md:p-8 flex items-center justify-center selection:bg-green-900 selection:text-green-100">
      
      {/* Main Terminal Window */}
      <div className="w-full max-w-4xl border border-green-500/30 bg-[#0a0a0a] shadow-[0_0_30px_rgba(34,197,94,0.05)] rounded-sm overflow-hidden flex flex-col relative">
        
        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20"></div>

        {/* Header */}
        <div className="bg-green-950/40 border-b border-green-500/30 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Terminal size={18} className="text-green-400" />
            <h1 className="text-green-400 font-bold tracking-widest text-sm uppercase">
              Raft_Consensus_Animator <span className="animate-pulse">_</span>
            </h1>
          </div>
          <div className="text-xs text-green-600 flex space-x-4">
            <span>TERM: {term.toString().padStart(4, '0')}</span>
            <span>TICK: {tick.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          
          {/* Left Column: Controls */}
          <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-green-500/30 p-6 flex flex-col justify-between bg-[#080808]">
            
            <div>
              <h2 className="text-xs text-green-600 uppercase tracking-widest mb-6 flex items-center">
                <Settings size={14} className="mr-2" />
                Execution_Controls
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={togglePlay}
                  className={`flex flex-col items-center justify-center py-4 border transition-all duration-200 ${
                    isPlaying 
                      ? 'border-green-400 bg-green-900/20 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                      : 'border-green-800 hover:border-green-500 hover:bg-green-950/30 text-green-600 hover:text-green-400'
                  }`}
                >
                  {isPlaying ? <Pause size={24} className="mb-2" /> : <Play size={24} className="mb-2" />}
                  <span className="text-xs uppercase tracking-wider">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button 
                  onClick={handleStep}
                  className="flex flex-col items-center justify-center py-4 border border-green-800 hover:border-green-500 hover:bg-green-950/30 text-green-600 hover:text-green-400 transition-all duration-200"
                >
                  <SkipForward size={24} className="mb-2" />
                  <span className="text-xs uppercase tracking-wider">Step</span>
                </button>

                <button 
                  onClick={handleReset}
                  className="flex flex-col items-center justify-center py-4 border border-green-800 hover:border-red-500/50 hover:bg-red-950/20 text-green-600 hover:text-red-400 transition-all duration-200 col-span-2"
                >
                  <RotateCcw size={20} className="mb-2" />
                  <span className="text-xs uppercase tracking-wider">Reset Cluster</span>
                </button>
              </div>
            </div>

            {/* Seed Display */}
            <div className="border border-green-900/50 bg-green-950/10 p-4 relative group">
              <div className="absolute -top-2 left-2 bg-[#080808] px-1 text-[10px] text-green-700 uppercase">Entropy_Seed</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-green-400">
                  <Hash size={16} />
                  <span className="text-lg tracking-widest">0x{seed}</span>
                </div>
                <button 
                  onClick={handleNewSeed}
                  className="p-2 hover:bg-green-900/30 text-green-600 hover:text-green-300 transition-colors rounded-sm"
                  title="Regenerate Seed"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Parameters */}
          <div className="md:col-span-7 p-6 bg-[#0a0a0a]">
            <h2 className="text-xs text-green-600 uppercase tracking-widest mb-6 flex items-center">
              <Activity size={14} className="mr-2" />
              Network_Parameters
            </h2>

            <div className="space-y-8">
              {/* Node Count */}
              <div className="relative">
                <div className="absolute -left-6 top-1 text-green-800"><Users size={16} /></div>
                <ProgressBar 
                  label="Cluster Size (Nodes)" 
                  value={nodeCount} 
                  min={3} 
                  max={7} 
                  width={20}
                  onChange={(val) => {
                    setNodeCount(val);
                    addLog(`CLUSTER SIZE SET TO ${val} NODES.`);
                  }} 
                />
                <p className="text-[10px] text-green-700 mt-1">Max 7 nodes supported for visualization clarity.</p>
              </div>

              {/* Base Latency */}
              <div className="relative">
                <div className="absolute -left-6 top-1 text-green-800"><Activity size={16} /></div>
                <ProgressBar 
                  label="Base Network Latency" 
                  value={latency} 
                  min={10} 
                  max={1000} 
                  width={20}
                  unit="ms"
                  onChange={(val) => {
                    setLatency(val);
                    addLog(`BASE LATENCY ADJUSTED TO ${val}ms.`);
                  }} 
                />
                <p className="text-[10px] text-green-700 mt-1">Affects RPC delivery times and election timeouts.</p>
              </div>

              {/* Packet Loss */}
              <div className="relative">
                <div className="absolute -left-6 top-1 text-green-800"><WifiOff size={16} /></div>
                <ProgressBar 
                  label="Packet Loss Probability" 
                  value={packetLoss} 
                  min={0} 
                  max={50} 
                  width={20}
                  unit="%"
                  onChange={(val) => {
                    setPacketLoss(val);
                    addLog(`PACKET LOSS PROBABILITY SET TO ${val}%.`);
                  }} 
                />
                <p className="text-[10px] text-green-700 mt-1">Simulates unreliable network links.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Terminal Log */}
        <div className="h-32 border-t border-green-500/30 bg-[#050505] p-3 overflow-y-auto font-mono text-[11px] leading-relaxed">
          {logs.map((log, i) => (
            <div key={i} className="text-green-600/80 hover:text-green-400 transition-colors">
              <span className="text-green-800 mr-2">{'>'}</span>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

      </div>
    </div>
  );
}