import React, { useState, useEffect, useRef } from 'react';

// --- SVG Icons ---
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const StepIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const ResetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const DiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
    <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const TerminalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

// --- Main Component ---
export default function App() {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [tick, setTick] = useState(0);
  const [term, setTerm] = useState(1);
  const [nodeCount, setNodeCount] = useState(5);
  const [latency, setLatency] = useState(150);
  const [packetLoss, setPacketLoss] = useState(5);
  const [seed, setSeed] = useState(generateSeed());
  const [activeView, setActiveView] = useState('overview');
  const [logs, setLogs] = useState<string[]>(['SYSTEM INITIALIZED', 'AWAITING COMMANDS...']);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Helpers
  function generateSeed() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-49), `[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${msg}`]);
  };

  // Handlers
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    addLog(isPlaying ? 'SIMULATION PAUSED' : 'SIMULATION RESUMED');
  };

  const handleStep = () => {
    setIsPlaying(false);
    setTick((t) => t + 1);
    addLog('MANUAL STEP EXECUTED');
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTick(0);
    setTerm(1);
    addLog('CLUSTER RESET TO INITIAL STATE');
  };

  const handleRegenerateSeed = () => {
    const newSeed = generateSeed();
    setSeed(newSeed);
    addLog(`NEW SEED GENERATED: ${newSeed}`);
  };

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTick((t) => t + 1);
        // Mock term increment for visual effect occasionally
        if (Math.random() < 0.05) {
          setTerm((t) => t + 1);
        }
      }, latency);
    }
    return () => clearInterval(interval);
  }, [isPlaying, latency]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const views = [
    { id: 'overview', label: 'Cluster Overview' },
    { id: 'election', label: 'Election Sim' },
    { id: 'replication', label: 'Log Replication' },
    { id: 'partition', label: 'Partition Sandbox' },
    { id: 'safety', label: 'Safety Checklist' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#33ff33] font-mono p-4 md:p-8 flex flex-col items-center justify-center selection:bg-[#33ff33] selection:text-black">
      
      {/* Main Control Panel Container */}
      <div className="w-full max-w-5xl border border-[#33ff33]/30 shadow-[0_0_20px_rgba(51,255,51,0.1)] bg-[#0a0a0a] rounded-sm overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="bg-[#111] border-b border-[#33ff33]/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TerminalIcon />
            <h1 className="text-xl font-bold tracking-widest uppercase text-[#33ff33] drop-shadow-[0_0_5px_rgba(51,255,51,0.8)]">
              Raft_OS // Control_Panel
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs tracking-widest opacity-70">
            <span>STATUS: {isPlaying ? 'RUNNING' : 'STANDBY'}</span>
            <span className="w-2 h-2 rounded-full bg-[#33ff33] animate-pulse" style={{ opacity: isPlaying ? 1 : 0.2 }}></span>
          </div>
        </header>

        <div className="flex flex-col md:flex-row flex-1">
          
          {/* Left Sidebar - Views */}
          <aside className="md:w-64 border-r border-[#33ff33]/30 p-4 flex flex-col gap-2 bg-[#0c0c0c]">
            <div className="text-xs uppercase tracking-widest text-[#33ff33]/50 mb-2">Display Mode</div>
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setActiveView(v.id);
                  addLog(`SWITCHED VIEW TO: ${v.label.toUpperCase()}`);
                }}
                className={`text-left px-3 py-2 text-sm uppercase tracking-wide transition-all duration-200 border-l-2 ${
                  activeView === v.id
                    ? 'border-[#33ff33] bg-[#33ff33]/10 text-[#33ff33] shadow-[inset_0_0_10px_rgba(51,255,51,0.1)]'
                    : 'border-transparent text-[#33ff33]/60 hover:bg-[#33ff33]/5 hover:text-[#33ff33]'
                }`}
              >
                &gt; {v.label}
              </button>
            ))}
          </aside>

          {/* Main Controls Area */}
          <main className="flex-1 p-6 flex flex-col gap-8">
            
            {/* Top Row: Playback & Core Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Playback Controls */}
              <div className="border border-[#33ff33]/30 p-4 relative group">
                <div className="absolute -top-2.5 left-4 bg-[#0a0a0a] px-2 text-xs uppercase tracking-widest text-[#33ff33]/70">
                  Execution
                </div>
                <div className="flex items-center justify-center gap-4 py-2">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 flex items-center justify-center border border-[#33ff33] rounded hover:bg-[#33ff33] hover:text-black transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button
                    onClick={handleStep}
                    disabled={isPlaying}
                    className="w-12 h-12 flex items-center justify-center border border-[#33ff33] rounded hover:bg-[#33ff33] hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#33ff33]"
                    title="Step Forward"
                  >
                    <StepIcon />
                  </button>
                  <div className="w-px h-8 bg-[#33ff33]/30 mx-2"></div>
                  <button
                    onClick={handleReset}
                    className="w-12 h-12 flex items-center justify-center border border-red-500/50 text-red-500 rounded hover:bg-red-500 hover:text-black transition-colors"
                    title="Reset Cluster"
                  >
                    <ResetIcon />
                  </button>
                </div>
              </div>

              {/* System State */}
              <div className="border border-[#33ff33]/30 p-4 relative flex flex-col justify-center gap-2">
                <div className="absolute -top-2.5 left-4 bg-[#0a0a0a] px-2 text-xs uppercase tracking-widest text-[#33ff33]/70">
                  System State
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-[#33ff33]/50 text-xs">GLOBAL TICK</span>
                    <span className="text-2xl font-bold">{tick.toString().padStart(5, '0')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#33ff33]/50 text-xs">CURRENT TERM</span>
                    <span className="text-2xl font-bold text-amber-400">T-{term}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="border border-[#33ff33]/30 p-6 relative">
              <div className="absolute -top-2.5 left-4 bg-[#0a0a0a] px-2 text-xs uppercase tracking-widest text-[#33ff33]/70">
                Network & Cluster Parameters
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Node Count Slider */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="text-xs uppercase tracking-widest text-[#33ff33]/80">Cluster Size</label>
                    <span className="text-lg">{nodeCount} Nodes</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="7"
                    step="2"
                    value={nodeCount}
                    onChange={(e) => {
                      setNodeCount(parseInt(e.target.value));
                      addLog(`CLUSTER SIZE SET TO ${e.target.value}`);
                    }}
                    className="w-full h-1 bg-[#33ff33]/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#33ff33] [&::-webkit-slider-thumb]:rounded-sm"
                  />
                  <div className="flex justify-between text-[10px] text-[#33ff33]/40">
                    <span>3 (Min)</span>
                    <span>5</span>
                    <span>7 (Max)</span>
                  </div>
                </div>

                {/* Latency Slider */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="text-xs uppercase tracking-widest text-[#33ff33]/80">Base Latency</label>
                    <span className="text-lg">{latency}ms</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={latency}
                    onChange={(e) => {
                      setLatency(parseInt(e.target.value));
                      addLog(`LATENCY ADJUSTED TO ${e.target.value}ms`);
                    }}
                    className="w-full h-1 bg-[#33ff33]/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#33ff33] [&::-webkit-slider-thumb]:rounded-sm"
                  />
                  <div className="flex justify-between text-[10px] text-[#33ff33]/40">
                    <span>Fast</span>
                    <span>Slow</span>
                  </div>
                </div>

                {/* Packet Loss Slider */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <label className="text-xs uppercase tracking-widest text-[#33ff33]/80">Packet Loss</label>
                    <span className={`text-lg ${packetLoss > 20 ? 'text-red-400' : packetLoss > 0 ? 'text-amber-400' : ''}`}>
                      {packetLoss}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={packetLoss}
                    onChange={(e) => {
                      setPacketLoss(parseInt(e.target.value));
                      addLog(`PACKET LOSS SET TO ${e.target.value}%`);
                    }}
                    className="w-full h-1 bg-[#33ff33]/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#33ff33] [&::-webkit-slider-thumb]:rounded-sm"
                  />
                  <div className="flex justify-between text-[10px] text-[#33ff33]/40">
                    <span>0% (Reliable)</span>
                    <span>50% (Chaos)</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Row: Environment */}
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Seed Control */}
              <div className="border border-[#33ff33]/30 p-4 relative flex-1 flex items-center justify-between">
                 <div className="absolute -top-2.5 left-4 bg-[#0a0a0a] px-2 text-xs uppercase tracking-widest text-[#33ff33]/70">
                  RNG Seed
                </div>
                <div className="font-bold tracking-widest text-lg text-cyan-400">
                  {seed}
                </div>
                <button
                  onClick={handleRegenerateSeed}
                  className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-colors text-xs uppercase tracking-widest"
                >
                  <DiceIcon />
                  Re-roll
                </button>
              </div>

            </div>

          </main>
        </div>

        {/* Terminal Output Log */}
        <footer className="h-40 bg-[#050505] border-t border-[#33ff33]/30 p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1">
          {logs.map((log, i) => (
            <div key={i} className="text-[#33ff33]/70 hover:text-[#33ff33] transition-colors">
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </footer>
      </div>

      {/* Decorative scanline overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20"></div>
    </div>
  );
}