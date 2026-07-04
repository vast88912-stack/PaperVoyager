import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, StepForward, RotateCcw, Network, Server, Settings, TerminalSquare, Zap, ShieldAlert, WifiOff } from 'lucide-react';

// Simulated external dependency list for completeness (Not actual imports)
// import { RaftNode, RaftMessage, RaftState } from './raft-core';

type LogEntry = {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
};

const INITIAL_SEED = '0xFA7E9B';

export default function App() {
  // --- State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [nodeCount, setNodeCount] = useState(5);
  const [latencyMs, setLatencyMs] = useState(150);
  const [packetLossPct, setPacketLossPct] = useState(5);
  const [seed, setSeed] = useState(INITIAL_SEED);
  const [term, setTerm] = useState(1);
  const [tick, setTick] = useState(0);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setSystemLogs(prev => {
      const newLogs = [...prev, {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString().substring(11, 23),
        message,
        type
      }].slice(-50); // Keep last 50
      return newLogs;
    });
  }, []);

  // --- Simulation Effects ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setTick(t => t + 1);
        if (Math.random() < 0.05) {
          setTerm(t => {
            const newTerm = t + 1;
            addLog(`Election timeout triggered. Term advanced to ${newTerm}`, 'warn');
            return newTerm;
          });
        }
      }, latencyMs * 2); // Speed relative to latency
    }
    return () => clearInterval(interval);
  }, [isPlaying, latencyMs, addLog]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  // --- Handlers ---
  const handleReset = () => {
    setIsPlaying(false);
    setTick(0);
    setTerm(1);
    setNodeCount(5);
    setLatencyMs(150);
    setPacketLossPct(5);
    setSeed(INITIAL_SEED);
    setSystemLogs([]);
    addLog('System reset. Cluster re-initialized.', 'success');
  };

  const handleStep = () => {
    setIsPlaying(false);
    setTick(t => t + 1);
    addLog(`Manual tick step executed. Tick: ${tick + 1}`, 'info');
  };

  const handleSeedChange = () => {
    const newSeed = '0x' + Math.floor(Math.random() * 16777215).toString(16).toUpperCase();
    setSeed(newSeed);
    addLog(`RNG Seed updated: ${newSeed}`, 'info');
  };

  // --- Render Helpers ---
  const renderAsciiBar = (val: number, min: number, max: number, length: number = 20) => {
    const ratio = (val - min) / (max - min);
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 md:p-8 flex flex-col selection:bg-[#33ff33] selection:text-black">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#33ff33]/30 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <TerminalSquare className="w-8 h-8 text-[#33ff33]" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-widest text-shadow-glow">
              RAFT_CONSENSUS_ANIMATOR
            </h1>
            <p className="text-xs text-[#33ff33]/60">v1.0.4 // CHATGPT_EDITION</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4 text-sm bg-[#111] px-4 py-2 border border-[#33ff33]/20">
          <div className="flex flex-col">
            <span className="text-[#33ff33]/50">CURRENT_TERM</span>
            <span className="text-xl font-bold">{term.toString().padStart(4, '0')}</span>
          </div>
          <div className="w-px h-8 bg-[#33ff33]/20 mx-2"></div>
          <div className="flex flex-col">
            <span className="text-[#33ff33]/50">TICK</span>
            <span className="text-xl font-bold">{tick.toString().padStart(5, '0')}</span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONTROLS & PARAMETERS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* TRANSPORT CONTROLS */}
          <section className="bg-[#0a0a0a] border border-[#33ff33]/40 p-5 shadow-[0_0_15px_rgba(51,255,51,0.05)]">
            <h2 className="text-[#33ff33] flex items-center gap-2 mb-4 border-b border-[#33ff33]/20 pb-2 text-sm">
              <Zap className="w-4 h-4" /> SIMULATION_TRANSPORT
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setIsPlaying(!isPlaying); addLog(isPlaying ? 'Simulation paused.' : 'Simulation resumed.', 'info'); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border transition-colors ${
                  isPlaying 
                    ? 'bg-[#33ff33]/20 border-[#33ff33] text-[#33ff33] shadow-[0_0_10px_rgba(51,255,51,0.2)]' 
                    : 'bg-transparent border-[#33ff33]/40 hover:bg-[#33ff33]/10 text-[#33ff33]'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button
                onClick={handleStep}
                disabled={isPlaying}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-[#33ff33]/40 hover:bg-[#33ff33]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <StepForward className="w-5 h-5" />
                STEP
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                RESET
              </button>
            </div>
          </section>

          {/* NETWORK & CLUSTER PARAMETERS */}
          <section className="bg-[#0a0a0a] border border-[#33ff33]/40 p-5 flex-1 shadow-[0_0_15px_rgba(51,255,51,0.05)]">
            <h2 className="text-[#33ff33] flex items-center gap-2 mb-6 border-b border-[#33ff33]/20 pb-2 text-sm">
              <Settings className="w-4 h-4" /> CLUSTER_PARAMETERS
            </h2>

            <div className="space-y-8">
              {/* NODE COUNT */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm flex items-center gap-2 text-[#33ff33]/80 group-hover:text-[#33ff33] transition-colors">
                    <Server className="w-4 h-4" /> NODE_COUNT
                  </label>
                  <span className="text-sm">({nodeCount}/7)</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="7"
                  step="1"
                  value={nodeCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setNodeCount(val);
                    addLog(`Cluster resized to ${val} nodes.`, 'warn');
                  }}
                  className="w-full appearance-none bg-[#33ff33]/20 h-1 outline-none slider-thumb-terminal"
                />
                <div className="mt-1 text-xs text-[#33ff33]/40 tracking-widest pointer-events-none">
                  {renderAsciiBar(nodeCount, 3, 7, 30)}
                </div>
              </div>

              {/* LATENCY */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm flex items-center gap-2 text-[#33ff33]/80 group-hover:text-[#33ff33] transition-colors">
                    <Network className="w-4 h-4" /> BASE_LATENCY
                  </label>
                  <span className="text-sm">{latencyMs}ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={latencyMs}
                  onChange={(e) => setLatencyMs(parseInt(e.target.value))}
                  className="w-full appearance-none bg-[#33ff33]/20 h-1 outline-none slider-thumb-terminal"
                />
                <div className="mt-1 text-xs text-[#33ff33]/40 tracking-widest pointer-events-none">
                  {renderAsciiBar(latencyMs, 10, 1000, 30)}
                </div>
              </div>

              {/* PACKET LOSS */}
              <div className="group">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm flex items-center gap-2 text-[#33ff33]/80 group-hover:text-[#33ff33] transition-colors">
                    <WifiOff className="w-4 h-4" /> PACKET_LOSS
                  </label>
                  <span className="text-sm">{packetLossPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={packetLossPct}
                  onChange={(e) => setPacketLossPct(parseInt(e.target.value))}
                  className="w-full appearance-none bg-[#33ff33]/20 h-1 outline-none slider-thumb-terminal"
                />
                <div className="mt-1 text-xs text-[#33ff33]/40 tracking-widest pointer-events-none">
                  {renderAsciiBar(packetLossPct, 0, 100, 30)}
                </div>
              </div>

              {/* RANDOM SEED */}
              <div className="pt-4 border-t border-[#33ff33]/20">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-[#33ff33]/80">ENV_SEED</label>
                  <button 
                    onClick={handleSeedChange}
                    className="text-xs px-2 py-1 border border-[#33ff33]/40 hover:bg-[#33ff33]/20 transition-colors"
                  >
                    RE-ROLL
                  </button>
                </div>
                <div className="bg-[#000] border border-[#33ff33]/20 p-2 text-center text-lg tracking-[0.2em] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(51,255,51,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                  {seed}
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: TERMINAL OUTPUT & MOCK VISUALIZER */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* MOCK VISUALIZER / STATUS (Placeholder for actual Raft visualization) */}
          <section className="bg-[#0a0a0a] border border-[#33ff33]/40 p-5 h-64 relative overflow-hidden flex flex-col items-center justify-center shadow-[0_0_15px_rgba(51,255,51,0.05)]">
            <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-[#33ff33]/50">
              <ShieldAlert className="w-4 h-4" /> CLUSTER_OVERVIEW_MOCK
            </div>
            
            {/* Visual representation of nodes */}
            <div className="flex items-center justify-center gap-4 md:gap-8 mt-4">
              {Array.from({ length: nodeCount }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold
                    ${i === 0 
                      ? 'border-[#33ff33] bg-[#33ff33]/20 text-[#33ff33] shadow-[0_0_15px_rgba(51,255,51,0.5)]' // Leader
                      : 'border-[#33ff33]/40 bg-black text-[#33ff33]/60'} // Follower
                  `}>
                    N{i+1}
                  </div>
                  <span className="text-[10px] text-[#33ff33]/60">{i === 0 ? 'LEADER' : 'FOLLOWER'}</span>
                </div>
              ))}
            </div>

            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
          </section>

          {/* SYSTEM EVENT LOG */}
          <section className="bg-[#0a0a0a] border border-[#33ff33]/40 flex-1 flex flex-col shadow-[0_0_15px_rgba(51,255,51,0.05)]">
            <div className="bg-[#33ff33]/10 border-b border-[#33ff33]/40 px-4 py-2 flex justify-between items-center">
              <span className="text-xs font-bold tracking-widest">STDOUT_LOG</span>
              <span className="text-xs text-[#33ff33]/60 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#33ff33] animate-pulse' : 'bg-red-500'}`}></span>
                {isPlaying ? 'LIVE' : 'IDLE'}
              </span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto max-h-[400px] text-xs space-y-1 font-mono">
              {systemLogs.length === 0 ? (
                <div className="text-[#33ff33]/30 italic mt-2">No events logged... Press Play to start simulation.</div>
              ) : (
                systemLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 hover:bg-[#33ff33]/5 px-1 py-0.5 transition-colors">
                    <span className="text-[#33ff33]/40 whitespace-nowrap">[{log.timestamp}]</span>
                    <span className={`
                      ${log.type === 'warn' ? 'text-amber-400' : ''}
                      ${log.type === 'error' ? 'text-red-400' : ''}
                      ${log.type === 'success' ? 'text-cyan-400' : ''}
                      ${log.type === 'info' ? 'text-[#33ff33]' : ''}
                    `}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>

        </div>
      </div>

      <style>{`
        /* Custom Terminal Slider Thumb Styling */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 10px;
          background: #33ff33;
          cursor: pointer;
          border-radius: 0;
          box-shadow: 0 0 8px rgba(51,255,51,0.6);
        }
        input[type=range]::-moz-range-thumb {
          height: 16px;
          width: 10px;
          background: #33ff33;
          cursor: pointer;
          border-radius: 0;
          border: none;
          box-shadow: 0 0 8px rgba(51,255,51,0.6);
        }
        .text-shadow-glow {
          text-shadow: 0 0 10px rgba(51, 255, 51, 0.4);
        }
      `}</style>
    </div>
  );
}