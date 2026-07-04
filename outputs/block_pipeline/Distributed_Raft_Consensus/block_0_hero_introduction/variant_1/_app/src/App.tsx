import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Play, Shield, Network, Database, ChevronRight, Activity } from 'lucide-react';

// --- Helper Components ---

const BlinkingCursor = () => (
  <span className="inline-block w-2 h-5 bg-cyan-400 animate-pulse align-middle ml-1"></span>
);

const TypewriterText = ({ lines, delay = 50 }: { lines: string[], delay?: number }) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  useEffect(() => {
    if (currentLineIndex >= lines.length) return;

    const currentLine = lines[currentLineIndex];

    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          if (newLines[currentLineIndex] === undefined) {
            newLines[currentLineIndex] = '';
          }
          newLines[currentLineIndex] += currentLine[currentCharIndex];
          return newLines;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, delay * 10);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, lines, delay]);

  return (
    <div className="font-mono text-sm sm:text-base text-green-400 space-y-1">
      {displayedLines.map((line, i) => (
        <div key={i} className="flex items-start">
          <span className="text-gray-600 mr-2">{'>'}</span>
          <span>{line}</span>
          {i === currentLineIndex && <BlinkingCursor />}
        </div>
      ))}
      {currentLineIndex >= lines.length && (
        <div className="flex items-start">
          <span className="text-gray-600 mr-2">{'>'}</span>
          <BlinkingCursor />
        </div>
      )}
    </div>
  );
};

const AnimatedClusterGraphic = () => {
  const nodes = [0, 1, 2, 3, 4];
  const leaderIndex = 0;

  // Calculate positions in a circle
  const getPos = (i: number) => {
    const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + 35 * Math.cos(angle);
    const y = 50 + 35 * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.4)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </radialGradient>
          <radialGradient id="leader-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(232, 121, 249, 0.5)" />
            <stop offset="100%" stopColor="rgba(232, 121, 249, 0)" />
          </radialGradient>
        </defs>

        {/* Connections (AppendEntries RPCs) */}
        {nodes.map(i => {
          if (i === leaderIndex) return null;
          const start = getPos(leaderIndex);
          const end = getPos(i);
          return (
            <g key={`line-${i}`}>
              {/* Base line */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#1f2937"
                strokeWidth="0.5"
              />
              {/* Animated packet */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#e879f9"
                strokeWidth="1"
                strokeDasharray="4 100"
                className="animate-[dash_2s_linear_infinite]"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(i => {
          const pos = getPos(i);
          const isLeader = i === leaderIndex;
          return (
            <g key={`node-${i}`} className="transform-gpu transition-transform hover:scale-110 cursor-pointer">
              <circle
                cx={pos.x}
                cy={pos.y}
                r="12"
                fill={`url(#${isLeader ? 'leader-glow' : 'node-glow'})`}
                className="animate-pulse"
                style={{ animationDuration: isLeader ? '2s' : '3s', animationDelay: `${i * 0.5}s` }}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r="4"
                fill={isLeader ? '#e879f9' : '#22d3ee'}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                fontSize="3"
                fontFamily="monospace"
                fill="#0f172a"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
              >
                S{i + 1}
              </text>
              {isLeader && (
                <text
                  x={pos.x}
                  y={pos.y - 7}
                  fontSize="2.5"
                  fontFamily="monospace"
                  fill="#e879f9"
                  textAnchor="middle"
                  className="animate-bounce"
                >
                  LEADER
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* CSS for SVG animation */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -104;
          }
        }
      `}</style>
    </div>
  );
};

// --- Main Hero Component ---

export default function App() {
  const terminalBootSequence = useMemo(() => [
    "INIT SYSTEM v9.0.4",
    "Loading consensus module... [OK]",
    "Bootstrapping distributed log... [OK]",
    "Spawning 5 virtual nodes...",
    "Establishing RPC channels...",
    "Awaiting leader election..."
  ], []);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-cyan-900 selection:text-cyan-100 relative overflow-hidden flex flex-col">
      
      {/* Background Grid & Scanlines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)]"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/60 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gray-900 border border-gray-700 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-mono font-bold text-lg tracking-tight text-gray-100">
              RAFT<span className="text-cyan-500">_SIM</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center space-x-8 font-mono text-sm">
            <a href="#overview" className="text-gray-400 hover:text-cyan-400 transition-colors">/overview</a>
            <a href="#election" className="text-gray-400 hover:text-cyan-400 transition-colors">/election</a>
            <a href="#replication" className="text-gray-400 hover:text-cyan-400 transition-colors">/replication</a>
            <a href="#sandbox" className="text-gray-400 hover:text-fuchsia-400 transition-colors">/sandbox</a>
          </nav>
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-grow relative z-10 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy & Actions */}
            <div className="col-span-1 lg:col-span-7 space-y-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-xs font-mono text-fuchsia-400">
                <Activity className="w-3 h-3 animate-pulse" />
                <span>ChatGPT Edition // Interactive Edu-Tool</span>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
                  Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Consensus</span> <br />
                  Through Animation.
                </h1>
                <p className="text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
                  A visual, interactive sandbox for the Raft distributed consensus algorithm. 
                  Experience leader election, log replication, and partition tolerance in real-time.
                </p>
              </div>

              {/* Terminal Window */}
              <div className="w-full max-w-xl bg-[#0a0a0a] rounded-lg border border-gray-800 shadow-2xl overflow-hidden">
                <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center px-4 space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  <div className="ml-4 font-mono text-xs text-gray-500">raft-daemon.sh</div>
                </div>
                <div className="p-4 h-40 overflow-y-auto">
                  <TypewriterText lines={terminalBootSequence} delay={30} />
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pt-4">
                <button className="w-full sm:w-auto group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-black bg-cyan-400 rounded hover:bg-cyan-300 transition-all duration-200 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                  <Play className="w-5 h-5 mr-2 fill-black" />
                  Start Simulation
                </button>
                
                <button className="w-full sm:w-auto group inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-gray-300 bg-transparent border border-gray-700 rounded hover:bg-gray-800 hover:text-white transition-all duration-200">
                  <Shield className="w-5 h-5 mr-2 text-gray-400 group-hover:text-fuchsia-400 transition-colors" />
                  Explore Invariants
                </button>
              </div>
            </div>

            {/* Right Column: Visualizer */}
            <div className="col-span-1 lg:col-span-5 relative">
              {/* Decorative background blurs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-[60px] pointer-events-none"></div>
              
              <div className="relative bg-[#0a0a0a]/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 shadow-2xl">
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <Network className="w-4 h-4 text-gray-500" />
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">Cluster Topology</span>
                </div>
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="font-mono text-xs text-green-500">LIVE</span>
                </div>
                
                <div className="mt-8">
                  <AnimatedClusterGraphic />
                </div>

                {/* Legend */}
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-800/50 pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.5)]"></div>
                    <span className="font-mono text-xs text-gray-400">Leader Node</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                    <span className="font-mono text-xs text-gray-400">Follower Node</span>
                  </div>
                  <div className="flex items-center space-x-3 col-span-2">
                    <div className="w-8 h-[1px] bg-gradient-to-r from-gray-700 to-fuchsia-400 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-fuchsia-400"></div>
                    </div>
                    <span className="font-mono text-xs text-gray-400">AppendEntries RPC (Heartbeat)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Bottom fade out */}
      <div className="h-24 bg-gradient-to-t from-[#050505] to-transparent relative z-10 w-full pointer-events-none"></div>
    </div>
  );
}