import React, { useState, useEffect, useRef } from 'react';

// Sub-component for individual metric displays
const MetricDisplay = ({ 
  label, 
  value, 
  color, 
  glowColor, 
  icon,
  trend
}: { 
  label: string; 
  value: number | string; 
  color: string; 
  glowColor: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}) => {
  return (
    <div className="relative group overflow-hidden rounded-xl bg-[#0b0c10]/80 border border-white/5 backdrop-blur-md p-5 transition-all duration-300 hover:border-white/20">
      {/* Background Glow */}
      <div 
        className="absolute -inset-1 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"
        style={{ backgroundColor: glowColor }}
      />
      
      {/* Top Border Accent */}
      <div 
        className="absolute top-0 left-0 w-full h-[2px]"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
          opacity: 0.8
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg bg-black/50 border border-white/10 shadow-inner"
            style={{ color: color }}
          >
            {icon}
          </div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-sans">
            {label}
          </h3>
        </div>
        
        {trend && (
          <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-black/40 border border-white/5
            ${trend === 'up' ? 'text-rose-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-500'}
          `}>
            {trend === 'up' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
            {trend === 'down' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
            {trend === 'stable' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span 
          className="text-4xl font-mono font-bold tracking-tight"
          style={{ 
            color: '#fff',
            textShadow: `0 0 20px ${glowColor}`
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      
      {/* Decorative tech lines */}
      <div className="absolute bottom-0 right-0 p-2 flex gap-1 opacity-20">
        <div className="w-1 h-1 rounded-full bg-white" />
        <div className="w-1 h-1 rounded-full bg-white" />
        <div className="w-3 h-1 rounded-full bg-white" />
      </div>
    </div>
  );
};

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [visitedNodes, setVisitedNodes] = useState(0);
  const [frontierSize, setFrontierSize] = useState(0);
  const [pathCost, setPathCost] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'BACKTRACING' | 'COMPLETE'>('IDLE');
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Simulation logic to make the card feel "live"
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRunning) {
      interval = setInterval(() => {
        setVisitedNodes(prev => {
          if (prev > 1500) {
            setStatus('BACKTRACING');
            return prev;
          }
          return prev + Math.floor(Math.random() * 12) + 1;
        });

        setFrontierSize(prev => {
          if (status === 'BACKTRACING') return Math.max(0, prev - 15);
          if (status === 'COMPLETE') return 0;
          // Frontier grows and shrinks naturally in search algorithms
          const change = Math.floor(Math.random() * 9) - 3; 
          return Math.max(0, prev + change);
        });

        setTimeElapsed(prev => prev + 16); // roughly 60fps in ms
      }, 50);
    }

    return () => clearInterval(interval);
  }, [isRunning, status]);

  // Handle phase transitions
  useEffect(() => {
    if (status === 'BACKTRACING') {
      let costInterval = setInterval(() => {
        setPathCost(prev => {
          if (prev >= 420) {
            setStatus('COMPLETE');
            setIsRunning(false);
            clearInterval(costInterval);
            return 420;
          }
          return prev + 14;
        });
      }, 30);
      return () => clearInterval(costInterval);
    }
  }, [status]);

  const handleToggle = () => {
    if (status === 'COMPLETE') {
      setVisitedNodes(0);
      setFrontierSize(0);
      setPathCost(0);
      setTimeElapsed(0);
      setStatus('SEARCHING');
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
      if (!isRunning && status === 'IDLE') setStatus('SEARCHING');
    }
  };

  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-6 relative overflow-hidden font-sans text-slate-200">
      {/* Futuristic Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      />

      {/* Main HUD Container */}
      <div className="relative z-10 w-full max-w-4xl">
        
        {/* Header Section */}
        <div className="mb-8 flex items-end justify-between border-b border-cyan-900/50 pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'} shadow-[0_0_10px_currentColor]`} />
              <h1 className="text-sm font-mono text-cyan-500 tracking-[0.2em] uppercase">System Telemetry</h1>
            </div>
            <h2 className="text-3xl font-light tracking-tight text-white">Algorithm Complexity</h2>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="text-right mr-4 hidden sm:block">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Status</div>
              <div className={`text-sm font-mono font-bold
                ${status === 'IDLE' ? 'text-slate-400' : ''}
                ${status === 'SEARCHING' ? 'text-cyan-400' : ''}
                ${status === 'BACKTRACING' ? 'text-fuchsia-400' : ''}
                ${status === 'COMPLETE' ? 'text-emerald-400' : ''}
              `}>
                [{status}]
              </div>
            </div>
            <button 
              onClick={handleToggle}
              className={`
                relative px-6 py-2.5 rounded-none font-mono text-sm font-bold uppercase tracking-wider
                transition-all duration-300 overflow-hidden border
                ${isRunning 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/50 hover:bg-rose-500/20 hover:border-rose-400' 
                  : status === 'COMPLETE'
                    ? 'bg-slate-800/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                }
              `}
            >
              <span className="relative z-10">
                {isRunning ? 'Halt Execution' : status === 'COMPLETE' ? 'Reset Matrix' : 'Initialize'}
              </span>
              {/* Button corner accents */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current" />
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <MetricDisplay 
            label="Nodes Visited"
            value={visitedNodes}
            color="#06b6d4" // cyan-500
            glowColor="rgba(6, 182, 212, 0.4)"
            trend={status === 'SEARCHING' ? 'up' : 'stable'}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            }
          />

          <MetricDisplay 
            label="Frontier Size"
            value={frontierSize}
            color="#d946ef" // fuchsia-500
            glowColor="rgba(217, 70, 239, 0.4)"
            trend={status === 'BACKTRACING' ? 'down' : status === 'SEARCHING' ? 'up' : 'stable'}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            }
          />

          <MetricDisplay 
            label="Optimal Path Cost"
            value={pathCost === 0 && status !== 'COMPLETE' ? '--' : pathCost}
            color="#10b981" // emerald-500
            glowColor="rgba(16, 185, 129, 0.4)"
            trend={status === 'BACKTRACING' ? 'up' : 'stable'}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            }
          />

        </div>

        {/* Footer Data Bar */}
        <div className="mt-6 border border-white/10 bg-[#0b0c10]/60 backdrop-blur-md rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Algorithm</span>
              <span className="text-sm font-semibold text-slate-300">A* Search (Manhattan)</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Heuristic Weight</span>
              <span className="text-sm font-semibold text-slate-300">1.0x</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Time Elapsed</span>
              <span className="text-sm font-mono font-semibold text-cyan-400">{formatTime(timeElapsed)}</span>
            </div>
          </div>
          
          {/* Simulated Memory Bar */}
          <div className="w-full sm:w-48 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <span>Memory Heap</span>
              <span>{Math.min(98, Math.floor((visitedNodes / 2000) * 100))}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, (visitedNodes / 2000) * 100)}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}