import React, { useState, useCallback, useMemo } from 'react';
import { Activity, Crosshair, Cpu, Info, Move, Navigation } from 'lucide-react';

// Runtime deps: lucide-react

const GRID_SIZE = 15;
const MAX_MANHATTAN = (GRID_SIZE - 1) * 2;
const MAX_EUCLIDEAN = Math.sqrt(Math.pow(GRID_SIZE - 1, 2) * 2);

export default function App() {
  const [start, setStart] = useState({ x: 3, y: 3 });
  const [goal, setGoal] = useState({ x: 11, y: 11 });
  const [dragging, setDragging] = useState<'start' | 'goal' | null>(null);
  
  const [showManhattan, setShowManhattan] = useState(true);
  const [showEuclidean, setShowEuclidean] = useState(true);

  const handleMouseDown = (x: number, y: number) => {
    if (x === start.x && y === start.y) setDragging('start');
    else if (x === goal.x && y === goal.y) setDragging('goal');
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!dragging) return;
    if (dragging === 'start' && (x !== goal.x || y !== goal.y)) setStart({ x, y });
    if (dragging === 'goal' && (x !== start.x || y !== start.y)) setGoal({ x, y });
  };

  const handleMouseUp = () => setDragging(null);

  const dx = Math.abs(start.x - goal.x);
  const dy = Math.abs(start.y - goal.y);
  
  const manhattan = dx + dy;
  const euclidean = Math.sqrt(dx * dx + dy * dy);

  const getCoord = (val: number) => `${(val + 0.5) * (100 / GRID_SIZE)}%`;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans p-6 flex items-center justify-center selection:bg-cyan-900">
      {/* Background Grid Effects */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#030712_100%)]" />

      <div className="relative z-10 max-w-6xl w-full flex flex-col lg:flex-row gap-8 items-stretch">
        
        {/* Left Panel: Interactive Grid */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-wide">
              <Crosshair className="w-6 h-6 text-cyan-400" />
              Heuristic Space
            </h2>
            <div className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-full text-xs font-mono text-slate-400 flex items-center gap-2">
              <Move className="w-3 h-3" /> Drag nodes to analyze
            </div>
          </div>

          <div className="relative aspect-square w-full bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-sm p-2">
            
            {/* The Grid */}
            <div 
              className="w-full h-full grid gap-[1px] bg-slate-800/50 rounded-lg overflow-hidden cursor-crosshair"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
              onMouseLeave={handleMouseUp}
              onMouseUp={handleMouseUp}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isStart = x === start.x && y === start.y;
                const isGoal = x === goal.x && y === goal.y;

                return (
                  <div
                    key={i}
                    onMouseDown={() => handleMouseDown(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    className={`
                      relative w-full h-full transition-colors duration-75
                      ${isStart || isGoal ? 'bg-slate-900' : 'bg-[#0a0f1c] hover:bg-slate-800/80'}
                    `}
                  >
                    {isStart && (
                      <div className="absolute inset-[15%] bg-cyan-400 rounded-sm shadow-[0_0_15px_#22d3ee] animate-pulse flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                    {isGoal && (
                      <div className="absolute inset-[15%] bg-fuchsia-500 rounded-sm shadow-[0_0_15px_#d946ef] animate-pulse flex items-center justify-center">
                        <Navigation className="w-3 h-3 text-white fill-white rotate-45" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SVG Overlay for Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-lg z-10 p-2">
              {showManhattan && (
                <polyline
                  points={`${getCoord(start.x)},${getCoord(start.y)} ${getCoord(goal.x)},${getCoord(start.y)} ${getCoord(goal.x)},${getCoord(goal.y)}`}
                  className="stroke-cyan-400/80"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' }}
                />
              )}
              {showEuclidean && (
                <line
                  x1={getCoord(start.x)}
                  y1={getCoord(start.y)}
                  x2={getCoord(goal.x)}
                  y2={getCoord(goal.y)}
                  className="stroke-fuchsia-500/80"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(217,70,239,0.6))' }}
                />
              )}
            </svg>
          </div>
        </div>

        {/* Right Panel: Analysis & Charts */}
        <div className="w-full lg:w-96 flex flex-col gap-6 pt-2 lg:pt-12">
          
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-50" />
            
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <h3 className="text-lg font-semibold text-white tracking-wide">A* Cost Analysis</h3>
            </div>

            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Heuristics guide the A* algorithm towards the goal. The cost <span className="text-cyan-300 font-mono text-xs bg-cyan-900/30 px-1 py-0.5 rounded">h(n)</span> estimates the remaining distance.
            </p>

            {/* Manhattan Chart */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="flex items-center gap-2 cursor-pointer group/label">
                  <input 
                    type="checkbox" 
                    checked={showManhattan} 
                    onChange={(e) => setShowManhattan(e.target.checked)}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showManhattan ? 'bg-cyan-500 border-cyan-400' : 'bg-slate-800 border-slate-600'}`}>
                    {showManhattan && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover/label:text-white transition-colors">Manhattan <span className="text-xs text-slate-500 block -mt-1">D = |dx| + |dy|</span></span>
                </label>
                <div className="text-2xl font-mono font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                  {manhattan}
                </div>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out"
                  style={{ width: `${(manhattan / MAX_MANHATTAN) * 100}%` }}
                />
              </div>
            </div>

            {/* Euclidean Chart */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="flex items-center gap-2 cursor-pointer group/label">
                  <input 
                    type="checkbox" 
                    checked={showEuclidean} 
                    onChange={(e) => setShowEuclidean(e.target.checked)}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showEuclidean ? 'bg-fuchsia-500 border-fuchsia-400' : 'bg-slate-800 border-slate-600'}`}>
                    {showEuclidean && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover/label:text-white transition-colors">Euclidean <span className="text-xs text-slate-500 block -mt-1">D = √(dx² + dy²)</span></span>
                </label>
                <div className="text-2xl font-mono font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">
                  {euclidean.toFixed(2)}
                </div>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-fuchsia-700 to-fuchsia-400 transition-all duration-300 ease-out"
                  style={{ width: `${(euclidean / MAX_EUCLIDEAN) * 100}%` }}
                />
              </div>
            </div>

          </div>

          {/* Info Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex items-start gap-4">
            <div className="p-2 bg-slate-800/80 rounded-lg shrink-0">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-1">Impact on Frontier</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manhattan is ideal for 4-way grid movement. Euclidean is better for 8-way or any-angle pathfinding. Using Manhattan on an 8-way grid overestimates cost and breaks A* admissibility.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}