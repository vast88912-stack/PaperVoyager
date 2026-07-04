import React, { useState, useEffect, useRef } from 'react';

// --- Icons ---
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const StepIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const ResetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
  </svg>
);

const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const generateSeed = () => Math.random().toString(16).substr(2, 8).toUpperCase();

export default function App() {
  // --- State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [term, setTerm] = useState(1);
  const [nodeCount, setNodeCount] = useState(5);
  const [latency, setLatency] = useState(150); // ms
  const [packetLoss, setPacketLoss] = useState(5); // %
  const [seed, setSeed] = useState(generateSeed());
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // multiplier
  const [logs, setLogs] = useState<string[]>([
    `> INITIALIZING RAFT CLUSTER [SEED: ${seed}]`,
    `> NODE COUNT SET TO ${nodeCount}...`,
    '> WAITING FOR MASTER CONTROL COMMAND...'
  ]);

  const terminalRef = useRef<HTMLDivElement>(null);

  // --- Mocks & Simulation Effects ---
  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [...prev, `[TERM ${term.toString().padStart(4, '0')}] ${msg}`];
      return newLogs.slice(-50); // Keep last 50 logs
    });
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        const events = [
          `HEARTBEAT_ACK from Node_${Math.floor(Math.random() * nodeCount) + 1}`,
          `APPEND_ENTRIES sent to followers`,
          `ELECTION_TIMEOUT triggered on Node_${Math.floor(Math.random() * nodeCount) + 1}`,
          `COMMITTED index ${Math.floor(Math.random() * 100)}`
        ];
        
        // Simulate packet loss visually in logs
        if (Math.random() * 100 < packetLoss) {
          addLog(`WARN: PACKET_DROP detected on network layer!`);
        } else {
          const evt = events[Math.floor(Math.random() * events.length)];
          addLog(evt);
        }

        // Random term increments
        if (Math.random() > 0.95) {
          setTerm(t => t + 1);
          addLog(`NEW_ELECTION started. Transitioning to Term ${term + 1}`);
        }

      }, (1000 / playbackSpeed) * (latency / 100)); // Scaled rough interval
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, latency, packetLoss, nodeCount, term]);

  // --- Handlers ---
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    addLog(isPlaying ? 'SIMULATION PAUSED' : 'SIMULATION RESUMED');
  };

  const handleStep = () => {
    setIsPlaying(false);
    addLog('MANUAL_STEP executed.');
    setTerm(t => t + 1);
  };

  const handleReset = () => {
    setIsPlaying(false);
    const newSeed = generateSeed();
    setSeed(newSeed);
    setTerm(1);
    setLogs([
      `> SYSTEM RESET INITIATED`,
      `> NEW SEED GENERATED: ${newSeed}`,
      `> WAITING FOR MASTER CONTROL COMMAND...`
    ]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono p-4 md:p-8 flex flex-col items-center justify-center selection:bg-[#00ff41] selection:text-black">
      
      <div className="w-full max-w-6xl flex flex-col gap-6">
        
        {/* HEADER */}
        <header className="border-b-2 border-[#00ff41]/30 pb-4 mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-[#00ff41] drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]">
              RAFT_ANIMATOR :: TTY_01
            </h1>
            <p className="text-sm text-[#00ff41]/60 mt-1">DISTRIBUTED CONSENSUS EDUCATIONAL INTERFACE v1.0</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#00ff41]/50">CURRENT TERM</div>
            <div className="text-3xl font-bold">{term.toString().padStart(4, '0')}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PANEL 1: MASTER CONTROLS */}
          <div className="bg-[#0a0a0a] border border-[#00ff41]/20 p-5 rounded-sm relative group hover:border-[#00ff41]/50 transition-colors">
            <div className="absolute top-0 left-0 bg-[#00ff41]/20 text-xs px-2 py-0.5">EXEC_CONTROLS</div>
            
            <div className="mt-6 flex flex-col gap-4">
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleTogglePlay}
                  className={`flex items-center justify-center gap-2 py-3 px-4 border transition-all duration-200 ${
                    isPlaying 
                      ? 'bg-[#00ff41]/20 border-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.2)]' 
                      : 'bg-transparent border-[#00ff41]/40 hover:bg-[#00ff41]/10 hover:border-[#00ff41]'
                  }`}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  {isPlaying ? 'PAUSE' : 'START'}
                </button>
                
                <button 
                  onClick={handleStep}
                  disabled={isPlaying}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-[#00ff41]/40 hover:bg-[#00ff41]/10 hover:border-[#00ff41] transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <StepIcon /> STEP
                </button>
              </div>

              <button 
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-red-500/40 text-red-500 hover:bg-red-500/10 hover:border-red-500 transition-all"
              >
                <ResetIcon /> HARD_RESET
              </button>

              <div className="mt-4 pt-4 border-t border-[#00ff41]/20">
                <label className="text-xs text-[#00ff41]/60 mb-2 block">PLAYBACK_SPEED</label>
                <div className="flex gap-2">
                  {[0.5, 1, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`flex-1 py-1 text-sm border ${
                        playbackSpeed === speed 
                          ? 'bg-[#00ff41] text-black border-[#00ff41]' 
                          : 'border-[#00ff41]/30 hover:bg-[#00ff41]/10'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="text-[#00ff41]/60">RNG_SEED:</span>
                <span className="font-bold select-all bg-[#00ff41]/10 px-2 py-1">{seed}</span>
              </div>

            </div>
          </div>

          {/* PANEL 2: ENVIRONMENT PARAMETERS */}
          <div className="bg-[#0a0a0a] border border-[#00ff41]/20 p-5 rounded-sm relative group hover:border-[#00ff41]/50 transition-colors">
            <div className="absolute top-0 left-0 bg-[#00ff41]/20 text-xs px-2 py-0.5 flex items-center gap-1">
              <SettingsIcon /> ENV_PARAMS
            </div>
            
            <div className="mt-6 flex flex-col gap-6">
              
              {/* Node Count Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm">CLUSTER_SIZE (NODES)</label>
                  <span className="text-xl font-bold text-[#00ff41]">{nodeCount}</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="7" 
                  step="2" // Raft clusters usually have odd numbers to prevent split votes
                  value={nodeCount} 
                  onChange={(e) => {
                    setNodeCount(parseInt(e.target.value));
                    addLog(`CLUSTER_SIZE adjusted to ${e.target.value}`);
                  }}
                  className="w-full accent-[#00ff41] cursor-pointer h-1 bg-[#00ff41]/20 rounded-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00ff41]"
                />
                <div className="flex gap-1 mt-2 justify-center">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 flex-1 border ${
                        i < nodeCount 
                          ? 'bg-[#00ff41] border-[#00ff41] shadow-[0_0_5px_rgba(0,255,65,0.5)]' 
                          : 'border-[#00ff41]/20 bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Latency Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm">BASE_LATENCY</label>
                  <span className="text-lg font-bold text-yellow-400">{latency}ms</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="10"
                  value={latency} 
                  onChange={(e) => setLatency(parseInt(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer h-1 bg-yellow-400/20 rounded-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-400"
                />
              </div>

              {/* Packet Loss Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm">PACKET_LOSS</label>
                  <span className="text-lg font-bold text-red-400">{packetLoss}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  step="1"
                  value={packetLoss} 
                  onChange={(e) => setPacketLoss(parseInt(e.target.value))}
                  className="w-full accent-red-400 cursor-pointer h-1 bg-red-400/20 rounded-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-400"
                />
              </div>

            </div>
          </div>

          {/* PANEL 3: TERMINAL / ACTIVITY LOG */}
          <div className="bg-[#050505] border border-[#00ff41]/20 p-1 rounded-sm relative group hover:border-[#00ff41]/50 transition-colors flex flex-col h-64 lg:h-auto">
             <div className="bg-[#00ff41]/10 border-b border-[#00ff41]/20 px-3 py-1 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalIcon /> SIM_STDOUT
              </div>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#00ff41] animate-pulse' : 'bg-[#00ff41]/20'}`}></div>
              </div>
            </div>
            <div 
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-3 text-xs md:text-sm font-mono leading-relaxed space-y-1 custom-scrollbar"
            >
              {logs.map((log, i) => {
                let colorClass = "text-[#00ff41]/80";
                if (log.includes("WARN") || log.includes("PACKET_DROP") || log.includes("TIMEOUT")) colorClass = "text-red-400";
                else if (log.includes("NEW_ELECTION") || log.includes("APPEND_ENTRIES")) colorClass = "text-yellow-400";
                else if (log.includes("COMMITTED")) colorClass = "text-cyan-400 font-bold";
                else if (log.startsWith(">")) colorClass = "text-gray-400";

                return (
                  <div key={i} className={`break-all ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
              {isPlaying && (
                <div className="flex items-center text-[#00ff41] animate-pulse">_</div>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER: SAFETY CHECKLIST CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="border border-[#00ff41]/20 p-3 bg-[#0a0a0a]">
            <div className="text-xs text-[#00ff41]/50 mb-1">INVARIANT #1</div>
            <div className="font-bold text-sm">ELECTION SAFETY</div>
            <div className="text-xs mt-2 text-[#00ff41]/70">At most one leader can be elected in a given term.</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
              <span>VERIFIED</span>
            </div>
          </div>
          <div className="border border-[#00ff41]/20 p-3 bg-[#0a0a0a]">
            <div className="text-xs text-[#00ff41]/50 mb-1">INVARIANT #2</div>
            <div className="font-bold text-sm">LEADER APPEND-ONLY</div>
            <div className="text-xs mt-2 text-[#00ff41]/70">A leader never overwrites or deletes entries in its log.</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
              <span>VERIFIED</span>
            </div>
          </div>
          <div className="border border-[#00ff41]/20 p-3 bg-[#0a0a0a]">
            <div className="text-xs text-[#00ff41]/50 mb-1">INVARIANT #3</div>
            <div className="font-bold text-sm">LOG MATCHING</div>
            <div className="text-xs mt-2 text-[#00ff41]/70">If two logs contain an entry with the same index and term, they are identical.</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
              <span>VERIFIED</span>
            </div>
          </div>
          <div className="border border-[#00ff41]/20 p-3 bg-[#0a0a0a]">
            <div className="text-xs text-[#00ff41]/50 mb-1">INVARIANT #4</div>
            <div className="font-bold text-sm">LEADER COMPLETENESS</div>
            <div className="text-xs mt-2 text-[#00ff41]/70">If a log entry is committed, it will be present in all future leaders' logs.</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-[#00ff41] shadow-[0_0_5px_#00ff41]"></div>
              <span>VERIFIED</span>
            </div>
          </div>
        </div>

      </div>

      {/* Global styles for custom scrollbar hidden in regular CSS file */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 255, 65, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 255, 65, 0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 65, 0.5); }
      `}} />
    </div>
  );
}