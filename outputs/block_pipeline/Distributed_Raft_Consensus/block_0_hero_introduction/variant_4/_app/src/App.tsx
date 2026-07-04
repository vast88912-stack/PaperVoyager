import React, { useState, useEffect, useRef } from 'react';

// Pre-defined boot sequence simulating a Raft cluster startup
const BOOT_SEQUENCE = [
  { text: "[SYSTEM] Booting Raft Consensus Simulator...", color: "text-emerald-500" },
  { text: "[INIT] Allocating memory for 5-node cluster...", color: "text-emerald-500" },
  { text: "[NODE-1] State: FOLLOWER, Term: 0", color: "text-zinc-400" },
  { text: "[NODE-2] State: FOLLOWER, Term: 0", color: "text-zinc-400" },
  { text: "[NODE-3] State: FOLLOWER, Term: 0", color: "text-zinc-400" },
  { text: "[NODE-4] State: FOLLOWER, Term: 0", color: "text-zinc-400" },
  { text: "[NODE-5] State: FOLLOWER, Term: 0", color: "text-zinc-400" },
  { text: "[TIMER] Node 3 election timeout reached (185ms)!", color: "text-amber-400" },
  { text: "[NODE-3] State: CANDIDATE, Term: 1", color: "text-amber-400" },
  { text: "[NODE-3] Broadcasting RequestVote RPCs...", color: "text-zinc-300" },
  { text: "[NODE-1] Voted for Node 3 in Term 1", color: "text-zinc-400" },
  { text: "[NODE-2] Voted for Node 3 in Term 1", color: "text-zinc-400" },
  { text: "[NODE-4] Voted for Node 3 in Term 1", color: "text-zinc-400" },
  { text: "[LEADER] Node 3 achieved quorum (4/5 votes).", color: "text-cyan-400" },
  { text: "[LEADER] Node 3 elected leader for Term 1.", color: "text-cyan-400" },
  { text: "[REPL] Node 3 broadcasting AppendEntries (Heartbeat)...", color: "text-blue-400" },
  { text: "[SYSTEM] Cluster stabilized. Awaiting client requests.", color: "text-emerald-500" },
];

export default function App() {
  const [logs, setLogs] = useState<typeof BOOT_SEQUENCE>([]);
  const [isBooting, setIsBooting] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const playSequence = () => {
      if (!isBooting) return;

      if (currentIndex < BOOT_SEQUENCE.length) {
        setLogs((prev) => [...prev, BOOT_SEQUENCE[currentIndex]]);
        currentIndex++;
        // Variable delay for realistic terminal feel
        const delay = Math.random() * 300 + 100;
        timeoutId = setTimeout(playSequence, delay);
      } else {
        // Reset after a pause
        timeoutId = setTimeout(() => {
          setLogs([]);
          currentIndex = 0;
          playSequence();
        }, 5000);
      }
    };

    if (isBooting) {
      playSequence();
    }

    return () => clearTimeout(timeoutId);
  }, [isBooting]);

  useEffect(() => {
    // Auto-scroll to bottom of terminal
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono relative overflow-hidden flex items-center selection:bg-cyan-500/30">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Glow Effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Hero Content */}
        <div className="flex flex-col items-start space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-full px-3 py-1 text-xs font-medium text-emerald-400 shadow-sm backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>v2.0.0 - ChatGPT Edition</span>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Master the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
                Raft Consensus
              </span> <br />
              Algorithm.
            </h1>
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              An interactive, distributed systems educator. Visualize leader election, log replication, and cluster safety under extreme network partitions.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center space-x-2 group">
              <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Initialize Cluster</span>
            </button>
            <button className="w-full sm:w-auto px-6 py-3 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 font-medium rounded transition-all flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Read Invariants</span>
            </button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-800 w-full">
            <div className="flex flex-col space-y-1">
              <span className="text-cyan-400 font-bold text-sm">Visual Sandboxing</span>
              <span className="text-xs text-slate-500">Drag to cut links & partition.</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-emerald-400 font-bold text-sm">No Black Boxes</span>
              <span className="text-xs text-slate-500">Inspect every RPC & log entry.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Terminal Window */}
        <div className="relative group perspective-1000">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          
          <div className="relative flex flex-col h-[420px] bg-[#0A0A0B] rounded-xl border border-slate-800 shadow-2xl overflow-hidden transform transition-transform duration-500 hover:scale-[1.01]">
            
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-xs font-medium text-slate-500 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                root@raft-sim:~
              </div>
              <button 
                onClick={() => setIsBooting(!isBooting)}
                className="text-slate-500 hover:text-cyan-400 transition-colors"
                title={isBooting ? "Pause Simulation" : "Resume Simulation"}
              >
                {isBooting ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs sm:text-sm">
              <div className="space-y-1.5">
                <div className="text-slate-500 mb-4">
                  $ ./bin/raft --nodes 5 --latency simulated
                </div>
                {logs.map((log, index) => (
                  <div key={index} className={`opacity-0 animate-[fadeIn_0.2s_ease-in-out_forwards] ${log.color}`}>
                    {log.text}
                  </div>
                ))}
                {isBooting && (
                  <div className="flex items-center text-slate-400 mt-2">
                    <span className="w-2 h-4 bg-cyan-400 animate-pulse inline-block ml-1"></span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}