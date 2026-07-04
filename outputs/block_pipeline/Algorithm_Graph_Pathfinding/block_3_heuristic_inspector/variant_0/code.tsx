import React, { useState, useMemo } from 'react';

// Runtime deps: none

export default function App() {
  const [activeAlgorithm, setActiveAlgorithm] = useState<'BFS' | 'Dijkstra' | 'A*'>('A*');
  const [hoverPos, setHoverPos] = useState({ x: 2, y: 2 });
  const [activeHeuristic, setActiveHeuristic] = useState<'Both' | 'Manhattan' | 'Euclidean'>('Both');

  const GRID_SIZE = 10;
  const CELL_SIZE = 40; // Fixed size for precise SVG overlay
  const goalPos = { x: 8, y: 7 };

  // Calculate costs
  const dx = Math.abs(hoverPos.x - goalPos.x);
  const dy = Math.abs(hoverPos.y - goalPos.y);
  
  const manhattanCost = dx + dy;
  const euclideanCost = Math.sqrt(dx * dx + dy * dy);
  
  // Max possible costs for chart scaling (10x10 grid)
  const maxManhattan = 18; 
  const maxEuclidean = Math.sqrt(9 * 9 + 9 * 9);

  // SVG Coordinates
  const hx = hoverPos.x * CELL_SIZE + CELL_SIZE / 2;
  const hy = hoverPos.y * CELL_SIZE + CELL_SIZE / 2;
  const gx = goalPos.x * CELL_SIZE + CELL_SIZE / 2;
  const gy = goalPos.y * CELL_SIZE + CELL_SIZE / 2;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden selection:bg-cyan-900">
      
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <div className="relative z-10 w-full max-w-5xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
            <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">PATH</span>
            FINDER
          </h1>
          <p className="text-slate-500 text-sm tracking-widest uppercase mt-1">Heuristic Inspector Module</p>
        </div>

        {/* Algorithm Selector */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 shadow-xl">
          {['BFS', 'Dijkstra', 'A*'].map((algo) => (
            <button
              key={algo}
              onClick={() => setActiveAlgorithm(algo as any)}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-300 ${
                activeAlgorithm === algo
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {algo}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-5xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        
        {activeAlgorithm !== 'A*' ? (
          // Non-A* State
          <div className="flex-1 p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
            <div className="w-24 h-24 mb-6 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Heuristics Disabled</h2>
            <p className="text-slate-400 max-w-md">
              <span className="text-cyan-400 font-mono">{activeAlgorithm}</span> is an uninformed search algorithm. It explores equally in all directions without a heuristic guide.
            </p>
            <button 
              onClick={() => setActiveAlgorithm('A*')}
              className="mt-8 px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors font-mono text-sm"
            >
              SWITCH TO A* SEARCH
            </button>
          </div>
        ) : (
          // A* Heuristic Inspector State
          <>
            {/* Left: Interactive Grid */}
            <div className="p-8 lg:border-r border-slate-800 flex flex-col items-center justify-center bg-slate-950/50">
              <div className="mb-6 w-full flex justify-between items-center">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider">Interactive Grid</h3>
                <div className="flex gap-2">
                  {(['Both', 'Manhattan', 'Euclidean'] as const).map(h => (
                    <button
                      key={h}
                      onClick={() => setActiveHeuristic(h)}
                      className={`text-xs px-2 py-1 rounded font-mono border transition-colors ${
                        activeHeuristic === h 
                          ? 'border-slate-500 text-slate-200 bg-slate-800' 
                          : 'border-transparent text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                className="relative bg-slate-900 border border-slate-800 rounded-lg shadow-2xl"
                style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
              >
                {/* Grid Cells */}
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const x = i % GRID_SIZE;
                    const y = Math.floor(i / GRID_SIZE);
                    const isGoal = x === goalPos.x && y === goalPos.y;
                    const isHovered = x === hoverPos.x && y === hoverPos.y;

                    return (
                      <div
                        key={i}
                        onMouseEnter={() => !isGoal && setHoverPos({ x, y })}
                        className={`
                          border-r border-b border-slate-800/50 transition-colors duration-75 cursor-crosshair
                          ${isGoal ? 'bg-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.5)]' : ''}
                          ${isHovered && !isGoal ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'}
                        `}
                      >
                        {isGoal && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-emerald-400 rounded-sm shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse" />
                          </div>
                        )}
                        {isHovered && !isGoal && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-slate-400 rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SVG Overlay for Heuristic Paths */}
                <svg className="absolute inset-0 pointer-events-none" width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE}>
                  <defs>
                    <linearGradient id="euclideanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#a21caf" />
                    </linearGradient>
                  </defs>

                  {/* Manhattan Path (L-Shape) */}
                  {(activeHeuristic === 'Both' || activeHeuristic === 'Manhattan') && (
                    <polyline
                      points={`${hx},${hy} ${gx},${hy} ${gx},${gy}`}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="3"
                      strokeDasharray="6 6"
                      className="drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-[dash_1s_linear_infinite]"
                      style={{ strokeDashoffset: 12 }}
                    />
                  )}

                  {/* Euclidean Path (Straight Line) */}
                  {(activeHeuristic === 'Both' || activeHeuristic === 'Euclidean') && (
                    <line
                      x1={hx}
                      y1={hy}
                      x2={gx}
                      y2={gy}
                      fill="none"
                      stroke="url(#euclideanGrad)"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      className="drop-shadow-[0_0_5px_rgba(217,70,239,0.8)] animate-[dash_1s_linear_infinite_reverse]"
                    />
                  )}

                  {/* Connection Nodes */}
                  <circle cx={hx} cy={hy} r="4" fill="#94a3b8" />
                  <circle cx={gx} cy={gy} r="4" fill="#34d399" className="drop-shadow-[0_0_8px_rgba(52,211,153,1)]" />
                </svg>
              </div>
              
              <div className="mt-6 text-xs font-mono text-slate-500 flex gap-6">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-cyan-400" /> Manhattan
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-fuchsia-500" /> Euclidean
                </span>
              </div>
            </div>

            {/* Right: Charts & Data */}
            <div className="flex-1 p-8 flex flex-col bg-slate-900">
              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Cost Analysis
              </h3>

              <div className="space-y-10 flex-1">
                
                {/* Manhattan Chart */}
                <div className={`transition-opacity duration-300 ${(activeHeuristic === 'Both' || activeHeuristic === 'Manhattan') ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="text-cyan-400 font-mono font-bold tracking-wide">MANHATTAN (h)</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">|x₁ - x₂| + |y₁ - y₂|</p>
                    </div>
                    <div className="text-3xl font-light text-white font-mono">
                      {manhattanCost}
                    </div>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${(manhattanCost / maxManhattan) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-2">
                    <span>0</span>
                    <span>Max: {maxManhattan}</span>
                  </div>
                </div>

                {/* Euclidean Chart */}
                <div className={`transition-opacity duration-300 ${(activeHeuristic === 'Both' || activeHeuristic === 'Euclidean') ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="text-fuchsia-400 font-mono font-bold tracking-wide">EUCLIDEAN (h)</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">√((x₁ - x₂)² + (y₁ - y₂)²)</p>
                    </div>
                    <div className="text-3xl font-light text-white font-mono">
                      {euclideanCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="absolute top-0 left-0 h-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)] transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${(euclideanCost / maxEuclidean) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-2">
                    <span>0</span>
                    <span>Max: {maxEuclidean.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Insight Box */}
              <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Technologist Insight
                </h5>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Notice how <strong className="text-cyan-400 font-normal">Manhattan</strong> is always <strong className="text-white font-normal">≥</strong> <strong className="text-fuchsia-400 font-normal">Euclidean</strong>. 
                  In a 4-way movement grid, Manhattan is an <em>admissible</em> and perfect heuristic. Euclidean underestimates the true cost, causing A* to explore more nodes than necessary.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Global Styles for SVG Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}} />
    </div>
  );
}