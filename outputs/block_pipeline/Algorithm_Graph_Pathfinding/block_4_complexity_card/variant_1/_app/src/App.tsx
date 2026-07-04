import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
type RunStatus = 'idle' | 'running' | 'completed';
type Algorithm = 'A*' | 'Dijkstra' | 'BFS' | 'Bidirectional';

interface Metrics {
  visited: number;
  frontier: number;
  cost: number | null;
  frontierHistory: number[];
}

// --- Helper Components ---

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (data.length === 0) return null;
  
  const max = Math.max(...data, 10); // Minimum scale of 10
  const min = 0;
  const width = 100;
  const height = 30;
  
  const points = data.map((val, i) => {
    const x = (i / (Math.max(data.length - 1, 1))) * width;
    const y = height - ((val - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_3px_currentColor]"
      />
      {/* Fill gradient under line */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#gradient-${color.replace(/[^a-zA-Z0-9]/g, '')})`}
        opacity="0.2"
      />
      <defs>
        <linearGradient id={`gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const GridBackground = () => (
  <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
    <div className="w-full h-full" style={{
      backgroundImage: `
        linear-gradient(to right, #1e293b 1px, transparent 1px),
        linear-gradient(to bottom, #1e293b 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px'
    }} />
    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]" />
  </div>
);

// --- Main Component ---

export default function ComplexityCardModule() {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [algo, setAlgo] = useState<Algorithm>('A*');
  const [metrics, setMetrics] = useState<Metrics>({
    visited: 0,
    frontier: 0,
    cost: null,
    frontierHistory: []
  });
  const [seed, setSeed] = useState<string>('');

  const intervalRef = useRef<number | null>(null);

  // Generate a deterministic-looking seed
  useEffect(() => {
    setSeed(Math.random().toString(36).substring(2, 10).toUpperCase());
  }, []);

  // Simulation Logic
  const runSimulation = useCallback(() => {
    if (status === 'running') return;
    
    setStatus('running');
    setMetrics({ visited: 0, frontier: 1, cost: null, frontierHistory: [1] });
    
    let ticks = 0;
    const maxTicks = 60 + Math.floor(Math.random() * 40); // Random duration

    intervalRef.current = window.setInterval(() => {
      ticks++;
      
      setMetrics(prev => {
        // Simulate algorithm behavior based on selected algo
        let newVisited = prev.visited;
        let newFrontier = prev.frontier;
        
        if (algo === 'BFS') {
          newVisited += Math.floor(Math.random() * 8) + 2;
          newFrontier += Math.floor(Math.random() * 6) - 1;
        } else if (algo === 'A*') {
          newVisited += Math.floor(Math.random() * 3) + 1;
          newFrontier += Math.floor(Math.random() * 4) - 1;
        } else {
          newVisited += Math.floor(Math.random() * 5) + 1;
          newFrontier += Math.floor(Math.random() * 5) - 2;
        }

        newFrontier = Math.max(1, newFrontier); // Frontier rarely drops below 1 until done
        
        const newHistory = [...prev.frontierHistory, newFrontier].slice(-30); // Keep last 30 points

        return {
          ...prev,
          visited: newVisited,
          frontier: newFrontier,
          frontierHistory: newHistory
        };
      });

      if (ticks >= maxTicks) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus('completed');
        // Finalize cost based on visited nodes to look somewhat realistic
        setMetrics(prev => ({
          ...prev,
          frontier: 0,
          cost: Math.floor(prev.visited * (Math.random() * 0.4 + 0.8)),
          frontierHistory: [...prev.frontierHistory, 0].slice(-30)
        }));
      }
    }, 50); // 50ms tick rate for smooth animation

  }, [status, algo]);

  const resetSimulation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('idle');
    setMetrics({ visited: 0, frontier: 0, cost: null, frontierHistory: [] });
    setSeed(Math.random().toString(36).substring(2, 10).toUpperCase());
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <GridBackground />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        
        {/* Header / Context */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-mono text-cyan-500 mb-1 tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_theme(colors.cyan.500)]" />
              Pathfinding Playground
            </h2>
            <h1 className="text-3xl font-bold text-white tracking-tight">Complexity Analytics</h1>
          </div>
          
          <div className="flex bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
            {(['A*', 'Dijkstra', 'BFS', 'Bidirectional'] as Algorithm[]).map(a => (
              <button
                key={a}
                onClick={() => { setAlgo(a); resetSimulation(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                  algo === a 
                    ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Main Complexity Card */}
        <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          
          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-2xl transition-colors group-hover:border-cyan-500/60" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30 rounded-br-2xl transition-colors group-hover:border-cyan-500/60" />

          {/* Card Header */}
          <div className="flex justify-between items-center mb-8 border-b border-slate-800/50 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status === 'running' ? 'bg-cyan-950/50 text-cyan-400' : 'bg-slate-900 text-slate-500'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h4l3-9 5 18 3-9h5"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Live Telemetry</h3>
                <p className="text-xs font-mono text-slate-500">SEED: {seed}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={resetSimulation}
                disabled={status === 'idle'}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button 
                onClick={runSimulation}
                disabled={status === 'running'}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 hover:bg-cyan-900 hover:text-cyan-300 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === 'running' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Running
                  </>
                ) : status === 'completed' ? 'Rerun' : 'Start Scan'}
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Visited Nodes Metric */}
            <div className="relative p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Visited Nodes</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-mono font-bold text-cyan-400 [text-shadow:_0_0_15px_rgba(6,182,212,0.5)]">
                  {metrics.visited.toString().padStart(4, '0')}
                </span>
                <span className="text-xs text-cyan-600 font-mono mb-1">nodes</span>
              </div>
              {/* Progress bar visual */}
              <div className="w-full h-1 bg-slate-950 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-75"
                  style={{ width: `${Math.min(100, (metrics.visited / 500) * 100)}%` }}
                />
              </div>
            </div>

            {/* Frontier Size Metric */}
            <div className="relative p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Frontier Size</p>
                  <span className="text-xs font-mono text-fuchsia-500 bg-fuchsia-950/30 px-2 py-0.5 rounded border border-fuchsia-900/50">
                    Live
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-mono font-bold text-fuchsia-400 [text-shadow:_0_0_15px_rgba(232,121,249,0.5)]">
                    {metrics.frontier.toString().padStart(3, '0')}
                  </span>
                  <span className="text-xs text-fuchsia-600 font-mono mb-1">active</span>
                </div>
              </div>
              {/* Sparkline */}
              <div className="h-10 mt-2 w-full">
                <Sparkline data={metrics.frontierHistory} color="#e879f9" />
              </div>
            </div>

            {/* Path Cost Metric */}
            <div className="relative p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Final Path Cost</p>
              <div className="flex items-end gap-2 h-10 mt-1">
                {status === 'idle' ? (
                  <span className="text-2xl font-mono text-slate-600">--</span>
                ) : status === 'running' ? (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <>
                    <span className="text-4xl font-mono font-bold text-emerald-400 [text-shadow:_0_0_15px_rgba(16,185,129,0.5)]">
                      {metrics.cost}
                    </span>
                    <span className="text-xs text-emerald-600 font-mono mb-1">units</span>
                  </>
                )}
              </div>
              
              {/* Status indicator line */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900">
                <div 
                  className={`h-full transition-all duration-500 ${
                    status === 'completed' ? 'w-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'w-0 bg-transparent'
                  }`}
                />
              </div>
            </div>

          </div>

          {/* Decorative scanner line effect when running */}
          {status === 'running' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <div className="w-full h-1 bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            System Status: <span className={status === 'running' ? 'text-cyan-500' : 'text-slate-500'}>{status.toUpperCase()}</span> // ALGO: {algo}
          </p>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
        }
      `}} />
    </div>
  );
}