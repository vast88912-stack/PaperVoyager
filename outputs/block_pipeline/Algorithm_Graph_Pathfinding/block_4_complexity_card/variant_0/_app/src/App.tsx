import React, { useState, useEffect, useRef } from 'react';

// Runtime deps: none

const StatCard = ({ 
  label, 
  value, 
  color, 
  icon 
}: { 
  label: string; 
  value: number | string; 
  color: 'cyan' | 'fuchsia' | 'emerald' | 'amber';
  icon: React.ReactNode;
}) => {
  const colorStyles = {
    cyan: 'text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]',
    fuchsia: 'text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_15px_rgba(232,121,249,0.15)]',
    emerald: 'text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]',
    amber: 'text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]',
  };

  const glowStyles = {
    cyan: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    fuchsia: 'drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]',
    emerald: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    amber: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  };

  return (
    <div className={`relative flex flex-col p-4 bg-gray-950/50 rounded-lg border ${colorStyles[color]} backdrop-blur-sm overflow-hidden group transition-all duration-300 hover:bg-gray-900/80`}>
      <div className="flex items-center justify-between mb-2 opacity-80">
        <span className="text-xs font-medium tracking-wider text-gray-400 uppercase">{label}</span>
        <div className={`${colorStyles[color].split(' ')[0]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className={`text-3xl font-mono font-bold tracking-tight ${glowStyles[color]}`}>
          {value}
        </span>
      </div>
      
      {/* Decorative background glow */}
      <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20 bg-current ${colorStyles[color].split(' ')[0]}`} />
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [visited, setVisited] = useState(0);
  const [frontier, setFrontier] = useState(0);
  const [cost, setCost] = useState(0);
  const [time, setTime] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const simRef = useRef<number | null>(null);

  // Simulation logic to make the card interactive and "live"
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = window.setInterval(() => {
        setTime((t) => t + 16); // ~60fps in ms
      }, 16);

      simRef.current = window.setInterval(() => {
        setVisited((v) => {
          const newV = v + Math.floor(Math.random() * 5) + 1;
          if (newV > 450) {
            setStatus('completed');
            setCost(84); // Final path cost
            setFrontier(0);
            return 450;
          }
          return newV;
        });

        setFrontier((f) => {
          // Frontier grows then shrinks
          const change = Math.floor(Math.random() * 7) - 2; 
          return Math.max(0, f + change);
        });
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [status]);

  const handleStart = () => {
    setVisited(0);
    setFrontier(1);
    setCost(0);
    setTime(0);
    setStatus('running');
  };

  const handleReset = () => {
    setVisited(0);
    setFrontier(0);
    setCost(0);
    setTime(0);
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Futuristic Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f1a_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1a_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950 pointer-events-none" />
      
      {/* Main Complexity Card */}
      <div className="relative z-10 w-full max-w-2xl bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 overflow-hidden">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              COMPLEXITY METRICS
            </h2>
            <p className="text-sm text-gray-400 mt-1">Live algorithm performance analysis</p>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-950 border border-gray-800">
            <div className={`w-2 h-2 rounded-full ${
              status === 'running' ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 
              status === 'completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 
              'bg-gray-500'
            }`} />
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
              {status}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Visited Nodes" 
            value={visited} 
            color="cyan"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            }
          />
          <StatCard 
            label="Frontier Size" 
            value={frontier} 
            color="fuchsia"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            }
          />
          <StatCard 
            label="Path Cost" 
            value={status === 'completed' ? cost : '--'} 
            color="emerald"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard 
            label="Time (ms)" 
            value={time} 
            color="amber"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Interactive Controls (For Demo Purposes) */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
          <div className="text-xs text-gray-500 font-mono">
            SEED: <span className="text-gray-400">0x8F9A2B</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              Reset
            </button>
            <button
              onClick={status === 'running' ? () => setStatus('idle') : handleStart}
              className={`px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                status === 'running' 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 focus:ring-red-500' 
                  : 'bg-cyan-500 text-gray-950 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] focus:ring-cyan-500'
              }`}
            >
              {status === 'running' ? 'Pause' : status === 'completed' ? 'Re-run' : 'Simulate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}