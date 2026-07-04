import React, { useState, useMemo } from 'react';

// Runtime deps: none (using standard React and Tailwind CSS)

const GRID_SIZE = 12;
const CELL_SIZE = 36; // px

export default function App() {
  const [goal, setGoal] = useState({ x: 9, y: 9 });
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);
  const [algo, setAlgo] = useState<'A*' | 'Dijkstra'>('A*');

  // Math for heuristics
  const manhattan = useMemo(() => {
    if (!hovered) return 0;
    return Math.abs(hovered.x - goal.x) + Math.abs(hovered.y - goal.y);
  }, [hovered, goal]);

  const euclidean = useMemo(() => {
    if (!hovered) return 0;
    return Math.sqrt(Math.pow(hovered.x - goal.x, 2) + Math.pow(hovered.y - goal.y, 2));
  }, [hovered, goal]);

  const maxDistance = GRID_SIZE * 2; // Rough max for scaling charts

  return (
    <div className="min-h-screen bg-[#05050a] text-cyan-50 font-mono p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden selection:bg-cyan-500/30">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20" 
        style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="z-10 w-full max-w-6xl flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-cyan-900/50 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 flex items-center gap-3">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              HEURISTIC_INSPECTOR
            </h1>
            <p className="text-cyan-600/80 text-sm mt-1 uppercase tracking-wider">Module 04 // Pathfinding Playground</p>
          </div>

          {/* Algorithm Selector */}
          <div className="flex bg-gray-900/80 border border-cyan-900/50 rounded-lg p-1 backdrop-blur-md">
            {(['Dijkstra', 'A*'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAlgo(a)}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-300 ${
                  algo === a 
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)] border border-cyan-500/50' 
                    : 'text-gray-500 hover:text-cyan-700 border border-transparent'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left: Interactive Grid */}
          <div className="relative p-6 bg-gray-900/60 border border-cyan-900/50 rounded-xl backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-4 px-2 -translate-y-1/2 bg-[#05050a] text-xs text-cyan-500 tracking-widest">
              SECTOR_MAP
            </div>
            
            <div className="mb-4 text-xs text-gray-400 flex justify-between">
              <span>Hover: Inspect Heuristics</span>
              <span>Click: Move Goal</span>
            </div>

            <div 
              className="relative grid bg-gray-950 border border-cyan-900/30"
              style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`
              }}
              onMouseLeave={() => setHovered(null)}
            >
              {/* SVG Overlay for Heuristic Paths */}
              {algo === 'A*' && hovered && (
                <svg className="absolute inset-0 pointer-events-none z-20" width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE}>
                  {/* Manhattan Path (L-Shape) */}
                  <polyline 
                    points={`${hovered.x * CELL_SIZE + CELL_SIZE/2},${hovered.y * CELL_SIZE + CELL_SIZE/2} ${goal.x * CELL_SIZE + CELL_SIZE/2},${hovered.y * CELL_SIZE + CELL_SIZE/2} ${goal.x * CELL_SIZE + CELL_SIZE/2},${goal.y * CELL_SIZE + CELL_SIZE/2}`}
                    fill="none"
                    stroke="#22d3ee" // cyan-400
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"
                  />
                  {/* Euclidean Path (Straight Line) */}
                  <line 
                    x1={hovered.x * CELL_SIZE + CELL_SIZE/2}
                    y1={hovered.y * CELL_SIZE + CELL_SIZE/2}
                    x2={goal.x * CELL_SIZE + CELL_SIZE/2}
                    y2={goal.y * CELL_SIZE + CELL_SIZE/2}
                    stroke="#d946ef" // fuchsia-500
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]"
                  />
                </svg>
              )}

              {/* Grid Cells */}
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isGoal = x === goal.x && y === goal.y;
                const isHovered = hovered?.x === x && hovered?.y === y;

                return (
                  <div
                    key={i}
                    onClick={() => setGoal({ x, y })}
                    onMouseEnter={() => setHovered({ x, y })}
                    className={`
                      box-border border-[0.5px] border-cyan-900/20 cursor-crosshair transition-colors duration-75 relative
                      ${isGoal ? 'bg-fuchsia-600/20 border-fuchsia-500 shadow-[inset_0_0_15px_rgba(217,70,239,0.5)] z-10' : ''}
                      ${isHovered && !isGoal ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] z-10' : 'hover:bg-cyan-900/30'}
                    `}
                  >
                    {isGoal && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-fuchsia-400 rounded-full shadow-[0_0_10px_#d946ef] animate-ping" />
                        <div className="absolute w-2 h-2 bg-fuchsia-400 rounded-full shadow-[0_0_10px_#d946ef]" />
                      </div>
                    )}
                    {isHovered && !isGoal && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-sm shadow-[0_0_8px_#22d3ee]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Inspector Dashboard */}
          <div className="flex-1 w-full flex flex-col gap-6">
            
            {/* Status Card */}
            <div className="bg-gray-900/60 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-4 px-2 -translate-y-1/2 bg-[#05050a] text-xs text-cyan-500 tracking-widest">
                TELEMETRY
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs uppercase mb-1">Target Coordinates</span>
                  <span className="text-fuchsia-400 font-bold text-xl drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]">
                    [{goal.x}, {goal.y}]
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs uppercase mb-1">Probe Coordinates</span>
                  <span className="text-cyan-400 font-bold text-xl drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                    {hovered ? `[${hovered.x}, ${hovered.y}]` : 'AWAITING_INPUT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Heuristic Charts Card */}
            <div className="bg-gray-900/60 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm relative flex-1 flex flex-col">
              <div className="absolute top-0 right-4 px-2 -translate-y-1/2 bg-[#05050a] text-xs text-cyan-500 tracking-widest">
                ANALYSIS_CORE
              </div>

              {algo === 'Dijkstra' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-gray-400 tracking-widest text-sm">HEURISTICS DISABLED</p>
                  <p className="text-gray-500 text-xs mt-2 max-w-xs">Dijkstra's algorithm is uninformed and evaluates all directions equally (h(n) = 0).</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  
                  {!hovered ? (
                     <div className="flex-1 flex items-center justify-center text-cyan-600/50 text-sm tracking-widest animate-pulse">
                        HOVER GRID TO ENGAGE SENSORS
                     </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                      
                      {/* Charts Area */}
                      <div className="flex items-end justify-center gap-12 h-48 border-b border-gray-800 pb-4 relative">
                        {/* Background grid lines for chart */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                          {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-cyan-500/30" />)}
                        </div>

                        {/* Manhattan Bar */}
                        <div className="flex flex-col items-center gap-3 z-10 w-24">
                          <div className="text-cyan-300 font-bold text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                            {manhattan.toFixed(1)}
                          </div>
                          <div className="h-32 w-full bg-gray-950 border border-gray-800 rounded-t-sm relative flex items-end overflow-hidden">
                            <div 
                              className="w-full bg-gradient-to-t from-cyan-900 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(34,211,238,0.5)] relative"
                              style={{ height: `${(manhattan / maxDistance) * 100}%` }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-200" />
                            </div>
                          </div>
                          <div className="text-xs text-cyan-500 uppercase tracking-wider">Manhattan</div>
                        </div>

                        {/* Euclidean Bar */}
                        <div className="flex flex-col items-center gap-3 z-10 w-24">
                          <div className="text-fuchsia-300 font-bold text-2xl drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">
                            {euclidean.toFixed(1)}
                          </div>
                          <div className="h-32 w-full bg-gray-950 border border-gray-800 rounded-t-sm relative flex items-end overflow-hidden">
                            <div 
                              className="w-full bg-gradient-to-t from-fuchsia-900 to-fuchsia-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(217,70,239,0.5)] relative"
                              style={{ height: `${(euclidean / maxDistance) * 100}%` }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-1 bg-fuchsia-200" />
                            </div>
                          </div>
                          <div className="text-xs text-fuchsia-500 uppercase tracking-wider">Euclidean</div>
                        </div>
                      </div>

                      {/* Formulas & Delta */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-950/50 p-3 rounded border border-gray-800">
                          <div className="text-[10px] text-gray-500 mb-1">MANHATTAN FORMULA</div>
                          <code className="text-cyan-400/80 text-xs block">
                            dx = |x₁ - x₂|<br/>
                            dy = |y₁ - y₂|<br/>
                            h = dx + dy
                          </code>
                        </div>
                        <div className="bg-gray-950/50 p-3 rounded border border-gray-800">
                          <div className="text-[10px] text-gray-500 mb-1">EUCLIDEAN FORMULA</div>
                          <code className="text-fuchsia-400/80 text-xs block">
                            dx = |x₁ - x₂|<br/>
                            dy = |y₁ - y₂|<br/>
                            h = √(dx² + dy²)
                          </code>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between bg-cyan-900/10 border border-cyan-900/30 p-3 rounded">
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Cost Delta (Δ)</span>
                        <span className="text-sm font-bold text-white">
                          {Math.abs(manhattan - euclidean).toFixed(2)}
                        </span>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>