import React, { useState, useEffect, useRef } from 'react';
import { Activity, Layers, Route, Play, Pause, RotateCcw, Zap, Terminal } from 'lucide-react';

// Runtime deps: lucide-react

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [stats, setStats] = useState({
    visited: 0,
    frontier: 1,
    cost: 0,
    time: 0,
  });

  const [activeAlgo, setActiveAlgo] = useState('A* SEARCH');

  // Simulation logic for demonstration
  useEffect(() => {
    let interval: number | undefined;
    let startTime = Date.now() - stats.time;

    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        setStats((prev) => {
          // Simulate algorithm progression
          const newVisited = prev.visited + Math.floor(Math.random() * 4) + 1;
          const newFrontier = prev.frontier + Math.floor(Math.random() * 5) - 2;
          const newCost = newVisited > 50 ? prev.cost + (Math.random() > 0.7 ? 1 : 0) : 0;
          
          if (newVisited > 850) {
            setIsFinished(true);
            setIsRunning(false);
            return {
              visited: 852,
              frontier: 0,
              cost: 124,
              time: Date.now() - startTime,
            };
          }

          return {
            visited: newVisited,
            frontier: Math.max(1, newFrontier),
            cost: newCost,
            time: Date.now() - startTime,
          };
        });
      }, 40);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isFinished, stats.time]);

  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setStats({ visited: 0, frontier: 1, cost: 0, time: 0 });
  };

  const formatNumber = (num: number, padding = 4) => {
    return num.toString().padStart(padding, '0');
  };

  return (
    <div 
      className="min-h-screen bg-[#050508] text-gray-300 flex items-center justify-center p-6 relative font-sans overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 240, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 240, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '2rem 2rem',
        backgroundPosition: 'center center'
      }}
    >
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00f0ff] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#b026ff] rounded-full blur-[120px] opacity-10 pointer-events-none translate-x-[100px]" />

      {/* Complexity Card - Designed as a Sidebar Widget */}
      <div className="relative w-full max-w-sm bg-[#0a0a10]/90 backdrop-blur-xl border border-[#1a1a24] rounded-xl overflow-hidden shadow-2xl">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-80" />

        {/* Card Header */}
        <div className="p-5 border-b border-[#1a1a24] flex items-center justify-between bg-gradient-to-b from-[#ffffff05] to-transparent">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#00f0ff]" />
            <h2 className="text-sm font-bold tracking-widest text-white uppercase drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
              System Telemetry
            </h2>
          </div>
          <div className="flex gap-1 bg-[#050508] p-1 rounded-md border border-[#1a1a24]">
            {['A*', 'BFS'].map((algo) => (
              <button
                key={algo}
                onClick={() => { setActiveAlgo(algo); handleReset(); }}
                className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                  activeAlgo === algo 
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {algo}
              </button>
            ))}
          </div>
        </div>

        {/* Main Counters Area */}
        <div className="p-5 space-y-4">
          
          {/* Status Indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Process Status
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: isFinished ? '#00ff88' : isRunning ? '#00f0ff' : '#ff003c' }}>
                {isFinished ? 'COMPLETED' : isRunning ? 'CALCULATING...' : 'IDLE'}
              </span>
              <div className={`w-2 h-2 rounded-full ${isFinished ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]' : isRunning ? 'bg-[#00f0ff] animate-pulse shadow-[0_0_8px_#00f0ff]' : 'bg-[#ff003c] shadow-[0_0_8px_#ff003c]'}`} />
            </div>
          </div>

          {/* Grid of Stats */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Visited Nodes */}
            <div className="col-span-2 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <div className="bg-[#0c0c14] border border-[#1a1a24] p-4 rounded-lg flex items-center justify-between transition-colors group-hover:border-[#00f0ff]/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#00f0ff]/10 rounded-md">
                    <Activity className="w-4 h-4 text-[#00f0ff]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Visited Nodes</span>
                    <span className="text-2xl font-mono text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                      {formatNumber(stats.visited)}
                    </span>
                  </div>
                </div>
                {/* Micro sparkline visualization mock */}
                <div className="w-16 h-8 flex items-end gap-[2px] opacity-40">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-full bg-[#00f0ff] transition-all duration-300"
                      style={{ 
                        height: isRunning ? `${Math.random() * 100}%` : (isFinished ? '100%' : '10%') 
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Frontier Size */}
            <div className="bg-[#0c0c14] border border-[#1a1a24] p-4 rounded-lg flex flex-col hover:border-[#ff0055]/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#ff0055]/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-[#ff0055]" />
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Frontier</span>
              </div>
              <span className="text-xl font-mono text-[#ff0055] drop-shadow-[0_0_8px_rgba(255,0,85,0.4)] mt-auto">
                {formatNumber(stats.frontier, 3)}
              </span>
            </div>

            {/* Path Cost */}
            <div className="bg-[#0c0c14] border border-[#1a1a24] p-4 rounded-lg flex flex-col hover:border-[#b026ff]/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#b026ff]/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-2 mb-2">
                <Route className="w-3.5 h-3.5 text-[#b026ff]" />
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Path Cost</span>
              </div>
              <span className="text-xl font-mono text-[#b026ff] drop-shadow-[0_0_8px_rgba(176,38,255,0.4)] mt-auto">
                {formatNumber(stats.cost, 3)}
              </span>
            </div>

          </div>

          {/* Execution Time */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1a1a24] border-dashed">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#ffaa00]" />
              <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Exec Time</span>
            </div>
            <span className="text-sm font-mono text-[#ffaa00]">
              {(stats.time / 1000).toFixed(2)}s
            </span>
          </div>

        </div>

        {/* Controls Footer */}
        <div className="bg-[#050508] p-4 flex items-center justify-between border-t border-[#1a1a24]">
          <div className="text-[10px] font-mono text-gray-600">
            SEED: {activeAlgo === 'A*' ? '0x8F2A' : '0x1B9C'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-md bg-[#1a1a24] hover:bg-[#2a2a35] text-gray-400 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (isFinished) handleReset();
                setIsRunning(!isRunning);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs tracking-wider transition-all
                ${isRunning 
                  ? 'bg-[#ff003c]/20 text-[#ff003c] border border-[#ff003c]/50 hover:bg-[#ff003c]/30 shadow-[0_0_15px_rgba(255,0,60,0.2)]' 
                  : 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 hover:bg-[#00f0ff]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                }
              `}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> HALT
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {isFinished ? 'REPLAY' : 'EXECUTE'}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}