import React, { useState, useRef, useMemo } from 'react';
import { Activity, Target, Navigation2, Zap, BarChart3, Info } from 'lucide-react';

const GRID_SIZE = 15;
const CELL_SIZE = 28;
const GRID_PIXELS = GRID_SIZE * CELL_SIZE;

type Point = { x: number; y: number };

export default function App() {
  const [start, setStart] = useState<Point>({ x: 3, y: 7 });
  const [target, setTarget] = useState<Point>({ x: 11, y: 4 });
  const [dragging, setDragging] = useState<'start' | 'target' | null>(null);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculations
  const dx = Math.abs(target.x - start.x);
  const dy = Math.abs(target.y - start.y);
  
  const manhattan = dx + dy;
  const euclidean = Math.sqrt(dx * dx + dy * dy);
  
  const maxPossible = (GRID_SIZE - 1) * 2; // Maximum Manhattan distance on this grid

  const getGridCoords = (e: React.PointerEvent): Point | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getGridCoords(e);
    if (!coords) return;

    if (coords.x === start.x && coords.y === start.y) {
      setDragging('start');
    } else if (coords.x === target.x && coords.y === target.y) {
      setDragging('target');
    } else {
      // Default to moving target if clicking an empty cell
      setTarget(coords);
      setDragging('target');
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getGridCoords(e);
    setHoverPos(coords);

    if (!dragging || !coords) return;

    if (dragging === 'start') {
      if (coords.x !== target.x || coords.y !== target.y) setStart(coords);
    } else {
      if (coords.x !== start.x || coords.y !== start.y) setTarget(coords);
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const toPx = (val: number) => val * CELL_SIZE + CELL_SIZE / 2;

  return (
    <div className="min-h-screen bg-[#050508] text-slate-300 font-sans p-4 md:p-8 flex items-center justify-center selection:bg-cyan-500/30">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header/Sidebar area */}
        <div className="lg:col-span-12 mb-2 flex items-center justify-between bg-[#0a0a0f] border border-cyan-900/30 p-4 rounded-2xl shadow-[0_0_30px_rgba(8,145,178,0.1)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-950/50 rounded-lg border border-cyan-800/50 text-cyan-400">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide uppercase">
                Heuristic Inspector
              </h1>
              <p className="text-sm text-slate-500 font-mono mt-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                A* Algorithm Module Active
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 font-mono text-xs bg-black/40 px-4 py-2 rounded-lg border border-slate-800">
            <Info size={14} className="text-slate-400" />
            <span className="text-slate-400">Drag <strong className="text-emerald-400">Start</strong> or <strong className="text-rose-400">Target</strong> nodes</span>
          </div>
        </div>

        {/* Left Col: Interactive Grid */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative bg-[#0a0a0f] rounded-2xl border border-slate-800/80 p-6 flex flex-col items-center justify-center shadow-xl overflow-hidden group">
            
            {/* Ambient background glows */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            <svg
              ref={svgRef}
              width={GRID_PIXELS}
              height={GRID_PIXELS}
              className="cursor-crosshair relative z-10 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-[#030305] border border-slate-800 rounded-lg"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                setHoverPos(null);
                handlePointerUp();
              }}
            >
              <defs>
                <pattern id="grid" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
                  <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.5" />
                </pattern>
                
                <filter id="neon-cyan">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <filter id="neon-fuchsia">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Hover highlight */}
              {hoverPos && (
                <rect
                  x={hoverPos.x * CELL_SIZE}
                  y={hoverPos.y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="rgba(255, 255, 255, 0.05)"
                  className="transition-all duration-75"
                />
              )}

              {/* Manhattan Path (L-shape) */}
              <path
                d={`M ${toPx(start.x)} ${toPx(start.y)} L ${toPx(target.x)} ${toPx(start.y)} L ${toPx(target.x)} ${toPx(target.y)}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
                strokeDasharray="6 6"
                filter="url(#neon-cyan)"
                className="opacity-60"
              />

              {/* Euclidean Path (Straight Line) */}
              <line
                x1={toPx(start.x)}
                y1={toPx(start.y)}
                x2={toPx(target.x)}
                y2={toPx(target.y)}
                stroke="#d946ef"
                strokeWidth="3"
                strokeDasharray="6 6"
                filter="url(#neon-fuchsia)"
                className="opacity-70"
              />

              {/* Start Node */}
              <g transform={`translate(${start.x * CELL_SIZE}, ${start.y * CELL_SIZE})`}>
                <rect width={CELL_SIZE} height={CELL_SIZE} fill="#059669" opacity="0.2" />
                <rect x="4" y="4" width={CELL_SIZE-8} height={CELL_SIZE-8} fill="#10b981" rx="4" />
                <circle cx={CELL_SIZE/2} cy={CELL_SIZE/2} r="4" fill="#fff" />
              </g>

              {/* Target Node */}
              <g transform={`translate(${target.x * CELL_SIZE}, ${target.y * CELL_SIZE})`}>
                <rect width={CELL_SIZE} height={CELL_SIZE} fill="#e11d48" opacity="0.2" />
                <rect x="4" y="4" width={CELL_SIZE-8} height={CELL_SIZE-8} fill="#f43f5e" rx="4" />
                <circle cx={CELL_SIZE/2} cy={CELL_SIZE/2} r="4" fill="#fff" />
              </g>
            </svg>
            
            <div className="absolute bottom-4 right-6 flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div>
                <span className="text-cyan-400/80">Manhattan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-fuchsia-400 shadow-[0_0_5px_#e879f9]"></div>
                <span className="text-fuchsia-400/80">Euclidean</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Charts & Analysis */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Coordinates & Delta */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 mb-6 font-mono text-sm uppercase tracking-wider">
              <Navigation2 size={16} className="text-indigo-400" />
              <h3>Vector Analysis</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111118] border border-slate-800/50 p-4 rounded-xl">
                <div className="text-xs text-slate-500 font-mono mb-1">ΔX (Horizontal)</div>
                <div className="text-3xl font-light text-slate-200 font-mono">
                  {dx}
                </div>
              </div>
              <div className="bg-[#111118] border border-slate-800/50 p-4 rounded-xl">
                <div className="text-xs text-slate-500 font-mono mb-1">ΔY (Vertical)</div>
                <div className="text-3xl font-light text-slate-200 font-mono">
                  {dy}
                </div>
              </div>
            </div>
          </div>

          {/* Heuristics Charts */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-lg flex-1 flex flex-col">
            <div className="flex items-center gap-2 text-slate-400 mb-8 font-mono text-sm uppercase tracking-wider">
              <BarChart3 size={16} className="text-blue-400" />
              <h3>Cost Comparisons (H-Value)</h3>
            </div>

            <div className="flex flex-col gap-8 flex-1 justify-center">
              
              {/* Manhattan Chart */}
              <div className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-950/50 rounded-md border border-cyan-900">
                      <Zap size={14} className="text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-cyan-400">Manhattan</div>
                      <div className="text-[10px] text-slate-500 font-mono">H = |Δx| + |Δy|</div>
                    </div>
                  </div>
                  <div className="text-2xl font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]">
                    {manhattan}
                  </div>
                </div>
                
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all duration-300 ease-out relative"
                    style={{ width: `${(manhattan / maxPossible) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>

              {/* Euclidean Chart */}
              <div className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-fuchsia-950/50 rounded-md border border-fuchsia-900">
                      <Target size={14} className="text-fuchsia-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-fuchsia-400">Euclidean</div>
                      <div className="text-[10px] text-slate-500 font-mono">H = √(Δx² + Δy²)</div>
                    </div>
                  </div>
                  <div className="text-2xl font-mono text-fuchsia-300 drop-shadow-[0_0_8px_rgba(240,171,252,0.5)]">
                    {euclidean.toFixed(2)}
                  </div>
                </div>
                
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-fuchsia-700 to-fuchsia-400 transition-all duration-300 ease-out relative"
                    style={{ width: `${(euclidean / maxPossible) * 100}%` }}
                  >
                     <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>

            </div>

            {/* Analysis Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800/60">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                <div className="text-xs text-slate-400 font-mono leading-relaxed">
                  <strong className="text-slate-200">Insight:</strong> Manhattan distance often <span className="text-cyan-400">overestimates</span> the actual path cost if diagonal movement is allowed. Euclidean distance <span className="text-fuchsia-400">underestimates</span> grid distance but provides a straight-line lower bound, making it strictly admissible for A*.
                </div>
                <div className="mt-3 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-500">Difference:</span>
                  <span className="text-amber-400 font-bold bg-amber-900/20 px-2 py-1 rounded">
                    Δ {(manhattan - euclidean).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />
    </div>
  );
}