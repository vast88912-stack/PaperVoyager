import React, { useState, useEffect, useRef } from 'react';
import { Activity, Box, Map, Cpu, Hash, RotateCcw, Play, Square, Terminal } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETE'>('IDLE');
  const [algo, setAlgo] = useState<'A*' | 'DIJKSTRA' | 'BFS'>('A*');
  const [stats, setStats] = useState({ visited: 0, frontier: 0, cost: 0, time: 0 });
  const [seed] = useState(() => Math.random().toString(16).slice(2, 8).toUpperCase());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'RUNNING') {
      interval = setInterval(() => {
        setStats((prev) => {
          // Simulate algorithm progression
          const newVisited = prev.visited + Math.floor(Math.random() * 4) + 1;
          const newFrontier = Math.max(1, prev.frontier + Math.floor(Math.random() * 9) - 3);
          const newTime = prev.time + 32; 
          
          if (newVisited > 450) {
            setStatus('COMPLETE');
            return { 
              visited: 456, 
              frontier: 0, 
              cost: algo === 'BFS' ? 68 : 42, 
              time: newTime 
            };
          }
          return { ...prev, visited: newVisited, frontier: newFrontier, time: newTime };
        });
      }, 32);
    }
    return () => clearInterval(interval);
  }, [status, algo]);

  const handleStart = () => {
    if (status === 'COMPLETE') handleReset();
    setStatus('RUNNING');
  };

  const handlePause = () => setStatus('IDLE');

  const handleReset = () => {
    setStatus('IDLE');
    setStats({ visited: 0, frontier: 0, cost: 0, time: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-mono flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Grid & Scanlines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #06b6d4 1px, transparent 1px),
            linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 z-10" />

      {/* Main HUD Container */}
      <div className="relative z-20 w-full max-w-2xl bg-gray-900/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-1 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        
        {/* Glowing Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />

        <div className="bg-gray-950/90 rounded border border-gray-800 p-6 flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <Terminal className="text-cyan-400 w-5 h-5 animate-pulse" />
              <h2 className="text-lg uppercase tracking-widest text-cyan-50 text-shadow-sm font-semibold">
                Complexity Matrix
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 bg-gray-900 px-2 py-1 border border-gray-800 rounded">
                <Hash className="w-3 h-3 text-fuchsia-500" />
                <span className="text-gray-400">SEED:</span>
                <span className="text-fuchsia-400 font-bold">{seed}</span>
              </div>
              <div className="flex gap-1">
                {['A*', 'DIJKSTRA', 'BFS'].map(a => (
                  <button
                    key={a}
                    onClick={() => { setAlgo(a as any); handleReset(); }}
                    className={`px-2 py-1 text-[10px] uppercase rounded border transition-all ${
                      algo === a 
                        ? 'border-cyan-500 text-cyan-300 bg-cyan-950/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                        : 'border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Visited Nodes */}
            <div className="group relative bg-gray-900 border border-gray-800 rounded-lg p-5 overflow-hidden transition-all hover:border-cyan-500/50">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all" />
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Visited Nodes</span>
              </div>
              <div className="text-4xl font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] font-mono tracking-tight">
                {stats.visited.toString().padStart(4, '0')}
              </div>
              <div className="mt-2 text-[10px] text-gray-600 flex justify-between">
                <span>O(|V| + |E|)</span>
                <span className="text-cyan-500/50">MEM: {(stats.visited * 0.12).toFixed(1)} KB</span>
              </div>
            </div>

            {/* Frontier Size */}
            <div className="group relative bg-gray-900 border border-gray-800 rounded-lg p-5 overflow-hidden transition-all hover:border-fuchsia-500/50">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-fuchsia-500/5 rounded-full blur-xl group-hover:bg-fuchsia-500/10 transition-all" />
              <div className="flex items-center gap-2 mb-2">
                <Box className="w-4 h-4 text-fuchsia-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Frontier Size</span>
              </div>
              <div className="text-4xl font-bold text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)] font-mono tracking-tight">
                {stats.frontier.toString().padStart(4, '0')}
              </div>
              {/* Mini Sparkline Simulation */}
              <div className="mt-3 h-2 w-full bg-gray-950 rounded flex items-end gap-[2px] overflow-hidden">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-full bg-fuchsia-500/40 rounded-t-sm transition-all duration-75"
                    style={{ 
                      height: status === 'RUNNING' ? `${Math.random() * 100}%` : (status === 'COMPLETE' ? '0%' : '10%') 
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Path Cost */}
            <div className="group relative bg-gray-900 border border-gray-800 rounded-lg p-5 overflow-hidden transition-all hover:border-emerald-500/50">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">Path Cost</span>
              </div>
              <div className={`text-4xl font-bold font-mono tracking-tight transition-colors duration-300 ${status === 'COMPLETE' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-gray-600'}`}>
                {status === 'COMPLETE' ? stats.cost.toString().padStart(4, '0') : '----'}
              </div>
              <div className="mt-2 text-[10px] text-gray-600 flex justify-between">
                <span>Total Weights</span>
                <span className={status === 'COMPLETE' ? 'text-emerald-500/70' : ''}>
                  {status === 'COMPLETE' ? 'OPTIMAL' : 'CALCULATING...'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Controls & Live Status */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-cyan-400 animate-ping' : status === 'COMPLETE' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                <span className="text-xs text-gray-400 uppercase tracking-widest">
                  {status === 'IDLE' ? 'System Ready' : status === 'RUNNING' ? 'Analyzing...' : 'Search Complete'}
                </span>
              </div>
              <div className="text-xs text-gray-600 font-mono">
                T+ {(stats.time / 1000).toFixed(2)}s
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleReset}
                className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded text-gray-400 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              
              {status === 'RUNNING' ? (
                <button 
                  onClick={handlePause}
                  className="px-4 py-2 bg-fuchsia-950/30 hover:bg-fuchsia-900/50 border border-fuchsia-500/50 rounded text-fuchsia-400 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span className="text-xs uppercase font-bold tracking-wider">Pause</span>
                </button>
              ) : (
                <button 
                  onClick={handleStart}
                  className="px-4 py-2 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-500/50 rounded text-cyan-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span className="text-xs uppercase font-bold tracking-wider">
                    {status === 'COMPLETE' ? 'Restart' : 'Simulate'}
                  </span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}