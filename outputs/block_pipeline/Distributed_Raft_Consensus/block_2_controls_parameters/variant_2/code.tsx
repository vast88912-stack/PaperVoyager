import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, StepForward, RefreshCw, Hash, Zap, WifiOff, Server, Terminal, Activity } from 'lucide-react';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [nodeCount, setNodeCount] = useState(5);
  const [latency, setLatency] = useState(150);
  const [packetLoss, setPacketLoss] = useState(5);
  const [seed, setSeed] = useState(() => generateSeed());
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Raft Consensus Animator Initialized.']);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  function generateSeed() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0, 11)}] ${msg}`].slice(-10));
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    addLog(isPlaying ? 'Simulation paused.' : 'Simulation playing...');
  };

  const handleStep = () => {
    if (isPlaying) setIsPlaying(false);
    setTick(t => t + 1);
    addLog('Manual step executed. Tick advanced.');
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTick(0);
    setSeed(generateSeed());
    setLogs(['[SYSTEM] Cluster reset. New seed generated.']);
  };

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 md:p-8 flex items-center justify-center selection:bg-[#33ff33] selection:text-black">
      <div className="w-full max-w-4xl border border-[#1a4d1a] bg-black shadow-[0_0_30px_rgba(51,255,51,0.05)] rounded-sm overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0a1f0a] border-b border-[#1a4d1a] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal size={20} className="text-[#33ff33]" />
            <h1 className="text-xl tracking-widest font-bold uppercase">Raft_Control_Panel</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 border border-[#1a4d1a] px-3 py-1 bg-black">
              <Hash size={14} className="text-[#1a4d1a]" />
              <span className="text-[#88ff88]">SEED: {seed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase text-xs text-[#1a4d1a]">Status</span>
              <span className={`px-2 py-0.5 text-xs font-bold ${isPlaying ? 'bg-[#33ff33] text-black animate-pulse' : 'bg-[#1a4d1a] text-[#88ff88]'}`}>
                {isPlaying ? 'RUNNING' : 'HALTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Control Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Column: Execution Controls */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="border border-[#1a4d1a] p-5 relative group hover:border-[#33ff33] transition-colors">
              <div className="absolute -top-3 left-4 bg-black px-2 text-xs text-[#88ff88] uppercase tracking-wider flex items-center gap-2">
                <Activity size={12} /> Execution Engine
              </div>
              
              <div className="flex items-center justify-between mb-6 mt-2">
                <div className="text-4xl font-light tracking-tighter text-[#88ff88]">
                  {tick.toString().padStart(5, '0')}
                  <span className="text-xs text-[#1a4d1a] ml-2 tracking-normal">TICKS</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={handlePlayPause}
                  className={`flex flex-col items-center justify-center gap-2 py-4 border transition-all ${
                    isPlaying 
                      ? 'border-[#33ff33] bg-[#0a1f0a] text-[#33ff33] shadow-[0_0_15px_rgba(51,255,51,0.2)]' 
                      : 'border-[#1a4d1a] hover:border-[#33ff33] hover:bg-[#0a1f0a]'
                  }`}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  <span className="text-xs uppercase tracking-widest">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                
                <button 
                  onClick={handleStep}
                  className="flex flex-col items-center justify-center gap-2 py-4 border border-[#1a4d1a] hover:border-[#33ff33] hover:bg-[#0a1f0a] transition-all active:scale-95"
                >
                  <StepForward size={24} />
                  <span className="text-xs uppercase tracking-widest">Step</span>
                </button>
                
                <button 
                  onClick={handleReset}
                  className="flex flex-col items-center justify-center gap-2 py-4 border border-[#1a4d1a] hover:border-red-500 hover:text-red-500 hover:bg-red-950/30 transition-all active:scale-95"
                >
                  <RefreshCw size={24} />
                  <span className="text-xs uppercase tracking-widest">Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Parameters */}
          <div className="md:col-span-7 flex flex-col gap-6">
            <div className="border border-[#1a4d1a] p-5 relative hover:border-[#33ff33] transition-colors">
              <div className="absolute -top-3 left-4 bg-black px-2 text-xs text-[#88ff88] uppercase tracking-wider flex items-center gap-2">
                <Server size={12} /> Cluster Topology
              </div>
              
              <div className="mt-2 flex flex-col gap-5">
                {/* Node Count Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-sm uppercase tracking-wider text-[#88ff88]">Active Nodes</label>
                    <span className="text-xl font-bold">{nodeCount}</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="7" 
                    step="2"
                    value={nodeCount}
                    onChange={(e) => {
                      setNodeCount(parseInt(e.target.value));
                      addLog(`Node count adjusted to ${e.target.value}.`);
                    }}
                    className="w-full h-1 bg-[#1a4d1a] appearance-none cursor-pointer accent-[#33ff33]"
                  />
                  <div className="flex justify-between text-[10px] text-[#1a4d1a]">
                    <span>3 (Min Quorum)</span>
                    <span>5 (Default)</span>
                    <span>7 (Max)</span>
                  </div>
                </div>

                {/* Network Parameters */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#1a4d1a]/50">
                  {/* Latency */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <label className="text-xs uppercase tracking-wider text-[#88ff88] flex items-center gap-1">
                        <Zap size={12} /> Base Latency
                      </label>
                      <span className="text-sm">{latency}ms</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="1000" 
                      step="10"
                      value={latency}
                      onChange={(e) => setLatency(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#1a4d1a] appearance-none cursor-pointer accent-[#33ff33]"
                    />
                  </div>

                  {/* Packet Loss */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <label className="text-xs uppercase tracking-wider text-[#88ff88] flex items-center gap-1">
                        <WifiOff size={12} /> Packet Loss
                      </label>
                      <span className="text-sm">{packetLoss}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="1"
                      value={packetLoss}
                      onChange={(e) => setPacketLoss(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#1a4d1a] appearance-none cursor-pointer accent-[#33ff33]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Console Log Area */}
        <div className="border-t border-[#1a4d1a] bg-[#030a03] p-4 h-40 overflow-hidden flex flex-col">
          <div className="text-[10px] text-[#1a4d1a] uppercase tracking-widest mb-2 flex justify-between">
            <span>System Output</span>
            <span>{logs.length} Lines</span>
          </div>
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto font-mono text-sm flex flex-col gap-1 pr-2 scrollbar-thin scrollbar-thumb-[#1a4d1a] scrollbar-track-transparent"
          >
            {logs.map((log, i) => (
              <div key={i} className="opacity-80 hover:opacity-100 hover:bg-[#0a1f0a] px-1 transition-colors">
                <span className="text-[#1a4d1a] mr-2">&gt;</span>
                {log}
              </div>
            ))}
            {/* Blinking Cursor */}
            <div className="animate-pulse text-[#33ff33] ml-1 mt-1">_</div>
          </div>
        </div>

      </div>
    </div>
  );
}